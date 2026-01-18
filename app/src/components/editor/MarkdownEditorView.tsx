import React from 'react';
import { CodeEditor } from './CodeEditor';
import { MarkdownPreview } from '../preview/MarkdownPreview';

interface MarkdownEditorViewProps {
  value: string;
  onChange: (value: string) => void;
  path?: string;
  placeholder?: string;
  gitStatus?: { branch: string; changes: number } | null;
  pythonEnv?: { hasVenv: boolean; installer: string } | null;
  onRefreshGit?: () => void;
  onRefreshPython?: () => void;
  isSpecialFile?: boolean;
}

export const MarkdownEditorView: React.FC<MarkdownEditorViewProps> = ({ 
  value, 
  onChange, 
  path, 
  gitStatus, 
  pythonEnv,
  onRefreshGit,
  onRefreshPython,
  isSpecialFile
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-row h-full w-full overflow-hidden">
      <div className="flex-1 min-h-0 border-r border-slate-100">
        <CodeEditor 
          path={path} 
          language="markdown" 
          value={value} 
          onChange={onChange}
          gitStatus={gitStatus}
          pythonEnv={pythonEnv}
          onRefreshGit={onRefreshGit}
          onRefreshPython={onRefreshPython}
          isSpecialFile={isSpecialFile}
        />
      </div>

      {/* 预览区域 */}
      <div className="flex-1 min-h-0 bg-white overflow-hidden">
        <MarkdownPreview value={value} />
      </div>
    </div>
  );
};
