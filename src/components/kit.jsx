import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'

export const EASE = [0.22, 1, 0.36, 1]

/** A number that glides to its new value instead of jumping. */
export function Tween({ value, format = (v) => v.toFixed(0), duration = 0.6, className = '' }) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) { setV(value); from.current = value; return }
    const c = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (x) => { from.current = x; setV(x) },
    })
    return () => c.stop()
  }, [value, duration, reduce])
  return <span className={`tabular-nums ${className}`}>{format(v)}</span>
}

/** Segmented control with a sliding indicator. */
export function Seg({ options, value, onChange, label, size = 'md', wrap = false }) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative border border-ink/20 bg-canvas p-[3px] ${wrap ? 'flex flex-wrap gap-y-0.5 rounded-[18px] sm:inline-flex sm:rounded-full' : 'inline-flex rounded-full'}`}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault()
        const el = e.currentTarget
        const vals = options.map((o) => (Array.isArray(o) ? o[0] : o))
        const i = vals.indexOf(value)
        const n = vals[(i + (e.key === 'ArrowRight' ? 1 : vals.length - 1)) % vals.length]
        onChange(n)
        requestAnimationFrame(() => el.querySelector('[aria-checked="true"]')?.focus())
      }}
    >
      {options.map((o) => {
        const [v, text] = Array.isArray(o) ? o : [o, o]
        const on = v === value
        return (
          <button
            key={v}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(v)}
            className={`relative z-0 whitespace-nowrap rounded-full font-mono leading-none transition-colors duration-200 ${
              size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'
            } ${on ? 'text-canvas' : 'text-ink-2 hover:text-ink'}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {text}
          </button>
        )
      })}
    </div>
  )
}

/** Pill button. */
export function Btn({ children, primary, className = '', ...p }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[12px] leading-none transition-[background-color,color,transform] duration-200 active:scale-[0.97] disabled:opacity-40 ${
        primary ? 'bg-signal text-signal-ink hover:bg-ink hover:text-canvas' : 'border border-ink/20 bg-canvas text-ink hover:border-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/** Toggle switch with a springy knob. */
export function Toggle({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors duration-300 ${on ? 'bg-signal' : 'bg-ink/15'}`}
    >
      <motion.span
        className="absolute h-4 w-4 rounded-full bg-canvas shadow-[0_1px_2px_rgb(0_0_0/0.25)]"
        initial={false}
        animate={{ left: on ? 21 : 3 }}
        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
      />
    </button>
  )
}

/** Small "readout" stat used in figure toolbars. */
export function Stat({ label, children, accent, ch }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap font-mono text-[12px]">
      <span className="text-mute">{label}</span>
      {/* ch: the widest value in characters, reserved so a changing number never re-wraps the toolbar */}
      <b className={`font-medium tabular-nums ${accent ? 'text-signal' : 'text-ink'}`} style={ch ? { display: 'inline-block', minWidth: `${ch}ch` } : undefined}>{children}</b>
    </span>
  )
}

/** Fires once when the element first scrolls into view. */
export function useSeen(margin = '-80px') {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { rootMargin: `0px 0px ${margin} 0px` })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, seen]
}

/* ───────────────────────── device chrome ───────────────────────── */

export function useClock() {
  const fmt = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())
  const [t, setT] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

function Clock() {
  const t = useClock()
  return <span className="tabular-nums">{t} IST</span>
}

/** Status label (text only). Running states get a soft breathing opacity. */
export function LiveDot({ status = 'live', label }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[10.5px] uppercase tracking-[0.14em] ${status === 'down' || status === 'idle' ? 'text-mute' : 'text-signal'} ${status === 'run' ? 'motion-safe:animate-pulse' : ''}`}
    >
      {label}
    </span>
  )
}

/** An instrument: title bar with status + clock, optional toolbar, body, status footer. */
export function Device({ name, sub, status = 'live', statusLabel = 'live', right, toolbar, footer, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-rule-2 bg-paper text-ink shadow-[0_1px_0_rgb(0_0_0/0.03),0_30px_60px_-40px_rgb(0_0_0/0.45)] ${className}`}>
      <div className="flex items-center gap-3 border-b border-rule bg-ink/[0.015] px-4 py-2.5">
        <LiveDot status={status} label={statusLabel} />
        <span className="font-mono text-[11.5px] font-medium">{name}</span>
        {sub && <span className="hidden truncate font-mono text-[11px] text-mute md:inline">{sub}</span>}
        <span className="ml-auto flex shrink-0 items-center gap-4 font-mono text-[10.5px] text-mute">
          {right}
          <span className="hidden sm:inline"><Clock /></span>
        </span>
      </div>
      {toolbar && <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-rule px-4 py-3">{toolbar}</div>}
      {children}
      {footer && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule bg-ink/[0.02] px-4 py-2 font-mono text-[10.5px] text-mute">{footer}</div>
      )}
    </div>
  )
}

const panelKids = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

/**
 * Detail panel anchored inside a `relative` container at (left%, top%).
 * rows: [label, value] pairs revealed with a stagger. Esc or an outside press closes it.
 */
export function Panel({ open, onClose, left = 50, top = 50, title, rows = [], children, action }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const key = (e) => e.key === 'Escape' && onClose()
    const down = (e) => ref.current && !ref.current.contains(e.target) && onClose()
    addEventListener('keydown', key)
    const t = setTimeout(() => addEventListener('pointerdown', down), 0)
    return () => { removeEventListener('keydown', key); removeEventListener('pointerdown', down); clearTimeout(t) }
  }, [open, onClose])
  const right = left > 58
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          style={{ top: `${top}%`, ...(right ? { right: `${Math.max(2, 100 - left)}%` } : { left: `${Math.max(2, left)}%` }), transformOrigin: right ? 'top right' : 'top left' }}
          className="absolute z-30 w-[min(280px,86%)] rounded-xl border border-ink/10 bg-canvas/95 p-3.5 text-ink shadow-[0_18px_40px_-16px_rgb(0_0_0/0.45)] backdrop-blur-md"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="font-mono text-[11.5px] font-medium text-signal">{title}</p>
            <button onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 grid h-6 w-6 place-items-center rounded-full text-mute transition-colors hover:bg-ink/10 hover:text-ink">✕</button>
          </div>
          <motion.dl initial="hidden" animate="show" transition={{ staggerChildren: 0.045 }} className="space-y-1">
            {rows.map(([k, v]) => (
              <motion.div key={k} variants={panelKids} className="flex items-baseline justify-between gap-4 border-b border-rule pb-1 font-mono text-[11.5px]">
                <dt className="text-mute">{k}</dt>
                <dd className="text-right">{v}</dd>
              </motion.div>
            ))}
          </motion.dl>
          {children && <motion.div initial="hidden" animate="show" variants={panelKids} className="pt-1.5 text-[14px] leading-snug text-ink-2">{children}</motion.div>}
          {action && <motion.div initial="hidden" animate="show" variants={panelKids} className="pt-2">{action}</motion.div>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
