# OCR V1 vs V2 Notebook Reconstruction Audit

**Date:** 2026-11-24  
**Project:** `ofphil-classification-v2`  
**Phase:** 04.05 — OCR Model Benchmarks  
**Reference V1 Source:** `06_ocr_model_benchmarks.zip` (legacy directory `06_ocr_model_benchmarks`)  
**Destination V2 Target:** `experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/`

---

## 1. Executive Summary

This audit evaluates the differences between legacy V1 OCR implementations and the current V2 modular codebase. While V1 contained functional training and evaluation loops for PaddleOCR and TrOCR, it suffered from hardcoded paths (`dss-charity-eligibity-classification`), arbitrary checkpoint resumption hacks (e.g., resuming from epoch 3/4 hardcoded without checkpoint verification), monolithic unstructured code cells, and manual directory references. Conversely, current V2 notebooks established modular paths (`DocumentProcessingPaths`) and standard headers, but lacked active execution harnesses and separated TrOCR fine-tuning logic.

This document details cell-by-cell discrepancies, structural defects, path inconsistencies, and the reconstruction blueprint to deliver complete, statically validated, and manually executable V2 notebooks.

---

## 2. Notebook Mapping & Structure Comparison

| V2 Notebook Target | V1 Reference Notebook | V1 Cells | V2 Cells (Current) | Status / Primary Gap |
|---|---|:---:|:---:|---|
| `01_paddleocr_cer_wer_benchmark.ipynb` | `01_paddleocr_cer_wer_benchmark.ipynb` | 7 (5 code) | 15 (6 code) | V1 had full document-batched inference loop with Levenshtein scoring; V2 was missing the live execution harness. |
| `02_easyocr_cer_wer_benchmark.ipynb` | `02_easyocr_cer_wer_benchmark.ipynb` | 6 (5 code) | 15 (6 code) | V1 had batched inference over document groups; V2 had placeholder checks with no active test execution loop. |
| `03_trocr_cer_wer_benchmark.ipynb` | `03_trocr_cer_wer_benchmark.ipynb` | 7 (6 code) | 15 (6 code) | V1 had PyTorch TrOCR inference with RobertaTokenizer; V2 had template checking only. |
| `04_paddleocr_finetuning_on_ofphil.ipynb` | `04_paddleocr_finetuning_on_ofphil.ipynb` | 20 (11 code) | 15 (6 code) | V1 contained actual SVTR fine-tuning loop with CTCLoss, but contained emergency recovery cells (Epoch 3/4 resume). V2 lacked training loop entirely. |
| `05_trocr_finetuning_on_ofphil.ipynb` | `04_trocr_finetuning_on_ofphil.ipynb` | 6 (5 code) | 15 (6 code) | V1 had VisionEncoderDecoder fine-tuning loop with decoder-only training; V2 lacked full dataset and training implementation. |
| `06_ocr_engines_comparative_summary.ipynb` | `05_ocr_engines_comparative_summary.ipynb` | 4 (3 code) | 15 (5 code) | V1 had hardcoded legacy paths and loaded 4 models; V2 must dynamically aggregate all 5 models (Pretrained PaddleOCR, FT PaddleOCR, EasyOCR, Pretrained TrOCR, FT TrOCR) and report `NOT EVALUATED` safely. |

---

## 3. Detailed Audit Findings by Notebook

### A. Notebook 01: PaddleOCR CER & WER Benchmark
- **V1 Flaws:** Hardcoded root search looking for `dss-charity-eligibity-classification`; raw print statements inside inference loop; reliance on legacy `text_detection_annotations.csv` coordinates rather than standard V2 split crops.
- **V2 Gaps:** Cell 10 originally only checked if benchmark CSV existed; lacked active inference fallback.
- **Reconstruction Plan:**
  1. Standardize V2 paths via `DocumentProcessingPaths`.
  2. Implement standardized `compute_cer` and `compute_wer` Levenshtein dynamic programming routines.
  3. Load held-out test split `test_manifest_v2.csv`.
  4. Implement memory-conscious PaddleOCR recognition inference with CPU/CUDA detection.
  5. Save predictions to `data/interim/document_processing/model_predictions_and_benchmarks/paddleocr/paddleocr_benchmark.csv`.
  6. Present Matplotlib performance dashboard.

### B. Notebook 02: EasyOCR CER & WER Benchmark
- **V1 Flaws:** Used legacy CSV paths; unhandled memory fragmentation across large image files; missing formal off-the-shelf epoch reporting metadata.
- **V2 Gaps:** Code stopped at configuration template without evaluation execution.
- **Reconstruction Plan:**
  1. Implement EasyOCR reader with safe GPU/CPU fallback (`torch.cuda.is_available()`).
  2. Evaluate identical `test_manifest_v2.csv` samples.
  3. Export structured metrics (`cer`, `wer`, `confidence`, `latency_ms`).
  4. Standardize output at `data/interim/document_processing/model_predictions_and_benchmarks/easyocr/easyocr_benchmark.csv`.
  5. Include Matplotlib performance dashboard.

