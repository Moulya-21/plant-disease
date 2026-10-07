import json
import os
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# ============================================================
# 1. SETTINGS & PATHS
# ============================================================

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_DIR = os.path.join(BASE_DIR, "dataset", "train")
VAL_DIR = os.path.join(BASE_DIR, "dataset", "validation")
TEST_DIR = os.path.join(BASE_DIR, "dataset", "test")

MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

BEST_MODEL_PATH = os.path.join(MODEL_DIR, "mobilenetv2_finetuned_best.keras")
HISTORY_PATH = os.path.join(MODEL_DIR, "training_history.json")


def train():
    print("\nLoading training dataset...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=True,
        seed=SEED,
    )

    print("\nLoading validation dataset...")
    val_ds = tf.keras.utils.image_dataset_from_directory(
        VAL_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=False,
    )

    print("\nLoading test dataset...")
    test_ds = tf.keras.utils.image_dataset_from_directory(
        TEST_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=False,
    )

    class_names = train_ds.class_names
    num_classes = len(class_names)
    print(f"Number of classes: {num_classes}")

    with open(os.path.join(MODEL_DIR, "class_names.json"), "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=4)

    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    test_ds = test_ds.prefetch(autotune)

    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.1),
    ], name="data_augmentation")

    base_model = MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(224, 224, 3))
    x = layers.Rescaling(1.0 / 127.5, offset=-1)(inputs)
    x = data_augmentation(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name="Plant_Disease_MobileNetV2")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    checkpoint = ModelCheckpoint(
        BEST_MODEL_PATH,
        monitor="val_accuracy",
        save_best_only=True,
        mode="max",
        verbose=1,
    )
    early_stopping = EarlyStopping(
        monitor="val_accuracy",
        patience=3,
        mode="max",
        restore_best_weights=True,
        verbose=1,
    )
    reduce_lr = ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.2,
        patience=2,
        min_lr=1e-7,
        verbose=1,
    )

    print("\nPhase 1: Feature Extraction Training...")
    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=10,
        callbacks=[checkpoint, early_stopping, reduce_lr],
    )

    print("\nPhase 2: Fine-Tuning Last 30 Layers...")
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    for layer in base_model.layers:
        if isinstance(layer, layers.BatchNormalization):
            layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=10,
        callbacks=[checkpoint, early_stopping, reduce_lr],
    )

    best_model = tf.keras.models.load_model(BEST_MODEL_PATH)
    test_loss, test_accuracy = best_model.evaluate(test_ds, verbose=1)

    print(f"\nFinal Test Loss: {test_loss:.4f} | Accuracy: {test_accuracy * 100:.2f}%")

    history = {
        "phase1": {k: [float(v) for v in vals] for k, vals in history1.history.items()},
        "phase2": {k: [float(v) for v in vals] for k, vals in history2.history.items()},
        "test_accuracy": float(test_accuracy),
        "test_loss": float(test_loss),
        "class_names": class_names,
    }

    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4)


if __name__ == "__main__":
    train()
