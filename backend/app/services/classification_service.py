"""
Centralized Deterministic OFPHIL Classification Service.
Implements:
1. OFPHIL Financial Classification Rubric (Decimal-safe PHP arithmetic)
2. OFPHIL MSW Scoring & Subsidy Classification Rubric
3. Combined Evaluation & Discrepancy Reporting

Authoritative Criteria: User-supplied OFPHIL reference rubrics.
"""
import json
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.schemas.assessment_schemas import (
    Stage2EvaluationRequest,
    Stage2EvaluationResponse,
    Stage2InterviewAnswerItem,
)
from app.schemas.classification_schemas import (
    CombinedClassificationRequest,
    CombinedClassificationResponse,
    FinancialClassificationRequest,
    FinancialClassificationResponse,
    MSWClassificationRequest,
    MSWClassificationResponse,
    TriggeredCondition,
)

# Financial Reference Constants
PCPT_REFERENCE = Decimal("3368.40")
FAMILY_OF_FIVE_REFERENCE = Decimal("16842.00")

# Exact OFPHIL Financial Brackets (Monthly Per Capita Income)
FIN_INDIGENT_MAX = Decimal("4715.76")
FIN_B1_MIN = Decimal("4715.77")
FIN_B1_MAX = Decimal("6063.12")
FIN_B2_MIN = Decimal("6063.13")
FIN_B2_MAX = Decimal("7410.48")

# Exact OFPHIL MSW Scoring Thresholds
SEV_INDIGENT = Decimal("3.8")
COP_INDIGENT = Decimal("3.8")
RISK_INDIGENT = Decimal("65.0")
INCOME_INDIGENT_INIT = Decimal("14000.00")

SEV_B1 = Decimal("2.8")
COP_B1 = Decimal("2.8")
RISK_B1 = Decimal("45.0")

RISK_B2 = Decimal("30.0")
INCOME_B2_INIT = Decimal("25000.00")

PRECEDENCE_ORDER = [
    "INDIGENT",
    "FINANCIALLY_INCAPACITATED_B1",
    "FINANCIALLY_INCAPACITATED_B2",
    "FINANCIALLY_CAPACITATED",
]

# Approved OFPHIL DOH-PIE Qualitative-to-Numerical Assessment Rubric Mappings
APPROVED_SEVERITY_MAPPING: Dict[str, Decimal] = {
    "LEVEL_1_MINIMAL": Decimal("1.0"),
    "LEVEL_2_MILD": Decimal("2.0"),
    "LEVEL_3_MODERATE": Decimal("3.0"),
    "LEVEL_4_MODERATELY_SEVERE": Decimal("4.0"),
    "LEVEL_5_SEVERE": Decimal("5.0"),
    "LEVEL_6_CATASTROPHIC": Decimal("6.0"),
    # Numerical compatibility
    "1": Decimal("1.0"),
    "2": Decimal("2.0"),
    "3": Decimal("3.0"),
    "4": Decimal("4.0"),
    "5": Decimal("5.0"),
    "6": Decimal("6.0"),
    "1.0": Decimal("1.0"),
    "2.0": Decimal("2.0"),
    "3.0": Decimal("3.0"),
    "4.0": Decimal("4.0"),
    "5.0": Decimal("5.0"),
    "6.0": Decimal("6.0"),
}

APPROVED_COPING_MAPPING: Dict[str, Decimal] = {
    "LEVEL_1_SUPERIOR": Decimal("1.0"),
    "LEVEL_2_ADEQUATE": Decimal("2.0"),
    "LEVEL_3_VULNERABLE": Decimal("3.0"),
    "LEVEL_4_INADEQUATE": Decimal("4.0"),
    "LEVEL_5_SEVERE_BREAKDOWN": Decimal("5.0"),
    "LEVEL_6_CRISIS": Decimal("6.0"),
    # Numerical compatibility
    "1": Decimal("1.0"),
    "2": Decimal("2.0"),
    "3": Decimal("3.0"),
    "4": Decimal("4.0"),
    "5": Decimal("5.0"),
    "6": Decimal("6.0"),
    "1.0": Decimal("1.0"),
    "2.0": Decimal("2.0"),
    "3.0": Decimal("3.0"),
    "4.0": Decimal("4.0"),
    "5.0": Decimal("5.0"),
    "6.0": Decimal("6.0"),
}


