import os
import sys

# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import streamlit as st
import numpy as np
import json
import tensorflow as tf
from PIL import Image
import matplotlib
import matplotlib.cm as cm


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Plant Disease Detection",
    page_icon="🌿",
    layout="wide"
)


# ============================================================
# LOGIN CREDENTIALS
# ============================================================

USERNAME = "admin"
PASSWORD = "admin123"


# ============================================================
# LOGIN FUNCTION
# ============================================================

def login_page():
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.title("🌿 Plant Disease Detection")
        st.subheader("🔐 Login")
        st.write("Please login to access the Plant Disease Detection system.")

        username = st.text_input("Username", placeholder="Enter username")
        password = st.text_input("Password", type="password", placeholder="Enter password")

        login_button = st.button("🔓 Login", use_container_width=True)

        if login_button:
            if username == USERNAME and password == PASSWORD:
                st.session_state["logged_in"] = True
                st.success("Login successful!")
                st.rerun()
            else:
                st.error("Invalid username or password.")

        st.divider()
        st.info("Demo Login\n\nUsername: admin\n\nPassword: admin123")


# ============================================================
# SESSION STATE
# ============================================================

if "logged_in" not in st.session_state:
    st.session_state["logged_in"] = False


# ============================================================
# SHOW LOGIN PAGE
# ============================================================

if not st.session_state["logged_in"]:
    login_page()
    st.stop()


# ============================================================
# MODEL & RESOURCE PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "custom_cnn_best.keras")
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "model", "class_names.json")


# ============================================================
# LOAD MODEL & CLASS NAMES
# ============================================================

@st.cache_resource
def load_model():
    model = tf.keras.models.load_model(MODEL_PATH)
    return model


@st.cache_data
def load_class_names():
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        class_names = json.load(f)
    return class_names


try:
    model = load_model()
    class_names = load_class_names()
except Exception as e:
    st.error("Error loading the Custom CNN model or class names.")
    st.exception(e)
    st.stop()


if len(class_names) != 38:
    st.error(f"Expected 38 classes, but found {len(class_names)} classes.")
    st.stop()


# ============================================================
# GRAD-CAM COMPUTATION FUNCTION
# ============================================================

def generate_gradcam(model, img_array, last_conv_layer_name="conv2d_2"):
    """
    Computes a Grad-CAM heatmap for the Custom CNN model.
    Compatible with Keras 3 / TensorFlow 2.21 Sequential models.
    """
    conv_layers = []
    classifier_layers = []
    found_conv = False

    for layer in model.layers:
        if not found_conv:
            conv_layers.append(layer)
            if layer.name == last_conv_layer_name:
                found_conv = True
        else:
            classifier_layers.append(layer)

    with tf.GradientTape() as tape:
        x = tf.cast(img_array, tf.float32)
        for layer in conv_layers:
            x = layer(x, training=False)
        conv_output = x
        tape.watch(conv_output)

        y = conv_output
        for layer in classifier_layers:
            y = layer(y, training=False)
        predictions = y
        pred_index = tf.argmax(predictions[0])
        class_channel = predictions[:, pred_index]

    grads = tape.gradient(class_channel, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_output_val = conv_output[0]

    # Weighted sum of feature maps
    heatmap = conv_output_val @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0)
    max_val = tf.math.reduce_max(heatmap)
    if max_val > 0:
        heatmap = heatmap / max_val

    return heatmap.numpy(), predictions.numpy(), int(pred_index)


def overlay_gradcam(original_image, heatmap, alpha=0.45):
    """
    Overlays the Grad-CAM heatmap onto the original leaf image.
    """
    cmap = matplotlib.colormaps["jet"]
    heatmap_colored = (cmap(heatmap)[:, :, :3] * 255).astype(np.uint8)
    heatmap_pil = Image.fromarray(heatmap_colored).resize(
        original_image.size, Image.Resampling.BILINEAR
    )
    superimposed = Image.blend(original_image, heatmap_pil, alpha=alpha)
    return superimposed, heatmap_pil


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:
    st.header("👤 User Account")
    st.success("Logged in as: admin")

    if st.button("🚪 Logout", use_container_width=True):
        st.session_state["logged_in"] = False
        st.rerun()

    st.divider()
    st.header("🧠 Model Details")
    st.write("**Model:** Custom CNN")
    st.write("**Model File:** `custom_cnn_best.keras`")
    st.write("**Classes:** 38 Plant Categories")
    st.write("**Input Resolution:** 224 × 224 × 3")
    st.write("**Architecture:** 3 Conv Blocks + Dense(512)")
    st.write("**Normalization:** Integrated `Rescaling(1./255)`")
    st.write("**Total Parameters:** ~51.5 Million")
    st.write("**Explainability:** Grad-CAM (`conv2d_2`)")


# ============================================================
# MAIN APPLICATION INTERFACE
# ============================================================

st.title("🌿 Plant Disease Detection & Explainable AI")
st.markdown(
    """
    Upload a leaf image to classify potential diseases using the **Custom CNN** model. 
    The system provides real-time disease diagnosis, prediction confidence, top-3 candidates, 
    and **Grad-CAM visual heatmaps** highlighting the exact leaf regions influencing the network's prediction.
    """
)

st.info("💡 **Test images:** You can test with any leaf image from the `dataset/test/` directory.")

# File uploader
st.subheader("📷 Upload Leaf Image")
uploaded_file = st.file_uploader(
    "Choose a JPG, JPEG, or PNG image",
    type=["jpg", "jpeg", "png"]
)

