import React, { useMemo } from 'react'
import type { AnimationScript } from '../../features/animations/animationTypes'

type ScriptPlayerProps = {
  script: AnimationScript
  currentMs: number
}

export const ScriptPlayer: React.FC<ScriptPlayerProps> = ({ script, currentMs }) => {
  const current = useMemo(() => {
    const sorted = [...script.events].sort((a, b) => a.atMs - b.atMs)
    let last = sorted[0] ?? null
    for (const e of sorted) {
      if (e.atMs <= currentMs) last = e
      else break
    }
    return last
  }, [currentMs, script.events])

  return (
    <div className="w-full h-full rounded border border-slate-200 bg-white">
      <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-600">讲解脚本</div>
      <div className="p-3">
        {current ? (
          <>
            <div className="text-sm font-medium text-slate-900">{current.title}</div>
            <div className="mt-2 text-sm text-slate-700 leading-6 whitespace-pre-wrap">{current.body}</div>
          </>
        ) : (
          <div className="text-sm text-slate-500">从 0s 开始播放以查看讲解</div>
        )}
      </div>
    </div>
  )
}

