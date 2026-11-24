"""
Phase 05 Tabular Evaluation and Visualization Utilities.
OFPHIL V2: Charity Patient Eligibility Classification.

This module provides verified, leak-free evaluation functions and safe Matplotlib
visualization helpers for all Phase 05 model notebooks.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

# Standard robust Matplotlib configuration
SAFE_PLOT_PARAMS: Dict[str, Any] = {
    "figure.figsize": (9, 6),
    "figure.dpi": 120,
    "savefig.dpi": 300,
    "font.family": "DejaVu Sans",
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 9,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "figure.constrained_layout.use": True,
}


def apply_safe_plot_style() -> None:
    """Applies clean, standard Matplotlib styling without external theme dependencies."""
    plt.rcParams.update(SAFE_PLOT_PARAMS)


def save_figure_safe(fig: plt.Figure, output_dir: Union[Path, str], filename_stem: str) -> Tuple[Path, Path]:
    """
    Saves a Matplotlib figure safely in both high-res PNG (300 DPI) and vector PDF format.
    Ensures directory exists and closes figure to free memory.
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    png_path = out_dir / f"{filename_stem}.png"
    pdf_path = out_dir / f"{filename_stem}.pdf"

    fig.savefig(png_path, dpi=300, bbox_inches="tight")
    fig.savefig(pdf_path, bbox_inches="tight")
    plt.close(fig)

    return png_path, pdf_path


