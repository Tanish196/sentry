"""Model artifact loading."""

import logging
import sys
from pathlib import Path
from typing import Tuple

import joblib

LOGGER = logging.getLogger(__name__)

# Global model artifacts
_MODEL = None
_PREPROCESSOR = None
_LABEL_ENCODER = None


def _resolve_artifact_dir() -> Path:
    """Resolve the path to model artifacts directory."""
    current_file = Path(__file__).resolve()
    artifact_dir = current_file.parent / "models"
    if not artifact_dir.exists():
        raise RuntimeError(f"Artifact directory not found: {artifact_dir}")
    return artifact_dir


def load_model_artifacts() -> Tuple:
    global _MODEL, _PREPROCESSOR, _LABEL_ENCODER
    
    if _MODEL is not None:
        return _MODEL, _PREPROCESSOR, _LABEL_ENCODER
    
    # Import XGBWrapper from model_wrapper module
    from .model_wrapper import XGBWrapper
    
    # Register XGBWrapper in __main__ module for unpickling
    sys.modules.setdefault("__main__", sys.modules[__name__])
    setattr(sys.modules["__main__"], "XGBWrapper", XGBWrapper)
    
    artifact_dir = _resolve_artifact_dir()
    LOGGER.info("Loading artifacts from %s", artifact_dir)
    
    _MODEL = joblib.load(artifact_dir / "model.pkl")
    _PREPROCESSOR = joblib.load(artifact_dir / "preprocessor.pkl")
    _LABEL_ENCODER = joblib.load(artifact_dir / "label_encoder.pkl")
    
    return _MODEL, _PREPROCESSOR, _LABEL_ENCODER


def get_model_artifacts() -> Tuple:

    if _MODEL is None:
        return load_model_artifacts()
    return _MODEL, _PREPROCESSOR, _LABEL_ENCODER
