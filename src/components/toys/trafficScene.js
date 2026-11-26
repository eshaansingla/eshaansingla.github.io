/*
 * Drawing for the licence-plate figure: a night-capable highway camera.
 * Pure canvas helpers; no React. Cars are drawn front-on in local units (origin at the
 * ground under the car's centre, +y down) and scaled by perspective.
 */

// Left-hand traffic: the two left lanes drive away from the camera, the two right lanes come toward it.
export const LANES = [-0.86, -0.32, 0.32, 0.86]
export const HORIZON = 0.36

export const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

export function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Plates are made up: three letters and two digits, a format no Indian registration uses.
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
export function fakePlate(rnd) {
  const l = () => LETTERS[Math.floor(rnd() * LETTERS.length)]
  return `${l()}${l()}${l()} ${Math.floor(10 + rnd() * 90)}`
}

const PAINTS = [
  [226, 228, 230], // white
  [168, 172, 178], // silver
  [28, 30, 34], // black
  [142, 28, 30], // red
  [30, 58, 112], // blue
  [86, 92, 98], // grey
  [124, 104, 72], // bronze
]

// Body proportions in local units: width, lower body height, cabin height, roof width, beltline width
const SHAPES = {
  sedan: { w: 150, body: 44, cabin: 32, roof: 94, belt: 134, ride: 10 },
  hatch: { w: 138, body: 46, cabin: 36, roof: 92, belt: 124, ride: 10 },
  suv: { w: 160, body: 56, cabin: 40, roof: 112, belt: 148, ride: 14 },
}
const KINDS = ['sedan', 'sedan', 'hatch', 'hatch', 'suv']

export function makeCar(rnd, id, lane, z) {
  return {
    id,
    lane,
    dir: LANES[lane] < 0 ? -1 : 1, // −1 away from the camera (rear view), +1 toward it (front view)
    z,
    v: 0.075 + rnd() * 0.05,
    kind: KINDS[Math.floor(rnd() * KINDS.length)],
    paint: PAINTS[Math.floor(rnd() * PAINTS.length)],
    plate: fakePlate(rnd),
    seed: rnd() * 10,
  }
}

