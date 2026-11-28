"""FastAPI router for the OFPHIL Document Annotator V2."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.services import annotator_service as svc

router = APIRouter(prefix="/annotator", tags=["Annotator"])


class LabelsPayload(BaseModel):
    labels: List[str]


class BoxTypesPayload(BaseModel):
    box_types: List[Dict[str, str]]


class SaveBoxesPayload(BaseModel):
    file_name: str
    relative_path: str = ""
    boxes: List[Dict[str, Any]] = Field(default_factory=list)
    export_csv: bool = True
    export_ocr: bool = True
    export_img: Optional[bool] = None
    render_jpg: Optional[bool] = None


class AiDetectPayload(BaseModel):
    relative_path: str
    active_label: str = "auto_detected"


class OcrExtractBoxPayload(BaseModel):
    relative_path: str
    x: int
    y: int
    w: int
    h: int


class CopyCounterpartPayload(BaseModel):
    boxes: List[Dict[str, Any]] = Field(default_factory=list)
    source_width: float = 1
    source_height: float = 1
    target_width: float = 1
    target_height: float = 1


class BatchCopyCounterpartPayload(BaseModel):
    category: str
    direction: str = "physical_to_scan"
    overwrite: bool = False
    export_img: bool = True


@router.get("/labels")
def get_labels():
    return {"labels": svc.load_json_list(svc.LABELS_CONFIG, svc.DEFAULT_LABELS)}


@router.post("/labels")
def save_labels(payload: LabelsPayload):
    svc.save_json_list(svc.LABELS_CONFIG, payload.labels)
    return {"status": "ok", "labels": payload.labels}


@router.get("/box_types")
def get_box_types():
    return {"box_types": svc.load_json_list(svc.BOX_TYPES_CONFIG, svc.DEFAULT_BOX_TYPES)}


@router.post("/box_types")
def save_box_types(payload: BoxTypesPayload):
    svc.save_json_list(svc.BOX_TYPES_CONFIG, payload.box_types)
    return {"status": "ok", "box_types": payload.box_types}


@router.get("/images")
def list_images(category: Optional[str] = Query(default=None)):
    return svc.list_images(category=category)


@router.get("/image_file")
def get_image_file(path: str = Query(...)):
    resolved = svc.safe_resolve_under(svc.DOC_DIR, path)
    if not resolved.exists() or not resolved.is_file() or resolved.suffix.lower() not in svc.ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=404, detail="Image file not found.")
    return FileResponse(str(resolved))


@router.get("/boxes")
def get_boxes(file_name: str = Query(...)):
    return svc.get_boxes(file_name=file_name)


@router.post("/boxes")
def save_boxes(payload: SaveBoxesPayload):
    file_name = payload.file_name.strip()
    if not file_name:
        raise HTTPException(status_code=400, detail="Missing 'file_name'.")
    export_img = payload.export_img if payload.export_img is not None else (
        payload.render_jpg if payload.render_jpg is not None else True
    )
    return svc.save_boxes(
        file_name=file_name,
        rel_path=payload.relative_path.strip(),
        boxes=payload.boxes,
        export_csv=payload.export_csv,
        export_ocr=payload.export_ocr,
        export_img=export_img,
    )


@router.post("/ai_detect_boxes")
def ai_detect_boxes(payload: AiDetectPayload):
    rel_path = payload.relative_path.strip()
    if not rel_path:
        raise HTTPException(status_code=400, detail="Missing 'relative_path'.")
    return svc.ai_detect_boxes(rel_path=rel_path, active_label=payload.active_label)


@router.post("/ocr_extract_box")
def ocr_extract_box(payload: OcrExtractBoxPayload):
    rel_path = payload.relative_path.strip()
    if not rel_path:
        raise HTTPException(status_code=400, detail="Missing 'relative_path'.")
    return svc.ocr_extract_box(
        rel_path=rel_path,
        x=payload.x,
        y=payload.y,
        w=payload.w,
        h=payload.h,
    )


@router.get("/counterpart_info")
def get_counterpart_info(path: str = Query(...)):
    return svc.get_counterpart_info(rel_path=path)


@router.post("/copy_counterpart_boxes")
def copy_counterpart_boxes(payload: CopyCounterpartPayload):
    return svc.copy_counterpart_boxes(
        source_boxes=payload.boxes,
        source_width=payload.source_width,
        source_height=payload.source_height,
        target_width=payload.target_width,
        target_height=payload.target_height,
    )


@router.get("/batch_counterpart_summary")
def get_batch_counterpart_summary(
    category: str = Query(...),
    direction: str = Query(default="physical_to_scan"),
):
    return svc.get_batch_counterpart_summary(category=category, direction=direction)


@router.post("/batch_copy_counterparts")
def batch_copy_counterparts(payload: BatchCopyCounterpartPayload):
    return svc.batch_copy_counterparts(
        category=payload.category.strip(),
        direction=payload.direction.strip(),
        overwrite=payload.overwrite,
        export_img=payload.export_img,
    )
