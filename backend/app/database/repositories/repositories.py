"""
Database repository layer providing typed, abstracted access to Supabase PostgreSQL.
Handles patient creation, socioeconomic evaluations, documents, and audit logging.
"""
from typing import Any, Dict, List, Optional
from app.database.connection import supabase_db


class PatientRepository:
    def __init__(self, client=supabase_db):
        self.db = client

    async def get_by_code(self, patient_code: str) -> Optional[Dict[str, Any]]:
        """Finds patient by unique anonymized code."""
        results = await self.db.select("patients", params={"patient_code": f"eq.{patient_code}"})
        return results[0] if results else None

    async def create_synthetic_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Registers a new synthetic patient record."""
        patient_data["is_synthetic"] = True
        inserted = await self.db.insert("patients", patient_data)
        return inserted[0] if inserted else {}

    async def list_patients(self, limit: int = 50, synthetic_only: bool = True) -> List[Dict[str, Any]]:
        """Lists patient records with synthetic filtering."""
        params = {"limit": str(limit)}
        if synthetic_only:
            params["is_synthetic"] = "eq.true"
        return await self.db.select("patients", params=params)


class SocioeconomicRepository:
    def __init__(self, client=supabase_db):
        self.db = client

    async def create_assessment(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        inserted = await self.db.insert("socioeconomic_assessments", assessment_data)
        return inserted[0] if inserted else {}

    async def get_by_patient_id(self, patient_id: str) -> List[Dict[str, Any]]:
        return await self.db.select("socioeconomic_assessments", params={"patient_id": f"eq.{patient_id}"})


class DocumentRepository:
    def __init__(self, client=supabase_db):
        self.db = client

    async def register_document(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        inserted = await self.db.insert("documents", doc_data)
        return inserted[0] if inserted else {}

    async def list_patient_documents(self, patient_id: str) -> List[Dict[str, Any]]:
        return await self.db.select("documents", params={"patient_id": f"eq.{patient_id}"})
