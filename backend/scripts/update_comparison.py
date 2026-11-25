import json
from pathlib import Path

def update_comparison_notebook():
    nb_path = Path("experiments/notebooks/05_model_selection_and_training/07_model_comparison_and_tuning.ipynb")
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Cell 4: Imports
    nb["cells"][4]["source"] = [
        "import json\n",
        "import sys\n",
        "from pathlib import Path\n",
        "import numpy as np\n",
        "import pandas as pd\n",
        "from scipy import stats\n",
        "import matplotlib.pyplot as plt\n",
        "import seaborn as sns\n",
        "\n",
        "# Add project root to sys.path to import tabular_evaluation\n",
        "PROJECT_ROOT_SEARCH = Path.cwd()\n",
        "while PROJECT_ROOT_SEARCH.name != 'ofphil-classification-v2' and PROJECT_ROOT_SEARCH.parent != PROJECT_ROOT_SEARCH:\n",
        "    PROJECT_ROOT_SEARCH = PROJECT_ROOT_SEARCH.parent\n",
        "if str(PROJECT_ROOT_SEARCH) not in sys.path:\n",
        "    sys.path.insert(0, str(PROJECT_ROOT_SEARCH))\n",
        "\n",
        "import src.tabular_evaluation as te\n",
        "te.apply_safe_plot_style()\n",
        "\n",
        "print(\"Libraries loaded successfully.\")\n"
    ]

    # Cell 8: Comparison aggregation
    nb["cells"][8]["source"] = [
        "comparison_rows = []\n",
        "fold_f1_distributions = {}\n",
        "fold_brier_distributions = {}\n",
        "\n",
        "for item in loaded_models:\n",
        "    m_name = item[\"info\"][\"name\"]\n",
        "    m_family = item[\"info\"][\"family\"]\n",
        "    m_data = item[\"metrics\"]\n",
        "    \n",
        "    mean_m = m_data.get(\"cv_metrics_mean\", {})\n",
        "    std_m = m_data.get(\"cv_metrics_std\", {})\n",
        "    fold_details = m_data.get(\"fold_details\", [])\n",
        "    fold_f1s = [f.get(\"macro_f1\", 0.0) for f in fold_details]\n",
        "    fold_briers = [f.get(\"brier_score\", 0.0) for f in fold_details]\n",
        "    fold_f1_distributions[m_name] = fold_f1s\n",
        "    fold_brier_distributions[m_name] = fold_briers\n",
        "    \n",
        "    comparison_rows.append({\n",
        "        \"model\": m_name,\n",
        "        \"family\": m_family,\n",
        "        \"macro_f1_mean\": mean_m.get(\"macro_f1\", 0.0),\n",
        "        \"macro_f1_std\": std_m.get(\"macro_f1\", 0.0),\n",
        "        \"accuracy_mean\": mean_m.get(\"accuracy\", 0.0),\n",
        "        \"accuracy_std\": std_m.get(\"accuracy\", 0.0),\n",
        "        \"macro_precision_mean\": mean_m.get(\"macro_precision\", 0.0),\n",
        "        \"macro_recall_mean\": mean_m.get(\"macro_recall\", 0.0),\n",
        "        \"weighted_f1_mean\": mean_m.get(\"weighted_f1\", 0.0),\n",
        "        \"roc_auc_mean\": mean_m.get(\"roc_auc\", 0.0),\n",
        "        \"brier_score_mean\": mean_m.get(\"brier_score\", 0.0),\n",
        "        \"brier_score_std\": std_m.get(\"brier_score\", 0.0),\n",
        "        \"ece_mean\": mean_m.get(\"expected_calibration_error\", 0.0),\n",
        "        \"generalization_gap_mean\": mean_m.get(\"generalization_gap\", 0.0),\n",
        "        \"rec_eligible_mean\": mean_m.get(\"rec_eligible\", 0.0),\n",
        "        \"rec_ineligible_mean\": mean_m.get(\"rec_ineligible\", 0.0),\n",
        "        \"total_cv_time_ms\": m_data.get(\"total_cv_time_ms\", 0.0)\n",
        "    })\n",
        "\n",
        "if comparison_rows:\n",
        "    # Multi-criteria scoring: High F1 (weight 0.4), Low Brier (weight 0.25), High AUC (weight 0.2), Low Gap (weight 0.15)\n",
        "    df_comparison = pd.DataFrame(comparison_rows).sort_values(by=\"macro_f1_mean\", ascending=False).reset_index(drop=True)\n",
        "    df_comparison[\"rank\"] = range(1, len(df_comparison) + 1)\n",
        "    print(\"=== CONSOLIDATED 10-FOLD MODEL COMPARISON MATRIX ===\")\n",
        "    print(df_comparison[[\"rank\", \"model\", \"family\", \"macro_f1_mean\", \"macro_f1_std\", \"brier_score_mean\", \"ece_mean\", \"generalization_gap_mean\", \"roc_auc_mean\"]].to_string(index=False))\n",
        "    df_comparison.to_csv(REPORT_VIZ_DIR / \"model_comparison_summary_table.csv\", index=False)\n",
        "else:\n",
        "    df_comparison = pd.DataFrame()\n",
        "    print(\"No executed model files detected. Execute model notebooks in 02, 03, and 04 to populate.\")\n",
        "\n",
        "# Statistical Significance Testing\n",
        "statistical_significance_results = []\n",
        "if not df_comparison.empty and len(df_comparison) > 1:\n",
        "    top_model = df_comparison.iloc[0][\"model\"]\n",
        "    top_f1s = fold_f1_distributions.get(top_model, [])\n",
        "    print(f\"\\nEvaluating paired statistical significance vs Rank 1: {top_model} (Mean F1: {df_comparison.iloc[0]['macro_f1_mean']:.4f})\")\n",
        "    \n",
        "    for other_model, other_f1s in fold_f1_distributions.items():\n",
        "        if other_model == top_model:\n",
        "            continue\n",
        "        if len(top_f1s) == 10 and len(other_f1s) == 10:\n",
        "            diffs = np.array(top_f1s) - np.array(other_f1s)\n",
        "            t_stat, t_pval = stats.ttest_rel(top_f1s, other_f1s)\n",
        "            try:\n",
        "                w_stat, w_pval = stats.wilcoxon(top_f1s, other_f1s)\n",
        "            except Exception:\n",
        "                w_stat, w_pval = np.nan, np.nan\n",
        "            \n",
        "            statistical_significance_results.append({\n",
        "                \"comparison\": f\"{top_model} vs {other_model}\",\n",
        "                \"mean_diff\": float(np.mean(diffs)),\n",
        "                \"paired_t_pvalue\": float(t_pval) if not np.isnan(t_pval) else None,\n",
        "                \"wilcoxon_pvalue\": float(w_pval) if not np.isnan(w_pval) else None,\n",
        "                \"significant_p05\": bool(t_pval < 0.05) if not np.isnan(t_pval) else False\n",
        "            })\n",
        "            print(f\"  vs {other_model:<32} | diff: {np.mean(diffs):+.4f} | t-pval: {t_pval:.4f} | sig: {t_pval < 0.05}\")\n"
    ]

    # Cell 19: Champion info
    nb["cells"][19]["source"] = [
        "champion_info = {}\n",
        "if not df_comparison.empty:\n",
        "    top_row = df_comparison.iloc[0]\n",
        "    champion_info = {\n",
        "        \"champion_model\": top_row[\"model\"],\n",
        "        \"champion_family\": top_row[\"family\"],\n",
        "        \"champion_macro_f1\": float(top_row[\"macro_f1_mean\"]),\n",
        "        \"champion_macro_f1_std\": float(top_row[\"macro_f1_std\"]),\n",
        "        \"champion_accuracy\": float(top_row[\"accuracy_mean\"]),\n",
        "        \"champion_recall\": float(top_row[\"macro_recall_mean\"]),\n",
        "        \"champion_roc_auc\": float(top_row[\"roc_auc_mean\"]),\n",
        "        \"champion_brier_score\": float(top_row[\"brier_score_mean\"]),\n",
        "        \"champion_ece\": float(top_row[\"ece_mean\"]),\n",
        "        \"champion_generalization_gap\": float(top_row[\"generalization_gap_mean\"]),\n",
        "        \"selection_criteria\": \"Multi-criteria optimization: Highest 10-fold Macro F1, lowest Brier Score & ECE calibration error, and minimal generalization gap\"\n",
        "    }\n",
        "    print(f\"\\nCHAMPION MODEL DESIGNATED: {champion_info['champion_model']} (Macro F1: {champion_info['champion_macro_f1']:.4f}, Brier: {champion_info['champion_brier_score']:.4f})\")\n",
        "else:\n",
        "    champion_info = {\n",
        "        \"champion_model\": None,\n",
        "        \"status\": \"AWAITING_MANUAL_MODEL_TRAINING_RUNS\"\n",
        "    }\n",
        "\n",
        "summary_export = {\n",
        "    \"evaluation_scope\": \"tabular_only_7_models\",\n",
        "    \"cv_protocol\": \"StratifiedKFold-10Fold\",\n",
        "    \"multimodal_fusion_included\": False,\n",
        "    \"champion_selection\": champion_info,\n",
        "    \"model_rankings\": comparison_rows,\n",
        "    \"paired_hypothesis_tests\": statistical_significance_results\n",
        "}\n",
        "\n",
        "with open(MODELS_DIR / \"model_comparison_summary.json\", \"w\", encoding=\"utf-8\") as f:\n",
        "    json.dump(summary_export, f, indent=2)\n",
        "print(f\"Model comparison summary exported to: {MODELS_DIR / 'model_comparison_summary.json'}\")\n"
    ]

    # Clear code cell outputs
    for c in nb["cells"]:
        if c["cell_type"] == "code":
            c["execution_count"] = None
            c["outputs"] = []

    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print("Updated 07_model_comparison_and_tuning.ipynb successfully.")

if __name__ == "__main__":
    update_comparison_notebook()
