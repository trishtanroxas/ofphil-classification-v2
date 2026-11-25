import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Optional

class OFPHILRandomForest:
    """
    Random Forest Baseline Classifier for Charity Eligibility.
    Establishes non-linear ensemble baseline.
    """

    def __init__(self, n_estimators: int = 150, max_depth: Optional[int] = 12, random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        )

    def fit(self, X: np.ndarray, y: np.ndarray):
        self.model.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)
