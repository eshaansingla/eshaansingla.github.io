import { useEffect, useRef, useState } from 'react'
import { toGrid } from './asciiGrid'

// A small terminal that renders my photo as ASCII: it types the command, prints the portrait row by
// row, then waits at a prompt.
// The terminal follows the theme: white characters on dark, black on light.
// only a small greyscale copy of the photo is shipped, as the source for the characters; the photo itself never appears
const PHOTO = `${import.meta.env.BASE_URL}esh-luma.png`
const CMD = 'ascii --render esh.png'
const RAMP = ' .\'`:-~=+*cox#%8&@'

const isDark = () => document.documentElement.classList.contains('dark')
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// one character cell, in CSS pixels, the type drawn in it, and how the photo is toned for each theme.
// White on dark gets a gentler sharpen and lifted mid-tones so the face reads relaxed, not shadowed
const LOOK = {
  dark: { cw: 2.5, ch: 3.5, font: 4.2, sharpen: 0.6, gamma: 0.75 },
  light: { cw: 2.2, ch: 3, font: 3.7, sharpen: 1.4, gamma: 1 },
}

export default function Portrait({ className = '' }) {
  const body = useRef(null)
  const canvas = useRef(null)
  const [grid, setGrid] = useState(null)
  const [typed, setTyped] = useState(0)
  const [shown, setShown] = useState(0)
  const [ready, setReady] = useState(false)
  const imgRef = useRef(null)
  const rows = grid ? grid.rows : 0

  // load the photo, then work out the grid from the space the terminal actually has
  useEffect(() => {
    let alive = true
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => { if (alive) { imgRef.current = img; setReady(true) } }
    img.src = PHOTO
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    const el = body.current
    const build = () => {
      const r = el.getBoundingClientRect()
      if (r.width < 40 || r.height < 40) return
      const dark = isDark(), L = dark ? LOOK.dark : LOOK.light
      const cols = Math.floor(r.width / L.cw), rws = Math.floor(r.height / L.ch)
      setGrid({ ...toGrid(imgRef.current, cols, rws, L.cw / L.ch, dark, L), w: r.width, h: r.height, dark, L })
    }
    build()
    const ro = new ResizeObserver(build)
    ro.observe(el)
    // which parts carry the ink depends on the background, so redraw when the theme changes
    const mo = new MutationObserver(build)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { ro.disconnect(); mo.disconnect() }
  }, [ready])

  // draw the rows printed so far: each character takes its shape and its strength from the photo
  useEffect(() => {
    const cv = canvas.current
    if (!grid || !cv) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    cv.width = Math.round(grid.w * dpr); cv.height = Math.round(grid.h * dpr)
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, grid.w, grid.h)
    const { cw: CELL_W, ch: CELL_H, font: FONT } = grid.L
    ctx.font = `${FONT}px ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const rgb = grid.dark ? '255,255,255' : '0,0,0'
    const offX = (grid.w - grid.cols * CELL_W) / 2
    for (let y = 0; y < Math.min(shown, grid.rows); y++) {
      for (let x = 0; x < grid.cols; x++) {
        const k = grid.ink[y * grid.cols + x]
        if (k < 0.04) continue
        const ch = RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(k * (RAMP.length - 1)))]
        ctx.fillStyle = `rgba(${rgb},${(0.16 + 0.84 * Math.pow(k, 1.1)).toFixed(3)})`
        ctx.fillText(ch, offX + (x + 0.5) * CELL_W, (y + 0.5) * CELL_H)
      }
    }
  }, [grid, shown])

  // type the command, then print the portrait a row at a time
  useEffect(() => {
    if (!rows) return
    if (reduced()) { setTyped(CMD.length); setShown(rows); return }
    if (typed < CMD.length) {
      const id = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 700 : 38 + Math.random() * 40)
      return () => clearTimeout(id)
    }
    if (shown < rows) {
      const id = setTimeout(() => setShown((n) => Math.min(rows, n + 2)), shown === 0 ? 260 : 32)
      return () => clearTimeout(id)
    }
  }, [rows, typed, shown])

  const done = rows > 0 && shown >= rows
  return (
    <figure className={`flex flex-col overflow-hidden rounded-md border border-rule-2 bg-[color-mix(in_srgb,var(--ink)_3%,var(--canvas))] font-mono ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-rule px-2.5 py-1.5" aria-hidden="true">
        <span className="size-[7px] rounded-full bg-rule-2" />
        <span className="size-[7px] rounded-full bg-rule-2" />
        <span className="size-[7px] rounded-full bg-signal/80" />
        <span className="ml-1.5 truncate text-[10px] text-mute">esh.png</span>
      </div>
      <div className="px-2.5 pt-1.5 text-[10.5px] leading-[1.5] text-ink-2" aria-hidden="true">
        <span className="text-signal">$</span> {CMD.slice(0, typed)}
        {typed < CMD.length && <span className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[2px] bg-ink-2 [animation:blink_1s_steps(1)_infinite]" />}
      </div>
      <div role="img" aria-label="ASCII portrait of Eshaan Singla" className="relative mx-2.5 mt-1 min-h-0 flex-1 overflow-hidden">
        <div ref={body} className="absolute inset-0">
          <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden="true" />
        </div>
      </div>
      <div className="px-2.5 pb-1.5 pt-1 text-[10.5px] leading-[1.5] text-ink-2" aria-hidden="true">
        {done ? (
          <>
            <span className="text-signal">$</span>{' '}
            <span className="inline-block h-[1.05em] w-[0.55em] translate-y-[2px] bg-ink-2 [animation:blink_1s_steps(1)_infinite]" />
          </>
        ) : <span>&nbsp;</span>}
      </div>
    </figure>
  )
}
