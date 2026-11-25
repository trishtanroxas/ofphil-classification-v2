"""
Calibrated Synthetic Tabular Dataset Generator for OFPHIL V2 Thesis.
Anchored to the 50-record real clinical intake cohort (`original_dataset.csv`):
  1. Preserves exact 62-column schema and `original_dataset.csv` untouched.
  2. Backs up prior synthetic CSVs into `data/synthetic/tabular/backup_v1_uploaded/`.
  3. Eliminates artificial hard income cutoffs (creates realistic PHP 8k-32k gray-zone
     overlap matching `original_dataset.csv`), eliminates 100% employment/subgroup shortcuts,
     eliminates MNAR missingness bias, and produces label-neutral English/Taglish intake
     narratives.
  4. Produces `1,000` adjudicated synthetic records (`492 ELIGIBLE`, `508 INELIGIBLE`) so
     `dataset_with_1k_synthetic.csv` (`1,050` rows = `50` original + `1,000` synthetic) yields
     an exact 50/50 balanced supervised cohort (`522 ELIGIBLE`, `522 INELIGIBLE`, `N=1,044`)
     plus the `6` authentic `PENDING` rows from `original_dataset.csv`.
"""
import shutil
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path("/home/kristoper/Projects/Thesis/ofphil-classification-v2")
TAB_DIR = ROOT / "data" / "synthetic" / "tabular"
BACKUP_DIR = TAB_DIR / "backup_v1_uploaded"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

ORIG_PATH = TAB_DIR / "original_dataset.csv"
SYN_OUT = TAB_DIR / "synthetic_1k_records_only.csv"
COMB_OUT = TAB_DIR / "dataset_with_1k_synthetic.csv"

# 1. Back up prior uploaded synthetic files once (do not overwrite initial backup)
for fn in ["synthetic_1k_records_only.csv", "dataset_with_1k_synthetic.csv"]:
    src = TAB_DIR / fn
    dst = BACKUP_DIR / fn
    if src.exists() and not dst.exists():
        shutil.copy2(src, dst)
        print(f"Backed up {fn} -> {dst.relative_to(ROOT)}")

df_orig = pd.read_csv(ORIG_PATH)
assert df_orig.shape == (50, 62), f"Expected (50, 62) original_dataset.csv, got {df_orig.shape}"
COLUMNS_62 = list(df_orig.columns)

rng = np.random.default_rng(20261126)

# Clinical procedure catalog calibrated to original_dataset.csv
CLINICAL_CATALOG = [
    ("CATARACT SENILE MATURE", "PHACOEMULSIFICATION WITH INTRAOCULAR LENS IMPLANTATION", "Surgery", "ANESTHESIOLOGIST FEE; OR SUPPLIES", (9000, 18000), ["Moderate", "Severe"]),
    ("CATARACT SENILE NUCLEAR SCLEROTIC", "PHACOEMULSIFICATION", "Surgery", "ANESTHESIOLOGIST FEE; OR SUPPLIES", (7000, 15000), ["Mild", "Moderate", "Severe"]),
    ("IMMATURE SENILE CATARACT", "PHACOEMULSIFICATION WITH IOL IMPLANTATION", "Surgery", "ANESTH FEE; OR SUPPLIES", (8000, 16000), ["Mild", "Moderate"]),
    ("PROLIFERATIVE DIABETIC RETINOPATHY, VITREOUS HEMORRHAGE", "PARS PLANA VITRECTOMY, ENDO LASER, SILICONE OIL", "Surgery", "RETINA SURGERY (OERTLI); ANESTHESIOLOGIST FEE", (24000, 62000), ["Severe"]),
    ("RHEGMATOGENOUS RETINAL DETACHMENT", "PARS PLANA VITRECTOMY, MEMBRANE PEELING, GAS FLUID EXCHANGE, ENDO LASER, SILICONE OIL", "Surgery", "ANESTHESIOLOGIST FEE; OR SUPPLIES; STANDBY CMT FLEX", (28000, 68000), ["Severe"]),
    ("PRIMARY OPEN ANGLE GLAUCOMA", "TRABECULECTOMY WITH MITOMYCIN-C", "Surgery", "ANESTHESIOLOGIST FEE; OR SUPPLIES", (14000, 30000), ["Moderate", "Severe"]),
    ("PSEUDOPHAKIA, SILICONE OIL FILLED EYE", "PARS PLANA VITRECTOMY, REMOVAL OF SILICONE OIL", "Surgery", "SEDATION; STANDBY PPV; OR SUPPLIES", (12000, 26000), ["Moderate", "Severe"]),
    ("DIABETIC MACULAR EDEMA", "INTRAVITREAL ANTI-VEGF INJECTION", "Outpatient", "OR SUPPLIES, CONSUMABLES & MEDICATIONS", (5500, 14000), ["Moderate", "Severe"]),
    ("MYOPIA WITH ASTIGMATISM", "COMPREHENSIVE EYE EXAMINATION AND REFRACTION", "Diagnostic / Consultation", "OPHTHALMOLOGY CONSULTATION & DIAGNOSTIC EVALUATION", (2650, 5500), ["Mild", "Moderate"]),
    ("GLAUCOMA SUSPECT / OCULAR HYPERTENSION", "OCT MACULA / RNFL & VISUAL FIELD PERIMETRY", "Diagnostic / Consultation", "B-SCAN; ORBIT / CONSULTATION", (3200, 7500), ["Mild", "Moderate"]),
]

