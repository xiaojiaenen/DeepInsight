import React, { useEffect, useState } from 'react'
import { useNotesStore } from '../../features/notes/notesStore'
import { StickyNote, Plus, Trash2, FileText, Clock, Search } from 'lucide-react'

export const NotesPanel: React.FC = () => {
  const { notes, refreshNotes, openNote, createNote, deleteNote, activeNoteId } = useNotesStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newNoteName, setNewNoteName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    void refreshNotes()
  }, [refreshNotes])

  const filteredNotes = notes.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newNoteName.trim()) return
    await createNote(newNoteName.trim())
    setNewNoteName('')
    setIsCreating(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* 头部 */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-semibold text-slate-700">全局笔记</span>
        </div>
        <button 
          className="p-1 rounded hover:bg-white border border-transparent hover:border-slate-200 transition-all text-slate-500 hover:text-indigo-600"
          onClick={() => setIsCreating(true)}
          title="新建笔记"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="p-2 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            className="w-full text-xs pl-7 pr-2 py-1.5 rounded-md border border-slate-200 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 新建笔记输入框 */}
      {isCreating && (
        <div className="p-2 border-b border-indigo-100 bg-indigo-50/30">
          <input
            autoFocus
            className="w-full text-xs px-2 py-1.5 rounded border border-indigo-200 outline-none shadow-sm"
            placeholder="笔记名称..."
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
              if (e.key === 'Escape') setIsCreating(false)
            }}
          />
          <div className="flex justify-end gap-1 mt-2">
            <button 
              className="px-2 py-1 text-[10px] rounded bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => void handleCreate()}
            >
              创建
            </button>
            <button 
              className="px-2 py-1 text-[10px] rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              onClick={() => setIsCreating(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {filteredNotes.length > 0 ? (
          <div className="space-y-0.5">
            {filteredNotes.map((note) => (
              <div 
                key={note.id}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  activeNoteId === note.id 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                    : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
                onClick={() => void openNote(note.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${activeNoteId === note.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate">{note.name.replace('.md', '')}</span>
                    <div className="flex items-center gap-1 text-[10px] opacity-60">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确定删除笔记 "${note.name}" 吗？`)) {
                      void deleteNote(note.id)
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <StickyNote className="w-8 h-8 opacity-20 mb-2" />
            <span className="text-xs">暂无笔记</span>
          </div>
        )}
      </div>
    </div>
  )
}
