import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenProb {
  token: string;
  prob: number;
}

export const LLMVisualizer: React.FC = () => {
  const [tokens, setTokens] = useState<string[]>(['The', 'quick', 'brown', 'fox']);
  const [candidates, setCandidates] = useState<TokenProb[]>([
    { token: 'jumps', prob: 0.85 },
    { token: 'leaps', prob: 0.12 },
    { token: 'runs', prob: 0.02 },
    { token: 'walks', prob: 0.01 },
  ]);

  // 模拟生成过程
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prev => {
        if (prev.length > 10) return ['DeepLearning'];
        const nextToken = candidates[0].token;
        return [...prev, nextToken];
      });
      // 随机生成新的候选词
      setCandidates([
        { token: ['is', 'can', 'will', 'has'][Math.floor(Math.random()*4)], prob: 0.7 + Math.random()*0.2 },
        { token: 'often', prob: 0.1 },
        { token: 'never', prob: 0.05 },
        { token: 'always', prob: 0.02 },
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, [candidates]);

  return (
    <div className="w-full h-full bg-slate-950 p-4 flex flex-col gap-6 overflow-hidden">
      <div className="flex flex-col gap-2">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Context Window</h4>
        <div className="flex flex-wrap gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-800 min-h-[100px]">
          <AnimatePresence mode="popLayout">
            {tokens.map((t, i) => (
              <motion.span
                key={`${t}-${i}`}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-sm font-mono"
              >
                {t}
              </motion.span>
            ))}
          </AnimatePresence>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-5 bg-indigo-500 rounded-sm self-center ml-1"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Token Probability Distribution</h4>
        <div className="flex flex-col gap-3">
          {candidates.map((c, i) => (
            <div key={c.token} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-mono text-slate-300">"{c.token}"</span>
                <span className="text-slate-500">{(c.prob * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.prob * 100}%` }}
                  className={`h-full rounded-full ${i === 0 ? 'bg-indigo-500' : 'bg-slate-600'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] text-indigo-300/60 font-medium">Model: DeepInsight-R1 (Reasoning)</span>
        </div>
      </div>
    </div>
  );
};
