import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
MSW_HEADERS = {"x-user-role": "msw", "x-user-id": "msw_test"}
PATIENT_HEADERS = {"x-user-role": "patient", "x-user-id": "patient_01"}


def _make_sample_document_png() -> bytes:
    img = Image.new("RGB", (400, 300), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "BARANGAY INDIGENCY CERTIFICATE", fill="black")
    draw.text((20, 60), "Patient: Juan Dela Cruz", fill="black")
    # Draw a signature-like stroke in the lower half (y > 165)
    draw.line([(60, 220), (120, 205), (170, 230), (220, 210)], fill="black", width=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_document_authenticity_full_flow():
    png_bytes = _make_sample_document_png()

    # 1. Valid upload
    r_up = client.post(
        "/api/v1/documents/upload",
        files={"file": ("indigency_cert.png", png_bytes, "image/png")},
        data={
            "document_type": "SIGNED CERTIFICATE OF INDIGENCY",
            "patient_id": "M26-11-00001",
            "patient_name": "Juan Dela Cruz",
        },
        headers=MSW_HEADERS,
    )
    assert r_up.status_code == 201
    doc = r_up.json()
    doc_id = doc["id"]
    assert doc["sha256_hash"] is not None
    assert doc["signature_status"] == "NOT_CHECKED"

    # 2. Unauthorized access check (Patient role cannot download or review or process)
    r_unauth_proc = client.post(f"/api/v1/documents/{doc_id}/process", json={}, headers=PATIENT_HEADERS)
    assert r_unauth_proc.status_code == 403

    r_unauth_dl = client.get(f"/api/v1/documents/{doc_id}/download", headers=PATIENT_HEADERS)
    assert r_unauth_dl.status_code == 403

    # 3. Trigger processing (TestClient executes FastAPI BackgroundTasks synchronously)
    r_proc = client.post(
        f"/api/v1/documents/{doc_id}/process",
        json={"ocr_engine": "auto", "run_forensics": True, "run_signature_detection": True},
        headers=MSW_HEADERS,
    )
    assert r_proc.status_code == 200

    # 4. Check processing status
    r_stat = client.get(f"/api/v1/documents/{doc_id}/processing-status", headers=MSW_HEADERS)
    assert r_stat.status_code == 200
    assert r_stat.json()["processing_status"] == "COMPLETED"

    # 5. Check OCR results
    r_ocr = client.get(f"/api/v1/documents/{doc_id}/ocr-results", headers=MSW_HEADERS)
    assert r_ocr.status_code == 200
    assert r_ocr.json()["processing_status"] == "COMPLETED"

    # 6. Check signature results
    r_sig = client.get(f"/api/v1/documents/{doc_id}/signature-results", headers=MSW_HEADERS)
    assert r_sig.status_code == 200
    assert r_sig.json()["signature_status"] in {
        "SIGNATURE_DETECTED",
        "SIGNATURE_NOT_FOUND",
        "REQUIRES_MANUAL_REVIEW",
        "UNVERIFIABLE",
    }

    # 7. Check authenticity results
    r_auth = client.get(f"/api/v1/documents/{doc_id}/authenticity-results", headers=MSW_HEADERS)
    assert r_auth.status_code == 200
    assert r_auth.json()["overall_status"] in {
        "NO_ISSUE_DETECTED",
        "REQUIRES_REVIEW",
        "VERIFICATION_FAILED",
        "UNVERIFIABLE",
    }

    # 8. Record manual review
    r_rev = client.post(
        f"/api/v1/documents/{doc_id}/review",
        json={
            "decision": "ACCEPTED",
            "review_notes": "Verified barangay seal and wet signature against physical copy.",
            "reviewer_name": "Maria Santos, RSW",
        },
        headers=MSW_HEADERS,
    )
    assert r_rev.status_code == 200
    assert r_rev.json()["review_decision"] == "ACCEPTED"

    # 9. Download original immutable file
    r_dl = client.get(f"/api/v1/documents/{doc_id}/download", headers=MSW_HEADERS)
    assert r_dl.status_code == 200
    assert r_dl.content == png_bytes

    # Cleanup test document
    client.delete(f"/api/v1/documents/{doc_id}", headers=MSW_HEADERS)


def test_invalid_file_upload_rejected():
    r_bad = client.post(
        "/api/v1/documents/upload",
        files={"file": ("fake.png", b"NOT A REAL PNG FILE", "image/png")},
        data={"document_type": "GOVERNMENT ISSUED ID", "patient_id": "M26-11-00001"},
        headers=MSW_HEADERS,
    )
    assert r_bad.status_code == 415
