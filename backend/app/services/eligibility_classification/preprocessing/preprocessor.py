import pandas as pd
import numpy as np
from typing import Tuple, List
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

class TabularPreprocessor:
    """
    Leak-free Tabular Preprocessing Pipeline for Track C.
    Transforms raw assessment fields into model-ready features.
    
    IMPORTANT: Fits transformers strictly on training folds to prevent target leakage.
    """

    def __init__(self):
        self.num_imputer = SimpleImputer(strategy="median")
        self.scaler = StandardScaler()
        self.numerical_cols = [
            "age",
            "monthly_household_income",
            "household_size",
            "num_dependents",
            "per_capita_income",
            "dependency_ratio",
        ]
        self._is_fitted = False

    def fit(self, df: pd.DataFrame):
        data = self._engineer_ratios(df)
        self.num_imputer.fit(data[self.numerical_cols])
        imputed = self.num_imputer.transform(data[self.numerical_cols])
        self.scaler.fit(imputed)
        self._is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        if not self._is_fitted:
            raise RuntimeError("Preprocessor must be fitted on training fold before transform.")
        data = self._engineer_ratios(df)
        imputed = self.num_imputer.transform(data[self.numerical_cols])
        return self.scaler.transform(imputed)

    def _engineer_ratios(self, df: pd.DataFrame) -> pd.DataFrame:
        data = df.copy()
        if "per_capita_income" not in data.columns:
            hh_size = data.get("household_size", 1).clip(lower=1)
            income = data.get("monthly_household_income", 0.0)
            data["per_capita_income"] = income / hh_size

        if "dependency_ratio" not in data.columns:
            hh_size = data.get("household_size", 1).clip(lower=1)
            deps = data.get("num_dependents", 0)
            data["dependency_ratio"] = deps / hh_size

        for col in self.numerical_cols:
            if col not in data.columns:
                data[col] = 0.0
        return data
