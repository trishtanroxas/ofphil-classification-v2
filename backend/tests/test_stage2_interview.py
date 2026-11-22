import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_santos_01"}
ADMIN_HEADERS = {"x-user-role": "admin", "x-user-id": "admin_reyes_01"}
PATIENT_HEADERS = {"x-user-role": "patient", "x-user-id": "patient_01"}


def test_stage2_interview_complete_evaluation():
    payload = {
        "total_household_income": 12000.0,
        "household_size": 4,
        "is_initial_load": True,
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
            "financial_barriers": "Zero savings, cannot afford operative consumables",
            "available_healthcare_resources": "PhilHealth Indigent member",
        },
        "psychosocial": {
            "accessibility_concerns": "Requires public transport escort",
            "discrimination_experienced": "Age-related job displacement",
            "safety_hazards": "Slip and fall hazard at home due to visual impairment",
            "social_responsibilities": "Primary breadwinner",
            "support_systems": "Barangay health worker and church community",
            "basic_needs_living_conditions": "Basic needs met with difficulty",
            "coping_capacity_narrative": "Family borrowing from neighbors for food",
        },
        "health_factors": [
            {
                "factor": "Absence of adequate health services",
                "severity_level": "LEVEL_4_MODERATELY_SEVERE",
                "coping_level": "LEVEL_4_INADEQUATE",
                "patient_reported": "No public tertiary eye surgical clinic in immediate district",
                "msw_observation": "Verified geographic barrier; patient must travel 15km to center",
            },
            {
                "factor": "Inaccessibility of health services",
                "severity_level": "LEVEL_4_MODERATELY_SEVERE",
                "coping_level": "LEVEL_4_INADEQUATE",
                "patient_reported": "Commute requires two jeepney transfers while visually impaired",
                "msw_observation": "Confirmed hazardous commute; escort required",
            },
            {
                "factor": "Absence of support services needed to use health services",
                "severity_level": "LEVEL_3_MODERATE",
                "coping_level": "LEVEL_3_VULNERABLE",
                "patient_reported": "Caregiver must take unpaid day off to accompany patient",
                "msw_observation": "Caregiver wage loss represents 25% of weekly household income",
            },
            {
                "factor": "Absence of adequate mental health / psychosocial support services",
                "severity_level": "LEVEL_2_MILD",
                "coping_level": "LEVEL_2_ADEQUATE",
                "patient_reported": "Mild distress and anxiety about complete blindness",
                "msw_observation": "Well-oriented; receptive to counseling and family support",
            },
        ],
        "discrimination_severity_level": "LEVEL_3_MODERATE",
        "discrimination_coping_level": "LEVEL_3_VULNERABLE",
        "discrimination_patient_reported": "Passed over for construction jobs due to poor vision",
        "discrimination_msw_observation": "Direct economic impact from visual handicap",
        "safety_severity_level": "LEVEL_3_MODERATE",
        "safety_coping_level": "LEVEL_3_VULNERABLE",
        "safety_patient_reported": "Frequent stumbles at home",
        "safety_msw_observation": "Dim indoor lighting in rental room increases fall risk",
        "roles_severity_level": "LEVEL_4_MODERATELY_SEVERE",
        "roles_coping_level": "LEVEL_4_INADEQUATE",
        "roles_patient_reported": "Unable to provide daily food for children",
        "roles_msw_observation": "Breadwinner role severely compromised",
        "environment_severity_level": "LEVEL_4_MODERATELY_SEVERE",
        "environment_patient_reported": "Informal settlement with shared communal water source",
        "environment_msw_observation": "Substandard sanitation and cramped living quarters",
    }

    res = client.post("/api/v1/classification/evaluate-stage2", json=payload, headers=MSW_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["is_complete"] is True
    assert data["status"] == "EVALUATED"
    assert data["institutional_confirmation_required"] is False
    assert len(data["missing_factors"]) == 0
    assert len(data["missing_mappings"]) == 0

    # Verify deterministic arithmetic
    # Health avg: (4 + 4 + 3 + 2) / 4 = 3.25
    # Health coping avg: (4 + 4 + 3 + 2) / 4 = 3.25
    # Sev avg: (3.25 + 3 + 3 + 4 + 4) / 5 = 17.25 / 5 = 3.45
    # Cop avg: (3.25 + 3 + 3 + 4) / 4 = 13.25 / 4 = 3.31
    # Total risk: (3.45 * 8.5) + (3.31 * 5.0) = 29.325 + 16.55 = 45.875 -> 45.9%
    assert float(data["average_severity"]) == 3.45
    assert float(data["average_coping"]) == 3.31
    assert float(data["total_risk"]) == 45.9

    # Triggered conditions check (Indigent triggered because initial load income <= 14000)
    msw = data["msw_classification"]
    assert msw["classification"] == "INDIGENT"
    assert msw["proposed_subsidy"] == "100% Full Charity Subsidy"
    assert len(data["triggered_conditions"]) >= 1


def test_stage2_interview_incomplete_handling():
    payload = {
        "interview_info": {
            "interview_date": "2026-11-23",
        },
        # Missing Domains VI to IX
        "health_factors": [
            {
                "factor": "Absence of adequate health services",
                "severity_level": "LEVEL_3_MODERATE",
                "coping_level": "LEVEL_3_VULNERABLE",
            }
        ],
    }

    res = client.post("/api/v1/classification/evaluate-stage2", json=payload, headers=MSW_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["is_complete"] is False
    assert data["status"] == "INCOMPLETE"
    assert data["message"] == "ASSESSMENT INCOMPLETE — CLASSIFICATION PENDING"
    assert len(data["missing_factors"]) > 0
    assert data["average_severity"] is None
    assert data["total_risk"] is None


def test_stage2_interview_unapproved_mapping_handling():
    payload = {
        "interview_info": {
            "interview_date": "2026-11-23",
        },
        "health_factors": [
            {
                "factor": "Absence of adequate health services",
                "severity_level": "FABRICATED_UNAPPROVED_TIER",
                "coping_level": "LEVEL_3_VULNERABLE",
            }
        ],
        "discrimination_severity_level": "LEVEL_2_MILD",
        "discrimination_coping_level": "LEVEL_2_ADEQUATE",
        "safety_severity_level": "LEVEL_2_MILD",
        "safety_coping_level": "LEVEL_2_ADEQUATE",
        "roles_severity_level": "LEVEL_2_MILD",
        "roles_coping_level": "LEVEL_2_ADEQUATE",
        "environment_severity_level": "LEVEL_2_MILD",
    }

    res = client.post("/api/v1/classification/evaluate-stage2", json=payload, headers=MSW_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["is_complete"] is False
    assert data["status"] == "INCOMPLETE"
    assert data["institutional_confirmation_required"] is True
    assert len(data["missing_mappings"]) >= 1
    assert "No approved OFPHIL clinical rubric mapping" in data["missing_mappings"][0]


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

    # 2. Save interview draft via dedicated endpoint
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
            "notes": "Patient accompanied by eldest daughter.",
            "mark_completed": False,
        },
        headers=MSW_HEADERS,
    )
    assert save_res.status_code == 200
    record = save_res.json()
    assert record["stage2_data"]["interview_info"]["interview_status"] == "IN_PROGRESS"

    # 3. Evaluate Stage 2 through assessment endpoint
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
                    "severity_level": "LEVEL_5_SEVERE",
                    "coping_level": "LEVEL_5_SEVERE_BREAKDOWN",
                }
            ],
            "discrimination_severity_level": "LEVEL_4_MODERATELY_SEVERE",
            "discrimination_coping_level": "LEVEL_4_INADEQUATE",
            "safety_severity_level": "LEVEL_4_MODERATELY_SEVERE",
            "safety_coping_level": "LEVEL_4_INADEQUATE",
            "roles_severity_level": "LEVEL_4_MODERATELY_SEVERE",
            "roles_coping_level": "LEVEL_4_INADEQUATE",
            "environment_severity_level": "LEVEL_5_SEVERE",
        },
        headers=MSW_HEADERS,
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["is_complete"] is True
    assert eval_data["status"] == "EVALUATED"
    assert eval_data["msw_classification"]["classification"] == "INDIGENT"

    # 4. Patient role forbidden from evaluating MSW classification
    unauth_res = client.post(
        f"/api/v1/assessments/{asmt_id}/evaluate-stage2",
        json={},
        headers=PATIENT_HEADERS,
    )
    assert unauth_res.status_code in {401, 403}
