import contextlib
import datetime
import re
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from zoneinfo import ZoneInfo

from app.core.paths import STORAGE_DIR

PATIENT_ID_PATTERN = re.compile(r"^M(\d{2})-(\d{2})-(\d{6})$")
INSTITUTIONAL_TZ = ZoneInfo("Asia/Manila")
_LOCK = threading.Lock()


class PatientIDService:
    """Backend-controlled, concurrency-safe sequential Patient ID generator (MYY-MM-XXXXXX)."""

    def __init__(self, db_path: Optional[Path] = None, tz: ZoneInfo = INSTITUTIONAL_TZ):
        self.db_path = db_path or (STORAGE_DIR / "inquiries.db")
        self.tz = tz
        self._init_db()

    def _connect(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), timeout=10.0, isolation_level=None)
        conn.row_factory = sqlite3.Row
        return contextlib.closing(conn)

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS patient_id_sequences (
                    year_month TEXT PRIMARY KEY,
                    last_seq INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS registered_patient_ids (
                    patient_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL
                )
                """
            )

    def _current_year_month(self, now: Optional[datetime.datetime] = None) -> tuple[str, str, str]:
        dt = now.astimezone(self.tz) if now else datetime.datetime.now(self.tz)
        yy = dt.strftime("%y")
        mm = dt.strftime("%m")
        return yy, mm, f"{yy}-{mm}"

    @staticmethod
    def _extract_valid_seq(patient_id: str, yy: str, mm: str) -> int:
        pid = str(patient_id or "").strip().upper()
        m = PATIENT_ID_PATTERN.match(pid)
        if not m:
            return 0
        if m.group(1) != yy or m.group(2) != mm:
            return 0
        seq = int(m.group(3))
        # Ignore malformed legacy seed IDs >= 100000 when no real sequence has reached it
        if seq >= 100000:
            return 0
        return seq

    def _max_existing_seq(
        self,
        conn: sqlite3.Connection,
        yy: str,
        mm: str,
        registry: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> int:
        ym = f"{yy}-{mm}"
        max_seq = 0

        row = conn.execute(
            "SELECT last_seq FROM patient_id_sequences WHERE year_month = ?",
            (ym,),
        ).fetchone()
        if row and row["last_seq"] is not None:
            max_seq = max(max_seq, int(row["last_seq"]))

        prefix = f"M{ym}-"
        for table in ("registered_patient_ids", "financial_referrals"):
            try:
                rows = conn.execute(
                    f"SELECT patient_id FROM {table} WHERE patient_id LIKE ?",
                    (f"{prefix}%",),
                ).fetchall()
                for r in rows:
                    max_seq = max(max_seq, self._extract_valid_seq(r[0], yy, mm))
            except sqlite3.OperationalError:
                pass

        if registry is not None:
            for item in registry:
                max_seq = max(max_seq, self._extract_valid_seq(item.get("patient_id", ""), yy, mm))

        return max_seq

    def preview_next_patient_id(
        self,
        registry: Optional[List[Dict[str, Any]]] = None,
        now: Optional[datetime.datetime] = None,
    ) -> str:
        """Returns the next MYY-MM-XXXXXX ID without consuming or incrementing the sequence."""
        yy, mm, ym = self._current_year_month(now)
        with _LOCK, self._connect() as conn:
            max_seq = self._max_existing_seq(conn, yy, mm, registry)
        return f"M{ym}-{max_seq + 1:06d}"

    def reserve_next_patient_id(
        self,
        registry: Optional[List[Dict[str, Any]]] = None,
        now: Optional[datetime.datetime] = None,
        max_retries: int = 10,
    ) -> str:
        """Atomically reserves and returns the next unique MYY-MM-XXXXXX ID."""
        yy, mm, ym = self._current_year_month(now)
        with _LOCK, self._connect() as conn:
            for _ in range(max_retries):
                try:
                    conn.execute("BEGIN IMMEDIATE")
                    max_seq = self._max_existing_seq(conn, yy, mm, registry)
                    next_seq = max_seq + 1
                    candidate = f"M{ym}-{next_seq:06d}"
                    now_iso = datetime.datetime.now(self.tz).isoformat()

                    conn.execute(
                        "INSERT INTO registered_patient_ids (patient_id, created_at) VALUES (?, ?)",
                        (candidate, now_iso),
                    )
                    conn.execute(
                        """
                        INSERT INTO patient_id_sequences (year_month, last_seq)
                        VALUES (?, ?)
                        ON CONFLICT(year_month) DO UPDATE SET last_seq = MAX(last_seq, excluded.last_seq)
                        """,
                        (ym, next_seq),
                    )
                    conn.execute("COMMIT")
                    return candidate
                except sqlite3.IntegrityError:
                    conn.execute("ROLLBACK")
                    continue
                except Exception:
                    conn.execute("ROLLBACK")
                    raise
        raise RuntimeError("Failed to reserve unique Patient ID after maximum retries.")

    def record_assigned_patient_id(self, patient_id: str, now: Optional[datetime.datetime] = None) -> None:
        """Records an explicitly provided valid Patient ID so sequence monotonicity is preserved."""
        pid = str(patient_id or "").strip().upper()
        m = PATIENT_ID_PATTERN.match(pid)
        if not m:
            return
        ym = f"{m.group(1)}-{m.group(2)}"
        seq = int(m.group(3))
        if seq >= 100000:
            return
        now_iso = (now.astimezone(self.tz) if now else datetime.datetime.now(self.tz)).isoformat()
        with _LOCK, self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            try:
                conn.execute(
                    "INSERT OR IGNORE INTO registered_patient_ids (patient_id, created_at) VALUES (?, ?)",
                    (pid, now_iso),
                )
                conn.execute(
                    """
                    INSERT INTO patient_id_sequences (year_month, last_seq)
                    VALUES (?, ?)
                    ON CONFLICT(year_month) DO UPDATE SET last_seq = MAX(last_seq, excluded.last_seq)
                    """,
                    (ym, seq),
                )
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise


patient_id_service = PatientIDService()
