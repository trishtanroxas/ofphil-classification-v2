import concurrent.futures
import datetime
import tempfile
import unittest
from pathlib import Path
from zoneinfo import ZoneInfo

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.patient_id_service import PatientIDService


class TestPatientIDGeneration(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmpdir.name) / "test_patients.db"
        self.service = PatientIDService(db_path=self.db_path, tz=ZoneInfo("Asia/Manila"))

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_first_and_second_registration_in_new_month(self):
        nov_2026 = datetime.datetime(2026, 11, 25, 10, 0, tzinfo=ZoneInfo("Asia/Manila"))
        first = self.service.reserve_next_patient_id(now=nov_2026)
        second = self.service.reserve_next_patient_id(now=nov_2026)
        self.assertEqual(first, "M26-11-000001")
        self.assertEqual(second, "M26-11-000002")
        self.assertEqual(len(first.split("-")[-1]), 6)

    def test_ignores_malformed_100000_seed(self):
        nov_2026 = datetime.datetime(2026, 11, 25, 10, 0, tzinfo=ZoneInfo("Asia/Manila"))
        registry = [{"patient_id": "M26-11-100000"}]
        first = self.service.reserve_next_patient_id(registry=registry, now=nov_2026)
        self.assertEqual(first, "M26-11-000001")

    def test_dynamic_month_and_year_rollover(self):
        nov_2026 = datetime.datetime(2026, 11, 30, 23, 59, tzinfo=ZoneInfo("Asia/Manila"))
        dec_2026 = datetime.datetime(2026, 12, 1, 0, 1, tzinfo=ZoneInfo("Asia/Manila"))
        jan_2027 = datetime.datetime(2027, 1, 1, 0, 1, tzinfo=ZoneInfo("Asia/Manila"))

        self.assertEqual(self.service.reserve_next_patient_id(now=nov_2026), "M26-11-000001")
        self.assertEqual(self.service.reserve_next_patient_id(now=dec_2026), "M26-12-000001")
        self.assertEqual(self.service.reserve_next_patient_id(now=jan_2027), "M27-01-000001")

    def test_preview_does_not_consume_id_and_matches_reservation(self):
        nov_2026 = datetime.datetime(2026, 11, 25, 10, 0, tzinfo=ZoneInfo("Asia/Manila"))
        p1 = self.service.preview_next_patient_id(now=nov_2026)
        p2 = self.service.preview_next_patient_id(now=nov_2026)
        self.assertEqual(p1, "M26-11-000001")
        self.assertEqual(p2, "M26-11-000001")
        reserved = self.service.reserve_next_patient_id(now=nov_2026)
        self.assertEqual(reserved, p1)

    def test_deleted_record_does_not_reuse_sequence(self):
        nov_2026 = datetime.datetime(2026, 11, 25, 10, 0, tzinfo=ZoneInfo("Asia/Manila"))
        first = self.service.reserve_next_patient_id(now=nov_2026)
        self.assertEqual(first, "M26-11-000001")
        # Simulate deletion by passing an empty registry
        second = self.service.reserve_next_patient_id(registry=[], now=nov_2026)
        self.assertEqual(second, "M26-11-000002")

    def test_concurrent_registrations_produce_unique_ids(self):
        nov_2026 = datetime.datetime(2026, 11, 25, 10, 0, tzinfo=ZoneInfo("Asia/Manila"))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: self.service.reserve_next_patient_id(now=nov_2026), range(20)))
        self.assertEqual(len(results), 20)
        self.assertEqual(len(set(results)), 20)
        self.assertEqual(sorted(results)[0], "M26-11-000001")
        self.assertEqual(sorted(results)[-1], "M26-11-000020")


if __name__ == "__main__":
    unittest.main()
