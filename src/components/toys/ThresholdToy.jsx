import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Device, Panel, Seg, Stat, Tween } from '../kit'

// Fig. 6 — an illustrative camera frame, not the trained model. Fixed vs glare-aware thresholds.
const DETS = [
  { x: 92, y: 182, w: 64, h: 20, tp: true, day: 0.94, night: 0.84, glare: 0.15, label: 'plate' },
  { x: 314, y: 192, w: 60, h: 19, tp: true, day: 0.88, night: 0.71, glare: 0.15, label: 'plate' },
  { x: 532, y: 178, w: 56, h: 18, tp: true, day: 0.8, night: 0.62, glare: 0.25, label: 'plate' },
  { x: 58, y: 150, w: 40, h: 26, tp: false, day: 0.18, night: 0.69, glare: 1, label: 'headlight' },
  { x: 150, y: 150, w: 40, h: 26, tp: false, day: 0.16, night: 0.66, glare: 1, label: 'headlight' },
  { x: 290, y: 238, w: 80, h: 18, tp: false, day: 0.12, night: 0.58, glare: 0.9, label: 'reflection' },
  { x: 610, y: 54, w: 52, h: 30, tp: false, day: 0.52, night: 0.48, glare: 0.1, label: 'sign' },
]
const CARS = [[52, 140, 144], [282, 150, 124], [500, 136, 120]]
const PENALTY = 0.25
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
const rgb = (c) => `rgb(${c.join(',')})`

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return t.toLocaleTimeString('en-GB', { hour12: false })
}

