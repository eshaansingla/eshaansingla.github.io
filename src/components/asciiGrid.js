// Turns a photo into a grid of 'ink' amounts for the ASCII portrait (see Portrait.jsx)

// the photo as a grid of cols x rows cells of the given aspect (cell w / h)
export function toGrid(img, cols, rows, cellAspect, dark, opts = {}) {
  const { sharpen = 1.4, gamma = 1 } = opts
  const cv = document.createElement('canvas')
  cv.width = cols; cv.height = rows
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  // cover the box, keeping the face (upper middle of the photo) in frame
  const boxAspect = (cols * cellAspect) / rows
  const ia = img.naturalWidth / img.naturalHeight
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0
  if (ia > boxAspect) { sw = sh * boxAspect; sx = (img.naturalWidth - sw) / 2 } else { sh = sw / boxAspect; sy = (img.naturalHeight - sh) * 0.25 }
  // shrink in halving steps so every cell is a true average of the pixels under it
  let src = img, w = sw, h = sh, ox = sx, oy = sy
  while (w / 2 > cols * 2) {
    const t = document.createElement('canvas')
    t.width = Math.round(w / 2); t.height = Math.round(h / 2)
    const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'
    tc.drawImage(src, ox, oy, w, h, 0, 0, t.width, t.height)
    src = t; w = t.width; h = t.height; ox = 0; oy = 0
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, ox, oy, w, h, 0, 0, cols, rows)
  const d = ctx.getImageData(0, 0, cols, rows).data
  const lum = new Float32Array(cols * rows)
  const lum0 = new Float32Array(cols * rows)
  for (let i = 0; i < cols * rows; i++) lum0[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
  // a catchlight in a pupil is a single bright cell inside a dark patch; at this size it splits the eye
  // in two, so such cells take the median of their neighbours
  const fixed = Float32Array.from(lum0)
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    const i = y * cols + x, nb = []
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) nb.push(lum0[i + dy * cols + dx])
    nb.sort((a, b) => a - b)
    const med = (nb[3] + nb[4]) / 2
    if (med < 120 && lum0[i] > med + 35) fixed[i] = med
  }
  lum0.set(fixed)
  // bring out the features: add back the difference from a local average (an unsharp mask a few
  // cells wide), so eyes, brows, nose and mouth stand out from the even tone of the face
  const blur = new Float32Array(cols * rows), R = 3
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let sum = 0, n = 0
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + Math.round(dy * 0.6)
      if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) { sum += lum0[yy * cols + xx]; n++ }
    }
    blur[y * cols + x] = sum / n
  }
  for (let i = 0; i < lum.length; i++) lum[i] = Math.min(255, Math.max(0, lum0[i] + sharpen * (lum0[i] - blur[i])))
  // stretch the contrast between the 3rd and 97th percentiles
  const sorted = Array.from(lum).sort((a, b) => a - b)
  const lo = sorted[Math.floor(sorted.length * 0.03)], hi = sorted[Math.floor(sorted.length * 0.97)] || 255
  // a plain backdrop behind me is left blank, so the figure stands on the terminal in either theme:
  // cells close to the border's tone and joined to the border are treated as background
  const edge = []
  for (let x = 0; x < cols; x++) edge.push(lum0[x], lum0[(rows - 1) * cols + x])
  for (let y = 0; y < rows; y++) edge.push(lum0[y * cols], lum0[y * cols + cols - 1])
  edge.sort((a, b) => a - b)
  const bgL = edge[Math.floor(edge.length / 2)], tol = 22
  const bg = new Uint8Array(cols * rows), stack = []
  const seed = (i) => { if (!bg[i] && Math.abs(lum0[i] - bgL) < tol) { bg[i] = 1; stack.push(i) } }
  for (let x = 0; x < cols; x++) { seed(x); seed((rows - 1) * cols + x) }
  for (let y = 0; y < rows; y++) { seed(y * cols); seed(y * cols + cols - 1) }
  while (stack.length) {
    const i = stack.pop(), x = i % cols, y = (i - x) / cols
    if (x > 0) seed(i - 1); if (x < cols - 1) seed(i + 1); if (y > 0) seed(i - cols); if (y < rows - 1) seed(i + cols)
  }
  // the cells along the edge of the figure are half backdrop: blank those that are still mostly backdrop,
  // so no bright rim outlines the hair
  const rim = []
  for (let i = 0; i < bg.length; i++) {
    if (bg[i]) continue
    const x = i % cols
    const near = (x > 0 && bg[i - 1]) || (x < cols - 1 && bg[i + 1]) || (i >= cols && bg[i - cols]) || (i + cols < bg.length && bg[i + cols])
    if (near && Math.abs(lum0[i] - bgL) < 70) rim.push(i)
  }
  for (const i of rim) bg[i] = 1
  // if that would blank most of the picture, the backdrop is not plain: keep everything
  const bgShare = bg.reduce((a, b) => a + b, 0) / bg.length
  // spread the tones of the figure itself evenly (histogram equalisation over the non-background
  // cells), so the face gets the full range of characters and the eyes, brows and mouth read
  const keep = bgShare < 0.8
  const subj = []
  for (let i = 0; i < lum.length; i++) if (!(keep && bg[i])) subj.push(lum[i])
  subj.sort((a, b) => a - b)
  const rank = (l) => {
    let a = 0, b = subj.length
    while (a < b) { const m = (a + b) >> 1; if (subj[m] < l) a = m + 1; else b = m }
    return a / Math.max(1, subj.length - 1)
  }
  // each cell: how much ink it gets (0 to 1), from which both its character and its strength follow.
  // On dark the bright parts of the photo carry the ink, on light the dark parts do
  const ink = new Float32Array(cols * rows)
  for (let i = 0; i < ink.length; i++) {
    if (keep && bg[i]) { ink[i] = -1; continue }
    const lin = Math.min(1, Math.max(0, (lum[i] - lo) / Math.max(1, hi - lo)))
    const v = 0.7 * rank(lum[i]) + 0.3 * lin
    // a faint floor, so even the darkest hair on dark (or the brightest skin on light) keeps its texture
    ink[i] = 0.1 + 0.9 * Math.pow(dark ? v : 1 - v, gamma)
  }
  return { cols, rows, ink }
}

