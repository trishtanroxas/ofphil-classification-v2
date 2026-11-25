# Phase 04 OCR Model Benchmarks V2 Reconstruction Report

**Date:** 2026-11-24  
**Project:** `ofphil-classification-v2`  
**Phase:** 04.05 — OCR Model Benchmarks  
**Audit Reference:** `docs/ocr_v1_v2_notebook_reconstruction_audit.md`  
**Reconstruction Status:** Complete, Statically Validated, and Ready for Manual Execution

---

## 1. Executive Summary

This report documents the reconstruction and architectural consolidation of all six Phase 04.05 OCR benchmark and fine-tuning notebooks in `ofphil-classification-v2`. Using the uploaded `06_ocr_model_benchmarks.zip` (legacy V1 implementation) as a reference, the codebase was audited, sanitized, refactored, and aligned with V2 standards.

Key achievements:
1. **Separation of Off-The-Shelf vs. Fine-Tuned Models:** Off-the-shelf benchmarks (Notebooks 01, 02, and 03) explicitly report `training_epochs_on_ofphil: 0` to prevent confusion with fine-tuned models.
2. **Reconstruction of Full Fine-Tuning Pipelines:** Notebooks 04 (PaddleOCR) and 05 (TrOCR) now feature complete end-to-end training and validation loops with explicit hyperparameters, per-epoch progress logging, early stopping, and dual checkpoint preservation (`best_accuracy` and `last_checkpoint`).
3. **5-Engine Comparative Synthesis:** Notebook 06 dynamically ingests evaluation reports across all five model configurations, strictly adhering to governance rules by designating unexecuted models as `NOT EVALUATED` without fabricating numbers.
4. **Static AST & JSON Validation:** All six notebooks passed 100% Python AST parsing with clean, unexecuted execution states.

---

## 2. Notebook Mapping & Structural Inventory

All six notebooks reside under:
`experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/`

| V2 Notebook | Purpose | Model / Engine Target | Configured Epochs | Outputs |
|---|---|---|:---:|---|
| [01_paddleocr_cer_wer_benchmark.ipynb](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/01_paddleocr_cer_wer_benchmark.ipynb) | Off-The-Shelf Pretrained Benchmark | PP-OCRv4 / PP-OCRv6 SVTR | 0 | `paddleocr_benchmark.csv`<br>`paddleocr_benchmark_report.json` |
| [02_easyocr_cer_wer_benchmark.ipynb](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/02_easyocr_cer_wer_benchmark.ipynb) | Off-The-Shelf Pretrained Benchmark | CRAFT + CRNN (ResNet + BiLSTM + CTC) | 0 | `easyocr_benchmark.csv`<br>`easyocr_benchmark_report.json` |
| [03_trocr_cer_wer_benchmark.ipynb](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/03_trocr_cer_wer_benchmark.ipynb) | Off-The-Shelf Pretrained Benchmark | `microsoft/trocr-base-stage1` | 0 | `trocr_benchmark.csv`<br>`trocr_benchmark_report.json` |
| [04_paddleocr_finetuning_on_ofphil.ipynb](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/04_paddleocr_finetuning_on_ofphil.ipynb) | SVTR Recognition Fine-Tuning | PP-OCRv6 SVTR Recognition Backbone | 20 (Max) | `best_accuracy/model_weights.pdparams`<br>`paddleocr_training_history.csv`<br>`paddleocr_finetuned_benchmark.csv` |
| [05_trocr_finetuning_on_ofphil.ipynb](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/05_trocr_finetuning_on_ofphil.ipynb) | Transformer Decoder Fine-Tuning | `microsoft/trocr-base-handwritten` | 5 (Max) | `best_model/`<br>`trocr_5epoch_training_history.csv`<br>`trocr_finetuned_benchmark.csv` |
| [06_ocr_engines_comparative_summary.ipynb](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/notebooks/04_document_processing_and_ocr/05_ocr_model_benchmarks/06_ocr_engines_comparative_summary.ipynb) | Comparative Multi-Model Synthesis | All 5 Model Configurations | N/A | `reports/ocr_engines_comparative_summary.json`<br>`figure_4_3_ocr_comparative_benchmark.png` |

