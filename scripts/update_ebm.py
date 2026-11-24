import json
from pathlib import Path

def update_ebm_notebook():
    nb_path = Path("experiments/notebooks/05_model_selection_and_training/04_interpretable_models/01_explainable_boosting_machine.ipynb")
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Cell 4: Imports
    nb["cells"][4]["source"] = [
        "import json\n",
        "import time\n",
        "import sys\n",
        "from pathlib import Path\n",
        "import numpy as np\n",
        "import pandas as pd\n",
        "import matplotlib.pyplot as plt\n",
        "from interpret.glassbox import ExplainableBoostingClassifier\n",
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
        "RANDOM_SEED = 42\n",
        "np.random.seed(RANDOM_SEED)\n",
        "print(f\"Libraries loaded successfully. RANDOM_SEED={RANDOM_SEED}\")\n"
    ]

    # Cell 6: Paths
    nb["cells"][6]["source"] = [
        "PROJECT_ROOT = Path(\"../../../..\")\n",
        "FEATURES_PATH = PROJECT_ROOT / \"data\" / \"interim\" / \"features\" / \"selected_features.csv\"\n",
        "CV_SPLITS_PATH = PROJECT_ROOT / \"data\" / \"processed\" / \"splits\" / \"cv_split_indices.json\"\n",
        "OUTPUT_DIR = PROJECT_ROOT / \"models\" / \"trained\" / \"interpretable\"\n",
        "REPORT_VIZ_DIR = PROJECT_ROOT / \"reports\" / \"phase_05\" / \"visualizations\" / \"explainable_boosting_machine\"\n",
        "OUTPUT_DIR.mkdir(parents=True, exist_ok=True)\n",
        "REPORT_VIZ_DIR.mkdir(parents=True, exist_ok=True)\n",
        "\n",
        "# Load dataset\n",
        "df_features = pd.read_csv(FEATURES_PATH)\n",
        "train_mask = df_features[\"split_partition\"] == \"train\"\n",
        "df_train_dev = df_features[train_mask].reset_index(drop=True)\n",
        "\n",
        "feature_cols = [c for c in df_train_dev.columns if c not in [\"internal_record_id\", \"split_partition\", \"eligibility\"]]\n",
        "X_train_full = df_train_dev[feature_cols]\n",
        "y_train_full = (df_train_dev[\"eligibility\"] == \"ELIGIBLE\").astype(int)\n",
        "\n",
        "# Load outer 10-fold split definitions\n",
        "with open(CV_SPLITS_PATH, \"r\", encoding=\"utf-8\") as f:\n",
        "    cv_data = json.load(f)\n",
        "\n",
        "print(f\"Loaded training development set: X={X_train_full.shape}, y={y_train_full.shape}\")\n",
        "print(f\"Stratified 10-Fold CV indices confirmed: {len(cv_data['folds'])} outer folds\")\n"
    ]

    # Cell 8: Hyperparameter search
    nb["cells"][8]["source"] = [
        "param_candidates = [\n",
        "    {\"interactions\": 0, \"max_bins\": 128, \"learning_rate\": 0.05},\n",
        "    {\"interactions\": 5, \"max_bins\": 128, \"learning_rate\": 0.05},\n",
        "    {\"interactions\": 10, \"max_bins\": 256, \"learning_rate\": 0.02}\n",
        "]\n",
        "\n",
        "grid_results = []\n",
        "for params in param_candidates:\n",
        "    fold_f1s = []\n",
        "    for fold_info in cv_data[\"folds\"][:3]:  # Fast screening across 3 representative folds\n",
        "        t_idx = fold_info[\"train_indices\"]\n",
        "        v_idx = fold_info[\"val_indices\"]\n",
        "        X_tr, y_tr = X_train_full.iloc[t_idx], y_train_full.iloc[t_idx]\n",
        "        X_va, y_va = X_train_full.iloc[v_idx], y_train_full.iloc[v_idx]\n",
        "        ebm = ExplainableBoostingClassifier(**params, random_state=RANDOM_SEED, n_jobs=-1)\n",
        "        ebm.fit(X_tr, y_tr)\n",
        "        preds = ebm.predict(X_va)\n",
        "        fold_f1s.append(te.f1_score(y_va, preds, average=\"macro\", zero_division=0))\n",
        "    mean_f1 = np.mean(fold_f1s)\n",
        "    grid_results.append({\"params\": params, \"mean_macro_f1\": mean_f1})\n",
        "    print(f\"Config: {params} -> Screen Macro F1: {mean_f1:.4f}\")\n",
        "\n",
        "best_result = max(grid_results, key=lambda x: x[\"mean_macro_f1\"])\n",
        "best_params = best_result[\"params\"]\n",
        "print(f\"Selected Optimal Parameters: {best_params}\")\n"
    ]

    # Cell 10: 10-Fold evaluation with full metrics
    nb["cells"][10]["source"] = [
        "fold_evaluations = []\n",
        "oof_predictions = np.zeros(len(y_train_full), dtype=int)\n",
        "oof_probabilities = np.zeros(len(y_train_full), dtype=float)\n",
        "\n",
        "start_time = time.time()\n",
        "for fold_info in cv_data[\"folds\"]:\n",
        "    f_num = fold_info[\"fold\"]\n",
        "    t_idx = fold_info[\"train_indices\"]\n",
        "    v_idx = fold_info[\"val_indices\"]\n",
        "    \n",
        "    X_tr, y_tr = X_train_full.iloc[t_idx], y_train_full.iloc[t_idx]\n",
        "    X_va, y_va = X_train_full.iloc[v_idx], y_train_full.iloc[v_idx]\n",
        "    \n",
        "    model_pipeline = ExplainableBoostingClassifier(\n",
        "        interactions=best_params[\"interactions\"],\n",
        "        max_bins=best_params[\"max_bins\"],\n",
        "        learning_rate=best_params[\"learning_rate\"],\n",
        "        random_state=RANDOM_SEED,\n",
        "        n_jobs=-1\n",
        "    )\n",
        "    model_pipeline.fit(X_tr, y_tr)\n",
        "    tr_preds = model_pipeline.predict(X_tr)\n",
        "    val_preds = model_pipeline.predict(X_va)\n",
        "    val_probs = model_pipeline.predict_proba(X_va)[:, 1]\n",
        "    \n",
        "    oof_predictions[v_idx] = val_preds\n",
        "    oof_probabilities[v_idx] = val_probs\n",
        "    \n",
        "    fold_metrics = te.compute_comprehensive_metrics(y_va, val_preds, val_probs, y_tr=y_tr, y_tr_pred=tr_preds)\n",
        "    fold_metrics[\"fold\"] = f_num\n",
        "    fold_evaluations.append(fold_metrics)\n",
        "    \n",
        "    print(f\"Fold {f_num:02d} | Train F1: {fold_metrics['train_macro_f1']:.4f} | Val F1: {fold_metrics['macro_f1']:.4f} | \"\n",
        "          f\"Gap: {fold_metrics['generalization_gap']:+.4f} | Brier: {fold_metrics['brier_score']:.4f} | Val AUC: {fold_metrics['roc_auc']:.4f}\")\n",
        "\n",
        "total_duration_ms = (time.time() - start_time) * 1000\n",
        "df_folds_metric = pd.DataFrame(fold_evaluations)\n",
        "\n",
        "metrics_mean = df_folds_metric.mean(numeric_only=True).to_dict()\n",
        "metrics_std = df_folds_metric.std(numeric_only=True).to_dict()\n",
        "print(f\"\\nStratified 10-Fold CV Complete ({total_duration_ms:.1f} ms).\")\n",
        "print(f\"Mean Macro F1: {metrics_mean['macro_f1']:.4f} +/- {metrics_std['macro_f1']:.4f}\")\n",
        "print(f\"Mean Brier Score: {metrics_mean['brier_score']:.4f} +/- {metrics_std['brier_score']:.4f}\")\n",
        "print(f\"Mean ECE:         {metrics_mean['expected_calibration_error']:.4f} +/- {metrics_std['expected_calibration_error']:.4f}\")\n",
        "print(f\"Mean Generalization Gap: {metrics_mean['generalization_gap']:.4f} +/- {metrics_std['generalization_gap']:.4f}\")\n"
    ]

    # Cell 12: Export artifacts
    nb["cells"][12]["source"] = [
        "# Fit full EBM on development set for global term explanations\n",
        "full_ebm = ExplainableBoostingClassifier(\n",
        "    interactions=best_params[\"interactions\"],\n",
        "    max_bins=best_params[\"max_bins\"],\n",
        "    learning_rate=best_params[\"learning_rate\"],\n",
        "    random_state=RANDOM_SEED,\n",
        "    n_jobs=-1\n",
        ")\n",
        "full_ebm.fit(X_train_full, y_train_full)\n",
        "\n",
        "ebm_global = full_ebm.explain_global(name=\"EBM Global Explanation\")\n",
        "term_names = ebm_global.data()[\"names\"]\n",
        "term_scores = ebm_global.data()[\"scores\"]\n",
        "df_importance = pd.DataFrame({\"feature\": term_names, \"importance\": term_scores}).sort_values(by=\"importance\", ascending=False).reset_index(drop=True)\n",
        "df_importance.to_csv(REPORT_VIZ_DIR / \"ebm_global_term_importances.csv\", index=False)\n",
        "\n",
        "# Export standardized evaluation artifacts\n",
        "top_features = df_importance.head(10).to_dict(orient=\"records\")\n",
        "df_summary_table = te.export_model_evaluation_artifacts(\n",
        "    model_name=\"Explainable Boosting Machine (EBM)\",\n",
        "    model_type=\"interpretable_glassbox_gam\",\n",
        "    fold_evaluations=fold_evaluations,\n",
        "    best_hyperparameters_per_fold=[best_params] * 10,\n",
        "    total_duration_ms=total_duration_ms,\n",
        "    top_features=top_features,\n",
        "    output_model_dir=OUTPUT_DIR,\n",
        "    report_viz_dir=REPORT_VIZ_DIR,\n",
        "    json_artifact_name=\"ebm_metrics.json\"\n",
        ")\n",
        "print(\"Evaluation summary table:\\n\", df_summary_table.to_string(index=False))\n"
    ]

    # Cell 14: Visualizations
    nb["cells"][14]["source"] = [
        "# --- PUBLICATION-READY EVALUATION VISUALIZATIONS (10 STANDARDIZED FIGURES) ---\n",
        "generated_figures = te.plot_all_model_figures(\n",
        "    model_name=\"Explainable Boosting Machine (EBM)\",\n",
        "    y_true=y_train_full,\n",
        "    oof_preds=oof_predictions,\n",
        "    oof_probs=oof_probabilities,\n",
        "    df_folds_metric=df_folds_metric,\n",
        "    df_importance=df_importance,\n",
        "    output_dir=REPORT_VIZ_DIR\n",
        ")\n",
        "print(f\"Successfully generated {len(generated_figures)} publication-quality figure artifacts in: {REPORT_VIZ_DIR}\")\n"
    ]

    nb["cells"][15]["cell_type"] = "markdown"
    nb["cells"][15]["source"] = [
        "### Calibration and Brier Score Verification Note\n",
        "The Brier Score, Expected Calibration Error (ECE), and Maximum Calibration Error (MCE) have been computed across all 10 folds and out-of-fold predictions. Visualizations for calibration curves, Brier score across folds, and prediction confidence distributions are saved to the visualizations directory.\n"
    ]
    if "outputs" in nb["cells"][15]:
        del nb["cells"][15]["outputs"]
    if "execution_count" in nb["cells"][15]:
        del nb["cells"][15]["execution_count"]

    nb["cells"][16]["cell_type"] = "markdown"
    nb["cells"][16]["source"] = [
        "### Overfitting & Generalization Gap Assessment\n",
        "The generalization gap ($F1_{train} - F1_{val}$) is systematically monitored across all 10 outer folds to diagnose any variance spikes or overfitting resulting from model complexity.\n"
    ]
    if "outputs" in nb["cells"][16]:
        del nb["cells"][16]["outputs"]
    if "execution_count" in nb["cells"][16]:
        del nb["cells"][16]["execution_count"]

    nb["cells"][17]["cell_type"] = "markdown"
    nb["cells"][17]["source"] = [
        "### EBM Global Feature Importances & Local Explanations\n",
        "Global feature importances are exported to `ebm_global_term_importances.csv` and visualized in `fig10_feature_importance.png`.\n"
    ]
    if "outputs" in nb["cells"][17]:
        del nb["cells"][17]["outputs"]
    if "execution_count" in nb["cells"][17]:
        del nb["cells"][17]["execution_count"]

    # Clear outputs
    for c in nb["cells"]:
        if c["cell_type"] == "code":
            c["execution_count"] = None
            c["outputs"] = []

    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print("Updated 01_explainable_boosting_machine.ipynb successfully.")

if __name__ == "__main__":
    update_ebm_notebook()
