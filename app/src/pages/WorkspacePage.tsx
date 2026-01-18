import React, { useEffect, useRef, useState } from 'react'
import { CodeEditor } from '../components/editor/CodeEditor'
import { MarkdownEditorView } from '../components/editor/MarkdownEditorView'
import { GitDiffView } from '../components/editor/GitDiffView'
import { FilePanel } from '../components/editor/FilePanel'
import { DiskWorkspacePanel } from '../components/editor/DiskWorkspacePanel'
import { GitPanel } from '../components/editor/GitPanel'
import { SearchPanel } from '../components/editor/SearchPanel'
import { ModelVisualizer } from '../components/visualizer/ModelVisualizer'
import { QuickOpen } from '../components/editor/QuickOpen'
import { MarkdownPreview } from '../components/preview/MarkdownPreview'
import { TerminalPanel } from '../components/terminal/TerminalPanel'
import { useProjectFiles } from '../features/files/useProjectFiles'
import { setActiveFileByPath, updateFileContent } from '../features/files/filesStore'
import { subscribeEditorOpenFile, editorRevealPosition } from '../lib/editorBus'
import { useWorkspace } from '../features/workspace/useWorkspace'
import { EditorTabs } from '../components/editor/EditorTabs'
import { 
  installPythonDeps, 
  openFile as openDiskFile, 
  closeFile as closeDiskFile,
  updateOpenFile as updateDiskFile, 
  subscribeInstallEvents,
  refreshGitStatus,
  detectPythonEnv
} from '../features/workspace/workspaceStore'
import { terminalWriteLine } from '../lib/terminalBus'
import { showContextMenu } from '../features/contextMenu/contextMenuStore'
import type { ContextMenuItem } from '../features/contextMenu/contextMenuStore'

