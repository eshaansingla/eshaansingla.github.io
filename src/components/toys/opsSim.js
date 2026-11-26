/*
 * A self-contained dispatch simulation for one generated city, so every city on the map runs its own
 * operation at the same time. Same rules as Patiala's: reports arrive (often in bursts), the photo is read,
 * duplicates and mismatched photos are flagged, volunteers are assigned with the Hungarian method on travel
 * distance weighted by urgency and waiting time, jobs take different times on site, a few are false alarms,
 * and urgent jobs left waiting are escalated. Streets here are a grid, so routes are Manhattan paths.
 * All positions are in the city's own (rotated) plan frame.
 */

export const KINDS = ['food supplies', 'medical camp', 'shelter', 'drinking water', 'debris clearing']
export const URG = ['low', 'medium', 'high']
export const URG_W = { high: 0.6, medium: 0.85, low: 1 }
export const WORK = { 'drinking water': 1.2, 'food supplies': 2, 'shelter': 3.2, 'medical camp': 3.8, 'debris clearing': 4.6 }
const SPEED = 62
const BIG = 1e7

export function hungarian(a) {
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
/** Min-cost matching on a volunteers × tasks cost matrix (rectangular either way). */
export function solve(C) {
  if (!C.length || !C[0].length) return []
  if (C.length <= C[0].length) return hungarian(C)
  const T = C[0].map((_, j) => C.map((row) => row[j]))
  return hungarian(T).map(([r, c]) => [c, r])
}
/** Nearest-first: repeatedly take the globally closest free pair. */
export function greedy(C) {
  const uv = new Set(), ut = new Set(), pairs = []
  for (let k = 0; k < Math.min(C.length, C[0]?.length || 0); k++) {
    let m = Infinity, bi = -1, bj = -1
    C.forEach((row, i) => !uv.has(i) && row.forEach((c, j) => { if (!ut.has(j) && c < m) { m = c; bi = i; bj = j } }))
    if (bi < 0) break
    uv.add(bi); ut.add(bj); pairs.push([bi, bj])
  }
  return pairs
}

export class CitySim {
  constructor(city, plan, rnd) {
    this.c = city
    this.L = plan
    this.rnd = rnd
    this.tasks = []
    this.vols = []
    this.next = 1
    this.t = 0
    this.spawnIn = rnd() * 4
    this.stats = { resolved: 0, respSum: 0, flagged: 0, opt: 0, greedy: 0 }
    const n = city.R > 800 ? 6 : 4
    for (let i = 0; i < n; i++) { const p = this.point(); this.vols.push({ id: i + 1, ...p, path: [], task: null }) }
  }
  // a random point on a street inside the city
  point() {
    const { lines, inside } = this.L
    for (let tries = 0; tries < 40; tries++) {
      const row = this.rnd() < 0.5
      const line = lines[1 + Math.floor(this.rnd() * (lines.length - 2))]
      const u = (this.rnd() * 2 - 1) * this.L.R * 0.8
      const x = row ? u : line, y = row ? line : u
      if (inside(x, y)) return { row, x, y }
    }
    return { row: true, x: 0, y: this.L.lines[Math.floor(this.L.lines.length / 2)] }
  }
  nearestLine(v) { return this.L.lines.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)) }
  // Manhattan route along the grid from p to q (both on streets)
  route(p, q) {
    if (p.row && q.row) {
      if (p.y === q.y) return [[q.x, q.y]]
      const xc = this.nearestLine((p.x + q.x) / 2)
      return [[xc, p.y], [xc, q.y], [q.x, q.y]]
    }
    if (!p.row && !q.row) {
      if (p.x === q.x) return [[q.x, q.y]]
      const yc = this.nearestLine((p.y + q.y) / 2)
      return [[p.x, yc], [q.x, yc], [q.x, q.y]]
    }
    return p.row ? [[q.x, p.y], [q.x, q.y]] : [[p.x, q.y], [q.x, q.y]]
  }
  len(p, pts) { let d = 0, a = [p.x, p.y]; pts.forEach((b) => { d += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); a = b }); return d }
  live(t) { return t.state !== 'resolved' && t.state !== 'rejected' }
  area(x, y) { return `${this.c.n}, sector ${1 + (x > 0 ? 1 : 0) + (y > 0 ? 2 : 0)}` }

  /** The street point nearest to a tap, in the plan frame, or null outside the city. */
  snap(x, y) {
    const lx = this.nearestLine(x), ly = this.nearestLine(y)
    const p = Math.abs(ly - y) <= Math.abs(lx - x) ? { row: true, x, y: ly } : { row: false, x: lx, y }
    return this.L.inside(p.x, p.y) ? p : null
  }

  add(emit, at, real) {
    const r = this.rnd, p = at || this.point()
    const t = {
      id: this.next++, ...p, kind: KINDS[Math.floor(r() * KINDS.length)], urg: URG[Math.floor(r() * 3)],
      people: 10 + Math.floor(r() * 60), state: 'incoming', t0: this.t, born: this.t, vol: null, fake: null, escalated: false,
    }
    t.work = WORK[t.kind] * (0.75 + r() * 0.6)
    if (!real && r() < 0.17) {
      const near = this.tasks.find((o) => this.live(o) && o.state !== 'incoming' && Math.hypot(o.x - t.x, o.y - t.y) < 200)
      t.fake = near ? { why: 'duplicate', of: near.id } : r() < 0.5 ? { why: 'mismatch' } : { why: 'nothing' }
    }
    this.tasks.push(t)
    emit(this, t, { status: 'extracting', where: this.area(t.x, t.y) })
  }

  reassign(emit) {
    const open = this.tasks.filter((t) => t.state === 'open')
    const V = this.vols.filter((v) => !v.task || v.task.state === 'open')
    V.forEach((v) => { if (v.task) { v.task.vol = null; v.task = null; v.path = [] } })
    if (!open.length || !V.length) { open.forEach((t) => emit(this, t, { status: 'waiting', vol: null })); return }
    const R = V.map((v) => open.map((t) => this.route(v, t)))
    const D = R.map((row, i) => row.map((pts) => this.len(V[i], pts)))
    const w = (t) => URG_W[t.urg] * Math.max(0.4, 1 - 0.05 * (this.t - t.t0))
    const C = D.map((row) => row.map((d, j) => d * w(open[j])))
    const pairs = solve(C).filter(([i, j]) => C[i][j] < BIG)
    pairs.forEach(([i, j]) => { const v = V[i], t = open[j]; v.task = t; t.vol = v; v.path = R[i][j] })
    const gp = greedy(C)
    this.greedyRoutes = gp.map(([i, j]) => ({ pts: [[V[i].x, V[i].y], ...R[i][j]], t: open[j] }))
    if (pairs.length) { this.stats.opt += pairs.reduce((s, [i, j]) => s + C[i][j], 0); this.stats.greedy += gp.reduce((s, [i, j]) => s + C[i][j], 0) }
    open.forEach((t) => emit(this, t, { status: t.vol ? 'assigned' : 'waiting', vol: t.vol ? t.vol.id : null }))
  }

  step(dt, emit) {
    this.t += dt
    const r = this.rnd
    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      const n = r() < 0.4 ? 2 + (r() < 0.4 ? 1 : 0) : 1
      for (let i = 0; i < n && this.tasks.filter((t) => this.live(t)).length < 8; i++) this.add(emit)
      this.spawnIn = 2 + r() * 3.5
    }
    let changed = false
    this.tasks.forEach((t) => {
      const age = this.t - t.t0
      if (t.state === 'incoming' && age > 1.4) {
        if (t.fake && t.fake.why !== 'nothing') {
          t.state = 'rejected'; t.t0 = this.t; this.stats.flagged++
          emit(this, t, { status: 'flagged', why: t.fake.why === 'duplicate' ? `duplicate of incident ${t.fake.of}` : 'photo does not match the report' })
        } else { t.state = 'open'; t.t0 = this.t; changed = true }
      } else if (t.state === 'open' && !t.vol && t.urg === 'high' && !t.escalated && age > 5) {
        t.escalated = true; emit(this, t, { escalated: true }); changed = true
      } else if (t.state === 'working' && age > (t.fake ? 1 : t.work)) {
        t.state = 'verifying'; t.t0 = this.t; emit(this, t, { status: 'verifying' })
      } else if (t.state === 'verifying' && age > 1.2) {
        t.state = 'resolved'; t.t0 = this.t
        if (t.fake) { this.stats.flagged++; t.falseAlarm = true; emit(this, t, { status: 'falsealarm' }) }
        else { this.stats.resolved++; this.stats.respSum += this.t - t.born; emit(this, t, { status: 'resolved' }) }
        if (t.vol) { t.vol.task = null; t.vol = null }
        changed = true
      }
    })
    if (changed || this.dirty) { this.dirty = false; this.reassign(emit) }
    this.vols.forEach((v) => {
      const t = v.task
      if (!t || t.state !== 'open') return
      let left = SPEED * dt
      while (left > 0 && v.path.length) {
        const [nx, ny] = v.path[0], L = Math.hypot(nx - v.x, ny - v.y)
        if (L <= left) { v.x = nx; v.y = ny; v.path.shift(); left -= L } else { v.x += ((nx - v.x) / L) * left; v.y += ((ny - v.y) / L) * left; left = 0 }
      }
      if (!v.path.length) { v.row = t.row; t.state = 'working'; t.t0 = this.t; emit(this, t, { status: t.fake ? 'searching' : 'working' }) }
      else v.row = Math.abs(v.path[0][1] - v.y) < 0.01 // moving along a row when y is not changing
    })
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      const t = this.tasks[i]
      if ((t.state === 'resolved' || t.state === 'rejected') && this.t - t.t0 > 1.4) this.tasks.splice(i, 1)
    }
  }

  addVol() { if (this.vols.length >= 9) return false; const p = this.point(); this.vols.push({ id: this.vols.length + 1, ...p, path: [], task: null }); this.dirty = true; return true }
  toLocal(x, y) { const dx = x - this.c.x, dy = y - this.c.y, c = Math.cos(this.L.rot), s = Math.sin(this.L.rot); return { x: c * dx + s * dy, y: -s * dx + c * dy } }
  toWorld(x, y) { const c = Math.cos(this.L.rot), s = Math.sin(this.L.rot); return { x: this.c.x + c * x - s * y, y: this.c.y + s * x + c * y } }

  open() { return this.tasks.filter((t) => this.live(t) && t.state !== 'incoming').length }

  /** Pins, volunteers and routes, in the city's plan frame (the caller has translated and rotated). */
  draw(ctx, k, t, C, hex, showGreedy) {
    const u = 1 / Math.sqrt(k), rot = this.L.rot
    // text stays level even though the city grid is rotated
    const label = (s, x, y, px, color, weight) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-rot)
      ctx.fillStyle = color; ctx.font = `${weight} ${px}px "JetBrains Mono Variable", monospace`; ctx.textAlign = 'center'
      ctx.fillText(s, 0, 0); ctx.restore()
    }
    if (showGreedy && this.greedyRoutes) {
      ctx.setLineDash([3 / k, 5 / k]); ctx.strokeStyle = C.ink + '80'; ctx.lineWidth = 1.6 / k
      this.greedyRoutes.forEach((g) => {
        if (g.t.state !== 'open') return
        ctx.beginPath(); g.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke()
      })
      ctx.setLineDash([])
    }
    this.vols.forEach((v) => {
      if (!v.task || v.task.state !== 'open' || !v.path.length) return
      ctx.strokeStyle = C.signal + 'b0'; ctx.lineWidth = 3 / k
      ctx.setLineDash([7 / k, 5 / k]); ctx.lineDashOffset = -t * 26 / k
      ctx.beginPath(); ctx.moveTo(v.x, v.y); v.path.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.stroke()
      ctx.setLineDash([]); ctx.lineDashOffset = 0
    })
    this.tasks.forEach((tk) => {
      const age = this.t - tk.t0
      if (tk.state === 'incoming') {
        const q = Math.min(1, age / 1.4)
        ctx.globalAlpha = 1 - q; ctx.strokeStyle = C.signal; ctx.lineWidth = 1.5 / k
        ctx.beginPath(); ctx.arc(tk.x, tk.y, (40 * (1 - q) + 6) * u, 0, 7); ctx.stroke(); ctx.globalAlpha = 1
        return
      }
      if (tk.state === 'rejected') {
        ctx.globalAlpha = Math.max(0, 1 - age / 1.4); ctx.strokeStyle = C.mute; ctx.lineWidth = 1.6 / k
        const r = 10 * u
        ctx.beginPath(); ctx.arc(tk.x, tk.y, r, 0, 7); ctx.moveTo(tk.x - r * 0.7, tk.y + r * 0.7); ctx.lineTo(tk.x + r * 0.7, tk.y - r * 0.7); ctx.stroke()
        ctx.globalAlpha = 1
        return
      }
      ctx.globalAlpha = tk.state === 'resolved' ? Math.max(0, 1 - age / 1.4) : 1
      const hot = tk.urg === 'high'
      if (tk.state === 'open') {
        const period = tk.escalated ? 0.9 : 2.2, ph = ((t + tk.id * 0.37) % period) / period
        ctx.strokeStyle = (tk.escalated ? '#e5484d' : hot ? C.signal : C.ink) + hex((1 - ph) * 0.6)
        ctx.lineWidth = (tk.escalated ? 2.2 : 1.5) / k
        ctx.beginPath(); ctx.arc(tk.x, tk.y, (10 + ph * 24) * u, 0, 7); ctx.stroke()
      }
      const pinR = 9.5 * u
      ctx.fillStyle = tk.falseAlarm || tk.state === 'resolved' ? C.mute : tk.escalated ? '#e5484d' : hot ? C.signal : C.ink
      ctx.beginPath(); ctx.moveTo(tk.x, tk.y); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR, Math.PI * 0.78, Math.PI * 2.22); ctx.closePath(); ctx.fill()
      label(tk.falseAlarm ? '×' : tk.state === 'resolved' ? '✓' : tk.kind === 'debris clearing' ? '!' : String(tk.id), tk.x, tk.y - pinR * 0.85, 10 * u, C.paper, 700)
      if (tk.state === 'working') {
        const done = Math.min(1, age / (tk.fake ? 1 : tk.work))
        ctx.strokeStyle = C.ink + '30'; ctx.lineWidth = 2.2 / k
        ctx.beginPath(); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR * 1.5, 0, 7); ctx.stroke()
        ctx.strokeStyle = C.signal
        ctx.beginPath(); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR * 1.5, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2); ctx.stroke()
      }
      if (tk.state === 'verifying') {
        ctx.strokeStyle = C.signal; ctx.lineWidth = 2 / k
        ctx.beginPath(); ctx.arc(tk.x, tk.y - pinR * 1.25, pinR * 1.5, t * 6, t * 6 + 4); ctx.stroke()
      }
      ctx.globalAlpha = 1
    })
    this.vols.forEach((v) => {
      const r = 10 * u
      ctx.fillStyle = C.paper
      ctx.strokeStyle = v.task ? C.signal : C.ink + '88'
      ctx.lineWidth = 2.4 * u
      ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, 7); ctx.fill(); ctx.stroke()
      label(`V${v.id}`, v.x, v.y + 3.3 * u, 9.5 * u, C.ink, 600)
    })
  }
}
