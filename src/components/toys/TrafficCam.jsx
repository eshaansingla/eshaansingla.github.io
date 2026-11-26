import { useCallback, useEffect, useRef, useState } from 'react'
import { Device, Panel, Seg, Stat, Tween } from '../kit'
import { LANES, drawBoxes, drawCar, drawCrops, drawGlare, drawHud, drawScene, makeCar, mulberry, project } from './trafficScene'

/*
 * Licence-plate figure: a live traffic camera over both carriageways. Illustrative scene, not the trained model; plates are made up.
 * Every frame each car yields a plate detection (front or rear) and, at night, lamp and wet-road glare detections:
 *   conf  = day·light + night·(1 − light)          (shrinks a little for distant cars)
 *   score = conf − 0.25 · glare · (1 − light)      only in glare-aware mode
 *   shown = score ≥ threshold
 */
const PENALTY = 0.25

export default function TrafficCam() {
  const [light, setLight] = useState(0.1)
  const [thr, setThr] = useState(0.55)
  const [mode, setMode] = useState('fixed')
  const [paused, setPaused] = useState(false)
  const [stats, setStats] = useState({ fp: 0, prec: 1, fps: 60, tracked: 0 })
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
    let W = 0, H = 0, raf = 0, prev = performance.now(), nextId = 12, visible = true
    const spawnIn = { away: 0.4, toward: 0 } // one random timer per carriageway, same range, so both sides average the same traffic
    let frames = 0, fpsT = prev, fps = 60
    const history = [] // per-frame [plates shown, false boxes shown], ~5 s
    const cars = []
    // oncoming cars enter at the horizon, outgoing cars enter from under the camera
    const spawn = (z, side) => {
      const pool = LANES.map((lx, i) => i).filter((i) => (side ? (side === 'away') === (LANES[i] < 0) : true))
      const lane = pool[Math.floor(rnd() * pool.length)]
      const away = LANES[lane] < 0
      const z0 = z ?? (away ? 1.06 : 0.05)
      if (cars.some((c) => c.lane === lane && Math.abs(c.z - z0) < 0.22)) return
      cars.push(makeCar(rnd, nextId++, lane, z0))
    }
    for (let i = 0; i < 8; i++) spawn(0.15 + rnd() * 0.75, i % 2 ? 'away' : 'toward')
    const firstSeen = new Map() // car id -> time its plate crop appeared

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
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(wrap.current)

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!visible) return
      const L = live.current
      const dark = 1 - L.light
      const run = !L.paused && !reduced
      const t = now / 1000
      frames++
      if (now - fpsT > 500) { fps = Math.round((frames * 1000) / (now - fpsT)); frames = 0; fpsT = now }

      if (run) {
        for (const side of ['away', 'toward']) {
          spawnIn[side] -= dt
          if (spawnIn[side] <= 0) { spawn(undefined, side); spawnIn[side] = 1.1 + rnd() * 1.6 }
        }
        cars.forEach((c) => (c.z += c.dir * c.v * dt * (0.6 + c.z)))
        for (let i = cars.length - 1; i >= 0; i--) {
          const c = cars[i]
          if ((c.dir > 0 && c.z > 1.08) || (c.dir < 0 && c.z < 0.03)) { firstSeen.delete(c.id); cars.splice(i, 1) }
        }
      }
      cars.sort((a, b) => a.z - b.z)

      const signBox = drawScene(ctx, W, H, L.light)

      const conf = (day, night) => day * L.light + night * dark
      const score = (c, glare) => (L.aware ? c - PENALTY * glare * dark : c)
      const found = [], crops = []
      cars.forEach((c) => {
        if (c.z < 0.04) return
        const p = project(W, H, LANES[c.lane], c.z)
        const geo = drawCar(ctx, c, p, L.light)
        const rear = c.dir < 0
        drawGlare(ctx, geo, p.s, dark, rear)
        const near = 0.78 + 0.22 * Math.min(1, c.z * 1.4)
        const jit = 0.012 * Math.sin(t * 9 + c.seed)
        const pc = conf(0.94, 0.84) * near + jit
        const [px, py, pw, ph] = geo.plate
        const plateDet = { car: c.id, plate: c.plate, dir: c.dir, label: 'plate', tp: true, glare: 0.15, conf: pc, score: score(pc, 0.15), box: [px - 3, py - 3, pw + 6, ph + 6] }
        found.push(plateDet)
        if (geo.width > W * 0.085 && py + ph < H - 24 && py > H * 0.3) crops.push({ det: plateDet, geo, dir: c.dir, id: c.id })
        if (dark > 0.2) {
          const bw = geo.width * 0.2
          geo.lights.forEach(([hx, hy], k) => {
            const hc = (rear ? conf(0.12, 0.6) : conf(0.17, 0.68)) + jit * (k ? -1 : 1)
            found.push({ car: c.id, label: rear ? 'tail light' : 'headlight', quiet: k === 1, tp: false, glare: 1, conf: hc, score: score(hc, 1), box: [hx - bw / 2, hy - bw * 0.45, bw, bw * 0.9] })
          })
          const rc = conf(0.12, 0.58)
          found.push({ car: c.id, label: 'reflection', tp: false, glare: 0.9, conf: rc, score: score(rc, 0.9), box: [p.x - geo.width * 0.35, geo.ground + 2, geo.width * 0.7, 16 * p.s] })
        }
      })
      const sc = conf(0.52, 0.48)
      found.push({ car: 0, label: 'sign', tp: false, glare: 0.1, conf: sc, score: score(sc, 0.1), box: signBox })
      found.forEach((d) => (d.kept = d.score >= L.thr))

      drawBoxes(ctx, found)
      const shown = crops.filter((q) => q.det.kept)
      shown.forEach((q) => { if (!firstSeen.has(q.id)) firstSeen.set(q.id, t) })
      cars.forEach((c) => { if (!shown.some((q) => q.id === c.id)) firstSeen.delete(c.id) })
      drawCrops(ctx, shown.map((q) => ({ ...q, born: firstSeen.get(q.id) })), W, H, t)
      dets.current = found
      drawHud(ctx, W, H, t, { fps, thr: L.thr, aware: L.aware, reduced })

      history.push([found.filter((d) => d.tp && d.kept).length, found.filter((d) => !d.tp && d.kept).length])
      if (history.length > 300) history.shift()
    }
    raf = requestAnimationFrame(frame)

    const tick = setInterval(() => {
      const [tp, fp] = history.reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0])
      setStats({ fp: fp / Math.max(1, history.length), prec: tp + fp ? tp / (tp + fp) : 1, fps, tracked: cars.length })
    }, 400)

    return () => { cancelAnimationFrame(raf); clearInterval(tick); ro.disconnect(); io.disconnect() }
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
      <div ref={wrap} className="relative aspect-[16/8] min-h-[260px] w-full bg-black" onClick={pick} data-cursor>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label="Live traffic camera with plate detections" />
        <Panel
          open={!!sel}
          onClose={closeSel}
          left={sel?.left ?? 50}
          top={sel?.top ?? 20}
          title={sel ? `${sel.label}${sel.tp ? ` #${sel.car}` : ''}, ${sel.tp ? 'true plate' : 'false detection'}` : ''}
          rows={sel ? [...(sel.tp ? [['plate (made up)', sel.plate], ['direction', sel.dir > 0 ? 'oncoming, front plate' : 'outgoing, rear plate']] : []), ['confidence', sel.conf.toFixed(3)], ['glare penalty', mode === 'aware' ? `−${(PENALTY * sel.glare * (1 - light)).toFixed(3)}` : 'off'], ['score', sel.score.toFixed(3)], ['threshold', thr.toFixed(2)], ['shown', sel.score >= thr ? 'yes' : 'no']] : []}
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
