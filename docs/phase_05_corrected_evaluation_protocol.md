# Phase 05 — Corrected Model Evaluation Protocol (Tabular Only)

**Project:** `ofphil-classification-v2`  
**Scope:** Phase 05 Tabular Classification Pipeline  
**Target Variable:** `eligibility` (Binary: `ELIGIBLE` = 1, `INELIGIBLE` = 0)  
**Input Features:** `data/interim/features/selected_features.csv` (48 selected predictors)  
**Evaluation Standard:** Nested Stratified Cross-Validation ($K_{\text{outer}}=10, K_{\text{inner}}=5$)  

---

## 1. Principles of Evaluation

To ensure statistically rigorous, publication-grade, and defensible results, all tabular models must adhere to the following protocol:

1. **Strict Partition Segregation:**
   - **Development Partition ($N=350$):** Used exclusively for cross-validation, feature preprocessing fitting, inner hyperparameter tuning, and model selection.
   - **Independent Validation Set ($N=75$):** Reserved for cross-model calibration and post-tuning comparative threshold analysis.
   - **Untouched Test Set ($N=75$):** Stored under `data/processed/splits/test/` and strictly reserved for final publication evaluation. Never used for training, feature selection, or hyperparameter tuning.

2. **Nested Cross-Validation Architecture:**
   - **Outer Loop:** Stratified 10-Fold CV ($K=10$, shuffle=True, random_state=42) loaded from `data/processed/splits/cv_split_indices.json`. Produces out-of-fold generalization metrics.
   - **Inner Loop:** Stratified 5-Fold CV ($K=5$, shuffle=True, random_state=42) executed *strictly inside* each outer fold's training indices ($N=315$) via `GridSearchCV` / `RandomizedSearchCV` to optimize model hyperparameters.

3. **Leakage-Free Preprocessing with `ColumnTransformer`:**
   - **Continuous Features (13 `xf_*` variables):** Scaled using `StandardScaler` fitted only on inner/outer training folds.
   - **Binary & One-Hot Features (35 `ohe_*`, `is_*`, `has_*` variables):** Passed through unscaled (`passthrough`) to maintain 0/1 indicator sparsity and linear interpretability.

4. **Dual-Perspective Performance Reporting:**
   - For every fold, both **Training Score** and **Validation Score** must be recorded.
   - **Generalization Gap ($\Delta = \text{Score}_{\text{train}} - \text{Score}_{\text{val}}$)** must be tracked to detect overfitting or high variance.

5. **Diagnostic Visualizations per Model:**
   - **Figure 1 (Train vs Val & Benchmark):** Subplot 1 shows train vs. validation trajectory across 10 folds; Subplot 2 shows mean CV performance with standard deviation error bars.
   - **Figure 2 (Confusion Matrix & ROC):** Out-of-fold normalized confusion matrix and empirical ROC curve with AUC annotation.
   - **Figure 3 (Per-Class Performance):** Precision, Recall, and F1 comparisons for `INELIGIBLE` vs `ELIGIBLE`.
   - **Figure 4 (Feature Importance & Learning Curves):** Top 15 feature coefficients/importances and learning curve (sample size vs. validation score).

---

## 2. Model-Specific Tuning Grids & Pipeline Specifications

### 2.1 Baseline Models
- **Logistic Regression:**
  - Pipeline: `ColumnTransformer(num_scaler)` + `LogisticRegression(penalty='l2', solver='lbfgs', max_iter=1000)`
  - Inner Grid: `C` $\in [0.001, 0.01, 0.1, 1.0, 10.0]$
- **Decision Tree:**
  - Pipeline: `ColumnTransformer(num_scaler)` + `DecisionTreeClassifier(random_state=42)`
  - Inner Grid: `max_depth` $\in [3, 5, 8, 12, \text{None}]$, `min_samples_split` $\in [2, 5, 10]$, `criterion` $\in [\text{'gini'}, \text{'entropy'}]$
- **Random Forest:**
  - Pipeline: `ColumnTransformer(num_scaler)` + `RandomForestClassifier(random_state=42, n_jobs=-1)`
  - Inner Grid: `n_estimators` $\in [100, 200]$, `max_depth` $\in [5, 10, \text{None}]$, `min_samples_leaf` $\in [1, 2, 4]$
- **Support Vector Machine (RBF):**
  - Pipeline: `ColumnTransformer(num_scaler)` + `SVC(kernel='rbf', probability=True, random_state=42)`
  - Inner Grid: `C` $\in [0.1, 1.0, 10.0]$, `gamma` $\in [\text{'scale'}, \text{'auto'}, 0.01, 0.1]$

### 2.2 Gradient Boosting & Interpretable Models
- **XGBoost:**
  - Inner Grid: `n_estimators` $\in [100, 200]$, `learning_rate` $\in [0.01, 0.05, 0.1]$, `max_depth` $\in [3, 5, 7]$, `subsample` $\in [0.8, 1.0]$
- **CatBoost:**
  - Inner Grid: `iterations` $\in [200, 500]$, `learning_rate` $\in [0.03, 0.08, 0.15]$, `depth` $\in [4, 6, 8]$
- **Explainable Boosting Machine (EBM):**
  - Inner Grid: `max_bins` $\in [128, 256]$, `interactions` $\in [5, 10]$, `learning_rate` $\in [0.01, 0.05]$

---

## 3. Reporting and Export Artifacts

All model evaluation artifacts must be stored strictly within standardized project paths:
- Metrics JSON: `models/trained/baselines/<model_key>_metrics.json`
- Summary Tables: `reports/phase_05/visualizations/<model_key>/evaluation_summary_table.csv`
- Figures (PNG @ 300 DPI & Vector PDF): `reports/phase_05/visualizations/<model_key>/`
  - `01_cv_train_val_and_benchmark.{png,pdf}`
  - `02_confusion_matrix_and_roc.{png,pdf}`
  - `03_per_class_performance.{png,pdf}`
  - `04_feature_importance_and_learning_curve.{png,pdf}`

---

*Approved for Phase 05 Tabular Model Selection and Training.*
