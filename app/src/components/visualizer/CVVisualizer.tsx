import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Maximize2, FileCode } from 'lucide-react';
import { editorOpenFile } from '../../lib/editorBus';
import { subscribeRuns } from '../../features/runs/runsStore';

interface FeatureMap {
  id: string;
  name: string;
  size: string;
  active: boolean;
}

export const CVVisualizer: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(0);
  const [realStage, setRealStage] = useState<number>(-1);
  const [realMessage, setRealMessage] = useState<string>('');
  const [showCommand, setShowCommand] = useState(false);
  
  const stages = [
    { title: '输入图像', desc: '原始 RGB 输入' },
    { title: '预处理', desc: '数据清洗与增强' },
    { title: '特征提取', desc: 'Backbone 网络' },
    { title: '检测头', desc: 'Head / RPN' },
    { title: '最终结果', desc: '边界框与分类' }
  ];

  const [cvImage, setCvImage] = useState<string | null>(null);

  // 监听真实运行指标
  useEffect(() => {
    return subscribeRuns((allRuns) => {
      const activeRun = allRuns.find(r => !r.finishedAt);
      if (!activeRun) {
        setRealStage(-1);
        setRealMessage('');
        setCvImage(null);
        return;
      }

      const cvMetric = activeRun.metrics.findLast(m => m.name === 'cv_stage');
      if (cvMetric && typeof cvMetric.value === 'number') {
        setRealStage(cvMetric.value);
        setActiveStage(cvMetric.value);
      }
      
      const cvMsg = activeRun.metrics.findLast(m => m.name === 'cv_message');
      if (cvMsg && typeof cvMsg.value === 'string') {
        setRealMessage(cvMsg.value);
      }

      const cvImg = activeRun.metrics.findLast(m => m.name === 'cv_image');
      if (cvImg && typeof cvImg.value === 'string') {
        setCvImage(cvImg.value);
      }
    });
  }, []);

  const featureMaps: FeatureMap[] = []; // 初始为空

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col overflow-hidden">
      {/* Header Info */}
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">计算机视觉流水线</h4>
          <p className="text-xs text-slate-400 mt-1">{realMessage || '目标检测与分割流程可视化'}</p>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-6 overflow-y-auto no-scrollbar">
        {/* Pipeline Progress */}
        <div className="flex items-center justify-between px-2 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          {stages.map((stage, idx) => (
            <button
              key={stage.title}
              onClick={() => setActiveStage(idx)}
              className="relative z-10 flex flex-col items-center gap-2 group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                activeStage === idx 
                  ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' 
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}>
                {idx + 1}
              </div>
              <span className={`text-[9px] font-medium transition-colors ${
                activeStage === idx ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {stage.title}
              </span>
            </button>
          ))}
        </div>

        {/* Main Display Area */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-[300px]">
          {/* Visual Preview */}
          <div className="bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center group">
            {realStage === -1 ? (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                  <Eye className="w-8 h-8 text-emerald-500/50" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-slate-200">等待视觉流水线数据...</h5>
                  <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                    在你的代码中使用 <code className="text-emerald-400">deepinsight.log_cv()</code> 来实时监控视觉处理流程。
                  </p>
                </div>
                <button 
                  onClick={() => setShowCommand(!showCommand)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] rounded-lg transition-colors border border-emerald-500/20"
                >
                  {showCommand ? '隐藏接入方法' : '查看如何接入'}
                </button>
                {showCommand && (
                  <div className="mt-2 p-2 bg-black/50 rounded border border-white/10 text-left">
                    <pre className="text-[9px] text-slate-400 font-mono">
                      {`import deepinsight\n\n# 记录当前阶段\ndeepinsight.log_cv(\n  stage_index=0, \n  message="读取输入图像"\n)`}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full h-full p-4 flex flex-col items-center justify-center"
                >
                  {cvImage ? (
                    <div className="relative group">
                      <img 
                        src={cvImage.startsWith('http') ? cvImage : `file://${cvImage}`} 
                        alt="CV Stage" 
                        className="max-w-full max-h-full rounded shadow-2xl"
                      />
                      <div className="absolute inset-0 border border-emerald-500/30 rounded pointer-events-none" />
                    </div>
                  ) : (
                    <>
                      {activeStage === 0 && (
                        <div className="w-48 h-48 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2">
                          <Search className="w-8 h-8 text-slate-600" />
                          <span className="text-[10px] text-slate-500">等待图像输入...</span>
                        </div>
                      )}
                      {activeStage === 1 && (
                        <div className="grid grid-cols-2 gap-2">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="w-20 h-20 bg-emerald-500/20 rounded border border-emerald-500/30 animate-pulse" />
                          ))}
                        </div>
                      )}
                      {activeStage >= 2 && (
                        <div className="relative w-48 h-48">
                          <div className="absolute inset-0 bg-emerald-500/10 rounded-lg border border-emerald-500/30 overflow-hidden">
                            <motion.div 
                              animate={{ y: [0, 192, 0] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="h-1 w-full bg-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Eye className="w-12 h-12 text-emerald-500/50" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Details Panel */}
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">当前阶段详情</h5>
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] text-slate-200">{stages[activeStage].title}</div>
                  <div className="text-[9px] text-slate-500">{stages[activeStage].desc}</div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <FileCode className="w-3 h-3" />
                  实时分析中...
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5 overflow-hidden flex flex-col">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">特征图 (Feature Maps)</h5>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {featureMaps.map(fm => (
                  <div key={fm.id} className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between group cursor-pointer hover:border-emerald-500/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-300 group-hover:text-emerald-400 transition-colors">{fm.name}</span>
                      <span className="text-[8px] text-slate-600">{fm.size}</span>
                    </div>
                    <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="p-3 border-t border-white/5 bg-black/20 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        <span className="text-[10px] text-slate-500 font-medium italic">处理流 #0 (实时)</span>
      </div>
    </div>
  );
};
