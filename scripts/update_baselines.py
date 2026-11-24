import json
from pathlib import Path

def update_tabular_model_notebook(
    nb_path: Path,
    model_name: str,
    model_type: str,
    model_import_line: str,
    base_pipeline_code: str,
    param_grid_code: str,
    final_fit_importance_code: str,
    importance_filename: str = "feature_coefficients.csv"
):
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Cell 3: Imports
    nb["cells"][3]["source"] = [
        "import json\n",
        "import time\n",
        "import sys\n",
        "from pathlib import Path\n",
        "import numpy as np\n",
        "import pandas as pd\n",
        "import matplotlib.pyplot as plt\n",
        "from sklearn.compose import ColumnTransformer\n",
        "from sklearn.preprocessing import StandardScaler\n",
        "from sklearn.pipeline import Pipeline\n",
        "from sklearn.model_selection import StratifiedKFold, GridSearchCV\n",
        f"{model_import_line}\n",
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
        f"print(f\"Libraries loaded successfully. RANDOM_SEED={{RANDOM_SEED}}\")\n"
    ]

    # Cell 5: Paths & loading
    report_folder_name = nb_path.stem[3:] if nb_path.stem[:2].isdigit() and nb_path.stem[2] == "_" else nb_path.stem
    if "logistic" in report_folder_name:
        report_folder_name = "logistic_regression"
    elif "decision_tree" in report_folder_name:
        report_folder_name = "decision_tree"
    elif "random_forest" in report_folder_name:
        report_folder_name = "random_forest"
    elif "svm" in report_folder_name:
        report_folder_name = "svm"
    elif "xgboost" in report_folder_name:
        report_folder_name = "xgboost"
    elif "catboost" in report_folder_name:
        report_folder_name = "catboost"

    output_subfolder = "baselines" if ("logistic" in report_folder_name or "decision_tree" in report_folder_name or "random_forest" in report_folder_name or "svm" in report_folder_name) else "gradient_boosting"

    nb["cells"][5]["source"] = [
        "PROJECT_ROOT = Path(\"../../../..\")\n",
        "FEATURES_PATH = PROJECT_ROOT / \"data\" / \"interim\" / \"features\" / \"selected_features.csv\"\n",
        "CV_SPLITS_PATH = PROJECT_ROOT / \"data\" / \"processed\" / \"splits\" / \"cv_split_indices.json\"\n",
        f"OUTPUT_DIR = PROJECT_ROOT / \"models\" / \"trained\" / \"{output_subfolder}\"\n",
        f"REPORT_VIZ_DIR = PROJECT_ROOT / \"reports\" / \"phase_05\" / \"visualizations\" / \"{report_folder_name}\"\n",
        "OUTPUT_DIR.mkdir(parents=True, exist_ok=True)\n",
        "REPORT_VIZ_DIR.mkdir(parents=True, exist_ok=True)\n",
        "\n",
        "# Load dataset\n",
        "df_features = pd.read_csv(FEATURES_PATH)\n",
        "train_mask = df_features[\"split_partition\"] == \"train\"\n",
        "df_train_dev = df_features[train_mask].reset_index(drop=True)\n",
        "\n",
        "# Identify continuous numerical vs binary/categorical features\n",
        "feature_cols = [c for c in df_train_dev.columns if c not in [\"internal_record_id\", \"split_partition\", \"eligibility\"]]\n",
        "num_cols = [c for c in feature_cols if c.startswith(\"xf_\")]\n",
        "bin_cols = [c for c in feature_cols if not c.startswith(\"xf_\")]\n",
        "\n",
        "X_train_full = df_train_dev[feature_cols]\n",
        "y_train_full = (df_train_dev[\"eligibility\"] == \"ELIGIBLE\").astype(int)\n",
        "\n",
        "# Load outer 10-fold split definitions\n",
        "with open(CV_SPLITS_PATH, \"r\", encoding=\"utf-8\") as f:\n",
        "    cv_data = json.load(f)\n",
        "\n",
        "print(f\"Loaded training development set: X={X_train_full.shape} (Numerical: {len(num_cols)}, Binary: {len(bin_cols)}), y={y_train_full.shape}\")\n",
        "print(f\"Stratified 10-Fold CV indices confirmed: {len(cv_data['folds'])} outer folds\")\n"
    ]

    # Cell 7: Preprocessor & Grid
    nb["cells"][7]["source"] = [
        "preprocessor = ColumnTransformer(\n",
        "    transformers=[\n",
        "        ('num', StandardScaler(), num_cols),\n",
        "        ('bin', 'passthrough', bin_cols)\n",
        "    ]\n",
        ")\n",
        f"{param_grid_code}\n",
        "print(f\"Preprocessing pipeline configured. Parameter grid: {list(param_grid.keys())}\")\n"
    ]

    # Cell 9: Nested 10-Fold Execution with Brier & Calibration
    nb["cells"][9]["source"] = [
        "fold_evaluations = []\n",
        "oof_predictions = np.zeros(len(y_train_full), dtype=int)\n",
        "oof_probabilities = np.zeros(len(y_train_full), dtype=float)\n",
        "best_params_per_fold = []\n",
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
        "    # Build base pipeline\n",
        f"    base_pipeline = {base_pipeline_code}\n",
        "    \n",
        "    # Inner 5-Fold CV for hyperparameter tuning\n",
        "    inner_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)\n",
        "    grid_search = GridSearchCV(base_pipeline, param_grid, cv=inner_cv, scoring=\"f1_macro\", n_jobs=-1)\n",
        "    grid_search.fit(X_tr, y_tr)\n",
        "    \n",
        "    best_model = grid_search.best_estimator_\n",
        "    best_params_per_fold.append(grid_search.best_params_)\n",
        "    \n",
        "    # Predictions on training and validation fold\n",
        "    tr_preds = best_model.predict(X_tr)\n",
        "    val_preds = best_model.predict(X_va)\n",
        "    if hasattr(best_model, \"predict_proba\"):\n",
        "        val_probs = best_model.predict_proba(X_va)[:, 1]\n",
        "    else:\n",
        "        dec = best_model.decision_function(X_va)\n",
        "        val_probs = 1.0 / (1.0 + np.exp(-dec))\n",
        "    \n",
        "    oof_predictions[v_idx] = val_preds\n",
        "    oof_probabilities[v_idx] = val_probs\n",
        "    \n",
        "    # Compute comprehensive fold metrics via shared evaluation module\n",
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
        "# Compute summary statistics\n",
        "metrics_mean = df_folds_metric.mean(numeric_only=True).to_dict()\n",
        "metrics_std = df_folds_metric.std(numeric_only=True).to_dict()\n",
        "print(f\"\\nNested 10-Fold CV Complete ({total_duration_ms:.1f} ms).\")\n",
        "print(f\"Mean Val Macro F1: {metrics_mean['macro_f1']:.4f} +/- {metrics_std['macro_f1']:.4f}\")\n",
        "print(f\"Mean Brier Score:  {metrics_mean['brier_score']:.4f} +/- {metrics_std['brier_score']:.4f}\")\n",
        "print(f\"Mean ECE:          {metrics_mean['expected_calibration_error']:.4f} +/- {metrics_std['expected_calibration_error']:.4f}\")\n",
        "print(f\"Mean Generalization Gap: {metrics_mean['generalization_gap']:.4f} +/- {metrics_std['generalization_gap']:.4f}\")\n"
    ]

    # Cell 11: Export artifacts and summary tables
    nb["cells"][11]["source"] = [
        f"# Fit final model on full development set for feature interpretation\n",
        f"{final_fit_importance_code}\n",
        f"if 'df_importance' in locals() and df_importance is not None and not df_importance.empty:\n",
        f"    df_importance.to_csv(REPORT_VIZ_DIR / '{importance_filename}', index=False)\n",
        "\n",
        "# Export standardized evaluation artifacts (summary table, Brier by fold, JSON)\n",
        "top_features = df_importance.head(10).to_dict(orient=\"records\") if ('df_importance' in locals() and df_importance is not None and not df_importance.empty) else []\n",
        f"df_summary_table = te.export_model_evaluation_artifacts(\n",
        f"    model_name=\"{model_name}\",\n",
        f"    model_type=\"{model_type}\",\n",
        f"    fold_evaluations=fold_evaluations,\n",
        f"    best_hyperparameters_per_fold=best_params_per_fold,\n",
        f"    total_duration_ms=total_duration_ms,\n",
        f"    top_features=top_features,\n",
        f"    output_model_dir=OUTPUT_DIR,\n",
        f"    report_viz_dir=REPORT_VIZ_DIR,\n",
        f"    json_artifact_name=\"{report_folder_name}_metrics.json\"\n",
        f")\n",
        "print(\"Evaluation summary table:\\n\", df_summary_table.to_string(index=False))\n"
    ]

    # Cell 13: Standardized Visualizations
    nb["cells"][13]["source"] = [
        "# --- PUBLICATION-READY EVALUATION VISUALIZATIONS (10 STANDARDIZED FIGURES) ---\n",
        "# Generates PNG and vector PDF exports with bbox_inches='tight' and readable fonts\n",
        f"generated_figures = te.plot_all_model_figures(\n",
        f"    model_name=\"{model_name}\",\n",
        f"    y_true=y_train_full,\n",
        f"    oof_preds=oof_predictions,\n",
        f"    oof_probs=oof_probabilities,\n",
        f"    df_folds_metric=df_folds_metric,\n",
        f"    df_importance=df_importance if 'df_importance' in locals() else None,\n",
        f"    output_dir=REPORT_VIZ_DIR\n",
        f")\n",
        f"print(f\"Successfully generated {{len(generated_figures)}} publication-quality figure artifacts in: {{REPORT_VIZ_DIR}}\")\n"
    ]

    # Clear cells 14, 15, 16 if they were redundant figures, replace with note or empty
    # In original notebooks, cells 13, 14, 15, 16 were separate figure plots.
    # We can turn cells 14, 15, 16 into informative markdown or keep them compact.
    # To preserve cell counts cleanly, let's keep them as small markdown or verification cells:
    nb["cells"][14]["cell_type"] = "markdown"
    nb["cells"][14]["source"] = [
        "### Calibration and Brier Score Verification Note\n",
        "The Brier Score, Expected Calibration Error (ECE), and Maximum Calibration Error (MCE) have been computed across all 10 folds and out-of-fold predictions. Visualizations for calibration curves, Brier score across folds, and prediction confidence distributions are saved to the visualizations directory.\n"
    ]
    if "outputs" in nb["cells"][14]:
        del nb["cells"][14]["outputs"]
    if "execution_count" in nb["cells"][14]:
        del nb["cells"][14]["execution_count"]

    nb["cells"][15]["cell_type"] = "markdown"
    nb["cells"][15]["source"] = [
        "### Overfitting & Generalization Gap Assessment\n",
        "The generalization gap ($F1_{train} - F1_{val}$) is systematically monitored across all 10 outer folds to diagnose any variance spikes or overfitting resulting from model complexity.\n"
    ]
    if "outputs" in nb["cells"][15]:
        del nb["cells"][15]["outputs"]
    if "execution_count" in nb["cells"][15]:
        del nb["cells"][15]["execution_count"]

    nb["cells"][16]["cell_type"] = "markdown"
    nb["cells"][16]["source"] = [
        "### Feature Importance Artifacts\n",
        f"Predictor coefficients and importance scores are exported to `{report_folder_name}/{importance_filename}` and visualized in `fig10_feature_importance.png`.\n"
    ]
    if "outputs" in nb["cells"][16]:
        del nb["cells"][16]["outputs"]
    if "execution_count" in nb["cells"][16]:
        del nb["cells"][16]["execution_count"]

    # Ensure all code cells have execution_count: null and outputs: []
    for c in nb["cells"]:
        if c["cell_type"] == "code":
            c["execution_count"] = None
            c["outputs"] = []

    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print(f"Updated {nb_path.name} successfully.")