const extOf = (p: string) => {
  const name = p.split('/').pop() ?? p
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

const languageForPath = (p: string) => {
  const ext = extOf(p)
  const map: Record<string, string> = {
    'py': 'python',
    'md': 'markdown',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'toml': 'toml',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'dockerfile': 'dockerfile',
    'ignore': 'gitignore',
    'txt': 'plaintext',
    'ini': 'ini',
    'conf': 'ini',
    'bat': 'bat',
    'powershell': 'powershell',
    'ps1': 'powershell',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'cpp',
    'java': 'java',
    'go': 'go',
    'rust': 'rust',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'lua': 'lua',
    'xml': 'xml',
    'svg': 'xml',
  }
  return map[ext] || 'plaintext'
}

type WorkspacePageProps = {
  pythonBadge: string
  isRunning: boolean
  onRun: () => void
  onRunFile: (path: string) => void
  onStop: () => void
}

import { 
  FileCode, 
  GitBranch, 
  Search as SearchIcon,
  StickyNote, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Boxes
} from 'lucide-react'

type SidebarTab = 'files' | 'search' | 'git' | 'visualizer' | 'settings'

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ pythonBadge, isRunning, onRun, onRunFile, onStop }) => {
  const { state, activeFile } = useProjectFiles()
  const { state: ws, activeContent } = useWorkspace()
  const [terminalHeight, setTerminalHeight] = useState(240)
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [quickOpenVisible, setQuickOpenVisible] = useState(false)

  const [diffPath, setDiffPath] = useState<string | null>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  
  const diskMode = typeof window.workspace !== 'undefined'
  const currentPath = diskMode ? ws.activePath : activeFile?.path ?? null
  const currentExt = currentPath ? extOf(currentPath) : ''
  const currentLanguage = currentPath ? languageForPath(currentPath) : 'python'
  const isSpecialFile = ['json', 'toml', 'yaml', 'yml'].includes(currentExt);

  useEffect(() => {
    if (!diskMode) return
    return subscribeInstallEvents((line) => terminalWriteLine(`[deps] ${line}`))
  }, [diskMode])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('deepinsight:terminalHeight')
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 140 && n <= 560) setTerminalHeight(n)
    } catch (e) {
      void e
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (isRunning) onStop()
        else onRun()
      }
      if ((e.key === '`' || e.key === 'Backquote') && mod) {
        e.preventDefault()
        setTerminalCollapsed((v) => !v)
      }
      if (e.key === 'f' && mod && e.shiftKey) {
        e.preventDefault()
        setSidebarTab('search')
        setSidebarVisible(true)
      }
      if (e.key === 'p' && mod) {
        e.preventDefault()
        setQuickOpenVisible(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isRunning, onRun, onStop])

  useEffect(() => {
    return subscribeEditorOpenFile(({ path, lineNumber, column }) => {
      setDiffPath(null);
      if (diskMode && ws.root) {
        void openDiskFile(path)
      } else {
        setActiveFileByPath(path)
      }
      window.setTimeout(() => {
        editorRevealPosition({ lineNumber, column })
      }, 0)
    })
  }, [diskMode, ws.root])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const delta = d.startY - e.clientY
      const next = Math.max(140, Math.min(560, d.startH + delta))
      setTerminalHeight(next)
      setTerminalCollapsed(false)
    }

    const onUp = () => {
      setIsDragging(false)
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem('deepinsight:terminalHeight', String(terminalHeight))
    }

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, terminalHeight])

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragRef.current = { startY: e.clientY, startH: terminalHeight }
  }

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Activity Bar - 最左侧图标导航 */}
        <div className="w-12 bg-slate-900 flex flex-col items-center py-4 gap-4 z-20">
          <button 
            className={`p-2 rounded-lg transition-colors ${sidebarTab === 'files' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white'}`}
            onClick={() => {
              if (sidebarTab === 'files' && sidebarVisible) setSidebarVisible(false)
              else { setSidebarTab('files'); setSidebarVisible(true); }
            }}
            title="文件管理器"
          >
            <FileCode className="w-5 h-5" />
          </button>
          <button 
            className={`p-2 rounded-lg transition-colors ${sidebarTab === 'search' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white'}`}
            onClick={() => {
              if (sidebarTab === 'search' && sidebarVisible) setSidebarVisible(false)
              else { setSidebarTab('search'); setSidebarVisible(true); }
            }}
            title="全局搜索 (Ctrl+Shift+F)"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
          <button 
            className={`p-2 rounded-lg transition-colors ${sidebarTab === 'git' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white'}`}
            onClick={() => {
              if (sidebarTab === 'git' && sidebarVisible) setSidebarVisible(false)
              else { setSidebarTab('git'); setSidebarVisible(true); }
            }}
            title="源代码管理"
          >
            <GitBranch className="w-5 h-5" />
          </button>
          <button 
            className={`p-2 rounded-lg transition-colors ${sidebarTab === 'visualizer' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white'}`}
            onClick={() => {
              if (sidebarTab === 'visualizer' && sidebarVisible) setSidebarVisible(false)
              else { setSidebarTab('visualizer'); setSidebarVisible(true); }
            }}
            title="模型可视化"
          >
            <BrainCircuit className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="p-2 text-slate-400 hover:text-white transition-colors" title="设置">
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 侧边栏内容区 */}
        {sidebarVisible && (
          <div className="w-72 flex flex-col border-r border-slate-200 bg-white">
            {sidebarTab === 'files' && (
              diskMode ? (
                <DiskWorkspacePanel
                  root={ws.root}
                  expanded={ws.expanded}
                  entriesByDir={ws.entriesByDir}
                  loadingDirs={ws.loadingDirs}
                  activePath={ws.activePath}
                  openPaths={ws.openPathList}
                  pythonEnv={ws.pythonEnv}
                  installStatus={ws.installStatus}
                  gitStatus={ws.gitStatus}
                  onRunFile={onRunFile}
                  onSelect={(p) => setDiffPath(null)}
                />
              ) : (
                <FilePanel files={state.files} activeId={state.activeFileId} onRunFile={onRunFile} />
              )
            )}
            {sidebarTab === 'search' && (
              <SearchPanel />
            )}
            {sidebarTab === 'git' && (
              diskMode ? (
                <GitPanel 
                  gitStatus={ws.gitStatus} 
                  gitLoading={ws.gitLoading}
                  onOpenFile={(path) => {
                    setDiffPath(null);
                    void openDiskFile(path);
                  }}
                  onShowDiff={(path) => setDiffPath(path)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <GitBranch className="w-12 h-12 text-slate-200 mb-4" />
                  <h3 className="text-sm font-medium text-slate-900 mb-1">源代码管理</h3>
                  <p className="text-xs text-slate-500 mb-4">仅在本地目录模式下支持 Git 管理</p>
                </div>
              )
            )}
            {sidebarTab === 'visualizer' && (
              <ModelVisualizer />
            )}
          </div>
        )}

        {/* 主编辑区 */}
        <div className="flex-1 min-w-0 flex flex-col relative overflow-hidden bg-white">
          {!sidebarVisible && (
            <button 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 bg-white border border-l-0 border-slate-200 rounded-r flex items-center justify-center z-10 hover:bg-slate-50 text-slate-400"
              onClick={() => setSidebarVisible(true)}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {diskMode && (
              <EditorTabs 
                openFiles={ws.openPathList} 
                activePath={ws.activePath} 
                onSelect={(p) => {
                  setDiffPath(null);
                  void openDiskFile(p);
                }} 
                onClose={(p) => closeDiskFile(p)} 
              />
            )}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">
              {diffPath ? (
                <GitDiffView path={diffPath} onClose={() => setDiffPath(null)} />
              ) : !currentPath ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white p-12">
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                    <FileCode className="w-10 h-10 text-slate-200" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">欢迎使用 DeepInsight</h2>
                  <p className="text-sm text-slate-500 mb-8 max-w-xs text-center">
                    从左侧文件树选择一个文件开始编辑，或使用快捷键快速操作。
                  </p>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    {[
                      { label: '运行项目', key: 'Ctrl + Enter' },
                      { label: '查找文件', key: 'Ctrl + P' },
                      { label: '切换终端', key: 'Ctrl + `' },
                      { label: '全局搜索', key: 'Ctrl + Shift + F' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-600">{item.label}</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 shadow-sm">{item.key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentExt === 'md' ? (
                <MarkdownEditorView
                  path={currentPath ?? undefined}
                  value={diskMode ? (activeContent ?? '') : (activeFile?.content ?? '')}
                  gitStatus={diskMode ? ws.gitStatus : null}
                  pythonEnv={diskMode ? ws.pythonEnv : null}
                  onRefreshGit={() => void refreshGitStatus()}
                  onRefreshPython={() => void detectPythonEnv()}
                  isSpecialFile={isSpecialFile}
                  onChange={(v) => {
                    if (diskMode) {
                      const p = ws.activePath
                      if (p) updateDiskFile(p, v)
                    } else if (activeFile) {
                      updateFileContent(activeFile.id, v)
                    }
                  }}
                />
              ) : (
                <div className={`flex-1 min-h-0 ${isSpecialFile ? 'bg-slate-50/30' : ''}`}>
                  <CodeEditor
                    path={currentPath ?? undefined}
                    language={currentLanguage}
                    value={diskMode ? (activeContent ?? '') : (activeFile?.content ?? '')}
                    gitStatus={diskMode ? ws.gitStatus : null}
                    pythonEnv={diskMode ? ws.pythonEnv : null}
                    onRefreshGit={() => void refreshGitStatus()}
                    onRefreshPython={() => void detectPythonEnv()}
                    isSpecialFile={isSpecialFile}
                    onChange={(v) => {
                      if (diskMode) {
                        const p = ws.activePath
                        if (p) updateDiskFile(p, v)
                      } else if (activeFile) {
                        updateFileContent(activeFile.id, v)
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!terminalCollapsed && (
        <div 
          className="h-1.5 bg-slate-200 hover:bg-indigo-400 cursor-ns-resize transition-colors relative z-30"
          onMouseDown={onMouseDown}
        >
          {/* 增加点击区域 */}
          <div className="absolute inset-x-0 -top-1 -bottom-1 cursor-ns-resize" />
        </div>
      )}
      <div 
        className="bg-white border-t border-slate-200 overflow-hidden flex flex-col shrink-0"
        style={{ height: terminalCollapsed ? '32px' : `${terminalHeight}px` }}
      >
        <div className="h-8 px-3 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-600">
            终端 · Ctrl+Enter 运行 · Ctrl+` 折叠
          </div>
          <button
            className="text-xs text-slate-500 hover:text-slate-900"
            onClick={() => setTerminalCollapsed(!terminalCollapsed)}
          >
            {terminalCollapsed ? '展开' : '折叠'}
          </button>
        </div>
        <div className={`flex-1 min-h-0 ${terminalCollapsed ? 'hidden' : ''}`}>
          <TerminalPanel />
        </div>
      </div>
      {quickOpenVisible && <QuickOpen onClose={() => setQuickOpenVisible(false)} />}
    </div>
  )
}
