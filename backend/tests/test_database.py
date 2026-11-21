import pytest
import pytest_asyncio
from app.database.connection import supabase_db
from app.database.models.entities import Patient, SocioeconomicAssessment, ClinicalRecord, Document


def test_supabase_client_configuration():
    assert supabase_db.is_configured() is True
    assert "supabase.co" in supabase_db.base_url
    assert supabase_db.rest_url.endswith("/rest/v1")


@pytest.mark.asyncio
async def test_supabase_connectivity():
    health = await supabase_db.check_health()
    assert health["status"] == "connected"
    assert "supabase.co" in health["endpoint"]


def test_sqlalchemy_models_metadata():
    assert Patient.__tablename__ == "patients"
    assert SocioeconomicAssessment.__tablename__ == "socioeconomic_assessments"
    assert ClinicalRecord.__tablename__ == "clinical_records"
    assert Document.__tablename__ == "documents"

    # Check key columns
    assert "patient_code" in Patient.__table__.columns
    assert "monthly_household_income" in SocioeconomicAssessment.__table__.columns
    assert "primary_ophthalmic_diagnosis" in ClinicalRecord.__table__.columns
    assert "document_type" in Document.__table__.columns
