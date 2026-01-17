import React, { useEffect, useRef, useState } from 'react'
import { CodeEditor } from '../components/editor/CodeEditor'
import { FilePanel } from '../components/editor/FilePanel'
import { DiskWorkspacePanel } from '../components/editor/DiskWorkspacePanel'
import { MarkdownPreview } from '../components/preview/MarkdownPreview'
import { TerminalPanel } from '../components/terminal/TerminalPanel'
import { useProjectFiles } from '../features/files/useProjectFiles'
import { setActiveFileByPath, updateFileContent } from '../features/files/filesStore'
import { subscribeEditorOpenFile, editorRevealPosition } from '../lib/editorBus'
import { useWorkspace } from '../features/workspace/useWorkspace'
import { installPythonDeps, openFile as openDiskFile, updateOpenFile as updateDiskFile, subscribeInstallEvents } from '../features/workspace/workspaceStore'
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
  if (ext === 'py') return 'python'
  if (ext === 'md') return 'markdown'
  if (ext === 'json') return 'json'
  if (ext === 'yml' || ext === 'yaml') return 'yaml'
  if (ext === 'toml') return 'ini'
  return 'plaintext'
}

type WorkspacePageProps = {
  pythonBadge: string
  isRunning: boolean
  onRun: () => void
  onRunFile: (path: string) => void
  onStop: () => void
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ pythonBadge, isRunning, onRun, onRunFile, onStop }) => {
  const { state, activeFile } = useProjectFiles()
  const { state: ws, activeContent } = useWorkspace()
  const [terminalHeight, setTerminalHeight] = useState(240)
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const diskMode = typeof window.workspace !== 'undefined'
  const currentPath = diskMode ? ws.activePath : activeFile?.path ?? null
  const currentExt = currentPath ? extOf(currentPath) : ''
  const currentLanguage = currentPath ? languageForPath(currentPath) : 'python'

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
    try {
      localStorage.setItem('deepinsight:terminalHeight', String(terminalHeight))
    } catch (e) {
      void e
    }
  }, [terminalHeight])

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
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isRunning, onRun, onStop])

  useEffect(() => {
    return subscribeEditorOpenFile(({ path, lineNumber, column }) => {
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

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startH: terminalHeight }
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const next = Math.max(140, Math.min(560, d.startH - (ev.clientY - d.startY)))
      setTerminalCollapsed(false)
      setTerminalHeight(next)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {diskMode ? (
          <DiskWorkspacePanel
            root={ws.root}
            expanded={ws.expanded}
            entriesByDir={ws.entriesByDir}
            loadingDirs={ws.loadingDirs}
            activePath={ws.activePath}
            pythonEnv={ws.pythonEnv}
            installStatus={ws.installStatus}
            onRunFile={onRunFile}
          />
        ) : (
          <FilePanel files={state.files} activeId={state.activeFileId} onRunFile={onRunFile} />
        )}
        <div className="flex-1 min-w-0">
          <div
            className="h-full w-full flex flex-col min-h-0"
            onContextMenu={(e) => {
              e.preventDefault()
              const items: ContextMenuItem[] = [
                { label: '剪切', onClick: () => { document.execCommand('cut') } },
                { label: '复制', onClick: () => { document.execCommand('copy') } },
                { label: '粘贴', onClick: () => { document.execCommand('paste') } },
                { label: '全选', onClick: () => { document.execCommand('selectAll') } },
              ]
              if (diskMode && ws.root && ws.pythonEnv && ws.pythonEnv.installer !== 'none') {
                if (currentPath && (currentPath.endsWith('pyproject.toml') || currentPath.endsWith('requirements.txt'))) {
                  items.unshift({ label: '一键安装依赖', onClick: () => { void installPythonDeps() } })
                }
              }
              if (currentPath && currentPath.endsWith('.py')) {
                items.unshift({ label: '运行', onClick: () => { onRunFile(currentPath) } })
              }
              if (currentExt === 'json') {
                items.unshift({
                  label: '格式化 JSON',
                  onClick: () => {
                    const raw = diskMode ? (activeContent ?? '') : activeFile?.content ?? ''
                    try {
                      const pretty = JSON.stringify(JSON.parse(raw), null, 2) + '\n'
                      if (diskMode) {
                        const p = ws.activePath
                        if (p) updateDiskFile(p, pretty)
                      } else if (activeFile) {
                        updateFileContent(activeFile.id, pretty)
                      }
                    } catch {
                      terminalWriteLine('JSON 格式化失败：不是合法 JSON。')
                    }
                  },
                })
              }
              showContextMenu(e.clientX, e.clientY, items)
            }}
          >
            {diskMode ? (
              <div className={`flex-1 min-h-0 ${currentExt === 'md' ? 'grid grid-cols-2' : 'block'}`}>
                <div className="min-h-0">
                  <CodeEditor
                    language={currentLanguage}
                    value={activeContent ?? ''}
                    onChange={(v) => {
                      const p = ws.activePath
                      if (!p) return
                      updateDiskFile(p, v)
                    }}
                  />
                </div>
                {currentExt === 'md' ? (
                  <div className="min-h-0 border-l border-slate-200">
                    <MarkdownPreview value={activeContent ?? ''} />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={`flex-1 min-h-0 ${currentExt === 'md' ? 'grid grid-cols-2' : 'block'}`}>
                <div className="min-h-0">
                  <CodeEditor
                    language={currentLanguage}
                    value={activeFile?.content ?? ''}
                    onChange={(v) => {
                      if (!activeFile) return
                      updateFileContent(activeFile.id, v)
                    }}
                  />
                </div>
                {currentExt === 'md' ? (
                  <div className="min-h-0 border-l border-slate-200">
                    <MarkdownPreview value={activeFile?.content ?? ''} />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="h-2 shrink-0 cursor-row-resize bg-slate-50 hover:bg-slate-100 border-t border-slate-200"
        onMouseDown={onMouseDown}
      />
      <div className="shrink-0 border-t border-slate-200 bg-white" style={{ height: terminalCollapsed ? 40 : terminalHeight }}>
        <div className="h-full flex flex-col">
          <div className="h-10 px-3 flex items-center justify-between border-b border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-600">
              快捷键：Ctrl+Enter 运行/停止 · Ctrl+` 折叠终端
            </div>
            <button
              className="text-xs text-slate-700 hover:bg-white px-2 py-1 rounded border border-slate-200 bg-white"
              onClick={() => setTerminalCollapsed((v) => !v)}
            >
              {terminalCollapsed ? '展开' : '折叠'}
            </button>
          </div>
          <div className={`${terminalCollapsed ? 'hidden' : 'block'} flex-1 min-h-0`}>
            <TerminalPanel pythonBadge={pythonBadge} />
          </div>
        </div>
      </div>
    </div>
  )
}
