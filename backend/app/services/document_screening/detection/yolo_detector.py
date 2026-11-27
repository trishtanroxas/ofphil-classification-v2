from pathlib import Path
from typing import List, Optional
import numpy as np
from app.shared.schemas.pipeline_schemas import DocumentDetectionBox
from app.shared.logging.logger import get_logger

logger = get_logger("YOLODocumentDetector")

class YOLODocumentDetector:
    """
    YOLO11s Document Element Detector.
    Responsible for localizing functional document regions:
    Headers, Fields, Tables, Signature Blocks, and Official Stamps.
    
    IMPORTANT: Localizes signature and stamp presence ONLY. Does NOT authenticate signatures.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.classes = [
            "header",
            "patient_info_field",
            "clinical_findings_field",
            "financial_quotation_table",
            "date_field",
            "signature_region",
            "official_stamp_seal",
        ]
        self._is_ready = bool(model_path and Path(model_path).exists())

    def detect_regions(self, image: np.ndarray, conf_threshold: float = 0.25) -> List[DocumentDetectionBox]:
        """
        Infers bounding boxes on document image.
        If weights are not yet trained/loaded, returns structured scaffold or placeholder detections.
        """
        if not self._is_ready:
            logger.info("YOLO11s weights not initialized. Running structural heuristic placeholder.")
            h, w = image.shape[:2]
            return [
                DocumentDetectionBox(
                    class_name="header",
                    confidence=0.95,
                    bbox=[0.05 * w, 0.02 * h, 0.95 * w, 0.15 * h],
                ),
                DocumentDetectionBox(
                    class_name="signature_region",
                    confidence=0.88,
                    bbox=[0.60 * w, 0.80 * h, 0.90 * w, 0.95 * h],
                ),
            ]

        # In production runtime:
        # from ultralytics import YOLO
        # model = YOLO(self.model_path)
        # results = model.predict(image, conf=conf_threshold)
        return []