export default function ThresholdToy() {
  const [light, setLight] = useState(0.1)
  const [thr, setThr] = useState(0.55)
  const [mode, setMode] = useState('fixed')
  const ruler = useRef(null)
  const drag = useRef(false)
  const aware = mode === 'aware'
  const [sel, setSel] = useState(null)
  const closeSel = useCallback(() => setSel(null), [])

  const dark = 1 - light
  const rows = DETS.map((d) => {
    const conf = d.day * light + d.night * dark
    const score = aware ? conf - PENALTY * d.glare * dark : conf
    return { ...d, conf, score, kept: score >= thr }
  })
  const tp = rows.filter((r) => r.tp && r.kept).length
  const fp = rows.filter((r) => !r.tp && r.kept).length
  const precision = tp + fp ? tp / (tp + fp) : 1

  const skyTop = rgb(mix([14, 16, 26], [176, 196, 214], light))
  const skyBot = rgb(mix([34, 32, 40], [226, 222, 210], light))
  const body = rgb(mix([44, 44, 48], [150, 146, 138], light))
  const roof = rgb(mix([30, 30, 34], [178, 174, 166], light))

  const setFrom = (e) => {
    const r = ruler.current.getBoundingClientRect()
    setThr(Math.round(Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width)) * 100) / 100)
  }

  const det = sel != null ? rows[sel] : null
  const keyThr = (e) => {
    const k = e.shiftKey ? 0.05 : 0.01
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setThr((t) => Math.min(0.95, +(t + k).toFixed(2))) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setThr((t) => Math.max(0.05, +(t - k).toFixed(2))) }
  }

  return (
    <Device
      name="CAM-02 · plate detector"
      sub="yolov8l · 1080p · illustrative scene"
      status="live"
      statusLabel="rec"
      toolbar={
        <>
          <Seg label="Threshold" value={mode} onChange={setMode} options={[['fixed', 'one threshold'], ['aware', 'glare-aware']]} />
          <label className="flex items-center gap-2 font-mono text-[12px] text-mute">
            <span>night</span>
            <input type="range" min="0" max="1" step="0.01" value={light} onChange={(e) => setLight(+e.target.value)} className="w-28" aria-label="Ambient light" data-cursor-label="time of day" />
            <span>day</span>
          </label>
          <div className="ml-auto flex items-baseline gap-5">
            <Stat label="plates">{tp}/3</Stat>
            <Stat label="false" accent={fp > 0}>{fp}</Stat>
            <Stat label="precision"><Tween value={precision * 100} format={(v) => `${Math.round(v)}%`} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span>click a box for its score</span>
          <span>← → on the ruler moves the threshold</span>
          <span className="ml-auto">{rows.filter((r) => r.kept).length} boxes shown</span>
        </>
      }
    >
      <div className="relative">
      <svg viewBox="0 0 700 300" className="block w-full" role="img" aria-label="Illustrative road camera frame with detection boxes">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBot} />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#fff8e6" stopOpacity="1" />
            <stop offset="0.35" stopColor="#ffe9b8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" />
          </filter>
        </defs>

        <rect width="700" height="300" fill="url(#sky)" />
        {/* street lights */}
        {[120, 380, 640].map((x) => (
          <g key={x} opacity={0.4 + 0.6 * dark}>
            <line x1={x} x2={x} y1="30" y2="210" stroke={rgb(mix([60, 60, 66], [120, 118, 112], light))} strokeWidth="3" />
            <circle cx={x} cy="34" r={26 * dark + 2} fill="url(#glow)" opacity={dark} />
          </g>
        ))}
        {/* road */}
        <rect y="214" width="700" height="86" fill={rgb(mix([22, 22, 26], [120, 118, 112], light))} />
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 130 + 20} y="262" width="60" height="4" rx="2" fill="#e8e2cf" opacity={0.35 + 0.3 * light} />)}

        {CARS.map(([x, y, w], i) => (
          <motion.g key={i} animate={{ y: [0, -0.8, 0] }} transition={{ duration: 2.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}>
            <rect x={x + 6} y={y + 74} width={w - 12} height="8" rx="4" fill="#000" opacity=".35" />
            <rect x={x + 16} y={y - 24} width={w - 32} height="34" rx="12" fill={roof} />
            <rect x={x + 24} y={y - 18} width={w - 48} height="22" rx="7" fill={rgb(mix([18, 22, 30], [120, 150, 170], light))} opacity=".85" />
            <rect x={x} y={y} width={w} height="70" rx="16" fill={body} />
            <rect x={x + w / 2 - 30} y={y + 40} width="60" height="16" rx="2" fill="#efede6" opacity={0.45 + 0.45 * light} />
            {[x + 22, x + w - 22].map((hx) => (
              <g key={hx}>
                <circle cx={hx} cy={y + 22} r="9" fill="#fffbea" opacity={0.5 + 0.5 * dark} />
                <circle cx={hx} cy={y + 22} r={10 + 34 * dark} fill="url(#glow)" opacity={dark * 0.95} />
                <rect x={hx - 50 * dark} y={y + 21} width={100 * dark} height="1.5" fill="#fff6d6" opacity={dark * 0.6} />
              </g>
            ))}
          </motion.g>
        ))}
        {/* wet-road reflection */}
        <ellipse cx="330" cy="246" rx="60" ry="6" fill="#ffe9b8" opacity={0.55 * dark} />
        <rect x="610" y="54" width="52" height="30" rx="3" fill="#e9b949" opacity=".9" />

        {/* detections */}
        {rows.map((r, i) => {
          const col = r.tp ? 'var(--signal)' : '#ff3b6b'
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`${r.label}, confidence ${r.conf.toFixed(2)}`}
              data-cursor="snap"
              data-cursor-label={`${r.label} · ${r.score.toFixed(2)}`}
              onClick={() => setSel(i)}
              onKeyDown={(e) => e.key === 'Enter' && setSel(i)}
              className="outline-none"
            >
              <rect x={r.x - 6} y={r.y - 18} width={r.w + 12} height={r.h + 24} fill="transparent" />
              <motion.rect
                x={r.x} y={r.y} width={r.w} height={r.h} fill="none"
                stroke={r.kept ? col : 'rgba(255,255,255,.45)'}
                strokeWidth={r.kept ? 2 : 1}
                strokeDasharray={r.kept ? (r.tp ? '0' : '6 3') : '2 4'}
                initial={false}
                animate={{ opacity: r.kept ? 1 : 0.5 }}
              />
              <motion.g initial={false} animate={{ opacity: r.kept ? 1 : 0, y: r.kept ? 0 : 4 }} transition={{ duration: 0.25 }}>
                <rect x={r.x - 1} y={r.y - 15} width={r.tp ? 66 : 92} height="14" fill={col} />
                <text x={r.x + 3} y={r.y - 5} fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill="#120a05">
                  {r.label} {r.conf.toFixed(2)}
                </text>
              </motion.g>
            </g>
          )
        })}

        {/* camera finish: vignette, grain, scanline, HUD */}
        <g className="pointer-events-none">
        <rect width="700" height="300" fill="url(#vignette)" />
        <rect width="700" height="300" filter="url(#grain)" opacity={0.06 + 0.08 * dark} />
        <motion.rect width="700" height="2" fill="#fff" opacity="0.06" animate={{ y: [0, 300] }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
        <g fontFamily="JetBrains Mono Variable, monospace" fontSize="11" fill="#fff" opacity=".85">
          <circle cx="22" cy="21" r="4" fill="#ff3b30"><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite" /></circle>
          <text x="32" y="25">REC · CAM-02 · 1080p</text>
          <text x="678" y="25" textAnchor="end"><Clock /></text>
          <text x="22" y="286">yolov8l · conf ≥ {thr.toFixed(2)}{aware ? ' (+glare)' : ''}</text>
        </g>
        {[[10, 10, 1, 1], [690, 10, -1, 1], [10, 290, 1, -1], [690, 290, -1, -1]].map(([x, y, sx, sy], i) => (
          <path key={i} d={`M ${x} ${y + 14 * sy} V ${y} H ${x + 14 * sx}`} stroke="#fff" strokeOpacity=".6" fill="none" strokeWidth="1.5" />
        ))}
        </g>
      </svg>
        <Panel
          open={!!det}
          onClose={closeSel}
          left={det ? ((det.x + det.w / 2) / 700) * 100 : 50}
          top={det ? Math.min(45, ((det.y + det.h + 8) / 300) * 100) : 20}
          title={det ? `${det.label} · ${det.tp ? 'true plate' : 'false detection'}` : ''}
          rows={det ? [['raw confidence', det.conf.toFixed(3)], ['glare penalty', aware ? `−${(PENALTY * det.glare * dark).toFixed(3)}` : 'off'], ['score', det.score.toFixed(3)], ['threshold', thr.toFixed(2)], ['shown', det.kept ? 'yes' : 'no']] : []}
        />
      </div>

      {/* ruler */}
      <div className="px-4 pb-4 pt-3">
        <div className="mb-1.5 flex justify-between font-mono text-[10.5px] text-mute">
          <span>0.0</span><span>{aware ? 'score after glare penalty' : 'detector confidence'}</span><span>1.0</span>
        </div>
        <div
          ref={ruler}
          role="slider"
          tabIndex={0}
          aria-label="Detection threshold"
          aria-valuemin={0.05}
          aria-valuemax={0.95}
          aria-valuenow={thr}
          onKeyDown={keyThr}
          className="relative h-[68px] touch-none select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-signal/40"
          data-cursor="drag"
          data-cursor-label={`threshold ${thr.toFixed(2)}`}
          onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); setFrom(e) }}
          onPointerMove={(e) => drag.current && setFrom(e)}
          onPointerUp={() => (drag.current = false)}
        >
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-ink/10" />
          <motion.div className="absolute inset-y-1 right-0 rounded-lg bg-signal/[0.07]" animate={{ left: `${thr * 100}%` }} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
          {rows.map((r, i) => (
            <motion.span
              key={i}
              className={`absolute top-1/2 -translate-x-1/2 rounded-full ${r.tp ? '-translate-y-[150%] h-3.5 w-3.5 bg-ink' : 'translate-y-[45%] h-3.5 w-3.5 border-2 border-[#ff3b6b] bg-paper'}`}
              initial={false}
              animate={{ left: `${r.score * 100}%`, scale: r.kept ? 1.15 : 0.85, opacity: r.kept ? 1 : 0.55 }}
              transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            />
          ))}
          <motion.div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-signal" animate={{ left: `${thr * 100}%` }} transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal px-2 py-1 font-mono text-[10.5px] leading-none text-signal-ink shadow-[0_4px_12px_-4px_rgb(0_0_0/0.4)]">
              {thr.toFixed(2)}
            </span>
          </motion.div>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-5 font-mono text-[10.5px] text-mute">
          <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-ink align-[-1px]" />plates</span>
          <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border-2 border-[#ff3b6b] align-[-1px]" />glare, reflections, signs</span>
          <span className="ml-auto">drag the line · right of it is kept</span>
        </div>
      </div>
    </Device>
  )
}
