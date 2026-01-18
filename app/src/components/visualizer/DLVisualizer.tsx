import React, { useMemo, useCallback, useEffect } from 'react';
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
import { subscribeRuns } from '../../features/runs/runsStore';
import { Terminal } from 'lucide-react';

// 自定义节点组件
const LayerNode = ({ data }: { data: any }) => (
  <div 
    className="px-4 py-2 shadow-lg rounded-md bg-slate-900 border-2 border-emerald-500/50 min-w-[140px] cursor-pointer hover:border-emerald-400 hover:shadow-emerald-500/10 transition-all"
    onClick={() => {
      if (data.source) {
        editorOpenFile(data.source);
      }
    }}
  >
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-emerald-500" />
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{data.type}</span>
        {data.source && (
          <span className="text-[8px] px-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">源码</span>
        )}
      </div>
      <span className="text-xs font-semibold text-slate-100">{data.label}</span>
      {data.params && (
        <span className="text-[9px] text-slate-500 mt-1">参数量: {data.params}</span>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-emerald-500" />
  </div>
);

const nodeTypes = {
  layer: LayerNode,
};

export const DLVisualizer: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLive, setIsLive] = React.useState(false);
  const [showCommand, setShowCommand] = React.useState(false);

  // 监听真实模型架构数据
  useEffect(() => {
    return subscribeRuns((allRuns) => {
      const activeRun = allRuns.find(r => !r.finishedAt);
      if (!activeRun) {
        setIsLive(false);
        setNodes([]);
        setEdges([]);
        return;
      }
      setIsLive(true);

      const modelMetric = activeRun.metrics.findLast(m => m.name === 'model_structure');
      if (modelMetric) {
        let structure: any = null;
        if (typeof modelMetric.value === 'string') {
          try {
            structure = JSON.parse(modelMetric.value);
          } catch (e) {
            console.error('Failed to parse model_structure string:', e);
          }
        } else {
          structure = modelMetric.value;
        }

        if (structure && structure.nodes && structure.edges) {
          // 将后端传入的节点转换为 ReactFlow 格式
          const newNodes = structure.nodes.map((n: any) => ({
            ...n,
            type: n.type || 'layer',
            data: { ...n.data }
          }));
          
          // 处理连线颜色
          const newEdges = structure.edges.map((e: any) => ({
            ...e,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
          }));

          setNodes(newNodes);
          setEdges(newEdges);
        }
      }
    });
  }, [setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-slate-950 relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 text-slate-400">神经网络架构 (Neural Network)</h4>
          {isLive ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 animate-pulse">
              LIVE
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[9px] font-bold border border-slate-700">
              WAITING
            </span>
          )}
        </div>
        {!isLive && (
          <div className="mt-4 p-4 bg-slate-900/90 border border-emerald-500/20 rounded-xl max-w-[260px] backdrop-blur-md pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-emerald-400">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight">智能接入模型架构</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              未检测到活跃模型。只需导入助手库即可自动捕获您的模型结构并开启 3D 架构可视化。
            </p>
            <div className="space-y-2">
              <div className="bg-black/40 p-2.5 rounded-lg text-[9px] font-mono text-emerald-300/80 border border-emerald-500/10 whitespace-pre-wrap leading-tight">
                {`import deepinsight\ndeepinsight.watch(model)`}
              </div>
              <button 
                onClick={() => setShowCommand(!showCommand)}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {showCommand ? '隐藏测试指令' : '运行演示脚本 (Run Demo)'}
              </button>
            </div>

            {showCommand && (
              <div className="mt-3 p-2 bg-black/60 rounded-lg border border-emerald-500/30 text-[9px] font-mono text-emerald-500/90 break-all select-all cursor-copy animate-in fade-in slide-in-from-top-2">
                uv run python scripts/comprehensive_test.py
              </div>
            )}
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#1e293b" gap={20} />
        <Controls className="bg-slate-900 border-slate-800 fill-slate-400" />
      </ReactFlow>
    </div>
  );
};
