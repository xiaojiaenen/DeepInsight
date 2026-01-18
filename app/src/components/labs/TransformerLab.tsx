import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RefreshCw, 
  Code, 
  CheckCircle2, 
  Cpu,
  Zap,
  Activity,
  BarChart3,
  Lightbulb,
  Square
} from 'lucide-react';
import { editorOpenFile } from '../../lib/editorBus';

export const TransformerLab: React.FC = () => {
  const [stage, setStage] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState({
    perplexity: 150.2,
    attention_entropy: 2.45,
    tokens_per_sec: 0
  });

  const labCode = `# 练习：实现 Self-Attention 机制
# 目标：
# 1) 计算 Query, Key, Value 矩阵
# 2) 实现 Scaled Dot-Product Attention
# 3) 理解 Multi-Head Attention 的拼接与投影
#
# TODO: 补全注意力得分计算逻辑
# attention_scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
# attention_weights = torch.softmax(attention_scores, dim=-1)
# output = torch.matmul(attention_weights, V)
`;

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsRunning(false);
            if (stage < 3) setStage(s => s + 1);
            return 0;
          }
          return prev + 1.5;
        });

        setMetrics(prev => ({
          perplexity: Math.max(1.2, prev.perplexity - 2.5 * Math.random()),
          attention_entropy: Math.max(0.5, prev.attention_entropy - 0.05 * Math.random()),
          tokens_per_sec: Math.floor(1200 + Math.random() * 300)
        }));
      }, 100);
    } else {
      setMetrics(prev => ({ ...prev, tokens_per_sec: 0 }));
    }
    return () => clearInterval(interval);
  }, [isRunning, stage]);

  const resetLab = () => {
    setStage(1);
    setIsRunning(false);
    setProgress(0);
    setMetrics({ perplexity: 150.2, attention_entropy: 2.45, tokens_per_sec: 0 });
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden font-sans border-l border-slate-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Transformer 核心机制</h3>
            <p className="text-[10px] text-slate-500 font-medium">阶段 {stage}/3: {
              stage === 1 ? '注意力权重计算' : 
              stage === 2 ? '多头并行化实现' : 
              '位置编码与层归一化'
            }</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={resetLab}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            title="重置实验"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`
              flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
              ${isRunning 
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-rose-500/10' 
                : 'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-500/20 active:scale-95'}
            `}
          >
            {isRunning ? (
              <><Square className="w-3 h-3 fill-current" /> 停止</>
            ) : (
              <><Play className="w-3 h-3 fill-current" /> 运行实验</>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0 custom-scrollbar">
        {/* Progress Tracker */}
        <div className="flex items-center justify-between px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all
                ${stage > s ? 'bg-amber-500 border-amber-500 text-white' : 
                  stage === s ? 'border-amber-500 text-amber-500 ring-4 ring-amber-500/10' : 
                  'border-slate-800 text-slate-600'}
              `}>
                {stage > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full ${stage > s ? 'bg-amber-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Attention Matrix Visualization */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 shadow-inner overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">注意力图 (Attention Map)</span>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map(h => (
                <div key={h} className={`w-2 h-2 rounded-full ${h === 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-800'}`} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5 aspect-video">
            {Array.from({ length: 64 }).map((_, i) => (
              <motion.div 
                key={i}
                initial={false}
                animate={{ 
                  backgroundColor: isRunning 
                    ? `rgba(245, 158, 11, ${Math.random() * 0.8})` 
                    : 'rgba(30, 41, 59, 0.3)'
                }}
                className="rounded-sm border border-white/5"
              />
            ))}
          </div>
        </div>

        {/* Code Snippet */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">attention.py</span>
            </div>
            <button 
              onClick={() => editorOpenFile({ path: 'attention.py', lineNumber: 5 })}
              className="text-[9px] text-amber-500 font-bold hover:text-amber-400 transition-colors"
            >
              编辑源代码
            </button>
          </div>
          <div className="p-4">
            <pre className="text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
              {labCode}
            </pre>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center group hover:border-amber-500/30 transition-all">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">困惑度 (Perplexity)</div>
            <div className="text-sm font-mono font-bold text-slate-200 group-hover:text-amber-400 transition-colors">{metrics.perplexity.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center group hover:border-amber-500/30 transition-all">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">注意力熵 (Entropy)</div>
            <div className="text-sm font-mono font-bold text-slate-200 group-hover:text-amber-400 transition-colors">{metrics.attention_entropy.toFixed(3)}</div>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center group hover:border-amber-500/30 transition-all">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">吞吐量 (Tokens/s)</div>
            <div className="text-sm font-mono font-bold text-amber-500">{metrics.tokens_per_sec}</div>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex gap-3">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">专家建议</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              自注意力机制的复杂度随序列长度 <span className="text-amber-400 italic">N</span> 呈 <span className="text-amber-400 font-bold">平方级</span> 增长。在实现多头注意力时，确保通过 <span className="text-slate-200 font-mono">view</span> 和 <span className="text-slate-200 font-mono">transpose</span> 操作高效地进行并行计算，而不是使用循环。
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar Overlay */}
      <AnimatePresence>
        {isRunning && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center gap-4"
          >
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-amber-500 font-bold">{Math.round(progress)}%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
