# Phase 05 Dataset Leakage, Integrity, and Overfitting Investigation

**Project:** `ofphil-classification-v2`  
**Phase:** 05 — Tabular Model Selection, Training, and Evaluation  
**Assessment Date:** 2026-11-24  
**Scope:** Dataset Integrity Audit, Feature Contract Verification, Target Leakage Analysis, and Generalization Protocol  

---

## 1. Executive Summary

This investigation delivers a formal audit of the tabular dataset artifacts supporting Phase 05 model selection and training for OFPHIL V2 charity patient eligibility classification. 

The evaluation encompasses:
- `data/interim/features/selected_features.csv` (N=500, 51 columns)
- `data/processed/features/final_feature_schema.json` (48-feature contract)
- `data/processed/splits/cv_split_indices.json` (Stratified 10-Fold definition, N=350 dev set)
- `data/interim/features/fairness_demographics_dataset.csv` (Isolated sensitive attributes)
- Partition files under `data/processed/splits/{train,validation,test}`

**Key Findings:**
1. **Dataset Completeness:** Zero missing values, zero exact duplicates, and zero duplicate record IDs across all 500 rows.
2. **Target Balance:** The dataset maintains a strictly balanced 50/50 distribution (`ELIGIBLE`: 250, `INELIGIBLE`: 250) across partitions (Train: 175/175, Val: 38/37, Test: 37/38). This balanced distribution is an experimental design choice and does not reflect real-world population prevalence, requiring probability calibration to be interpreted with documented baselines.
3. **Leakage & Temporal Availability:** All 48 features represent pre-decision socioeconomic, clinical, and household indicators available at intake prior to medical social worker (MSW) determination. All post-decision administrative timestamps, final approval flags, assistance amounts granted, and patient identifiers were strictly excluded in Phase 03.
4. **Generalization & Evaluation Methodology:** Prior notebook templates reported cross-validation metrics but lacked probability-based Brier Score logging, calibration curve analysis (Reliability Diagrams), Expected Calibration Error (ECE), and robust Matplotlib parameter isolation. A standardized, leak-free evaluation protocol is defined herein.

---

## 2. Dataset Integrity Audit

### 2.1 File Artifacts Inspected

| File Path | Rows | Columns | SHA-256 / Checksum Status | Role in Pipeline |
|---|---|---|---|---|
| `data/interim/features/selected_features.csv` | 500 | 51 | Verified valid CSV | Master transformed feature matrix |
| `data/processed/features/final_feature_schema.json` | N/A | 48 features | Valid JSON | Enforced schema contract |
| `data/processed/splits/cv_split_indices.json` | N/A | 10 folds | Valid JSON | Fixed outer Stratified 10-fold indices |
| `data/processed/splits/train/X_train.csv` | 350 | 12 | Valid CSV | Raw development predictors |
| `data/processed/splits/train/y_train.csv` | 350 | 1 | Valid CSV | Raw development ground truth |
| `data/processed/splits/validation/X_val.csv` | 75 | 12 | Valid CSV | Raw validation predictors |
| `data/processed/splits/validation/y_val.csv` | 75 | 1 | Valid CSV | Raw validation ground truth |
| `data/processed/splits/test/X_test.csv` | 75 | 12 | Valid CSV | Raw held-out test predictors |
| `data/processed/splits/test/y_test.csv` | 75 | 1 | Valid CSV | Raw held-out test ground truth |
| `data/interim/features/fairness_demographics_dataset.csv` | 500 | 5 | Valid CSV | Isolated protected demographic attributes |

### 2.2 Record Counts and Partition Distribution

| Partition | Record Count | % of Dataset | INELIGIBLE (0) | ELIGIBLE (1) | Balance Ratio |
|---|---|---|---|---|---|
| **Development Train** | 350 | 70.0% | 175 | 175 | 1.000 (50.0% / 50.0%) |
| **Development Validation** | 75 | 15.0% | 37 | 38 | 0.974 (49.3% / 50.7%) |
| **Quarantined Final Test** | 75 | 15.0% | 38 | 37 | 1.027 (50.7% / 49.3%) |
| **Total Master Dataset** | **500** | **100.0%** | **250** | **250** | **1.000 (50.0% / 50.0%)** |

### 2.3 Data Quality and Cleaning Verification
- **Missing Values:** `0` nulls across all 500 rows and 51 columns in `selected_features.csv`.
- **Exact Duplicates:** `0` duplicate rows.
- **Record Identifier Uniqueness:** `internal_record_id` has 500 distinct values across 500 rows (100% unique primary keys).
- **Constant / Zero-Variance Features:** `0` constant features detected.
- **Numerical Value Ranges:**
  - Robust-scaled features (`xf_rob_*` and `xf_log_rob_*`): Well-behaved distributions centered near median 0, with median interquartile range normalized to 1.
  - Yeo-Johnson transformed margins (`xf_yj_net_monthly_household_margin`): Valid continuous real values without infinite or NaN entries.
  - One-hot binary flags (`ohe_*`, `is_*`): Strictly bounded within $\{0, 1\}$.

