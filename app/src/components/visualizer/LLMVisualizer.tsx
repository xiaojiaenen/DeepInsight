import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editorOpenFile } from '../../lib/editorBus';
import { subscribeRuns } from '../../features/runs/runsStore';
import { Brain, Cpu, Code2, Layers, MessageSquare, Sparkles } from 'lucide-react';

interface TokenProb {
  token: string;
  prob: number;
}

export const LLMVisualizer: React.FC = () => {
  const [tokens, setTokens] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<TokenProb[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [showCommand, setShowCommand] = useState(false);

  // 监听真实运行指标
  useEffect(() => {
    return subscribeRuns((allRuns) => {
      const activeRun = allRuns.find(r => !r.finishedAt);
      if (!activeRun) {
        setIsLive(false);
        setTokens([]);
        setReasoning([]);
        setCandidates([]);
        return;
      }
      setIsLive(true);

      // 获取最新的指标
      const latestMetrics = activeRun.metrics.slice(-20);
      
      // 1. 处理新 Token 输出
      const outputMetric = latestMetrics.findLast(m => m.name === 'token_output');
      if (outputMetric && typeof outputMetric.value === 'string') {
        setTokens(prev => {
          if (prev[prev.length - 1] !== outputMetric.value) {
            return [...prev, outputMetric.value as string].slice(-50); // 最多保留50个
          }
          return prev;
        });
      }

      // 2. 处理候选词概率分布
      const candidatesMetric = latestMetrics.findLast(m => m.name === 'token_candidates');
      if (candidatesMetric) {
        let parsed: any = null;
        if (typeof candidatesMetric.value === 'string') {
          try {
            parsed = JSON.parse(candidatesMetric.value);
          } catch (e) {
            console.error('Failed to parse token_candidates:', e);
          }
        } else {
          parsed = candidatesMetric.value;
        }

        if (Array.isArray(parsed)) {
          setCandidates(parsed.slice(0, 4));
        }
      }

      // 3. 处理思考链
      const reasoningMetric = latestMetrics.findLast(m => m.name === 'token_reasoning');
      if (reasoningMetric && typeof reasoningMetric.value === 'string') {
        setReasoning(prev => {
          if (prev[prev.length - 1] !== reasoningMetric.value) {
            return [...prev.slice(-2), reasoningMetric.value as string];
          }
          return prev;
        });
      }
    });
  }, []);

  return (
    <div className="w-full h-full bg-slate-950 p-5 flex flex-col gap-6 overflow-hidden border-l border-slate-800 relative">
      {!isLive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 animate-pulse">
            <Brain className="w-8 h-8 text-emerald-500/50" />
          </div>
          <h3 className="text-sm font-medium text-slate-200 mb-2">等待 LLM 推理数据...</h3>
          <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed mb-6">
            使用 <code className="text-emerald-400">log_llm</code> 实时监控大模型的生成过程、Token 概率分布及思考链。
          </p>
          <div className="flex flex-col gap-3 w-full max-w-[240px]">
            <div className="bg-black/40 p-3 rounded-lg text-[10px] font-mono text-emerald-300/80 border border-emerald-500/10 text-left">
              {`import deepinsight\ndeepinsight.log_llm(\n  token="AI", \n  reasoning="思考中..."\n)`}
            </div>
            <button 
              onClick={() => setShowCommand(!showCommand)}
              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all"
            >
              {showCommand ? '隐藏测试指令' : '查看接入方法'}
            </button>
            {showCommand && (
              <div className="p-2 bg-black/60 rounded-lg border border-emerald-500/30 text-[9px] font-mono text-emerald-500/90 break-all select-all cursor-copy">
                uv run python scripts/comprehensive_test.py
              </div>
            )}
          </div>
        </div>
      )}

      {/* 头部状态 */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 rounded-lg">
            <Brain className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wide">LLM 实时推理引擎</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`flex h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">Status: {isLive ? 'Active' : 'Waiting'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => editorOpenFile({ path: 'inference.py', lineNumber: 1 })}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            title="查看源代码"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 推理链 (Reasoning Chain) */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">思考链</h4>
          </div>
          <span className="text-[8px] text-slate-600 font-mono">REASONING_v2</span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 min-h-[70px] backdrop-blur-sm">
          <AnimatePresence mode="popLayout">
            {reasoning.map((thought, i) => (
              <motion.div
                key={`${thought}-${i}`}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="text-[10px] text-emerald-300/70 font-mono flex items-center gap-2"
              >
                <span className="text-emerald-500/30">●</span>
                {thought}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 上下文窗口 (Context Window) */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-slate-500" />
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">上下文窗口</h4>
          </div>
          <button 
            onClick={() => editorOpenFile({ path: 'inference.py', lineNumber: 15 })}
            className="text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            查看 KV Cache
          </button>
        </div>
        <div className="flex flex-wrap content-start gap-2 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50 flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {tokens.map((t, i) => (
              <motion.span
                key={`${t}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md text-sm font-medium"
              >
                {t}
              </motion.span>
            ))}
          </AnimatePresence>
          <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-1.5 h-5 bg-emerald-500 rounded-full self-center ml-0.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          />
        </div>
      </div>

      {/* 概率分布 (Logits) */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-slate-500" />
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Token 概率分布</h4>
          </div>
          <span className="text-[8px] text-slate-600 font-mono">SOFTMAX_OUTPUT</span>
        </div>
        <div className="flex flex-col gap-2">
          {candidates.map((c, i) => (
            <div 
              key={c.token} 
              className={`
                flex flex-col gap-1.5 p-2.5 rounded-xl cursor-pointer transition-all group
                ${i === 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-slate-800/40 border border-transparent'}
              `}
              onClick={() => {
                setTokens(prev => [...prev, c.token]);
                setReasoning(prev => [...prev.slice(-1), `用户手动选择了 "${c.token}"`, '正在重新对齐上下文...']);
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-slate-300 group-hover:text-emerald-300 transition-colors">"{c.token}"</span>
                <span className="text-[10px] font-bold text-slate-500">{(c.prob * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.prob * 100}%` }}
                  transition={{ type: 'spring', damping: 20 }}
                  className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-600'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部配置 */}
      <div 
        className="mt-auto p-4 bg-slate-900/60 border border-slate-800 rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all group"
        onClick={() => editorOpenFile({ path: 'config.yaml', lineNumber: 1 })}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] text-emerald-300 font-bold">DeepInsight-R1 (推理版)</div>
              <div className="text-[8px] text-slate-500 font-medium">混合专家模型 (MoE) · 67B Params</div>
            </div>
          </div>
          <div className="text-[8px] text-slate-600 uppercase font-bold group-hover:text-emerald-400 transition-colors tracking-widest">模型配置</div>
        </div>
      </div>
    </div>
  );
};

