import React, { useState } from 'react'
import { FilePlus, FolderOpen, FolderPlus, Play, RefreshCw, Trash2 } from 'lucide-react'
import type { WorkspaceEntry } from '../../features/workspace/workspaceStore'
import { showContextMenu } from '../../features/contextMenu/contextMenuStore'
import {
  createFile,
  createFolder,
  detectPythonEnv,
  deletePath,
  installPythonDeps,
  openFile,
  openWorkspaceFolder,
  refreshDir,
  renamePath,
  toggleDir,
} from '../../features/workspace/workspaceStore'

const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

export const DiskWorkspacePanel: React.FC<{
  root: string | null
  expanded: Record<string, boolean>
  entriesByDir: Record<string, WorkspaceEntry[]>
  loadingDirs: Record<string, boolean>
  activePath: string | null
  pythonEnv: { hasPyproject: boolean; hasRequirements: boolean; hasVenv: boolean; installer: 'uv-sync' | 'uv-pip' | 'none' } | null
  installStatus: { status: 'idle' | 'running' | 'done' | 'error'; message?: string } | null
  onRunFile: (path: string) => void
}> = ({ root, expanded, entriesByDir, loadingDirs, activePath, pythonEnv, installStatus, onRunFile }) => {
  const [adding, setAdding] = useState<{ mode: 'file' | 'folder'; dir: string; value: string } | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; value: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ path: string } | null>(null)
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

  const renderDir = (dir: string, depth: number): React.ReactNode => {
    const entries = entriesByDir[dir] ?? []
    return (
      <div key={`dir:${dir}`}>
        {dir ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1" style={{ paddingLeft: 8 + depth * 12 }}>
            <button
              className="flex-1 text-left text-xs text-slate-700 hover:bg-white rounded px-2 py-1"
              onClick={() => toggleDir(dir)}
            >
              {expanded[dir] ?? false ? '▾' : '▸'} {dir.split('/').pop()}
            </button>
            <button className="p-1 rounded hover:bg-white" title="新建文件" onClick={() => setAdding({ mode: 'file', dir, value: '' })}>
              <FilePlus className="w-4 h-4 text-slate-600" />
            </button>
            <button
              className="p-1 rounded hover:bg-white"
              title="新建目录"
              onClick={() => setAdding({ mode: 'folder', dir, value: '' })}
            >
              <FolderPlus className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        ) : null}

        {(dir === '' || (expanded[dir] ?? false)) && (
          <div>
            {loadingDirs[dir] ? (
              <div className="text-xs text-slate-500 px-3 py-2">加载中...</div>
            ) : null}
            {entries.map((e) => {
              if (e.kind === 'dir') {
                const open = expanded[e.path] ?? false
                return (
                  <div
                    key={e.path}
                    className="rounded px-1 py-0.5 hover:bg-white"
                    onContextMenu={(ev) => {
                      ev.preventDefault()
                      showContextMenu(ev.clientX, ev.clientY, [
                        {
                          label: '新建文件',
                          onClick: () => setAdding({ mode: 'file', dir: e.path, value: '' }),
                        },
                        {
                          label: '新建目录',
                          onClick: () => setAdding({ mode: 'folder', dir: e.path, value: '' }),
                        },
                        { label: '刷新', onClick: () => void refreshDir(e.path) },
                        { label: '重命名', onClick: () => setRenaming({ from: e.path, value: e.name }) },
                        { label: '删除', danger: true, onClick: () => setConfirmDel({ path: e.path }) },
                      ])
                    }}
                  >
                    {renderDir(e.path, dir ? depth + 1 : depth)}
                    {!open && !entriesByDir[e.path] ? null : null}
                  </div>
                )
              }
              const isActive = e.path === activePath
              const isRenaming = renaming?.from === e.path
              const canRun = e.path.endsWith('.py')
              return (
                <div
                  key={e.path}
                  className={`group rounded border flex items-center gap-2 ${isActive ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  style={{ marginLeft: 8 + (dir ? (depth + 1) * 12 : depth * 12) }}
                  onContextMenu={(ev) => {
                    ev.preventDefault()
                    showContextMenu(ev.clientX, ev.clientY, [
                      ...(canRun ? [{ label: '运行', onClick: () => onRunFile(e.path) }] : []),
                      { label: '重命名', onClick: () => setRenaming({ from: e.path, value: e.name }) },
                      { label: '删除', danger: true, onClick: () => setConfirmDel({ path: e.path }) },
                    ])
                  }}
                >
                  {isRenaming ? (
                    <input
                      className="flex-1 text-xs px-2 py-1 outline-none bg-transparent"
                      autoFocus
                      value={renaming?.value ?? ''}
                      onChange={(ev) => setRenaming({ from: e.path, value: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Escape') setRenaming(null)
                        if (ev.key === 'Enter') {
                          void renamePath(e.path, join(dir, renaming?.value ?? e.name))
                          setRenaming(null)
                        }
                      }}
                      onBlur={() => setRenaming(null)}
                    />
                  ) : (
                    <button className="flex-1 text-left text-xs text-slate-800 truncate px-2 py-1" onClick={() => void openFile(e.path)}>
                      {e.name}
                    </button>
                  )}
                  {canRun ? (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100"
                      title="运行"
                      onClick={() => onRunFile(e.path)}
                    >
                      <Play className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  ) : null}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100"
                    title="重命名"
                    onClick={() => setRenaming({ from: e.path, value: e.name })}
                  >
                    ✎
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100"
                    title="删除"
                    onClick={() => setConfirmDel({ path: e.path })}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-72 border-r border-slate-200 bg-slate-50 flex flex-col min-h-0" style={noDragStyle}>
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200">
        <div className="text-xs font-medium text-slate-700 truncate" title={root ?? ''}>
          {root ? root : '未打开文件夹'}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
            title="打开文件夹"
            onClick={() => void openWorkspaceFolder()}
          >
            <FolderOpen className="w-4 h-4 text-slate-700" />
          </button>
          {root ? (
            <button
              className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
              title="刷新"
              onClick={() => void refreshDir('')}
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          ) : null}
          {root ? (
            <>
              <button
                className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
                title="根目录新建文件"
                onClick={() => setAdding({ mode: 'file', dir: '', value: '' })}
              >
                <FilePlus className="w-4 h-4 text-slate-600" />
              </button>
              <button
                className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
                title="根目录新建目录"
                onClick={() => setAdding({ mode: 'folder', dir: '', value: '' })}
              >
                <FolderPlus className="w-4 h-4 text-slate-600" />
              </button>
              <button
                className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
                title="识别 Python 环境"
                onClick={() => void detectPythonEnv()}
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {root ? (
        <div className="px-3 py-3 border-b border-slate-200 bg-white space-y-3">
          <div>
            <div className="text-[11px] text-slate-600 mb-1">Python 环境</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  pythonEnv?.hasVenv ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                .venv {pythonEnv?.hasVenv ? '已存在' : '未发现'}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  pythonEnv?.hasPyproject ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                pyproject {pythonEnv?.hasPyproject ? '✓' : '—'}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  pythonEnv?.hasRequirements ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                requirements {pythonEnv?.hasRequirements ? '✓' : '—'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                {pythonEnv?.installer ? `安装器: ${pythonEnv.installer}` : '安装器: 未识别'}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-600 truncate">
                {installStatus?.status === 'running'
                  ? '正在安装...（日志在终端）'
                  : installStatus?.status === 'done'
                    ? '安装完成'
                    : installStatus?.status === 'error'
                      ? `安装失败：${installStatus.message ?? ''}`
                      : ''}
              </div>
              <button
                className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-900 text-white disabled:opacity-50"
                disabled={!pythonEnv || pythonEnv.installer === 'none' || installStatus?.status === 'running'}
                onClick={() => void installPythonDeps()}
              >
                一键安装
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adding ? (
        <div className="p-2 border-b border-slate-200 bg-white">
          <div className="text-[11px] text-slate-600 mb-1">{adding.mode === 'file' ? '新建文件名' : '新建目录名'}</div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 outline-none"
              autoFocus
              value={adding.value}
              onChange={(e) => setAdding({ ...adding, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAdding(null)
                if (e.key === 'Enter') {
                  const v = adding.value.trim()
                  if (!v) return
                  const p = join(adding.dir, v)
                  if (adding.mode === 'file') void createFile(p)
                  else void createFolder(p)
                  setAdding(null)
                }
              }}
            />
            <button
              className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-900 text-white"
              onClick={() => {
                const v = adding.value.trim()
                if (!v) return
                const p = join(adding.dir, v)
                if (adding.mode === 'file') void createFile(p)
                else void createFolder(p)
                setAdding(null)
              }}
            >
              创建
            </button>
            <button className="text-xs px-2 py-1 rounded border border-slate-200 bg-white" onClick={() => setAdding(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      {confirmDel ? (
        <div className="p-2 border-b border-slate-200 bg-white">
          <div className="text-xs text-slate-700">确认删除 {confirmDel.path}？</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="text-xs px-2 py-1 rounded border border-red-200 bg-red-600 text-white"
              onClick={() => {
                void deletePath(confirmDel.path)
                setConfirmDel(null)
              }}
            >
              删除
            </button>
            <button className="text-xs px-2 py-1 rounded border border-slate-200 bg-white" onClick={() => setConfirmDel(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto p-2">{renderDir('', 0)}</div>
    </div>
  )
}
