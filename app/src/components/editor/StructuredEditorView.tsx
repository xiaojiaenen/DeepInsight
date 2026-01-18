import React, { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import * as toml from 'smol-toml';
import { 
  Settings2, 
  Code2, 
  Plus, 
  Trash2, 
  Edit3,
  Copy,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Type,
  Hash,
  ToggleLeft,
  Box,
  List,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../layout/cn';
import { showContextMenu } from '../../features/contextMenu/contextMenuStore';

interface StructuredEditorViewProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onSwitchToCode: () => void;
}

export const StructuredEditorView: React.FC<StructuredEditorViewProps> = ({ 
  value, 
  onChange, 
  language,
  onSwitchToCode
}) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [filter, setFilter] = useState('');

  const matchesFilter = (key: string, val: any): boolean => {
    if (!filter) return true;
    const lowerFilter = filter.toLowerCase();
    if (key.toLowerCase().includes(lowerFilter)) return true;
    if (typeof val === 'string' && val.toLowerCase().includes(lowerFilter)) return true;
    if (typeof val === 'number' && String(val).includes(lowerFilter)) return true;
    if (typeof val === 'object' && val !== null) {
      return Object.entries(val).some(([k, v]) => matchesFilter(k, v));
    }
    return false;
  };

  useEffect(() => {
    if (viewMode === 'code') {
      onSwitchToCode();
      setViewMode('visual'); // reset for next time it's mounted
    }
  }, [viewMode, onSwitchToCode]);

  useEffect(() => {
    try {
      if (language === 'json') {
        const parsed = JSON.parse(value);
        setData(parsed);
        setError(null);
      } else if (language === 'yaml' || language === 'yml') {
        const parsed = yaml.load(value);
        setData(parsed);
        setError(null);
      } else if (language === 'toml') {
        const parsed = toml.parse(value);
        setData(parsed);
        setError(null);
      } else {
        setError(`目前不支持 ${language} 文件的可视化编辑`);
        setViewMode('code');
      }
    } catch (e: any) {
      setError(`解析错误: ${e.message}`);
    }
  }, [value, language]);

  const handleUpdate = (newData: any) => {
    try {
      let stringified = '';
      if (language === 'json') {
        stringified = JSON.stringify(newData, null, 2);
      } else if (language === 'yaml' || language === 'yml') {
        stringified = yaml.dump(newData);
      } else if (language === 'toml') {
        stringified = toml.stringify(newData);
      }
      onChange(stringified);
    } catch (e: any) {
      console.error('Failed to stringify data', e);
    }
  };

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  const toggleExpand = (path: string) => {
    const next = new Set(expandedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedPaths(next);
  };

  const handleRenameField = (path: string[], oldKey: string) => {
    const newKey = window.prompt('请输入新的字段名:', oldKey);
    if (!newKey || newKey === oldKey) return;
    
    const newData = JSON.parse(JSON.stringify(data));
    let target = newData;
    for (const p of path) target = target[p];
    
    if (target[newKey] !== undefined) {
      alert('字段名已存在');
      return;
    }
    
    target[newKey] = target[oldKey];
    delete target[oldKey];
    handleUpdate(newData);
  };

  const handleAddField = (path: string[], forcedType?: string) => {
    const key = window.prompt('请输入字段名:');
    if (!key) return;
    
    const newData = JSON.parse(JSON.stringify(data));
    let target = newData;
    for (const p of path) target = target[p];
    
    if (target[key] !== undefined) {
      alert('字段已存在');
      return;
    }
    
    let type = forcedType;
    if (!type) {
      type = window.prompt('请输入类型 (string, number, boolean, object, array):', 'string') || 'string';
    }

    let defaultValue: any = "";
    if (type === 'number') defaultValue = 0;
    else if (type === 'boolean') defaultValue = false;
    else if (type === 'object') defaultValue = {};
    else if (type === 'array') defaultValue = [];
    
    target[key] = defaultValue;
    handleUpdate(newData);
  };

  const handleMoveItem = (path: string[], key: string, direction: 'up' | 'down') => {
    const newData = JSON.parse(JSON.stringify(data));
    let target = newData;
    for (const p of path) target = target[p];

    if (!Array.isArray(target)) return;
    
    const idx = Number(key);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    if (newIdx < 0 || newIdx >= target.length) return;
    
    const item = target[idx];
    target.splice(idx, 1);
    target.splice(newIdx, 0, item);
    handleUpdate(newData);
  };

  const renderValue = (key: string, val: any, path: string[]) => {
    if (filter && !matchesFilter(key, val)) return null;
    
    const currentPath = [...path, key];
    const pathStr = currentPath.join('.');
    const isExpanded = expandedPaths.has(pathStr);
    const isArray = Array.isArray(val);
    const parentIsArray = Array.isArray(path.reduce((acc, p) => acc[p], data));

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items: any[] = [
        { label: '复制路径', icon: <Copy className="w-4 h-4" />, onClick: () => navigator.clipboard.writeText(pathStr) },
      ];

      if (path.length > 0 && !parentIsArray) {
        items.push({ label: '重命名', icon: <Edit3 className="w-4 h-4" />, onClick: () => handleRenameField(path, key) });
      }

      if (typeof val === 'object' && val !== null) {
        items.push({ type: 'separator' });
        if (isArray) {
          items.push({ 
            label: '添加项', 
            icon: <Plus className="w-4 h-4" />, 
            onClick: () => {
              const newData = JSON.parse(JSON.stringify(data));
              let target: any = newData;
              for (const p of path) target = target[p];
              target[key].push("");
              handleUpdate(newData);
              if (!isExpanded) toggleExpand(pathStr);
            } 
          });
        } else {
          items.push({ 
            label: '添加字段', 
            icon: <Plus className="w-4 h-4" />, 
            submenu: [
              { label: '字符串 (String)', icon: <Type className="w-4 h-4" />, onClick: () => handleAddField(currentPath, 'string') },
              { label: '数字 (Number)', icon: <Hash className="w-4 h-4" />, onClick: () => handleAddField(currentPath, 'number') },
              { label: '布尔 (Boolean)', icon: <ToggleLeft className="w-4 h-4" />, onClick: () => handleAddField(currentPath, 'boolean') },
              { label: '对象 (Object)', icon: <Box className="w-4 h-4" />, onClick: () => handleAddField(currentPath, 'object') },
              { label: '数组 (Array)', icon: <List className="w-4 h-4" />, onClick: () => handleAddField(currentPath, 'array') },
            ]
          });
        }
      }

      if (parentIsArray) {
        const idx = Number(key);
        const parentArr = path.reduce((acc, p) => acc[p], data);
        items.push({ type: 'separator' });
        items.push({ label: '上移', icon: <ArrowUp className="w-4 h-4" />, disabled: idx === 0, onClick: () => handleMoveItem(path, key, 'up') });
        items.push({ label: '下移', icon: <ArrowDown className="w-4 h-4" />, disabled: idx === parentArr.length - 1, onClick: () => handleMoveItem(path, key, 'down') });
      }

      items.push({ type: 'separator' });
      items.push({ 
        label: '删除', 
        icon: <Trash2 className="w-4 h-4" />, 
        danger: true, 
        onClick: () => {
          const newData = JSON.parse(JSON.stringify(data));
          let target: any = newData;
          for (const p of path) target = target[p];
          if (Array.isArray(target)) {
            target.splice(Number(key), 1);
          } else {
            delete target[key];
          }
          handleUpdate(newData);
        }
      });

      showContextMenu(e.clientX, e.clientY, items);
    };

    if (typeof val === 'object' && val !== null) {
      return (
        <div key={pathStr} className="ml-4 border-l border-slate-100 pl-4 mt-2">
          <div 
            className="flex items-center justify-between group/folder cursor-pointer py-1"
            onClick={() => toggleExpand(pathStr)}
            onContextMenu={handleContextMenu}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-tight">
              {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
              <span 
                className="hover:text-indigo-600 cursor-pointer transition-colors"
                onClick={(e) => {
                  if (path.length > 0) {
                    e.stopPropagation();
                    handleRenameField(path, key);
                  }
                }}
                title={path.length > 0 ? "点击重命名" : ""}
              >
                {isArray ? `[${key}]` : key}
              </span>
              <span className="ml-2 text-[10px] text-slate-400 font-normal lowercase">
                {isArray ? `array(${val.length})` : 'object'}
              </span>
            </div>
            <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-1">
              <button 
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(pathStr);
                }}
                title="复制路径"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button 
                className="p-1 hover:bg-indigo-50 text-indigo-500 rounded transition-all"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (isArray) {
                    const newData = JSON.parse(JSON.stringify(data));
                    let target: any = newData;
                    for (const p of path) target = target[p];
                    target[key].push("");
                    handleUpdate(newData);
                    if (!isExpanded) toggleExpand(pathStr);
                  } else {
                    handleAddField(currentPath); 
                    if (!isExpanded) toggleExpand(pathStr);
                  }
                }}
                title={isArray ? "添加项" : "添加字段"}
              >
                <Plus className="w-3 h-3" />
              </button>
              <button 
                className="p-1 hover:bg-red-50 text-red-400 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  const newData = JSON.parse(JSON.stringify(data));
                  let target: any = newData;
                  for (const p of path) target = target[p];
                  
                  if (Array.isArray(target)) {
                    target.splice(Number(key), 1);
                  } else {
                    delete target[key];
                  }
                  handleUpdate(newData);
                }}
                title="删除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {Object.entries(val).map(([k, v]) => renderValue(k, v, currentPath))}
              {Object.keys(val).length === 0 && (
                <div className="text-[10px] text-slate-400 italic py-1">
                  {isArray ? '空数组' : '空对象'}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div 
        key={pathStr} 
        className="flex items-center gap-3 py-1.5 px-2 hover:bg-slate-50/80 rounded group transition-colors"
        onContextMenu={handleContextMenu}
      >
        <div className="w-32 flex items-center gap-1.5 shrink-0 overflow-hidden">
          <div className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
          <label 
            className="text-xs text-slate-500 truncate font-medium cursor-pointer hover:text-indigo-600 transition-colors" 
            title={key}
            onClick={() => !Array.isArray(data) && handleRenameField(path, key)}
          >
            {Array.isArray(data) && path.length === 0 ? `[${key}]` : key}
          </label>
        </div>
        
        <div className="flex-1 flex items-center gap-2">
          {typeof val === 'boolean' ? (
            <button 
              onClick={() => {
                const newData = JSON.parse(JSON.stringify(data));
                let target = newData;
                for (const p of path) target = target[p];
                target[key] = !val;
                handleUpdate(newData);
              }}
              className={cn(
                "w-7 h-4 rounded-full transition-all relative outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500/20",
                val ? "bg-indigo-500" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all",
                val ? "right-0.5" : "left-0.5"
              )} />
            </button>
          ) : typeof val === 'number' ? (
            <input 
              type="number"
              className="flex-1 max-w-[120px] bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              value={val}
              onChange={(e) => {
                const newData = JSON.parse(JSON.stringify(data));
                let target = newData;
                for (const p of path) target = target[p];
                target[key] = Number(e.target.value);
                handleUpdate(newData);
              }}
            />
          ) : (
            <input 
              className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              value={val}
              onChange={(e) => {
                const newData = JSON.parse(JSON.stringify(data));
                let target = newData;
                for (const p of path) target = target[p];
                target[key] = e.target.value;
                handleUpdate(newData);
              }}
            />
          )}
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button 
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-all"
              onClick={() => {
                navigator.clipboard.writeText(pathStr);
              }}
              title="复制路径"
            >
              <Copy className="w-3 h-3" />
            </button>
            {!Array.isArray(data) && (
              <button 
                className="p-1 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded transition-all"
                onClick={() => handleRenameField(path, key)}
                title="重命名"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            <button 
              className="p-1 hover:bg-red-50 text-red-300 hover:text-red-500 rounded transition-all"
              onClick={() => {
                const newData = JSON.parse(JSON.stringify(data));
                let target = newData;
                for (const p of path) target = target[p];
                if (Array.isArray(target)) {
                  target.splice(Number(key), 1);
                } else {
                  delete target[key];
                }
                handleUpdate(newData);
              }}
              title="删除字段"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/30 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md transition-all uppercase tracking-wider",
              viewMode === 'visual' ? "bg-white shadow-sm text-indigo-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setViewMode('visual')}
          >
            <Settings2 className="w-3.5 h-3.5" />
            可视化编辑
          </button>
          <button 
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md transition-all uppercase tracking-wider",
              viewMode === 'code' ? "bg-white shadow-sm text-indigo-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setViewMode('code')}
          >
            <Code2 className="w-3.5 h-3.5" />
            源码视图
          </button>
        </div>
        {error ? (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-100">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            格式正确
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/10">
        {viewMode === 'visual' && data ? (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div className="shrink-0">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">配置编辑器</h2>
                <p className="text-xs text-slate-400 mt-1">可视化管理项目配置文件</p>
              </div>
              
              <div className="flex items-center gap-3 flex-1 justify-end ml-8">
                <div className="relative max-w-[240px] w-full group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="搜索配置项..."
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  {filter && (
                    <button 
                      onClick={() => setFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => handleAddField([])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all uppercase tracking-wider shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加顶级字段
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(data).map(([k, v]) => renderValue(k, v, []))}
              {Object.keys(data).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-xl">
                  <Plus className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">尚无配置内容，点击上方按钮开始添加</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Code2 className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">源码模式已激活</h3>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              在这里你可以直接编辑 JSON 原始代码。系统会自动校验格式，并确保与可视化编辑器的双向同步。
            </p>
            <button 
              onClick={() => setViewMode('visual')}
              className="mt-8 px-6 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              返回可视化编辑
            </button>
          </div>
        )}
      </div>
    </div>
  );
};