if uploaded_file is not None:
    try:
        # Load and prepare image
        image = Image.open(uploaded_file).convert("RGB")
        image_resized = image.resize((224, 224))

        # IMPORTANT: Keep raw pixel values in [0, 255].
        # The Custom CNN model internally includes layers.Rescaling(1./255).
        image_array = np.array(image_resized, dtype=np.float32)
        image_batch = np.expand_dims(image_array, axis=0)

        with st.spinner("🔍 Analyzing leaf and generating Grad-CAM explainability map..."):
            heatmap, predictions, predicted_index = generate_gradcam(
                model=model,
                img_array=image_batch,
                last_conv_layer_name="conv2d_2"
            )

        predicted_class = class_names[predicted_index]
        confidence = float(predictions[0][predicted_index]) * 100

        # Format display name
        display_name = (
            predicted_class.replace("___", " - ").replace("_", " ")
        )

        st.divider()

        # Layout: Prediction Results and Visualizations
        col_img, col_cam = st.columns(2)

        with col_img:
            st.subheader("📷 Uploaded Leaf Image")
            st.image(image, caption="Original Input Image", use_container_width=True)

        with col_cam:
            st.subheader("🔥 Grad-CAM Heatmap Overlay")
            superimposed_img, raw_heatmap_img = overlay_gradcam(image, heatmap, alpha=0.45)
            st.image(
                superimposed_img,
                caption="Grad-CAM Activation Map (Warm colors = key regions)",
                use_container_width=True
            )

        st.divider()

        # Diagnosis Result Summary
        res_col1, res_col2 = st.columns([2, 1])

        with res_col1:
            st.subheader("🔍 Prediction Result")
            st.success(f"**Predicted Disease:** {display_name}")
            st.metric("Confidence Score", f"{confidence:.2f}%")
            st.progress(min(int(confidence), 100))

            if confidence < 40:
                st.warning("⚠️ Low confidence prediction. Consider uploading a clearer leaf photo.")
            elif confidence < 70:
                st.info("ℹ️ Moderate confidence prediction.")
            else:
                st.success("✅ High confidence prediction.")

        with res_col2:
            st.subheader("📊 Top 3 Predictions")
            top_3_indices = np.argsort(predictions[0])[-3:][::-1]
            for rank, idx in enumerate(top_3_indices, start=1):
                name = class_names[idx].replace("___", " - ").replace("_", " ")
                prob = float(predictions[0][idx]) * 100
                st.write(f"**{rank}. {name}**")
                st.progress(min(int(prob), 100))
                st.caption(f"Confidence: {prob:.2f}%")

        # Grad-CAM Detail Section
        with st.expander("🔬 Understand the Grad-CAM Heatmap"):
            st.markdown(
                """
                **How Grad-CAM Works:**
                - **Grad-CAM (Gradient-weighted Class Activation Mapping)** calculates the gradients of the predicted class score with respect to the feature maps of the final convolutional layer (`conv2d_2`).
                - **Red & Yellow Regions:** Highlight the specific diseased spots, lesions, or texture variations that most strongly guided the model's classification.
                - **Blue Regions:** Indicate areas of the leaf that had little to no impact on the final decision.
                """
            )
            col_h1, col_h2 = st.columns(2)
            with col_h1:
                st.image(raw_heatmap_img, caption="Raw Activation Heatmap", use_container_width=True)
            with col_h2:
                st.image(superimposed_img, caption="Superimposed Heatmap Overlay", use_container_width=True)

    except Exception as e:
        st.error("An error occurred during prediction.")
        st.exception(e)


# ============================================================
# CUSTOM CNN ARCHITECTURE EXPLANATION
# ============================================================

st.divider()
st.subheader("🧠 Custom CNN Architecture Details")
st.markdown(
    """
    The custom convolutional neural network was trained from scratch to classify plant leaf images across 38 distinct categories.
    """
)

arch_col1, arch_col2 = st.columns([1, 1])

with arch_col1:
    st.code(
        """
Input Image: (224 × 224 × 3)
      │
      ▼
Data Augmentation (Flip, Rotation, Zoom, Translation)
      │
      ▼
Rescaling Layer (1.0 / 255.0)
      │
      ▼
Block 1: Conv2D(32, 3x3) + BatchNorm + MaxPool(2x2)
      │
      ▼
Block 2: Conv2D(64, 3x3) + BatchNorm + MaxPool(2x2)
      │
      ▼
Block 3: Conv2D(128, 3x3) + BatchNorm + MaxPool(2x2)
      │
      ▼
Flatten (100,352 Features)
      │
      ▼
Dense Layer (512 Units, ReLU)
      │
      ▼
Dropout (0.5)
      │
      ▼
Output Dense (38 Classes, Softmax)
        """,
        language="text"
    )

with arch_col2:
    st.markdown(
        """
        ### Architecture Highlights:
        - **Data Augmentation:** Prevents overfitting during training using random flips, rotations, zooms, and translations.
        - **Built-in Rescaling:** Normalizes pixel intensities directly inside the computation graph.
        - **3 Feature Extraction Blocks:** Progressively capture low-level edges (32 filters), textures (64 filters), and complex disease spots (128 filters).
        - **Batch Normalization:** Stabilizes training dynamics and improves convergence.
        - **Fully Connected Head:** High-capacity 512-neuron Dense layer with 50% Dropout regularization leading into a 38-way Softmax output.
        """
    )

# Footer
st.divider()
st.caption("🌿 Plant Disease Detection & Explainable AI | Powered by TensorFlow & Streamlit")