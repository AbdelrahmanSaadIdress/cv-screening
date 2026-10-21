import { useEffect, useRef } from 'react'

// Tiny seeded random generator so the field looks the same on every load.
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const lerp = (a, b, t) => a + (b - a) * t

const SLIP_W = 26
const SLIP_H = 34
const GAP = 9
const SCAN_MS = 3200
const MATCH_RATE = 0.06

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

/**
 * A wall of small CV sheets. Once, on load, a scan line crosses it: most
 * sheets are read and dim down, a few light up and get a highlighter stroke.
 * With reduced motion the finished state is drawn straight away.
 */
export default function CvField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let slips = []
    let width = 0
    let height = 0
    let raf = 0
    let startedAt = 0
    let finished = reduce

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const box = canvas.getBoundingClientRect()
      width = box.width
      height = box.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cols = Math.ceil(width / (SLIP_W + GAP)) + 1
      const rows = Math.ceil(height / (SLIP_H + GAP)) + 1
      const offX = (width - (cols * (SLIP_W + GAP) - GAP)) / 2
      const offY = (height - (rows * (SLIP_H + GAP) - GAP)) / 2
      const rand = seeded(2026)

      slips = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offX + c * (SLIP_W + GAP)
          const y = offY + r * (SLIP_H + GAP)
          const roll = rand() < MATCH_RATE // always drawn, so the layout never shifts
          // Keep highlights off the edges, the logo (top-left) and the headline (bottom-left).
          const inView = x > 4 && y > 4 && x + SLIP_W < width - 4 && y + SLIP_H < height - 4
          const nearLogo = x < 280 && y < 110
          const nearHeadline = width > 700 && x < 600 && y > height - 330
          slips.push({
            x,
            y,
            matched: roll && inView && !nearLogo && !nearHeadline,
            lines: [0.55 + rand() * 0.35, 0.5 + rand() * 0.4, 0.35 + rand() * 0.4],
            readAt: finished ? -10000 : null,
          })
        }
      }
    }

    function drawSlip(s, now) {
      const since = s.readAt == null ? -1 : now - s.readAt
      const settled = clamp(since / 700) // 0 → 1 once the sheet has been read
      let lift = 0
      let mark = 0

      if (s.matched && since >= 0) {
        lift = easeOut(clamp(since / 520))
        mark = easeOut(clamp((since - 160) / 520))
      }

      const y = s.y - lift * 5
      const w = SLIP_W
      const h = SLIP_H

      if (s.matched && lift > 0) {
        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
        ctx.shadowBlur = 12 * lift
        ctx.shadowOffsetY = 6 * lift
        ctx.fillStyle = `rgba(247, 248, 251, ${lerp(0.1, 1, lift)})`
        roundedRect(ctx, s.x, y, w, h, 3)
        ctx.fill()
        ctx.restore()
      } else {
        const fill = s.matched ? 0.1 : lerp(0.1, 0.04, settled)
        ctx.fillStyle = `rgba(255, 255, 255, ${fill})`
        roundedRect(ctx, s.x, y, w, h, 3)
        ctx.fill()
      }

      const textY = [y + 7, y + 15, y + 23]
      const textColor =
        s.matched && lift > 0
          ? `rgba(154, 166, 186, ${lift})`
          : `rgba(255, 255, 255, ${s.matched ? 0.16 : lerp(0.16, 0.07, settled)})`

      for (let i = 0; i < 3; i++) {
        const lw = (w - 10) * s.lines[i]
        if (i === 1 && mark > 0) {
          // Highlighter stroke wiping across the second line.
          ctx.fillStyle = '#FFD93D'
          roundedRect(ctx, s.x - 2, textY[i] - 2.5, (w + 4) * mark, 7, 1.5)
          ctx.fill()
          ctx.fillStyle = `rgba(18, 33, 59, ${mark})`
        } else {
          ctx.fillStyle = textColor
        }
        roundedRect(ctx, s.x + 5, textY[i], lw, 2.5, 1.25)
        ctx.fill()
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height)

      const t = clamp((now - startedAt) / SCAN_MS)
      const scanX = finished ? width + 200 : -40 + easeOut(t * 0.55 + t * t * 0.45) * (width + 120)

      for (const s of slips) {
        if (s.readAt == null && scanX >= s.x + SLIP_W / 2) s.readAt = now
        drawSlip(s, now)
      }

      if (!finished && t < 1) {
        const trail = ctx.createLinearGradient(scanX - 140, 0, scanX, 0)
        trail.addColorStop(0, 'rgba(255, 217, 61, 0)')
        trail.addColorStop(1, 'rgba(255, 217, 61, 0.14)')
        ctx.fillStyle = trail
        ctx.fillRect(scanX - 140, 0, 140, height)
        ctx.fillStyle = 'rgba(255, 217, 61, 0.95)'
        ctx.fillRect(scanX - 1, 0, 2, height)
      }
    }

    function frame(now) {
      draw(now)
      if (now - startedAt < SCAN_MS + 1400) {
        raf = requestAnimationFrame(frame)
      } else {
        finished = true
        for (const s of slips) if (s.readAt == null) s.readAt = -10000
        draw(now)
      }
    }

    layout()
    if (finished) {
      draw(performance.now())
    } else {
      startedAt = performance.now() + 500 // short beat before the scan begins
      raf = requestAnimationFrame(frame)
    }

    // Resizing keeps the end state instead of replaying the scan.
    // The observer always fires once on observe(); that first call is ignored.
    let initial = true
    const observer = new ResizeObserver(() => {
      if (initial) {
        initial = false
        return
      }
      cancelAnimationFrame(raf)
      finished = true
      layout()
      draw(performance.now())
    })
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="auth__canvas" aria-hidden="true" />
}
