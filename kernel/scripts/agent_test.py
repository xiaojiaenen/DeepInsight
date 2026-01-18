import asyncio
import json
import websockets
import sys

async def agent_test():
    url = "ws://127.0.0.1:8000/ws"
    print(f"🔍 正在连接到 Kernel: {url}")
    
    try:
        async with websockets.connect(url) as ws:
            await ws.recv() # hello
            
            workflow_data = {
                "nodes": [
                    { 
                        "id": "input", 
                        "type": "agent",
                        "data": { 
                            "role": "input", 
                            "content": "用户：帮我分析这段代码的潜在问题",
                            "source": { "path": "main.py", "lineNumber": 1 }
                        }, 
                        "position": { "x": 200, "y": 0 } 
                    },
                    { 
                        "id": "thought1", 
                        "type": "agent",
                        "data": { 
                            "role": "thought", 
                            "content": "首先阅读 main.py 中的代码逻辑，寻找常见的安全隐患或逻辑漏洞。",
                            "source": { "path": "agent.py", "lineNumber": 42 }
                        }, 
                        "position": { "x": 200, "y": 100 } 
                    },
                    { 
                        "id": "action1", 
                        "type": "agent",
                        "data": { 
                            "role": "action", 
                            "content": "执行静态扫描工具...",
                            "source": { "path": "tools/scanner.py", "lineNumber": 15 }
                        }, 
                        "position": { "x": 50, "y": 200 } 
                    },
                    { 
                        "id": "obs1", 
                        "type": "agent",
                        "data": { 
                            "role": "observation", 
                            "content": "扫描结果：发现 2 处未处理的异常和 1 处可能的 SQL 注入点。",
                            "source": { "path": "tools/scanner.py", "lineNumber": 88 }
                        }, 
                        "position": { "x": 50, "y": 300 } 
                    }
                ],
                "edges": [
                    { "id": "e1-2", "source": "input", "target": "thought1", "animated": True },
                    { "id": "e2-3", "source": "thought1", "target": "action1", "animated": True, "label": "推理" },
                    { "id": "e3-4", "source": "action1", "target": "obs1", "animated": True, "label": "执行" }
                ]
            }
            
            workflow_json = json.dumps(workflow_data)
            
            # 使用 raw string 或者直接拼接来避免 f-string 嵌套问题
            test_code = """
import json
import time

def send_metric(m_name, m_value, m_step):
    print(f'__METRIC__ {{"name": "{m_name}", "value": {json.dumps(m_value)}, "step": {m_step}}}')

print('Agent Workflow Test Started...')
""" + f"workflow_data = {repr(workflow_json)}" + """
send_metric('agent_workflow', workflow_data, 0)
time.sleep(1)
print('Agent Workflow Test Finished.')
"""
            
            await ws.send(json.dumps({
                "type": "exec",
                "code": test_code,
                "timeout_s": 10
            }))

            received_done = False
            while not received_done:
                try:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5.0))
                    if msg.get("type") == "done":
                        received_done = True
                    elif msg.get("type") == "metric":
                        print(f"  - [METRIC] {msg.get('name')}")
                except asyncio.TimeoutError:
                    break

            print("\n🎉 测试完成！")

    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(agent_test())
