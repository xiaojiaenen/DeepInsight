import React, { useEffect, useMemo, useRef, useState } from 'react'
import { VisualCanvas } from './VisualCanvas'
import { LessonController } from '../../features/lesson/LessonController'

export const VisualPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const useVideo = useMemo(() => videoUrl != null, [videoUrl])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

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
      <LessonController videoRef={videoRef} useVideo={useVideo} />
    </div>
  )
}
