import time
import random
import math
import os
from deepinsight import log_metric, log_model, watch, log_cv, log_rl, log_llm, log_agent

def test_ml_viz():
    print("--- Testing ML Visualization (3D Points) ---")
    # Simulate some clustering points with different colors
    points = []
    for i in range(100):
        # Two clusters
        if i < 50:
            pos = [random.uniform(0, 5), random.uniform(0, 5), random.uniform(0, 5)]
            color = "#10b981" # Emerald
        else:
            pos = [random.uniform(10, 15), random.uniform(10, 15), random.uniform(10, 15)]
            color = "#3b82f6" # Blue
        points.append({"pos": pos, "color": color})
    
    log_metric("ml_points", points)
    time.sleep(1)

def test_dl_viz():
    print("--- Testing DL Visualization (Loss/Acc & Structure) ---")
    # 1. Simulate a model structure
    # We can use watch(model) if torch is available, otherwise log manually
    try:
        import torch
        import torch.nn as nn
        class SimpleNet(nn.Module):
            def __init__(self):
                super().__init__()
                self.conv1 = nn.Conv2d(1, 10, kernel_size=5)
                self.pool = nn.MaxPool2d(2)
                self.fc1 = nn.Linear(1440, 50)
                self.fc2 = nn.Linear(50, 10)
            def forward(self, x): pass
        
        model = SimpleNet()
        watch(model)
    except ImportError:
        # Fallback manual structure logging if torch not installed
        nodes = [
            {"id": "input", "type": "layer", "data": {"type": "Input", "label": "Input", "params": "0"}, "position": {"x": 250, "y": 0}},
            {"id": "conv1", "type": "layer", "data": {"type": "Conv2d", "label": "Conv1", "params": "260"}, "position": {"x": 250, "y": 100}},
            {"id": "fc1", "type": "layer", "data": {"type": "Linear", "label": "FC1", "params": "72,050"}, "position": {"x": 250, "y": 200}},
            {"id": "fc2", "type": "layer", "data": {"type": "Linear", "label": "FC2", "params": "510"}, "position": {"x": 250, "y": 300}},
        ]
        edges = [
            {"id": "e1", "source": "input", "target": "conv1"},
            {"id": "e2", "source": "conv1", "target": "fc1"},
            {"id": "e3", "source": "fc1", "target": "fc2"},
        ]
        log_metric("model_structure", {"nodes": nodes, "edges": edges})

    # 2. Simulate training metrics
    for step in range(20):
        loss = 2.0 * math.exp(-step/10.0) + random.uniform(0, 0.1)
        acc = 0.5 + 0.4 * (1 - math.exp(-step/5.0)) + random.uniform(0, 0.05)
        log_metric("loss", loss, step=step)
        log_metric("accuracy", acc, step=step)
        time.sleep(0.2)

def test_cv_viz():
    print("--- Testing CV Visualization (Pipeline Stages) ---")
    stages = ["Original", "Grayscale", "Gaussian Blur", "Canny Edges", "Final Detection"]
    for i, stage in enumerate(stages):
        log_cv(i, message=f"Processing stage: {stage}")
        # In a real scenario, you'd save an image and pass the path
        # log_cv(i, image_path="path/to/image.png")
        time.sleep(0.5)

def test_rl_viz():
    print("--- Testing RL Visualization (Rewards & Trajectory) ---")
    for ep in range(10):
        reward = ep * 10 + random.uniform(-5, 5)
        log_rl(episode=ep, reward=reward, epsilon=1.0/(ep+1))
        
        # Simulate an agent moving in 2D
        for step in range(5):
            pos = [step * 2 + random.uniform(-1, 1), math.sin(step) * 5]
            log_rl(pos=pos, steps=step)
            time.sleep(0.1)

def test_llm_viz():
    print("--- Testing LLM Visualization (Token Generation) ---")
    text = "DeepInsight is a powerful tool for visualizing machine learning models and data in real-time."
    tokens = text.split()
    
    for token in tokens:
        # Simulate candidates
        candidates = [
            {"token": token, "prob": 0.8},
            {"token": "alternative", "prob": 0.1},
            {"token": "word", "prob": 0.05}
        ]
        log_llm(token=token + " ", candidates=candidates, reasoning=f"Choosing '{token}' based on context.")
        time.sleep(0.3)

def test_agent_viz():
    print("--- Testing Agent Visualization (Thought Chain) ---")
    steps = [
        ("thought", "I need to analyze the user's request and determine the best approach."),
        ("action", "Searching for relevant data in the local database..."),
        ("observation", "Found 3 matching entries for 'machine learning visualization'."),
        ("thought", "Based on the findings, I will generate a comprehensive test script."),
        ("output", "Here is the test script you requested.")
    ]
    
    for role, content in steps:
        log_agent(role, content)
        time.sleep(0.8)

if __name__ == "__main__":
    print("🚀 Starting DeepInsight Visualization Test...")
    test_ml_viz()
    test_dl_viz()
    test_cv_viz()
    test_rl_viz()
    test_llm_viz()
    test_agent_viz()
    print("✅ All tests completed!")
