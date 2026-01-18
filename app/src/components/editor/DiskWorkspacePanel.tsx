import React, { useState } from 'react'
import { 
  FilePlus, 
  FolderOpen, 
  FolderPlus, 
  Play, 
  RefreshCw, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  FileCode, 
  Search,
  MoreVertical,
  X,
  Edit3,
  Copy,
  Folder
} from 'lucide-react'
import type { WorkspaceEntry } from '../../features/workspace/workspaceStore'
import { showContextMenu } from '../../features/contextMenu/contextMenuStore'
import {
  createFile,
  createFolder,
  deletePath,
  openFile,
  openWorkspaceFolder,
  refreshDir,
  renamePath,
  toggleDir,
} from '../../features/workspace/workspaceStore'

const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

const FileIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css'].includes(ext || '')) {
    return <FileCode className={className} />
  }
  return <FileText className={className} />
}

export const DiskWorkspacePanel: React.FC<{
  root: string | null
  expanded: Record<string, boolean>
  entriesByDir: Record<string, WorkspaceEntry[]>
  loadingDirs: Record<string, boolean>
  activePath: string | null
  onRunFile: (path: string) => void
  onSelect?: (path: string) => void
  openPaths?: string[]
}> = ({ root, expanded, entriesByDir, loadingDirs, activePath, onRunFile, onSelect, openPaths = [] }) => {
  const [adding, setAdding] = useState<{ mode: 'file' | 'folder'; dir: string; value: string } | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; value: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ path: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

  const renderDir = (dir: string, depth: number): React.ReactNode => {
    let entries = entriesByDir[dir] ?? []
    
    // Simple filter for search
    if (searchQuery) {
      entries = entries.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    return (
      <div key={`dir:${dir}`} className="flex flex-col">
        {dir ? (
          <div 
            className="group flex items-center gap-1.5 px-2 py-1 hover:bg-slate-200/50 rounded cursor-pointer transition-colors" 
            style={{ paddingLeft: 4 + depth * 12 }}
            onClick={() => toggleDir(dir)}
            onContextMenu={(ev) => {
              ev.preventDefault()
              showContextMenu(ev.clientX, ev.clientY, [
                { label: '新建文件', icon: <FilePlus className="w-4 h-4" />, onClick: () => setAdding({ mode: 'file', dir, value: '' }) },
                { label: '新建目录', icon: <FolderPlus className="w-4 h-4" />, onClick: () => setAdding({ mode: 'folder', dir, value: '' }) },
                { type: 'separator' },
                { label: '刷新', icon: <RefreshCw className="w-4 h-4" />, onClick: () => void refreshDir(dir) },
                { label: '重命名', icon: <Edit3 className="w-4 h-4" />, onClick: () => setRenaming({ from: dir, value: dir.split('/').pop() || '' }) },
                { label: '删除', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => setConfirmDel({ path: dir }) },
              ])
            }}
          >
            {expanded[dir] ?? false ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <span className="flex-1 text-xs text-slate-700 font-medium truncate">
              {dir.split('/').pop()}
            </span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button 
                className="p-0.5 hover:bg-slate-300 rounded" 
                onClick={(e) => { e.stopPropagation(); setAdding({ mode: 'file', dir, value: '' }) }}
                title="新建文件"
              >
                <FilePlus className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        ) : null}

        {(dir === '' || (expanded[dir] ?? false)) && (
          <div className="flex flex-col">
            {loadingDirs[dir] && (
              <div className="text-[10px] text-slate-400 px-6 py-1 italic animate-pulse">加载中...</div>
            )}
            {entries.map((e) => {
              if (e.kind === 'dir') {
                return renderDir(e.path, dir ? depth + 1 : depth)
              }
              
              const isActive = e.path === activePath
              const isOpen = openPaths.includes(e.path)
              const isRenaming = renaming?.from === e.path
              const canRun = e.path.endsWith('.py')
              
              return (
                <div
                  key={e.path}
                  className={`group flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 
                    isOpen ? 'hover:bg-slate-200/50 text-slate-900' : 'hover:bg-slate-200/50 text-slate-600'
                  }`}
                  style={{ paddingLeft: 18 + (dir ? (depth + 1) * 12 : depth * 12) }}
                  onClick={() => {
                    onSelect?.(e.path)
                    void openFile(e.path)
                  }}
                  onContextMenu={(ev) => {
                    ev.preventDefault()
                    showContextMenu(ev.clientX, ev.clientY, [
                      ...(canRun ? [{ label: '运行', icon: <Play className="w-4 h-4 text-emerald-500" />, onClick: () => onRunFile(e.path) }] : []),
                      { label: '复制相对路径', icon: <Copy className="w-4 h-4" />, onClick: () => { navigator.clipboard.writeText(e.path) } },
                      { type: 'separator' },
                      { label: '重命名', icon: <Edit3 className="w-4 h-4" />, onClick: () => setRenaming({ from: e.path, value: e.name }) },
                { label: '刷新', icon: <RefreshCw className="w-4 h-4" />, onClick: () => void openFile(e.path) },
                { label: '删除', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => setConfirmDel({ path: e.path }) },
                    ])
                  }}
                >
                  <FileIcon name={e.name} className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                  
                  {isRenaming ? (
                    <input
                      className="flex-1 text-xs px-1 bg-white border border-indigo-300 rounded outline-none"
                      autoFocus
                      value={renaming?.value ?? ''}
                      onChange={(ev) => setRenaming({ from: e.path, value: ev.target.value })}
                      onClick={e => e.stopPropagation()}
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
                    <span className="flex-1 text-xs truncate font-normal">
                      {e.name}
                    </span>
                  )}

                  {isOpen && !isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  )}

                  <div className="hidden group-hover:flex items-center gap-1">
                    {canRun && (
                      <button
                        className="p-0.5 hover:bg-slate-300 rounded"
                        onClick={(e) => { e.stopPropagation(); onRunFile(e.path) }}
                      >
                        <Play className="w-3 h-3 text-slate-500" />
                      </button>
                    )}
                    <button
                      className="p-0.5 hover:bg-slate-300 rounded"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        showContextMenu(rect.left, rect.bottom, [
                          { label: '重命名', icon: <Edit3 className="w-4 h-4" />, onClick: () => setRenaming({ from: e.path, value: e.name }) },
                          { label: '删除', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => setConfirmDel({ path: e.path }) },
                        ])
                      }}
                    >
                      <MoreVertical className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50" style={noDragStyle}>
      {/* 标题栏 */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">资源管理器</span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="根目录新建文件"
            onClick={() => setAdding({ mode: 'file', dir: '', value: '' })}
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="根目录新建目录"
            onClick={() => setAdding({ mode: 'folder', dir: '', value: '' })}
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="刷新"
            onClick={() => void refreshDir('')}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="搜索文件..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-100 border-none rounded outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-2.5 h-2.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* 新建/重命名 状态展示 */}
      {(adding || confirmDel) && (
        <div className="mx-3 mb-2 p-2 bg-white rounded border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-1">
          {adding && (
            <>
              <div className="text-[10px] font-medium text-slate-400 mb-1.5">
                在 {adding.dir || '根目录'} {adding.mode === 'file' ? '新建文件' : '新建目录'}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500"
                  autoFocus
                  placeholder="名称..."
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
                  className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  onClick={() => {
                    const v = adding.value.trim()
                    if (!v) return
                    const p = join(adding.dir, v)
                    if (adding.mode === 'file') void createFile(p)
                    else void createFolder(p)
                    setAdding(null)
                  }}
                  disabled={!adding.value.trim()}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-400" onClick={() => setAdding(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
          {confirmDel && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-600">确定要删除 <span className="font-semibold text-slate-900 break-all">{confirmDel.path}</span> 吗？此操作不可撤销。</div>
              <div className="flex justify-end gap-2">
                <button className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700" onClick={() => setConfirmDel(null)}>取消</button>
                <button 
                  className="px-2 py-1 text-[11px] font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-100"
                  onClick={() => {
                    void deletePath(confirmDel.path)
                    setConfirmDel(null)
                  }}
                >
                  确认删除
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 文件树内容 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 custom-scrollbar">
        {!root ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <FolderOpen className="w-12 h-12 text-slate-200 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">未打开文件夹</h3>
            <p className="text-xs text-slate-500 mb-4">请打开一个本地目录开始工作</p>
            <button 
              onClick={() => void openWorkspaceFolder()}
              className="px-4 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              选择文件夹
            </button>
          </div>
        ) : (
          renderDir('', 0)
        )}
      </div>
    </div>
  )
}
