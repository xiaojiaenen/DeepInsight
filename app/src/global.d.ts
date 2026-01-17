export {}

declare global {
  interface Window {
    windowControls?: {
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<void>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
    }
  }
}