def resolve_qualitative_severity(val: Any) -> tuple[Optional[Decimal], Optional[str]]:
    if val is None or val == "":
        return None, None
    if isinstance(val, (int, float, Decimal)):
        d = Decimal(str(val))
        if Decimal("1.0") <= d <= Decimal("6.0"):
            return d, None
    val_str = str(val).strip().upper()
    if val_str in APPROVED_SEVERITY_MAPPING:
        return APPROVED_SEVERITY_MAPPING[val_str], None
    return None, f"No approved OFPHIL clinical rubric mapping for severity descriptor: '{val}'"


def resolve_qualitative_coping(val: Any) -> tuple[Optional[Decimal], Optional[str]]:
    if val is None or val == "":
        return None, None
    if isinstance(val, (int, float, Decimal)):
        d = Decimal(str(val))
        if Decimal("1.0") <= d <= Decimal("6.0"):
            return d, None
    val_str = str(val).strip().upper()
    if val_str in APPROVED_COPING_MAPPING:
        return APPROVED_COPING_MAPPING[val_str], None
    return None, f"No approved OFPHIL clinical rubric mapping for coping descriptor: '{val}'"


def _quantize_2(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _quantize_1(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def classify_financial(payload: FinancialClassificationRequest) -> FinancialClassificationResponse:
    if payload.household_size < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Household size must be at least 1."
        )
    if payload.total_monthly_household_income < Decimal("0"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Total monthly household income cannot be negative."
        )

    per_capita = _quantize_2(
        Decimal(payload.total_monthly_household_income) / Decimal(payload.household_size)
    )

    if per_capita <= FIN_INDIGENT_MAX:
        code = "INDIGENT"
        label = "Indigent"
        threshold = FIN_INDIGENT_MAX
        explanation = (
            f"Monthly per capita income (₱{per_capita:,.2f}) is at or below the OFPHIL Indigent "
            f"threshold of ₱{FIN_INDIGENT_MAX:,.2f}."
        )
    elif per_capita <= FIN_B1_MAX:
        code = "FINANCIALLY_INCAPACITATED_B1"
        label = "Financially Incapacitated B1"
        threshold = FIN_B1_MAX
        explanation = (
            f"Monthly per capita income (₱{per_capita:,.2f}) falls within the OFPHIL Financially "
            f"Incapacitated B1 bracket (₱{FIN_B1_MIN:,.2f}–₱{FIN_B1_MAX:,.2f})."
        )
    elif per_capita <= FIN_B2_MAX:
        code = "FINANCIALLY_INCAPACITATED_B2"
        label = "Financially Incapacitated B2"
        threshold = FIN_B2_MAX
        explanation = (
            f"Monthly per capita income (₱{per_capita:,.2f}) falls within the OFPHIL Financially "
            f"Incapacitated B2 bracket (₱{FIN_B2_MIN:,.2f}–₱{FIN_B2_MAX:,.2f})."
        )
    else:
        code = "FINANCIALLY_CAPACITATED"
        label = "Financially Capacitated"
        threshold = FIN_B2_MAX
        explanation = (
            f"Monthly per capita income (₱{per_capita:,.2f}) exceeds the OFPHIL Financially "
            f"Incapacitated B2 ceiling of ₱{FIN_B2_MAX:,.2f}."
        )

    return FinancialClassificationResponse(
        monthly_per_capita_income=per_capita,
        total_monthly_household_income=_quantize_2(Decimal(payload.total_monthly_household_income)),
        household_size=payload.household_size,
        classification=code,
        classification_label=label,
        reference_threshold=threshold,
        pcpt_reference=PCPT_REFERENCE,
        family_of_five_reference=FAMILY_OF_FIVE_REFERENCE,
        classification_basis="OFPHIL_FINANCIAL_RUBRIC",
        rubric_version="1.0",
        explanation=explanation,
    )


def _resolve_msw_averages(payload: MSWClassificationRequest) -> tuple[Decimal, Decimal, Dict[str, Any], List[str]]:
    missing: List[str] = []
    breakdown: Dict[str, Any] = {}

    avg_sev = payload.average_severity
    avg_cop = payload.average_coping

    if payload.factors is not None:
        f = payload.factors
        sev_components: List[Decimal] = []
        if f.health_severity_avg is not None:
            sev_components.append(Decimal(f.health_severity_avg))
        else:
            missing.append("health_severity_avg")
        if f.discrimination_severity is not None:
            sev_components.append(Decimal(f.discrimination_severity))
        else:
            missing.append("discrimination_severity")
        if f.safety_severity is not None:
            sev_components.append(Decimal(f.safety_severity))
        else:
            missing.append("safety_severity")
        if f.roles_severity is not None:
            sev_components.append(Decimal(f.roles_severity))
        else:
            missing.append("roles_severity")
        if f.environment_severity is not None:
            sev_components.append(Decimal(f.environment_severity))
        else:
            missing.append("environment_severity")

        cop_components: List[Decimal] = []
        if f.health_coping_avg is not None:
            cop_components.append(Decimal(f.health_coping_avg))
        else:
            missing.append("health_coping_avg")
        if f.discrimination_coping is not None:
            cop_components.append(Decimal(f.discrimination_coping))
        else:
            missing.append("discrimination_coping")
        if f.safety_coping is not None:
            cop_components.append(Decimal(f.safety_coping))
        else:
            missing.append("safety_coping")
        if f.roles_coping is not None:
            cop_components.append(Decimal(f.roles_coping))
        else:
            missing.append("roles_coping")

        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Incomplete assessment factors; cannot classify without all required items.",
                    "missing_factors": missing,
                },
            )

        avg_sev = _quantize_2(sum(sev_components) / Decimal(len(sev_components)))
        avg_cop = _quantize_2(sum(cop_components) / Decimal(len(cop_components)))
        breakdown = {
            "severity_components": [float(x) for x in sev_components],
            "coping_components": [float(x) for x in cop_components],
        }
    else:
        if avg_sev is None:
            missing.append("average_severity")
        if avg_cop is None:
            missing.append("average_coping")
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Incomplete assessment scores; both average_severity and average_coping are required.",
                    "missing_factors": missing,
                },
            )
        avg_sev = _quantize_2(Decimal(avg_sev))
        avg_cop = _quantize_2(Decimal(avg_cop))

    if avg_sev < Decimal("0") or avg_sev > Decimal("6") or avg_cop < Decimal("0") or avg_cop > Decimal("6"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assessment severity and coping averages must be within 0.00 to 6.00.",
        )

    return avg_sev, avg_cop, breakdown, missing


