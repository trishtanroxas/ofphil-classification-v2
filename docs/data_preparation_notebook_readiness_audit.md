# OFPHIL V2 — Data Preparation Notebook Readiness Audit

**Audit Timestamp:** `2026-11-23T15:44:00+08:00`  
**Project Scope:** `ofphil-classification-v2`  
**Target Notebook Directory:** `experiments/notebooks/02_data_preparation/`  
**Execution Policy Compliance:** **0 notebook cells executed** (`outputs: []`, `execution_count: null` verified across all 35 code cells)  
**Final Notebook Readiness Verdict:** **READY WITH DOCUMENTED LIMITATIONS**

---

## 1. Audited Notebooks Inventory & Static Verification Summary

| Order | Notebook Filename | Total Cells | Markdown Cells | Code Cells | AST Syntax Check | Unexecuted State (`outputs=[]`, `execution_count=None`) | Primary Output Artifacts | Verdict |
|---:|---|---:|---:|---:|---|---|---|---|
| **01** | `01_data_quality_and_verification.ipynb` | 16 | 10 | 6 | **PASS (6/6)** | **VERIFIED** | `data/interim/data_quality/missingness_profile.csv` | **READY** |
| **02** | `02_taxonomy_and_category_mapping.ipynb` | 14 | 9 | 5 | **PASS (5/5)** | **VERIFIED** | `data/interim/taxonomy_mapping/category_mapping_log.csv`, `data/interim/cleaned/category_mappings.json` | **READY** |
| **03** | `03_data_cleaning_and_missing_values.ipynb` | 16 | 10 | 6 | **PASS (6/6)** | **VERIFIED** | `data/interim/cleaned/ofphil_cleaned_tabular.csv`, `data/interim/data_cleaning/cleaning_audit_log.csv` | **READY** |
| **04** | `04_patient_document_linkage_audit.ipynb` | 14 | 9 | 5 | **PASS (5/5)** | **VERIFIED** | `data/interim/linkage_audit/linkage_audit_report.csv`, `data/interim/validated/patient_document_linkage_index.json` | **READY** |
| **05** | `05_encoding_and_numerical_preprocessing.ipynb` | 16 | 10 | 6 | **PASS (6/6)** | **VERIFIED** | `data/processed/splits/{train,validation,test}/*`, `data/processed/features/preprocessing_pipeline.joblib`, `data/processed/preprocessing/numerical_scaling_stats.csv` | **READY** |
| **06** | `06_prepared_dataset_validation.ipynb` | 18 | 11 | 7 | **PASS (7/7)** | **VERIFIED** | `data/processed/validation/prepared_dataset_checks.csv`, `data/interim/validated/preparation_validation_certificate.json` | **READY** |

**Pre-Correction Notebook Backups:** Full copies of all six notebooks prior to today's static corrections are preserved in `data/synthetic/backups/20261123T153623/notebooks_02_data_preparation/`.

---

## 2. Environment, Import, and Dependency Verification

All imports referenced across the six notebooks were checked against the project virtual environment (`.\venv312\Scripts\python.exe`):

| Package / Module | Notebooks Using Module | Installed Version in `venv312` | API Compatibility Check |
|---|---|---|---|
| `pathlib`, `json`, `datetime`, `re` | `01`, `02`, `03`, `04`, `05`, `06` | Python 3.12.10 stdlib | `datetime.now(datetime.timezone.utc)` (no deprecated `utcnow()`) |
| `pandas` | `01`, `02`, `03`, `04`, `05`, `06` | `3.0.6` | Verified (`read_csv`, `to_csv`, `crosstab`, `cut`, `isna`, `replace`) |
| `numpy` | `01`, `02`, `03`, `04`, `05`, `06` | `2.3.5` | Verified |
| `scikit-learn` (`sklearn`) | `05` | `1.9.1` | `OneHotEncoder(handle_unknown='ignore', sparse_output=False)` valid in sklearn ≥ 1.2 |
| `joblib` | `05`, `06` | `1.6.0` | Verified (`joblib.dump`, `joblib.load`) |
| `jupyterlab` / `ipykernel` / `nbformat` | Manual execution environment | `4.6.6` / `7.4.0` / `5.11.1` | Ready for JupyterLab manual launch |

