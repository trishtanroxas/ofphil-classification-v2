"""
OFPHIL V2 — Shared Document Processing & Project Resolution Utilities
"""

import sys
from pathlib import Path


def find_project_root(start: Path = None) -> Path:
    """
    Deterministically discovers the OFPHIL V2 project root directory.
    Checks parent hierarchy for signature project markers ('data', 'experiments', 'backend').
    Works reliably whether executed from:
      - Project root
      - experiments/
      - experiments/notebooks/
      - experiments/notebooks/04_document_processing_and_ocr/
      - Nested subfolders (e.g. 03_yolo_document_detection/)
    """
    if start is None:
        start = Path.cwd()
    start = Path(start).resolve()

    for p in [start, *start.parents]:
        if (p / 'data').exists() and (p / 'experiments').exists() and (p / 'backend').exists():
            if str(p) not in sys.path:
                sys.path.insert(0, str(p))
            return p

    for p in [start, *start.parents]:
        if p.name == 'ofphil-classification-v2':
            if str(p) not in sys.path:
                sys.path.insert(0, str(p))
            return p

    raise RuntimeError(f"Could not locate OFPHIL V2 project root from start path: {start}")


class DocumentProcessingPaths:
    """Standardized paths for OFPHIL V2 Document Processing & OCR Pipeline."""

    def __init__(self, root: Path = None):
        self.root = find_project_root(root)
        
        # Raw Data Locations (Read-Only)
        self.data_raw = self.root / 'data' / 'raw'
        
        # In V2, supporting documents are housed in 'data/raw/supporting document/supporting_docu'
        # or 'data/raw/documents/samples/supporting_docu' (with fallback support)
        p_canon = self.data_raw / 'supporting document' / 'supporting_docu'
        p_alt = self.data_raw / 'documents' / 'samples' / 'supporting_docu'
        
        self.raw_documents_dir = p_canon if p_canon.exists() else p_alt
        self.raw_physical_capture = self.raw_documents_dir / 'physical_capture'
        self.raw_scan_capture = self.raw_documents_dir / 'scan_capture'
        
        # Interim Document Processing & Ground Truth
        self.interim_doc_proc = self.root / 'data' / 'interim' / 'document_processing'
        self.ground_truth_dir = self.interim_doc_proc / 'ground_truth_annotations'
        self.splits_dir = self.interim_doc_proc / 'splits'
        self.standardized_dir = self.interim_doc_proc / 'standardized'
        self.paddleocr_dataset_dir = self.interim_doc_proc / 'paddleocr_dataset'
        self.model_benchmarks_dir = self.interim_doc_proc / 'model_predictions_and_benchmarks'
        
        # Key Manifests & Ground Truth Files
        self.doc_inventory_manifest = self.interim_doc_proc / 'document_inventory_manifest.csv'
        self.patient_linkage_manifest = self.interim_doc_proc / 'patient_document_linkage_manifest.csv'
        self.text_detection_gt = self.ground_truth_dir / 'text_detection_annotations.csv'
        self.ocr_transcription_gt = self.ground_truth_dir / 'ocr_transcription_annotations.csv'
        self.ocr_transcription_v2_gt = self.ground_truth_dir / 'ocr_transcription_annotations_v2.csv'
        self.structured_data_gt = self.ground_truth_dir / 'structured_data_annotations.csv'
        self.annotation_box_types = self.interim_doc_proc / 'annotation_box_types.json'
        self.annotation_label_classes = self.interim_doc_proc / 'annotation_label_classes.json'
        self.ocr_recognition_corpus = self.interim_doc_proc / 'ocr_recognition_corpus.json'
        
        # Processed & Model Outputs
        self.processed_dir = self.root / 'data' / 'processed'
        self.yolo_dataset_dir = self.processed_dir / 'yolo_dataset'
        self.tampering_dir = self.processed_dir / 'tampering'
        self.authenticity_dir = self.processed_dir / 'authenticity'
        self.validation_dir = self.processed_dir / 'validation'
        
        self.models_dir = self.root / 'models'
        self.phase04_models_dir = self.models_dir / 'phase_04'
        self.paddleocr_rec_model_dir = self.phase04_models_dir / 'paddleocr_recognition'
        self.resnet50_model_dir = self.phase04_models_dir / 'resnet50'
        self.doc_clf_model_dir = self.phase04_models_dir / 'document_classification'
        self.forgery_model_dir = self.phase04_models_dir / 'image_forgery_screening'
        self.sig_stamp_model_dir = self.phase04_models_dir / 'signature_stamp_screening'
        self.yolo_models_dir = self.models_dir / 'trained' / 'yolo'
        self.ocr_models_dir = self.models_dir / 'trained' / 'ocr_finetuned'
        self.ocr_benchmarks_dir = self.models_dir / 'trained' / 'ocr_benchmarks'
        self.tampering_models_dir = self.models_dir / 'trained' / 'tampering_detection'
        self.sibling_raw_documents_dir = (
            self.root.parent
            / 'dss-charity-eligibity-classification'
            / 'data'
            / 'raw'
            / 'supporting document'
            / 'supporting_docu'
        )

    def resolve_sample_path(self, relative_path: str) -> Path:
        """
        Resolves manifest relative paths to actual V2 sample files on disk.
        Handles both canonical 'data/raw/supporting document/supporting_docu/...' and legacy relative paths.
        """
        rel = relative_path.replace('\\', '/')
        if rel.startswith('data/raw/'):
            direct_p = self.root / rel
            if direct_p.exists():
                return direct_p
        
        # Try relative to raw_documents_dir
        clean_rel = rel.replace('data/raw/supporting document/supporting_docu/', '')
        clean_rel = clean_rel.replace('data/raw/supporting document/', '')
        clean_rel = clean_rel.replace('supporting_documents/', '')
        clean_rel = clean_rel.replace('supporting_docu/', '')
        
        p = self.raw_documents_dir / clean_rel
        if p.exists():
            return p

        # Map legacy physical_capture / scan_capture paths to V2 unified capture/ folder
        for legacy_seg in ('/physical_capture/', '/scan_capture/'):
            if legacy_seg in rel:
                p_cap = self.root / rel.replace(legacy_seg, '/capture/')
                if p_cap.exists():
                    return p_cap

        # Read-only fallback to sibling thesis workspace raw documents if present
        if self.sibling_raw_documents_dir.exists():
            p_sib = self.sibling_raw_documents_dir / clean_rel
            if p_sib.exists():
                return p_sib

        return self.root / rel
