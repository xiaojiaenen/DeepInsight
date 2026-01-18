import React from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType,
  Handle,
  Position,
  type Node, 
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { editorOpenFile } from '../../lib/editorBus';

const AgentNode = ({ data }: { data: any }) => (
  <div 
    className={`px-4 py-3 shadow-lg rounded-xl bg-white border-2 min-w-[150px] cursor-pointer hover:shadow-xl transition-all ${
      data.role === 'thought' ? 'border-amber-400' : 
      data.role === 'action' ? 'border-blue-500' : 
      'border-emerald-500'
    }`}
    onClick={() => {
      if (data.source) {
        editorOpenFile(data.source);
      }
    }}
  >
    <Handle type="target" position={Position.Top} />
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            data.role === 'thought' ? 'bg-amber-400' : 
            data.role === 'action' ? 'bg-blue-500' : 
            'bg-emerald-500'
          }`} />
          <span className="text-[10px] font-bold uppercase text-slate-400">{data.role}</span>
        </div>
        {data.source && (
          <span className="text-[8px] px-1 bg-slate-50 text-slate-400 rounded border border-slate-100">CODE</span>
        )}
      </div>
      <span className="text-xs font-medium text-slate-800 leading-tight">{data.content}</span>
    </div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const nodeTypes = {
  agent: AgentNode,
};

export const AgentVisualizer: React.FC = () => {
  const nodes: Node[] = [
    { 
      id: 'input', 
      type: 'agent',
      data: { 
        role: 'input', 
        content: '用户：写一段贪吃蛇代码',
        source: { path: 'agent_logs.json', lineNumber: 1 }
      }, 
      position: { x: 200, y: 0 } 
    },
    { 
      id: 'thought1', 
      type: 'agent',
      data: { 
        role: 'thought', 
        content: '需要使用 Python pygame 库。首先初始化游戏窗口。',
        source: { path: 'agent_logic.py', lineNumber: 42 }
      }, 
      position: { x: 200, y: 100 } 
    },
    { 
      id: 'action1', 
      type: 'agent',
      data: { 
        role: 'action', 
        content: '调用搜索工具：pygame 基础模板',
        source: { path: 'tools/search.py', lineNumber: 15 }
      }, 
      position: { x: 50, y: 200 } 
    },
    { 
      id: 'obs1', 
      type: 'agent',
      data: { 
        role: 'observation', 
        content: '搜索结果：找到 pygame.init() 和循环模板',
        source: { path: 'tools/search.py', lineNumber: 88 }
      }, 
      position: { x: 50, y: 300 } 
    },
    { 
      id: 'thought2', 
      type: 'agent',
      data: { 
        role: 'thought', 
        content: '基于模板编写代码逻辑，包括蛇身移动和碰撞检测。',
        source: { path: 'agent_logic.py', lineNumber: 105 }
      }, 
      position: { x: 200, y: 400 } 
    },
    { 
      id: 'output', 
      type: 'agent',
      data: { 
        role: 'output', 
        content: '已生成代码。点击下方查看。',
        source: { path: 'snake.py', lineNumber: 1 }
      }, 
      position: { x: 200, y: 500 } 
    },
  ];

  const edges: Edge[] = [
    { id: 'e1-2', source: 'input', target: 'thought1', animated: true },
    { id: 'e2-3', source: 'thought1', target: 'action1', animated: true, label: '推理' },
    { id: 'e3-4', source: 'action1', target: 'obs1', animated: true, label: '执行' },
    { id: 'e4-5', source: 'obs1', target: 'thought2', animated: true, label: '观察' },
    { id: 'e5-6', source: 'thought2', target: 'output', animated: true, label: '完成' },
  ];

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};
