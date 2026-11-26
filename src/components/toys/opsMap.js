/*
 * The city for the Sanchaalan Saathi figure: a street graph with a river crossed only at bridges, plus everything
 * needed to draw it like a real map and to route volunteers along its roads.
 * Map units: 760 × 420, 1 unit ≈ 5 m.
 */

export const MW = 760, MH = 420
export const M_PER_UNIT = 5

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
        if (bw > 5 && bh > 5 && (y + bh < midY - 24 || y > midY + 24) && rnd() > 0.08) buildings.push([x, y, bw, bh, rnd()])
        y += h + 3
      }
      x += w + 3
    }
  }
})()

const PALETTE = {
  light: { land: '#efebe3', bldg: '#ded8cc', bldgEdge: '#d2cabb', road: '#ffffff', casing: '#d3cbbd', art: '#fdf1d6', artCase: '#e3c98e', water: '#b9d3dc', waterEdge: '#9fc0cc', park: '#d4e3c0', tree: '#b5cd9a', label: '#7a7468', area: '#9a9285', closed: '#d64545' },
  dark: { land: '#1c1c1e', bldg: '#29292c', bldgEdge: '#323236', road: '#3b3b3f', casing: '#121214', art: '#4a4337', artCase: '#141210', water: '#1d2e38', waterEdge: '#26404d', park: '#1f2b1c', tree: '#2b3a26', label: '#8d877c', area: '#6d685f', closed: '#ff5a5a' },
}

/** Base map: land, river, park, buildings, roads with casing, bridges, closures, labels, POIs. */
export function drawMap(ctx, dark, closed, k) {
  const P = dark ? PALETTE.dark : PALETTE.light
  ctx.fillStyle = P.land
  ctx.fillRect(-MW, -MH, MW * 3, MH * 3)

  // river
  ctx.beginPath()
  for (let x = -20; x <= MW + 20; x += 10) ctx.lineTo(x, riverY(x) - 17)
  for (let x = MW + 20; x >= -20; x -= 10) ctx.lineTo(x, riverY(x) + 17)
  ctx.closePath()
  ctx.fillStyle = P.water
  ctx.fill()
  ctx.strokeStyle = P.waterEdge
  ctx.lineWidth = 1
  ctx.stroke()

  // park with trees
  ctx.fillStyle = P.park
  ctx.beginPath(); ctx.roundRect(PARK.x0 + 10, PARK.y0 + 10, PARK.x1 - PARK.x0 - 20, PARK.y1 - PARK.y0 - 20, 6); ctx.fill()
  const tr = mulberry(3)
  ctx.fillStyle = P.tree
  for (let n = 0; n < 34; n++) {
    ctx.beginPath(); ctx.arc(PARK.x0 + 16 + tr() * (PARK.x1 - PARK.x0 - 32), PARK.y0 + 16 + tr() * (PARK.y1 - PARK.y0 - 32), 2 + tr() * 2.5, 0, 7); ctx.fill()
  }

  // buildings
  ctx.fillStyle = P.bldg
  ctx.strokeStyle = P.bldgEdge
  ctx.lineWidth = 0.6
  buildings.forEach(([x, y, w, h]) => { ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6) })

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
  ctx.lineCap = 'butt'
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

  // labels scale down as the map zooms so they stay the same size on screen
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
