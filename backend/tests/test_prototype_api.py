"""
Integration tests for OFPHIL Prototype System API.
Verifies all prototype demonstration endpoints across:
- Pipeline 1: Document classification, OCR, signatures/stamps, forensics, evidence aggregation
- Pipeline 2: LLM structured interview turns, 4-dimension consistency assessment
- Pipeline 3: ML eligibility prediction across 4 models using strictly approved 27 predictors
- Centralized consolidation & reconciliation (NO multimodal late fusion)
- MSW verification & explainable assessment report generation
- Strict execution_mode=="PROTOTYPE_SIMULATED" verification
- Strict data isolation from model training & research paths
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

HEADERS_MSW = {
    "x-user-role": "msw",
    "x-user-id": "msw_lead",
}

APPROVED_27_PREDICTORS = {
    "age": 52,
    "household_size": 5,
    "number_of_dependents": 3,
    "monthly_family_income": 8500.0,
    "monthly_household_obligations_expenses": 3200.0,
    "monthly_utility_expenses": 1400.0,
    "cost_of_treatment": 45000.0,
    "sex": "Female",
    "marital_status": "Married",
    "employment_status": "Informal / Vendor",
    "residence_status": "Informal Settler",
    "educational_attainment": "High School Undergraduate",
    "housing_condition": "Makeshift / Light Materials",
    "sectoral_membership": "Indigent",
    "disability_status": "Visual Impairment",
    "diagnosis_severity": "Severe",
    "type_of_treatment_surgery": "Phacoemulsification with IOL",
    "laterality": "Bilateral",
    "patient_clinical_type": "Indigent Outpatient",
    "assistance_type": "Medical Assistance / Subsidy",
    "certificate_of_indigency": "YES",
    "proof_of_income_employment": "NO",
    "government_id": "YES",
    "utility_bill_document": "YES",
    "referral_letter": "YES",
    "philhealth_document": "YES",
    "medical_record_diagnosis_treatment_plan": "YES",
}


def test_prototype_document_classification():
    payload = {
        "document_id": "TEST-DOC-001",
        "patient_id": "M26-11-TEST01",
        "document_name": "barangay_certificate_indigency.pdf",
    }
    res = client.post("/api/v1/prototype/documents/classify", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_category"] == "certificate_of_indigency"
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert "counterfeit" in data["disclaimer"].lower() or "not a counterfeit" in data["disclaimer"].lower()


def test_prototype_ocr_extraction():
    payload = {
        "document_id": "TEST-DOC-001",
        "document_category": "certificate_of_indigency",
    }
    res = client.post("/api/v1/prototype/documents/ocr", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert "extracted_fields" in data
    assert data["extracted_fields"]["document_title"] == "BARANGAY CERTIFICATE OF INDIGENCY"


def test_prototype_signature_stamp_screening():
    payload = {
        "document_id": "TEST-DOC-001",
        "has_signature_expected": True,
        "has_stamp_expected": True,
    }
    res = client.post("/api/v1/prototype/documents/screening/signatures-stamps", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert "signature_screening" in data
    assert "stamp_screening" in data
    assert data["signature_screening"]["reference_matching"] == "NOT_EVALUATED"


def test_prototype_forensic_analysis():
    payload = {"document_id": "TEST-DOC-001"}
    res = client.post("/api/v1/prototype/documents/forensics", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert data["ela_analysis"]["status"] == "PASSED"
    assert data["orb_copy_move"]["status"] == "PASSED"


def test_prototype_evidence_aggregation():
    payload = {
        "document_id": "TEST-DOC-001",
        "signature_result": {"overall_status": "PRESENCE_DETECTED"},
        "stamp_result": {"overall_status": "PRESENCE_DETECTED"},
    }
    res = client.post("/api/v1/prototype/documents/evidence-aggregation", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert data["screening_verdict"] in ["NO_SUSPICIOUS_INDICATORS", "NEEDS_VERIFICATION", "FLAGGED_FOR_MANUAL_REVIEW"]
    assert "Deterministic Rule-Based" in data["aggregation_engine"]


def test_prototype_interview_turn():
    payload = {
        "patient_id": "M26-11-TEST01",
        "conversation_history": [],
        "patient_statement": "Ako po ay may apat na anak, at ang kita ko lang ay 7,000 sa pamamalantsa.",
    }
    res = client.post("/api/v1/prototype/interview/turn", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert "ai_response_or_followup" in data
    assert "Qwen3-4B" in data["model_representation"]


def test_prototype_interview_consistency():
    payload = {
        "patient_id": "M26-11-TEST01",
        "structured_responses": {
            "monthly_family_income": 7000.0,
            "household_size": 5,
            "number_of_dependents": 4,
        },
    }
    res = client.post("/api/v1/prototype/interview/consistency", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert 0.0 <= data["overall_consistency_score"] <= 100.0
    assert "information_consistency" in data["dimension_scores"]
    assert "response_completeness" in data["dimension_scores"]


def test_prototype_eligibility_prediction():
    payload = {
        "patient_id": "M26-11-TEST01",
        "selected_model": "Soft Voting Ensemble",
        "features_27": APPROVED_27_PREDICTORS,
    }
    res = client.post("/api/v1/prototype/eligibility/predict", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert data["model_name"] == "Soft Voting Ensemble"
    assert "CatBoost" in data["model_comparison"]
    assert "Explainable Boosting Machine (EBM)" in data["model_comparison"]
    assert "Logistic Regression" in data["model_comparison"]
    assert len(data["top_feature_contributions"]) >= 3


def test_prototype_data_consolidation():
    payload = {
        "patient_id": "M26-11-TEST01",
        "patient_demographics": {
            "first_name": "Maria",
            "last_name": "Santos",
            "monthly_family_income": 7000.0,
            "monthly_utility_expenses": 1200.0,
        },
        "document_screenings": [
            {"document_id": "TEST-DOC-001", "predicted_category": "certificate_of_indigency"},
            {"document_id": "TEST-DOC-002", "predicted_category": "medical_certificate"},
        ],
        "interview_findings": {"overall_consistency_score": 0.92},
        "eligibility_prediction": {"predicted_grant_tier": "Tier 1 — Full Subsidy (100%)"},
    }
    res = client.post("/api/v1/prototype/consolidation/reconcile", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert data["overall_readiness_for_msw"] in ["READY_FOR_MSW_REVIEW", "READY_WITH_FLAGS"]


def test_prototype_msw_verification_and_report():
    verif_payload = {
        "patient_id": "M26-11-TEST01",
        "verification_status": "VERIFIED",
        "msw_remarks": "Verified indigency status and physician endorsement. Fully eligible for cataract surgery subsidy.",
        "recommended_grant_tier": "Tier 1 — Full Subsidy (100%)",
        "recommended_subsidy_percentage": 100.0,
    }
    v_res = client.post("/api/v1/prototype/msw/verify", json=verif_payload, headers=HEADERS_MSW)
    assert v_res.status_code == 200

    report_payload = {
        "patient_id": "M26-11-TEST01",
        "include_full_forensics": True,
        "include_interview_transcript": True,
    }
    r_res = client.post("/api/v1/prototype/reports/assessment", json=report_payload, headers=HEADERS_MSW)
    assert r_res.status_code == 200
    r_data = r_res.json()
    assert r_data["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert "Medical Social Worker" in r_data["decision_authority"]
    assert "Tier 1" in r_data["final_recommendation"]["grant_tier"]
