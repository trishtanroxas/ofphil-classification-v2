# Phase 05 Implementation Report — Evaluation Visualizations and Stratified 10-Fold Cross-Validation

**Project:** `ofphil-classification-v2`  
**Phase:** 05 — Model Selection and Training (Tabular Only)  
**Date:** 2026-11-24  
**Pipeline Focus:** Charity Patient Eligibility Classification via Structured Tabular Predictors  
**Target Variable:** `eligibility` (Binary: `ELIGIBLE` [1], `INELIGIBLE` [0])  
**Cross-Validation Protocol:** Stratified 10-Fold Cross-Validation ($K=10$, `shuffle=True`, `random_state=42`)  
**Execution Policy:** Staged for manual execution in JupyterLab by researcher; **Zero model execution / inference performed**.

---

## 1. Executive Summary

This report documents the restructuring and enhancement of all active Phase 05 tabular classification notebooks in `ofphil-classification-v2`. Per research directives:
1. All 10 active notebooks have been transitioned to **Stratified 10-Fold Cross-Validation ($K=10$)** applied strictly to the training development partition ($N=350$).
2. A complete, academic evaluation and visualization section using **Matplotlib** and **Seaborn** (v0.13.2) was added to the end of every relevant notebook.
3. Every figure is saved automatically in both **PNG (300 DPI)** and **PDF (publication-ready)** formats to dedicated subdirectories under `reports/phase_05/visualizations/`, alongside CSV summary tables.
4. **Multimodal fusion** remains completely deleted from active workflows and git staging.
5. The **Stage 2 LLM Interview Assistant track** (`06_llm_interview_assistant/`) remains preserved intact.
6. All 10 notebooks were statically verified using Python 3.12 AST compilation and strict cleanliness checks (all `outputs: []`, all `execution_count: null`).

---

## 2. Updated Notebook List & Scope

The active Phase 05 directory contains exactly 10 tabular notebooks:

| Module | Notebook File | Architecture / Purpose | Cross-Validation | Visualization Figures Exported |
| :--- | :--- | :--- | :--- | :--- |
| **05.01** | `01_training_data_setup.ipynb` | Partitioning & Data Verification | Stratified 10-Fold ($N=350$) | Overall Class Distribution, Partition Counts, Fold Heatmap, Proportions |
| **05.02.01** | `02_baseline_models/01_logistic_regression.ipynb` | L2 Logistic Regression | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Per-Class Metrics, Coefficients |
| **05.02.02** | `02_baseline_models/02_decision_tree.ipynb` | Decision Tree (Gini) | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Per-Class Metrics, Gini Importances |
| **05.02.03** | `02_baseline_models/03_random_forest.ipynb` | Random Forest (Bagging) | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Per-Class Metrics, MDI Importances |
| **05.02.04** | `02_baseline_models/04_svm.ipynb` | SVM (RBF Kernel + Platt Scaling) | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Per-Class Metrics |
| **05.03.01** | `03_gradient_boosting_models/01_xgboost.ipynb` | XGBoost (`XGBClassifier`) | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Per-Class Metrics, Gain Importances |
| **05.03.02** | `03_gradient_boosting_models/02_catboost.ipynb` | CatBoost (`CatBoostClassifier`) | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Per-Class Metrics, PredictionShift Importances |
| **05.04.01** | `04_interpretable_models/01_explainable_boosting_machine.ipynb` | Explainable Boosting Machine | Stratified 10-Fold ($N=350$) | 10-Fold Trajectory, Mean+/-Std, Confusion Matrix, ROC, Global Terms, Local Sample Explanation |
| **05.07** | `07_model_comparison_and_tuning.ipynb` | 7-Model Benchmark Dashboard | 10-Fold Comparison | 8 Graphs (Macro F1, Accuracy, Prec/Rec, Stability, Boxplots, Class Recall, Latency, Ranking) |
| **05.08** | `08_final_model_evaluation.ipynb` | Champion Test Evaluation | Unsealed Test ($N=75$) | 11 Graphs (Raw CM, Norm CM, Per-Class, ROC, PR, Summary, Act vs Pred, Confidence, Errors, CV vs Test, Gap) |

---

## 3. Stratified 10-Fold Cross-Validation Implementation Details

