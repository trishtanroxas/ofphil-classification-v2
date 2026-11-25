# Phase 05 — Model Selection and Training

## Overview
Phase 05 establishes the active supervised machine learning models for Charity Patient Eligibility Classification.

In accordance with the approved architecture, the active candidate models are strictly:
1. **Random Forest (RF)** — Non-linear tree ensemble baseline
2. **CatBoost** — Advanced categorical gradient boosted decision tree classifier
3. **Explainable Boosting Machine (EBM)** — Glassbox interpretable Generalized Additive Model ($GA^2M$)

*Note: Logistic Regression, Decision Tree, SVM, and XGBoost have been removed from the active model comparison pipeline and archived. The LLM Interview Assistant is maintained as an independent operational module outside the tabular classification comparison.*

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
└── README.md
```

## Notebook Responsibilities
1. **01_training_data_setup.ipynb**: Loads prepared development cohorts, verifies class balance, ensures strict leakage-free features, and partitions datasets into nested cross-validation folds.
2. **02_random_forest.ipynb**: Evaluates Random Forest ensemble under nested stratified 10-fold cross-validation with Brier score and calibration analysis.
3. **03_catboost.ipynb**: Evaluates CatBoost gradient boosting, managing categorical interactions and optimal split depths.
4. **04_explainable_boosting_machine.ipynb**: Trains EBM glassbox classifier, generating feature shape functions and interaction heatmaps for clinical social work auditability.
5. **05_model_comparison_and_tuning.ipynb**: Benchmark comparison across RF, CatBoost, and EBM under identical CV splits, comparing Accuracy, Precision, Recall, F1, ROC-AUC, Brier score, and calibration curves.
6. **06_final_model_evaluation.ipynb**: Final validation of the selected model on the untouched test partition, computing publication-ready visualizations and confusion matrices.
