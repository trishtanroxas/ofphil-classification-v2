"""
Evidence Aggregation Engine for OFPHIL Document Authenticity Verification.

Approved Decision Paradigm:
A document must NEVER be labeled 'Authentic' simply because checks return no suspicious indicators.
Checks provide different kinds of evidence; none independently proves authenticity.

Screening Statuses:
1. NO_SUSPICIOUS_INDICATORS (No anomaly detected among performed checks, but not a legal proof of genuineness)
2. NEEDS_VERIFICATION (Missing metadata, borderline quality, photocopies, or partial checks needing MSW follow-up)
3. FLAGGED_FOR_MANUAL_REVIEW (Forensic anomalies detected: ELA, noise, editing tags, copy-move duplication)
4. INSUFFICIENT_IMAGE_QUALITY (Resolution too low, severe blur, or corrupted payload)

Individual Module Statuses:
- PASSED
- SUSPICIOUS
- NOT_EVALUATED
- INSUFFICIENT_EVIDENCE
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScreeningAssessment(BaseModel):
    status: str  # NO_SUSPICIOUS_INDICATORS | NEEDS_VERIFICATION | FLAGGED_FOR_MANUAL_REVIEW | INSUFFICIENT_IMAGE_QUALITY
    tamper_risk: str  # LOW | MEDIUM | HIGH | UNDETERMINED
    document_integrity_screening_score: float = Field(
        default=100.0,
        description="Document Integrity Screening Score (0.0% to 100.0%). Evidence-based screening index, not a mathematical probability of authenticity."
    )
    score_interpretation: str = Field(
        default="High Integrity Indicator",
        description="Explains what the screening score indicates."
    )
    score_contributors: List[str] = Field(
        default_factory=list,
        description="List of positive or negative evidence contributors to the screening score."
    )
    reason: str
    summary: str
    supporting_evidence: List[str] = Field(default_factory=list)
    confidence_assessment: str
    disclaimer: str = (
        "Automated forensic screening provides evidence of integrity or anomalies. "
        "It does NOT definitively prove authenticity or replace certified MSW document validation."
    )


class EvidenceAggregationEngine:
    """
    Consolidates forensic findings, signature detection, stamp presence,
    and OCR signals into a defensible evidential screening decision.
    """

    def aggregate(
        self,
        forensic_results: Dict[str, Any],
        signature_result: Dict[str, Any],
        stamp_result: Dict[str, Any],
        ocr_result: Dict[str, Any],
        document_type: str = "general",
    ) -> ScreeningAssessment:
        supporting_evidence: List[str] = []
        suspicious_modules: List[str] = []
        insufficient_modules: List[str] = []
        not_evaluated_modules: List[str] = []
        passed_modules: List[str] = []

        # Audit forensic checks
        for module_name, check_data in forensic_results.items():
            mod_status = check_data.get("status", "NOT_EVALUATED")
            mod_details = check_data.get("details", "")
            if mod_status == "SUSPICIOUS":
                suspicious_modules.append(module_name)
                supporting_evidence.append(f"[{module_name.upper()}] Suspicious finding: {mod_details}")
            elif mod_status == "INSUFFICIENT_EVIDENCE":
                insufficient_modules.append(module_name)
            elif mod_status == "NOT_EVALUATED":
                not_evaluated_modules.append(module_name)
            elif mod_status == "PASSED":
                passed_modules.append(module_name)
                # Keep note of passed evidence
                if "disparity" in mod_details or "Uniform" in mod_details or "meets" in mod_details:
                    supporting_evidence.append(f"[{module_name.upper()}] Consistent: {mod_details}")

        # Audit Signature
        sig_status = signature_result.get("status", "NOT_EVALUATED")
        sig_presence = signature_result.get("presence", False)
        if sig_status == "SUSPICIOUS":
            suspicious_modules.append("signature_screening")
            supporting_evidence.append(f"[SIGNATURE] Suspicious: {signature_result.get('details', '')}")
        elif sig_status == "NOT_EVALUATED":
            not_evaluated_modules.append("signature_screening")
        elif sig_status == "INSUFFICIENT_EVIDENCE":
            insufficient_modules.append("signature_screening")
        elif sig_presence:
            passed_modules.append("signature_presence")
            supporting_evidence.append("[SIGNATURE] Presence detected (does not verify signer identity).")
        else:
            doc_type_upper = document_type.upper()
            if any(k in doc_type_upper for k in ("INDIGENCY", "CERTIFICATE", "SIGNED")):
                supporting_evidence.append("[SIGNATURE] Missing expected handwritten signature in target credential.")

        # Audit Stamp / Seal
        stamp_status = stamp_result.get("status", "NOT_EVALUATED")
        stamp_presence = stamp_result.get("presence", False)
        if stamp_status == "SUSPICIOUS":
            suspicious_modules.append("stamp_seal_screening")
            supporting_evidence.append(f"[STAMP_SEAL] Suspicious: {stamp_result.get('details', '')}")
        elif stamp_status == "NOT_EVALUATED":
            not_evaluated_modules.append("stamp_seal_screening")
        elif stamp_status == "INSUFFICIENT_EVIDENCE":
            insufficient_modules.append("stamp_seal_screening")
        elif stamp_presence:
            passed_modules.append("stamp_seal_presence")
            supporting_evidence.append("[STAMP_SEAL] Stamp/seal geometry detected (does not verify issuing authority legitimacy).")

        # Audit OCR
        ocr_status = ocr_result.get("status", "NOT_EVALUATED")
        ocr_text = ocr_result.get("extracted_text") or ""
        ocr_conf = ocr_result.get("confidence_score")
        if ocr_status == "INSUFFICIENT_EVIDENCE" or (ocr_status == "COMPLETED" and not ocr_text):
            supporting_evidence.append("[OCR] No machine-readable textual fields extracted from document.")
        elif ocr_status == "COMPLETED":
            supporting_evidence.append(f"[OCR] Machine text extracted (confidence: {ocr_conf or 'N/A'}).")

        # Determine Final Aggregated Screening Status & Document Integrity Screening Score
        # Rule 1: Insufficient image quality
        res_check = forensic_results.get("resolution_analysis", {})
        if (
            res_check.get("status") == "INSUFFICIENT_EVIDENCE"
            or len(insufficient_modules) >= 3
        ):
            final_status = "INSUFFICIENT_IMAGE_QUALITY"
            tamper_risk = "UNDETERMINED"
            reason = "Document spatial resolution or image clarity is insufficient to perform reliable evidential forensic analysis."
            summary = "Insufficient image quality for digital forensic verification. Physical inspection recommended."
            confidence = "LOW"
            screening_score = 40.0
            score_interpretation = "Insufficient Image Quality (Inconclusive Forensic Screening)"

        # Rule 2: Flagged for manual review (high or medium tampering indicators)
        elif len(suspicious_modules) >= 2 or any(
            m in suspicious_modules for m in ("metadata_analysis", "copy_move_analysis")
        ):
            final_status = "FLAGGED_FOR_MANUAL_REVIEW"
            tamper_risk = "HIGH" if len(suspicious_modules) >= 2 else "MEDIUM"
            reason = f"Corroborated forensic anomalies detected in: {', '.join(suspicious_modules)}."
            summary = f"Flagged for caseworker manual review due to {len(suspicious_modules)} suspicious forensic indicators."
            confidence = "HIGH" if len(suspicious_modules) >= 2 else "MODERATE"
            penalty = 30.0 * len(suspicious_modules)
            screening_score = max(15.0, round(100.0 - penalty, 1))
            score_interpretation = "Elevated Anomaly Concern (Requires Exhaustive Physical Verification)"

        elif len(suspicious_modules) == 1:
            final_status = "FLAGGED_FOR_MANUAL_REVIEW"
            tamper_risk = "MEDIUM"
            reason = f"Isolated forensic anomaly detected in {suspicious_modules[0]} requiring caseworker examination."
            summary = f"Isolated forensic indicator ({suspicious_modules[0]}) flagged for manual review."
            confidence = "MODERATE"
            screening_score = 65.0
            score_interpretation = "Moderate Anomaly Concern (Isolated Indicator Requiring Review)"

        # Rule 3: Needs verification (missing critical evidence, unverified checks, photocopies, missing signature)
        elif (
            len(not_evaluated_modules) >= 2
            or (forensic_results.get("metadata_analysis", {}).get("status") == "NOT_EVALUATED")
            or (any(k in document_type.upper() for k in ("INDIGENCY", "CERTIFICATE")) and not sig_presence)
        ):
            final_status = "NEEDS_VERIFICATION"
            tamper_risk = "UNDETERMINED"
            unverified_notes = []
            if forensic_results.get("metadata_analysis", {}).get("status") == "NOT_EVALUATED":
                unverified_notes.append("missing EXIF metadata")
            if not sig_presence and any(k in document_type.upper() for k in ("INDIGENCY", "CERTIFICATE")):
                unverified_notes.append("unconfirmed ink signature")
            if not_evaluated_modules:
                unverified_notes.append(f"{len(not_evaluated_modules)} unevaluated module(s)")

            reason = f"Document lacks conclusive digital verification ({', '.join(unverified_notes)}). Verification by caseworker required."
            summary = "Document requires secondary caseworker verification before clinical grant finalization."
            confidence = "MODERATE"
            screening_score = 82.5
            score_interpretation = "Standard Screening Passed with Secondary Verifications Pending"

        # Rule 4: No suspicious indicators (all evaluated modules passed without anomaly)
        else:
            final_status = "NO_SUSPICIOUS_INDICATORS"
            tamper_risk = "LOW"
            reason = "Automated forensic screening did not detect image tampering, compression disparities, copy-move duplication, or metadata anomalies."
            summary = "No suspicious forensic indicators detected across all executed screening modules."
            confidence = "HIGH"
            screening_score = 96.0
            score_interpretation = "High Integrity Indicator (Zero Forensic Anomalies Detected)"

        return ScreeningAssessment(
            status=final_status,
            tamper_risk=tamper_risk,
            document_integrity_screening_score=screening_score,
            score_interpretation=score_interpretation,
            score_contributors=passed_modules + ([f"anomalies_flagged: {len(suspicious_modules)}"] if suspicious_modules else []),
            reason=reason,
            summary=summary,
            supporting_evidence=supporting_evidence,
            confidence_assessment=confidence,
        )


evidence_aggregation_engine = EvidenceAggregationEngine()
