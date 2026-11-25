import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.core.paths import STORAGE_DIR

REFERRALS_DB_PATH = STORAGE_DIR / "inquiries.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ReferralService:
    def __init__(self, db_path: Path = REFERRALS_DB_PATH) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS financial_referrals (
                    id TEXT PRIMARY KEY,
                    referral_no TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    patient_name TEXT NOT NULL,
                    diagnosis TEXT NOT NULL,
                    eye_laterality TEXT NOT NULL DEFAULT 'Bilateral',
                    procedure TEXT NOT NULL,
                    clinical_findings TEXT NOT NULL DEFAULT '',
                    particulars TEXT NOT NULL DEFAULT '[]',
                    total REAL NOT NULL DEFAULT 0.0,
                    requested_amount REAL NOT NULL DEFAULT 0.0,
                    attending_doctor TEXT NOT NULL,
                    doctor_signature_title TEXT NOT NULL DEFAULT '',
                    referring_individual TEXT NOT NULL,
                    referring_signature_title TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'Awaiting MSW Review',
                    charity_case_no TEXT,
                    approved_by TEXT,
                    approved_at TEXT,
                    rejected_by TEXT,
                    rejected_at TEXT,
                    rejection_reason TEXT,
                    assessment_id TEXT,
                    notes TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_referrals_patient_id ON financial_referrals(patient_id);
                CREATE INDEX IF NOT EXISTS idx_referrals_status ON financial_referrals(status);
                CREATE INDEX IF NOT EXISTS idx_referrals_assessment_id ON financial_referrals(assessment_id);

                CREATE TABLE IF NOT EXISTS referral_status_audit (
                    id TEXT PRIMARY KEY,
                    referral_id TEXT NOT NULL REFERENCES financial_referrals(id) ON DELETE CASCADE,
                    old_status TEXT NOT NULL,
                    new_status TEXT NOT NULL,
                    changed_by TEXT NOT NULL,
                    role TEXT NOT NULL,
                    reason TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ref_audit_ref_id ON referral_status_audit(referral_id);
                """
            )
            # Ensure newer columns exist for older sqlite databases BEFORE creating index on them
            try:
                col_names = [col[1] for col in conn.execute("PRAGMA table_info(financial_referrals)").fetchall()]
                for new_col in ["charity_case_no", "approved_by", "approved_at", "rejected_by", "rejected_at", "rejection_reason"]:
                    if new_col not in col_names:
                        conn.execute(f"ALTER TABLE financial_referrals ADD COLUMN {new_col} TEXT;")
                conn.commit()
            except Exception:
                pass

            # Create index on charity_case_no now that column existence is guaranteed
            conn.execute("CREATE INDEX IF NOT EXISTS idx_referrals_charity_case ON financial_referrals(charity_case_no);")
            conn.commit()

            # Seed default official clinical referral if empty
            cur = conn.execute("SELECT COUNT(*) FROM financial_referrals")
            count = cur.fetchone()[0]
            if count == 0:
                now = _utc_now()
                default_particulars = json.dumps([
                    {"description": "Operating Room & Surgical Microscope Fee", "amount": 4500},
                    {"description": "Foldable Acrylic Intraocular Lens (IOL) Pack", "amount": 3500},
                    {"description": "Ophthalmic Viscosurgical Device (OVD) & Consumables", "amount": 1800},
                    {"description": "Post-Operative Med Pack (Moxifloxacin + Prednisolone)", "amount": 1800},
                ])
                # Referral 1 for Juan Dela Cruz
                conn.execute(
                    """
                    INSERT INTO financial_referrals (
                        id, referral_no, patient_id, patient_name, diagnosis, eye_laterality,
                        procedure, clinical_findings, particulars, total, requested_amount,
                        attending_doctor, doctor_signature_title, referring_individual,
                        referring_signature_title, status, assessment_id, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
                    """,
                    (
                        "OFPHIL-FA-2026-0001",
                        "REF-2026-0001",
                        "M26-11-00001",
                        "Juan Santos Dela Cruz",
                        "Bilateral Cataract, Senile Mature (OD > OS)",
                        "OD (Right Eye)",
                        "Phacoemulsification with Foldable IOL Implant (OD)",
                        "Grade 4 nuclear sclerotic cataract with significant visual acuity reduction (OD 20/200). Urgent surgery required.",
                        default_particulars,
                        11600.0,
                        11600.0,
                        "Dr. J. E. Garcia, MD",
                        "Attending Eye Surgeon • License No. 0089421",
                        "Dr. Roberto Reyes, MD, DPBO",
                        "Clinic Medical Administrator & Ophthalmologist",
                        "Awaiting MSW Review",
                        "Physician endorsed for immediate charity subsidy casework.",
                        "2026-11-22T08:30:00Z",
                        "2026-11-22T08:30:00Z",
                    ),
                )
                # Referral for Charity patient Maria Clara Ramos
                conn.execute(
                    """
                    INSERT INTO financial_referrals (
                        id, referral_no, patient_id, patient_name, diagnosis, eye_laterality,
                        procedure, clinical_findings, particulars, total, requested_amount,
                        attending_doctor, doctor_signature_title, referring_individual,
                        referring_signature_title, status, assessment_id, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
                    """,
                    (
                        "OFPHIL-FA-2026-0002",
                        "REF-2026-0002",
                        "M26-11-00002",
                        "Maria Clara Ramos",
                        "Mature Senile Cataract, Left Eye (OS)",
                        "OS (Left Eye)",
                        "Extracapsular Cataract Extraction with Posterior Chamber IOL (OS)",
                        "Dense corticonuclear cataract, visual acuity OS HM (Hand Movement). Patient unable to afford commercial hospital quotation.",
                        default_particulars,
                        11600.0,
                        11600.0,
                        "Dr. J. E. Garcia, MD",
                        "Attending Eye Surgeon • License No. 0089421",
                        "Dr. Roberto Reyes, MD, DPBO",
                        "Clinic Medical Administrator & Ophthalmologist",
                        "Awaiting MSW Review",
                        "Endorsed by Clinic Director for DOH/Charity financial tiering.",
                        "2026-11-23T08:00:00Z",
                        "2026-11-23T08:00:00Z",
                    ),
                )
                conn.commit()

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        if isinstance(d.get("particulars"), str):
            try:
                d["particulars"] = json.loads(d["particulars"])
            except Exception:
                d["particulars"] = []
        return d

    def get_patient_assistance_history(
        self, patient_id: str, exclude_referral_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Determines the patient's assistance history using the permanent Patient ID.
        Counts qualifying previous financial assistance referrals or cases belonging to that patient.
        Excludes:
          - The current referral being evaluated (exclude_referral_id)
          - Duplicate records
          - Unrelated regular clinical encounters or ordinary visits
        """
        clean_pid = (patient_id or "").strip()
        if not clean_pid:
            return {
                "classification": "HISTORY NOT AVAILABLE",
                "badge_label": "HISTORY NOT AVAILABLE",
                "is_first_assistance": False,
                "is_repeat_assistance": False,
                "total_previous_requests": 0,
                "previous_msw_approved_cases": 0,
                "previous_final_approved_grants": 0,
                "most_recent_request_date": None,
                "history": [],
            }

        # Check if patient exists in registered patients registry
        from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
        patient_entry = next(
            (
                p for p in REGISTERED_PATIENTS_REGISTRY
                if str(p.get("patient_id") or "").strip().upper() == clean_pid.upper()
                or str(p.get("charity_case_no") or "").strip().upper() == clean_pid.upper()
                or str(p.get("id") or "").strip().lower() == clean_pid.lower()
            ),
            None,
        )

        canonical_pid = str(patient_entry.get("patient_id")) if patient_entry else clean_pid
        alt_pid = str(patient_entry.get("charity_case_no")) if patient_entry and patient_entry.get("charity_case_no") else clean_pid

        with self._connect() as conn:
            # Query all referrals for this patient (matching either canonical ID or historical case number)
            rows = conn.execute(
                "SELECT * FROM financial_referrals WHERE UPPER(patient_id) = UPPER(?) OR UPPER(patient_id) = UPPER(?) ORDER BY created_at DESC",
                (canonical_pid, alt_pid),
            ).fetchall()
            all_refs = [self._row_to_dict(r) for r in rows]

        # Filter out current referral if specified
        qualifying_refs = [
            r for r in all_refs
            if not (exclude_referral_id and (r["id"] == exclude_referral_id or r["referral_no"] == exclude_referral_id))
        ]

        # Count Disapproved and Promissory in referrals
        disapproved_referrals_count = sum(
            1 for r in qualifying_refs if "DISAPPROVED" in str(r.get("status", "")).upper()
        )
        promissory_referrals_count = sum(
            1 for r in qualifying_refs if "PROMISSORY" in str(r.get("status", "")).upper()
        )

        # Also check encounters in patient registry for previous charity applications & decisions
        reg_encounters = (patient_entry.get("encounters") if patient_entry else []) or []
        enc_disapproved = sum(
            1 for e in reg_encounters if "DISAPPROVED" in str(e.get("status", "")).upper() and "PROMISSORY" not in str(e.get("status", "")).upper()
        )
        enc_promissory = sum(
            1 for e in reg_encounters if "PROMISSORY" in str(e.get("status", "")).upper()
        )
        enc_charity_approved = sum(
            1 for e in reg_encounters if str(e.get("status", "")).upper() in {"APPROVED", "FINAL_APPROVED"} and e.get("classification") == "CHARITY"
        )

        # 1. Total previous assistance requests (qualifying referrals + qualifying charity encounters not in referrals)
        if not exclude_referral_id and qualifying_refs:
            pending_refs = [r for r in qualifying_refs if r.get("status") in {"Awaiting MSW Review", "Endorsed for Financial Assistance"}]
            if pending_refs:
                qualifying_refs = [r for r in qualifying_refs if r["id"] != pending_refs[0]["id"]]

        # Total previous requests: sum of distinct historical financial referrals plus non-referral charity applications
        total_prev_requests = max(len(qualifying_refs), len([e for e in reg_encounters if e.get("classification") == "CHARITY"]))

        # 2. Previously MSW-Approved Cases
        prev_msw_approved = sum(
            1 for r in qualifying_refs
            if r.get("status") in {"MSW APPROVED", "Assessment in Progress", "Referred for Administrative Decision", "Approved", "Assessed"}
            or bool(r.get("charity_case_no"))
        )
        if patient_entry and patient_entry.get("category") == "CHARITY" and patient_entry.get("charity_case_no"):
            prev_msw_approved = max(prev_msw_approved, 1)

        # 3. Previously Approved Charity Grants
        from app.services.assessment_service import assessment_service
        patient_assessments = assessment_service.list_assessments(patient_id=canonical_pid)
        if not patient_assessments and alt_pid != canonical_pid:
            patient_assessments = assessment_service.list_assessments(patient_id=alt_pid)

        approved_assessments = [
            a for a in patient_assessments
            if (a.get("workflow_status") or "").upper() == "APPROVED"
        ]
        prev_final_grants = max(len(approved_assessments), enc_charity_approved)

        # 4. Disapproved Cases & Promissory Cases
        disapproved_cases = max(disapproved_referrals_count, enc_disapproved)
        promissory_cases = max(promissory_referrals_count, enc_promissory)

        most_recent_date = None
        if qualifying_refs:
            most_recent_date = qualifying_refs[0].get("created_at")
        elif reg_encounters:
            most_recent_date = reg_encounters[0].get("encounter_date")

        # Determine Specific Badges and Labels
        disapproved_badge = None
        if disapproved_cases > 0:
            plural = "CASE" if disapproved_cases == 1 else "CASES"
            disapproved_badge = f"PREVIOUSLY DISAPPROVED — {disapproved_cases} {plural}"

        promissory_badge = None
        if promissory_cases > 0:
            plural = "CASE" if promissory_cases == 1 else "CASES"
            promissory_badge = f"PREVIOUS PROMISSORY — {promissory_cases} {plural}"

        # Classify overall assistance
        if total_prev_requests == 0 and prev_msw_approved == 0 and prev_final_grants == 0 and disapproved_cases == 0 and promissory_cases == 0:
            classification = "FIRST ASSISTANCE"
            badge_label = "FIRST ASSISTANCE"
            is_first = True
            is_repeat = False
        else:
            is_first = False
            is_repeat = True
            count = max(total_prev_requests, prev_msw_approved, disapproved_cases + promissory_cases)
            classification = "REPEAT ASSISTANCE"
            plural = "REQUEST" if count == 1 else "REQUESTS"
            badge_label = f"REPEAT ASSISTANCE — {count} PREVIOUS {plural}"

        return {
            "classification": classification,
            "badge_label": badge_label,
            "is_first_assistance": is_first,
            "is_repeat_assistance": is_repeat,
            "total_previous_requests": total_prev_requests,
            "previous_msw_approved_cases": prev_msw_approved,
            "previous_final_approved_grants": prev_final_grants,
            "disapproved_cases": disapproved_cases,
            "promissory_cases": promissory_cases,
            "disapproved_badge": disapproved_badge,
            "promissory_badge": promissory_badge,
            "most_recent_request_date": most_recent_date,
            "history": qualifying_refs,
        }

    def list_referrals(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            if patient_id:
                rows = conn.execute(
                    "SELECT * FROM financial_referrals WHERE UPPER(patient_id) = UPPER(?) ORDER BY created_at DESC",
                    (patient_id.strip(),),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM financial_referrals ORDER BY created_at DESC"
                ).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_referral(self, referral_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM financial_referrals WHERE id = ? OR referral_no = ?",
                (referral_id.strip(), referral_id.strip()),
            ).fetchone()
            if not row:
                return None
            ref = self._row_to_dict(row)
            # Attach audit history
            audit_rows = conn.execute(
                "SELECT * FROM referral_status_audit WHERE referral_id = ? ORDER BY created_at ASC",
                (ref["id"],),
            ).fetchall()
            ref["status_history"] = [dict(a) for a in audit_rows]
            return ref

    def create_referral(self, payload: Dict[str, Any], actor_id: str, role: str) -> Dict[str, Any]:
        ref_id = payload.get("id") or f"OFPHIL-FA-{uuid.uuid4().hex[:6].upper()}"
        ref_no = payload.get("referral_no") or f"REF-{uuid.uuid4().hex[:6].upper()}"
        patient_id = payload.get("patient_id", "").strip()

        # Enforce: one active unapproved referral per patient at a time
        if patient_id:
            with self._connect() as conn:
                existing_pending = conn.execute(
                    """
                    SELECT id, referral_no, status FROM financial_referrals
                    WHERE UPPER(patient_id) = UPPER(?)
                      AND UPPER(status) IN ('AWAITING MSW REVIEW', 'ENDORSED FOR FINANCIAL ASSISTANCE', 'NEW', 'PENDING')
                    LIMIT 1
                    """,
                    (patient_id,),
                ).fetchone()
                if existing_pending:
                    raise ValueError(
                        "An existing financial assistance referral is awaiting MSW review. "
                        "You can create another referral once the current referral has been approved."
                    )
        patient_name = payload.get("patient_name", "").strip()
        diagnosis = payload.get("diagnosis", "").strip()
        eye_laterality = payload.get("eye_laterality", "Bilateral").strip()
        procedure = payload.get("procedure", "").strip()
        clinical_findings = payload.get("clinical_findings", "").strip()
        particulars = payload.get("particulars", [])
        total = float(payload.get("total") or 0.0)
        requested_amount = float(payload.get("requested_amount") or total)
        attending_doctor = payload.get("attending_doctor", "Dr. J. E. Garcia, MD").strip()
        doctor_signature_title = payload.get("doctor_signature_title", "Attending Eye Surgeon").strip()
        referring_individual = payload.get("referring_individual", "Dr. Roberto Reyes, MD, DPBO").strip()
        referring_signature_title = payload.get("referring_signature_title", "Clinic Medical Administrator").strip()
        status_val = payload.get("status", "Awaiting MSW Review")
        notes = payload.get("notes", "").strip()
        now = _utc_now()

        particulars_str = json.dumps(particulars) if not isinstance(particulars, str) else particulars

        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO financial_referrals (
                    id, referral_no, patient_id, patient_name, diagnosis, eye_laterality,
                    procedure, clinical_findings, particulars, total, requested_amount,
                    attending_doctor, doctor_signature_title, referring_individual,
                    referring_signature_title, status, assessment_id, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
                """,
                (
                    ref_id,
                    ref_no,
                    patient_id,
                    patient_name,
                    diagnosis,
                    eye_laterality,
                    procedure,
                    clinical_findings,
                    particulars_str,
                    total,
                    requested_amount,
                    attending_doctor,
                    doctor_signature_title,
                    referring_individual,
                    referring_signature_title,
                    status_val,
                    notes,
                    now,
                    now,
                ),
            )
            audit_id = f"aud-{uuid.uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO referral_status_audit (id, referral_id, old_status, new_status, changed_by, role, reason, created_at)
                VALUES (?, ?, 'NONE', ?, ?, ?, 'Referral created and endorsed', ?)
                """,
                (audit_id, ref_id, status_val, actor_id, role, now),
            )
            conn.commit()

        return self.get_referral(ref_id) or {}

    def update_referral_status(
        self,
        referral_id: str,
        new_status: str,
        actor_id: str,
        role: str,
        reason: str = "",
        assessment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM financial_referrals WHERE id = ? OR referral_no = ?",
                (referral_id.strip(), referral_id.strip()),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Referral record not found.")

            canonical_id = row["id"]
            old_status = row["status"]
            now = _utc_now()

            update_fields = ["status = ?", "updated_at = ?"]
            params: List[Any] = [new_status, now]

            if assessment_id:
                update_fields.append("assessment_id = ?")
                params.append(assessment_id)

            params.append(canonical_id)

            conn.execute(
                f"UPDATE financial_referrals SET {', '.join(update_fields)} WHERE id = ?",
                tuple(params),
            )

            audit_id = f"aud-{uuid.uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO referral_status_audit (id, referral_id, old_status, new_status, changed_by, role, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (audit_id, canonical_id, old_status, new_status, actor_id, role, reason, now),
            )
            conn.commit()

        return self.get_referral(canonical_id) or {}

    def approve_referral(
        self,
        referral_id: str,
        actor_id: str,
        role: str,
        notes: str = "",
        expected_patient_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        MSW Approval of a physician-endorsed financial assistance referral.
        Enforces:
          1. Authenticated MSW role validation.
          2. Referral existence check.
          3. Rejection / prior approval check.
          4. Referral patient matching validation.
          5. Atomic transaction & unique Charity Case Number generation.
          6. Referral status update to 'MSW APPROVED'.
          7. Audit logging.
        """
        role_norm = (role or "").strip().lower()
        if role_norm != "msw":
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: Only licensed Medical Social Workers (MSW) can approve financial assistance referrals.",
            )

        with self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            row = conn.execute(
                "SELECT * FROM financial_referrals WHERE id = ? OR referral_no = ?",
                (referral_id.strip(), referral_id.strip()),
            ).fetchone()
            if not row:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Referral record not found.")

            canonical_id = row["id"]
            current_status = row["status"]
            patient_id = row["patient_id"]
            existing_case_no = row["charity_case_no"]

            # Validate patient match if passed
            if expected_patient_id and expected_patient_id.strip().upper() != patient_id.strip().upper():
                conn.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Patient ID mismatch: referral belongs to '{patient_id}', not '{expected_patient_id}'.",
                )

            # Check if rejected
            if current_status == "MSW REJECTED":
                conn.rollback()
                raise HTTPException(
                    status_code=400,
                    detail="Cannot approve a referral that has already been rejected.",
                )

            # Idempotency / Duplicate Prevention: If already MSW APPROVED, return existing without re-generating
            if current_status == "MSW APPROVED" and existing_case_no:
                conn.rollback()
                return self.get_referral(canonical_id) or {}

            # Determine / Generate Charity Case Number (Format MSW_FA_MMYY-XX)
            from app.api.v1.endpoints.endpoints import (
                REGISTERED_PATIENTS_REGISTRY,
                generate_next_charity_case_no,
            )

            target_case_no = existing_case_no
            if not target_case_no:
                # Check all existing case numbers in DB and registry
                all_case_rows = conn.execute(
                    "SELECT charity_case_no FROM financial_referrals WHERE charity_case_no IS NOT NULL"
                ).fetchall()
                extra_cases = [r[0] for r in all_case_rows if r[0]]
                simulated_registry = list(REGISTERED_PATIENTS_REGISTRY)
                for ec in extra_cases:
                    simulated_registry.append({"patient_id": ec})
                target_case_no = generate_next_charity_case_no(registry=simulated_registry)

            now = _utc_now()
            conn.execute(
                """
                UPDATE financial_referrals
                SET status = 'MSW APPROVED',
                    charity_case_no = ?,
                    approved_by = ?,
                    approved_at = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (target_case_no, actor_id, now, now, canonical_id),
            )

            audit_id = f"aud-{uuid.uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO referral_status_audit (id, referral_id, old_status, new_status, changed_by, role, reason, created_at)
                VALUES (?, ?, ?, 'MSW APPROVED', ?, ?, ?, ?)
                """,
                (
                    audit_id,
                    canonical_id,
                    current_status,
                    actor_id,
                    role,
                    notes or f"MSW approved referral and generated Charity Case Number: {target_case_no}",
                    now,
                ),
            )
            conn.commit()

        # Update Registered Patients Registry in memory if patient is present
        try:
            from app.api.v1.endpoints.endpoints import REGISTERED_PATIENTS_REGISTRY
            for p in REGISTERED_PATIENTS_REGISTRY:
                if str(p.get("patient_id") or "").strip().upper() == patient_id.strip().upper():
                    p["category"] = "CHARITY"
                    p["charity_case_no"] = target_case_no
                    # Add encounter or note if needed
                    encs = p.setdefault("encounters", [])
                    has_enc = any(e.get("charity_case_no") == target_case_no for e in encs)
                    if not has_enc:
                        encs.insert(0, {
                            "id": f"ENC-{target_case_no}",
                            "charity_case_no": target_case_no,
                            "encounter_date": now[:10],
                            "application_type": "Charity Surgical Grant Application",
                            "diagnosis": row["diagnosis"],
                            "procedure": row["procedure"],
                            "attending_doctor": row["attending_doctor"],
                            "classification": "CHARITY",
                            "total_amount": row["total"],
                            "approved_financial_assistance": 0.0,
                            "status": "MSW APPROVED",
                            "assigned_msw": actor_id,
                            "notes": f"Approved from Referral {canonical_id}",
                        })
                    break
        except Exception:
            pass

        # Send MSW and Patient notifications
        try:
            from app.services.inquiry_service import inquiry_service
            inquiry_service.create_msw_notification(
                recipient_user_id=actor_id,
                notification_type="REFERRAL_UPDATED",
                title=f"Referral Approved: {target_case_no}",
                message=f"Referral {canonical_id} for {row['patient_name']} ({patient_id}) has been approved as Charity Case {target_case_no}.",
                target_destination=f"/patients/{patient_id}?tab=assessment",
                related_patient_id=patient_id,
                related_encounter_id=target_case_no,
            )
        except Exception:
            pass

        return self.get_referral(canonical_id) or {}

    def reject_referral(
        self,
        referral_id: str,
        actor_id: str,
        role: str,
        reason: str = "Disapproved after MSW clinical review",
    ) -> Dict[str, Any]:
        """
        MSW Rejection of a financial assistance referral.
        """
        role_norm = (role or "").strip().lower()
        if role_norm != "msw":
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: Only licensed Medical Social Workers (MSW) can reject financial assistance referrals.",
            )

        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM financial_referrals WHERE id = ? OR referral_no = ?",
                (referral_id.strip(), referral_id.strip()),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Referral record not found.")

            canonical_id = row["id"]
            current_status = row["status"]
            now = _utc_now()

            conn.execute(
                """
                UPDATE financial_referrals
                SET status = 'MSW REJECTED',
                    rejected_by = ?,
                    rejected_at = ?,
                    rejection_reason = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (actor_id, now, reason, now, canonical_id),
            )

            audit_id = f"aud-{uuid.uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO referral_status_audit (id, referral_id, old_status, new_status, changed_by, role, reason, created_at)
                VALUES (?, ?, ?, 'MSW REJECTED', ?, ?, ?, ?)
                """,
                (audit_id, canonical_id, current_status, actor_id, role, reason, now),
            )
            conn.commit()

        return self.get_referral(canonical_id) or {}

    def link_assessment(
        self, referral_id: str, assessment_id: str, actor_id: str, role: str
    ) -> Dict[str, Any]:
        return self.update_referral_status(
            referral_id=referral_id,
            new_status="Assessment in Progress",
            actor_id=actor_id,
            role=role,
            reason=f"MSW launched/linked Assessment {assessment_id}",
            assessment_id=assessment_id,
        )


referral_service = ReferralService()
