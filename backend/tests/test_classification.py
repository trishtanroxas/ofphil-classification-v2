from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_test"}


def test_financial_boundaries():
    # Indigent <= 4715.76
    r = client.post(
        "/api/v1/classification/financial",
        json={"total_monthly_household_income": "4715.76", "household_size": 1},
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["classification"] == "INDIGENT"

    # B1: 4715.77 - 6063.12
    for val in ["4715.77", "6063.12"]:
        r = client.post(
            "/api/v1/classification/financial",
            json={"total_monthly_household_income": val, "household_size": 1},
            headers=MSW_HEADERS,
        )
        assert r.status_code == 200
        assert r.json()["classification"] == "FINANCIALLY_INCAPACITATED_B1"

    # B2: 6063.13 - 7410.48
    for val in ["6063.13", "7410.48"]:
        r = client.post(
            "/api/v1/classification/financial",
            json={"total_monthly_household_income": val, "household_size": 1},
            headers=MSW_HEADERS,
        )
        assert r.status_code == 200
        assert r.json()["classification"] == "FINANCIALLY_INCAPACITATED_B2"

    # Capacitated > 7410.48
    r = client.post(
        "/api/v1/classification/financial",
        json={"total_monthly_household_income": "7410.49", "household_size": 1},
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["classification"] == "FINANCIALLY_CAPACITATED"


def test_financial_division_and_validation():
    # Family of 5: 16842.00 / 5 = 3368.40 -> INDIGENT
    r = client.post(
        "/api/v1/classification/financial",
        json={"total_monthly_household_income": 16842.00, "household_size": 5},
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["monthly_per_capita_income"] == "3368.40"
    assert data["classification"] == "INDIGENT"

    # Zero household size
    r_zero = client.post(
        "/api/v1/classification/financial",
        json={"total_monthly_household_income": 10000, "household_size": 0},
        headers=MSW_HEADERS,
    )
    assert r_zero.status_code == 422

    # Negative income
    r_neg = client.post(
        "/api/v1/classification/financial",
        json={"total_monthly_household_income": -100, "household_size": 3},
        headers=MSW_HEADERS,
    )
    assert r_neg.status_code == 422


def test_msw_thresholds_and_precedence():
    # Severity 3.8 -> Indigent even if coping is low (1.0)
    r = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 3.8, "average_coping": 1.0},
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["classification"] == "INDIGENT"
    # Total Risk = (3.8 * 8.5) + (1.0 * 5.0) = 32.3 + 5.0 = 37.3
    assert float(r.json()["total_risk"]) == 37.3
    # Both Indigent and B1 and B2 triggers must be preserved!
    tiers = {t["tier"] for t in r.json()["triggered_conditions"]}
    assert "INDIGENT" in tiers
    assert "FINANCIALLY_INCAPACITATED_B1" in tiers
    assert "FINANCIALLY_INCAPACITATED_B2" in tiers

    # Coping 3.8 -> Indigent
    r_cop = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 1.0, "average_coping": 3.8},
        headers=MSW_HEADERS,
    )
    assert r_cop.status_code == 200
    assert r_cop.json()["classification"] == "INDIGENT"

    # Total Risk >= 65.0% (e.g. sev=5.0, cop=4.5 -> 42.5 + 22.5 = 65.0%)
    r_risk65 = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 5.0, "average_coping": 4.5},
        headers=MSW_HEADERS,
    )
    assert r_risk65.status_code == 200
    assert float(r_risk65.json()["total_risk"]) == 65.0
    assert r_risk65.json()["classification"] == "INDIGENT"

    # B1: Severity 2.8, Coping 2.0 -> Risk = 23.8 + 10.0 = 33.8% -> B1
    r_b1 = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 2.8, "average_coping": 2.0},
        headers=MSW_HEADERS,
    )
    assert r_b1.status_code == 200
    assert r_b1.json()["classification"] == "FINANCIALLY_INCAPACITATED_B1"

    # B2: Total Risk >= 30.0% (sev=2.5, cop=2.0 -> 21.25 + 10.0 = 31.3%) -> B2
    r_b2 = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 2.5, "average_coping": 2.0},
        headers=MSW_HEADERS,
    )
    assert r_b2.status_code == 200
    assert r_b2.json()["classification"] == "FINANCIALLY_INCAPACITATED_B2"

    # Capacitated: sev=1.5, cop=1.5 -> 12.75 + 7.5 = 20.3%
    r_cap = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 1.5, "average_coping": 1.5},
        headers=MSW_HEADERS,
    )
    assert r_cap.status_code == 200
    assert r_cap.json()["classification"] == "FINANCIALLY_CAPACITATED"


def test_msw_initial_load_vs_live_recalculation():
    # Low scores (1.5, 1.5 -> 20.3% risk) with income 14000
    # On live recalculation: initial load income trigger MUST NOT apply -> Capacitated
    r_live = client.post(
        "/api/v1/classification/msw",
        json={
            "average_severity": 1.5,
            "average_coping": 1.5,
            "total_household_income": 14000,
            "is_initial_load": False,
        },
        headers=MSW_HEADERS,
    )
    assert r_live.status_code == 200
    assert r_live.json()["classification"] == "FINANCIALLY_CAPACITATED"

    # On initial load: income <= 14000 -> Indigent
    r_init = client.post(
        "/api/v1/classification/msw",
        json={
            "average_severity": 1.5,
            "average_coping": 1.5,
            "total_household_income": 14000,
            "is_initial_load": True,
        },
        headers=MSW_HEADERS,
    )
    assert r_init.status_code == 200
    assert r_init.json()["classification"] == "INDIGENT"

    # On initial load: income <= 25000 -> B2
    r_init_b2 = client.post(
        "/api/v1/classification/msw",
        json={
            "average_severity": 1.5,
            "average_coping": 1.5,
            "total_household_income": 25000,
            "is_initial_load": True,
        },
        headers=MSW_HEADERS,
    )
    assert r_init_b2.status_code == 200
    assert r_init_b2.json()["classification"] == "FINANCIALLY_INCAPACITATED_B2"


def test_msw_missing_and_invalid_inputs():
    r_missing = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 3.0},
        headers=MSW_HEADERS,
    )
    assert r_missing.status_code == 422

    r_invalid = client.post(
        "/api/v1/classification/msw",
        json={"average_severity": 7.0, "average_coping": 2.0},
        headers=MSW_HEADERS,
    )
    assert r_invalid.status_code == 422


def test_combined_evaluation_discrepancy():
    # High income per capita (10000/1 = 10000 -> Capacitated), but high MSW severity (4.0 -> Indigent)
    r = client.post(
        "/api/v1/classification/evaluate",
        json={
            "total_monthly_household_income": 10000,
            "household_size": 1,
            "average_severity": 4.0,
            "average_coping": 3.0,
        },
        headers=MSW_HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["financial_classification"]["classification"] == "FINANCIALLY_CAPACITATED"
    assert data["msw_classification"]["classification"] == "INDIGENT"
    assert data["discrepancy_detected"] is True
    assert data["requires_msw_review"] is True
