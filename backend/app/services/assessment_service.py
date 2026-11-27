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
    Stage2EvaluationRequest,
)
from app.schemas.classification_schemas import (
    CombinedClassificationRequest,
    FinancialClassificationRequest,
    MSWScoreFactors,
)
from app.services.classification_service import (
    classify_financial,
    evaluate_combined,
    evaluate_stage2_interview,
    resolve_qualitative_coping,
    resolve_qualitative_severity,
)

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

    def list_assessments(
        self, patient_id: Optional[str] = None, referral_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        items = list(self._assessments.values())
        if patient_id:
            items = [a for a in items if a.get("patient_id") == patient_id]
        if referral_id:
            items = [a for a in items if a.get("referral_id") == referral_id]
        items.sort(key=lambda a: a.get("updated_at", ""), reverse=True)
        return items

    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        return self._assessments.get(assessment_id)

    def get_latest_draft_for_patient(
        self, patient_id: str, referral_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        patient_items = self.list_assessments(patient_id=patient_id, referral_id=referral_id)
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
        # If referral_id is provided, check for active draft on that exact referral first
        target_ref_id = payload.referral_id.strip() if payload.referral_id else None
        for existing in self.list_assessments(patient_id=payload.patient_id):
            if existing.get("workflow_status") in {"DRAFT", "ASSESSMENT_IN_PROGRESS", "RETURNED_FOR_REVISION"}:
                if target_ref_id:
                    if existing.get("referral_id") == target_ref_id:
                        try:
                            from app.services.referral_service import referral_service
                            referral_service.link_assessment(
                                referral_id=target_ref_id,
                                assessment_id=existing["id"],
                                actor_id=actor_id,
                                role=role,
                            )
                        except Exception:
                            pass
                        return existing
                else:
                    return existing

        assessment_id = f"asmt-{uuid.uuid4().hex[:10]}"
        if payload.encounter_no:
            encounter_no = payload.encounter_no
        elif str(payload.patient_id).startswith("MSW_FA_"):
            encounter_no = str(payload.patient_id)
        else:
            encounter_no = f"ENC-{payload.patient_id}"
        now = _utc_now()

        record: Dict[str, Any] = {
            "id": assessment_id,
            "patient_id": payload.patient_id,
            "referral_id": target_ref_id,
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
        self._append_history(record, "ASSESSMENT_CREATED", actor_id, role, {"encounter_no": encounter_no, "referral_id": target_ref_id})
        self._assessments[assessment_id] = record
        self._save()

        # Update referral status if linked
        if target_ref_id:
            try:
                from app.services.referral_service import referral_service
                referral_service.link_assessment(
                    referral_id=target_ref_id,
                    assessment_id=assessment_id,
                    actor_id=actor_id,
                    role=role,
                )
            except Exception:
                pass

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
        if payload.referral_id is not None:
            record["referral_id"] = payload.referral_id
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
        # Guard against double-counting when the Informant is the Patient ("Self" / "Patient")
        family_members = stage1.get("family_members") or []
        is_self_informant = bool(stage1.get("informant_is_patient")) or (
            str(stage1.get("informant_relation") or "").strip().lower() in {"self", "patient"}
        )
        inf_inc = Decimal("0") if is_self_informant else Decimal(str(stage1.get("informant_income") or 0))
        pat_inc = Decimal(str(stage1.get("patient_income") or 0))
        fam_inc = sum(Decimal(str(m.get("income") or 0)) for m in family_members)
        if "total_household_income" in stage1 and stage1["total_household_income"] is not None:
            total_income = Decimal(str(stage1["total_household_income"]))
        else:
            total_income = inf_inc + pat_inc + fam_inc

        household_size = int(stage1.get("household_size") or (len(family_members) + 1))

        # Stage 2 scoring has been removed for new assessments (Stage 2 is a qualitative text-based interview).
        # Stage 1 financial/income-based per-capita classification remains active; legacy scores on historical
        # records are preserved read-only if explicitly present.
        avg_sev = stage2.get("average_severity")
        avg_cop = stage2.get("average_coping")
        hf_list = stage2.get("health_factors") or []
        has_legacy_hf_levels = bool(
            hf_list
            and any(
                x.get("severity_level") is not None
                or x.get("severity") is not None
                or x.get("coping_level") is not None
                or x.get("coping") is not None
                for x in hf_list
            )
        )
        has_legacy_scores = (avg_sev is not None and avg_cop is not None) or has_legacy_hf_levels

        if has_legacy_scores:
            factors_payload = None
            if has_legacy_hf_levels:
                sev_vals = []
                cop_vals = []
                for x in hf_list:
                    s, _ = resolve_qualitative_severity(x.get("severity_level", x.get("severity", 0)))
                    c, _ = resolve_qualitative_coping(x.get("coping_level", x.get("coping", 0)))
                    sev_vals.append(float(s) if s is not None else float(x.get("severity", 0)))
                    cop_vals.append(float(c) if c is not None else float(x.get("coping", 0)))

                h_sev_avg = Decimal(str(sum(sev_vals) / len(sev_vals)))
                h_cop_avg = Decimal(str(sum(cop_vals) / len(cop_vals)))

                discrim_sev, _ = resolve_qualitative_severity(stage2.get("discrimination_severity_level", stage2.get("discrimination_severity")))
                safety_sev, _ = resolve_qualitative_severity(stage2.get("safety_severity_level", stage2.get("safety_severity")))
                roles_sev, _ = resolve_qualitative_severity(stage2.get("roles_severity_level", stage2.get("roles_severity")))
                env_sev, _ = resolve_qualitative_severity(stage2.get("environment_severity_level", stage2.get("environment_severity")))

                discrim_cop, _ = resolve_qualitative_coping(stage2.get("discrimination_coping_level", stage2.get("discrimination_coping")))
                safety_cop, _ = resolve_qualitative_coping(stage2.get("safety_coping_level", stage2.get("safety_coping")))
                roles_cop, _ = resolve_qualitative_coping(stage2.get("roles_coping_level", stage2.get("roles_coping")))

                factors_payload = MSWScoreFactors(
                    health_severity_avg=h_sev_avg,
                    discrimination_severity=discrim_sev if discrim_sev is not None else Decimal(str(stage2.get("discrimination_severity", 0))),
                    safety_severity=safety_sev if safety_sev is not None else Decimal(str(stage2.get("safety_severity", 0))),
                    roles_severity=roles_sev if roles_sev is not None else Decimal(str(stage2.get("roles_severity", 0))),
                    environment_severity=env_sev if env_sev is not None else Decimal(str(stage2.get("environment_severity", 0))),
                    health_coping_avg=h_cop_avg,
                    discrimination_coping=discrim_cop if discrim_cop is not None else Decimal(str(stage2.get("discrimination_coping", 0))),
                    safety_coping=safety_cop if safety_cop is not None else Decimal(str(stage2.get("safety_coping", 0))),
                    roles_coping=roles_cop if roles_cop is not None else Decimal(str(stage2.get("roles_coping", 0))),
                )

            combined_req = CombinedClassificationRequest(
                total_monthly_household_income=total_income,
                household_size=household_size,
                average_severity=Decimal(str(avg_sev)) if (avg_sev is not None and not has_legacy_hf_levels) else None,
                average_coping=Decimal(str(avg_cop)) if (avg_cop is not None and not has_legacy_hf_levels) else None,
                factors=factors_payload,
                is_initial_load=payload.is_initial_load,
                assessment_context=payload.assessment_context,
            )
            classification_res = evaluate_combined(combined_req)
            classification_dict = json.loads(classification_res.model_dump_json())
            fin_code = classification_res.financial_classification.classification
            msw_code = classification_res.msw_classification.classification
            disc_flag = classification_res.discrepancy_detected
        else:
            fin_res = classify_financial(
                FinancialClassificationRequest(
                    total_monthly_household_income=total_income,
                    household_size=household_size,
                )
            )
            fin_dict = json.loads(fin_res.model_dump_json())
            classification_dict = {
                "financial_classification": fin_dict,
                "msw_classification": None,
                "monthly_per_capita_income": str(fin_res.monthly_per_capita_income),
                "average_severity": None,
                "average_coping": None,
                "total_risk": None,
                "triggered_conditions": [],
                "subsidy_recommendation": "Manual MSW Decision Required (Procedure Quotation Subsidy)",
                "discrepancy_detected": False,
                "discrepancy_details": None,
                "requires_msw_review": True,
                "explanations": {
                    "financial": fin_res.explanation,
                    "msw": "Stage 2 is a qualitative text-based interview; final procedure quotation subsidy is decided manually by the MSW.",
                },
            }
            fin_code = fin_res.classification
            msw_code = "MANUAL_MSW_DECISION_REQUIRED"
            disc_flag = False

        # Preserve historical classification results
        record["classification_result"] = classification_dict
        record.setdefault("classification_history", []).append({
            "timestamp": _utc_now(),
            "actor_id": actor_id,
            "result": classification_dict,
        })

        record["workflow_status"] = (
            "PENDING_MSW_REVIEW" if (not has_legacy_scores or disc_flag) else "PENDING_DOCUMENT_REVIEW"
        )
        record["updated_at"] = _utc_now()
        self._append_history(
            record,
            "ASSESSMENT_CLASSIFIED",
            actor_id,
            role,
            {
                "financial_classification": fin_code,
                "msw_classification": msw_code,
                "discrepancy_detected": disc_flag,
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
            # Auto-compute Stage 1 financial classification if not yet submitted
            self.submit_and_classify(
                assessment_id=assessment_id,
                payload=AssessmentSubmitRequest(is_initial_load=False, assessment_context="live_recalculation"),
                actor_id=actor_id,
                role=role,
            )

        resolved_decision = (
            payload.decision.strip().upper()
            if payload.decision
            else ("APPROVED" if payload.recommended_subsidy_pct > 0 else "DECLINED")
        )
        rec = {
            "decision": resolved_decision,
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

        # Update referral status to 'Referred for Administrative Decision' or 'Assessed'
        target_ref_id = record.get("referral_id")
        if target_ref_id:
            try:
                from app.services.referral_service import referral_service
                referral_service.update_referral_status(
                    referral_id=target_ref_id,
                    new_status="Referred for Administrative Decision",
                    actor_id=actor_id,
                    role=role,
                    reason=f"MSW submitted charity recommendation: {rec.get('recommended_tier')}",
                    assessment_id=assessment_id,
                )
            except Exception:
                pass

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

        # Update referral status based on administrative decision
        target_ref_id = record.get("referral_id")
        if target_ref_id:
            try:
                from app.services.referral_service import referral_service
                ref_status = "Approved" if decision == "APPROVED" else "Disapproved / Promissory" if decision == "REJECTED" else "Under MSW Review"
                referral_service.update_referral_status(
                    referral_id=target_ref_id,
                    new_status=ref_status,
                    actor_id=actor_id,
                    role=role,
                    reason=f"Administrative decision: {decision} ({payload.decision_notes or ''})",
                    assessment_id=assessment_id,
                )
            except Exception:
                pass

        return record

    def evaluate_stage2(
        self,
        assessment_id: str,
        payload: Stage2EvaluationRequest,
        actor_id: str,
        role: str,
    ) -> Dict[str, Any]:
        record = self._assessments.get(assessment_id)
        if not record:
            raise HTTPException(status_code=404, detail="Assessment not found")

        # Pull household income / size from stage1 if omitted in request
        stage1 = record.get("stage1_data") or {}
        if payload.total_household_income is None:
            if "total_household_income" in stage1 and stage1["total_household_income"] is not None:
                payload.total_household_income = Decimal(str(stage1["total_household_income"]))
            else:
                family_members = stage1.get("family_members") or []
                is_self_informant = bool(stage1.get("informant_is_patient")) or (
                    str(stage1.get("informant_relation") or "").strip().lower() in {"self", "patient"}
                )
                inf_inc = Decimal("0") if is_self_informant else Decimal(str(stage1.get("informant_income") or 0))
                pat_inc = Decimal(str(stage1.get("patient_income") or 0))
                fam_inc = sum(Decimal(str(m.get("income") or 0)) for m in family_members)
                payload.total_household_income = inf_inc + pat_inc + fam_inc
        if payload.household_size is None or payload.household_size < 1:
            family_members = stage1.get("family_members") or []
            payload.household_size = int(stage1.get("household_size") or (len(family_members) + 1))

        res = evaluate_stage2_interview(payload)
        res_dict = json.loads(res.model_dump_json())

        # Persist Stage 2 interview answers onto the assessment without requiring or inventing scores
        s2_store = record.setdefault("stage2_data", {})
        if res_dict.get("interview_answers"):
            s2_store["interview_answers"] = res_dict["interview_answers"]
        if payload.interview_info is not None:
            s2_store["interview_info"] = json.loads(payload.interview_info.model_dump_json())
        if payload.background is not None:
            s2_store["background"] = json.loads(payload.background.model_dump_json())
        if payload.medical_difficulties is not None:
            s2_store["medical_difficulties"] = json.loads(payload.medical_difficulties.model_dump_json())
        if payload.psychosocial is not None:
            s2_store["psychosocial"] = json.loads(payload.psychosocial.model_dump_json())

        if res_dict.get("financial_classification") or res_dict.get("msw_classification"):
            record["classification_result"] = {
                **(record.get("classification_result") or {}),
                "financial_classification": res_dict.get("financial_classification"),
                "msw_classification": res_dict.get("msw_classification"),
                "total_risk": float(res.total_risk) if res.total_risk is not None else None,
            }

        self._append_history(
            record,
            "STAGE2_INTERVIEW_EVALUATED",
            actor_id,
            role,
            {"status": res.status, "is_complete": res.is_complete, "interview_answers_count": len(res.interview_answers)},
        )
        self._save()
        return res_dict

    def save_interview_draft(
        self,
        assessment_id: str,
        payload: Dict[str, Any],
        actor_id: str,
        role: str,
        mark_completed: bool = False,
    ) -> Dict[str, Any]:
        record = self._assessments.get(assessment_id)
        if not record:
            raise HTTPException(status_code=404, detail="Assessment not found")

        current_stage2 = record.get("stage2_data") or {}
        merged_stage2 = {**current_stage2, **payload}
        if mark_completed:
            interview_info = merged_stage2.setdefault("interview_info", {})
            interview_info["interview_status"] = "COMPLETED"
        record["stage2_data"] = merged_stage2
        record["updated_at"] = _utc_now()
        self._append_history(
            record,
            "INTERVIEW_COMPLETED" if mark_completed else "INTERVIEW_DRAFT_SAVED",
            actor_id,
            role,
            {"mark_completed": mark_completed},
        )
        self._save()
        return record


assessment_service = AssessmentService()