def classify_msw(payload: MSWClassificationRequest) -> MSWClassificationResponse:
    avg_sev, avg_cop, breakdown, missing = _resolve_msw_averages(payload)

    # Preserve exact formula: Total Risk = (Average Severity * 8.5) + (Average Coping * 5.0)
    total_risk = _quantize_1((avg_sev * Decimal("8.5")) + (avg_cop * Decimal("5.0")))

    breakdown["average_severity"] = float(avg_sev)
    breakdown["average_coping"] = float(avg_cop)
    breakdown["severity_weighted"] = float(_quantize_2(avg_sev * Decimal("8.5")))
    breakdown["coping_weighted"] = float(_quantize_2(avg_cop * Decimal("5.0")))
    breakdown["total_risk_percent"] = float(total_risk)

    initial_load_active = payload.is_initial_load or (payload.assessment_context == "initial_load")
    income = Decimal(payload.total_household_income) if payload.total_household_income is not None else None

    triggered: List[TriggeredCondition] = []

    # Evaluate ALL tiers and preserve ALL triggered conditions
    # 1. Indigent triggers
    indigent_hit = False
    if avg_sev >= SEV_INDIGENT:
        indigent_hit = True
        triggered.append(TriggeredCondition(
            tier="INDIGENT",
            rule="Average Severity >= 3.8",
            metric="average_severity",
            actual_value=str(avg_sev),
            threshold=str(SEV_INDIGENT),
        ))
    if avg_cop >= COP_INDIGENT:
        indigent_hit = True
        triggered.append(TriggeredCondition(
            tier="INDIGENT",
            rule="Average Coping >= 3.8",
            metric="average_coping",
            actual_value=str(avg_cop),
            threshold=str(COP_INDIGENT),
        ))
    if total_risk >= RISK_INDIGENT:
        indigent_hit = True
        triggered.append(TriggeredCondition(
            tier="INDIGENT",
            rule="Total Risk >= 65.0%",
            metric="total_risk",
            actual_value=f"{total_risk}%",
            threshold=f"{RISK_INDIGENT}%",
        ))
    if initial_load_active and income is not None and income <= INCOME_INDIGENT_INIT:
        indigent_hit = True
        triggered.append(TriggeredCondition(
            tier="INDIGENT",
            rule="Initial-Load Household Income <= ₱14,000.00",
            metric="total_household_income",
            actual_value=f"₱{_quantize_2(income)}",
            threshold=f"₱{INCOME_INDIGENT_INIT}",
            context_applicable=True,
        ))

    # 2. Financially Incapacitated B1 triggers
    b1_hit = False
    if avg_sev >= SEV_B1:
        b1_hit = True
        triggered.append(TriggeredCondition(
            tier="FINANCIALLY_INCAPACITATED_B1",
            rule="Average Severity >= 2.8",
            metric="average_severity",
            actual_value=str(avg_sev),
            threshold=str(SEV_B1),
        ))
    if avg_cop >= COP_B1:
        b1_hit = True
        triggered.append(TriggeredCondition(
            tier="FINANCIALLY_INCAPACITATED_B1",
            rule="Average Coping >= 2.8",
            metric="average_coping",
            actual_value=str(avg_cop),
            threshold=str(COP_B1),
        ))
    if total_risk >= RISK_B1:
        b1_hit = True
        triggered.append(TriggeredCondition(
            tier="FINANCIALLY_INCAPACITATED_B1",
            rule="Total Risk >= 45.0%",
            metric="total_risk",
            actual_value=f"{total_risk}%",
            threshold=f"{RISK_B1}%",
        ))

    # 3. Financially Incapacitated B2 triggers
    b2_hit = False
    if total_risk >= RISK_B2:
        b2_hit = True
        triggered.append(TriggeredCondition(
            tier="FINANCIALLY_INCAPACITATED_B2",
            rule="Total Risk >= 30.0%",
            metric="total_risk",
            actual_value=f"{total_risk}%",
            threshold=f"{RISK_B2}%",
        ))
    if initial_load_active and income is not None and income <= INCOME_B2_INIT:
        b2_hit = True
        triggered.append(TriggeredCondition(
            tier="FINANCIALLY_INCAPACITATED_B2",
            rule="Initial-Load Household Income <= ₱25,000.00",
            metric="total_household_income",
            actual_value=f"₱{_quantize_2(income)}",
            threshold=f"₱{INCOME_B2_INIT}",
            context_applicable=True,
        ))

    # Apply highest-qualifying-tier precedence
    if indigent_hit:
        final_code = "INDIGENT"
        final_label = "Indigent"
        subsidy = "100% Full Charity Subsidy"
        subsidy_range = "100%"
    elif b1_hit:
        final_code = "FINANCIALLY_INCAPACITATED_B1"
        final_label = "Financially Incapacitated B1"
        subsidy = "High Partial Charity Subsidy"
        subsidy_range = "75% - 90%"
    elif b2_hit:
        final_code = "FINANCIALLY_INCAPACITATED_B2"
        final_label = "Financially Incapacitated B2"
        subsidy = "Moderate Partial Charity Subsidy"
        subsidy_range = "50% - 74%"
    else:
        final_code = "FINANCIALLY_CAPACITATED"
        final_label = "Financially Capacitated"
        subsidy = "Full Pay / Non-Charity"
        subsidy_range = "0%"
        triggered.append(TriggeredCondition(
            tier="FINANCIALLY_CAPACITATED",
            rule="All relevant scores below charity subsidy thresholds",
            metric="composite",
            actual_value=f"Sev={avg_sev}, Cop={avg_cop}, Risk={total_risk}%",
            threshold="Below B2/B1/Indigent cutoffs",
        ))

    trigger_summary = "; ".join([t.rule for t in triggered if t.tier == final_code])
    explanation = (
        f"MSW Rubric Classification: {final_label} ({subsidy}). "
        f"Computed Avg Severity={avg_sev}, Avg Coping={avg_cop}, Total Risk={total_risk}%. "
        f"Primary triggers: {trigger_summary}."
    )

    return MSWClassificationResponse(
        classification=final_code,
        classification_label=final_label,
        proposed_subsidy=subsidy,
        subsidy_percentage_range=subsidy_range,
        average_severity=avg_sev,
        average_coping=avg_cop,
        total_risk=total_risk,
        triggered_conditions=triggered,
        classification_precedence=PRECEDENCE_ORDER,
        initial_load_applied=initial_load_active,
        assessment_context="initial_load" if initial_load_active else "live_recalculation",
        missing_factors=missing,
        calculation_breakdown=breakdown,
        classification_basis="OFPHIL_MSW_RUBRIC",
        rubric_version="1.0",
        explanation=explanation,
    )


