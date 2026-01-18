import React, { useState } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  RefreshCw, 
  Plus, 
  FileCode,
  AlertCircle,
  FileDiff,
  Check,
  RotateCcw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../layout/cn';
import { gitCommit, gitPush, gitPull, refreshGitStatus, gitAdd, gitReset } from '../../features/workspace/workspaceStore';

interface GitPanelProps {
  gitStatus: { 
    branch: string; 
    changes: number; 
    files: Array<{ path: string; status: string }> 
  } | null | undefined;
  gitLoading?: boolean;
  onOpenFile: (path: string) => void;
  onShowDiff: (path: string) => void;
}

import { showContextMenu } from '../../features/contextMenu/contextMenuStore';

export const GitPanel: React.FC<GitPanelProps> = ({ gitStatus, gitLoading, onOpenFile, onShowDiff }) => {
  const [commitMsg, setCommitMsg] = useState('');
  const [lastOp, setLastOp] = useState<'commit' | 'push' | 'pull' | 'status' | null>(null);

  const stagedFiles = gitStatus?.files.filter(f => !f.status.startsWith(' ') && f.status.trim() !== '??') || [];
  const unstagedFiles = gitStatus?.files.filter(f => f.status.startsWith(' ') || f.status.trim() === '??') || [];

  const handleCommit = async () => {
    if (!commitMsg.trim() || !gitStatus || gitLoading) return;
    setLastOp('commit');
    try {
      const hasStaged = stagedFiles.length > 0;
      const ok = await gitCommit(commitMsg.trim(), !hasStaged);
      if (ok) setCommitMsg('');
    } finally {
      setLastOp(null);
    }
  };

  const handlePush = async () => {
    if (gitLoading) return;
    setLastOp('push');
    try {
      await gitPush();
    } finally {
      setLastOp(null);
    }
  };

  const handlePull = async () => {
    if (gitLoading) return;
    setLastOp('pull');
    try {
      await gitPull();
    } finally {
      setLastOp(null);
    }
  };

  if (gitStatus === undefined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <RefreshCw className="w-6 h-6 text-slate-300 animate-spin mb-4" />
        <h3 className="text-sm font-medium text-slate-900 mb-1">正在加载 Git 状态...</h3>
      </div>
    );
  }

  if (gitStatus === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-slate-300" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">未检测到 Git 仓库</h3>
        <p className="text-xs text-slate-500">当前目录不是一个 Git 仓库，或者尚未初始化。</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <GitBranch className="w-3.5 h-3.5" />
          {gitStatus.branch}
        </div>
        <button 
          onClick={() => {
            setLastOp('status');
            void refreshGitStatus().finally(() => setLastOp(null));
          }}
          className="p-1 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
          title="刷新状态"
          disabled={gitLoading}
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", (gitLoading || lastOp === 'status') && "animate-spin")} />
        </button>
      </div>

      <div className="p-3 space-y-3 border-b border-slate-100">
        <textarea 
          placeholder="提交信息 (Ctrl+Enter 提交)"
          className="w-full h-20 p-2 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleCommit();
            }
          }}
        />
        <div className="flex gap-2">
          <button 
            disabled={gitLoading || gitStatus.changes === 0 || !commitMsg.trim()}
            onClick={handleCommit}
            className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {lastOp === 'commit' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitCommit className="w-3.5 h-3.5" />
            )}
            {lastOp === 'commit' ? '提交中...' : '提交'}
          </button>
          <button 
            disabled={gitLoading}
            onClick={handlePull}
            className="w-10 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="拉取 (Pull)"
          >
            {lastOp === 'pull' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
          </button>
          <button 
            disabled={gitLoading}
            onClick={handlePush}
            className="w-10 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="推送 (Push)"
          >
            {lastOp === 'push' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          {gitStatus.files.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              没有待提交的更改
            </div>
          ) : (
            <div className="py-2 space-y-4">
              {/* 暂存的更改 */}
              {stagedFiles.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      暂存的更改 ({stagedFiles.length})
                    </span>
                    <button 
                      onClick={() => void gitReset('.')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                      title="取消所有暂存"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="py-1">
                    {stagedFiles.map((file, i) => (
                      <div 
                        key={`staged-${i}`}
                        className="group px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                        onClick={() => onOpenFile(file.path)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          showContextMenu(e.clientX, e.clientY, [
                            { label: '打开文件', icon: <FileCode className="w-4 h-4" />, onClick: () => onOpenFile(file.path) },
                            { label: '查看差异', icon: <FileDiff className="w-4 h-4" />, onClick: () => onShowDiff(file.path) },
                            { type: 'separator' },
                            { label: '取消暂存', icon: <RotateCcw className="w-4 h-4" />, onClick: () => void gitReset(file.path) },
                          ]);
                        }}
                      >
                        <FileCode className="w-3.5 h-3.5 text-slate-400" />
                        <span className="flex-1 text-xs text-slate-700 truncate" title={file.path}>
                          {file.path}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onShowDiff(file.path); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-500 transition-colors"
                            title="查看差异"
                          >
                            <FileDiff className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); void gitReset(file.path); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="取消暂存"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] font-bold px-1 rounded-sm min-w-[16px] text-center text-emerald-600 bg-emerald-50">
                          {file.status[0] || 'A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 未暂存的更改 */}
              {unstagedFiles.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      更改 ({unstagedFiles.length})
                    </span>
                    <button 
                      onClick={() => void gitAdd('.')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                      title="暂存所有更改"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="py-1">
                    {unstagedFiles.map((file, i) => (
                      <div 
                        key={`unstaged-${i}`}
                        className="group px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                        onClick={() => onOpenFile(file.path)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          showContextMenu(e.clientX, e.clientY, [
                            { label: '打开文件', icon: <FileCode className="w-4 h-4" />, onClick: () => onOpenFile(file.path) },
                            { label: '查看差异', icon: <FileDiff className="w-4 h-4" />, onClick: () => onShowDiff(file.path) },
                            { type: 'separator' },
                            { label: '暂存更改', icon: <Plus className="w-4 h-4" />, onClick: () => void gitAdd(file.path) },
                            { label: '放弃更改', icon: <RotateCcw className="w-4 h-4" />, danger: true, onClick: () => {
                              if (window.confirm(`确定要放弃对 ${file.path} 的更改吗？`)) {
                                void gitReset(file.path);
                              }
                            }},
                          ]);
                        }}
                      >
                        <FileCode className="w-3.5 h-3.5 text-slate-400" />
                        <span className="flex-1 text-xs text-slate-700 truncate" title={file.path}>
                          {file.path}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onShowDiff(file.path); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-500 transition-colors"
                            title="查看差异"
                          >
                            <FileDiff className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); void gitAdd(file.path); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-emerald-500 transition-colors"
                            title="暂存更改"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-1 rounded-sm min-w-[16px] text-center",
                          file.status.includes('M') ? "text-amber-600 bg-amber-50" :
                          file.status.includes('?') ? "text-emerald-600 bg-emerald-50" :
                          file.status.includes('D') ? "text-red-600 bg-red-50" : "text-slate-400"
                        )}>
                          {file.status.trim() || 'U'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};