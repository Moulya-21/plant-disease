# Plant Disease Detection

A deep learning-based plant disease classification system that identifies plant diseases from leaf images using a fine-tuned MobileNetV2 model.

## Live Demo

[Try the Plant Disease Detection App](https://plant-disease-detection-9qjmf4bzaddj2sjknafphk.streamlit.app/)

## Project Overview

This project performs multi-class plant disease classification using the PlantVillage dataset.

The dataset contains:

- 38 disease/healthy classes
- 37,997 training images
- 8,146 validation images
- 8,162 test images

The dataset is imbalanced, with significant variation in the number of images across classes.

## Models

Two approaches were evaluated:

### 1. Custom CNN

A CNN model was trained from scratch as a baseline.

**Test Accuracy:** 95.52%

### 2. Fine-tuned MobileNetV2

MobileNetV2 was used as a pretrained feature extractor and later fine-tuned by unfreezing the last 30 layers.

**Test Accuracy:** 97.38%

**Macro F1-Score:** 96.49%

## Model Comparison

| Model | Test Accuracy | Macro F1-Score |
|---|---:|---:|
| Custom CNN | 95.52% | 94.02% |
| Fine-tuned MobileNetV2 | **97.38%** | **96.49%** |

## Features

- 38-class plant disease classification
- Image upload through Streamlit
- Fine-tuned MobileNetV2 model
- Disease prediction with confidence score
- Top-3 predictions
- Low-confidence warning
- Clean Streamlit interface
- Online deployment using Streamlit Community Cloud

## Error Analysis

The fine-tuned model performed strongly across most classes. However, some visually similar diseases remained challenging.

For example, Tomato Early Blight showed relatively lower recall and was frequently confused with:

- Tomato Bacterial Spot
- Tomato Target Spot
- Tomato Late Blight

Fine-tuning significantly reduced several major confusion patterns, particularly among visually similar corn diseases.

## Tech Stack

- Python
- TensorFlow / Keras
- MobileNetV2
- NumPy
- Pillow
- Streamlit
- Scikit-learn
- Matplotlib

## Project Structure

```text
Plant-Disease-Detection/
│
├── notebook/
│   └── Plant_Disease_Detection.ipynb
│
├── model/
│   └── mobilenetv2_finetuned_best.keras
│
├── app.py
├── requirements.txt
├── README.md
└── .gitignore