import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device, Panel, Seg, Tween, useSeen } from '../kit'
import { rocketLeague as RL } from '../../data'

// Off-hours: a Rocket League snapshot. Emblems are original drawings, not game art.
// Original emblem set (not game art): each tier has its own silhouette and metal.
const TIER = {
  Bronze: { rim: ['#5a3218', '#c47a45'], face: ['#ffe3cc', '#c98352', '#6e3a18'], ink: '#4a250e', glow: '#e5a274' },
  Silver: { rim: ['#4b5563', '#d7dde5'], face: ['#ffffff', '#c5ccd6', '#6b7684'], ink: '#2c333d', glow: '#e2e8f0' },
  Champion: { rim: ['#4c1d95', '#c4a5ff'], face: ['#f5efff', '#a98bf0', '#5b2bb0'], ink: '#2e1065', glow: '#c4a5ff' },
  'Grand Champion': { rim: ['#7f1d1d', '#ff9a9a'], face: ['#fff0f0', '#f07a7a', '#a32020'], ink: '#4c0d0d', glow: '#ff9a9a' },
  'Supersonic Legend': { rim: ['#111827', '#e5e7eb'], face: ['#ffffff', '#a5b4fc', '#312e81'], ink: '#111111', glow: '#e0e7ff' },
  Gold: { rim: ['#7a4c0c', '#e2b04d'], face: ['#fff1c4', '#e0aa45', '#8f5c14'], ink: '#5b3906', glow: '#f2c46a' },
  Platinum: { rim: ['#215f70', '#a7e6f2'], face: ['#f4feff', '#9adbe9', '#3d8ea4'], ink: '#0e3f4c', glow: '#9fe3f0' },
  Diamond: { rim: ['#1b2f8c', '#8fb0ff'], face: ['#eef3ff', '#7c9cf5', '#2a45b0'], ink: '#0d1c5e', glow: '#8fb0ff' },
}
const poly = (n, r, rot = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n
    return `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`
  }).reduce((d, p, i) => d + (i ? ' L ' : 'M ') + p, '') + ' Z'
const scale = (d, k) => d.replace(/-?\d+(\.\d+)?/g, (m) => (parseFloat(m) * k).toFixed(2))
const SHAPE = {
  Gold: poly(8, 56, Math.PI / 8), // minted coin
  Platinum: 'M0 -58 C 30 -58 50 -50 52 -42 L 52 2 C 52 30 28 48 0 60 C -28 48 -52 30 -52 2 L -52 -42 C -50 -50 -30 -58 0 -58 Z', // shield
  Diamond: poly(12, 56, 0), // faceted medallion
  Bronze: poly(6, 56, 0),
  Silver: poly(8, 56, 0),
  Champion: poly(10, 56, Math.PI / 10),
  'Grand Champion': poly(14, 56, 0),
  'Supersonic Legend': poly(16, 56, 0),
}
// a tier name the drawings don't know yet falls back to Gold rather than breaking the figure
const tierOf = (n) => TIER[n] ?? TIER.Gold
const shapeOf = (n) => SHAPE[n] ?? SHAPE.Gold
const ROMAN = ['I', 'II', 'III', 'IV']
const RATINGS = RL.playlists.flatMap((x) => [x.rating, x.peak, x.best].filter(Boolean))
const LO = Math.min(400, Math.floor((Math.min(...RATINGS) - 40) / 20) * 20), HI = Math.max(760, Math.ceil((Math.max(...RATINGS) + 40) / 20) * 20)
const pos = (v) => ((v - LO) / (HI - LO)) * 100

