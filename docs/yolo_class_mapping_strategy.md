# YOLO Class Mapping Strategy & Registry

**Project**: `ofphil-classification-v2`  
**Registry Reference**: `data/external/yolo_document_detection/metadata/class_mapping_registry.json`

---

## 1. Target OFPHIL Document Detection Taxonomy

The OFPHIL V2 document detection pipeline consolidates visual layout elements into six primary classes derived from `annotation_box_types.json`:

| Class ID | Target Class Name | Visual Description | Typical Clinical Document Exemplar |
| :---: | :--- | :--- | :--- |
| **0** | `FORM_SECTION` | Printed section headers, institutional titles, and text blocks | "OFFICE OF THE PUNONG BARANGAY", "STATEMENT OF ACCOUNT" |
| **1** | `HANDWRITTEN_ENTRY` | Handwritten patient disclosures and notes | Handwritten monthly income, patient age, diagnosis |
| **2** | `SIGNATURE` | Handwritten signatures of patients, doctors, officials | MSW signature, physician license endorsement |
| **3** | `STAMP_OR_SEAL` | Official rubber stamps, dry seals, barangay logos | Barangay circular ink stamp, notary seal |
| **4** | `TABLE_CELL` | Tabular grid cells, fee rows, itemized charges | Lens quotation fee cell, medication breakdown row |
| **5** | `CHECKMARK_OR_CHECKBOX` | Checkboxes, marked ballots, option toggles | PhilHealth member category checkbox (`Indigent` / `Employed`) |

---

## 2. External Dataset Source-to-Target Mappings

### A. DocLayNet (IBM Research)
- `Section-header` $\rightarrow$ `FORM_SECTION` (High confidence: direct semantic match)
- `Page-header` $\rightarrow$ `FORM_SECTION` (High confidence: top document banner)
- `Title` $\rightarrow$ `FORM_SECTION` (High confidence: main document title)
- `Page-footer` $\rightarrow$ `FORM_SECTION` (Medium confidence: footer zone)
- `Text` $\rightarrow$ `FORM_SECTION` (Medium confidence: printed body text)
- `Table` $\rightarrow$ `TABLE_CELL` (High confidence: tabular financial grid)
- `List-item` $\rightarrow$ `FORM_SECTION` (Low confidence: itemized instruction text)
- `Picture` $\rightarrow$ `UNMAPPED` (Preserves stamp/seal purity; pictures are not seals)
- `Caption`, `Footnote`, `Formula` $\rightarrow$ `UNMAPPED` (Irrelevant to social service forms)

### B. FUNSD (Jaume et al.)
- `header` $\rightarrow$ `FORM_SECTION` (High confidence: form section headers)
- `question` $\rightarrow$ `FORM_SECTION` (High confidence: printed intake prompts)
- `answer` $\rightarrow$ `HANDWRITTEN_ENTRY` (Medium confidence: filled form values)
- `other` $\rightarrow$ `UNMAPPED` (Miscellaneous background noise)

### C. XFUND (Microsoft Research Asia)
- `header` $\rightarrow$ `FORM_SECTION` (High confidence: multilingual form headers)
- `question` $\rightarrow$ `FORM_SECTION` (High confidence: multilingual prompts)
- `answer` $\rightarrow$ `HANDWRITTEN_ENTRY` (Medium confidence: multilingual filled entries)
- `other` $\rightarrow$ `UNMAPPED` (Uncategorized residual text)

### D. SROIE (ICDAR 2019)
- `company` $\rightarrow$ `FORM_SECTION` (High confidence: store/clinic letterhead)
- `date` $\rightarrow$ `FORM_SECTION` (Medium confidence: date issuance line)
- `address` $\rightarrow$ `FORM_SECTION` (Medium confidence: address block)
- `total` $\rightarrow$ `TABLE_CELL` (High confidence: billing grand total)

---

## 3. Mapping Guardrails & Integrity Rules

1. **Semantic Defensibility**: No class is forced into an OFPHIL category unless the visual and structural semantics directly match.
2. **Explicit `UNMAPPED` Status**: Extraneous classes (e.g., academic formulas, decorative pictures, captions) are explicitly flagged as `UNMAPPED` to prevent label pollution.
3. **No Signature / Stamp Fabrication**: External datasets lacking official seal annotations (such as DocLayNet and SROIE) are never used to train `STAMP_OR_SEAL` or `SIGNATURE` detectors.
