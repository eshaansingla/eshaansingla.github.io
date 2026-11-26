import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn, Device, Panel, Stat, Toggle, Tween } from '../kit'

// Fig. 5 — optimal (Hungarian, solved live) vs nearest-first matching. Drag, add, remove.
const W = 680, H = 320
const TASKS = [[96, 74], [318, 48], [560, 92], [468, 252], [190, 250]]
const START = [[160, 160], [266, 128], [384, 178], [516, 190], [318, 266]]
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Kuhn–Munkres, rows ≤ cols. Returns [row, col] pairs. */
function hungarian(a) {
  const n = a.length, m = a[0].length, INF = 1e18
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0)
  const p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0)
  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF, j1 = 0
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0 }
        if (minv[j] < delta) { delta = minv[j]; j1 = j }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta } else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1 } while (j0)
  }
  const out = []
  for (let j = 1; j <= m; j++) if (p[j]) out.push([p[j] - 1, j - 1])
  return out
}
function optimal(V) {
  if (!V.length) return { pairs: [], cost: 0 }
  const vt = V.length <= TASKS.length
  const M = vt ? V.map((p) => TASKS.map((t) => d(p, t))) : TASKS.map((t) => V.map((p) => d(p, t)))
  const pairs = hungarian(M).map(([r, c]) => (vt ? [r, c] : [c, r]))
  return { pairs, cost: pairs.reduce((s, [v, t]) => s + d(V[v], TASKS[t]), 0) }
}
function greedy(V) {
  const uv = new Set(), ut = new Set(), pairs = []
  let cost = 0
  for (let k = 0; k < Math.min(V.length, TASKS.length); k++) {
    let m = Infinity, bi, bj
    V.forEach((p, i) => !uv.has(i) && TASKS.forEach((t, j) => { if (!ut.has(j) && d(p, t) < m) { m = d(p, t); bi = i; bj = j } }))
    uv.add(bi); ut.add(bj); pairs.push([bi, bj]); cost += m
  }
  return { pairs, cost }
}
const KIND = ['food supplies', 'medical camp', 'shelter', 'drinking water', 'debris clearing']
const BLOCKS = [[20, 18, 120, 70], [168, 14, 110, 60], [380, 20, 130, 52], [600, 130, 70, 90], [30, 120, 90, 80], [410, 120, 110, 70], [40, 226, 110, 80], [230, 196, 140, 40], [540, 236, 120, 70], [600, 16, 66, 50]]
const seg = (a, b) => `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)}`

