import React, { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import type { LessonDefinition } from './lessonTypes'
import { fetchLesson } from './loadLesson'
import { useLessonPlayer } from './useLessonPlayer'

type LessonControllerProps = {
  url?: string
  videoRef?: React.RefObject<HTMLVideoElement | null>
  useVideo?: boolean
}

const formatMs = (ms: number) => {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const LessonController: React.FC<LessonControllerProps> = ({
  url = '/lessons/demo-visual.json',
  videoRef,
  useVideo,
}) => {
  const [lesson, setLesson] = useState<LessonDefinition | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetchLesson(url)
      .then((l) => {
        if (cancelled) return
        setLesson(l)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [url])

  const player = useLessonPlayer(lesson, { videoRef, useVideo })

  return (
    <div className="absolute left-3 right-3 bottom-3 bg-white/90 backdrop-blur border border-slate-200 rounded-xl px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          className="w-9 h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center"
          onClick={() => (player.isPlaying ? player.pause() : player.play())}
          disabled={!lesson}
        >
          {player.isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
        </button>
        <button
          className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center"
          onClick={() => {
            player.pause()
            player.seek(0)
          }}
          disabled={!lesson}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="truncate">{lesson ? lesson.title : error ? `加载失败：${error}` : '加载课程中...'}</span>
            <span className="tabular-nums">{formatMs(player.timeMs)} / {formatMs(player.durationMs)}</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={0}
            max={player.durationMs}
            step={50}
            value={Math.floor(player.timeMs)}
            onChange={(e) => player.seek(Number(e.target.value))}
            disabled={!lesson}
          />
        </div>
      </div>
    </div>
  )
}