/** Perspective: lx is lateral road position (−1..1 is the carriageway), z runs 0 (horizon) to 1 (camera). */
export function project(W, H, lx, z) {
  const y0 = H * HORIZON
  const t = z * z
  const half = W * (0.06 + 0.62 * t) // half the carriageway width in pixels at this depth
  // everything on the road scales with the road: a car (150 units × 1.15) comes out at about 55% of a lane
  return { x: W / 2 + lx * half, y: y0 + (H * 1.05 - y0) * t, s: half * 0.0015 }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Sky, skyline, road, markings, lamps, gantry sign. Returns the sign's screen box. */
export function drawScene(ctx, W, H, light) {
  const dark = 1 - light
  const hy = H * HORIZON
  const P = (lx, z) => project(W, H, lx, z)

  const sky = ctx.createLinearGradient(0, 0, 0, hy)
  sky.addColorStop(0, rgb(mix([8, 10, 18], [150, 178, 204], light)))
  sky.addColorStop(1, rgb(mix([34, 30, 40], [226, 220, 204], light)))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, hy + 1)

  // distant skyline with a few lit windows at night
  const sk = mulberry(7)
  let x = 0
  while (x < W) {
    const bw = 18 + sk() * 46, bh = 8 + sk() * (H * 0.09)
    ctx.fillStyle = rgb(mix([18, 18, 24], [150, 156, 160], light))
    ctx.fillRect(x, hy - bh, bw - 2, bh)
    if (dark > 0.4) {
      for (let wy = hy - bh + 4; wy < hy - 3; wy += 5)
        for (let wx = x + 3; wx < x + bw - 5; wx += 5)
          if (sk() < 0.16) { ctx.fillStyle = `rgba(255,214,150,${0.55 * dark})`; ctx.fillRect(wx, wy, 1.6, 1.6) }
    }
    x += bw
  }

  // verge
  const verge = ctx.createLinearGradient(0, hy, 0, H)
  verge.addColorStop(0, rgb(mix([14, 16, 14], [120, 128, 102], light)))
  verge.addColorStop(1, rgb(mix([8, 9, 8], [88, 98, 72], light)))
  ctx.fillStyle = verge
  ctx.fillRect(0, hy, W, H - hy)

  // carriageway with a soft asphalt gradient
  const a0 = P(-1.18, 0), a1 = P(1.18, 0), b0 = P(-1.18, 1.05), b1 = P(1.18, 1.05)
  const asph = ctx.createLinearGradient(0, hy, 0, H)
  asph.addColorStop(0, rgb(mix([30, 30, 36], [124, 124, 126], light)))
  asph.addColorStop(1, rgb(mix([18, 18, 22], [84, 84, 88], light)))
  ctx.fillStyle = asph
  ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b0.x, b0.y); ctx.fill()
  if (dark > 0.3) {
    const sh = ctx.createLinearGradient(0, hy, 0, H)
    sh.addColorStop(0, 'rgba(120,140,170,0)')
    sh.addColorStop(1, `rgba(120,140,170,${0.12 * dark})`)
    ctx.fillStyle = sh
    ctx.fill()
  }

  // lane dashes (the camera is fixed, so they stay put)
  ctx.fillStyle = rgb([232, 226, 206], 0.35 + 0.3 * light)
  ;[-0.59, 0.59].forEach((lx) => {
    for (let k = 0; k < 14; k++) {
      const z0 = (k + 0.3) / 14, z1 = z0 + 0.025
      if (z1 > 1.05) continue
      const p0 = P(lx, z0), p1 = P(lx, z1)
      const w0 = 1.2 * p0.s, w1 = 1.2 * p1.s
      ctx.beginPath(); ctx.moveTo(p0.x - w0, p0.y); ctx.lineTo(p0.x + w0, p0.y); ctx.lineTo(p1.x + w1, p1.y); ctx.lineTo(p1.x - w1, p1.y); ctx.fill()
    }
  })
  ctx.strokeStyle = rgb([232, 226, 206], 0.5)
  ctx.lineWidth = 1.5
  ;[-1.1, 1.1].forEach((lx) => { const p0 = P(lx, 0), p1 = P(lx, 1.05); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke() })

  // central divider: a raised concrete barrier with amber reflectors on top
  const seg = 24, base = [], top = []
  for (let k = 0; k <= seg; k++) {
    const z = (k / seg) * 1.05
    const l = P(-0.045, z), r = P(0.045, z), tl = P(-0.028, z), tr = P(0.028, z)
    const hgt = 45 * l.s // about 0.8 m, against a car roof at about 1.5 m
    base.push([l, r]); top.push([[tl.x, tl.y - hgt], [tr.x, tr.y - hgt]])
  }
  const face = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath(); ctx.fill() }
  face([...base.map((b) => [b[0].x, b[0].y]), ...top.map((t) => t[0]).reverse()], rgb(mix([40, 40, 44], [176, 174, 166], light)))
  face([...base.map((b) => [b[1].x, b[1].y]), ...top.map((t) => t[1]).reverse()], rgb(mix([30, 30, 34], [150, 148, 140], light)))
  face([...top.map((t) => t[0]), ...top.map((t) => t[1]).reverse()], rgb(mix([56, 56, 60], [206, 204, 196], light)))
  for (let k = 1; k < seg; k += 2) {
    const [a, b] = top[k], r = Math.max(0.8, 2.6 * base[k][0].s)
    ctx.fillStyle = `rgba(255,${Math.round(170 + 40 * light)},60,${0.55 + 0.45 * dark})`
    ctx.beginPath(); ctx.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, r, 0, 7); ctx.fill()
  }

  // crash barrier on both edges
  ctx.strokeStyle = rgb(mix([60, 62, 68], [170, 172, 170], light))
  ctx.lineWidth = 2
  ;[-1.32, 1.32].forEach((lx) => {
    ctx.beginPath()
    for (let z = 0; z <= 1.05; z += 0.05) { const p = P(lx, z); ctx[z ? 'lineTo' : 'moveTo'](p.x, p.y - 14 * p.s) }
    ctx.stroke()
  })

  // street lamps with a head, an arm and a pool of light
  ;[0.25, 0.55, 0.85].forEach((z) => {
    ;[-1.48, 1.48].forEach((lx) => {
      const p = P(lx, z), top = p.y - 130 * p.s, arm = (lx < 0 ? 1 : -1) * 26 * p.s
      ctx.strokeStyle = rgb(mix([46, 48, 54], [104, 104, 98], light))
      ctx.lineWidth = Math.max(1, 3 * p.s)
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, top); ctx.quadraticCurveTo(p.x, top - 6 * p.s, p.x + arm, top - 4 * p.s); ctx.stroke()
      ctx.fillStyle = rgb(mix([255, 214, 150], [90, 90, 86], light))
      rr(ctx, p.x + arm - 7 * p.s, top - 6 * p.s, 14 * p.s, 4 * p.s, 2 * p.s); ctx.fill()
      if (dark > 0.2) {
        const r = 46 * p.s + 6
        const lg = ctx.createRadialGradient(p.x + arm, top, 0, p.x + arm, top, r)
        lg.addColorStop(0, `rgba(255,224,170,${0.85 * dark})`)
        lg.addColorStop(1, 'rgba(255,214,150,0)')
        ctx.fillStyle = lg
        ctx.beginPath(); ctx.arc(p.x + arm, top, r, 0, 7); ctx.fill()
        const pool = ctx.createRadialGradient(p.x + arm, p.y, 0, p.x + arm, p.y, 90 * p.s)
        pool.addColorStop(0, `rgba(255,214,150,${0.14 * dark})`)
        pool.addColorStop(1, 'rgba(255,214,150,0)')
        ctx.fillStyle = pool
        ctx.beginPath(); ctx.ellipse(p.x + arm, p.y, 90 * p.s, 24 * p.s, 0, 0, 7); ctx.fill()
      }
    })
  })

  // green direction sign on two posts
  const sp = P(1.72, 0.42), s = sp.s
  const sw = 74 * s, sh = 34 * s, sx = sp.x - sw / 2, sy = sp.y - 150 * s
  ctx.strokeStyle = rgb(mix([50, 52, 58], [110, 110, 104], light))
  ctx.lineWidth = Math.max(1, 2 * s)
  ;[-0.3, 0.3].forEach((f) => { ctx.beginPath(); ctx.moveTo(sp.x + f * sw, sp.y); ctx.lineTo(sp.x + f * sw, sy + sh); ctx.stroke() })
  ctx.fillStyle = rgb(mix([10, 70, 40], [16, 112, 64], light))
  rr(ctx, sx, sy, sw, sh, 2 * s); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = Math.max(0.6, s)
  rr(ctx, sx + 2 * s, sy + 2 * s, sw - 4 * s, sh - 4 * s, 1.5 * s); ctx.stroke()
  if (s > 0.25) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `600 ${9 * s}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('RING ROAD', sp.x, sy + 14 * s)
    ctx.fillText('EXIT 4  ↗', sp.x, sy + 26 * s)
    ctx.textAlign = 'left'
  }
  return [sx - 2, sy - 2, sw + 4, sh + 4]
}

/**
 * One car, front-on (coming toward the camera) or from behind (driving away).
 * Drawn in local units with the origin on the ground under the car's centre.
 * Returns the screen-space geometry the detector uses: plate box, lamp centres, width.
 */
export function drawCar(ctx, car, p, light) {
  const dark = 1 - light
  const S = SHAPES[car.kind]
  const s = p.s * 1.15 // a car is roughly half a lane wide
  const paint = mix(car.paint, mix(car.paint, [6, 7, 10], 0.72), dark)
  const look = { ...S, light, dark, paint, hi: mix(paint, [255, 255, 255], 0.28 + 0.1 * light), lo: mix(paint, [0, 0, 0], 0.45) }
  look.top = -S.ride - S.body // beltline
  look.ct = look.top - S.cabin // roof

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(s, s)
  drawBody(ctx, look, car.dir > 0)
  const { lights, plate } = car.dir > 0 ? drawFront(ctx, look) : drawRear(ctx, look)
  drawPlate(ctx, car.plate, plate, light, s)
  ctx.restore()

  const X = (x) => p.x + x * s, Y = (y) => p.y + y * s
  return {
    plate: [X(plate.x), Y(plate.y), plate.w * s, plate.h * s],
    lights: lights.map(([x, y]) => [X(x), Y(y)]),
    width: S.w * s,
    ground: p.y,
  }
}

const PLATE = { w: 50, h: 13 }

function drawBody(ctx, L, front) {
  const { w, body, belt, roof, ride, top, ct, paint, hi, lo, light } = L
  // contact shadow
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.62)
  sh.addColorStop(0, 'rgba(0,0,0,0.55)')
  sh.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sh
  ctx.beginPath(); ctx.ellipse(0, -1, w * 0.62, 9, 0, 0, 7); ctx.fill()
  // tyres under the bumper
  ctx.fillStyle = '#0a0a0b'
  ;[-1, 1].forEach((d) => { rr(ctx, d * (w / 2 - 6) - (d > 0 ? 22 : 0), -ride - 6, 22, ride + 6, 4); ctx.fill() })
  // lower body: flat bumper, rounded flanks, shoulders
  const g = ctx.createLinearGradient(0, top, 0, -ride)
  g.addColorStop(0, rgb(hi))
  g.addColorStop(0.35, rgb(paint))
  g.addColorStop(1, rgb(lo))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-w / 2 + 4, -ride)
  ctx.lineTo(-w / 2, -ride - body * 0.5)
  ctx.quadraticCurveTo(-w / 2, top + 2, -belt / 2, top)
  ctx.lineTo(belt / 2, top)
  ctx.quadraticCurveTo(w / 2, top + 2, w / 2, -ride - body * 0.5)
  ctx.lineTo(w / 2 - 4, -ride)
  ctx.quadraticCurveTo(0, -ride + 3, -w / 2 + 4, -ride)
  ctx.fill()
  // cabin pillars in body colour
  ctx.fillStyle = rgb(mix(paint, [0, 0, 0], 0.2))
  ctx.beginPath()
  ctx.moveTo(-belt / 2 + 6, top)
  ctx.lineTo(-roof / 2, ct + 4)
  ctx.quadraticCurveTo(-roof / 2 + 2, ct, -roof / 2 + 8, ct)
  ctx.lineTo(roof / 2 - 8, ct)
  ctx.quadraticCurveTo(roof / 2 - 2, ct, roof / 2, ct + 4)
  ctx.lineTo(belt / 2 - 6, top)
  ctx.closePath()
  ctx.fill()
  // windscreen or rear window, with a sky streak
  const glass = ctx.createLinearGradient(0, ct, 0, top)
  glass.addColorStop(0, rgb(mix([24, 30, 42], front ? [176, 198, 216] : [120, 136, 150], light)))
  glass.addColorStop(1, rgb(mix([6, 8, 12], [58, 70, 84], light)))
  ctx.fillStyle = glass
  ctx.beginPath()
  ctx.moveTo(-belt / 2 + 14, top - 2)
  ctx.lineTo(-roof / 2 + 7, ct + 4)
  ctx.lineTo(roof / 2 - 7, ct + 4)
  ctx.lineTo(belt / 2 - 14, top - 2)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.1 * light})`
  ctx.beginPath(); ctx.moveTo(-roof / 2, ct); ctx.lineTo(-roof / 2 + 26, ct); ctx.lineTo(-belt / 2 + 46, top); ctx.lineTo(-belt / 2 + 20, top); ctx.fill()
  ctx.restore()
  // side mirrors and the bonnet or boot edge
  ctx.fillStyle = rgb(paint)
  ;[-1, 1].forEach((d) => { rr(ctx, d * (belt / 2 + 1) - (d > 0 ? 0 : 11), top - 9, 11, 7, 2.5); ctx.fill() })
  ctx.strokeStyle = rgb(hi, 0.7)
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(-belt / 2 + 6, top + 1.5); ctx.lineTo(belt / 2 - 6, top + 1.5); ctx.stroke()
}

