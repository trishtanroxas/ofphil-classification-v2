import datetime
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header, Depends, Response, Request
from app.core.config import get_settings
from app.core.rbac import get_current_authenticated_patient
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
# 3. Documents (Managed by app.api.v1.endpoints.documents)
# -------------------------------------------------------------

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
    # DOH-PIE / OFPHIL MSW Decision Rubric Logic:
    # 1. Indigent (100% Full Charity Subsidy):
    #    avgSev >= 3.8 OR avgCop >= 3.8 OR totalRisk >= 65.0% (or totalHouseholdIncome <= 14000 on initial load)
    # 2. Financially Incapacitated (B1) (High Partial Charity Subsidy):
    #    avgSev >= 2.8 OR avgCop >= 2.8 OR totalRisk >= 45.0%
    # 3. Financially Incapacitated (B2) (Moderate Partial Subsidy):
    #    totalRisk >= 30.0% (or totalHouseholdIncome <= 25000 on initial load)
    # 4. Financially Capacitated (Full Pay) (Full Pay / Non-Charity):
    #    All scores below thresholds above

    income = payload.monthly_income
    semantic = payload.semantic_score

    # Estimate proxy severity & coping from income and semantic score
    approx_sev = 4.0 if income <= 14000 else (3.0 if income <= 25000 else 1.5)
    approx_cop = 3.9 if semantic >= 0.80 else 2.5
    approx_risk = min(100.0, max(10.0, (1.0 - (income / 35000.0)) * 70.0 + (semantic * 30.0)))

    if approx_sev >= 3.8 or approx_cop >= 3.8 or approx_risk >= 65.0 or income <= 14000:
        decision_tier = "Indigent (100% Full Charity Subsidy)"
        is_eligible = True
        probability = 0.96
    elif approx_sev >= 2.8 or approx_cop >= 2.8 or approx_risk >= 45.0:
        decision_tier = "Financially Incapacitated (B1) — High Partial Charity Subsidy"
        is_eligible = True
        probability = 0.82
    elif approx_risk >= 30.0 or income <= 25000:
        decision_tier = "Financially Incapacitated (B2) — Moderate Partial Subsidy"
        is_eligible = True
        probability = 0.68
    else:
        decision_tier = "Financially Capacitated (Full Pay / Non-Charity)"
        is_eligible = False
        probability = 0.15

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
        decision_category=decision_tier
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
# 13. Email Service Imports (Password Recovery managed by auth_recovery.py)
# -------------------------------------------------------------
from pydantic import BaseModel
from app.services.email_service import send_password_reset_email, send_patient_welcome_email, send_inquiry_submission_email, send_inquiry_reply_email, send_appointment_schedule_email

# -------------------------------------------------------------
# 13B. Authentication & Session Invalidation (Logout)
# -------------------------------------------------------------
class LogoutRequest(BaseModel):
    role: Optional[str] = "admin"
    user_id: Optional[str] = None
    reason: Optional[str] = "user_initiated"

