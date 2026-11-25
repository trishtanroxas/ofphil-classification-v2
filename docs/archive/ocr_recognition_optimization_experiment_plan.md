# Phase 04 Controlled OCR Recognition Optimization Experiment Plan (E0–E7)

**Project:** `ofphil-classification-v2`  
**Phase:** 04 — Document Processing and OCR  
**Date:** November 24, 2026  

---

## 1. Experimental Matrix Design

To rigorously evaluate OCR performance improvements while strictly preserving model architectures and obeying non-training constraints, a controlled 8-stage experiment matrix (E0–E7) has been established.

| Experiment ID | Configuration Name | Preprocessing Pipeline | Recognition Model | Post-OCR Correction | Evaluation Policy | Primary Metric Objective |
|---|---|---|---|---|---|---|
| **E0** | Baseline Raw | None (Original PDF Page Render) | `en_PP-OCRv4` | None | Raw Strict (Whitespace split, exact case) | Establish reproduction baseline (Current: CER 49.08%, WER 100%) |
| **E1** | Normalized Metric Baseline | None | `en_PP-OCRv4` | None | Normalized (Case-folded, punctuation-stripped) | Measure artificial error inflation from strict formatting |
| **E2** | Adaptive Contrast & Binarization | Otsu Binarization + CLAHE | `en_PP-OCRv4` | None | Normalized | Assess contrast recovery on carbon copy intake forms |
| **E3** | Denoising & Skew Correction | Fast Bilateral Filter + Hough Line Deskew | `en_PP-OCRv4` | None | Normalized | Evaluate resolution of rotation defect and stroke noise |
| **E4** | Full Preprocessing Composite | Deskew + Bilateral + CLAHE | `en_PP-OCRv4` | None | Normalized | Cumulative visual enhancement impact |
| **E5** | Assisted Dictionary (Suggestions) | Full Composite Pipeline | `en_PP-OCRv4` | Assisted Suggestions (Top-3) | Normalized | Measure top-3 hit rate on clinical and social terms |
| **E6** | Conservative Post-Correction | Full Composite Pipeline | `en_PP-OCRv4` | Conservative Correction (Dist=1) | Normalized | Measure automated CER/WER reduction with zero name alteration |
| **E7** | Final Optimized Pipeline | Full Composite Pipeline | `en_PP-OCRv4` | Conservative + Blacklist Guards | Both (Raw & Normalized) | Formal publication benchmark and Phase 05 handoff baseline |

---

## 2. Experimental Execution Protocol

1. **Isolation:** All experiments utilize standardized test pairs from `data/external/paddleocr/dictionaries/evaluation/dictionary_test_cases.json` and annotated ground truth.
2. **Ground Truth Immutability:** Original ground truth files under `data/interim/document_processing/ground_truth_annotations/` are read-only and never modified.
3. **Execution Mode:** Execution is scripted in `experiments/notebooks/04_document_processing_and_ocr/10_cer_wer_diagnostic/06_ocr_optimization_comparison.ipynb` with outputs initially unset, ready for manual interactive execution in JupyterLab.