### A. Precondition Verification
- Target Variable: `eligibility` (0: `INELIGIBLE`, 1: `ELIGIBLE`).
- Class Balance in Training Development Set ($N=350$): Exactly 175 INELIGIBLE and 175 ELIGIBLE instances.
- Precondition Check Passed: Both classes exceed the mandatory minimum of $\ge 10$ instances per class.

### B. Configuration & Fold Characteristics
```python
from sklearn.model_selection import StratifiedKFold

CV_CONFIG = {
    "n_splits": 10,
    "shuffle": True,
    "random_state": 42
}
skf = StratifiedKFold(
    n_splits=CV_CONFIG["n_splits"],
    shuffle=CV_CONFIG["shuffle"],
    random_state=CV_CONFIG["random_state"]
)
```
- Each fold validation slice contains exactly 35 records (either 17 ELIGIBLE / 18 INELIGIBLE or 18 ELIGIBLE / 17 INELIGIBLE), maintaining near-exact 50.0% class parity ($48.6\%$ to $51.4\%$).
- All 10 model notebooks import the exact same fold assignments from `data/processed/splits/cv_split_indices.json`, guaranteeing strictly paired statistical evaluations.

---

## 4. Visualization Directory Structure & Graph Exports

All visualization scripts save high-resolution figures in both **PNG (300 DPI)** and **PDF (publication-ready vector)**:

```text
reports/phase_05/visualizations/
├── training_data_setup/
│   ├── target_class_distribution_overall.{png,pdf}
│   ├── partition_sample_and_class_distribution.{png,pdf}
│   ├── stratified_10fold_heatmap.{png,pdf}
│   ├── stratified_10fold_proportions.{png,pdf}
│   └── data_setup_summary_table.csv
├── logistic_regression/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── feature_importance.{png,pdf}
│   └── evaluation_summary_table.csv
├── decision_tree/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── feature_importance.{png,pdf}
│   └── evaluation_summary_table.csv
├── random_forest/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── feature_importance.{png,pdf}
│   └── evaluation_summary_table.csv
├── svm/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── feature_importance.{png,pdf}
│   └── evaluation_summary_table.csv
├── xgboost/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── feature_importance.{png,pdf}
│   └── evaluation_summary_table.csv
├── catboost/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── feature_importance.{png,pdf}
│   └── evaluation_summary_table.csv
├── explainable_boosting_machine/
│   ├── 10fold_performance_metrics.{png,pdf}
│   ├── confusion_matrix_and_roc.{png,pdf}
│   ├── per_class_performance.{png,pdf}
│   ├── global_feature_importance.{png,pdf}
│   ├── local_explanation_sample.{png,pdf}
│   └── evaluation_summary_table.csv
├── model_comparison/
│   ├── graph1_macro_f1_comparison.{png,pdf}
│   ├── graph2_accuracy_comparison.{png,pdf}
│   ├── graph3_precision_recall_comparison.{png,pdf}
│   ├── graph4_cv_stability_trajectories.{png,pdf}
│   ├── graph5_fold_f1_boxplots.{png,pdf}
│   ├── graph6_class_recall_comparison.{png,pdf}
│   ├── graph7_inference_latency.{png,pdf}
│   ├── graph8_final_model_ranking.{png,pdf}
│   └── model_comparison_summary_table.csv
└── final_model_evaluation/
    ├── graph1_final_confusion_matrix.{png,pdf}
    ├── graph2_normalized_confusion_matrix.{png,pdf}
    ├── graph3_per_class_metrics.{png,pdf}
    ├── graph4_test_roc_curve.{png,pdf}
    ├── graph5_test_pr_curve.{png,pdf}
    ├── graph6_performance_summary.{png,pdf}
    ├── graph7_actual_vs_predicted_distribution.{png,pdf}
    ├── graph8_prediction_confidence_distribution.{png,pdf}
    ├── graph9_error_case_analysis.{png,pdf}
    ├── graph10_cv_vs_test_comparison.{png,pdf}
    ├── graph11_generalization_gap.{png,pdf}
    └── final_test_summary_table.csv
```

---

## 5. Model Comparison Dashboard Specifications (05.07)

