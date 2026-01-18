import React, { useMemo, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType,
  Handle,
  Position,
  type Node, 
  type Edge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { editorOpenFile } from '../../lib/editorBus';

// 自定义节点组件
const LayerNode = ({ data }: { data: any }) => (
  <div 
    className="px-4 py-2 shadow-lg rounded-md bg-white border-2 border-indigo-500 min-w-[120px] cursor-pointer hover:border-indigo-600 hover:shadow-xl transition-all"
    onClick={() => {
      if (data.source) {
        editorOpenFile(data.source);
      }
    }}
  >
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-indigo-500" />
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{data.type}</span>
        {data.source && (
          <span className="text-[8px] px-1 bg-indigo-50 text-indigo-400 rounded border border-indigo-100">CODE</span>
        )}
      </div>
      <span className="text-xs font-semibold text-slate-800">{data.label}</span>
      {data.params && (
        <span className="text-[9px] text-slate-400 mt-1">Params: {data.params}</span>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-indigo-500" />
  </div>
);

const nodeTypes = {
  layer: LayerNode,
};

export const DLVisualizer: React.FC = () => {
  const initialNodes: Node[] = [
    { 
      id: 'input', 
      type: 'layer',
      data: { 
        type: 'Input', 
        label: 'Image (224x224x3)', 
        params: '-',
        source: { path: 'model.py', lineNumber: 10 }
      }, 
      position: { x: 250, y: 0 } 
    },
    { 
      id: 'conv1', 
      type: 'layer',
      data: { 
        type: 'Conv2D', 
        label: '32 filters, 3x3', 
        params: '896',
        source: { path: 'model.py', lineNumber: 15 }
      }, 
      position: { x: 250, y: 100 } 
    },
    { 
      id: 'pool1', 
      type: 'layer',
      data: { 
        type: 'MaxPool', 
        label: '2x2 stride 2', 
        params: '0',
        source: { path: 'model.py', lineNumber: 16 }
      }, 
      position: { x: 250, y: 200 } 
    },
    { 
      id: 'flatten', 
      type: 'layer',
      data: { 
        type: 'Flatten', 
        label: 'Vector (12544)', 
        params: '0',
        source: { path: 'model.py', lineNumber: 20 }
      }, 
      position: { x: 250, y: 300 } 
    },
    { 
      id: 'dense1', 
      type: 'layer',
      data: { 
        type: 'Dense', 
        label: '128 units, ReLU', 
        params: '1.6M',
        source: { path: 'model.py', lineNumber: 22 }
      }, 
      position: { x: 250, y: 400 } 
    },
    { 
      id: 'output', 
      type: 'layer',
      data: { 
        type: 'Output', 
        label: 'Softmax (10)', 
        params: '1.2K',
        source: { path: 'model.py', lineNumber: 24 }
      }, 
      position: { x: 250, y: 500 } 
    },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'input', target: 'conv1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } },
    { id: 'e2-3', source: 'conv1', target: 'pool1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } },
    { id: 'e3-4', source: 'pool1', target: 'flatten', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } },
    { id: 'e4-5', source: 'flatten', target: 'dense1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } },
    { id: 'e5-6', source: 'dense1', target: 'output', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};