def validate_probabilities(
    y_true: Union[np.ndarray, List[int]],
    y_prob: Union[np.ndarray, List[float]],
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Validates probability arrays: checks non-empty, length match, finite values,
    and valid bounds in [0.0, 1.0]. Returns sanitized numpy arrays.
    """
    y_t = np.asarray(y_true, dtype=int)
    y_p = np.asarray(y_prob, dtype=float)

    if len(y_t) == 0 or len(y_p) == 0:
        raise ValueError("Inputs cannot be empty.")
    if len(y_t) != len(y_p):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_t)} vs len(y_prob)={len(y_p)}")
    if not np.all(np.isfinite(y_p)):
        raise ValueError("y_prob contains NaN or infinite values.")

    # Clip slight floating-point overflows to [0.0, 1.0]
    eps = 1e-7
    if np.any(y_p < -eps) or np.any(y_p > 1.0 + eps):
        raise ValueError(f"Probabilities out of valid [0, 1] range: min={y_p.min()}, max={y_p.max()}")

    y_p = np.clip(y_p, 0.0, 1.0)
    return y_t, y_p


def calculate_expected_calibration_error(
    y_true: Union[np.ndarray, List[int]],
    y_prob: Union[np.ndarray, List[float]],
    n_bins: int = 10,
    strategy: str = "uniform",
) -> Dict[str, Any]:
    """
    Computes Expected Calibration Error (ECE) and Maximum Calibration Error (MCE)
    using uniform binning across [0, 1].
    """
    y_t, y_p = validate_probabilities(y_true, y_prob)
    n_samples = len(y_t)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    bin_lowers = bin_boundaries[:-1]
    bin_uppers = bin_boundaries[1:]

    ece = 0.0
    mce = 0.0
    bin_details = []

    for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
        in_bin = (y_p > bin_lower) & (y_p <= bin_upper) if bin_lower > 0 else (y_p >= bin_lower) & (y_p <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(y_t[in_bin])
            avg_confidence_in_bin = np.mean(y_p[in_bin])
            abs_diff = np.abs(accuracy_in_bin - avg_confidence_in_bin)

            ece += abs_diff * prop_in_bin
            mce = max(mce, abs_diff)

            bin_details.append({
                "bin_lower": float(bin_lower),
                "bin_upper": float(bin_upper),
                "count": int(np.sum(in_bin)),
                "accuracy": float(accuracy_in_bin),
                "confidence": float(avg_confidence_in_bin),
                "abs_calibration_error": float(abs_diff),
            })
        else:
            bin_details.append({
                "bin_lower": float(bin_lower),
                "bin_upper": float(bin_upper),
                "count": 0,
                "accuracy": 0.0,
                "confidence": float((bin_lower + bin_upper) / 2.0),
                "abs_calibration_error": 0.0,
            })

    return {
        "ece": float(ece),
        "mce": float(mce),
        "n_bins": n_bins,
        "n_evaluated": int(n_samples),
        "binning_strategy": strategy,
        "bin_details": bin_details,
    }


def compute_comprehensive_metrics(
    y_true: Union[np.ndarray, List[int]],
    y_pred: Union[np.ndarray, List[int]],
    y_prob: Optional[Union[np.ndarray, List[float]]] = None,
    pos_label: int = 1,
    y_tr: Optional[Union[np.ndarray, List[int]]] = None,
    y_tr_pred: Optional[Union[np.ndarray, List[int]]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Computes all standard Phase 05 classification metrics including:
    Accuracy, Macro Precision, Recall, F1, Weighted F1, Per-Class metrics,
    Confusion Matrix, ROC-AUC, Brier Score, ECE, MCE, and Generalization Gap.
    Supports both naming conventions (e.g., macro_f1 and f1_macro) for seamless compatibility.
    """
    y_t = np.asarray(y_true, dtype=int)
    y_p = np.asarray(y_pred, dtype=int)

    acc = float(accuracy_score(y_t, y_p))
    prec_macro = float(precision_score(y_t, y_p, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_t, y_p, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_t, y_p, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_t, y_p, average="weighted", zero_division=0))

    # Per-class metrics (Class 0: INELIGIBLE, Class 1: ELIGIBLE)
    prec_c0 = float(precision_score(y_t, y_p, pos_label=0, zero_division=0))
    rec_c0 = float(recall_score(y_t, y_p, pos_label=0, zero_division=0))
    f1_c0 = float(f1_score(y_t, y_p, pos_label=0, zero_division=0))

    prec_c1 = float(precision_score(y_t, y_p, pos_label=pos_label, zero_division=0))
    rec_c1 = float(recall_score(y_t, y_p, pos_label=pos_label, zero_division=0))
    f1_c1 = float(f1_score(y_t, y_p, pos_label=pos_label, zero_division=0))

    cm = confusion_matrix(y_t, y_p, labels=[0, 1]).tolist()

    # Calculate training metrics and generalization gap if training labels provided
    train_acc = None
    train_f1 = None
    gen_gap = None
    if y_tr is not None and y_tr_pred is not None:
        y_tr_arr = np.asarray(y_tr, dtype=int)
        y_tr_p = np.asarray(y_tr_pred, dtype=int)
        train_acc = float(accuracy_score(y_tr_arr, y_tr_p))
        train_f1 = float(f1_score(y_tr_arr, y_tr_p, average="macro", zero_division=0))
        gen_gap = float(train_f1 - f1_macro)

    result: Dict[str, Any] = {
        # Standard names
        "accuracy": acc,
        "val_accuracy": acc,
        "macro_precision": prec_macro,
        "precision_macro": prec_macro,
        "val_precision_macro": prec_macro,
        "macro_recall": rec_macro,
        "recall_macro": rec_macro,
        "val_recall_macro": rec_macro,
        "macro_f1": f1_macro,
        "f1_macro": f1_macro,
        "val_f1_macro": f1_macro,
        "weighted_f1": f1_weighted,
        "f1_weighted": f1_weighted,
        "val_f1_weighted": f1_weighted,
        # Per-class
        "prec_ineligible": prec_c0,
        "precision_ineligible": prec_c0,
        "val_prec_ineligible": prec_c0,
        "rec_ineligible": rec_c0,
        "recall_ineligible": rec_c0,
        "val_rec_ineligible": rec_c0,
        "f1_ineligible": f1_c0,
        "prec_eligible": prec_c1,
        "precision_eligible": prec_c1,
        "val_prec_eligible": prec_c1,
        "rec_eligible": rec_c1,
        "recall_eligible": rec_c1,
        "val_rec_eligible": rec_c1,
        "f1_eligible": f1_c1,
        "confusion_matrix": cm,
        # Training / gap
        "train_accuracy": train_acc,
        "train_macro_f1": train_f1,
        "train_f1_macro": train_f1,
        "generalization_gap": gen_gap,
    }

    if y_prob is not None:
        _, y_pr = validate_probabilities(y_t, y_prob)
        try:
            auc = float(roc_auc_score(y_t, y_pr))
        except Exception:
            auc = float("nan")

        bs = float(brier_score_loss(y_t, y_pr))
        cal_stats = calculate_expected_calibration_error(y_t, y_pr, n_bins=10)

        result.update({
            "roc_auc": auc,
            "val_roc_auc": auc,
            "brier_score": bs,
            "val_brier_score": bs,
            "expected_calibration_error": cal_stats["ece"],
            "ece": cal_stats["ece"],
            "maximum_calibration_error": cal_stats["mce"],
            "mce": cal_stats["mce"],
            "calibration_bins": cal_stats["n_bins"],
        })
    else:
        result.update({
            "roc_auc": None,
            "val_roc_auc": None,
            "brier_score": None,
            "val_brier_score": None,
            "expected_calibration_error": None,
            "ece": None,
            "maximum_calibration_error": None,
            "mce": None,
            "calibration_bins": None,
        })

    return result


def plot_all_model_figures(
    model_name: str,
    y_true: np.ndarray,
    oof_preds: np.ndarray,
    oof_probs: np.ndarray,
    df_folds_metric: Optional[pd.DataFrame] = None,
    df_importance: Optional[pd.DataFrame] = None,
    output_dir: Optional[Union[Path, str]] = None,
    fold_df: Optional[pd.DataFrame] = None,
    class_labels: Tuple[str, str] = ("INELIGIBLE", "ELIGIBLE"),
    **kwargs: Any,
) -> List[Path]:
    """
    Renders and exports all 10 publication-quality figures for a single tabular model,
    saving each as both high-resolution PNG (300 DPI) and vector PDF with bbox_inches='tight'.
    Flexible parameter binding accepts either df_folds_metric or fold_df, and output_dir as positional or keyword.
    """
    apply_safe_plot_style()

    # Determine out_dir
    target_dir = output_dir or kwargs.get("out_dir")
    if target_dir is None:
        raise ValueError("output_dir must be provided.")
    out_dir = Path(target_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Determine fold dataframe
    f_df = df_folds_metric if df_folds_metric is not None else fold_df
    if f_df is None:
        raise ValueError("df_folds_metric or fold_df must be provided.")

    y_t, y_p = validate_probabilities(y_true, oof_probs)
    saved_files: List[Path] = []

    # Map column aliases for fold_df
    def _get_col(df: pd.DataFrame, candidates: List[str], default_val: float = 0.0) -> np.ndarray:
        for c in candidates:
            if c in df.columns:
                return df[c].values
        return np.full(len(df), default_val)

    folds = f_df["fold"].values if "fold" in f_df.columns else np.arange(1, len(f_df) + 1)
    acc_vals = _get_col(f_df, ["val_accuracy", "accuracy"])
    prec_vals = _get_col(f_df, ["val_precision_macro", "macro_precision", "precision_macro"])
    rec_vals = _get_col(f_df, ["val_recall_macro", "macro_recall", "recall_macro"])
    f1_vals = _get_col(f_df, ["val_f1_macro", "macro_f1", "f1_macro"])
    tr_f1_vals = _get_col(f_df, ["train_f1_macro", "train_macro_f1", "train_f1"])
    bs_vals = _get_col(f_df, ["val_brier_score", "brier_score"], default_val=float(brier_score_loss(y_t, y_p)))
    gap_vals = _get_col(f_df, ["generalization_gap"], default_val=0.0)
    if np.all(gap_vals == 0.0) and np.any(tr_f1_vals > 0):
        gap_vals = tr_f1_vals - f1_vals

    # -------------------------------------------------------------
    # Figure 1: Cross-Validation Performance Across 10 Folds
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(folds, acc_vals, marker="o", lw=1.8, label="Accuracy", color="#2b5c8f")
    ax.plot(folds, prec_vals, marker="s", lw=1.8, label="Precision (Macro)", color="#2ca02c")
    ax.plot(folds, rec_vals, marker="^", lw=1.8, label="Recall (Macro)", color="#d95f02")
    ax.plot(folds, f1_vals, marker="D", lw=2.2, label="F1-Score (Macro)", color="#7570b3")
    mean_f1 = float(np.mean(f1_vals))
    ax.axhline(mean_f1, color="#7570b3", linestyle="--", alpha=0.7, label=f"Mean F1 ({mean_f1:.3f})")
    ax.set_title(f"Figure 1: {model_name} — Stratified 10-Fold CV Performance", fontweight="bold")
    ax.set_xlabel("Cross-Validation Fold Number")
    ax.set_ylabel("Metric Score [0.0 - 1.0]")
    ax.set_ylim([0.0, 1.05])
    ax.set_xticks(folds)
    ax.legend(loc="lower right")
    p1, p2 = save_figure_safe(fig, out_dir, "fig01_cv_folds_f1_trajectory")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 2: Out-of-Fold Confusion Matrix (Raw and Normalized)
    # -------------------------------------------------------------
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    cm = confusion_matrix(y_t, oof_preds, labels=[0, 1])
    cm_norm = confusion_matrix(y_t, oof_preds, labels=[0, 1], normalize="true")

    im1 = ax1.imshow(cm, cmap="Blues")
    fig.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04)
    for i in range(2):
        for j in range(2):
            ax1.text(j, i, f"{cm[i, j]}", ha="center", va="center",
                     color="white" if cm[i, j] > cm.max() / 2 else "black", fontweight="bold", fontsize=12)
    ax1.set_title(f"Raw Counts (N={len(y_t)})", fontweight="bold")
    ax1.set_xlabel("Predicted Label")
    ax1.set_ylabel("Actual Label")
    ax1.set_xticks([0, 1])
    ax1.set_yticks([0, 1])
    ax1.set_xticklabels(class_labels, fontweight="bold")
    ax1.set_yticklabels(class_labels, fontweight="bold")

    im2 = ax2.imshow(cm_norm, cmap="Blues", vmin=0, vmax=1)
    fig.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)
    for i in range(2):
        for j in range(2):
            ax2.text(j, i, f"{cm_norm[i, j]*100:.1f}%", ha="center", va="center",
                     color="white" if cm_norm[i, j] > 0.5 else "black", fontweight="bold", fontsize=12)
    ax2.set_title("Normalized (Recall Rate)", fontweight="bold")
    ax2.set_xlabel("Predicted Label")
    ax2.set_ylabel("Actual Label")
    ax2.set_xticks([0, 1])
    ax2.set_yticks([0, 1])
    ax2.set_xticklabels(class_labels, fontweight="bold")
    ax2.set_yticklabels(class_labels, fontweight="bold")

    fig.suptitle(f"Figure 2: {model_name} — Out-of-Fold Confusion Matrix", fontweight="bold", y=1.02)
    p1, p2 = save_figure_safe(fig, out_dir, "fig02_confusion_matrix_raw_and_normalized")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 3: ROC Curve & AUC
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(7, 6))
    fpr, tpr, _ = roc_curve(y_t, y_p)
    auc_val = roc_auc_score(y_t, y_p)
    ax.plot(fpr, tpr, color="#e41a1c", lw=2.2, label=f"OOF ROC Curve (AUC = {auc_val:.3f})")
    ax.plot([0, 1], [0, 1], color="#386cb0", lw=1.5, linestyle="--", label="Random Chance (AUC = 0.500)")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_title(f"Figure 3: {model_name} — Out-of-Fold ROC Curve", fontweight="bold")
    ax.set_xlabel("False Positive Rate (1 - Specificity)")
    ax.set_ylabel("True Positive Rate (Sensitivity)")
    ax.legend(loc="lower right")
    p1, p2 = save_figure_safe(fig, out_dir, "fig03_roc_curve")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 4: Brier Score Across Folds
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    mean_bs = float(np.mean(bs_vals))
    std_bs = float(np.std(bs_vals))
    bars = ax.bar(folds, bs_vals, color="#41b6c4", edgecolor="black", width=0.55)
    ax.axhline(mean_bs, color="#e41a1c", linestyle="--", lw=1.8,
               label=f"Mean Brier Score: {mean_bs:.4f} (±{std_bs:.4f})")
    ax.axhline(0.25, color="gray", linestyle=":", lw=1.5, label="Uninformative Reference (0.2500)")
    ax.set_title(f"Figure 4: {model_name} — Brier Score Across Folds (Lower is Better)", fontweight="bold")
    ax.set_xlabel("Cross-Validation Fold Number")
    ax.set_ylabel("Brier Score Loss")
    ax.set_ylim([0.0, max(0.30, float(np.max(bs_vals)) * 1.25)])
    ax.set_xticks(folds)
    ax.legend(loc="upper right")
    p1, p2 = save_figure_safe(fig, out_dir, "fig04_brier_score_across_folds")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 5: Reliability Diagram (Calibration Curve)
    # -------------------------------------------------------------
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 7), sharex=True, gridspec_kw={"height_ratios": [3, 1]})
    prob_true, prob_pred = calibration_curve(y_t, y_p, n_bins=10, strategy="uniform")
    cal_metrics = calculate_expected_calibration_error(y_t, y_p, n_bins=10)

    ax1.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfect Calibration")
    ax1.plot(prob_pred, prob_true, marker="s", color="#2b5c8f", lw=2.0,
             label=f"{model_name} (ECE={cal_metrics['ece']:.3f}, MCE={cal_metrics['mce']:.3f})")
    ax1.set_ylabel("Fraction of Positives (Empirical Accuracy)")
    ax1.set_ylim([-0.05, 1.05])
    ax1.set_title(f"Figure 5: {model_name} — Reliability Diagram & Calibration Curve", fontweight="bold")
    ax1.legend(loc="lower right")

    ax2.hist(y_p, bins=10, range=(0, 1), color="#2b5c8f", edgecolor="black", alpha=0.7)
    ax2.set_xlabel("Mean Predicted Probability")
    ax2.set_ylabel("Count")
    ax2.set_xlim([0, 1])
    p1, p2 = save_figure_safe(fig, out_dir, "fig05_reliability_diagram_calibration")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 6: Predicted Probability Distribution by True Class
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(y_p[y_t == 0], bins=20, range=(0, 1), alpha=0.6, label=f"Actual {class_labels[0]}", color="#2b5c8f", edgecolor="black")
    ax.hist(y_p[y_t == 1], bins=20, range=(0, 1), alpha=0.6, label=f"Actual {class_labels[1]}", color="#d95f02", edgecolor="black")
    ax.axvline(0.5, color="black", linestyle="--", lw=1.5, label="Decision Threshold (0.50)")
    ax.set_title(f"Figure 6: {model_name} — Predicted Probability Distribution by Actual Class", fontweight="bold")
    ax.set_xlabel("Predicted Probability of Eligibility")
    ax.set_ylabel("Frequency Count")
    ax.legend(loc="upper center")
    p1, p2 = save_figure_safe(fig, out_dir, "fig06_prediction_probability_distribution")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 7: Training vs. Validation Performance Across Folds
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(folds, tr_f1_vals, marker="o", color="#2ca02c", lw=2.0, label="Training Fold F1 (Macro)")
    ax.plot(folds, f1_vals, marker="s", color="#1f77b4", lw=2.0, label="Validation Fold F1 (Macro)")
    ax.fill_between(folds, tr_f1_vals, f1_vals, color="red", alpha=0.15, label="Generalization Gap Area")
    ax.set_title(f"Figure 7: {model_name} — Training vs. Validation F1 Across Folds", fontweight="bold")
    ax.set_xlabel("Cross-Validation Fold Number")
    ax.set_ylabel("Macro F1-Score")
    ax.set_ylim([0.0, 1.05])
    ax.set_xticks(folds)
    ax.legend(loc="lower right")
    p1, p2 = save_figure_safe(fig, out_dir, "fig07_train_vs_val_f1_gap")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 8: Generalization Gap Bar Chart
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    bar_colors = ["#e41a1c" if g > 0.10 else "#ff7f00" if g > 0.05 else "#4daf4a" for g in gap_vals]
    bars = ax.bar(folds, gap_vals, color=bar_colors, edgecolor="black", width=0.55)
    mean_gap = float(np.mean(gap_vals))
    ax.axhline(mean_gap, color="black", linestyle="--", lw=1.8, label=f"Mean Overfitting Gap: {mean_gap:.3f}")
    ax.set_title(f"Figure 8: {model_name} — Generalization Gap (Train F1 - Val F1)", fontweight="bold")
    ax.set_xlabel("Fold Number")
    ax.set_ylabel("F1 Gap [Positive = Overfitting]")
    ax.set_xticks(folds)
    ax.legend(loc="upper right")
    p1, p2 = save_figure_safe(fig, out_dir, "fig08_generalization_gap_distribution")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 9: Per-Class Performance Breakdown
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    classes = [class_labels[0], class_labels[1]]
    x = np.arange(len(classes))
    width = 0.25

    p0 = float(np.mean(_get_col(f_df, ["val_prec_ineligible", "prec_ineligible", "precision_ineligible"])))
    p1 = float(np.mean(_get_col(f_df, ["val_prec_eligible", "prec_eligible", "precision_eligible"])))
    r0 = float(np.mean(_get_col(f_df, ["val_rec_ineligible", "rec_ineligible", "recall_ineligible"])))
    r1 = float(np.mean(_get_col(f_df, ["val_rec_eligible", "rec_eligible", "recall_eligible"])))
    if p0 == 0.0 and r0 == 0.0:
        p0 = float(precision_score(y_t, oof_preds, pos_label=0, zero_division=0))
        r0 = float(recall_score(y_t, oof_preds, pos_label=0, zero_division=0))
    if p1 == 0.0 and r1 == 0.0:
        p1 = float(precision_score(y_t, oof_preds, pos_label=1, zero_division=0))
        r1 = float(recall_score(y_t, oof_preds, pos_label=1, zero_division=0))

    f0 = 2 * (p0 * r0) / (p0 + r0 + 1e-9)
    f1 = 2 * (p1 * r1) / (p1 + r1 + 1e-9)

    ax.bar(x - width, [p0, p1], width, label="Precision", color="#66c2a5", edgecolor="black")
    ax.bar(x, [r0, r1], width, label="Recall", color="#fc8d62", edgecolor="black")
    ax.bar(x + width, [f0, f1], width, label="F1-Score", color="#8da0cb", edgecolor="black")

    ax.set_title(f"Figure 9: {model_name} — Per-Class Performance Metrics", fontweight="bold")
    ax.set_ylabel("Score [0.0 - 1.0]")
    ax.set_xticks(x)
    ax.set_xticklabels(classes, fontweight="bold")
    ax.set_ylim([0.0, 1.15])
    ax.legend(loc="upper right")
    p1, p2 = save_figure_safe(fig, out_dir, "fig09_per_class_performance_breakdown")
    saved_files.extend([p1, p2])

    # -------------------------------------------------------------
    # Figure 10: Model-Specific Feature Importance / Explanations
    # -------------------------------------------------------------
    if df_importance is not None and not df_importance.empty:
        fig, ax = plt.subplots(figsize=(10, 6))
        top15 = df_importance.head(15).iloc[::-1]
        val_col = "importance" if "importance" in top15.columns else "abs_importance" if "abs_importance" in top15.columns else top15.columns[1]
        ax.barh(top15["feature"], top15[val_col], color="#41b6c4", edgecolor="black", linewidth=1.1)
        ax.set_title(f"Figure 10: {model_name} — Top 15 Primary Predictors", fontweight="bold")
        ax.set_xlabel("Relative Importance / Magnitude")
        p1, p2 = save_figure_safe(fig, out_dir, "fig10_feature_importance")
        saved_files.extend([p1, p2])

    return saved_files


