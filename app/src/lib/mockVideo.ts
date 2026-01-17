type MockVideoOptions = {
  width?: number
  height?: number
  fps?: number
  durationMs?: number
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

const pickMimeType = () => {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const t of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t
  }
  return 'video/webm'
}

export async function createMockMatrixVideo(options: MockVideoOptions = {}): Promise<Blob> {
  const width = options.width ?? 1280
  const height = options.height ?? 720
  const fps = options.fps ?? 30
  const durationMs = options.durationMs ?? 9000

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  const stream = canvas.captureStream(fps)
  const chunks: BlobPart[] = []
  const rec = new MediaRecorder(stream, { mimeType: pickMimeType() })

  rec.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data)
  }

  const startedAt = performance.now()
  const drawFrame = () => {
    const t = Math.max(0, performance.now() - startedAt)
    const p = Math.min(1, t / durationMs)

    ctx.fillStyle = '#0b1020'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '700 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.fillText('DeepInsight', 64, 96)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '400 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.fillText('Matrix Transform Demo (Mock Video)', 64, 144)

    const boxX = 64
    const boxY = 200
    const boxW = width - 128
    const boxH = height - 280
    ctx.fillStyle = 'rgba(15,23,42,0.6)'
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'
    ctx.lineWidth = 2
    ctx.fillRect(boxX, boxY, boxW, boxH)
    ctx.strokeRect(boxX, boxY, boxW, boxH)

    const cx = boxX + 140
    const cy = boxY + boxH / 2
    const scale = Math.min(boxW, boxH) * 0.28

    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + i * (scale / 4), cy - scale)
      ctx.lineTo(cx + i * (scale / 4), cy + scale)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx - scale, cy + i * (scale / 4))
      ctx.lineTo(cx + scale, cy + i * (scale / 4))
      ctx.stroke()
    }

    const angle = p * Math.PI * 2
    const a = Math.cos(angle) * 1.0
    const c = Math.sin(angle) * 0.8
    const b = Math.sin(angle) * 0.6
    const d = Math.cos(angle) * 1.1

    const drawArrow = (vx: number, vy: number, color: string) => {
      const x2 = cx + vx * scale
      const y2 = cy - vy * scale
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      const dx = x2 - cx
      const dy = y2 - cy
      const len = Math.max(1, Math.hypot(dx, dy))
      const ux = dx / len
      const uy = dy / len
      const head = 18
      const side = 10
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - ux * head + uy * side, y2 - uy * head - ux * side)
      ctx.lineTo(x2 - ux * head - uy * side, y2 - uy * head + ux * side)
      ctx.closePath()
      ctx.fill()
    }

    drawArrow(a, c, '#ef4444')
    drawArrow(b, d, '#22c55e')

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '600 28px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    const mat = `A = [[${a.toFixed(2)}, ${b.toFixed(2)}], [${c.toFixed(2)}, ${d.toFixed(2)}]]`
    ctx.fillText(mat, boxX + 420, boxY + 80)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '400 20px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    ctx.fillText(`t=${(t / 1000).toFixed(2)}s`, boxX + 420, boxY + 120)
  }

  let raf = 0
  const loop = () => {
    drawFrame()
    raf = requestAnimationFrame(loop)
  }

  const blobPromise = new Promise<Blob>((resolve, reject) => {
    rec.onerror = () => reject(new Error('MediaRecorder error'))
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }))
  })

  rec.start(250)
  raf = requestAnimationFrame(loop)
  await sleep(durationMs)
  cancelAnimationFrame(raf)
  rec.stop()

  return blobPromise
}

