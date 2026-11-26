import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device, Panel, Stat, Toggle, Tween } from '../kit'
import { cssVar, onThemeChange } from '../../theme'
import { CitySim, KINDS, URG, URG_W, WORK, greedy, solve } from './opsSim'
import { CITIES, INDIA_BOX, MH, MW, M_PER_UNIT, POIS, WORLD, areaName, cityAt, planFor, drawCities, screenText, drawGeo, drawMap, landColor, mulberry, randomRoadPoint, route, shortest, snap } from './opsMap'

/*
 * Sanchaalan Saathi figure: the Sanchaalan Saathi operations room, as a live simulation on a street map.
 * Field reports arrive, extraction fills in the structured task, the incident drops onto the map,
 * and volunteers drive to it along the roads on the Hungarian assignment (re-solved on every change).
 * Costs are road distances. A debris report closes its road until it is cleared, so routes detour.
 * Nearest-first is computed on the same snapshot so the waste figure compares like for like.
 */
const SPEED = 62 // map units per second
const K_MIN = 0.0001, K_MAX = 4 // the whole world down to a single street corner
const LEVELS = [[1.5, 'street'], [0.5, 'neighbourhood'], [0.06, 'city'], [0.0022, 'state'], [0.00045, 'country'], [0, 'world']]
const CLUSTER_K = 0.12 // below this the operation shows as one marker
const levelOf = (k) => LEVELS.find(([m]) => k >= m)[1]
const NICE = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000] // metres
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const BIG = 1e7 // cost of an unreachable pair
const FOCUS_K = 0.06 // from here in, the feed follows the city in the middle of the view
const inPatiala = (x, y, pad = 0) => x > -pad && x < MW + pad && y > -pad && y < MH + pad

const hex = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')
const km = (u) => `${((u * M_PER_UNIT) / 1000).toFixed(2)} km`

