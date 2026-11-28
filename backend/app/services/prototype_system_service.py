"""
Prototype System Service.
Provides pure, isolated demonstration workflows for the approved OFPHIL Clinical Decision Support System:
- Pipeline 1: ResNet-50 Document Classification, PaddleOCR, Signatures/Stamps, Forensics, Evidence Aggregation
- Pipeline 2: Qwen3-4B-Instruct-2507 Interview Turns, Information Extraction, 4-Dimension Consistency Scoring
- Pipeline 3: ML Eligibility Classification (LR, CatBoost, EBM, Soft-Voting Ensemble, SHAP explanations)
- Centralized Patient Consolidation & Reconciliation (NO Multimodal Late Fusion)
- MSW Verification, Override Recording & Assessment Report Generation

STRICT SAFETY GUARANTEES:
- Storage is strictly isolated to backend/storage/prototype/
- Completely segregated from data/raw, data/processed, models/phase_05, and experiments/
- Every result emits execution_mode="PROTOTYPE_SIMULATED"
- Does NOT perform automated patient rejection
"""
import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.paths import STORAGE_DIR
from app.schemas.prototype_schemas import (
    PrototypeAssessmentReportResponse,
    PrototypeConsolidationResponse,
    PrototypeDocumentClassificationResponse,
    PrototypeEligibilityPredictionResponse,
    PrototypeEvidenceAggregationResponse,
    PrototypeForensicAnalysisResponse,
    PrototypeInterviewConsistencyResponse,
    PrototypeInterviewTurnResponse,
    PrototypeOCRExtractionResponse,
    PrototypeSignatureStampScreeningResponse,
)
from app.shared.logging.logger import get_logger

logger = get_logger("PrototypeSystemService")

PROTOTYPE_STORAGE_DIR = STORAGE_DIR / "prototype"
PROTOTYPE_RECORDS_FILE = PROTOTYPE_STORAGE_DIR / "prototype_demonstrations.json"
PROTOTYPE_REPORTS_FILE = PROTOTYPE_STORAGE_DIR / "prototype_assessment_reports.json"


def _ensure_prototype_storage():
    PROTOTYPE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    if not PROTOTYPE_RECORDS_FILE.exists():
        PROTOTYPE_RECORDS_FILE.write_text("{}", encoding="utf-8")
    if not PROTOTYPE_REPORTS_FILE.exists():
        PROTOTYPE_REPORTS_FILE.write_text("{}", encoding="utf-8")


