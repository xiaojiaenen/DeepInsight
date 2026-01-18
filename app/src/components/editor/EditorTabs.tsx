import React from 'react';
import { X, FileCode, FileText, ChevronLeft, ChevronRight, Hash, Terminal, Settings, Copy, MinusCircle, Ban } from 'lucide-react';
import { cn } from '../layout/cn';
import { showContextMenu } from '../../features/contextMenu/contextMenuStore';

interface EditorTabsProps {
  openFiles: string[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

const FileIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['py'].includes(ext || '')) {
    return <FileCode className={cn(className, "text-indigo-500")} />;
  }
  if (['js', 'ts', 'tsx', 'jsx'].includes(ext || '')) {
    return <FileCode className={cn(className, "text-amber-500")} />;
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext || '')) {
    return <Settings className={cn(className, "text-emerald-500")} />;
  }
  if (['md'].includes(ext || '')) {
    return <FileText className={cn(className, "text-blue-500")} />;
  }
  return <FileText className={className} />;
};

export const EditorTabs: React.FC<EditorTabsProps> = ({ 
  openFiles, 
  activePath, 
  onSelect, 
  onClose 
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: '关闭', icon: <X className="w-4 h-4" />, onClick: () => onClose(path), shortcut: 'Ctrl+W' },
      { label: '关闭其他', icon: <MinusCircle className="w-4 h-4" />, onClick: () => {
        openFiles.forEach(p => {
          if (p !== path) onClose(p);
        });
      }},
      { label: '关闭右侧所有', icon: <ChevronRight className="w-4 h-4" />, onClick: () => {
        const idx = openFiles.indexOf(path);
        openFiles.slice(idx + 1).forEach(p => onClose(p));
      }},
      { label: '关闭所有', icon: <Ban className="w-4 h-4" />, onClick: () => {
        [...openFiles].forEach(p => onClose(p));
      }},
      { type: 'separator' },
      { label: '复制相对路径', icon: <Copy className="w-4 h-4" />, onClick: () => navigator.clipboard.writeText(path) },
    ]);
  };

  if (openFiles.length === 0) return null;

  return (
    <div className="h-9 bg-[#f6f8fa] border-b border-slate-200 flex items-center shrink-0 group/tabs select-none">
      <div 
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto overflow-y-hidden no-scrollbar h-full"
      >
        {openFiles.map((path) => {
          const name = path.split('/').pop() || path;
          const isActive = activePath === path;
          
          return (
            <div 
              key={path}
              className={cn(
                "group flex items-center gap-2 px-3 h-full cursor-pointer border-r border-slate-200 transition-all min-w-[120px] max-w-[200px] relative",
                isActive ? "bg-white text-slate-900 font-semibold shadow-[0_-1px_0_inset_white]" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
              onClick={() => onSelect(path)}
              onContextMenu={(e) => handleContextMenu(e, path)}
              title={path}
            >
              {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 z-10" />}
              {!isActive && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-slate-200" />}
              
              <FileIcon name={name} className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="text-[11px] truncate flex-1">{name}</span>
              
              <button 
                className={cn(
                  "p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(path);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center px-1 border-l border-slate-200 bg-[#f6f8fa] opacity-0 group-hover/tabs:opacity-100 transition-opacity">
        <button 
          className="p-1 hover:bg-slate-200 rounded text-slate-400"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button 
          className="p-1 hover:bg-slate-200 rounded text-slate-400"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};