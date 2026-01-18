import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RefreshCw, 
  Code, 
  CheckCircle2, 
  Layers, 
  Image as ImageIcon,
  Activity,
  Target,
  Lightbulb,
  Square
} from 'lucide-react';
import { editorOpenFile } from '../../lib/editorBus';

export const CNNLab: React.FC = () => {
  const [stage, setStage] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState({
    accuracy: 0.12,
    loss: 2.31,
    epoch: 0
  });

  const labCode = `# 练习：实现一个简单的 CNN 进行 CIFAR-10 分类
# 目标：
# 1) 构建卷积层 (Conv2d) 和池化层 (MaxPool2d)
# 2) 使用 Dropout 防止过拟合
# 3) 最终 Accuracy 达到 0.7 以上
#
# TODO: 补全卷积层定义
# self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
# self.pool = nn.MaxPool2d(2, 2)
# self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
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
          return prev + 2;
        });

        setMetrics(prev => ({
          accuracy: Math.min(0.95, prev.accuracy + 0.01 * Math.random()),
          loss: Math.max(0.1, prev.loss - 0.02 * Math.random()),
          epoch: prev.epoch + (Math.random() > 0.8 ? 1 : 0)
        }));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, stage]);

  const resetLab = () => {
    setStage(1);
    setIsRunning(false);
    setProgress(0);
    setMetrics({ accuracy: 0.12, loss: 2.31, epoch: 0 });
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden font-sans border-l border-slate-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">卷积神经网络 (CNN) 实验室</h3>
            <p className="text-[10px] text-slate-500 font-medium">阶段 {stage}/3: {
              stage === 1 ? '数据增强与预处理' : 
              stage === 2 ? '卷积架构搭建' : 
              '模型训练与优化'
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
        {/* Progress Tracker */}
        <div className="flex items-center justify-between px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all
                ${stage > s ? 'bg-emerald-500 border-emerald-500 text-white' : 
                  stage === s ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                  'border-slate-800 text-slate-600'}
              `}>
                {stage > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`h-[1px] flex-1 mx-2 rounded-full ${stage > s ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Live Visualization */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">输入数据流</span>
            </div>
            <div className="aspect-square bg-slate-950 rounded-lg border border-slate-800/50 flex items-center justify-center overflow-hidden relative group">
              <div className="grid grid-cols-4 gap-1.5 p-3 w-full h-full opacity-40">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="bg-slate-800 rounded-md animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
                <Activity className={`w-8 h-8 ${isRunning ? 'text-emerald-500 animate-pulse' : 'text-slate-700'}`} />
                <span className="text-[9px] text-slate-500 mt-3 font-bold uppercase tracking-wider">CIFAR-10 批次数据</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">实时训练指标</span>
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">准确率 (Accuracy)</span>
                  <span className="font-mono font-bold text-emerald-400">{(metrics.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.accuracy * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">损失值 (Loss)</span>
                  <span className="font-mono font-bold text-rose-400">{metrics.loss.toFixed(4)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                    initial={{ width: '100%' }}
                    animate={{ width: `${Math.max(5, (metrics.loss / 2.31) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 mt-auto">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 uppercase tracking-wider font-bold">训练轮数 (Epoch)</span>
                  <span className="text-slate-300 font-mono font-bold">{metrics.epoch}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Snippet */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">model.py</span>
            </div>
            <button 
              onClick={() => editorOpenFile({ path: 'model.py', lineNumber: 1 })}
              className="text-[9px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              在编辑器中打开
            </button>
          </div>
          <div className="p-4">
            <pre className="text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
              {labCode}
            </pre>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 flex gap-3">
          <Lightbulb className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-blue-300 uppercase tracking-wider">卷积核心提示</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {stage === 1 ? '数据增强是提高 CNN 泛化能力的关键。' : 
               stage === 2 ? '感受野 (Receptive Field) 的大小决定了网络能看到的空间范围。' : 
               'Batch Normalization 可以显著加速训练并起到正则化作用。'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar Footer */}
      <AnimatePresence>
        {isRunning && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center gap-4"
          >
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">{Math.round(progress)}%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