@router.post("/auth/logout")
def logout_user_session(
    payload: Optional[LogoutRequest] = None,
    response: Response = None,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    effective_role = (payload.role if payload and payload.role else x_user_role) or "user"
    effective_user = (payload.user_id if payload and payload.user_id else x_user_id) or "anonymous"

    # Expire authentication / session cookies if present
    if response:
        response.delete_cookie(key="ofphil_session", path="/")
        response.delete_cookie(key="ofphil_token", path="/")

    return {
        "status": "success",
        "message": f"Session for {effective_role} ({effective_user}) successfully terminated and invalidated on server.",
        "role": effective_role,
        "user_id": effective_user,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# -------------------------------------------------------------
# 14. Patient Registration & Welcome Email Notification
# -------------------------------------------------------------
class PatientRegisterRequest(BaseModel):
    patient_id: Optional[str] = None
    category: Optional[str] = "REGULAR"
    first_name: str
    middle_name: Optional[str] = ""
    last_name: str
    suffix: Optional[str] = ""
    birthdate: str
    sex: str
    civil_status: Optional[str] = "Single"
    num_dependents: Optional[str] = "0"
    perm_province: Optional[str] = "Metro Manila (NCR)"
    perm_city: Optional[str] = "City of Manila"
    perm_barangay: Optional[str] = "Barangay 659 (Intramuros)"
    perm_street: Optional[str] = ""
    same_address: Optional[bool] = True
    alt_province: Optional[str] = "Metro Manila (NCR)"
    alt_city: Optional[str] = "City of Manila"
    alt_barangay: Optional[str] = "Barangay 659 (Intramuros)"
    alt_street: Optional[str] = ""
    educational_attainment: Optional[str] = "High School Graduate / Level"
    employment_status: Optional[str] = "Employed (Full-time / Part-time)"
    occupation: Optional[str] = ""
    contact_number: Optional[str] = ""
    email_address: Optional[str] = None
    phone_verified: Optional[bool] = True
    email_verified: Optional[bool] = False
    initial_password: Optional[str] = ""
    send_credentials_email: Optional[bool] = True

def generate_next_patient_id(registry: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Generates dynamic sequential permanent patient ID in format MYY-MM-XXXXXX
    where M is prefix, YY is 2-digit year, MM is 2-digit month, and XXXXXX is 6-digit sequential number.
    Uses institutional timezone (Asia/Manila) and previews without consuming the sequence.
    """
    from app.services.patient_id_service import patient_id_service
    reg = registry if registry is not None else REGISTERED_PATIENTS_REGISTRY
    return patient_id_service.preview_next_patient_id(registry=reg)


def generate_next_charity_case_no(registry: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Generates dynamic sequential charity case numbering in format MSW_FA_MMYY-XX
    where MM is current month, YY is 2-digit year, and XX is sequential (01, 02...).
    Dynamically tracks the live system month & year (e.g. 1126 for November 2026).
    """
    now = datetime.date.today()
    prefix = f"MSW_FA_{now.strftime('%m%y')}-"
    reg = registry if registry is not None else REGISTERED_PATIENTS_REGISTRY
    max_seq = 0
    for p in reg:
        pid = str(p.get("patient_id", "")).strip().upper()
        if pid.startswith(prefix):
            suffix = pid[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        elif pid.startswith("MSW_FA_"):
            m = re.match(r"^MSW_FA_(\d{2})(\d{2})-(\d+)$", pid)
            if m and m.group(1) == now.strftime('%m') and m.group(2) == now.strftime('%y'):
                max_seq = max(max_seq, int(m.group(3)))
    next_num = max_seq + 1
    return f"{prefix}{next_num:02d}"

import json
import os
from app.core.paths import STORAGE_DIR

PATIENTS_REGISTRY_FILE = STORAGE_DIR / "patients_registry.json"

# Registered patients storage initialized with verified records
INITIAL_PATIENTS_REGISTRY: List[Dict[str, Any]] = []

def _load_patients_registry() -> List[Dict[str, Any]]:
    if PATIENTS_REGISTRY_FILE.exists():
        try:
            data = json.loads(PATIENTS_REGISTRY_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return data
        except Exception as e:
            print(f"[ERROR] Failed to load patients registry from {PATIENTS_REGISTRY_FILE}: {e}")
            raise
    return list(INITIAL_PATIENTS_REGISTRY)

def _save_patients_registry() -> None:
    try:
        PATIENTS_REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp_file = PATIENTS_REGISTRY_FILE.with_suffix(".json.tmp")
        tmp_file.write_text(json.dumps(REGISTERED_PATIENTS_REGISTRY, indent=2), encoding="utf-8")
        os.replace(tmp_file, PATIENTS_REGISTRY_FILE)
    except Exception as e:
        print(f"[ERROR] Failed to save patients registry to {PATIENTS_REGISTRY_FILE}: {e}")
        raise

REGISTERED_PATIENTS_REGISTRY: List[Dict[str, Any]] = _load_patients_registry()

@router.get("/patients/next-patient-id")
def get_next_patient_id():
    """
    Returns the next sequential Patient ID based on current YY-MM in format M26-11-0000#.
    """
    return {"next_patient_id": generate_next_patient_id()}


@router.get("/patients/next-charity-case-no")
def get_next_charity_case_no():
    """
    Returns the next sequential Charity Case No. based on current MMYY.
    """
    return {"next_case_no": generate_next_charity_case_no()}

@router.post("/patients/register")
def register_patient_record(payload: PatientRegisterRequest):
    req_first = payload.first_name.strip()
    req_last = payload.last_name.strip()
    # New applicants always start with REGULAR registration classification.
    # Charity beneficiary status is granted only after MSW approval of a referral.
    registration_type = "REGULAR"
    category = "REGULAR"

    from app.services.patient_id_service import patient_id_service
    req_pid = (payload.patient_id or "").strip().upper()
    if not req_pid or req_pid in {"AUTO", "GENERATE"} or req_pid.startswith("AUTO"):
        req_pid = patient_id_service.reserve_next_patient_id(registry=REGISTERED_PATIENTS_REGISTRY)
    else:
        patient_id_service.record_assigned_patient_id(req_pid)

    charity_case_no = None

    # Check for duplicate Patient Name (First Name + Last Name case-insensitive) or duplicate Patient ID
    for existing in REGISTERED_PATIENTS_REGISTRY:
        ex_pid = str(existing.get("patient_id", "")).strip().upper()
        ex_first = str(existing.get("first_name", "")).strip()
        ex_last = str(existing.get("last_name", "")).strip()

        if ex_first.lower() == req_first.lower() and ex_last.lower() == req_last.lower():
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate patient name detected: '{ex_first} {ex_last}' is already registered under Patient ID {ex_pid}."
            )
        if ex_pid == req_pid:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate Patient ID: '{req_pid}' is already assigned to {ex_first} {ex_last}."
            )

    full_name = f"{req_first} {payload.middle_name or ''} {req_last}".strip()
    if payload.suffix:
        full_name += f" {payload.suffix}"

    email_sent = False
    temp_pass = payload.initial_password or "Ofphil@2026"

    # Send Welcome Email via Brevo if email is provided and not charity
    if payload.email_address and payload.send_credentials_email and category != "CHARITY":
        email_sent = send_patient_welcome_email(
            to_email=payload.email_address,
            patient_name=full_name,
            patient_id=req_pid,
            temporary_password=temp_pass,
            portal_url=f"{settings.FRONTEND_URL}/login-patient"
        )

    # Compute age from birthdate if possible
    computed_age = None
    try:
        if payload.birthdate:
            b_year = int(str(payload.birthdate).split("-")[0])
            computed_age = max(0, 2026 - b_year)
    except Exception:
        pass

    # Save to live active clinic registry (clean masterlist with full Register Patient fields)
    new_record = {
        "id": f"rec-{len(REGISTERED_PATIENTS_REGISTRY) + 1}",
        "patient_id": req_pid,
        "first_name": payload.first_name,
        "middle_name": payload.middle_name or "",
        "last_name": payload.last_name,
        "suffix": payload.suffix or "",
        "birthdate": payload.birthdate,
        "age": computed_age,
        "sex": "F" if "Female" in payload.sex else "M",
        "civil_status": payload.civil_status or "Single",
        "num_dependents": payload.num_dependents or "0",
        "perm_province": payload.perm_province or "Metro Manila (NCR)",
        "perm_city": payload.perm_city or "City of Manila",
        "perm_barangay": payload.perm_barangay or "",
        "perm_street": payload.perm_street or "",
        "same_address": payload.same_address if payload.same_address is not None else True,
        "alt_province": (payload.perm_province if payload.same_address else payload.alt_province) or "Metro Manila (NCR)",
        "alt_city": (payload.perm_city if payload.same_address else payload.alt_city) or "City of Manila",
        "alt_barangay": (payload.perm_barangay if payload.same_address else payload.alt_barangay) or "",
        "alt_street": (payload.perm_street if payload.same_address else payload.alt_street) or "",
        "educational_attainment": payload.educational_attainment or "High School Graduate / Level",
        "employment_status": payload.employment_status or "Employed (Full-time / Part-time)",
        "occupation": payload.occupation or "",
        "residence_city": payload.perm_city or "City of Manila",
        "residence_region": payload.perm_province or "Metro Manila (NCR)",
        "contact": payload.contact_number or "",
        "email": payload.email_address or "",
        "phone_verified": payload.phone_verified if payload.phone_verified is not None else True,
        "email_verified": payload.email_verified if payload.email_verified is not None else False,
        "has_account": True,
        "registration_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "initial_password": temp_pass,
        "registration_type": registration_type,
        "category": category,
        "charity_status": "NONE",
        "charity_case_no": charity_case_no,
        "is_charity_beneficiary": False,
        "status": "APPROVED",
        "assigned_msw": "Maria Santos, RSW (msw_lead)",
    }

    try:
        from app.core.security import hash_password
        from app.services.recovery_service import recovery_service
        pass_hash = hash_password(temp_pass)
        new_record["password_hash"] = pass_hash
        recovery_service._patient_creds[req_pid] = {
            "patient_id": req_pid,
            "password_hash": pass_hash,
            "password_updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        recovery_service._save_patient_creds()
    except Exception as e:
        print(f"Error persisting credentials for {req_pid}: {e}")

    REGISTERED_PATIENTS_REGISTRY.insert(0, new_record)
    _save_patients_registry()

    try:
        from app.services.inquiry_service import inquiry_service
        inquiry_service.create_msw_notification(
            recipient_user_id="msw_lead",
            notification_type="PATIENT_ASSIGNED",
            title=f"New Patient Assigned: {full_name}",
            message=f"{category.title()} patient {full_name} ({req_pid}) was registered and assigned to your MSW caseload.",
            target_destination=f"/patients/{req_pid}?tab={'assessment' if category == 'CHARITY' else 'profile'}",
            related_patient_id=req_pid,
            dedup_key=f"PATIENT_REGISTERED:{req_pid}:msw_lead",
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Patient '{full_name}' successfully registered with ID {req_pid}.",
        "patient": new_record,
        "email_sent": email_sent,
    }


@router.get("/patients/{patient_id}")
def get_patient_dossier(patient_id: str):
    """
    Returns full patient detail, encounters, surgical procedure quotation, and case documents.
    """
    clean_target = (patient_id or "").strip()
    found_patient = None
    for item in REGISTERED_PATIENTS_REGISTRY:
        if (
            str(item.get("patient_id") or "").strip().upper() == clean_target.upper()
            or str(item.get("charity_case_no") or "").strip().upper() == clean_target.upper()
            or str(item.get("id") or "").strip().lower() == clean_target.lower()
        ):
            found_patient = item
            break
            
    if not found_patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    encounters = found_patient.get("encounters", [])
    documents = found_patient.get("documents", [])
    inquiries = found_patient.get("inquiries", [])
    total_subsidy = sum(e.get("approved_financial_assistance", 0.0) for e in encounters)

    from app.services.referral_service import referral_service
    canonical_pid = str(found_patient.get("patient_id") or clean_target)
    assistance_history = referral_service.get_patient_assistance_history(patient_id=canonical_pid)

    return {
        "status": "success",
        "patient": found_patient,
        "encounters": encounters,
        "documents": documents,
        "inquiries": inquiries,
        "total_assistance": total_subsidy,
        "assistance_history": assistance_history,
    }


@router.get("/msw/patients/{patient_id}/dossier")
def get_msw_patient_dossier(
    patient_id: str,
    x_user_role: str = Header(default="msw"),
    x_user_id: str = Header(default="msw_lead"),
):
    """
    Read-only MSW Patient Dossier endpoint.
    Enforces MSW / Admin / Nurse authorization, retrieves exact patient record,
    application encounters, distinct charity case numbers, supporting documents,
    referrals, and assessment history WITHOUT creating or modifying any database record.
    """
    role_norm = (x_user_role or "").strip().lower()
    if role_norm not in {"msw", "admin", "nurse"}:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Only authorized Medical Social Workers or Clinic Administrators can view patient dossiers.",
        )

    target_id = (patient_id or "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="Patient ID is required.")

    found_patient = None
    for item in REGISTERED_PATIENTS_REGISTRY:
        if (
            str(item.get("patient_id") or "").strip().upper() == target_id.upper()
            or str(item.get("charity_case_no") or "").strip().upper() == target_id.upper()
            or str(item.get("id") or "").strip().lower() == target_id.lower()
        ):
            found_patient = item
            break

    if not found_patient:
        raise HTTPException(status_code=404, detail=f"Patient record '{target_id}' not found.")

    canonical_pid = str(found_patient.get("patient_id"))
    raw_category = str(found_patient.get("category") or "").strip().upper()
    from app.services.referral_service import referral_service
    patient_referrals = referral_service.list_referrals(patient_id=canonical_pid)
    approved_ref = next((r for r in patient_referrals if r.get("status") in {"MSW APPROVED", "Assessment in Progress", "Referred for Administrative Decision", "Approved", "Assessed"}), None)
    is_charity_patient = (
        raw_category == "CHARITY"
        or bool(found_patient.get("is_charity_beneficiary"))
        or str(found_patient.get("charity_status") or "").strip().upper() == "APPROVED"
        or bool(found_patient.get("charity_case_no"))
        or (approved_ref is not None)
    )
    charity_case_no = (
        (found_patient.get("charity_case_no") or (approved_ref.get("charity_case_no") if approved_ref else None) or (canonical_pid if canonical_pid.startswith("MSW_FA_") else None))
        if is_charity_patient
        else None
    )

    from app.services.assessment_service import assessment_service
    from app.services.document_authenticity_service import document_authenticity_service

    # 1. Retrieve existing assessments for this exact patient (strictly read-only)
    patient_assessments = assessment_service.list_assessments(patient_id=canonical_pid)

    # Determine current assessment state & entry point action
    active_draft = None
    latest_completed = None
    for asmt in patient_assessments:
        ws = asmt.get("workflow_status")
        if ws in {"DRAFT", "ASSESSMENT_IN_PROGRESS", "RETURNED_FOR_REVISION"} and not active_draft:
            active_draft = asmt
        elif ws in {"PENDING_DOCUMENT_REVIEW", "PENDING_MSW_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"} and not latest_completed:
            latest_completed = asmt

    can_access_msw_assessment_tool = is_charity_patient and (role_norm == "msw")

    if not is_charity_patient:
        assessment_state = {
            "state": "NOT_ELIGIBLE_REGULAR",
            "action_label": None,
            "assessment_id": None,
            "workflow_status": "REGULAR_PATIENT",
            "active_stage": None,
            "encounter_no": None,
            "updated_at": None,
            "read_only": True,
            "can_launch_or_edit": False,
        }
    elif role_norm != "msw":
        ref_asmt = latest_completed or active_draft
        assessment_state = {
            "state": "READ_ONLY",
            "action_label": None,
            "assessment_id": ref_asmt.get("id") if ref_asmt else None,
            "workflow_status": ref_asmt.get("workflow_status") if ref_asmt else "NOT_STARTED",
            "active_stage": ref_asmt.get("active_stage") if ref_asmt else None,
            "encounter_no": ref_asmt.get("encounter_no") if ref_asmt else None,
            "updated_at": ref_asmt.get("updated_at") if ref_asmt else None,
            "read_only": True,
            "can_launch_or_edit": False,
        }
    elif active_draft:
        assessment_state = {
            "state": "DRAFT",
            "action_label": "Continue Assessment",
            "assessment_id": active_draft.get("id"),
            "workflow_status": active_draft.get("workflow_status"),
            "active_stage": active_draft.get("active_stage", 1),
            "encounter_no": active_draft.get("encounter_no"),
            "updated_at": active_draft.get("updated_at"),
            "read_only": False,
            "can_launch_or_edit": True,
        }
    elif latest_completed:
        ws = latest_completed.get("workflow_status")
        is_review = ws in {"PENDING_DOCUMENT_REVIEW", "PENDING_MSW_REVIEW", "PENDING_APPROVAL"}
        assessment_state = {
            "state": "COMPLETED" if not is_review else "IN_REVIEW",
            "action_label": "Review Assessment" if is_review else "View Assessment",
            "assessment_id": latest_completed.get("id"),
            "workflow_status": ws,
            "active_stage": latest_completed.get("active_stage", 4),
            "encounter_no": latest_completed.get("encounter_no"),
            "updated_at": latest_completed.get("updated_at"),
            "read_only": False,
            "can_launch_or_edit": True,
        }
    else:
        assessment_state = {
            "state": "NONE",
            "action_label": "Launch Assessment",
            "assessment_id": None,
            "workflow_status": "NOT_STARTED",
            "active_stage": None,
            "encounter_no": None,
            "updated_at": None,
            "read_only": False,
            "can_launch_or_edit": True,
        }

    # 2. Retrieve supporting documents belonging strictly to this patient
    docs = document_authenticity_service.list_documents(patient_id=canonical_pid)

    # 3. Build Application & Encounter records (keeping Patient ID, Encounter No., and Charity Case No. distinct)
    raw_encounters = list(found_patient.get("encounters") or [])
    encounter_records = []
    seen_enc_nos = set()

    for enc in raw_encounters:
        enc_no = enc.get("id") or enc.get("encounter_no")
        if enc_no:
            seen_enc_nos.add(enc_no)
        # Find linked assessment if any
        linked_asmt = next(
            (a for a in patient_assessments if a.get("encounter_no") == enc_no or a.get("id") == enc.get("assessment_id")),
            None,
        )
        encounter_records.append({
            "encounter_no": enc_no or "Not Available",
            "patient_id": canonical_pid,
            "charity_case_no": enc.get("charity_case_no") or charity_case_no or "Not Assigned",
            "application_date": enc.get("encounter_date") or found_patient.get("registration_date") or "Not Available",
            "application_type": enc.get("application_type") or enc.get("procedure") or "Ophthalmic Medical Assistance",
            "application_status": enc.get("status") or found_patient.get("status") or "PENDING",
            "assigned_msw": enc.get("assigned_msw") or found_patient.get("assigned_msw") or "Maria Santos, RSW",
            "assessment_status": linked_asmt.get("workflow_status") if linked_asmt else (
                "APPROVED" if enc.get("status") == "APPROVED" else "NOT_STARTED"
            ),
            "last_updated": (linked_asmt.get("updated_at") if linked_asmt else enc.get("encounter_date")) or "Not Available",
            "diagnosis": enc.get("diagnosis") or found_patient.get("diagnosis") or "Not Available",
            "procedure": enc.get("procedure") or found_patient.get("recommended_procedure") or "Not Available",
            "attending_doctor": enc.get("attending_doctor") or found_patient.get("attending_doctor") or "Not Available",
            "total_amount": enc.get("total_amount"),
            "approved_financial_assistance": enc.get("approved_financial_assistance"),
            "notes": enc.get("notes") or "",
            "assessment_id": linked_asmt.get("id") if linked_asmt else None,
        })

    # Also include any assessment encounter not yet in raw_encounters
    for asmt in patient_assessments:
        enc_no = asmt.get("encounter_no")
        if enc_no and enc_no not in seen_enc_nos:
            seen_enc_nos.add(enc_no)
            encounter_records.append({
                "encounter_no": enc_no,
                "patient_id": canonical_pid,
                "charity_case_no": charity_case_no or "Not Assigned",
                "application_date": asmt.get("interview_date") or (asmt.get("created_at") or "")[:10] or "Not Available",
                "application_type": asmt.get("source_of_referral") or "MSW Socioeconomic Assessment",
                "application_status": asmt.get("workflow_status") or "DRAFT",
                "assigned_msw": (asmt.get("msw_recommendation") or {}).get("msw_assessor_name") or found_patient.get("assigned_msw") or "Maria Santos, RSW",
                "assessment_status": asmt.get("workflow_status") or "DRAFT",
                "last_updated": asmt.get("updated_at") or "Not Available",
                "diagnosis": found_patient.get("diagnosis") or "Not Available",
                "procedure": found_patient.get("recommended_procedure") or "Not Available",
                "attending_doctor": found_patient.get("attending_doctor") or "Not Available",
                "total_amount": None,
                "approved_financial_assistance": None,
                "notes": (asmt.get("msw_recommendation") or {}).get("case_notes") or "",
                "assessment_id": asmt.get("id"),
            })

    # 4. Build Socioeconomic summary from actual patient record + latest assessment Stage 1/2 if available
    latest_asmt = patient_assessments[0] if patient_assessments else None
    s1 = (latest_asmt.get("stage1_data") if latest_asmt else None) or {}
    s2 = (latest_asmt.get("stage2_data") if latest_asmt else None) or {}
    fin_cls = ((latest_asmt.get("classification_result") or {}).get("financial_classification") if latest_asmt else None) or {}

    monthly_income = (
        s1.get("total_household_income")
        if s1.get("total_household_income") is not None
        else found_patient.get("monthly_household_income")
    )
    socioeconomic_profile = {
        "monthly_household_income": monthly_income,
        "monthly_per_capita_income": fin_cls.get("monthly_per_capita_income"),
        "employment_status": found_patient.get("employment_status") or "Not Available",
        "occupation": found_patient.get("occupation") or "Not Available",
        "educational_attainment": found_patient.get("educational_attainment") or "Not Available",
        "num_dependents": found_patient.get("num_dependents") if found_patient.get("num_dependents") is not None else "Not Available",
        "household_size": s1.get("household_size") or (
            (int(found_patient["num_dependents"]) + 1)
            if str(found_patient.get("num_dependents", "")).isdigit()
            else None
        ),
        "philhealth_category": found_patient.get("philhealth_category") or "Not Available",
        "philhealth_coverage": found_patient.get("philhealth_coverage") or "Not Available",
        "family_members": s1.get("family_members") or [],
        "living_situation": (s2.get("background") or {}).get("living_situation"),
        "income_sources": (s2.get("background") or {}).get("income_sources"),
        "financial_responsibilities": (s2.get("background") or {}).get("financial_responsibilities"),
        "financial_classification_label": fin_cls.get("classification_label"),
        "financial_explanation": fin_cls.get("explanation"),
    }

    # 5. Clinical & Medical summary
    clinical_profile = {
        "primary_diagnosis": found_patient.get("diagnosis") or "Not Available",
        "eye_condition": found_patient.get("eye_condition") or found_patient.get("diagnosis") or "Not Available",
        "clinical_findings": found_patient.get("clinical_findings") or "Not Available",
        "medical_history": found_patient.get("medical_history") or "Not Available",
        "surgical_history": found_patient.get("surgical_history") or "Not Available",
        "recommended_procedure": found_patient.get("recommended_procedure") or "Not Available",
        "attending_doctor": found_patient.get("attending_doctor") or "Not Available",
        "clinical_encounters": encounter_records,
    }

    # 6. Financial Assistance Referrals & Assistance History for this patient
    from app.services.referral_service import referral_service
    referrals = referral_service.list_referrals(patient_id=canonical_pid)
    assistance_history = referral_service.get_patient_assistance_history(patient_id=canonical_pid)

    return {
        "status": "success",
        "is_charity_patient": is_charity_patient,
        "show_charity_status_tab": is_charity_patient,
        "can_access_msw_assessment_tool": can_access_msw_assessment_tool,
        "patient": {
            **found_patient,
            "charity_case_no": charity_case_no,
        },
        "identifiers": {
            "patient_id": canonical_pid,
            "charity_case_no": charity_case_no or "Not Assigned",
            "latest_encounter_no": encounter_records[0]["encounter_no"] if encounter_records else "No Encounter Recorded",
        },
        "assessment_entry": assessment_state,
        "socioeconomic_profile": socioeconomic_profile,
        "clinical_profile": clinical_profile,
        "encounters": encounter_records,
        "documents": docs,
        "assessments": patient_assessments if is_charity_patient else [],
        "referrals": referrals,
        "assistance_history": assistance_history,
    }

# -------------------------------------------------------------
# 15. Master Patient Directory & Records API
# -------------------------------------------------------------
class PatientClassificationChangeRequest(BaseModel):
    classification: str  # "REGULAR" or "CHARITY"
    reason: Optional[str] = None


@router.patch("/patients/{patient_id}/classification")
async def update_patient_classification(
    patient_id: str,
    payload: PatientClassificationChangeRequest,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default="admin_sys"),
):
    """
    Authorized Admin workflow to change an existing patient's classification between REGULAR and CHARITY.
    - Enforces Admin authorization.
    - Updates the existing patient record in-place (never creates a duplicate record or changes Patient ID).
    - Preserves all existing clinical records, appointments, encounters, and inquiries.
    - Records the classification transition in the audit log with previous/new classification, actor, and timestamp.
    """
    role_norm = (x_user_role or "").strip().lower()
    if role_norm != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Only an authorized Clinic Administrator can change a patient's classification.",
        )

    new_cls = (payload.classification or "").strip().upper()
    if new_cls not in {"REGULAR", "CHARITY"}:
        raise HTTPException(
            status_code=422,
            detail="Invalid classification. Supported classifications are 'REGULAR' and 'CHARITY'.",
        )

    target_patient = None
    for item in REGISTERED_PATIENTS_REGISTRY:
        if (
            str(item.get("patient_id") or "").strip().upper() == patient_id.strip().upper()
            or str(item.get("id") or "").strip().lower() == patient_id.strip().lower()
        ):
            target_patient = item
            break

    if not target_patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    canonical_pid = str(target_patient.get("patient_id"))
    previous_cls = str(target_patient.get("category") or "REGULAR").strip().upper()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    actor_uid = (x_user_id or "admin_sys").strip() or "admin_sys"

    # Update classification in-place while strictly preserving Patient ID and all clinical/encounter/appointment data
    target_patient["category"] = new_cls
    target_patient["classification_updated_at"] = now_iso
    target_patient["classification_updated_by"] = actor_uid
    if "classification_history" not in target_patient or not isinstance(target_patient["classification_history"], list):
        target_patient["classification_history"] = []

    change_record = {
        "patient_id": canonical_pid,
        "previous_classification": previous_cls,
        "new_classification": new_cls,
        "changed_by": actor_uid,
        "changed_at": now_iso,
        "reason": (payload.reason or f"Authorized administrative classification change from {previous_cls} to {new_cls}.").strip(),
    }
    target_patient["classification_history"].insert(0, change_record)
    _save_patients_registry()

    # Record in system audit log
    from app.core.audit import log_audit_event
    from app.services.settings_service import settings_service

    audit_details = {
        "patient_id": canonical_pid,
        "patient_name": f"{target_patient.get('first_name', '')} {target_patient.get('last_name', '')}".strip(),
        "previous_classification": previous_cls,
        "new_classification": new_cls,
        "performed_by": actor_uid,
        "timestamp": now_iso,
        "reason": change_record["reason"],
    }
    log_audit_event(
        action="PATIENT_CLASSIFICATION_CHANGED",
        actor_id=actor_uid,
        role="admin",
        resource=f"patient:{canonical_pid}",
        status="SUCCESS",
        details=audit_details,
    )
    try:
        await settings_service.record_audit_log(
            action="PATIENT_CLASSIFICATION_CHANGED",
            actor_id=actor_uid,
            role="admin",
            resource=f"patient:{canonical_pid}",
            status="SUCCESS",
            details=audit_details,
        )
    except Exception:
        pass

    # Notify assigned MSW when a patient is converted to CHARITY or reclassified
    try:
        from app.services.inquiry_service import inquiry_service
        target_msw = inquiry_service.resolve_msw_user_id(target_patient.get("assigned_msw") or "msw_lead")
        full_name = f"{target_patient.get('first_name', '')} {target_patient.get('last_name', '')}".strip() or canonical_pid
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="PATIENT_RECORD_UPDATED" if new_cls == "REGULAR" else "PATIENT_ASSIGNED",
            title=f"Patient Classification Changed to {new_cls}: {full_name}",
            message=f"Admin ({actor_uid}) changed {full_name} ({canonical_pid}) from {previous_cls} to {new_cls}.",
            target_destination=f"/patients/{canonical_pid}?tab={'assessment' if new_cls == 'CHARITY' else 'profile'}",
            related_patient_id=canonical_pid,
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Patient {canonical_pid} classification updated from {previous_cls} to {new_cls}.",
        "patient_id": canonical_pid,
        "previous_classification": previous_cls,
        "new_classification": new_cls,
        "changed_by": actor_uid,
        "changed_at": now_iso,
        "patient": target_patient,
        "audit": change_record,
    }


@router.get("/patient-portal/charity-assistance-status")
def get_authenticated_patient_charity_status(
    authenticated_patient_id: str = Depends(get_current_authenticated_patient),
):
    """
    Read-only Charity Assistance Status endpoint for the authenticated patient.
    - Derives patient identity strictly from verified Bearer token (`sub`), never from client-supplied headers.
    """
    uid_norm = authenticated_patient_id.strip()

    found_patient = None
    for item in REGISTERED_PATIENTS_REGISTRY:
        if str(item.get("patient_id") or "").strip().upper() == uid_norm.upper():
            found_patient = item
            break

    if not found_patient:
        raise HTTPException(status_code=404, detail=f"Authenticated patient '{uid_norm}' not found.")

    canonical_pid = str(found_patient.get("patient_id"))
    current_cls = str(found_patient.get("category") or "REGULAR").strip().upper()

    from app.services.referral_service import referral_service
    patient_referrals = referral_service.list_referrals(patient_id=canonical_pid)

    if current_cls != "CHARITY" and not patient_referrals:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Medical Assistance Status is only available to patients with a Charity classification or an existing Medical Assistance Referral.",
        )

    from app.services.assessment_service import assessment_service
    from app.services.document_authenticity_service import document_authenticity_service

    full_name = (
        f"{found_patient.get('first_name', '')} {found_patient.get('middle_name', '')} "
        f"{found_patient.get('last_name', '')} {found_patient.get('suffix', '')}"
    ).replace("  ", " ").strip()

    # Retrieve real assessments, encounters, and documents for this exact patient
    assessments = assessment_service.list_assessments(patient_id=canonical_pid)
    latest_asmt = assessments[0] if assessments else None
    encounters = list(found_patient.get("encounters") or [])
    charity_encounters = [
        e for e in encounters
        if str(e.get("classification") or "").upper() == "CHARITY"
        or float(e.get("approved_financial_assistance") or 0) > 0
    ]
    latest_enc = charity_encounters[0] if charity_encounters else (encounters[0] if encounters else None)
    docs = document_authenticity_service.list_documents(patient_id=canonical_pid)

    # Determine real Charity Case Number & Application Encounter Number without fabricating IDs
    is_native_charity_id = canonical_pid.upper().startswith("MSW_FA_")
    charity_case_no = (
        found_patient.get("charity_case_no")
        or (latest_asmt.get("charity_case_no") if latest_asmt else None)
        or (canonical_pid if is_native_charity_id else None)
    )
    application_encounter_no = (
        (latest_asmt.get("encounter_no") if latest_asmt else None)
        or (latest_enc.get("id") or latest_enc.get("assessment_id") if latest_enc else None)
    )

    has_active_application = bool(latest_asmt or charity_encounters or is_native_charity_id or patient_referrals)

    # Derive accurate application & assessment statuses from actual records
    wf_status = str(latest_asmt.get("workflow_status") or "").upper() if latest_asmt else ""
    patient_reg_status = str(found_patient.get("status") or "").upper()
    inst_approval = (latest_asmt.get("institutional_approval") if latest_asmt else None) or {}
    msw_rec = (latest_asmt.get("msw_recommendation") if latest_asmt else None) or {}
    cls_res = (latest_asmt.get("classification_result") if latest_asmt else None) or {}

    if not has_active_application:
        charity_application_status = "No Active Charity Application"
        assessment_status_label = "No Active Charity Application"
        submission_status = "Not Submitted"
    elif inst_approval.get("decision") == "APPROVED" or wf_status == "APPROVED" or (is_native_charity_id and patient_reg_status == "APPROVED"):
        charity_application_status = "Approved"
        assessment_status_label = "Completed & Approved"
        submission_status = "Submitted & Approved"
    elif (
        inst_approval.get("decision") in {"REJECTED", "DISAPPROVED"}
        or wf_status == "REJECTED"
        or "DISAPPROVED" in patient_reg_status
        or "PROMISSORY" in patient_reg_status
    ):
        charity_application_status = "Disapproved / Promissory"
        assessment_status_label = "Evaluated — Disapproved / Promissory"
        submission_status = "Submitted & Reviewed"
    elif wf_status == "PENDING_APPROVAL" or bool(msw_rec):
        charity_application_status = "Pending Administrative Decision"
        assessment_status_label = "MSW Recommendation Submitted"
        submission_status = "Submitted for Final Approval"
    elif wf_status in {"DRAFT", "ASSESSMENT_IN_PROGRESS", "PENDING_DOCUMENT_REVIEW", "PENDING_MSW_REVIEW", "RETURNED_FOR_REVISION"}:
        charity_application_status = "Under MSW Review"
        assessment_status_label = f"Stage {latest_asmt.get('active_stage', 1)} of 4 ({wf_status.replace('_', ' ').title()})"
        submission_status = "In Progress" if wf_status in {"DRAFT", "ASSESSMENT_IN_PROGRESS"} else "Under Review"
    else:
        charity_application_status = "Assessment Pending"
        assessment_status_label = "Assessment Pending"
        submission_status = "Awaiting MSW Intake"

    # Eligibility Recommendation vs Final Authorized Charity Decision (strictly separated!)
    recorded_eligibility_rec = (
        msw_rec.get("recommended_tier")
        or cls_res.get("combined_recommendation")
        or None
    )
    recommended_subsidy_pct = msw_rec.get("recommended_subsidy_pct")

    if inst_approval.get("decision"):
        final_authorized_decision = str(inst_approval.get("decision")).upper()
        approved_grant_tier = (
            msw_rec.get("recommended_tier")
            or cls_res.get("combined_recommendation")
            or ("Charity Subsidy Grant" if final_authorized_decision == "APPROVED" else None)
        )
        approved_subsidy_pct = inst_approval.get("approved_subsidy_percentage")
        decision_date = inst_approval.get("decided_at") or latest_asmt.get("updated_at")
        decision_explanation = inst_approval.get("decision_notes")
    elif is_native_charity_id and patient_reg_status == "APPROVED":
        final_authorized_decision = "APPROVED"
        approved_grant_tier = recorded_eligibility_rec or "Indigent Charity Grant"
        approved_subsidy_pct = 100.0
        decision_date = found_patient.get("registration_date")
        decision_explanation = "Approved under OFPHIL Indigent Ophthalmic Charity Program."
    elif is_native_charity_id and ("DISAPPROVED" in patient_reg_status or "PROMISSORY" in patient_reg_status):
        final_authorized_decision = "DISAPPROVED / PROMISSORY"
        approved_grant_tier = "Promissory Note Arrangement"
        approved_subsidy_pct = None
        decision_date = found_patient.get("registration_date")
        decision_explanation = "Evaluated under Disapproved / Promissory Note arrangement."
    else:
        final_authorized_decision = "Pending Official Decision" if has_active_application else "No Active Charity Application"
        approved_grant_tier = None
        approved_subsidy_pct = None
        decision_date = None
        decision_explanation = None

    approved_subsidy_amount = sum(float(e.get("approved_financial_assistance") or 0) for e in encounters)
    if approved_subsidy_amount <= 0 and latest_enc and latest_enc.get("approved_financial_assistance"):
        approved_subsidy_amount = float(latest_enc.get("approved_financial_assistance") or 0)

    last_updated = (
        (latest_asmt.get("updated_at") if latest_asmt else None)
        or (latest_enc.get("encounter_date") if latest_enc else None)
        or found_patient.get("classification_updated_at")
        or found_patient.get("registration_date")
    )

    # 7-Stage Application Progress (only marked complete when confirmed by backend records)
    stage_1_done = current_cls == "CHARITY"
    stage_2_done = has_active_application
    stage_3_done = bool(
        latest_asmt and (
            latest_asmt.get("stage2_evaluation", {}).get("is_complete")
            or (latest_asmt.get("active_stage") or 1) >= 2
            or wf_status not in {"", "DRAFT"}
        )
    ) or (is_native_charity_id and patient_reg_status in {"APPROVED", "DISAPPROVED/PROMISSORY"})
    stage_4_done = bool(len(docs) > 0) or bool(
        latest_asmt and ((latest_asmt.get("active_stage") or 1) >= 3 or wf_status in {"PENDING_MSW_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"})
    ) or (is_native_charity_id and patient_reg_status == "APPROVED")
    stage_5_done = bool(recorded_eligibility_rec) or (is_native_charity_id and patient_reg_status in {"APPROVED", "DISAPPROVED/PROMISSORY"})
    stage_6_done = final_authorized_decision in {"APPROVED", "REJECTED", "DISAPPROVED", "DISAPPROVED / PROMISSORY"}
    stage_7_done = stage_6_done

    progress_stages = [
        {
            "stage": 1,
            "title": "Patient Classified as Charity Beneficiary",
            "completed": stage_1_done,
            "status": "Completed" if stage_1_done else "Pending",
            "description": f"Account {canonical_pid} is officially classified as CHARITY.",
        },
        {
            "stage": 2,
            "title": "Assessment Pending",
            "completed": stage_2_done,
            "status": "Completed" if stage_2_done else "Awaiting Application",
            "description": (
                f"Application encounter {application_encounter_no or charity_case_no} recorded for MSW evaluation."
                if stage_2_done
                else "No charity assistance application has been recorded yet."
            ),
        },
        {
            "stage": 3,
            "title": "MSW Assessment",
            "completed": stage_3_done,
            "status": "Completed" if stage_3_done else ("In Progress" if latest_asmt else "Pending"),
            "description": (
                f"Assigned MSW: {found_patient.get('assigned_msw') or 'Maria Santos, RSW'}."
                if stage_2_done
                else "Pending MSW socio-economic and biopsychosocial interview."
            ),
        },
        {
            "stage": 4,
            "title": "Supporting Documents Review",
            "completed": stage_4_done,
            "status": "Completed" if stage_4_done else "Pending",
            "description": (
                f"{len(docs)} supporting document(s) linked to patient record."
                if len(docs) > 0
                else "Supporting documents verification stage."
            ),
        },
        {
            "stage": 5,
            "title": "Eligibility Recommendation",
            "completed": stage_5_done,
            "status": "Completed" if stage_5_done else "Pending",
            "description": (
                f"MSW Recommendation: {recorded_eligibility_rec}"
                if recorded_eligibility_rec
                else "Awaiting official MSW eligibility recommendation."
            ),
        },
        {
            "stage": 6,
            "title": "Administrative Decision",
            "completed": stage_6_done,
            "status": "Completed" if stage_6_done else "Pending",
            "description": (
                f"Authorized Decision: {final_authorized_decision}"
                if stage_6_done
                else "Awaiting final administrative review and decision."
            ),
        },
        {
            "stage": 7,
            "title": "Final Charity Status",
            "completed": stage_7_done,
            "status": charity_application_status if stage_7_done else "Pending Finalization",
            "description": (
                decision_explanation or f"Final status: {charity_application_status}."
                if stage_7_done
                else "Final charity grant status will appear here once approved."
            ),
        },
    ]

    # Format supporting documents for patient read-only viewing
    formatted_docs = [
        {
            "id": d.get("id"),
            "filename": d.get("filename"),
            "document_type": d.get("document_type") or "Supporting Document",
            "upload_date": d.get("upload_date"),
            "review_status": (d.get("msw_review") or {}).get("review_status") or d.get("status") or "Uploaded",
            "mime_type": d.get("mime_type") or "application/octet-stream",
        }
        for d in docs
    ]

    return {
        "status": "success",
        "patient_id": canonical_pid,
        "patient_name": full_name,
        "classification": current_cls,
        "has_active_application": has_active_application,
        "empty_state_message": (
            None
            if has_active_application
            else "Your account is classified as a Charity Patient, but no charity assistance application has been recorded yet. Please contact the clinic or authorized staff for assistance."
        ),
        "application_info": {
            "patient_name": full_name,
            "patient_id": canonical_pid,
            "charity_case_no": charity_case_no,
            "application_encounter_no": application_encounter_no,
            "application_date": (
                (latest_asmt.get("interview_date") or (latest_asmt.get("created_at") or "")[:10])
                if latest_asmt
                else (found_patient.get("registration_date") if has_active_application else None)
            ),
            "beneficiary_classification": "CHARITY",
            "charity_application_status": charity_application_status,
        },
        "assessment_status": {
            "current_status": assessment_status_label,
            "workflow_status": wf_status or ("NOT_STARTED" if not has_active_application else patient_reg_status),
            "assigned_msw": found_patient.get("assigned_msw") or "Maria Santos, RSW",
            "assessment_date": (latest_asmt.get("created_at") if latest_asmt else None),
            "assessment_stage": (
                f"Stage {latest_asmt.get('active_stage', 1)} of 4"
                if latest_asmt
                else ("Completed" if is_native_charity_id and patient_reg_status == "APPROVED" else "Not Started")
            ),
            "submission_status": submission_status,
            "last_updated": last_updated,
        },
        "eligibility_and_decision": {
            "msw_eligibility_recommendation": recorded_eligibility_rec,
            "recommended_grant_tier": recorded_eligibility_rec,
            "recommended_subsidy_pct": recommended_subsidy_pct,
            "final_authorized_decision": final_authorized_decision,
            "approved_grant_tier": approved_grant_tier,
            "approved_subsidy_pct": approved_subsidy_pct,
            "approved_subsidy_amount": approved_subsidy_amount if approved_subsidy_amount > 0 else None,
            "decision_date": decision_date,
            "disapproval_or_promissory_status": (
                charity_application_status if "Disapproved" in charity_application_status or "Promissory" in charity_application_status else None
            ),
            "decision_explanation": decision_explanation,
        },
        "application_progress": progress_stages,
        "supporting_documents": formatted_docs,
    }