---

## 3. Target Leakage & Feature Provenance Audit

### 3.1 Excluded Potential Leakage & Administrative Columns
Phase 03 explicitly isolated and removed all columns containing post-decision information, identifiers, or administrative tracking metadata:
1. `internal_record_id`: Pure internal linkage key; excluded from model input matrices.
2. `split_partition`: Metadata partition label (`train`, `validation`, `test`); excluded from features.
3. `assessment_date`, `decision_date`, `created_at`, `updated_at`: Administrative timestamps.
4. `approved_assistance_amount`, `discount_rate`, `subsidy_level`: Direct post-decision administrative outcomes.
5. `social_worker_notes_post_interview`, `director_approval_signature`: Post-assessment review artifacts.
6. `patient_name`, `address`, `contact_number`: Personally identifiable information (PII) removed per governance policy.

### 3.2 Fairness and Demographic Attribute Isolation
To ensure algorithmic fairness and compliance with clinical ethics:
- `age`, `sex`, and `marital_status` were excluded from model predictors and isolated into `data/interim/features/fairness_demographics_dataset.csv`.
- Models are trained strictly on clinical severity, household socioeconomic indicators, and pre-decision medical burden.

### 3.3 Collinearity Audit (Confirmed vs. Legitimate Structural Relationships)
A correlation matrix audit revealed 5 feature pairs with Pearson $|r| > 0.85$:
1. `is_repeat_assistance_request` $\leftrightarrow$ `ohe_assistance_type_FIRST_ASSISTANCE` ($r = -1.000$): Structural complement (a first assistance request is by definition non-repeat).
2. `is_repeat_assistance_request` $\leftrightarrow$ `ohe_assistance_type_SECOND_ASSISTANCE` ($r = 0.952$): Structural subset.
3. `ohe_diagnosis_severity_category_Moderate` $\leftrightarrow$ `ohe_diagnosis_severity_category_Severe` ($r = -0.922$): Complementary one-hot categories from 3-level diagnosis severity.
4. `ohe_type_of_treatment_surgery_Outpatient` $\leftrightarrow$ `ohe_type_of_treatment_surgery_Surgery` ($r = -0.958$): Dominant treatment categories.
5. `ohe_assistance_type_FIRST_ASSISTANCE` $\leftrightarrow$ `ohe_assistance_type_SECOND_ASSISTANCE` ($r = -0.952$): Complementary assistance tiers.

*Assessment:* These collinearities arise from standard one-hot encodings of 2- or 3-level categoricals. They represent valid structural relationships and do not constitute target leakage. Ridge/L2 regularization in linear models and tree-based splitting naturally accommodate these encodings.

---

## 4. Stratified 10-Fold Cross-Validation Audit

### 4.1 Fixed Outer Folds
The project's Stratified 10-Fold split indices (`cv_split_indices.json`) partition the $N=350$ training development set into 10 identical folds:
- Each outer fold contains $N_{\text{val}} = 35$ validation samples and $N_{\text{train}} = 315$ training samples.
- Every outer fold validation split contains exactly $17$ or $18$ `INELIGIBLE` and $17$ or $18$ `ELIGIBLE` samples (stratification ratio: $48.6\% - 51.4\%$).
- The union of all 10 validation splits exactly covers the 350 training development records with zero overlap and zero omitted records.
- All 7 candidate models will evaluate against the exact same outer fold indices.

### 4.2 Nested Cross-Validation Strategy
To prevent hyperparameter selection leakage:
1. **Outer Folds (Stratified 10-Fold):** Used exclusively for unbiased out-of-fold generalization estimation.
2. **Inner Folds (Stratified 5-Fold):** Executed inside each outer training split ($N=315$) via `GridSearchCV` / `RandomizedSearchCV` to select optimal hyperparameters.
3. **Preprocessing Fitting:** Preprocessors (e.g., `StandardScaler`, imputation, encoders) are fitted strictly on each outer fold's training slice ($N=315$) and applied to the outer validation slice ($N=35$).

---

## 5. Overfitting & Generalization Correction Plan

1. **Mandatory Generalization Gap Tracking:**  
   Every notebook must record and plot both Training F1 and Validation F1 across all 10 folds, computing:
   $$\text{Generalization Gap} = \text{Train F1} - \text{Validation F1}$$
2. **Probability Calibration Analysis:**  
   Models frequently output overconfident probabilities. Each notebook must compute:
   - Binary Brier Score: $\text{BS} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2 \in [0, 1]$
   - Reliability Diagrams (Observed Positive Frequency vs. Mean Predicted Probability across 5-10 bins)
   - Expected Calibration Error (ECE) with documented uniform binning
3. **Quarantined Test Set:**  
   `X_test.csv` / `y_test.csv` ($N=75$) remains completely untouched across all seven model notebooks and the comparison notebook. It is loaded exclusively in notebook `08_final_model_evaluation.ipynb` to evaluate the final champion model.

---

## 6. Audit Conclusion & Approval

The tabular dataset is verified clean, non-leaking, well-partitioned, and ready for full Phase 05 notebook implementation.