def evaluate_combined(payload: CombinedClassificationRequest) -> CombinedClassificationResponse:
    fin_req = FinancialClassificationRequest(
        total_monthly_household_income=payload.total_monthly_household_income,
        household_size=payload.household_size,
    )
    fin_res = classify_financial(fin_req)

    msw_req = MSWClassificationRequest(
        average_severity=payload.average_severity,
        average_coping=payload.average_coping,
        factors=payload.factors,
        total_household_income=payload.total_monthly_household_income,
        is_initial_load=payload.is_initial_load,
        assessment_context=payload.assessment_context,
    )
    msw_res = classify_msw(msw_req)

    discrepancy = fin_res.classification != msw_res.classification
    discrepancy_details = None
    if discrepancy:
        discrepancy_details = (
            f"Financial Income Rubric classified patient as '{fin_res.classification_label}' "
            f"(₱{fin_res.monthly_per_capita_income:,.2f}/person), whereas MSW Scoring Rubric "
            f"classified patient as '{msw_res.classification_label}' "
            f"(Risk {msw_res.total_risk}%). Case flagged for MSW professional review."
        )

    return CombinedClassificationResponse(
        financial_classification=fin_res,
        msw_classification=msw_res,
        monthly_per_capita_income=fin_res.monthly_per_capita_income,
        average_severity=msw_res.average_severity,
        average_coping=msw_res.average_coping,
        total_risk=msw_res.total_risk,
        triggered_conditions=msw_res.triggered_conditions,
        subsidy_recommendation=msw_res.proposed_subsidy,
        discrepancy_detected=discrepancy,
        discrepancy_details=discrepancy_details,
        requires_msw_review=discrepancy,
        rubric_version="1.0",
        explanations={
            "financial": fin_res.explanation,
            "msw": msw_res.explanation,
        },
    )


