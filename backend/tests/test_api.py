import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "OFPHIL" in data["app_name"]


def test_list_datasets():
    response = client.get("/api/v1/datasets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_create_dataset():
    new_ds = {
        "name": "test_synthetic_batch.csv",
        "record_count": 250,
        "category": "synthetic_tabular",
        "notes": "Pytest automated verification batch"
    }
    response = client.post("/api/v1/datasets", json=new_ds)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "test_synthetic_batch.csv"
    assert data["record_count"] == 250


def test_documents_list():
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_ocr_processing():
    payload = {
        "document_id": "doc-syn-101",
        "engine": "PaddleOCR",
        "preprocess": True
    }
    response = client.post("/api/v1/ocr", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert "Juan Dela Cruz" in data["extracted_text"]


def test_classification_predict():
    payload = {
        "applicant_name": "Maria Santos",
        "monthly_income": 7500.0,
        "household_size": 4,
        "philhealth_category": "Indigent",
        "housing_type": "Informal",
        "semantic_score": 0.85,
        "stamp_verified": True,
        "signature_verified": True,
        "tamper_risk": "clean"
    }
    response = client.post("/api/v1/classification", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Eligible" in data["eligibility_prediction"]
    assert data["confidence_probability"] > 0.5


def test_auth_logout():
    payload = {
        "role": "admin",
        "user_id": "STF-ADM-0001",
        "reason": "user_initiated"
    }
    response = client.post(
        "/api/v1/auth/logout",
        json=payload,
        headers={"x-user-role": "admin", "x-user-id": "STF-ADM-0001"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["role"] == "admin"
    assert data["user_id"] == "STF-ADM-0001"
    assert "terminated" in data["message"].lower()

