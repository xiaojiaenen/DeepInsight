import React, { useEffect, useState } from 'react';
import { FileDiff, X, Copy, Check } from 'lucide-react';
import { getGitDiff } from '../../features/workspace/workspaceStore';
import { cn } from '../layout/cn';

interface GitDiffViewProps {
  path: string;
  onClose: () => void;
}

export const GitDiffView: React.FC<GitDiffViewProps> = ({ path, onClose }) => {
  const [diff, setDiff] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGitDiff(path).then(res => {
      if (active) {
        setDiff(res);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [path]);

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diff.split('\n');

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <FileDiff className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-slate-700 truncate max-w-[400px]">
            差异: {path}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
            title="复制差异"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed p-4 selection:bg-emerald-100">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 italic">
            正在加载差异...
          </div>
        ) : !diff ? (
          <div className="flex items-center justify-center h-full text-slate-400 italic">
            无修改内容或文件已删除
          </div>
        ) : (
          <div className="min-w-fit">
            {lines.map((line, i) => {
              const isAdded = line.startsWith('+') && !line.startsWith('+++');
              const isRemoved = line.startsWith('-') && !line.startsWith('---');
              const isHeader = line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++');
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "whitespace-pre px-2 -mx-2",
                    isAdded ? "bg-emerald-50 text-emerald-700" :
                    isRemoved ? "bg-red-50 text-red-700" :
                    isHeader ? "text-slate-400 font-bold bg-slate-50/50" : "text-slate-600"
                  )}
                >
                  <span className="inline-block w-8 select-none opacity-30 text-right mr-4">
                    {i + 1}
                  </span>
                  {line}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
