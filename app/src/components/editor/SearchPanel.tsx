import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight, ChevronDown, FileCode, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../layout/cn';
import { openFile, getWorkspaceState } from '../../features/workspace/workspaceStore';
import { editorOpenFile } from '../../lib/editorBus';

interface SearchResult {
  path: string;
  matches: Array<{
    lineNumber: number;
    text: string;
    preview: string;
  }>;
}

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const ws = getWorkspaceState();
    if (!ws.root || !window.workspace) return;

    setSearching(true);
    const newResults: SearchResult[] = [];

    try {
      // 递归获取所有文件
      const allFiles: string[] = [];
      const walk = async (dir: string) => {
        const entries = await window.workspace!.list(ws.root!, dir);
        for (const entry of entries) {
          if (entry.kind === 'dir') {
            await walk(entry.path);
          } else {
            allFiles.push(entry.path);
          }
        }
      };

      await walk('');

      // 搜索内容
      for (const path of allFiles) {
        // 简单过滤二进制文件
        if (path.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|exe|dll|so|dylib|pyc)$/i)) continue;

        try {
          const content = await window.workspace!.readFile(ws.root!, path);
          const lines = content.split('\n');
          const matches: SearchResult['matches'] = [];

          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              matches.push({
                lineNumber: idx + 1,
                text: line.trim(),
                preview: line
              });
            }
          });

          if (matches.length > 0) {
            newResults.push({ path, matches });
          }
        } catch (e) {
          console.error(`Failed to search in ${path}:`, e);
        }
      }

      setResults(newResults);
      // 默认展开所有结果
      const expanded: Record<string, boolean> = {};
      newResults.forEach(r => expanded[r.path] = true);
      setExpandedPaths(expanded);
    } finally {
      setSearching(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleResultClick = async (path: string, lineNumber: number) => {
    editorOpenFile({ path, lineNumber, column: 1 });
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">全局搜索</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleSearch}
            className="p-1 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
            title="刷新搜索"
            disabled={searching || !query.trim()}
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-slate-100">
        <div className="relative group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text"
            placeholder="搜索文本..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          {query && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded"
              onClick={() => { setQuery(''); setResults([]); }}
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between items-center">
          <span>{results.length} 个文件包含匹配项</span>
          {searching && <span className="animate-pulse">正在搜索...</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {results.length === 0 && !searching && query && (
          <div className="p-8 text-center text-xs text-slate-400">
            未找到匹配项
          </div>
        )}
        
        <div className="py-2">
          {results.map((result) => (
            <div key={result.path} className="flex flex-col">
              <div 
                className="group flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => toggleExpand(result.path)}
              >
                {expandedPaths[result.path] ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
                <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                <span className="flex-1 text-xs text-slate-700 font-medium truncate">
                  {result.path.split('/').pop()}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                  {result.matches.length}
                </span>
              </div>
              
              {expandedPaths[result.path] && (
                <div className="flex flex-col mb-1">
                  {result.matches.map((match, idx) => (
                    <div 
                      key={`${result.path}-${idx}`}
                      className="pl-9 pr-3 py-1 hover:bg-emerald-50 cursor-pointer group/item flex flex-col"
                      onClick={() => handleResultClick(result.path, match.lineNumber)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-6 shrink-0">{match.lineNumber}</span>
                        <span className="text-xs text-slate-600 truncate font-mono">
                          {match.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
