import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Pencil, Trash2, Search, Play, Edit3 } from 'lucide-react'
import type { ProjectFile } from '../../features/files/filesStore'
import { addFile, deleteFile, renameFile, setActiveFile } from '../../features/files/filesStore'
import { showContextMenu } from '../../features/contextMenu/contextMenuStore'

type TreeNode =
  | { type: 'folder'; path: string; name: string; children: TreeNode[] }
  | { type: 'file'; path: string; name: string; file: ProjectFile }

const buildTree = (files: ProjectFile[], filter: string = ''): TreeNode => {
  const root: { type: 'folder'; path: string; name: string; children: TreeNode[] } = {
    type: 'folder',
    path: '',
    name: '',
    children: [],
  }

  const filteredFiles = filter 
    ? files.filter(f => f.path.toLowerCase().includes(filter.toLowerCase()))
    : files

  const ensureFolder = (parent: { children: TreeNode[]; path: string }, seg: string) => {
    const folderPath = parent.path ? `${parent.path}/${seg}` : seg
    const existing = parent.children.find((c) => c.type === 'folder' && c.path === folderPath) as
      | { type: 'folder'; path: string; name: string; children: TreeNode[] }
      | undefined
    if (existing) return existing
    const created: { type: 'folder'; path: string; name: string; children: TreeNode[] } = {
      type: 'folder',
      path: folderPath,
      name: seg,
      children: [],
    }
    parent.children.push(created)
    return created
  }

  const sorted = [...filteredFiles].sort((a, b) => a.path.localeCompare(b.path))
  for (const f of sorted) {
    const parts = f.path.split('/').filter(Boolean)
    if (!parts.length) continue
    let cursor = root as { children: TreeNode[]; path: string }
    for (const seg of parts.slice(0, -1)) cursor = ensureFolder(cursor, seg)
    const name = parts[parts.length - 1]!
    cursor.children.push({ type: 'file', path: f.path, name, file: f })
  }

  const sortNode = (n: TreeNode) => {
    if (n.type !== 'folder') return
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const c of n.children) sortNode(c)
  }
  sortNode(root)
  return root
}

