import React from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import type { OnMount } from '@monaco-editor/react';

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
  
  type MonacoEditorApi = {
    editor: {
      defineTheme: (...args: unknown[]) => unknown
      setTheme: (...args: unknown[]) => unknown
    }
  }

  const handleEditorDidMount: OnMount = (_editor, monacoInstance) => {
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
