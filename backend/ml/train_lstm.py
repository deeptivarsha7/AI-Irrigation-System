"""
Milestone 2 -- LSTM training on the synthetic daily sequence dataset.

Trains and evaluates LSTM models for BOTH prediction tasks, same as
train.py's Random Forest / Gradient Boosting:
  - REGRESSION:      water_required_mm
  - CLASSIFICATION:  irrigation_need (Low / Medium / High)

Unlike RF/GB (which see one independent snapshot row at a time), the LSTM
sees the last LOOKBACK_DAYS of a farm's history as a sequence and predicts
the next day's target -- this is the entire point of using an LSTM here:
capturing the drying/refill trend over time, not just today's instant
reading.

DATA: ml/data/irrigation_sequence_dataset.csv, produced by
generate_sequence_dataset.py. That file's docstring documents a known,
accepted skew versus the real snapshot dataset (irrigation_need lands at
roughly 51% Low / 48% Medium / 1.3% High here, vs the real dataset's
58.6% / 38.1% / 3.3%) -- close enough to be realistic, not exact. The
High-need class is the most underrepresented, so this script explicitly
computes and applies class weights for the classifier (mirroring
RandomForestClassifier(..., class_weight="balanced") in train.py) rather
than pretending the imbalance isn't there.

SPLIT METHODOLOGY: farms are split into train/test BEFORE windowing, not
rows. Splitting by row would let windows from the same farm leak between
train and test (e.g. day 50's window in train, day 51's window in test,
sharing almost identical history) -- an easy and common mistake that makes
test performance look better than it really is. Every window in the test
set comes from a farm the model never saw during training.

Logs to the SAME MLflow experiment as train.py ("irrigation-scheduling"),
as new runs "reg_lstm" and "clf_lstm", so all three model families are
directly comparable on one dashboard.

Run from backend/ml/:
    python train_lstm.py
"""

import json
import warnings
from pathlib import Path

import joblib
import mlflow
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras import layers, models, callbacks

warnings.filterwarnings("ignore")
tf.random.set_seed(42)
np.random.seed(42)

DATA_PATH = Path(__file__).parent / "data" / "irrigation_sequence_dataset.csv"
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

LOOKBACK_DAYS = 14
TEST_FARM_FRACTION = 0.2
BATCH_SIZE = 64
MAX_EPOCHS = 60

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
NEED_CLASSES = ["Low", "Medium", "High"]

mlflow.set_tracking_uri(f"sqlite:///{Path(__file__).parent / 'mlflow.db'}")
mlflow.set_experiment("irrigation-scheduling")


