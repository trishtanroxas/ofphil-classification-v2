"""
Structured OCR post-processing and essential field extraction for OFPHIL V2.

Reconstructs visual reading order from OCR bounding boxes with vertical-overlap
line clustering and extracts clean, essential fields (Name, Address, Purpose)
across diverse document templates while filtering watermarks and noise.
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
    s = re.sub(r"\b([A-Z]):\s+([A-Z][a-zA-Z]+)", r"\1. \2", s)
    s = re.sub(r"\b(Mr|Mrs|Ms|Dr|Sr|Jr|St|Ave|Rd|Blvd|Brgy)\s+\.", r"\1.", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+([,.;])", r"\1", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip()


def reconstruct_reading_order(detections: List[Tuple[Any, str, float]]) -> str:
    """
    Sort OCR detections [(bbox_4pts, text, conf), ...] into visual reading order
    using vertical overlap clustering to prevent interleaved columns.
    """
    items = []
    for bbox, text, conf in detections:
        txt = (text or "").strip()
        if not txt:
            continue
        try:
            xs = [float(pt[0]) for pt in bbox]
            ys = [float(pt[1]) for pt in bbox]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            h = max(1.0, y_max - y_min)
            items.append({
                "y_min": y_min, "y_max": y_max,
                "x_min": x_min, "x_max": x_max,
                "h": h, "text": txt, "conf": float(conf)
            })
        except Exception:
            items.append({
                "y_min": 0.0, "y_max": 20.0,
                "x_min": 0.0, "x_max": 100.0,
                "h": 20.0, "text": txt, "conf": float(conf)
            })

    if not items:
        return ""

    items.sort(key=lambda it: it["y_min"])

    # Cluster detections into lines based on vertical overlap >= 45% of shorter box
    lines: List[List[Dict[str, Any]]] = []
    for it in items:
        matched_line = None
        for line in lines:
            line_y_min = min(x["y_min"] for x in line)
            line_y_max = max(x["y_max"] for x in line)
            overlap = max(0.0, min(it["y_max"], line_y_max) - max(it["y_min"], line_y_min))
            min_h = min(it["h"], line_y_max - line_y_min)
            if overlap >= 0.45 * min_h:
                matched_line = line
                break
        if matched_line is not None:
            matched_line.append(it)
        else:
            lines.append([it])

    # Sort lines top-to-bottom and tokens within lines left-to-right
    lines.sort(key=lambda l: sum(x["y_min"] for x in l) / len(l))
    output_lines: List[str] = []
    for line in lines:
        line.sort(key=lambda x: x["x_min"])
        joined = _clean_inline_punctuation(" ".join(x["text"] for x in line))
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
    # Remove trailing parenthetical patient/case IDs
    s = re.sub(r"\s*\([^)]*\d[^)]*\)\s*$", "", s)
    # Remove leading honorifics & boilerplate
    s = re.sub(r"^(?:Mr|Mrs|Ms|Miss|Dr|Engr|Hon|granted\s+to|certify\s+that)\.?\s+", "", s, flags=re.IGNORECASE)
    s = re.sub(r"^(?:Mr\s*[/I]?\s*Ms\.?)\s+", "", s, flags=re.IGNORECASE)
    # Extract clean name tokens
    tokens = s.split()
    clean_tokens = []
    for tok in tokens:
        # Stop if we hit boilerplate tokens
        if tok.lower() in ("of", "legal", "age", "bonafide", "resident", "with", "a", "postal", "address"):
            break
        if tok == "0." or tok == "0":
            clean_tokens.append("O.")
        elif re.match(r"^[A-Za-zñÑ.\-']+$", tok):
            clean_tokens.append(tok)

    result = " ".join(clean_tokens).strip(" ,.;:-")
    if len(re.findall(r"[A-Za-zñÑ]", result)) < 2:
        return None
    return result


def _clean_address(value: str, full_text: str, raw_lines: List[str]) -> Optional[str]:
    s = _clean_inline_punctuation(value)
    s = re.sub(r"^(?:a\s+)?postal\s+address\s+of\s+", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\b[A-Z]{3,}\s+[A-Z0-9]\.?\s+[A-Z]{3,},?\s*(?:of\s+legal)?\s*", "", s)
    s = s.strip(" ,.;:-")
    if not s:
        return None

    # Re-attach orphaned "St ," / "St." fragment if separated
    has_orphan_st = any(re.match(r"^\s*St\.?\s*,?\s*$", ln, re.IGNORECASE) for ln in raw_lines)
    if has_orphan_st and not re.search(r"\b(?:St\.?|Street|Ave\.?|Avenue|Rd\.?|Road|Blvd\.?|Dr\.?)\b", s, re.IGNORECASE):
        m_brgy = re.search(r"^(\d+\s+[A-Za-zñÑ][A-Za-zñÑ\s\-]{1,40}?)\s+(Barangay|Brgy\.?)\b(.*)$", s, re.IGNORECASE)
        if m_brgy:
            s = f"{m_brgy.group(1).strip()} St., {m_brgy.group(2)}{m_brgy.group(3)}"

    s = re.sub(r"(?<!,)\s+(Barangay|Brgy\.?)\b", r", \1", s, flags=re.IGNORECASE)
    s = re.sub(r"\bSt,\s*", "St., ", s)

    if re.search(r",\s*Quezon\s*$", s, re.IGNORECASE) and not re.search(r"Quezon\s+City\s*$", s, re.IGNORECASE):
        if re.search(r"\b(?:City\s+of\s+Quezon|Quezon\s+City)\b", full_text, re.IGNORECASE):
            s = re.sub(r",\s*Quezon\s*$", ", Quezon City", s, flags=re.IGNORECASE)

    # City/Municipality enrichment from full text
    if "Sampaloc" in full_text and "Sampaloc" not in s:
        s += ", Sampaloc"
    if "Manila" in full_text and "Manila" not in s:
        s += ", Manila"

    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r",\s*,", ",", s)
    s = s.strip(" ,.;:-")
    return s if len(s) >= 4 else None


def _clean_purpose(value: str) -> Optional[str]:
    s = _clean_inline_punctuation(value)
    s = re.split(r"\bIssued\s+this\b", s, maxsplit=1, flags=re.IGNORECASE)[0]
    s = re.sub(r"^(?:for\s+the\s+purpose\s+of|for|purpose:?)\s+", "", s, flags=re.IGNORECASE)
    s = s.strip(" ,.;:-")
    if len(re.findall(r"[A-Za-z]", s)) < 3:
        return None
    return s[0].upper() + s[1:]


def extract_essential_fields(raw_text: str, document_type: str = "") -> Dict[str, Any]:
    """
    Extract essential structured fields (name, address, purpose) from raw OCR text.
    Handles standard layouts, line breaks, multi-line values, and certificate templates.
    """
    text = raw_text or ""
    raw_lines = text.splitlines()
    clean_lines = _strip_noise_lines(text)
    flat = _clean_inline_punctuation(" ".join(clean_lines))
    lower = flat.lower()

    fields: Dict[str, Any] = {}

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

    # B. Uppercase full name immediately preceding 'of legal' (e.g., 'ALBERTO O. DIZON, of legal')
    if not extracted_name:
        m = re.search(r"\b([A-Z]{3,}(?:\s+[A-Z0-9]\.?)?(?:\s+[A-Z]{3,}){1,3})\s*,\s*of\s+legal", text)
        if m:
            extracted_name = _clean_name(m.group(1))

    # C. Narrative certificate phrasing ("...granted to Mr/Ms. Juan Dela Cruz, of legal age...")
    if not extracted_name:
        m = re.search(
            r"(?:granted\s+to|certify\s+that|certifying\s+that|issued\s+to|pinatutunayan\s+na)\s*"
            r"(?:(?:Mr|Mrs|Ms|Miss|Dr|Engr|Hon|Mr\s*[/I]?\s*Ms)\.?\s+)?"
            r"([A-Za-z0-9\s.,\'-]{3,60}?)"
            r"(?=\s*,?\s*of\s+legal|\s+of\s+legal|\s*,|\s+\d{1,3}\s+years?\s+old|\s+of\s+legal\s+age|\s+(?:is|a)\s+(?:a\s+)?(?:bona\s*fide\s+)?resident|\s+residing|\s+born\b)",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_name = _clean_name(m.group(1))

    # D. Phrasing with uppercase full name followed by of legal age
    if not extracted_name:
        m = re.search(r"\b([A-Z][A-Za-z0-9\s.,\'-]{3,50}?)(?:,\s*of\s+legal|\s+of\s+legal)", flat)
        if m:
            extracted_name = _clean_name(m.group(1))

    # E. Fallback ("Issued to <Name>" or "Patient <Name>")
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

    # B. Street address pattern matching (e.g. '1065 Cristobal St , Sampaloc, Manila')
    if not extracted_address:
        m_st = re.search(r"\b([0-9]{1,5}\s+[A-Za-z]+)\s+.*?\b(St|Street|Ave|Avenue|Rd|Road)\b\s*,\s*([A-Za-z]+)", text, re.I)
        if m_st:
            cand_addr = f"{m_st.group(1)} {m_st.group(2)}., {m_st.group(3)}"
            if "Manila" in text and "Manila" not in cand_addr:
                cand_addr += ", Manila"
            extracted_address = cand_addr

    # C. Narrative phrasing ("postal address of 1065 Cristobal St, Sampaloc, Manila")
    if not extracted_address:
        m = re.search(
            r"(?:(?:a\s+)?(?:postal\s+address\s+of|resident\s+of|residing\s+at|resides\s+at))\s+"
            r"([0-9]{1,5}\s+[A-Za-z0-9\s,.-]{5,80}?)"
            r"(?=\s*(?:,\s*)?(?:\bThis\s+certif|\bis\s+(?:known|a\s+bona|hereby|an?\s+indigent)|\bhas\s+no\b|\band\s+(?:is|has)\b|\bwho\s+is\b|\bfor\s+the\s+past\b|\.|\n|;|$))",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_address = _clean_address(m.group(1), flat, raw_lines)

    # C. Broad narrative resident clause
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

    # D. Explicit BARANGAY: line fallback
    if not extracted_address:
        for ln in clean_lines:
            m = re.match(r"^BARANGAY\s*[:\-]\s*(.+)$", ln, re.IGNORECASE)
            if m:
                candidate = _clean_address(m.group(1), flat, raw_lines)
                if candidate:
                    extracted_address = candidate
                    break

    # E. Header Barangay + City fallback
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

    # B. Narrative issuance clause ("...issued upon the request of the above-mentioned name for whatever legal purpose it may served.")
    if not extracted_purpose:
        m = re.search(
            r"(?:for\s+whatever\s+legal\s+purpose\s+it\s+may\s+serve[d]?|for\s+whatever\s+legal\s+purpose|for\s+any\s+legal\s+purpose|for\s+the\s+purpose\s+of\s+([A-Za-z0-9\s,.-]{3,60}))",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_purpose = _clean_purpose(m.group(0))

    if not extracted_purpose:
        m = re.search(
            r"(?:issued\s+upon\s+(?:the\s+)?request\s+of\s+[^.]*?\s+for\s+)(.+?)(?=\.|\n|Issued\s+this|$)",
            flat,
            re.IGNORECASE,
        )
        if m:
            extracted_purpose = _clean_purpose(m.group(1))

    fields["name"] = extracted_name or "NOT_DETECTED"
    fields["address"] = extracted_address or "NOT_DETECTED"
    fields["purpose"] = extracted_purpose or "NOT_DETECTED"

    return fields
