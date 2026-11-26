import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn, Device, EASE, Tween } from '../kit'

// Pran leakage audit, every number is from github.com/eshaansingla/Pran (hardware-vasalva-method/, testing/).
const CHECKS = [
  { name: 'Untouched final test, 29 subjects', v: 0.995, verdict: 'result',
    note: 'Scored once, after every modelling choice was frozen. Sensitivity 0.957, specificity 0.967 at the threshold picked on validation subjects.' },
  { name: 'Development set, subject-grouped 10-fold CV', v: 0.994, verdict: 'holds',
    note: '117 subjects. The final test is no worse than development, so nothing leaked out of the test set during model selection.' },
  { name: 'Shuffle the labels inside each subject', v: 0.501, verdict: 'holds',
    note: 'If the pipeline were leaking subject identity or time, this would stay high. It falls to chance.' },
  { name: 'Hold out whole recording batches', v: [0.989, 0.998], verdict: 'holds',
    note: 'Five blocks of consecutive subject IDs, each held out in turn: 0.989 to 0.998.' },
  { name: 'Train on early volunteers, test on late ones', v: 0.99, verdict: 'holds',
    note: '0.990 one way, 0.992 the other. Drift across weeks of recording isn’t doing the work.' },
  { name: 'Tell early from late inside one resting session', v: 0.503, verdict: 'holds',
    note: 'At chance (0.503): the model responds to the manoeuvre itself, independent of how long the sensor has been running.' },
  { name: 'Swap XGBoost for plain logistic regression', v: 0.982, verdict: 'holds',
    note: 'A linear model gets almost all the way, so the signal is in the features, not in tuning. 14 models ran under the same protocol.' },
  { name: 'Waveform-only features vs the full optical set', v: 0.703, verdict: 'insight',
    note: 'Waveform-shape features alone reach 0.703. Adding the 27 optical channel features lifts the model to 0.995: the custom optics are what make it work.' },
]

const VERDICT = {
  result: ['result', 'bg-signal text-signal-ink'],
  holds: ['holds', 'bg-ink/[0.07] text-ink'],
  insight: ['insight', 'ring-1 ring-inset ring-signal/60 text-signal'],
}

const ICON = { result: '★', holds: '✓', insight: '◆' }

const X0 = 0.4
const pct = (v) => ((v - X0) / (1 - X0)) * 100
const COLS = 'md:grid-cols-[26px_minmax(0,1fr)_minmax(0,1.05fr)_190px]'

