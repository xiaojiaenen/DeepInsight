import React, { useEffect, useState } from 'react';
import { MarkdownEditorView } from '../components/editor/MarkdownEditorView';
import { Plus, Search, FileText, Trash2, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../components/layout/cn';

interface Note {
  id: string;
  name: string;
  updatedAt: number;
}

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadNotes = async () => {
    if (!window.notes) return;
    try {
      const list = await window.notes.list();
      setNotes(list);
      if (list.length > 0 && !activeNoteId) {
        // Don't auto-select, let user choose
      }
    } catch (e) {
      console.error('Failed to load notes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (activeNoteId && window.notes) {
      window.notes.read(activeNoteId).then(setActiveContent);
    } else {
      setActiveContent('');
    }
  }, [activeNoteId]);

  const handleCreate = async () => {
    if (!window.notes) return;
    const name = `新笔记 ${notes.length + 1}`;
    try {
      const id = await window.notes.create(name);
      await loadNotes();
      setActiveNoteId(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '创建失败');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.notes || !confirm('确定要删除这篇笔记吗？')) return;
    try {
      await window.notes.delete(id);
      if (activeNoteId === id) setActiveNoteId(null);
      await loadNotes();
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  };

  const handleSave = async (content: string) => {
    setActiveContent(content);
    if (activeNoteId && window.notes) {
      await window.notes.write(activeNoteId, content);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 min-h-0 flex flex-row bg-white overflow-hidden h-full">
      {/* 笔记列表侧边栏 */}
      <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              我的笔记
            </h2>
            <button 
              onClick={handleCreate}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="新建笔记"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="搜索笔记..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 border-none rounded-md focus:ring-1 focus:ring-blue-500 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">加载中...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              {search ? '没有找到匹配的笔记' : '还没有笔记，点击上方 + 开始记录'}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "group px-4 py-3 cursor-pointer transition-all border-l-2",
                  activeNoteId === note.id 
                    ? "bg-white border-blue-500 shadow-sm" 
                    : "border-transparent hover:bg-white/60 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-medium truncate flex-1",
                    activeNoteId === note.id ? "text-slate-900" : "text-slate-600"
                  )}>
                    {note.name.replace('.md', '')}
                  </span>
                  <button 
                    onClick={(e) => handleDelete(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 笔记编辑区 */}
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        {activeNoteId ? (
          <MarkdownEditorView 
            value={activeContent}
            onChange={handleSave}
            path={activeNoteId}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-sm font-medium text-slate-900 mb-1">选择一篇笔记开始阅读</h3>
            <p className="text-xs text-slate-500">或者点击左侧的 + 号新建一篇笔记</p>
          </div>
        )}
      </div>
    </div>
  );
};