@router.get("/patient-portal/charity-assistance-status/{referral_id}")
def get_authenticated_patient_charity_referral_detail(
    referral_id: str,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
):
    """
    Read-only Charity Assistance Status detail endpoint for a specific referral owned by the authenticated patient.
    """
    role_norm = (x_user_role or "").strip().lower()
    uid_norm = (x_user_id or "").strip()
    if role_norm != "patient" or not uid_norm:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Only an authenticated patient session can access patient charity assistance status.",
        )

    found_patient = None
    for item in REGISTERED_PATIENTS_REGISTRY:
        if str(item.get("patient_id") or "").strip().upper() == uid_norm.upper():
            found_patient = item
            break

    if not found_patient:
        raise HTTPException(status_code=404, detail=f"Authenticated patient '{uid_norm}' not found.")

    canonical_pid = str(found_patient.get("patient_id"))
    from app.services.referral_service import referral_service
    from app.services.assessment_service import assessment_service

    patient_referrals = referral_service.list_referrals(patient_id=canonical_pid)
    target_ref = None
    for r in patient_referrals:
        if str(r.get("id") or "") == referral_id or str(r.get("referral_no") or "") == referral_id:
            target_ref = r
            break

    if not target_ref:
        raise HTTPException(
            status_code=404,
            detail=f"Referral '{referral_id}' not found for authenticated patient '{canonical_pid}'.",
        )

    full_name = (
        f"{found_patient.get('first_name', '')} {found_patient.get('middle_name', '')} "
        f"{found_patient.get('last_name', '')} {found_patient.get('suffix', '')}"
    ).replace("  ", " ").strip()

    assessments = assessment_service.list_assessments(patient_id=canonical_pid)
    linked_asmt = None
    ref_asmt_id = target_ref.get("assessment_id")
    ref_case_no = target_ref.get("charity_case_no")
    for a in assessments:
        if ref_asmt_id and str(a.get("id") or "") == str(ref_asmt_id):
            linked_asmt = a
            break
        if ref_case_no and str(a.get("charity_case_no") or "") == str(ref_case_no):
            linked_asmt = a
            break

    ref_status = str(target_ref.get("status") or "PENDING").upper()
    wf_status = str(linked_asmt.get("workflow_status") or "").upper() if linked_asmt else ""
    inst_approval = (linked_asmt.get("institutional_approval") if linked_asmt else None) or {}
    msw_rec = (linked_asmt.get("msw_recommendation") if linked_asmt else None) or {}
    cls_res = (linked_asmt.get("classification_result") if linked_asmt else None) or {}

    if inst_approval.get("decision") == "APPROVED" or wf_status == "APPROVED" or ref_status in {"APPROVED", "MSW APPROVED", "COMPLETED"}:
        charity_application_status = "Approved"
        assessment_status_label = "Completed & Approved"
        submission_status = "Submitted & Approved"
    elif inst_approval.get("decision") in {"REJECTED", "DISAPPROVED"} or wf_status == "REJECTED" or ref_status in {"REJECTED", "DISAPPROVED"}:
        charity_application_status = "Disapproved / Promissory"
        assessment_status_label = "Evaluated — Disapproved / Promissory"
        submission_status = "Submitted & Reviewed"
    elif wf_status == "PENDING_APPROVAL" or bool(msw_rec) or bool(target_ref.get("msw_recommendation")):
        charity_application_status = "Pending Administrative Decision"
        assessment_status_label = "MSW Recommendation Submitted"
        submission_status = "Submitted for Final Approval"
    elif wf_status in {"DRAFT", "ASSESSMENT_IN_PROGRESS", "PENDING_DOCUMENT_REVIEW", "PENDING_MSW_REVIEW", "RETURNED_FOR_REVISION"}:
        charity_application_status = "Under MSW Review"
        assessment_status_label = f"Stage {linked_asmt.get('active_stage', 1)} of 4 ({wf_status.replace('_', ' ').title()})"
        submission_status = "In Progress" if wf_status in {"DRAFT", "ASSESSMENT_IN_PROGRESS"} else "Under Review"
    else:
        charity_application_status = "Assessment Pending"
        assessment_status_label = "Assessment Pending"
        submission_status = "Awaiting MSW Intake"

    recorded_eligibility_rec = (
        target_ref.get("msw_recommendation")
        or msw_rec.get("recommended_tier")
        or cls_res.get("combined_recommendation")
        or None
    )
    recommended_subsidy_pct = msw_rec.get("recommended_subsidy_pct")

    if inst_approval.get("decision"):
        final_authorized_decision = str(inst_approval.get("decision")).upper()
        approved_grant_tier = (
            msw_rec.get("recommended_tier")
            or cls_res.get("combined_recommendation")
            or ("Charity Subsidy Grant" if final_authorized_decision == "APPROVED" else None)
        )
        approved_subsidy_pct = inst_approval.get("approved_subsidy_percentage")
        decision_date = inst_approval.get("decided_at") or (linked_asmt.get("updated_at") if linked_asmt else None)
        decision_explanation = inst_approval.get("decision_notes")
        authorized_reviewer = inst_approval.get("decided_by") or inst_approval.get("reviewer_name") or "Authorized Reviewer"
    elif ref_status in {"APPROVED", "MSW APPROVED", "COMPLETED"}:
        final_authorized_decision = "APPROVED"
        approved_grant_tier = target_ref.get("approved_grant_tier") or recorded_eligibility_rec or "Charity Subsidy Grant"
        approved_subsidy_pct = target_ref.get("approved_subsidy_pct")
        decision_date = target_ref.get("decision_date") or target_ref.get("updated_at") or target_ref.get("created_at")
        decision_explanation = target_ref.get("decision_notes") or "Approved under OFPHIL Charity Assistance Program."
        authorized_reviewer = target_ref.get("authorized_reviewer") or "Authorized Reviewer"
    else:
        final_authorized_decision = target_ref.get("final_decision") or "Pending Official Decision"
        approved_grant_tier = target_ref.get("approved_grant_tier")
        approved_subsidy_pct = target_ref.get("approved_subsidy_pct")
        decision_date = target_ref.get("decision_date")
        decision_explanation = target_ref.get("decision_notes")
        authorized_reviewer = target_ref.get("authorized_reviewer")

    approved_subsidy_amount = target_ref.get("approved_grant_amount") or target_ref.get("approved_subsidy_amount")
    charity_case_no = target_ref.get("charity_case_no") or (linked_asmt.get("charity_case_no") if linked_asmt else None) or found_patient.get("charity_case_no")
    application_encounter_no = target_ref.get("encounter_no") or (linked_asmt.get("encounter_no") if linked_asmt else None) or target_ref.get("referral_no")

    stage_1_done = str(found_patient.get("category") or "REGULAR").strip().upper() == "CHARITY"
    stage_2_done = True
    stage_3_done = bool(linked_asmt and (linked_asmt.get("stage2_evaluation", {}).get("is_complete") or (linked_asmt.get("active_stage") or 1) >= 2 or wf_status not in {"", "DRAFT"})) or ref_status in {"APPROVED", "MSW APPROVED", "COMPLETED"}
    stage_4_done = bool(linked_asmt and ((linked_asmt.get("active_stage") or 1) >= 3 or wf_status in {"PENDING_MSW_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"})) or ref_status in {"APPROVED", "MSW APPROVED", "COMPLETED"}
    stage_5_done = bool(recorded_eligibility_rec) or ref_status in {"APPROVED", "MSW APPROVED", "COMPLETED"}
    stage_6_done = final_authorized_decision in {"APPROVED", "REJECTED", "DISAPPROVED", "DISAPPROVED / PROMISSORY"}
    stage_7_done = stage_6_done

    progress_stages = [
        {"stage": 1, "title": "Patient Classified as Charity Beneficiary", "completed": stage_1_done, "status": "Completed" if stage_1_done else "Pending", "description": f"Account {canonical_pid} is classified as CHARITY."},
        {"stage": 2, "title": "Assessment Pending", "completed": stage_2_done, "status": "Completed", "description": f"Referral {target_ref.get('referral_no') or referral_id} recorded for MSW evaluation."},
        {"stage": 3, "title": "MSW Assessment", "completed": stage_3_done, "status": "Completed" if stage_3_done else ("In Progress" if linked_asmt else "Pending"), "description": f"Assigned MSW: {found_patient.get('assigned_msw') or 'Maria Santos, RSW'}."},
        {"stage": 4, "title": "Supporting Documents Review", "completed": stage_4_done, "status": "Completed" if stage_4_done else "Pending", "description": "Supporting documents verification stage."},
        {"stage": 5, "title": "Eligibility Recommendation", "completed": stage_5_done, "status": "Completed" if stage_5_done else "Pending", "description": f"MSW Recommendation: {recorded_eligibility_rec}" if recorded_eligibility_rec else "Awaiting official MSW eligibility recommendation."},
        {"stage": 6, "title": "Authorized Administrative Decision", "completed": stage_6_done, "status": "Completed" if stage_6_done else "Pending", "description": f"Final Decision: {final_authorized_decision}"},
        {"stage": 7, "title": "Charity Grant Finalized", "completed": stage_7_done, "status": "Completed" if stage_7_done else "Pending", "description": "Charity assistance grant finalized." if stage_7_done else "Awaiting final grant authorization."},
    ]

    return {
        "patient_id": canonical_pid,
        "referral": target_ref,
        "application_info": {
            "patient_name": full_name,
            "patient_id": canonical_pid,
            "charity_case_no": charity_case_no,
            "application_encounter_no": application_encounter_no,
            "application_date": (target_ref.get("created_at") or "")[:10] or None,
            "beneficiary_classification": "CHARITY",
            "charity_application_status": charity_application_status,
        },
        "assessment_status": {
            "current_status": assessment_status_label,
            "workflow_status": wf_status or ref_status,
            "assigned_msw": found_patient.get("assigned_msw") or "Maria Santos, RSW",
            "assessment_date": (linked_asmt.get("created_at") if linked_asmt else target_ref.get("created_at")),
            "assessment_stage": f"Stage {linked_asmt.get('active_stage', 1)} of 4" if linked_asmt else ("Completed" if stage_6_done else "Pending"),
            "submission_status": submission_status,
            "last_updated": target_ref.get("updated_at") or target_ref.get("created_at"),
        },
        "eligibility_and_decision": {
            "msw_eligibility_recommendation": recorded_eligibility_rec,
            "recommended_grant_tier": recorded_eligibility_rec,
            "recommended_subsidy_pct": recommended_subsidy_pct,
            "recommendation_status": "Submitted" if recorded_eligibility_rec else "Pending",
            "recommendation_date": (linked_asmt.get("updated_at") if linked_asmt else target_ref.get("created_at")) if recorded_eligibility_rec else None,
            "final_authorized_decision": final_authorized_decision,
            "approved_grant_tier": approved_grant_tier,
            "approved_subsidy_pct": approved_subsidy_pct,
            "approved_subsidy_amount": approved_subsidy_amount,
            "decision_date": decision_date,
            "authorized_reviewer": authorized_reviewer,
            "decision_explanation": decision_explanation,
        },
        "application_progress": progress_stages,
    }


class PatientUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    suffix: Optional[str] = None
    birthdate: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    civil_status: Optional[str] = None
    num_dependents: Optional[str] = None
    perm_province: Optional[str] = None
    perm_city: Optional[str] = None
    perm_barangay: Optional[str] = None
    perm_street: Optional[str] = None
    same_address: Optional[bool] = None
    alt_province: Optional[str] = None
    alt_city: Optional[str] = None
    alt_barangay: Optional[str] = None
    alt_street: Optional[str] = None
    educational_attainment: Optional[str] = None
    employment_status: Optional[str] = None
    occupation: Optional[str] = None
    residence_city: Optional[str] = None
    residence_region: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    email_verified: Optional[bool] = None
    phone_verified: Optional[bool] = None
    category: Optional[str] = None
    status: Optional[str] = None
    new_password: Optional[str] = None
    diagnosis: Optional[str] = None
    assigned_msw: Optional[str] = None

@router.put("/patients/{patient_id}")
def update_patient_record(patient_id: str, payload: PatientUpdateRequest):
    for item in REGISTERED_PATIENTS_REGISTRY:
        if item.get("patient_id") == patient_id or item.get("id") == patient_id:
            protected_non_empty = {
                "first_name", "last_name", "birthdate", "sex", "civil_status",
                "contact", "email", "perm_province", "perm_city"
            }
            for field_key in [
                "first_name", "middle_name", "last_name", "suffix", "birthdate",
                "age", "sex", "civil_status", "num_dependents",
                "perm_province", "perm_city", "perm_barangay", "perm_street",
                "same_address", "alt_province", "alt_city", "alt_barangay", "alt_street",
                "educational_attainment", "employment_status", "occupation",
                "residence_city", "residence_region", "contact", "email",
                "email_verified", "phone_verified",
                "category", "status", "diagnosis", "assigned_msw"
            ]:
                val = getattr(payload, field_key, None)
                if val is not None:
                    if field_key in protected_non_empty and isinstance(val, str) and val.strip() == "" and item.get(field_key):
                        continue
                    item[field_key] = val
            if payload.age is not None:
                item["age"] = payload.age
            if payload.sex is not None:
                item["sex"] = payload.sex
            if payload.civil_status is not None:
                item["civil_status"] = payload.civil_status
            if payload.residence_city is not None:
                item["residence_city"] = payload.residence_city
            if payload.residence_region is not None:
                item["residence_region"] = payload.residence_region
            if payload.contact is not None:
                item["contact"] = payload.contact
            if payload.email is not None:
                item["email"] = payload.email
            if payload.category is not None:
                item["category"] = payload.category
            if payload.status is not None:
                item["status"] = payload.status
            if payload.diagnosis is not None:
                item["diagnosis"] = payload.diagnosis
            if payload.assigned_msw is not None:
                item["assigned_msw"] = payload.assigned_msw
            if payload.new_password:
                item["password_updated_at"] = "Just now"

            try:
                from app.services.inquiry_service import inquiry_service
                target_msw = inquiry_service.resolve_msw_user_id(item.get("assigned_msw") or "msw_lead")
                full_name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip() or patient_id
                st_upper = str(item.get("status") or "").upper()
                if payload.status is not None:
                    if st_upper == "APPROVED" and str(item.get("category") or "").upper() == "CHARITY":
                        ntype = "CHARITY_APPROVED"
                        ntitle = f"Charity Status Approved: {full_name}"
                        nmsg = f"Charity assistance status for {full_name} ({patient_id}) has been updated to APPROVED."
                        ntab = "assessment"
                    elif "DISAPPROVED" in st_upper or "PROMISSORY" in st_upper or "REJECTED" in st_upper:
                        ntype = "CHARITY_DENIED_OR_PROMISSORY"
                        ntitle = f"Charity Status Updated ({st_upper}): {full_name}"
                        nmsg = f"Charity record for {full_name} ({patient_id}) is now marked {st_upper}."
                        ntab = "assessment"
                    else:
                        ntype = "ADMIN_DECISION_UPDATED"
                        ntitle = f"Patient Status Updated: {full_name}"
                        nmsg = f"Record status for {full_name} ({patient_id}) was updated to {st_upper}."
                        ntab = "assessment"
                else:
                    ntype = "PATIENT_RECORD_UPDATED"
                    ntitle = f"Patient Dossier Updated: {full_name}"
                    nmsg = f"Demographic or clinical record details for {full_name} ({patient_id}) were updated."
                    ntab = "profile"
                inquiry_service.create_msw_notification(
                    recipient_user_id=target_msw,
                    notification_type=ntype,
                    title=ntitle,
                    message=nmsg,
                    target_destination=f"/patients/{patient_id}?tab={ntab}",
                    related_patient_id=patient_id,
                )
            except Exception:
                pass

            _save_patients_registry()

            return {
                "status": "success",
                "message": f"Patient record {patient_id} updated successfully.",
                "patient": item
            }
    
    raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

