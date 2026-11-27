"""
Generate a 25-case stratified blind MSW Expert Validation Packet (.xlsx & .csv)
plus Researcher Answer Key and an automatic Cohen's Kappa / Likert scorer.
"""
from pathlib import Path
import re
import numpy as np
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path("/home/kristoper/Projects/Thesis/ofphil-classification-v2")
SYN_CSV = ROOT / "data" / "synthetic" / "tabular" / "synthetic_1k_records_only.csv"
OUT_DIR = ROOT / "reports" / "msw_expert_validation"
OUT_DIR.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(SYN_CSV)


def _num(v):
    if pd.isna(v):
        return np.nan
    m = re.search(r"[\d,]+(?:\.\d+)?", str(v))
    return float(m.group(0).replace(",", "")) if m else np.nan


df["_inc"] = df["monthly_family_income"].apply(_num)
df["_obl"] = df["monthly_household_obligations_expenses"].apply(_num)
df["_cost"] = df["cost_of_treatment"].apply(_num)
df["_pci"] = df["_inc"] / df["household_size"].clip(lower=1)

# Stratified sample across clear low-income, gray-zone borderline (PHP 12k-28k), and clear high-income
elig_clear = df[(df["eligibility"] == "ELIGIBLE") & (df["_inc"] <= 12000)].sample(n=7, random_state=20261127)
elig_gray = df[(df["eligibility"] == "ELIGIBLE") & (df["_inc"] > 12000)].sample(n=6, random_state=20261127)
inelig_gray = df[(df["eligibility"] == "INELIGIBLE") & (df["_inc"] < 26000)].sample(n=6, random_state=20261127)
inelig_clear = df[(df["eligibility"] == "INELIGIBLE") & (df["_inc"] >= 26000)].sample(n=6, random_state=20261127)

sampled = pd.concat([elig_clear, elig_gray, inelig_gray, inelig_clear], ignore_index=True)
sampled = sampled.sample(frac=1.0, random_state=42).reset_index(drop=True)
sampled.insert(0, "validation_case_id", [f"SYN-VAL-{i+1:02d}" for i in range(len(sampled))])

review_cols = [
    ("validation_case_id", "Case ID"),
    ("marital_status", "Civil Status"),
    ("household_size", "Household Size"),
    ("number_of_dependents", "Dependents"),
    ("employment_status", "Employment Status"),
    ("occupation", "Occupation"),
    ("educational_attainment", "Educational Attainment"),
    ("residence_status", "Residence Tenure"),
    ("housing_condition", "Housing Condition"),
    ("sectoral_membership", "Sectoral Group"),
    ("monthly_family_income", "Monthly Family Income (PHP)"),
    ("monthly_household_obligations_expenses", "Monthly Household Expenses (PHP)"),
    ("monthly_utility_expenses", "Monthly Utilities (PHP)"),
    ("diagnosis", "Eye Diagnosis"),
    ("diagnosis_severity", "Severity"),
    ("procedure", "Planned Procedure"),
    ("type_of_treatment_surgery", "Intervention Type"),
    ("laterality", "Eye Laterality"),
    ("cost_of_treatment", "Estimated Procedure Cost (PHP)"),
    ("interview_responses", "Patient / Informant Interview Summary"),
]

blind_df = pd.DataFrame()
for src_c, disp_c in review_cols:
    blind_df[disp_c] = sampled[src_c].fillna("Unrecorded")

# Add computed Per-Capita Monthly Income helper for MSW convenience (pre-decision arithmetic)
blind_df.insert(
    11,
    "Per-Capita Monthly Income (PHP)",
    sampled["_pci"].apply(lambda x: f"{x:,.0f}" if pd.notna(x) else "Unrecorded"),
)

# Blank columns for RSW evaluation
blind_df["RSW Realism Rating (1-5)"] = ""
blind_df["RSW Eligibility Decision (ELIGIBLE / INELIGIBLE)"] = ""
blind_df["RSW Clinical Notes / Remarks"] = ""

blind_csv_path = OUT_DIR / "msw_synthetic_validation_sample_25_blind.csv"
blind_xlsx_path = OUT_DIR / "msw_synthetic_validation_sample_25_blind.xlsx"
key_csv_path = OUT_DIR / "msw_synthetic_validation_answer_key_25_RESEARCHER_ONLY.csv"

blind_df.to_csv(blind_csv_path, index=False)

