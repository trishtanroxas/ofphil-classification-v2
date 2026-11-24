# Phase 05 Training Readiness Specification

**Project**: `ofphil-classification-v2`  
**Pipeline Track**: Tabular Eligibility Classification Baseline  
**Readiness Status**: **READY WITH DOCUMENTED LIMITATIONS (LOCKED)**  
**Target Next Phase**: Phase 05 – Model Selection and Training

---

## 1. Executive Summary & Authoritative Tabular Baseline

This readiness specification establishes the authoritative, locked contract for the tabular machine learning pipeline in `ofphil-classification-v2`. All Phase 02 (Data Preparation) and Phase 03 (Feature Engineering) datasets, split partitions, leakage quarantines, and preprocessing parameters have been audited, cross-verified with cryptographic hashes, and frozen.

**Key Rule for Phase 05 Consumption**:
- Phase 05 model training must consume **`data/interim/features/selected_features.csv`** partitioned strictly by `split_partition == 'train'`.
- The validation split (`split_partition == 'validation'`) is reserved for hyperparameter tuning, model comparison, and threshold selection.
- The test split (`split_partition == 'test'`) remains strictly sequestered until final unbiased evaluation.
- Neither `internal_record_id`, `split_partition`, nor `eligibility` shall enter the predictor feature matrix $X$.
- Demographic features quarantined for fairness remain isolated in `data/interim/features/fairness_demographics_dataset.csv`.

---

## 2. Approved Tabular Dataset Versions and Cryptographic Hashes

All source, interim, and processed tabular files were audited with SHA-256 verification:

| File Path | Rows × Cols | SHA-256 Checksum | Description |
| :--- | :--- | :--- | :--- |
| `data/synthetic/tabular/ofphil_synthetic_raw.csv` | 500 × 59 | `c443e97797db85bae2545be53525abf1eacd6d78ecb8ee96e7cfe3387dfd82c7` | Authoritative synthetic patient intake records (v3 sanitized) |
| `data/interim/cleaned/ofphil_cleaned_tabular.csv` | 500 × 59 | `c9d0d04e265f6144e5033a3889154f85e45a22830f065a7741ef6ad0c7f2fe96` | Standardized and cleaned tabular patient records |
| `data/interim/features/feature_engineered_dataset.csv` | 500 × 80 | `b40969f6e9eb2a1ce0ca170ba375837fa12bf1267852e67df1bb7e034ca2fe27` | Full feature extraction dataset including candidate features |
| `data/interim/features/selected_features.csv` | 500 × 51 | `f37efe0dbd780bc535c5dfb51c1ffbe30d8eb697ea30303dfbb3cb21f8a846f3` | **Authoritative Feature Matrix** (48 predictors + 2 admin + 1 target) |
| `data/processed/features/final_feature_manifest.csv` | 48 × 10 | `f096eda6dabc123d2ae543da667085775c754655f05b41fae8ef81b53e79435b` | Machine-readable feature metadata and transformation dictionary |
| `data/processed/splits/train/X_train.csv` | 350 × 12 | `2c3b0bbfe6a278680ad8b41ca01a24d5ba6537bf78d6550f55cf52e6b2ea8b09` | Phase 02 12-feature prototype baseline training predictors |
| `data/processed/splits/train/y_train.csv` | 350 × 1 | `196a06a541c1f15ec62e92c2dae83e9df25925a666d9536fc6d5b0351336c1a8` | Phase 02 training labels |
| `data/processed/splits/validation/X_val.csv` | 75 × 12 | `27afe7783014d7af593ba14fa8d9e6eb1c7e96b3017a5843477169123b3a3c2f` | Phase 02 prototype validation predictors |
| `data/processed/splits/validation/y_val.csv` | 75 × 1 | `8d34d6b1dfd47fc3ceab7ba83cbbd1bfbf2549aa669bcf3ecdb42ee9a18413a9` | Phase 02 validation labels |
| `data/processed/splits/test/X_test.csv` | 75 × 12 | `f6433def1672f4d924d6735a285d852cb7ec5fc31562ae9d2b27a3bb56041ee4` | Phase 02 prototype test predictors |
| `data/processed/splits/test/y_test.csv` | 75 × 1 | `670dbb1ec4d853664cb45dc716fe2c67baea6fe875ef1b71216a3bbfae72754d` | Phase 02 test labels |

---

