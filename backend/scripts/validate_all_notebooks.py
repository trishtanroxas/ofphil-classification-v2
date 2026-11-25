import ast
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

all_passed = True
for p in notebooks:
    print(f"\nVerifying: {p.name}")
    with open(p, "r", encoding="utf-8") as f:
        nb = json.load(f)
    
    code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
    has_outputs = any(len(c.get("outputs", [])) > 0 or c.get("execution_count") is not None for c in code_cells)
    if has_outputs:
        print(f"  [FAIL] Notebook contains executed outputs or execution counts!")
        all_passed = False
    else:
        print(f"  [PASS] Zero executed outputs, all execution_count are null ({len(code_cells)} code cells).")

    # AST validation on all code cells
    for idx, c in enumerate(nb["cells"]):
        if c["cell_type"] == "code":
            src = "".join(c["source"])
            try:
                ast.parse(src)
            except SyntaxError as e:
                print(f"  [SYNTAX ERROR] Cell {idx}: {e}")
                all_passed = False

if all_passed:
    print("\nALL 9 NOTEBOOKS PASSED VALIDATION WITH ZERO SYNTAX ERRORS AND ZERO EXECUTED OUTPUTS.")
else:
    print("\nSOME NOTEBOOKS FAILED VALIDATION.")
