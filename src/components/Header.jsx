import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useTheme } from '../theme'
import { profile } from '../data'

const LINKS = [
  ['work', 'Work'],
  ['experience', 'Experience'],
  ['results', 'Results'],
  ['references', 'Contact'],
]

// A pulse trace that draws itself as you read.
const TRACE = (() => {
  let d = 'M0 9'
  for (let k = 0; k < 24; k++) {
    const o = k * 50
    d += ` L${o + 20} 9 L${o + 24} 2 L${o + 28} 14 L${o + 31} 7 L${o + 34} 9 L${o + 50} 9`
  }
  return d
})()

function ThemeSwitch() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid h-8 w-8 place-items-center rounded-full border border-ink/25 transition-colors hover:border-ink"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4 overflow-visible" aria-hidden="true">
        <motion.g initial={false} animate={{ rotate: dark ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} style={{ transformOrigin: '10px 10px' }}>
          <circle cx="10" cy="10" r="4.6" className="fill-none stroke-ink" strokeWidth="1.4" />
          <path d="M10 5.4 A4.6 4.6 0 0 1 10 14.6 Z" className="fill-ink" />
        </motion.g>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <g key={a} transform={`rotate(${a} 10 10)`}>
            <motion.line
              x1="10" y1="0.8" x2="10" y2="2.8"
              className="stroke-ink"
              strokeWidth="1.4"
              initial={false}
              animate={{ opacity: dark ? 0 : 1, y: dark ? 2 : 0 }}
              transition={{ duration: 0.25 }}
            />
          </g>
        ))}
      </svg>
    </button>
  )
}

export default function Header() {
  const { scrollYProgress } = useScroll()
  const len = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const width = useTransform(len, (v) => `${v * 100}%`)
  const [active, setActive] = useState('')

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-30% 0px -60% 0px' },
    )
    LINKS.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-4 px-5 md:px-8">
        <a href="#top" className="whitespace-nowrap text-[17px] italic">
          E. Singla <span className="ml-1.5 not-italic text-mute">working notes</span>
        </a>
        <nav className="flex items-center gap-2 font-mono text-[11.5px] md:gap-3" aria-label="Sections">
          {LINKS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={`hidden rounded-full px-2 py-1 transition-colors hover:text-signal sm:inline ${active === id ? 'text-signal' : 'text-ink-2'}`}
            >
              {label}
            </a>
          ))}
          <a href={profile.resume} download className="ml-1 hidden rounded-full border border-ink/30 px-3 py-1.5 transition-colors hover:border-ink hover:bg-ink hover:text-canvas sm:inline">
            résumé.pdf ↓
          </a>
          <ThemeSwitch />
          <MobileMenu active={active} />
        </nav>
      </div>
      <div className="relative h-3 w-full" aria-hidden="true">
        <div className="absolute inset-x-0 top-[9px] h-px bg-ink/10" />
        <motion.div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width }}>
          <svg viewBox="0 0 1200 16" preserveAspectRatio="none" className="block h-3 w-screen">
            <path d={TRACE} fill="none" className="stroke-signal" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </motion.div>
      </div>
    </header>
  )
}

/** Phones: sections, résumé and mail in one tap-friendly sheet. */
function MobileMenu({ active }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const key = (e) => e.key === 'Escape' && setOpen(false)
    const down = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    addEventListener('keydown', key)
    addEventListener('pointerdown', down)
    return () => { removeEventListener('keydown', key); removeEventListener('pointerdown', down) }
  }, [open])
  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="grid h-9 w-9 place-items-center rounded-full border border-ink/20 text-ink"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path d={open ? 'M3 3 L13 13 M13 3 L3 13' : 'M2 4.5 H14 M2 8 H14 M2 11.5 H14'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-11 w-56 origin-top-right rounded-2xl border border-ink/10 bg-canvas p-2 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.4)]"
          >
            {LINKS.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className={`block rounded-xl px-3 py-2.5 font-mono text-[13px] ${active === id ? 'text-signal' : 'text-ink'} active:bg-ink/5`}>
                {label}
              </a>
            ))}
            <div className="my-1.5 h-px bg-rule" />
            <a href={profile.resume} download onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 font-mono text-[13px] text-ink active:bg-ink/5">résumé.pdf ↓</a>
            <a href={`mailto:${profile.email}?subject=${encodeURIComponent('Hello Eshaan')}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 font-mono text-[13px] text-signal active:bg-ink/5">Mail me ↗</a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
