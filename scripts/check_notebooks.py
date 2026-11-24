import json
from pathlib import Path

notebooks = [
    Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/01_logistic_regression.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/02_decision_tree.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/03_random_forest.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/02_baseline_models/04_svm.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/03_gradient_boosting_models/01_xgboost.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/03_gradient_boosting_models/02_catboost.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/04_interpretable_models/01_explainable_boosting_machine.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/07_model_comparison_and_tuning.ipynb"),
    Path("experiments/notebooks/05_model_selection_and_training/08_final_model_evaluation.ipynb"),
]

for p in notebooks:
    if not p.exists():
        print(f"MISSING: {p}")
        continue
    with open(p, "r", encoding="utf-8") as f:
        nb = json.load(f)
    code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
    has_output = any(len(c.get("outputs", [])) > 0 or c.get("execution_count") is not None for c in code_cells)
    print(f"{p.name:35s} | Cells: {len(nb['cells']):2d} | Code: {len(code_cells):2d} | Has Outputs: {has_output}")