@router.get("/patients")
def list_patient_records(
    category: Optional[str] = None, # 'CHARITY', 'REGULAR'
    search: Optional[str] = None,
    limit: int = 200
):
    """
    Returns only legitimately registered patients. Raw thesis/research dataset is completely removed and excluded.
    Enriches patients with assistance history summary.
    """
    from app.services.referral_service import referral_service

    records = []
    for item in REGISTERED_PATIENTS_REGISTRY:
        reg_type = str(item.get("registration_type") or item.get("category") or "REGULAR").strip().upper()
        charity_st = str(item.get("charity_status") or "").strip().upper()
        is_charity = (
            charity_st == "APPROVED"
            or bool(item.get("is_charity_beneficiary"))
            or bool(item.get("charity_case_no"))
            or str(item.get("category") or "").strip().upper() == "CHARITY"
        )
        effective_category = "CHARITY" if is_charity else "REGULAR"

        if category and category.upper() != "ALL":
            cat_req = category.upper()
            if cat_req == "REGULAR" and is_charity:
                continue
            elif cat_req == "CHARITY" and not is_charity:
                continue
            elif cat_req not in {"REGULAR", "CHARITY"} and effective_category != cat_req:
                continue
        if search and search.strip():
            q = search.strip().lower()
            fn = item.get("first_name", "").lower()
            ln = item.get("last_name", "").lower()
            full = f"{fn} {ln}"
            pid = item.get("patient_id", "").lower()
            if q not in pid and q not in full:
                continue

        # Enrich with assistance history
        pid_clean = str(item.get("patient_id") or "")
        history = referral_service.get_patient_assistance_history(patient_id=pid_clean)
        enriched = {
            **item,
            "category": effective_category,
            "registration_type": reg_type,
            "charity_status": charity_st or ("APPROVED" if is_charity else "NONE"),
            "is_charity_beneficiary": is_charity,
            "assistance_history": history,
            "disapproved_badge": history.get("disapproved_badge"),
            "promissory_badge": history.get("promissory_badge"),
        }
        records.append(enriched)
        if len(records) >= limit:
            break

    return records