---

## 3. Path & Execution Dependency Matrix

Every notebook uses the same working-directory-agnostic root resolver in Cell 3:
```python
def _find_project_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / 'data').exists() and (p / 'experiments').exists():
            return p
    return Path('../../..').resolve()
```
This resolves accurately to `c:\Users\ASUS TUF\Desktop\Project in Program\Thesis Project\ofphil-classification-v2` whether JupyterLab is launched from the project root or from `experiments/notebooks/02_data_preparation/`.
- **Zero references** to the original `main` project exist in any cell.
- **Zero write operations** target `data/synthetic/tabular/ofphil_synthetic_raw.csv` or `data/raw/`.
- Every output directory is created with `.mkdir(parents=True, exist_ok=True)` before writing.

### Inter-Notebook Artifact Handoff Chain
1. **Notebook 01** reads `data/synthetic/tabular/ofphil_synthetic_raw.csv` $\rightarrow$ writes `data/interim/data_quality/missingness_profile.csv`.
2. **Notebook 02** reads `data/synthetic/tabular/ofphil_synthetic_raw.csv` $\rightarrow$ writes `data/interim/taxonomy_mapping/category_mapping_log.csv` and `data/interim/cleaned/category_mappings.json`.
3. **Notebook 03** reads `data/synthetic/tabular/ofphil_synthetic_raw.csv` + `data/interim/cleaned/category_mappings.json` $\rightarrow$ writes `data/interim/cleaned/ofphil_cleaned_tabular.csv` and `data/interim/data_cleaning/cleaning_audit_log.csv`.
4. **Notebook 04** reads `data/interim/cleaned/ofphil_cleaned_tabular.csv` (with fallback to `ofphil_synthetic_raw.csv`) + `data/synthetic/documents/metadata/synthetic_document_metadata.csv` + `data/synthetic/documents/linkage/synthetic_patient_document_links.csv` $\rightarrow$ writes `data/interim/linkage_audit/linkage_audit_report.csv` and `data/interim/validated/patient_document_linkage_index.json`.
5. **Notebook 05** reads `data/interim/cleaned/ofphil_cleaned_tabular.csv` $\rightarrow$ writes raw and train-fitted transformed splits to `data/processed/splits/{train,validation,test}/`, pipeline to `data/processed/features/preprocessing_pipeline.joblib`, and train scaling statistics to `data/processed/preprocessing/numerical_scaling_stats.csv`.
6. **Notebook 06** reads `data/interim/cleaned/ofphil_cleaned_tabular.csv` + `data/processed/splits/{train,validation,test}/*` + `data/processed/features/preprocessing_pipeline.joblib` $\rightarrow$ writes `data/processed/validation/prepared_dataset_checks.csv` and `data/interim/validated/preparation_validation_certificate.json`.

---

## 4. Notebook-by-Notebook Inspection & Corrections Applied

### 4.1 `01_data_quality_and_verification.ipynb`
- **What Was Verified:** Loads `ofphil_synthetic_raw.csv`; profiles completeness across all 59 columns; exports `missingness_profile.csv`; checks exact duplicate rows (`0`) and quasi-identifier duplicate clusters (`age`, `sex`, `marital_status`, `occupation`); checks numerical ranges (`age`, `household_size`, `number_of_dependents`); audits demographic representation (`sex`, `age_group`) and empirical demographic parity difference across age groups.
- **Defect Found & Corrected:**
  1. Cell 13 previously executed `df['age_group'] = pd.cut(...)`, which mutated the in-memory DataFrame from 59 to 60 columns. Corrected to compute `age_group` as a standalone `pd.Series` so `df.shape` remains strictly `(500, 59)` throughout the notebook.
  2. Cell 11 was expanded to explicitly check `number_of_dependents >= household_size` (`0` violations), flag the `6` rows where `monthly_utility_expenses > monthly_household_obligations_expenses`, and list 100%-null structural columns (`['other_eligibility_certifications']`).