def _clamp_score(val: Decimal) -> Decimal:
    if val < Decimal("1.0"):
        return Decimal("1.0")
    if val > Decimal("6.0"):
        return Decimal("6.0")
    return _quantize_2(val)


def _has_keywords(text: str, keywords: tuple[str, ...]) -> bool:
    lower = (text or "").lower()
    return any(k in lower for k in keywords)


def compute_automated_stage2_scores(
    total_household_income: Optional[Decimal],
    household_size: Optional[int],
    total_monthly_expenses: Optional[Decimal] = None,
    estimated_treatment_expenses: Optional[Decimal] = None,
    sectoral_flags: Optional[Dict[str, bool]] = None,
    gov_assistance_enrolled: Optional[bool] = None,
    other_medical_expenses_count: Optional[int] = None,
    narrative_texts: Optional[Dict[str, str]] = None,
) -> Dict[str, Decimal]:
    """
    Deterministically computes DOH-PIE Severity (1.0-6.0) and Coping (1.0-6.0) domain scores
    from Stage 1 socioeconomic/financial data, monthly & surgical expense burden, sectoral
    vulnerability flags, and documented clinical/psychosocial observations.
    """
    inc = max(Decimal("0.00"), Decimal(str(total_household_income or 0)))
    hs = max(1, int(household_size or 1))
    per_capita = _quantize_2(inc / Decimal(hs))

    # 1. Base socioeconomic severity & coping derived from OFPHIL per-capita income brackets
    if per_capita <= Decimal("2500.00"):
        base_sev = Decimal("4.70")
        base_cop = Decimal("4.50")
    elif per_capita <= FIN_INDIGENT_MAX:  # <= 4,715.76
        base_sev = Decimal("4.10")
        base_cop = Decimal("3.95")
    elif per_capita <= FIN_B1_MAX:  # 4,715.77 - 6,063.12
        base_sev = Decimal("3.15")
        base_cop = Decimal("3.05")
    elif per_capita <= FIN_B2_MAX:  # 6,063.13 - 7,410.48
        base_sev = Decimal("2.40")
        base_cop = Decimal("2.30")
    elif per_capita <= Decimal("12000.00"):
        base_sev = Decimal("1.85")
        base_cop = Decimal("1.80")
    else:
        base_sev = Decimal("1.25")
        base_cop = Decimal("1.20")

    # 2. Surgical quotation & monthly expense burden modifiers
    surg_cost = max(Decimal("0.00"), Decimal(str(estimated_treatment_expenses or 0)))
    monthly_exp = max(Decimal("0.00"), Decimal(str(total_monthly_expenses or 0)))

    health_mod = Decimal("0.00")
    if surg_cost > Decimal("0"):
        if inc <= Decimal("0") or (surg_cost / max(Decimal("1.0"), inc)) >= Decimal("1.5"):
            health_mod += Decimal("0.55")
        elif (surg_cost / max(Decimal("1.0"), inc)) >= Decimal("0.75"):
            health_mod += Decimal("0.30")
    if (other_medical_expenses_count or 0) >= 1:
        health_mod += Decimal("0.25")

    exp_mod = Decimal("0.00")
    if monthly_exp > Decimal("0"):
        if inc <= Decimal("0") or monthly_exp >= inc:
            exp_mod += Decimal("0.50")
        elif (monthly_exp / max(Decimal("1.0"), inc)) >= Decimal("0.75"):
            exp_mod += Decimal("0.25")

    # 3. Sectoral & household dependency modifiers
    sec = sectoral_flags or {}
    is_pwd = bool(sec.get("pwd"))
    is_senior = bool(sec.get("seniorCitizens"))
    is_vulnerable_sector = any(
        bool(sec.get(k))
        for k in (
            "urbanPoor",
            "informalSector",
            "victimsOfDisasters",
            "farmersLandless",
            "artisanalFisherfolk",
            "indigenousPeoples",
        )
    )
    dep_mod = Decimal("0.30") if hs >= 4 else (Decimal("0.15") if hs >= 3 else Decimal("0.00"))
    vuln_mod = Decimal("0.25") if (is_vulnerable_sector or gov_assistance_enrolled) else Decimal("0.00")

    # 4. Subtle bounded qualitative text adjustments when documented
    texts = narrative_texts or {}
    discrim_txt = texts.get("discrimination", "")
    safety_txt = texts.get("safety", "")
    roles_txt = texts.get("roles", "")
    env_txt = texts.get("environment", "")
    health_txt = texts.get("health", "")

    discrim_kw = Decimal("0.20") if _has_keywords(discrim_txt, ("refusal", "stigma", "discrim", "isolat", "marginal")) else Decimal("0.00")
    safety_kw = Decimal("0.25") if _has_keywords(safety_txt, ("fall", "stumble", "hazard", "unpaved", "trauma", "accident")) else Decimal("0.00")
    roles_kw = Decimal("0.25") if _has_keywords(roles_txt, ("unable to work", "incapacit", "breadwinner", "strain", "dependent")) else Decimal("0.00")
    env_kw = Decimal("0.20") if _has_keywords(env_txt, ("congest", "informal", "substandard", "debt", "communal", "sharer")) else Decimal("0.00")
    health_kw = Decimal("0.20") if _has_keywords(health_txt, ("inaccessib", "barrier", "out-of-pocket", "blind", "urgent")) else Decimal("0.00")

    health_sev = _clamp_score(base_sev + health_mod + health_kw)
    health_cop = _clamp_score(base_cop + (health_mod * Decimal("0.8")) + exp_mod)

    discrim_sev = _clamp_score(base_sev - Decimal("0.20") + (Decimal("0.30") if is_pwd else Decimal("0.00")) + discrim_kw)
    discrim_cop = _clamp_score(base_cop - Decimal("0.15") + vuln_mod)

    safety_sev = _clamp_score(base_sev - Decimal("0.10") + (Decimal("0.30") if (is_senior or is_pwd) else Decimal("0.00")) + safety_kw)
    safety_cop = _clamp_score(base_cop - Decimal("0.10") + safety_kw)

    roles_sev = _clamp_score(base_sev + dep_mod + roles_kw)
    roles_cop = _clamp_score(base_cop + dep_mod + exp_mod)

    env_sev = _clamp_score(base_sev + exp_mod + vuln_mod + env_kw)

    return {
        "health_severity_avg": health_sev,
        "health_coping_avg": health_cop,
        "discrimination_severity": discrim_sev,
        "discrimination_coping": discrim_cop,
        "safety_severity": safety_sev,
        "safety_coping": safety_cop,
        "roles_severity": roles_sev,
        "roles_coping": roles_cop,
        "environment_severity": env_sev,
    }


