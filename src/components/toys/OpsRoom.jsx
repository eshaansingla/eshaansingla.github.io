import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device, Panel, Stat, Toggle, Tween } from '../kit'
import { cssVar, onThemeChange } from '../../theme'

/*
 * Fig. 5: the Sanchaalan Saathi operations room, as a live simulation.
 * Field reports arrive, extraction fills in the structured task, the incident drops onto the map,
 * and volunteers travel to it on the Hungarian assignment (solved live on every change).
 * Nearest-first is computed on the same snapshot so the waste figure compares like for like.
 */
const MW = 760, MH = 420
const KINDS = ['food supplies', 'medical camp', 'shelter', 'drinking water', 'debris clearing']
const URG = ['low', 'medium', 'high']
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function hungarian(a) {
  const n = a.length, m = a[0].length, INF = 1e18
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0)
  const p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0)
  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF, j1 = 0
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0 }
        if (minv[j] < delta) { delta = minv[j]; j1 = j }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta } else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1 } while (j0)
  }
  const out = []
  for (let j = 1; j <= m; j++) if (p[j]) out.push([p[j] - 1, j - 1])
  return out
}
function solve(V, T) {
  if (!V.length || !T.length) return []
  const vt = V.length <= T.length
  const M = vt ? V.map((p) => T.map((t) => d(p, t))) : T.map((t) => V.map((p) => d(p, t)))
  return hungarian(M).map(([r, c]) => (vt ? [r, c] : [c, r]))
}
function greedy(V, T) {
  const uv = new Set(), ut = new Set(), pairs = []
  for (let k = 0; k < Math.min(V.length, T.length); k++) {
    let m = Infinity, bi, bj
    V.forEach((p, i) => !uv.has(i) && T.forEach((t, j) => { if (!ut.has(j) && d(p, t) < m) { m = d(p, t); bi = i; bj = j } }))
    uv.add(bi); ut.add(bj); pairs.push([bi, bj])
  }
  return pairs
}

function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ROADS_H = [70, 160, 250, 340]
const ROADS_V = [110, 260, 420, 590, 700]

