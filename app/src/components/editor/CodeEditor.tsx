import React, { useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import type { OnMount } from '@monaco-editor/react';
import { subscribeEditorInsertText } from '../../lib/editorBus';

loader.config({ monaco });

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange: (value: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value,
  language = "python",
  onChange 
}) => {
  
  type MonacoSelection = {
    selectionStartLineNumber: number
    selectionStartColumn: number
    positionLineNumber: number
    positionColumn: number
  }

  type MonacoRange = {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }

  type MonacoModel = {
    getLineCount: () => number
    getLineMaxColumn: (lineNumber: number) => number
  }

  type MonacoEditorInstance = {
    getSelection: () => MonacoSelection | null
    getModel: () => MonacoModel | null
    executeEdits: (source: string, edits: { range: MonacoRange; text: string; forceMoveMarkers?: boolean }[]) => boolean
    setPosition: (pos: { lineNumber: number; column: number }) => void
    revealPositionInCenter: (pos: { lineNumber: number; column: number }) => void
  }

  type MonacoEditorApi = {
    editor: {
      defineTheme: (...args: unknown[]) => unknown
      setTheme: (...args: unknown[]) => unknown
    }
  }

  const editorRef = useRef<MonacoEditorInstance | null>(null)

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor as unknown as MonacoEditorInstance
    const m = monacoInstance as MonacoEditorApi
    m.editor.defineTheme('clean-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f1f5f9',
      }
    });
    m.editor.setTheme('clean-light');
  };

  useEffect(() => {
    return subscribeEditorInsertText(({ text, mode = 'cursor', ensureNewline }) => {
      const editor = editorRef.current
      if (!editor) {
        const prefix = ensureNewline && value.length > 0 && !value.endsWith('\n') ? '\n' : ''
        onChange(value + prefix + text)
        return
      }

      const model = editor.getModel()
      const sel = editor.getSelection()
      const prefix = ensureNewline && value.length > 0 && !value.endsWith('\n') ? '\n' : ''
      const insertText = prefix + text

      let range: MonacoRange | null = null
      if (mode === 'end' && model) {
        const line = model.getLineCount()
        const col = model.getLineMaxColumn(line)
        range = { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col }
      } else if (sel) {
        range = {
          startLineNumber: sel.selectionStartLineNumber,
          startColumn: sel.selectionStartColumn,
          endLineNumber: sel.positionLineNumber,
          endColumn: sel.positionColumn,
        }
      }

      if (!range && model) {
        const line = model.getLineCount()
        const col = model.getLineMaxColumn(line)
        range = { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col }
      }

      if (!range) {
        onChange(value + insertText)
        return
      }

      editor.executeEdits('deepinsight', [{ range, text: insertText, forceMoveMarkers: true }])
      const parts = insertText.split(/\r?\n/)
      const endPos =
        parts.length <= 1
          ? { lineNumber: range.startLineNumber, column: range.startColumn + insertText.length }
          : { lineNumber: range.startLineNumber + parts.length - 1, column: (parts.at(-1) ?? '').length + 1 }
      editor.setPosition(endPos)
      editor.revealPositionInCenter(endPos)
    })
  }, [onChange, value])

  return (
    <div className="w-full h-full relative border-l border-slate-200">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 20 },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
        }}
      />
    </div>
  );
};
