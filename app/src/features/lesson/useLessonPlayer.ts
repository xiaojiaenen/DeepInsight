import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonDefinition } from './lessonTypes'
import { publishVisualAction } from '../visualization/visualBus'

type PlayerState = {
  isPlaying: boolean
  timeMs: number
}

type UseLessonPlayerResult = {
  isPlaying: boolean
  timeMs: number
  durationMs: number
  play: () => void
  pause: () => void
  seek: (timeMs: number) => void
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function useLessonPlayer(lesson: LessonDefinition | null): UseLessonPlayerResult {
  const durationMs = lesson?.durationMs ?? 1
  const events = useMemo(() => lesson?.events ?? [], [lesson])

  const [state, setState] = useState<PlayerState>({ isPlaying: false, timeMs: 0 })

  const rafRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const startEpochRef = useRef<number>(0)

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }, [])

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const applyUntil = useCallback(
    (t: number) => {
      publishVisualAction({ kind: 'reset' })
      for (const ev of events) {
        if (ev.atMs > t) break
        if (ev.action.kind === 'tween') {
          publishVisualAction({ kind: 'patch', patch: ev.action.to })
        } else {
          publishVisualAction(ev.action)
        }
      }
    },
    [events],
  )

  const scheduleFrom = useCallback(
    (fromMs: number) => {
      clearTimers()
      const now = performance.now()
      for (const ev of events) {
        if (ev.atMs < fromMs) continue
        const delay = ev.atMs - fromMs
        const id = window.setTimeout(() => {
          publishVisualAction(ev.action)
        }, delay)
        timersRef.current.push(id)
      }

      startEpochRef.current = now - fromMs
      const tick = (tNow: number) => {
        const next = clamp(tNow - startEpochRef.current, 0, durationMs)
        setState((s) => (s.isPlaying ? { ...s, timeMs: next } : s))
        if (next >= durationMs) {
          setState((s) => ({ ...s, isPlaying: false }))
          clearTimers()
          rafRef.current = null
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      stopRaf()
      rafRef.current = requestAnimationFrame(tick)
    },
    [clearTimers, durationMs, events, stopRaf],
  )

  const pause = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: false }))
    clearTimers()
    stopRaf()
  }, [clearTimers, stopRaf])

  const play = useCallback(() => {
    if (!lesson) return
    setState((s) => ({ ...s, isPlaying: true }))
    scheduleFrom(state.timeMs)
  }, [lesson, scheduleFrom, state.timeMs])

  const seek = useCallback(
    (timeMs: number) => {
      const next = clamp(timeMs, 0, durationMs)
      setState((s) => ({ ...s, timeMs: next }))
      applyUntil(next)
      if (state.isPlaying) scheduleFrom(next)
    },
    [applyUntil, durationMs, scheduleFrom, state.isPlaying],
  )

  useEffect(() => {
    pause()
    setState({ isPlaying: false, timeMs: 0 })
    if (lesson) applyUntil(0)
  }, [applyUntil, lesson, pause])

  useEffect(() => {
    return () => {
      clearTimers()
      stopRaf()
    }
  }, [clearTimers, stopRaf])

  return {
    isPlaying: state.isPlaying,
    timeMs: state.timeMs,
    durationMs,
    play,
    pause,
    seek,
  }
}

