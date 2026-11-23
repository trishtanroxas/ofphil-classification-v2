# OFPHIL V2 — Synthetic Dataset Readiness Audit

**Audit Timestamp:** `2026-11-23T15:44:00+08:00`  
**Project Scope:** `ofphil-classification-v2` (strictly isolated; original `main` project and `charity-patient.csv` untouched)  
**Target Dataset:** `data/synthetic/tabular/ofphil_synthetic_raw.csv`  
**Data Dictionary:** `data/synthetic/tabular/ofphil_synthetic_data_dictionary.csv`  
**Final Dataset Readiness Verdict:** **READY WITH DOCUMENTED LIMITATIONS**

---

## 1. Dataset Identity, Provenance, and File Hashes

| Artifact | Relative Path | Dimensions / Size | SHA-256 Hash | Status |
|---|---|---|---|---|
| **Active V2 Raw Synthetic Dataset** | `data/synthetic/tabular/ofphil_synthetic_raw.csv` | 500 rows × 59 cols (891,829 bytes) | `c443e97797db85bae2545be53525abf1eacd6d78ecb8ee96e7cfe3387dfd82c7` | Active (v4 label-neutral, fact-grounded narratives) |
| **Enriched Data Dictionary** | `data/synthetic/tabular/ofphil_synthetic_data_dictionary.csv` | 59 rows × 10 cols (14,479 bytes) | `ff39e48ae73981c14ebf287a5d0bf96b3e4268e07347a7a4676ee3fe67d02391` | Active (definitions, `allowed_values`, `field_role` added) |
| **Synthetic Document Metadata** | `data/synthetic/documents/metadata/synthetic_document_metadata.csv` | 1,068 rows × 12 cols (225,397 bytes) | Verified present | Synchronized with 7 tabular document flags |
| **Synthetic Patient-Document Links** | `data/synthetic/documents/linkage/synthetic_patient_document_links.csv` | 1,068 rows × 8 cols (118,014 bytes) | Verified present | 0 orphans, 0 missing patient refs |
| **Pre-Audit Timestamped Backup (v3)** | `data/synthetic/backups/20261123T153623/ofphil_synthetic_raw.csv` | 500 rows × 59 cols (929,926 bytes) | `130ba60f4e8ec1d9f5a0b9a365564722c16fb0493d898cf5a85c05634c6a2e2a` | Preserved before v4 narrative correction |
| **Prior Backup (v2)** | `data/synthetic/tabular/ofphil_synthetic_raw.csv.bak_v2_before_v3` | 500 rows × 59 cols (1,211,580 bytes) | `dd691dd803466e9a...` | Preserved |
| **Prior Backup (v1)** | `data/synthetic/tabular/ofphil_synthetic_raw.csv.bak_narrative_revision` | 500 rows × 59 cols (917,088 bytes) | Preserved | Contains the earlier 167/129 unique narrative version |

### Verification of `ofphil_synthetic_raw(3).csv`
- A recursive workspace search confirmed no separate file named `ofphil_synthetic_raw(3).csv` resides inside the project tree; all structured (non-narrative) columns of `data/synthetic/tabular/ofphil_synthetic_raw.csv` are 100% bit-for-bit identical across `.bak_narrative_revision`, `.bak_v2_before_v3`, `backups/20261123T153623/ofphil_synthetic_raw.csv`, and the active file (`df_active.drop(columns=narr_cols).equals(df_backup.drop(columns=narr_cols)) == True`).
- Neither `eligibility` labels nor any structured financial, demographic, clinical, or document-indicator values were altered.

---

## 2. Structural & Schema Verification

