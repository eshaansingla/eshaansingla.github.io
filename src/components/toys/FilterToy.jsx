import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Device, EASE, Panel, Seg, Stat, Toggle, Tween } from '../kit'

// Fig. 3 — the filter, in frequency and in time. Drag the cutoff on the spectrum; the trace morphs.
const FS = 50
const N = 400
const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s))
function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clean = Array.from({ length: N }, (_, i) => {
  const p = ((i / FS) * 1.2) % 1
  return gauss(p, 0.12, 0.045) + 0.72 * gauss(p, 0.3, 0.06) + 0.4 * gauss(p, 0.5, 0.08)
})
const rnd = mulberry(7)
const raw = clean.map((v, i) => v + (rnd() - 0.5) * 0.42 + 0.1 * Math.sin(2 * Math.PI * 17 * (i / FS)))

// magnitude spectrum of the raw signal, 0..25 Hz
const BINS = 100
const spectrum = (() => {
  const mean = raw.reduce((a, b) => a + b, 0) / N
  const out = []
  for (let b = 1; b <= BINS; b++) {
    const f = (b / BINS) * 25
    let re = 0, im = 0
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
      const a = (2 * Math.PI * f * i) / FS
      re += (raw[i] - mean) * w * Math.cos(a)
      im -= (raw[i] - mean) * w * Math.sin(a)
    }
    out.push({ f, m: Math.hypot(re, im) })
  }
  const max = Math.max(...out.map((o) => o.m))
  return out.map((o) => ({ ...o, m: Math.sqrt(o.m / max) }))
})()

function biquad(x, fc) {
  const K = Math.tan((Math.PI * fc) / FS)
  const norm = 1 / (1 + Math.SQRT2 * K + K * K)
  const b0 = K * K * norm, b1 = 2 * b0, b2 = b0
  const a1 = 2 * (K * K - 1) * norm
  const a2 = (1 - Math.SQRT2 * K + K * K) * norm
  const y = new Array(x.length)
  let x1 = x[0], x2 = x[0], y1 = x[0], y2 = x[0]
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v
    y[i] = v
  }
  return y
}
function filtfilt(x, fc) {
  const pad = 60
  const ext = [...x.slice(1, pad + 1).reverse(), ...x, ...x.slice(-pad - 1, -1).reverse()]
  return biquad(biquad(ext, fc).reverse(), fc).reverse().slice(pad, pad + x.length)
}
const argmax = (a, lo, hi) => { let b = lo; for (let i = lo; i <= hi; i++) if (a[i] > a[b]) b = i; return b }

const FMAX = 25
const W = 1000

