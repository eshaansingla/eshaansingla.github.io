// A ginger cat drawn from a small skeleton: hip, shoulder, head, four two-bone legs and a tail chain,
// shaded as solid forms (light from above and in front), in the site's own orange.
// Local space: facing +x, the ground at y = 0, up is negative y. One unit is one CSS pixel before scaling.

export const POSES = {
  walk: { hip: [-20, -29], sh: [19, -30], head: [15, -12], tilt: 0.04, ear: 0, eye: 1, mouth: 0, tail: [1.05, 0.075, 0.1], gait: 1, mt: [-2, -8.5], tuck: 0 },
  run: { hip: [-23, -26], sh: [22, -26], head: [18, -6], tilt: 0.16, ear: 0.45, eye: 1, mouth: 0, tail: [0.25, 0.02, 0.16], gait: 1, mt: [-3, -8], tuck: 0 },
  sit: { hip: [-15, -11], sh: [3, -33], head: [5, -16], tilt: 0, ear: 0, eye: 1, mouth: 0, tail: [-0.55, -0.22, 0.03], gait: 0, mt: [-16, -1.5], tuck: 0,
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
/** Colour codes for the flat, pixel look: the caller recolours them after snapping to the pixel grid. */
export const FLAT = {
  flat: true, base: '#ff0000', lit: '#ff0000', dark: '#ff0000', deep: '#ff0000', far: '#00ff00', farLit: '#00ff00', farDark: '#00ff00',
  light: '#ff0000', belly: '#ff0000', stripe: '#ff0000', ear: '#ff0000', nose: '#ff0000', eye: '#0000ff', eyeDeep: '#0000ff', mouth: '#0000ff',
}
export function makePalette(accent) {
  const o = hex(accent || '#c2410c'), W = [255, 255, 255], K = [10, 4, 0]
  return {
    base: rgba(o), lit: rgba(mix(o, W, 0.22)), dark: rgba(mix(o, K, 0.32)), deep: rgba(mix(o, K, 0.55)),
    far: rgba(mix(o, K, 0.3)), farLit: rgba(mix(o, K, 0.14)), farDark: rgba(mix(o, K, 0.5)),
    light: rgba(mix(o, W, 0.4)), belly: rgba(mix(o, W, 0.6)), stripe: rgba(mix(o, K, 0.5), 0.32),
    ear: '#eba49c', nose: '#c66f6a', eye: '#b8c63c', eyeDeep: '#7d8a1e',
  }
}

// ---------- shapes ----------
function ik(root, target, a, b, bend) {
  let dx = target[0] - root[0], dy = target[1] - root[1]
  let d = Math.hypot(dx, dy)
  const max = a + b - 0.05
  if (d > max) { dx *= max / d; dy *= max / d; d = max }
  const cos = (a * a + d * d - b * b) / (2 * a * d)
  const t = Math.atan2(dy, dx) + Math.acos(Math.max(-1, Math.min(1, cos))) * bend
  return [[root[0] + Math.cos(t) * a, root[1] + Math.sin(t) * a], [root[0] + dx, root[1] + dy]]
}

// a tapered limb segment, shaded like a cylinder lit from above
function capsule(ctx, a, b, wa, wb, shade) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1
  const nx = -dy / L, ny = dx / L
  if (shade) {
    const up = ny <= 0 ? 1 : -1, w = Math.max(wa, wb) / 2
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    const g = ctx.createLinearGradient(mx + nx * w * up, my + ny * w * up, mx - nx * w * up, my - ny * w * up)
    g.addColorStop(0, shade[0]); g.addColorStop(0.42, shade[1]); g.addColorStop(1, shade[2])
    ctx.fillStyle = g
  }
  ctx.beginPath()
  ctx.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2)
  ctx.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2)
  ctx.arc(b[0], b[1], wb / 2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true)
  ctx.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2)
  ctx.arc(a[0], a[1], wa / 2, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true)
  ctx.fill()
}

function smooth(ctx, pts) {
  const n = pts.length
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1])
  }
  ctx.closePath()
}