- **Dimensions:** `500` rows × `59` columns (verified).
- **Duplicate Column Names:** `0`.
- **Completely Duplicated Records:** `0`.
- **Accidental Index Columns (`Unnamed: 0`, etc.):** `0`.
- **Malformed CSV Rows / Parsing Errors:** `0`.
- **Leading/Trailing Whitespace in Categorical/Text Cells:** `0` across all 53 object columns.
- **Target Column (`eligibility`):** Exact allowed values `{'ELIGIBLE': 250, 'INELIGIBLE': 250}` (0 nulls, 50.0% / 50.0% experimental balance).
- **100% Empty Columns:** `1` (`other_eligibility_certifications` has 500/500 `NaN`, mirroring the optional uncategorized certification column in the source schema; preserved to maintain the 59-column raw schema and marked `eligible_model_feature = False` in the data dictionary).
- **Category Spelling / Capitalization Variants Identified in Raw Data:**
  1. `housing_condition`: contains both `'Semi-Concrete'` (85 rows) and `'Semi-concrete'` (3 rows), plus compound descriptors (`'Concrete; Semi-Concrete'`, `'Wood; Light Materials'`). Preserved raw in `ofphil_synthetic_raw.csv`; normalized in **Notebook 02** and **Notebook 03**.
  2. `residence_status`: contains 15 raw tenure descriptors (`'Owner'`, `'Owned'`, `'Renter'`, `'Rented'`, `'Renting'`, `'Informal Settler'`, `'Rent-free'`, `'Mortgaged'`, `'Free (Owned by Sibling)'`, `'Living with parents'`, `'Owner (Mother-in-Law)'`, `'Living with daughter'`, `'Owned by aunt'`, `'Owner (Siblings)'`, `'Living with niece'`). Preserved raw in `ofphil_synthetic_raw.csv`; all 15 values are now explicitly mapped in **Notebook 02** and **Notebook 03**.
  3. `marital_status`: contains `'Common-law partner'` (14), `'Live-in'` (8), and `'Common-Law'` (4); normalized to `'Common-Law'` in **Notebook 02** and **Notebook 03**.
- **Numeric & Date Ranges:**
  - `age`: `18` to `85` years (`0` nulls, `0` out-of-range values).
  - `household_size`: `1.0` to `7.0` (`0` nulls, `0` values `< 1`).
  - `number_of_dependents`: `0.0` to `5.0` (`0` nulls, `0` negative values, `0` fractional values, `0` rows where `number_of_dependents >= household_size`).
  - `date_registered` and `date_available`: valid ISO dates `2025-01-01` to `2025-12-28` (`0` unparsable, identical across all 500 rows).
  - `follow_up_date`: `178` non-null valid ISO dates `2025-02-01` to `2025-12-28` (`0` unparsable, `0` rows where `follow_up_date < date_registered`).

---

## 3. Complete 59-Column Schema, Missingness Profile, and Role Classification

