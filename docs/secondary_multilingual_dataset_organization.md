# OFPHIL V2 — SECONDARY MULTILINGUAL LLM DATASET ORGANIZATION & GOVERNANCE

**Date:** 2026-11-24  
**Project:** `ofphil-classification-v2`  
**Subsystem:** Medical Social Worker (MSW) Stage 2 Patient Interview Assistant  
**Target Languages:** English, Filipino (Tagalog), and Taglish (Tagalog-English Code-Switching)  
**Location:** `data/external/multilingual_llm/`  

---

## 1. Executive Summary & Purpose

In Medical Social Work (MSW) intake interviews at the Ophthalmological Foundation of the Philippines (OFPHIL), patients and caseworkers frequently alternate between formal English, standard Filipino, and conversational Taglish. Patients describing distress, financial hardship, or cataract symptoms typically communicate through code-switched phrases such as:
> *"Doc, malabo po ang paningin ko sa right eye for 6 months na, pero wala po kaming budget for phaco surgery dahil driver lang po ako."*

To ensure the OFPHIL LLM Interview Assistant interprets and generates respectful, context-aware, and natural follow-up inquiries across all three linguistic modes without clinical misunderstanding, a secondary multilingual dataset repository has been established. 

**Critical Boundary:** These secondary datasets support linguistic and conversational modeling. They are maintained completely separately from the primary OFPHIL clinical and tabular classification dataset. They do not contain real patient identifiers, and no automated scraping or training has been executed.

---

## 2. Directory Architecture

The repository enforces strict separation between raw downloads, interim transformations, language-specific processed corpora, and independent evaluation sets:

```text
data/external/multilingual_llm/
├── raw/                              <-- Immutable original downloads (read-only)
│   ├── aya/                          <-- Cohere For AI Aya multilingual instruction corpus
│   ├── seadialogues/                 <-- Southeast Asia multi-turn dialogue corpus
│   ├── tweettaglish/                 <-- Code-switched linguistic reference (non-dialogue)
│   ├── centacs/                      <-- Conversational Taglish corpus
│   └── filswitch/                    <-- Sentence-level Taglish parallel corpus
│
├── interim/                          <-- Intermediate processing stages
│   ├── extracted/                    <-- Text unpacked from raw archives
│   ├── filtered/                     <-- Cleaned of social media noise / profanity
│   ├── normalized/                   <-- Standardized orthography & punctuation
│   └── deduplicated/                 <-- Exact and near-duplicate scrubbed
│
├── processed/                        <-- Task- and language-partitioned training data
│   ├── instruction_data/             <-- Instruction-following prompt pairs
│   ├── conversation_data/            <-- Multi-turn conversational flows
│   ├── filipino/                     <-- Pure Filipino (Tagalog) subset
│   ├── english/                      <-- Pure English clinical baseline
│   ├── taglish/                      <-- Code-switched conversational subset
│   └── multilingual/                 <-- Cross-lingual parallel examples
│
├── evaluation/                       <-- Strictly isolated test benchmarks
│   ├── filipino/                     <-- Filipino interview evaluation sets
│   ├── english/                      <-- English interview evaluation sets
│   ├── taglish/                      <-- Taglish conversational benchmark
│   └── cross_language/               <-- Code-switching fidelity test suites
│
└── metadata/                         <-- Traceability & governance registries
    ├── dataset_registry.json         <-- Structured machine-readable catalog
    ├── dataset_sources.csv           <-- URLs, authors, languages, formats
    ├── dataset_license_tracking.csv  <-- Licenses and commercial restrictions
    ├── dataset_inventory.csv         <-- Checksums, file sizes, record counts
    └── dataset_preparation_log.csv   <-- Audit trail of every transformation
```

---

## 3. Registered Secondary Dataset Sources

| Dataset ID | Name | Source / Repository | Publisher / Maintainer | Languages | Dataset Type | License | Acquisition Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **DS-ML-01** | **Aya Dataset** | `huggingface.co/datasets/CohereForAI/aya_dataset` | Cohere For AI & Community | Filipino, English, Multilingual | Instruction Dialogue | Apache 2.0 | `NOT_DOWNLOADED` |
| **DS-ML-02** | **SEADialogues** | `huggingface.co/datasets/seadialogues` | Southeast Asia NLP Community | Filipino, English, Indonesian, Vietnamese | Multi-Turn Dialogue | CC-BY-NC-SA 4.0 (`PENDING_VERIFICATION`) | `NOT_DOWNLOADED` |
| **DS-ML-03** | **TweetTaglish** | `github.com/dits-nlp/TweetTaglish` | DLSU NLP Lab & Affiliates | Taglish | Code-Switched Corpus | CC-BY-NC 4.0 (`PENDING_VERIFICATION`) | `NOT_DOWNLOADED` |
| **DS-ML-04** | **CEnTaCS** | `github.com/pau-nlp/CEnTaCS` | Philippine NLP Academic Consortium | Tagalog, English, Taglish | Conversational Code-Switching | Academic Use (`PENDING_VERIFICATION`) | `NOT_DOWNLOADED` |
| **DS-ML-05** | **FilSwitch** | `huggingface.co/datasets/filswitch` | Philippine Language Modeling Initiative | Filipino, English, Taglish | Parallel Code-Switching | Open Data (`PENDING_VERIFICATION`) | `NOT_DOWNLOADED` |

