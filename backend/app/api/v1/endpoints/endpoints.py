import datetime
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.core.config import get_settings
from app.schemas.schemas import (
    APIResponse, HealthResponse, DatasetCreate, DatasetItem,
    DocumentItem, OCRProcessingRequest, OCRResultResponse,
    TransformerOCRRequest, EmbeddingRequest, EmbeddingResponse,
    SemanticScoringRequest, SemanticScoringResponse, DetectionRequest,
    DetectionResponse, DocumentAnalysisRequest, DocumentAnalysisResponse,
    ClassificationPredictRequest, ClassificationPredictResponse,
    ExplainabilityRequest, ExplainabilityResponse, ExperimentItem
)
from app.services.mock_store import db_store

router = APIRouter()
settings = get_settings()

# -------------------------------------------------------------
# 1. Health Endpoint
# -------------------------------------------------------------
@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        version="2.0.0",
        api_prefix=settings.API_V1_PREFIX
    )

# -------------------------------------------------------------
# 2. Synthetic Dataset Management
# -------------------------------------------------------------
@router.get("/datasets", response_model=List[DatasetItem])
def list_datasets():
    return db_store.datasets

@router.post("/datasets", response_model=DatasetItem, status_code=201)
def create_dataset(payload: DatasetCreate):
    new_item = {
        "id": f"ds-{uuid.uuid4().hex[:8]}",
        "name": payload.name,
        "record_count": payload.record_count,
        "category": payload.category,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "ready",
        "notes": payload.notes or "User-generated synthetic records"
    }
    db_store.datasets.insert(0, new_item)
    return new_item

# -------------------------------------------------------------
# 3. Documents
# -------------------------------------------------------------
@router.get("/documents", response_model=List[DocumentItem])
def list_documents():
    return db_store.documents

