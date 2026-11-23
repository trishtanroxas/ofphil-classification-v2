# OFPHIL V2 — Phase 05 Track B: LLM Interview Assistant Integration Report

**Date:** November 23, 2026  
**Project:** `ofphil-classification-v2`  
**Phase:** 05 Model Selection and Training  
**Track:** Track B — LLM Interview Assistant (`06_llm_interview_assistant/`)  
**Status:** **READY FOR MANUAL EXECUTION**  
**Audit Protocol:** Static Code Verification Only (Zero-Execution Protocol)

---

## 1. Architectural Role Separation

The OFPHIL V2 research lifecycle maintains two decoupled, parallel model tracks under Phase 05:

| Property | Track A: Eligibility Classification Models | Track B: LLM Interview Assistant |
|:---|:---|:---|
| **Role & Purpose** | Predict charity assistance eligibility (`ELIGIBLE` vs `INELIGIBLE`) using validated intake features. | Act as a conversational copilot for licensed Medical Social Workers (MSWs) during Stage 2 intake. |
| **Model Families** | Logistic Regression, Decision Tree, Random Forest, SVM, XGBoost, CatBoost, EBM, Multimodal Fusion. | Large Language Models (Qwen 2.5 7B, Llama 3.1 8B, Gemini 1.5 Flash). |
| **Output Format** | Binary classification probabilities and deterministic scores. | Conversational follow-up suggestions (Taglish) and Pydantic JSON extracted dossiers. |
| **Evaluation Metrics** | ROC-AUC, PR-AUC, F1-Score, Brier Score, Balanced Accuracy. | Conversational Relevance (1–5), Factual Faithfulness, Schema Compliance, Taglish Fluency, Latency. |
| **Authority** | Quantitative empirical recommendation subject to policy thresholds. | Human-in-the-loop copilot; **zero** autonomous approval/rejection authority. |
| **Benchmarking** | 5-Fold Stratified Cross-Validation (`07_model_comparison_and_tuning.ipynb`). | 10 Synthetic Clinical Stress-Test Cases (`05_llm_interview_assistant_evaluation.ipynb`). |

---

## 2. Updated Phase 05 Directory Structure

```text
05_model_selection_and_training/
├── 01_training_data_setup.ipynb
│
├── 02_baseline_models/
│   ├── 01_logistic_regression.ipynb
│   ├── 02_decision_tree.ipynb
│   ├── 03_random_forest.ipynb
│   └── 04_svm.ipynb
│
├── 03_gradient_boosting_models/
│   ├── 01_xgboost.ipynb
│   └── 02_catboost.ipynb
│
├── 04_interpretable_models/
│   └── 01_explainable_boosting_machine.ipynb
│
├── 05_multimodal_fusion/
│   └── 01_multimodal_model_training.ipynb
│
├── 06_llm_interview_assistant/
│   ├── 01_llm_model_selection_and_setup.ipynb
│   ├── 02_interview_prompt_engineering.ipynb
│   ├── 03_interview_conversation_and_followup_generation.ipynb
│   ├── 04_structured_response_extraction_and_validation.ipynb
│   └── 05_llm_interview_assistant_evaluation.ipynb
│
├── 07_model_comparison_and_tuning.ipynb
└── 08_final_model_evaluation.ipynb
```

---

## 3. Overview of the Five LLM Notebooks

### 1. `01_llm_model_selection_and_setup.ipynb`
- **Focus:** Evaluates edge local models (Llama 3.1 8B, Qwen 2.5 7B, Mistral 7B) vs cloud APIs (Gemini 1.5 Flash, GPT-4o-mini).
- **Evaluation Criteria:** Hardware footprint, inference latency, Tagalog/Taglish fluency, JSON schema mode, data privacy/HIPAA compliance, and operational cost.
- **Architectural Decision:** Recommends a hybrid-agnostic architecture: on-premise Qwen 2.5 7B / Llama 3.1 8B via Ollama for zero data egress, with Gemini 1.5 Flash available as an anonymized cloud baseline.
- **Artifacts:** `model_selection_matrix.csv`, `llm_configuration.json`.