| # | Column Name | Raw Dtype | Null Count | Null % | Section 7 Role Classification | Included in NB05 `X`? | Notes / Audit Findings |
|---:|---|---|---:|---:|---|---:|---|
| 1 | `age` | `int64` | 0 | 0.0% | Candidate predictor (Fairness audit attribute) | Isolated in `demographics_df` | Range 18–85; excluded from primary `X` to prevent direct age discrimination |
| 2 | `sex` | `str` | 0 | 0.0% | Candidate predictor (Fairness audit attribute) | Isolated in `demographics_df` | `M` (270), `F` (230) |
| 3 | `marital_status` | `str` | 42 | 8.4% | Candidate predictor (Fairness audit attribute) | No | 7 raw labels -> 5 canonical labels in NB02/03 |
| 4 | `number_of_dependents` | `float64` | 0 | 0.0% | Candidate predictor | **Yes (Numeric)** | `0 <= dep <= household_size - 1` holds for all 500 rows |
| 5 | `monthly_family_income` | `str` | 69 | 13.8% | Candidate predictor | **Yes (Numeric)** | Raw PHP string (`₱0.00` to `₱125,000.00`); 100% parsable |
| 6 | `monthly_household_obligations_expenses` | `str` | 116 | 23.2% | Candidate predictor | **Yes (Numeric)** | Raw PHP string (`₱1,400.00` to `₱48,500.00`); 100% parsable |
| 7 | `employment_status` | `str` | 30 | 6.0% | Candidate predictor | **Yes (Categorical)** | 6 distinct categories |
| 8 | `occupation` | `str` | 114 | 22.8% | Candidate predictor | No (high cardinality: 43) | Note: 163 rows have string `'Unemployed'` while 114 are `NaN` |
| 9 | `household_size` | `float64` | 0 | 0.0% | Candidate predictor | **Yes (Numeric)** | Range 1–7 |
| 10 | `residence_status` | `str` | 83 | 16.6% | Candidate predictor | **Yes (Categorical)** | 15 raw values -> 5 canonical tenure groups in NB02/03 |
| 11 | `educational_attainment` | `str` | 217 | 43.4% | Candidate predictor | **Yes (Categorical)** | 8 raw values; covered in NB02/03 |
| 12 | `sectoral_membership` | `str` | 248 | 49.6% | Candidate predictor (Proxy / Fairness attribute) | No | Correlates with `age >= 60` (`Senior Citizen`) and disability |
| 13 | `housing_condition` | `str` | 186 | 37.2% | Candidate predictor | No | 24 raw values (`Semi-concrete` normalized to `Semi-Concrete` in NB02/03) |
| 14 | `monthly_utility_expenses` | `str` | 45 | 9.0% | Candidate predictor | No | Raw PHP string; 6 rows exceed `monthly_household_obligations_expenses` |
| 15 | `diagnosis` | `str` | 0 | 0.0% | Candidate predictor | No (88 distinct clinical strings) | Ophthalmic clinical diagnosis |
| 16 | `diagnosis_severity` | `str` | 149 | 29.8% | Candidate predictor | **Yes (Categorical)** | `Severe` (173), `Moderate` (157), `Mild` (17), plus 4 compound rows |
| 17 | `procedure` | `str` | 0 | 0.0% | Candidate predictor | No (78 distinct clinical strings) | Recommended ophthalmic surgical/clinical procedure |
| 18 | `type_of_treatment_surgery` | `str` | 39 | 7.8% | Candidate predictor | **Yes (Categorical)** | `Surgery` (422), `Outpatient` (36), `Diagnostic / Consultation` (3) |
| 19 | `laterality` | `str` | 0 | 0.0% | Candidate predictor | No | `OD` (238), `OS` (226), `OU` (36) |
| 20 | `patient_clinical_type` | `str` | 40 | 8.0% | Candidate predictor | No | `New` (278), `Old` (182) |
| 21 | `disability_status` | `str` | 207 | 41.4% | Candidate predictor (Sensitive health attribute) | No | 7 distinct values |
| 22 | `cost_of_treatment` | `str` | 0 | 0.0% | Candidate predictor | **Yes (Numeric)** | Raw PHP string (`₱2,500.00` to `₱75,000.00`) |
| 23 | `estimated_treatment_expenses` | `str` | 0 | 0.0% | Derived field (100% equal to `cost_of_treatment`) | No (collinear duplicate) | Identical to `cost_of_treatment` in all 500 rows |
| 24 | `follow_up_date` | `str` | 322 | 64.4% | Administrative/documentation field | No | ISO date string |
| 25 | `medical_abstract_or_certificate` | `str` | 115 | 23.0% | Candidate predictor | No | `Present` (226), `Absent` (159) |
| 26 | `medical_record_diagnosis_treatment_plan` | `str` | 115 | 23.0% | Candidate predictor | No | `Present` (246), `Absent` (139) |
| 27 | `assistance_type` | `str` | 0 | 0.0% | Candidate predictor | **Yes (Categorical)** | `FIRST ASSISTANCE` (466), `SECOND ASSISTANCE` (31), `THIRD ASSISTANCE` (3) |
| 28 | `quotation_particular` | `str` | 1 | 0.2% | Candidate predictor | No | Line-item surgical/clinical particulars |
| 29 | `quotation_amount` | `str` | 0 | 0.0% | Derived field (100% equal to `cost_of_treatment`) | No (collinear duplicate) | Identical to `cost_of_treatment` in all 500 rows |
| 30 | `quotation_remarks` | `str` | 0 | 0.0% | Administrative/documentation field | No | 4 package description strings |
| 31 | `total_amount` | `str` | 0 | 0.0% | Derived field (100% equal to `cost_of_treatment`) | No (collinear duplicate) | Identical to `cost_of_treatment` in all 500 rows |
| 32 | `approved_financial_assistance` | `str` | 59 | 11.8% | **Post-decision field (Target Leakage)** | **Excluded** | `> 0` in 244/245 non-null `ELIGIBLE` rows; `₱0.00` in all 196 non-null `INELIGIBLE` rows |
| 33 | `existing_financial_assistance` | `str` | 371 | 74.2% | Candidate predictor | No | Raw PHP string (`₱0.00` to `₱20,000.00`) |
| 34 | `outstanding_medical_bills` | `str` | 219 | 43.8% | Candidate predictor | No | Raw PHP string |
| 35 | `other_sources_of_financial_support` | `str` | 84 | 16.8% | Candidate predictor | No | 5 categories uniformly distributed (83–84 each) |
| 36 | `remaining_medical_expenses` | `str` | 59 | 11.8% | **Post-decision field (Derived from col 32)** | **Excluded** | Equals `total_amount - approved_financial_assistance` in 441/441 non-null rows |
| 37 | `case_study_narrative` | `str` | 0 | 0.0% | Candidate predictor (Text modality) | Excluded from tabular `X` | Pre-decision intake summary (v4 label-neutral) |
| 38 | `interview_responses` | `str` | 50 | 10.0% | Candidate predictor (Text modality) | Excluded from tabular `X` | Patient-reported intake statements (v4 label-neutral) |
| 39 | `social_economic_assessment` | `str` | 35 | 7.0% | Candidate predictor (Text modality) | Excluded from tabular `X` | Factual financial/housing assessment + per-person income band |
| 40 | `assessment_notes` | `str` | 29 | 5.8% | **Post-decision field** (cites recorded `status`) | **Excluded** | Casework checklist, missing-data notes, follow-up, and recorded status |
| 41 | `social_worker_assessment_rating` | `str` | 0 | 0.0% | **Post-decision field / Requires review (100% leak)** | **Excluded** | `High Need` = 250/250 `ELIGIBLE`; `Moderate/Low Need` = 250/250 `INELIGIBLE` |
| 42 | `relevant_social_worker_findings` | `str` | 32 | 6.4% | **Post-decision field** (cites rating/status) | **Excluded** | Professional observations including recorded need rating and status |
| 43 | `proof_of_income_employment` | `str` | 116 | 23.2% | Candidate predictor | No (summarized in col 55) | `Present` (62), `Absent` (322) |
| 44 | `certificate_of_indigency` | `str` | 94 | 18.8% | Candidate predictor | No (summarized in col 55) | `Present` (226), `Absent` (180) |
| 45 | `social_welfare_assessment_certification` | `str` | 219 | 43.8% | Candidate predictor | No (summarized in col 55) | `Present` (46), `Absent` (235) |
| 46 | `government_assistance_certification` | `str` | 186 | 37.2% | Candidate predictor | No (summarized in col 55) | `Present` (21), `Absent` (293) |
| 47 | `ngo_charity_assistance_certification` | `str` | 208 | 41.6% | Candidate predictor | No (summarized in col 55) | `Present` (19), `Absent` (273) |
| 48 | `other_eligibility_certifications` | `float64` | 500 | 100.0% | Administrative/documentation field (100% null) | No | Structural schema column; 100% `NaN` |
| 49 | `government_id` | `str` | 120 | 24.0% | Candidate predictor | No (summarized in col 55) | `Present` (189), `Absent` (191) |
| 50 | `payslip_document` | `str` | 157 | 31.4% | Candidate predictor | No (summarized in col 55) | `Present` (49), `Absent` (294) |
| 51 | `utility_bill_document` | `str` | 168 | 33.6% | Candidate predictor | No (summarized in col 55) | `Present` (97), `Absent` (235) |
| 52 | `referral_letter` | `str` | 124 | 24.8% | Candidate predictor | No (summarized in col 55) | `Present` (189), `Absent` (187) |
| 53 | `philhealth_document` | `str` | 152 | 30.4% | Candidate predictor | No (summarized in col 55) | `Present` (92), `Absent` (256) |
| 54 | `total_supporting_documents` | `float64` | 0 | 0.0% | Derived field (Candidate predictor) | **Yes (Numeric)** | Exact sum of `'Present'` across socio-legal cols 43–53 (sum = 990) |
| 55 | `document_category_diversity` | `float64` | 0 | 0.0% | Derived field (100% equal to col 54) | No (collinear duplicate) | Identical to `total_supporting_documents` in all 500 rows |
| 56 | `date_available` | `str` | 0 | 0.0% | Administrative/documentation field | No | Identical to `date_registered` in all 500 rows |
| 57 | `date_registered` | `str` | 0 | 0.0% | Administrative/documentation field | No | ISO registration date in 2025 |
| 58 | `status` | `str` | 0 | 0.0% | **Post-decision field (100% Target Leakage)** | **Excluded** | `FIRST-TIME`/`MAX`/`APPROVED` = `ELIGIBLE`; `DISAPPROVED`/`PROMISSORY` = `INELIGIBLE` |
| 59 | `eligibility` | `str` | 0 | 0.0% | **Target** | Target `y` | `ELIGIBLE` (250), `INELIGIBLE` (250) |

