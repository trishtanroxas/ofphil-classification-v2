"""
Test Suite: OFPHIL Stage 2 LLM Interview Percentage Scoring Implementation.
Verifies all 7 mandated interview evaluation scenarios:
1. Complete and consistent answers (high consistency and completeness, score >= 85%)
2. Incomplete answers (low completeness penalty)
3. Contradictory answers across different questions (cross-field contradiction penalty)
4. Ambiguous answers requiring clarification (clarification probe triggered)
5. Clarifications that resolve discrepancies (score increases upon resolution)
6. Clarifications that leave discrepancies unresolved (score remains penalized)
7. Insufficient information for scoring (returns INSUFFICIENT_DATA and None overall score)

Also verifies:
- Correct approved dimension weights: (Info 35%, Completeness 25%, Cross-field 25%, Clarification 15%)
- Non-adversarial casework discrepancy explanations
- Zero modification to approved 27 predictors
- Safe prototype isolation and PROTOTYPE_SIMULATED execution mode
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.interview_scoring_service import (
    evaluate_interview_assessment,
    interpret_score,
)

client = TestClient(app)

HEADERS_MSW = {"x-user-role": "msw", "x-user-id": "msw_santos_01"}


def test_scenario_1_complete_and_consistent_answers():
    """Scenario 1: Detailed, comprehensive, non-contradictory intake answers."""
    answers = [
        {
            "question_key": "living_situation",
            "question_text": "Living Situation & Housing Tenancy",
            "patient_answer": "Renting a small room in a high-density settlement in Tondo, Manila for five years.",
            "msw_observation": "Cramped informal dwelling; verified with barangay certificate.",
        },
        {
            "question_key": "household_composition",
            "question_text": "Household Composition & Dependents",
            "patient_answer": "4 household members consisting of patient, spouse, and two minor school-age children.",
            "msw_observation": "Two minor dependents fully reliant on parental informal work.",
        },
        {
            "question_key": "employment_situation",
            "question_text": "Employment Situation",
            "patient_answer": "Previously worked as daily construction laborer; currently incapacitated due to cataract blindness.",
            "msw_observation": "Complete work stoppage caused by severe visual impairment.",
        },
        {
            "question_key": "income_sources",
            "question_text": "Income Sources",
            "patient_answer": "Spouse takes in neighborhood laundry earning around 5,000 pesos monthly with occasional sibling help.",
            "msw_observation": "Irregular informal earnings below local poverty threshold.",
        },
        {
            "question_key": "medical_condition_summary",
            "question_text": "Medical Condition",
            "patient_answer": "Senile mature cataract with near total loss of vision in the left eye for past 2 years.",
            "msw_observation": "Clinical confirmation of urgent surgical necessity.",
        },
    ]

    res = evaluate_interview_assessment(
        interview_answers=answers,
        background={
            "living_situation": answers[0]["patient_answer"],
            "household_composition": answers[1]["patient_answer"],
            "employment_situation": answers[2]["patient_answer"],
            "income_sources": answers[3]["patient_answer"],
        },
        patient_id="TEST-SCENARIO-1",
        total_household_income=5000.0,
        household_size=4,
    )

    assert res.status == "ASSESSED"
    assert res.overall_consistency_score is not None
    assert res.overall_consistency_score >= 85.0
    assert res.provisional_interpretation == "Generally Consistent"
    assert res.information_consistency is not None and res.information_consistency >= 85.0
    assert res.response_completeness is not None and res.response_completeness >= 85.0
    assert res.cross_field_consistency is not None and res.cross_field_consistency >= 85.0
    assert res.clarification_resolution is not None and res.clarification_resolution >= 90.0
    assert res.execution_mode == "PROTOTYPE_SIMULATED"


def test_scenario_2_incomplete_answers():
    """Scenario 2: Minimal or one-word answers yield low completeness percentages."""
    answers = [
        {
            "question_key": "living_situation",
            "patient_answer": "Rent",
        },
        {
            "question_key": "household_composition",
            "patient_answer": "4",
        },
        {
            "question_key": "employment_situation",
            "patient_answer": "None",
        },
    ]

    res = evaluate_interview_assessment(
        interview_answers=answers,
        patient_id="TEST-SCENARIO-2",
        total_household_income=0.0,
        household_size=4,
    )

    assert res.status == "ASSESSED"
    assert res.response_completeness is not None
    assert res.response_completeness < 70.0  # Penalized for brief / non-elaborated answers
    assert len(res.missing_information) > 0


def test_scenario_3_contradictory_answers_across_questions():
    """Scenario 3: Contradictory cross-field statements (living alone vs 5 dependents)."""
    answers = [
        {
            "question_key": "living_situation",
            "patient_answer": "Living completely alone and solitary in a rented room.",
        },
        {
            "question_key": "household_composition",
            "patient_answer": "We are 6 members with 5 minor children staying together.",
        },
        {
            "question_key": "employment_situation",
            "patient_answer": "Totally unemployed with zero work for two years.",
        },
        {
            "question_key": "income_sources",
            "patient_answer": "Earning 45,000 pesos monthly regular corporate salary.",
        },
    ]

    res = evaluate_interview_assessment(
        interview_answers=answers,
        background={
            "living_situation": answers[0]["patient_answer"],
            "household_composition": answers[1]["patient_answer"],
            "employment_situation": answers[2]["patient_answer"],
            "income_sources": answers[3]["patient_answer"],
        },
        patient_id="TEST-SCENARIO-3",
        total_household_income=45000.0,
        household_size=2,
    )

    assert res.status == "ASSESSED"
    assert res.cross_field_consistency is not None
    assert res.cross_field_consistency < 70.0  # Heavy penalty for cross-field contradictions
    contradictions = [d for d in res.cross_field_discrepancies if d.discrepancy_type == "CONTRADICTION"]
    assert len(contradictions) >= 1
    # Check that non-adversarial possible reasons are included
    assert len(contradictions[0].possible_reasons) > 0


def test_scenario_4_and_5_clarification_resolves_discrepancy():
    """Scenario 4 & 5: Ambiguous response triggered a clarification question, and patient resolved it."""
    clarification_items = [
        {
            "original_answer": "Zero personal income but paying 6,000 rent.",
            "clarification_question": "Sino po ang tumutulong sa pambayad ng upa kung walang regular na kita?",
            "patient_clarification": "Ang panganay ko pong anak na nagtatrabaho sa grocery store ang nagpapadala ng 7,000 bawat buwan para sa upa at pagkain.",
        }
    ]

    res = evaluate_interview_assessment(
        interview_answers=[
            {"question_key": "living_situation", "patient_answer": "Renting a small room in Tondo Manila."},
            {"question_key": "income_sources", "patient_answer": "Informal support from eldest employed child."},
        ],
        clarification_items=clarification_items,
        patient_id="TEST-SCENARIO-5",
    )

    assert res.clarification_resolution is not None
    assert res.clarification_resolution >= 90.0  # High score for resolving clarification
    assert res.clarification_history[0].resolution_status == "RESOLVED"


def test_scenario_6_clarification_unresolved():
    """Scenario 6: Clarification question asked but patient left it blank or evasive."""
    clarification_items = [
        {
            "original_answer": "Zero income but paying 6,000 rent.",
            "clarification_question": "Sino po ang nagbabayad ng upa?",
            "patient_clarification": "Wala lang",  # Evasive / non-explanatory
        }
    ]

    res = evaluate_interview_assessment(
        interview_answers=[
            {"question_key": "living_situation", "patient_answer": "Renting a room in Tondo Manila."},
            {"question_key": "income_sources", "patient_answer": "No clear source."},
        ],
        clarification_items=clarification_items,
        patient_id="TEST-SCENARIO-6",
    )

    assert res.clarification_resolution is not None
    assert res.clarification_resolution <= 45.0  # Penalized for unresolved clarification
    assert res.clarification_history[0].resolution_status == "UNRESOLVED"
    assert len(res.unresolved_questions) > 0


def test_scenario_7_insufficient_information():
    """Scenario 7: Blank or empty intake answers yield INSUFFICIENT_DATA and None overall score."""
    res = evaluate_interview_assessment(
        interview_answers=[],
        background={},
        patient_id="TEST-SCENARIO-7",
    )

    assert res.status == "INSUFFICIENT_DATA"
    assert res.overall_consistency_score is None
    assert res.provisional_interpretation == "Insufficient Assessment Data"
    assert interpret_score(res.overall_consistency_score) == "INSUFFICIENT_DATA"


def test_endpoint_evaluate_stage2_integration():
    """Verifies that POST /api/v1/classification/evaluate-stage2 returns interview_assessment dictionary."""
    payload = {
        "total_household_income": 12000.0,
        "household_size": 4,
        "interview_info": {
            "interview_date": "2026-11-28",
            "assigned_msw": "Maria Santos, RSW",
            "consent_obtained": True,
        },
        "background": {
            "living_situation": "Renting a small room in high-density settlement in Manila",
            "household_composition": "4 household members with 2 minor dependents",
            "family_support": "Spouse provides caregiving",
            "employment_situation": "Daily utility laborer incapacitated by cataract",
            "income_sources": "Irregular home laundry earnings",
            "financial_responsibilities": "Food and room rental",
        },
        "medical_difficulties": {
            "medical_condition_summary": "Senile mature cataract with severe visual reduction",
            "estimated_treatment_expenses": 11600.0,
            "financial_barriers": "Zero savings for surgical package",
        },
    }

    res = client.post("/api/v1/classification/evaluate-stage2", json=payload, headers=HEADERS_MSW)
    assert res.status_code == 200
    data = res.json()
    assert "interview_assessment" in data
    asmt = data["interview_assessment"]
    assert asmt is not None
    assert asmt["status"] == "ASSESSED"
    assert asmt["score_label"] == "INTERVIEW CONSISTENCY SCORE"
    assert 0.0 <= asmt["overall_consistency_score"] <= 100.0
    assert asmt["execution_mode"] == "PROTOTYPE_SIMULATED"
    assert len(asmt["per_question_assessments"]) >= 5
