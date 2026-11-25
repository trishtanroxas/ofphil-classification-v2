import numpy as np
from interpret.glassbox import ExplainableBoostingClassifier
from typing import Optional, Dict

class OFPHILExplainableBoostingMachine:
    """
    Explainable Boosting Machine (EBM) Classifier.
    Tree-based Generalized Additive Model with Pairwise Interactions (GA^2M).
    Provides exact mathematical feature curve interpretability for clinical social work audit.
    """

    def __init__(self, max_bins: int = 256, interactions: int = 10, random_state: int = 42):
        self.model = ExplainableBoostingClassifier(
            max_bins=max_bins,
            interactions=interactions,
            random_state=random_state,
        )

    def fit(self, X: np.ndarray, y: np.ndarray):
        self.model.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

    def explain_global(self):
        return self.model.explain_global()

    def explain_local(self, X: np.ndarray):
        return self.model.explain_local(X)