function Emblem({ p }) {
  const t = tierOf(p.tier)
  const outer = shapeOf(p.tier)
  const inner = scale(outer, 0.8)
  const id = `${p.id}-${p.tier}`
  return (
    <motion.svg
      key={p.id}
      viewBox="-64 -66 128 140"
      className="h-[156px] w-[150px] md:h-[184px] md:w-[176px]"
      style={{ filter: `drop-shadow(0 16px 22px rgb(0 0 0 / 0.28)) drop-shadow(0 0 18px ${t.glow}55)` }}
      initial={{ rotateY: -90, scale: 0.85, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      exit={{ rotateY: 90, scale: 0.85, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
      aria-label={`${p.tier} ${ROMAN[p.tierN - 1]}, division ${ROMAN[p.div - 1]}`}
    >
      <defs>
        <linearGradient id={`rim-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={t.rim[0]} />
          <stop offset="1" stopColor={t.rim[1]} />
        </linearGradient>
        <radialGradient id={`face-${id}`} cx="0.38" cy="0.28" r="0.85">
          <stop offset="0" stopColor={t.face[0]} />
          <stop offset="0.5" stopColor={t.face[1]} />
          <stop offset="1" stopColor={t.face[2]} />
        </radialGradient>
        <linearGradient id={`sheen-${id}`} x1="0" x2="1">
          <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip-${id}`}><path d={outer} /></clipPath>
      </defs>
      <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        {/* rim + bevel */}
        <path d={outer} fill={`url(#rim-${id})`} />
        <path d={scale(outer, 0.9)} fill={t.rim[0]} opacity="0.55" />
        <path d={inner} fill={`url(#face-${id})`} />
        <path d={inner} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" transform="translate(0 -0.8)" />
        {/* tier-specific engraving */}
        {p.tier === 'Gold' &&
          Array.from({ length: 24 }).map((_, i) => (
            <line key={i} x1="0" y1="-41" x2="0" y2="-37" stroke={t.ink} strokeOpacity="0.35" strokeWidth="1.2" transform={`rotate(${i * 15})`} />
          ))}
        {p.tier === 'Platinum' && (
          <path d="M -30 -30 L 30 -30 M -30 -24 L 30 -24" stroke={t.ink} strokeOpacity="0.25" strokeWidth="1.2" />
        )}
        {p.tier === 'Diamond' &&
          Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1="0" y1="0" x2="0" y2="-45" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" transform={`rotate(${i * 30 + 15})`} />
          ))}
        <text y="-14" textAnchor="middle" fontFamily="JetBrains Mono Variable, monospace" fontSize="8.5" letterSpacing="2.2" fill={t.ink} opacity="0.75">
          {p.tier.toUpperCase()}
        </text>
        <text y="22" textAnchor="middle" fontFamily="Newsreader Variable, Georgia, serif" fontSize="40" fontWeight="600" fill={t.ink}>
          {ROMAN[p.tierN - 1]}
        </text>
        <text y="21" textAnchor="middle" fontFamily="Newsreader Variable, Georgia, serif" fontSize="40" fontWeight="600" fill="#fff" opacity="0.35" transform="translate(0 -1.2)">
          {ROMAN[p.tierN - 1]}
        </text>
        <g clipPath={`url(#clip-${id})`}>
          <motion.rect x="-140" y="-80" width="90" height="160" fill={`url(#sheen-${id})`} transform="skewX(-18)" animate={{ x: [-140, 140] }} transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }} />
        </g>
      </motion.g>
      {/* division pips */}
      {[0, 1, 2, 3].map((d) => (
        <motion.rect
          key={d}
          x={-27 + d * 14 - 4}
          y="66"
          width="8"
          height="4"
          rx="2"
          className={d < p.div ? 'fill-signal' : 'fill-ink/15'}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          style={{ transformOrigin: `${-27 + d * 14}px 68px` }}
          transition={{ delay: 0.25 + d * 0.06, type: 'spring', stiffness: 500, damping: 20 }}
        />
      ))}
    </motion.svg>
  )
}

