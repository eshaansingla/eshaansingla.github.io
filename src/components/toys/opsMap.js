/*
 * The city for the Sanchaalan Saathi figure: a street graph with a river crossed only at bridges, plus everything
 * needed to draw it like a real map and to route volunteers along its roads.
 * Map units: 760 × 420, 1 unit ≈ 5 m.
 */

import GEO from '../../assets/geo_india.json'

export const MW = 760, MH = 420
export const M_PER_UNIT = 5

// The ops map is centred on Patiala; everything else is placed with a local equirectangular projection.
const LON0 = 76.3869, LAT0 = 30.3398
const UX = (111320 * Math.cos((LAT0 * Math.PI) / 180)) / M_PER_UNIT, UY = 110574 / M_PER_UNIT
export const ll = (lon, lat) => [MW / 2 + (lon - LON0) * UX, MH / 2 - (lat - LAT0) * UY]
const proj = (r) => r.map(([lo, la]) => ll(lo, la))
const INDIA = GEO.india.map(proj)
const STATES = GEO.states.map((st) => ({ n: st.n, r: st.r.map(proj), c: ll(...st.c), a: st.a }))
const PUNJAB = STATES.find((st) => st.n === 'Punjab').r
// rings that wrap the date line are cut there so they never draw a line across the whole world
const cutAtDateLine = (r) => {
  const out = [[]]
  r.forEach(([lo, la], i) => { if (i && Math.abs(lo - r[i - 1][0]) > 180) out.push([]); out[out.length - 1].push([lo, la]) })
  return out.filter((q) => q.length > 2)
}
const COUNTRIES = GEO.countries.filter((c) => c.n !== 'Antarctica').map((c) => ({ n: c.n, r: c.r.flatMap(cutAtDateLine).map(proj), c: ll(...c.c), a: c.a }))
// pan limits: the whole world; INDIA_BOX frames the country for the "IN" button
export const WORLD = (() => { const [x0, y0] = ll(-180, 78), [x1, y1] = ll(180, -56); return { x0, x1, y0, y1 } })()
export const INDIA_BOX = (() => {
  const xs = INDIA.flat().map((p) => p[0]), ys = INDIA.flat().map((p) => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
})()
const PUNJAB_CITIES = [
  ['Ludhiana', 75.857, 30.901], ['Amritsar', 74.872, 31.634], ['Jalandhar', 75.576, 31.326], ['Bathinda', 74.951, 30.211],
  ['Mohali', 76.717, 30.704], ['Pathankot', 75.652, 32.264], ['Firozpur', 74.613, 30.925], ['Sangrur', 75.844, 30.245],
  ['Hoshiarpur', 75.911, 31.532], ['Moga', 75.171, 30.817],
].map(([n, lo, la]) => [n, ...ll(lo, la)])
const INDIA_CITIES = [
  ['New Delhi', 77.209, 28.614], ['Mumbai', 72.878, 19.076], ['Kolkata', 88.364, 22.573], ['Chennai', 80.271, 13.083],
  ['Bengaluru', 77.595, 12.972], ['Hyderabad', 78.487, 17.385], ['Ahmedabad', 72.571, 23.023], ['Jaipur', 75.787, 26.912],
  ['Lucknow', 80.946, 26.847], ['Bhopal', 77.412, 23.259], ['Guwahati', 91.736, 26.144], ['Srinagar', 74.797, 34.084],
].map(([n, lo, la]) => [n, ...ll(lo, la)])

export function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const XS = [40, 150, 262, 372, 478, 596, 712]
const YS = [42, 120, 196, 304, 384]
const BRIDGES = [1, 3, 5] // columns that cross the river between rows 2 and 3
export const riverY = (x) => 250 + 16 * Math.sin(x / 115) + 6 * Math.sin(x / 41)
const ARTERIAL = { row: [1, 4], col: [3] }
export const ROAD_NAMES = [
  { kind: 'row', i: 1, name: 'MALL ROAD' },
  { kind: 'row', i: 4, name: 'STATION ROAD' },
  { kind: 'row', i: 0, name: 'CANAL ROAD' },
  { kind: 'col', i: 3, name: 'CIVIL LINES ROAD' },
  { kind: 'col', i: 1, name: 'SCHOOL LANE' },
  { kind: 'col', i: 5, name: 'TEMPLE ROAD' },
]
export const AREAS = [
  { x: 96, y: 82, name: 'OLD CITY' },
  { x: 534, y: 82, name: 'MODEL TOWN' },
  { x: 206, y: 345, name: 'RAILWAY COLONY' },
  { x: 650, y: 345, name: 'SECTOR 9' },
]
export const POIS = [
  { x: 318, y: 158, kind: 'hospital', name: 'Civil Hospital' },
  { x: 206, y: 82, kind: 'school', name: 'Govt. School' },
  { x: 654, y: 158, kind: 'police', name: 'Police Post' },
  { x: 425, y: 345, kind: 'camp', name: 'Relief Camp' },
  { x: 96, y: 158, kind: 'hub', name: 'NGO Hub' },
]
const PARK = { x0: 478, y0: 304, x1: 596, y1: 384, name: 'Baradari Garden' }
const RAIL_Y = 404
// landmarks get their own drawings at neighbourhood zoom; the layout is illustrative
const LANDMARKS = [
  { kind: 'fort', name: 'Qila Mubarak', x0: 54, y0: 52, x1: 140, y1: 110 },
  { kind: 'campus', name: 'Thapar Institute', x0: 486, y0: 128, x1: 588, y1: 188 },
  { kind: 'temple', name: 'Kali Mata Mandir', x0: 722, y0: 316, x1: 760, y1: 372 },
  { kind: 'station', name: 'Railway Station', x0: 268, y0: 392, x1: 366, y1: 400 },
]

// ── graph ────────────────────────────────────────────────────────────
export const nodes = []
const nid = (i, j) => j * XS.length + i
YS.forEach((y, j) => XS.forEach((x, i) => nodes.push({ id: nid(i, j), x, y, i, j })))
export const edges = []
const addEdge = (a, b, arterial) => edges.push({ id: edges.length, a, b, len: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y), arterial })
YS.forEach((_, j) => XS.forEach((_, i) => {
  if (i < XS.length - 1) addEdge(nid(i, j), nid(i + 1, j), ARTERIAL.row.includes(j))
  if (j < YS.length - 1 && (j !== 2 || BRIDGES.includes(i))) addEdge(nid(i, j), nid(i, j + 1), ARTERIAL.col.includes(i))
}))

