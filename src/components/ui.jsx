import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { refs } from '../data'
import { EASE, useSeen } from './kit'

/** Body row: main text column + margin note (sidenote on wide screens, inline note on small). */
export function Row({ children, note, className = '', hang = false }) {
  return (
    <div className={`mx-auto grid max-w-[1040px] grid-cols-[minmax(0,1fr)] gap-x-12 px-5 md:px-8 xl:grid-cols-[660px_1fr] ${className}`}>
      <div>{children}</div>
      {note ? (
        <aside className={`mt-3 font-mono text-[12px] leading-[1.6] text-mute xl:mt-1.5 ${hang ? 'xl:relative xl:z-10 xl:h-0 xl:overflow-visible' : ''}`}>
          <div className="border-l border-signal/60 pl-3">{note}</div>
        </aside>
      ) : (
        <div className="hidden xl:block" />
      )}
    </div>
  )
}

export const Num = ({ children }) => <span className="num">{children}</span>

/** Inline citation with a hover card. */
export function Cite({ n }) {
  const r = refs[n]
  return (
    <a
      href={r.href}
      target="_blank"
      rel="noreferrer"
      className="group relative ml-0.5 font-mono text-[0.68em] text-signal no-underline hover:underline"
      aria-label={`Reference ${n}: ${r.label}`}
    >
      [{n}]
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-60 -translate-x-1/2 rounded-lg border border-ink/15 bg-canvas p-3 text-left font-mono text-[11px] leading-snug text-ink shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] md:group-hover:block md:group-focus-visible:block">
        <span className="block text-signal">[{n}] {r.label}</span>
        <span className="mt-1 block text-ink-2">{r.text}</span>
      </span>
    </a>
  )
}

export function H2({ id, n, children }) {
  const [ref, seen] = useSeen('-60px')
  return (
    <Row className="mb-6 mt-24 md:mt-32">
      <div ref={ref} className="relative pt-4">
        <motion.span
          className="absolute left-0 top-0 h-px w-full origin-left bg-ink"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: seen ? 1 : 0 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
        <h2 id={id} className="flex items-baseline gap-5 text-[2rem] font-medium leading-tight tracking-[-0.015em] md:text-[2.4rem]">
          <motion.span
            className="font-mono text-[0.45em] font-normal text-signal"
            initial={{ opacity: 0 }}
            animate={{ opacity: seen ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {n}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: seen ? 1 : 0, y: seen ? 0 : 14 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          >
            {children}
          </motion.span>
        </h2>
      </div>
    </Row>
  )
}

export function H3({ id, n, children, meta }) {
  return (
    <Row className="mb-3 mt-16" note={meta} hang>
      <h3 id={id} className="text-[1.45rem] font-medium leading-snug tracking-[-0.01em]">
        <span className="mr-3 font-mono text-[0.6em] text-mute">{n}</span>
        {children}
      </h3>
    </Row>
  )
}

export function P({ children, note }) {
  return (
    <Row note={note} className="mb-4">
      <p className="prose-p">{children}</p>
    </Row>
  )
}

/**
 * Figure plate. On first view a signal-coloured line traces the plate's outline, then the
 * contents rise in. Controls sit in a toolbar; caption is numbered like a paper.
 */
/** On phones a long caption opens at three lines with a toggle for the rest; wider screens show it whole. */
function Caption({ text }) {
  const [open, setOpen] = useState(false)
  const long = typeof text === 'string' && text.length > 170
  return (
    <span className="italic text-ink-2">
      <span className={long && !open ? 'line-clamp-3 sm:line-clamp-none' : ''}>{text}</span>
      {long && (
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 font-mono text-[11.5px] not-italic text-signal sm:hidden">
          {open ? 'less' : 'more'}
        </button>
      )}
    </span>
  )
}

export function Figure({ id, n, caption, children, ph = [900, 600, 600] }) {
  const [ref, seen] = useSeen('-120px')
  return (
    <figure id={id} className="mx-auto my-12 max-w-[1040px] px-5 md:px-8">
      <div ref={ref} className="relative">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: seen ? 1 : 0, y: seen ? 0 : 18 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        >
          {/* figures load just after the page does; until then a frame of the same size holds their place */}
          <Suspense fallback={<div aria-hidden="true" className="h-[var(--ph0)] rounded-[16px] border border-rule-2 bg-paper md:h-[var(--ph1)] lg:h-[var(--ph2)]" style={{ '--ph0': `${ph[0]}px`, '--ph1': `${ph[1]}px`, '--ph2': `${ph[2]}px` }} />}>
            {children}
          </Suspense>
        </motion.div>
        {/* outline trace */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <motion.rect
            x="0.5" y="0.5" rx="16"
            style={{ width: 'calc(100% - 1px)', height: 'calc(100% - 1px)' }}
            fill="none" className="stroke-signal" strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={seen ? { pathLength: 1, opacity: [1, 1, 0] } : {}}
            transition={{ pathLength: { duration: 1.2, ease: EASE }, opacity: { duration: 1.9, times: [0, 0.65, 1] } }}
          />
        </svg>
      </div>
      <figcaption className="mt-3.5 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-1 text-[15px] leading-snug sm:grid-cols-[72px_1fr] xl:grid-cols-[72px_588px]">
        <span className="font-mono text-[12px] uppercase tracking-wider text-signal">Fig. {n}</span>
        <Caption text={caption} />
      </figcaption>
    </figure>
  )
}