---

## 3. Off-The-Shelf Model Configurations (Notebooks 01–03)

### Explicit Epoch Reporting
Off-the-shelf models are pretrained baselines. Every benchmark notebook displays:
- **Pretrained Checkpoint Identifier:** Explicit checkpoint tag (e.g., `PP-OCRv6_medium_rec`, `english_g2`, `microsoft/trocr-base-stage1`).
- **OFPHIL Training Epochs:** Explicitly reported as `0`.
- **Inference Hardware:** CUDA GPU detection with fallback to CPU.
- **Evaluation Dataset:** Uniform held-out test manifest: `data/interim/document_processing/splits/test_manifest_v2.csv` (2,778 unseen crops).
- **Metric Formulation:** Exact Levenshtein distance dynamic programming algorithms computing Character Error Rate (CER), Word Error Rate (WER), Character Accuracy ($1 - \text{CER}$), and per-crop latency (ms).

---

## 4. Fine-Tuning Pipelines (Notebooks 04 & 05)

### A. PaddleOCR Fine-Tuning (`04_paddleocr_finetuning_on_ofphil.ipynb`)
- **Explicit Hyperparameters Cell:**
  ```python
  PADDLEOCR_TRAINING_CONFIG = {
      "model_name": "PP-OCRv6_SVTR_Recognition",
      "max_epochs": 20,
      "batch_size": 4,
      "learning_rate": 0.0001,
      "min_learning_rate": 1e-6,
      "weight_decay": 1e-4,
      "early_stopping_patience": 5,
      "save_best_only": True,
      "evaluate_every_epoch": True,
      "img_height": 48,
      "img_width": 640,
      "max_label_length": 80,
      "device": "gpu"
  }
  ```
- **Training Implementation:**
  - Aspect-ratio preserving preprocessor (48x640 right-padded, `[-1, 1]` normalization).
  - CTCLoss with blank index 0 and log-probability clipping.
  - Formatted epoch progress output logging Epoch, Training Loss, Validation Loss, Validation CER, Validation WER, Learning Rate, Duration, and Best Checkpoint.
  - Dual checkpoint persistence under `models/trained/ocr_finetuned/paddleocr/`:
    - `best_accuracy/` (saved when validation CER improves)
    - `last_checkpoint/` (saved at final iteration)
  - Exports `paddleocr_training_history.csv` for post-hoc curve analysis.

### B. TrOCR Fine-Tuning (`05_trocr_finetuning_on_ofphil.ipynb`)
- **Explicit Hyperparameters Cell:**
  ```python
  TROCR_TRAINING_CONFIG = {
      "model_name_or_path": "microsoft/trocr-base-handwritten",
      "max_epochs": 5,
      "batch_size": 2,  # Memory-safe for 4GB RTX 3050 VRAM
      "gradient_accumulation_steps": 2,
      "learning_rate": 1e-5,
      "weight_decay": 0.01,
      "freeze_encoder": True,  # Frozen vision encoder, trainable RoBERTa decoder
      "early_stopping_patience": 2,
      "validate_every_epoch": True,
      "max_target_length": 64,
      "device": "cuda"
  }
  ```
- **Training Implementation:**
  - Frozen visual encoder preserves generic image representations while reducing gradient memory to fit comfortably inside 4GB VRAM.
  - PyTorch `Dataset` with `-100` label padding for cross-entropy token masking.
  - Formatted epoch output logging Epoch, Training Loss, Validation Loss, Validation CER, Validation WER, Learning Rate, GPU Memory Peak (MB), Duration, and Best Checkpoint.
  - Dual checkpoint persistence under `models/trained/ocr_finetuned/trocr/`:
    - `best_model/`
    - `last_checkpoint/`
  - Exports `trocr_5epoch_training_history.csv`.