function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill() }

// sphere-ish shading: bright towards the upper front, dark underneath
function ball(ctx, x, y, rx, ry, F, rot = 0) {
  const g = ctx.createRadialGradient(x + rx * 0.25, y - ry * 0.45, Math.min(rx, ry) * 0.15, x, y, Math.max(rx, ry) * 1.15)
  g.addColorStop(0, F.lit); g.addColorStop(0.55, F.base); g.addColorStop(1, F.dark)
  ctx.fillStyle = g
  ellipse(ctx, x, y, rx, ry, rot)
}

function eye(ctx, F, open, rx, ry, look, pupilW) {
  if (F.flat) {
    // a solid black eye, or a line when shut
    ctx.fillStyle = F.eye
    const lx = Math.max(-1, Math.min(1, look[0])) * 1.1, ly = Math.max(-1, Math.min(1, look[1])) * 0.8
    if (open > 0.3) ctx.fillRect(-1.4 + lx, -2.3 + ly, 2.8, 4.6 * Math.min(1, open + 0.2))
    else ctx.fillRect(-2.2, -0.2, 4.4, 1.4)
    return
  }
  if (open > 0.08) {
    const g = ctx.createRadialGradient(look[0] * 0.6, look[1] * 0.6, 0.2, 0, 0, rx)
    g.addColorStop(0, F.eye); g.addColorStop(1, F.eyeDeep)
    ctx.fillStyle = g
    ellipse(ctx, 0, 0, rx, ry * open)
    ctx.save()
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry * open, 0, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = '#140d05'
    ellipse(ctx, look[0], look[1] * open, Math.max(0.45, rx * pupilW * 0.62), ry * 0.92)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.arc(look[0] + rx * 0.3, look[1] * open - ry * 0.35 * open, Math.max(0.35, rx * 0.17), 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(40,20,0,0.25)'
    ellipse(ctx, 0, -ry * open * 1.05, rx * 1.2, ry * open * 0.55)
    ctx.restore()
  }
  ctx.strokeStyle = '#3a200c'; ctx.lineWidth = 0.75
  if (open > 0.08) { ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.02, Math.max(0.2, ry * open), 0, 0, Math.PI * 2); ctx.stroke() }
  else { ctx.beginPath(); ctx.moveTo(-rx, 0.1); ctx.quadraticCurveTo(0, ry * 0.55, rx, 0.1); ctx.stroke() }
}

function whiskers(ctx, s, list) {
  if (s.flat) return
  ctx.strokeStyle = s.dark ? 'rgba(248,240,228,0.6)' : 'rgba(80,52,30,0.38)'
  ctx.lineWidth = 0.45
  for (const [x0, y0, ex, ey] of list) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + (ex - x0) * 0.5, y0 + (ey - y0) * 0.25, ex, ey); ctx.stroke() }
}