## 3. Resolution of Historical Audit Inconsistencies

During previous audit phases, discrepancies between prototype reports were observed. These have been investigated and reconciled:

1. **Utility Expenses vs. Obligations (6 Rows vs. 0 Violations)**:
   - *Investigation*: In the raw synthetic dataset (`ofphil_synthetic_raw.csv`), exactly **6 rows** (indices 125, 348, 356, 426, 461, 481) have positive utility expenses where obligations were reported as `0.0`.
   - *Audit Reconciliation*: When auditing raw currency intake, 6 rows satisfy `monthly_utility_expenses > monthly_household_obligations_expenses`. In Notebook 01 of Feature Engineering, the derived feature `utility_share_of_obligations` was engineered with a guarded formula:
     $$\text{utility\_share\_of\_obligations} = \begin{cases} \text{utility} / \text{obligations} & \text{if obligations} > 0 \\ \text{NaN} & \text{otherwise} \end{cases}$$
     Consequently, zero unhandled zero-division errors or infinite values enter the feature pipeline.
   - *Conclusion*: Both findings are technically true in their respective contexts (6 raw domain anomalies flagged during data quality audit; 0 unhandled division bugs in the transformed feature pipeline).

2. **Treatment Cost vs. Quotation Amount (Collinear Duplicates vs. Independent Fields)**:
   - *Investigation*: In `ofphil_synthetic_raw.csv`, `cost_of_treatment == quotation_amount == total_amount == estimated_treatment_expenses` for all 500 rows.
   - *Audit Reconciliation*: The quotation *particular* (`quotation_particular`) contains independent text strings (27 surgical line items), but the numeric amounts were 100% collinear duplicates.
   - *Action Taken*: In Phase 03 feature selection, collinear duplicate columns (`quotation_amount`, `estimated_treatment_expenses`, `total_amount`) were permanently quarantined and excluded from model inputs. Only `cost_of_treatment` was retained.

3. **76 Financial Discrepancies (`existing_financial_assistance`)**:
   - *Investigation*: In 76 rows of the raw synthetic data, `existing_financial_assistance > 0`. In those rows, `remaining_medical_expenses` was calculated simply as `total_amount - approved_financial_assistance` without deducting existing third-party aid.
   - *Audit Reconciliation*: `remaining_medical_expenses` and `approved_financial_assistance` are **post-decision administrative fields**. Both fields were strictly quarantined and excluded from the predictive feature matrix. As a result, this synthetic data generation artifact cannot leak into or bias model training.

---

## 4. Authoritative Tabular Feature Contract (48 Predictors)

The final approved feature matrix contains **48 predictor columns** categorized into 3 functional groups:

### A. Socioeconomic Indicators (11 Transformed Continuous Features)
1. `xf_log_rob_per_capita_monthly_income`: Log1p + RobustScaled per-capita monthly family income.
2. `xf_log_rob_monthly_household_obligations_expenses`: Log1p + RobustScaled household obligations.
3. `xf_log_rob_monthly_utility_expenses`: Log1p + RobustScaled monthly utility bills.
4. `xf_log_rob_cost_of_treatment`: Log1p + RobustScaled estimated treatment cost.
5. `xf_log_rob_income_to_obligation_ratio`: Log1p + RobustScaled ratio of income to obligations.
6. `xf_log_rob_utility_share_of_obligations`: Log1p + RobustScaled ratio of utilities to obligations.
7. `xf_log_rob_treatment_cost_to_per_capita_income_ratio`: Log1p + RobustScaled treatment burden per capita.
8. `xf_log_rob_pre_decision_medical_financial_burden`: Log1p + RobustScaled net out-of-pocket medical burden.
9. `xf_yj_net_monthly_household_margin`: Yeo-Johnson transformed net disposable household margin.
10. `xf_rob_household_size`: RobustScaled total household member count.
11. `xf_rob_dependent_share_of_household`: RobustScaled proportion of dependents in household.

