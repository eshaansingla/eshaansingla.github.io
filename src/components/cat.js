// A ginger tabby, drawn as one illustrated animal over a small skeleton (hip, shoulder, head, four two-bone legs
// and a tail chain): a single outlined silhouette with tapered legs, toed paws, a fluffy tail and ruffs, shaded
// as one body, with brush-stroke tabby stripes and a little fur texture, in the site's own orange.
// Local space: facing +x, the ground at y = 0, up is negative y. One unit is one CSS pixel before scaling.

export const POSES = {
  walk: { hip: [-20, -29], sh: [19, -30], head: [15, -12], tilt: 0.04, ear: 0, eye: 1, mouth: 0, tail: [1.05, 0.075, 0.1], gait: 1, mt: [-2, -8.5], tuck: 0 },
  run: { hip: [-23, -26], sh: [22, -26], head: [18, -6], tilt: 0.16, ear: 0.45, eye: 1, mouth: 0, tail: [0.25, 0.02, 0.16], gait: 1, mt: [-3, -8], tuck: 0 },
  sit: { hip: [-15, -11], sh: [3, -33], head: [5, -16], tilt: 0, ear: 0, eye: 1, mouth: 0, tail: [-0.55, -0.17, 0.03], gait: 0, mt: [-16, -1.5], tuck: 0,
    feet: { lf: [9, 0], rf: [6, 0], lh: [-5, 0], rh: [-3, 0] } },
  crouch: { hip: [-20, -19], sh: [18, -17], head: [15, -5], tilt: 0.12, ear: 0.85, eye: 1, mouth: 0, tail: [-0.1, 0.03, 0.05], gait: 0, mt: [-5, -7], tuck: 0,
    feet: { lf: [21, 0], rf: [24, 0], lh: [-17, 0], rh: [-14, 0] } },
  loaf: { hip: [-15, -12], sh: [13, -13], head: [11, -10], tilt: 0.05, ear: 0.1, eye: 0.35, mouth: 0, tail: [-0.45, -0.26, 0.02], gait: 0, mt: [-14, -1.5], tuck: 1,
    feet: { lf: [17, 0], rf: [15, 0], lh: [-6, 0], rh: [-4, 0] } },
  lie: { hip: [-16, -12.5], sh: [14, -12.5], head: [12, -7], tilt: 0.1, ear: 0, eye: 1, mouth: 0, tail: [-0.3, -0.12, 0.06], gait: 0, mt: [-4, -6.5], tuck: 0,
    feet: { lf: [21, -2], rf: [18, -1], lh: [-6, -2], rh: [-9, -1] } },
  rear: { hip: [-9, -12], sh: [3, -45], head: [7, -15], tilt: -0.25, ear: 0, eye: 1, mouth: 0, tail: [-0.35, -0.18, 0.06], gait: 0, mt: [-15, -1.5], tuck: 0,
    feet: { lf: [12, -30], rf: [9, -27], lh: [-3, 0], rh: [-1, 0] } },
  stretch: { hip: [-19, -31], sh: [15, -12], head: [17, -4], tilt: 0.25, ear: 0.2, eye: 0.3, mouth: 0, tail: [1.3, 0.05, 0.04], gait: 0, mt: [-2, -8.5], tuck: 0,
    feet: { lf: [34, 0], rf: [31, 0], lh: [-16, 0], rh: [-13, 0] } },
}

const lerp = (a, b, k) => a + (b - a) * k
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
const restFeet = (p) => ({ lf: [p.sh[0] + 3, 0], rf: [p.sh[0] + 3, 0], lh: [p.hip[0] + 3, 0], rh: [p.hip[0] + 3, 0] })

export function clonePose(p) {
  return JSON.parse(JSON.stringify({ feet: restFeet(p), ...p }))
}
export function easePose(cur, to, k) {
  for (const key of ['hip', 'sh', 'head', 'mt']) cur[key] = lerp2(cur[key], to[key], k)
  for (const key of ['tilt', 'ear', 'eye', 'mouth', 'gait', 'tuck']) cur[key] = lerp(cur[key], to[key], k)
  cur.tail = cur.tail.map((v, i) => lerp(v, to.tail[i], k))
  const tf = to.feet || restFeet(to)
  for (const leg of ['lf', 'rf', 'lh', 'rh']) cur.feet[leg] = lerp2(cur.feet[leg], tf[leg], k)
}

// ---------- colour ----------
const hex = (h) => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0) }
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
/** Fur colours built from the site's accent, so the cat is the same orange as the page. */
export function makePalette(accent) {
  const o = hex(accent || '#c2410c'), W = [255, 255, 255], K = [10, 4, 0]
  return {
    base: rgba(o), lit: rgba(mix(o, W, 0.22)), dark: rgba(mix(o, K, 0.32)), deep: rgba(mix(o, K, 0.55)),
    far: rgba(mix(o, K, 0.3)), farLit: rgba(mix(o, K, 0.14)), farDark: rgba(mix(o, K, 0.5)),
    light: rgba(mix(o, W, 0.4)), belly: rgba(mix(o, W, 0.6)), stripe: rgba(mix(o, K, 0.5), 0.32),
    stripeS: rgba(mix(o, K, 0.42), 0.5), line: rgba(mix(o, K, 0.72), 0.85), cream: rgba(mix(o, [255, 247, 236], 0.68)),
    creamA: rgba(mix(o, [255, 247, 236], 0.72), 0), hi: 'rgba(255,240,222,0.34)', hiA: 'rgba(255,240,222,0)',
    ear: '#eba49c', earDeep: '#c97c78', nose: '#d0817d', eye: '#b8c63c', eyeDeep: '#6f7c17',
  }
}

