"""
Explainable ML Prediction Service (Phase 05 Final System Alignment).
Supports:
1. Logistic Regression Baseline
2. CatBoost Classifier
3. Explainable Boosting Machine (EBM)
4. Soft-Voting Ensemble (equal weight average 1/3 each)

Strictly uses the 27 approved predictor features (7 numeric, 20 categorical)
with zero prohibited features (target leakage free).
Provides probabilistic estimates and top feature explanations.
Does not replace MSW authority; all predictions require MSW review.
"""
import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import joblib

from app.core.paths import STORAGE_DIR
from app.schemas.ml_schemas import FeatureContribution, MLPredictRequest, MLPredictResponse
from app.shared.logging.logger import get_logger

logger = get_logger("MLPredictionService")

ROOT_DIR = Path(__file__).resolve().parents[3]
MODELS_DIR = ROOT_DIR / "models"
PHASE05_DIR = MODELS_DIR / "phase_05"
TRAINED_DIR = MODELS_DIR / "trained"

SCHEMA_PATH = PHASE05_DIR / "phase05_split_and_schema.json"
LR_MODEL_PATH = PHASE05_DIR / "logistic_regression_baseline.joblib"
CB_MODEL_PATH = TRAINED_DIR / "gradient_boosting" / "catboost_model.joblib"
EBM_MODEL_PATH = TRAINED_DIR / "interpretable" / "ebm_model.joblib"

ML_HISTORY_FILE = STORAGE_DIR / "ml_predictions_history.json"