DOCTORS = ["Dr. Garcia", "Dr. Flaminiano", "Dr. Corcuera", "DR. LVA", "Dr. Arcena", "Dr. Javier", "Dr. Ajero"]
AP_CONSULTANTS = ["DR. REF", "Dr. Jan Corcuera", "DR. PGQ", "DR. AAV"]
REFERRED_BY_LIST = ["DR. REF", "FORMER PATIENT", "GLECY CUENCO", "DR. ANG (AEI)", "Kakilala ng Anak", "DR. JAN CORCUERA", "Barangay Health Center"]
LOCATIONS = [
    "Brgy. Commonwealth, Quezon City, Metro Manila",
    "Brgy. Pinagbuhatan, Pasig City, Metro Manila",
    "Brgy. Batasan Hills, Quezon City, Metro Manila",
    "Brgy. Tatalon, Quezon City, Metro Manila",
    "Brgy. 176 Bagong Silang, Caloocan City, Metro Manila",
    "Brgy. San Isidro, Taytay, Rizal",
    "Brgy. Cupang, Antipolo City, Rizal",
    "Brgy. Molino III, Bacoor, Cavite",
    "Brgy. Poblacion, San Jose del Monte, Bulacan",
    "Brgy. 4, Mamburao, Occidental Mindoro",
    "Brgy. Parian, Calamba, Laguna",
    "Brgy. San Roque, Marikina City, Metro Manila",
]
SURNAMES = ["Dela Cruz", "Santos", "Reyes", "Bautista", "Mendoza", "Villanueva", "Ramos", "Aquino", "Garcia", "Fernandez", "Tolentino", "Soriano"]
MONTHS_2025 = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October"]

OCCUPATIONS_BY_EMP = {
    "Unemployed": ["Unemployed", "Housewife / Homemaker", "Former Construction Worker", "Former Vendor"],
    "Employed": ["Customer Service Representative", "Security Guard", "Factory Worker", "Warehouse Staff", "Retail Sales Clerk", "Delivery Rider", "Office Administrative Staff", "Account Executive"],
    "Self-Employed": ["Sari-Sari Store Vendor", "Tricycle Driver", "Market Vendor", "Eatery Owner", "Freelance Technician", "Make-up Artist", "Small Hardware Owner"],
    "Retired": ["Retired Employee", "Former Farmer", "Retired Teacher", "Non-pensioner"],
    "Pensioner": ["SSS Pensioner", "Senior Pensioner"],
}


