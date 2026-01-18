import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RefreshCw, 
  Code, 
  CheckCircle2, 
  Gamepad2,
  Trophy,
  Zap,
  Target,
  Lightbulb,
  Square
} from 'lucide-react';
import { editorOpenFile } from '../../lib/editorBus';

export const RLLab: React.FC = () => {
  const [stage, setStage] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState({
    avg_reward: -200,
    epsilon: 1.0,
    steps: 0
  });

  // 模拟 GridWorld 环境状态
  const [agentPos, setAgentPos] = useState({ x: 0, y: 0 });
  const gridRows = 5;
  const gridCols = 5;
  const targetPos = { x: 4, y: 4 };
  const obstacles = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 2 }];

  const labCode = `# 练习：实现 Q-Learning 算法
# 目标：
# 1) 初始化 Q-Table
# 2) 实现 Epsilon-Greedy 策略
# 3) 使用 Bellman 方程更新 Q 值: 
#    Q(s,a) = Q(s,a) + alpha * (reward + gamma * max(Q(s',a')) - Q(s,a))
#
# TODO: 补全 Q 值更新逻辑
# best_next_a = np.argmax(Q_table[next_state])
# td_target = reward + gamma * Q_table[next_state, best_next_a]
# Q_table[state, action] += alpha * (td_target - Q_table[state, action])
`;

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        // 模拟智能体移动
        setAgentPos(prev => {
          const move = Math.random() > metrics.epsilon ? 'smart' : 'random';
          let nextX = prev.x;
          let nextY = prev.y;

          if (move === 'random') {
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0) nextX = Math.min(gridCols - 1, prev.x + 1);
            if (dir === 1) nextX = Math.max(0, prev.x - 1);
            if (dir === 2) nextY = Math.min(gridRows - 1, prev.y + 1);
            if (dir === 3) nextY = Math.max(0, prev.y - 1);
          } else {
            // 简单地向目标移动
            if (nextX < targetPos.x) nextX++;
            else if (nextY < targetPos.y) nextY++;
          }

          // 检查障碍物
          if (obstacles.some(o => o.x === nextX && o.y === nextY)) {
            return prev;
          }

          // 到达目标重置
          if (nextX === targetPos.x && nextY === targetPos.y) {
            setMetrics(m => ({ ...m, avg_reward: Math.min(100, m.avg_reward + 20) }));
            return { x: 0, y: 0 };
          }

          return { x: nextX, y: nextY };
        });

        setMetrics(prev => ({
          avg_reward: prev.avg_reward + 0.1,
          epsilon: Math.max(0.1, prev.epsilon - 0.005),
          steps: prev.steps + 1
        }));

        setProgress(prev => {
          if (prev >= 100) {
            if (stage < 3) setStage(s => s + 1);
            return 0;
          }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, stage, metrics.epsilon]);

  const resetLab = () => {
    setStage(1);
    setIsRunning(false);
    setProgress(0);
    setAgentPos({ x: 0, y: 0 });
    setMetrics({ avg_reward: -200, epsilon: 1.0, steps: 0 });
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden font-sans border-l border-slate-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">强化学习 (RL) 实验室</h3>
            <p className="text-[10px] text-slate-500 font-medium">阶段 {stage}/3: {
              stage === 1 ? '环境交互与奖励设计' : 
              stage === 2 ? 'Q-Table 策略学习' : 
              '深度强化学习 (DQN) 迁移'
            }</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={resetLab}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            title="重置环境"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`
              flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
              ${isRunning 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-amber-500/10' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20 active:scale-95'}
            `}
          >
            {isRunning ? (
              <><Square className="w-3 h-3 fill-current" /> 停止</>
            ) : (
              <><Play className="w-3 h-3 fill-current" /> 开始训练</>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0 custom-scrollbar">
        {/* GridWorld Visualization */}
        <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">网格世界环境 (GridWorld)</span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] text-slate-500 font-bold uppercase">智能体</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-[9px] text-slate-500 font-bold uppercase">目标</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-2xl relative">
            {Array.from({ length: gridRows * gridCols }).map((_, i) => {
              const x = i % gridCols;
              const y = Math.floor(i / gridCols);
              const isAgent = agentPos.x === x && agentPos.y === y;
              const isTarget = targetPos.x === x && targetPos.y === y;
              const isObstacle = obstacles.some(o => o.x === x && o.y === y);

              return (
                <div 
                  key={i} 
                  className={`
                    w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-300 relative
                    ${isObstacle ? 'bg-slate-800 border-slate-900 shadow-inner' : 
                      isTarget ? 'bg-amber-500/5 border-amber-500/20' : 
                      'bg-slate-900/50 border-slate-800/50'}
                  `}
                >
                  {isAgent && (
                    <motion.div 
                      layoutId="agent"
                      className="w-8 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-white/20 flex items-center justify-center z-10"
                    >
                      <Zap className="w-4 h-4 text-white fill-current" />
                    </motion.div>
                  )}
                  {isTarget && !isAgent && (
                    <Trophy className="w-6 h-6 text-amber-500 opacity-80" />
                  )}
                  {isObstacle && <div className="w-4 h-1 bg-slate-900 rounded-full opacity-50" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center group hover:border-emerald-500/30 transition-all">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">平均奖励 (Avg Reward)</div>
            <div className={`text-sm font-mono font-bold transition-colors ${metrics.avg_reward > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {metrics.avg_reward.toFixed(1)}
            </div>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center group hover:border-blue-500/30 transition-all">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">探索率 (Epsilon)</div>
            <div className="text-sm font-mono font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{metrics.epsilon.toFixed(3)}</div>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center group hover:border-slate-700 transition-all">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">训练步数 (Steps)</div>
            <div className="text-sm font-mono font-bold text-slate-300">{metrics.steps}</div>
          </div>
        </div>

        {/* Code Snippet */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">agent.py</span>
            </div>
            <button 
              onClick={() => editorOpenFile({ path: 'agent.py', lineNumber: 1 })}
              className="text-[9px] text-emerald-500 font-bold hover:text-emerald-400 transition-colors"
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

        {/* Pro Tip */}
        <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex gap-3">
          <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">RL 核心提示</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-emerald-400 font-bold">探索 (Exploration)</span> 与 <span className="text-emerald-400 font-bold">利用 (Exploitation)</span> 的平衡是强化学习的关键。通过逐渐减小 <span className="text-slate-200 font-mono">epsilon</span>，智能体会从早期的随机尝试过渡到后期的经验决策。
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
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">{Math.round(progress)}%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