def _utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class MLPredictionService:
    def __init__(self) -> None:
        self._lr_model = None
        self._cb_model = None
        self._ebm_model = None
        self._feature_schema = self._load_schema()

    def _load_schema(self) -> Dict[str, Any]:
        if SCHEMA_PATH.exists():
            try:
                return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"Could not load schema: {e}")
        return {
            "num_cols": [
                "age", "household_size", "number_of_dependents",
                "monthly_family_income", "monthly_household_obligations_expenses",
                "monthly_utility_expenses", "cost_of_treatment"
            ],
            "cat_cols": [
                "sex", "marital_status", "employment_status", "residence_status",
                "educational_attainment", "housing_condition", "sectoral_membership",
                "disability_status", "diagnosis_severity", "type_of_treatment_surgery",
                "laterality", "patient_clinical_type", "assistance_type",
                "certificate_of_indigency", "proof_of_income_employment",
                "government_id", "utility_bill_document", "referral_letter",
                "philhealth_document", "medical_record_diagnosis_treatment_plan"
            ],
            "feature_cols": [
                "age", "household_size", "number_of_dependents",
                "monthly_family_income", "monthly_household_obligations_expenses",
                "monthly_utility_expenses", "cost_of_treatment",
                "sex", "marital_status", "employment_status", "residence_status",
                "educational_attainment", "housing_condition", "sectoral_membership",
                "disability_status", "diagnosis_severity", "type_of_treatment_surgery",
                "laterality", "patient_clinical_type", "assistance_type",
                "certificate_of_indigency", "proof_of_income_employment",
                "government_id", "utility_bill_document", "referral_letter",
                "philhealth_document", "medical_record_diagnosis_treatment_plan"
            ]
        }

    def _load_lr(self):
        if self._lr_model is None and LR_MODEL_PATH.exists():
            self._lr_model = joblib.load(LR_MODEL_PATH)
        return self._lr_model

    def _load_cb(self):
        if self._cb_model is None and CB_MODEL_PATH.exists():
            self._cb_model = joblib.load(CB_MODEL_PATH)
        return self._cb_model

    def _load_ebm(self):
        if self._ebm_model is None and EBM_MODEL_PATH.exists():
            self._ebm_model = joblib.load(EBM_MODEL_PATH)
        return self._ebm_model

    def get_model_inventory(self) -> Dict[str, Any]:
        return {
            "production_4tier_enabled": False,
            "architecture_phase": "Phase 05 Final System Alignment",
            "reason": (
                "Four clinical classifiers (Logistic Regression baseline, CatBoost gradient booster, "
                "EBM interpretable glassbox, and Soft-Voting Ensemble) are trained on 27 audited clinical features. "
                "Final institutional charity eligibility decisions remain with the MSW."
            ),
            "candidates": [
                {
                    "candidate": "logistic_regression",
                    "name": "Logistic Regression Baseline",
                    "artifact_exists": LR_MODEL_PATH.exists(),
                    "artifact_path": str(LR_MODEL_PATH.name),
                    "classes": [0, 1],
                    "feature_count": 27,
                    "validated_for_ofphil_4tier": False,
                },
                {
                    "candidate": "catboost",
                    "name": "CatBoost Classifier",
                    "artifact_exists": CB_MODEL_PATH.exists(),
                    "artifact_path": str(CB_MODEL_PATH.name),
                    "classes": [0, 1],
                    "feature_count": 27,
                    "validated_for_ofphil_4tier": False,
                },
                {
                    "candidate": "ebm",
                    "name": "Explainable Boosting Machine (EBM)",
                    "artifact_exists": EBM_MODEL_PATH.exists(),
                    "artifact_path": str(EBM_MODEL_PATH.name),
                    "classes": [0, 1],
                    "feature_count": 27,
                    "validated_for_ofphil_4tier": False,
                },
                {
                    "candidate": "ensemble",
                    "name": "Soft-Voting Ensemble (LR + CatBoost + EBM)",
                    "artifact_exists": (LR_MODEL_PATH.exists() and CB_MODEL_PATH.exists() and EBM_MODEL_PATH.exists()),
                    "artifact_path": "ensemble(lr,cb,ebm)",
                    "classes": [0, 1],
                    "feature_count": 27,
                    "validated_for_ofphil_4tier": False,
                },
            ],
        }

    def _prepare_feature_dataframe(self, feat_dict: Dict[str, Any]) -> pd.DataFrame:
        feature_cols = self._feature_schema.get("feature_cols", [])
        cat_cols = self._feature_schema.get("cat_cols", [])
        num_cols = self._feature_schema.get("num_cols", [])

        row = {}
        for c in num_cols:
            val = feat_dict.get(c, 0.0)
            try:
                row[c] = float(val) if val is not None else 0.0
            except (ValueError, TypeError):
                row[c] = 0.0

        for c in cat_cols:
            val = feat_dict.get(c, "UNKNOWN")
            row[c] = str(val).strip().upper() if val is not None else "UNKNOWN"

        df = pd.DataFrame([row])
        if feature_cols:
            df = df[feature_cols]
        return df

    def _append_history(self, entry: Dict[str, Any]) -> None:
        try:
            history: List[Dict[str, Any]] = []
            if ML_HISTORY_FILE.exists():
                history = json.loads(ML_HISTORY_FILE.read_text(encoding="utf-8"))
            history.insert(0, entry)
            ML_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
            ML_HISTORY_FILE.write_text(json.dumps(history[:500], indent=2), encoding="utf-8")
        except Exception:
            pass

    def predict(self, payload: MLPredictRequest) -> MLPredictResponse:
        now = _utc_now()
        candidate = payload.model_candidate.strip().lower()

        # Check if gating is enforced and allow_experimental_binary is False
        if not payload.allow_experimental_binary:
            res = MLPredictResponse(
                prediction_enabled=False,
                status="AWAITING_4TIER_VALIDATION",
                model_candidate=candidate,
                model_version=f"{candidate}_phase05_v1",
                classes_supported=[0, 1],
                api_classification=payload.api_classification,
                disagrees_with_api=None,
                requires_msw_review=True,
                prediction_timestamp=now,
                provenance_note=(
                    "ML predictions are currently gated pending institutional sign-off. "
                    "Deterministic OFPHIL API classification remains authoritative."
                ),
            )
            self._append_history(res.model_dump())
            return res

        feat_dict = payload.features.model_dump()
        df = self._prepare_feature_dataframe(feat_dict)
        top_explanations: List[FeatureContribution] = []

        try:
            if candidate == "logistic_regression":
                model = self._load_lr()
                if model is None:
                    return self._unavailable_response(candidate, "logistic_regression_baseline.joblib not found.", now, payload)
                prob_arr = model.predict_proba(df)[0]
                pred_class = int(np.argmax(prob_arr))
                # Explainability: pipeline prep and coefficients
                try:
                    prep = model.named_steps["prep"]
                    clf = model.named_steps["clf"]
                    Xt = prep.transform(df)
                    feature_names = prep.get_feature_names_out()
                    coefs = clf.coef_[0]
                    # Compute feature impacts
                    if hasattr(Xt, "toarray"):
                        Xt_vals = Xt.toarray()[0]
                    else:
                        Xt_vals = np.array(Xt)[0]
                    impacts = Xt_vals * coefs
                    paired = sorted(zip(feature_names, impacts), key=lambda x: abs(x[1]), reverse=True)[:6]
                    for fname, score in paired:
                        clean_name = fname.replace("num__", "").replace("cat__", "")
                        top_explanations.append(FeatureContribution(
                            feature=clean_name,
                            value=feat_dict.get(clean_name, "encoded"),
                            contribution=round(float(score), 4),
                        ))
                except Exception as e:
                    logger.warning(f"LR explanation generation failed: {e}")
                version = "logistic_regression_phase05_v1"

            elif candidate == "catboost":
                model = self._load_cb()
                if model is None:
                    return self._unavailable_response(candidate, "catboost_model.joblib not found.", now, payload)
                prob_arr = model.predict_proba(df)[0]
                pred_class = int(np.argmax(prob_arr))
                try:
                    from catboost import Pool
                    prep = model.named_steps["prep"]
                    clf = model.named_steps["clf"]
                    Xt = prep.transform(df)
                    pool = Pool(Xt)
                    shap_vals = clf.get_feature_importance(data=pool, type="ShapValues")[0][:-1]
                    feature_names = prep.get_feature_names_out()
                    paired = sorted(zip(feature_names, shap_vals), key=lambda x: abs(x[1]), reverse=True)[:6]
                    for fname, score in paired:
                        clean_name = fname.replace("num__", "").replace("cat__", "")
                        top_explanations.append(FeatureContribution(
                            feature=clean_name,
                            value=feat_dict.get(clean_name, "encoded"),
                            contribution=round(float(score), 4),
                        ))
                except Exception as e:
                    logger.warning(f"CatBoost explanation generation failed: {e}")
                version = "catboost_phase05_v1"

            elif candidate == "ebm":
                model = self._load_ebm()
                if model is None:
                    return self._unavailable_response(candidate, "ebm_model.joblib not found.", now, payload)
                prob_arr = model.predict_proba(df)[0]
                pred_class = int(np.argmax(prob_arr))
                try:
                    prep = model.named_steps["prep"]
                    clf = model.named_steps["clf"]
                    Xt = prep.transform(df)
                    local_exp = clf.explain_local(Xt)
                    data_exp = local_exp.data(0)
                    prep_names = prep.get_feature_names_out()
                    scores = data_exp.get("scores", [])
                    paired = sorted(
                        zip(prep_names[:len(scores)], scores[:len(prep_names)]),
                        key=lambda x: abs(float(x[1])),
                        reverse=True
                    )[:6]
                    for fname, score in paired:
                        clean_name = fname.replace("num__", "").replace("cat__", "")
                        top_explanations.append(FeatureContribution(
                            feature=clean_name,
                            value=feat_dict.get(clean_name, "encoded"),
                            contribution=round(float(score), 4),
                        ))
                except Exception as e:
                    logger.warning(f"EBM explanation generation failed: {e}")
                version = "ebm_phase05_v1"

            elif candidate == "ensemble":
                lr = self._load_lr()
                cb = self._load_cb()
                ebm = self._load_ebm()
                if not (lr and cb and ebm):
                    return self._unavailable_response(candidate, "One or more ensemble models unavailable.", now, payload)
                p_lr = lr.predict_proba(df)[0]
                p_cb = cb.predict_proba(df)[0]
                p_ebm = ebm.predict_proba(df)[0]
                # Soft voting: average probabilities (1/3 weight each)
                prob_arr = (p_lr + p_cb + p_ebm) / 3.0
                pred_class = int(np.argmax(prob_arr))

                # Aggregate top explanations from EBM and CatBoost
                try:
                    prep = ebm.named_steps["prep"]
                    clf = ebm.named_steps["clf"]
                    Xt = prep.transform(df)
                    local_exp = clf.explain_local(Xt)
                    data_exp = local_exp.data(0)
                    prep_names = prep.get_feature_names_out()
                    scores = data_exp.get("scores", [])
                    paired = sorted(
                        zip(prep_names[:len(scores)], scores[:len(prep_names)]),
                        key=lambda x: abs(float(x[1])),
                        reverse=True
                    )[:6]
                    for fname, score in paired:
                        clean_name = fname.replace("num__", "").replace("cat__", "")
                        top_explanations.append(FeatureContribution(
                            feature=clean_name,
                            value=feat_dict.get(clean_name, "encoded"),
                            contribution=round(float(score), 4),
                        ))
                except Exception:
                    pass
                version = "soft_voting_ensemble_phase05_v1"

            else:
                return MLPredictResponse(
                    prediction_enabled=False,
                    status="UNSUPPORTED_MODEL_CANDIDATE",
                    model_candidate=candidate,
                    model_version="none",
                    classes_supported=[],
                    prediction_timestamp=now,
                    provenance_note=f"Unknown model candidate '{candidate}'. Approved models: logistic_regression, catboost, ebm, ensemble.",
                )

        except Exception as e:
            logger.error(f"Inference error with model {candidate}: {e}")
            return self._unavailable_response(candidate, f"Inference execution failed: {e}", now, payload)

        probs = {
            "class_0_non_indigent": round(float(prob_arr[0]), 4),
            "class_1_indigent": round(float(prob_arr[1]), 4),
        }
        pred_label = "Charity Eligible (Binary Class 1)" if pred_class == 1 else "Non-Charity / Review (Binary Class 0)"

        disagrees = None
        if payload.api_classification:
            api_is_charity = payload.api_classification in {
                "INDIGENT",
                "FINANCIALLY_INCAPACITATED_B1",
                "FINANCIALLY_INCAPACITATED_B2",
            }
            disagrees = (pred_class == 1) != api_is_charity

        res = MLPredictResponse(
            prediction_enabled=True,
            status="EXPERIMENTAL_BINARY_PREDICTION",
            model_candidate=candidate,
            model_version=version,
            classes_supported=[0, 1],
            predicted_class=pred_class,
            predicted_label=pred_label,
            probabilities=probs,
            top_explanations=top_explanations,
            api_classification=payload.api_classification,
            disagrees_with_api=disagrees,
            requires_msw_review=True,
            prediction_timestamp=now,
            provenance_note=(
                f"Prediction from approved Phase 05 {candidate} model using 27 clinical features. "
                "AI provides decision support only; final charity classification authority rests with the MSW."
            ),
        )
        self._append_history({"assessment_id": payload.assessment_id, **res.model_dump()})
        return res

    def _unavailable_response(
        self, candidate: str, note: str, now: str, payload: MLPredictRequest
    ) -> MLPredictResponse:
        res = MLPredictResponse(
            prediction_enabled=False,
            status="MODEL_ASSET_UNAVAILABLE",
            model_candidate=candidate,
            model_version="unavailable",
            classes_supported=[],
            api_classification=payload.api_classification,
            requires_msw_review=True,
            prediction_timestamp=now,
            provenance_note=note,
        )
        self._append_history(res.model_dump())
        return res


ml_prediction_service = MLPredictionService()

