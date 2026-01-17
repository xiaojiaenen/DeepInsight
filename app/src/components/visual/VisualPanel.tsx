import React, { useEffect, useMemo, useRef, useState } from 'react'
import { VisualCanvas } from './VisualCanvas'
import { LessonController } from '../../features/lesson/LessonController'
import { MatrixControls } from './MatrixControls'
import { createMockMatrixVideo } from '../../lib/mockVideo'

export const VisualPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const useVideo = useMemo(() => videoUrl != null, [videoUrl])
  const [lessonUrl, setLessonUrl] = useState('/lessons/demo-visual.json')
  const [lessonFileUrl, setLessonFileUrl] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (lessonFileUrl) URL.revokeObjectURL(lessonFileUrl)
    }
  }, [lessonFileUrl])

  return (
    <div className="w-full h-full relative bg-slate-50">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={videoUrl ?? undefined}
        muted
        playsInline
        preload="metadata"
      />
      <VisualCanvas />
      <div className="absolute left-3 top-3 text-xs text-slate-500 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200">
        输出 "__VIS__ : &lt;JSON&gt;" 将通过 Kernel 转为 vis 消息联动
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <select
          className="text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200"
          value={lessonUrl}
          onChange={(e) => setLessonUrl(e.target.value)}
        >
          <option value="/lessons/demo-visual.json">demo-visual</option>
          <option value="/lessons/demo-matrix.json">demo-matrix</option>
          {lessonFileUrl ? <option value={lessonFileUrl}>local-lesson</option> : null}
        </select>
        <label className="text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200 cursor-pointer">
          选择课件
          <input
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setLessonFileUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                const next = URL.createObjectURL(f)
                setLessonUrl(next)
                return next
              })
            }}
          />
        </label>
        <button
          className="text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
          disabled={isGeneratingVideo}
          onClick={async () => {
            setIsGeneratingVideo(true)
            try {
              const blob = await createMockMatrixVideo({ durationMs: 9000 })
              setVideoUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                const next = URL.createObjectURL(blob)
                return next
              })
              setLessonUrl('/lessons/demo-matrix.json')
            } catch (e) {
              void e
            } finally {
              setIsGeneratingVideo(false)
            }
          }}
        >
          {isGeneratingVideo ? '生成中...' : '生成 Mock 视频'}
        </button>
        <label className="text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200 cursor-pointer">
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
        {lessonFileUrl ? (
          <button
            className="text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200"
            onClick={() => {
              setLessonFileUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                return null
              })
              setLessonUrl('/lessons/demo-visual.json')
            }}
          >
            清除课件
          </button>
        ) : null}
        {useVideo ? (
          <button
            className="text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200"
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
      <MatrixControls />
      <LessonController url={lessonUrl} videoRef={videoRef} useVideo={useVideo} />
    </div>
  )
}