### B. Clinical Severity & Intake Indicators (10 Discrete/Binary Features)
12. `xf_rob_diagnosis_severity_ordinal`: Ordinal severity ranking (Mild=1, Moderate=2, Severe=3).
13. `xf_rob_clinical_documentation_count`: Count of supporting clinical documents presented.
14. `is_monthly_income_missing`: Binary intake missingness indicator (1 if unrecorded/informal).
15. `is_obligations_missing`: Binary intake missingness indicator for household obligations.
16. `is_bilateral_ou`: Binary indicator for bilateral ocular involvement (Oculus Uterque).
17. `is_surgical_intervention`: Binary indicator for surgical procedure recommendation.
18. `is_repeat_assistance_request`: Binary indicator for repeat applicant status.
19. `has_outstanding_medical_bills_flag`: Binary indicator for unpaid clinical obligations.
20. `ohe_assistance_type_FIRST_ASSISTANCE`: One-hot encoded intake assistance tier.
21. `ohe_assistance_type_SECOND_ASSISTANCE`: One-hot encoded intake assistance tier.
22. `ohe_assistance_type_THIRD_ASSISTANCE`: One-hot encoded intake assistance tier.

### C. Standardized Categorical One-Hot Encodings (26 Features)
- **Employment Status (6)**: `Employed`, `Pensioner`, `Retired`, `Self_Employed`, `Student`, `Unemployed`.
- **Residence Status (6)**: `Informal_Settler`, `Mortgaged`, `Owned`, `Rent_Free`, `Rented`, `Shared_Living_with_Relatives`.
- **Educational Attainment (8)**: `College_Graduate`, `College_Level`, `Elementary_Graduate`, `Elementary_Level`, `High_School_Graduate`, `High_School_Level`, `High_School_Level_Senior_High`, `Vocational`.
- **Diagnosis Severity Category (3)**: `Mild`, `Moderate`, `Severe`.
- **Type of Treatment/Surgery (3)**: `Diagnostic_Consultation`, `Outpatient`, `Surgery`.

---

## 5. Split Provenance & Leakage Quarantine

### Partitioning Statistics (Seed = `20261123`, Stratified 70/15/15)
- **Training Set (`train`)**: 350 records (175 ELIGIBLE, 175 INELIGIBLE) — 50.0% prevalence.
- **Validation Set (`validation`)**: 75 records (38 ELIGIBLE, 37 INELIGIBLE) — 50.7% prevalence.
- **Test Set (`test`)**: 75 records (37 ELIGIBLE, 38 INELIGIBLE) — 49.3% prevalence.
- **Total**: 500 records. Zero cross-partition patient overlap. Zero record leakage.

### Quarantined Post-Decision Leakage Fields (Excluded)
The following fields are strictly excluded from predictive model training:
1. `status` (Contains post-decision values `FIRST-TIME`, `MAX`, `APPROVED`).
2. `social_worker_assessment_rating` (Final evaluative score assigned by social worker).
3. `approved_financial_assistance` (Financial amount granted upon approval).
4. `remaining_medical_expenses` (Post-assistance accounting balance).
5. `assessment_notes` (Post-intake decision remarks).
6. `relevant_social_worker_findings` (Caseworker summary written after eligibility review).
7. `total_supporting_documents`, `certificate_of_indigency`, `has_certificate_of_indigency` (High-risk administrative proxies).

### Protected Demographic Attributes (Isolated for Fairness Audits)
The following demographic attributes are isolated in `fairness_demographics_dataset.csv` and excluded from model training to prevent direct demographic discrimination:
- `age`, `sex`, `marital_status`, `sectoral_membership`, `disability_status`.

---

## 6. Phase 05 Data-Loading Protocol

When implementing Phase 05 model training scripts or notebooks:

```python
import pandas as pd

# Load authoritative feature contract
df = pd.read_csv("data/interim/features/selected_features.csv")

# Extract administrative keys
train_mask = (df["split_partition"] == "train")
val_mask = (df["split_partition"] == "validation")
test_mask = (df["split_partition"] == "test")

admin_cols = ["internal_record_id", "split_partition", "eligibility"]
predictor_cols = [c for c in df.columns if c not in admin_cols]

# Training Set
X_train = df.loc[train_mask, predictor_cols]
y_train = (df.loc[train_mask, "eligibility"] == "ELIGIBLE").astype(int)

# Validation Set (Tuning & Model Comparison)
X_val = df.loc[val_mask, predictor_cols]
y_val = (df.loc[val_mask, "eligibility"] == "ELIGIBLE").astype(int)

# Test Set (Strictly Sequestered for Final Evaluation)
X_test = df.loc[test_mask, predictor_cols]
y_test = (df.loc[test_mask, "eligibility"] == "ELIGIBLE").astype(int)
```