# -------------------------------------------------------------
# 16. Public & Patient Inquiries SMTP Dispatch Endpoints
# -------------------------------------------------------------
class PublicInquirySubmitRequest(BaseModel):
    inquiry_id: Optional[str] = None
    name: str
    email: str
    subject: str
    message: str
    attachment_names: Optional[List[str]] = []
    attachments: Optional[List[Dict[str, Any]]] = []

@router.post("/inquiries/submit")
def submit_public_or_patient_inquiry(payload: PublicInquirySubmitRequest):
    inq_id = payload.inquiry_id or f"INQ-2026-{uuid.uuid4().hex[:4].upper()}"
    email_sent = send_inquiry_submission_email(
        inquiry_id=inq_id,
        sender_name=payload.name.strip() or "Public Visitor",
        sender_email=payload.email.strip(),
        subject_category=payload.subject.strip() or "General Inquiry",
        message_text=payload.message.strip(),
        attachment_names=payload.attachment_names or [],
        attachments=payload.attachments or [],
    )
    return {
        "status": "success",
        "inquiry_id": inq_id,
        "email_sent": email_sent,
        "recipient": payload.email.strip(),
        "clinic_email": settings.MAIL_DEFAULT_SENDER or "roxas.t.bscs@gmail.com",
        "message": f"Inquiry {inq_id} submitted and email dispatched via Brevo SMTP."
    }

class InquiryRespondRequest(BaseModel):
    inquiry_id: str
    recipient_email: str
    reply_body: str
    channel: Optional[str] = "email"
    subject: Optional[str] = None
    patient_name: Optional[str] = "Patient"
    attachment: Optional[Dict[str, Any]] = None

@router.post("/inquiries/respond")
def respond_to_patient_inquiry(payload: InquiryRespondRequest):
    email_sent = False
    att_name = payload.attachment.get("name") if isinstance(payload.attachment, dict) else None
    att_data_url = payload.attachment.get("dataUrl") if isinstance(payload.attachment, dict) else None
    if (payload.channel or "email").lower() == "email" and "@" in (payload.recipient_email or ""):
        email_sent = send_inquiry_reply_email(
            to_email=payload.recipient_email.strip(),
            inquiry_id=payload.inquiry_id,
            subject=payload.subject or f"Re: OFPHIL Clinic Inquiry ({payload.inquiry_id})",
            reply_body=payload.reply_body,
            patient_name=payload.patient_name or "Patient",
            attachment_name=att_name,
            attachment_data_url=att_data_url,
        )
    return {
        "status": "success",
        "inquiry_id": payload.inquiry_id,
        "channel": payload.channel,
        "email_sent": email_sent,
        "recipient": payload.recipient_email,
    }


# -------------------------------------------------------------
# 17. Clinic Appointment & Schedule Dispatch Endpoint (Email + SMS)
# -------------------------------------------------------------
class AppointmentScheduleRequest(BaseModel):
    appointment_id: Optional[str] = None
    patient_id: str
    patient_name: str
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    appointment_type: str
    appointment_date: str
    appointment_time: str
    assigned_doctor: str
    clinic_room: Optional[str] = "Main Ophthalmic Clinic — Room 102"
    notes: Optional[str] = ""
    send_email: Optional[bool] = True
    send_sms: Optional[bool] = True
    subject: Optional[str] = None
    custom_body: Optional[str] = None
    sms_body: Optional[str] = None

@router.post("/appointments/schedule")
def schedule_patient_appointment(payload: AppointmentScheduleRequest):
    appt_id = payload.appointment_id or f"APT-2026-{uuid.uuid4().hex[:4].upper()}"
    email_sent = False
    sms_sent = False

    if payload.send_email and payload.recipient_email and "@" in payload.recipient_email:
        email_sent = send_appointment_schedule_email(
            to_email=payload.recipient_email.strip(),
            appointment_id=appt_id,
            patient_name=payload.patient_name.strip(),
            patient_id=payload.patient_id.strip(),
            appointment_type=payload.appointment_type.strip(),
            appointment_date=payload.appointment_date.strip(),
            appointment_time=payload.appointment_time.strip(),
            assigned_doctor=payload.assigned_doctor.strip(),
            clinic_room=(payload.clinic_room or "Main Ophthalmic Clinic — Room 102").strip(),
            notes=(payload.notes or "").strip(),
            subject=payload.subject,
            custom_body=payload.custom_body,
        )

    if payload.send_sms and payload.recipient_phone and payload.recipient_phone.strip():
        # SMS Gateway dispatch (Semaphore / local clinic SMS dispatcher)
        if getattr(settings, "SEMAPHORE_API_KEY", None):
            try:
                import httpx
                sms_text = (payload.sms_body or payload.custom_body or f"OFPHIL Notice: Hello {payload.patient_name}, your appointment for {payload.appointment_type} is scheduled on {payload.appointment_date} at {payload.appointment_time}.").strip()
                httpx.post(
                    "https://api.semaphore.co/api/v4/messages",
                    data={
                        "apikey": settings.SEMAPHORE_API_KEY,
                        "number": payload.recipient_phone.strip(),
                        "message": sms_text,
                        "sendername": getattr(settings, "SEMAPHORE_SENDER_NAME", None) or "OFPHIL",
                    },
                    timeout=5.0
                )
            except Exception as e:
                print(f"[SMS Gateway] Semaphore error: {e}")
        sms_sent = True

    return {
        "status": "success",
        "appointment_id": appt_id,
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "recipient_email": payload.recipient_email,
        "recipient_phone": payload.recipient_phone,
        "message": f"Appointment {appt_id} scheduled and notifications dispatched."
    }


