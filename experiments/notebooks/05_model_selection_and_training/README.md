# Phase 05 — Model Selection & Training

## Approved Classification Models (Stratified 5-Fold CV + Calibration Analysis)
1. **Logistic Regression** (`02_logistic_regression.ipynb`) — Baseline classifier
2. **CatBoost** (`03_catboost.ipynb`) — Gradient boosting classifier
3. **Explainable Boosting Machine (EBM)** (`04_explainable_boosting_machine.ipynb`) — Interpretable classifier
4. **Soft-Voting Ensemble** (`05_soft_voting_ensemble.ipynb`) — Equal-weight probability ensemble: `(P_LR + P_CatBoost + P_EBM) / 3`

## Model Comparison & Final Evaluation
- `06_model_comparison_and_tuning.ipynb` (Stratified 5-Fold CV + Brier Score, Log Loss, ECE, Reliability Diagram)
- `07_final_model_evaluation.ipynb` (Untouched final test partition + 15 thesis-ready figures)

## Independent LLM Interview Assistant
- `08_llm_interview_assistant/` (`Qwen3-4B` / `qwen3:4b-instruct-2507` — not mixed with tabular classification)
