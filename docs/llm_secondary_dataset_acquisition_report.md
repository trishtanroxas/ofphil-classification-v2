# Secondary Multilingual Dataset Acquisition Report: Aya Dataset & SEADialogues

**Date**: 2026-11-24  
**Project**: `ofphil-classification-v2`  
**Pipeline Track**: Secondary Multilingual LLM Datasets for Stage 2 MSW Interview Assistant  
**Storage Root**: `data/external/multilingual_llm/raw/`  
**Overall Acquisition Status**: **DOWNLOADED & VALIDATED**

---

## 1. Executive Summary

In accordance with the authorized data collection directives for OFPHIL V2, the two designated secondary multilingual datasets have been acquired, validated, and safely stored in their raw buffer directories:

1. **Aya Dataset (`CohereLabs/aya_dataset`, config: `default`)**  
   - Downloaded via Hugging Face `datasets` and serialized locally with `save_to_disk()`.
   - Splits: `train` (202,362 examples) and `test` (1,750 examples) — **204,112 total records**.
   - Storage Location: `data/external/multilingual_llm/raw/aya/dataset/`
   - Integrity: Reopened and verified using `load_from_disk()`.

2. **SEADialogues (`SEACrowd/SEADialogues`)**  
   - Cloned via Git from the official repository `https://github.com/SEACrowd/SEADialogues.git`.
   - Acquired commit: `d082f8f86382798e705e559a9074e83707234ab2` (252 files, ~1.17 GB).
   - Storage Location: `data/external/multilingual_llm/raw/seadialogues/repository/`
   - Integrity: Confirmed commit tree, full data files, and Tagalog multi-turn dialogue subsets (`sea_dialogues_dataset_tag.csv`).

Neither dataset contains real patient records, and neither was merged into the primary OFPHIL clinical/tabular dataset. No notebooks were run and no models were trained or fine-tuned.

---

## 2. Dataset 1: Aya Dataset Specification & Verification

- **Official Source**: `CohereLabs/aya_dataset` (Configuration: `default`)
- **Acquisition Method**: Python `load_dataset("CohereLabs/aya_dataset", "default")` $\rightarrow$ `save_to_disk()`
- **Storage Location**: [`data/external/multilingual_llm/raw/aya/dataset/`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/raw/aya/dataset/)
- **Total Download Size on Disk**: 265,691,079 bytes (~253.38 MB)
- **Verified Splits & Record Counts**:
  - `train`: 202,362 records (Arrow shards, 100% verified)
  - `test`: 1,750 records
  - **Total**: 204,112 instruction-following examples
- **Feature & Column Schema**:
  - `inputs`: `string` (instruction/prompt)
  - `targets`: `string` (human-annotated response)
  - `language`: `string` (language name, e.g., "Tagalog", "English", "Somali")
  - `language_code`: `string` (ISO language code, e.g., "tgl", "eng")
  - `annotation_type`: `string`
  - `user_id`: `string`
- **Languages Verified**: 71 distinct languages in the train split, including native Tagalog (`tgl`) and English (`eng`).
- **License**: Apache 2.0 (Permissive open source; attribution required)
- **Metadata Files Created**:
  - [`raw/aya/download_metadata.json`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/raw/aya/download_metadata.json)
  - [`raw/aya/dataset_info.json`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/raw/aya/dataset_info.json)

---

## 3. Dataset 2: SEADialogues Specification & Verification

- **Official Source**: `https://github.com/SEACrowd/SEADialogues.git`
- **Acquisition Method**: Official Git clone
- **Storage Location**: [`data/external/multilingual_llm/raw/seadialogues/repository/`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/raw/seadialogues/repository/)
- **Git Commit Hash**: `d082f8f86382798e705e559a9074e83707234ab2`
- **Commit Date**: 2026-01-24 16:49:13 +0000
- **Total Repository Size on Disk**: 1,227,922,786 bytes (~1,171.04 MB) across 252 files
- **Key Data Directories & Artifacts Verified**:
  - `codes/dataset_construction/csv_results/sea_dialogues_dataset_tag.csv` (1,000 multi-turn Tagalog dialogues, ~11.02 MB)
  - `data/`: Entity catalogs, personas, topic/subtopic clusters (`data_topics_subtopics_clustered.csv`)
  - `output/`: Batched model dialogue prompts and transitions
  - `results/`: Human annotation benchmarks and model generation comparisons across GPT-4o-mini, Gemini-1.5-Flash, Aya, and LLaMA-3.1
- **Languages Included**: Tagalog (Filipino), Indonesian, Javanese, Malay, Minangkabau, Tamil, Thai, Vietnamese.
- **License**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA 4.0, declared in repository)
- **Metadata File Created**:
  - [`raw/seadialogues/download_metadata.json`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/raw/seadialogues/download_metadata.json)

---

## 4. Metadata Registries & Traceability Update

The central metadata files in `data/external/multilingual_llm/metadata/` were synchronized:

| Metadata File | Updates Applied | Status |
| :--- | :--- | :---: |
| [`dataset_registry.json`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/metadata/dataset_registry.json) | Updated `download_status` to `DOWNLOADED_AND_VALIDATED` for `DS-ML-01` and `DS-ML-02`; appended splits, record counts, file sizes, and Git commit hash. | **UPDATED** |
| [`dataset_sources.csv`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/metadata/dataset_sources.csv) | Updated download and verification status to `VERIFIED_OFFICIAL_REPOSITORY` for SEADialogues. | **UPDATED** |
| [`dataset_license_tracking.csv`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/metadata/dataset_license_tracking.csv) | Documented CC-BY-NC-SA 4.0 non-commercial research terms for SEADialogues. | **UPDATED** |
| [`dataset_inventory.csv`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/metadata/dataset_inventory.csv) | Recorded exact sizes (265.69 MB for Aya, 1,171.04 MB for SEADialogues) and verification checksum tokens. | **UPDATED** |
| [`dataset_preparation_log.csv`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/data/external/multilingual_llm/metadata/dataset_preparation_log.csv) | Appended `LOG-002` (SEADialogues clone) and `LOG-003` (Aya download) with timestamps. | **UPDATED** |

---

## 5. Status Summary by Dataset

| Dataset | Acquisition Status | Integrity Validation Status | Action Required |
| :--- | :---: | :---: | :--- |
| **Aya Dataset (`DS-ML-01`)** | **DOWNLOADED** | **VALIDATED** | None. Preserved in `raw/aya/dataset/`. Ready for domain filtering when authorized. |
| **SEADialogues (`DS-ML-02`)** | **DOWNLOADED** | **VALIDATED** | None. Preserved in `raw/seadialogues/repository/`. Ready for dialogue extraction when authorized. |
| **TweetTaglish (`DS-ML-03`)** | *NOT STARTED* | *PENDING_ACQUISITION* | Staged scaffold preserved. |
| **CEnTaCS (`DS-ML-04`)** | *NOT STARTED* | *PENDING_ACQUISITION* | Staged scaffold preserved. |
| **FilSwitch (`DS-ML-05`)** | *NOT STARTED* | *PENDING_ACQUISITION* | Staged scaffold preserved. |