// ---------- heads ----------
function sideHead(ctx, s, F, p) {
  const t = s.t
  const ear = (near) => {
    ctx.save()
    ctx.translate(near ? 0.5 : -4.5, -6.5)
    ctx.rotate(-p.ear * 0.75 + (s.earTwitch && near ? Math.sin(t * 30) * 0.15 : 0))
    ctx.fillStyle = near ? F.base : F.far
    ctx.beginPath(); ctx.moveTo(-4.6, 1.5); ctx.quadraticCurveTo(-3.2, -6, -1.2, -10.5); ctx.quadraticCurveTo(2.5, -5, 4.6, 0.5); ctx.closePath(); ctx.fill()
    if (near) {
      ctx.fillStyle = F.ear
      ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.quadraticCurveTo(-1.8, -4.5, -1, -7.2); ctx.quadraticCurveTo(1.2, -3.8, 2.4, -0.3); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
  ear(false)
  ball(ctx, 0, -0.5, 10.2, 8.8, F)
  ball(ctx, 2.5, 3, 9, 6.2, F, 0.1)
  const mg = ctx.createRadialGradient(9.5, 1.5, 0.5, 9.2, 2.6, 5)
  mg.addColorStop(0, F.belly); mg.addColorStop(1, F.light)
  ctx.fillStyle = mg
  ellipse(ctx, 9.2, 2.6, 4.4, 3.6, 0.15)
  ctx.strokeStyle = F.stripe; ctx.lineWidth = 1.3; ctx.lineCap = 'round'
  for (const [x0, y0, x1, y1] of [[-2, -8.6, 1, -4.5], [1.5, -8.4, 3.2, -4.8], [-5.5, -7, -2.5, -3.6]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke() }
  ear(true)
  const open = Math.max(0, Math.min(1, p.eye * (1 - (s.blink || 0))))
  ctx.save(); ctx.translate(5.6, -1.6); if (!F.flat) ctx.rotate(-0.12)
  const sl = s.look || [0, 0]
  eye(ctx, F, open, 2.7, 2.3, [Math.max(-1.2, Math.min(1.4, 0.5 + sl[0] * (s.dir || 1) * 1.2)), Math.max(-1, Math.min(1, sl[1] * 1.1))], s.pupil || 0.55)
  ctx.restore()
  ctx.fillStyle = F.nose
  ctx.beginPath(); ctx.moveTo(12.4, 0.2); ctx.lineTo(13.6, 0.6); ctx.lineTo(12.9, 1.9); ctx.closePath(); ctx.fill()
  if (p.mouth > 0.05) {
    ctx.fillStyle = F.mouth || '#5b1f1c'; ellipse(ctx, 10.6, 4.4 + p.mouth * 1.6, 2.6, 0.6 + p.mouth * 2.8, 0.25)
    ctx.fillStyle = '#d9737a'; ellipse(ctx, 10.2, 5.4 + p.mouth * 2.6, 1.6, 0.4 + p.mouth * 1.1, 0.25)
  } else {
    ctx.strokeStyle = F.deep; ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(12.9, 1.9); ctx.quadraticCurveTo(12.4, 3.8, 10.4, 4.1); ctx.stroke()
  }
  whiskers(ctx, s, [[10.5, 2.2, 23, -1], [10.5, 3, 23.5, 3], [10.5, 3.6, 22, 6.5]])
}

// the head turned to face the viewer, eyes following s.look (-1..1 each way)
function frontHead(ctx, s, F, p) {
  const t = s.t
  const lk = s.look || [0, 0]
  const turn = lk[0] * 1.4
  const ear = (sgn) => {
    ctx.save()
    ctx.translate(sgn * 6.4 + turn * 0.3, -7.2)
    ctx.rotate(sgn * (0.18 + p.ear * 0.7) + (s.earTwitch && sgn > 0 ? Math.sin(t * 28) * 0.12 : 0) + (s.earLook || 0) * 0.2)
    const g = ctx.createLinearGradient(0, -12, 0, 2)
    g.addColorStop(0, F.dark); g.addColorStop(1, F.base)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(-4.8, 1.8); ctx.quadraticCurveTo(-3, -6, -0.2, -11.5); ctx.quadraticCurveTo(3, -6, 4.8, 1.8); ctx.closePath(); ctx.fill()
    ctx.fillStyle = F.ear
    ctx.beginPath(); ctx.moveTo(-2.8, 0.6); ctx.quadraticCurveTo(-1.7, -4.5, -0.2, -8); ctx.quadraticCurveTo(1.7, -4.5, 2.8, 0.6); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,240,230,0.6)'; ctx.lineWidth = 0.35
    for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * 1.2, 0); ctx.lineTo(k * 0.6, -4.5); ctx.stroke() }
    ctx.restore()
  }
  ear(-1); ear(1)
  ball(ctx, turn * 0.4, -1, 11.2, 9.6, F)
  ball(ctx, turn * 0.5, 3.2, 12.4, 7.6, F)
  ctx.strokeStyle = F.stripe; ctx.lineWidth = 1.2; ctx.lineCap = 'round'
  const fx = turn * 0.6
  for (const [x0, y0, x1, y1] of [[-0.2, -9.8, 0.2, -5], [-3, -9.3, -1.6, -5.6], [3, -9.3, 1.8, -5.6], [-6, -7.6, -4.2, -5]]) { ctx.beginPath(); ctx.moveTo(x0 + fx, y0); ctx.lineTo(x1 + fx, y1); ctx.stroke() }
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 8.5 + fx, 1.5); ctx.quadraticCurveTo(sg * 10.5 + fx, 2.5, sg * 11.6 + fx, 1); ctx.stroke() }
  const mx = turn
  const mg = ctx.createRadialGradient(mx, 4.2, 0.5, mx, 5.2, 6.5)
  mg.addColorStop(0, F.belly); mg.addColorStop(1, F.light)
  ctx.fillStyle = mg
  ellipse(ctx, mx - 2.5, 5.6, 3.4, 2.7); ellipse(ctx, mx + 2.5, 5.6, 3.4, 2.7); ellipse(ctx, mx, 8.2, 2.8, 1.8)
  const open = Math.max(0, Math.min(1, p.eye * (1 - (s.blink || 0))))
  for (const sg of [-1, 1]) {
    ctx.save(); ctx.translate(sg * 4.7 + turn * 0.9, -0.4); if (!F.flat) ctx.rotate(sg * -0.16)
    eye(ctx, F, open, 2.9, 2.5, [Math.max(-1.6, Math.min(1.6, lk[0] * 1.7)), Math.max(-1.2, Math.min(1.2, lk[1] * 1.2))], s.pupil || 0.5)
    ctx.restore()
  }
  ctx.fillStyle = F.nose
  ctx.beginPath(); ctx.moveTo(mx - 1.6, 3.2); ctx.lineTo(mx + 1.6, 3.2); ctx.lineTo(mx, 5); ctx.closePath(); ctx.fill()
  if (p.mouth > 0.05) {
    ctx.fillStyle = F.mouth || '#5b1f1c'; ellipse(ctx, mx, 7.4 + p.mouth * 1.4, 2.4 + p.mouth * 0.6, 0.6 + p.mouth * 3)
    ctx.fillStyle = '#d9737a'; ellipse(ctx, mx, 8.2 + p.mouth * 2.6, 1.6, 0.4 + p.mouth * 1.2)
    ctx.fillStyle = '#fbf6ee'
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(mx + sg * 1.9, 6.9); ctx.lineTo(mx + sg * 1.5, 7.9 + p.mouth); ctx.lineTo(mx + sg * 1.1, 6.9); ctx.fill() }
  } else {
    ctx.strokeStyle = F.deep; ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(mx, 5); ctx.lineTo(mx, 6.2); ctx.quadraticCurveTo(mx - 1.2, 7.4, mx - 2.4, 6.6); ctx.moveTo(mx, 6.2); ctx.quadraticCurveTo(mx + 1.2, 7.4, mx + 2.4, 6.6); ctx.stroke()
  }
  const w = []
  for (const sg of [-1, 1]) for (const [dy, ey] of [[-0.2, -2.5], [0.6, 1.5], [1.4, 5]]) w.push([mx + sg * 4.6, 5.4 + dy, mx + sg * 17, 5 + ey])
  whiskers(ctx, s, w)
}

