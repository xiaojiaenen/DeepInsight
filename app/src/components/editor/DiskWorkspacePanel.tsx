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
  Folder,
  Settings,
  Terminal
} from 'lucide-react'
import type { WorkspaceEntry } from '../../features/workspace/workspaceStore'
import { showContextMenu } from '../../features/contextMenu/contextMenuStore'
import {
  createFile,
  createFolder,
  deletePath,
  openFile,
  openWorkspaceFolder,
  closeWorkspaceFolder,
  refreshDir,
  renamePath,
  toggleDir,
  setCustomPythonPath,
  getWorkspaceState,
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
  gitStatus?: { files: Array<{ path: string; status: string }> } | null
}> = ({ root, expanded, entriesByDir, loadingDirs, activePath, onRunFile, onSelect, openPaths = [], gitStatus }) => {
  const [adding, setAdding] = useState<{ mode: 'file' | 'folder'; dir: string; value: string } | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; value: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ path: string } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const workspaceState = getWorkspaceState()
  const customPythonPath = workspaceState.customPythonPath
  
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

  const handleSelectPython = async () => {
    const w = (window as any).workspace
    if (!w) return
    const res = await w.openFile()
    if (res && res.path) {
      setCustomPythonPath(res.path)
    }
  }

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
              
              const gFile = gitStatus?.files.find(f => f.path === e.path)
              const gStatus = gFile?.status.trim() || ''

              return (
                <div
                  key={e.path}
                  className={`group flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 
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
                  <FileIcon name={e.name} className={`w-3.5 h-3.5 ${
                    isActive ? 'text-emerald-500' : 
                    gStatus.includes('M') ? 'text-amber-500' :
                    gStatus.includes('?') || gStatus.includes('A') ? 'text-emerald-500' :
                    gStatus.includes('D') ? 'text-red-500' :
                    'text-slate-400'
                  }`} />
                  <span className="flex-1 text-[11px] truncate">
                    {e.name}
                  </span>
                  {gStatus && (
                    <span className={`text-[9px] font-bold px-1 rounded-sm ${
                      gStatus.includes('M') ? 'text-amber-500 bg-amber-500/10' :
                      gStatus.includes('?') || gStatus.includes('A') ? 'text-emerald-500 bg-emerald-500/10' :
                      gStatus.includes('D') ? 'text-red-500 bg-red-500/10' :
                      'text-slate-400'
                    }`}>
                      {gStatus.includes('M') ? 'M' : gStatus.includes('?') || gStatus.includes('A') ? 'A' : gStatus.includes('D') ? 'D' : ''}
                    </span>
                  )}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    {canRun && (
                      <button 
                        className="p-0.5 hover:bg-emerald-100 rounded text-emerald-600" 
                        onClick={(ev) => { ev.stopPropagation(); onRunFile(e.path) }}
                        title="运行脚本"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button 
                      className="p-0.5 hover:bg-slate-300 rounded text-slate-500" 
                      onClick={(ev) => { ev.stopPropagation(); setRenaming({ from: e.path, value: e.name }) }}
                      title="重命名"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                      className="p-0.5 hover:bg-red-100 rounded text-red-500" 
                      onClick={(ev) => { ev.stopPropagation(); setConfirmDel({ path: e.path }) }}
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
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

  const gFiles = gitStatus?.files || []
  const hasGit = gitStatus !== null && gitStatus !== undefined

  if (!root) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 shadow-sm border border-emerald-500/10">
          <Folder className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">未打开项目</h3>
        <p className="text-xs text-slate-500 mb-8 leading-relaxed max-w-[200px]">
          开启您的深度学习之旅。打开本地项目文件夹以开始编码、训练和可视化。
        </p>
        <button
          onClick={() => void openWorkspaceFolder()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
        >
          <FolderOpen className="w-4 h-4" />
          打开项目文件夹
        </button>
        
        <div className="mt-12 pt-8 border-t border-slate-200 w-full">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">智能项目模板</h4>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: '图像分类任务', desc: 'PyTorch + ResNet' },
              { label: '自然语言处理', desc: 'Transformer + BERT' },
              { label: '强化学习实验', desc: 'Gym + PPO' }
            ].map((tpl, i) => (
              <button key={i} className="flex flex-col items-start p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/30 hover:shadow-md transition-all group text-left">
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-600">{tpl.label}</span>
                <span className="text-[9px] text-slate-400">{tpl.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Folder className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-800 truncate" title={root}>
              {root.split(/[\\/]/).pop() || root}
            </span>
            <span className="text-[9px] text-slate-400 truncate uppercase tracking-tighter font-medium">项目根目录</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            onClick={() => setShowSettings(true)}
            title="设置 Python 环境"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            onClick={() => void refreshDir('')}
            title="刷新目录"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
            onClick={() => {
              if (confirm('确定要关闭当前项目吗？')) {
                closeWorkspaceFolder()
              }
            }}
            title="关闭项目"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Python Environment Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[400px] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                项目设置
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Python 解释器路径</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 truncate font-mono">
                    {customPythonPath || '默认系统 Python / .venv'}
                  </div>
                  <button 
                    onClick={handleSelectPython}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Folder className="w-3 h-3" />
                    浏览
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  不设置则优先搜索项目根目录下的 .venv/Scripts/python.exe
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200 transition-colors font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Actions */}
      <div className="px-3 py-2 flex flex-col gap-2">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="搜索文件..." 
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100/50 border-transparent focus:bg-white focus:border-emerald-500/30 rounded-lg text-[11px] outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg text-[10px] font-bold transition-all border border-transparent hover:border-emerald-500/20"
            onClick={() => setAdding({ mode: 'file', dir: '', value: '' })}
          >
            <FilePlus className="w-3 h-3" />
            新建文件
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg text-[10px] font-bold transition-all border border-transparent hover:border-emerald-500/20"
            onClick={() => setAdding({ mode: 'folder', dir: '', value: '' })}
          >
            <FolderPlus className="w-3 h-3" />
            新建目录
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-1">
        {renderDir('', 0)}
      </div>

      {/* Confirmations and Modals */}
      {adding && (
        <div className="absolute inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[240px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  {adding.mode === 'file' ? <FilePlus className="w-4 h-4 text-emerald-600" /> : <FolderPlus className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">新建{adding.mode === 'file' ? '文件' : '目录'}</h4>
                  <p className="text-[10px] text-slate-400">输入名称并按回车确认</p>
                </div>
              </div>
              <input
                autoFocus
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                value={adding.value}
                onChange={(e) => setAdding({ ...adding, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const fullPath = join(adding.dir, adding.value)
                    if (adding.mode === 'file') createFile(fullPath)
                    else createFolder(fullPath)
                    setAdding(null)
                  }
                  if (e.key === 'Escape') setAdding(null)
                }}
              />
              <div className="mt-4 flex gap-2">
                <button onClick={() => setAdding(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-bold transition-all">取消</button>
                <button 
                  disabled={!adding.value}
                  onClick={() => {
                    const fullPath = join(adding.dir, adding.value)
                    if (adding.mode === 'file') createFile(fullPath)
                    else createFolder(fullPath)
                    setAdding(null)
                  }} 
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold transition-all"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renaming && (
        <div className="absolute inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[240px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">重命名</h4>
                  <p className="text-[10px] text-slate-400">修改名称并按回车确认</p>
                </div>
              </div>
              <input
                autoFocus
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                value={renaming.value}
                onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const parent = renaming.from.split('/').slice(0, -1).join('/')
                    const to = join(parent, renaming.value)
                    renamePath(renaming.from, to)
                    setRenaming(null)
                  }
                  if (e.key === 'Escape') setRenaming(null)
                }}
              />
              <div className="mt-4 flex gap-2">
                <button onClick={() => setRenaming(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-bold transition-all">取消</button>
                <button 
                  disabled={!renaming.value}
                  onClick={() => {
                    const parent = renaming.from.split('/').slice(0, -1).join('/')
                    const to = join(parent, renaming.value)
                    renamePath(renaming.from, to)
                    setRenaming(null)
                  }} 
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold transition-all"
                >
                  重命名
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="absolute inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[240px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">删除确认</h4>
                  <p className="text-[10px] text-slate-400">此操作不可撤销</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
                确定要删除 <span className="font-bold text-slate-700">{confirmDel.path?.split('/').pop() || '此项目'}</span> 吗？
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-bold transition-all">取消</button>
                <button 
                  onClick={() => {
                    deletePath(confirmDel.path)
                    setConfirmDel(null)
                  }} 
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[11px] font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
