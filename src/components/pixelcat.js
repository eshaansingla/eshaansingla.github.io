// A flat pixel-art cat: solid blocks in the site's orange, black block eyes, one-pixel legs.
// Sprites are built from rectangles in "units" (one art pixel). x points the way she faces, y points up,
// the ground is y = 0. The caller mirrors the canvas when she faces left.

const R = (x, y, w, h) => [x, y, w, h]

// where the middle of her body is on the ground, per pose, so changing pose does not jump
export const ANCHOR = { walk: 7, run: 7, sit: 4, loaf: 6, stretch: 8, crouch: 7, jump: 7, puff: 7, back: 4, groom: 4 }

function ears(x, y, back) {
  // two pointy ears on a head whose top-left is (x, y); flattened when back
  if (back) return [R(x - 1, y - 1, 2, 1), R(x + 5, y - 1, 2, 1)]
  return [R(x, y, 2, 1), R(x, y + 1, 1, 1), R(x + 4, y, 2, 1), R(x + 5, y + 1, 1, 1)]
}

/**
 * s: { pose, frame, eyes: {dx, dy, open, wide}, earBack, earTwitch, tail (phase), swish, mouth, breath, wiggle }
 * returns { body: [...rects], dark: [...rects], box: [x0, y0, x1, y1] }
 */