def export_model_evaluation_artifacts(
    model_name: str,
    model_type: str = "tabular",
    fold_evaluations: Optional[List[Dict[str, Any]]] = None,
    best_hyperparameters_per_fold: Optional[List[Dict[str, Any]]] = None,
    total_duration_ms: float = 0.0,
    top_features: Optional[List[Dict[str, Any]]] = None,
    output_model_dir: Optional[Union[Path, str]] = None,
    report_viz_dir: Optional[Union[Path, str]] = None,
    json_artifact_name: Optional[str] = None,
    # Also support old signature: (model_name, output_dir, fold_df, summary_dict, y_true, oof_preds, oof_probs)
    output_dir: Optional[Union[Path, str]] = None,
    fold_df: Optional[pd.DataFrame] = None,
    summary_dict: Optional[Dict[str, Any]] = None,
    y_true: Optional[np.ndarray] = None,
    oof_preds: Optional[np.ndarray] = None,
    oof_probs: Optional[np.ndarray] = None,
    **kwargs: Any,
) -> pd.DataFrame:
    """
    Exports standardized CSV and JSON evaluation summaries for a model.
    Seamlessly adapts to both new notebook exporter calls and legacy artifact calls.
    Returns the summary table DataFrame.
    """
    out_model_dir = Path(output_model_dir or output_dir or "models/trained")
    out_viz_dir = Path(report_viz_dir or out_model_dir)
    out_model_dir.mkdir(parents=True, exist_ok=True)
    out_viz_dir.mkdir(parents=True, exist_ok=True)

    # If fold_evaluations passed as list of dicts
    if fold_evaluations is not None:
        df_folds = pd.DataFrame(fold_evaluations)
    elif fold_df is not None:
        df_folds = fold_df
    else:
        df_folds = pd.DataFrame()

    # 1. Export brier_score_by_fold.csv to visualization directory
    if not df_folds.empty:
        df_folds.to_csv(out_viz_dir / "brier_score_by_fold.csv", index=False)

    # 2. Build summary metrics
    metrics_mean = df_folds.mean(numeric_only=True).to_dict() if not df_folds.empty else {}
    metrics_std = df_folds.std(numeric_only=True).to_dict() if not df_folds.empty else {}

    summary_table_data = [
        {"Metric": "Train Macro F1", "Mean": f"{metrics_mean.get('train_macro_f1', metrics_mean.get('train_f1_macro', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('train_macro_f1', metrics_std.get('train_f1_macro', 0.0)):.4f}"},
        {"Metric": "Validation Accuracy", "Mean": f"{metrics_mean.get('accuracy', metrics_mean.get('val_accuracy', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('accuracy', metrics_std.get('val_accuracy', 0.0)):.4f}"},
        {"Metric": "Validation Macro Precision", "Mean": f"{metrics_mean.get('macro_precision', metrics_mean.get('precision_macro', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('macro_precision', metrics_std.get('precision_macro', 0.0)):.4f}"},
        {"Metric": "Validation Macro Recall", "Mean": f"{metrics_mean.get('macro_recall', metrics_mean.get('recall_macro', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('macro_recall', metrics_std.get('recall_macro', 0.0)):.4f}"},
        {"Metric": "Validation Macro F1-score", "Mean": f"{metrics_mean.get('macro_f1', metrics_mean.get('f1_macro', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('macro_f1', metrics_std.get('f1_macro', 0.0)):.4f}"},
        {"Metric": "Validation Weighted F1-score", "Mean": f"{metrics_mean.get('weighted_f1', metrics_mean.get('f1_weighted', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('weighted_f1', metrics_std.get('f1_weighted', 0.0)):.4f}"},
        {"Metric": "Validation ROC-AUC", "Mean": f"{metrics_mean.get('roc_auc', 0.0):.4f}", "Standard Deviation": f"{metrics_std.get('roc_auc', 0.0):.4f}"},
        {"Metric": "Validation Brier Score", "Mean": f"{metrics_mean.get('brier_score', 0.0):.4f}", "Standard Deviation": f"{metrics_std.get('brier_score', 0.0):.4f}"},
        {"Metric": "Expected Calibration Error (ECE)", "Mean": f"{metrics_mean.get('expected_calibration_error', metrics_mean.get('ece', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('expected_calibration_error', metrics_std.get('ece', 0.0)):.4f}"},
        {"Metric": "Generalization Gap (F1)", "Mean": f"{metrics_mean.get('generalization_gap', 0.0):.4f}", "Standard Deviation": f"{metrics_std.get('generalization_gap', 0.0):.4f}"},
        {"Metric": "Per-Class Precision (INELIGIBLE)", "Mean": f"{metrics_mean.get('prec_ineligible', metrics_mean.get('precision_ineligible', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('prec_ineligible', metrics_std.get('precision_ineligible', 0.0)):.4f}"},
        {"Metric": "Per-Class Recall (INELIGIBLE)", "Mean": f"{metrics_mean.get('rec_ineligible', metrics_mean.get('recall_ineligible', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('rec_ineligible', metrics_std.get('recall_ineligible', 0.0)):.4f}"},
        {"Metric": "Per-Class Precision (ELIGIBLE)", "Mean": f"{metrics_mean.get('prec_eligible', metrics_mean.get('precision_eligible', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('prec_eligible', metrics_std.get('precision_eligible', 0.0)):.4f}"},
        {"Metric": "Per-Class Recall (ELIGIBLE)", "Mean": f"{metrics_mean.get('rec_eligible', metrics_mean.get('recall_eligible', 0.0)):.4f}", "Standard Deviation": f"{metrics_std.get('rec_eligible', metrics_std.get('recall_eligible', 0.0)):.4f}"},
    ]
    df_summary = pd.DataFrame(summary_table_data)
    df_summary.to_csv(out_viz_dir / "evaluation_summary_table.csv", index=False)

    # 3. Export JSON payload
    json_name = json_artifact_name or f"{model_name.lower().replace(' ', '_')}_metrics.json"
    metrics_payload = {
        "model_name": model_name,
        "model_type": model_type,
        "cv_protocol": "Nested-Stratified-10Outer-5Inner",
        "best_hyperparameters_per_fold": best_hyperparameters_per_fold or [],
        "cv_metrics_mean": metrics_mean,
        "cv_metrics_std": metrics_std,
        "fold_details": fold_evaluations if fold_evaluations is not None else df_folds.to_dict(orient="records"),
        "total_cv_time_ms": round(total_duration_ms, 2),
        "top_features": top_features or [],
    }
    with open(out_model_dir / json_name, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    # Also save brier_score_summary.json in out_viz_dir
    with open(out_viz_dir / "brier_score_summary.json", "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"Exported evaluation artifacts to: {out_model_dir} and {out_viz_dir}")
    return df_summary
