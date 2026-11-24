import json
from pathlib import Path

def create_ebm_notebook():
    ebm_dir = Path("experiments/notebooks/05_model_selection_and_training/04_interpretable_models")

    ebm_cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 05.04.01 Explainable Boosting Machine (EBM)\n",
                "\n",
                "**Phase 05.04 — Interpretable Models (Tabular Only)**  \n",
                "*OFPHIL V2: Charity Patient Eligibility Classification*\n",
                "\n",
                "---\n",
                "\n",
                "### Description & Purpose\n",
                "Train and benchmark an Explainable Boosting Machine (EBM / InterpretML Generalized Additive Model with pairwise interactions) on the 48 tabular features using Stratified 5-Fold Cross-Validation loaded from `data/processed/splits/cv_split_indices.json`. Provides exact glass-box interpretability through additive component shape functions.\n",
                "\n",
                "**Strict Execution Policy:** This notebook is prepared for manual execution by the researcher. No cell execution outputs are pre-populated."
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Research Objectives\n",
                "\n",
                "1. Establish glass-box Generalized Additive Model ($GA^2M$) performance on charity patient eligibility.\n",
                "2. Evaluate interaction terms ($interactions \\in [0, 10]$) and maximum bins ($max\\_bins \\in [128, 256]$).\n",
                "3. Compute out-of-fold metrics across 5 Stratified folds: Accuracy, Precision, Recall, Macro F1, and ROC-AUC.\n",
                "4. Extract global term importances and log performance to `models/trained/interpretable/ebm_metrics.json`."
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Inputs & Expected Outputs\n",
                "\n",
                "**Required Inputs:**\n",
                "- `data/interim/features/selected_features.csv` (Primary tabular features)\n",
                "- `data/processed/splits/cv_split_indices.json` (Stratified 5-Fold split definitions)\n",
                "\n",
                "**Expected Outputs:**\n",
                "- `models/trained/interpretable/ebm_metrics.json` (Cross-validation metrics and fold logs)\n",
                "- `models/trained/interpretable/ebm_global_term_importances.csv` (Global additive term importances)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["### 1. Environment Setup & Library Imports"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import json\n",
                "import time\n",
                "from pathlib import Path\n",
                "import numpy as np\n",
                "import pandas as pd\n",
                "import interpret\n",
                "from interpret.glassbox import ExplainableBoostingClassifier\n",
                "from sklearn.metrics import (\n",
                "    accuracy_score, precision_score, recall_score, f1_score,\n",
                "    roc_auc_score, confusion_matrix, classification_report\n",
                ")\n",
                "\n",
                "RANDOM_SEED = 42\n",
                "np.random.seed(RANDOM_SEED)\n",
                "print(f\"InterpretML version: {interpret.__version__}, RANDOM_SEED={RANDOM_SEED}\")\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["### 2. Setup Paths & Load Data and Fold Indices"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "PROJECT_ROOT = Path(\"../../../..\")\n",
                "FEATURES_PATH = PROJECT_ROOT / \"data\" / \"interim\" / \"features\" / \"selected_features.csv\"\n",
                "CV_PATH = PROJECT_ROOT / \"data\" / \"processed\" / \"splits\" / \"cv_split_indices.json\"\n",
                "OUTPUT_DIR = PROJECT_ROOT / \"models\" / \"trained\" / \"interpretable\"\n",
                "OUTPUT_DIR.mkdir(parents=True, exist_ok=True)\n",
                "\n",
                "assert FEATURES_PATH.exists(), f\"Missing features dataset: {FEATURES_PATH}\"\n",
                "assert CV_PATH.exists(), f\"Missing CV split indices: {CV_PATH}\"\n",
                "\n",
                "df_features = pd.read_csv(FEATURES_PATH)\n",
                "with open(CV_PATH, \"r\", encoding=\"utf-8\") as f:\n",
                "    cv_data = json.load(f)\n",
                "\n",
                "feature_cols = cv_data[\"feature_columns\"]\n",
                "train_mask = df_features[\"split_partition\"] == \"train\"\n",
                "df_train = df_features.loc[train_mask].reset_index(drop=True)\n",
                "\n",
                "X_train_full = df_train[feature_cols]\n",
                "y_train_full = (df_train[\"eligibility\"] == \"ELIGIBLE\").astype(int)\n",
                "\n",
                "print(f\"Loaded training development set: X={X_train_full.shape}, y={y_train_full.shape}\")\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["### 3. Hyperparameter Tuning Across 5-Fold Stratified Cross-Validation"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "param_candidates = [\n",
                "    {\"interactions\": 0, \"max_bins\": 128, \"learning_rate\": 0.05},\n",
                "    {\"interactions\": 5, \"max_bins\": 128, \"learning_rate\": 0.05},\n",
                "    {\"interactions\": 10, \"max_bins\": 256, \"learning_rate\": 0.02}\n",
                "]\n",
                "\n",
                "grid_results = []\n",
                "for params in param_candidates:\n",
                "    fold_f1s = []\n",
                "    for fold_info in cv_data[\"folds\"]:\n",
                "        t_idx = fold_info[\"train_indices\"]\n",
                "        v_idx = fold_info[\"val_indices\"]\n",
                "        \n",
                "        X_tr, y_tr = X_train_full.iloc[t_idx], y_train_full.iloc[t_idx]\n",
                "        X_va, y_va = X_train_full.iloc[v_idx], y_train_full.iloc[v_idx]\n",
                "        \n",
                "        ebm = ExplainableBoostingClassifier(\n",
                "            interactions=params[\"interactions\"],\n",
                "            max_bins=params[\"max_bins\"],\n",
                "            learning_rate=params[\"learning_rate\"],\n",
                "            random_state=RANDOM_SEED,\n",
                "            n_jobs=-1\n",
                "        )\n",
                "        ebm.fit(X_tr, y_tr)\n",
                "        preds = ebm.predict(X_va)\n",
                "        fold_f1s.append(f1_score(y_va, preds, average=\"macro\"))\n",
                "    \n",
                "    mean_f1 = float(np.mean(fold_f1s))\n",
                "    grid_results.append({\"params\": params, \"mean_macro_f1\": mean_f1})\n",
                "    print(f\"Params {params} -> Mean Macro F1: {mean_f1:.4f}\")\n",
                "\n",
                "best_cfg = max(grid_results, key=lambda x: x[\"mean_macro_f1\"])\n",
                "best_params = best_cfg[\"params\"]\n",
                "print(f\"Optimal EBM params selected: {best_params}\")\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["### 4. Cross-Validation Evaluation with Optimal Hyperparameters"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fold_evaluations = []\n",
                "oof_predictions = np.zeros(len(y_train_full))\n",
                "oof_probabilities = np.zeros(len(y_train_full))\n",
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
                "    ebm_model = ExplainableBoostingClassifier(\n",
                "        interactions=best_params[\"interactions\"],\n",
                "        max_bins=best_params[\"max_bins\"],\n",
                "        learning_rate=best_params[\"learning_rate\"],\n",
                "        random_state=RANDOM_SEED,\n",
                "        n_jobs=-1\n",
                "    )\n",
                "    ebm_model.fit(X_tr, y_tr)\n",
                "    val_preds = ebm_model.predict(X_va)\n",
                "    val_probs = ebm_model.predict_proba(X_va)[:, 1]\n",
                "    \n",
                "    oof_predictions[v_idx] = val_preds\n",
                "    oof_probabilities[v_idx] = val_probs\n",
                "    \n",
                "    f_acc = accuracy_score(y_va, val_preds)\n",
                "    f_prec = precision_score(y_va, val_preds, zero_division=0)\n",
                "    f_rec = recall_score(y_va, val_preds, zero_division=0)\n",
                "    f_f1 = f1_score(y_va, val_preds, average=\"macro\")\n",
                "    f_auc = roc_auc_score(y_va, val_probs)\n",
                "    \n",
                "    fold_evaluations.append({\n",
                "        \"fold\": f_num,\n",
                "        \"accuracy\": float(f_acc),\n",
                "        \"precision\": float(f_prec),\n",
                "        \"recall\": float(f_rec),\n",
                "        \"macro_f1\": float(f_f1),\n",
                "        \"roc_auc\": float(f_auc)\n",
                "    })\n",
                "    print(f\"Fold {f_num} -> Acc: {f_acc:.4f}, Prec: {f_prec:.4f}, Rec: {f_rec:.4f}, Macro-F1: {f_f1:.4f}, AUC: {f_auc:.4f}\")\n",
                "\n",
                "total_duration_ms = (time.time() - start_time) * 1000\n",
                "mean_metrics = {\n",
                "    \"accuracy\": float(np.mean([f[\"accuracy\"] for f in fold_evaluations])),\n",
                "    \"precision\": float(np.mean([f[\"precision\"] for f in fold_evaluations])),\n",
                "    \"recall\": float(np.mean([f[\"recall\"] for f in fold_evaluations])),\n",
                "    \"macro_f1\": float(np.mean([f[\"macro_f1\"] for f in fold_evaluations])),\n",
                "    \"roc_auc\": float(np.mean([f[\"roc_auc\"] for f in fold_evaluations])),\n",
                "    \"f1_std\": float(np.std([f[\"macro_f1\"] for f in fold_evaluations]))\n",
                "}\n",
                "print(f\"\\nCross-Validation Summary (EBM):\\n{json.dumps(mean_metrics, indent=2)}\")\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["### 5. Export EBM Metrics and Term Importances"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
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
                "\n",
                "df_terms = pd.DataFrame({\n",
                "    \"term\": term_names,\n",
                "    \"importance_score\": term_scores\n",
                "}).sort_values(by=\"importance_score\", ascending=False).reset_index(drop=True)\n",
                "df_terms.to_csv(OUTPUT_DIR / \"ebm_global_term_importances.csv\", index=False)\n",
                "\n",
                "metrics_payload = {\n",
                "    \"model_name\": \"Explainable Boosting Machine (EBM)\",\n",
                "    \"model_type\": \"interpretable_glassbox_gam\",\n",
                "    \"best_hyperparameters\": best_params,\n",
                "    \"cv_metrics_mean\": mean_metrics,\n",
                "    \"fold_details\": fold_evaluations,\n",
                "    \"total_cv_time_ms\": round(total_duration_ms, 2),\n",
                "    \"top_5_terms\": df_terms.head(5).to_dict(orient=\"records\")\n",
                "}\n",
                "\n",
                "with open(OUTPUT_DIR / \"ebm_metrics.json\", \"w\", encoding=\"utf-8\") as f:\n",
                "    json.dump(metrics_payload, f, indent=2)\n",
                "print(f\"EBM metrics exported successfully to: {OUTPUT_DIR / 'ebm_metrics.json'}\")\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Findings & Observations\n",
                "\n",
                "- **Glass-Box GAM Performance:** Evaluated exact additive components with pairwise interaction terms.\n",
                "- **Clinical Interpretability:** Additive shape functions directly map socioeconomic predictors to eligibility log-odds.\n",
                "- **Quarantine Adherence:** Final test set quarantined; all metrics computed strictly out-of-fold."
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Completion Checklist\n",
                "\n",
                "- [ ] Stratified 5-Fold CV executed on training development set.\n",
                "- [ ] Interaction terms and bins tuned on out-of-fold Macro F1.\n",
                "- [ ] Out-of-fold metrics exported to `ebm_metrics.json`.\n",
                "- [ ] Global term importances saved to `ebm_global_term_importances.csv`.\n",
                "- [ ] Zero test set leakage confirmed."
            ]
        }
    ]

    nb_obj = {
        "cells": ebm_cells,
        "metadata": {
            "language_info": {"name": "python", "version": "3.12.0"},
            "kernelspec": {"display_name": "Python 3 (ipykernel)", "language": "python", "name": "python3"}
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }
    with open(ebm_dir / "01_explainable_boosting_machine.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb_obj, f, indent=2)
    print("Reconstructed interpretable notebook: 01_explainable_boosting_machine.ipynb")

if __name__ == "__main__":
    create_ebm_notebook()
