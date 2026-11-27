import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn, Device, Panel, Stat, Tween } from '../kit'

// Internship speed-up, find the bottleneck. Stage times are illustrative; the −40% target is the measured result.
const STAGES = [
  { id: 'load', name: 'load recordings', before: 110, after: 95, effort: 2, fix: 'memory-mapped reads' },
  { id: 'resample', name: 'resample', before: 170, after: 110, effort: 1, fix: 'one polyphase pass' },
  { id: 'filter', name: 'band-pass filter', before: 240, after: 140, effort: 2, fix: 'vectorised per channel' },
  { id: 'segment', name: 'window & segment', before: 90, after: 80, effort: 1, fix: 'stride tricks' },
  { id: 'features', name: 'feature extraction', before: 520, after: 230, effort: 3, fix: 'NumPy, no row loops' },
  { id: 'write', name: 'write features', before: 70, after: 30, effort: 1, fix: 'one batched write' },
]
const BASE = STAGES.reduce((s, x) => s + x.before, 0)
const TARGET = 0.4
const BEST = 7

export default function BottleneckToy() {
  const [fixed, setFixed] = useState(() => new Set())
  const barRef = useRef(null)
  const [barW, setBarW] = useState(800)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setBarW(e.contentRect.width))
    ro.observe(barRef.current)
    return () => ro.disconnect()
  }, [])
  const t = (s) => (fixed.has(s.id) ? s.after : s.before)
  const total = STAGES.reduce((a, s) => a + t(s), 0)
  const saved = 1 - total / BASE
  const effort = STAGES.reduce((a, s) => a + (fixed.has(s.id) ? s.effort : 0), 0)
  const bottleneck = STAGES.reduce((a, s) => (t(s) > t(a) ? s : a))
  const hit = saved >= TARGET - 1e-9
  const [sel, setSel] = useState(null)
  const closeSel = useCallback(() => setSel(null), [])
  const flip = (id) => setFixed((f) => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n })

  const selS = STAGES.find((x) => x.id === sel)
  let acc = 0
  const starts = Object.fromEntries(STAGES.map((x) => { const a = acc; acc += t(x); return [x.id, a] }))

  return (
    <Device
      name="profiler, feature pipeline"
      sub="per 1,000 samples"
      status="live"
      statusLabel="profiling"
      toolbar={
        <>
          <Btn onClick={() => { setFixed(new Set()); setSel(null) }}>reset</Btn>
          <span className="font-mono text-[12px] text-mute">fix stages, spend as little effort as you can</span>
          <div className="ml-auto flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <Stat label="runtime"><Tween value={total} format={(v) => `${Math.round(v)} ms`} /></Stat>
            <Stat label="saved" accent={hit}><Tween value={saved * 100} format={(v) => `${v.toFixed(1)}%`} /></Stat>
            <Stat label="effort"><Tween value={effort} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span>click a block for its trace, Enter on a card applies a fix</span>
          <span className="ml-auto">bottleneck: {bottleneck.name}</span>
        </>
      }
    >
      <div className="relative px-4 pb-5 pt-9 md:px-6">
        <div className="relative">
          <div className="mb-1.5 flex justify-between font-mono text-[9.5px] text-mute">
            {[0, 200, 400, 600, 800, 1000, 1200].map((ms) => <span key={ms}>{ms}</span>)}
          </div>
          <div ref={barRef} className="flex h-14 w-full gap-[3px]">
            {STAGES.map((s) => {
              const isB = s.id === bottleneck.id
              const on = fixed.has(s.id)
              return (
                <motion.button
                  key={s.id}
                  onClick={() => setSel(s.id)}
                  title={`${s.name}: ${t(s)} ms`}
                  className={`relative h-full shrink-0 overflow-hidden rounded-lg text-left font-mono text-[10.5px] leading-tight ${
                    isB ? 'bg-signal text-signal-ink' : on ? 'bg-ink/15 text-ink' : 'bg-ink text-canvas'
                  }`}
                  initial={false}
                  animate={{ width: `calc(${(t(s) / BASE) * 100}% - 3px)` }}
                  transition={{ type: 'spring', stiffness: 170, damping: 24 }}
                  whileHover={{ y: -2 }}
                  aria-label={`${s.name}: ${t(s)} ms${on ? ', fixed' : ''}`}
                >
                  {isB && (
                    <motion.span
                      className="absolute inset-0 opacity-25"
                      style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,.35) 8px 10px)', backgroundSize: '28px 28px' }}
                      animate={{ backgroundPositionX: ['0px', '28px'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  {/* labels only where the block is wide enough on this screen to hold them whole */}
                  <span className="relative block px-2 pt-2">{(t(s) / BASE) * barW >= 84 ? s.name : ''}</span>
                  <span className="relative block px-2 opacity-70">{(t(s) / BASE) * barW >= 54 ? `${t(s)} ms` : ''}</span>
                </motion.button>
              )
            })}
          </div>
          {/* target */}
          <motion.div
            className="pointer-events-none absolute -bottom-2 -top-7 w-0"
            style={{ left: `${(1 - TARGET) * 100}%` }}
            animate={hit ? { scale: [1, 1.04, 1] } : {}}
          >
            <span className={`absolute bottom-0 top-5 border-l-2 border-dashed ${hit ? 'border-signal' : 'border-ink/50'}`} />
            <span className={`absolute left-0 top-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10.5px] transition-colors ${hit ? 'bg-signal text-signal-ink' : 'bg-ink/[0.08] text-ink'}`}>
              {hit ? '✓ −40% reached' : '−40%, the measured result'}
            </span>
          </motion.div>
        </div>

        <Panel
          open={!!selS}
          onClose={closeSel}
          left={selS ? ((starts[selS.id] + t(selS) / 2) / BASE) * 100 : 50}
          top={30}
          title={selS ? selS.name : ''}
          rows={selS ? [['starts at', `${starts[selS.id]} ms`], ['duration', `${t(selS)} ms`], ['share', `${Math.round((t(selS) / total) * 100)}%`], ['fix', selS.fix], ['effort', `${selS.effort} of 3`]] : []}
          action={selS && <Btn primary onClick={() => flip(selS.id)}>{fixed.has(selS.id) ? 'undo fix' : `apply fix, −${selS.before - selS.after} ms`}</Btn>}
        />

        <ul className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => {
            const on = fixed.has(s.id)
            const isB = s.id === bottleneck.id
            return (
              <li key={s.id}>
                <motion.button
                  layout
                  onClick={() => flip(s.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    on ? 'border-signal/50 bg-signal/[0.06]' : isB ? 'border-signal/70' : 'border-rule hover:border-ink/40'
                  }`}
                >
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] transition-colors ${on ? 'border-signal bg-signal text-signal-ink' : 'border-ink/30'}`}>
                    {on ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`text-[15.5px] leading-tight ${isB ? 'text-signal' : ''}`}>{s.name}</span>
                      <span className="font-mono text-[11px] text-mute">{Math.round((t(s) / total) * 100)}%</span>
                    </span>
                    <span className="mt-1 block font-mono text-[10.5px] text-mute">
                      {on ? s.fix : `${s.before} → ${s.after} ms, effort ${s.effort} of 3`}
                    </span>
                  </span>
                </motion.button>
              </li>
            )
          })}
        </ul>

        <AnimatePresence>
          {hit && (
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="mt-4 rounded-xl bg-ink/[0.04] p-3.5 text-[15.5px] italic leading-snug text-ink-2"
            >
              {effort <= BEST
                ? `Done with effort ${effort}, the cheapest route. The big stage came first, and the cheap write fix finished it.`
                : `Done, with effort ${effort}. There’s a route costing ${BEST}: after each fix, look at what’s largest now before spending more.`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </Device>
  )
}
