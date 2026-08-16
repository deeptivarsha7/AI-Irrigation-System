"""
Milestone 2 -- model training.

Trains and evaluates Random Forest and Gradient Boosting for BOTH prediction
tasks the dataset supports:
  - REGRESSION:      water_required_mm  (continuous irrigation volume)
  - CLASSIFICATION:  irrigation_need    (Low / Medium / High)

Every run is logged to MLflow (params, metrics, and the fitted pipeline
itself as an artifact). The best model per task (by test-set performance)
is also saved directly to ml/models/ via joblib, as a single pipeline object
(preprocessing + model together) so the FastAPI serving endpoint can just
load it and call .predict() on raw feature values -- no manual re-encoding
needed at serving time.

IMPORTANT RIGOR CHECK: because ~54.5% of this dataset's rows are
synthetic_extension (see the dataset's own documentation), every model is
evaluated THREE ways on the held-out test set:
  1. Overall (all test rows)
  2. Real-only subset of the test rows
  3. Synthetic-only subset of the test rows
This shows whether the model performs consistently well on real data
specifically, not just on the easier-to-fit synthetic majority.

Run from backend/ml/:
    python train.py
"""

import json
import warnings
from pathlib import Path

import joblib
import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATA_PATH = Path(__file__).parent / "data" / "irrigation_dataset_PROJECT_FINAL.csv"
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

NUMERIC_FEATURES = [
    "soil_moisture", "temperature", "humidity", "rainfall_mm",
    "area_hectares", "previous_irrigation_mm",
]
CATEGORICAL_FEATURES = [
    "crop_type", "soil_type", "crop_growth_stage", "season",
    "region", "irrigation_type", "water_source", "mulching_used",
]
REG_TARGET = "water_required_mm"
CLF_TARGET = "irrigation_need"

mlflow.set_tracking_uri(f"sqlite:///{Path(__file__).parent / 'mlflow.db'}")
mlflow.set_experiment("irrigation-scheduling")