// Everything below is worked out from src/assets/rl.json, so updating the numbers there is enough
const life = Object.fromEntries(RL.lifetime.map((x) => [x.k, x]))
const val = (k) => life[k]?.v ?? 0
const MAIN = RL.playlists.find((x) => x.main) ?? RL.playlists[0]
const GOAL_SHOT = val('Shots') ? +((val('Goals') / val('Shots')) * 100).toFixed(1) : 0
const BEST = RL.lifetime.filter((x) => x.top).sort((a, b) => parseFloat(a.top.replace(/\D+/, '')) - parseFloat(b.top.replace(/\D+/, '')))[0]?.k
const per = (a, b, n = 1) => (b ? ((a / b) * n).toFixed(1) : '0')
const share = (v) => (val('Wins') ? Math.round((v / val('Wins')) * 100) : 0)
const EXTRA = {
  Saves: (v) => [['per win', per(v, val('Wins'))], v ? (BEST === 'Saves' ? 'My highest-percentile stat.' : 'Lifetime saves across all playlists.') : ''],
  MVPs: (v) => [['MVP in', `${share(v)}% of wins`], `MVP in ${share(v) > 50 ? 'more than half' : `${share(v)}%`} of all wins.`],
  Shots: (v) => [['goals from them', val('Goals').toLocaleString('en-IN')], `${v.toLocaleString('en-IN')} shots on goal across all playlists.`],
  Wins: () => [[`${MAIN.mode} this season`, `${MAIN.matches} matches`], `${MAIN.name} is the main playlist.`],
  Goals: () => [['per shot', `${GOAL_SHOT}%`], GOAL_SHOT >= 40 ? 'Close to one goal for every two shots.' : `About one goal every ${Math.round(100 / (GOAL_SHOT || 1))} shots.`],
  Assists: (v) => [['per 10 goals', per(v, val('Goals'), 10)], 'Lifetime assists across all playlists.'],
}
const detail = (k) => {
  const v = val(k), [row, text] = EXTRA[k]?.(v) ?? [null, '']
  return { rows: [['lifetime', v.toLocaleString('en-IN')], ...(life[k]?.top ? [['percentile', life[k].top.toLowerCase()]] : []), ...(row ? [row] : [])], text }
}

