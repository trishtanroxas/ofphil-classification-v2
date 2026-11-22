"""
Explainable ML Prediction Service (Phase 5 Preparation & Safe Integration).
Strictly separated from deterministic OFPHIL Classification API.
"""
import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.paths import PRETRAINED_MODELS_DIR, STORAGE_DIR
from app.schemas.ml_schemas import FeatureContribution, MLPredictRequest, MLPredictResponse

MULTIMODAL_DIR = PRETRAINED_MODELS_DIR / "multimodal"
EBM_MODEL_PATH = MULTIMODAL_DIR / "ebm_multimodal.joblib"
CATBOOST_MODEL_PATH = MULTIMODAL_DIR / "catboost_multimodal.cbm"
ML_HISTORY_FILE = STORAGE_DIR / "ml_predictions_history.json"


def _utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class MLPredictionService:
    def __init__(self) -> None:
        self._ebm_model = None
        self._cb_model = None

    def get_model_inventory(self) -> Dict[str, Any]:
        return {
            "production_4tier_enabled": False,
            "reason": (
                "Existing pretrained assets (ebm_multimodal.joblib, catboost_multimodal.cbm) "
                "are binary [0, 1] multimodal benchmark models requiring 31 features including "
                "document visual and SBERT embeddings. 4-tier OFPHIL clinical calibration and "
                "institutional validation are required before enabling production ML predictions."
            ),
            "candidates": [
                {
                    "candidate": "ebm",
                    "name": "Explainable Boosting Machine (EBM)",
                    "artifact_exists": EBM_MODEL_PATH.exists(),
                    "artifact_path": str(EBM_MODEL_PATH.name),
                    "classes": [0, 1],
                    "feature_count": 31,
                    "validated_for_ofphil_4tier": False,
                },
                {
                    "candidate": "catboost",
                    "name": "CatBoost Classifier",
                    "artifact_exists": CATBOOST_MODEL_PATH.exists(),
                    "artifact_path": str(CATBOOST_MODEL_PATH.name),
                    "classes": [0, 1],
                    "feature_count": 31,
                    "validated_for_ofphil_4tier": False,
                },
                {
                    "candidate": "logistic_regression",
                    "name": "Logistic Regression Baseline",
                    "artifact_exists": False,
                    "artifact_path": None,
                    "classes": [],
                    "feature_count": 0,
                    "validated_for_ofphil_4tier": False,
                },
            ],
        }

    def _load_ebm(self):
        if self._ebm_model is None and EBM_MODEL_PATH.exists():
            import joblib
            self._ebm_model = joblib.load(EBM_MODEL_PATH)
        return self._ebm_model

    def _load_catboost(self):
        if self._cb_model is None and CATBOOST_MODEL_PATH.exists():
            from catboost import CatBoostClassifier
            cb = CatBoostClassifier()
            cb.load_model(str(CATBOOST_MODEL_PATH))
            self._cb_model = cb
        return self._cb_model

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

        if candidate == "logistic_regression":
            res = MLPredictResponse(
                prediction_enabled=False,
                status="MODEL_ASSET_UNAVAILABLE",
                model_candidate=candidate,
                model_version="unavailable",
                classes_supported=[],
                api_classification=payload.api_classification,
                requires_msw_review=True,
                prediction_timestamp=now,
                provenance_note="No trained Logistic Regression artifact found in models/pretrained/multimodal.",
            )
            self._append_history(res.model_dump())
            return res

        if not payload.allow_experimental_binary:
            res = MLPredictResponse(
                prediction_enabled=False,
                status="AWAITING_4TIER_VALIDATION",
                model_candidate=candidate,
                model_version=f"{candidate}_multimodal_binary_v1",
                classes_supported=[0, 1],
                api_classification=payload.api_classification,
                disagrees_with_api=None,
                requires_msw_review=True,
                prediction_timestamp=now,
                provenance_note=(
                    "ML predictions are currently gated pending 4-tier OFPHIL clinical validation "
                    "and institutional sign-off. Deterministic OFPHIL API classification remains authoritative."
                ),
            )
            self._append_history(res.model_dump())
            return res

        # Experimental binary [0, 1] inference using real pretrained model + real local explanations
        import pandas as pd
        feat_dict = payload.features.model_dump()
        df = pd.DataFrame([feat_dict])

        top_explanations: List[FeatureContribution] = []
        pred_class: Optional[int] = None
        probs: Optional[Dict[str, float]] = None

        if candidate == "ebm":
            model = self._load_ebm()
            if model is None:
                return MLPredictResponse(
                    prediction_enabled=False,
                    status="MODEL_ASSET_UNAVAILABLE",
                    model_candidate=candidate,
                    model_version="unavailable",
                    classes_supported=[],
                    prediction_timestamp=now,
                    provenance_note="ebm_multimodal.joblib not found.",
                )
            pred_class = int(model.predict(df)[0])
            prob_arr = model.predict_proba(df)[0]
            probs = {"class_0_non_indigent": round(float(prob_arr[0]), 4), "class_1_indigent": round(float(prob_arr[1]), 4)}
            local_exp = model.explain_local(df)
            data_exp = local_exp.data(0)
            names = data_exp.get("names", [])
            scores = data_exp.get("scores", [])
            paired = sorted(
                zip(names, scores),
                key=lambda x: abs(float(x[1])),
                reverse=True,
            )[:6]
            for fname, fscore in paired:
                top_explanations.append(FeatureContribution(
                    feature=str(fname),
                    value=feat_dict.get(str(fname), "interaction"),
                    contribution=round(float(fscore), 4),
                ))
            version = "ebm_multimodal_binary_v1"

        elif candidate == "catboost":
            model = self._load_catboost()
            if model is None:
                return MLPredictResponse(
                    prediction_enabled=False,
                    status="MODEL_ASSET_UNAVAILABLE",
                    model_candidate=candidate,
                    model_version="unavailable",
                    classes_supported=[],
                    prediction_timestamp=now,
                    provenance_note="catboost_multimodal.cbm not found.",
                )
            from catboost import Pool
            cat_indices = model.get_cat_feature_indices()
            for idx in cat_indices:
                col_name = df.columns[idx]
                df[col_name] = df[col_name].astype(str)
            pool = Pool(df, cat_features=cat_indices)
            pred_class = int(model.predict(pool)[0])
            prob_arr = model.predict_proba(pool)[0]
            probs = {"class_0_non_indigent": round(float(prob_arr[0]), 4), "class_1_indigent": round(float(prob_arr[1]), 4)}
            shap_vals = model.get_feature_importance(pool, type="ShapValues")[0][:-1]
            paired = sorted(
                zip(df.columns, shap_vals),
                key=lambda x: abs(float(x[1])),
                reverse=True,
            )[:6]
            for fname, fscore in paired:
                top_explanations.append(FeatureContribution(
                    feature=str(fname),
                    value=feat_dict.get(str(fname)),
                    contribution=round(float(fscore), 4),
                ))
            version = "catboost_multimodal_binary_v1"
        else:
            return MLPredictResponse(
                prediction_enabled=False,
                status="UNSUPPORTED_MODEL_CANDIDATE",
                model_candidate=candidate,
                model_version="none",
                classes_supported=[],
                prediction_timestamp=now,
                provenance_note=f"Unknown model candidate '{candidate}'.",
            )

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
                "Supplementary binary multimodal prediction (experimental, not yet 4-tier calibrated). "
                "Does not override deterministic OFPHIL API classification."
            ),
        )
        self._append_history({"assessment_id": payload.assessment_id, **res.model_dump()})
        return res


ml_prediction_service = MLPredictionService()
