type InsertPayload = {
  text: string
  mode?: 'cursor' | 'end'
  ensureNewline?: boolean
}

const bus = new EventTarget()

export function editorInsertText(payload: InsertPayload) {
  bus.dispatchEvent(new CustomEvent<InsertPayload>('editor:insert', { detail: payload }))
}

export function subscribeEditorInsertText(listener: (payload: InsertPayload) => void) {
  const onEvent = (ev: Event) => {
    const e = ev as CustomEvent<InsertPayload>
    listener(e.detail)
  }
  bus.addEventListener('editor:insert', onEvent)
  return () => bus.removeEventListener('editor:insert', onEvent)
}