export default function OpsRoom() {
  const [feed, setFeed] = useState([])
  const [stats, setStats] = useState({ open: 0, resolved: 0, avg: 0, waste: 0, closed: 0, flagged: 0, active: 0 })
  const [focus, setFocus] = useState('Patiala')
  const [showGreedy, setShowGreedy] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sel, setSel] = useState(null)
  const [zoom, setZoom] = useState(1)
  const closeSel = useCallback(() => setSel(null), [])
  const wrap = useRef(null)
  const canvas = useRef(null)
  const api = useRef({})
  const view = useRef({ k: 1, tx: 0, ty: 0 })
  const flags = useRef({ showGreedy, paused })
  flags.current = { showGreedy, paused }

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv.getContext('2d')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const rnd = mulberry(7)
    let W = 0, H = 0, dpr = 1, raf = 0, prev = performance.now(), simT = 0, nextTask = 1, spawnIn = 2.5, visible = true
    let C = {}, dark = false
    const colors = () => {
      C = { ink: cssVar('--ink', wrap.current), signal: cssVar('--signal', wrap.current), paper: cssVar('--paper', wrap.current), mute: cssVar('--mute', wrap.current) }
      dark = document.documentElement.classList.contains('dark')
    }
    colors()

    const hub = POIS.find((p) => p.kind === 'hub')
    const start = [[96, 196], [150, 150], [262, 120], [372, 230], [478, 384]]
    const vols = start.map(([x, y], i) => { const s = snap(x, y); return { id: i + 1, x: s.x, y: s.y, pos: s, task: null, path: [], trail: [] } })
    const tasks = []
    const closed = new Set()
    let sp = shortest(closed)
    let resolved = 0, respSum = 0, optSum = 0, greedySum = 0, greedyRoutes = [], flagged = 0

    // every city runs its own operation; reports from all of them land in one store, newest first
    const sims = CITIES.map((c) => { const L = planFor(c); return new CitySim(c, L, mulberry(L.seed ^ 0x5bd1e995)) })
    const byCity = new Map(), recent = [], recs = new Map()
    let dirty = true, focusName = 'Patiala', lastFlush = 0
    const record = (city, id, base) => {
      const key = `${city}#${id}`
      const r = { key, city, id, status: 'extracting', vol: null, ...base }
      recs.set(key, r)
      recent.unshift(r); if (recent.length > 6) recent.length = 6
      const list = byCity.get(city) || []
      list.unshift(r); if (list.length > 6) recs.delete(list.pop().key)
      byCity.set(city, list)
      dirty = true
    }
    const patch = (city, id, p) => { const r = recs.get(`${city}#${id}`); if (r) { Object.assign(r, p); dirty = true } }
    const emit = (sim, t, p) => {
      if (!recs.has(`${sim.c.n}#${t.id}`)) record(sim.c.n, t.id, { kind: t.kind, urg: t.urg, people: t.people, where: p.where })
      patch(sim.c.n, t.id, p)
    }
    const pushFeed = (t) => record('Patiala', t.id, { kind: t.kind, urg: t.urg, people: t.people, where: t.where })
    const patchFeed = (id, p) => patch('Patiala', id, p)
    const live = (t) => t.state !== 'resolved' && t.state !== 'rejected'
    const sync = () => { dirty = true }
    // the city under the middle of the view, or null for worldwide
    const focusAt = () => {
      const v = view.current
      if (v.k < FOCUS_K) return null
      const cx = (MW / 2 - v.tx) / v.k, cy = (MH / 2 - v.ty) / v.k
      if (inPatiala(cx, cy, 300)) return 'Patiala'
      let best = null, bd = Infinity
      sims.forEach((s) => { const d = Math.hypot(s.c.x - cx, s.c.y - cy); if (d < s.c.R * 1.6 && d < bd) { bd = d; best = s.c.n } })
      return best
    }
    const simOf = (name) => sims.find((s) => s.c.n === name)
    const simAt = (x, y) => sims.find((s) => Math.hypot(s.c.x - x, s.c.y - y) < s.c.R * 1.15)
    const flush = (now) => {
      const f = focusAt()
      if (f !== focusName) { focusName = f; dirty = true; setFocus(f) }
      if (!dirty || now - lastFlush < (f ? 250 : 700)) return
      dirty = false; lastFlush = now
      setFeed((f ? byCity.get(f) || [] : recent).map((r) => ({ ...r })))
      let open = tasks.filter(live).length, res = resolved, rs = respSum, fl = flagged, os = optSum, gs = greedySum, active = open ? 1 : 0
      sims.forEach((s) => { const n = s.open(); open += n; if (n) active++; res += s.stats.resolved; rs += s.stats.respSum; fl += s.stats.flagged; os += s.stats.opt; gs += s.stats.greedy })
      setStats({ open, resolved: res, avg: res ? rs / res : 0, waste: os ? ((gs - os) / os) * 100 : 0, closed: closed.size, flagged: fl, active })
    }
    // start with the world already busy
    for (let i = 0; i < 70; i++) sims.forEach((s) => s.step(0.2, emit))

    const setClosures = () => {
      closed.clear()
      tasks.forEach((t) => { if (t.kind === 'debris clearing' && !t.fake && t.state !== 'incoming' && live(t)) closed.add(t.pos.e.id) })
      sp = shortest(closed)
    }

    const addTask = (pos, silent, kind) => {
      const t = {
        id: nextTask++, pos, x: pos.x, y: pos.y, kind: kind || KINDS[Math.floor(rnd() * KINDS.length)], urg: URG[Math.floor(rnd() * 3)],
        people: 10 + Math.floor(rnd() * 60), where: areaName(pos.x, pos.y), state: silent ? 'open' : 'incoming', born: simT, t0: simT, vol: null,
        fake: null, work: 0, escalated: false,
      }
      t.work = WORK[t.kind] * (0.75 + rnd() * 0.6)
      // about one field report in six is not real: a repeat of a nearby report, a photo that does not match, or nothing there at all
      if (!silent && rnd() < 0.17) {
        const near = tasks.find((o) => live(o) && o.state !== 'incoming' && Math.hypot(o.x - t.x, o.y - t.y) < 160)
        t.fake = near ? { why: 'duplicate', of: near.id } : rnd() < 0.5 ? { why: 'mismatch' } : { why: 'nothing' }
      }
      tasks.push(t)
      pushFeed(t)
      if (silent) { patchFeed(t.id, { status: 'open' }); setClosures(); reassign() }
      return t
    }

    // Re-solve: every volunteer not already on site, against every open task, on road distance.
    const reassign = () => {
      const open = tasks.filter((t) => t.state === 'open')
      const weight = (t) => URG_W[t.urg] * Math.max(0.4, 1 - 0.05 * (simT - t.t0)) // waiting makes a job look closer
      const V = vols.filter((v) => !v.task || v.task.state === 'open')
      V.forEach((v) => { if (v.task) { v.task.vol = null; v.task = null; v.path = [] } })
      const R = V.map((v) => open.map((t) => route(v.pos, t.pos, sp)))
      const cost = R.map((row) => row.map((r, ti) => (r ? r.dist * weight(open[ti]) : BIG)))
      const pairs = solve(cost).filter(([vi, ti]) => cost[vi][ti] < BIG)
      pairs.forEach(([vi, ti]) => { const v = V[vi], t = open[ti]; v.task = t; t.vol = v; v.path = R[vi][ti].pts.slice(1) })
      const gp = greedy(cost).filter(([vi, ti]) => cost[vi][ti] < BIG)
      greedyRoutes = gp.map(([vi, ti]) => ({ pts: R[vi][ti].pts, t: open[ti] }))
      if (pairs.length) {
        optSum += pairs.reduce((s, [vi, ti]) => s + cost[vi][ti], 0)
        greedySum += gp.reduce((s, [vi, ti]) => s + cost[vi][ti], 0)
      }
      open.forEach((t) => patchFeed(t.id, { status: t.vol ? 'assigned' : 'waiting', vol: t.vol ? t.vol.id : null }))
      sync()
    }

    // seed the board, including one blocked road
    ;[[96, 70], [372, 80], [596, 160], [520, 304], [206, 384]].forEach(([x, y], i) => addTask(snap(x, y), true, i === 3 ? 'debris clearing' : undefined))

    // ── view: world = ops-map units (5 m); screen (in map units) = world × k + t ──
    let anim = null
    const clampView = () => {
      // keep the centre of the view over India
      const v = view.current
      const cx = Math.max(WORLD.x0, Math.min(WORLD.x1, (MW / 2 - v.tx) / v.k))
      const cy = Math.max(WORLD.y0, Math.min(WORLD.y1, (MH / 2 - v.ty) / v.k))
      v.tx = MW / 2 - cx * v.k
      v.ty = MH / 2 - cy * v.k
    }
    const zoomAt = (k, mx = MW / 2, my = MH / 2) => {
      const v = view.current
      const nk = Math.max(K_MIN, Math.min(K_MAX, k))
      v.tx = mx - ((mx - v.tx) / v.k) * nk
      v.ty = my - ((my - v.ty) / v.k) * nk
      v.k = nk
      anim = null
      clampView()
      setZoom(nk)
    }
    // smooth flight: log-interpolate the zoom, linearly the centre
    const flyTo = (k, wx, wy, ms = 700) => {
      const v = view.current
      anim = { k0: v.k, k1: Math.max(K_MIN, Math.min(K_MAX, k)), c0: [(MW / 2 - v.tx) / v.k, (MH / 2 - v.ty) / v.k], c1: [wx, wy], t0: performance.now(), ms: reduced ? 1 : ms }
    }
    const stepAnim = (now) => {
      if (!anim) return
      const p = Math.min(1, (now - anim.t0) / anim.ms), e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2
      const v = view.current
      v.k = Math.exp(Math.log(anim.k0) + (Math.log(anim.k1) - Math.log(anim.k0)) * e)
      const cx = anim.c0[0] + (anim.c1[0] - anim.c0[0]) * e, cy = anim.c0[1] + (anim.c1[1] - anim.c0[1]) * e
      v.tx = MW / 2 - cx * v.k
      v.ty = MH / 2 - cy * v.k
      setZoom(v.k)
      if (p >= 1) anim = null
    }

    api.current = {
      report: (x, y) => {
        if (inPatiala(x, y)) { addTask(snap(x, y), true); return }
        const s = simAt(x, y)
        if (!s) return
        const l = s.toLocal(x, y), p = s.snap(l.x, l.y)
        if (p) s.add(emit, p, true)
      },
      addVol: () => {
        const f = focusAt()
        if (f && f !== 'Patiala') { simOf(f)?.addVol(); return }
        if (vols.length >= 8) return
        const s = snap(hub.x, hub.y + 30)
        vols.push({ id: vols.length + 1, x: s.x, y: s.y, pos: s, task: null, path: [], trail: [] })
        reassign()
      },
      hit: (x, y) => {
        const kk = view.current.k
        if (kk < CLUSTER_K) {
          // whichever marker is nearest wins: the operation on Patiala, or another city to fly to
          const dOps = Math.hypot(x - MW / 2, y - MH / 2), hitOps = dOps < (kk < 0.006 ? 14 : 22) / kk
          const near = cityAt(x, y, kk)
          if (near && (!hitOps || near.d < dOps)) return { kind: 'city', c: near.c }
          return hitOps ? { kind: 'cluster' } : null
        }
        if (!inPatiala(x, y, 60)) {
          // a pin or a volunteer in another city's operation
          const s = simAt(x, y)
          if (!s) return null
          const l = s.toLocal(x, y), r = 14 / Math.sqrt(kk)
          const v = s.vols.find((q) => Math.hypot(q.x - l.x, q.y - l.y) < r)
          if (v) return { kind: 'sv', s, v }
          const t = s.tasks.find((q) => s.live(q) && q.state !== 'incoming' && Math.hypot(q.x - l.x, q.y - 12 / kk - l.y) < r + 4)
          return t ? { kind: 'st', s, t } : null
        }
        const r = 14 / Math.sqrt(view.current.k)
        const v = vols.find((q) => Math.hypot(q.x - x, q.y - y) < r)
        if (v) return { kind: 'v', v }
        const t = tasks.find((q) => q.state !== 'resolved' && q.state !== 'rejected' && q.state !== 'incoming' && Math.hypot(q.x - x, q.y - 12 / view.current.k - y) < r + 4)
        return t ? { kind: 't', t } : null
      },
      drag: (v, x, y) => { v.x = x; v.y = y; v.trail = [] },
      dropped: (v) => { const s = snap(v.x, v.y); v.x = s.x; v.y = s.y; v.pos = s; reassign() },
      pan: (dx, dy) => { view.current.tx += dx; view.current.ty += dy; clampView() },
      zoomAt,
      flyTo,
      home: () => flyTo(1, MW / 2, MH / 2),
      detailed: () => view.current.k >= 0.25,
      focus: () => focusAt(),
      linked: (t) => tasks.filter((o) => o !== t && o.state !== 'resolved' && t.kind === 'debris clearing' && o.vol && o.vol.path.length && Math.hypot(o.x - t.x, o.y - t.y) < 260).map((o) => o.id),
    }

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2)
      const r = wrap.current.getBoundingClientRect()
      W = r.width
      H = r.height
      cv.width = W * dpr
      cv.height = H * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap.current)
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(wrap.current)
    const offTheme = onThemeChange(colors)

    const step = (dt) => {
      simT += dt
      tasks.forEach((tk) => {
        if (tk.state !== 'incoming' || simT - tk.t0 <= 1.4) return
        // intake: the photo is read; duplicates and mismatched photos are stopped here
        if (tk.fake && tk.fake.why !== 'nothing') {
          tk.state = 'rejected'; tk.t0 = simT; flagged++
          patchFeed(tk.id, { status: 'flagged', why: tk.fake.why === 'duplicate' ? `duplicate of incident ${tk.fake.of}` : 'photo does not match the report' })
          sync()
          return
        }
        tk.state = 'open'; tk.t0 = simT; patchFeed(tk.id, { status: 'open' }); setClosures(); reassign()
      })
      // escalate urgent jobs that have waited too long
      tasks.forEach((tk) => {
        if (tk.state === 'open' && !tk.vol && tk.urg === 'high' && !tk.escalated && simT - tk.t0 > 5) { tk.escalated = true; patchFeed(tk.id, { escalated: true }); reassign() }
      })
      spawnIn -= dt
      if (spawnIn <= 0) {
        // reports often arrive together
        const n = rnd() < 0.35 ? 2 + (rnd() < 0.4 ? 1 : 0) : 1
        for (let i = 0; i < n && tasks.filter(live).length < 9; i++) addTask(randomRoadPoint(rnd), false)
        spawnIn = 2.4 + rnd() * 3
      }
      // drive along the route
      vols.forEach((v) => {
        const tk = v.task
        if (tk && tk.state === 'open' && v.path.length) {
          let left = SPEED * dt
          while (left > 0 && v.path.length) {
            const [nx, ny] = v.path[0]
            const L = Math.hypot(nx - v.x, ny - v.y)
            if (L <= left) { v.x = nx; v.y = ny; v.path.shift(); left -= L } else { v.x += ((nx - v.x) / L) * left; v.y += ((ny - v.y) / L) * left; left = 0 }
          }
          v.pos = snap(v.x, v.y)
          v.trail.push([v.x, v.y, simT])
          if (!v.path.length) { tk.state = 'working'; tk.t0 = simT; patchFeed(tk.id, { status: tk.fake ? 'searching' : 'working' }) }
        }
        v.trail = v.trail.filter((p) => simT - p[2] < 1.6)
      })
      // check the proof photo, then close the task
      tasks.forEach((tk) => {
        if (tk.state === 'working' && simT - tk.t0 > (tk.fake ? 1 : tk.work)) { tk.state = 'verifying'; tk.t0 = simT; patchFeed(tk.id, { status: 'verifying' }) }
        if (tk.state === 'verifying' && simT - tk.t0 > 1.2) {
          tk.state = 'resolved'; tk.t0 = simT
          if (tk.fake) { flagged++; tk.falseAlarm = true; patchFeed(tk.id, { status: 'falsealarm' }) }
          else { resolved++; respSum += simT - tk.born; patchFeed(tk.id, { status: 'resolved' }) }
          if (tk.vol) { tk.vol.task = null; tk.vol = null }
          setClosures()
          reassign()
        }
      })
      for (let i = tasks.length - 1; i >= 0; i--) if ((tasks[i].state === 'resolved' || tasks[i].state === 'rejected') && simT - tasks[i].t0 > 1.4) tasks.splice(i, 1)
      sims.forEach((s) => s.step(dt, emit))
    }

    const polyline = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke() }

    const draw = (t) => {
      stepAnim(performance.now())
      const v = view.current, k = v.k
      const sx = W / MW, sy = H / MH
      const aCity = clamp01((k - 0.018) / 0.04) // streets, river and arterials fade in at city zoom
      const aGeo = 1 - clamp01((k - 0.05) / 0.08) // state and country layer fades out
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = landColor(dark)
      ctx.fillRect(0, 0, W, H)
      ctx.setTransform(dpr * sx * k, 0, 0, dpr * sy * k, dpr * sx * v.tx, dpr * sy * v.ty)
      if (aGeo > 0) drawGeo(ctx, dark, k, C.signal, { x0: -v.tx / k, y0: -v.ty / k, x1: (MW - v.tx) / k, y1: (MH - v.ty) / k, sx })
      if (aCity > 0) {
        ctx.globalAlpha = aCity
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = landColor(dark)
        ctx.fillRect(0, 0, W, H)
        ctx.setTransform(dpr * sx * k, 0, 0, dpr * sy * k, dpr * sx * v.tx, dpr * sy * v.ty)
        drawMap(ctx, dark, closed, k, reduced ? 0 : t)
        drawCities(ctx, dark, k, reduced ? 0 : t, { x0: -v.tx / k, y0: -v.ty / k, x1: (MW - v.tx) / k, y1: (MH - v.ty) / k })
        ctx.globalAlpha = 1
      }
      const vw = { x0: -v.tx / k, y0: -v.ty / k, x1: (MW - v.tx) / k, y1: (MH - v.ty) / k }
      const seen = (s, pad) => s.c.x + pad > vw.x0 && s.c.x - pad < vw.x1 && s.c.y + pad > vw.y0 && s.c.y - pad < vw.y1
      if (k < CLUSTER_K) {
        // far out: every other city's operation shows as a live marker, a ring going out for each new report
        const count = k >= 0.006
        sims.forEach((s) => {
          if (!seen(s, 40 / k)) return
          const n = s.open()
          if (!reduced) s.tasks.forEach((tk) => {
            if (tk.state !== 'incoming') return
            const q = Math.min(1, (s.t - tk.t0) / 1.4)
            ctx.strokeStyle = C.signal + hex(0.75 * (1 - q)); ctx.lineWidth = 1.2 / k
            ctx.beginPath(); ctx.arc(s.c.x, s.c.y, (3 + q * (count ? 16 : 11)) / k, 0, 7); ctx.stroke()
          })
          if (!n) return
          const r = (count ? 7.5 : 2.4) / k
          ctx.fillStyle = C.signal
          ctx.beginPath(); ctx.arc(s.c.x, s.c.y, r, 0, 7); ctx.fill()
          if (count) screenText(ctx, String(n), s.c.x, s.c.y, 9, { weight: 700, color: '#fff', dy: 3.2 })
        })
      }
      if (k < CLUSTER_K) {
        // far out: the whole operation collapses into one marker on Patiala
        const open = tasks.filter((q) => q.state !== 'resolved').length
        const r = (k < 0.00045 ? 5 : k < 0.006 ? 8 : 13) / k
        ctx.fillStyle = C.signal
        ctx.beginPath(); ctx.arc(MW / 2, MH / 2, r, 0, 7); ctx.fill()
        if (!reduced) {
          const ph = (t % 1.6) / 1.6
          ctx.strokeStyle = C.signal + hex(0.6 * (1 - ph)); ctx.lineWidth = 2 / k
          ctx.beginPath(); ctx.arc(MW / 2, MH / 2, r * (1 + ph * 1.4), 0, 7); ctx.stroke()
        }
        if (k >= 0.006) {
          screenText(ctx, String(open), MW / 2, MH / 2, 11, { weight: 700, color: '#fff', dy: 4 })
          screenText(ctx, `${open} open, ${vols.length} volunteers, tap to fly in`, MW / 2, MH / 2, 9.5, { weight: 600, color: C.ink, dy: 13 * (r * k) / 13 + 13 })
        }
      }
      if (k < CLUSTER_K) { drawOverlay(k, sx); return }

      // nearest-first routes, ghosted
      if (flags.current.showGreedy) {
        ctx.setLineDash([3 / k, 5 / k]); ctx.strokeStyle = C.ink + '80'; ctx.lineWidth = 1.6 / k
        greedyRoutes.forEach((g) => g.t.state === 'open' && polyline(g.pts))
        ctx.setLineDash([])
      }
      // assigned routes: road-following, marching dashes
      vols.forEach((vo) => {
        if (!vo.task || vo.task.state !== 'open' || !vo.path.length) return
        ctx.strokeStyle = C.signal + 'b0'; ctx.lineWidth = 3 / k
        ctx.setLineDash([7 / k, 5 / k]); ctx.lineDashOffset = -t * 26 / k
        polyline([[vo.x, vo.y], ...vo.path])
        ctx.setLineDash([]); ctx.lineDashOffset = 0
      })
      // trails
      vols.forEach((vo) => {
        for (let i = 1; i < vo.trail.length; i++) {
          const a = vo.trail[i - 1], b = vo.trail[i]
          ctx.strokeStyle = C.signal + hex((1 - (simT - b[2]) / 1.6) * 0.5)
          ctx.lineWidth = 4 / k
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
        }
      })
      // incidents
      const u = 1 / Math.sqrt(k)
      tasks.forEach((tk) => {
        const age = simT - tk.t0
        if (tk.state === 'incoming') {
          const q = Math.min(1, age / 1.4)
          ctx.strokeStyle = C.signal; ctx.lineWidth = 1.5 / k; ctx.globalAlpha = 1 - q
          ctx.beginPath(); ctx.arc(tk.x, tk.y, (40 * (1 - q) + 6) * u, 0, 7); ctx.stroke(); ctx.globalAlpha = 1
          return
        }
        if (tk.state === 'rejected') {
          // stopped at intake: a struck-through ring that fades, never a pin
          ctx.globalAlpha = Math.max(0, 1 - age / 1.4)
          ctx.strokeStyle = C.mute; ctx.lineWidth = 1.6 / k
          const r = 10 * u
          ctx.beginPath(); ctx.arc(tk.x, tk.y, r, 0, 7); ctx.moveTo(tk.x - r * 0.7, tk.y + r * 0.7); ctx.lineTo(tk.x + r * 0.7, tk.y - r * 0.7); ctx.stroke()
          ctx.globalAlpha = 1
          return
        }
        ctx.globalAlpha = tk.state === 'resolved' ? Math.max(0, 1 - age / 1.4) : 1
        const hot = tk.urg === 'high'
        if (tk.state === 'open' && !reduced) {
          const period = tk.escalated ? 0.9 : 2.2
          const ph = ((t + tk.id * 0.37) % period) / period
          ctx.strokeStyle = (tk.escalated ? '#e5484d' : hot ? C.signal : C.ink) + hex((1 - ph) * 0.6)
          ctx.lineWidth = (tk.escalated ? 2.2 : 1.5) / k
          ctx.beginPath(); ctx.arc(tk.x, tk.y, (10 + ph * 24) * u, 0, 7); ctx.stroke()
        }
        const pinR = 9.5 * u
        ctx.fillStyle = tk.falseAlarm ? C.mute : tk.state === 'resolved' ? C.mute : tk.escalated ? '#e5484d' : hot ? C.signal : C.ink
        ctx.beginPath(); ctx.moveTo(tk.x, tk.y); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR, Math.PI * 0.78, Math.PI * 2.22); ctx.closePath(); ctx.fill()
        ctx.fillStyle = C.paper
        ctx.font = `700 ${10 * u}px "JetBrains Mono Variable", monospace`
        ctx.textAlign = 'center'
        ctx.fillText(tk.falseAlarm ? '×' : tk.state === 'resolved' ? '✓' : tk.kind === 'debris clearing' ? '!' : String(tk.id), tk.x, tk.y - pinR * 0.85)
        if (tk.state === 'working') {
          // on site: a ring fills as the job gets done
          const done = Math.min(1, age / (tk.fake ? 1 : tk.work))
          ctx.strokeStyle = C.ink + '30'; ctx.lineWidth = 2.2 / k
          ctx.beginPath(); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR * 1.5, 0, 7); ctx.stroke()
          ctx.strokeStyle = C.signal
          ctx.beginPath(); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR * 1.5, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2); ctx.stroke()
        }
        if (tk.state === 'verifying') {
          ctx.strokeStyle = C.signal; ctx.lineWidth = 2 / k
          const a = t * 6
          ctx.beginPath(); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR * 1.5, a, a + 4); ctx.stroke()
        }
        ctx.globalAlpha = 1
      })
      // volunteers: little vehicles with an id
      vols.forEach((vo) => {
        const busy = vo.task && vo.task.state !== 'resolved'
        const r = 10 * u
        ctx.fillStyle = C.paper
        ctx.strokeStyle = busy ? C.signal : C.ink + '88'
        ctx.lineWidth = 2.4 * u
        ctx.beginPath(); ctx.arc(vo.x, vo.y, r, 0, 7); ctx.fill(); ctx.stroke()
        ctx.fillStyle = C.ink
        ctx.font = `600 ${9.5 * u}px "JetBrains Mono Variable", monospace`
        ctx.textAlign = 'center'
        ctx.fillText(`V${vo.id}`, vo.x, vo.y + 3.3 * u)
      })
      ctx.textAlign = 'left'
      // every other city on screen, in its own rotated street grid
      sims.forEach((s) => {
        if (!seen(s, s.c.R * 1.2)) return
        ctx.save(); ctx.translate(s.c.x, s.c.y); ctx.rotate(s.L.rot)
        s.draw(ctx, k, reduced ? 0 : t, C, hex, flags.current.showGreedy)
        ctx.restore()
      })
      ctx.textAlign = 'left'

      drawOverlay(k, sx)
    }

    // screen space: a scale bar that picks a round distance, the compass, and the zoom level
    const drawOverlay = (k, sx) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const mPerPx = M_PER_UNIT / (k * sx)
      const D = NICE.find((d) => d / mPerPx >= 56) || NICE[NICE.length - 1]
      const len = D / mPerPx
      const label = D >= 1000 ? `${D / 1000} km` : `${D} m`
      ctx.fillStyle = dark ? 'rgba(20,20,22,0.8)' : 'rgba(255,255,255,0.86)'
      ctx.beginPath(); ctx.roundRect(10, H - 26, len + 60, 18, 4); ctx.fill()
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(16, H - 13); ctx.lineTo(16, H - 17); ctx.moveTo(16, H - 15); ctx.lineTo(16 + len, H - 15); ctx.moveTo(16 + len, H - 13); ctx.lineTo(16 + len, H - 17); ctx.stroke()
      ctx.fillStyle = C.ink
      ctx.font = '500 9.5px "JetBrains Mono Variable", monospace'
      ctx.fillText(label, 22 + len, H - 13)
      const lvl = levelOf(k)
      ctx.font = '600 9px "JetBrains Mono Variable", monospace'
      const lw = ctx.measureText(lvl.toUpperCase()).width + 14
      ctx.fillStyle = dark ? 'rgba(20,20,22,0.8)' : 'rgba(255,255,255,0.86)'
      ctx.beginPath(); ctx.roundRect(10, 10, lw, 18, 9); ctx.fill()
      ctx.fillStyle = C.signal
      ctx.fillText(lvl.toUpperCase(), 17, 22.5)
      const cx = W - 24, cy = H - 26
      ctx.fillStyle = dark ? 'rgba(20,20,22,0.8)' : 'rgba(255,255,255,0.86)'
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill()
      ctx.fillStyle = C.signal
      ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 4, cy + 1); ctx.lineTo(cx - 4, cy + 1); ctx.fill()
      ctx.fillStyle = C.ink + '70'
      ctx.beginPath(); ctx.moveTo(cx, cy + 9); ctx.lineTo(cx + 4, cy + 1); ctx.lineTo(cx - 4, cy + 1); ctx.fill()
      ctx.fillStyle = C.ink
      ctx.font = '700 8px "JetBrains Mono Variable", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('N', cx, cy - 15)
      ctx.textAlign = 'left'
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!visible) return
      if (!flags.current.paused && !reduced) step(dt)
      draw(now / 1000)
      flush(now)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); offTheme() }
  }, [])

  // pointer: one finger or the mouse pans (or drags a volunteer); two fingers pinch to zoom; a tap selects or files a report
  const gesture = useRef(null)
  const pointers = useRef(new Map())
  const tapTimer = useRef(null)
  const [hint, setHint] = useState(false)
  const toMap = (e) => {
    const r = canvas.current.getBoundingClientRect()
    const v = view.current
    const mx = ((e.clientX - r.left) / r.width) * MW, my = ((e.clientY - r.top) / r.height) * MH
    return { x: (mx - v.tx) / v.k, y: (my - v.ty) / v.k, mx, my }
  }
  const panelAt = (x, y) => {
    const v = view.current
    return { left: ((x * v.k + v.tx) / MW) * 100, top: Math.min(52, ((y * v.k + v.ty) / MH) * 100 + 4) }
  }
  const pinchState = () => {
    const [a, b] = [...pointers.current.values()]
    return { d: Math.hypot(a.mx - b.mx, a.my - b.my), mx: (a.mx + b.mx) / 2, my: (a.my + b.my) / 2 }
  }
  const down = (e) => {
    if (e.target !== canvas.current) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* capture is a nicety; gestures work without it */ }
    const p = toMap(e)
    pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 2) {
      // second finger: switch to pinch, drop any drag in progress
      if (gesture.current?.h?.kind === 'v') api.current.dropped(gesture.current.h.v)
      gesture.current = { pinch: pinchState(), k0: view.current.k, moved: true }
      return
    }
    if (pointers.current.size > 2) return
    const h = api.current.hit?.(p.x, p.y)
    gesture.current = { h, start: p, last: p, moved: false }
  }
  const move = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = toMap(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g) return
    if (g.pinch && pointers.current.size === 2) {
      const now = pinchState()
      api.current.pan(now.mx - g.pinch.mx, now.my - g.pinch.my)
      api.current.zoomAt(g.k0 * (now.d / Math.max(10, g.pinch.d)), now.mx, now.my)
      g.pinch = { ...now, d: g.pinch.d }
      return
    }
    if (Math.hypot(p.mx - g.start.mx, p.my - g.start.my) > 4) g.moved = true
    if (!g.moved) return
    if (g.h?.kind === 'v') api.current.drag(g.h.v, p.x, p.y)
    else api.current.pan(p.mx - g.last.mx, p.my - g.last.my)
    g.last = p
  }
  const up = (e) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.pinch) { if (pointers.current.size === 0) gesture.current = null; return }
    gesture.current = null
    if (!g) return
    if (g.h?.kind === 'v') {
      const v = g.h.v
      if (g.moved) api.current.dropped(v)
      else setSel({ v: { id: v.id, task: v.task ? { id: v.task.id, kind: v.task.kind } : null, left: v.path.reduce((s, q, i, arr) => s + Math.hypot(q[0] - (i ? arr[i - 1][0] : v.x), q[1] - (i ? arr[i - 1][1] : v.y)), 0) }, ...panelAt(v.x, v.y) })
      return
    }
    if (g.moved) return
    if (g.h?.kind === 'st' || g.h?.kind === 'sv') {
      const { s } = g.h
      if (g.h.kind === 'st') {
        const t = g.h.t, w = s.toWorld(t.x, t.y)
        setSel({ t: { id: t.id, kind: t.kind, urg: t.urg, people: t.people, where: s.area(t.x, t.y), vol: t.vol?.id, city: s.c.n }, ...panelAt(w.x, w.y) })
      } else {
        const v = g.h.v, w = s.toWorld(v.x, v.y)
        setSel({ v: { id: v.id, city: s.c.n, task: v.task ? { id: v.task.id, kind: v.task.kind } : null, left: v.task && v.task.state === 'open' ? s.len(v, v.path) : 0 }, ...panelAt(w.x, w.y) })
      }
      return
    }
    if (g.h?.kind === 't') { setSel({ t: { ...g.h.t, vol: g.h.t.vol?.id, linked: api.current.linked(g.h.t) }, ...panelAt(g.h.t.x, g.h.t.y) }); return }
    if (g.h?.kind === 'cluster') { api.current.home(); return }
    if (g.h?.kind === 'city') { api.current.flyTo(0.7, g.h.c.x, g.h.c.y, 900); return }
    // double tap or double click zooms in; a single tap on the street map files a report
    if (tapTimer.current) {
      clearTimeout(tapTimer.current); tapTimer.current = null
      api.current.flyTo(view.current.k * 2.2, g.start.x, g.start.y, 350)
      return
    }
    const at = g.start
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null
      if (api.current.detailed()) api.current.report?.(at.x, at.y)
      setSel(null)
    }, 260)
  }
  const cancel = (e) => { pointers.current.delete(e.pointerId); if (!pointers.current.size) gesture.current = null }

  // wheel: Ctrl/⌘ + scroll (and trackpad pinch) zooms; plain scrolling keeps scrolling the page
  useEffect(() => {
    const el = wrap.current
    let t
    const wheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) { setHint(true); clearTimeout(t); t = setTimeout(() => setHint(false), 1400); return }
      e.preventDefault()
      const r = canvas.current.getBoundingClientRect()
      const mx = ((e.clientX - r.left) / r.width) * MW, my = ((e.clientY - r.top) / r.height) * MH
      api.current.zoomAt(view.current.k * Math.exp(-e.deltaY * 0.0045), mx, my)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => { el.removeEventListener('wheel', wheel); clearTimeout(t) }
  }, [])

  const STATUS = { extracting: 'reading the photo', open: 'on the map', waiting: 'waiting for a volunteer', assigned: 'assigned', working: 'on site, working', searching: 'on site, looking for it', verifying: 'checking the proof photo', resolved: 'resolved', flagged: 'flagged', falsealarm: 'false alarm: nothing found on site' }
  const ctl = 'grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-md border border-ink/15 bg-paper/90 font-mono text-[15px] leading-none text-ink shadow-sm backdrop-blur transition-colors hover:border-ink/40 disabled:opacity-40'

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
            <Toggle on={showGreedy} onChange={setShowGreedy} label="Show nearest-first routes" /> nearest-first
          </label>
          <div className="ml-auto flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <Stat label="cities active"><Tween value={stats.active} /></Stat>
            <Stat label="open">{stats.open}</Stat>
            <Stat label="roads closed" accent={stats.closed > 0}>{stats.closed}</Stat>
            <Stat label="fake alerts caught"><Tween value={stats.flagged} /></Stat>
            <Stat label="resolved"><Tween value={stats.resolved} /></Stat>
            <Stat label="avg response"><Tween value={stats.avg} format={(v) => `${v.toFixed(1)} s`} /></Stat>
            <Stat label="nearest-first costs" accent><Tween value={stats.waste} format={(v) => `+${v.toFixed(1)}%`} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span>tap a street to file a report</span>
          <span>drag to pan; pinch, double-tap or Ctrl + scroll to zoom; tap a city to fly there</span>
          <span className="ml-auto">routes re-solved on every change</span>
        </>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_270px]">
        <div
          ref={wrap}
          className="relative aspect-[760/420] w-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          data-cursor
        >
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label="Street map with incidents, closed roads and volunteers driving to them" />
          <div className="absolute right-2 top-2 flex gap-1.5 sm:right-2.5 sm:top-2.5 sm:flex-col">
            <button className={ctl} aria-label="Zoom in" disabled={zoom >= K_MAX} onClick={() => api.current.flyTo(view.current.k * 2, (MW / 2 - view.current.tx) / view.current.k, (MH / 2 - view.current.ty) / view.current.k, 300)}>+</button>
            <button className={ctl} aria-label="Zoom out" disabled={zoom <= K_MIN} onClick={() => api.current.flyTo(view.current.k / 2, (MW / 2 - view.current.tx) / view.current.k, (MH / 2 - view.current.ty) / view.current.k, 300)}>−</button>
            <button className={`${ctl} text-[11px]`} aria-label="Reset view" disabled={Math.abs(zoom - 1) < 0.01} onClick={() => api.current.home()}>⌂</button>
            <button className={`${ctl} text-[9.5px]`} aria-label="Zoom out to India" onClick={() => api.current.flyTo(0.00058, (INDIA_BOX.x0 + INDIA_BOX.x1) / 2, (INDIA_BOX.y0 + INDIA_BOX.y1) / 2, 900)}>IN</button>
            <button className={`${ctl} text-[13px]`} aria-label="Zoom out to the world" onClick={() => api.current.flyTo(0.00012, (WORLD.x0 + WORLD.x1) / 2, (WORLD.y0 + WORLD.y1) / 2, 1100)}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="8" cy="8" r="6.2" /><ellipse cx="8" cy="8" rx="2.6" ry="6.2" /><path d="M1.8 8h12.4M3 4.6h10M3 11.4h10" /></svg>
            </button>
          </div>
          <AnimatePresence>
            {hint && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-ink/80 px-3 py-1.5 font-mono text-[11px] text-canvas">
                Ctrl or ⌘ + scroll to zoom, or pinch
              </motion.p>
            )}
          </AnimatePresence>
          <Panel
            open={!!sel}
            onClose={closeSel}
            left={sel?.left ?? 50}
            top={sel?.top ?? 20}
            title={sel?.t ? `incident ${sel.t.id}, ${sel.t.kind}` : sel?.v ? `volunteer V${sel.v.id}${sel.v.city ? `, ${sel.v.city}` : ''}` : ''}
            rows={
              sel?.t
                ? [
                    ['urgency', sel.t.urg],
                    ['people', String(sel.t.people)],
                    ['area', sel.t.where],
                    ['assigned', sel.t.vol ? `V${sel.t.vol}` : 'waiting'],
                    ...(sel.t.kind === 'debris clearing' && !sel.t.city ? [['road', 'closed until cleared'], ['linked incidents', sel.t.linked.length ? sel.t.linked.join(', ') : 'none nearby']] : []),
                  ]
                : sel?.v
                  ? [['heading to', sel.v.task ? `incident ${sel.v.task.id}, ${sel.v.task.kind}` : 'standing by'], ['road distance left', km(sel.v.left)]]
                  : []
            }
          />
        </div>

        {/* field reports */}
        <div className="relative border-t border-rule md:border-l md:border-t-0">
          <div className="md:absolute md:inset-0 md:flex md:flex-col">
          <p className="flex items-baseline justify-between gap-2 border-b border-rule px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
            <span>Field reports</span>
            <span className="truncate normal-case tracking-normal text-ink-2">{focus ?? `worldwide, ${CITIES.length + 1} cities`}</span>
          </p>
          <ul className="max-h-[420px] overflow-hidden md:max-h-none md:flex-1 md:[mask-image:linear-gradient(to_bottom,#000_85%,transparent)]">
            <AnimatePresence initial={false}>
              {feed.map((r) => (
                <motion.li
                  key={r.key}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: r.status === 'resolved' || r.status === 'flagged' || r.status === 'falsealarm' ? 0.55 : 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className="border-b border-rule px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-[15px] leading-tight ${r.status === 'flagged' || r.status === 'falsealarm' ? 'line-through decoration-ink/40' : ''}`}>Incident {r.id}</span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${r.escalated && r.status !== 'resolved' ? 'text-[#e5484d]' : r.urg === 'high' ? 'text-signal' : 'text-mute'}`}>{r.escalated && r.status !== 'resolved' ? 'escalated' : r.urg}</span>
                  </div>
                  <dl className="mt-1.5 grid grid-cols-[52px_1fr] gap-y-0.5 font-mono text-[11px]">
                    {[['need', r.kind], ['people', r.people], ['where', !focus && r.city === 'Patiala' ? `${r.where}, Patiala` : r.where]].map(([k, v], i) => (
                      <motion.div key={k} className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.35 }}>
                        <dt className="text-mute">{k}</dt>
                        <dd>{v}</dd>
                      </motion.div>
                    ))}
                  </dl>
                  <AnimatePresence mode="wait">
                    <motion.p key={r.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-1.5 font-mono text-[11px] ${r.status === 'resolved' ? 'text-ink' : r.status === 'flagged' || r.status === 'falsealarm' ? 'text-[#e5484d]' : ['verifying', 'assigned', 'working', 'searching'].includes(r.status) ? 'text-signal' : 'text-mute'}`}>
                      {r.status === 'resolved' ? '✓ ' : r.status === 'flagged' || r.status === 'falsealarm' ? '× ' : ''}{STATUS[r.status]}{r.status === 'flagged' && r.why ? `: ${r.why}, not dispatched` : ''}{r.vol && r.status === 'assigned' ? `, V${r.vol} en route` : ''}{r.kind === 'debris clearing' && r.city === 'Patiala' && !['resolved', 'extracting', 'flagged', 'falsealarm'].includes(r.status) ? ', road closed' : ''}
                    </motion.p>
                  </AnimatePresence>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          </div>
        </div>
      </div>
    </Device>
  )
}
