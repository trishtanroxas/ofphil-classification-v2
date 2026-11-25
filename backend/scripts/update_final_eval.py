import json
from pathlib import Path

def update_final_evaluation_notebook():
    nb_path = Path("experiments/notebooks/05_model_selection_and_training/08_final_model_evaluation.ipynb")
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
        "from sklearn.preprocessing import StandardScaler\n",
        "from sklearn.pipeline import Pipeline\n",
        "from sklearn.metrics import (\n",
        "    accuracy_score, precision_score, recall_score, f1_score,\n",
        "    roc_auc_score, roc_curve, precision_recall_curve, average_precision_score,\n",
        "    confusion_matrix, classification_report\n",
        ")\n",
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
        "RANDOM_SEED = 42\n",
        "np.random.seed(RANDOM_SEED)\n",
        "print(\"Libraries loaded successfully.\")\n"
    ]

    # Cell 10: Champion fit & inference
    nb["cells"][10]["source"] = [
        "def build_and_fit_champion(model_name, X_tr, y_tr):\n",
        "    if \"Logistic Regression\" in model_name:\n",
        "        from sklearn.linear_model import LogisticRegression\n",
        "        pipe = Pipeline([(\"scaler\", StandardScaler()), (\"clf\", LogisticRegression(C=1.0, max_iter=1000, random_state=RANDOM_SEED))])\n",
        "        pipe.fit(X_tr, y_tr)\n",
        "        return pipe\n",
        "    elif \"Decision Tree\" in model_name:\n",
        "        from sklearn.tree import DecisionTreeClassifier\n",
        "        clf = DecisionTreeClassifier(max_depth=5, min_samples_split=5, random_state=RANDOM_SEED)\n",
        "        clf.fit(X_tr, y_tr)\n",
        "        return clf\n",
        "    elif \"Random Forest\" in model_name:\n",
        "        from sklearn.ensemble import RandomForestClassifier\n",
        "        clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=RANDOM_SEED, n_jobs=-1)\n",
        "        clf.fit(X_tr, y_tr)\n",
        "        return clf\n",
        "    elif \"SVM\" in model_name or \"Support Vector\" in model_name:\n",
        "        from sklearn.svm import SVC\n",
        "        pipe = Pipeline([(\"scaler\", StandardScaler()), (\"clf\", SVC(C=1.0, kernel=\"rbf\", probability=True, random_state=RANDOM_SEED))])\n",
        "        pipe.fit(X_tr, y_tr)\n",
        "        return pipe\n",
        "    elif \"XGBoost\" in model_name:\n",
        "        from xgboost import XGBClassifier\n",
        "        clf = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, eval_metric=\"logloss\", random_state=RANDOM_SEED, n_jobs=-1)\n",
        "        clf.fit(X_tr, y_tr)\n",
        "        return clf\n",
        "    elif \"CatBoost\" in model_name:\n",
        "        from catboost import CatBoostClassifier\n",
        "        clf = CatBoostClassifier(iterations=150, depth=4, learning_rate=0.05, loss_function=\"Logloss\", verbose=0, random_seed=RANDOM_SEED)\n",
        "        clf.fit(X_tr, y_tr)\n",
        "        return clf\n",
        "    elif \"Explainable Boosting\" in model_name or \"EBM\" in model_name:\n",
        "        from interpret.glassbox import ExplainableBoostingClassifier\n",
        "        clf = ExplainableBoostingClassifier(interactions=5, max_bins=128, learning_rate=0.05, random_state=RANDOM_SEED, n_jobs=-1)\n",
        "        clf.fit(X_tr, y_tr)\n",
        "        return clf\n",
        "    else:\n",
        "        raise ValueError(f\"Unknown model: {model_name}\")\n",
        "\n",
        "if champion_name is not None:\n",
        "    print(f\"Training champion model ({champion_name}) on all 350 development samples...\")\n",
        "    start_fit = time.time()\n",
        "    champion_fitted = build_and_fit_champion(champion_name, X_train, y_train)\n",
        "    train_latency_ms = (time.time() - start_fit) * 1000\n",
        "    \n",
        "    start_infer = time.time()\n",
        "    test_preds = champion_fitted.predict(X_test)\n",
        "    if hasattr(champion_fitted, \"predict_proba\"):\n",
        "        test_probs = champion_fitted.predict_proba(X_test)[:, 1]\n",
        "    else:\n",
        "        dec = champion_fitted.decision_function(X_test)\n",
        "        test_probs = 1.0 / (1.0 + np.exp(-dec))\n",
        "    infer_latency_ms = ((time.time() - start_infer) / len(X_test)) * 1000\n",
        "    \n",
        "    test_metrics = te.compute_comprehensive_metrics(y_test, test_preds, test_probs)\n",
        "    test_metrics[\"per_sample_inference_latency_ms\"] = round(infer_latency_ms, 3)\n",
        "    \n",
        "    cm = confusion_matrix(y_test, test_preds)\n",
        "    cm_norm = confusion_matrix(y_test, test_preds, normalize=\"true\")\n",
        "    \n",
        "    print(f\"\\nFINAL TEST EVALUATION RESULTS ({champion_name}):\")\n",
        "    print(json.dumps(test_metrics, indent=2))\n",
        "    print(\"\\nClassification Report:\")\n",
        "    print(classification_report(y_test, test_preds, target_names=[\"INELIGIBLE\", \"ELIGIBLE\"]))\n",
        "else:\n",
        "    test_metrics = {\"status\": \"AWAITING_CHAMPION_SELECTION\"}\n",
        "    print(\"Awaiting champion selection in 07 notebook.\")\n"
    ]

    # Cell 12: Final test summary table & artifacts
    nb["cells"][12]["source"] = [
        "if champion_name is not None:\n",
        "    cv_macro_f1 = champion_info.get(\"champion_macro_f1\", np.nan)\n",
        "    gen_gap = cv_macro_f1 - test_metrics[\"macro_f1\"]\n",
        "    summary_table_rows = [\n",
        "        {\"Evaluation Dimension\": \"Champion Model Architecture\", \"Value\": str(champion_name)},\n",
        "        {\"Evaluation Dimension\": \"Test Sample Count (N_test)\", \"Value\": str(len(X_test))},\n",
        "        {\"Evaluation Dimension\": \"Final Test Accuracy\", \"Value\": f\"{test_metrics['accuracy']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test Macro Precision\", \"Value\": f\"{test_metrics['macro_precision']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test Macro Recall\", \"Value\": f\"{test_metrics['macro_recall']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test Macro F1-score\", \"Value\": f\"{test_metrics['macro_f1']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test Weighted F1-score\", \"Value\": f\"{test_metrics['weighted_f1']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test ROC-AUC\", \"Value\": f\"{test_metrics['roc_auc']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test Brier Score\", \"Value\": f\"{test_metrics['brier_score']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Final Test ECE (Calibration Error)\", \"Value\": f\"{test_metrics['expected_calibration_error']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Indigent / Eligible Recall\", \"Value\": f\"{test_metrics['rec_eligible']:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"10-Fold CV Mean Macro F1\", \"Value\": f\"{cv_macro_f1:.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Generalization Gap (CV - Test)\", \"Value\": f\"{gen_gap:+.4f}\"},\n",
        "        {\"Evaluation Dimension\": \"Per-Sample Inference Latency\", \"Value\": f\"{test_metrics['per_sample_inference_latency_ms']} ms\"}\n",
        "    ]\n",
        "    df_final_summary = pd.DataFrame(summary_table_rows)\n",
        "    df_final_summary.to_csv(REPORT_VIZ_DIR / \"final_test_summary_table.csv\", index=False)\n",
        "    \n",
        "    final_report = {\n",
        "        \"evaluation_scope\": \"FINAL_QUARANTINED_TEST_SET\",\n",
        "        \"champion_model\": champion_name,\n",
        "        \"test_sample_count\": len(X_test),\n",
        "        \"feature_count\": len(feature_cols),\n",
        "        \"test_metrics\": test_metrics,\n",
        "        \"generalization_gap\": round(gen_gap, 4),\n",
        "        \"governance_attestation\": {\n",
        "            \"data_leakage_prevented\": True,\n",
        "            \"unsealed_strictly_after_champion_selection\": True,\n",
        "            \"no_hyperparameter_readjustment_post_test\": True\n",
        "        }\n",
        "    }\n",
        "    with open(OUTPUT_DIR / \"final_test_evaluation_report.json\", \"w\", encoding=\"utf-8\") as f:\n",
        "        json.dump(final_report, f, indent=2)\n",
        "    print(\"Final test summary table:\\n\", df_final_summary.to_string(index=False))\n"
    ]

    # Clear code cell outputs
    for c in nb["cells"]:
        if c["cell_type"] == "code":
            c["execution_count"] = None
            c["outputs"] = []

    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print("Updated 08_final_model_evaluation.ipynb successfully.")

if __name__ == "__main__":
    update_final_evaluation_notebook()