export default function FilterToy() {
  const [fc, setFc] = useState(3.5)
  const [mode, setMode] = useState('single')
  const [showRaw, setShowRaw] = useState(true)
  const target = useMemo(() => (mode === 'zero' ? filtfilt(raw, fc) : biquad(raw, fc)), [fc, mode])
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)
  const strip = useRef(null)
  const dragging = useRef(false)

  // morph the drawn trace toward the new filter output
  useEffect(() => {
    const from = shownRef.current
    const c = animate(0, 1, {
      duration: 0.45,
      ease: EASE,
      onUpdate: (k) => {
        const next = from.map((v, i) => v + (target[i] - v) * k)
        shownRef.current = next
        setShown(next)
      },
    })
    return () => c.stop()
  }, [target])

  // measure lag on one beat: true P1 vs filtered peak
  const iTrue = argmax(clean, 203, 223)
  const lagS = useMemo(() => {
    let best = 0, bestC = -Infinity
    for (let L = -2; L <= 25; L++) {
      let c = 0
      for (let i = 30; i < N - 30; i++) c += clean[i] * (target[i + L] ?? 0)
      if (c > bestC) { bestC = c; best = L }
    }
    return best
  }, [target])
  const iOut = iTrue + lagS
  const lagMs = Math.round((lagS / FS) * 1000)
  const rmse = Math.sqrt(target.slice(30, N - 30).reduce((s, v, i) => s + (v - clean[i + 30]) ** 2, 0) / (N - 60))

  const H = 230
  const y = (v) => H - 22 - ((v + 0.35) / 1.75) * (H - 44)
  const X = (i) => (i / (N - 1)) * W
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  const SH = 92
  const resp = (f) => { const r = 1 / Math.sqrt(1 + (f / fc) ** 4); return mode === 'zero' ? r * r : r }
  const respPath = Array.from({ length: 101 }, (_, k) => {
    const f = (k / 100) * FMAX
    return `${k ? 'L' : 'M'}${((f / FMAX) * W).toFixed(1)} ${(8 + (1 - resp(f)) * (SH - 22)).toFixed(1)}`
  }).join(' ')
  const fx = (fc / FMAX) * W

  const setFrom = (e) => {
    const r = strip.current.getBoundingClientRect()
    const f = Math.max(0.5, Math.min(15, ((e.clientX - r.left) / r.width) * FMAX))
    setFc(Math.round(f * 4) / 4)
  }

  const [hoverF, setHoverF] = useState(null)
  const [pick, setPick] = useState(null) // sample index clicked on the time plot
  const closePick = useCallback(() => setPick(null), [])
  const onKey = (e) => {
    const step = e.shiftKey ? 1 : 0.25
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setFc((f) => Math.min(15, f + step)) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setFc((f) => Math.max(0.5, f - step)) }
  }
  const pickAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left) / r.width) * (N - 1))
    setPick({ i: Math.max(0, Math.min(N - 1, i)), top: ((e.clientY - r.top) / r.height) * 100 })
  }

  return (
    <Device
      name="signal analyzer"
      sub="ch1 · 400 samples @ 50 Hz · 2nd-order Butterworth"
      status="live"
      statusLabel="live"
      toolbar={
        <>
          <Seg label="Filter" value={mode} onChange={setMode} options={[['single', 'one pass'], ['zero', 'forward + backward']]} />
          <label className="flex items-center gap-2 font-mono text-[12px] text-mute">
            <Toggle on={showRaw} onChange={setShowRaw} label="Show raw signal" cursorLabel={showRaw ? 'hide raw' : 'show raw'} /> raw
          </label>
          <div className="ml-auto flex flex-wrap items-baseline gap-x-5">
            <Stat label="cutoff"><Tween value={fc} format={(v) => `${v.toFixed(2)} Hz`} duration={0.3} /></Stat>
            <Stat label="peak lag" accent={lagMs > 20}><Tween value={lagMs} format={(v) => `${Math.round(v)} ms`} /></Stat>
            <Stat label="error"><Tween value={rmse} format={(v) => v.toFixed(3)} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span><i className="mr-1.5 inline-block h-px w-4 -translate-y-[3px] bg-ink/40" />raw</span>
          <span><i className="mr-1.5 inline-block w-4 -translate-y-[3px] border-t border-dashed border-ink" />true pulse</span>
          <span><i className="mr-1.5 inline-block h-0.5 w-4 -translate-y-[3px] bg-signal" />filtered</span>
          <span className="ml-auto hidden sm:inline">← → nudge cutoff · click the trace to inspect</span>
        </>
      }
    >
      {/* spectrum + response: drag, or focus and use arrow keys */}
      <div
        ref={strip}
        role="slider"
        tabIndex={0}
        aria-label="Cutoff frequency"
        aria-valuemin={0.5}
        aria-valuemax={15}
        aria-valuenow={fc}
        aria-valuetext={`${fc.toFixed(2)} hertz`}
        onKeyDown={onKey}
        className="relative touch-none select-none border-b border-rule outline-none focus-visible:bg-signal/[0.04]"
        data-cursor="drag"
        data-cursor-label={hoverF != null ? `${hoverF.toFixed(1)} Hz · keeps ${Math.round(resp(hoverF) * 100)}%` : 'drag the cutoff'}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); setFrom(e) }}
        onPointerMove={(e) => {
          const r = strip.current.getBoundingClientRect()
          setHoverF(Math.max(0, Math.min(FMAX, ((e.clientX - r.left) / r.width) * FMAX)))
          if (dragging.current) setFrom(e)
        }}
        onPointerLeave={() => setHoverF(null)}
        onPointerUp={() => (dragging.current = false)}
      >
        <svg viewBox={`0 0 ${W} ${SH}`} preserveAspectRatio="none" className="block h-[100px] w-full" aria-hidden="true">
          <defs>
            <linearGradient id="passband" x1="0" x2="1">
              <stop offset="0" stopColor="var(--signal)" stopOpacity="0.16" />
              <stop offset="1" stopColor="var(--signal)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <motion.rect x="0" y="0" height={SH} fill="url(#passband)" initial={false} animate={{ width: fx }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
          {[5, 10, 15, 20].map((f) => (
            <line key={f} x1={(f / FMAX) * W} x2={(f / FMAX) * W} y1="0" y2={SH} className="stroke-ink" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
          ))}
          {spectrum.map((b) => {
            const x = (b.f / FMAX) * W
            const kept = resp(b.f)
            return (
              <g key={b.f}>
                <line x1={x} x2={x} y1={SH - 14} y2={SH - 14 - b.m * (SH - 32)} className="stroke-ink" strokeOpacity="0.14" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <line x1={x} x2={x} y1={SH - 14} y2={SH - 14 - b.m * kept * (SH - 32)} className="stroke-signal" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ transition: 'all .3s cubic-bezier(.22,1,.36,1)' }} />
              </g>
            )
          })}
          <path d={respPath} fill="none" className="stroke-ink" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" style={{ transition: 'd .3s' }} />
          {hoverF != null && <line x1={(hoverF / FMAX) * W} x2={(hoverF / FMAX) * W} y1="0" y2={SH} className="stroke-ink" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />}
          <motion.line initial={false} animate={{ x1: fx, x2: fx }} y1="0" y2={SH} className="stroke-signal" strokeWidth="2" vectorEffect="non-scaling-stroke" transition={{ type: 'spring', stiffness: 400, damping: 36 }} />
        </svg>
        <motion.span
          className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-full bg-signal px-2 py-0.5 font-mono text-[10.5px] text-signal-ink shadow-[0_0_0_3px_var(--paper)]"
          animate={{ left: `${(fc / FMAX) * 100}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        >
          {fc.toFixed(1)} Hz
        </motion.span>
        <span className="pointer-events-none absolute bottom-1 left-3 font-mono text-[10px] text-mute">0</span>
        {[5, 10, 15, 20].map((f) => (
          <span key={f} className="pointer-events-none absolute bottom-1 -translate-x-1/2 font-mono text-[10px] text-mute" style={{ left: `${(f / FMAX) * 100}%` }}>{f}</span>
        ))}
        <span className="pointer-events-none absolute bottom-1 right-3 font-mono text-[10px] text-mute">25 Hz</span>
      </div>

      {/* time domain: click to inspect a sample */}
      <div className="relative" onClick={pickAt} data-cursor="probe" data-cursor-label="inspect sample">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="paper-grid block h-[200px] w-full md:h-[230px]" role="img" aria-label="Noisy pulse, true pulse and filtered output">
          {showRaw && <path d={path(raw)} fill="none" className="stroke-ink" strokeOpacity=".18" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          <path d={path(clean)} fill="none" className="stroke-ink" strokeDasharray="3 4" strokeOpacity=".55" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <path d={path(shown)} fill="none" className="stroke-signal" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <line x1={X(iTrue)} x2={X(iTrue)} y1={y(clean[iTrue]) - 10} y2={22} className="stroke-ink" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={X(iOut)} x2={X(iOut)} y1={y(target[iOut]) - 10} y2={22} className="stroke-signal" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{ transition: 'all .4s' }} />
          <line x1={X(iTrue)} x2={X(iOut)} y1={22} y2={22} className="stroke-signal" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ transition: 'all .4s' }} />
          {pick && (
            <g>
              <line x1={X(pick.i)} x2={X(pick.i)} y1="0" y2={H} className="stroke-ink" strokeOpacity=".5" vectorEffect="non-scaling-stroke" />
              <circle cx={X(pick.i)} cy={y(shown[pick.i])} r="4" className="fill-signal" vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
        {/* idle playhead */}
        <span className="pointer-events-none absolute inset-y-0 w-px bg-signal/30 motion-safe:animate-[sweep_6s_linear_infinite]" />
        <motion.span
          className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] text-canvas"
          animate={{ left: `${(X((iTrue + iOut) / 2) / W) * 100}%` }}
        >
          lag {lagMs} ms
        </motion.span>
        <Panel
          open={!!pick}
          onClose={closePick}
          left={pick ? (pick.i / (N - 1)) * 100 : 50}
          top={pick && pick.top > 40 ? 4 : (pick?.top ?? 20) + 4}
          title={pick ? `sample ${pick.i} · t = ${(pick.i / FS).toFixed(2)} s` : ''}
          rows={pick ? [['raw', raw[pick.i].toFixed(3)], ['true pulse', clean[pick.i].toFixed(3)], ['filtered', target[pick.i].toFixed(3)], ['error', (target[pick.i] - clean[pick.i]).toFixed(3)]] : []}
        />
      </div>
    </Device>
  )
}
