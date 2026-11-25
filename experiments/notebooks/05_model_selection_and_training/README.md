# Phase 05 — Model Selection and Training

## Overview
Phase 05 houses two **independent** tracks:
1. **Track C — Charity Patient Eligibility Classification:** Strictly **Random Forest (RF)**, **CatBoost**, and **Explainable Boosting Machine (EBM)**.
2. **Track B — LLM-Powered Patient Interview Assistant (`07_llm_interview_assistant/`):** **Qwen3-4B-Instruct-2507** (Ollama / llama.cpp) for conversational intake and structured JSON extraction.

*Note: Logistic Regression, Decision Tree, SVM, and XGBoost are excluded from the active model comparison. The LLM Interview Assistant is never mixed into the eligibility classification comparison.*

## Active Notebook Structure

```text
05_model_selection_and_training/
│
├── 01_training_data_setup.ipynb
├── 02_random_forest.ipynb
├── 03_catboost.ipynb
├── 04_explainable_boosting_machine.ipynb
├── 05_model_comparison_and_tuning.ipynb
├── 06_final_model_evaluation.ipynb
├── 07_llm_interview_assistant/
│   ├── 01_qwen_model_selection_and_setup.ipynb
│   ├── 02_interview_prompt_engineering.ipynb
│   ├── 03_interview_conversation_and_followup_generation.ipynb
│   ├── 04_structured_response_extraction_and_validation.ipynb
│   └── 05_llm_interview_assistant_evaluation.ipynb
├── 08_sbert_semantic_text_processing/
│   ├── 01_sbert_model_selection_and_setup.ipynb
│   ├── 02_text_preprocessing_and_embedding_generation.ipynb
│   ├── 03_semantic_similarity_analysis.ipynb
│   ├── 04_interview_text_representation.ipynb
│   └── 05_sbert_evaluation.ipynb
└── README.md
```
