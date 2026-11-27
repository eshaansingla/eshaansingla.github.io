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
// rings that cross the date line (Russia's far east, Fiji) are unwrapped so they stay one closed shape,
// running on past 180° instead of being cut, which used to close Russia's north coast with a straight line
const cutAtDateLine = (r) => {
  let off = 0
  const out = r.map(([lo, la], i) => {
    if (i) { const prev = r[i - 1][0]; if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360 }
    return [lo + off, la]
  })
  // keep most of the shape inside -180..180
  const mean = out.reduce((a, p) => a + p[0], 0) / out.length
  const shift = mean > 180 ? -360 : mean < -180 ? 360 : 0
  return [shift ? out.map(([lo, la]) => [lo + shift, la]) : out]
}
const COUNTRIES = GEO.countries.filter((c) => c.n !== 'Antarctica').map((c) => ({ n: c.n, r: c.r.flatMap(cutAtDateLine).map(proj), c: ll(...c.c), a: c.a }))
const COUNTRY_ORDER = [...COUNTRIES].sort((a, b) => b.a - a.a)
const SHORT = { 'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'C. African Rep.', 'Bosnia and Herz.': 'Bosnia', 'Dominican Rep.': 'Dominican Rep.' }
// every land ring with its bounding box, for culling at close zoom and for telling land from sea
const boxOf = (r) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; r.forEach(([x, y]) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }); return { r, x0, y0, x1, y1 } }
const LAND = [...COUNTRIES.flatMap((c) => c.r), ...INDIA].map(boxOf)
const BOX = new Map(LAND.map((b) => [b.r, b]))
const meets = (b, v, pad = 0) => b.x1 >= v.x0 - pad && b.x0 <= v.x1 + pad && b.y1 >= v.y0 - pad && b.y0 <= v.y1 + pad
const inRing = (r, x, y) => { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside } return inside }
export const onLand = (x, y) => LAND.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && inRing(b.r, x, y))
/** Sea, then every coastline in the land colour: the base under streets at city zoom, so the sea stays sea. */
export function drawLand(ctx, dark, view) {
  const P = dark ? PALETTE.dark : PALETTE.light
  ctx.fillStyle = P.water
  ctx.fillRect(view.x0 - 10, view.y0 - 10, view.x1 - view.x0 + 20, view.y1 - view.y0 + 20)
  ctx.fillStyle = P.land
  LAND.forEach((b) => { if (!meets(b, view)) return; ctx.beginPath(); b.r.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill() })
}
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
  const vis = (r) => { const b = BOX.get(r); return !b || meets(b, view) }
  COUNTRIES.forEach((c) => c.r.forEach((r) => { if (!vis(r)) return; ring(r); ctx.fillStyle = other; ctx.fill(); ctx.strokeStyle = edge; ctx.stroke() }))
  INDIA.forEach((r) => { ring(r); ctx.fillStyle = P.land; ctx.fill() })
  // states and union territories, once India is big enough for them to read as states rather than noise
  if (k >= 0.0005) {
    ctx.strokeStyle = dark ? '#4d4842' : '#c9bfae'
    ctx.lineWidth = 0.7 / k
    STATES.forEach((st) => st.r.forEach((r) => { ring(r); if (st.n === 'Punjab') { ctx.fillStyle = signal + '1f'; ctx.fill() } ctx.stroke() }))
  }
  // India's border reads like any other country's from far out, and firmer as you come in
  INDIA.forEach((r) => { ring(r); ctx.strokeStyle = k < 0.0005 ? edge : dark ? '#7a736b' : '#8f8676'; ctx.lineWidth = (k < 0.0005 ? 0.9 : 1.3) / k; ctx.stroke() })
  if (k >= 0.0005) PUNJAB.forEach((r) => { ring(r); ctx.strokeStyle = signal; ctx.lineWidth = 1.4 / k; ctx.stroke() })

  const T = (text, x, y, px, o) => screenText(ctx, text, x, y, px, o)
  // country names once they are big enough on screen
  const cName = dark ? '#7d776f' : '#8c8476'
  // largest first, and a name is skipped where it would overlap one already placed
  const placed = [], sc = k * view.sx
  const room = (x, y, w, h) => { const q = [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; if (placed.some((o) => q[0] < o[2] && q[2] > o[0] && q[1] < o[3] && q[3] > o[1])) return false; placed.push(q); return true }
  if (k < 0.0014) { const [ix, iy] = ll(78.6, 20.4); room((ix - view.x0) * sc, (iy - view.y0) * sc, 46, 16); T('INDIA', ix, iy, 11, { weight: 700, color: signal }) }
  COUNTRY_ORDER.forEach((c) => {
    const name = SHORT[c.n] || c.n
    if (c.n === 'India' || px(c.a) < 26 || !onScreen(c.c)) return
    if (!room((c.c[0] - view.x0) * sc, (c.c[1] - view.y0) * sc, name.length * 6.6 + 8, 14)) return
    T(name.toUpperCase(), c.c[0], c.c[1], 9.5, { weight: 600, color: cName })
  })
  // state and territory names when the state is big enough on screen
  STATES.forEach((st) => { if (st.n !== 'Punjab' && px(st.a) > 60 && onScreen(st.c)) T(st.n.toUpperCase(), st.c[0], st.c[1], 8.5, { weight: 600, color: P.area }) })
  if (k >= 0.0009) T('PUNJAB', ...ll(75.4, 31.05), 10, { weight: 700, color: signal })
  // cities
  // cities around the world (each one runs its own operation)
  if (k < 0.006) {
    // every city gets a dot; names are placed big cities first and skipped where they would overlap
    const taken = [], scale = k * view.sx
    const free = (x, y, w) => { const r = [x - w / 2, y - 16, x + w / 2, y + 2]; if (taken.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return false; taken.push(r); return true }
    CITIES.forEach((c) => {
      if (c.india || !onScreen([c.x, c.y])) return
      const sxp = (c.x - view.x0) * scale, syp = (c.y - view.y0) * scale
      const named = (c.tier === 1 ? k >= 0.00022 : k >= 0.0005) && free(sxp, syp, c.n.length * 5.6 + 6)
      T(named ? c.n : '', c.x, c.y, 9, { color: P.label, dot: c.tier === 1 ? 2.2 : 1.7, dy: -6 })
    })
  }
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

// ── every other city: a generated street plan, unique per city, with its own landmark ──
const BIG = new Set(['New Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad'])
const SIGNATURE = {
  Amritsar: ['goldtemple', 'Golden Temple'], 'New Delhi': ['gate', 'India Gate'], Mumbai: ['gateway', 'Gateway of India'],
  Kolkata: ['bridge', 'Howrah Bridge'], Hyderabad: ['charminar', 'Charminar'], Jaipur: ['palace', 'Hawa Mahal'],
  Ludhiana: ['clock', 'Clock Tower'], Chandigarh: ['rock', 'Rock Garden'], Bengaluru: ['palace', 'Vidhana Soudha'],
  Chennai: ['lighthouse', 'Marina Lighthouse'], Lucknow: ['gate', 'Rumi Darwaza'], Ahmedabad: ['minarets', 'Sidi Saiyyed Mosque'],
  Bhopal: ['dome', 'Taj-ul-Masajid'], Guwahati: ['temple', 'Kamakhya Temple'], Srinagar: ['lake', 'Dal Lake'],
  Jalandhar: ['clock', 'Company Bagh'], Bathinda: ['fort', 'Qila Mubarak, Bathinda'], Mohali: ['stadium', 'PCA Stadium'],
  Pathankot: ['fort', 'Shahpurkandi Fort'], Firozpur: ['gate', 'Hussainiwala Memorial'], Sangrur: ['clock', 'Banasar Bagh'],
  Hoshiarpur: ['temple', 'Kamahi Devi Temple'], Moga: ['clock', 'Moga Clock Tower'],
}
const hashStr = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0 }
const WORLD_CITIES = [
  ['Tokyo', 139.69, 35.69, 'tower', 'Tokyo Tower'], ['Beijing', 116.40, 39.90, 'palace', 'Forbidden City'], ['Shanghai', 121.47, 31.23, 'tower', 'Oriental Pearl Tower'],
  ['Seoul', 126.98, 37.57, 'gate', 'Gyeongbokgung'], ['Bangkok', 100.50, 13.76, 'temple', 'Wat Arun'], ['Singapore', 103.82, 1.35, 'palace', 'Marina Bay Sands'],
  ['Jakarta', 106.85, -6.21, 'tower', 'Monas'], ['Manila', 120.98, 14.60, 'fort', 'Intramuros'], ['Dhaka', 90.41, 23.81, 'dome', 'National Parliament'],
  ['Karachi', 67.01, 24.86, 'dome', 'Mazar-e-Quaid'], ['Lahore', 74.34, 31.55, 'fort', 'Lahore Fort'], ['Kathmandu', 85.32, 27.72, 'temple', 'Swayambhunath'],
  ['Colombo', 79.86, 6.93, 'lighthouse', 'Colombo Lighthouse'], ['Kabul', 69.21, 34.56, 'fort', 'Bala Hissar'], ['Tehran', 51.39, 35.69, 'tower', 'Azadi Tower'],
  ['Dubai', 55.27, 25.20, 'tower', 'Burj Khalifa'], ['Riyadh', 46.68, 24.71, 'tower', 'Kingdom Centre'], ['Istanbul', 28.98, 41.01, 'dome', 'Hagia Sophia'],
  ['Cairo', 31.24, 30.04, 'pyramid', 'Pyramids of Giza'], ['Lagos', 3.38, 6.52, 'bridge', 'Third Mainland Bridge'], ['Nairobi', 36.82, -1.29, 'tower', 'KICC'],
  ['Johannesburg', 28.05, -26.20, 'tower', 'Hillbrow Tower'], ['Addis Ababa', 38.76, 9.03, 'dome', 'Holy Trinity Cathedral'], ['Kinshasa', 15.27, -4.44, 'monument', 'Lumumba Monument'],
  ['Moscow', 37.62, 55.76, 'dome', 'St Basil’s Cathedral'], ['London', -0.13, 51.51, 'clock', 'Big Ben'], ['Paris', 2.35, 48.86, 'tower', 'Eiffel Tower'],
  ['Berlin', 13.40, 52.52, 'gate', 'Brandenburg Gate'], ['Madrid', -3.70, 40.42, 'palace', 'Royal Palace'], ['Rome', 12.50, 41.90, 'stadium', 'Colosseum'],
  ['Athens', 23.73, 37.98, 'temple', 'Parthenon'], ['Stockholm', 18.07, 59.33, 'palace', 'Stockholm Palace'], ['New York', -74.01, 40.71, 'tower', 'Statue of Liberty'],
  ['Los Angeles', -118.24, 34.05, 'rock', 'Hollywood Hills'], ['Chicago', -87.63, 41.88, 'tower', 'Willis Tower'], ['Toronto', -79.38, 43.65, 'tower', 'CN Tower'],
  ['Mexico City', -99.13, 19.43, 'pyramid', 'Templo Mayor'], ['São Paulo', -46.63, -23.55, 'palace', 'Ibirapuera Palace'], ['Buenos Aires', -58.38, -34.60, 'tower', 'Obelisco'],
  ['Lima', -77.04, -12.05, 'palace', 'Plaza Mayor'], ['Bogotá', -74.07, 4.71, 'dome', 'Catedral Primada'], ['Sydney', 151.21, -33.87, 'opera', 'Sydney Opera House'],
  ['Melbourne', 144.96, -37.81, 'stadium', 'MCG'], ['Auckland', 174.76, -36.85, 'tower', 'Sky Tower'],
]
// one more operation in every other country (its capital or largest city), and a few more large cities
const MORE_CITIES = [
  ['Harare', 31.05, -17.83], ['Lusaka', 28.28, -15.42], ['Sanaa', 44.21, 15.35], ['Hanoi', 105.85, 21.03], ['Caracas', -66.90, 10.49], ['Port Vila', 168.32, -17.73], ['Tashkent', 69.24, 41.30], ['Montevideo', -56.16, -34.90], ['San Juan', -66.11, 18.47], ['Kyiv', 30.52, 50.45], ['Kampala', 32.58, 0.35], ['Ashgabat', 58.38, 37.95], ['Tunis', 10.18, 36.81], ['Port of Spain', -61.52, 10.66], ['Lomé', 1.23, 6.13], ['Dili', 125.57, -8.56], ['Dar es Salaam', 39.28, -6.79], ['Dushanbe', 68.78, 38.56], ['Taipei', 121.56, 25.03], ['Damascus', 36.29, 33.51], ['Bern', 7.45, 46.95], ['Mbabane', 31.14, -26.31], ['Paramaribo', -55.20, 5.85], ['Juba', 31.58, 4.86], ['Khartoum', 32.53, 15.50], ['Mogadishu', 45.32, 2.05], ['Hargeisa', 44.06, 9.56], ['Honiara', 159.96, -9.43], ['Bratislava', 17.11, 48.15], ['Ljubljana', 14.51, 46.06], ['Freetown', -13.23, 8.48], ['Belgrade', 20.46, 44.79], ['Dakar', -17.44, 14.69], ['Apia', -171.76, -13.83], ['Kigali', 30.06, -1.94], ['Bucharest', 26.10, 44.43], ['Doha', 51.53, 25.29], ['Lisbon', -9.14, 38.72], ['Warsaw', 21.01, 52.23], ['Asunción', -57.58, -25.26], ['Port Moresby', 147.18, -9.44], ['Panama City', -79.52, 8.98], ['Muscat', 58.41, 23.59], ['Oslo', 10.75, 59.91], ['Pyongyang', 125.76, 39.04], ['Niamey', 2.11, 13.51], ['Managua', -86.25, 12.13], ['Amsterdam', 4.90, 52.37], ['Windhoek', 17.08, -22.56], ['Maputo', 32.57, -25.97], ['Rabat', -6.84, 34.02], ['Laayoune', -13.20, 27.15], ['Podgorica', 19.26, 42.44], ['Ulaanbaatar', 106.92, 47.89], ['Chișinău', 28.86, 47.01], ['Port Louis', 57.50, -20.16], ['Nouakchott', -15.98, 18.08], ['Bamako', -8.00, 12.64], ['Kuala Lumpur', 101.69, 3.14], ['Lilongwe', 33.79, -13.96], ['Antananarivo', 47.52, -18.88], ['Skopje', 21.43, 42.00], ['Luxembourg', 6.13, 49.61], ['Vilnius', 25.28, 54.69], ['Tripoli', 13.19, 32.89], ['Monrovia', -10.80, 6.30], ['Maseru', 27.48, -29.31], ['Beirut', 35.50, 33.89], ['Riga', 24.11, 56.95], ['Vientiane', 102.63, 17.98], ['Bishkek', 74.59, 42.87], ['Kuwait City', 47.98, 29.38], ['Pristina', 21.17, 42.66], ['Astana', 71.45, 51.17], ['Almaty', 76.95, 43.24], ['Amman', 35.93, 31.95], ['Kingston', -76.79, 17.97], ['Tel Aviv', 34.78, 32.09], ['Ramallah', 35.20, 31.90], ['Dublin', -6.26, 53.35], ['Baghdad', 44.36, 33.31], ['Reykjavík', -21.94, 64.15], ['Budapest', 19.04, 47.50], ['Tegucigalpa', -87.21, 14.07], ['Port-au-Prince', -72.34, 18.54], ['Georgetown', -58.16, 6.80], ['Bissau', -15.60, 11.86], ['Conakry', -13.68, 9.64], ['Guatemala City', -90.51, 14.63], ['Accra', -0.19, 5.60], ['Tbilisi', 44.79, 41.72], ['Banjul', -16.58, 13.45], ['Libreville', 9.45, 0.42], ['Papeete', -149.57, -17.54], ['Nouméa', 166.46, -22.26], ['Helsinki', 24.94, 60.17], ['Suva', 178.44, -18.14], ['Tallinn', 24.75, 59.44], ['Asmara', 38.93, 15.32], ['Malabo', 8.78, 3.75], ['San Salvador', -89.19, 13.69], ['Quito', -78.47, -0.18], ['Santo Domingo', -69.93, 18.49], ['Djibouti', 43.15, 11.59], ['Nuuk', -51.72, 64.18], ['Copenhagen', 12.57, 55.68], ['Prague', 14.42, 50.08], ['Nicosia', 33.38, 35.19], ['Havana', -82.37, 23.11], ['Zagreb', 15.98, 45.81], ['Abidjan', -4.01, 5.36], ['San José', -84.09, 9.93], ['Brazzaville', 15.28, -4.27], ['Moroni', 43.26, -11.70], ['Santiago', -70.67, -33.45], ["N'Djamena", 15.04, 12.13], ['Bangui', 18.56, 4.39], ['Praia', -23.51, 14.93], ['Yaoundé', 11.50, 3.87], ['Phnom Penh', 104.92, 11.56], ['Yangon', 96.16, 16.87], ['Bujumbura', 29.36, -3.38], ['Ouagadougou', -1.52, 12.37], ['Sofia', 23.32, 42.70], ['Bandar Seri Begawan', 114.94, 4.90], ['Gaborone', 25.91, -24.65], ['Sarajevo', 18.41, 43.86], ['La Paz', -68.15, -16.50], ['Thimphu', 89.64, 27.47], ['Cotonou', 2.42, 6.37], ['Belize City', -88.20, 17.50], ['Brussels', 4.35, 50.85], ['Minsk', 27.56, 53.90], ['Nassau', -77.35, 25.05], ['Baku', 49.87, 40.41], ['Vienna', 16.37, 48.21], ['Yerevan', 44.51, 40.18], ['Luanda', 13.23, -8.84], ['Algiers', 3.06, 36.75], ['Tirana', 19.82, 41.33], ['Hong Kong', 114.17, 22.32], ['Rio de Janeiro', -43.17, -22.91], ['San Francisco', -122.42, 37.77], ['Vancouver', -123.12, 49.28], ['Miami', -80.19, 25.76], ['Osaka', 135.50, 34.69], ['Ho Chi Minh City', 106.70, 10.78], ['Casablanca', -7.59, 33.57], ['Kano', 8.52, 12.00], ['Saint Petersburg', 30.34, 59.93], ['Perth', 115.86, -31.95], ['Cape Town', 18.42, -33.92], ['Montreal', -73.57, 45.50], ['Mecca', 39.83, 21.42],
]
WORLD_CITIES.forEach(([n, , , kind, name]) => { SIGNATURE[n] = [kind, name] })
const WORLD_BIG = new Set(['Tokyo', 'Beijing', 'Shanghai', 'Dhaka', 'Karachi', 'Cairo', 'Lagos', 'Moscow', 'London', 'Paris', 'New York', 'Los Angeles', 'Mexico City', 'São Paulo', 'Istanbul', 'Jakarta'])
export const CITIES = [
  ...[...PUNJAB_CITIES, ...INDIA_CITIES, ['Chandigarh', ...ll(76.779, 30.734)]].map(([n, x, y]) => ({ n, x, y, R: BIG.has(n) ? 1000 : 640, india: true })),
  ...WORLD_CITIES.map(([n, lo, la]) => { const [x, y] = ll(lo, la); return { n, x, y, R: WORLD_BIG.has(n) ? 1000 : 760, india: false, tier: 1 } }),
  ...MORE_CITIES.map(([n, lo, la]) => { const [x, y] = ll(lo, la); return { n, x, y, R: 640, india: false, tier: 2 } }),
]
const plans = new Map()
export function planFor(c) {
  if (c.town ? c.L : plans.has(c.n)) return c.town ? c.L : plans.get(c.n)
  const id = c.key || c.n
  const rnd = mulberry(hashStr(id))
  const R = c.R, gap = 68 + rnd() * 34, rot = (rnd() - 0.5) * 0.55
  const lines = []
  for (let v = -R; v <= R; v += gap) lines.push(Math.round(v))
  const artRows = new Set([lines[Math.floor(lines.length * 0.35)], lines[Math.floor(lines.length * 0.7)]])
  const artCols = new Set([lines[Math.floor(lines.length * 0.3)], lines[Math.floor(lines.length * 0.62)]])
  const phase = rnd() * 6
  const edge = (a) => R * (0.82 + 0.18 * Math.sin(a * 3 + phase)) // an irregular city edge
  const inside = (x, y) => Math.hypot(x, y) < edge(Math.atan2(y, x))
  const sig = c.town ? ['monument', ''] : SIGNATURE[c.n] || ['monument', `${c.n} Town Hall`]
  const river = sig[0] === 'bridge' || sig[0] === 'lake' || rnd() < 0.45 ? { y0: (rnd() - 0.5) * R * 0.6, amp: 30 + rnd() * 50, f: 180 + rnd() * 200 } : null
  const ry = (x) => river.y0 + river.amp * Math.sin(x / river.f)
  const pois = []
  ;(c.village ? ['school'] : ['hospital', 'school', 'police', 'hospital']).forEach((kind) => {
    const a = rnd() * Math.PI * 2, d = R * (0.25 + rnd() * 0.45)
    pois.push({ kind, x: Math.cos(a) * d, y: Math.sin(a) * d, name: kind === 'hospital' ? 'Hospital' : kind === 'school' ? 'School' : 'Police' })
  })
  const station = c.village ? null : { x: lines[Math.floor(lines.length * 0.5)] + gap / 2, y: R * 0.55 }
  const cars = Array.from({ length: BIG.has(c.n) ? 70 : c.village ? 8 : c.town ? 22 : 40 }, () => {
    const row = rnd() < 0.5
    return { row, line: lines[Math.floor(rnd() * lines.length)], dir: rnd() < 0.5 ? 1 : -1, v: 14 + rnd() * 18, ph: rnd() * 4000, col: ['#c8433a', '#2f5d9e', '#e8e4da', '#3b3b40', '#d8a32e', '#5f8f62'][Math.floor(rnd() * 6)] }
  })
  const plan = { R, gap, rot, lines, artRows, artCols, inside, river, ry, pois, station, cars, sig, phase, seed: hashStr(id) }
  if (c.town) c.L = plan // towns come and go with the view, so their plans travel with them
  else plans.set(c.n, plan)
  return plan
}

// ── Towns: anywhere on land, one small town in most 7.5 km squares, so a close zoom always finds work going on.
// Each is placed and named deterministically from its square, so the same place always looks the same.
export const TOWN_CELL = 1500
export const VILLAGE_CELL = 600
const towns = new Map(), villages = new Map()
const COMPASS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
// where a place is, said the way people give directions: distance and bearing from the nearest city
function directions(x, y) {
  let near = { n: 'Patiala', x: MW / 2, y: MH / 2 }, nd = Math.hypot(x - near.x, y - near.y)
  for (const c of CITIES) { const d = Math.hypot(c.x - x, c.y - y); if (d < nd) { nd = d; near = c } }
  const dir = COMPASS[(Math.round(Math.atan2(y - near.y, x - near.x) / (Math.PI / 4)) + 8) % 8]
  const km = (nd * M_PER_UNIT) / 1000
  return `${km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString('en-IN')} km ${dir} of ${near.n}`
}
const clearOfCities = (x, y, R) => !(x > -700 && x < MW + 700 && y > -700 && y < MH + 700) && CITIES.every((c) => Math.hypot(c.x - x, c.y - y) > c.R + R + 200)
function makeTown(i, j) {
  const rnd = mulberry(hashStr(`town ${i},${j}`))
  if (rnd() > 0.9) return null
  const R = 260 + rnd() * 300
  const x = (i + 0.5) * TOWN_CELL + (rnd() - 0.5) * (TOWN_CELL - 2 * R - 120)
  const y = (j + 0.5) * TOWN_CELL + (rnd() - 0.5) * (TOWN_CELL - 2 * R - 120)
  if (!clearOfCities(x, y, R) || !onLand(x, y)) return null
  return { n: directions(x, y), key: `town ${i},${j}`, x, y, R, town: true, india: false }
}
const townAt = (i, j) => { const key = `${i},${j}`; if (!towns.has(key)) towns.set(key, makeTown(i, j)); return towns.get(key) }
function makeVillage(i, j) {
  const rnd = mulberry(hashStr(`village ${i},${j}`))
  if (rnd() > 0.8) return null
  const R = 110 + rnd() * 100
  const x = (i + 0.5) * VILLAGE_CELL + (rnd() - 0.5) * (VILLAGE_CELL - 2 * R - 60)
  const y = (j + 0.5) * VILLAGE_CELL + (rnd() - 0.5) * (VILLAGE_CELL - 2 * R - 60)
  // clear of any town nearby
  const ti = Math.floor(x / TOWN_CELL), tj = Math.floor(y / TOWN_CELL)
  for (let a = ti - 1; a <= ti + 1; a++) for (let b = tj - 1; b <= tj + 1; b++) { const t = townAt(a, b); if (t && Math.hypot(t.x - x, t.y - y) < t.R + R + 90) return null }
  if (!clearOfCities(x, y, R) || !onLand(x, y)) return null
  return { n: directions(x, y), key: `village ${i},${j}`, x, y, R, town: true, village: true, india: false }
}
function placesIn(view, pad, cell, get) {
  const out = []
  const i0 = Math.floor((view.x0 - pad) / cell), i1 = Math.floor((view.x1 + pad) / cell)
  const j0 = Math.floor((view.y0 - pad) / cell), j1 = Math.floor((view.y1 + pad) / cell)
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) return out
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const t = get(i, j); if (t) out.push(t) }
  return out
}
export const villagesIn = (view, pad = 0) => {
  const out = placesIn(view, pad, VILLAGE_CELL, (i, j) => { const key = `${i},${j}`; if (!villages.has(key)) villages.set(key, makeVillage(i, j)); return villages.get(key) })
  if (villages.size > 12000) [...villages.keys()].slice(0, 5000).forEach((q) => villages.delete(q))
  return out
}
/** The towns whose squares touch the view (plus a margin), created the first time they are needed. */
export function townsIn(view, pad = 0) {
  const out = placesIn(view, pad, TOWN_CELL, townAt)
  if (towns.size > 8000) [...towns.keys()].slice(0, 3000).forEach((q) => towns.delete(q))
  return out
}

