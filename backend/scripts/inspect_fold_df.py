import re

with open("src/tabular_evaluation.py", "r", encoding="utf-8") as f:
    text = f.read()

cols = set(re.findall(r'fold_df\["([^"]+)"\]', text))
print("fold_df columns used in tabular_evaluation.py:")
for c in sorted(cols):
    print(" ", c)