function drawFront(ctx, L) {
  const { w, body, belt, ride, top, ct, light, dark } = L
  // interior mirror and wipers
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  rr(ctx, -6, ct + 6, 12, 4, 1.5); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'
  ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(-belt / 2 + 22, top - 3); ctx.lineTo(-6, top - 7); ctx.moveTo(4, top - 3); ctx.lineTo(belt / 2 - 18, top - 7); ctx.stroke()
  // swept headlight clusters with an LED strip
  const ly = top + body * 0.3
  const lights = [-1, 1].map((d) => {
    const xo = d * (w / 2 - 5), xi = d * (w / 2 - 34)
    ctx.fillStyle = rgb(mix([40, 44, 50], [196, 200, 204], light * 0.8 + 0.2 * dark))
    ctx.beginPath(); ctx.moveTo(xo, ly - 5); ctx.lineTo(xi, ly - 2); ctx.lineTo(xi, ly + 5); ctx.lineTo(xo - d * 3, ly + 6); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = `rgba(236,246,255,${0.55 + 0.45 * dark})`
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(xo - d, ly - 3.5); ctx.lineTo(xi + d, ly - 1); ctx.stroke()
    const cx = (xo + xi) / 2
    ctx.fillStyle = rgb([255, 250, 232], 0.5 + 0.5 * dark)
    ctx.beginPath(); ctx.ellipse(cx, ly + 1.5, 6, 3.2, 0, 0, 7); ctx.fill()
    return [cx, ly + 1.5]
  })
  // grille with slats and a badge
  const gw = w - 76
  ctx.fillStyle = '#101114'
  rr(ctx, -gw / 2, ly - 4, gw, 13, 4); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 0.8
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-gw / 2 + 3, ly - 1 + k * 3.6); ctx.lineTo(gw / 2 - 3, ly - 1 + k * 3.6); ctx.stroke() }
  ctx.fillStyle = 'rgba(214,218,222,0.85)'
  ctx.beginPath(); ctx.ellipse(0, ly + 2, 4, 2.6, 0, 0, 7); ctx.fill()
  // lower intake and fog lamps
  const py = -ride - body * 0.36
  ctx.fillStyle = '#0d0d0f'
  rr(ctx, -w / 2 + 22, py + PLATE.h + 2, w - 44, 6, 3); ctx.fill()
  ctx.fillStyle = rgb([255, 236, 190], 0.25 + 0.6 * dark)
  ;[-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(d * (w / 2 - 16), py + PLATE.h + 5, 2.4, 0, 7); ctx.fill() })
  return { lights, plate: { x: -PLATE.w / 2, y: py, ...PLATE } }
}

