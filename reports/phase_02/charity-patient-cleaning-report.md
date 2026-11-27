# Charity Patient Dataset Cleaning Report

- **Source File:** `data\raw\tabular\samples\charity-patient.csv` (unmodified)
- **Cleaned Output:** `data\interim\validated\charity-patient-cleaned-v1.csv`
- **Original Shape:** `1000` rows × `47` columns
- **Final Shape:** `798` rows × `47` columns
- **Exact Duplicate Rows Removed:** `202`
- **Remaining Exact Duplicates:** `0` (verified)
- **`marital_status` Removed:** `True` (verified)
- **Target Labels Modified:** `False` (no labels altered, generated, or rebalanced)

## Target Distribution (`eligibility`)

| Label | Before Cleaning | After Cleaning |
|---|---:|---:|
| `ELIGIBLE` | 500 | 499 |
| `INELIGIBLE` | 500 | 299 |

## Missing-Value Summary After Cleaning (Columns with > 0 Nulls)

| Column | Missing Count |
|---|---:|
| `number_of_dependents` | 25 |
| `monthly_family_income` | 25 |
| `monthly_household_obligations_expenses` | 25 |
| `employment_status` | 25 |
| `occupation` | 25 |
| `household_size` | 25 |
| `residence_status` | 25 |
| `educational_attainment` | 101 |
| `sectoral_membership` | 297 |
| `housing_condition` | 25 |
| `monthly_utility_expenses` | 25 |
| `diagnosis_severity` | 25 |
| `doctor` | 25 |
| `patient_clinical_type` | 25 |
| `disability_status` | 305 |
| `follow_up_date` | 485 |
| `medical_abstract_or_certificate` | 131 |
| `medical_record_diagnosis_treatment_plan` | 137 |
| `existing_financial_assistance` | 798 |
| `other_sources_of_financial_support` | 25 |
| `proof_of_income_employment` | 90 |
| `certificate_of_indigency` | 25 |
| `social_welfare_assessment_certification` | 185 |
| `government_assistance_certification` | 176 |
| `ngo_charity_assistance_certification` | 185 |
| `other_eligibility_certifications` | 602 |
| `government_id` | 117 |
| `payslip_document` | 163 |
| `utility_bill_document` | 163 |
| `referral_letter` | 138 |
| `philhealth_document` | 163 |
| `total_supporting_documents` | 25 |
| `document_category_diversity` | 25 |
| `date_registered` | 9 |