### C. Notebook 03: TrOCR CER & WER Benchmark
- **V1 Flaws:** Hardcoded HuggingFace cache paths; mixed evaluation of printed vs handwritten checkpoints without clear separation.
- **V2 Gaps:** Model loading stopped at check without actual generation pipeline.
- **Reconstruction Plan:**
  1. Target `microsoft/trocr-base-stage1` (printed) or `microsoft/trocr-base-handwritten`.
  2. Utilize `TrOCRProcessor` and `VisionEncoderDecoderModel` with PyTorch device detection.
  3. Add batch generation with memory management (`torch.cuda.empty_cache()`).
  4. Compute character and word error metrics against test manifest.
  5. Save to `data/interim/document_processing/model_predictions_and_benchmarks/trocr/trocr_benchmark.csv`.

### D. Notebook 04: PaddleOCR Fine-Tuning on OFPHIL
- **V1 Flaws:**
  - Severe notebook sprawl (cells 14 and 15 were hardcoded emergency resumption scripts for Epoch 4-10 after a kernel crash).
  - Hardcoded local paths: `C:\Users\ASUS TUF\.paddlex\official_models\PP-OCRv6_medium_rec`.
  - Fragile DLL patching directly inside notebook cells.
- **V2 Gaps:**
  - Contained only configuration dictionary export (`paddleocr_rec_finetuning_config.yaml`), missing the actual training loop and dataset loader.
- **Reconstruction Plan:**
  1. Provide unified configuration cell `PADDLEOCR_TRAINING_CONFIG` (`max_epochs: 20`, `batch_size: 4`, `learning_rate: 0.0001`, `early_stopping_patience: 5`).
  2. Load V2 `train_manifest_v2.csv` and `val_manifest_v2.csv`.
  3. Build clean `OFPHILCropDataset` and collator for aspect-ratio preserved tensors.
  4. Implement genuine PaddlePaddle training loop with `CTCLoss`, AdamW, cosine annealing, and validation after each epoch.
  5. Save checkpoints to `models/trained/ocr_finetuned/paddleocr/` (`best_checkpoint` and `last_checkpoint`).
  6. Export training history to CSV and JSON.
  7. Final untouched test set evaluation against `test_manifest_v2.csv`.

### E. Notebook 05: TrOCR Fine-Tuning on OFPHIL
- **V1 Flaws:**
  - Hardcoded reliance on `checkpoint_epoch_3` from legacy runs.
  - Stratified split performed on the fly inside notebook instead of using frozen institutional manifests.
- **V2 Gaps:**
  - Notebook was previously a truncated copy without the actual PyTorch training loop.
- **Reconstruction Plan:**
  1. Provide explicit `TROCR_TRAINING_CONFIG` (`max_epochs: 5`, `batch_size: 2`, `gradient_accumulation_steps: 2`, `learning_rate: 0.00001`).
  2. Use frozen `train_manifest_v2.csv` and `val_manifest_v2.csv` for data isolation.
  3. Implement PyTorch `Dataset` loading bounding box crops dynamically from disk.
  4. Frozen encoder / trainable decoder strategy to fit within 4GB RTX 3050 VRAM.
  5. Epoch progress logging with training loss, validation loss, CER, WER, and peak VRAM.
  6. Checkpoint persistence in `models/trained/ocr_finetuned/trocr/`.
  7. Final test evaluation on `test_manifest_v2.csv`.

### F. Notebook 06: OCR Engines Comparative Summary
- **V1 Flaws:** Looked for only 4 models; hardcoded project root name; failed when files were missing.
- **V2 Gaps:** Lacked automated ingestion of all 5 models and robust handling of unexecuted runs.
- **Reconstruction Plan:**
  1. Ingest evaluation artifacts from all 5 models:
     - Off-the-shelf PaddleOCR
     - Off-the-shelf EasyOCR
     - Off-the-shelf TrOCR
     - Fine-tuned PaddleOCR
     - Fine-tuned TrOCR
  2. Gracefully report `NOT EVALUATED` if an engine's benchmark CSV is not yet generated.
  3. Render comparative metrics table, CER/WER bar charts, and modality (printed vs. handwritten) breakdown.
  4. Export consolidated JSON summary to `reports/ocr_engines_comparative_summary.json`.

---

## 4. Path and Directory Normalization

All notebooks are anchored to `DocumentProcessingPaths(PROJECT_ROOT)`:
- `data/interim/document_processing/splits/`: Manifests (`train_manifest_v2.csv`, `val_manifest_v2.csv`, `test_manifest_v2.csv`).
- `data/interim/document_processing/model_predictions_and_benchmarks/`: Output prediction CSVs.
- `models/trained/ocr_finetuned/paddleocr/`: PaddleOCR weights and checkpoints.
- `models/trained/ocr_finetuned/trocr/`: TrOCR weights and checkpoints.
- `reports/visualizations/evaluation_charts/`: Exported figures.

---

## 5. Verification Checklist

- [x] V1 reference extracted and audited without modifying original assets.
- [ ] Notebooks 01-03 reconstructed with complete off-the-shelf inference harnesses.
- [ ] Notebooks 04-05 reconstructed with full training loops and configurable epochs.
- [ ] Notebook 06 reconstructed with 5-model dynamic summary.
- [ ] Static AST syntax and JSON schema validation executed on all 6 notebooks.
- [ ] Zero execution of model training during construction.