def _utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class PrototypeSystemService:
    def __init__(self):
        _ensure_prototype_storage()

    # -------------------------------------------------------------------------
    # PIPELINE 1: DOCUMENT SCREENING & IMAGE FORENSICS
    # -------------------------------------------------------------------------

    def classify_document(
        self,
        document_id: str,
        patient_id: Optional[str] = None,
        document_name: Optional[str] = None,
        simulate_category: Optional[str] = None,
    ) -> PrototypeDocumentClassificationResponse:
        """
        Demonstrates ResNet-50 5-class document categorization.
        Categories: certificate_of_indigency, government_id, electricity_bill, water_bill, medical_certificate.
        """
        valid_categories = [
            "certificate_of_indigency",
            "government_id",
            "electricity_bill",
            "water_bill",
            "medical_certificate",
        ]
        chosen = simulate_category if simulate_category in valid_categories else "certificate_of_indigency"

        # Heuristic inference from document name if provided
        if not simulate_category and document_name:
            dn = document_name.lower()
            if "indigen" in dn or "barangay" in dn:
                chosen = "certificate_of_indigency"
            elif "id" in dn or "umid" in dn or "passport" in dn or "license" in dn:
                chosen = "government_id"
            elif "meralco" in dn or "electric" in dn or "power" in dn:
                chosen = "electricity_bill"
            elif "water" in dn or "maynilad" in dn or "manila_water" in dn:
                chosen = "water_bill"
            elif "med" in dn or "cert" in dn or "clinical" in dn:
                chosen = "medical_certificate"

        return PrototypeDocumentClassificationResponse(
            document_id=document_id,
            patient_id=patient_id,
            predicted_category=chosen,
            classification_status="CATEGORIZED",
            processing_status="COMPLETED",
            confidence=0.942,
            execution_mode="PROTOTYPE_SIMULATED",
            model_version="ResNet-50-DocClassifier-v2 (Prototype)",
            disclaimer="Document-type categorization only. This model is NOT a counterfeit or legal authenticity detector."
        )

    def extract_ocr(
        self,
        document_id: str,
        document_category: Optional[str] = "certificate_of_indigency"
    ) -> PrototypeOCRExtractionResponse:
        """
        Demonstrates PaddleOCR PP-OCRv6 multilingual text and key-value field extraction.
        """
        cat = document_category or "certificate_of_indigency"
        sample_extractions = {
            "certificate_of_indigency": {
                "text": "REPUBLIKA NG PILIPINAS, LUNGSOD NG MAYNILA, BARANGAY 123. PATUNAY NG KAHIRAPAN. Pinatutunayan na si Juan Dela Cruz ay residente...",
                "fields": {
                    "document_title": "BARANGAY CERTIFICATE OF INDIGENCY",
                    "issuing_authority": "Barangay 123, Zone 9, Manila",
                    "beneficiary_name": "Juan Dela Cruz",
                    "issue_date": "2026-02-14",
                    "purpose": "Medical and Surgical Financial Assistance",
                    "signatory_name": "Hon. Maria Santos",
                    "signatory_title": "Punong Barangay",
                },
                "confidence": 0.915,
                "missing": [],
            },
            "government_id": {
                "text": "REPUBLIC OF THE PHILIPPINES. UNIFIED MULTI-PURPOSE ID. CRN-0111-2345678-9. DELA CRUZ, JUAN SANTOS...",
                "fields": {
                    "id_type": "Unified Multi-Purpose ID (UMID)",
                    "id_number": "CRN-0111-2345678-9",
                    "full_name": "JUAN SANTOS DELA CRUZ",
                    "birthdate": "1978-05-12",
                    "address": "123 Mabini St., Tondo, Manila",
                },
                "confidence": 0.952,
                "missing": [],
            },
            "electricity_bill": {
                "text": "MERALCO STATEMENT OF ACCOUNT. Customer Account Number 1234567890. Total Amount Due PHP 1,845.20...",
                "fields": {
                    "utility_provider": "MERALCO",
                    "account_number": "1234567890",
                    "service_address": "123 Mabini St., Tondo, Manila",
                    "billing_period": "JAN 2026",
                    "total_amount_due": 1845.20,
                },
                "confidence": 0.898,
                "missing": [],
            },
            "water_bill": {
                "text": "MAYNILAD WATER SERVICES INC. Account No 987654321. Current Charges PHP 420.50...",
                "fields": {
                    "utility_provider": "MAYNILAD",
                    "account_number": "987654321",
                    "service_address": "123 Mabini St., Tondo, Manila",
                    "billing_period": "JAN 2026",
                    "total_amount_due": 420.50,
                },
                "confidence": 0.887,
                "missing": [],
            },
            "medical_certificate": {
                "text": "CLINICAL ABSTRACT & MEDICAL CERTIFICATE. Patient: Juan Dela Cruz. Diagnosis: Mature Cataract, Senile, O.D....",
                "fields": {
                    "hospital_clinic": "Ophthalmological Foundation of the Philippines (OFPHIL)",
                    "attending_physician": "Dr. Roberto Mendoza, MD, DPBO",
                    "patient_name": "Juan Dela Cruz",
                    "clinical_diagnosis": "Mature Senile Cataract, OD",
                    "recommended_procedure": "Phacoemulsification with Posterior Chamber IOL Implantation",
                },
                "confidence": 0.938,
                "missing": [],
            },
        }

        demo_data = sample_extractions.get(cat, sample_extractions["certificate_of_indigency"])
        return PrototypeOCRExtractionResponse(
            document_id=document_id,
            document_category=cat,
            extracted_text_snippet=demo_data["text"],
            extracted_fields=demo_data["fields"],
            ocr_confidence=demo_data["confidence"],
            missing_or_unreadable_fields=demo_data["missing"],
            extraction_status="EXTRACTION_COMPLETE",
            execution_mode="PROTOTYPE_SIMULATED",
            engine="PaddleOCR PP-OCRv6 (Prototype Representation)",
        )

    def screen_signatures_and_stamps(
        self,
        document_id: str,
        has_signature_expected: bool = True,
        has_stamp_expected: bool = True
    ) -> PrototypeSignatureStampScreeningResponse:
        """
        Demonstrates dedicated signature & stamp localization and screening (Zero YOLO).
        Absence of reference specimen yields defensible NOT_EVALUATED for exact matching.
        """
        sig_data = {
            "status": "PRESENCE_DETECTED",
            "localization_method": "Morphological Stroke Clustering & Edge Density",
            "bounding_boxes": [{"x": 340, "y": 820, "width": 180, "height": 65}],
            "stroke_continuity_score": 0.89,
            "stroke_width_variance": 0.12,
            "reference_matching": "NOT_EVALUATED",
            "reference_notes": "Official issuer specimen signature not registered in patient credential catalog.",
            "suspicious_indicators": [],
        }

        stamp_data = {
            "status": "PRESENCE_DETECTED",
            "localization_method": "Circular Hough Transform & Ink Color Filter",
            "detected_regions": [{"cx": 480, "cy": 840, "radius": 45}],
            "circularity_metric": 0.94,
            "ink_density_score": 0.88,
            "specimen_comparison": "NOT_EVALUATED",
            "specimen_notes": "Barangay dry-seal die / ink seal template uncalibrated; manual MSW inspection recommended.",
            "suspicious_indicators": [],
        }

        return PrototypeSignatureStampScreeningResponse(
            document_id=document_id,
            signature_screening=sig_data,
            stamp_screening=stamp_data,
            overall_status="PRESENCE_CONFIRMED_REFERENCE_PENDING",
            execution_mode="PROTOTYPE_SIMULATED",
            disclaimer="Zero YOLO. Structural and morphological analysis. Absence of specimen reference data defaults to NOT_EVALUATED."
        )

    def analyze_forensics(self, document_id: str) -> PrototypeForensicAnalysisResponse:
        """
        Demonstrates 5 mathematical image forensic analyzers:
        ELA, Laplacian noise variance, chromatic dispersion, ORB copy-move, edge disparity.
        """
        ela = {
            "status": "PASSED",
            "mean_squared_error": 8.4,
            "variance": 12.1,
            "interpretation": "Homogeneous compression response across all document regions.",
        }
        noise = {
            "status": "PASSED",
            "high_frequency_variance": 34.2,
            "noise_inconsistency_score": 0.08,
            "interpretation": "Laplacian high-frequency noise variance is uniform across background and text.",
        }
        chromatic = {
            "status": "PASSED",
            "color_channel_dispersion": 0.05,
            "interpretation": "Zero synthetic RGB channel splice boundaries detected.",
        }
        orb = {
            "status": "PASSED",
            "keypoints_detected": 1420,
            "cloned_clusters_found": 0,
            "interpretation": "Zero duplicate patch copy-move clusters identified.",
        }
        edge = {
            "status": "PASSED",
            "gradient_disparity": 0.11,
            "interpretation": "Sobel edge sharpness consistent with native scan capture.",
        }

        return PrototypeForensicAnalysisResponse(
            document_id=document_id,
            ela_analysis=ela,
            noise_inconsistency=noise,
            chromatic_dispersion=chromatic,
            orb_copy_move=orb,
            edge_gradient=edge,
            overall_forensic_score=0.965,
            anomaly_count=0,
            execution_mode="PROTOTYPE_SIMULATED",
        )

    def aggregate_evidence(
        self,
        document_id: str,
        classification_result: Optional[Dict[str, Any]] = None,
        ocr_result: Optional[Dict[str, Any]] = None,
        signature_result: Optional[Dict[str, Any]] = None,
        stamp_result: Optional[Dict[str, Any]] = None,
        forensic_result: Optional[Dict[str, Any]] = None,
    ) -> PrototypeEvidenceAggregationResponse:
        """
        Demonstrates deterministic rule-based evidence aggregation.
        NO trained tampering classifier. Allowed verdicts:
        NO_SUSPICIOUS_INDICATORS, NEEDS_VERIFICATION, FLAGGED_FOR_MANUAL_REVIEW, INSUFFICIENT_IMAGE_QUALITY.
        """
        triggers: List[str] = []
        missing: List[str] = []

        if not signature_result or signature_result.get("overall_status") == "NOT_DETECTED":
            triggers.append("SIGNATURE_UNCONFIRMED: Official signatory stroke could not be automatically confirmed.")
            missing.append("Signatory signature specimen")

        if not stamp_result or stamp_result.get("overall_status") == "NOT_DETECTED":
            triggers.append("STAMP_UNCONFIRMED: Official dry seal / rubber stamp region unconfirmed.")
            missing.append("Issuing agency stamp specimen")

        # Deterministic status derivation
        if len(triggers) == 0:
            verdict = "NO_SUSPICIOUS_INDICATORS"
            risk = "LOW"
            summary = "All digital forensic and image integrity tests completed with zero detected anomalies."
        elif len(triggers) <= 2:
            verdict = "NEEDS_VERIFICATION"
            risk = "MODERATE"
            summary = "Document passes forensic integrity checks but requires MSW visual verification of official seal/signature."
        else:
            verdict = "FLAGGED_FOR_MANUAL_REVIEW"
            risk = "HIGH"
            summary = "Multiple structural or forensic indicators require exhaustive physical document verification by caseworker."

        individual_res = {
            "classification": "PASSED",
            "ocr": "PASSED",
            "forensics_ela": "PASSED",
            "forensics_noise": "PASSED",
            "forensics_chromatic": "PASSED",
            "forensics_copy_move": "PASSED",
            "signature_screening": "NEEDS_VERIFICATION" if missing else "PASSED",
            "stamp_screening": "NEEDS_VERIFICATION" if missing else "PASSED",
        }

        return PrototypeEvidenceAggregationResponse(
            document_id=document_id,
            screening_verdict=verdict,
            risk_level=risk,
            rule_triggers=triggers,
            summary_explanation=summary,
            missing_evidence=missing,
            individual_results=individual_res,
            execution_mode="PROTOTYPE_SIMULATED",
            aggregation_engine="Deterministic Rule-Based Evidence Aggregation (No Trained Tampering Classifier)"
        )

    # -------------------------------------------------------------------------
    # PIPELINE 2: LLM-ASSISTED PATIENT INTERVIEW
    # -------------------------------------------------------------------------

    def process_interview_turn(
        self,
        patient_id: str,
        conversation_history: List[Dict[str, str]],
        patient_statement: str,
    ) -> PrototypeInterviewTurnResponse:
        """
        Demonstrates Qwen3-4B-Instruct-2507 structured interview turn and entity extraction.
        """
        turn = len(conversation_history) + 1
        statement_lower = patient_statement.lower()

        extracted: Dict[str, Any] = {}
        missing: List[str] = []

        # Simple extraction heuristics for demonstration
        import re
        inc_match = re.search(r"(\d{1,3}(?:,\d{3})*|\d+)\s*(?:pesos|php|kita|sweldo|income|sahod)", statement_lower)
        if inc_match:
            try:
                extracted["monthly_family_income"] = float(inc_match.group(1).replace(",", ""))
            except ValueError:
                pass

        hh_match = re.search(r"(\d+)\s*(?:kami|katao|members|pamilya|kasama)", statement_lower)
        if hh_match:
            try:
                extracted["household_size"] = int(hh_match.group(1))
            except ValueError:
                pass

        if "monthly_family_income" not in extracted:
            missing.append("monthly_family_income")
        if "household_size" not in extracted:
            missing.append("household_size")
        if "housing_condition" not in extracted:
            missing.append("housing_condition")

        # Formulate empathetic follow-up
        if "monthly_family_income" in extracted and "household_size" not in extracted:
            followup = "Salamat po sa pagbabahagi. Ilan po kayong kabuuang miyembro ng pamilya na naninirahan sa inyong tahanan?"
        elif "household_size" in extracted and "monthly_family_income" not in extracted:
            followup = "Naiintindihan po namin. Magkano po ang tinatayang kabuuang buwanang kita o panggagalingan ng panggastos ng inyong sambahayan?"
        else:
            followup = "Maraming salamat po sa inyong sagot. Mayroon pa po ba kayong iba pang miyembro ng pamilya o anak na may kapansanan o nangangailangan ng regular na gamutan?"

        return PrototypeInterviewTurnResponse(
            patient_id=patient_id,
            ai_response_or_followup=followup,
            extracted_entities=extracted,
            missing_information_detected=missing,
            conversation_turn=turn,
            execution_mode="PROTOTYPE_SIMULATED",
            model_representation="Qwen3-4B-Instruct-2507 (Prototype Structured Interview Assistant)"
        )

    def assess_interview_consistency(
        self,
        patient_id: str,
        interview_transcript: Optional[str] = None,
        structured_responses: Optional[Dict[str, Any]] = None,
        clarification_answers: Optional[Dict[str, str]] = None,
        interview_answers: Optional[List[Dict[str, Any]]] = None,
        clarification_items: Optional[List[Dict[str, Any]]] = None,
        background: Optional[Dict[str, Any]] = None,
        medical_difficulties: Optional[Dict[str, Any]] = None,
        psychosocial: Optional[Dict[str, Any]] = None,
        total_household_income: Optional[float] = None,
        household_size: Optional[int] = None,
    ) -> PrototypeInterviewConsistencyResponse:
        """
        Demonstrates the approved 4-dimension interview percentage assessment:
        1. Information Consistency (35%)
        2. Response Completeness (25%)
        3. Cross-Field Consistency (25%)
        4. Clarification Resolution (15%)
        Uses explainable rule-based Qwen3-4B representation scoring.
        """
        from app.services.interview_scoring_service import evaluate_interview_assessment

        answers_list = interview_answers or []
        if not answers_list and structured_responses:
            for k, v in structured_responses.items():
                answers_list.append({
                    "question_key": k,
                    "question_text": k.replace("_", " ").title(),
                    "patient_answer": str(v),
                    "msw_observation": "",
                })

        # Process clarification_answers if clarification_items not provided directly
        c_items = clarification_items or []
        if not c_items and clarification_answers:
            for q, a in clarification_answers.items():
                c_items.append({
                    "original_answer": "Prior statement requiring clarification",
                    "clarification_question": q,
                    "patient_clarification": a,
                })

        scoring_res = evaluate_interview_assessment(
            interview_answers=answers_list,
            background=background or structured_responses,
            medical_difficulties=medical_difficulties,
            psychosocial=psychosocial,
            clarification_items=c_items,
            patient_id=patient_id,
            total_household_income=total_household_income,
            household_size=household_size,
        )

        dim_scores: Dict[str, Optional[float]] = {
            "information_consistency": scoring_res.information_consistency,
            "response_completeness": scoring_res.response_completeness,
            "cross_field_consistency": scoring_res.cross_field_consistency,
            "clarification_resolution": scoring_res.clarification_resolution,
        }

        identified_disc = [f"{d.comparison_topic}: {d.finding}" for d in scoring_res.cross_field_discrepancies]

        return PrototypeInterviewConsistencyResponse(
            patient_id=patient_id,
            overall_consistency_score=scoring_res.overall_consistency_score,
            dimension_scores=dim_scores,
            provisional_interpretation=scoring_res.provisional_interpretation,
            score_label=scoring_res.score_label,
            status=scoring_res.status,
            identified_discrepancies=identified_disc,
            missing_information=scoring_res.missing_information,
            unresolved_questions=scoring_res.unresolved_questions,
            clarification_history=[c.model_dump() for c in scoring_res.clarification_history],
            per_question_assessments=[q.model_dump() for q in scoring_res.per_question_assessments],
            cross_field_discrepancies=[d.model_dump() for d in scoring_res.cross_field_discrepancies],
            msw_verification_recommendations=[
                "Verify reported informal livelihood with community health worker / barangay certificate.",
                "Review utility receipts against stated monthly utility expense in Stage 1.",
            ],
            msw_verification_status=scoring_res.msw_verification_status,
            execution_mode="PROTOTYPE_SIMULATED",
            model_representation=scoring_res.model_representation,
            assessment_timestamp=scoring_res.assessment_timestamp,
            disclaimer="Qualitative interview assessment only. Score is NOT added to ML predictors and does NOT automatically reject patients.",
        )

    # -------------------------------------------------------------------------
    # PIPELINE 3: ML ELIGIBILITY CLASSIFICATION (APPROVED 27 PREDICTORS)
    # -------------------------------------------------------------------------

    def predict_eligibility(
        self,
        patient_id: str,
        selected_model: str,
        features_27: Dict[str, Any],
    ) -> PrototypeEligibilityPredictionResponse:
        """
        Demonstrates ML Eligibility Classification across the approved models:
        1. Logistic Regression
        2. CatBoost
        3. Explainable Boosting Machine (EBM)
        4. Soft Voting Ensemble
        STRICT: strictly uses the approved 27 predictors.
        """
        # Feature extraction
        income = float(features_27.get("monthly_family_income") or 8000.0)
        hh_size = max(1, int(features_27.get("household_size") or 4))
        obligations = float(features_27.get("monthly_household_obligations_expenses") or 3000.0)
        utilities = float(features_27.get("monthly_utility_expenses") or 1500.0)
        cost_of_tx = float(features_27.get("cost_of_treatment") or 35000.0)
        per_capita = income / hh_size

        # Model-specific simulated predictions
        lr_prob = 0.88 if per_capita < 6000 else (0.72 if per_capita < 12000 else 0.35)
        cb_prob = 0.94 if per_capita < 6000 else (0.81 if per_capita < 12000 else 0.28)
        ebm_prob = 0.91 if per_capita < 6000 else (0.79 if per_capita < 12000 else 0.31)
        ensemble_prob = round((lr_prob + cb_prob + ebm_prob) / 3.0, 3)

        model_comparisons = {
            "Logistic Regression": {
                "probability": lr_prob,
                "eligibility": "ELIGIBLE" if lr_prob >= 0.50 else "INELIGIBLE",
                "tier": "Tier 1 — Full Subsidy (100%)" if lr_prob >= 0.85 else ("Tier 2 — High Subsidy (75%)" if lr_prob >= 0.50 else "Ineligible / Self-Pay"),
            },
            "CatBoost": {
                "probability": cb_prob,
                "eligibility": "ELIGIBLE" if cb_prob >= 0.50 else "INELIGIBLE",
                "tier": "Tier 1 — Full Subsidy (100%)" if cb_prob >= 0.85 else ("Tier 2 — High Subsidy (75%)" if cb_prob >= 0.50 else "Ineligible / Self-Pay"),
            },
            "Explainable Boosting Machine (EBM)": {
                "probability": ebm_prob,
                "eligibility": "ELIGIBLE" if ebm_prob >= 0.50 else "INELIGIBLE",
                "tier": "Tier 1 — Full Subsidy (100%)" if ebm_prob >= 0.85 else ("Tier 2 — High Subsidy (75%)" if ebm_prob >= 0.50 else "Ineligible / Self-Pay"),
            },
            "Soft Voting Ensemble": {
                "probability": ensemble_prob,
                "eligibility": "ELIGIBLE" if ensemble_prob >= 0.50 else "INELIGIBLE",
                "tier": "Tier 1 — Full Subsidy (100%)" if ensemble_prob >= 0.85 else ("Tier 2 — High Subsidy (75%)" if ensemble_prob >= 0.50 else "Ineligible / Self-Pay"),
            },
        }

        active = model_comparisons.get(selected_model, model_comparisons["Soft Voting Ensemble"])
        prob = active["probability"]
        is_eligible = prob >= 0.50
        tier = active["tier"]
        subsidy_pct = 100.0 if "100%" in tier else (75.0 if "75%" in tier else 0.0)

        # Top SHAP feature contributions
        top_contributions = [
            {"feature": "monthly_family_income", "value": f"₱{income:,.2f}", "importance": 0.38, "direction": "POSITIVE_FOR_CHARITY"},
            {"feature": "household_size", "value": str(hh_size), "importance": 0.24, "direction": "POSITIVE_FOR_CHARITY"},
            {"feature": "cost_of_treatment", "value": f"₱{cost_of_tx:,.2f}", "importance": 0.18, "direction": "POSITIVE_FOR_CHARITY"},
            {"feature": "certificate_of_indigency", "value": str(features_27.get("certificate_of_indigency") or "YES"), "importance": 0.12, "direction": "POSITIVE_FOR_CHARITY"},
            {"feature": "monthly_utility_expenses", "value": f"₱{utilities:,.2f}", "importance": 0.08, "direction": "NEUTRAL"},
        ]

        shap_summary = {
            "base_value": 0.50,
            "prediction_value": prob,
            "summary_statement": f"Low household per-capita income (₱{per_capita:,.2f}/member) and high surgical procedure cost strongly drive subsidy recommendation.",
        }

        return PrototypeEligibilityPredictionResponse(
            patient_id=patient_id,
            model_name=selected_model,
            predicted_eligibility="Eligible for Charity Medical Assistance" if is_eligible else "Ineligible / Standard Clinic Fee",
            predicted_grant_tier=tier,
            recommended_subsidy_percentage=subsidy_pct,
            confidence_score=prob,
            model_comparison=model_comparisons,
            top_feature_contributions=top_contributions,
            shap_summary=shap_summary,
            execution_mode="PROTOTYPE_SIMULATED",
            disclaimer="Decision support output for MSW review. Does NOT execute automated binding approvals or rejections."
        )

    # -------------------------------------------------------------------------
    # CENTRALIZED CONSOLIDATION & RECONCILIATION (NO LATE FUSION)
    # -------------------------------------------------------------------------

    def consolidate_patient_data(
        self,
        patient_id: str,
        patient_demographics: Dict[str, Any],
        document_screenings: List[Dict[str, Any]],
        interview_findings: Optional[Dict[str, Any]] = None,
        eligibility_prediction: Optional[Dict[str, Any]] = None,
    ) -> PrototypeConsolidationResponse:
        """
        Consolidates evidence from the 3 independent pipelines for MSW verification.
        Preserves pipeline independence — NO Multimodal Late Fusion.
        """
        # Reconciliation check between stated income and utility expenses
        income = float(patient_demographics.get("monthly_family_income") or 0.0)
        utilities = float(patient_demographics.get("monthly_utility_expenses") or 0.0)
        doc_count = len(document_screenings)

        reconciled_flags = []
        if income > 0 and utilities > income:
            reconciled_flags.append("Utility expenses exceed stated monthly income; assess support from extended relatives.")
        if doc_count < 2:
            reconciled_flags.append("Patient has submitted fewer than 2 evidential documents; check mandatory requirements.")

        readiness = "READY_FOR_MSW_REVIEW" if len(reconciled_flags) == 0 else "READY_WITH_FLAGS"

        # Record in prototype storage
        try:
            records = json.loads(PROTOTYPE_RECORDS_FILE.read_text(encoding="utf-8"))
            records[patient_id] = {
                "patient_id": patient_id,
                "updated_at": _utc_now(),
                "patient_demographics": patient_demographics,
                "document_screenings": document_screenings,
                "interview_findings": interview_findings,
                "eligibility_prediction": eligibility_prediction,
                "readiness": readiness,
            }
            PROTOTYPE_RECORDS_FILE.write_text(json.dumps(records, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not persist prototype record: {e}")

        return PrototypeConsolidationResponse(
            patient_id=patient_id,
            patient_profile=patient_demographics,
            documents_summary={
                "total_documents_screened": doc_count,
                "screened_categories": [d.get("predicted_category") for d in document_screenings if d.get("predicted_category")],
                "forensic_status": "NO_TAMPERING_DETECTED",
            },
            interview_summary=interview_findings or {
                "status": "INTERVIEW_PENDING",
                "overall_consistency_score": None,
            },
            eligibility_summary=eligibility_prediction or {
                "status": "PREDICTION_PENDING",
                "model_name": None,
            },
            data_reconciliation={
                "cross_pipeline_conflicts": reconciled_flags,
                "reconciliation_status": "RESOLVED_NO_CONFLICTS" if not reconciled_flags else "NEEDS_MSW_ATTENTION",
            },
            overall_readiness_for_msw=readiness,
            execution_mode="PROTOTYPE_SIMULATED",
            isolation_notice="Prototype Demonstration Record. Isolated from actual ML training and research datasets."
        )

    # -------------------------------------------------------------------------
    # MSW VERIFICATION & ASSESSMENT REPORT GENERATION
    # -------------------------------------------------------------------------

    def record_msw_verification(
        self,
        patient_id: str,
        msw_id: str,
        verification_status: str,
        msw_remarks: str,
        document_check_notes: Optional[str] = None,
        interview_check_notes: Optional[str] = None,
        eligibility_override_notes: Optional[str] = None,
        recommended_grant_tier: Optional[str] = None,
        recommended_subsidy_percentage: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Records MSW human verification and override recommendations.
        """
        verif_record = {
            "patient_id": patient_id,
            "msw_id": msw_id,
            "verified_at": _utc_now(),
            "verification_status": verification_status,
            "msw_remarks": msw_remarks,
            "document_check_notes": document_check_notes,
            "interview_check_notes": interview_check_notes,
            "eligibility_override_notes": eligibility_override_notes,
            "recommended_grant_tier": recommended_grant_tier or "Tier 1 — Full Subsidy (100%)",
            "recommended_subsidy_percentage": recommended_subsidy_percentage or 100.0,
            "execution_mode": "PROTOTYPE_SIMULATED",
        }

        # Update prototype storage
        try:
            records = json.loads(PROTOTYPE_RECORDS_FILE.read_text(encoding="utf-8"))
            if patient_id in records:
                records[patient_id]["msw_verification"] = verif_record
                PROTOTYPE_RECORDS_FILE.write_text(json.dumps(records, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not persist verification: {e}")

        return verif_record

    def generate_assessment_report(
        self,
        patient_id: str,
        assessment_id: Optional[str] = None,
        include_full_forensics: bool = True,
        include_interview_transcript: bool = True,
    ) -> PrototypeAssessmentReportResponse:
        """
        Compiles the explainable prototype assessment report.
        Affirms licensed Medical Social Worker as the sole human decision authority.
        """
        report_id = f"OFPHIL-PROTOTYPE-RPT-{patient_id}-{int(datetime.datetime.now().timestamp())}"
        
        # Load consolidated data if available
        existing_data = {}
        try:
            records = json.loads(PROTOTYPE_RECORDS_FILE.read_text(encoding="utf-8"))
            existing_data = records.get(patient_id, {})
        except Exception:
            pass

        msw_state = existing_data.get("msw_verification") or {
            "verification_status": "VERIFIED_FOR_CHARITY_ASSISTANCE",
            "msw_id": "msw_lead",
            "verified_at": _utc_now(),
            "msw_remarks": "Patient meets Philippine indigent healthcare criteria. Verified Barangay Indigency and clinical prescription.",
        }

        final_rec = {
            "grant_tier": msw_state.get("recommended_grant_tier", "Tier 1 — Full Subsidy (100%)"),
            "subsidy_percentage": msw_state.get("recommended_subsidy_percentage", 100.0),
            "procedure_quotation_subsidy": "Full subsidy of ophthalmic surgery and facility fees",
            "clinical_service": "Cataract Surgery / Phacoemulsification with IOL Implantation",
            "approval_routing": "RECOMMENDED FOR INSTITUTIONAL EXECUTIVE ENDORSEMENT",
        }

        report = PrototypeAssessmentReportResponse(
            report_id=report_id,
            patient_id=patient_id,
            generated_at=_utc_now(),
            consolidated_evidence={
                "pipeline_1_documents": existing_data.get("document_screenings", [
                    {"document_id": "DOC-DEMO-001", "category": "certificate_of_indigency", "screening_verdict": "NO_SUSPICIOUS_INDICATORS"}
                ]),
                "pipeline_2_interview": existing_data.get("interview_findings", {
                    "overall_consistency_score": 0.912,
                    "resolution_status": "ALL_CLARIFICATIONS_ANSWERED"
                }),
                "pipeline_3_eligibility": existing_data.get("eligibility_prediction", {
                    "model_used": "Soft Voting Ensemble",
                    "confidence_score": 0.942,
                    "top_drivers": ["monthly_family_income", "household_size", "cost_of_treatment"]
                }),
            },
            msw_verification_state=msw_state,
            final_recommendation=final_rec,
            decision_authority="Licensed Medical Social Worker (Sole Human Authority)",
            execution_mode="PROTOTYPE_SIMULATED",
            regulatory_notice="CONFIDENTIAL OFPHIL CLINICAL ASSESSMENT REPORT — PROTOTYPE SYSTEM DEMONSTRATION"
        )

        # Save to reports file
        try:
            reports = json.loads(PROTOTYPE_REPORTS_FILE.read_text(encoding="utf-8"))
            reports[report_id] = report.model_dump()
            PROTOTYPE_REPORTS_FILE.write_text(json.dumps(reports, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not persist assessment report: {e}")

        return report


prototype_system_service = PrototypeSystemService()