def build_windows(df: pd.DataFrame, feature_matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    feature_matrix is the already-preprocessed (scaled + one-hot encoded)
    version of df, row-aligned with df. Builds sliding windows PER FARM so
    a window never crosses from one farm's history into another's.
    """
    X_windows, y_reg, y_clf = [], [], []

    for farm_uid, farm_df in df.groupby("farm_uid"):
        farm_df = farm_df.sort_values("day_index")
        idx = farm_df.index.to_numpy()
        farm_features = feature_matrix[idx]
        reg_targets = farm_df[REG_TARGET].to_numpy()
        clf_targets = farm_df[CLF_TARGET].to_numpy()

        for t in range(LOOKBACK_DAYS, len(farm_df)):
            X_windows.append(farm_features[t - LOOKBACK_DAYS:t])
            y_reg.append(reg_targets[t])
            y_clf.append(clf_targets[t])

    return np.array(X_windows), np.array(y_reg), np.array(y_clf)


def evaluate_regression(y_true, y_pred) -> dict:
    return {
        "n": int(len(y_true)),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "rmse": round(float(root_mean_squared_error(y_true, y_pred)), 3),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
    }


def evaluate_classification(y_true, y_pred) -> dict:
    return {
        "n": int(len(y_true)),
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, average="macro")), 4),
    }


def main():
    print(f"Loading {DATA_PATH} ...")
    df = pd.read_csv(DATA_PATH)
    print(f"{len(df)} rows, {df['farm_uid'].nunique()} farms\n")

    # --- Farm-level split (see SPLIT METHODOLOGY in module docstring) ---
    all_farms = df["farm_uid"].unique()
    rng = np.random.default_rng(42)
    rng.shuffle(all_farms)
    n_test_farms = max(1, int(len(all_farms) * TEST_FARM_FRACTION))
    test_farms = set(all_farms[:n_test_farms])
    train_farms = set(all_farms[n_test_farms:])

    train_df = df[df["farm_uid"].isin(train_farms)].reset_index(drop=True)
    test_df = df[df["farm_uid"].isin(test_farms)].reset_index(drop=True)
    print(f"Train farms: {len(train_farms)} ({len(train_df)} rows)")
    print(f"Test farms:  {len(test_farms)} ({len(test_df)} rows)\n")

    # --- Preprocessing: fit on TRAIN rows only, transform both ---
    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
    ])
    preprocessor.fit(train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])

    train_features = preprocessor.transform(train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])
    test_features = preprocessor.transform(test_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])
    if hasattr(train_features, "toarray"):
        train_features = train_features.toarray()
        test_features = test_features.toarray()

    n_features = train_features.shape[1]
    print(f"Feature dimensions per timestep: {n_features}\n")

    preprocessor_path = MODELS_DIR / "lstm_preprocessor.joblib"
    joblib.dump(preprocessor, preprocessor_path)

    # --- Build sliding windows, farm-safe ---
    X_train, y_train_reg, y_train_clf_raw = build_windows(train_df, train_features)
    X_test, y_test_reg, y_test_clf_raw = build_windows(test_df, test_features)
    print(f"Train windows: {X_train.shape}  Test windows: {X_test.shape}\n")

    label_encoder = LabelEncoder()
    label_encoder.fit(NEED_CLASSES)
    y_train_clf = label_encoder.transform(y_train_clf_raw)
    y_test_clf = label_encoder.transform(y_test_clf_raw)

    # ------------------------------------------------------------------
    # REGRESSION: water_required_mm
    # ------------------------------------------------------------------
    print("=" * 70)
    print("REGRESSION TASK (LSTM): water_required_mm")
    print("=" * 70)

    with mlflow.start_run(run_name="reg_lstm"):
        reg_model = models.Sequential([
            layers.Input(shape=(LOOKBACK_DAYS, n_features)),
            layers.LSTM(64, return_sequences=True),
            layers.Dropout(0.2),
            layers.LSTM(32),
            layers.Dropout(0.2),
            layers.Dense(16, activation="relu"),
            layers.Dense(1),
        ])
        reg_model.compile(optimizer="adam", loss="mse", metrics=["mae"])

        early_stop = callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True)

        history = reg_model.fit(
            X_train, y_train_reg,
            validation_split=0.15,
            epochs=MAX_EPOCHS,
            batch_size=BATCH_SIZE,
            callbacks=[early_stop],
            verbose=1,
        )

        y_pred_reg = reg_model.predict(X_test, verbose=0).flatten()
        reg_metrics = evaluate_regression(y_test_reg, y_pred_reg)

        mlflow.log_params({
            "lookback_days": LOOKBACK_DAYS,
            "batch_size": BATCH_SIZE,
            "max_epochs": MAX_EPOCHS,
            "actual_epochs": len(history.history["loss"]),
            "architecture": "LSTM(64)->LSTM(32)->Dense(16)->Dense(1)",
        })
        for k, v in reg_metrics.items():
            if k != "n":
                mlflow.log_metric(f"overall_{k}", v)
        mlflow.tensorflow.log_model(reg_model, artifact_path="model")

        print("\nTest set metrics:")
        print(json.dumps(reg_metrics, indent=2))

    reg_out_path = MODELS_DIR / "lstm_amount_regressor.keras"
    reg_model.save(reg_out_path)
    print(f"Saved to {reg_out_path}")

    # ------------------------------------------------------------------
    # CLASSIFICATION: irrigation_need
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("CLASSIFICATION TASK (LSTM): irrigation_need")
    print("=" * 70)

    class_weight_values = compute_class_weight(
        class_weight="balanced",
        classes=np.arange(len(NEED_CLASSES)),
        y=y_train_clf,
    )
    class_weight_dict = {i: float(w) for i, w in enumerate(class_weight_values)}
    print(f"Class weights (compensating for High-need scarcity): {class_weight_dict}\n")

    with mlflow.start_run(run_name="clf_lstm"):
        clf_model = models.Sequential([
            layers.Input(shape=(LOOKBACK_DAYS, n_features)),
            layers.LSTM(64, return_sequences=True),
            layers.Dropout(0.2),
            layers.LSTM(32),
            layers.Dropout(0.2),
            layers.Dense(16, activation="relu"),
            layers.Dense(len(NEED_CLASSES), activation="softmax"),
        ])
        clf_model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])

        early_stop = callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True)

        history = clf_model.fit(
            X_train, y_train_clf,
            validation_split=0.15,
            epochs=MAX_EPOCHS,
            batch_size=BATCH_SIZE,
            class_weight=class_weight_dict,
            callbacks=[early_stop],
            verbose=1,
        )

        y_pred_clf = np.argmax(clf_model.predict(X_test, verbose=0), axis=1)
        clf_metrics = evaluate_classification(y_test_clf, y_pred_clf)

        mlflow.log_params({
            "lookback_days": LOOKBACK_DAYS,
            "batch_size": BATCH_SIZE,
            "max_epochs": MAX_EPOCHS,
            "actual_epochs": len(history.history["loss"]),
            "architecture": "LSTM(64)->LSTM(32)->Dense(16)->Dense(3,softmax)",
            "class_weighted": True,
        })
        for k, v in clf_metrics.items():
            if k != "n":
                mlflow.log_metric(f"overall_{k}", v)
        mlflow.tensorflow.log_model(clf_model, artifact_path="model")

        print("\nTest set metrics:")
        print(json.dumps(clf_metrics, indent=2))
        print("\nPer-class report:")
        print(classification_report(y_test_clf, y_pred_clf, target_names=label_encoder.classes_))

    clf_out_path = MODELS_DIR / "lstm_need_classifier.keras"
    clf_model.save(clf_out_path)
    joblib.dump(label_encoder, MODELS_DIR / "lstm_label_encoder.joblib")
    print(f"Saved to {clf_out_path}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Regression (LSTM):     test R2={reg_metrics['r2']:.4f}, RMSE={reg_metrics['rmse']:.2f}")
    print(f"Classification (LSTM): test macro F1={clf_metrics['macro_f1']:.4f}, accuracy={clf_metrics['accuracy']:.4f}")
    print(f"\nCompare against RF/GB in the same MLflow experiment:")
    print("  mlflow ui --backend-store-uri sqlite:///mlflow.db")
    print("  (run from this ml/ folder, then open http://127.0.0.1:5000)")


if __name__ == "__main__":
    main()