export const FilePanel: React.FC<{ files: ProjectFile[]; activeId: string; onRunFile: (path: string) => void }> = ({
  files,
  activeId,
  onRunFile,
}) => {
  const [filter, setFilter] = useState('')
  const tree = useMemo(() => buildTree(files, filter), [files, filter])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState<{ mode: 'file' | 'folder'; value: string } | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ id: string } | null>(null)
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

  useEffect(() => {
    if (filter) {
      // Auto expand all when filtering
      const next: Record<string, boolean> = {}
      const walk = (n: TreeNode) => {
        if (n.type === 'folder' && n.path) next[n.path] = true
        if (n.type === 'folder') for (const c of n.children) walk(c)
      }
      walk(tree)
      setExpanded(next)
    }
  }, [filter, tree])

  useEffect(() => {
    const next: Record<string, boolean> = {}
    const walk = (n: TreeNode) => {
      if (n.type === 'folder' && n.path) next[n.path] = true
      if (n.type === 'folder') for (const c of n.children) walk(c)
    }
    walk(tree)
    setExpanded((prev) => ({ ...next, ...prev }))
  }, [tree])

  const toggle = (path: string) => setExpanded((s) => ({ ...s, [path]: !(s[path] ?? true) }))

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    if (n.type === 'folder') {
      const open = n.path ? (expanded[n.path] ?? true) : true
      return (
        <div key={`folder:${n.path}`}>
          {n.path ? (
            <button
              className="w-full text-left text-[11px] text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-white group"
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => toggle(n.path)}
              onContextMenu={(ev) => {
                ev.preventDefault()
                showContextMenu(ev.clientX, ev.clientY, [
                  { label: '新建文件', icon: <FilePlus className="w-3.5 h-3.5" />, onClick: () => setAdding({ mode: 'file', value: n.path + '/' }) },
                  { label: '新建目录', icon: <FolderPlus className="w-3.5 h-3.5" />, onClick: () => setAdding({ mode: 'folder', value: n.path + '/' }) },
                ])
              }}
            >
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="font-semibold truncate">{n.name}</span>
            </button>
          ) : null}
          {open ? n.children.map((c) => renderNode(c, n.path ? depth + 1 : depth)) : null}
        </div>
      )
    }

    const f = n.file
    const active = f.id === activeId
    const isRenaming = renaming?.id === f.id
    return (
      <div
        key={`file:${f.id}`}
        className={`group rounded border flex items-center gap-2 transition-all ${active ? 'border-indigo-200 bg-indigo-50/50' : 'border-transparent hover:bg-white hover:border-slate-200'}`}
        style={{ marginLeft: 8 + depth * 12 }}
        onContextMenu={(e) => {
          e.preventDefault()
          showContextMenu(e.clientX, e.clientY, [
            ...(f.path.endsWith('.py') ? [
              { label: '运行', icon: <Play className="w-3.5 h-3.5" />, onClick: () => onRunFile(f.path) },
              { type: 'separator' }
            ] : []),
            { label: '重命名', icon: <Edit3 className="w-3.5 h-3.5" />, onClick: () => setRenaming({ id: f.id, value: f.path }) },
            { label: '删除', icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => setConfirmDel({ id: f.id }) },
          ])
        }}
      >
        {isRenaming ? (
          <input
            className="flex-1 text-[11px] px-2 py-1 outline-none bg-white border border-indigo-300 rounded"
            autoFocus
            value={renaming?.value ?? ''}
            onChange={(e) => setRenaming({ id: f.id, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renameFile(f.id, renaming?.value ?? f.path)
                setRenaming(null)
              }
              if (e.key === 'Escape') setRenaming(null)
            }}
            onBlur={() => setRenaming(null)}
          />
        ) : (
          <button 
            className={`flex-1 text-left text-[11px] truncate px-2 py-1 ${active ? 'text-indigo-700 font-medium' : 'text-slate-600'}`} 
            onClick={() => setActiveFile(f.id)}
          >
            {n.name}
          </button>
        )}
        <div className="flex items-center opacity-0 group-hover:opacity-100 pr-1 transition-opacity">
          <button
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            title="重命名"
            onClick={() => setRenaming({ id: f.id, value: f.path })}
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-40"
            title="删除"
            disabled={files.length <= 1}
            onClick={() => setConfirmDel({ id: f.id })}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 border-r border-slate-200 bg-slate-50/50 flex flex-col min-h-0" style={noDragStyle}>
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Playground</div>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="新建文件"
            onClick={() => setAdding({ mode: 'file', value: '' })}
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="新建目录"
            onClick={() => setAdding({ mode: 'folder', value: '' })}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-2 border-b border-slate-200 bg-white/30">
        <div className="relative group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="搜索文件..."
            className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {adding ? (
        <div className="p-3 border-b border-slate-200 bg-white shadow-sm">
          <div className="text-[10px] font-bold text-indigo-600 mb-2 uppercase tracking-tight">
            {adding.mode === 'file' ? '新建文件' : '新建目录'}
          </div>
          <div className="flex flex-col gap-2">
            <input
              className="w-full text-[11px] px-2 py-1.5 rounded border border-slate-200 outline-none focus:border-indigo-400"
              autoFocus
              placeholder={adding.mode === 'file' ? "例如: src/train.py" : "例如: src/models"}
              value={adding.value}
              onChange={(e) => setAdding({ ...adding, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAdding(null)
                if (e.key === 'Enter') {
                  const v = adding.value.trim()
                  if (!v) return
                  if (adding.mode === 'file') addFile(v)
                  else addFile(`${v.replace(/\\\\/g, '/').replace(/\/+$/, '')}/__init__.py`)
                  setAdding(null)
                }
              }}
            />
            <div className="flex items-center gap-2 justify-end">
              <button className="text-[11px] px-2.5 py-1 rounded text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setAdding(null)}>
                取消
              </button>
              <button
                className="text-[11px] px-2.5 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                onClick={() => {
                  const v = adding.value.trim()
                  if (!v) return
                  if (adding.mode === 'file') addFile(v)
                  else addFile(`${v.replace(/\\\\/g, '/').replace(/\/+$/, '')}/__init__.py`)
                  setAdding(null)
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDel ? (
        <div className="p-3 border-b border-slate-200 bg-red-50/30">
          <div className="text-[11px] text-red-600 font-medium mb-3">确认删除该文件？此操作无法撤销。</div>
          <div className="flex items-center gap-2 justify-end">
            <button className="text-[11px] px-2.5 py-1 rounded text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setConfirmDel(null)}>
              取消
            </button>
            <button
              className="text-[11px] px-2.5 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm shadow-red-200"
              onClick={() => {
                deleteFile(confirmDel.id)
                setConfirmDel(null)
              }}
              disabled={files.length <= 1}
            >
              删除
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto p-2 custom-scrollbar">
        {tree.children.length > 0 ? (
          <div className="space-y-0.5">{tree.children.map(c => renderNode(c, 0))}</div>
        ) : (
          <div className="h-20 flex flex-col items-center justify-center text-slate-400">
            <Search className="w-5 h-5 mb-1 opacity-20" />
            <div className="text-[10px]">未找到文件</div>
          </div>
        )}
      </div>
    </div>
  )
}