export default function OpsRoom() {
  const [feed, setFeed] = useState([])
  const [stats, setStats] = useState({ open: 0, resolved: 0, avg: 0, cost: 0, waste: 0 })
  const [showGreedy, setShowGreedy] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sel, setSel] = useState(null)
  const closeSel = useCallback(() => setSel(null), [])
  const wrap = useRef(null)
  const canvas = useRef(null)
  const api = useRef({})
  const flags = useRef({ showGreedy, paused })
  flags.current = { showGreedy, paused }

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv.getContext('2d')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const rnd = mulberry(7)
    let W = 0, H = 0, sx = 1, raf = 0, prev = performance.now(), simT = 0, nextTask = 1, spawnIn = 2.5
    let C = {}
    const colors = () => { C = { ink: cssVar('--ink', wrap.current), signal: cssVar('--signal', wrap.current), paper: cssVar('--paper', wrap.current), rule: cssVar('--rule-2', wrap.current), mute: cssVar('--mute', wrap.current) } }
    colors()

    const vols = [[150, 150], [262, 118], [380, 186], [520, 196], [318, 300]].map((p, i) => ({ id: i + 1, x: p[0], y: p[1], task: null, trail: [] }))
    const tasks = []
    let resolved = 0, respSum = 0, lastCost = 0, lastWaste = 0, greedyPairs = [], optSum = 0, greedySum = 0

    const pushFeed = (t) => setFeed((f) => [{ id: t.id, kind: t.kind, urg: t.urg, people: t.people, sector: t.sector, status: 'extracting', vol: null, born: Date.now() }, ...f].slice(0, 5))
    const patchFeed = (id, patch) => setFeed((f) => f.map((r) => (r.id === id ? { ...r, ...patch } : r)))

    const addTask = (x, y, silent) => {
      const t = {
        id: nextTask++, x, y, kind: KINDS[Math.floor(rnd() * KINDS.length)], urg: URG[Math.floor(rnd() * 3)],
        people: 10 + Math.floor(rnd() * 60), sector: `Sector ${1 + Math.floor((x / MW) * 4) + 4 * Math.floor((y / MH) * 3)}`,
        state: silent ? 'open' : 'incoming', born: simT, t0: simT, vol: null,
      }
      tasks.push(t)
      pushFeed(t)
      if (silent) { patchFeed(t.id, { status: 'open' }); reassign() }
      return t
    }
    const reassign = () => {
      const open = tasks.filter((t) => t.state === 'open')
      const V = vols.filter((v) => !v.task || v.task.state === 'open').map((v) => v)
      V.forEach((v) => { if (v.task && v.task.state === 'open') { v.task.vol = null; v.task = null } })
      const pairs = solve(V.map((v) => [v.x, v.y]), open.map((t) => [t.x, t.y]))
      pairs.forEach(([vi, ti]) => { V[vi].task = open[ti]; open[ti].vol = V[vi] })
      lastCost = pairs.reduce((s, [vi, ti]) => s + d([V[vi].x, V[vi].y], [open[ti].x, open[ti].y]), 0)
      const gp = greedy(V.map((v) => [v.x, v.y]), open.map((t) => [t.x, t.y]))
      greedyPairs = gp.map(([vi, ti]) => [V[vi], open[ti]])
      const gc = gp.reduce((s, [vi, ti]) => s + d([V[vi].x, V[vi].y], [open[ti].x, open[ti].y]), 0)
      // running total over every dispatch decision so far, so the figure does not flicker to 0 when one task is open
      if (pairs.length) { optSum += lastCost; greedySum += gc }
      lastWaste = optSum ? ((greedySum - optSum) / optSum) * 100 : 0
      open.forEach((t) => patchFeed(t.id, { status: t.vol ? 'assigned' : 'waiting', vol: t.vol ? t.vol.id : null }))
      sync()
    }
    const sync = () => setStats({ open: tasks.filter((t) => t.state !== 'resolved').length, resolved, avg: resolved ? respSum / resolved : 0, cost: lastCost, waste: lastWaste })

    // seed the board
    ;[[96, 74], [318, 48], [560, 92], [468, 252], [190, 250]].forEach(([x, y]) => addTask(x, y, true))

    api.current = {
      report: (x, y) => { const t = addTask(x, y, true); return t },
      addVol: () => { if (vols.length >= 8) return; vols.push({ id: vols.length + 1, x: 60 + rnd() * 640, y: 60 + rnd() * 300, task: null, trail: [] }); reassign() },
      hit: (x, y) => {
        const v = vols.find((q) => Math.hypot(q.x - x, q.y - y) < 16)
        if (v) return { kind: 'v', v }
        const t = tasks.find((q) => q.state !== 'resolved' && Math.hypot(q.x - x, q.y - y) < 18)
        return t ? { kind: 't', t } : null
      },
      drag: (v, x, y) => { v.x = Math.max(10, Math.min(MW - 10, x)); v.y = Math.max(10, Math.min(MH - 10, y)); v.trail = [] },
      dropped: () => reassign(),
    }

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const r = wrap.current.getBoundingClientRect()
      W = r.width
      H = r.height
      sx = W / MW
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr * sx, 0, 0, dpr * (H / MH), 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap.current)
    const offTheme = onThemeChange(colors)

    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const F = flags.current
      const run = !F.paused && !reduced
      if (run) simT += dt
      const t = now / 1000

      // incoming reports: extraction takes ~1.4 s, then the task goes on the map
      tasks.forEach((tk) => {
        if (tk.state === 'incoming' && simT - tk.t0 > 1.4) { tk.state = 'open'; tk.t0 = simT; reassign() }
      })
      if (run) {
        spawnIn -= dt
        if (spawnIn <= 0 && tasks.filter((x) => x.state !== 'resolved').length < 7) {
          const rx = 50 + rnd() * (MW - 100), ry = 40 + rnd() * (MH - 80)
          addTask(rx, ry, false)
          spawnIn = 3 + rnd() * 2.5
        }
        // move volunteers along their assignment
        vols.forEach((v) => {
          const tk = v.task
          if (tk && tk.state === 'open') {
            const dx = tk.x - v.x, dy = tk.y - v.y, L = Math.hypot(dx, dy)
            const sp = 70 * dt
            if (L <= sp + 0.5) { v.x = tk.x; v.y = tk.y; tk.state = 'verifying'; tk.t0 = simT; patchFeed(tk.id, { status: 'verifying' }) }
            else { v.x += (dx / L) * sp; v.y += (dy / L) * sp }
            v.trail.push([v.x, v.y, simT])
          }
          v.trail = v.trail.filter((p) => simT - p[2] < 1.6)
        })
        // verification then resolve
        tasks.forEach((tk) => {
          if (tk.state === 'verifying' && simT - tk.t0 > 1.6) {
            tk.state = 'resolved'; tk.t0 = simT; resolved++; respSum += simT - tk.born
            patchFeed(tk.id, { status: 'resolved' })
            if (tk.vol) { tk.vol.task = null; tk.vol = null }
            reassign()
          }
        })
        for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i].state === 'resolved' && simT - tasks[i].t0 > 1.2) tasks.splice(i, 1)
      }

      // ── draw map ──
      ctx.clearRect(0, 0, MW, MH)
      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, MW, MH)
      // blocks
      ctx.fillStyle = C.ink + '0d'
      for (let i = 0; i < ROADS_V.length + 1; i++) for (let j = 0; j < ROADS_H.length + 1; j++) {
        const x0 = i ? ROADS_V[i - 1] + 9 : 0, x1 = i < ROADS_V.length ? ROADS_V[i] - 9 : MW
        const y0 = j ? ROADS_H[j - 1] + 9 : 0, y1 = j < ROADS_H.length ? ROADS_H[j] - 9 : MH
        if (x1 - x0 < 10 || y1 - y0 < 10) continue
        rr(ctx, x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8, 8); ctx.fill()
      }
      // park + river
      ctx.fillStyle = C.ink + '12'
      rr(ctx, 440, 274, 130, 50, 10); ctx.fill()
      ctx.strokeStyle = C.ink + '14'
      ctx.lineWidth = 26
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-20, 200); ctx.bezierCurveTo(140, 150, 260, 250, 400, 205); ctx.bezierCurveTo(540, 160, 640, 190, 790, 170); ctx.stroke()
      // road names
      ctx.fillStyle = C.mute
      ctx.font = '9px "JetBrains Mono Variable", monospace'
      ctx.fillText('MALL RD', 14, ROADS_H[0] - 4)
      ctx.fillText('STATION RD', 14, ROADS_H[2] - 4)
      ctx.save(); ctx.translate(ROADS_V[2] + 4, 30); ctx.rotate(Math.PI / 2); ctx.fillText('CIVIL LINES', 0, 0); ctx.restore()

      // nearest-first ghost lines
      if (F.showGreedy) {
        ctx.setLineDash([3, 6]); ctx.strokeStyle = C.ink + '70'; ctx.lineWidth = 1.3
        greedyPairs.forEach(([v, tk]) => { if (tk.state !== 'open') return; ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(tk.x, tk.y); ctx.stroke() })
        ctx.setLineDash([])
      }
      // assignment lines: solid ahead of the volunteer
      vols.forEach((v) => {
        const tk = v.task
        if (!tk || tk.state !== 'open') return
        ctx.strokeStyle = C.signal + 'aa'; ctx.lineWidth = 2
        ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 30
        ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(tk.x, tk.y); ctx.stroke()
        ctx.setLineDash([]); ctx.lineDashOffset = 0
      })
      // trails
      vols.forEach((v) => {
        for (let i = 1; i < v.trail.length; i++) {
          const a = v.trail[i - 1], b = v.trail[i]
          ctx.strokeStyle = C.signal + Math.round(255 * (1 - (simT - b[2]) / 1.6) * 0.5).toString(16).padStart(2, '0')
          ctx.lineWidth = 3
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
        }
      })
      // incidents
      tasks.forEach((tk) => {
        const age = simT - tk.t0
        if (tk.state === 'incoming') {
          const k = Math.min(1, age / 1.4)
          ctx.strokeStyle = C.signal; ctx.lineWidth = 1.5; ctx.globalAlpha = 1 - k
          ctx.beginPath(); ctx.arc(tk.x, tk.y, 40 * (1 - k) + 6, 0, 7); ctx.stroke(); ctx.globalAlpha = 1
          return
        }
        const fade = tk.state === 'resolved' ? Math.max(0, 1 - age / 1.2) : 1
        ctx.globalAlpha = fade
        const hot = tk.urg === 'high'
        if (tk.state === 'open' && !reduced) {
          const ph = ((t + tk.id * 0.37) % 2.2) / 2.2
          ctx.strokeStyle = (hot ? C.signal : C.ink) + Math.round((1 - ph) * 120).toString(16).padStart(2, '0')
          ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.arc(tk.x, tk.y, 12 + ph * 26, 0, 7); ctx.stroke()
        }
        // pin
        ctx.fillStyle = tk.state === 'resolved' ? C.mute : hot ? C.signal : C.ink
        ctx.beginPath(); ctx.moveTo(tk.x, tk.y + 2); ctx.arc(tk.x, tk.y - 12, 10, Math.PI * 0.8, Math.PI * 2.2); ctx.closePath(); ctx.fill()
        ctx.fillStyle = C.paper
        ctx.font = '700 10px "JetBrains Mono Variable", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(tk.state === 'resolved' ? '✓' : String(tk.id), tk.x, tk.y - 8.5)
        if (tk.state === 'verifying') {
          ctx.strokeStyle = C.signal; ctx.lineWidth = 2
          const a = t * 6
          ctx.beginPath(); ctx.arc(tk.x, tk.y - 12, 15, a, a + 4); ctx.stroke()
        }
        ctx.fillStyle = C.mute
        ctx.font = '9px "JetBrains Mono Variable", monospace'
        ctx.fillText(tk.kind, tk.x, tk.y + 14)
        ctx.textAlign = 'left'
        ctx.globalAlpha = 1
      })
      // volunteers
      vols.forEach((v) => {
        const busy = v.task && v.task.state !== 'resolved'
        ctx.fillStyle = C.paper
        ctx.strokeStyle = busy ? C.signal : C.ink + '66'
        ctx.lineWidth = 2.4
        ctx.beginPath(); ctx.arc(v.x, v.y, 11, 0, 7); ctx.fill(); ctx.stroke()
        ctx.fillStyle = C.ink
        ctx.font = '600 10px "JetBrains Mono Variable", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`V${v.id}`, v.x, v.y + 3.5)
        ctx.textAlign = 'left'
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); offTheme() }
  }, [])

  // pointer: drag volunteers, click incidents for detail, click empty map to file a report
  const dragV = useRef(null)
  const moved = useRef(false)
  const toMap = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * MW, ((e.clientY - r.top) / r.height) * MH, r]
  }
  const down = (e) => {
    const [x, y] = toMap(e)
    const h = api.current.hit?.(x, y)
    moved.current = false
    if (h?.kind === 'v') { dragV.current = h.v; e.currentTarget.setPointerCapture(e.pointerId) }
    else if (h?.kind === 't') setSel({ t: { ...h.t, vol: h.t.vol?.id }, left: (x / MW) * 100, top: Math.min(52, (y / MH) * 100 + 4) })
    else { api.current.report?.(x, y); setSel(null) }
  }
  const move = (e) => {
    if (!dragV.current) return
    moved.current = true
    const [x, y] = toMap(e)
    api.current.drag(dragV.current, x, y)
  }
  const up = () => {
    if (dragV.current) {
      const v = dragV.current
      if (moved.current) api.current.dropped()
      else setSel({ v: { id: v.id, task: v.task ? { id: v.task.id, kind: v.task.kind } : null, dist: v.task ? Math.round(d([v.x, v.y], [v.task.x, v.task.y])) : 0 }, left: (v.x / MW) * 100, top: Math.min(52, (v.y / MH) * 100 + 4) })
    }
    dragV.current = null
  }

  const STATUS = { extracting: 'extracting', open: 'on the map', waiting: 'waiting for a volunteer', assigned: 'assigned', verifying: 'on site, checking proof photo', resolved: 'resolved' }

  return (
    <Device
      name="Sanchaalan Saathi, operations"
      sub="live dispatch simulation"
      status={paused ? 'idle' : 'live'}
      statusLabel={paused ? 'paused' : 'live'}
      toolbar={
        <>
          <button onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="rounded-full border border-ink/20 px-3 py-1.5 font-mono text-[12px] transition-colors hover:border-ink">{paused ? 'resume' : 'pause'}</button>
          <button onClick={() => api.current.addVol?.()} className="rounded-full border border-ink/20 px-3 py-1.5 font-mono text-[12px] transition-colors hover:border-ink">add volunteer</button>
          <label className="flex items-center gap-2.5 font-mono text-[12px] text-ink-2">
            <Toggle on={showGreedy} onChange={setShowGreedy} label="Show nearest-first" /> nearest-first
          </label>
          <div className="ml-auto flex items-baseline gap-5">
            <Stat label="open">{stats.open}</Stat>
            <Stat label="resolved"><Tween value={stats.resolved} /></Stat>
            <Stat label="avg response"><Tween value={stats.avg} format={(v) => `${v.toFixed(1)} s`} /></Stat>
            <Stat label="nearest-first wastes" accent><Tween value={stats.waste} format={(v) => `${v.toFixed(1)}%`} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span>click the map to file a report</span>
          <span>drag a volunteer to move them</span>
          <span className="ml-auto">assignment re-solved on every change</span>
        </>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_270px]">
        <div
          ref={wrap}
          className="relative aspect-[760/420] w-full touch-none select-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          data-cursor="snap"
        >
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label="City map with incidents and volunteers moving to them" />
          <Panel
            open={!!sel}
            onClose={closeSel}
            left={sel?.left ?? 50}
            top={sel?.top ?? 20}
            title={sel?.t ? `incident ${sel.t.id}, ${sel.t.kind}` : sel?.v ? `volunteer V${sel.v.id}` : ''}
            rows={
              sel?.t
                ? [['urgency', sel.t.urg], ['people', String(sel.t.people)], ['area', sel.t.sector], ['assigned', sel.t.vol ? `V${sel.t.vol}` : 'waiting']]
                : sel?.v
                  ? [['heading to', sel.v.task ? `incident ${sel.v.task.id}, ${sel.v.task.kind}` : 'standing by'], ['distance left', sel.v.task ? String(sel.v.dist) : '0']]
                  : []
            }
          />
        </div>

        {/* field reports */}
        <div className="border-t border-rule md:border-l md:border-t-0">
          <p className="border-b border-rule px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">Field reports</p>
          <ul className="max-h-[420px] overflow-hidden">
            <AnimatePresence initial={false}>
              {feed.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: r.status === 'resolved' ? 0.55 : 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className="border-b border-rule px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] leading-tight">Incident {r.id}</span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${r.urg === 'high' ? 'text-signal' : 'text-mute'}`}>{r.urg}</span>
                  </div>
                  <dl className="mt-1.5 grid grid-cols-[52px_1fr] gap-y-0.5 font-mono text-[11px]">
                    {[['need', r.kind], ['people', r.people], ['where', r.sector]].map(([k, v], i) => (
                      <motion.div key={k} className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.35 }}>
                        <dt className="text-mute">{k}</dt>
                        <dd>{v}</dd>
                      </motion.div>
                    ))}
                  </dl>
                  <AnimatePresence mode="wait">
                    <motion.p key={r.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-1.5 font-mono text-[11px] ${r.status === 'resolved' ? 'text-ink' : r.status === 'verifying' || r.status === 'assigned' ? 'text-signal' : 'text-mute'}`}>
                      {r.status === 'resolved' ? '✓ ' : ''}{STATUS[r.status]}{r.vol && r.status === 'assigned' ? `, V${r.vol} en route` : ''}
                    </motion.p>
                  </AnimatePresence>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </Device>
  )
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
