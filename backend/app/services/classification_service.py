"""
Centralized Deterministic OFPHIL Classification Service.
Implements:
1. OFPHIL Financial Classification Rubric (Decimal-safe PHP arithmetic)
2. OFPHIL MSW Scoring & Subsidy Classification Rubric
3. Combined Evaluation & Discrepancy Reporting

Authoritative Criteria: User-supplied OFPHIL reference rubrics.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

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