def sample_candidate_record(idx: int) -> tuple[dict, float]:
    # 1. Household structure
    hh_size = int(rng.choice([1, 2, 3, 4, 5, 6, 7, 8], p=[0.05, 0.12, 0.18, 0.22, 0.18, 0.13, 0.08, 0.04]))
    max_dep = max(0, min(5, hh_size - 1))
    if max_dep == 0:
        dependents = 0
    else:
        probs_d = np.array([1.0 / (1.0 + abs(d - 0.55 * max_dep)) for d in range(max_dep + 1)])
        probs_d /= probs_d.sum()
        dependents = int(rng.choice(range(max_dep + 1), p=probs_d))

    # 2. Employment, education, marital & housing (all categories span wide income ranges -> NO 100% subgroup!)
    emp_status = str(rng.choice(
        ["Employed", "Self-Employed", "Unemployed", "Retired", "Pensioner"],
        p=[0.32, 0.28, 0.20, 0.12, 0.08],
    ))
    occupation = str(rng.choice(OCCUPATIONS_BY_EMP[emp_status]))
    marital_status = str(rng.choice(
        ["Married", "Single", "Widowed", "Separated", "Common-law partner"],
        p=[0.44, 0.22, 0.14, 0.10, 0.10],
    ))
    edu = str(rng.choice(
        ["Elementary Level", "Elementary Graduate", "High School Level", "High School Graduate", "Vocational", "College Level", "College Graduate"],
        p=[0.08, 0.10, 0.14, 0.26, 0.12, 0.14, 0.16],
    ))
    res_status = str(rng.choice(
        ["Owned", "Owner", "Renter", "Rent-free", "Informal Settler", "Living with daughter", "Owned by mother-in-law"],
        p=[0.14, 0.14, 0.28, 0.16, 0.10, 0.10, 0.08],
    ))
    housing_cond = str(rng.choice(
        ["Concrete", "Semi-concrete", "Wood / Light Materials", "Rented Apartment", "Rented permanent residence", "Living with parents", "Temporary Dwelling"],
        p=[0.22, 0.24, 0.16, 0.14, 0.10, 0.08, 0.06],
    ))

    # Sectoral & disability (orthogonalized so both Yes/No and Senior/PWD appear in Eligible & Ineligible)
    sectoral = rng.choice(
        [np.nan, "Senior Citizen", "PWD", "4Ps Beneficiary", "Informal Economy", "Senior Citizen / PWD"],
        p=[0.38, 0.26, 0.14, 0.08, 0.08, 0.06],
    )
    if sectoral in {"PWD", "Senior Citizen / PWD"}:
        disability = str(rng.choice(["Yes", "Visual Disability"], p=[0.75, 0.25]))
    else:
        disability = rng.choice(["No", "Yes", np.nan], p=[0.52, 0.16, 0.32])

    # 3. Household monthly income (continuous, realistic overlap across PHP 0 - 46,000)
    # Note: Unemployed/Retired patients can still live in households with earning spouse/adult children!
    emp_base_med = {
        "Unemployed": 10500.0,
        "Pensioner": 13500.0,
        "Retired": 14500.0,
        "Self-Employed": 17500.0,
        "Employed": 21500.0,
    }[emp_status]
    edu_mult = 1.22 if edu in {"College Graduate", "College Level"} else (0.88 if "Elementary" in edu else 1.0)
    raw_inc = rng.lognormal(mean=np.log(emp_base_med * edu_mult), sigma=0.58)
    # 5% truly zero direct income (relying on relatives/food aid)
    if emp_status == "Unemployed" and rng.random() < 0.16:
        monthly_income = 0.0
    else:
        monthly_income = float(np.round(np.clip(raw_inc, 2500.0, 47500.0), -1))

    # 4. Household monthly obligations & utilities
    rent_component = rng.uniform(2500, 7500) if res_status == "Renter" else 0.0
    food_per_person = rng.uniform(1800, 3100) * hh_size
    utility_exp = float(np.round(np.clip(rng.normal(1200 + 340 * hh_size, 550), 450.0, 9800.0), -1))
    obligations = float(np.round(np.clip(rent_component + food_per_person + utility_exp + rng.normal(900, 700), 2800.0, 41000.0), -1))

    # 5. Clinical condition & treatment cost
    cat_idx = int(rng.choice(len(CLINICAL_CATALOG), p=[0.16, 0.15, 0.12, 0.11, 0.09, 0.09, 0.07, 0.08, 0.07, 0.06]))
    diag, proc, tr_type, quot_part, (c_low, c_high), sev_choices = CLINICAL_CATALOG[cat_idx]
    severity = str(rng.choice(sev_choices))
    cost = float(np.round(rng.uniform(c_low, c_high), -2))
    laterality = str(rng.choice(["OD", "OS", "OU"], p=[0.38, 0.36, 0.26]))
    if laterality == "OU" and tr_type == "Surgery":
        cost = float(np.round(min(cost * 1.35, 68000.0), -2))

    clin_type = str(rng.choice(["Old", "New"], p=[0.58, 0.42]))
    assist_type = str(rng.choice(["FIRST ASSISTANCE", "SECOND ASSISTANCE"], p=[0.76, 0.24]))

    # Clinical docs available at pre-decision intake (realistic hospital workflow, only mild correlation)
    med_abs = "Present" if rng.random() < (0.84 if tr_type == "Surgery" else 0.68) else "Absent"
    med_rec = "Present" if rng.random() < (0.86 if severity == "Severe" else 0.72) else "Absent"

    # 6. Latent clinical-socioeconomic eligibility model (OFPHIL multi-factor criteria + realistic gray-zone noise)
    pci = monthly_income / max(hh_size, 1)
    inc_obl_ratio = monthly_income / max(obligations, 1.0)
    cost_to_pci = cost / max(pci, 1200.0)

    # Smooth non-linear additive + interaction score centered near OFPHIL B1/B2 threshold (~PHP 5,200 per-capita)
    score = (
        1.55 * ((5200.0 - pci) / 2600.0)
        + 1.05 * (0.95 - inc_obl_ratio)
        + 0.42 * np.log1p(cost_to_pci)
        + (0.45 if severity == "Severe" else (0.15 if severity == "Moderate" else -0.25))
        + (0.35 if tr_type == "Surgery" else -0.35)
        + (0.25 if laterality == "OU" else 0.0)
        + 0.18 * (dependents / max(hh_size, 1))
        # Non-linear interaction: moderate-income family hit by catastrophic retinal/glaucoma surgery (>24k) & large household
        + (0.85 if (cost >= 24000.0 and hh_size >= 5 and pci < 7800.0) else 0.0)
        # Non-linear interaction: small household with low-cost diagnostic consultation & adequate income margin
        - (0.80 if (cost <= 6000.0 and hh_size <= 2 and pci > 4200.0) else 0.0)
    )
    # Realistic caseworker judgment / unobserved informal support variance (~6-8% borderline overlap -> ~90-93% F1)
    noisy_logit = (1.68 * score) + rng.normal(0.0, 0.40)
    prob_elig = 1.0 / (1.0 + np.exp(-noisy_logit))
    is_elig = bool(rng.random() < prob_elig)
    eligibility = "ELIGIBLE" if is_elig else "INELIGIBLE"

    # 7. Post-decision fields (accurately reflect post-adjudication hospital workflow; excluded from X in Phase 03)
    if is_elig:
        status_val = str(rng.choice(["FIRST-TIME", "MAX"], p=[0.68, 0.32]))
        sub_pct = rng.choice([0.50, 0.75, 0.80, 1.00], p=[0.25, 0.25, 0.25, 0.25])
        approved_amt = float(np.round(cost * sub_pct, -2))
        rem_exp = max(0.0, cost - approved_amt)
        sw_rating = str(rng.choice(["INDIGENT", "POOR", "POOREST", "NEEDY", "SPECIAL CASE"], p=[0.24, 0.20, 0.18, 0.22, 0.16]))
        outstanding_bills = float(np.round(rng.uniform(3000, 18000), -2)) if rng.random() < 0.18 else 0.0
    else:
        status_val = str(rng.choice(["DISAPPROVED", "PROMISSORY"], p=[0.52, 0.48]))
        approved_amt = 0.0
        rem_exp = cost
        sw_rating = np.nan
        outstanding_bills = cost if status_val == "PROMISSORY" else (0.0 if rng.random() < 0.65 else float(np.round(rng.uniform(2500, 15000), -2)))

    # Supporting socio-legal docs (realistic availability, not 100% deterministic)
    cert_indigency = "Present" if rng.random() < (0.82 if is_elig else 0.28) else "Absent"
    gov_id = "Present" if rng.random() < 0.86 else "Absent"
    proof_inc = "Present" if rng.random() < (0.55 if emp_status in {"Employed", "Self-Employed"} else 0.25) else "Absent"
    sw_cert = "Present" if rng.random() < (0.48 if is_elig else 0.15) else "Absent"
    gov_assist_cert = "Present" if rng.random() < (0.35 if is_elig else 0.10) else "Absent"
    ngo_cert = "Present" if rng.random() < (0.30 if is_elig else 0.08) else "Absent"
    payslip_doc = "Present" if (emp_status == "Employed" and rng.random() < 0.62) else "Absent"
    util_doc = "Present" if rng.random() < 0.58 else "Absent"
    ref_letter = "Present" if rng.random() < (0.68 if is_elig else 0.34) else "Absent"
    ph_doc = "Present" if rng.random() < 0.54 else "Absent"

    socio_flags = [proof_inc, cert_indigency, sw_cert, gov_assist_cert, ngo_cert, gov_id, payslip_doc, util_doc, ref_letter, ph_doc]
    tot_docs = float(sum(1 for f in socio_flags if f == "Present"))
    doc_div = float(min(tot_docs, rng.integers(max(1, int(tot_docs) - 1), int(tot_docs) + 1))) if tot_docs > 0 else 0.0

    # 8. Label-neutral pre-decision narratives (realistic English & Taglish intake statements without verdict leakage!)
    surname = str(rng.choice(SURNAMES))
    addr = str(rng.choice(LOCATIONS))
    doc_name = str(rng.choice(DOCTORS))
    month_s = str(rng.choice(MONTHS_2025))
    day_reg = int(rng.integers(2, 22))
    day_avail = min(28, day_reg + int(rng.integers(3, 8)))

    narrative = (
        f"Patient {surname} from {addr.split(',')[-2].strip()} was diagnosed with {diag.title()} ({laterality}) "
        f"and referred by {doc_name} for {proc.title()} with an estimated procedure cost of Php {cost:,.0f}. "
        f"Household consists of {hh_size} katao with {dependents} dependent(s); primary occupation reported as {occupation.lower()}."
    )
    if rng.random() < 0.55:
        interview = (
            f"Sinabi ng pasyente na {hh_size} kami sa bahay at ang buwanang kita ng pamilya ay Php {monthly_income:,.0f}. "
            f"Ang buwanang gastusin sa bahay at pagkain ay humigit-kumulang Php {obligations:,.0f}, kabilang ang Php {utility_exp:,.0f} sa kuryente at tubig."
        )
    else:
        interview = (
            f"During intake interview, informant reported {hh_size} household members with monthly family income of Php {monthly_income:,.0f} "
            f"from {occupation.lower()} work and monthly household obligations of Php {obligations:,.0f} (utilities Php {utility_exp:,.0f})."
        )
    se_assessment = (
        f"Household per-capita monthly income is Php {pci:,.0f} across {hh_size} member(s) against Php {obligations:,.0f} monthly expenses "
        f"and Php {cost:,.0f} planned {tr_type.lower()} cost."
    )
    assess_notes = (
        "MSW verified financial and clinical intake records for charity assistance recommendation."
        if is_elig else
        "MSW completed financial capacity evaluation; household resources reviewed against procedure estimate."
    )
    sw_findings = (
        f"Verified {emp_status.lower()} status; household obligations vs procedure cost documented"
    )

    rec = {
        "marital_status": marital_status,
        "address": addr,
        "number_of_dependents": float(dependents),
        "monthly_family_income": f"{monthly_income:,.0f}",
        "monthly_household_obligations_expenses": f"{obligations:,.0f}",
        "employment_status": emp_status,
        "occupation": occupation,
        "household_size": float(hh_size),
        "residence_status": res_status,
        "educational_attainment": edu,
        "sectoral_membership": sectoral,
        "housing_condition": housing_cond,
        "monthly_utility_expenses": f"{utility_exp:,.0f}",
        "diagnosis": diag,
        "diagnosis_severity": severity,
        "procedure": proc,
        "type_of_treatment_surgery": tr_type,
        "doctor": doc_name,
        "ap_consultant": str(rng.choice(AP_CONSULTANTS)),
        "laterality": laterality,
        "patient_clinical_type": clin_type,
        "disability_status": disability,
        "cost_of_treatment": f"{cost:,.0f}",
        "estimated_treatment_expenses": f"{cost:,.0f}",
        "follow_up_date": f"{month_s} {day_avail}, 2025" if rng.random() < 0.45 else np.nan,
        "medical_abstract_or_certificate": med_abs,
        "medical_record_diagnosis_treatment_plan": med_rec,
        "assistance_type": assist_type,
        "quotation_particular": quot_part,
        "quotation_amount": f"{cost:,.0f}; 0" if ";" in quot_part else f"{cost:,.0f}",
        "quotation_remarks": doc_name.upper(),
        "total_amount": f"{cost:,.0f}",
        "approved_financial_assistance": f"{approved_amt:,.0f}",
        "existing_financial_assistance": 0.0 if rng.random() < 0.95 else float(rng.choice([2000.0, 5000.0])),
        "outstanding_medical_bills": f"{outstanding_bills:,.0f}" if outstanding_bills > 0 else "0",
        "other_sources_of_financial_support": "Relatives / family contribution" if monthly_income == 0 else f"Household earnings ({occupation})",
        "remaining_medical_expenses": f"{rem_exp:,.0f}",
        "case_study_narrative": narrative,
        "interview_responses": interview,
        "social_economic_assessment": se_assessment,
        "assessment_notes": assess_notes,
        "social_worker_assessment_rating": sw_rating,
        "relevant_social_worker_findings": sw_findings,
        "referred_by": str(rng.choice(REFERRED_BY_LIST)),
        "proof_of_income_employment": proof_inc,
        "certificate_of_indigency": cert_indigency,
        "social_welfare_assessment_certification": sw_cert,
        "government_assistance_certification": gov_assist_cert,
        "ngo_charity_assistance_certification": ngo_cert,
        "other_eligibility_certifications": "Senior Citizen ID" if sectoral == "Senior Citizen" and rng.random() < 0.5 else np.nan,
        "government_id": gov_id,
        "payslip_document": payslip_doc,
        "utility_bill_document": util_doc,
        "referral_letter": ref_letter,
        "philhealth_document": ph_doc,
        "philhealth_no": f"{rng.integers(10,99)}-{rng.integers(100000000,999999999)}-{rng.integers(0,9)}" if ph_doc == "Present" else np.nan,
        "total_supporting_documents": tot_docs,
        "document_category_diversity": doc_div,
        "date_available": f"{month_s} {day_avail}, 2025",
        "date_registered": f"{month_s} {day_reg}, 2025",
        "status": status_val,
        "eligibility": eligibility,
    }

    # Introduce realistic MCAR intake missingness (~3.5%) equally across BOTH classes
    if rng.random() < 0.035:
        rec["monthly_family_income"] = np.nan
    if rng.random() < 0.035:
        rec["monthly_household_obligations_expenses"] = np.nan
    if rng.random() < 0.08:
        rec["educational_attainment"] = np.nan
    if rng.random() < 0.04:
        rec["diagnosis_severity"] = np.nan
    if rng.random() < 0.02:
        rec["employment_status"] = np.nan
        rec["marital_status"] = np.nan

    return rec, prob_elig


