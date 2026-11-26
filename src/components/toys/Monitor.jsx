import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SignalCanvas, { p1, p2 } from '../SignalCanvas'
import { Device, Panel, Seg } from '../kit'

// Fig. 1, presented as an amber bedside monitor. Logic lives in SignalCanvas (unchanged).
function Fps() {
  const ref = useRef(null)
  useEffect(() => {
    let raf, n = 0, t0 = performance.now()
    const f = (t) => {
      n++
      if (t - t0 > 500) { if (ref.current) ref.current.textContent = `${Math.round((n * 1000) / (t - t0))} fps`; n = 0; t0 = t }
      raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <span ref={ref} className="tabular-nums">60 fps</span>
}

export const MANOEUVRES = [
  { id: 'up', label: 'head-up 30°', short: 'HEAD-UP', idx: -0.04, rise: '36%', note: 'tilted up 30°' },
  { id: 'supine', label: 'supine', short: 'SUPINE', idx: 0, rise: 'baseline', note: 'lying flat' },
  { id: 'down', label: 'head-down 10°', short: 'HEAD-DN', idx: 0.24, rise: '99%', note: 'tilted down 10°' },
  { id: 'valsalva', label: 'Valsalva', short: 'VALSALVA', idx: 1.19, rise: '100%', note: 'straining' },
]
const byMan = Object.fromEntries(MANOEUVRES.map((m) => [m.id, m]))
const levelOf = (m) => m.idx / 1.19 // waveform strain scales with the measured response
const fmtIdx = (v) => (v === 0 ? '0.00' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`)

const INFO = {
  hr: {
    title: 'Heart rate',
    rows: [['beat rate', '1.2 Hz'], ['period', '833 ms'], ['source', 'simulated']],
    text: 'The simulated pulse beats at 72 bpm. The real rig sampled the eardrum and PPG at 50 Hz.',
  },
  ratio: {
    title: 'P2 / P1 ratio',
    rows: [['resting', p2(0) / p1(0) > 0 ? (p2(0) / p1(0)).toFixed(2) : '0'], ['full strain', (p2(1) / p1(1)).toFixed(2)], ['flag above', '1.00']],
    text: 'When the brain’s compliance drops, the tidal peak (P2) rises past the percussion peak (P1). A ratio above 1 is the shape clinicians look for.',
  },
  state: {
    title: 'Response by manoeuvre',
    rows: [['head-up 30°', '−0.04, 36% rose'], ['supine', 'baseline'], ['head-down 10°', '+0.24, 99% rose'], ['Valsalva', '+1.19, 100% rose'], ['volunteers', '146']],
    text: 'Optical slow-wave power against each volunteer’s own supine baseline, in baseline SD units (repo: docs/HARDWARE_RESULTS.md). Head-down and Valsalva rise in almost every subject; Valsalva rises in all 146.',
  },
}

export default function Monitor({ man, setMan }) {
  const mode = 'physio'
  const [strain, setStrain] = useState(false)
  const [panel, setPanel] = useState(null)
  const readoutRef = useRef(null)
  const kRef = useRef(null)
  const hold = mode === 'physio'
  const active = strain ? byMan.valsalva : byMan[man]
  const level = levelOf(active)
  const close = useCallback(() => setPanel(null), [])

  useEffect(() => {
    const down = (e) => {
      if (e.code !== 'Space' || e.repeat || e.target !== document.body) return
      const r = document.getElementById('fig-1')?.getBoundingClientRect()
      if (!r || r.bottom < 0 || r.top > innerHeight) return
      e.preventDefault()
      setStrain(true)
    }
    const pick = (e) => {
      if (e.target !== document.body || !['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) return
      const r = document.getElementById('fig-1')?.getBoundingClientRect()
      if (!r || r.bottom < 0 || r.top > innerHeight) return
      setMan(MANOEUVRES[+e.code.slice(-1) - 1].id)
    }
    addEventListener('keydown', pick)
    const up = (e) => e.code === 'Space' && setStrain(false)
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    return () => { removeEventListener('keydown', down); removeEventListener('keydown', pick); removeEventListener('keyup', up) }
  }, [setMan])

  const press = (e) => {
    if (!hold) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setStrain(true)
  }
  const release = () => setStrain(false)

  const last = useRef('hr')
  if (panel) last.current = panel.replace(/\d$/, '')
  const info = INFO[last.current]

  const tiles = hold
    ? [
        { id: 'hr', label: 'HR', value: '72', unit: 'bpm' },
        { id: 'ratio', label: 'P2 / P1', live: true, unit: active.idx > 0.1 ? 'rising' : 'baseline' },
        { id: 'state', label: active.label, value: fmtIdx(active.idx), unit: active.id === 'supine' ? 'reference' : `SD vs supine, rose in ${active.rise}`, bar: true },
      ]
    : []

  return (
    <Device
      className="dark"
      name="PRAN-01"
      sub={hold ? `tympanic optical + PPG, ch1, ${active.note}` : ''}
      status="live"
      statusLabel="sim"
      toolbar={
        <>
          <AnimatePresence>
            {hold && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="overflow-x-auto">
                <Seg size="sm" label="Manoeuvre" value={strain ? 'valsalva' : man} onChange={(v) => { setStrain(false); setMan(v) }} options={MANOEUVRES.map((m) => [m.id, m.label])} />
              </motion.div>
            )}
          </AnimatePresence>
          {hold && (
            <span className="ml-auto hidden font-mono text-[11px] text-mute xl:inline">
              Keys <kbd className="rounded border border-ink/20 px-1 text-ink">1</kbd>–<kbd className="rounded border border-ink/20 px-1 text-ink">4</kbd>, hold <kbd className="rounded border border-ink/20 px-1 text-ink">Space</kbd>
            </span>
          )}
        </>
      }
      footer={
        <>
          <span>{hold ? '50 Hz, 1 s per division' : ''}</span>
          <span>{hold ? 'response scaled to the 146-subject means' : ''}</span>
          <span className="ml-auto"><Fps /></span>
        </>
      }
    >
      <div className="relative grid md:grid-cols-[minmax(0,1fr)_190px]">
        {/* screen */}
        <div
          className="relative h-[250px] touch-pan-y select-none overflow-hidden md:h-[330px]"
          data-cursor={hold ? 'hold' : 'probe'}
          onPointerDown={press}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => hold && e.preventDefault()}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgb(0_0_0/0.45))]" />
          <SignalCanvas mode={mode} level={hold ? level : 0} readoutRef={readoutRef} kRef={kRef} hint={hold ? `${active.label}${strain ? '' : ', hold for Valsalva'}` : ''} />
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(0deg,#fff_0_1px,transparent_1px_3px)]" />
          <AnimatePresence>
            {hold && active.id === 'valsalva' && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: [0.25, 0.6, 0.25] }} exit={{ opacity: 0 }}
                transition={{ duration: 1.1, repeat: Infinity }}
                className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgb(255_106_44/0.35)]"
              />
            )}
          </AnimatePresence>
          {hold && (
            <button
              className={`absolute bottom-3 right-3 rounded-full px-3.5 py-2 font-mono text-[11.5px] shadow transition-colors md:hidden ${strain ? 'bg-signal text-signal-ink' : 'bg-ink text-canvas'}`}
              aria-pressed={strain}
              onPointerDown={press}
              onPointerUp={release}
            >
              {strain ? 'Valsalva…' : 'hold for Valsalva'}
            </button>
          )}
        </div>

        {/* readouts */}
        <div className="grid grid-cols-3 border-t border-rule md:grid-cols-1 md:border-l md:border-t-0">
          {tiles.map((t, i) => (
            <button
              key={t.id + i}
              onClick={() => setPanel(panel === t.id + i ? null : t.id + i)}
              data-cursor-label="details"
              className={`group relative flex flex-col justify-between gap-1 p-3 text-left transition-colors hover:bg-ink/[0.04] md:p-4 ${i ? 'border-l border-rule md:border-l-0 md:border-t' : ''} ${panel === t.id + i ? 'bg-ink/[0.05]' : ''}`}
            >
              <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                {t.label}
                <span className="opacity-0 transition-opacity group-hover:opacity-100">ⓘ</span>
              </span>
              <span className="flex items-end gap-2">
                {t.live ? (
                  <b ref={readoutRef} className="font-mono text-[26px] font-medium leading-none tabular-nums text-signal md:text-[30px]"></b>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.b
                      key={t.value}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className={`font-mono text-[24px] font-medium leading-none md:text-[28px] ${t.id === 'state' && active.idx > 0.1 ? 'text-signal' : 'text-ink'}`}
                    >
                      {t.value}
                    </motion.b>
                  </AnimatePresence>
                )}
                {t.bar && (
                  <span className="relative ml-auto h-8 w-2 overflow-hidden rounded-full bg-ink/10">
                    <span ref={kRef} className="absolute inset-0 origin-bottom rounded-full bg-signal" style={{ transform: 'scaleY(0.02)' }} />
                  </span>
                )}
              </span>
              <span className="font-mono text-[10.5px] text-mute">{t.unit}</span>
            </button>
          ))}
        </div>

        <Panel open={!!panel} onClose={close} left={58} top={12} title={info.title} rows={info.rows}>
          {info.text}
        </Panel>
      </div>
    </Device>
  )
}
