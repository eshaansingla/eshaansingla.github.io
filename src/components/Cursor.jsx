import { useEffect, useRef } from 'react'

// The system pointer stays; a soft ring eases behind it and grows over anything clickable.
export default function Cursor() {
  const ring = useRef(null)

  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    let x = -100, y = -100, rx = -100, ry = -100, r = 14, tr = 14, seen = false, down = false, raf = 0
    let prev = performance.now()

    const move = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      if (!seen) { seen = true; rx = x; ry = y }
      const t = e.target
      const text = t.closest?.('input[type="text"], input:not([type]), textarea')
      const hot = t.closest?.('a, button, [role="button"], [role="tab"], [role="switch"], [role="radio"], [role="slider"], input[type="range"], [data-cursor]')
      tr = text ? 0 : hot ? 20 : 0
    }
    const press = () => (down = true)
    const lift = () => (down = false)
    const leave = (e) => { if (!e.relatedTarget) seen = false }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const k = reduced ? 1 : 1 - Math.pow(0.0008, dt)
      rx += (x - rx) * k
      ry += (y - ry) * k
      r += ((down ? tr * 0.75 : tr) - r) * (reduced ? 1 : 1 - Math.pow(0.002, dt))
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx - r}px, ${ry - r}px, 0)`
        ring.current.style.width = ring.current.style.height = `${r * 2}px`
        ring.current.style.opacity = seen && tr ? '1' : '0'
      }
      raf = requestAnimationFrame(frame)
    }

    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', press)
    addEventListener('pointerup', lift)
    document.addEventListener('mouseout', leave)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', press)
      removeEventListener('pointerup', lift)
      document.removeEventListener('mouseout', leave)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div ref={ring} className="absolute left-0 top-0 rounded-full border border-signal/50 bg-signal/[0.06] opacity-0 transition-opacity duration-200" />
    </div>
  )
}