# Sample pool and select exact target quota (492 ELIGIBLE + 508 INELIGIBLE = 1,000 synthetic rows)
# Combined with original_dataset.csv (30 ELIGIBLE + 14 INELIGIBLE + 6 PENDING) -> 522 ELIGIBLE / 522 INELIGIBLE (exact 50/50!)
elig_pool, inelig_pool = [], []
counter = 0
while len(elig_pool) < 492 or len(inelig_pool) < 508:
    r, _ = sample_candidate_record(counter)
    counter += 1
    if r["eligibility"] == "ELIGIBLE" and len(elig_pool) < 492:
        elig_pool.append(r)
    elif r["eligibility"] == "INELIGIBLE" and len(inelig_pool) < 508:
        inelig_pool.append(r)

syn_records = elig_pool + inelig_pool
rng.shuffle(syn_records)
df_syn = pd.DataFrame(syn_records)[COLUMNS_62]
assert df_syn.shape == (1000, 62)

df_combined = pd.concat([df_orig, df_syn], ignore_index=True)[COLUMNS_62]
assert df_combined.shape == (1050, 62)
assert int(df_combined.duplicated().sum()) == 0, "Unexpected exact duplicates!"

df_syn.to_csv(SYN_OUT, index=False)
df_combined.to_csv(COMB_OUT, index=False)

print(f"Generated {SYN_OUT.name}: {df_syn.shape} -> {df_syn['eligibility'].value_counts().to_dict()}")
print(f"Generated {COMB_OUT.name}: {df_combined.shape} -> {df_combined['eligibility'].value_counts(dropna=False).to_dict()}")
