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
                "id": "doc-syn-101",
                "filename": "synthetic_barangay_indigency_001.pdf",
                "document_type": "Barangay Indigency Certificate",
                "file_size_bytes": 142850,
                "uploaded_at": "2026-11-18 10:20:00",
                "status": "processed",
                "ocr_processed": True,
                "manipulation_risk": "low"
            },
            {
                "id": "doc-syn-102",
                "filename": "synthetic_clinical_abstract_002.png",
                "document_type": "Clinical Abstract / Referral",
                "file_size_bytes": 284900,
                "uploaded_at": "2026-11-18 11:45:00",
                "status": "processed",
                "ocr_processed": True,
                "manipulation_risk": "clean"
            },
            {
                "id": "doc-syn-103",
                "filename": "synthetic_income_declaration_003.pdf",
                "document_type": "Certificate of Low Income",
                "file_size_bytes": 98400,
                "uploaded_at": "2026-11-19 08:10:00",
                "status": "pending",
                "ocr_processed": False,
                "manipulation_risk": "clean"
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
