import React, { useEffect, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { OnMount } from '@monaco-editor/react';
import { subscribeEditorInsertText, subscribeEditorRevealPosition } from '../../lib/editorBus';
import { FileCode, ChevronRight, Hash, Info, GitBranch, Terminal, Settings, Search, Replace, MousePointer2 } from 'lucide-react';

import { showContextMenu } from '../../features/contextMenu/contextMenuStore';
import type { ContextMenuItem } from '../../features/contextMenu/contextMenuStore';

import { StructuredEditorView } from './StructuredEditorView';

loader.config({ monaco });

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange: (value: string) => void;
  path?: string;
  gitStatus?: { branch: string; changes: number } | null;
  pythonEnv?: { hasVenv: boolean; installer: string } | null;
  onRefreshGit?: () => void;
  onRefreshPython?: () => void;
  isSpecialFile?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value,
  language = "python",
  onChange,
  path,
  gitStatus,
  pythonEnv,
  onRefreshGit,
  onRefreshPython,
  isSpecialFile
}) => {
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }
  const [cursorPos, setCursorPos] = useState({ ln: 1, col: 1 });
  const [useStructured, setUseStructured] = useState(false);
  const [forcedCodeMode, setForcedCodeMode] = useState(false);

  useEffect(() => {
    if (!forcedCodeMode && isSpecialFile && (language === 'json' || language === 'yaml' || language === 'toml')) {
      setUseStructured(true);
    } else {
      setUseStructured(false);
    }
  }, [isSpecialFile, language, forcedCodeMode]);
  
  type MonacoSelection = {
    selectionStartLineNumber: number
    selectionStartColumn: number
    positionLineNumber: number
    positionColumn: number
  }

  type MonacoRange = {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }

  type MonacoModel = {
    getLineCount: () => number
    getLineMaxColumn: (lineNumber: number) => number
  }

  type MonacoEditorInstance = {
    getSelection: () => MonacoSelection | null
    getModel: () => MonacoModel | null
    executeEdits: (source: string, edits: { range: MonacoRange; text: string; forceMoveMarkers?: boolean }[]) => boolean
    setPosition: (pos: { lineNumber: number; column: number }) => void
    revealPositionInCenter: (pos: { lineNumber: number; column: number }) => void
    onDidChangeCursorPosition: (listener: (e: any) => void) => void
  }

  const editorRef = useRef<MonacoEditorInstance | null>(null)

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    const editorInstance = editor as unknown as MonacoEditorInstance;
    editorRef.current = editorInstance;
    (window as any).activeMonacoEditor = editorInstance;
    
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPos({ ln: e.position.lineNumber, col: e.position.column });
    });

    // 禁用 Monaco 原生右键菜单并绑定自定义菜单
    editor.onContextMenu((e) => {
      // 优先从 browserEvent 获取，其次使用 posx/posy
      const browserEvent = e.event.browserEvent;
      const clientX = browserEvent?.clientX ?? e.event.posx;
      const clientY = browserEvent?.clientY ?? e.event.posy;
      
      const model = editor.getModel();
      const selection = editor.getSelection();
      const hasSelection = selection && !selection.isEmpty();

      const items: ContextMenuItem[] = [
        {
          label: '格式化文档',
          icon: <Settings className="w-4 h-4" />,
          onClick: () => editor.getAction('editor.action.formatDocument')?.run(),
        },
        { type: 'separator' },
        {
          label: '复制',
          icon: <FileCode className="w-4 h-4" />,
          disabled: !hasSelection,
          onClick: () => {
            const text = model?.getValueInRange(selection!);
            if (text) navigator.clipboard.writeText(text);
          },
        },
        {
          label: '剪切',
          icon: <FileCode className="w-4 h-4" />,
          disabled: !hasSelection,
          onClick: () => {
            const text = model?.getValueInRange(selection!);
            if (text) {
              navigator.clipboard.writeText(text);
              editor.executeEdits('cut', [{ range: selection!, text: '' }]);
            }
          },
        },
        {
          label: '粘贴',
          icon: <FileCode className="w-4 h-4" />,
          onClick: async () => {
            const text = await navigator.clipboard.readText();
            if (text) {
              const pos = editor.getPosition();
              if (pos) {
                editor.executeEdits('paste', [{ 
                  range: selection || { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, 
                  text 
                }]);
              }
            }
          },
        },
        { type: 'separator' },
        {
          label: '查找',
          icon: <Search className="w-4 h-4" />,
          onClick: () => editor.getAction('actions.find')?.run(),
        },
        {
          label: '替换',
          icon: <Replace className="w-4 h-4" />,
          onClick: () => editor.getAction('editor.action.startFindReplaceAction')?.run(),
        },
        { type: 'separator' },
        {
          label: '转到定义',
          icon: <MousePointer2 className="w-4 h-4" />,
          onClick: () => editor.getAction('editor.action.revealDefinition')?.run(),
        },
      ];

      showContextMenu(clientX, clientY, items);
    });

    // 只有在 monacoInstance 存在时才定义主题
    if (monacoInstance) {
      // 这里的 monacoInstance 其实就是全局的 monaco 对象
      (window as any).monaco = monacoInstance;

      monacoInstance.editor.defineTheme('ide-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'd73a49', fontStyle: 'bold' },
          { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'string', foreground: '032f62' },
          { token: 'number', foreground: '005cc5' },
          { token: 'type', foreground: '6f42c1' },
          { token: 'class', foreground: '6f42c1', fontStyle: 'bold' },
          { token: 'function', foreground: '6f42c1' },
          { token: 'variable', foreground: '24292e' },
          { token: 'constant', foreground: '005cc5' },
          { token: 'tag', foreground: '22863a' },
          { token: 'attribute.name', foreground: '6f42c1' },
          { token: 'attribute.value', foreground: '032f62' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#24292e',
          'editor.lineHighlightBackground': '#f6f8fa',
          'editorCursor.foreground': '#24292e',
          'editor.selectionBackground': '#0366d625',
          'editor.inactiveSelectionBackground': '#0366d610',
          'editorLineNumber.foreground': '#d1d5da',
          'editorLineNumber.activeForeground': '#24292e',
          'editorIndentGuide.background': '#eff2f5',
          'editorIndentGuide.activeBackground': '#d7dbe0',
          'editorGroupHeader.tabsBackground': '#f6f8fa',
          'tab.activeBackground': '#ffffff',
          'tab.inactiveBackground': '#f6f8fa',
          'tab.border': '#e1e4e8',
          'editorStickyScroll.background': '#ffffff',
          'editorStickyScrollHover.background': '#f6f8fa',
        }
      });
      monacoInstance.editor.setTheme('ide-light');
    }
  };

  useEffect(() => {
    return subscribeEditorInsertText(({ text, mode = 'cursor', ensureNewline }) => {
      const editor = editorRef.current
      if (!editor) {
        const prefix = ensureNewline && value.length > 0 && !value.endsWith('\n') ? '\n' : ''
        onChange(value + prefix + text)
        return
      }

      const model = editor.getModel()
      const sel = editor.getSelection()
      const prefix = ensureNewline && value.length > 0 && !value.endsWith('\n') ? '\n' : ''
      const insertText = prefix + text

      let range: MonacoRange | null = null
      if (mode === 'end' && model) {
        const line = model.getLineCount()
        const col = model.getLineMaxColumn(line)
        range = { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col }
      } else if (sel) {
        range = {
          startLineNumber: sel.selectionStartLineNumber,
          startColumn: sel.selectionStartColumn,
          endLineNumber: sel.positionLineNumber,
          endColumn: sel.positionColumn,
        }
      }

      if (!range && model) {
        const line = model.getLineCount()
        const col = model.getLineMaxColumn(line)
        range = { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col }
      }

      if (range) {
        editor.executeEdits('ai-insert', [{ range, text: insertText, forceMoveMarkers: true }])
      }
    })
  }, [onChange, value])

  useEffect(() => {
    return subscribeEditorRevealPosition(({ lineNumber, column }) => {
      const editor = editorRef.current
      if (!editor) return
      const pos = { lineNumber, column: column ?? 1 }
      editor.setPosition(pos)
      editor.revealPositionInCenter(pos)
    })
  }, [])

  useEffect(() => {
    if (editorRef.current && language) {
      const model = (editorRef.current as any).getModel();
      if (model && monaco) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  const fileName = path?.split(/[\\\/]/).pop() || 'untitled';
  const folderPath = path?.split(/[\\\/]/).slice(0, -1).join(' / ') || '';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-white border-l border-slate-200" style={noDragStyle}>
      {/* 编辑器顶部导航栏 (Breadcrumbs & Tab) */}
      <div className={`flex flex-col border-b border-slate-100 ${isSpecialFile ? 'bg-amber-50/30' : 'bg-[#f6f8fa]/50'}`}>
        <div className="flex items-center h-9 px-3 gap-2 overflow-hidden">
          <div className={`flex items-center gap-1.5 px-3 py-1 border-t-2 border-x rounded-t-sm shadow-sm text-xs font-medium ${
            isSpecialFile 
              ? 'bg-white border-t-amber-500 border-x-amber-100 text-amber-900' 
              : 'bg-white border-t-emerald-500 border-x-slate-200 text-slate-700'
          }`}>
            {isSpecialFile ? <Settings className="w-3.5 h-3.5 text-amber-500" /> : <FileCode className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{fileName}</span>
          </div>
        </div>
        <div className={`flex items-center h-7 px-4 gap-1.5 text-[11px] border-t ${
          isSpecialFile ? 'bg-amber-50/20 border-amber-100/50 text-amber-700/70' : 'bg-transparent border-slate-100 text-slate-500'
        }`}>
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Workspace</span>
          {folderPath && (
            <>
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span className="hover:text-slate-800 cursor-pointer transition-colors truncate">{folderPath}</span>
            </>
          )}
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span className={`font-medium ${isSpecialFile ? 'text-amber-900' : 'text-slate-900'}`}>{fileName}</span>
        </div>
      </div>

      {/* 主编辑器区域 */}
      <div className="flex-1 min-h-0 relative group flex flex-col">
        {useStructured ? (
          <StructuredEditorView 
            value={value} 
            onChange={onChange} 
            language={language} 
            onSwitchToCode={() => setForcedCodeMode(true)}
          />
        ) : (
          <div className="flex-1 relative">
            {isSpecialFile && (
              <button 
                className="absolute top-2 right-12 z-10 px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-emerald-700 transition-all uppercase tracking-wider"
                onClick={() => setForcedCodeMode(false)}
              >
                返回可视化编辑
              </button>
            )}
            <Editor
              height="100%"
              path={path}
              language={language}
              value={value}
              theme="ide-light"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontLigatures: true,
                minimap: { 
                  enabled: true,
                  scale: 1,
                  renderCharacters: false,
                  showSlider: 'mouseover',
                  side: 'right'
                },
                stickyScroll: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                  useShadows: false,
                },
                fixedOverflowWidgets: true,
                wordWrap: 'on',
                lineHeight: 22,
                letterSpacing: 0.3,
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true,
                  highlightActiveBracketPair: true,
                  highlightActiveIndentationGuide: true
                },
                cursorSmoothCaretAnimation: 'on',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                roundedSelection: true,
                contextmenu: false,
                links: true,
                mouseWheelZoom: true,
                folding: true,
                matchBrackets: 'always',
                selectionHighlight: true,
                occurrencesHighlight: true,
                formatOnType: true,
                formatOnPaste: true,
                hover: {
                  enabled: true,
                  delay: 300,
                  sticky: true
                },
                quickSuggestions: {
                  other: true,
                  comments: true,
                  strings: true
                },
                parameterHints: {
                  enabled: true,
                  cycle: true
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                wordBasedSuggestions: 'allDocuments',
                suggest: {
                  snippetsPreventQuickSuggestions: false,
                  showMethods: true,
                  showFunctions: true,
                  showConstructors: true,
                  showFields: true,
                  showVariables: true,
                  showClasses: true,
                  showStructs: true,
                  showInterfaces: true,
                  showModules: true,
                  showProperties: true,
                  showEvents: true,
                  showOperators: true,
                  showUnits: true,
                  showValue: true,
                  showConstants: true,
                  showEnums: true,
                  showEnumMembers: true,
                  showKeywords: true,
                  showWords: true,
                  showColors: true,
                  showFiles: true,
                  showReferences: true,
                  showFolders: true,
                  showTypeParameters: true,
                  showSnippets: true,
                }
              }}
              onChange={(v) => onChange(v ?? '')}
              onMount={handleEditorDidMount}
              loading={<div className="h-full w-full flex items-center justify-center text-slate-400 text-sm bg-white font-medium">
                <Info className="w-4 h-4 mr-2 animate-pulse" />
                正在准备编辑器...
              </div>}
            />
          </div>
        )}
      </div>

      {/* 编辑器底部状态栏 */}
      <div className="h-6 px-4 flex items-center justify-between border-t border-slate-100 bg-[#f6f8fa]/80 text-[10px] text-slate-500 font-medium">
        <div className="flex-1 flex items-center gap-4 overflow-hidden">
          {/* Git 状态 */}
          {gitStatus && (
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-200/80 cursor-pointer transition-colors shrink-0 group/git"
              onClick={onRefreshGit}
              title="点击刷新 Git 状态"
            >
              <GitBranch className="w-3 h-3 text-slate-400 group-hover/git:text-emerald-500 transition-colors" />
              <span className="text-slate-600 font-semibold">{gitStatus.branch}</span>
              {gitStatus.changes > 0 && (
                <span className="text-orange-500">({gitStatus.changes})</span>
              )}
            </div>
          )}

          {/* Python 环境 */}
          {pythonEnv && (
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-200/80 cursor-pointer transition-colors shrink-0 group/env"
              onClick={onRefreshPython}
              title="点击识别 Python 环境"
            >
              <Terminal className="w-3 h-3 text-slate-400 group-hover/env:text-emerald-500 transition-colors" />
              <span className={pythonEnv.hasVenv ? "text-emerald-600" : "text-slate-500"}>
                {pythonEnv.hasVenv ? '.venv' : 'No Venv'}
              </span>
              <span className="text-slate-400 opacity-60">[{pythonEnv.installer}]</span>
            </div>
          )}

          <div className="w-px h-3 bg-slate-200 mx-1 shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            <Hash className="w-3 h-3" />
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-1.5 uppercase tracking-wider text-emerald-600 shrink-0">
            {language}
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <span>Ln {cursorPos.ln}, Col {cursorPos.col}</span>
          <span>Space: 4</span>
        </div>
      </div>
    </div>
  );
};
