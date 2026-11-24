# FINAL DATASET ACQUISITION AND ORGANIZATION REPORT
## Secondary Multilingual Datasets for the OFPHIL V2 LLM Interview Assistant

**Project:** Ophthalmological Foundation of the Philippines (OFPHIL)  
**System:** OFPHIL V2 – Explainable Machine Learning Framework for Predicting Charity Patient Eligibility  
**Component:** Stage 2 – Medical Social Worker (MSW) Interview Assistant  
**Dataset Category:** Secondary Multilingual LLM Datasets  
**Date:** November 24, 2026

---

## 1. INTRODUCTION

The OFPHIL V2 project incorporates a Large Language Model (LLM)-based Interview Assistant to support structured patient interviews conducted by Medical Social Workers (MSWs). The assistant is intended to understand patient responses, generate relevant follow-up questions, maintain conversational context, and organize interview information into structured formats.

To support multilingual communication, particularly English, Filipino, and Taglish, secondary multilingual datasets were identified and acquired. These datasets supplement the OFPHIL-specific interview materials by providing additional examples of multilingual instruction-following and conversational interactions.

The secondary datasets are separate from the historical OFPHIL patient assessment records used by the eligibility classification models. They are not intended to determine patient eligibility, replace professional MSW judgment, or independently generate institutional assessment decisions.

Two datasets were successfully acquired and subjected to initial provenance and integrity checks: the Aya Dataset and SEADialogues.

---

## 2. DATASET ACQUISITION

### 2.1 Aya Dataset

**Source:** CohereLabs  
**Dataset Identifier:** `CohereLabs/aya_dataset`  
**Configuration:** `default`  
**Storage Location:** `data/external/multilingual_llm/raw/aya/dataset/`

The Aya Dataset is a multilingual instruction-following resource containing human-annotated prompt-completion examples. It was acquired using the Hugging Face Datasets library with the following loading instruction:

```python
from datasets import load_dataset

ds = load_dataset("CohereLabs/aya_dataset", "default")
```

The downloaded dataset was saved locally using the Hugging Face `save_to_disk()` functionality.

**Reported acquisition and validation results:**

| Attribute | Result |
|---|---|
| Download status | Downloaded |
| Validation status | Validated |
| Total records | 204,112 |
| Training records | 202,362 |
| Test records | 1,750 |
| Download size | Approximately 253.38 MB (265,691,079 bytes) |
| Number of languages | 71 |
| License | Apache 2.0 |
| Local format | Hugging Face Dataset saved to disk (Arrow shards) |

The reported dataset schema contains the following fields:

- `inputs` (Instruction / prompt)
- `targets` (Human-curated response)
- `language` (Language name)
- `language_code` (ISO code)
- `annotation_type` (Annotation provenance)
- `user_id` (Anonymized contributor key)

The local dataset was reopened using `load_from_disk()` to verify its readability and preserve its original feature structure.

**Language coverage:**

| Language | Language code | Training records | Test records |
|---|---|---:|---:|
| Filipino/Tagalog | `fil` | 1,241 | Not separately reported (0 in test) |
| English | `eng` | 3,944 | 250 |

The dataset contains a reported total of 71 languages, making it a useful supplementary resource for multilingual instruction-following.

The reported local training count of 202,362 was reconciled with the final upstream dataset metadata associated with revision `f9ea04583f02a8f86404ff6c58bf75fe637df8a2`. The previously cited figure of 202,364 was identified as an earlier estimate rather than the final released training count.

**Intended application in OFPHIL:**

1. Support multilingual instruction-following evaluation.
2. Examine English and Filipino response comprehension.
3. Provide supplementary examples for instruction interpretation.
4. Support the development of multilingual interview prompts.
5. Evaluate the consistency of structured response handling across languages.

The Aya Dataset is not an OFPHIL-specific interview dataset. Its examples must therefore be filtered for relevance before being considered for any future model adaptation.

---

### 2.2 SEADialogues

**Source:** SEACrowd  
**Official Repository:** `https://github.com/SEACrowd/SEADialogues.git`  
**Storage Location:** `data/external/multilingual_llm/raw/seadialogues/repository/`

SEADialogues was acquired by cloning the official GitHub repository. The original repository structure and supporting files were preserved.

**Reported acquisition details:**

| Attribute | Result |
|---|---|
| Acquisition status | Cloned |
| Repository commit | `d082f8f86382798e705e559a9074e83707234ab2` |
| Repository size | Approximately 1,171.04 MB (1,227,922,786 bytes) |
| Number of repository files | 252 |
| Languages represented | 8 |
| Prompt scenarios | 8,000 |
| Generated dialogues | 32,000 |
| Tagalog prompt scenarios | 1,000 |
| Generated Tagalog dialogues | 4,000 |

