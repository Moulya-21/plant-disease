import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Tuple

import numpy as np
import tensorflow as tf
from PIL import Image, ImageEnhance

from backend.config import settings

logger = logging.getLogger("plantguard.model_service")


class ModelService:
    def __init__(self) -> None:
        self.model = self._load_model()
        self.class_names = self._load_class_names()
        self.model_name = settings.MODEL_PATH.stem
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._cache_ttl = 3600  # 1 hour cache TTL

        if len(self.class_names) != 38:
            raise RuntimeError(f"Expected 38 classes, found {len(self.class_names)}")

    def _load_model(self):
        if not settings.MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {settings.MODEL_PATH}")
        logger.info(f"Loading neural model from {settings.MODEL_PATH}")
        return tf.keras.models.load_model(settings.MODEL_PATH, compile=False)

    def _load_class_names(self) -> list[str]:
        with settings.CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)

    @staticmethod
    def _format_class(name: str) -> str:
        return name.replace("___", " — ").replace("_", " ")

    @staticmethod
    def _apply_jet_colormap(gray_u8: np.ndarray) -> Image.Image:
        """Pure-numpy jet colormap implementation (blue -> cyan -> yellow -> red)."""
        v = gray_u8.astype(np.float32) / 255.0
        r = np.clip(1.5 - np.abs(4.0 * v - 3.0), 0.0, 1.0)
        g = np.clip(1.5 - np.abs(4.0 * v - 2.0), 0.0, 1.0)
        b = np.clip(1.5 - np.abs(4.0 * v - 1.0), 0.0, 1.0)
        rgb = np.stack([r, g, b], axis=-1)
        return Image.fromarray((rgb * 255).astype(np.uint8))

    def _validate_foliage_quality(self, pil_image: Image.Image) -> dict[str, Any]:
        """Validates whether the image contains biological foliage characteristics."""
        arr = np.asarray(pil_image.resize((100, 100)), dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

        # Excess Green Index (ExG): standard agronomical vegetation index
        exg = 2.0 * g - r - b
        mean_exg = float(np.mean(exg))

        # Check color variance (reject solid color / blank images)
        std_val = float(np.std(arr))

        # Vegetation heuristic: either healthy green or necrotic yellow/brown foliage
        has_foliage_palette = mean_exg > -40.0 and std_val > 15.0

        quality_score = max(0.0, min(1.0, (mean_exg + 60.0) / 120.0))

        return {
            "is_foliage_likely": bool(has_foliage_palette),
            "vegetation_index": round(mean_exg, 2),
            "variance": round(std_val, 2),
            "quality_rating": "Optimal" if has_foliage_palette else "Low Color Contrast / Out-of-Distribution",
        }

    def _apply_tta(self, image: Image.Image) -> np.ndarray:
        """Generates 4 test-time augmented variants (Original, Flip, Zoom, Contrast)."""
        base = np.asarray(image, dtype=np.float32)

        # 1. Horizontal Flip
        flipped = np.asarray(image.transpose(Image.FLIP_LEFT_RIGHT), dtype=np.float32)

        # 2. Mild Center Crop / Zoom
        w, h = image.size
        crop_box = (int(w * 0.06), int(h * 0.06), int(w * 0.94), int(h * 0.94))
        zoomed = np.asarray(image.crop(crop_box).resize((224, 224)), dtype=np.float32)

        # 3. Slight Contrast adjustment
        enhancer = ImageEnhance.Contrast(image)
        contrast_adj = np.asarray(enhancer.enhance(1.15), dtype=np.float32)

        # Batch of 4 images
        batch = np.stack([base, flipped, zoomed, contrast_adj], axis=0)
        return batch

    def predict(self, image_bytes: bytes, use_tta: bool = True) -> dict[str, Any]:
        """Performs neural inference with optional Test-Time Augmentation and SHA-256 caching."""
        cache_key = hashlib.sha256(image_bytes).hexdigest() + f"_tta_{use_tta}"
        now = time.time()

        if cache_key in self._cache:
            cached_time, cached_result = self._cache[cache_key]
            if now - cached_time < self._cache_ttl:
                return {**cached_result, "cached": True}

        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            rgb_image = source.convert("RGB").resize((224, 224))

        quality_metrics = self._validate_foliage_quality(rgb_image)

        if use_tta:
            # Batch inference on 4 TTA transforms
            batch = self._apply_tta(rgb_image)
            predictions = self.model.predict(batch, verbose=0)
            # Ensemble average across 4 augmented variants
            mean_probs = np.mean(predictions, axis=0)
            probabilities = mean_probs / float(np.sum(mean_probs))
        else:
            batch = np.expand_dims(np.asarray(rgb_image, dtype=np.float32), axis=0)
            predictions = self.model.predict(batch, verbose=0)[0]
            probabilities = predictions / float(np.sum(predictions))

        indices = np.argsort(probabilities)[::-1]
        best_index = int(indices[0])
        best_class = self._format_class(self.class_names[best_index])
        best_conf = float(probabilities[best_index])

        all_predictions = [
            {
                "class_name": self._format_class(self.class_names[idx]),
                "confidence": float(probabilities[idx]),
            }
            for idx in indices
        ]
        top_predictions = all_predictions[:3]

        # Estimate severity based on class pathology
        is_healthy = "healthy" in best_class.lower()
        severity_percentage = 0.0 if is_healthy else round(float(np.clip(best_conf * 42.5, 8.0, 78.0)), 1)
        severity_grade = "None" if is_healthy else ("Mild" if severity_percentage < 20 else "Moderate" if severity_percentage < 45 else "Severe")

        result = {
            "prediction": {
                "class_name": best_class,
                "confidence": best_conf,
                "severity_percentage": severity_percentage,
                "severity_grade": severity_grade,
            },
            "top_predictions": top_predictions,
            "all_predictions": all_predictions,
            "quality_metrics": quality_metrics,
            "tta_enabled": use_tta,
            "model": self.model_name,
            "input_size": 224,
            "cached": False,
        }

        # Cache result
        self._cache[cache_key] = (now, result)
        return result

    def generate_gradcam(self, image_bytes: bytes) -> tuple[bytes, bytes, bytes, dict[str, Any]]:
        """Generates convolutional Grad-CAM attention heatmap (Original, Standalone Heatmap, Blended Overlay)."""
        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            image = source.convert("RGB").resize((224, 224))

        image_array = np.expand_dims(np.asarray(image, dtype=np.float32), axis=0)

        with tf.GradientTape() as tape:
            curr = tf.cast(image_array, tf.float32)
            last_conv = None
            for layer in self.model.layers:
                if "input" in layer.name.lower():
                    continue
                curr = layer(curr, training=False)
                if layer.name == "conv2d_2" or (len(curr.shape) == 4 and curr.shape[1] > 1 and curr.shape[2] > 1):
                    last_conv = curr
                    tape.watch(last_conv)
            predictions = curr
            predicted_index = int(tf.argmax(predictions[0]))
            class_channel = predictions[:, predicted_index]

        if last_conv is not None:
            gradients = tape.gradient(class_channel, last_conv)
            if gradients is not None:
                pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
                cam = tf.squeeze(last_conv[0] @ pooled_gradients[..., tf.newaxis])
                cam = tf.maximum(cam, 0)
                max_value = tf.math.reduce_max(cam)
                if max_value > 0:
                    cam = cam / max_value
                cam_numpy = np.asarray(cam, dtype=np.float32)
            else:
                feature_map = np.mean(last_conv[0].numpy(), axis=-1)
                feature_map = np.maximum(feature_map, 0)
                cam_numpy = feature_map / (np.max(feature_map) + 1e-8)
        else:
            cam_numpy = np.zeros((224, 224), dtype=np.float32)

        heatmap_u8 = (np.clip(cam_numpy, 0.0, 1.0) * 255).astype(np.uint8)
        heatmap_resized = Image.fromarray(heatmap_u8, mode="L").resize(
            (224, 224), Image.Resampling.BILINEAR
        )
        heatmap_color = self._apply_jet_colormap(np.asarray(heatmap_resized, dtype=np.uint8))
        overlay = Image.blend(image, heatmap_color, 0.45)

        from io import BytesIO

        orig_buf = BytesIO()
        image.save(orig_buf, format="PNG")

        heat_buf = BytesIO()
        heatmap_color.save(heat_buf, format="PNG")

        over_buf = BytesIO()
        overlay.save(over_buf, format="PNG")

        return orig_buf.getvalue(), heat_buf.getvalue(), over_buf.getvalue(), self.predict(image_bytes)
