import os
import json
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    ConfusionMatrixDisplay
)

# ============================================================
# SETTINGS
# ============================================================

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

TEST_DIR = "dataset/test"
MODEL_PATH = "model/mobilenetv2_finetuned_best.keras"
HISTORY_PATH = "model/training_history.json"
RESULTS_DIR = "results"

os.makedirs(RESULTS_DIR, exist_ok=True)

# ============================================================
# LOAD MODEL
# ============================================================

print("Loading model...")

model = tf.keras.models.load_model(MODEL_PATH)

print("Model loaded successfully.")

# ============================================================
# LOAD TEST DATASET
# ============================================================

print("\nLoading test dataset...")

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

class_names = test_ds.class_names
num_classes = len(class_names)

print("Number of classes:", num_classes)

# ============================================================
# TEST ACCURACY
# ============================================================

print("\nEvaluating model...")

test_loss, test_accuracy = model.evaluate(
    test_ds,
    verbose=1
)

print("\n========================================")
print("TEST RESULTS")
print("========================================")
print(f"Test Loss     : {test_loss:.4f}")
print(f"Test Accuracy : {test_accuracy * 100:.2f}%")

# ============================================================
# PREDICTIONS
# ============================================================

print("\nGenerating predictions...")

y_true = []
y_pred = []

for images, labels in test_ds:

    predictions = model.predict(
        images,
        verbose=0
    )

    predicted_classes = np.argmax(
        predictions,
        axis=1
    )

    y_true.extend(labels.numpy())
    y_pred.extend(predicted_classes)

y_true = np.array(y_true)
y_pred = np.array(y_pred)

# ============================================================
# PRECISION / RECALL / F1
# ============================================================

precision = precision_score(
    y_true,
    y_pred,
    average="macro",
    zero_division=0
)

recall = recall_score(
    y_true,
    y_pred,
    average="macro",
    zero_division=0
)

f1 = f1_score(
    y_true,
    y_pred,
    average="macro",
    zero_division=0
)

print("\n========================================")
print("CLASSIFICATION METRICS")
print("========================================")
print(f"Precision       : {precision * 100:.2f}%")
print(f"Recall          : {recall * 100:.2f}%")
print(f"Macro F1-Score  : {f1 * 100:.2f}%")

# ============================================================
# PER-CLASS CLASSIFICATION REPORT
# ============================================================

report = classification_report(
    y_true,
    y_pred,
    target_names=class_names,
    digits=4,
    zero_division=0
)

print("\n========================================")
print("PER-CLASS CLASSIFICATION REPORT")
print("========================================")
print(report)

with open(
    os.path.join(
        RESULTS_DIR,
        "classification_report.txt"
    ),
    "w",
    encoding="utf-8"
) as f:
    f.write(report)

# ============================================================
# CONFUSION MATRIX
# ============================================================

print("\nGenerating confusion matrix...")

cm = confusion_matrix(
    y_true,
    y_pred
)

plt.figure(figsize=(20, 18))

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=class_names
)

disp.plot(
    xticks_rotation=90,
    cmap="Blues",
    ax=plt.gca(),
    colorbar=False
)

plt.title("Plant Disease Classification Confusion Matrix")
plt.tight_layout()

plt.savefig(
    os.path.join(
        RESULTS_DIR,
        "confusion_matrix.png"
    ),
    dpi=300,
    bbox_inches="tight"
)

plt.close()

print("Confusion matrix saved.")

# ============================================================
# TRAINING / VALIDATION GRAPHS
# ============================================================

if os.path.exists(HISTORY_PATH):

    print("\nLoading training history...")

    with open(
        HISTORY_PATH,
        "r",
        encoding="utf-8"
    ) as f:
        history_data = json.load(f)

    phase1 = history_data.get("phase1", {})
    phase2 = history_data.get("phase2", {})

    train_accuracy = (
        phase1.get("accuracy", [])
        + phase2.get("accuracy", [])
    )

    val_accuracy = (
        phase1.get("val_accuracy", [])
        + phase2.get("val_accuracy", [])
    )

    train_loss = (
        phase1.get("loss", [])
        + phase2.get("loss", [])
    )

    val_loss = (
        phase1.get("val_loss", [])
        + phase2.get("val_loss", [])
    )

    # -----------------------------
    # Accuracy Graph
    # -----------------------------

    plt.figure(figsize=(10, 6))

    plt.plot(
        train_accuracy,
        label="Training Accuracy"
    )

    plt.plot(
        val_accuracy,
        label="Validation Accuracy"
    )

    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.title(
        "Training and Validation Accuracy"
    )

    plt.legend()
    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        os.path.join(
            RESULTS_DIR,
            "accuracy_graph.png"
        ),
        dpi=300
    )

    plt.close()

    # -----------------------------
    # Loss Graph
    # -----------------------------

    plt.figure(figsize=(10, 6))

    plt.plot(
        train_loss,
        label="Training Loss"
    )

    plt.plot(
        val_loss,
        label="Validation Loss"
    )

    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title(
        "Training and Validation Loss"
    )

    plt.legend()
    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        os.path.join(
            RESULTS_DIR,
            "loss_graph.png"
        ),
        dpi=300
    )

    plt.close()

    print("Accuracy graph saved.")
    print("Loss graph saved.")

else:

    print(
        "WARNING: training_history.json not found."
    )

# ============================================================
# MODEL PARAMETERS
# ============================================================

total_params = model.count_params()

trainable_params = np.sum(
    [
        np.prod(variable.shape)
        for variable in model.trainable_variables
    ]
)

non_trainable_params = (
    total_params - trainable_params
)

print("\n========================================")
print("MODEL PARAMETERS")
print("========================================")
print(f"Total Parameters      : {total_params:,}")
print(f"Trainable Parameters  : {trainable_params:,}")
print(
    f"Non-trainable Params  : "
    f"{non_trainable_params:,}"
)

# ============================================================
# SAVE RESULTS
# ============================================================

results = {
    "test_loss": float(test_loss),
    "test_accuracy": float(test_accuracy),
    "precision_macro": float(precision),
    "recall_macro": float(recall),
    "f1_macro": float(f1),
    "total_parameters": int(total_params),
    "trainable_parameters": int(trainable_params),
    "non_trainable_parameters": int(
        non_trainable_params
    ),
    "number_of_classes": int(num_classes),
    "test_images": int(len(y_true))
}

with open(
    os.path.join(
        RESULTS_DIR,
        "final_results.json"
    ),
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        results,
        f,
        indent=4
    )

print("\n========================================")
print("EVALUATION COMPLETED")
print("========================================")

print("\nFiles generated in results/:")
print("1. final_results.json")
print("2. classification_report.txt")
print("3. confusion_matrix.png")
print("4. accuracy_graph.png")
print("5. loss_graph.png")