The repository includes the following important artifact:

`codes/dataset_construction/csv_results/sea_dialogues_dataset_tag.csv`

The reported Tagalog subset contains 1,000 prompt-scenario rows. Each scenario contains four generated dialogue variants associated with the following model identifiers:

- `gpt4omini`
- `gemini15flash`
- `aya`
- `llama31`

This results in 4,000 generated Tagalog dialogues.

Across eight languages, the repository contains 8,000 prompt scenarios and 32,000 generated model dialogues.

**Intended application in OFPHIL:**

1. Examine multi-turn dialogue structures.
2. Study conversational context retention.
3. Identify natural Tagalog expressions.
4. Examine honorifics and conversational transitions.
5. Support the development of follow-up question strategies.
6. Supplement multilingual conversational evaluation.

SEADialogues provides useful conversational examples, but its generated dialogues should not automatically be treated as validated patient-interview responses.

---

### 2.3 Dataset Comparison

| Criteria | Aya Dataset | SEADialogues |
|---|---|---|
| Main purpose | Multilingual instruction-following | Multilingual dialogue generation |
| Primary data structure | Instruction-response pairs | Multi-turn conversations |
| Total reported records | 204,112 | 32,000 dialogues (8,000 scenarios) |
| Filipino/Tagalog coverage | 1,241 training examples | 4,000 generated dialogues (1,000 scenarios) |
| English coverage | 3,944 training and 250 test examples | Included in multilingual collection |
| Original source | Hugging Face Hub | GitHub |
| Acquisition method | Hugging Face Datasets (`save_to_disk`) | Git clone |
| License status | Apache 2.0 reported | Pending legal review |
| Intended role | Instruction-following support | Conversational support |

---

## 3. DATA DIRECTORY ORGANIZATION

Both datasets are stored under:

`data/external/multilingual_llm/`

The directory structure separates original downloaded datasets from future intermediate and processed datasets:

```text
data/
└── external/
    └── multilingual_llm/
        ├── raw/
        │   ├── aya/
        │   │   ├── dataset/
        │   │   ├── download_metadata.json
        │   │   ├── dataset_info.json
        │   │   └── README.md
        │   │
        │   ├── seadialogues/
        │   │   ├── repository/
        │   │   ├── download_metadata.json
        │   │   └── README.md
        │   │
        │   ├── tweettaglish/
        │   ├── centacs/
        │   └── filswitch/
        │
        ├── interim/
        │   ├── extracted/
        │   ├── filtered/
        │   ├── normalized/
        │   └── deduplicated/
        │
        ├── processed/
        │   ├── instruction_data/
        │   ├── conversation_data/
        │   ├── english/
        │   ├── filipino/
        │   ├── taglish/
        │   └── multilingual/
        │
        ├── evaluation/
        │   ├── english/
        │   ├── filipino/
        │   ├── taglish/
        │   └── cross_language/
        │
        └── metadata/
            ├── dataset_registry.json
            ├── dataset_sources.csv
            ├── dataset_license_tracking.csv
            ├── dataset_inventory.csv
            └── dataset_preparation_log.csv
```

The following metadata files were created and updated:

1. `dataset_registry.json`
2. `dataset_sources.csv`
3. `dataset_license_tracking.csv`
4. `dataset_inventory.csv`
5. `dataset_preparation_log.csv`

The acquisition and reconciliation activities were recorded in the dataset preparation log, including actions `LOG-002`, `LOG-003`, and `LOG-004`.

The raw directories remain separate from the processed and evaluation directories to preserve the original dataset files and maintain traceability.

---

## 4. DATA PROVENANCE AND LICENSING

### 4.1 Aya Dataset

The Aya Dataset is identified as an Apache 2.0 resource in the acquisition report.

The reported upstream revision and local dataset metadata were used to reconcile the training-record discrepancy.

The license and attribution information must remain associated with the dataset throughout subsequent processing and research use.

### 4.2 SEADialogues

The SEADialogues license requires additional clarification.

The reconciliation identified:
- A CC-BY indicator associated with the GitHub repository.
- A CC-BY-SA 4.0 license declaration on the Hugging Face distribution.
- No formal `LICENSE` file in the cloned GitHub repository.

Because the applicable license for the acquired repository files is not conclusively established, the project records its status as:

**PENDING_LEGAL_REVIEW**

The repository is preserved, but its contents should not be incorporated into model training, redistribution, or other uses requiring clear licensing authorization until the applicable terms are established.

### 4.3 Provenance Management

