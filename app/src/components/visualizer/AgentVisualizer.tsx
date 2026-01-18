import React, { useEffect } from 'react';
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
import { Workflow, Terminal } from 'lucide-react';

const AgentNode = ({ data }: { data: any }) => (
  <div 
    className={`px-4 py-3 shadow-lg rounded-xl bg-white border-2 min-w-[150px] cursor-pointer hover:shadow-xl transition-all ${
      data.role === 'thought' ? 'border-amber-400' : 
      data.role === 'action' ? 'border-blue-500' : 
      data.role === 'observation' ? 'border-emerald-500' :
      'border-slate-300'
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
            data.role === 'observation' ? 'bg-emerald-500' :
            'bg-slate-400'
          }`} />
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {data.role === 'thought' ? '思考' : 
             data.role === 'action' ? '行动' : 
             data.role === 'observation' ? '观察' :
             data.role === 'input' ? '输入' : '输出'}
          </span>
        </div>
        {data.source && (
          <span className="text-[8px] px-1 bg-slate-50 text-slate-400 rounded border border-slate-100">源码</span>
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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showCommand, setShowCommand] = React.useState(false);
  const [isLive, setIsLive] = React.useState(false);

  // 监听真实 Agent 工作流数据
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

      const agentMetric = activeRun.metrics.findLast(m => m.name === 'agent_step');
      if (agentMetric) {
        let step: any = null;
        if (typeof agentMetric.value === 'string') {
          try {
            step = JSON.parse(agentMetric.value);
          } catch (e) {
            console.error('Failed to parse agent_step:', e);
          }
        } else {
          step = agentMetric.value;
        }

        if (step && step.role && step.content) {
          setNodes(prev => {
            const id = `step-${prev.length}`;
            const newNode = {
              id,
              type: 'agent',
              data: { ...step },
              position: { x: 250, y: prev.length * 120 }
            };
            // 避免重复添加同一个 step (简单通过 content 检查)
            if (prev.some(n => n.data.content === step.content)) return prev;
            return [...prev, newNode];
          });

          setEdges(prev => {
            const sourceId = `step-${nodes.length - 1}`;
            const targetId = `step-${nodes.length}`;
            if (nodes.length === 0) return prev;
            const newEdge = {
              id: `e-${sourceId}-${targetId}`,
              source: sourceId,
              target: targetId,
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
            };
            if (prev.some(e => e.id === newEdge.id)) return prev;
            return [...prev, newEdge];
          });
        }
      }
    });
  }, [nodes.length, setEdges, setNodes]);

  return (
    <div className="w-full h-full bg-slate-950 relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 text-slate-400">Agent 思考链 (Agent Workflow)</h4>
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
                <Workflow className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight">智能接入 Agent 流程</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              未检测到活跃 Agent。使用 <code className="text-emerald-400">log_agent</code> 来实时追踪 Agent 的思考与行动轨迹。
            </p>
            <div className="space-y-2">
              <div className="bg-black/40 p-2.5 rounded-lg text-[9px] font-mono text-emerald-300/80 border border-emerald-500/10 whitespace-pre-wrap leading-tight">
                {`import deepinsight\ndeepinsight.log_agent(\n  role="thought", \n  content="正在分析..."\n)`}
              </div>
              <button 
                onClick={() => setShowCommand(!showCommand)}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {showCommand ? '隐藏测试指令' : '查看接入示例'}
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
