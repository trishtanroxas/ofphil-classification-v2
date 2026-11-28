"""
Structured OCR post-processing and essential field extraction for OFPHIL V2.

Reconstructs visual reading order from OCR bounding boxes and extracts clean,
essential fields (Name, Address, Purpose) while stripping watermarks, circular
seal noise, and fragmented OCR artifacts.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


_NOISE_LINE_PATTERNS = [
    re.compile(r"^\s*FOR\s+RESEARCH\s*$", re.IGNORECASE),
    re.compile(r"^\s*ONLY\s*$", re.IGNORECASE),
    re.compile(r"^\s*FOR\s+RESEARCH\s+ONLY\s*$", re.IGNORECASE),
    re.compile(r"^\s*SYNTHETIC\b.*$", re.IGNORECASE),
    re.compile(r"^\s*RESEARCH\s+ONLY\s*$", re.IGNORECASE),
    re.compile(r"^\s*NOT\s+VALID\s*$", re.IGNORECASE),
    re.compile(r"^\s*OFFICIAL\s+SEAL\s*$", re.IGNORECASE),
    re.compile(r"^\s*OF[EF]CIAL\s*$", re.IGNORECASE),
    re.compile(r"^\s*(?:QAn?GAY|RANGAY|BARANGAY\s+SEAL)\s*$", re.IGNORECASE),
]

_INLINE_NOISE_REGEXES = [
    re.compile(r"\bFOR\s+RESEARCH\s+ONLY\b", re.IGNORECASE),
    re.compile(r"\bSYNTHETIC\s*[•·\-]?\s*RESEARCH\s+ONLY\s*[•·\-]?\s*NOT\s+VALID\b", re.IGNORECASE),
    re.compile(r"\bSYNTHETIC\b", re.IGNORECASE),
    re.compile(r"\bRESEARCH\s+ONLY\b", re.IGNORECASE),
    re.compile(r"\bNOT\s+VALID\b", re.IGNORECASE),
]


def _clean_inline_punctuation(text: str) -> str:
    s = re.sub(r"[`_]+", " ", text or "")
    s = re.sub(r"\s+", " ", s).strip()
    # Fix OCR colon read instead of period on middle initials (e.g. "M: Dela Cruz" -> "M. Dela Cruz")
    s = re.sub(r"\b([A-Z]):\s+([A-Z][a-zA-Z]+)", r"\1. \2", s)
    # Fix detached punctuation on honorifics & street abbreviations
    s = re.sub(r"\b(Mr|Mrs|Ms|Dr|Sr|Jr|St|Ave|Rd|Blvd|Brgy)\s+\.", r"\1.", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+([,.;])", r"\1", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip()


def reconstruct_reading_order(detections: List[Tuple[Any, str, float]]) -> str:
    """
    Sort OCR detections [(bbox_4pts, text, conf), ...] into visual reading order:
    group boxes on the same horizontal line, sort lines top-to-bottom, and sort
    tokens within each line left-to-right.
    """
    items: List[Tuple[float, float, float, str]] = []
    heights: List[float] = []

    for bbox, text, _conf in detections:
        txt = (text or "").strip()
        if not txt:
            continue
        try:
            xs = [float(pt[0]) for pt in bbox]
            ys = [float(pt[1]) for pt in bbox]
            x_min = min(xs)
            y_min, y_max = min(ys), max(ys)
            h = max(1.0, y_max - y_min)
            y_center = (y_min + y_max) / 2.0
            items.append((y_center, x_min, h, txt))
            heights.append(h)
        except Exception:
            items.append((0.0, 0.0, 20.0, txt))

    if not items:
        return ""

    heights.sort()
    median_h = heights[len(heights) // 2] if heights else 20.0
    line_tol = max(10.0, median_h * 0.6)

    items.sort(key=lambda t: t[0])

    lines: List[List[Tuple[float, float, float, str]]] = []
    for item in items:
        if not lines:
            lines.append([item])
            continue
        last_line = lines[-1]
        avg_y = sum(x[0] for x in last_line) / len(last_line)
        if abs(item[0] - avg_y) <= line_tol:
            last_line.append(item)
        else:
            lines.append([item])

    output_lines: List[str] = []
    for line in lines:
        line.sort(key=lambda t: t[1])
        joined = _clean_inline_punctuation(" ".join(t[3] for t in line))
        if joined:
            output_lines.append(joined)

    return "\n".join(output_lines)


def _strip_noise_lines(raw_text: str) -> List[str]:
    clean_lines: List[str] = []
    for raw_line in (raw_text or "").splitlines():
        line = _clean_inline_punctuation(raw_line)
        if not line:
            continue
        if any(pat.match(line) for pat in _NOISE_LINE_PATTERNS):
            continue
        for rx in _INLINE_NOISE_REGEXES:
            line = rx.sub("", line).strip()
        if line:
            clean_lines.append(line)
    return clean_lines


def _clean_name(value: str) -> Optional[str]:
    s = _clean_inline_punctuation(value)
    # Remove trailing parenthetical patient/case IDs like (M26-11-00001)
    s = re.sub(r"\s*\([^)]*\d[^)]*\)\s*$", "", s)
    # Remove leading honorifics
    s = re.sub(r"^(?:Mr|Mrs|Ms|Miss|Dr|Engr|Hon)\.?\s+", "", s, flags=re.IGNORECASE)
    s = s.strip(" ,.;:-")
    # Sanity check: at least 2 alphabetic characters
    if len(re.findall(r"[A-Za-zñÑ]", s)) < 2:
        return None
    return s


def _clean_address(value: str, full_text: str, raw_lines: List[str]) -> Optional[str]:
    s = _clean_inline_punctuation(value)
    s = s.strip(" ,.;:-")
    if not s:
        return None

    # Re-attach orphaned "St ," / "St." fragment when EasyOCR pushed it to the bottom
    has_orphan_st = any(re.match(r"^\s*St\.?\s*,?\s*$", ln, re.IGNORECASE) for ln in raw_lines)
    if has_orphan_st and not re.search(r"\b(?:St\.?|Street|Ave\.?|Avenue|Rd\.?|Road|Blvd\.?|Dr\.?)\b", s, re.IGNORECASE):
        m_brgy = re.search(r"^(\d+\s+[A-Za-zñÑ][A-Za-zñÑ\s\-]{1,40}?)\s+(Barangay|Brgy\.?)\b(.*)$", s, re.IGNORECASE)
        if m_brgy:
            s = f"{m_brgy.group(1).strip()} St., {m_brgy.group(2)}{m_brgy.group(3)}"

    # Ensure comma before Barangay/Brgy when preceded by street info without comma
    s = re.sub(r"(?<!,)\s+(Barangay|Brgy\.?)\b", r", \1", s, flags=re.IGNORECASE)
    s = re.sub(r"\bSt,\s*", "St., ", s)

    # Complete "Quezon" -> "Quezon City" if document explicitly states City of Quezon / Quezon City
    if re.search(r",\s*Quezon\s*$", s, re.IGNORECASE) and not re.search(r"Quezon\s+City\s*$", s, re.IGNORECASE):
        if re.search(r"\b(?:City\s+of\s+Quezon|Quezon\s+City)\b", full_text, re.IGNORECASE):
            s = re.sub(r",\s*Quezon\s*$", ", Quezon City", s, flags=re.IGNORECASE)

    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r",\s*,", ",", s)
    s = s.strip(" ,.;:-")
    return s if len(s) >= 4 else None


def _clean_purpose(value: str) -> Optional[str]:
    s = _clean_inline_punctuation(value)
    # Trim anything starting at "Issued this..." in case a period was missed by OCR
    s = re.split(r"\bIssued\s+this\b", s, maxsplit=1, flags=re.IGNORECASE)[0]
    s = re.sub(r"^(?:for\s+the\s+purpose\s+of|for)\s+", "", s, flags=re.IGNORECASE)
    s = s.strip(" ,.;:-")
    if len(re.findall(r"[A-Za-z]", s)) < 3:
        return None
    # Capitalize first character cleanly
    return s[0].upper() + s[1:]


def extract_essential_fields(raw_text: str, document_type: str = "") -> Dict[str, Any]:
    """
    Extract essential structured fields (name, address, purpose) and standard
    keyword indicators from raw OCR text.
    """
    text = raw_text or ""
    raw_lines = text.splitlines()
    clean_lines = _strip_noise_lines(text)
    flat = _clean_inline_punctuation(" ".join(clean_lines))
    lower = flat.lower()

    fields: Dict[str, Any] = {}

    # Preserve existing keyword indicators for downstream compatibility
    if "indigency" in lower or "indigent" in lower:
        fields["indigency_keyword"] = True
    if "barangay" in lower or "brgy" in lower:
        fields["barangay_reference"] = True
    if "philhealth" in lower:
        fields["philhealth_reference"] = True
    if any(k in lower for k in ("cataract", "glaucoma", "eye", "vision", "ophthalmic")):
        fields["clinical_eye_reference"] = True

    if not flat:
        return fields

    # ------------------------------------------------------------------
    # 1. NAME EXTRACTION
    # ------------------------------------------------------------------
    extracted_name: Optional[str] = None

    # A. Explicit key-value line (NAME:, PATIENT:, ACCOUNT NAME:, etc.)
    for ln in clean_lines:
        m = re.match(
            r"^(?:FULL\s+|PATIENT\s+|APPLICANT\s+|ACCOUNT\s+|CUSTOMER\s+|SUBSCRIBER\s+)?(?:NAME|PATIENT)\s*[:\-]\s*(.+)$",
            ln,
            re.IGNORECASE,
        )
        if m:
            candidate = _clean_name(m.group(1))
            if candidate:
                extracted_name = candidate
                break

    # B. Narrative certificate phrasing ("This is to certify that Mr. Juan Carlos M. Dela Cruz, ...")
    if not extracted_name:
        m = re.search(
            r"(?:this\s+is\s+to\s+certify\s+that|certify\s+that|certifying\s+that)\s+"
            r"(?:(?:Mr|Mrs|Ms|Miss|Dr|Engr|Hon)\.?\s+)?"
            r"([A-Za-zñÑ][A-Za-zñÑ.\-':\s]{2,80}?)"
            r"(?=\s*,|\s+\d{1,3}\s+years?\s+old|\s+of\s+legal\s+age|\s+(?:is|a)\s+(?:a\s+)?(?:bona\s*fide\s+)?resident|\s+residing|\s+born\b)",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_name = _clean_name(m.group(1))

    # C. Fallback ("Issued to <Name>" or "Patient <Name>")
    if not extracted_name:
        m = re.search(
            r"\b(?:Issued\s+to|ISSUED\s+TO|issued\s+to|Patient|PATIENT|patient)\s+([A-Z][a-zñÑ]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-zñÑ]+){1,4})",
            flat,
        )
        if m:
            extracted_name = _clean_name(m.group(1))

    # ------------------------------------------------------------------
    # 2. ADDRESS EXTRACTION
    # ------------------------------------------------------------------
    extracted_address: Optional[str] = None

    # A. Explicit key-value line (ADDRESS:, RESIDENCE:, SERVICE ADDRESS:, etc.)
    for ln in clean_lines:
        m = re.match(
            r"^(?:SERVICE\s+|BILLING\s+|HOME\s+|RESIDENTIAL\s+|PRESENT\s+)?(?:ADDRESS|RESIDENCE)\s*[:\-]\s*(.+)$",
            ln,
            re.IGNORECASE,
        )
        if m:
            candidate = _clean_address(m.group(1), flat, raw_lines)
            if candidate:
                extracted_address = candidate
                break

    # B. Narrative phrasing ("resident of 123 Sampaguita St., Barangay Holy Spirit, Quezon City, is known...")
    if not extracted_address:
        m = re.search(
            r"(?:(?:a\s+)?(?:bona\s*fide\s+)?(?:resident\s+of|residing\s+at|resides\s+at))\s+"
            r"(.+?)"
            r"(?=\s*(?:,\s*)?(?:\bis\s+(?:known|a\s+bona|hereby|an?\s+indigent)|\bhas\s+no\b|\band\s+(?:is|has)\b|\bwho\s+is\b|\bfor\s+the\s+past\b|\bthis\s+certif|\.|;|$))",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_address = _clean_address(m.group(1), flat, raw_lines)

    # C. Explicit BARANGAY: line fallback
    if not extracted_address:
        for ln in clean_lines:
            m = re.match(r"^BARANGAY\s*[:\-]\s*(.+)$", ln, re.IGNORECASE)
            if m:
                candidate = _clean_address(m.group(1), flat, raw_lines)
                if candidate:
                    extracted_address = candidate
                    break

    # D. Header Barangay + City fallback (e.g. "BARANGAY 12, CALOOCAN CITY")
    if not extracted_address:
        for ln in clean_lines:
            if re.match(r"^BARANGAY\s+[A-Za-z0-9\s\-]+,\s*[A-Za-z\s]+(?:CITY|MANILA|MUNICIPALITY)\b", ln, re.IGNORECASE):
                candidate = _clean_address(ln, flat, raw_lines)
                if candidate:
                    extracted_address = candidate
                    break

    # ------------------------------------------------------------------
    # 3. PURPOSE EXTRACTION
    # ------------------------------------------------------------------
    extracted_purpose: Optional[str] = None

    # A. Explicit key-value line (PURPOSE:, REASON:)
    for ln in clean_lines:
        m = re.match(r"^(?:PURPOSE|REASON|INTENDED\s+PURPOSE)\s*[:\-]\s*(.+)$", ln, re.IGNORECASE)
        if m:
            candidate = _clean_purpose(m.group(1))
            if candidate:
                extracted_purpose = candidate
                break

    # B. Narrative issuance clause ("...issued upon the request of the above-named individual for whatever legal purpose it may serve.")
    if not extracted_purpose:
        m = re.search(
            r"(?:issued\s+(?:upon\s+(?:the\s+)?request\s+of\s+(?:the\s+)?(?:above[- ]named\s+(?:individual|person|resident|applicant|patient)|bearer|applicant|patient|him|her)\s+)?"
            r"for\s+(?:the\s+purpose\s+of\s+)?|"
            r"for\s+the\s+purpose\s+of\s+|"
            r"to\s+be\s+used\s+for\s+|"
            r"intended\s+for\s+)"
            r"(.+?)(?:\.|;|$)",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_purpose = _clean_purpose(m.group(1))

    # C. Common standalone phrases
    if not extracted_purpose:
        m = re.search(r"\b(whatever\s+legal\s+purpose\s+it\s+may\s+serve)\b", flat, re.IGNORECASE)
        if m:
            extracted_purpose = _clean_purpose(m.group(1))

    if not extracted_purpose:
        m = re.search(
            r"\b((?:medical|financial|hospital|educational|burial|scholarship|ophthalmic|surgical)\s+assistance(?:\s*\([^)]+\))?)\b",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_purpose = _clean_purpose(m.group(1))

    if extracted_name:
        fields["name"] = extracted_name
    if extracted_address:
        fields["address"] = extracted_address
    if extracted_purpose:
        fields["purpose"] = extracted_purpose

    return fields