The project preserves:
- Original dataset identifiers.
- Official source URLs.
- Download metadata.
- Dataset revision or Git commit information.
- Record counts and split information.
- License verification status.
- Dataset inventory and preparation history.

These records support reproducibility and allow future researchers to identify the origin of each processed dataset.

---

## 5. DATA PRIVACY AND GOVERNANCE

The acquired datasets are maintained separately from OFPHIL's historical patient assessment records.

The following safeguards are applied:

1. External multilingual datasets are not merged directly into the institutional patient dataset.
2. Original raw files are preserved.
3. Social-media or general conversational examples are not represented as actual patient interviews.
4. Dataset identifiers and attribution information are retained.
5. Personal or unnecessary identifiers are excluded from processed data when they are not required for the research task.
6. Licensing restrictions are considered before future training or redistribution.
7. Synthetic examples are used for OFPHIL-specific interview development and testing.

The LLM Interview Assistant is designed to support MSWs by organizing responses and suggesting relevant follow-up questions. It does not approve or reject charity applications, determine eligibility, or replace professional assessment.

---

## 6. RECOMMENDED DATASET UTILIZATION

The two acquired datasets serve complementary purposes.

### Aya Dataset

Recommended for:
- English and Filipino instruction-response analysis.
- Multilingual instruction-following evaluation.
- Language-specific response comprehension.
- Supplementary prompt-development examples.

### SEADialogues

Recommended for future consideration:
- Tagalog conversational analysis.
- Multi-turn dialogue structure.
- Contextual follow-up patterns.
- Conversational transition analysis.
- Honorific and natural-language expression analysis.

Its actual use remains subject to licensing clarification.

### OFPHIL-Specific Primary Interview Dataset

The secondary resources do not replace the need for an institution-specific interview dataset.

The primary OFPHIL interview examples should be developed from approved interview materials, synthetic patient scenarios, and MSW-reviewed expected responses.

This dataset will establish the expected interview workflow and domain-specific terminology.

---

## 7. RECOMMENDED NEXT PROCESSING ACTIVITIES

The following activities are recommended for the next development stage:

| Sequence | Activity | Expected output |
|---|---|---|
| 1 | Aya language profiling | Language distribution report |
| 2 | Aya data quality assessment | Duplicate, missing-value, and malformed-record report |
| 3 | Filipino and English filtering | Separate language-specific datasets |
| 4 | Instruction-response normalization | Standardized instruction dataset |
| 5 | SEADialogues license clarification | Documented research-use decision |
| 6 | Tagalog dialogue analysis | Conversational structure report |
| 7 | OFPHIL synthetic interview development | Institution-specific interview examples |
| 8 | Independent evaluation preparation | English, Filipino, and Taglish test scenarios |

The original Aya test split must remain independent from development and prompt-design activities if it is used for final evaluation.

No model fine-tuning should be initiated until dataset quality, licensing, and task suitability have been established.

---

## 8. CURRENT IMPLEMENTATION STATUS

| Component | Reported status |
|---|---|
| Secondary dataset directory structure | Completed |
| Aya Dataset acquisition | Downloaded |
| Aya Dataset integrity validation | Validated |
| Aya language coverage inspection | Completed |
| SEADialogues repository acquisition | Cloned |
| SEADialogues content inspection | Completed |
| SEADialogues provenance reconciliation | Completed |
| SEADialogues license verification | Pending legal review |
| Dataset metadata registries | Updated |
| Dataset acquisition documentation | Completed |
| Dataset preprocessing | Not started |
| LLM fine-tuning | Not started |
| LLM comparative evaluation | Not started |

---

## 9. CONCLUSION

The acquisition of the Aya Dataset and SEADialogues establishes an initial secondary multilingual data foundation for the OFPHIL V2 LLM Interview Assistant.

Aya provides multilingual instruction-following examples, including English and Filipino data, while SEADialogues contributes multi-turn conversational examples with a substantial Tagalog subset.

The two datasets complement each other by providing different types of language and conversational information. However, their content, source, and licensing conditions must remain distinguishable.

Aya is reported as downloaded and validated. SEADialogues has been successfully cloned and its content inspected, but its applicable license remains subject to legal review.

The next development stage should prioritize data profiling, quality assessment, language filtering, and preparation of OFPHIL-specific interview examples.

The acquired datasets are supplementary resources for improving and evaluating the LLM Interview Assistant. They do not replace institutional interview requirements or the professional judgment of Medical Social Workers.

**FINAL RECOMMENDATION:** Proceed with Aya dataset preprocessing, preserve SEADialogues pending license clarification, and develop a separate OFPHIL-specific interview dataset before considering any LLM fine-tuning.