// ── The countryside between places: fields, a grid of country roads with traffic, and ships on open water.
const seaCells = new Map()
const openSea = (i, j) => {
  const key = `${i},${j}`
  if (!seaCells.has(key)) { const C = TOWN_CELL, x = i * C, y = j * C; seaCells.set(key, ![[0.5, 0.5], [0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0, 0.5], [1, 0.5], [0.5, 1]].some(([a, b]) => onLand(x + a * C, y + b * C))) }
  return seaCells.get(key)
}
// rough boxes (lon, lon, lat, lat) for the world's big dry regions
const DESERTS = [[-17, 33, 15, 31], [34, 60, 14, 31], [69, 73.5, 24, 29.5], [52, 66, 27, 34], [118, 145, -30, -20], [94, 115, 38, 46], [-117, -105, 30, 37], [14, 25, -28, -18], [-71, -68, -27, -18], [55, 64, 37, 45]]
export function drawCountryside(ctx, dark, k, t, view) {
  const P = dark ? PALETTE.dark : PALETTE.light
  // ships, one in each square of open water
  if (k >= 0.05) {
    const i0 = Math.floor(view.x0 / TOWN_CELL), i1 = Math.floor(view.x1 / TOWN_CELL), j0 = Math.floor(view.y0 / TOWN_CELL), j1 = Math.floor(view.y1 / TOWN_CELL)
    if ((i1 - i0 + 1) * (j1 - j0 + 1) <= 120) for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (!openSea(i, j)) continue
      const rnd = mulberry(hashStr(`ship ${i},${j}`)), a = rnd() * Math.PI * 2, v = 6 + rnd() * 6, ph = rnd() * 2000
      const u = ((ph + t * v) % (TOWN_CELL * 0.8)) - TOWN_CELL * 0.4
      const x = (i + 0.5) * TOWN_CELL + Math.cos(a) * u, y = (j + 0.5) * TOWN_CELL + Math.sin(a) * u
      ctx.save(); ctx.translate(x, y); ctx.rotate(a)
      const s = Math.max(1, 3 / Math.sqrt(k))
      ctx.strokeStyle = dark ? 'rgba(200,220,230,0.25)' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2 * s
      ctx.beginPath(); ctx.moveTo(-6 * s, -2 * s); ctx.lineTo(-26 * s, -7 * s); ctx.moveTo(-6 * s, 2 * s); ctx.lineTo(-26 * s, 7 * s); ctx.stroke()
      ctx.fillStyle = dark ? '#8a8f96' : '#5d6670'
      ctx.beginPath(); ctx.moveTo(8 * s, 0); ctx.lineTo(3 * s, -2.6 * s); ctx.lineTo(-7 * s, -2.6 * s); ctx.lineTo(-7 * s, 2.6 * s); ctx.lineTo(3 * s, 2.6 * s); ctx.closePath(); ctx.fill()
      ctx.fillStyle = ['#c8433a', '#2f5d9e', '#d8a32e'][Math.floor(rnd() * 3)]; ctx.fillRect(-4 * s, -1.6 * s, 4 * s, 3.2 * s)
      ctx.restore()
    }
  }
  if (k < 0.25) return
  // fields and country roads only on land: clip to the coastlines on screen
  ctx.save()
  ctx.beginPath()
  LAND.forEach((b) => { if (!meets(b, view)) return; b.r.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath() })
  ctx.clip('nonzero')
  const F = VILLAGE_CELL / 2
  const fi0 = Math.floor(view.x0 / F), fi1 = Math.floor(view.x1 / F), fj0 = Math.floor(view.y0 / F), fj1 = Math.floor(view.y1 / F)
  // the ground follows the latitude: crops in the temperate belts, sand in the dry subtropics, forest in the far north and the tropics
  const BIOME = {
    crops: dark ? ['#1f2419', '#24231b', '#1c211d', '#22261c'] : ['#e3e6cf', '#ece3c7', '#dfe8d2', '#e8e0c4'],
    sand: dark ? ['#262219', '#29241a', '#24201a', '#2a2519'] : ['#f0e3c4', '#ecdcb8', '#f3e8cc', '#e9d8b0'],
    forest: dark ? ['#18211a', '#1a2419', '#162019', '#1b231b'] : ['#cfe0c4', '#c6dbbb', '#d4e3c8', '#c2d6b6'],
  }
  const lo = LON0 + ((view.x0 + view.x1) / 2 - MW / 2) / UX, la = LAT0 - ((view.y0 + view.y1) / 2 - MH / 2) / UY
  const crops = DESERTS.some(([a, b, c, d]) => lo >= a && lo <= b && la >= c && la <= d) ? BIOME.sand : Math.abs(la) > 55 || Math.abs(la) < 9 ? BIOME.forest : BIOME.crops
  if ((fi1 - fi0 + 1) * (fj1 - fj0 + 1) <= 600) for (let i = fi0; i <= fi1; i++) for (let j = fj0; j <= fj1; j++) {
    const x = i * F, y = j * F
    if (x > -700 && x < MW + 700 && y > -700 && y < MH + 700) continue // Patiala's own map
    const h = hashStr(`field ${i},${j}`)
    ctx.fillStyle = crops[h % 4]
    ctx.fillRect(x + 6, y + 6, F - 12, F - 12)
    // a tractor working some of the fields, up one furrow and back down the next
    if (k >= 0.5 && h % 3 !== 1) {
      const span = F - 40, lap = (t * (5 + (h % 5)) + (h % 977)) % (span * 2 * 6), row = Math.floor(lap / (span * 2)) , u = lap % (span * 2)
      const fwd = u < span, tx = x + 20 + (fwd ? u : span * 2 - u), ty = y + 22 + (row % 6) * ((F - 44) / 5)
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(120,100,60,0.18)'
      ctx.fillRect(fwd ? x + 20 : tx, ty - 1.6, fwd ? tx - x - 20 : x + 20 + span - tx, 3.2)
      ctx.fillStyle = ['#c8433a', '#3f7d3a', '#2f5d9e'][h % 3]
      ctx.beginPath(); ctx.roundRect(tx - 3, ty - 2, 6, 4, 1); ctx.fill()
      ctx.fillStyle = dark ? '#111' : '#333'; ctx.fillRect(tx + (fwd ? -3.6 : 2.2), ty - 2.6, 1.4, 5.2)
    }
    if (k >= 0.6 && h % 3 === 0) { ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(120,110,80,0.12)'; ctx.lineWidth = 1; for (let q = 14; q < F - 12; q += 9) { ctx.beginPath(); ctx.moveTo(x + 8, y + q); ctx.lineTo(x + F - 8, y + q); ctx.stroke() } }
  }
  // country roads along the village squares, each with a little traffic
  const R0 = Math.floor(view.x0 / VILLAGE_CELL), R1 = Math.floor(view.x1 / VILLAGE_CELL) + 1, C0 = Math.floor(view.y0 / VILLAGE_CELL), C1 = Math.floor(view.y1 / VILLAGE_CELL) + 1
  if ((R1 - R0) + (C1 - C0) <= 80) {
    ;[0, 1].forEach((pass) => {
      ctx.strokeStyle = pass ? P.road : P.casing
      ctx.lineWidth = pass ? 3.6 : 6
      for (let i = R0; i <= R1; i++) { const x = i * VILLAGE_CELL; ctx.beginPath(); ctx.moveTo(x, view.y0 - 10); ctx.lineTo(x, view.y1 + 10); ctx.stroke() }
      for (let j = C0; j <= C1; j++) { const y = j * VILLAGE_CELL; ctx.beginPath(); ctx.moveTo(view.x0 - 10, y); ctx.lineTo(view.x1 + 10, y); ctx.stroke() }
    })
    const car = (x, y, row, col) => { ctx.fillStyle = col; ctx.beginPath(); if (row) ctx.roundRect(x - 2.4, y - 1.2, 4.8, 2.4, 0.8); else ctx.roundRect(x - 1.2, y - 2.4, 2.4, 4.8, 0.8); ctx.fill() }
    const cols = ['#c8433a', '#2f5d9e', '#e8e4da', '#3b3b40', '#d8a32e', '#5f8f62']
    for (let i = R0; i <= R1; i++) for (let n = 0; n < 3; n++) {
      const h = hashStr(`col ${i} ${n}`), dir = h % 2 ? 1 : -1, y = (((h % 100000) + t * (12 + (h % 9)) * dir) % (VILLAGE_CELL * 40) + VILLAGE_CELL * 40) % (VILLAGE_CELL * 40)
      const yy = Math.floor(view.y0 / (VILLAGE_CELL * 40)) * VILLAGE_CELL * 40 + y
      car(i * VILLAGE_CELL + dir * 1.1, yy, false, cols[h % 6])
    }
    for (let j = C0; j <= C1; j++) for (let n = 0; n < 3; n++) {
      const h = hashStr(`row ${j} ${n}`), dir = h % 2 ? 1 : -1, x = (((h % 100000) + t * (12 + (h % 9)) * dir) % (VILLAGE_CELL * 40) + VILLAGE_CELL * 40) % (VILLAGE_CELL * 40)
      const xx = Math.floor(view.x0 / (VILLAGE_CELL * 40)) * VILLAGE_CELL * 40 + x
      car(xx, j * VILLAGE_CELL - dir * 1.1, true, cols[h % 6])
    }
  }
  ctx.restore()
}
/** Buildings and parks for a city, built the first time it is drawn close up. */
function detailFor(L) {
  if (L.cells) return L
  const rnd = mulberry(L.seed ^ 0x9e3779b9), { lines, gap, inside, river, ry } = L
  const cells = [], parks = []
  for (let i = 0; i < lines.length - 1; i++) for (let j = 0; j < lines.length - 1; j++) {
    const x0 = lines[i] + 7, x1 = lines[i + 1] - 7, y0 = lines[j] + 7, y1 = lines[j + 1] - 7
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    if (!inside(mx, my)) continue
    if (river && Math.abs(my - ry(mx)) < gap * 0.6) continue
    if (Math.hypot(mx, my) < gap * 0.8) continue // the centre is kept for the landmark
    if (rnd() < 0.06) { parks.push([x0, y0, x1 - x0, y1 - y0]); continue }
    const b = []
    for (let x = x0 + 2; x < x1 - 5; ) {
      const w = 8 + rnd() * 15
      for (let y = y0 + 2; y < y1 - 5; ) {
        const h = 8 + rnd() * 13, bw = Math.min(w, x1 - x - 2), bh = Math.min(h, y1 - y - 2)
        if (bw > 5 && bh > 5 && rnd() > 0.1) b.push([x, y, bw, bh, rnd()])
        y += h + 3
      }
      x += w + 3
    }
    cells.push(b)
  }
  L.cells = cells
  L.parks = parks
  return L
}
/** Draw every city whose plan is on screen. Patiala has its own hand-made map and is skipped. */
export function drawCities(ctx, dark, k, t, view, list = CITIES) {
  const P = dark ? PALETTE.dark : PALETTE.light
  list.forEach((c) => {
    if (c.x + c.R < view.x0 || c.x - c.R > view.x1 || c.y + c.R < view.y0 || c.y - c.R > view.y1) return
    const L = planFor(c), R = L.R
    if (k >= 0.12) detailFor(L)
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(L.rot)
    // built-up area
    ctx.fillStyle = dark ? '#202022' : '#ebe6dc'
    ctx.beginPath()
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) { const r = R * 1.02 * (0.82 + 0.18 * Math.sin(a * 3 + L.phase)); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) }
    ctx.fill()
    if (L.river) {
      ctx.beginPath()
      for (let x = -R * 1.6; x <= R * 1.6; x += 12) ctx.lineTo(x, L.ry(x) - 15)
      for (let x = R * 1.6; x >= -R * 1.6; x -= 12) ctx.lineTo(x, L.ry(x) + 15)
      ctx.closePath(); ctx.fillStyle = P.water; ctx.fill()
      if (k >= 0.5) {
        ctx.strokeStyle = dark ? 'rgba(150,190,210,0.25)' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2
        for (let i = 0; i < 80; i++) { const x = -R * 1.5 + ((i * 113 + t * 14) % (R * 3)); ctx.beginPath(); ctx.moveTo(x, L.ry(x) + ((i % 3) - 1) * 7); ctx.lineTo(x + 9, L.ry(x + 9) + ((i % 3) - 1) * 7); ctx.stroke() }
      }
    }
    ;(L.parks || []).forEach(([x, y, w, h]) => { ctx.fillStyle = P.park; ctx.fillRect(x, y, w, h) })
    // buildings, rising into 3D close up
    if (k >= 0.12) {
      const lift = Math.max(0, Math.min(1, (k - 1.05) / 0.6))
      const wall = dark ? '#202023' : '#cbc3b4', roof = dark ? '#34343a' : '#e9e4da'
      ctx.lineWidth = 0.6
      L.cells.forEach((b) => b.forEach(([x, y, w, h, e]) => {
        if (lift) {
          const z = (3 + e * 12) * lift, ox = -0.35 * z, oy = -0.6 * z
          ctx.fillStyle = wall
          ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + w + ox, y + oy); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x + ox, y + h + oy); ctx.closePath(); ctx.fill()
          ctx.fillStyle = roof; ctx.fillRect(x + ox, y + oy, w, h)
        } else { ctx.fillStyle = P.bldg; ctx.fillRect(x, y, w, h) }
      }))
    }
    // streets: casing then fill; arterials wider; a ring road
    const span = (v, row) => { const out = []; let on = null; for (let u = -R; u <= R; u += 10) { const ok = row ? L.inside(u, v) : L.inside(v, u); if (ok && on === null) on = u; if (!ok && on !== null) { out.push([on, u]); on = null } } if (on !== null) out.push([on, R]); return out }
    ;[0, 1].forEach((pass) => {
      L.lines.forEach((v) => {
        ;[true, false].forEach((row) => {
          const art = row ? L.artRows.has(v) : L.artCols.has(v)
          if (k < 0.08 && !art) return
          ctx.strokeStyle = pass ? (art ? P.art : P.road) : art ? P.artCase : P.casing
          ctx.lineWidth = (art ? 11 : 7) - (pass ? 2.2 : 0)
          span(v, row).forEach(([a, b]) => { ctx.beginPath(); if (row) { ctx.moveTo(a, v); ctx.lineTo(b, v) } else { ctx.moveTo(v, a); ctx.lineTo(v, b) } ctx.stroke() })
        })
      })
      ctx.strokeStyle = pass ? P.art : P.artCase
      ctx.lineWidth = 12 - (pass ? 2.4 : 0)
      ctx.beginPath(); ctx.arc(0, 0, R * 0.74, 0, 7); ctx.stroke()
    })
    // railway station on its line (villages have none)
    if (L.station) {
      ctx.strokeStyle = dark ? '#2e2c2a' : '#cfc7b8'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(-R * 1.4, L.station.y + 14); ctx.lineTo(R * 1.4, L.station.y + 14); ctx.stroke()
    }
    if (k >= 0.5) {
      if (L.station) {
        ctx.fillStyle = dark ? '#3b2f2a' : '#d9b48f'; ctx.fillRect(L.station.x - 40, L.station.y + 2, 80, 8)
        const tx = ((t * 40 + (L.seed % 997)) % (R * 3)) - R * 1.5
        for (let q = 0; q < 7; q++) { ctx.fillStyle = q ? (dark ? '#5d6b7c' : '#4f6b8a') : '#c8433a'; ctx.beginPath(); ctx.roundRect(tx - q * 15, L.station.y + 11.4, 13.5, 5.2, 1.6); ctx.fill() }
      }
      // traffic
      L.cars.forEach((car) => {
        const len = 2 * R, s0 = ((car.ph + t * car.v) % len) - R, pos = car.dir > 0 ? s0 : -s0
        const x = car.row ? pos : car.line - car.dir * 2.2, y = car.row ? car.line + car.dir * 2.2 : pos
        if (!L.inside(x, y)) return
        ctx.fillStyle = car.col
        ctx.beginPath(); if (car.row) ctx.roundRect(x - 2.4, y - 1.2, 4.8, 2.4, 0.8); else ctx.roundRect(x - 1.2, y - 2.4, 2.4, 4.8, 0.8); ctx.fill()
        if (dark) { ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(car.row ? x + car.dir * 2.6 : x, car.row ? y : y + car.dir * 2.6, 0.8, 0, 7); ctx.fill() }
      })
    }
    // the city's own landmark, in the middle
    if (k >= 0.12) drawSignature(ctx, L.sig[0], dark, t, L)
    // labels (screen-sized)
    if (k >= 0.35) {
      L.pois.forEach((p) => drawPoi(ctx, { ...p, name: p.name }, dark, k))
      const lab = L.sig[0] === 'bridge' ? [0, L.ry(0) + 22] : [0, ['goldtemple', 'palace', 'fort', 'stadium', 'lake', 'pyramid', 'opera', 'gateway'].includes(L.sig[0]) ? 32 : 14]
      if (L.sig[1]) screenText(ctx, L.sig[1], lab[0], lab[1], 9.5, { weight: 600, color: dark ? '#d9d2c5' : '#4a4236', dy: 12 })
      if (k >= 0.5 && L.station) screenText(ctx, 'Railway Station', L.station.x, L.station.y, 8.5, { color: P.label, dy: -4 })
    }
    ctx.restore()
    // the city name sits upright over its plan
    if (c.town) { if (k >= (c.village ? 0.25 : 0.06) && k < 0.6) screenText(ctx, c.n, c.x, c.y - R * 0.9, 9.5, { weight: 600, color: dark ? '#9d978b' : '#7a7366' }) }
    else if (k >= 0.02 && k < 0.6) screenText(ctx, c.n.toUpperCase().split('').join(' '), c.x, c.y - R * 0.86, 11, { weight: 700, color: dark ? '#b8b2a6' : '#6b6458' })
  })
}