### 4.2 `02_taxonomy_and_category_mapping.ipynb`
- **What Was Verified:** Defines canonical taxonomy mappings and exports both a human-readable frequency log (`data/interim/taxonomy_mapping/category_mapping_log.csv`) and a machine-readable JSON dictionary (`data/interim/cleaned/category_mappings.json`).
- **Defects Found & Corrected:**
  1. `residence_mapping` in Cell 7 previously covered only 6 values (`Owner`, `Owned`, `Renter`, `Informal Settler`, `Rent-free`, `Rent-Free`), leaving **10 raw values unmapped** (`Renting`, `Rented`, `Mortgaged`, `Free (Owned by Sibling)`, `Living with parents`, `Owner (Mother-in-Law)`, `Living with daughter`, `Owned by aunt`, `Owner (Siblings)`, `Living with niece`). Expanded `residence_mapping` to cover all 15 raw values into 5 domain-grounded tenure categories (`Owned`, `Rented`, `Rent-Free`, `Mortgaged`, `Shared / Living with Relatives`) while preserving every raw value in `category_mapping_log.csv`.
  2. `educational_mapping` in Cell 7 previously used placeholder keys (`'Elementary Level / Graduate'`, etc.) that did not match the 8 actual values in `df['educational_attainment']` (`College Graduate`, `High School Graduate`, `High School Level`, `College Level`, `Elementary Graduate`, `Vocational`, `Grade 11`, `Elementary Level`) and was omitted from `mapping_definitions`. Updated `educational_mapping` to match all 8 actual raw values and added it to `mapping_definitions`.
  3. Added `housing_mapping` (`'Semi-concrete'` $\rightarrow$ `'Semi-Concrete'`) to normalize the 3 lowercase-c rows identified during the structural audit.

### 4.3 `03_data_cleaning_and_missing_values.ipynb`
- **What Was Verified:** Parses all 11 PHP currency columns (`₱...`) to `float64` without converting `NaN` to `0`; standardizes categories; drops exact duplicate rows (`0` removed); documents the no-blind-imputation policy; exports `data/interim/cleaned/ofphil_cleaned_tabular.csv` and `data/interim/data_cleaning/cleaning_audit_log.csv`.
- **Defect Found & Corrected:**
  - Cell 1 listed `data/interim/cleaned/category_mappings.json` (from Notebook 02) as a required input, but Cell 9 previously ignored that file and used a partial hardcoded 3-key dictionary. Updated Cell 9 to load `category_mappings.json` (with a full offline fallback dictionary) and apply standardized mappings across `residence_status`, `marital_status`, `educational_attainment`, and `housing_condition`, logging exact affected row counts in `cleaning_audit_log.csv`.

### 4.4 `04_patient_document_linkage_audit.ipynb`
- **What Was Verified:** Loads `ofphil_cleaned_tabular.csv` (or falls back to `ofphil_synthetic_raw.csv`), `synthetic_document_metadata.csv` (1,068 rows), and `synthetic_patient_document_links.csv` (1,068 rows); verifies `0` missing patient references, `0` orphan documents, and `0` duplicate links; exports `linkage_audit_report.csv` and `patient_document_linkage_index.json`.
- **Enhancements Applied in Cell 7:**
  - Added explicit uniqueness checks on `document_id` and `link_id`.
  - Added an automated cross-table synchronization check verifying that all 7 linked document categories in `synthetic_patient_document_links.csv` match the `'Present'` flags in the 7 corresponding tabular columns (`0` mismatches across 1,068 links).
  - Added an explicit audit check verifying that `total_supporting_documents` equals the sum of `'Present'` across the 10 socio-legal flag columns (`500/500` rows, total = `990` vs `1,068` linked documents including `Medical Abstract`), and printed the governance warning that metadata status fields are synthetic workflow descriptors rather than proof of physical document authenticity.

