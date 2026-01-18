import { create } from 'zustand'

export interface Note {
  id: string
  name: string
  updatedAt: number
}

interface NotesState {
  notes: Note[]
  activeNoteId: string | null
  activeContent: string | null
  loading: boolean
}

interface NotesActions {
  refreshNotes: () => Promise<void>
  openNote: (id: string) => Promise<void>
  saveActiveNote: (content: string) => Promise<void>
  createNote: (name: string) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  setActiveContent: (content: string) => void
}

export const useNotesStore = create<NotesState & NotesActions>((set, get) => ({
  notes: [],
  activeNoteId: null,
  activeContent: null,
  loading: false,

  refreshNotes: async () => {
    if (!window.notes) return
    set({ loading: true })
    try {
      const notes = await window.notes.list()
      set({ notes, loading: false })
    } catch (e) {
      console.error('Failed to list notes', e)
      set({ loading: false })
    }
  },

  openNote: async (id: string) => {
    if (!window.notes) return
    try {
      const content = await window.notes.read(id)
      set({ activeNoteId: id, activeContent: content })
    } catch (e) {
      console.error('Failed to read note', e)
    }
  },

  setActiveContent: (content: string) => {
    set({ activeContent: content })
  },

  saveActiveNote: async (content: string) => {
    const { activeNoteId } = get()
    if (!window.notes || !activeNoteId) return
    try {
      await window.notes.write(activeNoteId, content)
      set({ activeContent: content })
      // 刷新列表以更新时间戳
      const notes = await window.notes.list()
      set({ notes })
    } catch (e) {
      console.error('Failed to save note', e)
    }
  },

  createNote: async (name: string) => {
    if (!window.notes) return
    try {
      const id = await window.notes.create(name)
      await get().refreshNotes()
      await get().openNote(id)
    } catch (e) {
      console.error('Failed to create note', e)
    }
  },

  deleteNote: async (id: string) => {
    if (!window.notes) return
    try {
      await window.notes.delete(id)
      if (get().activeNoteId === id) {
        set({ activeNoteId: null, activeContent: null })
      }
      await get().refreshNotes()
    } catch (e) {
      console.error('Failed to delete note', e)
    }
  },
}))
