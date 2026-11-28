"""
Compute Percent Agreement, Cohen's Kappa, and Mean Face-Validity Likert Score
once the Registered Social Worker (RSW) returns the completed 25-case sheet.

Usage:
  python experiments/scripts/compute_rsw_validation_agreement.py \
      reports/msw_expert_validation/msw_synthetic_validation_sample_25_blind.xlsx
"""
import json
import sys
from pathlib import Path
import pandas as pd
from sklearn.metrics import cohen_kappa_score, confusion_matrix

ROOT = Path("/home/kristoper/Projects/Thesis/ofphil-classification-v2")
DEFAULT_RETURNED = ROOT / "reports" / "msw_expert_validation" / "msw_synthetic_validation_sample_25_blind.xlsx"
KEY_CSV = ROOT / "reports" / "msw_expert_validation" / "msw_synthetic_validation_answer_key_25_RESEARCHER_ONLY.csv"
OUT_JSON = ROOT / "reports" / "msw_expert_validation" / "rsw_validation_summary_metrics.json"


def main():
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_RETURNED
    df_rsw = pd.read_excel(in_path, sheet_name=0) if in_path.suffix.lower() == ".xlsx" else pd.read_csv(in_path)
    df_key = pd.read_csv(KEY_CSV)

    merged = pd.merge(df_key, df_rsw, on="Case ID")
    dec_col = "RSW Eligibility Decision (ELIGIBLE / INELIGIBLE)"
    rate_col = "RSW Realism Rating (1-5)"

    merged["rsw_clean"] = merged[dec_col].astype(str).str.strip().str.upper()
    valid = merged[merged["rsw_clean"].isin(["ELIGIBLE", "INELIGIBLE"])].copy()
    if valid.empty:
        print("No RSW decisions filled in yet. Fill column 'RSW Eligibility Decision (ELIGIBLE / INELIGIBLE)' first.")
        return

    y_true = valid["Dataset Ground-Truth Label"]
    y_rsw = valid["rsw_clean"]
    pct_agree = float((y_true == y_rsw).mean() * 100.0)
    kappa = float(cohen_kappa_score(y_true, y_rsw, labels=["INELIGIBLE", "ELIGIBLE"]))
    cm = confusion_matrix(y_true, y_rsw, labels=["INELIGIBLE", "ELIGIBLE"]).tolist()

    ratings = pd.to_numeric(merged[rate_col], errors="coerce").dropna()
    mean_realism = float(ratings.mean()) if not ratings.empty else None

    summary = {
        "cases_evaluated": int(len(valid)),
        "percent_agreement": round(pct_agree, 2),
        "cohens_kappa": round(kappa, 4),
        "mean_case_realism_score_out_of_5": round(mean_realism, 2) if mean_realism is not None else None,
        "confusion_matrix_inelig_elig": cm,
    }
    OUT_JSON.write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