def _compile_stage2_interview_answers(req: Stage2EvaluationRequest) -> List[Stage2InterviewAnswerItem]:
    if req.interview_answers:
        return list(req.interview_answers)

    items: List[Stage2InterviewAnswerItem] = []
    bg = req.background
    if bg:
        bg_pairs = [
            ("living_situation", "Current Living Situation & Tenancy", bg.living_situation, bg.living_situation_obs),
            ("household_composition", "Household Composition & Dependents", bg.household_composition, bg.household_composition_obs),
            ("family_support", "Family Caregiving & Support", bg.family_support, bg.family_support_obs),
            ("employment_situation", "Employment & Livelihood Situation", bg.employment_situation, bg.employment_obs),
            ("income_sources", "Household Income Sources", bg.income_sources, bg.income_sources_obs),
            ("financial_responsibilities", "Monthly Household Financial Responsibilities", bg.financial_responsibilities, bg.financial_responsibilities_obs),
        ]
        for key, q_txt, ans, obs in bg_pairs:
            if ans or obs:
                items.append(Stage2InterviewAnswerItem(question_key=key, question_text=q_txt, patient_answer=ans or "", msw_observation=obs or ""))

    md = req.medical_difficulties
    if md:
        if md.medical_condition_summary or md.medical_condition_obs:
            items.append(Stage2InterviewAnswerItem(
                question_key="medical_condition_summary",
                question_text="Medical Condition & Visual Functional Impact",
                patient_answer=md.medical_condition_summary or "",
                msw_observation=md.medical_condition_obs or "",
            ))
        if md.financial_barriers or md.financial_barriers_obs:
            items.append(Stage2InterviewAnswerItem(
                question_key="financial_barriers",
                question_text="Procedure Quotation & Medical Expense Barriers",
                patient_answer=md.financial_barriers or "",
                msw_observation=md.financial_barriers_obs or "",
            ))

    psy = req.psychosocial
    if psy:
        psy_pairs = [
            ("accessibility_concerns", "Healthcare Travel & Companion Accessibility", psy.accessibility_concerns, ""),
            ("discrimination_experienced", "Experienced Stigma or Employment Discrimination", psy.discrimination_experienced, psy.discrimination_obs),
            ("safety_hazards", "Home & Mobility Safety Hazards", psy.safety_hazards, psy.safety_hazards_obs),
            ("social_responsibilities", "Family & Social Role Responsibilities", psy.social_responsibilities, psy.social_responsibilities_obs),
            ("support_systems", "Community & Extended Family Support Systems", psy.support_systems, psy.support_systems_obs),
            ("basic_needs_living_conditions", "Basic Needs & Dwelling Conditions", psy.basic_needs_living_conditions, psy.basic_needs_obs),
            ("coping_capacity_narrative", "Patient & Family Coping Narrative", psy.coping_capacity_narrative, psy.coping_capacity_obs),
        ]
        for key, q_txt, ans, obs in psy_pairs:
            if ans or obs:
                items.append(Stage2InterviewAnswerItem(question_key=key, question_text=q_txt, patient_answer=ans or "", msw_observation=obs or ""))

    for idx, hf in enumerate(req.health_factors or []):
        items.append(Stage2InterviewAnswerItem(
            question_key=f"health_factor_{idx + 1}",
            question_text=hf.factor,
            patient_answer=hf.patient_reported or "",
            msw_observation=hf.msw_observation or "",
        ))

    domain_pairs = [
        ("domain_discrimination", "VI. Discrimination Burden", req.discrimination_patient_reported, req.discrimination_msw_observation),
        ("domain_safety", "VII. Safety / Hazards", req.safety_patient_reported, req.safety_msw_observation),
        ("domain_roles", "VIII. Social Roles", req.roles_patient_reported, req.roles_msw_observation),
        ("domain_environment", "IX. Environment & Basic Needs", req.environment_patient_reported, req.environment_msw_observation),
    ]
    for key, q_txt, ans, obs in domain_pairs:
        if ans or obs:
            items.append(Stage2InterviewAnswerItem(question_key=key, question_text=q_txt, patient_answer=ans or "", msw_observation=obs or ""))

    return items