/**
 * Draw the cat. s: { pose, cyc, gaitKind, t, dark, palette, dir, breath, purr, blink, look, face, pupil, groom, flick, swish, earTwitch, headTilt }
 * Returns a box around the body and head in local units, for hit testing.
 */
export function drawCat(ctx, s) {
  const F = s.palette || makePalette()
  const p = s.pose
  const t = s.t
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

  // floor shadow: a soft pool under the body
  if (!F.flat) {
  const sx0 = Math.min(hip[0], sh[0]) - 16, sx1 = Math.max(hip[0], sh[0]) + 18
  const cx = (sx0 + sx1) / 2 + 3, rx = (sx1 - sx0) / 2 + 6
  ctx.save()
  ctx.translate(cx, 0.6); ctx.scale(1, 4.2 / rx)
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  sg.addColorStop(0, s.dark ? 'rgba(0,0,0,0.55)' : 'rgba(70,40,15,0.24)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  }

  // tail chain; it lies along the floor instead of going through it
  const back = Math.atan2(-u[1], -u[0])
  const [lift0, curl, amp] = p.tail
  const tail = [P(-10, 7)]
  for (let i = 1; i <= 15; i++) {
    const k = i / 15
    const a = back + lift0 + curl * i + amp * Math.sin(t * (s.flick ? 9 : 2.4) - i * 0.45) * (0.3 + k) + (s.swish || 0) * Math.sin(t * 6 - i * 0.5) * k + (s.tailHook || 0) * Math.max(0, i - 9) * 0.42
    const prev = tail[i - 1]
    tail.push([prev[0] + Math.cos(a) * 4.1, Math.min(-2, prev[1] + Math.sin(a) * 4.1)])
  }
  const tailDraw = () => {
    for (let i = 1; i < tail.length; i++) {
      const k = i / tail.length
      const ring = i % 3 === 0 || i > tail.length - 3
      capsule(ctx, tail[i - 1], tail[i], lerp(8.4, 4, k), lerp(8.4, 4, k + 1 / tail.length), ring ? [F.dark, F.dark, F.deep] : [F.lit, F.base, F.dark])
    }
  }

  const legs = (far) => {
    const fl = far ? 'rf' : 'lf', hl = far ? 'rh' : 'lh'
    const off = far ? 2.5 : 0
    const sh3 = far ? [F.farLit, F.far, F.farDark] : [F.lit, F.base, F.dark]
    const hp = [hip[0] + off, hip[1] + 2]
    const scratching = s.scratch && !far
    const pawH = scratching ? s.scratch.slice() : foot(hl); pawH[0] += off
    const hock = scratching ? [pawH[0] - 9, pawH[1] + 7] : [pawH[0] + p.mt[0], pawH[1] + p.mt[1]]
    const [knee] = ik(hp, hock, 15, 14, scratching ? -1 : 1)
    capsule(ctx, hp, knee, 11, 6.5, sh3)
    if (!far) {
      // the thigh muscle, which is most of what you see of a cat's back leg
      const mx = hp[0] * 0.55 + knee[0] * 0.45, my = hp[1] * 0.55 + knee[1] * 0.45
      const th = Math.atan2(knee[1] - hp[1], knee[0] - hp[0])
      const tg = ctx.createRadialGradient(mx - 2, my - 5, 1.5, mx, my, 13.5)
      tg.addColorStop(0, F.lit); tg.addColorStop(0.5, F.base); tg.addColorStop(1, F.dark)
      ctx.fillStyle = tg
      ellipse(ctx, mx, my, 12.5, 9.5, th)
      ctx.strokeStyle = F.stripe; ctx.lineWidth = 2.1
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(mx, my, 8 + k * 2.6, 6 + k * 2, th, -2.4, -1.2); ctx.stroke() }
    }
    capsule(ctx, knee, hock, 6.2, 4.2, sh3)
    capsule(ctx, hock, pawH, 4.2, 3.8, sh3)
    ctx.fillStyle = far ? F.far : F.light
    ellipse(ctx, pawH[0] + 1.5, pawH[1] - 1.6, 3.6, 2.1)
    const sp = [sh[0] + off - 1, sh[1] + 3]
    const pawF = foot(fl); pawF[0] += off
    const grooming = (s.groom && !far) || (s.paw2 && far)
    const target = grooming ? (far ? [s.paw2[0] - off, s.paw2[1]] : s.groom) : [pawF[0] - 1, pawF[1] - 2.2]
    const [elbow, wrist] = ik(sp, target, 15.5, 15, grooming ? -1 : 1)
    capsule(ctx, sp, elbow, 10, 5.8, sh3)
    capsule(ctx, elbow, wrist, 5.4, 4, sh3)
    ctx.fillStyle = far ? F.far : F.light
    ellipse(ctx, wrist[0] + 1.8, wrist[1] + 0.6, 3.8, 2.2, grooming ? -0.6 : 0)
  }

  if (p.tuck < 0.5) legs(true)
  const tailBehind = p.tail[0] > -0.2
  if (tailBehind) tailDraw()

  // body, shaded as a solid: lit back, belly in shade, soft occlusion low down
  const pts = [P(-12, 1.5), P(-5, 12), P(L * 0.5, 10.3), P(L, 11.5), P(L + 6, 7), P(L + 10, -2.5), P(L + 3, -13), P(L * 0.55, -12.4), P(5, -11.5), P(-8, -8)]
  const g = ctx.createLinearGradient(...P(L / 2, 13), ...P(L / 2, -13))
  g.addColorStop(0, F.dark); g.addColorStop(0.3, F.base); g.addColorStop(0.75, F.light); g.addColorStop(1, F.belly)
  ctx.fillStyle = g
  smooth(ctx, pts); ctx.fill()
  ctx.save()
  smooth(ctx, pts); ctx.clip()
  const hl = ctx.createRadialGradient(...P(L * 0.62, 9), 1, ...P(L * 0.62, 9), L * 0.75)
  hl.addColorStop(0, 'rgba(255,236,214,0.32)'); hl.addColorStop(1, 'rgba(255,236,214,0)')
  ctx.fillStyle = hl; ctx.fillRect(-120, -120, 240, 240)
  ctx.strokeStyle = F.stripe; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const a = -7 + (i * (L + 12)) / 6.5
    ctx.beginPath(); ctx.moveTo(...P(a, 13)); ctx.quadraticCurveTo(...P(a + 2, 5), ...P(a - 3.5, -3 + (i % 2) * 2)); ctx.stroke()
  }
  const ao = ctx.createRadialGradient(...P(L * 0.5, -16), 2, ...P(L * 0.5, -16), L * 0.7)
  ao.addColorStop(0, 'rgba(40,15,0,0.28)'); ao.addColorStop(1, 'rgba(40,15,0,0)')
  ctx.fillStyle = ao; ctx.fillRect(-120, -120, 240, 240)
  ctx.restore()
  ctx.strokeStyle = 'rgba(40,15,0,0.22)'; ctx.lineWidth = 0.8
  smooth(ctx, pts); ctx.stroke()

  if (!tailBehind) tailDraw()

  if (p.tuck >= 0.5) {
    ctx.fillStyle = F.light; ellipse(ctx, sh[0] + 7, -1.8, 4.6, 2.2)
    ball(ctx, hip[0] + 2, -3.5, 7, 3.6, F)
  } else legs(false)

  // neck, chest ruff and head
  const hc = [sh[0] + p.head[0] + (s.headPush || 0), sh[1] + p.head[1] + br * 0.4 + (s.headPush || 0) * 0.3]
  capsule(ctx, P(L + 2, 3), hc, 15, 12, [F.lit, F.base, F.dark])
  ctx.fillStyle = F.light
  capsule(ctx, P(L + 6, -6), [hc[0] + 1, hc[1] + 5], 8, 7)

  const face = F.flat ? ((s.face || 0) > 0.5 ? 1 : 0) : s.face || 0
  ctx.save()
  ctx.translate(hc[0], hc[1])
  ctx.rotate(p.tilt + (s.headTilt || 0))
  if (face < 1) { ctx.save(); ctx.globalAlpha = 1 - face; sideHead(ctx, s, F, p); ctx.restore() }
  if (face > 0) {
    ctx.save(); ctx.globalAlpha = face
    ctx.translate(2.5 * face, 0)
    if (s.dir < 0) ctx.scale(-1, 1) // keep the face the right way round when the body is mirrored
    frontHead(ctx, s, F, p)
    ctx.restore()
  }
  ctx.restore()

  const xs = [hip[0] - 14, sh[0] + 12, hc[0] + 14], ys = [Math.min(hip[1], sh[1]) - 12, hc[1] - 20]
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: 0, head: hc }
}