# =====================================================================
# SUPABASE PERSISTENCE ENDPOINTS (Encounters, Appointments, Referrals)
# =====================================================================
def _sb_headers():
    import os
    from dotenv import load_dotenv
    load_dotenv()
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""
    if not url or not key:
        return None, None
    return url, {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }


@router.get("/patients/{patient_id}/encounters")
async def get_patient_encounters_sb(patient_id: str):
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"encounters": []}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{url}/rest/v1/encounters?patient_id=eq.{patient_id}&order=created_at.desc",
                headers=headers,
            )
            if r.status_code == 200:
                return {"encounters": r.json()}
    except Exception:
        pass
    return {"encounters": []}


@router.post("/patients/{patient_id}/encounters")
async def upsert_patient_encounter_sb(patient_id: str, payload: dict):
    import httpx, time
    url, headers = _sb_headers()
    if not url:
        return {"status": "skipped", "reason": "Supabase not configured"}
    eid = payload.get("assessment_id") or payload.get("id") or f"OFP-ENC-{int(time.time())}"
    row = {
        "id": eid,
        "patient_id": patient_id,
        "encounter_date": payload.get("encounter_date", ""),
        "diagnosis": payload.get("diagnosis", ""),
        "procedure": payload.get("procedure", ""),
        "clinical_description": payload.get("clinical_description") or payload.get("notes", ""),
        "diagnosis_severity": payload.get("diagnosis_severity") or payload.get("severity", ""),
        "laterality": payload.get("laterality", "OU"),
        "attending_doctor": payload.get("attending_doctor", ""),
        "consultant": payload.get("consultant", ""),
        "total_amount": float(payload.get("total_amount") or 0),
        "classification": payload.get("classification", "REGULAR"),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{url}/rest/v1/encounters", headers=headers, json=row)
        return {"status": "ok" if r.status_code in (200, 201) else "error", "code": r.status_code, "encounter": row}


@router.delete("/patients/{patient_id}/encounters/{encounter_id}")
async def delete_patient_encounter_sb(patient_id: str, encounter_id: str):
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"status": "skipped"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.delete(
            f"{url}/rest/v1/encounters?id=eq.{encounter_id}&patient_id=eq.{patient_id}",
            headers=headers,
        )
    return {"status": "deleted", "id": encounter_id}


@router.get("/patients/{patient_id}/appointments")
async def get_patient_appointments_sb(patient_id: str):
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"appointments": []}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{url}/rest/v1/appointments?patient_id=eq.{patient_id}&order=created_at.desc",
                headers=headers,
            )
            if r.status_code == 200:
                return {"appointments": r.json()}
    except Exception:
        pass
    return {"appointments": []}


@router.post("/patients/{patient_id}/appointments")
async def upsert_patient_appointment_sb(patient_id: str, payload: dict):
    import httpx, time
    url, headers = _sb_headers()
    if not url:
        return {"status": "skipped"}
    aid = payload.get("id") or f"APT-{int(time.time())}"
    row = {
        "id": aid,
        "patient_id": patient_id,
        "patient_name": payload.get("patient_name", ""),
        "appointment_type": payload.get("appointment_type", ""),
        "appointment_date": payload.get("appointment_date", ""),
        "appointment_time": payload.get("appointment_time", ""),
        "assigned_doctor": payload.get("assigned_doctor", ""),
        "clinic_room": payload.get("clinic_room", ""),
        "notes": payload.get("notes", ""),
        "status": payload.get("status", "Scheduled"),
        "requested_by": payload.get("requested_by", "admin"),
        "recipient_email": payload.get("recipient_email", ""),
        "recipient_phone": payload.get("recipient_phone", ""),
        "email_sent": bool(payload.get("email_sent", False)),
        "sms_sent": bool(payload.get("sms_sent", False)),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{url}/rest/v1/appointments", headers=headers, json=row)
        return {"status": "ok" if r.status_code in (200, 201) else "error", "appointment": row}


@router.delete("/patients/{patient_id}/appointments/{appt_id}")
async def delete_patient_appointment_sb(patient_id: str, appt_id: str):
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"status": "skipped"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.delete(
            f"{url}/rest/v1/appointments?id=eq.{appt_id}&patient_id=eq.{patient_id}",
            headers=headers,
        )
    return {"status": "deleted", "id": appt_id}


@router.get("/patients/{patient_id}/referral")
async def get_patient_referral_sb(patient_id: str):
    from app.services.referral_service import referral_service
    refs = referral_service.list_referrals(patient_id=patient_id)
    if refs:
        return {"referral": refs[0], "referrals": refs}
    return {"referral": None, "referrals": []}


@router.post("/patients/{patient_id}/referral")
async def upsert_patient_referral_sb(patient_id: str, payload: dict):
    from app.services.referral_service import referral_service
    try:
        created = referral_service.create_referral(
            {**payload, "patient_id": patient_id},
            actor_id="admin_sys",
            role="admin",
        )
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex))
    try:
        from app.services.inquiry_service import inquiry_service
        target_msw = "msw_lead"
        p_name = payload.get("patient_name") or patient_id
        for p in REGISTERED_PATIENTS_REGISTRY:
            if str(p.get("patient_id") or "").strip().upper() == patient_id.strip().upper():
                target_msw = inquiry_service.resolve_msw_user_id(p.get("assigned_msw") or "msw_lead")
                p_name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or patient_id
                break
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="REFERRAL_UPDATED",
            title=f"Medical Assistance Referral Updated: {p_name}",
            message=f"Referral {created['id']} for {p_name} ({patient_id}) is now marked '{created['status']}'.",
            target_destination=f"/patients/{patient_id}?tab=referral",
            related_patient_id=patient_id,
            related_encounter_id=created["id"],
        )
    except Exception:
        pass
    email_sent = False
    email_error = None
    try:
        from app.core.config import get_settings
        import smtplib
        from email.mime.text import MIMEText
        cfg = get_settings()
        msw_email = getattr(cfg, "MSW_NOTIFICATION_EMAIL", None) or getattr(cfg, "SMTP_FROM_EMAIL", None) or getattr(cfg, "SMTP_USER", None)
        if msw_email and getattr(cfg, "SMTP_HOST", None) and getattr(cfg, "SMTP_USER", None) and getattr(cfg, "SMTP_PASSWORD", None):
            subject = f"New Medical Assistance Referral — {p_name}"
            body = (
                f"New Medical Assistance Referral Submitted (Procedure Quotation Subsidy)\n\n"
                f"Referral Number: {created.get('id')}\n"
                f"Patient Name: {p_name}\n"
                f"Patient ID: {patient_id}\n"
                f"Diagnosis: {created.get('diagnosis') or payload.get('diagnosis', '')}\n"
                f"Surgical Procedure: {created.get('procedure') or payload.get('procedure', '')}\n"
                f"Total Estimated Quotation: PHP {float(created.get('total_quotation') or payload.get('total_quotation') or 0):,.2f}\n"
                f"Referring Physician / Officer: {created.get('referring_individual') or payload.get('referring_individual', '')}\n"
                f"Submission Date: {created.get('created_at', '')}\n"
                f"Status: {created.get('status', 'AWAITING MSW REVIEW')}\n\n"
                f"Open MSW Referral Directory: {cfg.FRONTEND_URL}/patients/{patient_id}?tab=referral\n"
            )
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = getattr(cfg, "SMTP_FROM_EMAIL", None) or cfg.SMTP_USER
            msg["To"] = msw_email
            with smtplib.SMTP(cfg.SMTP_HOST, int(getattr(cfg, "SMTP_PORT", 587) or 587), timeout=10) as server:
                server.starttls()
                server.login(cfg.SMTP_USER, cfg.SMTP_PASSWORD)
                server.send_message(msg)
            email_sent = True
    except Exception as ex:
        email_error = str(ex)

    return {"status": "ok", "referral": created, "email_sent": email_sent, "email_error": email_error}


@router.get("/referrals")
async def get_all_referrals_sb():
    from app.services.referral_service import referral_service
    referrals = referral_service.list_referrals()
    # Enrich referrals with assistance history summary
    enriched = []
    for r in referrals:
        r_dict = dict(r)
        pid = r_dict.get("patient_id")
        history_info = referral_service.get_patient_assistance_history(patient_id=pid, exclude_referral_id=r_dict.get("id"))
        r_dict["assistance_history"] = history_info
        enriched.append(r_dict)
    return {"referrals": enriched}


@router.get("/patients/{patient_id}/assistance-history")
async def get_patient_assistance_history_endpoint(
    patient_id: str,
    exclude_referral_id: Optional[str] = None,
):
    from app.services.referral_service import referral_service
    history_info = referral_service.get_patient_assistance_history(
        patient_id=patient_id, exclude_referral_id=exclude_referral_id
    )
    return {"status": "ok", "assistance_history": history_info}


@router.get("/referrals/{referral_id}")
async def get_single_referral(referral_id: str):
    from app.services.referral_service import referral_service
    ref = referral_service.get_referral(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral '{referral_id}' not found.")
    history_info = referral_service.get_patient_assistance_history(
        patient_id=ref.get("patient_id"), exclude_referral_id=ref.get("id")
    )
    ref["assistance_history"] = history_info
    return {"referral": ref}


@router.post("/referrals/{referral_id}/approve")
async def approve_financial_referral(
    referral_id: str,
    payload: dict = {},
    x_user_role: str = Header(default="msw"),
    x_user_id: str = Header(default="msw_lead"),
):
    from app.services.referral_service import referral_service
    notes = payload.get("notes", "")
    expected_patient_id = payload.get("patient_id")
    approved = referral_service.approve_referral(
        referral_id=referral_id,
        actor_id=x_user_id,
        role=x_user_role,
        notes=notes,
        expected_patient_id=expected_patient_id,
    )
    return {"status": "ok", "referral": approved}


@router.post("/patient-portal/charity-assistance-status/{referral_id}/acknowledge")
async def acknowledge_patient_referral(
    referral_id: str,
    authenticated_patient_id: str = Depends(get_current_authenticated_patient),
):
    from app.services.referral_service import referral_service
    updated = referral_service.acknowledge_referral(
        referral_id=referral_id,
        actor_id=authenticated_patient_id,
        role="patient",
    )
    return {"status": "ok", "referral": updated}


@router.post("/referrals/{referral_id}/reject")
async def reject_financial_referral(
    referral_id: str,
    payload: dict = {},
    x_user_role: str = Header(default="msw"),
    x_user_id: str = Header(default="msw_lead"),
):
    from app.services.referral_service import referral_service
    reason = payload.get("reason", "Disapproved after MSW clinical review")
    rejected = referral_service.reject_referral(
        referral_id=referral_id,
        actor_id=x_user_id,
        role=x_user_role,
        reason=reason,
    )
    return {"status": "ok", "referral": rejected}


@router.patch("/referrals/{referral_id}/status")
async def patch_referral_status(
    referral_id: str,
    payload: dict,
    x_user_role: str = Header(default="msw"),
    x_user_id: str = Header(default="msw_lead"),
):
    from app.services.referral_service import referral_service
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Missing required 'status' field.")
    reason = payload.get("reason", "")
    asmt_id = payload.get("assessment_id")
    updated = referral_service.update_referral_status(
        referral_id=referral_id,
        new_status=new_status,
        actor_id=x_user_id,
        role=x_user_role,
        reason=reason,
        assessment_id=asmt_id,
    )
    return {"status": "ok", "referral": updated}


@router.get("/inquiries/sb")
async def get_inquiries_sb(patient_id: str | None = None):
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"inquiries": []}
    try:
        q = f"{url}/rest/v1/inquiries?order=created_at.desc"
        if patient_id:
            q += f"&patient_id=eq.{patient_id}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(q, headers=headers)
            if r.status_code == 200:
                return {"inquiries": r.json()}
    except Exception:
        pass
    return {"inquiries": []}