/** All-pairs shortest paths over open edges (Floyd–Warshall; 35 nodes, so this is instant). */
export function shortest(closed) {
  const n = nodes.length
  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)))
  const N = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? j : -1)))
  edges.forEach((e) => {
    if (closed.has(e.id)) return
    D[e.a][e.b] = D[e.b][e.a] = e.len
    N[e.a][e.b] = e.b
    N[e.b][e.a] = e.a
  })
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) {
    const dik = D[i][k]
    if (dik === Infinity) continue
    for (let j = 0; j < n; j++) if (dik + D[k][j] < D[i][j]) { D[i][j] = dik + D[k][j]; N[i][j] = N[i][k] }
  }
  return { D, N }
}

/** Nearest point on any road: { e, t, x, y } with t measured from e.a. */
export function snap(x, y) {
  let best = null
  edges.forEach((e) => {
    const A = nodes[e.a], B = nodes[e.b]
    const dx = B.x - A.x, dy = B.y - A.y
    const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / (dx * dx + dy * dy)))
    const px = A.x + dx * t, py = A.y + dy * t
    const d = Math.hypot(x - px, y - py)
    if (!best || d < best.d) best = { e, t, x: px, y: py, d }
  })
  return best
}

/**
 * Road route between two snapped points. Closed edges are impassable, except the
 * stretch of a closed edge leading to the point that closed it.
 * Returns { dist, pts } or null if unreachable.
 */
export function route(from, to, sp) {
  if (from.e.id === to.e.id) {
    const dist = Math.abs(from.t - to.t) * from.e.len
    return { dist, pts: [[from.x, from.y], [to.x, to.y]] }
  }
  let best = null
  for (const sa of [[from.e.a, from.t], [from.e.b, 1 - from.t]]) {
    for (const sb of [[to.e.a, to.t], [to.e.b, 1 - to.t]]) {
      const d = sa[1] * from.e.len + sp.D[sa[0]][sb[0]] + sb[1] * to.e.len
      if (!best || d < best.d) best = { d, a: sa[0], b: sb[0] }
    }
  }
  if (!best || best.d === Infinity) return null
  const pts = [[from.x, from.y]]
  let u = best.a
  pts.push([nodes[u].x, nodes[u].y])
  while (u !== best.b) { u = sp.N[u][best.b]; pts.push([nodes[u].x, nodes[u].y]) }
  pts.push([to.x, to.y])
  return { dist: best.d, pts }
}

