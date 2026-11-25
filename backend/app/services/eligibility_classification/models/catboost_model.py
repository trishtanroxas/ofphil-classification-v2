import numpy as np
from catboost import CatBoostClassifier
from typing import Optional, List

class OFPHILCatBoost:
    """
    CatBoost Classifier for Advanced Tabular Feature Interaction.
    Handles numerical scales and categorical interaction curves with minimal tuning.
    """

    def __init__(self, iterations: int = 250, depth: int = 6, learning_rate: float = 0.05, random_seed: int = 42):
        self.model = CatBoostClassifier(
            iterations=iterations,
            depth=depth,
            learning_rate=learning_rate,
            random_seed=random_seed,
            auto_class_weights="Balanced",
            verbose=False,
        )

    def fit(self, X: np.ndarray, y: np.ndarray):
        self.model.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)