export default function AssignToy() {
  const [V, setV] = useState(START)
  const [showGreedy, setShowGreedy] = useState(true)
  const [hover, setHover] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [flash, setFlash] = useState({})
  const svg = useRef(null)
  const prevOpt = useRef(new Map())
  const [sel, setSel] = useState(null) // {kind:'v'|'t', i}
  const closeSel = useCallback(() => setSel(null), [])
  const moved = useRef(false)

  const opt = useMemo(() => optimal(V), [V])
  const gr = useMemo(() => greedy(V), [V])
  const waste = opt.cost ? ((gr.cost - opt.cost) / opt.cost) * 100 : 0
  const optOf = new Map(opt.pairs)

  // pulse any volunteer whose optimal task just changed
  useEffect(() => {
    const changed = {}
    optOf.forEach((t, v) => { if (prevOpt.current.has(v) && prevOpt.current.get(v) !== t) changed[v] = Date.now() })
    prevOpt.current = new Map(optOf)
    if (Object.keys(changed).length) setFlash((f) => ({ ...f, ...changed }))
  }, [opt]) // eslint-disable-line react-hooks/exhaustive-deps

  const toSvg = (e) => {
    const pt = svg.current.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse())
    return [Math.max(16, Math.min(W - 16, p.x)), Math.max(16, Math.min(H - 16, p.y))]
  }

  const maxCost = Math.max(gr.cost, opt.cost, 1)

  const grOf = new Map(gr.pairs)
  const selInfo = (() => {
    if (!sel) return null
    if (sel.kind === 't') {
      const v = opt.pairs.find(([, t]) => t === sel.i)?.[0]
      const gv = gr.pairs.find(([, t]) => t === sel.i)?.[0]
      return {
        title: `task ${String.fromCharCode(65 + sel.i)} · ${KIND[sel.i]}`,
        rows: [['assigned', v != null ? `volunteer ${v + 1}` : 'unassigned'], ['distance', v != null ? d(V[v], TASKS[sel.i]).toFixed(0) : '—'], ['nearest-first', gv != null ? `volunteer ${gv + 1}` : '—']],
        at: TASKS[sel.i],
      }
    }
    const t = optOf.get(sel.i), gt = grOf.get(sel.i)
    return {
      title: `volunteer ${sel.i + 1}`,
      rows: [['optimal task', t != null ? `${String.fromCharCode(65 + t)} · ${KIND[t]}` : 'idle'], ['distance', t != null ? d(V[sel.i], TASKS[t]).toFixed(0) : '—'], ['nearest-first', gt != null ? `${String.fromCharCode(65 + gt)} · ${d(V[sel.i], TASKS[gt]).toFixed(0)}` : 'idle']],
      at: V[sel.i],
    }
  })()

  const nudge = (i, dx, dy) => setV((v) => v.map((q, k) => (k === i ? [Math.max(16, Math.min(W - 16, q[0] + dx)), Math.max(16, Math.min(H - 16, q[1] + dy))] : q)))

  return (
    <Device
      name="Sanchaalan Saathi · dispatch"
      sub={`${TASKS.length} open tasks · ${V.length} volunteers on shift`}
      status="live"
      statusLabel="live"
      toolbar={
        <>
          <label className="flex items-center gap-2.5 font-mono text-[12px] text-ink-2">
            <Toggle on={showGreedy} onChange={setShowGreedy} label="Show nearest-first" cursorLabel={showGreedy ? 'hide nearest-first' : 'show nearest-first'} />
            nearest-first
          </label>
          <Btn onClick={() => { setV(START); setSel(null) }}>reset</Btn>
          <div className="ml-auto flex items-baseline gap-5">
            <Stat label="total distance"><Tween value={opt.cost} /></Stat>
            <Stat label="nearest-first wastes" accent={waste > 0.5}><Tween value={waste} format={(v) => `${v.toFixed(1)}%`} /></Stat>
          </div>
        </>
      }
      footer={
        <>
          <span>solver: Hungarian, in your browser</span>
          <span>drag · click for details · arrow keys move · Delete removes</span>
          <span className="ml-auto">{V.length} / 8 volunteers</span>
        </>
      }
    >
      <div className="relative">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="paper-grid block w-full touch-none select-none"
          data-cursor="free"
          data-cursor-label={V.length < 8 ? 'click to add a volunteer' : 'max 8'}
          onPointerDown={(e) => {
            if (e.target !== svg.current || V.length >= 8) return
            setV((v) => [...v, toSvg(e)])
          }}
          onPointerMove={(e) => {
            if (dragging == null) return
            moved.current = true
            const p = toSvg(e)
            setV((v) => v.map((q, i) => (i === dragging ? p : q)))
          }}
          onPointerUp={() => { if (dragging != null && !moved.current) setSel({ kind: 'v', i: dragging }); setDragging(null) }}
          role="img"
          aria-label="Volunteers (circles) matched to tasks (squares). Drag volunteers, click empty space to add one, double-click to remove."
        >
          {/* map */}
          <g className="pointer-events-none">
            {BLOCKS.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="8" className="fill-ink" opacity="0.035" />)}
            <path d="M -10 175 C 120 140, 220 215, 340 170 S 560 120, 700 160" fill="none" className="stroke-ink" strokeOpacity="0.07" strokeWidth="26" strokeLinecap="round" />
            <path d="M -10 175 C 120 140, 220 215, 340 170 S 560 120, 700 160" fill="none" className="stroke-canvas" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2 10" />
            <g transform="translate(64 300)" className="fill-mute font-mono" fontSize="9.5">
              <line x1="-40" x2="0" y1="0" y2="0" className="stroke-mute" />
              <text x="-20" y="-5" textAnchor="middle">200 m</text>
            </g>
            <g transform="translate(652 30)" className="font-mono" fontSize="10">
              <circle r="11" className="fill-paper stroke-ink" strokeOpacity="0.25" />
              <path d="M 0 -7 L 3 2 L 0 0 L -3 2 Z" className="fill-signal" />
              <text y="22" textAnchor="middle" className="fill-mute">N</text>
            </g>
          </g>
          {showGreedy &&
            gr.pairs.map(([v, t]) => (
              <path key={`g${v}`} d={seg(V[v], TASKS[t])} className="stroke-ink" strokeWidth="1.3" strokeDasharray="2 6" strokeLinecap="round" strokeOpacity=".45" fill="none"
                style={{ d: `path('${seg(V[v], TASKS[t])}')`, transition: dragging === v ? 'none' : 'd .5s cubic-bezier(.22,1,.36,1)' }} />
            ))}
          <AnimatePresence>
            {opt.pairs.map(([v, t]) => (
              <motion.path
                key={`o${v}-${t}`}
                d={seg(V[v], TASKS[t])}
                className="stroke-signal"
                strokeWidth={hover === v || sel?.i === v ? 4 : 2.6}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </AnimatePresence>
          {TASKS.map(([x, y], i) => (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Task ${String.fromCharCode(65 + i)}, ${KIND[i]}`}
              data-cursor="snap"
              data-cursor-label="task details"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setSel({ kind: 't', i })}
              onKeyDown={(e) => e.key === 'Enter' && setSel({ kind: 't', i })}
              className="outline-none"
            >
              <motion.circle cx={x} cy={y} r="16" className="fill-signal" initial={{ opacity: 0.25, scale: 1 }} animate={{ opacity: 0, scale: 2 }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.45, ease: 'easeOut' }} style={{ transformOrigin: `${x}px ${y}px` }} />
              <rect x={x - 14} y={y - 14} width="28" height="28" rx="7" className={sel?.kind === 't' && sel.i === i ? 'fill-signal' : 'fill-ink'} style={{ transition: 'fill .2s' }} />
              <text x={x} y={y + 4.5} textAnchor="middle" className="pointer-events-none fill-canvas font-mono" fontSize="12" fontWeight="600">{String.fromCharCode(65 + i)}</text>
              <text x={x} y={y + 28} textAnchor="middle" className="pointer-events-none fill-mute font-mono" fontSize="9.5">{KIND[i]}</text>
            </g>
          ))}
          {V.map(([x, y], i) => {
            const idle = !optOf.has(i)
            return (
              <g
                key={i}
                data-cursor="drag"
                data-cursor-label="drag · double-click to remove"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                role="button"
                tabIndex={0}
                aria-label={`Volunteer ${i + 1}`}
                className="outline-none"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  moved.current = false
                  setDragging(i)
                  svg.current.setPointerCapture?.(e.pointerId)
                }}
                onKeyDown={(e) => {
                  const k = e.shiftKey ? 24 : 8
                  if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(i, -k, 0) }
                  if (e.key === 'ArrowRight') { e.preventDefault(); nudge(i, k, 0) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); nudge(i, 0, -k) }
                  if (e.key === 'ArrowDown') { e.preventDefault(); nudge(i, 0, k) }
                  if (e.key === 'Enter') setSel({ kind: 'v', i })
                  if ((e.key === 'Delete' || e.key === 'Backspace') && V.length > 1) { setSel(null); setV((v) => v.filter((_, q) => q !== i)) }
                }}
                onDoubleClick={() => V.length > 1 && setV((v) => v.filter((_, k) => k !== i))}
              >
                {flash[i] && (
                  <motion.circle key={flash[i]} cx={x} cy={y} r="13" className="fill-none stroke-signal" strokeWidth="2"
                    initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 0.8 }} style={{ transformOrigin: `${x}px ${y}px` }} />
                )}
                <circle cx={x} cy={y} r="24" fill="transparent" />
                <motion.circle
                  cx={x} cy={y} r="13"
                  className={idle ? 'fill-paper stroke-ink/40' : 'fill-paper stroke-signal'}
                  strokeWidth="2.4"
                  strokeDasharray={idle ? '3 3' : ''}
                  animate={{ scale: dragging === i ? 1.25 : hover === i ? 1.12 : 1 }}
                  style={{ transformOrigin: `${x}px ${y}px`, filter: dragging === i ? 'drop-shadow(0 6px 8px rgb(0 0 0 / .25))' : 'none' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                />
                <text x={x} y={y + 4} textAnchor="middle" className="pointer-events-none fill-ink font-mono" fontSize="11">{i + 1}</text>
              </g>
            )
          })}
        </svg>

        {/* cost comparison */}
        <div className="pointer-events-none absolute bottom-3 right-3 w-[210px] rounded-xl border border-rule bg-canvas/90 p-3 font-mono text-[10.5px] backdrop-blur">
          {[['optimal', opt.cost, 'bg-signal'], ['nearest-first', gr.cost, 'bg-ink/50']].map(([k, v, c]) => (
            <div key={k} className="mb-1.5 last:mb-0">
              <div className="mb-1 flex justify-between text-mute"><span>{k}</span><span className="text-ink"><Tween value={v} /></span></div>
              <div className="h-1.5 rounded-full bg-ink/[0.07]">
                <motion.div className={`h-full rounded-full ${c}`} animate={{ width: `${(v / maxCost) * 100}%` }} transition={{ type: 'spring', stiffness: 160, damping: 24 }} />
              </div>
            </div>
          ))}
        </div>
        <Panel open={!!selInfo} onClose={closeSel} left={selInfo ? (selInfo.at[0] / W) * 100 : 50} top={selInfo ? Math.min(52, (selInfo.at[1] / H) * 100 + 8) : 20} title={selInfo?.title ?? ''} rows={selInfo?.rows ?? []} />
      </div>
    </Device>
  )
}
