import datetime
import uuid
from typing import Dict, List, Any


class MockDatabase:
    """Mock in-memory store for synthetic research experiments without touching patient records."""
    def __init__(self):
        self.datasets: List[Dict[str, Any]] = [
            {
                "id": "ds-syn-01",
                "name": "synthetic_indigency_patients_batch_01.csv",
                "record_count": 1250,
                "category": "synthetic_tabular",
                "created_at": "2026-11-10 09:30:00",
                "status": "ready",
                "notes": "Balanced synthetic demographic and economic features"
            },
            {
                "id": "ds-syn-02",
                "name": "synthetic_baranggay_certificates_set.json",
                "record_count": 500,
                "category": "synthetic_documents",
                "created_at": "2026-11-15 14:15:00",
                "status": "ready",
                "notes": "Generated synthetic barangay indigency certificates"
            }
        ]

        self.documents: List[Dict[str, Any]] = [
            {
                "id": "doc-001",
                "patient_id": "M26-11-00001",
                "patient_name": "Juan Dela Cruz",
                "filename": "Government_Valid_ID_DelaCruz.jpg",
                "document_type": "Government Valid ID",
                "file_size_bytes": 284100,
                "uploaded_at": "2026-11-22",
                "status": "processed",
                "ocr_processed": True,
                "manipulation_risk": "clean",
                "verification_status": "Verified Authentic",
                "seal_detected": True,
                "tamper_risk": "Low",
                "extracted_text": "REPUBLIC OF THE PHILIPPINES\nUNIFIED MULTI-PURPOSE ID (UMID)\nCRN: 0111-2948192-4\nNAME: DELA CRUZ, JUAN\nDATE OF BIRTH: MAY 15, 1978\nADDRESS: DISTRICT 4, SAMPALOC, MANILA"
            },
            {
                "id": "doc-002",
                "patient_id": "M26-11-00001",
                "patient_name": "Juan Dela Cruz",
                "filename": "Initial_Eye_Examination_Record.pdf",
                "document_type": "Initial Clinic Examination Record",
                "file_size_bytes": 195400,
                "uploaded_at": "2026-11-22",
                "status": "processed",
                "ocr_processed": True,
                "manipulation_risk": "clean",
                "verification_status": "Verified Authentic",
                "seal_detected": False,
                "tamper_risk": "Low",
                "extracted_text": "OFPHIL EYE CENTER - OUTPATIENT REGULAR CLINIC\nPATIENT: Juan Dela Cruz (M26-11-00001)\nCHIEF COMPLAINT: Blurring of vision on both eyes\nDIAGNOSIS: Bilateral Cataract, Senile Mature (OD > OS)\nATTENDING PHYSICIAN: Dr. J. E. Garcia, MD"
            }
        ]

        self.experiments: List[Dict[str, Any]] = [
            {
                "id": "exp-catboost-01",
                "experiment_name": "CatBoost Baseline on Synthetic Tabular",
                "pipeline_stage": "Classification",
                "accuracy": 0.942,
                "f1_score": 0.938,
                "roc_auc": 0.971,
                "status": "completed",
                "created_at": "2026-11-16 16:00:00"
            },
            {
                "id": "exp-ocr-paddle-01",
                "experiment_name": "PaddleOCR v2 Benchmark on Synthetic Indigency Forms",
                "pipeline_stage": "OCR Processing",
                "accuracy": 0.915,
                "f1_score": 0.908,
                "roc_auc": None,
                "status": "completed",
                "created_at": "2026-11-17 11:20:00"
            },
            {
                "id": "exp-yolo-stamp-01",
                "experiment_name": "YOLOv8s Stamp and Signature Localization",
                "pipeline_stage": "Detection",
                "accuracy": 0.887,
                "f1_score": 0.892,
                "roc_auc": 0.924,
                "status": "completed",
                "created_at": "2026-11-18 14:10:00"
            }
        ]


db_store = MockDatabase()
