import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import (
    ModelCheckpoint,
    EarlyStopping,
    ReduceLROnPlateau
)

# ============================================================
# SETTINGS
# ============================================================

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42

TRAIN_DIR = "dataset/train"
VAL_DIR = "dataset/validation"
TEST_DIR = "dataset/test"

MODEL_DIR = "model"
RESULTS_DIR = "results"

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "custom_cnn_best.keras"
)

HISTORY_PATH = os.path.join(
    MODEL_DIR,
    "custom_cnn_training_history.json"
)

CLASS_NAMES_PATH = os.path.join(
    MODEL_DIR,
    "class_names.json"
)

# ============================================================
# LOAD DATASET
# ============================================================

print("\n========================================")
print("LOADING DATASET")
print("========================================")

print("\nLoading training dataset...")

train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    seed=SEED
)

print("\nLoading validation dataset...")

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

print("\nLoading test dataset...")

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

# ============================================================
# CLASS INFORMATION
# ============================================================

class_names = train_ds.class_names
num_classes = len(class_names)

print("\n========================================")
print("DATASET INFORMATION")
print("========================================")

print("Number of classes:", num_classes)
print("Training images: 37997")
print("Validation images: 8146")
print("Test images: 8162")

if num_classes != 38:
    raise ValueError(
        f"Expected 38 classes, but found {num_classes}"
    )

print("\nClasses:")

for i, name in enumerate(class_names):
    print(f"{i}: {name}")

# Save class names
with open(
    CLASS_NAMES_PATH,
    "w",
    encoding="utf-8"
) as f:
    json.dump(class_names, f, indent=4)

# ============================================================
# PERFORMANCE
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)
test_ds = test_ds.prefetch(AUTOTUNE)

# ============================================================
# DATA AUGMENTATION
# ============================================================

data_augmentation = tf.keras.Sequential(
    [
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.2),
        layers.RandomTranslation(
            height_factor=0.1,
            width_factor=0.1
        ),
    ],
    name="data_augmentation"
)

# ============================================================
# CUSTOM CNN MODEL
# ============================================================

print("\n========================================")
print("BUILDING CUSTOM CNN MODEL")
print("========================================")

model = models.Sequential(
    [

        # Input
        layers.Input(
            shape=(224, 224, 3)
        ),

        # Data augmentation
        data_augmentation,

        # Normalization
        layers.Rescaling(
            1.0 / 255
        ),

        # ====================================================
        # CNN BLOCK 1
        # ====================================================

        layers.Conv2D(
            32,
            (3, 3),
            padding="same",
            activation="relu"
        ),

        layers.BatchNormalization(),

        layers.MaxPooling2D(
            (2, 2)
        ),

        # ====================================================
        # CNN BLOCK 2
        # ====================================================

        layers.Conv2D(
            64,
            (3, 3),
            padding="same",
            activation="relu"
        ),

        layers.BatchNormalization(),

        layers.MaxPooling2D(
            (2, 2)
        ),

        # ====================================================
        # CNN BLOCK 3
        # ====================================================

        layers.Conv2D(
            128,
            (3, 3),
            padding="same",
            activation="relu"
        ),

        layers.BatchNormalization(),

        layers.MaxPooling2D(
            (2, 2)
        ),

        # ====================================================
        # CLASSIFICATION LAYERS
        # ====================================================

        layers.Flatten(),

        layers.Dense(
            512,
            activation="relu"
        ),

        # Dropout 0.5
        layers.Dropout(
            0.5
        ),

        # Output layer
        layers.Dense(
            num_classes,
            activation="softmax"
        )
    ],
    name="Plant_Disease_Custom_CNN"
)

# ============================================================
# COMPILE MODEL
# ============================================================

model.compile(

    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.001
    ),

    loss="sparse_categorical_crossentropy",

    metrics=[
        "accuracy"
    ]
)

# ============================================================
# MODEL SUMMARY
# ============================================================

print("\n========================================")
print("MODEL SUMMARY")
print("========================================")

model.summary()

# ============================================================
# CALLBACKS
# ============================================================

checkpoint = ModelCheckpoint(

    MODEL_PATH,

    monitor="val_accuracy",

    save_best_only=True,

    mode="max",

    verbose=1
)

early_stopping = EarlyStopping(

    monitor="val_accuracy",

    patience=7,

    mode="max",

    restore_best_weights=True,

    verbose=1
)

reduce_lr = ReduceLROnPlateau(

    monitor="val_loss",

    factor=0.2,

    patience=3,

    min_lr=1e-7,

    verbose=1
)

# ============================================================
# TRAIN MODEL
# ============================================================

print("\n========================================")
print("STARTING CUSTOM CNN TRAINING")
print("========================================")

history = model.fit(

    train_ds,

    validation_data=val_ds,

    epochs=50,

    callbacks=[
        checkpoint,
        early_stopping,
        reduce_lr
    ]
)

# ============================================================
# LOAD BEST MODEL
# ============================================================

print("\n========================================")
print("LOADING BEST MODEL")
print("========================================")

best_model = tf.keras.models.load_model(
    MODEL_PATH
)

# ============================================================
# TEST EVALUATION
# ============================================================

print("\n========================================")
print("FINAL TEST EVALUATION")
print("========================================")

test_loss, test_accuracy = best_model.evaluate(
    test_ds,
    verbose=1
)

# ============================================================
# FINAL RESULTS
# ============================================================

print("\n========================================")
print("FINAL RESULTS")
print("========================================")

print(
    f"Test Loss     : {test_loss:.4f}"
)

print(
    f"Test Accuracy : {test_accuracy * 100:.2f}%"
)

# ============================================================
# SAVE TRAINING HISTORY
# ============================================================

history_data = {

    key: [
        float(value)
        for value in values
    ]

    for key, values in history.history.items()
}

history_data["test_accuracy"] = float(
    test_accuracy
)

history_data["test_loss"] = float(
    test_loss
)

history_data["class_names"] = class_names

with open(
    HISTORY_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        history_data,
        f,
        indent=4
    )

# ============================================================
# COMPLETION
# ============================================================

print("\n========================================")
print("TRAINING COMPLETED")
print("========================================")

print("\nBest model saved at:")

print(MODEL_PATH)

print("\nTraining history saved at:")

print(HISTORY_PATH)

print("\nClass names saved at:")

print(CLASS_NAMES_PATH)