@router.post("/documents/upload", response_model=DocumentItem, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("Synthetic Document")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB")

    doc_item = {
        "id": f"doc-{uuid.uuid4().hex[:8]}",
        "filename": file.filename,
        "document_type": document_type,
        "file_size_bytes": len(content),
        "uploaded_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "uploaded",
        "ocr_processed": False,
        "manipulation_risk": "clean"
    }
    db_store.documents.insert(0, doc_item)
    return doc_item

# -------------------------------------------------------------
# 4. OCR Processing (PaddleOCR)
# -------------------------------------------------------------
@router.post("/ocr", response_model=OCRResultResponse)
def run_ocr(payload: OCRProcessingRequest):
    return OCRResultResponse(
        document_id=payload.document_id,
        engine=payload.engine,
        status="completed",
        extracted_text=(
            "REPUBLIC OF THE PHILIPPINES\nBARANGAY INDIGENCY CERTIFICATION\n\n"
            "This is to certify that Juan Dela Cruz, of legal age, Filipino, residing at "
            "District 4, is verified as indigent with no fixed regular income, requiring "
            "ophthalmological assistance from OFPHIL foundation."
        ),
        confidence_score=0.964,
        fields_detected={
            "applicant_name": "Juan Dela Cruz",
            "document_title": "Barangay Indigency Certification",
            "issuing_authority": "Office of the Barangay Captain",
            "indigency_clause": "Present and verified",
            "date_of_issue": "2026-10-14"
        },
        processing_time_ms=342.5
    )

# -------------------------------------------------------------
# 5. Transformer-Based OCR (TrOCR / Donut)
# -------------------------------------------------------------
@router.post("/transformers", response_model=OCRResultResponse)
def run_transformer_ocr(payload: TransformerOCRRequest):
    return OCRResultResponse(
        document_id=payload.document_id,
        engine=payload.model_name,
        status="completed",
        extracted_text="Handwritten endorsement: Patient diagnosed with dense nuclear cataract OD, urgent surgical extraction recommended. No financial capacity for private ophthalmological intervention.",
        confidence_score=0.938,
        fields_detected={
            "medical_diagnosis": "Cataract OD",
            "recommendation": "Surgical intervention",
            "financial_note": "No private financial capacity"
        },
        processing_time_ms=812.0
    )

# -------------------------------------------------------------
# 6. Semantic Embeddings (Sentence-BERT)
# -------------------------------------------------------------
@router.post("/embeddings", response_model=EmbeddingResponse)
def generate_embeddings(payload: EmbeddingRequest):
    # Generates a synthetic 384-d normalized vector representation
    sample_vec = [0.042, -0.115, 0.287, -0.054, 0.312, 0.089, -0.211, 0.174]
    return EmbeddingResponse(
        model=payload.model,
        dimension=384,
        vector_sample=sample_vec,
        processing_time_ms=45.8
    )

# -------------------------------------------------------------
# 7. Semantic Assessment Scoring
# -------------------------------------------------------------
@router.post("/semantic-scoring", response_model=SemanticScoringResponse)
def score_semantic_narrative(payload: SemanticScoringRequest):
    return SemanticScoringResponse(
        target=payload.justification_target,
        relevance_score=0.92,
        consistency_score=0.88,
        urgency_score=0.85,
        composite_semantic_score=0.89,
        summary="High alignment with indigent clinical criteria and urgent ophthalmological surgical priority."
    )

# -------------------------------------------------------------
# 8. Object Detection (YOLO Stamp & Signature)
# -------------------------------------------------------------
@router.post("/detection", response_model=DetectionResponse)
def detect_stamps_and_signatures(payload: DetectionRequest):
    return DetectionResponse(
        document_id=payload.document_id,
        model_used=payload.model_type,
        stamps_detected=1,
        signatures_detected=2,
        bounding_boxes=[
            {"label": "official_seal_stamp", "confidence": 0.94, "box": [420, 710, 560, 850]},
            {"label": "barangay_captain_signature", "confidence": 0.91, "box": [380, 890, 540, 960]},
            {"label": "attesting_officer_signature", "confidence": 0.87, "box": [120, 895, 290, 955]}
        ],
        verification_status="verified_authentic"
    )

# -------------------------------------------------------------
# 9. Document Manipulation Screening
# -------------------------------------------------------------
@router.post("/document-analysis", response_model=DocumentAnalysisResponse)
def analyze_document_manipulation(payload: DocumentAnalysisRequest):
    return DocumentAnalysisResponse(
        document_id=payload.document_id,
        tamper_risk_level="Low Risk",
        anomaly_score=0.042,
        flagged_regions=[],
        metadata_integrity="Intact (Consistent EXIF, no clone-stamp artifacts)"
    )

# -------------------------------------------------------------
# 10. CatBoost Classification
# -------------------------------------------------------------
@router.post("/classification", response_model=ClassificationPredictResponse)
def predict_eligibility(payload: ClassificationPredictRequest):
    is_eligible = payload.monthly_income <= 15000 and payload.semantic_score >= 0.70
    probability = 0.94 if is_eligible else 0.18
    return ClassificationPredictResponse(
        applicant_name=payload.applicant_name,
        model_used="CatBoostClassifier-v2.1",
        eligibility_prediction="Eligible for Charity Subsidy" if is_eligible else "Ineligible / Self-Pay",
        confidence_probability=probability,
        feature_importance_top=[
            {"feature": "monthly_income", "importance_weight": 0.38},
            {"feature": "semantic_score", "importance_weight": 0.24},
            {"feature": "household_size", "importance_weight": 0.16},
            {"feature": "philhealth_category", "importance_weight": 0.12},
            {"feature": "stamp_verified", "importance_weight": 0.10}
        ],
        decision_category="Full Subsidy (Class A)" if is_eligible else "Full Self-Pay (Class D)"
    )

# -------------------------------------------------------------
# 11. SHAP Explainability
# -------------------------------------------------------------
@router.post("/explainability", response_model=ExplainabilityResponse)
def explain_prediction(payload: ExplainabilityRequest):
    return ExplainabilityResponse(
        model="CatBoostClassifier-v2.1",
        base_value=0.52,
        shap_values={
            "monthly_income (low)": +0.32,
            "household_size (5)": +0.14,
            "semantic_score (0.89)": +0.18,
            "stamp_verified (True)": +0.08,
            "philhealth_category (Indigent)": +0.11,
            "tamper_risk (clean)": +0.04
        },
        summary_plot_data=[
            {"feature": "monthly_income", "mean_shap": 0.34, "direction": "positive_for_eligibility"},
            {"feature": "semantic_score", "mean_shap": 0.21, "direction": "positive_for_eligibility"},
            {"feature": "household_size", "mean_shap": 0.15, "direction": "positive_for_eligibility"},
            {"feature": "housing_type", "mean_shap": 0.11, "direction": "positive_for_eligibility"}
        ]
    )

# -------------------------------------------------------------
# 13. Password Reset & Forgot Password Endpoints (Brevo SMTP)
# -------------------------------------------------------------
from pydantic import BaseModel
from app.services.email_service import send_password_reset_email, send_patient_welcome_email

class ForgotPasswordRequest(BaseModel):
    role: str
    identifier: Optional[str] = None
    email: Optional[str] = None
    birthdate: Optional[str] = None
    recovery_method: Optional[str] = "email"

@router.post("/auth/forgot-password")
def request_password_reset(payload: ForgotPasswordRequest):
    recipient_email = payload.email or "roxas.t.bscs@gmail.com"
    role_labels = {
        "patient": "Patient Beneficiary",
        "msw": "Medical Social Services (MSW)",
        "admin": "Clinic Administrator & Staff"
    }
    role_label = role_labels.get(payload.role, "OFPHIL User")
    identifier = payload.identifier or payload.email or "User"
    reset_url = f"{settings.FRONTEND_URL}/reset-password?role={payload.role}&token={uuid.uuid4().hex[:16]}"
    
    # Generate 6-digit verification code
    import random
    code = f"{random.randint(100000, 999999)}"
    
    email_sent = send_password_reset_email(
        to_email=recipient_email,
        role_title=role_label,
        identifier=identifier,
        reset_link=reset_url,
        code=code
    )
    
    return {
        "status": "success",
        "email_sent": email_sent,
        "recipient": recipient_email,
        "message": f"Verification code dispatched to {recipient_email}.",
        "code": code
    }

# -------------------------------------------------------------
# 14. Patient Registration & Welcome Email Notification
# -------------------------------------------------------------
class PatientRegisterRequest(BaseModel):
    patient_id: str
    first_name: str
    middle_name: Optional[str] = ""
    last_name: str
    suffix: Optional[str] = ""
    birthdate: str
    sex: str
    civil_status: Optional[str] = "Single"
    contact_number: Optional[str] = ""
    email_address: Optional[str] = None
    initial_password: Optional[str] = ""
    send_credentials_email: Optional[bool] = True

@router.post("/patients/register")
def register_patient_record(payload: PatientRegisterRequest):
    full_name = f"{payload.first_name} {payload.middle_name or ''} {payload.last_name}".strip()
    if payload.suffix:
        full_name += f" {payload.suffix}"

    email_sent = False
    temp_pass = payload.initial_password or "Ofphil@2026"

    # Send Welcome Email via Brevo if email is provided
    if payload.email_address and payload.send_credentials_email:
        email_sent = send_patient_welcome_email(
            to_email=payload.email_address,
            patient_name=full_name,
            patient_id=payload.patient_id,
            temporary_password=temp_pass,
            portal_url=f"{settings.FRONTEND_URL}/login-patient"
        )

    return {
        "status": "success",
        "patient_id": payload.patient_id,
        "patient_name": full_name,
        "email_sent": email_sent,
        "recipient": payload.email_address,
        "message": f"Patient {full_name} ({payload.patient_id}) successfully registered" + (f" and credentials emailed to {payload.email_address}." if email_sent else ".")
    }


# -------------------------------------------------------------
# 15. Master Patient Directory & Records API
# -------------------------------------------------------------
import csv
from pathlib import Path

@router.get("/patients")
def list_patient_records(
    category: Optional[str] = None, # 'CHARITY', 'REGULAR'
    search: Optional[str] = None,
    limit: int = 200
):
    """
    Returns registered patients dataset with categorized Charity / Regular records.
    """
    records = []
    csv_file = Path("data/raw/tabular/charity-patient.csv")
    if csv_file.exists():
        try:
            with open(csv_file, mode="r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    p_id = (row.get("charity_patient_no") or "").strip()
                    if not p_id or p_id.lower() == "nan":
                        p_id = f"M26-11-{idx+1:05d}"

                    fn = (row.get("first_name") or "").strip()
                    ln = (row.get("surname") or "").strip()
                    if not fn and not ln:
                        continue

                    # Eligibility maps to Charity vs Regular
                    eligibility = (row.get("eligibility") or "ELIGIBLE").strip().upper()
                    cat = "CHARITY" if eligibility == "ELIGIBLE" else "REGULAR"

                    raw_age = row.get("age")
                    age_val = None
                    try:
                        if raw_age and not str(raw_age).lower().startswith("nan"):
                            age_val = int(float(raw_age))
                    except Exception:
                        age_val = None

                    sex_val = (row.get("sex") or "F").strip().upper()
                    if sex_val not in ["M", "F"]:
                        sex_val = "F" if "f" in sex_val.lower() else "M"

                    addr = (row.get("address") or "").strip()
                    parts = [p.strip() for p in addr.split(",") if p.strip()]
                    res_city = parts[-2] if len(parts) >= 2 else (parts[0] if parts else "Metro Manila")
                    res_region = parts[-1] if len(parts) >= 1 else "NCR City"

                    contact = (row.get("contact_no") or "").strip()
                    if not contact or contact.lower() == "nan":
                        contact = f"0917 {idx%900+100:03d} {idx%9000+1000:04d}"

                    status_val = (row.get("status") or "APPROVED").strip().upper()
                    if "MAX" in status_val or "ELIGIBLE" in status_val or "APPROVED" in status_val:
                        status_str = "APPROVED"
                    else:
                        status_str = "FIRST-TIME"

                    item = {
                        "id": f"rec-{idx+1}",
                        "patient_id": p_id,
                        "first_name": fn,
                        "last_name": ln,
                        "age": age_val,
                        "sex": sex_val,
                        "residence_city": res_city,
                        "residence_region": res_region,
                        "contact": contact,
                        "category": cat,
                        "status": status_str,
                    }

                    # Filter by category if requested
                    if category and category.upper() != "ALL":
                        if item["category"] != category.upper():
                            continue

                    # Filter by search query if requested
                    if search and search.strip():
                        q = search.strip().lower()
                        full = f"{fn} {ln}".lower()
                        if q not in p_id.lower() and q not in full and q not in res_city.lower():
                            continue

                    records.append(item)
                    if len(records) >= limit:
                        break
        except Exception as e:
            print(f"Error reading patients csv: {e}")

    return records



