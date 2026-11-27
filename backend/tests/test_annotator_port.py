import shutil
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import annotator_service as svc

client = TestClient(app)


def test_labels_and_box_types():
    r1 = client.get("/api/v1/annotator/labels")
    assert r1.status_code == 200
    assert isinstance(r1.json()["labels"], list)
    assert len(r1.json()["labels"]) > 0

    r2 = client.get("/api/v1/annotator/box_types")
    assert r2.status_code == 200
    ids = {bt["id"] for bt in r2.json()["box_types"]}
    assert "FORM_SECTION" in ids
    assert "HANDWRITTEN_ENTRY" in ids
    assert "SIGNATURE" in ids


def test_images_list_and_path_traversal():
    r = client.get("/api/v1/annotator/images")
    assert r.status_code == 200
    data = r.json()
    assert "images" in data
    assert data["total"] == len(data["images"])

    r_bad = client.get("/api/v1/annotator/image_file", params={"path": "../../.env"})
    assert r_bad.status_code == 403


def test_save_and_get_boxes_preserves_schema_and_other_docs(tmp_path: Path):
    det_csv = tmp_path / "text_detection_annotations.csv"
    ocr_csv = tmp_path / "ocr_transcription_annotations.csv"
    vis_dir = tmp_path / "bounding_box_visualizations"

    # Seed with another document's row
    pd.DataFrame([{
        "annotation_id": "DET_other_01",
        "file_name": "other_doc.jpg",
        "relative_path": "data/raw/supporting document/supporting_docu/capture/government_id/other_doc.jpg",
        "document_category": "government_id",
        "box_id": 1,
        "bbox_x": 10, "bbox_y": 20, "bbox_width": 100, "bbox_height": 40,
        "box_type": "FORM_SECTION",
        "confidence_score": "",
        "annotation_status": "VERIFIED",
        "label_name": "patient_name",
        "image_name": "other_doc.jpg",
        "image_width": 1000, "image_height": 1000,
    }]).to_csv(det_csv, index=False)

    res = svc.save_boxes(
        file_name="test_doc.jpg",
        rel_path="data/raw/supporting document/supporting_docu/capture/government_id/test_doc.jpg",
        boxes=[{
            "x": 50, "y": 60, "w": 200, "h": 45,
            "label": "surname", "box_type": "HANDWRITTEN_ENTRY", "text": "DELA CRUZ",
        }],
        export_csv=True,
        export_ocr=True,
        export_img=False,
        csv_path=det_csv,
        ocr_csv_path=ocr_csv,
        vis_dir=vis_dir,
    )
    assert res["status"] == "ok"
    assert res["saved_boxes"] == 1

    df_det = pd.read_csv(det_csv)
    assert set(df_det["file_name"]) == {"other_doc.jpg", "test_doc.jpg"}
    assert "bbox_x" in df_det.columns and "label_name" in df_det.columns

    loaded = svc.get_boxes("test_doc.jpg", csv_path=det_csv, ocr_csv_path=ocr_csv)
    assert len(loaded["boxes"]) == 1
    assert loaded["boxes"][0]["label"] == "surname"
    assert loaded["boxes"][0]["text"] == "DELA CRUZ"


def test_excel_permission_error_fallback(tmp_path: Path):
    det_csv = tmp_path / "text_detection_annotations.csv"
    ocr_csv = tmp_path / "ocr_transcription_annotations.csv"
    with patch.object(pd.DataFrame, "to_csv", side_effect=[PermissionError("Locked"), None]):
        res = svc.save_boxes(
            file_name="locked_doc.jpg",
            rel_path="",
            boxes=[{"x": 1, "y": 2, "w": 30, "h": 20, "label": "surname", "box_type": "FORM_SECTION", "text": ""}],
            export_csv=True,
            export_ocr=False,
            export_img=False,
            csv_path=det_csv,
            ocr_csv_path=ocr_csv,
        )
    assert res["status"] == "warning"
    assert "locked by Excel" in res["message"]


def test_counterpart_scaling():
    res = svc.copy_counterpart_boxes(
        source_boxes=[{"x": 100, "y": 200, "w": 300, "h": 50, "label": "surname", "box_type": "HANDWRITTEN_ENTRY", "text": "TEST"}],
        source_width=1000,
        source_height=2000,
        target_width=2000,
        target_height=4000,
    )
    b = res["boxes"][0]
    assert (b["x"], b["y"], b["w"], b["h"]) == (200, 400, 600, 100)
