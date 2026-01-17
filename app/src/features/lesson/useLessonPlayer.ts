import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { LessonDefinition } from './lessonTypes'
import { publishVisualAction } from '../visualization/visualBus'

type UseLessonPlayerResult = {
  isPlaying: boolean
  timeMs: number
  durationMs: number
  play: () => void
  pause: () => void
  seek: (timeMs: number) => void
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

type UseLessonPlayerOptions = {
  videoRef?: RefObject<HTMLVideoElement | null>
  useVideo?: boolean
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const findFirstAfter = (events: LessonDefinition['events'], t: number) => {
  let lo = 0
  let hi = events.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const at = events[mid]?.atMs ?? 0
    if (at <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function useLessonPlayer(lesson: LessonDefinition | null, options: UseLessonPlayerOptions = {}): UseLessonPlayerResult {
  const lessonDurationMs = lesson?.durationMs ?? 1
  const events = useMemo(() => lesson?.events ?? [], [lesson])

  const [isPlaying, setIsPlaying] = useState(false)
  const [timeMs, setTimeMs] = useState(0)
  const [durationMs, setDurationMs] = useState(lessonDurationMs)

  const clockRafRef = useRef<number | null>(null)
  const startEpochRef = useRef(0)
  const timeRef = useRef(0)
  const modeRef = useRef<'internal' | 'video'>('internal')

  const runtimeLastTimeRef = useRef(0)
  const runtimeNextIndexRef = useRef(0)

  const stopClockRaf = useCallback(() => {
    if (clockRafRef.current != null) {
      cancelAnimationFrame(clockRafRef.current)
      clockRafRef.current = null
    }
  }, [])

  const resetAndApplyUntil = useCallback(
    (t: number) => {
      publishVisualAction({ kind: 'reset' })
      for (const ev of events) {
        if (ev.atMs > t) break
        if (ev.action.kind === 'tween') publishVisualAction({ kind: 'patch', patch: ev.action.to })
        else publishVisualAction(ev.action)
      }
      runtimeNextIndexRef.current = findFirstAfter(events, t)
      runtimeLastTimeRef.current = t
    },
    [events],
  )

  useEffect(() => {
    stopClockRaf()
    setIsPlaying(false)
    setTimeMs(0)
    setDurationMs(lessonDurationMs)
    timeRef.current = 0
    runtimeLastTimeRef.current = 0
    runtimeNextIndexRef.current = 0
    if (lesson) resetAndApplyUntil(0)
  }, [lesson, lessonDurationMs, resetAndApplyUntil, stopClockRaf])

  useEffect(() => {
    if (!lesson) return
    const t = clamp(timeMs, 0, durationMs)
    if (t < runtimeLastTimeRef.current) {
      resetAndApplyUntil(t)
      return
    }
    while (runtimeNextIndexRef.current < events.length) {
      const ev = events[runtimeNextIndexRef.current]
      if (!ev || ev.atMs > t) break
      publishVisualAction(ev.action)
      runtimeNextIndexRef.current += 1
    }
    runtimeLastTimeRef.current = t
  }, [durationMs, events, lesson, resetAndApplyUntil, timeMs])

  const isVideoMode = useCallback(() => {
    const v = options.videoRef?.current
    const hasVideo = !!v && typeof v.currentSrc === 'string' && v.currentSrc.length > 0
    return !!options.useVideo && hasVideo
  }, [options.useVideo, options.videoRef])

  useEffect(() => {
    const v = options.videoRef?.current
    if (!v) return

    const syncFromVideo = () => {
      if (!isVideoMode()) return
      modeRef.current = 'video'
      const nextTime = v.currentTime * 1000
      if (isFiniteNumber(nextTime)) {
        timeRef.current = nextTime
        setTimeMs(nextTime)
      }
      const dur = v.duration * 1000
      if (isFiniteNumber(dur) && dur > 0) setDurationMs(dur)
      setIsPlaying(!v.paused)
    }

    const onPlay = () => {
      syncFromVideo()
      stopClockRaf()
      const tick = () => {
        if (!isVideoMode()) return
        const next = v.currentTime * 1000
        if (isFiniteNumber(next)) {
          timeRef.current = next
          setTimeMs(next)
        }
        if (!v.paused) clockRafRef.current = requestAnimationFrame(tick)
        else clockRafRef.current = null
      }
      clockRafRef.current = requestAnimationFrame(tick)
    }

    const onPause = () => {
      syncFromVideo()
      stopClockRaf()
    }

    const onTimeUpdate = () => syncFromVideo()
    const onLoaded = () => syncFromVideo()
    const onSeeking = () => syncFromVideo()
    const onSeeked = () => syncFromVideo()

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('seeking', onSeeking)
    v.addEventListener('seeked', onSeeked)

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('seeking', onSeeking)
      v.removeEventListener('seeked', onSeeked)
    }
  }, [isVideoMode, lessonDurationMs, options.videoRef, stopClockRaf])

  const pause = useCallback(() => {
    if (isVideoMode()) {
      const v = options.videoRef?.current
      v?.pause()
      setIsPlaying(false)
      stopClockRaf()
      return
    }
    setIsPlaying(false)
    stopClockRaf()
  }, [isVideoMode, options.videoRef, stopClockRaf])

  const play = useCallback(() => {
    if (!lesson) return
    if (isVideoMode()) {
      const v = options.videoRef?.current
      void v?.play()
      return
    }
    modeRef.current = 'internal'
    setIsPlaying(true)
    startEpochRef.current = performance.now() - timeRef.current
    stopClockRaf()
    const tick = (now: number) => {
      const next = clamp(now - startEpochRef.current, 0, durationMs)
      timeRef.current = next
      setTimeMs(next)
      if (next >= durationMs) {
        setIsPlaying(false)
        clockRafRef.current = null
        return
      }
      clockRafRef.current = requestAnimationFrame(tick)
    }
    clockRafRef.current = requestAnimationFrame(tick)
  }, [durationMs, isVideoMode, lesson, options.videoRef, stopClockRaf])

  const seek = useCallback(
    (ms: number) => {
      const next = clamp(ms, 0, durationMs)
      timeRef.current = next
      setTimeMs(next)
      if (isVideoMode()) {
        const v = options.videoRef?.current
        if (v) v.currentTime = next / 1000
      } else if (isPlaying) {
        startEpochRef.current = performance.now() - next
      }
    },
    [durationMs, isPlaying, isVideoMode, options.videoRef],
  )

  useEffect(() => {
    return () => {
      stopClockRaf()
    }
  }, [stopClockRaf])

  return { isPlaying, timeMs, durationMs, play, pause, seek }
}