---

## 4. Recommended Research Use in OFPHIL

### 1. Aya Dataset (`DS-ML-01`)
- **Role:** Foundational instruction comprehension in Filipino and English.
- **Application:** Equips the LLM to understand multi-sentence patient explanations regarding family dependency, employment instability, and medical history.
- **Filtering Requirement:** Filter for health, socioeconomic, and community assistance domains; exclude non-relevant tasks (e.g. coding, math).

### 2. SEADialogues (`DS-ML-02`)
- **Role:** Conversational turn-taking and conversational empathy.
- **Application:** Teaches the assistant how to ask polite clarification questions without interrupting the patient's narrative.
- **Filtering Requirement:** Extract Filipino and English dialogues; discard Indonesian/Vietnamese splits unless used for cross-lingual multilingual pretraining.

### 3. TweetTaglish (`DS-ML-03`)
- **Role:** Linguistic code-switching morphology and vocabulary dictionary.
- **CRITICAL RESTRICTION:** Must **NEVER** be presented directly as patient conversation. Social media tweets contain abbreviations, profanity, and informal sarcasm inappropriate for clinical intake. It is utilized solely for building token frequency maps and code-switching transition dictionaries.

### 4. CEnTaCS (`DS-ML-04`)
- **Role:** Conversational Taglish benchmark.
- **Application:** Validates that the LLM does not hallucinate when a patient switches languages mid-sentence (intra-sentential code-switching).

### 5. FilSwitch (`DS-ML-05`)
- **Role:** Sentence-level translation and cross-lingual equivalence.
- **Application:** Ensures questions generated in Filipino have identical semantic meaning when translated or summarized into English for the clinical dossier.

---

## 5. Data Handling, Privacy & Governance Rules

1. **Raw Immutability:** Files placed in `raw/` must never be directly modified, overwritten, or renamed.
2. **Strict Stage Segregation:**
   - Raw data $\rightarrow$ `interim/extracted/`
   - Content domain filtering $\rightarrow$ `interim/filtered/`
   - Orthographic cleaning $\rightarrow$ `interim/normalized/`
   - Deduplication $\rightarrow$ `interim/deduplicated/`
   - Final partitioning $\rightarrow$ `processed/`
3. **No Social Media Hallucination:** Tweet corpora must never be converted into patient quotes or clinical case studies.
4. **Evaluation Split Independence:** Files inside `evaluation/` must never be included in instruction-tuning or few-shot demonstration sets.
5. **Zero Patient PHI:** No real patient records from OFPHIL clinical files are stored in this external multilingual repository.

---

## 6. Manual Dataset Acquisition & Preparation Checklist

Before incorporating any downloaded dataset into the training pipeline, complete the following validation checklist:

- [ ] **Step 1: Dataset Source Verified** — Confirm the download URL matches the official repository in `dataset_sources.csv`.
- [ ] **Step 2: License Reviewed** — Verify permissions in `dataset_license_tracking.csv` (ensure commercial/academic restrictions are respected).
- [ ] **Step 3: Manual Download Executed** — Manually download and place uncompressed/archive files into the respective `raw/<dataset>/` directory.
- [ ] **Step 4: Checksum & Inventory Recorded** — Record file name, exact size, and SHA-256 hash in `dataset_inventory.csv`.
- [ ] **Step 5: Language Coverage Confirmed** — Verify the presence of Tagalog/Filipino or Taglish tokens in the downloaded data.
- [ ] **Step 6: Domain Relevance Filtered** — Filter out irrelevant content (e.g. politics, celebrity tweets, sports).
- [ ] **Step 7: Deduplication Checked** — Remove duplicate sentences or repeated template prompts.
- [ ] **Step 8: Privacy & PII Screened** — Verify zero personal phone numbers, names, or addresses exist in open-web corpora.
- [ ] **Step 9: Transformations Logged** — Record the filtering script, record counts, and dates in `dataset_preparation_log.csv`.
- [ ] **Step 10: Evaluation Split Locked** — Set aside a held-out test split in `evaluation/` before any model prompt engineering or fine-tuning begins.
