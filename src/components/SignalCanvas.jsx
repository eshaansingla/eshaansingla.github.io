import { useEffect, useRef } from 'react'
import { cssVar, onThemeChange } from '../theme'

/*
 * Fig. 1 trace: a tympanic/PPG-style pulse with percussion (P1), tidal (P2) and dicrotic peaks.
 * `level` in [0, 1] is the manoeuvre response; as it rises P2 climbs past P1 and the baseline lifts.
 * Hovering draws a crosshair with the sample's age and value.
 */

const gauss = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s))
export const p1 = (k) => 1.0 - 0.28 * k
export const p2 = (k) => 0.74 + 0.62 * k

function pulse(x, t, k) {
  const p = (((x * 5.2 - t * 1.2) % 1) + 1) % 1
  const beat =
    p1(k) * gauss(p, 0.1, 0.032) +
    p2(k) * gauss(p, 0.23, 0.05 + 0.015 * k) +
    (0.46 + 0.08 * k) * gauss(p, 0.4, 0.07) +
    0.12 * gauss(p, 0.62, 0.12)
  return 0.14 + 0.1 * k + beat * 0.5 + 0.07 * Math.sin(2 * Math.PI * (x * 0.9 - t * 0.22))
}

const hex2 = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')
const FONT = '500 10.5px "JetBrains Mono Variable", ui-monospace, monospace'

