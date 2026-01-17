type InsertPayload = {
  text: string
  mode?: 'cursor' | 'end'
  ensureNewline?: boolean
}

type OpenFilePayload = {
  path: string
  lineNumber: number
  column?: number
}

type RevealPayload = {
  lineNumber: number
  column?: number
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

export function editorOpenFile(payload: OpenFilePayload) {
  bus.dispatchEvent(new CustomEvent<OpenFilePayload>('editor:openFile', { detail: payload }))
}

export function subscribeEditorOpenFile(listener: (payload: OpenFilePayload) => void) {
  const onEvent = (ev: Event) => {
    const e = ev as CustomEvent<OpenFilePayload>
    listener(e.detail)
  }
  bus.addEventListener('editor:openFile', onEvent)
  return () => bus.removeEventListener('editor:openFile', onEvent)
}

export function editorRevealPosition(payload: RevealPayload) {
  bus.dispatchEvent(new CustomEvent<RevealPayload>('editor:reveal', { detail: payload }))
}

export function subscribeEditorRevealPosition(listener: (payload: RevealPayload) => void) {
  const onEvent = (ev: Event) => {
    const e = ev as CustomEvent<RevealPayload>
    listener(e.detail)
  }
  bus.addEventListener('editor:reveal', onEvent)
  return () => bus.removeEventListener('editor:reveal', onEvent)
}
