type TerminalWriteDetail = { text: string }

const bus = new EventTarget()

export function terminalWrite(text: string) {
  bus.dispatchEvent(new CustomEvent<TerminalWriteDetail>('terminal:write', { detail: { text } }))
}

export function terminalWriteLine(text: string) {
  terminalWrite(text.endsWith('\n') ? text : `${text}\n`)
}

export function terminalClear() {
  bus.dispatchEvent(new Event('terminal:clear'))
}

export function subscribeTerminalWrite(handler: (text: string) => void) {
  const listener = (e: Event) => {
    const evt = e as CustomEvent<TerminalWriteDetail>
    handler(evt.detail.text)
  }
  bus.addEventListener('terminal:write', listener)
  return () => bus.removeEventListener('terminal:write', listener)
}

export function subscribeTerminalClear(handler: () => void) {
  const listener = () => handler()
  bus.addEventListener('terminal:clear', listener)
  return () => bus.removeEventListener('terminal:clear', listener)
}