// ---------- geometry helpers ----------
function ik(root, target, a, b, bend) {
  let dx = target[0] - root[0], dy = target[1] - root[1]
  let d = Math.hypot(dx, dy)
  const max = a + b - 0.05
  if (d > max) { dx *= max / d; dy *= max / d; d = max }
  const cos = (a * a + d * d - b * b) / (2 * a * d)
  const t = Math.atan2(dy, dx) + Math.acos(Math.max(-1, Math.min(1, cos))) * bend
  return [[root[0] + Math.cos(t) * a, root[1] + Math.sin(t) * a], [root[0] + dx, root[1] + dy]]
}

// a smooth curve through points (Catmull-Rom as Béziers); `closed` joins the end back to the start
function through(path, pts, closed, skipMove) {
  const n = pts.length
  if (!skipMove) path.moveTo(pts[0][0], pts[0][1])
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i]
    const p2 = pts[closed ? (i + 1) % n : i + 1], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)]
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1])
  }
  if (closed) path.closePath()
  return path
}

// a limb, tail or stroke: a smooth outline round a spine of points, `w` wide at each, with a rounded end
function taper(pts, w, path = new Path2D(), capStart = false) {
  const n = pts.length
  const L = [], Rr = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0], ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l; ty /= l
    const nx = -ty, ny = tx, h = w[i] / 2
    L.push([pts[i][0] + nx * h, pts[i][1] + ny * h])
    Rr.push([pts[i][0] - nx * h, pts[i][1] - ny * h])
  }
  through(path, L, false)
  // round end
  const e = pts[n - 1], a = pts[n - 2]
  const ang = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0])
  const dirA = Math.atan2(e[1] - a[1], e[0] - a[0])
  const ccw = Math.sin(dirA - ang) < 0
  path.arc(e[0], e[1], w[n - 1] / 2, ang, ang + Math.PI, ccw)
  through(path, Rr.slice().reverse(), false, true)
  if (capStart) {
    const s0 = pts[0], s1 = pts[1], d = Math.atan2(s1[1] - s0[1], s1[0] - s0[0])
    path.arc(s0[0], s0[1], w[0] / 2, d - Math.PI / 2, d + Math.PI / 2, true)
  }
  path.closePath()
  return path
}

const rgbaZero = 'rgba(0,0,0,0)'
const ell = (x, y, rx, ry, rot = 0, path = new Path2D()) => { path.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); path.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return path }

function radial(ctx, x, y, r, c0, c1, r0 = 0) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r)
  g.addColorStop(0, c0); g.addColorStop(1, c1)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

// one shape group drawn as a single animal: outline every part, fill every part over it (so only the outer
// silhouette keeps its line), then shade and texture each part in the same world-space light
function layer(ctx, parts, fill, line, lineW, hole) {
  ctx.save()
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  ctx.strokeStyle = line; ctx.lineWidth = lineW
  if (hole) { // no outline inside this circle, where a part grows out of the body
    ctx.save()
    const cp = new Path2D(); cp.rect(-600, -600, 1200, 1200); cp.arc(hole[0], hole[1], hole[2], 0, Math.PI * 2)
    ctx.clip(cp, 'evenodd')
  }
  for (const [ph] of parts) ctx.stroke(ph)
  if (hole) ctx.restore()
  ctx.fillStyle = fill
  for (const [ph] of parts) ctx.fill(ph)
  for (const [ph, detail] of parts) if (detail) { ctx.save(); ctx.clip(ph); detail(); ctx.restore() }
  ctx.restore()
}

// fixed fur-texture flicks in body coordinates (along the spine 0..1, across -1..1), so they move with her
const FLICKS = Array.from({ length: 46 }, (_, i) => {
  const r = (k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) }
  return [r(1) * 1.25 - 0.18, r(2) * 2 - 1, 1.6 + r(3) * 2.2, r(4) - 0.5, r(5) > 0.45]
})

