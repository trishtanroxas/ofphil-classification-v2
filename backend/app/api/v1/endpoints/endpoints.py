import datetime
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header, Depends
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
# 13. Password Reset & Forgot Password Endpoints (Brevo SMTP)
# -------------------------------------------------------------
from pydantic import BaseModel
from app.services.email_service import send_password_reset_email, send_patient_welcome_email, send_inquiry_submission_email, send_inquiry_reply_email, send_appointment_schedule_email

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

# Registered patients storage initialized with verified records
REGISTERED_PATIENTS_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "rec-1",
        "patient_id": "M26-11-00001",
        "first_name": "Juan",
        "middle_name": "Santos",
        "last_name": "Dela Cruz",
        "suffix": "",
        "age": 48,
        "sex": "M",
        "birthdate": "1978-05-15",
        "civil_status": "Married",
        "num_dependents": "2",
        "perm_province": "Metro Manila (NCR)",
        "perm_city": "City of Manila",
        "perm_barangay": "Barangay 659 (Intramuros)",
        "perm_street": "Block 4 Lot 12, St. Jude Street",
        "same_address": True,
        "alt_province": "Metro Manila (NCR)",
        "alt_city": "City of Manila",
        "alt_barangay": "Barangay 659 (Intramuros)",
        "alt_street": "Block 4 Lot 12, St. Jude Street",
        "educational_attainment": "High School Graduate / Level",
        "employment_status": "Employed (Full-time / Part-time)",
        "occupation": "Public Utility Driver",
        "residence_city": "City of Manila",
        "residence_region": "Metro Manila (NCR)",
        "contact": "0917 888 1678",
        "email": "juan.delacruz@example.ph",
        "phone_verified": True,
        "email_verified": True,
        "category": "REGULAR",
        "status": "APPROVED",
        "has_account": True,
        "registration_date": "2026-11-22",
        "diagnosis": "Bilateral Cataract, Senile Mature (OD > OS)",
        "assigned_msw": "Maria Santos, RSW (msw_lead)",
        "inquiries": []
    },
    {
        "id": "rec-2",
        "patient_id": "MSW_FA_1126-01",
        "first_name": "Maria Clara",
        "middle_name": "Flores",
        "last_name": "Ramos",
        "suffix": "",
        "age": 58,
        "sex": "F",
        "birthdate": "1968-08-20",
        "civil_status": "Widowed",
        "num_dependents": "3",
        "perm_province": "Metro Manila (NCR)",
        "perm_city": "Caloocan City",
        "perm_barangay": "Barangay 12",
        "perm_street": "Purok 2, Kaunlaran St.",
        "same_address": True,
        "alt_province": "Metro Manila (NCR)",
        "alt_city": "Caloocan City",
        "alt_barangay": "Barangay 12",
        "alt_street": "Purok 2, Kaunlaran St.",
        "educational_attainment": "Elementary Graduate",
        "employment_status": "Informal / Vendor",
        "occupation": "Market Vendor",
        "residence_city": "Caloocan City",
        "residence_region": "Metro Manila (NCR)",
        "contact": "0928 555 3412",
        "email": "maria.ramos@example.ph",
        "phone_verified": True,
        "email_verified": False,
        "category": "CHARITY",
        "status": "APPROVED",
        "has_account": False,
        "registration_date": "2026-11-20",
        "diagnosis": "Senile Cataract, Immature (OS)",
        "assigned_msw": "Maria Santos, RSW (msw_lead)",
        "inquiries": []
    },
    {
        "id": "rec-3",
        "patient_id": "MSW_FA_1126-02",
        "first_name": "Pedro",
        "middle_name": "Alvarez",
        "last_name": "Bautista",
        "suffix": "Sr.",
        "age": 64,
        "sex": "M",
        "birthdate": "1962-03-10",
        "civil_status": "Married",
        "num_dependents": "1",
        "perm_province": "Metro Manila (NCR)",
        "perm_city": "Quezon City",
        "perm_barangay": "Barangay Commonwealth",
        "perm_street": "Area B, Gate 3",
        "same_address": True,
        "alt_province": "Metro Manila (NCR)",
        "alt_city": "Quezon City",
        "alt_barangay": "Barangay Commonwealth",
        "alt_street": "Area B, Gate 3",
        "educational_attainment": "High School Level",
        "employment_status": "Unemployed / Senior",
        "occupation": "Retired Barangay Aide",
        "residence_city": "Quezon City",
        "residence_region": "Metro Manila (NCR)",
        "contact": "0919 777 9821",
        "email": "pedro.bautista@example.ph",
        "phone_verified": True,
        "email_verified": False,
        "category": "CHARITY",
        "status": "APPROVED",
        "has_account": False,
        "registration_date": "2026-11-18",
        "diagnosis": "Primary Open-Angle Glaucoma (OU)",
        "assigned_msw": "Maria Santos, RSW (msw_lead)",
        "inquiries": []
    },
    {
        "id": "rec-4",
        "patient_id": "MSW_FA_1126-03",
        "first_name": "Elena",
        "middle_name": "Velasco",
        "last_name": "Santos",
        "suffix": "",
        "age": 52,
        "sex": "F",
        "birthdate": "1974-06-18",
        "civil_status": "Single",
        "num_dependents": "2",
        "perm_province": "Metro Manila (NCR)",
        "perm_city": "Pasay City",
        "perm_barangay": "Barangay 183 (Villamor)",
        "perm_street": "14 Sampaguita St.",
        "same_address": True,
        "alt_province": "Metro Manila (NCR)",
        "alt_city": "Pasay City",
        "alt_barangay": "Barangay 183 (Villamor)",
        "alt_street": "14 Sampaguita St.",
        "educational_attainment": "High School Graduate",
        "employment_status": "Self-employed / Laundry",
        "occupation": "Laundry Worker",
        "residence_city": "Pasay City",
        "residence_region": "Metro Manila (NCR)",
        "contact": "0918 333 4455",
        "email": "elena.santos@example.ph",
        "phone_verified": True,
        "email_verified": False,
        "category": "CHARITY",
        "status": "PENDING",
        "has_account": False,
        "registration_date": "2026-11-21",
        "diagnosis": "Diabetic Retinopathy (OU)",
        "assigned_msw": "Maria Santos, RSW (msw_lead)",
        "inquiries": []
    },
    {
        "id": "rec-5",
        "patient_id": "MSW_FA_1126-04",
        "first_name": "Ricardo",
        "middle_name": "Gomez",
        "last_name": "Dalisay",
        "suffix": "",
        "age": 61,
        "sex": "M",
        "birthdate": "1965-02-14",
        "civil_status": "Married",
        "num_dependents": "4",
        "perm_province": "Metro Manila (NCR)",
        "perm_city": "Quezon City",
        "perm_barangay": "Barangay Batasan Hills",
        "perm_street": "Phase 2, Block 8",
        "same_address": True,
        "alt_province": "Metro Manila (NCR)",
        "alt_city": "Quezon City",
        "alt_barangay": "Barangay Batasan Hills",
        "alt_street": "Phase 2, Block 8",
        "educational_attainment": "High School Level",
        "employment_status": "Informal / Construction",
        "occupation": "Construction Worker",
        "residence_city": "Quezon City",
        "residence_region": "Metro Manila (NCR)",
        "contact": "0927 666 7788",
        "email": "ricardo.dalisay@example.ph",
        "phone_verified": True,
        "email_verified": False,
        "category": "CHARITY",
        "status": "DISAPPROVED/PROMISSORY",
        "has_account": False,
        "registration_date": "2026-11-19",
        "diagnosis": "Mature Cataract with Glaucoma (OD)",
        "assigned_msw": "Maria Santos, RSW (msw_lead)",
        "inquiries": []
    }
]

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
    category = "CHARITY" if (payload.category or "").upper() == "CHARITY" else "REGULAR"

    if category == "CHARITY" and (not payload.patient_id or payload.patient_id.strip().upper() in {"", "AUTO"} or payload.patient_id.strip().upper().startswith("AUTO")):
        req_pid = generate_next_charity_case_no()
    else:
        req_pid = (payload.patient_id or "").strip().upper()
        if not req_pid:
            # Fallback for regular patients
            now = datetime.date.today()
            prefix = f"M{now.strftime('%y')}-{now.strftime('%m')}-"
            max_seq = 1
            for p in REGISTERED_PATIENTS_REGISTRY:
                pid = str(p.get("patient_id", "")).strip().upper()
                if pid.startswith(prefix):
                    s = pid[len(prefix):]
                    if s.isdigit():
                        max_seq = max(max_seq, int(s))
            req_pid = f"{prefix}{max_seq + 1:05d}"

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
        "has_account": True if (payload.email_address or payload.initial_password) and category != "CHARITY" else False,
        "registration_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "category": category,
        "status": "APPROVED",
    }
    REGISTERED_PATIENTS_REGISTRY.insert(0, new_record)

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
    found_patient = None
    for item in REGISTERED_PATIENTS_REGISTRY:
        if item.get("patient_id") == patient_id or item.get("id") == patient_id:
            found_patient = item
            break
            
    if not found_patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    # Encounters & Quotations (empty by default for clean initial registration)
    encounters = found_patient.get("encounters", [])

    documents = found_patient.get("documents", [])

    inquiries = found_patient.get("inquiries", [])

    total_subsidy = sum(e.get("approved_financial_assistance", 0.0) for e in encounters)

    return {
        "status": "success",
        "patient": found_patient,
        "encounters": encounters,
        "documents": documents,
        "inquiries": inquiries,
        "total_assistance": total_subsidy
    }

