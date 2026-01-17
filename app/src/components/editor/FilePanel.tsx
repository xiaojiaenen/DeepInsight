import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import type { ProjectFile } from '../../features/files/filesStore'
import { addFile, deleteFile, renameFile, setActiveFile } from '../../features/files/filesStore'
import { showContextMenu } from '../../features/contextMenu/contextMenuStore'

type TreeNode =
  | { type: 'folder'; path: string; name: string; children: TreeNode[] }
  | { type: 'file'; path: string; name: string; file: ProjectFile }

const buildTree = (files: ProjectFile[]): TreeNode => {
  const root: { type: 'folder'; path: string; name: string; children: TreeNode[] } = {
    type: 'folder',
    path: '',
    name: '',
    children: [],
  }

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

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
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
  const tree = useMemo(() => buildTree(files), [files])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState<{ mode: 'file' | 'folder'; value: string } | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ id: string } | null>(null)
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

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
              className="w-full text-left text-xs text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => toggle(n.path)}
            >
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="font-medium truncate">{n.name}</span>
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
        className={`group rounded border flex items-center gap-2 ${active ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
        style={{ marginLeft: 8 + depth * 12 }}
        onContextMenu={(e) => {
          e.preventDefault()
          showContextMenu(e.clientX, e.clientY, [
            ...(f.path.endsWith('.py') ? [{ label: '运行', onClick: () => onRunFile(f.path) }] : []),
            { label: '重命名', onClick: () => setRenaming({ id: f.id, value: f.path }) },
            { label: '删除', danger: true, onClick: () => setConfirmDel({ id: f.id }) },
          ])
        }}
      >
        {isRenaming ? (
          <input
            className="flex-1 text-xs px-2 py-1 outline-none bg-transparent"
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
          <button className="flex-1 text-left text-xs text-slate-800 truncate px-2 py-1" onClick={() => setActiveFile(f.id)}>
            {n.name}
          </button>
        )}
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100"
          title="重命名"
          onClick={() => setRenaming({ id: f.id, value: f.path })}
        >
          <Pencil className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 disabled:opacity-40"
          title="删除"
          disabled={files.length <= 1}
          onClick={() => setConfirmDel({ id: f.id })}
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-56 border-r border-slate-200 bg-slate-50 flex flex-col min-h-0" style={noDragStyle}>
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200">
        <div className="text-xs font-medium text-slate-700">文件</div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
            title="新建文件"
            onClick={() => setAdding({ mode: 'file', value: '' })}
          >
            <FilePlus className="w-4 h-4 text-slate-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-white border border-slate-200 bg-white"
            title="新建目录（通过路径）"
            onClick={() => setAdding({ mode: 'folder', value: '' })}
          >
            <FolderPlus className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {adding ? (
        <div className="p-2 border-b border-slate-200 bg-white">
          <div className="text-[11px] text-slate-600 mb-1">
            {adding.mode === 'file' ? '新建文件：支持路径，如 src/train.py' : '新建目录：输入目录路径，如 src/models（会创建 __init__.py）'}
          </div>
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
                  if (adding.mode === 'file') addFile(v)
                  else addFile(`${v.replace(/\\\\/g, '/').replace(/\/+$/, '')}/__init__.py`)
                  setAdding(null)
                }
              }}
            />
            <button
              className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-900 text-white"
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
            <button className="text-xs px-2 py-1 rounded border border-slate-200 bg-white" onClick={() => setAdding(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      {confirmDel ? (
        <div className="p-2 border-b border-slate-200 bg-white">
          <div className="text-xs text-slate-700">确认删除当前文件？</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="text-xs px-2 py-1 rounded border border-red-200 bg-red-600 text-white"
              onClick={() => {
                deleteFile(confirmDel.id)
                setConfirmDel(null)
              }}
              disabled={files.length <= 1}
            >
              删除
            </button>
            <button className="text-xs px-2 py-1 rounded border border-slate-200 bg-white" onClick={() => setConfirmDel(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-1">{renderNode(tree, 0)}</div>
    </div>
  )
}