def evaluate_stage2_interview(req: Stage2EvaluationRequest) -> Stage2EvaluationResponse:
    """
    Stage 2 is a qualitative text-based interview; it does NOT require or compute Stage 2
    severity/coping scores. Stage 1 financial per-capita classification is returned if
    household income and household size are provided. Legacy scores are only evaluated
    read-only if a caller explicitly supplies complete legacy severity/coping levels.
    """
    interview_answers = _compile_stage2_interview_answers(req)

    fin_res_dict = None
    if req.total_household_income is not None and req.household_size and req.household_size >= 1:
        try:
            fin_res = classify_financial(
                FinancialClassificationRequest(
                    total_monthly_household_income=req.total_household_income,
                    household_size=req.household_size,
                )
            )
            fin_res_dict = json.loads(fin_res.model_dump_json())
        except Exception:
            pass

    # Backward compatibility: only if legacy score fields were explicitly sent on old payloads,
    # preserve read-only legacy calculation without requiring scores for text-only interviews.
    has_legacy_levels = bool(
        req.discrimination_severity_level
        and req.discrimination_coping_level
        and req.safety_severity_level
        and req.safety_coping_level
        and req.roles_severity_level
        and req.roles_coping_level
        and req.environment_severity_level
        and req.health_factors
        and all(hf.severity_level and hf.coping_level for hf in req.health_factors)
    )
    if has_legacy_levels:
        h_sev_vals: List[Decimal] = []
        h_cop_vals: List[Decimal] = []
        valid_legacy = True
        for hf in (req.health_factors or []):
            sv, err_s = resolve_qualitative_severity(hf.severity_level)
            cv, err_c = resolve_qualitative_coping(hf.coping_level)
            if err_s or err_c or sv is None or cv is None:
                valid_legacy = False
                break
            h_sev_vals.append(sv)
            h_cop_vals.append(cv)
        d_s, e1 = resolve_qualitative_severity(req.discrimination_severity_level)
        d_c, e2 = resolve_qualitative_coping(req.discrimination_coping_level)
        s_s, e3 = resolve_qualitative_severity(req.safety_severity_level)
        s_c, e4 = resolve_qualitative_coping(req.safety_coping_level)
        r_s, e5 = resolve_qualitative_severity(req.roles_severity_level)
        r_c, e6 = resolve_qualitative_coping(req.roles_coping_level)
        ev_s, e7 = resolve_qualitative_severity(req.environment_severity_level)
        if valid_legacy and not any((e1, e2, e3, e4, e5, e6, e7)) and all(v is not None for v in (d_s, d_c, s_s, s_c, r_s, r_c, ev_s)):
            h_s_avg = _quantize_2(sum(h_sev_vals) / Decimal(len(h_sev_vals)))
            h_c_avg = _quantize_2(sum(h_cop_vals) / Decimal(len(h_cop_vals)))
            avg_sev = _quantize_2((h_s_avg + d_s + s_s + r_s + ev_s) / Decimal("5.0"))  # type: ignore[operator]
            avg_cop = _quantize_2((h_c_avg + d_c + s_c + r_c) / Decimal("4.0"))  # type: ignore[operator]
            total_risk = _quantize_1((avg_sev * Decimal("8.5")) + (avg_cop * Decimal("5.0")))
            msw_res = classify_msw(
                MSWClassificationRequest(
                    average_severity=avg_sev,
                    average_coping=avg_cop,
                    total_household_income=req.total_household_income,
                    is_initial_load=req.is_initial_load,
                    assessment_context=req.assessment_context,
                )
            )
            return Stage2EvaluationResponse(
                is_complete=True,
                status="INTERVIEW_RECORDED",
                message="Stage 2 qualitative interview recorded (legacy scores preserved read-only).",
                interview_answers=interview_answers,
                average_severity=avg_sev,
                average_coping=avg_cop,
                total_risk=total_risk,
                total_household_income=req.total_household_income,
                financial_classification=fin_res_dict,
                msw_classification=json.loads(msw_res.model_dump_json()),
                triggered_conditions=[json.loads(t.model_dump_json()) for t in msw_res.triggered_conditions],
                calculation_basis="LEGACY_READ_ONLY",
                rubric_version="1.0",
            )

    return Stage2EvaluationResponse(
        is_complete=True,
        status="INTERVIEW_RECORDED",
        message="Stage 2 qualitative interview recorded (scoring removed; eligibility decided via Stage 1 financial classification and manual MSW decision).",
        interview_answers=interview_answers,
        missing_factors=[],
        missing_mappings=[],
        institutional_confirmation_required=False,
        average_severity=None,
        average_coping=None,
        total_risk=None,
        total_risk_formula=None,
        total_household_income=req.total_household_income,
        computed_domain_scores=None,
        financial_classification=fin_res_dict,
        msw_classification=None,
        triggered_conditions=[],
        calculation_basis="STAGE2_TEXT_INTERVIEW_ONLY",
        rubric_version=None,
    )