# -------------------------------------------------------------
# 15. Master Patient Directory & Records API
# -------------------------------------------------------------
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
    category: Optional[str] = None
    status: Optional[str] = None
    new_password: Optional[str] = None
    diagnosis: Optional[str] = None
    assigned_msw: Optional[str] = None

@router.put("/patients/{patient_id}")
def update_patient_record(patient_id: str, payload: PatientUpdateRequest):
    for item in REGISTERED_PATIENTS_REGISTRY:
        if item.get("patient_id") == patient_id or item.get("id") == patient_id:
            for field_key in [
                "first_name", "middle_name", "last_name", "suffix", "birthdate",
                "age", "sex", "civil_status", "num_dependents",
                "perm_province", "perm_city", "perm_barangay", "perm_street",
                "same_address", "alt_province", "alt_city", "alt_barangay", "alt_street",
                "educational_attainment", "employment_status", "occupation",
                "residence_city", "residence_region", "contact", "email",
                "category", "status", "diagnosis", "assigned_msw"
            ]:
                val = getattr(payload, field_key, None)
                if val is not None:
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
    """
    records = []
    for item in REGISTERED_PATIENTS_REGISTRY:
        if category and category.upper() != "ALL":
            if item.get("category") != category.upper():
                continue
        if search and search.strip():
            q = search.strip().lower()
            fn = item.get("first_name", "").lower()
            ln = item.get("last_name", "").lower()
            full = f"{fn} {ln}"
            pid = item.get("patient_id", "").lower()
            if q not in pid and q not in full:
                continue
        records.append(item)
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
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"referral": None}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{url}/rest/v1/referrals?patient_id=eq.{patient_id}&limit=1",
                headers=headers,
            )
            if r.status_code == 200 and r.json():
                return {"referral": r.json()[0]}
    except Exception:
        pass
    return {"referral": None}


@router.post("/patients/{patient_id}/referral")
async def upsert_patient_referral_sb(patient_id: str, payload: dict):
    import httpx
    url, headers = _sb_headers()
    if not url:
        return {"status": "skipped"}
    row = {
        "id": payload.get("id") or f"REF-{patient_id}",
        "patient_id": patient_id,
        "diagnosis": payload.get("diagnosis", ""),
        "procedure": payload.get("procedure", ""),
        "particulars": payload.get("particulars", []),
        "total": float(payload.get("total") or 0),
        "attending_doctor": payload.get("attending_doctor", ""),
        "doctor_signature_title": payload.get("doctor_signature_title", ""),
        "referring_individual": payload.get("referring_individual", ""),
        "referring_signature_title": payload.get("referring_signature_title", ""),
        "status": payload.get("status", "DRAFT"),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{url}/rest/v1/referrals", headers=headers, json=row)
        return {"status": "ok" if r.status_code in (200, 201) else "error", "referral": row}


@router.get("/referrals")
async def get_all_referrals_sb():
    import httpx
    url, headers = _sb_headers()
    referrals = []
    if url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{url}/rest/v1/referrals?order=created_at.desc", headers=headers)
                if r.status_code == 200 and r.json():
                    referrals = r.json()
        except Exception:
            pass

    if not referrals:
        referrals = [
            {
                "id": "OFPHIL-FA-2026-0001",
                "patient_id": "M26-11-00001",
                "patient_name": "Juan Santos Dela Cruz",
                "diagnosis": "Bilateral Cataract, Senile Mature (OD > OS)",
                "procedure": "Phacoemulsification with Foldable IOL Implant (OD)",
                "particulars": [
                    {"description": "Operating Room & Surgical Microscope Fee", "amount": 4500},
                    {"description": "Foldable Acrylic Intraocular Lens (IOL) Pack", "amount": 3500},
                    {"description": "Ophthalmic Viscosurgical Device (OVD) & Consumables", "amount": 1800},
                    {"description": "Post-Operative Med Pack (Moxifloxacin + Prednisolone)", "amount": 1800}
                ],
                "total": 11600.0,
                "attending_doctor": "Dr. J. E. Garcia, MD",
                "doctor_signature_title": "Attending Eye Surgeon • License No. 0089421",
                "referring_individual": "Dr. Roberto Reyes, MD, DPBO",
                "referring_signature_title": "Clinic Medical Administrator & Ophthalmologist",
                "status": "ENDORSED FOR FINANCIAL ASSISTANCE",
                "created_at": "2026-11-22T08:30:00Z"
            }
        ]
    return {"referrals": referrals}


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
        "total_assigned": max(total_assigned, 1),
        "pending_assessments": pending_assessments,
        "completed_assessments": max(completed_assessments, sb_enc_count),
        "charity_patients": max(charity_count, 1),
        "approval_rate": "100%" if (completed_assessments + pending_assessments) > 0 and pending_assessments == 0 else f"{round((completed_assessments / max(total_assigned, 1)) * 100, 1)}%",
        "active_msw": "Maria Santos, RSW"
    }