export function sprite(s) {
  const body = [], dark = []
  const e = s.eyes || { dx: 0, dy: 0, open: 1 }
  const sw = (i, amp = 1) => Math.round(Math.sin((s.tail || 0) - i * 0.7) * amp * (s.swish || 0))
  const eye = (x, y) => {
    const dx = Math.max(-1, Math.min(1, e.dx || 0)), dy = Math.max(-1, Math.min(0, e.dy || 0))
    if (e.wide) dark.push(R(x + dx, y + dy, 2, 2))
    else if (e.open > 0.5) dark.push(R(x + dx, y + dy, 1, 2))
    else dark.push(R(x + dx - (e.open < 0.2 ? 0 : 0), y + dy, e.open < 0.2 ? 2 : 1, 1))
  }
  let box
  switch (s.pose) {
    case 'sit':
    case 'groom':
    case 'back': {
      const b = s.breath ? 1 : 0
      body.push(R(0, 0, 7, 5), R(3, 4, 7, 6 + b))
      // front legs, with a gap between them
      body.push(R(7, 0, 1, 4), R(9, 0, 1, s.pose === 'groom' ? 0 : 4))
      const hy = 10 + b
      body.push(R(3, hy, 8, 6))
      body.push(...ears(3, hy + 6, s.earBack).map((r, i) => (s.earTwitch && i >= 2 ? [r[0], r[1] - 1, r[2], r[3]] : r)))
      if (s.pose === 'groom') body.push(R(10, hy - 1 + (Math.round(s.frame) % 2), 2, 2))
      if (s.pose !== 'back') {
        eye(5, hy + 2); eye(8, hy + 2)
        if (s.mouth) dark.push(R(6, hy, 2, s.mouth > 1 ? 2 : 1))
      }
      // tail lying behind, the tip lifting and swishing
      const tl = s.pose === 'back'
        ? [[-1, 1], [-2, 1], [-3, 1], [-4, 1], [-4, 2], [-4, 3], [-4, 4], [-4, 5], [-4, 6]]
        : [[-1, 1], [-2, 1], [-3, 1], [-4, 1], [-4, 2], [-4, 3], [-4, 4]]
      const n = tl.length
      tl.forEach(([x, y], i) => body.push(R(x + (i >= n - 2 ? sw(i, 1.4) : 0), y, 1, 1)))
      box = [-5, 0, 11, 18 + b]
      break
    }
    case 'loaf': {
      const b = s.breath ? 1 : 0
      body.push(R(0, 0, 12, 5 + b), R(8, 2, 7, 6 + b))
      body.push(...ears(8, 8 + b, s.earBack))
      eye(10, 4 + b); eye(13, 4 + b)
      body.push(R(-1, 0, 1, 2), R(-2, 0, 1, 1), R(-3, 0, 1, 1))
      box = [-3, 0, 15, 10 + b]
      break
    }
    case 'stretch': {
      body.push(R(0, 4, 6, 5), R(4, 3, 6, 4), R(8, 1, 6, 4))
      body.push(R(1, 0, 1, 4), R(3, 0, 1, 4), R(13, 0, 5, 1))
      body.push(R(13, 2, 7, 6))
      body.push(...ears(14, 8, true))
      eye(15, 4); eye(18, 4)
      ;[[-1, 9], [-1, 10], [-1, 11], [0, 12]].forEach(([x, y], i) => body.push(R(x + sw(i), y, 1, 1)))
      box = [-1, 0, 20, 13]
      break
    }
    case 'crouch': {
      const wg = s.wiggle ? (Math.round(s.frame) % 2 ? 1 : -1) : 0
      body.push(R(0 + wg, 1, 5, 4), R(4, 1, 9, 4))
      ;[1 + wg, 3 + wg, 9, 11].forEach((x) => body.push(R(x, 0, 1, 1)))
      body.push(R(10, 3, 7, 6))
      body.push(...ears(10, 9, true))
      eye(12, 5); eye(15, 5)
      ;[[-1 + wg, 3], [-2 + wg, 3], [-3 + wg, 3], [-4 + wg, 3], [-4 + wg, 4]].forEach(([x, y], i) => body.push(R(x + (i === 4 ? sw(i) : 0), y, 1, 1)))
      box = [-4, 0, 17, 11]
      break
    }
    case 'jump': {
      body.push(R(0, 3, 13, 5))
      body.push(R(-1, 2, 2, 1), R(-2, 1, 1, 1), R(12, 2, 2, 1), R(14, 1, 1, 1))
      body.push(R(10, 6, 7, 6))
      body.push(...ears(10, 12, s.earBack))
      eye(12, 8); eye(15, 8)
      ;[[-1, 7], [-2, 7], [-2, 8], [-3, 8], [-4, 8]].forEach(([x, y]) => body.push(R(x, y, 1, 1)))
      box = [-4, 1, 17, 14]
      break
    }
    case 'puff': {
      body.push(R(-1, 3, 15, 7))
      ;[1, 3, 9, 11].forEach((x) => body.push(R(x, 0, 1, 3)))
      body.push(R(10, 7, 7, 6))
      body.push(...ears(10, 13, true))
      eye(11, 9); eye(14, 9)
      body.push(R(-3, 8, 2, 7))
      box = [-3, 0, 17, 15]
      break
    }
    default: {
      // walk and run: legs move in pairs as she goes
      const run = s.pose === 'run'
      const f = Math.floor(s.frame || 0) % 4
      const by = run ? (f % 2 ? 4 : 3) : f % 2 ? 3 : 3
      body.push(R(0, by, 13, 5))
      const up = (x, lifted) => (lifted ? R(x + 1, 1, 1, by - 1) : R(x, 0, 1, by))
      if (run) {
        if (f % 2) body.push(R(-1, 2, 2, 1), R(-2, 1, 1, 1), R(12, 2, 2, 1), R(14, 1, 1, 1))
        else body.push(R(4, 0, 1, by), R(6, 0, 1, by), R(7, 0, 1, by), R(9, 0, 1, by))
      } else {
        const A = f === 0, B = f === 2
        body.push(up(1, B), up(11, B), up(3, A), up(9, A))
      }
      body.push(R(10, by + 3, 7, 6))
      body.push(...ears(10, by + 9, s.earBack || run).map((r, i) => (s.earTwitch && i >= 2 ? [r[0], r[1] - 1, r[2], r[3]] : r)))
      eye(12, by + 5); eye(15, by + 5)
      const tl = run ? [[-1, by + 4], [-2, by + 4], [-3, by + 4], [-3, by + 5], [-4, by + 5]] : [[-1, by + 4], [-2, by + 4], [-2, by + 5], [-2, by + 6], [-2, by + 7], [-2, by + 8]]
      const n = tl.length
      tl.forEach(([x, y], i) => body.push(R(x + (i >= n - 2 ? sw(i) : 0), y, 1, 1)))
      box = [-4, 0, 17, by + 11]
    }
  }
  return { body, dark, box }
}

const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..']
const ZED = ['xxx', '.x.', 'xxx']
const BANG = ['x', 'x', 'x', '.', 'x']
const HUH = ['xx.', '..x', '.x.', '...', '.x.']
export const GLYPHS = { heart: HEART, z: ZED, bang: BANG, huh: HUH }

/** Draw a small glyph with its bottom-left at (x, y) in canvas pixels (y down), cell size c. */
export function glyph(ctx, g, x, y, c) {
  const rows = GLYPHS[g]
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') ctx.fillRect(Math.round(x + i * c), Math.round(y - (rows.length - j) * c), Math.ceil(c), Math.ceil(c)) }))
}