function eye(ctx, F, open, rx, ry, look, pupilW, side = 1) {
  if (open > 0.08) {
    const g = ctx.createRadialGradient(look[0] * 0.6, look[1] * 0.6, 0.2, 0, 0, rx)
    g.addColorStop(0, F.eye); g.addColorStop(1, F.eyeDeep)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry * open, 0, 0, Math.PI * 2); ctx.fill()
    ctx.save()
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry * open, 0, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = '#120b04'
    ctx.beginPath(); ctx.ellipse(look[0], look[1] * open, Math.max(0.45, rx * pupilW * 0.62), ry * 0.95, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath(); ctx.arc(look[0] + rx * 0.32, look[1] * open - ry * 0.36 * open, Math.max(0.38, rx * 0.18), 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath(); ctx.arc(look[0] - rx * 0.28, look[1] * open + ry * 0.4 * open, Math.max(0.2, rx * 0.08), 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(40,20,0,0.28)' // the upper lid's shadow
    ctx.beginPath(); ctx.ellipse(0, -ry * open * 1.05, rx * 1.2, ry * open * 0.55, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  ctx.strokeStyle = '#2e1808'; ctx.lineWidth = 0.8; ctx.lineCap = 'round'
  if (open > 0.08) {
    ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.03, Math.max(0.2, ry * open), 0, 0, Math.PI * 2); ctx.stroke()
    // a flick at the outer corner, like a lash line
    ctx.beginPath(); ctx.moveTo(side * rx * 0.95, -0.2); ctx.lineTo(side * rx * 1.35, -0.6); ctx.stroke()
  } else { ctx.beginPath(); ctx.moveTo(-rx, 0.1); ctx.quadraticCurveTo(0, ry * 0.6, rx * 1.2, -0.2); ctx.stroke() }
}

function whiskers(ctx, s, list) {
  ctx.strokeStyle = s.dark ? 'rgba(248,240,228,0.62)' : 'rgba(80,52,30,0.4)'
  ctx.lineWidth = 0.42
  for (const [x0, y0, ex, ey] of list) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + (ex - x0) * 0.5, y0 + (ey - y0) * 0.2, ex, ey); ctx.stroke() }
}

// ---------- heads ----------
function ear(cx, by, w, h, sgn, back, twitch) {
  // an ear as a curved triangle on base point (cx, by); sgn -1 left, 1 right; swings out and back when annoyed
  const rot = sgn * (0.2 + back * 0.75) + twitch
  const c = Math.cos(rot), s = Math.sin(rot)
  const R = ([x, y]) => [cx + x * c - y * s, by + x * s + y * c]
  const outer = new Path2D()
  const b0 = R([-w / 2, 1.5]), tip = R([sgn * 0.6, -h]), b1 = R([w / 2, 1.5])
  const m0 = R([-w * 0.42, -h * 0.55]), m1 = R([w * 0.36, -h * 0.5])
  outer.moveTo(...b0); outer.quadraticCurveTo(...m0, ...tip); outer.quadraticCurveTo(...m1, ...b1); outer.closePath()
  const inner = new Path2D()
  const i0 = R([-w * 0.3, 0.6]), it = R([sgn * 0.45, -h * 0.72]), i1 = R([w * 0.28, 0.6])
  inner.moveTo(...i0); inner.quadraticCurveTo(...R([-w * 0.26, -h * 0.4]), ...it); inner.quadraticCurveTo(...R([w * 0.22, -h * 0.38]), ...i1); inner.closePath()
  return { outer, inner, tufts: [[R([-w * 0.12, 0]), R([-w * 0.05, -h * 0.42])], [R([w * 0.1, 0]), R([w * 0.04, -h * 0.4])], [R([0, 0.2]), R([sgn * 0.2, -h * 0.5])]] }
}

function innerEar(ctx, F, e) {
  ctx.save()
  ctx.clip(e.inner)
  const g = ctx.createLinearGradient(...e.tufts[2][1], ...e.tufts[2][0])
  g.addColorStop(0, F.earDeep); g.addColorStop(1, F.ear)
  ctx.fillStyle = g; ctx.fill(e.inner)
  ctx.restore()
  ctx.strokeStyle = 'rgba(255,246,236,0.75)'; ctx.lineWidth = 0.35
  for (const [a, b] of e.tufts) { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke() }
}

function sideHead(ctx, s, F, p, line) {
  const t = s.t
  const tw = s.earTwitch ? Math.sin(t * 30) * 0.12 : 0
  const farEar = ear(-4.6, -7.2, 7.2, 10.5, -1, p.ear, 0)
  const nearEar = ear(0.2, -8, 7.6, 11, 1, p.ear * 0.9, tw)
  // the far ear, behind and darker
  layer(ctx, [[farEar.outer]], F.far, line, 1.3)
  const skull = through(new Path2D(), [
    [-9.6, -0.5], [-8.2, -5], [-4.6, -8.6], [0.8, -9.4], [5.2, -7.6], [8.6, -4.6], [11.6, -1.8], [12.9, 0.2], [12.4, 1.9],
    [10.8, 3.4], [9.6, 4.8], [7.6, 6.7], [3.6, 7.6], [0.4, 8.6], [-1.6, 7.7], [-3.4, 9.2], [-5.4, 7.6], [-7.6, 8.4], [-8.4, 5.6],
  ], true)
  layer(ctx, [[nearEar.outer], [skull, () => {
    const g = ctx.createLinearGradient(0, -10, 0, 9)
    g.addColorStop(0, F.dark); g.addColorStop(0.45, F.base); g.addColorStop(1, F.light)
    ctx.fillStyle = g; ctx.fillRect(-14, -12, 30, 24)
    radial(ctx, 1, -5.5, 7, F.hi, F.hiA)
    radial(ctx, 9.4, 2.6, 5.2, F.cream, F.creamA) // muzzle
    radial(ctx, 4.5, 6.4, 5, F.cream, F.creamA) // chin and throat
    // forehead and cheek stripes
    ctx.fillStyle = F.stripeS
    for (const [a, b, c] of [[[-2.6, -9.6], [-0.8, -6.4], [0.4, -4.2]], [[1, -9.4], [1.8, -6.6], [2.6, -5]], [[-6, -8], [-4.4, -5.6], [-3.4, -4]]]) ctx.fill(taper([a, b, c], [1.8, 1.1, 0.2]))
    for (const [a, b, c] of [[[-6.5, 1.5], [-3.5, 1], [-0.6, 1.8]], [[-6, 4.2], [-3.4, 3.8], [-1, 4.4]]]) ctx.fill(taper([a, b, c], [1.5, 1, 0.2]))
  }]], F.base, line, 1.4)
  innerEar(ctx, F, nearEar)
  const open = Math.max(0, Math.min(1, p.eye * (1 - (s.blink || 0))))
  const sl = s.look || [0, 0]
  ctx.save(); ctx.translate(5.4, -2.4); ctx.rotate(-0.16)
  eye(ctx, F, open, 2.7, 2.2, [Math.max(-1.2, Math.min(1.4, 0.5 + sl[0] * (s.dir || 1) * 1.2)), Math.max(-1, Math.min(1, sl[1] * 1.1))], s.pupil || 0.55)
  ctx.restore()
  // nose and mouth
  ctx.fillStyle = F.nose
  ctx.beginPath(); ctx.moveTo(11.6, -0.2); ctx.quadraticCurveTo(13.4, -0.3, 13.2, 0.9); ctx.quadraticCurveTo(12.6, 1.8, 11.9, 1.6); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = line; ctx.lineWidth = 0.6; ctx.lineCap = 'round'
  if (p.mouth > 0.05) {
    ctx.fillStyle = '#5b1f1c'; ctx.beginPath(); ctx.ellipse(10.4, 4.1 + p.mouth * 1.6, 2.4, 0.6 + p.mouth * 2.6, 0.25, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#d9737a'; ctx.beginPath(); ctx.ellipse(10, 5 + p.mouth * 2.5, 1.5, 0.4 + p.mouth * 1, 0.25, 0, Math.PI * 2); ctx.fill()
  } else { ctx.beginPath(); ctx.moveTo(12.4, 1.8); ctx.quadraticCurveTo(12, 3.4, 10.2, 3.9); ctx.stroke() }
  whiskers(ctx, s, [[10.6, 2.2, 23, -1.4], [10.6, 3, 23.6, 2.6], [10.4, 3.6, 22.2, 6.4]])
}

// the head turned to face the viewer, eyes following s.look (-1..1 each way)
function frontHead(ctx, s, F, p, line) {
  const t = s.t
  const lk = s.look || [0, 0]
  const turn = lk[0] * 1.3
  const tw = s.earTwitch ? Math.sin(t * 28) * 0.12 : 0
  const el = s.earLook || 0
  const L = ear(-6.6 + turn * 0.3, -7.2, 8.4, 11.4, -1, p.ear, el * 0.2)
  const Rr = ear(6.6 + turn * 0.3, -7.2, 8.4, 11.4, 1, p.ear, tw + el * 0.2)
  const fx = turn * 0.55
  const skull = through(new Path2D(), [
    [-6.8 + fx, -8.6], [-2.6 + fx, -10.4], [2.6 + fx, -10.4], [6.8 + fx, -8.6], [9.8, -5.2], [11.4, -1.2], [12.6, 2],
    [13.8, 3.4], [12.2, 4.4], [13.2, 5.8], [11, 6.8], [7.8 + fx, 8.8], [3 + fx, 10.1], [fx, 10.5], [-3 + fx, 10.1],
    [-7.8 + fx, 8.8], [-11, 6.8], [-13.2, 5.8], [-12.2, 4.4], [-13.8, 3.4], [-12.6, 2], [-11.4, -1.2], [-9.8, -5.2],
  ], true)
  const mx = turn
  layer(ctx, [[L.outer], [Rr.outer], [skull, () => {
    const g = ctx.createLinearGradient(0, -11, 0, 11)
    g.addColorStop(0, F.dark); g.addColorStop(0.5, F.base); g.addColorStop(1, F.light)
    ctx.fillStyle = g; ctx.fillRect(-16, -13, 32, 26)
    radial(ctx, fx - 1.5, -5.5, 8, F.hi, F.hiA)
    radial(ctx, mx - 2.6, 4.9, 4.6, F.cream, F.creamA) // muzzle pads
    radial(ctx, mx + 2.6, 4.9, 4.6, F.cream, F.creamA)
    radial(ctx, mx, 8.6, 4.4, F.cream, F.creamA) // chin
    radial(ctx, fx - 4.6, -0.6, 4.4, 'rgba(255,240,222,0.22)', F.hiA) // pale rims round the eyes
    radial(ctx, fx + 4.6, -0.6, 4.4, 'rgba(255,240,222,0.22)', F.hiA)
    // the tabby M on the forehead, and the cheek lines
    ctx.fillStyle = F.stripeS
    for (const [a, b, c] of [[[fx, -10.6], [fx - 0.1, -7.6], [fx, -5.2]], [[fx - 3.2, -10.2], [fx - 2.4, -7.6], [fx - 1.5, -5.8]], [[fx + 3.2, -10.2], [fx + 2.4, -7.6], [fx + 1.5, -5.8]],
      [[fx - 7, -8.4], [fx - 5.6, -6.6], [fx - 4.4, -5.2]], [[fx + 7, -8.4], [fx + 5.6, -6.6], [fx + 4.4, -5.2]]]) ctx.fill(taper([a, b, c], [1.9, 1.2, 0.25]))
    for (const sg of [-1, 1]) for (const [y0, y1] of [[1.2, 0.6], [3.6, 3.4]]) ctx.fill(taper([[sg * 12.8, y0], [sg * 10.6 + fx, (y0 + y1) / 2], [sg * 8.4 + fx, y1]], [1.6, 1.1, 0.2]))
  }]], F.base, line, 1.4)
  innerEar(ctx, F, L); innerEar(ctx, F, Rr)
  const open = Math.max(0, Math.min(1, p.eye * (1 - (s.blink || 0))))
  for (const sg of [-1, 1]) {
    ctx.save(); ctx.translate(sg * 4.7 + turn * 0.9, -0.6); ctx.rotate(sg * -0.14)
    eye(ctx, F, open, 3, 2.6, [Math.max(-1.6, Math.min(1.6, lk[0] * 1.7)), Math.max(-1.2, Math.min(1.2, lk[1] * 1.2))], s.pupil || 0.5, sg)
    ctx.restore()
  }
  // nose, mouth
  ctx.fillStyle = F.nose
  ctx.beginPath(); ctx.moveTo(mx - 1.9, 3.1); ctx.quadraticCurveTo(mx, 2.6, mx + 1.9, 3.1); ctx.quadraticCurveTo(mx + 0.9, 4.6, mx, 5); ctx.quadraticCurveTo(mx - 0.9, 4.6, mx - 1.9, 3.1); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(mx - 0.5, 3.4, 0.6, 0.3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = line; ctx.lineWidth = 0.6; ctx.lineCap = 'round'
  if (p.mouth > 0.05) {
    ctx.fillStyle = '#5b1f1c'; ctx.beginPath(); ctx.ellipse(mx, 7.2 + p.mouth * 1.4, 2.3 + p.mouth * 0.6, 0.6 + p.mouth * 2.9, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#d9737a'; ctx.beginPath(); ctx.ellipse(mx, 8 + p.mouth * 2.5, 1.5, 0.4 + p.mouth * 1.1, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fbf6ee'
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(mx + sg * 1.9, 6.8); ctx.lineTo(mx + sg * 1.5, 7.8 + p.mouth); ctx.lineTo(mx + sg * 1.1, 6.8); ctx.fill() }
  } else {
    ctx.beginPath(); ctx.moveTo(mx, 5); ctx.lineTo(mx, 6.2); ctx.quadraticCurveTo(mx - 1.2, 7.4, mx - 2.5, 6.5); ctx.moveTo(mx, 6.2); ctx.quadraticCurveTo(mx + 1.2, 7.4, mx + 2.5, 6.5); ctx.stroke()
  }
  const w = []
  for (const sg of [-1, 1]) for (const [dy, ey] of [[-0.2, -2.6], [0.6, 1.4], [1.4, 5]]) w.push([mx + sg * 4.4, 5.4 + dy, mx + sg * 17.5, 5 + ey])
  whiskers(ctx, s, w)
}

/**
 * Draw the cat. s: { pose, cyc, gaitKind, t, dark, palette, dir, breath, purr, blink, look, face, pupil, groom, paw2,
 *   scratch, flick, swish, earTwitch, earLook, headTilt, headPush, tailHook, claws, headScale }
 * Returns a box around the body and head in local units, for hit testing, and the head's centre.
 */
export function drawCat(ctx, s) {
  const F = s.palette || makePalette()
  const p = s.pose
  const t = s.t
  const line = F.line
  const run = s.gaitKind === 'run'
  const bob = p.gait * Math.sin(s.cyc * Math.PI * 4) * (run ? 1.8 : 0.7)
  const br = (s.breath || 0) * Math.sin(t * 2.2) * 0.7
  const pr = s.purr ? Math.sin(t * 150) * 0.22 : 0
  const hip = [p.hip[0], p.hip[1] + bob + br * 0.5 + pr]
  const sh = [p.sh[0], p.sh[1] + bob * 0.8 + br + pr]

  const duty = run ? 0.45 : 0.62, stride = run ? 30 : 26, lift = run ? 9 : 6
  const phase = run ? { lh: 0, rf: 0.05, rh: 0.5, lf: 0.55 } : { lh: 0, lf: 0.25, rh: 0.5, rf: 0.75 }
  const gaitFoot = (leg) => {
    const rest = (leg[1] === 'f' ? p.sh[0] : p.hip[0]) + 3
    const c = (((s.cyc + phase[leg]) % 1) + 1) % 1
    if (c < duty) return [rest + stride / 2 - stride * (c / duty), 0]
    const w = (c - duty) / (1 - duty), e = w * w * (3 - 2 * w)
    return [rest - stride / 2 + stride * e, -lift * Math.sin(Math.PI * w)]
  }
  const foot = (leg) => lerp2(p.feet[leg], gaitFoot(leg), p.gait)

  const u0 = [sh[0] - hip[0], sh[1] - hip[1]]
  const L = Math.hypot(u0[0], u0[1])
  const u = [u0[0] / L, u0[1] / L]
  const n = [u[1], -u[0]]
  const P = (a, b) => [hip[0] + u[0] * a + n[0] * b, hip[1] + u[1] * a + n[1] * b]

  // ---- floor shadow: a soft pool under the body ----
  const sx0 = Math.min(hip[0], sh[0]) - 16, sx1 = Math.max(hip[0], sh[0]) + 18
  const cx = (sx0 + sx1) / 2 + 3, rx = (sx1 - sx0) / 2 + 6
  ctx.save()
  ctx.translate(cx, 0.6); ctx.scale(1, 4.2 / rx)
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  sg.addColorStop(0, s.dark ? 'rgba(0,0,0,0.5)' : 'rgba(70,40,15,0.22)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // ---- tail: a fluffy taper along the chain; along the floor it lies on the ground ----
  const back = Math.atan2(-u[1], -u[0])
  const [lift0, curl, amp] = p.tail
  const tail = [P(-6.5, 5.5)]
  for (let i = 1; i <= 15; i++) {
    const k = i / 15
    const a = back + lift0 + curl * i + amp * Math.sin(t * (s.flick ? 9 : 2.2) - i * 0.42) * (0.3 + k)
      + (s.swish || 0) * Math.sin(t * 5.5 - i * 0.5) * k + (s.tailHook || 0) * Math.max(0, i - 9) * 0.42
    const prev = tail[i - 1]
    let tx = prev[0] + Math.cos(a) * 4.1, ty = prev[1] + Math.sin(a) * 4.1
    if (ty > -2.3) { // on the floor the tail lies along it rather than bunching up
      const dy = -2.3 - prev[1]
      tx = prev[0] + (Math.cos(a) >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, 16.81 - dy * dy)); ty = -2.3
    }
    tail.push([tx, ty])
  }
  // thick where it grows out of the rump, then a long even plume to a rounded tip
  const tw = tail.map((_, i) => { const k = i / 15; return 4.8 + 6.4 * Math.pow(1 - k, 2.2) + 0.9 * Math.sin(k * Math.PI) })
  const tailPath = taper(tail, tw, new Path2D(), true)
  // wrapped round in front of her, the tail still grows from behind: the part before it reaches the
  // floor is drawn behind the body, the rest in front
  let wrapAt = tail.findIndex((q, i) => i > 1 && q[1] >= -2.31)
  if (wrapAt < 0 || wrapAt > 9) wrapAt = 4
  const tailBackPath = taper(tail.slice(0, wrapAt + 2), tw.slice(0, wrapAt + 2), new Path2D(), true)
  const tailFrontPath = taper(tail.slice(wrapAt), tw.slice(wrapAt), new Path2D(), true)
  const tailHole = [tail[wrapAt][0], tail[wrapAt][1], tw[wrapAt] / 2 + 1.2]
  // the tail is furred and lit like the rest of her: darker along its top, pale underneath like her
  // belly, tabby rings brushed down from the top that fade before the underside, and the same fur flicks
  const tailUp = tail.map((q, i) => {
    const a = tail[Math.max(0, i - 1)], b = tail[Math.min(15, i + 1)]
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
    let nx = -dy / l, ny = dx / l
    if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny } // the side facing up
    return [nx, ny]
  })
  const tailOff = (k) => tail.map((q, i) => [q[0] + tailUp[i][0] * tw[i] * k, q[1] + tailUp[i][1] * tw[i] * k])
  const tailDetail = () => {
    ctx.fillStyle = F.base; ctx.fillRect(-140, -140, 280, 280)
    ctx.fillStyle = F.light; ctx.globalAlpha = 0.55; ctx.fill(taper(tailOff(-0.34), tw.map((w) => w * 0.5))); ctx.globalAlpha = 1
    ctx.fillStyle = F.dark; ctx.globalAlpha = 0.6; ctx.fill(taper(tailOff(0.36), tw.map((w) => w * 0.4))); ctx.globalAlpha = 1
    radial(ctx, ...tail[4], 9, F.hi, F.hiA)
    // rings: brush strokes from the top edge down, like the stripes on her back
    ctx.fillStyle = F.stripeS
    for (let i = 2; i < 15; i += 2) {
      const q = tail[i], [ux, uy] = tailUp[i], h = tw[i] / 2
      const along = [tail[i + 1][0] - q[0], tail[i + 1][1] - q[1]]
      ctx.fill(taper([[q[0] + ux * (h + 1), q[1] + uy * (h + 1)], [q[0] + along[0] * 0.15, q[1] + along[1] * 0.15], [q[0] - ux * h * 0.55 + along[0] * 0.3, q[1] - uy * h * 0.55 + along[1] * 0.3]], [2.8 + h * 0.2, 2, 0.3]))
    }
    radial(ctx, ...tail[15], 5, F.stripeS, rgbaZero)
    // fur flicks pointing back along the tail
    ctx.lineWidth = 0.45; ctx.lineCap = 'round'
    for (let i = 1; i < 15; i++) {
      const q = tail[i], n2 = tail[i + 1], [ux, uy] = tailUp[i]
      for (const [k, lightF] of [[0.3, false], [-0.15, true], [-0.4, true]]) {
        const x = q[0] + ux * tw[i] * k, y = q[1] + uy * tw[i] * k
        ctx.strokeStyle = lightF ? 'rgba(255,238,218,0.22)' : 'rgba(70,30,5,0.18)'
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (n2[0] - q[0]) * 0.55 - ux * 0.6, y + (n2[1] - q[1]) * 0.55 - uy * 0.6); ctx.stroke()
      }
    }
    // where it leaves the body it takes on the body's own light
    radial(ctx, ...tail[0], 9, F.base, rgbaZero)
  }

  // ---- legs: tapered from a full thigh or shoulder to a slim ankle, ending in a toed paw ----
  // how far through its swing a foot is (0 planted, 1 at the top of its step)
  const swingOf = (leg) => p.gait * Math.max(0, Math.min(1, -gaitFoot(leg)[1] / lift))
  const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
  const lowSh = Math.max(0, Math.min(1, (sh[1] + 20) / 6)) * (1 - p.gait) // lying or loafing: forearms flat
  const legGeo = (far) => {
    const fl = far ? 'rf' : 'lf', hl = far ? 'rh' : 'lh'
    const off = far ? 2.6 : 0
    // hind: hip, the knee forward, the hock back, the long foot down to the paw. Mid-step the foot
    // folds back under the hock and the paw trails
    const scratching = s.scratch && !far
    const hp = [hip[0] + off, hip[1] + 1]
    const sw = swingOf(hl)
    const pawH = scratching ? s.scratch.slice() : foot(hl); pawH[0] += off
    const mt = rot(p.mt, sw * 0.65)
    const hock = scratching ? [pawH[0] - 9, pawH[1] + 7] : [pawH[0] + mt[0], pawH[1] + mt[1]]
    const [knee] = ik(hp, hock, 15, 14, scratching ? -1 : 1)
    if (knee[1] > -2.5) knee[1] = -2.5
    const hind = taper([[hp[0] - 2, hp[1] - 3], hp, knee, hock, pawH], far ? [14, 13, 7.6, 5, 4.6] : [16, 15.5, 8.4, 5.6, 5])
    const pr = sw * 0.5
    const hindPaw = ell(pawH[0] + Math.cos(pr) * 1.8, pawH[1] - 1.9 + Math.sin(pr) * 1.8, 4.5, 2.7, pr)
    // front: shoulder, the elbow tucked back against the chest, a long straight forearm, the wrist.
    // Mid-step the wrist lifts and the paw curls back under it
    const spt = [sh[0] + off - 1, sh[1] + 3]
    const fsw = swingOf(fl)
    const pawF = foot(fl); pawF[0] += off
    const raised = (s.groom && !far) || (s.paw2 && far)
    let target = raised ? (far ? [s.paw2[0] - off, s.paw2[1]] : s.groom) : [pawF[0] - 1 - fsw * 1.5, pawF[1] - 2.2 - fsw * 2.2]
    // of the two ways the elbow can bend, a cat's is the lower one, behind
    const A = ik(spt, target, 10.5, 19, 1), B = ik(spt, target, 10.5, 19, -1)
    let [elbow, wrist] = raised ? (A[0][1] > B[0][1] ? A : B) : (A[0][0] < B[0][0] ? A : B)
    if (lowSh > 0) elbow = lerp2(elbow, [wrist[0] - 17, -3.4], lowSh)
    if (elbow[1] > -3) elbow = [elbow[0], -3]
    const front = taper([[spt[0], spt[1] - 4], spt, elbow, wrist], far ? [10, 10, 6.6, 4.8] : [12, 11.5, 7.4, 5.2])
    // a raised paw points along the forearm and spreads its toes when the claws come out
    const pa = raised ? Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]) : fsw * 1.25
    const spread = raised && !far ? (s.claws || 0) : 0
    const po = raised ? [Math.cos(pa) * 1.9, Math.sin(pa) * 1.9] : rot([1.9, 0.5], pa)
    const frontPaw = ell(wrist[0] + po[0], wrist[1] + po[1], 4.6 + spread * 0.5, 2.8 + spread * 0.7, pa)
    return { hind, hindPaw, front, frontPaw, knee, hock, pawH, elbow, wrist, raised, hp, pa, pr }
  }
  const pawDetail = (pawPt, rot) => () => {
    ctx.fillStyle = F.light; ctx.fillRect(-140, -140, 280, 280)
    ctx.strokeStyle = 'rgba(60,30,10,0.45)'; ctx.lineWidth = 0.45
    for (const dx of [0.6, 2.4]) {
      ctx.beginPath()
      ctx.moveTo(pawPt[0] + dx + Math.cos(rot) * 2.4, pawPt[1] + Math.sin(rot) * 2.4 - 1)
      ctx.lineTo(pawPt[0] + dx + Math.cos(rot) * 3.2, pawPt[1] + Math.sin(rot) * 3.2 + 0.4)
      ctx.stroke()
    }
  }
  const tuck = p.tuck >= 0.5
  const farG = !tuck ? legGeo(true) : null
  const nearG = !tuck ? legGeo(false) : null

  // ---- body: one silhouette, deep chest, tucked waist, round rump ----
  const bodyPts = [P(-13.5, 2), P(-9, 11), P(-1, 11.6), P(L * 0.5, 9.8), P(L * 0.86, 11.3), P(L + 4, 9.4), P(L + 10.5, 1.4),
    P(L + 10, -6.5), P(L + 4, -12.6), P(L * 0.62, -11.4), P(L * 0.32, -10.6), P(2, -11.6), P(-9, -7.4)]
  const body = through(new Path2D(), bodyPts, true)
  const hc = [sh[0] + p.head[0] + (s.headPush || 0), sh[1] + p.head[1] + br * 0.4 + (s.headPush || 0) * 0.3]
  const neck = taper([P(L - 2, 4), P(L + 4, 6), [hc[0] - 2, hc[1] + 3]], [17, 15, 12])
  // the ruff of longer fur on the chest
  const ruffPts = []
  for (let i = 0; i <= 10; i++) {
    const a = -0.4 + (i / 10) * 1.9
    const r = 7.2 + (i % 2) * 0.9
    const c = P(L + 5, -4.5)
    ruffPts.push([c[0] + Math.cos(a) * r * u[0] - Math.sin(a) * r * n[0], c[1] + Math.cos(a) * r * u[1] - Math.sin(a) * r * n[1]])
  }
  const ruff = through(new Path2D(), [P(L + 2, 1), ...ruffPts, P(L, -9)], true)

  const bodyDetail = () => {
    // one light over the whole animal: back in shade, flank lit, belly pale
    const g = ctx.createLinearGradient(...P(L / 2, 15), ...P(L / 2, -15))
    g.addColorStop(0, F.dark); g.addColorStop(0.28, F.base); g.addColorStop(0.7, F.base); g.addColorStop(1, F.light)
    ctx.fillStyle = g; ctx.fillRect(-140, -140, 280, 280)
    radial(ctx, ...P(L * 0.82, 6), 15, F.hi, F.hiA) // shoulder
    radial(ctx, ...P(-1, 5), 14, F.hi, F.hiA) // haunch
    radial(ctx, ...P(L + 6, -5), 10, F.cream, F.creamA) // chest
    radial(ctx, ...P(L * 0.5, -17), L * 0.75, 'rgba(40,15,0,0.26)', 'rgba(40,15,0,0)') // under the belly
    // tabby stripes: brush strokes down from the spine, thick at the top, fading out
    ctx.fillStyle = F.stripeS
    for (let i = 0; i < 7; i++) {
      const a = -8 + (i * (L + 10)) / 6.4
      const len = i % 2 ? 9 : 12
      ctx.fill(taper([P(a + 1, 12.5), P(a + 2.6, 8), P(a + 1.2, 12.5 - len)], [3.4, 2.4, 0.3]))
    }
    // fur texture
    ctx.lineWidth = 0.5; ctx.lineCap = 'round'
    for (const [fa, fb, fl, fj, light] of FLICKS) {
      const q = P(-8 + fa * (L + 14), fb * 9)
      const ang = Math.atan2(-u[1], -u[0]) + 0.5 + fj
      ctx.strokeStyle = light ? 'rgba(255,238,218,0.2)' : 'rgba(70,30,5,0.16)'
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(ang) * fl, q[1] + Math.sin(ang) * fl); ctx.stroke()
    }
  }
  const legDetail = (g, top) => () => {
    // the body's own light runs on down the leg, then the fur pales towards the paw
    bodyDetail()
    const lg = ctx.createLinearGradient(0, top * 0.45, 0, 0)
    lg.addColorStop(0, F.creamA); lg.addColorStop(1, F.cream)
    ctx.fillStyle = lg; ctx.fillRect(-140, -140, 280, 280)
    // a few rings round the legs, and the line of the thigh muscle
    ctx.fillStyle = F.stripeS
    for (const [a, b] of [[g.knee, g.hock], [g.elbow, g.wrist]]) {
      for (const k of [0.25, 0.6]) {
        const q = lerp2(a, b, k), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
        const nx = -dy / l, ny = dx / l
        ctx.fill(taper([[q[0] + nx * 4, q[1] + ny * 4], q, [q[0] - nx * 4, q[1] - ny * 4]], [1.6, 2, 1.6]))
      }
    }
    radial(ctx, g.hp[0] + 1, g.hp[1] - 2, 11, F.hi, F.hiA)
  }

  // ---- draw: far legs, tail if behind, body with near legs, tail if in front, head ----
  if (farG) {
    const farShade = () => {
      const g = ctx.createLinearGradient(0, -30, 0, 0)
      g.addColorStop(0, F.far); g.addColorStop(0.6, F.far); g.addColorStop(1, F.farLit)
      ctx.fillStyle = g; ctx.fillRect(-140, -140, 280, 280)
    }
    layer(ctx, [[farG.hind, farShade], [farG.front, farShade], [farG.hindPaw, farShade], [farG.frontPaw, farShade]], F.far, line, 1.3)
  }
  const tailBehind = p.tail[0] > -0.2
  // behind her, the tail is drawn in the same pass as the body, so it grows out of her with no seam
  const parts = [[tailBehind ? tailPath : tailBackPath, tailDetail]]
  parts.push([body, bodyDetail], [neck, bodyDetail], [ruff, bodyDetail])
  // sitting or lying, the thigh bunches into a round haunch
  const hs = Math.max(0, Math.min(1, (hip[1] + 21) / 8)) * (1 - p.gait)
  if (hs > 0.05 && !tuck) parts.push([ell(hip[0] + 2, hip[1] + 1 - hs, 8 + hs * 5, 6 + hs * 4.5, Math.atan2(u[1], u[0]) * 0.5), () => { bodyDetail(); radial(ctx, hip[0] + 4, hip[1] - 3, 10, F.hi, F.hiA) }])
  if (nearG) {
    parts.push([nearG.hind, legDetail(nearG, -30)], [nearG.front, legDetail(nearG, -34)])
    parts.push([nearG.hindPaw, pawDetail(nearG.pawH, nearG.pr)], [nearG.frontPaw, pawDetail(nearG.wrist, nearG.pa)])
  } else {
    // loafing: paws tucked under the chest, haunch rounded
    parts.push([ell(sh[0] + 7, -2, 4.8, 2.3), pawDetail([sh[0] + 5, -2], 0)], [ell(hip[0] + 2, -4, 8, 4.2), bodyDetail])
  }
  layer(ctx, parts, F.base, line, 1.5)
  // inner contours: where a near leg or the haunch lies over the body, a soft line keeps it readable
  ctx.save()
  ctx.strokeStyle = s.dark ? 'rgba(40,14,0,0.55)' : 'rgba(70,28,6,0.5)'; ctx.lineWidth = 0.9; ctx.lineJoin = 'round'
  if (hs > 0.05 && !tuck) {
    ctx.beginPath(); ctx.ellipse(hip[0] + 2, hip[1] + 1 - hs, 8 + hs * 5, 6 + hs * 4.5, Math.atan2(u[1], u[0]) * 0.5, -0.5, 1.9); ctx.stroke()
  }
  if (nearG) {
    const cp = new Path2D(); cp.rect(-600, -600, 1200, 1200)
    cp.arc(nearG.hp[0], nearG.hp[1] - 2, 10, 0, Math.PI * 2)
    cp.moveTo(sh[0] + 6, sh[1] + 1); cp.arc(sh[0] - 1, sh[1] + 1, 7, 0, Math.PI * 2)
    ctx.clip(cp, 'evenodd')
    ctx.stroke(nearG.hind); ctx.stroke(nearG.front)
  }
  ctx.restore()
  if (nearG) {
    // the crease where the thigh meets the belly, and the elbow
    ctx.strokeStyle = 'rgba(70,30,5,0.3)'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'
    const k = nearG.knee, h = nearG.hp
    ctx.beginPath(); ctx.moveTo(h[0] + 7, h[1] - 3); ctx.quadraticCurveTo(k[0] + 5, (h[1] + k[1]) / 2, k[0] + 2.5, k[1] - 0.5); ctx.stroke()
  }
  const drawClaws = () => {
    if (!(s.claws && nearG && nearG.raised)) return
    // claws out: little hooks fanned from the toes, along the line of the forearm
    const w = nearG.wrist, e = nearG.elbow
    const a = Math.atan2(w[1] - e[1], w[0] - e[0])
    ctx.save(); ctx.translate(w[0] + Math.cos(a) * 1.9, w[1] + Math.sin(a) * 1.9); ctx.rotate(a)
    ctx.fillStyle = '#fbf7f0'; ctx.strokeStyle = 'rgba(70,40,20,0.55)'; ctx.lineWidth = 0.3
    for (const k of [-1, -0.33, 0.33, 1]) {
      ctx.save(); ctx.translate(3.9, k * 2); ctx.rotate(k * 0.35 * s.claws)
      const L2 = 2.6 * s.claws
      ctx.beginPath(); ctx.moveTo(0, -0.45); ctx.quadraticCurveTo(L2 * 0.8, -0.6, L2, 0.9); ctx.quadraticCurveTo(L2 * 0.55, 0.1, 0, 0.45); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.restore()
    }
    ctx.restore()
  }
  // a paw raised to batting height comes up in front of her face
  const armUp = nearG && nearG.raised && nearG.wrist[1] < hc[1] + 9
  if (!armUp) drawClaws()
  if (!tailBehind) layer(ctx, [[tailFrontPath, tailDetail]], F.base, line, 1.4, tailHole)

  // ---- head ----
  const face = s.face || 0
  ctx.save()
  ctx.translate(hc[0], hc[1])
  ctx.rotate(p.tilt + (s.headTilt || 0))
  if (s.headScale) ctx.scale(s.headScale, 1) // keeps the head full width while the body swings round
  if (face < 1) { ctx.save(); ctx.globalAlpha = 1 - face; sideHead(ctx, s, F, p, line); ctx.restore() }
  if (face > 0) {
    ctx.save(); ctx.globalAlpha = face
    ctx.translate(2.5 * face, 0)
    if (s.dir < 0) ctx.scale(-1, 1) // keep the face the right way round when the body is mirrored
    frontHead(ctx, s, F, p, line)
    ctx.restore()
  }
  ctx.restore()

  if (armUp) {
    const spt = [sh[0] - 1, sh[1] + 3]
    layer(ctx, [[nearG.front, legDetail(nearG, -34)], [nearG.frontPaw, pawDetail(nearG.wrist, nearG.pa)]], F.base, line, 1.4, [spt[0], spt[1], 7])
    drawClaws()
  }

  const xs = [hip[0] - 14, sh[0] + 12, hc[0] + 14], ys = [Math.min(hip[1], sh[1]) - 12, hc[1] - 20]
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: 0, head: hc }
}
