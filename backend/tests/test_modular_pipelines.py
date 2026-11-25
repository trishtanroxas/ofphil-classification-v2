import pytest
import numpy as np

# Test imports directly from the consolidated backend.app.services architecture
from app.services.document_screening import DocumentScreeningPipeline
from app.services.interview_assistant import InterviewAssistantPipeline
from app.services.eligibility_classification import EligibilityClassificationPipeline
from app.shared.schemas import (
    DocumentScreeningResult,
    PatientInterviewExtraction,
    EligibilityPredictionOutput,
)

def test_document_screening_pipeline_scaffold():
    pipeline = DocumentScreeningPipeline()
    dummy_img = np.zeros((600, 800, 3), dtype=np.uint8)
    res = pipeline.process_document(
        image=dummy_img,
        document_id="TEST-DOC-001",
        filename="sample_indigency.png",
        doc_type="barangay_indigency",
        expected_patient_name="Juan Dela Cruz"
    )
    assert isinstance(res, DocumentScreeningResult)
    assert res.document_id == "TEST-DOC-001"
    assert len(res.detected_elements) >= 1
    assert isinstance(res.validation_flags, list)

def test_interview_assistant_pipeline_extraction():
    pipeline = InterviewAssistantPipeline()
    dialogue = "Anim kami sa pamilya at ang buwanang kita ko sa pamamasada ay 12,000 pesos."
    turn = pipeline.process_interview_turn(history="", patient_statement=dialogue)
    assert "follow_up_question" in turn
    assert turn["is_valid"] is True
    data = turn["extracted_data"]
    assert data["household_size"] == 6
    assert data["monthly_household_income"] == 12000.0

def test_eligibility_classification_pipeline_models():
    for model_name in ["RandomForest", "CatBoost", "ExplainableBoostingMachine"]:
        pipeline = EligibilityClassificationPipeline(model_name=model_name)
        record = {
            "age": 55,
            "monthly_household_income": 8000.0,
            "household_size": 4,
            "num_dependents": 2,
        }
        pred = pipeline.predict_patient_eligibility("M26-11-00001", record)
        assert isinstance(pred, EligibilityPredictionOutput)
        assert pred.predicted_eligible is True
        assert pred.subsidy_percentage > 0.0
        assert pred.msw_review_required is True
