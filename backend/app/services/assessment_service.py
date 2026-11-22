"""
MSW Assessment Workflow & Persistence Service.
Manages Stage 1-4 drafts, submissions, deterministic OFPHIL classification persistence,
MSW recommendations, authorized institutional approvals, and assessment history.
"""
import datetime
import json
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.core.paths import STORAGE_DIR
from app.schemas.assessment_schemas import (
    AssessmentCreateRequest,
    AssessmentSubmitRequest,
    AssessmentUpdateRequest,
    InstitutionalApprovalRequest,
    MSWRecommendationRequest,
)
from app.schemas.classification_schemas import CombinedClassificationRequest, MSWScoreFactors
from app.services.classification_service import evaluate_combined

ASSESSMENTS_FILE = STORAGE_DIR / "assessments_store.json"

VALID_WORKFLOW_STATUSES = {
    "DRAFT",
    "ASSESSMENT_IN_PROGRESS",
    "PENDING_DOCUMENT_REVIEW",
    "PENDING_MSW_REVIEW",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "RETURNED_FOR_REVISION",
}


def _utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class AssessmentService:
    def __init__(self) -> None:
        self._assessments: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        if ASSESSMENTS_FILE.exists():
            try:
                data = json.loads(ASSESSMENTS_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    self._assessments = data
            except Exception:
                self._assessments = {}

    def _save(self) -> None:
        try:
            ASSESSMENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
            ASSESSMENTS_FILE.write_text(json.dumps(self._assessments, indent=2), encoding="utf-8")
        except Exception:
            pass

    def _append_history(
        self,
        assessment: Dict[str, Any],
        event: str,
        actor_id: str,
        role: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        assessment.setdefault("history", []).append({
            "timestamp": _utc_now(),
            "event": event,
            "actor_id": actor_id,
            "role": role,
            "workflow_status": assessment.get("workflow_status"),
            "details": details or {},
        })

    def list_assessments(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        items = list(self._assessments.values())
        if patient_id:
            items = [a for a in items if a.get("patient_id") == patient_id]
        items.sort(key=lambda a: a.get("updated_at", ""), reverse=True)
        return items

    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        return self._assessments.get(assessment_id)

    def get_latest_draft_for_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        patient_items = self.list_assessments(patient_id=patient_id)
        for item in patient_items:
            if item.get("workflow_status") in {"DRAFT", "ASSESSMENT_IN_PROGRESS", "RETURNED_FOR_REVISION"}:
                return item
        return patient_items[0] if patient_items else None

    def create_assessment(
        self,
        payload: AssessmentCreateRequest,
        actor_id: str,
        role: str,
    ) -> Dict[str, Any]:
        # Prevent duplicate active drafts for the same patient_id
        for existing in self.list_assessments(patient_id=payload.patient_id):
            if existing.get("workflow_status") in {"DRAFT", "ASSESSMENT_IN_PROGRESS", "RETURNED_FOR_REVISION"}:
                return existing

        assessment_id = f"asmt-{uuid.uuid4().hex[:10]}"
        encounter_no = payload.encounter_no or f"ENC-{payload.patient_id}-{uuid.uuid4().hex[:6].upper()}"
        now = _utc_now()

        record: Dict[str, Any] = {
            "id": assessment_id,
            "patient_id": payload.patient_id,
            "encounter_no": encounter_no,
            "interview_date": payload.interview_date or datetime.date.today().isoformat(),
            "source_of_referral": payload.source_of_referral or "",
            "active_stage": 1,
            "workflow_status": "DRAFT",
            "is_initial_load": payload.is_initial_load,
            "stage1_data": payload.stage1_data or {},
            "stage2_data": payload.stage2_data or {},
            "stage3_documents": payload.stage3_documents or [],
            "classification_result": None,
            "classification_history": [],
            "ml_prediction": None,
            "msw_recommendation": None,
            "institutional_approval": None,
            "created_by": actor_id,
            "created_at": now,
            "updated_at": now,
            "history": [],
        }

        self._validate_stage1_numbers(record["stage1_data"])
        self._append_history(record, "ASSESSMENT_CREATED", actor_id, role, {"encounter_no": encounter_no})
        self._assessments[assessment_id] = record
        self._save()
        return record

    def _validate_stage1_numbers(self, stage1: Dict[str, Any]) -> None:
        if not stage1:
            return
        for key in ("informant_income", "patient_income", "total_household_income"):
            if key in stage1 and stage1[key] is not None and stage1[key] != "":
                try:
                    val = Decimal(str(stage1[key]))
                    if val < Decimal("0"):
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"{key} cannot be negative.",
                        )
                except HTTPException:
                    raise
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid numeric value for {key}.",
                    )

        if "household_size" in stage1 and stage1["household_size"] is not None:
            try:
                hs = int(stage1["household_size"])
                if hs < 1:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Household size must be at least 1.",
                    )
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid household_size.",
                )

    def update_assessment(
        self,
        assessment_id: str,
        payload: AssessmentUpdateRequest,
        actor_id: str,
        role: str,
    ) -> Dict[str, Any]:
        record = self._assessments.get(assessment_id)
        if not record:
            raise HTTPException(status_code=404, detail="Assessment not found")

        if payload.stage1_data is not None:
            self._validate_stage1_numbers(payload.stage1_data)
            record["stage1_data"] = {**record.get("stage1_data", {}), **payload.stage1_data}
        if payload.stage2_data is not None:
            record["stage2_data"] = {**record.get("stage2_data", {}), **payload.stage2_data}
        if payload.stage3_documents is not None:
            record["stage3_documents"] = payload.stage3_documents
        if payload.active_stage is not None:
            record["active_stage"] = payload.active_stage
        if payload.interview_date is not None:
            record["interview_date"] = payload.interview_date
        if payload.source_of_referral is not None:
            record["source_of_referral"] = payload.source_of_referral
        if payload.is_initial_load is not None:
            record["is_initial_load"] = payload.is_initial_load
        if payload.workflow_status is not None and payload.workflow_status in VALID_WORKFLOW_STATUSES:
            record["workflow_status"] = payload.workflow_status
        elif record["workflow_status"] == "DRAFT":
            record["workflow_status"] = "ASSESSMENT_IN_PROGRESS"

        record["updated_at"] = _utc_now()
        self._append_history(
            record,
            "DRAFT_SAVED",
            actor_id,
            role,
            {"active_stage": record["active_stage"]},
        )
        self._save()
        return record

    def submit_and_classify(
        self,
        assessment_id: str,
        payload: AssessmentSubmitRequest,
        actor_id: str,
        role: str,
    ) -> Dict[str, Any]:
        record = self._assessments.get(assessment_id)
        if not record:
            raise HTTPException(status_code=404, detail="Assessment not found")

        stage1 = record.get("stage1_data") or {}
        stage2 = record.get("stage2_data") or {}
        self._validate_stage1_numbers(stage1)

        # Compute total household income and household size from Stage 1
        family_members = stage1.get("family_members") or []
        inf_inc = Decimal(str(stage1.get("informant_income") or 0))
        pat_inc = Decimal(str(stage1.get("patient_income") or 0))
        fam_inc = sum(Decimal(str(m.get("income") or 0)) for m in family_members)
        if "total_household_income" in stage1 and stage1["total_household_income"] is not None:
            total_income = Decimal(str(stage1["total_household_income"]))
        else:
            total_income = inf_inc + pat_inc + fam_inc

        household_size = int(stage1.get("household_size") or (len(family_members) + 1))

        # Resolve Stage 2 scores
        factors_payload = None
        avg_sev = stage2.get("average_severity")
        avg_cop = stage2.get("average_coping")

        if stage2.get("health_factors") is not None:
            hf = stage2["health_factors"]
            if not hf:
                raise HTTPException(status_code=422, detail="At least one health factor is required in Stage 2.")
            h_sev_avg = Decimal(str(sum(float(x.get("severity", 0)) for x in hf) / len(hf)))
            h_cop_avg = Decimal(str(sum(float(x.get("coping", 0)) for x in hf) / len(hf)))
            factors_payload = MSWScoreFactors(
                health_severity_avg=h_sev_avg,
                discrimination_severity=Decimal(str(stage2.get("discrimination_severity"))),
                safety_severity=Decimal(str(stage2.get("safety_severity"))),
                roles_severity=Decimal(str(stage2.get("roles_severity"))),
                environment_severity=Decimal(str(stage2.get("environment_severity"))),
                health_coping_avg=h_cop_avg,
                discrimination_coping=Decimal(str(stage2.get("discrimination_coping"))),
                safety_coping=Decimal(str(stage2.get("safety_coping"))),
                roles_coping=Decimal(str(stage2.get("roles_coping"))),
            )

        combined_req = CombinedClassificationRequest(
            total_monthly_household_income=total_income,
            household_size=household_size,
            average_severity=Decimal(str(avg_sev)) if avg_sev is not None else None,
            average_coping=Decimal(str(avg_cop)) if avg_cop is not None else None,
            factors=factors_payload,
            is_initial_load=payload.is_initial_load,
            assessment_context=payload.assessment_context,
        )
        classification_res = evaluate_combined(combined_req)
        classification_dict = json.loads(classification_res.model_dump_json())

        # Preserve historical classification results
        record["classification_result"] = classification_dict
        record.setdefault("classification_history", []).append({
            "timestamp": _utc_now(),
            "actor_id": actor_id,
            "result": classification_dict,
        })

        record["workflow_status"] = (
            "PENDING_MSW_REVIEW" if classification_res.discrepancy_detected else "PENDING_DOCUMENT_REVIEW"
        )
        record["updated_at"] = _utc_now()
        self._append_history(
            record,
            "ASSESSMENT_CLASSIFIED",
            actor_id,
            role,
            {
                "financial_classification": classification_res.financial_classification.classification,
                "msw_classification": classification_res.msw_classification.classification,
                "discrepancy_detected": classification_res.discrepancy_detected,
            },
        )
        self._save()
        return record

    def record_msw_recommendation(
        self,
        assessment_id: str,
        payload: MSWRecommendationRequest,
        actor_id: str,
        role: str,
    ) -> Dict[str, Any]:
        record = self._assessments.get(assessment_id)
        if not record:
            raise HTTPException(status_code=404, detail="Assessment not found")
        if not record.get("classification_result"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot submit MSW recommendation before classification is computed.",
            )

        rec = {
            "recommended_tier": payload.recommended_tier,
            "recommended_subsidy_pct": payload.recommended_subsidy_pct,
            "case_notes": payload.case_notes,
            "discrepancy_explanation": payload.discrepancy_explanation,
            "override_reason": payload.override_reason,
            "msw_assessor_id": actor_id,
            "msw_assessor_name": payload.msw_assessor_name or actor_id,
            "recommended_at": _utc_now(),
        }
        record["msw_recommendation"] = rec
        record["workflow_status"] = "PENDING_APPROVAL"
        record["updated_at"] = _utc_now()
        self._append_history(record, "MSW_RECOMMENDATION_SUBMITTED", actor_id, role, rec)
        self._save()
        return record

    def record_institutional_approval(
        self,
        assessment_id: str,
        payload: InstitutionalApprovalRequest,
        actor_id: str,
        role: str,
    ) -> Dict[str, Any]:
        record = self._assessments.get(assessment_id)
        if not record:
            raise HTTPException(status_code=404, detail="Assessment not found")

        decision = payload.decision.strip().upper()
        if decision not in {"APPROVED", "REJECTED", "RETURNED_FOR_REVISION"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Decision must be APPROVED, REJECTED, or RETURNED_FOR_REVISION.",
            )
        if not record.get("msw_recommendation") and decision == "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot approve assessment without an MSW recommendation.",
            )

        approval = {
            "decision": decision,
            "approved_subsidy_percentage": payload.approved_subsidy_percentage,
            "decision_notes": payload.decision_notes,
            "approved_by_user_id": actor_id,
            "approver_name": payload.approver_name or actor_id,
            "decision_timestamp": _utc_now(),
        }
        record["institutional_approval"] = approval
        record["workflow_status"] = decision
        record["updated_at"] = _utc_now()
        self._append_history(record, f"INSTITUTIONAL_{decision}", actor_id, role, approval)
        self._save()
        return record


assessment_service = AssessmentService()
