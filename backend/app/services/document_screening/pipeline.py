import numpy as np
from pathlib import Path
from typing import Optional

from app.shared.schemas.pipeline_schemas import DocumentScreeningResult
from app.shared.logging.logger import get_logger

from .image_processing.preprocessing import DocumentImagePreprocessor
from .detection.yolo_detector import YOLODocumentDetector
from .ocr.paddle_ocr import PaddleOCRExtractor
from .forgery_detection.copy_move_detection import CopyMoveDetector
from .validation.document_validator import DocumentValidator

logger = get_logger("DocumentScreeningPipeline")

class DocumentScreeningPipeline:
    """
    Track A: Integrated Document Fraud Screening Pipeline.
    Orchestrates:
    Image Preprocessing -> YOLO11s Detection -> PaddleOCR Extraction -> CMFD Screening -> Validation Engine.
    """

    def __init__(self, yolo_weights_path: Optional[str] = None):
        self.preprocessor = DocumentImagePreprocessor()
        self.detector = YOLODocumentDetector(model_path=yolo_weights_path)
        self.ocr_extractor = PaddleOCRExtractor()
        self.cmfd_detector = CopyMoveDetector()
        self.validator = DocumentValidator()

    def process_document(
        self,
        image: np.ndarray,
        document_id: str,
        filename: str,
        doc_type: str = "general",
        expected_patient_name: str = ""
    ) -> DocumentScreeningResult:
        logger.info(f"Starting Document Screening for {filename} (ID: {document_id})")

        # 1. OpenCV Preprocessing
        enhanced = self.preprocessor.enhance_contrast(image)
        deskewed, angle = self.preprocessor.deskew(enhanced)

        # 2. YOLO11s Region Detection
        detected_boxes = self.detector.detect_regions(deskewed)

        # 3. PaddleOCR Text Extraction
        full_text, words, mean_conf = self.ocr_extractor.extract_text(deskewed)

        # 4. Copy-Move Forgery Detection
        is_cmfd_flag, cmfd_count, _ = self.cmfd_detector.screen_image(deskewed)

        # 5. Python Validation Engine
        validation_flags = self.validator.validate(
            doc_type=doc_type,
            detected_boxes=detected_boxes,
            extracted_text=full_text,
            expected_patient_name=expected_patient_name
        )

        if is_cmfd_flag:
            validation_flags.append(f"POTENTIAL_FORGERY_DETECTED: {cmfd_count} duplicated feature clusters flagged by CMFD.")

        requires_manual = len(validation_flags) > 0 or is_cmfd_flag or mean_conf < 0.60

        summary = (
            f"Screening complete. {len(detected_boxes)} structural regions detected. "
            f"OCR confidence: {mean_conf:.2f}. "
            f"Status: {'MANUAL REVIEW RECOMMENDED' if requires_manual else 'CLEAN'}"
        )

        return DocumentScreeningResult(
            document_id=document_id,
            filename=filename,
            detected_elements=detected_boxes,
            ocr_transcription=full_text,
            ocr_confidence_mean=float(mean_conf),
            cmfd_flag=is_cmfd_flag,
            cmfd_suspicious_blocks_count=cmfd_count,
            validation_flags=validation_flags,
            requires_manual_inspection=requires_manual,
            screening_summary=summary
        )