if __name__ == "__main__":
    # 1. Logistic Regression
    update_tabular_model_notebook(
        nb_path=Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/01_logistic_regression.ipynb"),
        model_name="Logistic Regression",
        model_type="baseline_linear",
        model_import_line="from sklearn.linear_model import LogisticRegression",
        base_pipeline_code="Pipeline([('prep', preprocessor), ('clf', LogisticRegression(penalty='l2', solver='lbfgs', max_iter=1000, random_state=RANDOM_SEED))])",
        param_grid_code="param_grid = {'clf__C': [0.001, 0.01, 0.1, 1.0, 10.0]}",
        final_fit_importance_code="""final_pipe = Pipeline([('prep', preprocessor), ('clf', LogisticRegression(C=1.0, penalty='l2', solver='lbfgs', max_iter=1000, random_state=RANDOM_SEED))])
final_pipe.fit(X_train_full, y_train_full)
coefs = final_pipe.named_steps['clf'].coef_[0]
df_importance = pd.DataFrame({'feature': feature_cols, 'importance': coefs, 'abs_importance': np.abs(coefs)}).sort_values(by='abs_importance', ascending=False).reset_index(drop=True)""",
        importance_filename="feature_coefficients.csv"
    )

    # 2. Decision Tree
    update_tabular_model_notebook(
        nb_path=Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/02_decision_tree.ipynb"),
        model_name="Decision Tree",
        model_type="baseline_tree",
        model_import_line="from sklearn.tree import DecisionTreeClassifier",
        base_pipeline_code="Pipeline([('prep', preprocessor), ('clf', DecisionTreeClassifier(random_state=RANDOM_SEED))])",
        param_grid_code="param_grid = {'clf__max_depth': [3, 5, 8, 12, None], 'clf__min_samples_split': [2, 5, 10], 'clf__criterion': ['gini', 'entropy']}",
        final_fit_importance_code="""final_pipe = Pipeline([('prep', preprocessor), ('clf', DecisionTreeClassifier(max_depth=5, min_samples_split=5, random_state=RANDOM_SEED))])
final_pipe.fit(X_train_full, y_train_full)
importances = final_pipe.named_steps['clf'].feature_importances_
df_importance = pd.DataFrame({'feature': feature_cols, 'importance': importances}).sort_values(by='importance', ascending=False).reset_index(drop=True)""",
        importance_filename="feature_importances.csv"
    )

    # 3. Random Forest
    update_tabular_model_notebook(
        nb_path=Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/03_random_forest.ipynb"),
        model_name="Random Forest",
        model_type="bagging_ensemble",
        model_import_line="from sklearn.ensemble import RandomForestClassifier",
        base_pipeline_code="Pipeline([('prep', preprocessor), ('clf', RandomForestClassifier(random_state=RANDOM_SEED, n_jobs=-1))])",
        param_grid_code="param_grid = {'clf__n_estimators': [100, 200], 'clf__max_depth': [5, 10, None], 'clf__min_samples_leaf': [1, 2, 4]}",
        final_fit_importance_code="""final_pipe = Pipeline([('prep', preprocessor), ('clf', RandomForestClassifier(n_estimators=100, max_depth=5, random_state=RANDOM_SEED, n_jobs=-1))])
final_pipe.fit(X_train_full, y_train_full)
importances = final_pipe.named_steps['clf'].feature_importances_
df_importance = pd.DataFrame({'feature': feature_cols, 'importance': importances}).sort_values(by='importance', ascending=False).reset_index(drop=True)""",
        importance_filename="feature_importances.csv"
    )

    # 4. SVM
    update_tabular_model_notebook(
        nb_path=Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/04_svm.ipynb"),
        model_name="Support Vector Machine (RBF)",
        model_type="baseline_kernel",
        model_import_line="from sklearn.svm import SVC",
        base_pipeline_code="Pipeline([('prep', preprocessor), ('clf', SVC(kernel='rbf', probability=True, random_state=RANDOM_SEED))])",
        param_grid_code="param_grid = {'clf__C': [0.1, 1.0, 10.0], 'clf__gamma': ['scale', 'auto', 0.01, 0.1]}",
        final_fit_importance_code="""final_pipe = Pipeline([('prep', preprocessor), ('clf', SVC(C=1.0, kernel='rbf', probability=True, random_state=RANDOM_SEED))])
final_pipe.fit(X_train_full, y_train_full)
df_importance = pd.DataFrame({'feature': feature_cols, 'importance': np.zeros(len(feature_cols))})""",
        importance_filename="feature_importances.csv"
    )