---

## 4. Narrative Quality, Duplication, and Factual Consistency Audit

### 4.1 Defects Found in the Earlier v3 Narrative Layer (and Corrected in v4)
During this audit, inspection of the pre-audit v3 narratives revealed three issues against Section 4 requirements:
1. **Direct Target-Branching Leakage in Pre-Decision Narratives:** In v3, `case_study_narrative` and `interview_responses` branched directly on `row['eligibility']`, inserting `"Assessed as indigent"` / `"Said the family cannot shoulder the procedure cost"` for `ELIGIBLE` rows and `"Assessed as non-indigent"` / `"Said the family can pay"` for `INELIGIBLE` rows—even when the row's actual per-capita income contradicted that statement (e.g., 14 `INELIGIBLE` rows have per-capita income `≤ ₱4,715.76` and 15 `ELIGIBLE` rows have per-capita income `> ₱7,410.48`).
2. **Unsupported Symptom Claims:** v3 mapped diagnosis substrings (`cataract`, `retinopathy`, `glaucoma`, `pterygium`) to symptom descriptions (`"glare and difficulty seeing in dim light"`, `"dark patches in the visual field"`) not present in any structured column.
3. **High-Frequency Sentence Reuse:** Because v3 used only 3–4 phrasings per clause and always formatted currency identically, single sentences such as `"has no current occupation recorded."` recurred 134 times across `case_study_narrative`.