/** The city (other than Patiala) whose marker is under a point, for tap-to-fly. */
export function cityAt(x, y, k) {
  // a marker is 16 px across far out; close in, the whole built-up area counts
  let best = null, bd = Infinity
  CITIES.forEach((c) => { const d = Math.hypot(c.x - x, c.y - y); if (d < Math.max(16 / k, c.R) && d < bd) { bd = d; best = c } })
  return best ? { c: best, d: bd } : null
}

function drawSignature(ctx, kind, dark, t, L) {
  const stone = dark ? '#6b5a48' : '#d6b88d', dk = dark ? '#3e3226' : '#a8865b', gold = '#e0b33a', white = dark ? '#cfc8bb' : '#f4f1ea'
  ctx.save()
  if (kind === 'goldtemple') {
    ctx.fillStyle = dark ? '#1d2e38' : '#b9d3dc'; ctx.fillRect(-34, -26, 68, 52)          // the sarovar
    ctx.fillStyle = white; ctx.fillRect(-36, -28, 72, 4); ctx.fillRect(-36, 24, 72, 4); ctx.fillRect(-36, -28, 4, 56); ctx.fillRect(32, -28, 4, 56)
    ctx.fillStyle = white; ctx.fillRect(-26, -2, 16, 4)                                       // causeway
    ctx.fillStyle = gold; ctx.fillRect(-10, -9, 20, 18)
    ctx.beginPath(); ctx.arc(0, -9, 7, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#fff3c4'; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2); ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill()
  } else if (kind === 'gate' || kind === 'gateway') {
    ctx.fillStyle = kind === 'gate' ? stone : '#d9c3a0'
    ctx.fillRect(-22, -18, 12, 36); ctx.fillRect(10, -18, 12, 36); ctx.fillRect(-22, -22, 44, 8)
    ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(0, -10, 10, Math.PI, 0); ctx.fill()
    if (kind === 'gateway') { ctx.fillStyle = stone; [-18, 0, 18].forEach((x) => { ctx.beginPath(); ctx.arc(x, -24, 4, Math.PI, 0); ctx.fill() }) }
    ctx.fillStyle = '#e8742a'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5); ctx.beginPath(); ctx.arc(0, 26, 2.4, 0, 7); ctx.fill()
  } else if (kind === 'bridge') {
    ctx.strokeStyle = dark ? '#8a8c90' : '#5d6168'; ctx.lineWidth = 2.4
    ctx.strokeRect(-60, L.ry(0) - 4, 120, 8)
    ctx.beginPath(); for (let x = -60; x <= 60; x += 12) { ctx.moveTo(x, L.ry(0) - 4); ctx.lineTo(x + 6, L.ry(0) - 22); ctx.lineTo(x + 12, L.ry(0) - 4) } ctx.stroke()
  } else if (kind === 'charminar' || kind === 'minarets') {
    ctx.fillStyle = stone; ctx.fillRect(-16, -14, 32, 28)
    ;[[-16, -14], [16, -14], [-16, 14], [16, 14]].forEach(([x, y]) => { ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = stone; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill() })
    ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill()
  } else if (kind === 'palace') {
    ctx.fillStyle = dark ? '#7a3f3a' : '#e3a08a'; ctx.fillRect(-30, -14, 60, 28)
    ctx.fillStyle = dark ? '#5a2f2a' : '#c87e66'; for (let x = -26; x < 28; x += 6) for (let y = -10; y < 12; y += 6) ctx.fillRect(x, y, 3, 3)
    ctx.fillStyle = gold; [-20, 0, 20].forEach((x) => { ctx.beginPath(); ctx.arc(x, -14, 4, Math.PI, 0); ctx.fill() })
  } else if (kind === 'clock') {
    ctx.fillStyle = dark ? '#5a463d' : '#c9a77c'; ctx.fillRect(-7, -7, 14, 14)
    ctx.fillStyle = white; ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, 7); ctx.fill()
    ctx.strokeStyle = '#222'; ctx.lineWidth = 0.8; const a = t * 0.8
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 3.6, Math.sin(a) * 3.6); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a / 12) * 2.4, Math.sin(a / 12) * 2.4); ctx.stroke()
  } else if (kind === 'rock') {
    ctx.fillStyle = dark ? '#4a4a40' : '#b8b09a'
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 6 + (i % 4) * 6; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + (i % 3), 0, 7); ctx.fill() }
    ctx.fillStyle = dark ? '#1d2e38' : '#b9d3dc'; ctx.beginPath(); ctx.ellipse(0, 22, 10, 4, 0, 0, 7); ctx.fill()
  } else if (kind === 'lighthouse') {
    ctx.fillStyle = white; ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(-3, -14); ctx.lineTo(3, -14); ctx.lineTo(6, 16); ctx.fill()
    ctx.fillStyle = '#c8433a'; ctx.fillRect(-4.5, -4, 9, 4); ctx.fillRect(-5.5, 6, 11, 4)
    ctx.save(); ctx.rotate(t * 1.2); ctx.fillStyle = 'rgba(255,230,140,0.35)'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(40, -26); ctx.lineTo(40, -2); ctx.fill(); ctx.restore()
  } else if (kind === 'lake') {
    ctx.fillStyle = dark ? '#1d2e38' : '#b9d3dc'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 22, 0, 0, 7); ctx.fill()
    for (let i = 0; i < 4; i++) { const x = -24 + i * 16 + Math.sin(t + i) * 3; ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.ellipse(x, -4 + (i % 2) * 8, 5, 1.6, 0, 0, 7); ctx.fill() }
  } else if (kind === 'stadium') {
    ctx.fillStyle = dark ? '#3a3a40' : '#c4c6ca'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 22, 0, 0, 7); ctx.fill()
    ctx.fillStyle = dark ? '#2b3a26' : '#8fbf6a'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-1.5, -6, 3, 12)
  } else if (kind === 'fort') {
    ctx.strokeStyle = stone; ctx.lineWidth = 4; ctx.strokeRect(-26, -20, 52, 40)
    ;[[-26, -20], [26, -20], [-26, 20], [26, 20]].forEach(([x, y]) => { ctx.fillStyle = stone; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill() })
  } else if (kind === 'temple') {
    ctx.fillStyle = dark ? '#a0522d' : '#d9822b'
    ctx.beginPath(); ctx.moveTo(-10, 12); ctx.quadraticCurveTo(-8, -8, 0, -16); ctx.quadraticCurveTo(8, -8, 10, 12); ctx.closePath(); ctx.fill()
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(0, -17, 1.8, 0, 7); ctx.fill()
  } else if (kind === 'dome') {
    ctx.fillStyle = white; ctx.fillRect(-20, -4, 40, 16)
    ctx.fillStyle = dark ? '#8a8c90' : '#e6e1d6'; [-12, 0, 12].forEach((x) => { ctx.beginPath(); ctx.arc(x, -4, 6, Math.PI, 0); ctx.fill() })
    ctx.fillStyle = stone; ctx.fillRect(-24, -16, 3, 28); ctx.fillRect(21, -16, 3, 28)
  } else if (kind === 'tower') {
    // a tall tower seen from above with its long shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(36, 22); ctx.lineTo(40, 18); ctx.lineTo(4, 0); ctx.fill()
    ctx.fillStyle = dark ? '#8a8c90' : '#9aa0a6'; ctx.beginPath(); ctx.moveTo(-9, 9); ctx.lineTo(0, -12); ctx.lineTo(9, 9); ctx.closePath(); ctx.fill()
    ctx.fillStyle = dark ? '#c9ccd1' : '#5d6168'; ctx.beginPath(); ctx.arc(0, -2, 3.2, 0, 7); ctx.fill()
    ctx.fillStyle = '#e5484d'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3); ctx.beginPath(); ctx.arc(0, -12, 1.6, 0, 7); ctx.fill()
  } else if (kind === 'pyramid') {
    ;[[-18, 6, 16], [6, -6, 12], [20, 12, 8]].forEach(([x, y, r]) => {
      ctx.fillStyle = '#d9b26a'; ctx.beginPath(); ctx.moveTo(x - r, y + r); ctx.lineTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#b98f4a'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x, y + r); ctx.closePath(); ctx.fill()
    })
  } else if (kind === 'opera') {
    ctx.fillStyle = dark ? '#1d2e38' : '#b9d3dc'; ctx.fillRect(-40, 6, 80, 20)
    ctx.fillStyle = white
    ;[[-16, 8], [-4, 10], [8, 8], [18, 6]].forEach(([x, r]) => { ctx.beginPath(); ctx.moveTo(x - r, 6); ctx.quadraticCurveTo(x - r * 0.2, -r * 1.6, x + r * 0.6, 6); ctx.closePath(); ctx.fill() })
  } else {
    ctx.fillStyle = stone; ctx.fillRect(-14, -10, 28, 20)
    ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(0, -10, 8, Math.PI, 0); ctx.fill()
  }
  ctx.restore()
}
