import json
from pathlib import Path

nb_path = Path("experiments/notebooks/05_model_selection_and_training/08_final_model_evaluation.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

for i in range(14, 21):
    src = "".join(nb["cells"][i]["source"])
    for key in [
        "accuracy", "macro_f1", "f1_macro", "macro_precision", "precision_macro",
        "macro_recall", "recall_macro", "prec_ineligible", "precision_ineligible",
        "rec_ineligible", "recall_ineligible", "prec_eligible", "precision_eligible",
        "rec_eligible", "recall_eligible"
    ]:
        if f'"{key}"' in src or f"'{key}'" in src:
            print(f"Cell {i} uses {key}")