function drawRear(ctx, L) {
  const { w, body, ride, top, ct, light, dark, paint, lo } = L
  // high-mount brake light
  ctx.fillStyle = `rgba(255,70,60,${0.35 + 0.6 * dark})`
  rr(ctx, -10, ct + 5, 20, 2.4, 1.2); ctx.fill()
  // tail-light clusters joined by a trim strip
  const ly = top + body * 0.3
  const lights = [-1, 1].map((d) => {
    const xo = d * (w / 2 - 4), xi = d * (w / 2 - 36)
    ctx.fillStyle = rgb(mix([90, 10, 12], [150, 24, 26], light))
    ctx.beginPath(); ctx.moveTo(xo, ly - 6); ctx.lineTo(xi, ly - 5); ctx.lineTo(xi, ly + 3); ctx.lineTo(xo, ly + 5); ctx.closePath(); ctx.fill()
    ctx.fillStyle = `rgba(255,${Math.round(60 + 40 * light)},${Math.round(50 + 30 * light)},${0.45 + 0.55 * dark})`
    ctx.fillRect(Math.min(xo, xi) + 3, ly - 3, Math.abs(xo - xi) - 6, 3)
    return [(xo + xi) / 2, ly - 1]
  })
  ctx.fillStyle = rgb(mix(paint, [0, 0, 0], 0.35))
  ctx.fillRect(-(w / 2 - 36), ly - 3, w - 72, 4)
  ctx.strokeStyle = rgb(lo, 0.8)
  ctx.lineWidth = 0.9
  ctx.beginPath(); ctx.moveTo(-(w / 2 - 38), ly + 5); ctx.lineTo(w / 2 - 38, ly + 5); ctx.stroke()
  // bumper with reflectors and an exhaust tip
  const py = -ride - body * 0.4
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  rr(ctx, -w / 2 + 14, py + PLATE.h + 4, w - 28, 5, 2.5); ctx.fill()
  ctx.fillStyle = `rgba(200,30,30,${0.6 + 0.3 * dark})`
  ;[-1, 1].forEach((d) => { rr(ctx, d * (w / 2 - 14) - (d > 0 ? 9 : 0), py + PLATE.h + 4.5, 9, 3, 1.5); ctx.fill() })
  ctx.fillStyle = '#2a2a2c'
  ctx.beginPath(); ctx.ellipse(w / 2 - 30, -ride - 2, 4, 2, 0, 0, 7); ctx.fill()
  return { lights, plate: { x: -PLATE.w / 2, y: py, ...PLATE } }
}

