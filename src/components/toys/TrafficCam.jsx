import { useCallback, useEffect, useRef, useState } from 'react'
import { Device, Panel, Seg, Stat, Tween } from '../kit'

/*
 * Fig. 6: a live traffic camera. Illustrative scene, not the trained model.
 * Cars drive toward the camera; every frame each car yields a plate detection and, at night,
 * headlight and wet-road glare detections. Scoring is the same rule as before:
 *   conf  = day·light + night·(1 − light)          (shrinks a little for distant cars)
 *   score = conf − 0.25 · glare · (1 − light)      only in glare-aware mode
 *   shown = score ≥ threshold
 */
const PENALTY = 0.25
const LANES = [-0.62, 0, 0.62]
const HORIZON = 0.34
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function TrafficCam() {
  const [light, setLight] = useState(0.1)
  const [thr, setThr] = useState(0.55)
  const [mode, setMode] = useState('fixed')
  const [paused, setPaused] = useState(false)
  const [stats, setStats] = useState({ tp: 0, fp: 0, prec: 1, fps: 60, tracked: 0 })
  const [sel, setSel] = useState(null)
  const closeSel = useCallback(() => setSel(null), [])
  const wrap = useRef(null)
  const canvas = useRef(null)
  const ruler = useRef(null)
  const drag = useRef(false)
  const live = useRef({ light, thr, aware: false, paused })
  live.current = { light, thr, aware: mode === 'aware', paused }
  const dets = useRef([])

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv.getContext('2d')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const rnd = mulberry(42)
    let W = 0, H = 0, raf = 0, prev = performance.now(), nextId = 12, spawnIn = 0
    let frames = 0, fpsT = prev, fps = 60
    const window5 = [] // rolling per-frame counts
    const cars = []
    const spawn = (z = 0) => {
      const lane = Math.floor(rnd() * 3)
      if (cars.some((c) => c.lane === lane && c.z < 0.18)) return
      const tint = [[58, 62, 70], [120, 34, 30], [190, 190, 196], [32, 52, 92], [70, 70, 64]][Math.floor(rnd() * 5)]
      cars.push({ id: nextId++, lane, z, v: 0.075 + rnd() * 0.05, tint, seed: rnd() * 10 })
    }
    for (let i = 0; i < 4; i++) spawn(rnd() * 0.75)

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const r = wrap.current.getBoundingClientRect()
      W = r.width
      H = r.height
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap.current)

    // perspective: z in [0,1] from horizon to just past the camera
    const P = (lx, z) => {
      const y0 = H * HORIZON
      const t = z * z
      const y = y0 + (H * 1.05 - y0) * t
      const half = W * (0.06 + 0.62 * t)
      return { x: W / 2 + lx * half, y, s: 0.12 + 1.05 * t }
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const L = live.current
      const dark = 1 - L.light
      const run = !L.paused && !reduced
      const t = now / 1000

      frames++
      if (now - fpsT > 500) { fps = Math.round((frames * 1000) / (now - fpsT)); frames = 0; fpsT = now }

      if (run) {
        spawnIn -= dt
        if (spawnIn <= 0) { spawn(); spawnIn = 0.9 + rnd() * 1.4 }
        cars.forEach((c) => (c.z += c.v * dt * (0.6 + c.z)))
        for (let i = cars.length - 1; i >= 0; i--) if (cars[i].z > 1.05) cars.splice(i, 1)
      }
      cars.sort((a, b) => a.z - b.z)

      // ── scene ──
      const skyT = mix([10, 12, 20], [168, 190, 210], L.light)
      const skyB = mix([30, 28, 38], [222, 218, 206], L.light)
      const g = ctx.createLinearGradient(0, 0, 0, H * HORIZON)
      g.addColorStop(0, rgb(skyT))
      g.addColorStop(1, rgb(skyB))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H * HORIZON + 1)
      // ground + road
      ctx.fillStyle = rgb(mix([16, 18, 16], [118, 124, 104], L.light))
      ctx.fillRect(0, H * HORIZON, W, H)
      const a0 = P(-1.18, 0), a1 = P(1.18, 0), b0 = P(-1.18, 1.05), b1 = P(1.18, 1.05)
      ctx.fillStyle = rgb(mix([24, 24, 28], [96, 96, 98], L.light))
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b0.x, b0.y); ctx.fill()
      // wet sheen at night
      if (dark > 0.3) {
        const sh = ctx.createLinearGradient(0, H * HORIZON, 0, H)
        sh.addColorStop(0, `rgba(120,140,170,${0.0})`)
        sh.addColorStop(1, `rgba(120,140,170,${0.12 * dark})`)
        ctx.fillStyle = sh
        ctx.fill()
      }
      // lane dashes, scrolling toward camera
      const off = run ? (t * 0.55) % 1 : 0.3
      ctx.fillStyle = rgb([232, 226, 206], 0.35 + 0.3 * L.light)
      ;[-0.31, 0.31].forEach((lx) => {
        for (let k = 0; k < 14; k++) {
          const z0 = (k + off) / 14, z1 = z0 + 0.025
          if (z1 > 1.05) continue
          const p0 = P(lx, z0), p1 = P(lx, z1)
          const w0 = 1.2 * p0.s, w1 = 1.2 * p1.s
          ctx.beginPath(); ctx.moveTo(p0.x - w0, p0.y); ctx.lineTo(p0.x + w0, p0.y); ctx.lineTo(p1.x + w1, p1.y); ctx.lineTo(p1.x - w1, p1.y); ctx.fill()
        }
      })
      // edge lines
      ctx.strokeStyle = rgb([232, 226, 206], 0.5)
      ctx.lineWidth = 1.5
      ;[-1.1, 1.1].forEach((lx) => { const p0 = P(lx, 0), p1 = P(lx, 1.05); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke() })
      // street lamps
      ;[0.25, 0.55, 0.85].forEach((z) => {
        ;[-1.45, 1.45].forEach((lx) => {
          const p = P(lx, z), top = p.y - 120 * p.s
          ctx.strokeStyle = rgb(mix([50, 52, 58], [110, 108, 100], L.light))
          ctx.lineWidth = Math.max(1, 3 * p.s)
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, top); ctx.stroke()
          if (dark > 0.2) {
            const r = 40 * p.s + 6
            const lg = ctx.createRadialGradient(p.x, top, 0, p.x, top, r)
            lg.addColorStop(0, `rgba(255,236,190,${0.9 * dark})`)
            lg.addColorStop(1, 'rgba(255,220,150,0)')
            ctx.fillStyle = lg
            ctx.beginPath(); ctx.arc(p.x, top, r, 0, 7); ctx.fill()
          }
        })
      })

      // ── cars + detections ──
      const frameDets = []
      const conf = (day, night) => day * L.light + night * dark
      const score = (c, glare) => (L.aware ? c - PENALTY * glare * dark : c)
      cars.forEach((c) => {
        const p = P(LANES[c.lane], c.z)
        if (c.z < 0.04) return
        const w = 150 * p.s, h = 92 * p.s, x = p.x - w / 2, y = p.y - h
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.55, 8 * p.s, 0, 0, 7); ctx.fill()
        // body
        const body = mix(c.tint, mix(c.tint, [255, 255, 255], 0.25), L.light)
        ctx.fillStyle = rgb(mix(body, [20, 20, 24], dark * 0.5))
        roundRect(ctx, x, y + h * 0.28, w, h * 0.6, 12 * p.s); ctx.fill()
        ctx.fillStyle = rgb(mix(body, [12, 12, 16], 0.35 + dark * 0.3))
        roundRect(ctx, x + w * 0.14, y, w * 0.72, h * 0.38, 10 * p.s); ctx.fill()
        ctx.fillStyle = rgb(mix([20, 26, 36], [130, 160, 180], L.light), 0.9)
        roundRect(ctx, x + w * 0.2, y + h * 0.06, w * 0.6, h * 0.26, 6 * p.s); ctx.fill()
        // plate
        const pw = w * 0.36, ph = h * 0.13, px = p.x - pw / 2, py = y + h * 0.62
        ctx.fillStyle = rgb([236, 232, 220], 0.55 + 0.4 * L.light)
        ctx.fillRect(px, py, pw, ph)
        // headlights + glare
        const hy = y + h * 0.45
        ;[x + w * 0.17, x + w * 0.83].forEach((hx) => {
          ctx.fillStyle = rgb([255, 250, 230], 0.45 + 0.55 * dark)
          ctx.beginPath(); ctx.ellipse(hx, hy, w * 0.07, h * 0.06, 0, 0, 7); ctx.fill()
          if (dark > 0.15) {
            const r = w * (0.15 + 0.35 * dark)
            const gg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r)
            gg.addColorStop(0, `rgba(255,248,225,${0.85 * dark})`)
            gg.addColorStop(1, 'rgba(255,230,170,0)')
            ctx.fillStyle = gg
            ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill()
            ctx.fillStyle = `rgba(255,246,220,${0.5 * dark})`
            ctx.fillRect(hx - r * 1.3, hy - 0.6, r * 2.6, 1.2)
          }
        })
        // road reflection under the car at night
        if (dark > 0.3) {
          const rg = ctx.createRadialGradient(p.x, p.y + 10 * p.s, 0, p.x, p.y + 10 * p.s, w * 0.55)
          rg.addColorStop(0, `rgba(255,236,190,${0.35 * dark})`)
          rg.addColorStop(1, 'rgba(255,236,190,0)')
          ctx.fillStyle = rg
          ctx.fillRect(p.x - w * 0.6, p.y, w * 1.2, 22 * p.s)
        }
        // detections (same scoring rule, size-aware for distant cars, tiny per-frame jitter)
        const near = 0.78 + 0.22 * Math.min(1, c.z * 1.4)
        const jit = 0.012 * Math.sin(t * 9 + c.seed)
        const plateC = conf(0.94, 0.84) * near + jit
        frameDets.push({ car: c.id, label: 'plate', below: true, tp: true, glare: 0.15, conf: plateC, score: score(plateC, 0.15), box: [px - 3, py - 3, pw + 6, ph + 6] })
        if (dark > 0.2) {
          ;[x + w * 0.17, x + w * 0.83].forEach((hx, k) => {
            const hc = conf(0.17, 0.68) + jit * (k ? -1 : 1)
            frameDets.push({ car: c.id, label: 'headlight', quiet: k === 1, tp: false, glare: 1, conf: hc, score: score(hc, 1), box: [hx - w * 0.11, hy - h * 0.1, w * 0.22, h * 0.2] })
          })
          const rc = conf(0.12, 0.58)
          frameDets.push({ car: c.id, label: 'reflection', tp: false, glare: 0.9, conf: rc, score: score(rc, 0.9), box: [p.x - w * 0.35, p.y + 2, w * 0.7, 16 * p.s] })
        }
      })
      // roadside sign
      const sp = P(1.7, 0.42)
      ctx.fillStyle = '#d9a63e'
      ctx.fillRect(sp.x - 26 * sp.s, sp.y - 150 * sp.s, 52 * sp.s, 30 * sp.s)
      const sc = conf(0.52, 0.48)
      frameDets.push({ car: 0, label: 'sign', tp: false, glare: 0.1, conf: sc, score: score(sc, 0.1), box: [sp.x - 28 * sp.s, sp.y - 152 * sp.s, 56 * sp.s, 34 * sp.s] })

      // draw boxes
      ctx.font = '600 10px "JetBrains Mono Variable", monospace'
      frameDets.forEach((d) => {
        d.kept = d.score >= L.thr
        const [bx, by, bw, bh] = d.box
        if (bw < 6) return
        if (d.kept) {
          const col = d.tp ? '#ff6a2c' : '#ff3b6b'
          ctx.strokeStyle = col
          ctx.lineWidth = 2
          ctx.setLineDash(d.tp ? [] : [6, 3])
          ctx.strokeRect(bx, by, bw, bh)
          ctx.setLineDash([])
          // one tag per headlight pair, plates tagged underneath, nothing on boxes too small to read
          if (!d.quiet && bw >= 16) {
            const text = d.label === 'headlight' ? `glare ${d.conf.toFixed(2)}` : `${d.label}${d.tp ? ` #${d.car}` : ''} ${d.conf.toFixed(2)}`
            const tw = ctx.measureText(text).width + 8
            const ty = d.below ? by + bh + 1 : by - 15
            ctx.fillStyle = col
            ctx.fillRect(bx - 1, ty, tw, 14)
            ctx.fillStyle = '#120a05'
            ctx.fillText(text, bx + 3, ty + 10.5)
          }
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.28)'
          ctx.lineWidth = 1
          ctx.setLineDash([2, 4])
          ctx.strokeRect(bx, by, bw, bh)
          ctx.setLineDash([])
        }
      })
      dets.current = frameDets

      // vignette, grain-ish scanline, HUD
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
      if (!reduced) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(0, ((t * 60) % H), W, 2)
      }
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.font = '11px "JetBrains Mono Variable", monospace'
      ctx.fillStyle = Math.floor(t * 1.4) % 2 ? '#ff3b30' : 'rgba(255,59,48,0.25)'
      ctx.beginPath(); ctx.arc(20, 19, 4, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.fillText('REC  CAM-02  NH-64 WEST', 30, 23)
      const clock = new Date().toLocaleTimeString('en-GB', { hour12: false })
      ctx.textAlign = 'right'
      ctx.fillText(`${clock}  ${fps} fps`, W - 14, 23)
      ctx.textAlign = 'left'
      ctx.fillText(`yolov8l  conf ≥ ${L.thr.toFixed(2)}${L.aware ? '  glare-aware' : ''}`, 14, H - 12)
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1.5
      ;[[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(cx, cy + 14 * sy); ctx.lineTo(cx, cy); ctx.lineTo(cx + 14 * sx, cy); ctx.stroke()
      })

      // rolling precision over ~5 s
      const tp = frameDets.filter((d) => d.tp && d.kept).length
      const fp = frameDets.filter((d) => !d.tp && d.kept).length
      window5.push([tp, fp])
      if (window5.length > 300) window5.shift()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const tick = setInterval(() => {
      const s = window5.reduce((a, [tp, fp]) => [a[0] + tp, a[1] + fp], [0, 0])
      const n = Math.max(1, window5.length)
      setStats({ tp: s[0] / n, fp: s[1] / n, prec: s[0] + s[1] ? s[0] / (s[0] + s[1]) : 1, fps, tracked: cars.length })
    }, 400)

    return () => { cancelAnimationFrame(raf); clearInterval(tick); ro.disconnect() }
  }, [])

  const pick = (e) => {
    const r = canvas.current.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const hit = [...dets.current].reverse().find((d) => x >= d.box[0] && x <= d.box[0] + d.box[2] && y >= d.box[1] - 15 && y <= d.box[1] + d.box[3])
    setSel(hit ? { ...hit, left: (x / r.width) * 100, top: Math.min(50, (y / r.height) * 100 + 6) } : null)
  }
  const setFrom = (e) => {
    const r = ruler.current.getBoundingClientRect()
    setThr(Math.round(Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width)) * 100) / 100)
  }
  const keyThr = (e) => {
    const k = e.shiftKey ? 0.05 : 0.01
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setThr((v) => Math.min(0.95, +(v + k).toFixed(2))) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setThr((v) => Math.max(0.05, +(v - k).toFixed(2))) }
  }

  return (
    <Device
      name="CAM-02, plate detector"
      sub="live tracking, illustrative scene"
      status={paused ? 'idle' : 'live'}
      statusLabel={paused ? 'paused' : 'rec'}
      toolbar={
        <>
          <Seg label="Threshold" value={mode} onChange={setMode} options={[['fixed', 'one threshold'], ['aware', 'glare-aware']]} />
          <label className="flex items-center gap-2 font-mono text-[12px] text-mute">
            night
            <input type="range" min="0" max="1" step="0.01" value={light} onChange={(e) => setLight(+e.target.value)} className="w-28" aria-label="Time of day" />
            day
          </label>
          <button onClick={() => setPaused((p) => !p)} className="rounded-full border border-ink/20 px-3 py-1.5 font-mono text-[12px] transition-colors hover:border-ink" aria-pressed={paused}>
            {paused ? 'play' : 'pause'}
          </button>
          <div className="ml-auto flex items-baseline gap-5">
            <Stat label="tracked">{stats.tracked}</Stat>
            <Stat label="false boxes / frame" accent={stats.fp > 0.05}><Tween value={stats.fp} format={(v) => v.toFixed(1)} duration={0.4} /></Stat>
            <Stat label="precision, 5 s"><Tween value={stats.prec * 100} format={(v) => `${Math.round(v)}%`} duration={0.4} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span>click any box for its score</span>
          <span>arrow keys move the threshold</span>
          <span className="ml-auto">{stats.fps} fps in your browser</span>
        </>
      }
    >
      <div ref={wrap} className="relative aspect-[16/8] min-h-[260px] w-full bg-black" onClick={pick} data-cursor="snap">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label="Live traffic camera with plate detections" />
        <Panel
          open={!!sel}
          onClose={closeSel}
          left={sel?.left ?? 50}
          top={sel?.top ?? 20}
          title={sel ? `${sel.label}${sel.tp ? ` #${sel.car}` : ''}, ${sel.tp ? 'true plate' : 'false detection'}` : ''}
          rows={sel ? [['confidence', sel.conf.toFixed(3)], ['glare penalty', mode === 'aware' ? `−${(PENALTY * sel.glare * (1 - light)).toFixed(3)}` : 'off'], ['score', sel.score.toFixed(3)], ['threshold', thr.toFixed(2)], ['shown', sel.score >= thr ? 'yes' : 'no']] : []}
        />
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="mb-1.5 flex justify-between font-mono text-[10.5px] text-mute">
          <span>0.0</span><span>{mode === 'aware' ? 'score after glare penalty' : 'detector confidence'}</span><span>1.0</span>
        </div>
        <div
          ref={ruler}
          role="slider"
          tabIndex={0}
          aria-label="Detection threshold"
          aria-valuemin={0.05}
          aria-valuemax={0.95}
          aria-valuenow={thr}
          onKeyDown={keyThr}
          className="relative h-12 touch-none select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-signal/40"
          onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); setFrom(e) }}
          onPointerMove={(e) => drag.current && setFrom(e)}
          onPointerUp={() => (drag.current = false)}
        >
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-ink/10" />
          <div className="absolute inset-y-1 right-0 rounded-lg bg-signal/[0.07] transition-[left] duration-150" style={{ left: `${thr * 100}%` }} />
          <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-signal transition-[left] duration-150" style={{ left: `${thr * 100}%` }}>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal px-2 py-1 font-mono text-[10.5px] leading-none text-signal-ink shadow">
              {thr.toFixed(2)}
            </span>
          </div>
        </div>
        <p className="mt-1.5 font-mono text-[10.5px] text-mute">drag the line; boxes to the right of it are shown on the feed</p>
      </div>
    </Device>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