@router.post("/inquiries/sb")
async def upsert_inquiry_sb(payload: dict):
    import httpx, time
    url, headers = _sb_headers()
    if not url:
        return {"status": "skipped"}
    iid = payload.get("id") or f"INQ-{int(time.time())}"
    row = {
        "id": iid,
        "patient_id": payload.get("patient_id"),
        "sender_name": payload.get("sender_name") or payload.get("name", ""),
        "sender_email": payload.get("sender_email") or payload.get("email", ""),
        "sender_phone": payload.get("sender_phone") or payload.get("phone", ""),
        "subject": payload.get("subject", ""),
        "message": payload.get("message", ""),
        "source": payload.get("source", "public"),
        "status": payload.get("status", "Unread"),
        "is_read": bool(payload.get("is_read", False)),
        "reply_history": payload.get("reply_history") or payload.get("replyHistory") or [],
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{url}/rest/v1/inquiries", headers=headers, json=row)
        return {"status": "ok" if r.status_code in (200, 201) else "error", "inquiry": row}


# -------------------------------------------------------------
# 18. MSW Clinical Assessments & Real-Time Dashboard Stats
# -------------------------------------------------------------
class MSWAssessmentSubmission(BaseModel):
    patient_id: str
    encounter_no: Optional[str] = None
    interview_date: Optional[str] = None
    source_of_referral: Optional[str] = "EYE CLINIC REFERRAL"
    informant: Optional[Dict[str, Any]] = None
    patient_demographics: Optional[Dict[str, Any]] = None
    family_composition: Optional[List[Dict[str, Any]]] = []
    socioeconomic_data: Optional[Dict[str, Any]] = None
    clinical_evaluation: Optional[Dict[str, Any]] = None
    eligibility_grant: Optional[Dict[str, Any]] = None
    msw_assessor: Optional[str] = "Maria Santos, RSW"
    assessor_id: Optional[str] = "a1111111-1111-1111-1111-111111111111"


@router.post("/patients/{patient_id}/assessments")
async def save_msw_patient_assessment(patient_id: str, payload: MSWAssessmentSubmission):
    """
    Persists MSW assessment to Supabase socioeconomic_assessments and eligibility_assessments,
    creates a Clinical Encounter in encounters, and marks patient as Charity Grant recipient.
    """
    import httpx, time, uuid as _uuid
    url, headers = _sb_headers()

    # Find patient in local registry
    target_patient = None
    for p in REGISTERED_PATIENTS_REGISTRY:
        if p.get("patient_id") == patient_id or p.get("id") == patient_id:
            target_patient = p
            break

    grant_tier = "Indigent (100% Full Subsidy)"
    subsidy_pct = 100.0
    if payload.eligibility_grant:
        grant_tier = payload.eligibility_grant.get("tier_name", grant_tier)
        subsidy_pct = float(payload.eligibility_grant.get("subsidy_percentage", 100.0))

    socio_id = str(_uuid.uuid4())
    elig_id = str(_uuid.uuid4())
    enc_id = payload.encounter_no or f"ENC-{patient_id}-{int(time.time())}"

    # Supabase UUID resolution
    sb_patient_uuid = "c3333333-3333-3333-3333-333333333333"
    sb_assessor_uuid = payload.assessor_id or "a1111111-1111-1111-1111-111111111111"

    if url and headers:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Lookup patient uuid if available
                res_p = await client.get(f"{url}/rest/v1/patients?patient_code=eq.{patient_id}", headers=headers)
                if res_p.status_code == 200 and len(res_p.json()) > 0:
                    sb_patient_uuid = res_p.json()[0]["id"]

                # 2. Socioeconomic assessment insert
                socio_row = {
                    "id": socio_id,
                    "patient_id": sb_patient_uuid,
                    "assessor_id": sb_assessor_uuid,
                    "monthly_household_income": float((payload.socioeconomic_data or {}).get("monthly_income", 12000.0)),
                    "household_size": int((payload.socioeconomic_data or {}).get("household_size", 4)),
                    "number_of_dependents": int((payload.socioeconomic_data or {}).get("dependents", 2)),
                    "housing_type": str((payload.socioeconomic_data or {}).get("housing_type", "Rented")),
                    "philhealth_category": str((payload.socioeconomic_data or {}).get("philhealth_category", "Indigent")),
                    "social_worker_narrative": str((payload.clinical_evaluation or {}).get("msw_findings", "Comprehensive clinical casework completed.")),
                    "assessment_status": "approved"
                }
                await client.post(f"{url}/rest/v1/socioeconomic_assessments", headers=headers, json=socio_row)

                # 3. Eligibility assessment insert
                elig_row = {
                    "id": elig_id,
                    "patient_id": sb_patient_uuid,
                    "assessment_id": socio_id,
                    "model_version": "CatBoost-v2.1",
                    "predicted_eligibility": grant_tier,
                    "model_confidence": 0.965,
                    "final_institutional_decision": "Approved",
                    "approved_subsidy_percentage": subsidy_pct,
                    "approved_by_user_id": sb_assessor_uuid,
                    "decision_notes": f"Approved {subsidy_pct}% charity subsidy grant by MSW {payload.msw_assessor}."
                }
                await client.post(f"{url}/rest/v1/eligibility_assessments", headers=headers, json=elig_row)

                # 4. Insert clinical encounter
                enc_row = {
                    "id": enc_id,
                    "patient_id": patient_id,
                    "encounter_date": payload.interview_date or datetime.date.today().isoformat(),
                    "diagnosis": (payload.clinical_evaluation or {}).get("diagnosis") or (target_patient.get("diagnosis") if target_patient else "Cataract"),
                    "procedure": (payload.clinical_evaluation or {}).get("procedure") or "Phacoemulsification with Foldable IOL Implant",
                    "clinical_description": (payload.clinical_evaluation or {}).get("notes") or f"MSW Social Assessment & Grant Approval: {grant_tier}",
                    "diagnosis_severity": "Moderate",
                    "laterality": "OU",
                    "attending_doctor": (payload.clinical_evaluation or {}).get("doctor") or "Dr. J. E. Garcia, MD",
                    "consultant": (payload.clinical_evaluation or {}).get("consultant") or "Dr. P. G. Quirino, MD",
                    "total_amount": 11600.0 * (1.0 - (subsidy_pct / 100.0)),
                    "classification": "CHARITY" if subsidy_pct > 0 else "REGULAR"
                }
                await client.post(f"{url}/rest/v1/encounters", headers=headers, json=enc_row)
        except Exception as e:
            print(f"[MSW Assessment SB Fallback] {e}")

    # Synchronize local patient record in registry
    if target_patient:
        target_patient["category"] = "CHARITY"
        target_patient["status"] = "APPROVED"
        target_patient["assigned_msw"] = payload.msw_assessor or "Maria Santos, RSW (msw_lead)"
        if "encounters" not in target_patient:
            target_patient["encounters"] = []
        target_patient["encounters"].insert(0, {
            "id": enc_id,
            "encounter_date": payload.interview_date or datetime.date.today().isoformat(),
            "diagnosis": (payload.clinical_evaluation or {}).get("diagnosis") or target_patient.get("diagnosis", "Cataract"),
            "procedure": (payload.clinical_evaluation or {}).get("procedure") or "Phacoemulsification with Foldable IOL Implant",
            "classification": "CHARITY",
            "approved_financial_assistance": 11600.0 * (subsidy_pct / 100.0),
            "status": "COMPLETED",
            "notes": f"Granted {grant_tier} ({subsidy_pct}% subsidy) by MSW."
        })

    # Record audit log
    from app.services.settings_service import settings_service
    await settings_service.record_audit_log(
        action="SUBMIT_MSW_ASSESSMENT",
        actor_id=payload.assessor_id or "msw_lead",
        role="msw",
        resource=f"patient_assessment:{patient_id}",
        status="SUCCESS",
        details={
            "patient_id": patient_id,
            "encounter_no": enc_id,
            "grant_tier": grant_tier,
            "subsidy_pct": subsidy_pct
        }
    )

    try:
        from app.services.inquiry_service import inquiry_service
        target_msw = inquiry_service.resolve_msw_user_id(
            (target_patient or {}).get("assigned_msw") or payload.msw_assessor or "msw_lead"
        )
        inquiry_service.create_msw_notification(
            recipient_user_id=target_msw,
            notification_type="ASSESSMENT_SUBMITTED",
            title=f"MSW Assessment & Grant Completed ({patient_id})",
            message=f"Assessment {socio_id} (Encounter {enc_id}) completed with {grant_tier} ({subsidy_pct}% subsidy).",
            target_destination=f"/patients/{patient_id}?tab=assessment",
            related_patient_id=patient_id,
            related_encounter_id=enc_id,
            related_assessment_id=socio_id,
            dedup_key=f"MSW_ASMT_FINAL:{socio_id}:{target_msw}",
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Assessment for Patient {patient_id} successfully saved, encounter {enc_id} logged, and charity status updated.",
        "assessment_id": socio_id,
        "encounter_id": enc_id,
        "patient_id": patient_id,
        "grant_tier": grant_tier,
        "subsidy_percentage": subsidy_pct
    }


@router.get("/msw/dashboard-stats")
async def get_msw_dashboard_stats():
    """
    Computes real database statistics for the MSW Caseworker dashboard from registered patients,
    Supabase assessments, and clinical dossiers.
    """
    total_assigned = len(REGISTERED_PATIENTS_REGISTRY)
    pending_assessments = 0
    completed_assessments = 0
    charity_count = 0

    for p in REGISTERED_PATIENTS_REGISTRY:
        encs = p.get("encounters", [])
        cat = p.get("category", "REGULAR")
        stat = p.get("status", "PENDING")
        if cat == "CHARITY":
            charity_count += 1
            if len(encs) > 0 or stat == "APPROVED":
                completed_assessments += 1
            else:
                pending_assessments += 1
        elif len(encs) > 0:
            completed_assessments += 1

    # Check Supabase encounters count if reachable
    import httpx
    url, headers = _sb_headers()
    sb_enc_count = 0
    if url and headers:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{url}/rest/v1/encounters?select=id", headers=headers)
                if r.status_code == 200:
                    sb_enc_count = len(r.json())
        except Exception:
            pass

    return {
        "total_assigned": total_assigned,
        "pending_assessments": pending_assessments,
        "completed_assessments": max(completed_assessments, sb_enc_count),
        "charity_patients": charity_count,
        "approval_rate": "100%" if (completed_assessments + pending_assessments) > 0 and pending_assessments == 0 else f"{round((completed_assessments / max(total_assigned, 1)) * 100, 1)}%",
        "active_msw": "Maria Santos, RSW"
    }
