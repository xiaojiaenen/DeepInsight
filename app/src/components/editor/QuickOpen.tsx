import React, { useState, useEffect, useRef } from 'react';
import { FileCode, Search, X } from 'lucide-react';
import { getWorkspaceState, openFile } from '../../features/workspace/workspaceStore';

interface QuickOpenProps {
  onClose: () => void;
}

export const QuickOpen: React.FC<QuickOpenProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      const ws = getWorkspaceState();
      if (!ws.root || !window.workspace) return;

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
      setFiles(allFiles);
      setFilteredFiles(allFiles.slice(0, 10));
    };

    fetchFiles();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const filtered = files
      .filter(f => f.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
    setFilteredFiles(filtered);
    setSelectedIndex(0);
  }, [query, files]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredFiles.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        openFile(filteredFiles[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="w-[600px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索文件..."
            className="flex-1 text-base outline-none bg-transparent"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              未找到文件
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={file}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                  ${index === selectedIndex ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}
                `}
                onClick={() => {
                  openFile(file);
                  onClose();
                }}
              >
                <FileCode className={`w-4 h-4 ${index === selectedIndex ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{file.split('/').pop()}</span>
                  <span className="text-[10px] opacity-60 truncate">{file}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3 ml-2">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded">↑↓</kbd> 选择</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded">Enter</kbd> 打开</span>
          </div>
          <span className="mr-2">{files.length} 个文件</span>
        </div>
      </div>
    </div>
  );
};
