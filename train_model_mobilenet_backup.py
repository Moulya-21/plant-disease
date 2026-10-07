import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

# ============================================================
# 1. SETTINGS
# ============================================================

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42

TRAIN_DIR = "dataset/train"
VAL_DIR = "dataset/validation"
TEST_DIR = "dataset/test"

MODEL_DIR = "model"
os.makedirs(MODEL_DIR, exist_ok=True)

BEST_MODEL_PATH = os.path.join(
    MODEL_DIR, "mobilenetv2_finetuned_best.keras"
)

HISTORY_PATH = os.path.join(
    MODEL_DIR, "training_history.json"
)

# ============================================================
# 2. LOAD DATASETS
# ============================================================

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
# 3. CLASS NAMES
# ============================================================

class_names = train_ds.class_names
num_classes = len(class_names)

print("\n========================================")
print("DATASET INFORMATION")
print("========================================")
print("Number of classes:", num_classes)
print("Number of training images:", 37997)
print("Number of validation images:", 8146)
print("Number of test images:", 8162)

if num_classes != 38:
    raise ValueError(
        f"Expected 38 classes, but found {num_classes}"
    )

print("\nClasses:")
for i, name in enumerate(class_names):
    print(f"{i}: {name}")

# Save class names
with open(
    os.path.join(MODEL_DIR, "class_names.json"),
    "w",
    encoding="utf-8"
) as f:
    json.dump(class_names, f, indent=4)

# ============================================================
# 4. PERFORMANCE SETTINGS
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)
test_ds = test_ds.prefetch(AUTOTUNE)

# ============================================================
# 5. DATA AUGMENTATION
# ============================================================

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1),
], name="data_augmentation")

# ============================================================
# 6. MOBILE NET V2 BASE MODEL
# ============================================================

print("\nLoading MobileNetV2...")

base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet"
)

# Freeze base model initially
base_model.trainable = False

# ============================================================
# 7. BUILD MODEL
# ============================================================

inputs = layers.Input(shape=(224, 224, 3))

x = layers.Rescaling(
    1.0 / 127.5,
    offset=-1
)(inputs)

x = data_augmentation(x)

x = base_model(
    x,
    training=False
)

x = layers.GlobalAveragePooling2D()(x)

x = layers.Dropout(0.3)(x)

x = layers.Dense(
    128,
    activation="relu"
)(x)

x = layers.Dropout(0.3)(x)

outputs = layers.Dense(
    num_classes,
    activation="softmax"
)(x)

model = models.Model(
    inputs,
    outputs,
    name="Plant_Disease_MobileNetV2"
)

# ============================================================
# 8. COMPILE MODEL
# ============================================================

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=1e-4
    ),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

print("\n========================================")
print("MODEL SUMMARY")
print("========================================")

model.summary()

# ============================================================
# 9. CALLBACKS
# ============================================================

checkpoint = ModelCheckpoint(
    BEST_MODEL_PATH,
    monitor="val_accuracy",
    save_best_only=True,
    mode="max",
    verbose=1
)

early_stopping = EarlyStopping(
    monitor="val_accuracy",
    patience=3,
    mode="max",
    restore_best_weights=True,
    verbose=1
)

reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.2,
    patience=2,
    min_lr=1e-7,
    verbose=1
)

# ============================================================
# 10. INITIAL TRAINING
# ============================================================

print("\n========================================")
print("PHASE 1: TRANSFER LEARNING")
print("========================================")

history1 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10,
    callbacks=[
        checkpoint,
        early_stopping,
        reduce_lr
    ]
)

# ============================================================
# 11. FINE-TUNING
# ============================================================

print("\n========================================")
print("PHASE 2: FINE-TUNING")
print("========================================")

base_model.trainable = True

# Freeze all except the last 30 layers
for layer in base_model.layers[:-30]:
    layer.trainable = False

# Keep BatchNormalization layers frozen
for layer in base_model.layers:
    if isinstance(layer, layers.BatchNormalization):
        layer.trainable = False

# Recompile with lower learning rate
model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=1e-5
    ),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

history2 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10,
    callbacks=[
        checkpoint,
        early_stopping,
        reduce_lr
    ]
)

# ============================================================
# 12. LOAD BEST MODEL
# ============================================================

print("\n========================================")
print("LOADING BEST MODEL")
print("========================================")

best_model = tf.keras.models.load_model(
    BEST_MODEL_PATH
)

# ============================================================
# 13. FINAL TEST EVALUATION
# ============================================================

print("\n========================================")
print("FINAL TEST EVALUATION")
print("========================================")

test_loss, test_accuracy = best_model.evaluate(
    test_ds,
    verbose=1
)

print("\n========================================")
print("FINAL RESULTS")
print("========================================")
print(f"Test Loss     : {test_loss:.4f}")
print(f"Test Accuracy : {test_accuracy * 100:.2f}%")

# ============================================================
# 14. SAVE TRAINING HISTORY
# ============================================================

history = {
    "phase1": {
        key: [float(value) for value in values]
        for key, values in history1.history.items()
    },
    "phase2": {
        key: [float(value) for value in values]
        for key, values in history2.history.items()
    },
    "test_accuracy": float(test_accuracy),
    "test_loss": float(test_loss),
    "class_names": class_names
}

with open(
    HISTORY_PATH,
    "w",
    encoding="utf-8"
) as f:
    json.dump(history, f, indent=4)

print("\nTraining history saved to:")
print(HISTORY_PATH)

print("\nBest model saved to:")
print(BEST_MODEL_PATH)

print("\n========================================")
print("TRAINING COMPLETED SUCCESSFULLY")
print("========================================")