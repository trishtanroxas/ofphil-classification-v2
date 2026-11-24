# Character Dictionary Compatibility and Classification Head Analysis

**Project:** `ofphil-classification-v2`  
**Phase:** 04 — Document Processing and OCR  
**Date:** November 24, 2026  

---

## 1. Technical Problem Statement

In deep-learning OCR engines such as PaddleOCR's SVTR / LCNet (`PP-OCRv4`), text recognition is formulated as sequence labeling via Connectionist Temporal Classification (CTC) loss or Attention sequence modeling.

A critical engineering question is whether a custom character dictionary can simply be passed into pre-trained recognition inference via `--rec_char_dict_path`.

---

## 2. Linear Projection Head Incompatibility

In pre-trained inference models (e.g. `en_PP-OCRv4_rec_infer`), the model weights are serialized as static inference graphs (`inference.pdmodel` and `inference.pdiparams`).

The final linear layer in the CTC recognition head projects the hidden feature representations $H \in \mathbb{R}^{T \times D}$ to the character probability logits:

$$P = \text{Linear}(H; W_{\text{fc}}, b_{\text{fc}})$$

where:
- Input hidden dimension $D = 384$ or $512$
- Weight matrix dimension $W_{\text{fc}} \in \mathbb{R}^{D \times (K + 1)}$
- $K$ is the exact number of characters in the training dictionary, plus 1 for the CTC blank token.

For `en_dict.txt`, the standard vocabulary size is $K = 97$, meaning $W_{\text{fc}}$ is dimensioned to $\mathbb{R}^{D \times 98}$.

### Consequence of Naive Dictionary Replacement:
If a custom dictionary containing 114 characters (such as `character_dictionary.txt`) is passed to the pre-trained `en_PP-OCRv4_rec_infer` engine without re-training:
1. The inference runtime attempts to map logits of size 98 to a vocabulary index of 115.
2. PaddlePaddle raises an immediate runtime tensor dimension mismatch error:
   `ValueError: The shape of parameter W does not match the dictionary length.`
3. If not caught, character indexing becomes corrupted, leading to completely nonsensical glyph mapping.

---

## 3. Recommended Optimization Strategy

1. **Pre-training / Runtime Separation:** The pre-trained model must run with its native character dictionary during visual inference.
2. **Post-Recognition Domain Rectification:** Custom character and vocabulary enhancements must operate at the post-processing stage (via `src/document_processing/ocr_correction.py`), where character confusions and dictionary lookups do not alter the neural tensor projection head.
3. **Future Fine-Tuning Considerations:** If model fine-tuning is approved in subsequent research phases, the custom dictionary must be supplied during training data preparation, allowing the linear head to be randomly re-initialized and trained to dimension $115$.