/** A random point on a random open road, away from the map edge. */
export function randomRoadPoint(rnd) {
  const e = edges[Math.floor(rnd() * edges.length)]
  const t = 0.2 + rnd() * 0.6
  const A = nodes[e.a], B = nodes[e.b]
  return { e, t, x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }
}

export function areaName(x, y) {
  let best = AREAS[0], bd = Infinity
  AREAS.forEach((a) => { const d = Math.hypot(a.x - x, a.y - y); if (d < bd) { bd = d; best = a } })
  return best.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── static buildings (deterministic) ────────────────────────────────
const buildings = []
;(() => {
  const rnd = mulberry(11)
  const cx = [-40, ...XS, MW + 40], cy = [-40, ...YS, MH + 40]
  for (let i = 0; i < cx.length - 1; i++) for (let j = 0; j < cy.length - 1; j++) {
    const x0 = cx[i] + 9, x1 = cx[i + 1] - 9, y0 = cy[j] + 9, y1 = cy[j + 1] - 9
    if (x1 - x0 < 12 || y1 - y0 < 12) continue
    if (x0 >= PARK.x0 && x1 <= PARK.x1 && y0 >= PARK.y0 && y1 <= PARK.y1) continue
    for (let x = x0 + 2; x < x1 - 6; ) {
      const w = 9 + rnd() * 16
      for (let y = y0 + 2; y < y1 - 6; ) {
        const h = 8 + rnd() * 14
        const bw = Math.min(w, x1 - x - 2), bh = Math.min(h, y1 - y - 2)
        const midY = riverY(x + bw / 2)
        const clearOf = (L) => x + bw < L.x0 - 3 || x > L.x1 + 3 || y + bh < L.y0 - 3 || y > L.y1 + 3
        const offRail = y + bh < RAIL_Y - 9 || y > RAIL_Y + 9
        if (bw > 5 && bh > 5 && (y + bh < midY - 24 || y > midY + 24) && offRail && LANDMARKS.every(clearOf) && rnd() > 0.08) buildings.push([x, y, bw, bh, rnd()])
        y += h + 3
      }
      x += w + 3
    }
  }
})()

// street traffic: cars running both ways along every street; positions come from time, so it is deterministic
const TRAFFIC = (() => {
  const rnd = mulberry(23), out = []
  const cols = ['#c8433a', '#2f5d9e', '#e8e4da', '#3b3b40', '#d8a32e', '#5f8f62', '#9aa0a6']
  for (let n = 0; n < 46; n++) {
    const row = rnd() < 0.55
    const dir = rnd() < 0.5 ? 1 : -1
    if (row) out.push({ row, line: YS[Math.floor(rnd() * YS.length)], dir, v: 16 + rnd() * 16, ph: rnd() * 2000, col: cols[Math.floor(rnd() * cols.length)] })
    else out.push({ row, line: XS[BRIDGES[Math.floor(rnd() * BRIDGES.length)]], dir, v: 14 + rnd() * 14, ph: rnd() * 2000, col: cols[Math.floor(rnd() * cols.length)] })
  }
  return out
})()

const PALETTE = {
  light: { land: '#efebe3', bldg: '#ded8cc', bldgEdge: '#d2cabb', road: '#ffffff', casing: '#d3cbbd', art: '#fdf1d6', artCase: '#e3c98e', water: '#b9d3dc', waterEdge: '#9fc0cc', park: '#d4e3c0', tree: '#b5cd9a', label: '#7a7468', area: '#9a9285', closed: '#d64545' },
  dark: { land: '#1c1c1e', bldg: '#29292c', bldgEdge: '#323236', road: '#3b3b3f', casing: '#121214', art: '#4a4337', artCase: '#141210', water: '#1d2e38', waterEdge: '#26404d', park: '#1f2b1c', tree: '#2b3a26', label: '#8d877c', area: '#6d685f', closed: '#ff5a5a' },
}

/** Base map: land, river, park, buildings, roads with casing, bridges, closures, labels, POIs. */
export const landColor = (dark) => (dark ? PALETTE.dark : PALETTE.light).land

export function drawMap(ctx, dark, closed, k, t = 0) {
  const P = dark ? PALETTE.dark : PALETTE.light
  // river, carried well beyond the mapped streets
  ctx.beginPath()
  for (let x = -MW * 6; x <= MW * 7; x += 10) ctx.lineTo(x, riverY(x) - 17)
  for (let x = MW * 7; x >= -MW * 6; x -= 10) ctx.lineTo(x, riverY(x) + 17)
  ctx.closePath()
  ctx.fillStyle = P.water
  ctx.fill()
  ctx.strokeStyle = P.waterEdge
  ctx.lineWidth = 1
  ctx.stroke()
  if (k >= 0.5) {
    // the current: short highlights drifting downstream
    ctx.strokeStyle = dark ? 'rgba(150,190,210,0.25)' : 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 70; i++) {
      const x = -200 + ((i * 97 + t * 14) % (MW + 400)), lane = ((i * 37) % 3) - 1
      ctx.beginPath(); ctx.moveTo(x, riverY(x) + lane * 8); ctx.lineTo(x + 9, riverY(x + 9) + lane * 8); ctx.stroke()
    }
  }

  // railway: ballast, rails and sleepers, and a train that comes through now and then
  ctx.strokeStyle = dark ? '#2e2c2a' : '#cfc7b8'
  ctx.lineWidth = 7
  ctx.beginPath(); ctx.moveTo(-MW * 6, RAIL_Y); ctx.lineTo(MW * 7, RAIL_Y); ctx.stroke()
  if (k >= 0.5) {
    ctx.strokeStyle = dark ? '#55524d' : '#9a9183'
    ctx.lineWidth = 0.8
    for (let x = -60; x < MW + 60; x += 3.5) { ctx.beginPath(); ctx.moveTo(x, RAIL_Y - 3); ctx.lineTo(x, RAIL_Y + 3); ctx.stroke() }
    ctx.lineWidth = 0.7
    ;[-1.6, 1.6].forEach((d) => { ctx.beginPath(); ctx.moveTo(-60, RAIL_Y + d); ctx.lineTo(MW + 60, RAIL_Y + d); ctx.stroke() })
    const tx = ((t * 40) % 2600) - 600 // one pass every minute or so
    for (let c = 0; c < 7; c++) {
      ctx.fillStyle = c ? (dark ? '#5d6b7c' : '#4f6b8a') : '#c8433a'
      ctx.beginPath(); ctx.roundRect(tx - c * 15, RAIL_Y - 2.6, 13.5, 5.2, 1.6); ctx.fill()
    }
  }

  // park with trees
  ctx.fillStyle = P.park
  ctx.beginPath(); ctx.roundRect(PARK.x0 + 10, PARK.y0 + 10, PARK.x1 - PARK.x0 - 20, PARK.y1 - PARK.y0 - 20, 6); ctx.fill()
  const tr = mulberry(3)
  ctx.fillStyle = P.tree
  for (let n = 0; n < 34; n++) {
    const x = PARK.x0 + 16 + tr() * (PARK.x1 - PARK.x0 - 32), y = PARK.y0 + 16 + tr() * (PARK.y1 - PARK.y0 - 32), r = 2 + tr() * 2.5
    const sway = k >= 1 ? 0.35 * Math.sin(t * 1.3 + n) : 0
    ctx.beginPath(); ctx.arc(x + sway, y, r, 0, 7); ctx.fill()
  }

  // buildings
  ctx.fillStyle = P.bldg
  ctx.strokeStyle = P.bldgEdge
  ctx.lineWidth = 0.6
  const lift = Math.max(0, Math.min(1, (k - 1.05) / 0.6)) // buildings rise into 3D as you zoom into the street
  if (!lift) buildings.forEach(([x, y, w, h]) => { ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6) })
  else {
    const wall = dark ? '#202023' : '#cbc3b4', roof = dark ? '#34343a' : '#e9e4da'
    buildings.forEach(([x, y, w, h, e]) => {
      const z = (3 + e * 10) * lift, ox = -0.35 * z, oy = -0.6 * z
      ctx.fillStyle = wall
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + w + ox, y + oy); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x + ox, y + h + oy); ctx.closePath(); ctx.fill()
      ctx.fillStyle = roof
      ctx.fillRect(x + ox, y + oy, w, h)
      ctx.strokeStyle = P.bldgEdge
      ctx.strokeRect(x + ox + 0.3, y + oy + 0.3, w - 0.6, h - 0.6)
    })
    ctx.fillStyle = P.bldg
  }

  // roads: casing then fill, full length to the map edge; bridges get parapets
  const seg = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke() }
  const strokeRoads = (pass) => {
    YS.forEach((y, j) => {
      const art = ARTERIAL.row.includes(j)
      ctx.strokeStyle = pass ? (art ? P.art : P.road) : art ? P.artCase : P.casing
      ctx.lineWidth = (art ? 11 : 8) - (pass ? 2.4 : 0)
      seg(-20, y, MW + 20, y)
    })
    XS.forEach((x, i) => {
      const art = ARTERIAL.col.includes(i)
      ctx.strokeStyle = pass ? (art ? P.art : P.road) : art ? P.artCase : P.casing
      ctx.lineWidth = (art ? 11 : 8) - (pass ? 2.4 : 0)
      if (BRIDGES.includes(i)) seg(x, -20, x, MH + 20)
      else { seg(x, -20, x, YS[2]); seg(x, YS[3], x, MH + 20) }
    })
  }
  // the wider city: arterials continue out of the mapped streets
  ctx.lineCap = 'butt'
  ;[0, 1].forEach((pass) => {
    ctx.strokeStyle = pass ? P.art : P.artCase
    ctx.lineWidth = 11 - (pass ? 2.4 : 0)
    ARTERIAL.row.forEach((j) => { seg(-MW * 6, YS[j], -20, YS[j]); seg(MW + 20, YS[j], MW * 7, YS[j]) })
    ARTERIAL.col.forEach((i) => { seg(XS[i], -MH * 6, XS[i], -20); seg(XS[i], MH + 20, XS[i], MH * 7) })
  })
  strokeRoads(0)
  strokeRoads(1)
  BRIDGES.forEach((i) => {
    const x = XS[i], y = riverY(x)
    ctx.strokeStyle = P.label
    ctx.lineWidth = 1
    ;[-6.5, 6.5].forEach((dx) => seg(x + dx, y - 22, x + dx, y + 22))
  })

  // closed roads: red casing with hatching
  edges.forEach((e) => {
    if (!closed.has(e.id)) return
    const A = nodes[e.a], B = nodes[e.b]
    ctx.strokeStyle = P.closed
    ctx.lineWidth = 3
    ctx.setLineDash([5, 4])
    seg(A.x, A.y, B.x, B.y)
    ctx.setLineDash([])
  })

  if (k >= 0.5) {
    LANDMARKS.forEach((L) => drawLandmark(ctx, L, dark, t))
    // traffic, keeping to the left of each street
    TRAFFIC.forEach((c) => {
      const len = (c.row ? MW : MH) + 80
      const s0 = ((c.ph + t * c.v) % len) - 40
      const pos = c.dir > 0 ? s0 : len - 80 - s0
      if (!c.row && Math.abs(pos - riverY(c.line)) < 14 && !BRIDGES.length) return
      const lane = c.dir * 2.2
      const x = c.row ? pos : c.line - lane, y = c.row ? c.line + lane : pos
      ctx.fillStyle = c.col
      ctx.beginPath()
      if (c.row) ctx.roundRect(x - 2.4, y - 1.2, 4.8, 2.4, 0.8)
      else ctx.roundRect(x - 1.2, y - 2.4, 2.4, 4.8, 0.8)
      ctx.fill()
      if (dark) { ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(c.row ? x + c.dir * 2.6 : x, c.row ? y : y + c.dir * 2.6, 0.8, 0, 7); ctx.fill() }
    })
  }

  // labels scale down as the map zooms so they stay the same size on screen; only once the streets are readable
  if (k < 0.35) return
  const f = (px, w = 500) => `${w} ${px / k}px "JetBrains Mono Variable", ui-monospace, monospace`
  ctx.fillStyle = P.label
  ctx.font = f(8.5)
  ROAD_NAMES.forEach((r) => {
    if (r.kind === 'row') ctx.fillText(r.name, XS[0] + 26, YS[r.i] - (ARTERIAL.row.includes(r.i) ? 7 : 6))
    else { ctx.save(); ctx.translate(XS[r.i] + 6, YS[0] + 14); ctx.rotate(Math.PI / 2); ctx.fillText(r.name, 0, 0); ctx.restore() }
  })
  ctx.fillStyle = dark ? '#5d7f8f' : '#5f8c9c'
  ctx.font = `italic ${f(9)}`
  ctx.fillText('Badi Nadi', 248, riverY(248) + 4)
  ctx.fillStyle = dark ? '#6b8a5c' : '#5f7d4c'
  ctx.font = f(8.5)
  ctx.textAlign = 'center'
  ctx.fillText(PARK.name, (PARK.x0 + PARK.x1) / 2, PARK.y1 - 14)
  ctx.fillStyle = P.area
  ctx.font = f(9, 600)
  AREAS.forEach((a) => ctx.fillText(a.name.split('').join(' '), a.x, a.y))
  POIS.forEach((p) => drawPoi(ctx, p, dark, k))
  if (k >= 0.5) {
    ctx.fillStyle = dark ? '#d9d2c5' : '#4a4236'
    ctx.font = f(8.5, 600)
    LANDMARKS.forEach((L) => ctx.fillText(L.name, (L.x0 + L.x1) / 2, L.kind === 'station' ? L.y1 + 11 / k : L.y1 + 9 / k))
  }
  ctx.textAlign = 'left'
}

