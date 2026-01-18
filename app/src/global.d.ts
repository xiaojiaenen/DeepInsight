export {}

declare global {
  interface Window {
    windowControls?: {
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<void>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
    }
  workspace?: {
    openFolder: () => Promise<{ root: string } | null>
    list: (root: string, dir: string) => Promise<Array<{ name: string; path: string; kind: 'file' | 'dir' }>>
    readFile: (root: string, filePath: string) => Promise<string>
    writeFile: (root: string, filePath: string, content: string) => Promise<boolean>
    createFile: (root: string, filePath: string) => Promise<boolean>
    mkdir: (root: string, dirPath: string) => Promise<boolean>
    rename: (root: string, from: string, to: string) => Promise<boolean>
    delete: (root: string, targetPath: string) => Promise<boolean>
    detectPythonEnv: (
      root: string,
    ) => Promise<{ hasPyproject: boolean; hasRequirements: boolean; hasVenv: boolean; installer: 'uv-sync' | 'uv-pip' | 'none' }>
    installPythonDeps: (root: string) => Promise<boolean>
    onInstallLog: (listener: (line: string) => void) => () => void
    onInstallStatus: (listener: (status: { status: 'idle' | 'running' | 'done' | 'error'; message?: string }) => void) => () => void
    gitStatus: (root: string) => Promise<{ 
      branch: string; 
      changes: number; 
      files: Array<{ path: string; status: string }> 
    } | null>
    gitCommit: (root: string, message: string) => Promise<boolean>
    gitPush: (root: string) => Promise<boolean>
  }
  notes?: {
    list: () => Promise<Array<{ name: string; id: string; updatedAt: number }>>
    read: (id: string) => Promise<string>
    write: (id: string, content: string) => Promise<boolean>
    delete: (id: string) => Promise<boolean>
    create: (name: string) => Promise<string>
  }
  }
}
