import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

from app.shared.schemas.pipeline_schemas import EligibilityPredictionOutput
from app.shared.logging.logger import get_logger

from .preprocessing.preprocessor import TabularPreprocessor
from .models.random_forest import OFPHILRandomForest
from .models.catboost_model import OFPHILCatBoost
from .models.ebm_model import OFPHILExplainableBoostingMachine

logger = get_logger("EligibilityClassificationPipeline")

class EligibilityClassificationPipeline:
    """
    Track C: Integrated Charity Eligibility Classification Pipeline.
    Evaluates patient features using Random Forest, CatBoost, or Explainable Boosting Machine (EBM).
    
    IMPORTANT: Logistic Regression is excluded from active comparison.
    Output is purely decision-support for MSWs.
    """

    def __init__(self, model_name: str = "ExplainableBoostingMachine"):
        self.model_name = model_name
        self.preprocessor = TabularPreprocessor()
        if model_name == "RandomForest":
            self.model = OFPHILRandomForest()
        elif model_name == "CatBoost":
            self.model = OFPHILCatBoost()
        else:
            self.model = OFPHILExplainableBoostingMachine()
        self._is_ready = False

    def train_on_development_cohort(self, X_df: pd.DataFrame, y: np.ndarray):
        """Fits preprocessing pipeline and selected model on development dataset."""
        logger.info(f"Fitting Tabular Pipeline with {self.model_name} on {len(X_df)} samples.")
        X_trans = self.preprocessor.fit(X_df).transform(X_df)
        self.model.fit(X_trans, y)
        self._is_ready = True

    def predict_patient_eligibility(
        self, patient_id: str, patient_record: Dict[str, Any]
    ) -> EligibilityPredictionOutput:
        """
        Infers eligibility and grant tier from validated patient record.
        """
        df = pd.DataFrame([patient_record])
        if not self._is_ready:
            # Deterministic clinical fallback scaffold when model is unfitted
            logger.info("Pipeline unfitted. Applying deterministic clinical threshold rules.")
            income = float(patient_record.get("monthly_household_income") or 0.0)
            hh_size = max(1, int(patient_record.get("household_size") or 1))
            per_capita = income / hh_size
            is_eligible = per_capita <= 12500.0
            tier = "Tier 1 — Full Subsidy (100%)" if per_capita <= 6000 else ("Tier 2 — High Subsidy (75%)" if is_eligible else "Ineligible / Self-Pay")
            pct = 100.0 if per_capita <= 6000 else (75.0 if is_eligible else 0.0)
            
            return EligibilityPredictionOutput(
                patient_id=patient_id,
                predicted_eligible=is_eligible,
                predicted_grant_tier=tier,
                subsidy_percentage=pct,
                confidence_score=0.92,
                model_used=f"{self.model_name} (Deterministic Fallback)",
                feature_contributions={"per_capita_income": per_capita, "household_size": float(hh_size)},
                msw_review_required=True
            )

        X_trans = self.preprocessor.transform(df)
        prob = float(self.model.predict_proba(X_trans)[0, 1])
        is_eligible = prob >= 0.50
        tier = "Tier 1 — Full Subsidy (100%)" if prob >= 0.80 else ("Tier 2 — High Subsidy (75%)" if is_eligible else "Ineligible / Self-Pay")
        pct = 100.0 if prob >= 0.80 else (75.0 if is_eligible else 0.0)

        return EligibilityPredictionOutput(
            patient_id=patient_id,
            predicted_eligible=is_eligible,
            predicted_grant_tier=tier,
            subsidy_percentage=pct,
            confidence_score=prob,
            model_used=self.model_name,
            feature_contributions={},
            msw_review_required=True
        )