### 4.2 Active v4 Narrative Metrics (Verified on `ofphil_synthetic_raw.csv`)
All five narrative columns were regenerated in v4 (`gen_narratives_v4.py`) using strictly record-supported facts, label-neutral composition for the three pre-decision narrative fields (`case_study_narrative`, `interview_responses`, `social_economic_assessment`), per-person OFPHIL reference income bands, and a tighter normalized 4-gram Jaccard rejection threshold (`0.44`):

| Narrative Field | Total Rows | Non-Empty | Missing | Exact Unique | Exact Duplicates | Max Repeat | Normalized TF-IDF Mean Sim | Normalized TF-IDF Max Sim | Normalized TF-IDF Pairs > 0.85 | Word Count (Min / Median / Max) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `case_study_narrative` | 500 | 500 | 0 (0.0%) | **500** | **0** | **1** | 0.132 | 0.668 | **0** | 9 / 45 / 86 |
| `interview_responses` | 500 | 450 | 50 (10.0%) | **450** | **0** | **1** | 0.231 | 0.815 | **0** | 13 / 45 / 76 |
| `social_economic_assessment` | 500 | 465 | 35 (7.0%) | **465** | **0** | **1** | 0.164 | 0.831 | **0** | 9 / 25 / 49 |
| `assessment_notes` | 500 | 471 | 29 (5.8%) | **471** | **0** | **1** | 0.110 | 0.770 | **0** | 7 / 24 / 54 |
| `relevant_social_worker_findings` | 500 | 468 | 32 (6.4%) | **468** | **0** | **1** | 0.115 | 0.767 | **0** | 7 / 28 / 58 |

> *Note on Normalized TF-IDF Evaluation:* Before computing TF-IDF cosine similarity (1–2 word n-grams), all currency amounts, numbers, and third-person pronouns were masked to generic placeholders so that paragraphs differing only by substituted numbers or pronouns would score `1.000`. Even under this strict number-masked test, **0 pairs exceed 0.85 similarity** across all five columns.

### 4.3 Factual Consistency Verification Across All 500 Rows
Automated row-by-row verification (`check_quality_v4.py`) confirmed **0 unsupported claims**:
- `promissory` mentioned when `status != 'PROMISSORY'`: **0 rows**.
- `disapproved` mentioned when `status != 'DISAPPROVED'`: **0 rows**.
- Unverified action verbs (`signed`, `confirmed`, `verified`, `agreed`, `referred by`): **0 occurrences**.
- Unsupported document claims (claiming a document is on file when its column is not `'Present'`): **0 rows**.
- Household size or dependent count mismatch against `household_size` / `number_of_dependents`: **0 rows**.
- Income claim when `monthly_family_income` is `NaN`: **0 rows**.
- Prohibited artificial terms (`synthetic`, `simulated`, `test patient`, `sample record`, `generated patient`): **0 occurrences**.

---

## 5. Financial and Numerical Consistency Audit

### 5.1 Currency Parsing & Basic Invariants
- All 11 currency columns (`monthly_family_income`, `monthly_household_obligations_expenses`, `monthly_utility_expenses`, `cost_of_treatment`, `estimated_treatment_expenses`, `quotation_amount`, `total_amount`, `approved_financial_assistance`, `existing_financial_assistance`, `outstanding_medical_bills`, `remaining_medical_expenses`) are stored as raw PHP strings (`₱...`) and parse to `float64` with **0 unparsable non-null values** and **0 negative values**.
- `household_size` is positive (`1` to `7`) with `0` nulls.
- `number_of_dependents` is non-negative (`0` to `5`) and satisfies `number_of_dependents <= household_size - 1` on **500 / 500 rows**.