def build_preprocessor():
    return ColumnTransformer([
        ("num", "passthrough", NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
    ])


def evaluate_regression(pipe, X_test, y_test, source_test):
    results = {}
    for label, mask in [
        ("overall", pd.Series([True] * len(X_test), index=X_test.index)),
        ("real_only", source_test == "real"),
        ("synthetic_only", source_test == "synthetic_extension"),
    ]:
        if mask.sum() == 0:
            continue
        Xs, ys = X_test[mask], y_test[mask]
        preds = pipe.predict(Xs)
        results[label] = {
            "n": int(mask.sum()),
            "mae": round(float(mean_absolute_error(ys, preds)), 3),
            "rmse": round(float(root_mean_squared_error(ys, preds)), 3),
            "r2": round(float(r2_score(ys, preds)), 4),
        }
    return results


def evaluate_classification(pipe, X_test, y_test, source_test):
    results = {}
    for label, mask in [
        ("overall", pd.Series([True] * len(X_test), index=X_test.index)),
        ("real_only", source_test == "real"),
        ("synthetic_only", source_test == "synthetic_extension"),
    ]:
        if mask.sum() == 0:
            continue
        Xs, ys = X_test[mask], y_test[mask]
        preds = pipe.predict(Xs)
        results[label] = {
            "n": int(mask.sum()),
            "accuracy": round(float(accuracy_score(ys, preds)), 4),
            "macro_f1": round(float(f1_score(ys, preds, average="macro")), 4),
        }
    return results


def main():
    print(f"Loading {DATA_PATH} ...")
    df = pd.read_csv(DATA_PATH)
    print(f"{len(df)} rows loaded\n")

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    source = df["data_source"]

    # ------------------------------------------------------------------
    # REGRESSION: water_required_mm
    # ------------------------------------------------------------------
    print("=" * 70)
    print("REGRESSION TASK: water_required_mm")
    print("=" * 70)

    y_reg = df[REG_TARGET]
    X_train, X_test, y_train, y_test, source_train, source_test = train_test_split(
        X, y_reg, source, test_size=0.2, random_state=42
    )

    reg_models = {
        "random_forest": RandomForestRegressor(
            n_estimators=300, max_depth=12, min_samples_leaf=3,
            random_state=42, n_jobs=-1,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=300, max_depth=4, learning_rate=0.05, random_state=42,
        ),
    }

    reg_results = {}
    best_reg_name, best_reg_pipe, best_reg_r2 = None, None, -float("inf")

    for name, model in reg_models.items():
        with mlflow.start_run(run_name=f"reg_{name}"):
            pipe = Pipeline([("prep", build_preprocessor()), ("model", model)])
            pipe.fit(X_train, y_train)

            metrics = evaluate_regression(pipe, X_test, y_test, source_test)
            reg_results[name] = metrics

            mlflow.log_params(model.get_params())
            for split_name, split_metrics in metrics.items():
                for metric_name, value in split_metrics.items():
                    if metric_name != "n":
                        mlflow.log_metric(f"{split_name}_{metric_name}", value)
            mlflow.sklearn.log_model(pipe, artifact_path="model")

            print(f"\n--- {name} ---")
            print(json.dumps(metrics, indent=2))

            if metrics["overall"]["r2"] > best_reg_r2:
                best_reg_r2 = metrics["overall"]["r2"]
                best_reg_name, best_reg_pipe = name, pipe

    reg_out_path = MODELS_DIR / "irrigation_amount_regressor.joblib"
    joblib.dump(best_reg_pipe, reg_out_path)
    print(f"\nBest regression model: {best_reg_name} (R2={best_reg_r2:.4f}) -> saved to {reg_out_path}")

    # ------------------------------------------------------------------
    # CLASSIFICATION: irrigation_need
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("CLASSIFICATION TASK: irrigation_need")
    print("=" * 70)

    y_clf = df[CLF_TARGET]
    X_train, X_test, y_train, y_test, source_train, source_test = train_test_split(
        X, y_clf, source, test_size=0.2, random_state=42, stratify=y_clf
    )

    clf_models = {
        "random_forest": RandomForestClassifier(
            n_estimators=300, max_depth=12, min_samples_leaf=3,
            random_state=42, n_jobs=-1, class_weight="balanced",
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=300, max_depth=4, learning_rate=0.05, random_state=42,
        ),
    }

    clf_results = {}
    best_clf_name, best_clf_pipe, best_clf_f1 = None, None, -float("inf")

    for name, model in clf_models.items():
        with mlflow.start_run(run_name=f"clf_{name}"):
            pipe = Pipeline([("prep", build_preprocessor()), ("model", model)])
            pipe.fit(X_train, y_train)

            metrics = evaluate_classification(pipe, X_test, y_test, source_test)
            clf_results[name] = metrics

            mlflow.log_params(model.get_params())
            for split_name, split_metrics in metrics.items():
                for metric_name, value in split_metrics.items():
                    if metric_name != "n":
                        mlflow.log_metric(f"{split_name}_{metric_name}", value)
            mlflow.sklearn.log_model(pipe, artifact_path="model")

            print(f"\n--- {name} ---")
            print(json.dumps(metrics, indent=2))
            print(classification_report(y_test, pipe.predict(X_test)))

            if metrics["overall"]["macro_f1"] > best_clf_f1:
                best_clf_f1 = metrics["overall"]["macro_f1"]
                best_clf_name, best_clf_pipe = name, pipe

    clf_out_path = MODELS_DIR / "irrigation_need_classifier.joblib"
    joblib.dump(best_clf_pipe, clf_out_path)
    print(f"\nBest classification model: {best_clf_name} (macro F1={best_clf_f1:.4f}) -> saved to {clf_out_path}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Regression best:     {best_reg_name}  (test R2={best_reg_r2:.4f})")
    print(f"Classification best: {best_clf_name}  (test macro F1={best_clf_f1:.4f})")
    print(f"\nSaved models in: {MODELS_DIR}")
    print(f"MLflow tracking data in: {Path(__file__).parent / 'mlruns'}")
    print("Run 'mlflow ui' from this folder to view the comparison dashboard.")


if __name__ == "__main__":
    main()