import React, { useState } from 'react';
import { 
  Brain, 
  Layers, 
  Cpu, 
  Bot, 
  LineChart, 
  Network, 
  Workflow,
  Zap
} from 'lucide-react';
import { cn } from '../layout/cn';
import { MLVisualizer } from './MLVisualizer';
import { DLVisualizer } from './DLVisualizer';
import { AgentVisualizer } from './AgentVisualizer';

type VizType = 'ml' | 'dl' | 'rl' | 'agent' | 'llm';

export const ModelVisualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VizType>('dl');

  const renderContent = () => {
    switch (activeTab) {
      case 'ml': return <MLVisualizer />;
      case 'dl': return <DLVisualizer />;
      case 'agent':
      case 'llm': return <AgentVisualizer />;
      default:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              {tabs.find(t => t.id === activeTab)?.icon}
            </div>
            <h3 className="text-sm font-medium text-slate-800 mb-1">
              {tabs.find(t => t.id === activeTab)?.label} 可视化已就绪
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              正在连接后端模型引擎... 
              请在终端运行支持可视化钩子的代码以开始实时监控。
            </p>
            <div className="mt-6 flex flex-col gap-2 w-full">
              <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-progress w-1/3" />
              </div>
              <span className="text-[10px] text-slate-400">等待模型数据输入...</span>
            </div>
          </div>
        );
    }
  };

  const tabs = [
    { id: 'ml', label: '机器学习', icon: <LineChart className="w-4 h-4" /> },
    { id: 'dl', label: '深度学习', icon: <Network className="w-4 h-4" /> },
    { id: 'rl', label: '强化学习', icon: <Zap className="w-4 h-4" /> },
    { id: 'llm', label: '大语言模型', icon: <Brain className="w-4 h-4" /> },
    { id: 'agent', label: 'AI Agent', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          模型可视化
        </h2>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as VizType)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
