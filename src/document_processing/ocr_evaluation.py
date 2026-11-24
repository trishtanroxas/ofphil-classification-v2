"""
OCR Evaluation Module - ofphil-classification-v2
Phase 04: Document Processing and OCR

Provides standardized Levenshtein-based CER and WER computation, supporting
both raw string evaluation and normalized evaluation (case folding, punctuation
standardization, whitespace collapsing, and diacritic normalization).
"""

from typing import Dict, List, Optional, Tuple, Union
import unicodedata
import re


def normalize_text(
    text: str,
    case_fold: bool = True,
    strip_punctuation: bool = True,
    collapse_whitespace: bool = True,
    normalize_unicode: bool = True,
    strip_checkbox_artifacts: bool = False,
) -> str:
    """Normalize text for evaluation according to specified policy.

    Args:
        text: Input string.
        case_fold: Whether to convert text to lowercase.
        strip_punctuation: Whether to remove punctuation marks.
        collapse_whitespace: Whether to replace multiple spaces with single space.
        normalize_unicode: Whether to normalize Unicode characters (NFKC).
        strip_checkbox_artifacts: Whether to strip OCR checkbox indicators like '[✓]', '[X]'.

    Returns:
        Normalized string.
    """
    if not text:
        return ""

    normalized = str(text)

    if normalize_unicode:
        normalized = unicodedata.normalize("NFKC", normalized)

    if strip_checkbox_artifacts:
        normalized = re.sub(r"\[[\s✓Xx\?\-_]*\]|\([\s✓Xx\?\-_]*\)", " ", normalized)

    if case_fold:
        normalized = normalized.lower()

    if strip_punctuation:
        # Keep alphanumeric, spaces, and hyphens within compound words if desired
        normalized = re.sub(r"[^\w\s]", " ", normalized)

    if collapse_whitespace:
        normalized = re.sub(r"\s+", " ", normalized).strip()

    return normalized


def compute_levenshtein_distance(seq1: Union[str, List[str]], seq2: Union[str, List[str]]) -> int:
    """Compute the minimum edit distance (Levenshtein distance) between two sequences.

    Uses dynamic programming with $O(\min(N, M))$ memory optimization.
    """
    n, m = len(seq1), len(seq2)
    if n == 0:
        return m
    if m == 0:
        return n

    # Use shorter sequence for column memory optimization
    if n > m:
        seq1, seq2 = seq2, seq1
        n, m = m, n

    current_row = list(range(n + 1))
    for i in range(1, m + 1):
        previous_row, current_row = current_row, [i] + [0] * n
        for j in range(1, n + 1):
            add = previous_row[j] + 1
            delete = current_row[j - 1] + 1
            change = previous_row[j - 1]
            if seq1[j - 1] != seq2[i - 1]:
                change += 1
            current_row[j] = min(add, delete, change)

    return current_row[n]


def compute_cer(
    reference: str,
    hypothesis: str,
    mode: str = "raw",
) -> float:
    """Compute Character Error Rate (CER).

    CER = Levenshtein_Distance(reference, hypothesis) / len(reference)

    Args:
        reference: Ground-truth string.
        hypothesis: OCR predicted string.
        mode: 'raw' or 'normalized'.

    Returns:
        Character error rate float (0.0 to 1.0+, capped or uncapped).
    """
    if mode == "normalized":
        ref = normalize_text(reference)
        hyp = normalize_text(hypothesis)
    else:
        ref = str(reference)
        hyp = str(hypothesis)

    if len(ref) == 0:
        return 0.0 if len(hyp) == 0 else 1.0

    edit_dist = compute_levenshtein_distance(ref, hyp)
    return edit_dist / len(ref)


def compute_wer(
    reference: str,
    hypothesis: str,
    mode: str = "raw",
) -> float:
    """Compute Word Error Rate (WER).

    WER = Levenshtein_Distance(ref_words, hyp_words) / len(ref_words)

    Args:
        reference: Ground-truth string.
        hypothesis: OCR predicted string.
        mode: 'raw' or 'normalized'.

    Returns:
        Word error rate float (0.0 to 1.0+).
    """
    if mode == "normalized":
        ref_norm = normalize_text(reference, case_fold=True, strip_punctuation=True)
        hyp_norm = normalize_text(hypothesis, case_fold=True, strip_punctuation=True)
        ref_words = ref_norm.split() if ref_norm else []
        hyp_words = hyp_norm.split() if hyp_norm else []
    else:
        ref_words = str(reference).strip().split()
        hyp_words = str(hypothesis).strip().split()

    if len(ref_words) == 0:
        return 0.0 if len(hyp_words) == 0 else 1.0

    edit_dist = compute_levenshtein_distance(ref_words, hyp_words)
    return edit_dist / len(ref_words)


def evaluate_batch(
    references: List[str],
    hypotheses: List[str],
    mode: str = "both",
) -> Dict[str, Union[float, int]]:
    """Evaluate a batch of reference-hypothesis pairs, returning macro and micro CER/WER.

    Args:
        references: List of ground-truth strings.
        hypotheses: List of OCR predicted strings.
        mode: 'raw', 'normalized', or 'both'.

    Returns:
        Dictionary with aggregated metrics.
    """
    if len(references) != len(hypotheses):
        raise ValueError(f"Length mismatch: {len(references)} refs vs {len(hypotheses)} hyps.")

    results: Dict[str, Union[float, int]] = {"total_samples": len(references)}

    modes_to_run = ["raw", "normalized"] if mode == "both" else [mode]

    for m in modes_to_run:
        total_char_dist = 0
        total_char_len = 0
        total_word_dist = 0
        total_word_len = 0

        sample_cers = []
        sample_wers = []

        for ref, hyp in zip(references, hypotheses):
            if m == "normalized":
                r_c = normalize_text(ref)
                h_c = normalize_text(hyp)
                r_w = normalize_text(ref, case_fold=True, strip_punctuation=True).split()
                h_w = normalize_text(hyp, case_fold=True, strip_punctuation=True).split()
            else:
                r_c = str(ref)
                h_c = str(hyp)
                r_w = r_c.strip().split()
                h_w = h_c.strip().split()

            c_dist = compute_levenshtein_distance(r_c, h_c)
            w_dist = compute_levenshtein_distance(r_w, h_w)

            total_char_dist += c_dist
            total_char_len += len(r_c)
            total_word_dist += w_dist
            total_word_len += len(r_w)

            sample_cers.append(c_dist / len(r_c) if len(r_c) > 0 else (0.0 if len(h_c) == 0 else 1.0))
            sample_wers.append(w_dist / len(r_w) if len(r_w) > 0 else (0.0 if len(h_w) == 0 else 1.0))

        results[f"micro_cer_{m}"] = total_char_dist / total_char_len if total_char_len > 0 else 0.0
        results[f"macro_cer_{m}"] = sum(sample_cers) / len(sample_cers) if sample_cers else 0.0
        results[f"micro_wer_{m}"] = total_word_dist / total_word_len if total_word_len > 0 else 0.0
        results[f"macro_wer_{m}"] = sum(sample_wers) / len(sample_wers) if sample_wers else 0.0

    return results