### 5.2 Treatment Cost & Remaining Balance Accounting
1. **Collinear Treatment Cost Columns:** Across all **500 / 500 rows**, `cost_of_treatment == estimated_treatment_expenses == quotation_amount == total_amount` (0 discrepancies). Only one of these four columns (`cost_of_treatment`) should be included as a model feature.
2. **Remaining Medical Expenses Formula:** Across all **441 / 441 rows** where `remaining_medical_expenses` and `approved_financial_assistance` are non-null (both are `NaN` on the exact same 59 rows: 5 `ELIGIBLE`, 54 `INELIGIBLE`), the dataset satisfies:
   $$\texttt{remaining\_medical\_expenses} = \texttt{total\_amount} - \texttt{approved\_financial\_assistance}$$
   - **Documented Limitation (76 rows):** When `existing_financial_assistance > 0` (76 of the 441 rows), `existing_financial_assistance` is **not** deducted from `remaining_medical_expenses` (and in 8 rows, `approved_financial_assistance + existing_financial_assistance > total_amount`). Per Rule 12, raw financial values were not silently altered; `remaining_medical_expenses` is a post-decision column excluded from model training.
3. **Utility vs. Household Obligations (6 rows):** In **6 of 500 rows**, `monthly_utility_expenses > monthly_household_obligations_expenses` (contrary to the claim in `ofphil_synthetic_generation_report.md`). These 6 rows are now explicitly flagged by **Notebook 01** Cell 11 during data-quality verification.
4. **Unemployed Patient with Positive Family Income (197 rows):** In 197 rows where the patient's `employment_status == 'Unemployed'`, `monthly_family_income > 0`. This is domain-valid because `monthly_family_income` measures total household earnings across all household members (`household_size` up to 7), not personal patient wage alone.

### 5.3 OFPHIL Per-Capita Income Classification vs. Synthetic `eligibility`
Using `per_capita_income = monthly_family_income / household_size` against the agreed OFPHIL financial classification table:

| OFPHIL Income-Based Classification | Monthly Per-Capita Bracket | `ELIGIBLE` (n=250) | `INELIGIBLE` (n=250) | Total (n=500) |
|---|---|---:|---:|---:|
| **Indigent** | Up to ₱4,715.76 | 186 | 14 | 200 |
| *└─ Below Reference Threshold* | *Up to ₱3,368.40* | *(174)* | *(4)* | *(178)* |
| **Financially Incapacitated B1** | ₱4,715.77–₱6,063.12 | 11 | 18 | 29 |
| **Financially Incapacitated B2** | ₱6,063.13–₱7,410.48 | 4 | 34 | 38 |
| **Financially Capacitated** | Above ₱7,410.48 | 15 | 149 | 164 |
| **Missing Income (`NaN`)** | `monthly_family_income` is `NaN` | 34 | 35 | 69 |

- **Boundary Check:** `0` records fall within `±₱0.005` of the boundary cutoffs (`₱3,368.40`, `₱4,715.76`, `₱4,715.77`, `₱6,063.12`, `₱6,063.13`, `₱7,410.48`), so floating-point rounding cannot flip any record's income bracket.

---

## 6. Eligibility Label and MSW Rubric Audit

### 6.1 Three Distinct Components
1. **Income-Based Financial Classification (4-tier):** Derived strictly from `monthly_family_income / household_size` (`Indigent`, `B1`, `B2`, `Financially Capacitated`).
2. **MSW Assessment Rubric Indicators:**
   - Formula: $\text{Total Risk (\%)} = (\text{Average Severity} \times 8.5) + (\text{Average Coping} \times 5.0)$ (implemented in `backend/app/services/classification_service.py` on a 1–5 factor scale, yielding a theoretical range of `13.5%` to `67.5%`).
   - Triggers:
     - **Indigent:** $\text{Avg Severity} \ge 3.8$ OR $\text{Avg Coping} \ge 3.8$ OR $\text{Total Risk} \ge 65\%$ OR ($\text{Household income} \le ₱14,000$ on initial load only).
     - **B1:** $\text{Avg Severity} \ge 2.8$ OR $\text{Avg Coping} \ge 2.8$ OR $\text{Total Risk} \ge 45\%$.
     - **B2:** $\text{Total Risk} \ge 30\%$ OR ($\text{Household income} \le ₱25,000$ on initial load only).
     - **Financially Capacitated:** All indicators below thresholds.
3. **Synthetic Target Label (`eligibility`):** Binary target (`ELIGIBLE` vs `INELIGIBLE`) balanced 250/250 for controlled machine-learning experimentation.

