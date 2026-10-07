import json
import os
from pathlib import Path
from typing import Any

import numpy as np
import tensorflow as tf
from PIL import Image

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "model" / "custom_cnn_best.keras"
CLASS_NAMES_PATH = BASE_DIR / "model" / "class_names.json"


class ModelService:
    def __init__(self) -> None:
        self.model = self._load_model()
        self.class_names = self._load_class_names()
        self.last_conv_layer = "conv2d_2"
        if len(self.class_names) != 38:
            raise RuntimeError(f"Expected 38 classes, found {len(self.class_names)}")

    def _load_model(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
        return tf.keras.models.load_model(MODEL_PATH, compile=False)

    def _load_class_names(self) -> list[str]:
        with CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)

    @staticmethod
    def _format_class(name: str) -> str:
        return name.replace("___", " - ").replace("_", " ")

    def predict(self, image_bytes: bytes) -> dict[str, Any]:
        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            image = source.convert("RGB").resize((224, 224))
            image_array = np.asarray(image, dtype=np.float32)

        batch = np.expand_dims(image_array, axis=0)
        predictions = self.model.predict(batch, verbose=0)[0]
        probabilities = np.asarray(predictions, dtype=np.float32)
        probability_values = probabilities / float(np.sum(probabilities))
        indices = np.argsort(probability_values)[::-1]
        top_indices = indices[:3]

        all_predictions = [
            {
                "class_name": self._format_class(self.class_names[index]),
                "confidence": float(probability_values[index]),
            }
            for index in indices
        ]
        top_predictions = [all_predictions[index] for index in range(3)]
        best_index = int(indices[0])
        return {
            "prediction": {
                "class_name": self._format_class(self.class_names[best_index]),
                "confidence": float(probability_values[best_index]),
            },
            "top_predictions": top_predictions,
            "all_predictions": all_predictions,
            "model": "custom_cnn_best",
            "input_size": 224,
        }

    def generate_gradcam(self, image_bytes: bytes) -> tuple[bytes, dict[str, Any]]:
        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            image = source.convert("RGB").resize((224, 224))
            original = np.asarray(image, dtype=np.uint8)

        image_array = np.expand_dims(np.asarray(image, dtype=np.float32), axis=0)
        conv_layers = []
        classifier_layers = []
        found_conv = False
        for layer in self.model.layers:
            if not found_conv:
                conv_layers.append(layer)
                if layer.name == self.last_conv_layer:
                    found_conv = True
            else:
                classifier_layers.append(layer)

        with tf.GradientTape() as tape:
            x = tf.cast(image_array, tf.float32)
            for layer in conv_layers:
                x = layer(x, training=False)
            conv_output = x
            tape.watch(conv_output)
            y = conv_output
            for layer in classifier_layers:
                y = layer(y, training=False)
            predictions = y
            predicted_index = int(tf.argmax(predictions[0]))
            class_channel = predictions[:, predicted_index]

        gradients = tape.gradient(class_channel, conv_output)
        pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
        heatmap = tf.squeeze(conv_output[0] @ pooled_gradients[..., tf.newaxis])
        heatmap = tf.maximum(heatmap, 0)
        max_value = tf.math.reduce_max(heatmap)
        if max_value > 0:
            heatmap = heatmap / max_value

        heatmap_numpy = np.asarray(heatmap, dtype=np.float32)
        heatmap_uint8 = np.clip((heatmap_numpy * 255).astype(np.uint8), 0, 255)
        heatmap_image = Image.fromarray(heatmap_uint8, mode="L").resize(
            (224, 224), Image.Resampling.BILINEAR
        )
        overlay = Image.blend(Image.fromarray(original), heatmap_image.convert("RGB"), 0.45)
        from io import BytesIO
        buffer = BytesIO()
        overlay.save(buffer, format="PNG")
        return buffer.getvalue(), self.predict(image_bytes)
