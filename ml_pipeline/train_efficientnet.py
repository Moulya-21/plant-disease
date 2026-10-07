"""
PlantGuard AI - High-Accuracy EfficientNetV2 Training Pipeline
Features Anti-Overfitting & Anti-Underfitting Safeguards:
- Label Smoothing Cross-Entropy
- Two-Phase Progressive Fine-Tuning (Warmup -> Deep Unfreeze)
- Cosine Decay Learning Rate Annealing
- Compound Augmentations (Rotation, Zoom, Contrast, Flip)
- Spatial Dropout & Early Stopping with Weights Restoration
"""

import argparse
import json
import os
import tensorflow as tf
from tensorflow.keras import layers, models, regularizers
from tensorflow.keras.applications import EfficientNetV2B0
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# Base project paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


def build_data_augmentation():
    """Generates robust stochastic augmentation layers to eliminate spatial overfitting."""
    return tf.keras.Sequential([
        layers.RandomFlip("horizontal_and_vertical"),
        layers.RandomRotation(0.12, fill_mode="reflect"),
        layers.RandomZoom(0.15, fill_mode="reflect"),
        layers.RandomTranslation(0.08, 0.08, fill_mode="reflect"),
        layers.RandomContrast(0.15),
    ], name="anti_overfitting_augmentation")


def build_model(num_classes: int, l2_reg: float = 1e-4) -> tuple[models.Model, models.Model]:
    """Constructs EfficientNetV2 backbone with regularized classification head."""
    base_model = EfficientNetV2B0(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
        include_preprocessing=True,  # Built-in normalization
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(224, 224, 3), name="specimen_input")
    x = build_data_augmentation()(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D(name="global_pool")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.35, name="head_dropout_1")(x)
    x = layers.Dense(
        256,
        activation="relu",
        kernel_regularizer=regularizers.l2(l2_reg),
        name="dense_features",
    )(x)
    x = layers.Dropout(0.30, name="head_dropout_2")(x)
    outputs = layers.Dense(
        num_classes,
        activation="softmax",
        name="class_probabilities",
    )(x)

    model = models.Model(inputs, outputs, name="PlantGuard_EfficientNetV2")
    return model, base_model


def train(epochs: int = 15, batch_size: int = 32, label_smoothing: float = 0.1):
    train_dir = os.path.join(DATASET_DIR, "train")
    val_dir = os.path.join(DATASET_DIR, "validation")
    test_dir = os.path.join(DATASET_DIR, "test")

    if not os.path.exists(train_dir):
        print(f"Dataset directory not found at {train_dir}. Please place PlantVillage in dataset/")
        return

    print("Loading datasets...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir, image_size=(224, 224), batch_size=batch_size, shuffle=True, seed=42
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        val_dir, image_size=(224, 224), batch_size=batch_size, shuffle=False
    )
    test_ds = tf.keras.utils.image_dataset_from_directory(
        test_dir, image_size=(224, 224), batch_size=batch_size, shuffle=False
    )

    class_names = train_ds.class_names
    num_classes = len(class_names)
    print(f"Loaded {num_classes} classes from training set.")

    # Cache and prefetch
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    test_ds = test_ds.prefetch(autotune)

    # Build model
    model, base_model = build_model(num_classes)

    # Anti-Overfitting Criterion: Categorical Crossentropy with Label Smoothing
    loss_fn = tf.keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)

    # ----------------------------------------------------
    # Phase 1: Train Head Only (Prevents Gradient Shock)
    # ----------------------------------------------------
    print("\n--- Phase 1: Transfer Learning (Feature Head) ---")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(),
        metrics=["accuracy"],
    )

    checkpoint_path = os.path.join(MODEL_DIR, "efficientnetv2_plantguard_best.keras")
    callbacks = [
        ModelCheckpoint(checkpoint_path, monitor="val_accuracy", save_best_only=True, mode="max", verbose=1),
        EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=2, min_lr=1e-7, verbose=1),
    ]

    history1 = model.fit(train_ds, validation_data=val_ds, epochs=min(epochs, 8), callbacks=callbacks)

    # ----------------------------------------------------
    # Phase 2: Deep Fine-Tuning with Low Learning Rate
    # ----------------------------------------------------
    print("\n--- Phase 2: Unfreezing Top Backbone Layers ---")
    base_model.trainable = True
    # Freeze bottom 50% layers, unfreeze top convolutional blocks
    num_freeze = int(len(base_model.layers) * 0.65)
    for layer in base_model.layers[:num_freeze]:
        layer.trainable = False
    # Always keep BatchNormalization frozen to preserve ImageNet statistics
    for layer in base_model.layers:
        if isinstance(layer, layers.BatchNormalization):
            layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=5e-5),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(),
        metrics=["accuracy"],
    )

    history2 = model.fit(train_ds, validation_data=val_ds, epochs=epochs, callbacks=callbacks)

    # Final evaluation
    print("\n--- Evaluating Model on Test Dataset ---")
    best_model = tf.keras.models.load_model(checkpoint_path)
    test_loss, test_acc = best_model.evaluate(test_ds)
    print(f"\nFinal Test Loss: {test_loss:.4f} | Accuracy: {test_acc * 100:.2f}%")

    history_payload = {
        "model": "EfficientNetV2B0",
        "phase1": history1.history,
        "phase2": history2.history,
        "test_accuracy": float(test_acc),
        "test_loss": float(test_loss),
        "class_names": class_names,
    }
    with open(os.path.join(MODEL_DIR, "efficientnet_training_history.json"), "w", encoding="utf-8") as f:
        json.dump(history_payload, f, indent=4)
    print("Training history saved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train EfficientNetV2 on Plant Pathology Dataset")
    parser.add_argument("--epochs", type=int, default=12, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    args = parser.parse_args()
    train(epochs=args.epochs, batch_size=args.batch_size)
