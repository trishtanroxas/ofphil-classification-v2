import ast
import glob
import json
import sys
from pathlib import Path

def validate_notebooks():
    target_notebooks = [
        "experiments/notebooks/05_model_selection_and_training/01_training_data_setup.ipynb",
        "experiments/notebooks/05_model_selection_and_training/02_baseline_models/01_logistic_regression.ipynb",
        "experiments/notebooks/05_model_selection_and_training/02_baseline_models/02_decision_tree.ipynb",
        "experiments/notebooks/05_model_selection_and_training/02_baseline_models/03_random_forest.ipynb",
        "experiments/notebooks/05_model_selection_and_training/02_baseline_models/04_svm.ipynb",
        "experiments/notebooks/05_model_selection_and_training/03_gradient_boosting_models/01_xgboost.ipynb",
        "experiments/notebooks/05_model_selection_and_training/03_gradient_boosting_models/02_catboost.ipynb",
        "experiments/notebooks/05_model_selection_and_training/04_interpretable_models/01_explainable_boosting_machine.ipynb",
        "experiments/notebooks/05_model_selection_and_training/07_model_comparison_and_tuning.ipynb",
        "experiments/notebooks/05_model_selection_and_training/08_final_model_evaluation.ipynb"
    ]

    all_passed = True
    print(f"Validating {len(target_notebooks)} reconstructed Phase 05 tabular notebooks...\n")

    for nb_path_str in target_notebooks:
        nb_path = Path(nb_path_str)
        if not nb_path.exists():
            print(f"[FAIL] Missing notebook: {nb_path_str}")
            all_passed = False
            continue

        try:
            with open(nb_path, "r", encoding="utf-8") as f:
                nb_dict = json.load(f)
        except Exception as e:
            print(f"[FAIL] JSON parse error in {nb_path_str}: {e}")
            all_passed = False
            continue

        cells = nb_dict.get("cells", [])
        code_cells = [c for c in cells if c.get("cell_type") == "code"]
        markdown_cells = [c for c in cells if c.get("cell_type") == "markdown"]

        # Check outputs are empty and execution_count is None
        non_empty_outputs = [i for i, c in enumerate(code_cells) if len(c.get("outputs", [])) > 0]
        non_null_exec = [i for i, c in enumerate(code_cells) if c.get("execution_count") is not None]

        if non_empty_outputs:
            print(f"[FAIL] {nb_path.name}: Non-empty outputs found in code cells: {non_empty_outputs}")
            all_passed = False
        if non_null_exec:
            print(f"[FAIL] {nb_path.name}: Non-null execution_count found in code cells: {non_null_exec}")
            all_passed = False

        # Static AST parsing of code cells
        ast_errors = []
        for i, c in enumerate(code_cells):
            code_text = "".join(c.get("source", []))
            # Filter ipython magics if any
            clean_lines = [line for line in code_text.splitlines() if not line.strip().startswith("%") and not line.strip().startswith("!")]
            clean_code = "\n".join(clean_lines)
            try:
                ast.parse(clean_code)
            except SyntaxError as se:
                ast_errors.append((i, str(se)))

        if ast_errors:
            print(f"[FAIL] {nb_path.name}: Python AST syntax errors:")
            for c_idx, err in ast_errors:
                print(f"   Cell {c_idx}: {err}")
            all_passed = False
        else:
            print(f"[PASS] {nb_path.name:<40} | cells: {len(cells):<2} (code: {len(code_cells)}, md: {len(markdown_cells)}) | AST Valid | Unexecuted")

    # Also verify 05_multimodal_fusion does not exist
    mm_dir = Path("experiments/notebooks/05_model_selection_and_training/05_multimodal_fusion")
    if mm_dir.exists():
        print(f"[FAIL] 05_multimodal_fusion directory still exists!")
        all_passed = False
    else:
        print("[PASS] 05_multimodal_fusion confirmed deleted.")

    # Also verify 06_llm_interview_assistant is untouched
    llm_dir = Path("experiments/notebooks/05_model_selection_and_training/06_llm_interview_assistant")
    llm_nbs = list(llm_dir.glob("*.ipynb"))
    if len(llm_nbs) == 5:
        print(f"[PASS] 06_llm_interview_assistant confirmed preserved (5 notebooks intact).")
    else:
        print(f"[WARN] 06_llm_interview_assistant has {len(llm_nbs)} notebooks (expected 5).")

    if all_passed:
        print("\nALL PHASE 05 TABULAR NOTEBOOK VALIDATION CHECKS PASSED.")
    else:
        print("\nSOME VALIDATION CHECKS FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    validate_notebooks()
