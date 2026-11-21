# OFPHIL Classification V2: Database Schema & Data Dictionary

## 1. Domain A: `public.user_profiles`
Stores system accounts mapped to Supabase authentication or clinical roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | Unique user identifier. |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Staff institutional email address. |
| `full_name` | `VARCHAR(255)` | NOT NULL | Complete name of clinical staff or researcher. |
| `role` | `VARCHAR(50)` | CHECK (`admin`, `msw`, `researcher`) | System access role. |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Account operational status. |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Registration timestamp. |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | Last profile modification timestamp. |

---

## 2. Domain B: `public.patients`
Anonymized master index of patient applicants.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | Unique surrogate identifier. |
| `patient_code` | `VARCHAR(64)` | UNIQUE, NOT NULL | Human-readable de-identified code (e.g. `OFPHIL-SYN-001`). |
| `first_name` | `VARCHAR(100)` | NULLABLE | Patient given name (masked in research views). |
| `last_name` | `VARCHAR(100)` | NULLABLE | Patient family name. |
| `age` | `INTEGER` | CHECK (0 - 130) | Patient age at intake. |
| `gender` | `VARCHAR(20)` | CHECK | Biological sex / gender category. |
| `barangay` | `VARCHAR(150)` | NULLABLE | Residential barangay jurisdiction. |
| `city` | `VARCHAR(150)` | NULLABLE | Municipality or City. |
| `province` | `VARCHAR(150)` | NULLABLE | Province location. |
| `is_synthetic` | `BOOLEAN` | DEFAULT TRUE | Mandatory flag separating synthetic from real patients. |

---

## 3. Domain C: `public.socioeconomic_assessments`
Medical Social Worker intake survey data and economic features for CatBoost.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | Unique assessment transaction identifier. |
| `patient_id` | `UUID` | FK `patients(id)` ON DELETE CASCADE | Associated patient. |
| `assessor_id` | `UUID` | FK `user_profiles(id)` | Evaluating Medical Social Worker. |
| `monthly_household_income` | `NUMERIC(12,2)` | NOT NULL | Total family earnings in Philippine Pesos (PHP). |
| `household_size` | `INTEGER` | CHECK (>= 1) | Number of individuals living in residence. |
| `number_of_dependents` | `INTEGER` | DEFAULT 0 | School-age or non-working family dependents. |
| `housing_type` | `VARCHAR(100)` | NULLABLE | Dwelling category (Owned, Rented, Informal Settlement). |
| `philhealth_category` | `VARCHAR(100)` | NULLABLE | Health insurance bracket (Indigent, Contributor, etc.). |
| `social_worker_narrative` | `TEXT` | NULLABLE | Case narrative transformed via Sentence-BERT. |
| `assessment_status` | `VARCHAR(50)` | CHECK (`draft`, `submitted`, `verified`) | Status of the social intake. |

---

## 4. Domain D: `public.clinical_records`
Ophthalmological diagnostic and surgical recommendation data.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | Unique clinical intake record. |
| `patient_id` | `UUID` | FK `patients(id)` ON DELETE CASCADE | Associated patient. |
| `primary_ophthalmic_diagnosis` | `VARCHAR(255)` | NOT NULL | Clinical pathology (e.g., Cataract, Glaucoma, Pterygium). |
| `eye_affected` | `VARCHAR(20)` | CHECK (`OD`, `OS`, `OU`) | Ophthalmic laterality. |
| `visual_acuity_od` | `VARCHAR(50)` | NULLABLE | Right eye Snellen visual acuity. |
| `visual_acuity_os` | `VARCHAR(50)` | NULLABLE | Left eye Snellen visual acuity. |
| `recommended_procedure` | `VARCHAR(255)` | NULLABLE | Proposed intervention (e.g. Phacoemulsification). |
| `clinical_urgency_score` | `NUMERIC(3,2)` | NULLABLE (0.00 - 1.00) | Priority metric for immediate surgical scheduling. |

---

## 5. Domain E: `public.documents`
Metadata and extraction results for uploaded certificates and abstracts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | Unique document identifier. |
| `patient_id` | `UUID` | FK `patients(id)` ON DELETE CASCADE | Associated patient record. |
| `document_type` | `VARCHAR(100)` | NOT NULL | Indigency Certificate, Referral Abstract, etc. |
| `storage_path` | `VARCHAR(500)` | NOT NULL | Safe server-side filesystem or S3/Supabase path. |
| `file_size_bytes` | `BIGINT` | NOT NULL | Binary file length. |
| `mime_type` | `VARCHAR(100)` | NOT NULL | `application/pdf`, `image/png`, `image/jpeg`. |
| `sha256_hash` | `VARCHAR(64)` | NULLABLE | Cryptographic SHA-256 integrity hash. |
| `ocr_processed` | `BOOLEAN` | DEFAULT FALSE | Status flag for PaddleOCR/TrOCR execution. |
| `extracted_text` | `TEXT` | NULLABLE | Full OCR string extraction. |
| `ocr_confidence` | `NUMERIC(5,4)` | NULLABLE | Model confidence score. |
| `stamps_detected_count` | `INTEGER` | DEFAULT 0 | YOLO detected official barangay rubber seals. |
| `signatures_detected_count`| `INTEGER` | DEFAULT 0 | YOLO localized authorized signatures. |
| `tamper_risk_level` | `VARCHAR(50)` | DEFAULT `clean` | Error Level Analysis anomaly risk assessment. |

---

## 6. Domain F: `public.eligibility_assessments`
Dual-layer decision records: CatBoost ML predictions vs. Final MSW institutional sign-offs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | Unique eligibility decision transaction. |
| `patient_id` | `UUID` | FK `patients(id)` ON DELETE CASCADE | Evaluated patient. |
| `assessment_id` | `UUID` | FK `socioeconomic_assessments(id)` | Linked survey intake. |
| `model_version` | `VARCHAR(100)` | NOT NULL | Exact ML checkpoint (e.g., `CatBoost-v2.1`). |
| `predicted_eligibility` | `VARCHAR(100)` | NOT NULL | Predicted category (`Class A`, `Class B`, `Self-Pay`). |
| `model_confidence` | `NUMERIC(5,4)` | NOT NULL | Calibrated probability of eligibility. |
| `shap_summary` | `JSONB` | NULLABLE | Key local feature attribution Shapley values. |
| `final_institutional_decision` | `VARCHAR(100)`| NULLABLE | Human-in-the-Loop decision (`Approved`, `Rejected`). |
| `approved_subsidy_percentage` | `NUMERIC(5,2)` | NULLABLE | Charity foundation subsidy grant (0% to 100%). |
| `approved_by_user_id` | `UUID` | FK `user_profiles(id)` | Licensed social worker authorizer. |
| `decision_timestamp` | `TIMESTAMPTZ` | NULLABLE | Timestamp of institutional decision. |