function drawPlate(ctx, text, pl, light, s) {
  ctx.fillStyle = rgb(mix([150, 150, 146], [244, 242, 236], light * 0.7 + 0.3))
  rr(ctx, pl.x, pl.y, pl.w, pl.h, 1.5); ctx.fill()
  ctx.strokeStyle = '#141414'
  ctx.lineWidth = 0.9
  rr(ctx, pl.x + 1, pl.y + 1, pl.w - 2, pl.h - 2, 1); ctx.stroke()
  if (s * pl.h < 6.5) return // draw the characters once they would be legible on screen
  ctx.fillStyle = '#111'
  ctx.font = '700 9.6px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, pl.y + 9.9)
  ctx.textAlign = 'left'
}

/** Night glare: white blooms and streaks from headlights, a smaller red bloom from tail lights, wet-road reflection. */
export function drawGlare(ctx, geo, s, dark, rear) {
  if (dark <= 0.15) return
  geo.lights.forEach(([hx, hy]) => {
    const r = geo.width * (rear ? 0.06 + 0.12 * dark : 0.15 + 0.35 * dark)
    const gg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r)
    gg.addColorStop(0, rear ? `rgba(255,60,50,${0.7 * dark})` : `rgba(255,248,225,${0.85 * dark})`)
    gg.addColorStop(1, rear ? 'rgba(255,40,30,0)' : 'rgba(255,230,170,0)')
    ctx.fillStyle = gg
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill()
    if (!rear) {
      ctx.fillStyle = `rgba(255,246,220,${0.5 * dark})`
      ctx.fillRect(hx - r * 1.3, hy - 0.6, r * 2.6, 1.2)
    }
  })
  if (dark > 0.3) {
    const cx = (geo.lights[0][0] + geo.lights[1][0]) / 2
    const rg = ctx.createRadialGradient(cx, geo.ground + 10 * s, 0, cx, geo.ground + 10 * s, geo.width * 0.55)
    rg.addColorStop(0, rear ? `rgba(255,80,60,${0.2 * dark})` : `rgba(255,236,190,${0.35 * dark})`)
    rg.addColorStop(1, 'rgba(255,236,190,0)')
    ctx.fillStyle = rg
    ctx.fillRect(cx - geo.width * 0.6, geo.ground, geo.width * 1.2, 22 * s)
  }
}

