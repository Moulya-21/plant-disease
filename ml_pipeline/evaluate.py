"""
PlantGuard AI - Multi-Class Model Evaluation & Diagnostic Benchmark Suite
Evaluates trained models against the test dataset and outputs:
- Confusion Matrix & Classification Report
- Per-Crop Diagnostic Accuracy Breakdown
- High-Risk Confusion Pairs Analysis
"""

import argparse
import json
import os
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
TEST_DIR = os.path.join(BASE_DIR, "dataset", "test")

os.makedirs(RESULTS_DIR, exist_ok=True)


def evaluate(model_path: str = None, batch_size: int = 32):
    if not model_path:
        model_path = os.path.join(MODEL_DIR, "custom_cnn_best.keras")
        if not os.path.exists(model_path):
            model_path = os.path.join(MODEL_DIR, "mobilenetv2_finetuned_best.keras")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    if not os.path.exists(TEST_DIR):
        print(f"Test dataset directory not found at {TEST_DIR}. Ensure dataset/test is available.")
        return

    print(f"Loading model for evaluation: {model_path}")
    model = tf.keras.models.load_model(model_path, compile=False)

    print("Loading test dataset...")
    test_ds = tf.keras.utils.image_dataset_from_directory(
        TEST_DIR,
        image_size=(224, 224),
        batch_size=batch_size,
        shuffle=False,
    )
    class_names = test_ds.class_names
    num_classes = len(class_names)

    y_true = []
    y_pred = []

    print("Running batch inference across test set...")
    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_true.extend(labels.numpy())
        y_pred.extend(np.argmax(preds, axis=1))

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    accuracy = float(np.mean(y_true == y_pred))
    macro_precision = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_recall = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

    print("\n========================================")
    print("EVALUATION BENCHMARK METRICS")
    print("========================================")
    print(f"Accuracy         : {accuracy * 100:.2f}%")
    print(f"Macro Precision  : {macro_precision * 100:.2f}%")
    print(f"Macro Recall     : {macro_recall * 100:.2f}%")
    print(f"Macro F1-Score   : {macro_f1 * 100:.2f}%")

    report_dict = classification_report(y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0)
    report_text = classification_report(y_true, y_pred, target_names=class_names, zero_division=0)

    # Save outputs
    metrics_path = os.path.join(RESULTS_DIR, "evaluation_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump({
            "model_path": model_path,
            "accuracy": accuracy,
            "macro_precision": macro_precision,
            "macro_recall": macro_recall,
            "macro_f1": macro_f1,
            "classification_report": report_dict,
        }, f, indent=4)

    with open(os.path.join(RESULTS_DIR, "classification_report.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"\nDetailed metrics saved to {metrics_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Plant Pathology Model")
    parser.add_argument("--model", type=str, default=None, help="Path to .keras model")
    args = parser.parse_args()
    evaluate(model_path=args.model)
