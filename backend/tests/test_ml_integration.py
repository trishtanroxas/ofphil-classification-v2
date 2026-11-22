from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_test"}

SAMPLE_FEATURES = {
    "age": 48,
    "sex": "Male",
    "marital_status": "Married",
    "household_size": 5,
    "number_of_dependents": 3,
    "residence_status": "Rented",
    "educational_attainment": "High School",
    "housing_condition": "Semi-Concrete",
    "sectoral_membership": "Informal Sector",
    "monthly_family_income": 12000.0,
    "monthly_household_obligations_expenses": 11500.0,
    "employment_status": "Self-Employed",
    "occupation": "Driver",
    "existing_financial_assistance": 0.0,
    "outstanding_medical_bills": 5000.0,
    "diagnosis": "Senile Cataract",
    "diagnosis_severity": "Moderate",
    "procedure": "Phacoemulsification",
    "type_of_treatment_surgery": "Surgery",
    "laterality": "OS",
    "patient_clinical_type": "Charity",
    "disability_status": "None",
    "cost_of_treatment": 25000.0,
    "doc_visual_mean": 0.1,
    "doc_visual_std": 0.05,
    "doc_visual_max": 0.4,
    "doc_visual_l2norm": 1.2,
    "sbert_text_mean": 0.02,
    "sbert_text_std": 0.08,
    "sbert_text_l2norm": 1.0,
    "doc_indigency_verified": 1,
}


def test_ml_models_inventory():
    r = client.get("/api/v1/ml/models", headers=MSW_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["production_4tier_enabled"] is False
    names = [c["candidate"] for c in data["candidates"]]
    assert "ebm" in names and "catboost" in names and "logistic_regression" in names


def test_ml_predict_gated_by_default():
    r = client.post(
        "/api/v1/ml/predict",
        json={
            "model_candidate": "ebm",
            "features": SAMPLE_FEATURES,
            "api_classification": "INDIGENT",
        },
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["prediction_enabled"] is False
    assert data["status"] == "AWAITING_4TIER_VALIDATION"


def test_ml_predict_ebm_and_catboost_experimental():
    for candidate in ("ebm", "catboost"):
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
        assert r.status_code == 200
        data = r.json()
        assert data["prediction_enabled"] is True
        assert data["predicted_class"] in (0, 1)
        assert len(data["top_explanations"]) > 0
        assert data["probabilities"] is not None
