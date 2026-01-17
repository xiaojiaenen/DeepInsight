import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { KnowledgePoint } from '../features/animations/animationTypes'
import { addKnowledgePoint, getKnowledgePoints, removeKnowledgePoint, subscribeKnowledgePoints } from '../features/animations/libraryStore'
import { ScriptPlayer } from '../components/animations/ScriptPlayer'
import { copyToClipboard } from '../lib/copyToClipboard'

const fmt = (ms: number) => {
  const s = Math.max(0, ms) / 1000
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${String(m).padStart(2, '0')}:${String(Math.floor(r)).padStart(2, '0')}`
}

export const AnimationLibraryPage: React.FC = () => {
  const [items, setItems] = useState<KnowledgePoint[]>(() => getKnowledgePoints())
  const [selectedId, setSelectedId] = useState<string>(() => items[0]?.id ?? 'linear-regression-gd')
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? items[0] ?? null, [items, selectedId])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [currentMs, setCurrentMs] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    return subscribeKnowledgePoints((v) => {
      setItems(v)
      if (!v.some((x) => x.id === selectedId)) setSelectedId(v[0]?.id ?? 'linear-regression-gd')
    })
  }, [selectedId])

  useEffect(() => {
    const tick = () => {
      const v = videoRef.current
      if (v) setCurrentMs(Math.round((v.currentTime ?? 0) * 1000))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const onImportScript = async (file: File) => {
    const text = await file.text()
    const raw = JSON.parse(text) as unknown
    if (!raw || typeof raw !== 'object') return
    const obj = raw as Record<string, unknown>
    const scriptRaw = (obj.script && typeof obj.script === 'object' ? (obj.script as Record<string, unknown>) : null) ?? null
    const eventsRaw = Array.isArray(scriptRaw?.events) ? (scriptRaw?.events as unknown[]) : []
    const kp: KnowledgePoint = {
      id: String(obj.id ?? `kp-${Date.now()}`),
      title: String(obj.title ?? '未命名知识点'),
      description: typeof obj.description === 'string' ? obj.description : undefined,
      script: {
        durationMs: Number(scriptRaw?.durationMs ?? 60_000),
        events: eventsRaw
          .map((e) => {
            if (!e || typeof e !== 'object') return null
            const ev = e as Record<string, unknown>
            return {
              atMs: Number(ev.atMs ?? 0),
              title: String(ev.title ?? ''),
              body: String(ev.body ?? ''),
            }
          })
          .filter((e): e is { atMs: number; title: string; body: string } => e != null),
      },
    }
    addKnowledgePoint(kp)
    setSelectedId(kp.id)
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="w-72 border-r border-slate-200 bg-slate-50">
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-900">动画库</div>
          <div className="text-xs text-slate-500 mt-1">每个视频对应一个知识点，用脚本驱动讲解。</div>
        </div>
        <div className="p-2 space-y-2 overflow-auto h-[calc(100%-56px)]">
          {items.map((x) => {
            const active = x.id === selectedId
            return (
              <button
                key={x.id}
                className={`w-full text-left rounded border px-2 py-2 ${active ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                onClick={() => setSelectedId(x.id)}
              >
                <div className="text-sm text-slate-900">{x.title}</div>
                {x.description ? <div className="mt-1 text-xs text-slate-500 line-clamp-2">{x.description}</div> : null}
              </button>
            )
          })}

          <div className="pt-2 flex items-center gap-2">
            <label className="text-xs text-slate-700 hover:bg-white px-2 py-1 rounded border border-slate-200 bg-white cursor-pointer">
              导入脚本 JSON
              <input
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  void onImportScript(f)
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 p-4 space-y-3 overflow-auto">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">{selected.title}</div>
                {selected.description ? <div className="text-sm text-slate-600 mt-1">{selected.description}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
                  onClick={() => void copyToClipboard(JSON.stringify(selected, null, 2))}
                >
                  复制脚本
                </button>
                <button
                  className="text-xs text-red-700 hover:bg-red-50 px-2 py-1 rounded border border-red-200 bg-white"
                  onClick={() => removeKnowledgePoint(selected.id)}
                >
                  删除
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded border border-slate-200 bg-white">
                <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs text-slate-600">视频</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500 tabular-nums">{fmt(currentMs)}</div>
                    <label className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white cursor-pointer">
                      选择视频
                      <input
                        className="hidden"
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          setVideoUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev)
                            return URL.createObjectURL(f)
                          })
                        }}
                      />
                    </label>
                    {videoUrl ? (
                      <button
                        className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
                        onClick={() => {
                          setVideoUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev)
                            return null
                          })
                        }}
                      >
                        清除
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="p-3">
                  <video ref={videoRef} className="w-full rounded" src={videoUrl ?? undefined} controls playsInline />
                </div>
              </div>

              <ScriptPlayer script={selected.script} currentMs={currentMs} />
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">暂无知识点</div>
        )}
      </div>
    </div>
  )
}
