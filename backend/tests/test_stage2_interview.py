import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_santos_01"}
ADMIN_HEADERS = {"x-user-role": "admin", "x-user-id": "admin_reyes_01"}
PATIENT_HEADERS = {"x-user-role": "patient", "x-user-id": "patient_01"}


def test_stage2_text_based_interview_evaluation():
    """
    Verifies the updated text-based Stage 2 interview endpoint:
    - Does NOT require any severity_level or coping_level score fields.
    - Compiles and returns structured interview_answers (question_key + patient_answer + msw_observation).
    - Preserves Stage 1 financial_classification when income/household_size are provided.
    """
    payload = {
        "total_household_income": 12000.0,
        "household_size": 4,
        "interview_info": {
            "interview_date": "2026-11-23",
            "interview_start_time": "09:00 AM",
            "interview_end_time": "09:45 AM",
            "assigned_msw": "Maria Santos, RSW",
            "interviewed_person": "PATIENT",
            "interview_method": "FACE_TO_FACE",
            "interview_status": "IN_PROGRESS",
            "consent_obtained": True,
        },
        "background": {
            "living_situation": "Renting a small room in Tondo, Manila",
            "living_situation_obs": "High density dwelling, verified with barangay certificate",
            "household_composition": "4 household members with 2 minor dependents",
            "family_support": "Spouse provides caregiving assistance",
            "employment_situation": "Daily informal construction laborer",
            "income_sources": "Daily irregular wage",
            "financial_responsibilities": "Food, rent, and maintenance medication for hypertension",
        },
        "medical_difficulties": {
            "medical_condition_summary": "Senile mature cataract left eye with severe vision reduction",
            "problem_duration": "2 years progressive deterioration",
            "recommended_procedure": "Phacoemulsification with Foldable IOL",
            "estimated_treatment_expenses": 11600.0,
            "financial_barriers": "Zero savings, cannot afford clinic procedure quotation",
            "available_healthcare_resources": "PhilHealth Indigent member",
        },
        "psychosocial": {
            "accessibility_concerns": "Requires public transport escort",
            "discrimination_experienced": "Age-related job displacement",
            "safety_hazards": "Slip and fall hazard at home due to visual impairment",
            "social_responsibilities": "Primary breadwinner",
            "support_systems": "Barangay health worker and church community",
            "basic_needs_living_conditions": "Basic needs met with difficulty",
            "coping_capacity_narrative": "Family relying on neighbor support",
        },
        "health_factors": [
            {
                "factor": "Absence of adequate health services",
                "patient_reported": "No public tertiary eye surgical clinic in immediate district",
                "msw_observation": "Verified geographic barrier; patient must travel 15km to center",
            },
            {
                "factor": "Inaccessibility of health services",
                "patient_reported": "Commute requires two jeepney transfers while visually impaired",
                "msw_observation": "Confirmed hazardous commute; escort required",
            },
        ],
        "discrimination_patient_reported": "Passed over for construction jobs due to poor vision",
        "discrimination_msw_observation": "Direct economic impact from visual impairment",
        "safety_patient_reported": "Frequent stumbles at home",
        "safety_msw_observation": "Dim indoor lighting in rental room increases fall risk",
        "roles_patient_reported": "Unable to provide daily food for children",
        "roles_msw_observation": "Breadwinner role strained",
        "environment_patient_reported": "Informal settlement with shared communal water source",
        "environment_msw_observation": "Substandard sanitation and cramped living quarters",
    }

    res = client.post("/api/v1/classification/evaluate-stage2", json=payload, headers=MSW_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["is_complete"] is True
    assert data["status"] == "INTERVIEW_RECORDED"
    assert data["average_severity"] is None
    assert data["average_coping"] is None
    assert data["total_risk"] is None
    assert data["msw_classification"] is None
    assert data["financial_classification"]["classification"] == "INDIGENT"
    assert len(data["interview_answers"]) >= 10
    keys = {item["question_key"] for item in data["interview_answers"]}
    assert "living_situation" in keys
    assert "domain_discrimination" in keys


def test_stage2_legacy_scores_backward_compatibility():
    """
    Old assessments that already contain legacy Stage 2 scores must still load/evaluate read-only without errors.
    """
    payload = {
        "total_household_income": 12000.0,
        "household_size": 4,
        "is_initial_load": True,
        "interview_info": {
            "interview_date": "2026-11-23",
            "assigned_msw": "Maria Santos, RSW",
            "consent_obtained": True,
        },
        "health_factors": [
            {
                "factor": "Absence of adequate health services",
                "severity_level": "LEVEL_4_MODERATELY_SEVERE",
                "coping_level": "LEVEL_4_INADEQUATE",
                "patient_reported": "No public tertiary eye surgical clinic in immediate district",
                "msw_observation": "Verified geographic barrier",
            },
            {
                "factor": "Inaccessibility of health services",
                "severity_level": "LEVEL_4_MODERATELY_SEVERE",
                "coping_level": "LEVEL_4_INADEQUATE",
            },
            {
                "factor": "Absence of support services needed to use health services",
                "severity_level": "LEVEL_3_MODERATE",
                "coping_level": "LEVEL_3_VULNERABLE",
            },
            {
                "factor": "Absence of adequate mental health / psychosocial support services",
                "severity_level": "LEVEL_2_MILD",
                "coping_level": "LEVEL_2_ADEQUATE",
            },
        ],
        "discrimination_severity_level": "LEVEL_3_MODERATE",
        "discrimination_coping_level": "LEVEL_3_VULNERABLE",
        "safety_severity_level": "LEVEL_3_MODERATE",
        "safety_coping_level": "LEVEL_3_VULNERABLE",
        "roles_severity_level": "LEVEL_4_MODERATELY_SEVERE",
        "roles_coping_level": "LEVEL_4_INADEQUATE",
        "environment_severity_level": "LEVEL_4_MODERATELY_SEVERE",
    }

    res = client.post("/api/v1/classification/evaluate-stage2", json=payload, headers=MSW_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["is_complete"] is True
    assert data["status"] == "INTERVIEW_RECORDED"
    assert float(data["average_severity"]) == 3.45
    assert float(data["average_coping"]) == 3.31
    assert float(data["total_risk"]) == 45.9
    assert data["msw_classification"]["classification"] == "INDIGENT"


def test_assessment_stage2_save_and_evaluate_endpoints():
    # 1. Create draft assessment
    create_res = client.post(
        "/api/v1/assessments",
        json={
            "patient_id": "M26-11-INT01",
            "interview_date": "2026-11-23",
            "stage1_data": {
                "patient_income": 8000,
                "household_size": 3,
                "total_household_income": 8000,
            },
        },
        headers=MSW_HEADERS,
    )
    assert create_res.status_code in {200, 201}
    asmt_id = create_res.json()["id"]

    # 2. Save text-based interview draft via dedicated endpoint (with interview_answers)
    save_res = client.post(
        f"/api/v1/assessments/{asmt_id}/interview",
        json={
            "interview_info": {
                "interview_date": "2026-11-23",
                "assigned_msw": "Maria Santos, RSW",
                "interview_status": "IN_PROGRESS",
            },
            "background": {
                "living_situation": "Informal settlement",
                "living_situation_obs": "High vulnerability observed",
            },
            "interview_answers": [
                {
                    "question_key": "living_situation",
                    "question_text": "Living Situation & Housing Tenancy",
                    "patient_answer": "Informal settlement",
                    "msw_observation": "High vulnerability observed",
                }
            ],
            "notes": "Patient accompanied by eldest daughter.",
            "mark_completed": False,
        },
        headers=MSW_HEADERS,
    )
    assert save_res.status_code == 200
    record = save_res.json()
    assert record["stage2_data"]["interview_info"]["interview_status"] == "IN_PROGRESS"
    assert len(record["stage2_data"]["interview_answers"]) == 1

    # 3. Evaluate Stage 2 through assessment endpoint without any score fields
    eval_res = client.post(
        f"/api/v1/assessments/{asmt_id}/evaluate-stage2",
        json={
            "interview_info": {
                "interview_date": "2026-11-23",
                "assigned_msw": "Maria Santos, RSW",
            },
            "health_factors": [
                {
                    "factor": "Absence of adequate health services",
                    "patient_reported": "Nearest clinic requires 2 hours transit",
                    "msw_observation": "Verified transit hardship",
                }
            ],
            "discrimination_patient_reported": "None reported",
            "discrimination_msw_observation": "Supportive household",
        },
        headers=MSW_HEADERS,
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["is_complete"] is True
    assert eval_data["status"] == "INTERVIEW_RECORDED"
    assert eval_data["financial_classification"]["classification"] == "INDIGENT"
    assert len(eval_data["interview_answers"]) >= 2

    # 4. Patient role forbidden from evaluating MSW interview
    unauth_res = client.post(
        f"/api/v1/assessments/{asmt_id}/evaluate-stage2",
        json={},
        headers=PATIENT_HEADERS,
    )
    assert unauth_res.status_code in {401, 403}