### 6.2 Audit Findings on Rubric Verification in the Tabular Dataset
- **Missing Rubric Sub-Scores in 59-Column Schema:** The 59-column raw tabular dataset (`ofphil_synthetic_raw.csv`, inheriting the 70-column `charity-patient.csv` schema minus 11 identifiers) **does not contain** the multi-item Stage-2 MSW interview scores (`Average Severity`, `Average Coping`, or `Total Risk %`). It contains only clinical `diagnosis_severity` (`Mild`/`Moderate`/`Severe`) and the post-intake summary string `social_worker_assessment_rating` (`High Need` / `Moderate/Low Need`).
- **Records Flagged as Requiring Review (Not Silently Relabeled):**
  - **69 records** have `monthly_family_income = NaN` (34 `ELIGIBLE`, 35 `INELIGIBLE`) and cannot be income-bracketed without imputation.
  - **15 `ELIGIBLE` records** fall in the `Financially Capacitated` per-capita income band (`> ₱7,410.48`/person; e.g., high treatment cost or clinical severity override), and **14 `INELIGIBLE` records** fall in the `Indigent` per-capita income band (`≤ ₱4,715.76`/person; e.g., missing mandatory documents or repeat-assistance cap). Because the 59-column schema does not store numeric `Average Severity` and `Average Coping` scores, these 29 cross-band records + 69 missing-income records (**98 records total**) are documented as **requiring review** rather than fabricated or relabeled.

---

## 7. Data Leakage and Fairness Audit

### 7.1 Target Leakage Audit
Single-feature predictive power against `eligibility` across all 58 non-target columns identified three near-perfect or perfect post-decision leakage columns:
1. `status` (**100.0% accuracy**): `FIRST-TIME` (170), `MAX` (76), and `APPROVED` (4) occur **exclusively** in `ELIGIBLE` rows (250/250); `DISAPPROVED` (127) and `PROMISSORY` (123) occur **exclusively** in `INELIGIBLE` rows (250/250).
2. `social_worker_assessment_rating` (**100.0% accuracy**): `High Need` occurs in 250/250 `ELIGIBLE` rows; `Moderate/Low Need` occurs in 250/250 `INELIGIBLE` rows.
3. `approved_financial_assistance` (**98.8% accuracy**) and `remaining_medical_expenses`: `approved_financial_assistance > 0` in 244 of 245 non-null `ELIGIBLE` rows and `₱0.00` in all 196 non-null `INELIGIBLE` rows.
4. `assessment_notes` and `relevant_social_worker_findings`: cite the recorded post-intake `status` and `social_worker_assessment_rating`.

**Verification of Notebook 05 & 06 Feature Plan:**
- All six post-decision leakage columns (`status`, `social_worker_assessment_rating`, `approved_financial_assistance`, `remaining_medical_expenses`, `assessment_notes`, `relevant_social_worker_findings`) are **strictly excluded** from `X` in **Notebook 05** and explicitly tested in **Notebook 06** Cell 9 (`leakage_cols`).
- **Strong Pre-Decision Proxy Predictors (Documented Limitation):** Even after excluding post-decision fields, synthetic generation coupled `total_supporting_documents` (`0.950` single-feature accuracy) and `certificate_of_indigency` (`0.900` accuracy) tightly with `eligibility`. Downstream model evaluation must report ablation metrics with and without document-count features.

### 7.2 Demographic & Socioeconomic Representation
- **Sex:** `M` = 270 (54.0%, eligible rate 50.4%), `F` = 230 (46.0%, eligible rate 49.6%). Demographic parity difference = `0.0081`.
- **Age Groups:** `18–39` = 57 (11.4%, eligible rate 36.8%), `40–59` = 301 (60.2%, eligible rate 47.5%), `60+` = 142 (28.4%, eligible rate 60.6%). Empirical demographic parity difference across age groups = `0.2373`, reflecting higher senior-citizen indigency prevalence in the ophthalmic clinical population.
- **Employment Status Asymmetry (Documented Limitation):** Among `Self-Employed` patients (85 rows), 84 are `INELIGIBLE` and 1 is `ELIGIBLE`, whereas `Unemployed` patients (244 rows) are 197 `ELIGIBLE` and 47 `INELIGIBLE`. Consistent with Rule 7, demographic and socioeconomic groups were not artificially forced into equal distributions.

---

## 8. Document Metadata and Linkage Audit

Inspected `data/synthetic/documents/metadata/synthetic_document_metadata.csv` (1,068 rows × 12 columns) and `data/synthetic/documents/linkage/synthetic_patient_document_links.csv` (1,068 rows × 8 columns):