/**
 * Magnified plate crops, like an ANPR read-out, set just ahead of each car whose plate box was kept:
 * below the bumper for oncoming cars, above the roof for cars driving away.
 */
export function drawCrops(ctx, crops, W, H, now) {
  crops.forEach(({ det, geo, dir, born }) => {
    const k = Math.min(1, (now - born) / 0.25)
    const e = 1 - (1 - k) ** 3
    const [bx, by, bw, bh] = det.box
    const cw = Math.max(Math.min(92, W * 0.22), Math.min(118, bw * 1.8)), chh = cw * 0.3
    const boxH = chh + 24 // plate plus caption
    // beside the car, on the outside of its lane, level with the plate; above the roof if there is no room
    const out = dir > 0 ? 1 : -1
    const side = bx + bw / 2 + out * (geo.width / 2 + 14 + cw / 2)
    const roomy = side - cw / 2 - 5 > 6 && side + cw / 2 + 5 < W - 6
    let cx = roomy ? side : bx + bw / 2
    let cy = roomy ? by + bh / 2 - boxH / 2 + 5 : by - geo.width * 0.75 - boxH
    cx = Math.max(cw / 2 + 10, Math.min(W - cw / 2 - 10, cx))
    cy = Math.max(34, Math.min(H - boxH - 30, cy))
    // leader from the plate box to the crop
    ctx.globalAlpha = e
    ctx.strokeStyle = 'rgba(255,106,44,0.75)'
    ctx.lineWidth = 1
    ctx.beginPath()
    if (roomy) { ctx.moveTo(out > 0 ? bx + bw : bx, by + bh / 2); ctx.lineTo(cx - out * (cw / 2 + 5), cy + chh / 2) }
    else { ctx.moveTo(bx + bw / 2, by); ctx.lineTo(cx, cy + boxH - 5) }
    ctx.stroke()
    ctx.save()
    ctx.translate(cx, cy + chh / 2)
    ctx.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e)
    // crop frame
    ctx.fillStyle = 'rgba(10,10,12,0.82)'
    rr(ctx, -cw / 2 - 5, -chh / 2 - 5, cw + 10, chh + 24, 5); ctx.fill()
    ctx.strokeStyle = '#ff6a2c'
    ctx.lineWidth = 1.2
    rr(ctx, -cw / 2 - 5, -chh / 2 - 5, cw + 10, chh + 24, 5); ctx.stroke()
    // the plate itself, enlarged
    ctx.fillStyle = '#f1efe8'
    rr(ctx, -cw / 2, -chh / 2, cw, chh, 3); ctx.fill()
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 1.4
    rr(ctx, -cw / 2 + 2, -chh / 2 + 2, cw - 4, chh - 4, 2); ctx.stroke()
    ctx.fillStyle = '#111'
    ctx.font = `700 ${Math.round(chh * 0.62)}px "JetBrains Mono Variable", ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(det.plate, 0, 1)
    ctx.textBaseline = 'alphabetic'
    // caption: track id, direction, confidence
    ctx.font = '600 9.5px "JetBrains Mono Variable", ui-monospace, monospace'
    ctx.fillStyle = '#ff6a2c'
    ctx.textAlign = 'left'
    ctx.fillText(`#${det.car} ${dir > 0 ? 'front' : 'rear'}`, -cw / 2, chh / 2 + 13)
    ctx.textAlign = 'right'
    ctx.fillText(det.conf.toFixed(2), cw / 2, chh / 2 + 13)
    ctx.textAlign = 'left'
    ctx.restore()
    ctx.globalAlpha = 1
  })
}