export default function AuditFig() {
  const [ran, setRan] = useState(() => new Set([0]))
  const [active, setActive] = useState(null)
  const [open, setOpen] = useState(null)
  const timers = useRef([])

  const runAll = () => {
    timers.current.forEach(clearTimeout)
    setOpen(null)
    setRan(new Set([0]))
    CHECKS.forEach((_, i) => {
      if (!i) return
      timers.current.push(setTimeout(() => { setActive(i); setRan((r) => new Set(r).add(i)) }, 260 * i))
    })
    timers.current.push(setTimeout(() => setActive(null), 260 * CHECKS.length + 300))
  }
  const toggle = (i) => {
    setRan((r) => new Set(r).add(i))
    setOpen((o) => (o === i ? null : i))
  }

  const count = (v) => CHECKS.filter((c, i) => ran.has(i) && c.verdict === v).length
  const done = ran.size === CHECKS.length

  const running = active !== null
  const listRef = useRef(null)
  const onKeys = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const btns = [...listRef.current.querySelectorAll('button[data-row]')]
    const i = btns.indexOf(document.activeElement)
    if (i < 0) return
    e.preventDefault()
    btns[Math.max(0, Math.min(btns.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus()
  }

  return (
    <Device
      name="pran / leakage-audit"
      sub={`${CHECKS.length - 1} checks, every number from the repository`}
      status={running ? 'run' : 'live'}
      statusLabel={running ? 'running' : 'ready'}
      toolbar={
        <>
          <Btn primary onClick={runAll} disabled={running}>{running ? 'Running…' : done ? 'Run again' : 'Run every attack'}</Btn>
          <div className="relative h-1.5 w-28 overflow-hidden rounded-full bg-ink/10">
            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-signal" animate={{ width: `${(ran.size / CHECKS.length) * 100}%` }} transition={{ type: 'spring', stiffness: 140, damping: 22 }} />
          </div>
          <span className="font-mono text-[11px] text-mute">{ran.size - 1}/{CHECKS.length - 1} run</span>
          <span className="ml-auto flex items-center gap-4 font-mono text-[12px]">
            <span><span className="text-mute">checks passed </span><b className="text-signal"><Tween value={count('holds') + count('insight')} /></b><span className="text-mute"> / {CHECKS.length - 1}</span></span>
          </span>
        </>
      }
      footer={
        <>
          <span>source: hardware-vasalva-method/, testing/</span>
          <span>AUC on held-out subjects</span>
          <span className="ml-auto hidden sm:inline">↑ ↓ move, Enter opens</span>
        </>
      }
    >
      <div className={`hidden gap-x-4 px-4 pb-1 pt-4 md:grid ${COLS}`}>
        <span />
        <span />
        <div className="relative h-4 font-mono text-[10px] text-mute">
          {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>{t === 0.5 ? 'chance' : t.toFixed(1)}</span>
          ))}
        </div>
        <span className="text-right font-mono text-[10px] text-mute">AUC</span>
      </div>

      <ol ref={listRef} onKeyDown={onKeys} className="px-2 pb-3">
        {CHECKS.map((c, i) => {
          const isRan = ran.has(i)
          const lo = Array.isArray(c.v) ? c.v[0] : c.v
          const hi = Array.isArray(c.v) ? c.v[1] : c.v
          const [vLabel, vCls] = VERDICT[c.verdict]
          const hot = c.verdict === 'result'
          return (
            <li key={c.name} className="relative">
              {active === i && (
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-lg bg-signal/[0.08]"
                  initial={{ width: '0%', opacity: 1 }}
                  animate={{ width: '100%', opacity: [1, 1, 0] }}
                  transition={{ duration: 0.75, ease: EASE }}
                />
              )}
              <button
                data-row
                onClick={() => toggle(i)}
                aria-expanded={open === i}
                className={`relative grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-ink/[0.03] md:gap-x-4 ${COLS} ${open === i ? 'bg-ink/[0.03]' : ''}`}
              >
                <span className="relative grid h-5 w-5 place-items-center">
                  {active === i ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                  ) : isRan ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[10.5px] ${
                        hot ? 'bg-signal text-signal-ink' : c.verdict === 'insight' ? 'bg-signal/15 text-signal' : 'bg-ink text-canvas'
                      }`}
                    >
                      {ICON[c.verdict]}
                    </motion.span>
                  ) : (
                    <span className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, '0')}</span>
                  )}
                </span>
                <span className={`text-[15.5px] leading-snug ${i === 0 ? 'font-medium' : ''}`}>{c.name}</span>

                <span className="relative col-span-3 col-start-1 h-6 md:col-span-1 md:col-start-auto">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
                  <span className="absolute inset-y-0.5 w-px bg-ink/25" style={{ left: `${pct(0.5)}%` }} />
                  <motion.span
                    className={`absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full ${hot ? 'bg-signal' : 'bg-ink'}`}
                    style={{ left: `${pct(0.5)}%` }}
                    initial={false}
                    animate={{ width: isRan ? `${Math.max(0, pct(lo) - pct(0.5))}%` : '0%' }}
                    transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                  />
                  {hi !== lo && (
                    <motion.span
                      className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-ink/25"
                      style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
                      initial={false}
                      animate={{ opacity: isRan ? 1 : 0 }}
                    />
                  )}
                  <motion.span
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                      hot ? 'border-signal bg-signal' : c.verdict === 'insight' ? 'border-signal bg-paper' : 'border-ink bg-ink'
                    }`}
                    initial={false}
                    animate={{ left: `${pct(isRan ? hi : 0.5)}%`, scale: isRan ? 1 : 0.5, opacity: isRan ? 1 : 0.3 }}
                    transition={{ type: 'spring', stiffness: 90, damping: 16 }}
                  />
                  {isRan && hot && (
                    <motion.span
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal"
                      style={{ left: `${pct(hi)}%` }}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 3, opacity: 0 }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: 0.8, ease: 'easeOut' }}
                    />
                  )}
                </span>

                <span className="col-start-3 row-start-1 flex items-center justify-end gap-2.5 md:col-start-auto md:row-start-auto">
                  <span className="whitespace-nowrap font-mono text-[12.5px]">
                    {isRan ? (
                      Array.isArray(c.v) ? `${lo.toFixed(3)}–${hi.toFixed(3).slice(1)}` : <Tween value={c.v} format={(x) => x.toFixed(3)} duration={1} />
                    ) : (
                      <span className="text-mute">pending</span>
                    )}
                  </span>
                  <motion.span
                    className={`hidden w-[100px] rounded-full px-2 py-1 text-center font-mono text-[10px] leading-none sm:inline-block ${vCls}`}
                    initial={false}
                    animate={{ opacity: isRan ? 1 : 0, scale: isRan ? 1 : 0.85 }}
                    transition={{ duration: 0.35, delay: isRan ? 0.35 : 0 }}
                  >
                    {vLabel}
                  </motion.span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="mb-3 ml-[42px] mr-3 border-l-2 border-signal pl-3 text-[15px] italic leading-snug text-ink-2">{c.note}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ol>
    </Device>
  )
}