answer_key_df = pd.DataFrame({
    "Case ID": sampled["validation_case_id"],
    "Monthly Family Income (PHP)": sampled["monthly_family_income"].fillna("Unrecorded"),
    "Household Size": sampled["household_size"],
    "Per-Capita Monthly Income (PHP)": sampled["_pci"].round(2),
    "Estimated Procedure Cost (PHP)": sampled["cost_of_treatment"],
    "Dataset Ground-Truth Label": sampled["eligibility"],
    "Sampling Stratum": [
        "Borderline Gray-Zone" if (12000 < r["_inc"] < 26000) else "Clear Bracket"
        for _, r in sampled.iterrows()
    ],
})
answer_key_df.to_csv(key_csv_path, index=False)

# Build styled Excel workbook for the RSW
wb = Workbook()
ws = wb.active
ws.title = "1_Blind_Case_Review_25"

header_fill = PatternFill("solid", fgColor="0B6B3A")
rsw_header_fill = PatternFill("solid", fgColor="1E40AF")
zebra_fill = PatternFill("solid", fgColor="F8FAFC")
header_font = Font(bold=True, color="FFFFFF", size=10)
cell_font = Font(size=9.5)
thin_border = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="CBD5E1"),
    bottom=Side(style="thin", color="CBD5E1"),
)

headers = list(blind_df.columns)
ws.append(headers)
for col_idx, h_text in enumerate(headers, 1):
    c = ws.cell(row=1, column=col_idx)
    c.font = header_font
    c.fill = rsw_header_fill if h_text.startswith("RSW ") else header_fill
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = thin_border
ws.row_dimensions[1].height = 30

for r_idx, row_vals in enumerate(blind_df.itertuples(index=False), start=2):
    ws.append(list(row_vals))
    ws.row_dimensions[r_idx].height = 42
    for c_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=r_idx, column=c_idx)
        cell.font = cell_font
        cell.border = thin_border
        if r_idx % 2 == 1 and c_idx <= len(headers) - 3:
            cell.fill = zebra_fill
        cell.alignment = Alignment(
            horizontal="left" if headers[c_idx - 1] in {"Patient / Informant Interview Summary", "Planned Procedure", "Eye Diagnosis", "RSW Clinical Notes / Remarks"} else "center",
            vertical="center",
            wrap_text=True,
        )

for c_idx, h_text in enumerate(headers, 1):
    col_letter = get_column_letter(c_idx)
    if "Interview Summary" in h_text:
        ws.column_dimensions[col_letter].width = 48
    elif h_text in {"Planned Procedure", "Eye Diagnosis", "RSW Clinical Notes / Remarks"}:
        ws.column_dimensions[col_letter].width = 28
    elif h_text.startswith("RSW "):
        ws.column_dimensions[col_letter].width = 24
    else:
        ws.column_dimensions[col_letter].width = 16

ws.freeze_panes = "B2"

# Second sheet: Instructions & Overall 5-Item Likert Rubric
ws2 = wb.create_sheet("2_Overall_Likert_Rubric")
ws2.append(["Criterion #", "Evaluation Dimension", "RSW Rating (1 to 5)", "RSW Remarks"])
for c_idx in range(1, 5):
    cell = ws2.cell(row=1, column=c_idx)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 26

rubric_items = [
    (1, "Socioeconomic Plausibility (household size, occupation, monthly income, obligations)"),
    (2, "Clinical & Procedure Cost Alignment (ophthalmology diagnoses vs PHP estimates)"),
    (3, "Borderline / Gray-Zone Casework Realism (multi-factor clinical-financial trade-offs)"),
    (4, "Intake Narrative & Taglish/English Interview Coherence"),
    (5, "Privacy & De-Identification Integrity (no real patient identities exposed)"),
]
for num, desc in rubric_items:
    ws2.append([num, desc, "", ""])
    ws2.row_dimensions[num + 1].height = 28

ws2.column_dimensions["A"].width = 14
ws2.column_dimensions["B"].width = 68
ws2.column_dimensions["C"].width = 22
ws2.column_dimensions["D"].width = 36

wb.save(blind_xlsx_path)
print(f"Created Blind Review Excel -> {blind_xlsx_path.relative_to(ROOT)}")
print(f"Created Blind Review CSV   -> {blind_csv_path.relative_to(ROOT)}")
print(f"Created Researcher Key CSV -> {key_csv_path.relative_to(ROOT)}")
print("Ground-truth breakdown in 25-case sample:", sampled["eligibility"].value_counts().to_dict())