`07_model_comparison_and_tuning.ipynb` compares the 7 tabular models:
1. **Graph 1 — Macro F1 Comparison:** Bar chart with $\pm 1$ standard deviation error bars.
2. **Graph 2 — Accuracy Comparison:** Bar chart of mean 10-fold accuracy with error bars.
3. **Graph 3 — Precision vs Recall Comparison:** Grouped bars of Macro Precision and Macro Recall.
4. **Graph 4 — CV Stability Trajectories:** Multi-line chart tracking Macro F1 across Folds 1 through 10 for all 7 architectures.
5. **Graph 5 — Performance Distribution:** Seaborn boxplots with overlaid jitter points showing the 10-fold distribution.
6. **Graph 6 — Class-Level Performance:** Per-class recall comparison between Eligible (charity aid) and Ineligible.
7. **Graph 7 — Inference Latency:** Measured wall-clock time in milliseconds across the 10-fold CV run.
8. **Graph 8 — Final Model Ranking:** Horizontal ranking bar chart identifying the empirical Champion Model.
- **Statistical Significance:** Paired t-tests and Wilcoxon signed-rank tests computed across identical fold score distributions against the leading model ($p < 0.05$).

---

## 6. Final Champion Model Test Evaluation Specifications (05.08)

`08_final_model_evaluation.ipynb` evaluates the frozen champion on the quarantined test partition ($N=75$):
- **Graph 1 & 2:** Raw count and normalized confusion matrices.
- **Graph 3:** Per-class test precision, recall, and F1-score.
- **Graph 4 & 5:** Test ROC-AUC curve and Precision-Recall curve.
- **Graph 6:** Comprehensive test performance bar summary.
- **Graph 7 & 8:** Ground-truth vs predicted class counts and prediction confidence histogram.
- **Graph 9:** Clinical error classification (True Positives, False Positives, False Negatives, True Negatives).
- **Graph 10 & 11:** 10-Fold CV mean vs final test metrics and Generalization Gap analysis (flagging gaps $> 0.05$).

---

## 7. Static Validation Verification

Automated validation via `scripts/validate_phase05_notebooks.py` confirmed:
- **JSON Validity:** 10/10 notebooks are valid Jupyter Notebook format (`nbformat: 4`, `nbformat_minor: 5`).
- **AST Compilation:** 10/10 notebooks passed Python 3.12 abstract syntax tree compilation without syntax errors.
- **Unexecuted State:** All code cells have `execution_count: null` and `outputs: []`. Zero notebooks were executed during implementation.
- **Multimodal Deletion:** Verified that `05_multimodal_fusion` is completely absent.
- **LLM Assistant Preservation:** Verified that `06_llm_interview_assistant` contains all 5 original notebooks intact.

---

## 8. Manual Execution Instructions for the Researcher

To execute the Phase 05 experiments in JupyterLab, run the notebooks in the following strict chronological sequence:

1. **Step 1:** Open and execute `01_training_data_setup.ipynb`  
   *Output:* Persists `cv_split_indices.json` with Stratified 10-Fold CV assignments and renders Figures 1 to 4.
2. **Step 2:** Open and execute baseline model notebooks (`02_baseline_models/`):  
   - `01_logistic_regression.ipynb`
   - `02_decision_tree.ipynb`
   - `03_random_forest.ipynb`
   - `04_svm.ipynb`  
   *Output:* Saves fold metrics and renders 4 figures per notebook under `reports/phase_05/visualizations/<model>/`.
3. **Step 3:** Open and execute gradient boosting notebooks (`03_gradient_boosting_models/`):  
   - `01_xgboost.ipynb`
   - `02_catboost.ipynb`  
   *Output:* Saves boosting metrics and renders 4 figures per notebook under `reports/phase_05/visualizations/<model>/`.
4. **Step 4:** Open and execute interpretable model notebook (`04_interpretable_models/`):  
   - `01_explainable_boosting_machine.ipynb`  
   *Output:* Saves EBM metrics and renders Figures 1 to 5 (including local additive explanations).
5. **Step 5:** Open and execute `07_model_comparison_and_tuning.ipynb`  
   *Output:* Aggregates the 7 model JSONs, runs paired Wilcoxon/t-tests, renders Graphs 1 to 8, designates the Champion Model, and exports `model_comparison_summary.json`.
6. **Step 6:** Open and execute `08_final_model_evaluation.ipynb`  
   *Output:* Unseals the quarantined test partition ($N=75$), fits the champion on all 350 development samples, renders Graphs 1 to 11, and exports `final_test_evaluation_report.json`.