### 4.5 `05_encoding_and_numerical_preprocessing.ipynb`
- **What Was Verified:**
  - Selects 6 pre-decision numerical features (`household_size`, `number_of_dependents`, `monthly_family_income`, `monthly_household_obligations_expenses`, `cost_of_treatment`, `total_supporting_documents`) and 6 pre-decision categorical features (`employment_status`, `residence_status`, `educational_attainment`, `diagnosis_severity`, `type_of_treatment_surgery`, `assistance_type`).
  - Isolates `sex` and `age` into `demographics_df` (`demographics_train.csv`, `demographics_val.csv`, `demographics_test.csv`).
  - Excludes all post-decision leakage fields (`status`, `approved_financial_assistance`, `remaining_medical_expenses`, `social_worker_assessment_rating`, `assessment_notes`, `relevant_social_worker_findings`) and collinear duplicate columns (`estimated_treatment_expenses`, `quotation_amount`, `total_amount`, `document_category_diversity`).
  - Performs a reproducible stratified 70% / 15% / 15% split (`350` train / `75` validation / `75` test) with `RANDOM_SEED = 20261123` **before** fitting `ColumnTransformer`.
  - Calls `preprocessor.fit_transform(X_train)` and `preprocessor.transform(X_val)` / `preprocessor.transform(X_test)` strictly without leakage.
  - Performs **zero model training**.
- **Defect Found & Corrected:**
  - Cell 13 previously saved only the unencoded split DataFrames (`X_train.csv`, `X_val.csv`, `X_test.csv`) and `preprocessing_pipeline.joblib`, without saving the transformed matrices (`X_train_proc`, `X_val_proc`, `X_test_proc`). Updated Cell 13 to export both the raw split CSVs (`X_train.csv`, etc.) and the encoded/scaled split CSVs (`X_train_processed.csv`, `X_val_processed.csv`, `X_test_processed.csv` with `preprocessor.get_feature_names_out()`).

### 4.6 `06_prepared_dataset_validation.ipynb`
- **What Was Verified:** Validates privacy invariant (`0` direct identifiers), target/post-decision leakage invariant (`0` leakage columns), row conservation (`350 + 75 + 75 == 500`), feature schema alignment across splits, non-negative income range check, and stratified class balance preservation (`50% ± 5%` across all three splits). Does not claim model performance validation.
- **Defect Found & Corrected:**
  - Cell 13 did not previously verify the transformed matrices / fitted `preprocessing_pipeline.joblib` for post-imputation nulls and encoded column alignment across splits. Added check `preprocessing_consistency_and_zero_post_imputation_nulls` in Cell 13 to verify that `X_train_processed.csv`, `X_val_processed.csv`, and `X_test_processed.csv` (or `preprocessing_pipeline.joblib`) produce identical encoded feature dimensions and `0` post-imputation `NaN` values.

---

## 5. Remaining Blockers & Manual Execution Order

- **Blocking Technical Issues:** **None (`0`).**
- **Required Manual Execution Order in JupyterLab:**
  1. `experiments/notebooks/02_data_preparation/01_data_quality_and_verification.ipynb`
  2. `experiments/notebooks/02_data_preparation/02_taxonomy_and_category_mapping.ipynb`
  3. `experiments/notebooks/02_data_preparation/03_data_cleaning_and_missing_values.ipynb`
  4. `experiments/notebooks/02_data_preparation/04_patient_document_linkage_audit.ipynb`
  5. `experiments/notebooks/02_data_preparation/05_encoding_and_numerical_preprocessing.ipynb`
  6. `experiments/notebooks/02_data_preparation/06_prepared_dataset_validation.ipynb`