- **Synthetic Identifiers Only:** All patient IDs match `SYN-PAT-0001`..`SYN-PAT-0499` (`340` unique patients with `≥ 1` linked document; `160` patients with `0` linked documents). All document IDs match `SYN-DOC-0001`..`SYN-DOC-1068` (`0` duplicates). All link IDs match `LNK-0001`..`LNK-1068` (`0` duplicates).
- **Orphan / Missing Reference Check:** `0` links pointing to non-existent patients, `0` links pointing to non-existent `document_id`s, `0` unlinked metadata records, `0` category mismatches between metadata and linkage tables.
- **Exact Alignment with 7 Tabular Document Columns:** When mapping row index `i` (`0..499`) to `SYN-PAT-{i+1:04d}`, the 7 document categories in `synthetic_document_metadata.csv` match the `'Present'` flags in `ofphil_synthetic_raw.csv` with **0 mismatches across all 1,068 links**:
  - `Certificate of Indigency` ↔ `certificate_of_indigency` (`226` rows)
  - `Medical Abstract` ↔ `medical_abstract_or_certificate` (`226` rows)
  - `Medical Referral Letter` ↔ `referral_letter` (`189` rows)
  - `Government-Issued Identification` ↔ `government_id` (`189` rows)
  - `Utility Bill` ↔ `utility_bill_document` (`97` rows)
  - `PhilHealth Documentation` ↔ `philhealth_document` (`92` rows)
  - `Payslip / Income Certificate` ↔ `payslip_document` (`49` rows)
- **Documented Findings on Derived Counts & Dates:**
  1. `total_supporting_documents` in `ofphil_synthetic_raw.csv` sums to **990** across the 500 patients because its generation formula sums `'Present'` across the **10 socio-legal flag columns** (columns 43–53: `226+189+189+97+92+49 = 842` from the 6 linked socio-legal categories, plus `62` `proof_of_income_employment`, `46` `social_welfare_assessment_certification`, `21` `government_assistance_certification`, and `19` `ngo_charity_assistance_certification` = `990`), excluding clinical flags `medical_abstract_or_certificate` (`226`) and `medical_record_diagnosis_treatment_plan` (`246`).
  2. `document_category_diversity` equals `total_supporting_documents` on all 500 rows because each flag column represents one distinct document category.
  3. Metadata `upload_date` spans `2026-08-01` to `2026-11-08`, whereas tabular `date_registered` spans `2025-01-01` to `2025-12-28` (+221 to +669 days).
  4. **Authenticity Governance Separation:** Metadata columns `document_status`, `verification_status`, `ocr_processing_status`, `signature_detection_status`, and `authenticity_review_status` are synthetic workflow simulation attributes and are **not** evidence of physical document authenticity.

---

## 9. Privacy and Identifier Verification

- **Excluded Direct/Quasi-Identifiers (11 columns absent from schema):** `charity_patient_no`, `surname`, `first_name`, `middle_name`, `contact_no`, `address`, `birthday`, `philhealth_no`, `doctor`, `ap_consultant`, `referred_by`.
- **Regex Scan Across All 500 × 59 Cells:** `0` Philippine mobile/landline phone numbers, `0` email addresses, `0` real patient names or real institutional IDs, and `0` occurrences of the word `"synthetic"` in any patient column.

---

## 10. Summary of Issues Corrected vs. Remaining Limitations

### Issues Corrected (With Backups in `data/synthetic/backups/20261123T153623/`)
1. **Narratives Rewritten (v4):** Eliminated direct target-label branching and unrecorded symptom claims in `case_study_narrative`, `interview_responses`, and `social_economic_assessment`; tightened normalized 4-gram Jaccard filtering so all 5 narrative columns have **0 exact duplicates (`max_repeat = 1`)** and **0 normalized TF-IDF pairs > 0.85**.
2. **Data Dictionary Enriched:** Replaced generic `"Synthetic raw field preserving source '<col>' schema."` descriptions and `"Synthetic ..."` example values in `ofphil_synthetic_data_dictionary.csv` with domain definitions, `allowed_values`, `field_role`, accurate dtypes, and leakage designations across all 59 columns.

### Remaining Non-Blocking Limitations
1. **6 rows** have `monthly_utility_expenses > monthly_household_obligations_expenses` (flagged in Notebook 01; `monthly_utility_expenses` is not used in Notebook 05 `X`).
2. **76 rows** with `existing_financial_assistance > 0` do not subtract `existing_financial_assistance` in `remaining_medical_expenses` (post-decision column excluded from `X`).
3. **98 rows** (69 with `monthly_family_income = NaN` and 29 where per-capita income bracket diverges from binary `eligibility`) cannot be cross-checked against the multi-item MSW rubric because `Average Severity` and `Average Coping` sub-scores are not part of the 59-column raw schema.
4. Metadata `upload_date` values are in 2026 while tabular `date_registered` values are in 2025.