function drawPoi(ctx, p, dark, k) {
  const r = 7 / Math.sqrt(k)
  const col = { hospital: '#d64545', school: '#3d7bd9', police: '#4b5563', camp: '#d9822b', hub: '#ff6a2c' }[p.kind]
  ctx.fillStyle = col
  ctx.beginPath(); ctx.roundRect(p.x - r, p.y - r, r * 2, r * 2, 2.5 / Math.sqrt(k)); ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.fillStyle = '#fff'
  ctx.lineWidth = 1.4 / Math.sqrt(k)
  const u = r * 0.55
  ctx.beginPath()
  if (p.kind === 'hospital') { ctx.moveTo(p.x - u, p.y); ctx.lineTo(p.x + u, p.y); ctx.moveTo(p.x, p.y - u); ctx.lineTo(p.x, p.y + u); ctx.stroke() }
  else if (p.kind === 'school') { ctx.moveTo(p.x - u, p.y + u * 0.6); ctx.lineTo(p.x, p.y - u); ctx.lineTo(p.x + u, p.y + u * 0.6); ctx.closePath(); ctx.stroke() }
  else if (p.kind === 'police') { ctx.arc(p.x, p.y, u * 0.75, 0, 7); ctx.stroke() }
  else if (p.kind === 'camp') { ctx.moveTo(p.x - u, p.y + u * 0.7); ctx.lineTo(p.x, p.y - u); ctx.lineTo(p.x + u, p.y + u * 0.7); ctx.closePath(); ctx.fill() }
  else { ctx.arc(p.x, p.y, u * 0.6, 0, 7); ctx.fill() }
  ctx.fillStyle = dark ? '#b8b2a6' : '#5e584d'
  ctx.font = `500 ${8.5 / k}px "JetBrains Mono Variable", ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.fillText(p.name, p.x, p.y + r + 10 / k)
}

/** Text and dots drawn in device pixels at a map position, so they stay crisp at any zoom. */
export function screenText(ctx, text, x, y, px, { weight = 500, color = '#000', align = 'center', dx = 0, dy = 0, dot = 0 } = {}) {
  const m = ctx.getTransform(), p = m.transformPoint({ x, y })
  const d = ctx.canvas.width / (ctx.canvas.clientWidth || ctx.canvas.width)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = color
  if (dot) { ctx.beginPath(); ctx.arc(p.x, p.y, dot * d, 0, 7); ctx.fill() }
  if (text) {
    ctx.font = `${weight} ${px * d}px "JetBrains Mono Variable", ui-monospace, monospace`
    ctx.textAlign = align
    ctx.fillText(text, p.x + dx * d, p.y + dy * d)
  }
  ctx.restore()
}

/** World, country and state layers: every country, every Indian state and territory, cities, and where the ops map sits. */
export function drawGeo(ctx, dark, k, signal, view) {
  const P = dark ? PALETTE.dark : PALETTE.light
  const f = (px, w = 500) => `${w} ${px / k}px "JetBrains Mono Variable", ui-monospace, monospace`
  const ring = (r) => { ctx.beginPath(); r.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath() }
  const onScreen = (pt, pad = 0) => pt[0] > view.x0 - pad && pt[0] < view.x1 + pad && pt[1] > view.y0 - pad && pt[1] < view.y1 + pad
  const px = (deg2) => Math.sqrt(deg2) * UX * k * view.sx // rough on-screen size of an area given in square degrees
  // sea, then every country, then India on top in its official outline
  ctx.fillStyle = dark ? '#16232b' : '#c9dde3'
  ctx.fillRect(view.x0 - 1e6, view.y0 - 1e6, view.x1 - view.x0 + 2e6, view.y1 - view.y0 + 2e6)
  const other = dark ? '#262628' : '#e4ded3', edge = dark ? '#3a3a3e' : '#c4bcae'
  ctx.lineWidth = 0.8 / k
  COUNTRIES.forEach((c) => c.r.forEach((r) => { ring(r); ctx.fillStyle = other; ctx.fill(); ctx.strokeStyle = edge; ctx.stroke() }))
  INDIA.forEach((r) => { ring(r); ctx.fillStyle = P.land; ctx.fill() })
  // states and union territories
  ctx.strokeStyle = dark ? '#4d4842' : '#c9bfae'
  ctx.lineWidth = 0.7 / k
  STATES.forEach((st) => st.r.forEach((r) => { ring(r); if (st.n === 'Punjab') { ctx.fillStyle = signal + '1f'; ctx.fill() } ctx.stroke() }))
  INDIA.forEach((r) => { ring(r); ctx.strokeStyle = dark ? '#7a736b' : '#8f8676'; ctx.lineWidth = 1.3 / k; ctx.stroke() })
  PUNJAB.forEach((r) => { ring(r); ctx.strokeStyle = signal; ctx.lineWidth = 1.4 / k; ctx.stroke() })

  const T = (text, x, y, px, o) => screenText(ctx, text, x, y, px, o)
  // country names once they are big enough on screen
  const cName = dark ? '#7d776f' : '#8c8476'
  COUNTRIES.forEach((c) => { if (px(c.a) > 70 && onScreen(c.c)) T(c.n.toUpperCase(), c.c[0], c.c[1], 9.5, { weight: 600, color: cName }) })
  if (k < 0.0014) T('INDIA', ...ll(78.6, 20.4), 11, { weight: 700, color: signal })
  // state and territory names when the state is big enough on screen
  STATES.forEach((st) => { if (st.n !== 'Punjab' && px(st.a) > 60 && onScreen(st.c)) T(st.n.toUpperCase(), st.c[0], st.c[1], 8.5, { weight: 600, color: P.area }) })
  if (k >= 0.0009) T('PUNJAB', ...ll(75.4, 31.05), 10, { weight: 700, color: signal })
  // cities
  if (k >= 0.00045 && k < 0.006) INDIA_CITIES.forEach(([n, x, y]) => { if (onScreen([x, y])) T(n, x, y, 9, n === 'Chennai' || n === 'Kolkata' ? { color: P.label, dot: 2.4, dy: 3, dx: 6, align: 'left' } : { color: P.label, dot: 2.4, dy: -6 }) })
  if (k >= 0.0022) {
    PUNJAB_CITIES.forEach(([n, x, y]) => T(n, x, y, 9.5, { color: P.label, dot: 2.4, dy: -6 }))
    if (k >= 0.006) T('Chandigarh', ...ll(76.779, 30.734), 9.5, { color: P.label, dot: 2.4, dy: 3, align: 'left' })
  }
  // the ops area and Patiala
  ctx.strokeStyle = signal
  ctx.lineWidth = 1.5 / k
  ctx.strokeRect(0, 0, MW, MH)
  if (k >= 0.006) T('Patiala', MW / 2, 0, 10.5, { weight: 700, color: signal, dy: -10 })
}

/** Landmarks, drawn as small illustrations rather than icons. */
function drawLandmark(ctx, L, dark, t) {
  const w = L.x1 - L.x0, h = L.y1 - L.y0, cx = (L.x0 + L.x1) / 2, cy = (L.y0 + L.y1) / 2
  const stone = dark ? '#5b4a3a' : '#c9a77c', stoneDk = dark ? '#3e3226' : '#a8865b', ink = dark ? '#d9d2c5' : '#4a4236'
  if (L.kind === 'fort') {
    ctx.fillStyle = dark ? '#2a2620' : '#efe3cf'
    ctx.fillRect(L.x0 + 6, L.y0 + 6, w - 12, h - 12)
    ctx.strokeStyle = stone; ctx.lineWidth = 4
    ctx.strokeRect(L.x0 + 4, L.y0 + 4, w - 8, h - 8)
    ctx.fillStyle = stoneDk
    for (let x = L.x0 + 4; x < L.x1 - 4; x += 5) { ctx.fillRect(x, L.y0 + 1, 2.6, 2.2); ctx.fillRect(x, L.y1 - 3.2, 2.6, 2.2) }
    ;[[L.x0 + 4, L.y0 + 4], [L.x1 - 4, L.y0 + 4], [L.x0 + 4, L.y1 - 4], [L.x1 - 4, L.y1 - 4]].forEach(([x, y]) => { ctx.fillStyle = stone; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = stoneDk; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill() })
    ctx.fillStyle = stone; ctx.fillRect(cx - 10, cy - 8, 20, 16)
    ctx.fillStyle = stoneDk; ctx.beginPath(); ctx.arc(cx, cy - 8, 6, Math.PI, 0); ctx.fill()
  } else if (L.kind === 'campus') {
    ctx.fillStyle = dark ? '#23301f' : '#d7e6c4'
    ctx.beginPath(); ctx.roundRect(L.x0, L.y0, w, h, 4); ctx.fill()
    ctx.fillStyle = dark ? '#5a3a34' : '#b4664f'
    ctx.fillRect(L.x0 + 8, L.y0 + 8, 34, 10); ctx.fillRect(L.x0 + 8, L.y0 + 8, 10, 40)
    ctx.fillRect(L.x1 - 40, L.y1 - 20, 32, 12); ctx.fillRect(L.x1 - 40, L.y0 + 10, 14, 26)
    ctx.fillStyle = dark ? '#8a8c90' : '#7d8087'
    ctx.fillRect(cx - 3, cy - 12, 6, 16)
    ctx.beginPath(); ctx.moveTo(cx - 4.5, cy - 12); ctx.lineTo(cx, cy - 18); ctx.lineTo(cx + 4.5, cy - 12); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy - 8, 1.6, 0, 7); ctx.fill()
    ctx.strokeStyle = dark ? '#3c5233' : '#b3cc9a'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(L.x0 + 20, cy + 14); ctx.quadraticCurveTo(cx, cy + 4, L.x1 - 14, cy + 16); ctx.stroke()
  } else if (L.kind === 'temple') {
    ctx.fillStyle = dark ? '#3a2a20' : '#f3dcc0'
    ctx.fillRect(L.x0, L.y0 + h * 0.45, w, h * 0.55)
    ctx.fillStyle = dark ? '#a0522d' : '#d9822b'
    ctx.beginPath(); ctx.moveTo(cx - 9, L.y0 + h * 0.5); ctx.quadraticCurveTo(cx - 7, L.y0 + 8, cx, L.y0 + 2); ctx.quadraticCurveTo(cx + 7, L.y0 + 8, cx + 9, L.y0 + h * 0.5); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = dark ? '#6b3a1f' : '#b8661f'; ctx.lineWidth = 0.6
    for (let i = 1; i < 5; i++) { const y = L.y0 + 6 + i * 4.5; ctx.beginPath(); ctx.moveTo(cx - 3 - i * 1.4, y); ctx.lineTo(cx + 3 + i * 1.4, y); ctx.stroke() }
    ctx.fillStyle = '#e8b52a'; ctx.beginPath(); ctx.arc(cx, L.y0 + 1.5, 1.6, 0, 7); ctx.fill()
    // a pennant that flutters
    ctx.strokeStyle = ink; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(cx, L.y0 + 1); ctx.lineTo(cx, L.y0 - 7); ctx.stroke()
    ctx.fillStyle = '#d9822b'; ctx.beginPath(); ctx.moveTo(cx, L.y0 - 7); ctx.lineTo(cx + 6, L.y0 - 5.5 + Math.sin(t * 4) * 0.8); ctx.lineTo(cx, L.y0 - 4); ctx.fill()
  } else if (L.kind === 'station') {
    ctx.fillStyle = dark ? '#3b2f2a' : '#d9b48f'
    ctx.fillRect(L.x0, L.y0 - 4, w, h + 2)
    ctx.fillStyle = dark ? '#5a463d' : '#b98d62'
    for (let x = L.x0 + 6; x < L.x1 - 4; x += 12) ctx.fillRect(x, L.y0 - 2, 6, 3)
  }
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
}