export default function RocketLeague() {
  const [id, setId] = useState('2v2')
  const [sel, setSel] = useState(null)
  const close = useCallback(() => setSel(null), [])
  const [ref, seen] = useSeen('-80px')
  const p = RL.playlists.find((x) => x.id === id)
  const t = tierOf(p.tier)
  const marks = [
    ['now', p.rating, 'current'],
    p.peak && p.peak !== p.rating ? ['peak', p.peak, 'season peak'] : null,
    p.best && p.best !== p.rating ? ['best', p.best, `all-time best, ${p.bestSeason}`] : null,
  ].filter(Boolean)
  const d = sel ? detail(sel) : null
  const ring = 2 * Math.PI * 30

  return (
    <Device
      name="Rocket League"
      sub={`${RL.platform}, ${RL.season}, snapshot ${RL.snapshot}`}
      status="live"
      statusLabel="off-hours"
      toolbar={
        <>
          <div className="max-w-full overflow-x-auto sm:overflow-visible">
            <Seg wrap size="sm" label="Playlist" value={id} onChange={(v) => { setId(v); setSel(null) }} options={RL.playlists.map((x) => [x.id, `${x.name} ${x.mode}`])} />
          </div>
          <span className="ml-auto font-mono text-[11.5px] text-mute">
            season reward <b className="font-medium text-ink">{RL.rewardLevel}</b>
          </span>
        </>
      }
      footer={
        <>
          <span>ranked, this season</span>
          <span className="ml-auto">click any lifetime stat</span>
        </>
      }
    >
      <div ref={ref} className="relative grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
        {/* rank */}
        <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden border-b border-rule px-6 py-7 md:border-b-0 md:border-r [perspective:600px]">
          <motion.div
            className="absolute inset-0 -z-0 opacity-30 blur-2xl"
            animate={{ background: `radial-gradient(circle at 50% 42%, ${t.glow}, transparent 62%)` }}
            transition={{ duration: 0.6 }}
          />
          <AnimatePresence mode="wait">
            <Emblem p={p} />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative text-center">
              <p className="text-[1.35rem] leading-tight">{p.tier} {ROMAN[p.tierN - 1]}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">Division {ROMAN[p.div - 1]}{p.main ? ', main playlist' : ''}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* numbers */}
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">MMR</p>
              <p className="font-mono text-[44px] font-medium leading-none tracking-tight text-signal"><Tween value={p.rating} duration={0.8} /></p>
            </div>
            {[['season matches', p.matches], ['win streak', p.streak], p.nextDiv ? ['to next division', `${p.nextDiv} MMR`] : null].filter(Boolean).map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">{k}</p>
                <p className="font-mono text-[22px] leading-none">{typeof v === 'number' ? <Tween value={v} /> : v}</p>
              </div>
            ))}
            {p.top && <span className="rounded-full bg-signal/15 px-2.5 py-1 font-mono text-[11px] text-signal">{p.top}</span>}
          </div>

          {/* MMR ladder */}
          <div className="mt-7">
            <div className="relative h-16">
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/[0.07]" />
              <motion.div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-signal/70" style={{ left: 0 }} animate={{ width: `${pos(p.rating)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
              {marks.map(([k, v, label]) => (
                <motion.div
                  key={k}
                  className="group absolute top-1/2"
                  initial={false}
                  animate={{ left: `${pos(v)}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                  data-cursor
                  tabIndex={0}
                  aria-label={`${label} ${v}`}
                >
                  <span className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${k === 'now' ? 'h-4 w-4 border-signal bg-signal' : 'h-3.5 w-3.5 border-ink bg-paper'}`} />
                  <span className={`absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] ${k === 'now' ? '-top-7 text-signal' : k === 'peak' ? 'top-3 text-mute' : 'top-[22px] text-mute'}`}>{label} {v}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 flex justify-between font-mono text-[9.5px] text-mute">
              <span>{LO}</span><span>MMR</span><span>{HI}</span>
            </div>
          </div>

          {/* lifetime */}
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              {RL.lifetime.map((s) => (
                <button
                  key={s.k}
                  onClick={() => setSel(sel === s.k ? null : s.k)}
                  className={`rounded-xl border p-3 text-left transition-colors ${sel === s.k ? 'border-signal bg-signal/[0.06]' : 'border-rule hover:border-ink/40'}`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-x-2 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                    <span className="whitespace-nowrap">{s.k}</span>
                    {s.top && <span className="whitespace-nowrap normal-case tracking-normal text-signal">{s.top.toLowerCase()}</span>}
                  </span>
                  <span className="mt-1 block font-mono text-[20px] leading-none">
                    <Tween value={seen ? s.v : 0} format={(v) => Math.round(v).toLocaleString('en-IN')} duration={1.4} />
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center">
              <svg viewBox="-40 -40 80 80" className="h-24 w-24 -rotate-90">
                <circle r="30" fill="none" className="stroke-ink/10" strokeWidth="7" />
                <motion.circle
                  r="30" fill="none" className="stroke-signal" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={ring}
                  initial={{ strokeDashoffset: ring }}
                  animate={{ strokeDashoffset: seen ? ring * (1 - GOAL_SHOT / 100) : ring }}
                  transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </svg>
              <p className="-mt-[62px] mb-[34px] font-mono text-[15px]">{GOAL_SHOT}%</p>
              <p className="font-mono text-[10px] text-mute">goals per shot</p>
            </div>
          </div>
        </div>

        <Panel open={!!sel} onClose={close} left={62} top={46} title={sel ? `${sel}, lifetime` : ''} rows={d?.rows ?? []}>
          {d?.text}
        </Panel>
      </div>
    </Device>
  )
}
