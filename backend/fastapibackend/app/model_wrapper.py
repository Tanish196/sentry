"""XGBoost wrapper class for the safety prediction model."""

import numpy as np
import xgboost as xgb
from sklearn.base import BaseEstimator, ClassifierMixin


class XGBWrapper(BaseEstimator, ClassifierMixin):
    """Wrapper for XGBoost Booster to provide sklearn-like interface."""

    def __init__(self, booster, classes):
        self.booster = booster
        self.classes_ = np.array(classes)

    def predict(self, X):
        """Predict class labels for samples in X."""
        d = xgb.DMatrix(X)
        probs = self.booster.predict(d)
        return np.argmax(probs, axis=1)

    def predict_proba(self, X):
        """Predict class probabilities for samples in X."""
        d = xgb.DMatrix(X)
        return self.booster.predict(d)

    def get_params(self, deep=True):
        """Get parameters for this estimator."""
        return {"booster": self.booster, "classes": self.classes_}

    def set_params(self, **params):
        """Set the parameters of this estimator."""
        if "booster" in params:
            self.booster = params["booster"]
        if "classes" in params:
            self.classes_ = np.array(params["classes"])
        return self