export default function SignalCanvas({ level = 0, readoutRef, kRef, label = '' }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const st = useRef({ t: 0, k: 0, kTarget: 0, hoverX: null, visible: true, reduced: false, label })
  st.current.label = label

  useEffect(() => { st.current.kTarget = level }, [level])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas.getContext('2d')
    const s = st.current
    s.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (s.reduced) s.t = 0.8

    let C = {}
    const readColors = () => { C = { ink: cssVar('--ink', wrap), signal: cssVar('--signal', wrap), grid: cssVar('--grid', wrap), canvas: cssVar('--canvas', wrap) } }
    readColors()

    let w = 0, h = 0, raf = 0, last = performance.now()
    const sample = (x) => pulse(x, s.t, s.k)
    const yOf = (v) => 24 + (1 - v) * (h - 46)

    function tag(text, x, y, color) {
      ctx.font = FONT
      const tw = ctx.measureText(text).width + 12
      const bx = Math.min(w - tw - 6, Math.max(6, x + 10))
      const by = Math.max(6, y - 26)
      ctx.fillStyle = C.canvas + 'e6'
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(bx, by, tw, 18, 4); ctx.fill(); ctx.stroke()
      ctx.fillStyle = color
      ctx.textAlign = 'left'
      ctx.fillText(text, bx + 6, by + 12.5)
    }

    function draw() {
      if (!w || !h) return
      ctx.clearRect(0, 0, w, h)

      ctx.lineWidth = 1
      ctx.strokeStyle = C.grid
      ctx.beginPath()
      for (let x = 20; x < w; x += 20) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h) }
      for (let y = 20; y < h; y += 20) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5) }
      ctx.stroke()

      if (s.k > 0.01) {
        const rg = ctx.createRadialGradient(w * 0.62, h * 0.55, 0, w * 0.62, h * 0.55, w * 0.55)
        rg.addColorStop(0, C.signal + hex2(0.13 * s.k))
        rg.addColorStop(1, C.signal + '00')
        ctx.fillStyle = rg
        ctx.fillRect(0, 0, w, h)
      }

      const headX = w * 0.9
      const n = Math.max(160, Math.floor(headX / 2))
      const pts = new Array(n + 1)
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * headX
        pts[i] = [x, yOf(sample(x / w))]
      }

      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, C.signal + '24')
      g.addColorStop(1, C.signal + '00')
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (const [x, y] of pts) ctx.lineTo(x, y)
      ctx.lineTo(headX, h)
      ctx.closePath()
      ctx.fillStyle = g
      ctx.fill()

      const lg = ctx.createLinearGradient(0, 0, headX, 0)
      lg.addColorStop(0, C.ink + '20')
      lg.addColorStop(0.55, C.ink + 'd0')
      lg.addColorStop(0.86, C.signal)
      lg.addColorStop(1, C.signal)
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.strokeStyle = lg
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.stroke()

      // P1 / P2 on the most recent complete beat
      ctx.font = FONT
      ctx.textAlign = 'center'
      const kBeat = Math.floor(((headX - 70) / w) * 5.2 - s.t * 1.2 - 0.23)
      ;[0.1, 0.23].forEach((ph, i) => {
        const x = ((ph + s.t * 1.2 + kBeat) / 5.2) * w
        const y = yOf(sample(x / w))
        const hot = i === 1 && s.k > 0.35
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = hot ? C.signal : C.ink + '99'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 18); ctx.stroke()
        ctx.fillStyle = hot ? C.signal : C.ink
        ctx.fillText(i ? 'P2' : 'P1', x, y - 23)
      })

      // 1 s scale bar
      const sec = (1.2 / 5.2) * w
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(14, h - 12.5); ctx.lineTo(14 + sec, h - 12.5)
      ctx.moveTo(14.5, h - 16); ctx.lineTo(14.5, h - 9)
      ctx.moveTo(14 + sec - 0.5, h - 16); ctx.lineTo(14 + sec - 0.5, h - 9)
      ctx.stroke()
      ctx.textAlign = 'left'
      ctx.fillStyle = C.ink
      ctx.fillText('1 s', 20 + sec, h - 9)
      ctx.globalAlpha = 1

      // write head
      const [hx, hy] = pts[n]
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = C.signal + '88'
      ctx.beginPath(); ctx.moveTo(hx, hy + 0.5); ctx.lineTo(w, hy + 0.5); ctx.stroke()
      ctx.setLineDash([])
      const ring = s.reduced ? 0 : (s.t * 1.6) % 1
      ctx.beginPath()
      ctx.arc(hx, hy, 4 + ring * 12, 0, Math.PI * 2)
      ctx.strokeStyle = C.signal + hex2(0.65 * (1 - ring))
      ctx.stroke()
      ctx.save()
      ctx.shadowColor = C.signal
      ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(hx, hy, 3.8, 0, Math.PI * 2)
      ctx.fillStyle = C.signal
      ctx.fill()
      ctx.restore()

      if (readoutRef?.current) readoutRef.current.textContent = (p2(s.k) / p1(s.k)).toFixed(2)

      // hover crosshair with the sample's age and value
      if (s.hoverX != null && s.hoverX <= headX) {
        const x = s.hoverX
        const v = sample(x / w)
        const y = yOf(v)
        ctx.strokeStyle = C.ink + '55'
        ctx.beginPath()
        ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h)
        ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5)
        ctx.stroke()
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill()
        const ms = Math.round(((headX - x) / headX) * 4000)
        tag(`t−${ms} ms  ${v.toFixed(3)} a.u.`, x, y, C.ink)
      } else if (s.hoverX != null && s.label) {
        tag(s.label, hx - 40, hy, C.signal)
      }
    }

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const r = wrap.getBoundingClientRect()
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (s.visible) {
        if (!s.reduced) s.t += dt
        const fast = s.reduced ? 99 : 1
        s.k += (s.kTarget - s.k) * Math.min(1, dt * (s.kTarget > s.k ? 1.4 : 2.2) * fast)
        draw()
        if (kRef?.current) kRef.current.style.transform = `scaleY(${Math.max(0.03, Math.min(1, s.k))})`
      }
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => (s.visible = e.isIntersecting))
    io.observe(wrap)
    const offTheme = onThemeChange(() => { readColors(); draw() })

    const onMove = (e) => { if (e.pointerType === 'mouse') s.hoverX = e.clientX - canvas.getBoundingClientRect().left }
    const onLeave = () => (s.hoverX = null)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    resize()
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      offTheme()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [readoutRef, kRef])

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Animated eardrum pulse trace with percussion and tidal peaks that respond to the selected manoeuvre"
      />
    </div>
  )
}
