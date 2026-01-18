import json
import sys
import time
import os

def log_metric(name, value, step=0):
    """手动记录指标，统一格式输出给前端"""
    # 处理复杂类型
    if hasattr(value, 'tolist'): # numpy or torch
        value = value.tolist()
    
    print(f'__METRIC__ {json.dumps({"name": name, "value": value, "step": step})}')

def log_model(model):
    """自动解析 PyTorch 模型结构并记录"""
    try:
        import torch.nn as nn
        if not isinstance(model, nn.Module):
            return

        nodes = []
        edges = []
        
        # 简单的层解析
        for name, module in model.named_modules():
            if name == '': continue # skip root
            
            # 仅记录基础层
            if len(list(module.children())) == 0:
                nodes.append({
                    "id": name,
                    "type": "layer",
                    "data": {
                        "type": type(module).__name__,
                        "label": name,
                        "params": f"{sum(p.numel() for p in module.parameters()):,}"
                    },
                    "position": {"x": 250, "y": len(nodes) * 100}
                })
                
                # 简单的线性连接假设 (如果是 Sequential)
                if len(nodes) > 1:
                    edges.append({
                        "id": f"e-{len(edges)}",
                        "source": nodes[-2]["id"],
                        "target": nodes[-1]["id"]
                    })
        
        log_metric("model_structure", {"nodes": nodes, "edges": edges})
    except ImportError:
        pass

def watch(obj, name=None):
    """通用监控函数：支持模型、张量、数据集等"""
    if obj is None: return
    
    # 1. 自动探测框架
    # 检查是否为 PyTorch 模型
    try:
        import torch.nn as nn
        import torch
        if isinstance(obj, nn.Module):
            print("DeepInsight: Detected PyTorch Model. Extracting structure...")
            return log_model(obj)
        if isinstance(obj, torch.Tensor):
            if torch.isnan(obj).any():
                print(f"⚠️ DeepInsight Warning: NaN detected in tensor {name or ''}!")
            return log_metric(name or "tensor", obj.detach().cpu().numpy())
    except ImportError:
        pass

    # 检查是否为 Numpy 数组或类似结构 (用于 ML 可视化)
    try:
        import numpy as np
        if isinstance(obj, (list, np.ndarray)):
            arr = np.array(obj)
            if arr.ndim == 2 and arr.shape[1] >= 2:
                # 提取前 3 维用于 3D 可视化
                points = []
                for row in arr[:500]: # 最多 500 点
                    pos = row[:3].tolist()
                    if len(pos) < 3: pos.extend([0] * (3 - len(pos)))
                    points.append({"pos": pos})
                return log_metric("ml_points", points)
    except ImportError:
        if isinstance(obj, list) and len(obj) > 0 and isinstance(obj[0], list):
             points = [{"pos": (row[:3] + [0]*3)[:3]} for row in obj[:500]]
             return log_metric("ml_points", points)

    # 2. 普通指标
    if isinstance(obj, (int, float, str, dict, list)):
        log_metric(name or "data", obj)

def log_cv(stage_index, message="", image_path=None):
    """记录 CV 流水线状态"""
    log_metric("cv_stage", stage_index)
    if message:
        log_metric("cv_message", message)
    if image_path:
        log_metric("cv_image", image_path)

def log_rl(episode=None, reward=None, epsilon=None, steps=None, pos=None):
    """记录强化学习指标"""
    if episode is not None: log_metric("rl_episode", episode)
    if reward is not None: log_metric("rl_reward", reward)
    if epsilon is not None: log_metric("rl_epsilon", epsilon)
    if steps is not None: log_metric("rl_steps", steps)
    if pos is not None: log_metric("rl_pos", pos)

def log_llm(token=None, candidates=None, reasoning=None):
    """记录 LLM 生成过程"""
    if token is not None: log_metric("token_output", token)
    if candidates is not None: log_metric("token_candidates", json.dumps(candidates))
    if reasoning is not None: log_metric("token_reasoning", reasoning)

def log_agent(role, content, source=None):
    """记录 Agent 思考链"""
    log_metric("agent_step", {
        "role": role, # thought, action, observation, input, output
        "content": content,
        "source": source # {"path": "xxx.py", "lineNumber": 10}
    })

def check_health(model):
    """检查模型参数和梯度是否健康 (NaN/Inf)"""
    try:
        import torch
        for name, param in model.named_parameters():
            if torch.isnan(param).any() or torch.isinf(param).any():
                print(f"❌ DeepInsight Health Check: {name} contains NaN or Inf!")
            if param.grad is not None:
                if torch.isnan(param.grad).any():
                    print(f"❌ DeepInsight Health Check: {name}.grad contains NaN!")
    except ImportError:
        pass

def autolog():
    """尝试自动捕获常见框架的训练指标"""
    print("DeepInsight: Autologging enabled.")
    # 通过 GC 查找内存中的对象
    try:
        import gc
        import torch.nn as nn
        for obj in gc.get_objects():
            if isinstance(obj, nn.Module):
                watch(obj)
                break
    except:
        pass