---

## 5. Comparative Summary & Data Governance (Notebook 06)

- Ingests all 5 candidate model benchmarks from `data/interim/document_processing/model_predictions_and_benchmarks/`.
- Models without existing evaluation runs are flagged strictly as `NOT EVALUATED`.
- Outputs a publication-ready comparative metrics table:
  - Architecture and checkpoint name
  - Fine-tuning status (Yes/No)
  - OFPHIL epochs completed (0 vs. 20 vs. 5)
  - Printed vs. Handwritten CER breakdown
  - Overall CER, Overall WER, Character Accuracy (%), and Latency (ms)
- Renders dual-panel Matplotlib figure (`figure_4_3_ocr_comparative_benchmark.png`) comparing error rates and latency trade-offs.
- Exports structured summary to `reports/ocr_engines_comparative_summary.json`.

---

## 6. Static Validation Audit

Static validation was executed via `validate_all_notebooks.py` verifying JSON schemas, metadata integrity, and Python Abstract Syntax Tree (AST) compilation:

```text
================================================================================
STATIC NOTEBOOK VALIDATION (AST & SCHEMA)
================================================================================

Validating: 01_paddleocr_cer_wer_benchmark.ipynb
  [OK] Valid JSON format
  Cells summary: 15 total (6 code, 9 markdown)
  [OK] All code cells passed Python AST compilation without syntax errors

Validating: 02_easyocr_cer_wer_benchmark.ipynb
  [OK] Valid JSON format
  Cells summary: 15 total (6 code, 9 markdown)
  [OK] All code cells passed Python AST compilation without syntax errors

Validating: 03_trocr_cer_wer_benchmark.ipynb
  [OK] Valid JSON format
  Cells summary: 15 total (6 code, 9 markdown)
  [OK] All code cells passed Python AST compilation without syntax errors

Validating: 04_paddleocr_finetuning_on_ofphil.ipynb
  [OK] Valid JSON format
  Cells summary: 17 total (7 code, 10 markdown)
  [OK] All code cells passed Python AST compilation without syntax errors

Validating: 05_trocr_finetuning_on_ofphil.ipynb
  [OK] Valid JSON format
  Cells summary: 17 total (7 code, 10 markdown)
  [OK] All code cells passed Python AST compilation without syntax errors

Validating: 06_ocr_engines_comparative_summary.ipynb
  [OK] Valid JSON format
  Cells summary: 11 total (4 code, 7 markdown)
  [OK] All code cells passed Python AST compilation without syntax errors

================================================================================
ALL 6 NOTEBOOKS SUCCESSFULLY VALIDATED!
================================================================================
```

---

## 7. Recommended Execution Order for Researcher

To manually reproduce and evaluate the OCR pipeline in JupyterLab:

1. **Notebook 01:** Run `01_paddleocr_cer_wer_benchmark.ipynb` to evaluate baseline pretrained PaddleOCR.
2. **Notebook 02:** Run `02_easyocr_cer_wer_benchmark.ipynb` to evaluate baseline pretrained EasyOCR.
3. **Notebook 03:** Run `03_trocr_cer_wer_benchmark.ipynb` to evaluate baseline pretrained TrOCR.
4. **Notebook 04:** Run `04_paddleocr_finetuning_on_ofphil.ipynb` to execute SVTR fine-tuning (20 epochs) and test evaluation.
5. **Notebook 05:** Run `05_trocr_finetuning_on_ofphil.ipynb` to execute TrOCR decoder fine-tuning (5 epochs) and test evaluation.
6. **Notebook 06:** Run `06_ocr_engines_comparative_summary.ipynb` to generate the consolidated Chapter 4 comparative table and Figure 4.3 visualization.
