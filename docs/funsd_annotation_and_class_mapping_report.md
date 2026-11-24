# FUNSD Annotation & Semantic Class Mapping Audit Report

**Project**: `ofphil-classification-v2`  
**Dataset**: FUNSD (Form Understanding in Noisy Scanned Documents)  
**Audit Scope**: Granular semantic audit of all 563 mapped `header` annotations against OFPHIL `FORM_SECTION (0)`

---

## 1. Raw Annotation Inventory & Unmapped Classes

Each FUNSD document JSON consists of an array of form entities (`"form"`):

| Semantic Label | Train Count | Test Count | Combined Total | % of Raw Dataset | OFPHIL Mapping Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`question`** | 3,266 | 1,077 | 4,343 | 44.58% | **UNMAPPED** (Micro form field prompts) |
| **`answer`** | 2,802 | 821 | 3,623 | 37.19% | **UNMAPPED** (Typewritten/printed without handwriting metadata) |
| **`other`** | 902 | 312 | 1,214 | 12.46% | **UNMAPPED** (Miscellaneous background tokens) |
| **`header`** | 441 | 122 | 563 | 5.77% | **AUDITED BELOW** |
| **Total** | **7,411** | **2,332** | **9,743** | **100.0%** | |

### Confirmation of Unsupported OFPHIL Classes:
- `HANDWRITTEN_ENTRY (1)`: **UNSUPPORTED** (FUNSD answers lack optical handwriting annotations).
- `SIGNATURE (2)`: **UNSUPPORTED** (No signature bounding boxes).
- `STAMP_OR_SEAL (3)`: **UNSUPPORTED** (No official stamp/seal annotations).
- `TABLE_CELL (4)`: **UNSUPPORTED** (Unsegmented at table cell grid level).
- `CHECKMARK_OR_CHECKBOX (5)`: **UNSUPPORTED** (No checkbox bounding boxes).

---

## 2. Granular Audit of the 563 Mapped Header Boxes

A systematic semantic audit was conducted across all 563 converted `header` entities using the review categories specified by project governance:

| Semantic Review Category | Total Count | % of Headers | Description & Review Findings |
| :--- | :---: | :---: | :--- |
| **`TEXT_HEADING_ONLY`** | **384** | **68.21%** | Localized text headings, inline bold titles, and table column names without macro form-section boundaries. Incompatible with OFPHIL macro-sections. |
| **`DOCUMENT_TITLE_ONLY`** | **118** | **20.96%** | Document titles and banners positioned at the top of the form (e.g., "EXPENSE REPORT", "MEMORANDUM"). |
| **`VALID_FORM_SECTION`** | **33** | **5.86%** | Genuine structural section dividers (e.g., "SECTION I", "GENERAL INFORMATION", "PART A"). |
| **`AMBIGUOUS`** | **25** | **4.44%** | Short codes, abbreviations, or isolated numbers (e.g., "NO.", "DATE", "TEL"). |
| **`INVALID_MAPPING`** | **3** | **0.53%** | Empty text tokens erroneously labeled as headers in the source annotations. |
| **Total Audited** | **563** | **100.0%** | |

---

## 3. Visual Review Artifacts & Data Locations

- **Full Review CSV**: [`data/external/yolo_document_detection/interim/class_mapping/funsd_header_semantic_review.csv`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/yolo_document_detection/interim/class_mapping/funsd_header_semantic_review.csv)  
  *Contains all 563 records with `image_filename`, `annotation_id`, `text`, `original_bbox`, `converted_bbox`, `proposed_target_class`, `semantic_review_status`, and `review_reason`.*
- **Visual Contact Sheet (5x5 Grid)**: [`data/external/yolo_document_detection/interim/class_mapping/funsd_header_semantic_contact_sheet.png`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/yolo_document_detection/interim/class_mapping/funsd_header_semantic_contact_sheet.png)  
  *Visualizes 25 representative header crops color-coded by category (Green: VALID_FORM_SECTION, Blue: DOCUMENT_TITLE_ONLY, Orange: TEXT_HEADING_ONLY, Purple: AMBIGUOUS, Red: INVALID_MAPPING).*

---

## 4. Final Semantic Mapping Determination

Because **68.2%** of FUNSD header entities represent localized text headings rather than regional form dividers, forcing them into OFPHIL's `FORM_SECTION (0)` class would introduce severe scale variance and bounding-box inconsistency into the YOLOv8n detector. Therefore, FUNSD is preserved as an **auxiliary evaluation benchmark only** and is **excluded from primary YOLOv8n training**.