### 2. `02_interview_prompt_engineering.ipynb`
- **Focus:** Implements the core MSW System Prompt and multi-domain structured intake templates.
- **Guardrails Enforced:** Zero eligibility prediction, zero automated severity/coping scoring, zero hallucinated facts, and preservation of raw patient voice.
- **Domains Covered:** Medical Information, Socioeconomic Circumstances, Financial Livelihood & Debt, Household Dependency, Psychosocial Dynamics.
- **Artifacts:** `msw_assistant_system_prompt.txt`, `domain_interview_prompts.json`, `followup_generation_prompts.json`.

### 3. `03_interview_conversation_and_followup_generation.ipynb`
- **Focus:** Multi-turn dialogue state tracking (`InterviewSessionState`, `DialogueTurn`).
- **Human-in-the-Loop Workflow:** Enables the MSW to accept, edit, or reject proposed Taglish follow-up questions.
- **Context Tracking:** Prevents repetitive questions by auditing confirmed entities against incoming statements.
- **Artifacts:** `simulated_interview_traces.json`.

### 4. `04_structured_response_extraction_and_validation.ipynb`
- **Focus:** Converts free-text patient statements into structured Pydantic JSON schemas.
- **Separation of Disclosures:** Explicitly separates patient-provided statements from caseworker observational notes.
- **Audit Provenance:** Links every extracted entity to its verbatim raw quote and requires caseworker sign-off (`msw_verified`).
- **Artifacts:** `extracted_interview_schema.json`, `validated_extraction_sample.json`.

### 5. `05_llm_interview_assistant_evaluation.ipynb`
- **Focus:** Qualitative and quantitative evaluation across 10 synthetic challenging interview test cases (ambiguous income, contradictory statements, severe caregiving stress, emotional distress).
- **Evaluation Rubric:** Conversational Relevance (1–5), Factual Faithfulness (0–1), Schema Compliance (0–1), Linguistic Fluency (1–5), Latency (seconds), and MSW Acceptance Rate.
- **Artifacts:** `llm_test_cases.json`, `evaluation_benchmark_results.csv`, `llm_evaluation_summary.json`.

---

## 4. Expected Output Artifacts

All research outputs are organized under `data/interim/llm_interview/`:

```text
data/interim/llm_interview/
├── model_selection_matrix.csv
├── config/
│   └── llm_configuration.json
├── prompts/
│   ├── msw_assistant_system_prompt.txt
│   ├── domain_interview_prompts.json
│   └── followup_generation_prompts.json
├── conversations/
│   └── simulated_interview_traces.json
├── schemas/
│   └── extracted_interview_schema.json
├── extractions/
│   └── validated_extraction_sample.json
└── evaluation/
    ├── llm_test_cases.json
    ├── evaluation_benchmark_results.csv
    └── llm_evaluation_summary.json
```

---

## 5. Static Verification Evidence

Programmatic static AST and JSON structure verification (`verify_llm_notebooks.py`) confirmed:

```text
--- 01_llm_model_selection_and_setup.ipynb ---
Total cells: 7, Code cells: 3 (unexecuted & valid AST)

--- 02_interview_prompt_engineering.ipynb ---
Total cells: 9, Code cells: 4 (unexecuted & valid AST)

--- 03_interview_conversation_and_followup_generation.ipynb ---
Total cells: 9, Code cells: 4 (unexecuted & valid AST)

--- 04_structured_response_extraction_and_validation.ipynb ---
Total cells: 7, Code cells: 3 (unexecuted & valid AST)

--- 05_llm_interview_assistant_evaluation.ipynb ---
Total cells: 7, Code cells: 3 (unexecuted & valid AST)

All 5 LLM Interview Assistant notebooks PASSED static verification.
```

---

## 6. Documented Limitations & Manual Execution Protocol

1. **No External Network Calls / Large Weights Download:** The notebooks run completely offline using deterministic simulation engines and static templates. When integrating live inference in the clinic, Ollama or the local vLLM server should be started in the background.
2. **RAG Vector Database Deferred:** In accordance with project instructions, RAG is excluded from this initial implementation and reserved for when institutional clinical policy handbooks are formally approved.
3. **Caseworker Primacy:** All outputs generated by the LLM are decision-support suggestions; the human caseworker remains the sole authority for patient intake and assessment.
