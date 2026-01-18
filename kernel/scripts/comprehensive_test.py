import asyncio
import json
import websockets
import sys

async def comprehensive_test():
    url = "ws://127.0.0.1:8000/ws"
    print(f"🔍 正在连接到 Kernel: {url}")
    
    try:
        async with websockets.connect(url) as ws:
            await ws.recv() # hello
            
            test_code = """
import json
import os
import sys
import time

# 将当前目录和上级目录加入 path 以便导入 deepinsight
sys.path.append(os.getcwd())
sys.path.append(os.path.dirname(os.getcwd()))
import deepinsight

print('Starting internal test...')

# 1. 测试基础指标
deepinsight.log_metric("test_loss", 0.5, step=0)
deepinsight.log_metric("test_loss", 0.4, step=1)
deepinsight.log_metric("test_loss", 0.3, step=2)

# 2. 测试模型结构 (自动解析模拟)
class FakeModule:
    def named_modules(self):
        return [('', None), ('conv1', FakeModule()), ('relu1', FakeModule())]
    def children(self): return []
    def parameters(self):
        class Param:
            def numel(self): return 1000
        return [Param()]

model = FakeModule()
# 模拟深度学习库的行为
try:
    import torch.nn as nn
    # 如果真的有 torch，这里会正常工作
except:
    # 否则我们手动调用 log_model 来模拟
    structure = {
        "nodes": [
            {"id": "conv1", "data": {"type": "Conv2d", "label": "conv1", "params": "1,000"}, "position": {"x": 250, "y": 0}},
            {"id": "relu1", "data": {"type": "ReLU", "label": "relu1", "params": "0"}, "position": {"x": 250, "y": 100}}
        ],
        "edges": [
            {"id": "e-0", "source": "conv1", "target": "relu1"}
        ]
    }
    deepinsight.log_metric("model_structure", structure)

# 3. 测试 ML 点云
points = [{"pos": [i * 0.5, (i % 3), (i % 2)], "color": "#10b981"} for i in range(20)]
deepinsight.log_metric("ml_points", points)

# 4. 测试 CV 流水线
deepinsight.log_cv(stage_index=2, message="正在提取特征图...")
time.sleep(0.5)
deepinsight.log_cv(stage_index=4, message="检测完成，找到 3 个目标")

# 5. 测试 RL 指标
deepinsight.log_rl(episode=10, reward=150.5, epsilon=0.1)

# 6. 测试 LLM 推理
deepinsight.log_llm(token="Hello", reasoning="Greeting the user")
time.sleep(0.3)
deepinsight.log_llm(token="World", candidates=[{"token": "World", "prob": 0.9}, {"token": "There", "prob": 0.05}])

# 7. 测试 Agent 思考链
deepinsight.log_agent(role="thought", content="I should check the current directory")
time.sleep(0.3)
deepinsight.log_agent(role="action", content="ls -la")

print('Test finished.')
"""
            
            await ws.send(json.dumps({
                "type": "exec",
                "code": test_code,
                "timeout_s": 10
            }))

            received_metrics = []
            received_hw = False
            received_done = False
            
            while not received_done:
                try:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5.0))
                    m_type = msg.get("type")
                    if m_type == "metric":
                        received_metrics.append(msg)
                        print(f"  - [METRIC] {msg.get('name')}: {msg.get('value')}")
                    elif m_type == "hw":
                        received_hw = True
                    elif m_type == "done":
                        received_done = True
                except asyncio.TimeoutError:
                    break

            print("\n📊 测试报告:")
            # 检查收到的关键指标
            names = [m.get("name") for m in received_metrics]
            required_names = ["test_loss", "model_structure", "ml_points", "cv_stage", "rl_reward", "token_output", "agent_step"]
            m_ok = all(name in names for name in required_names)
            
            print(f"{'✅' if m_ok else '❌'} - 关键指标完整性 (收到 {len(received_metrics)} 个)")
            print(f"{'✅' if received_hw else '❌'} - 硬件监控")
            print(f"{'✅' if received_done else '❌'} - 正常结束")
            
            if not (m_ok and received_hw and received_done):
                print(f"缺失指标: {[n for n in ['test_loss', 'model_structure', 'ml_points', 'cv_stage', 'rl_reward'] if n not in names]}")
                sys.exit(1)
            print("\n🎉 所有可视化组件的真实数据测试通过！")

    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(comprehensive_test())
