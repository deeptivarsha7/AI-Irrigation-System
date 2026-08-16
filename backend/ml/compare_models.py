"""
Milestone 2 -- unified model comparison across RF, GBM, and LSTM.

Reads every run already logged to the "irrigation-scheduling" MLflow
experiment (by train.py and train_lstm.py) and produces one summary
declaring the actual best model per task, using the metric that task's
training scripts already optimized for consistently:
  - regression:     test-set R2 (higher is better)
  - classification:  macro F1 (higher is better) -- but see the note in
    the printed output about WHY macro F1 alone doesn't tell the whole
    story for a safety-relevant "High need" class.

Deduplicates by run name, keeping the most recent run when the same
model was trained more than once (e.g. train.py re-run during
development) -- otherwise identical runs would double-count in the table.

This does not retrain anything -- it only reads back what's already
logged, so it's cheap to re-run any time a new model is added.

Run from backend/ml/:
    python compare_models.py
"""

from pathlib import Path

import mlflow
import pandas as pd

mlflow.set_tracking_uri(f"sqlite:///{Path(__file__).parent / 'mlflow.db'}")
EXPERIMENT_NAME = "irrigation-scheduling"


def main():
    experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
    if experiment is None:
        print(f"No experiment named '{EXPERIMENT_NAME}' found. Run train.py and train_lstm.py first.")
        return

    runs = mlflow.search_runs(experiment_ids=[experiment.experiment_id])
    if runs.empty:
        print("No runs found in this experiment yet.")
        return

    # Keep only the most recent run per run-name, in case a script was
    # re-run during development and left duplicate entries behind.
    runs = runs.sort_values("start_time").drop_duplicates(
        subset="tags.mlflow.runName", keep="last"
    )

    runs["task"] = runs["tags.mlflow.runName"].apply(
        lambda n: "regression" if str(n).startswith("reg_") else "classification"
    )
    runs["model_family"] = runs["tags.mlflow.runName"].apply(
        lambda n: str(n).split("_", 1)[1] if "_" in str(n) else str(n)
    )

    print("=" * 78)
    print("REGRESSION -- water_required_mm  (ranked by test R2, higher is better)")
    print("=" * 78)
    reg = runs[runs["task"] == "regression"].copy()
    reg_cols = ["model_family", "metrics.overall_r2", "metrics.overall_mae", "metrics.overall_rmse"]
    reg_cols = [c for c in reg_cols if c in reg.columns]
    reg_sorted = reg[reg_cols].sort_values("metrics.overall_r2", ascending=False)
    reg_sorted.columns = ["model", "r2", "mae", "rmse"][: len(reg_sorted.columns)]
    print(reg_sorted.to_string(index=False))

    if not reg_sorted.empty:
        winner = reg_sorted.iloc[0]
        print(f"\n>>> Best regression model: {winner['model']}  (R2={winner['r2']:.4f}, MAE={winner['mae']:.2f}mm)")

    print("\n" + "=" * 78)
    print("CLASSIFICATION -- irrigation_need  (ranked by macro F1, higher is better)")
    print("=" * 78)
    clf = runs[runs["task"] == "classification"].copy()
    clf_cols = ["model_family", "metrics.overall_macro_f1", "metrics.overall_accuracy"]
    clf_cols = [c for c in clf_cols if c in clf.columns]
    clf_sorted = clf[clf_cols].sort_values("metrics.overall_macro_f1", ascending=False)
    clf_sorted.columns = ["model", "macro_f1", "accuracy"][: len(clf_sorted.columns)]
    print(clf_sorted.to_string(index=False))

    if not clf_sorted.empty:
        winner = clf_sorted.iloc[0]
        print(f"\n>>> Best classification model by macro F1: {winner['model']}  (F1={winner['macro_f1']:.4f}, accuracy={winner['accuracy']:.4f})")

    print(
        "\nNOTE: macro F1 weights every class equally regardless of size or\n"
        "real-world consequence. For this project, missing a genuine 'High'\n"
        "irrigation need (crop water stress) is a worse outcome than a false\n"
        "alarm on a day that turns out fine -- so recall on the High class\n"
        "specifically matters more than macro F1 alone suggests. Check each\n"
        "model's per-class classification_report (printed during training)\n"
        "before treating the macro-F1 ranking above as the final word."
    )

    print("\n" + "=" * 78)
    print("Full run details: mlflow ui --backend-store-uri sqlite:///mlflow.db")
    print("(run from this ml/ folder, then open http://127.0.0.1:5000)")


if __name__ == "__main__":
    main()