/** Detection boxes: solid for plates, dashed for false detections, faint for those below the line. */
export function drawBoxes(ctx, dets) {
  ctx.font = '600 10px "JetBrains Mono Variable", ui-monospace, monospace'
  dets.forEach((d) => {
    const [bx, by, bw, bh] = d.box
    if (bw < 6) return
    if (!d.kept) {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.strokeRect(bx, by, bw, bh)
      ctx.setLineDash([])
      return
    }
    const col = d.tp ? '#ff6a2c' : '#ff3b6b'
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    ctx.setLineDash(d.tp ? [] : [6, 3])
    ctx.strokeRect(bx, by, bw, bh)
    ctx.setLineDash([])
    if (d.tp || d.quiet || bw < 16) return // plates are labelled by their crop
    const text = `${d.label === 'headlight' ? 'glare' : d.label} ${d.conf.toFixed(2)}`
    const tw = ctx.measureText(text).width + 8
    const ty = by - 15
    ctx.fillStyle = col
    ctx.fillRect(bx - 1, ty, tw, 14)
    ctx.fillStyle = '#120a05'
    ctx.fillText(text, bx + 3, ty + 10.5)
  })
}

/** Vignette, scanline, corner brackets and the camera overlay text. */
export function drawHud(ctx, W, H, t, { fps, thr, aware, reduced }) {
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
  if (!reduced) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(0, (t * 60) % H, W, 2)
  }
  ctx.font = '11px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.fillStyle = Math.floor(t * 1.4) % 2 ? '#ff3b30' : 'rgba(255,59,48,0.25)'
  ctx.beginPath(); ctx.arc(20, 19, 4, 0, 7); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fillText(W < 560 ? 'REC  CAM-02' : 'REC  CAM-02  RING ROAD, BOTH CARRIAGEWAYS', 30, 23)
  ctx.textAlign = 'right'
  ctx.fillText(`${new Date().toLocaleTimeString('en-GB', { hour12: false })}  ${fps} fps`, W - 14, 23)
  ctx.textAlign = 'left'
  ctx.fillText(`yolov8l  conf ≥ ${thr.toFixed(2)}${aware ? '  glare-aware' : ''}`, 14, H - 12)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.5
  ;[[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(cx, cy + 14 * sy); ctx.lineTo(cx, cy); ctx.lineTo(cx + 14 * sx, cy); ctx.stroke()
  })
}
