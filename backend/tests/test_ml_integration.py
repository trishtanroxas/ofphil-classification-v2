from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_test"}

# 27 approved clinical predictor features (7 numeric, 20 categorical)
SAMPLE_FEATURES = {
    # 7 Numerical
    "age": 48,
    "household_size": 5,
    "number_of_dependents": 3,
    "monthly_family_income": 12000.0,
    "monthly_household_obligations_expenses": 11500.0,
    "monthly_utility_expenses": 2500.0,
    "cost_of_treatment": 25000.0,
    # 20 Categorical
    "sex": "Male",
    "marital_status": "Married",
    "employment_status": "Self-Employed",
    "residence_status": "Rented",
    "educational_attainment": "High School",
    "housing_condition": "Semi-Concrete",
    "sectoral_membership": "Informal Sector",
    "disability_status": "None",
    "diagnosis_severity": "Moderate",
    "type_of_treatment_surgery": "Surgery",
    "laterality": "OS",
    "patient_clinical_type": "Charity",
    "assistance_type": "Medical Assistance",
    "certificate_of_indigency": "Yes",
    "proof_of_income_employment": "No",
    "government_id": "Yes",
    "utility_bill_document": "Yes",
    "referral_letter": "No",
    "philhealth_document": "Yes",
    "medical_record_diagnosis_treatment_plan": "Yes",
}


def test_ml_models_inventory():
    r = client.get("/api/v1/ml/models", headers=MSW_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["production_4tier_enabled"] is False
    names = [c["candidate"] for c in data["candidates"]]
    assert "logistic_regression" in names
    assert "catboost" in names
    assert "ebm" in names
    assert "ensemble" in names


def test_ml_predict_gated_by_default():
    r = client.post(
        "/api/v1/ml/predict",
        json={
            "model_candidate": "ebm",
            "features": SAMPLE_FEATURES,
            "api_classification": "INDIGENT",
            "allow_experimental_binary": False,
        },
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["prediction_enabled"] is False
    assert data["status"] == "AWAITING_4TIER_VALIDATION"


def test_all_four_models_inference_and_explanations():
    for candidate in ("logistic_regression", "catboost", "ebm", "ensemble"):
        r = client.post(
            "/api/v1/ml/predict",
            json={
                "model_candidate": candidate,
                "features": SAMPLE_FEATURES,
                "api_classification": "INDIGENT",
                "allow_experimental_binary": True,
            },
            headers=MSW_HEADERS,
        )
        assert r.status_code == 200, f"Candidate {candidate} failed: {r.text}"
        data = r.json()
        assert data["prediction_enabled"] is True
        assert data["predicted_class"] in (0, 1)
        assert data["probabilities"] is not None
        assert "class_0_non_indigent" in data["probabilities"]
        assert "class_1_indigent" in data["probabilities"]
        assert len(data["top_explanations"]) > 0
        assert data["requires_msw_review"] is True
