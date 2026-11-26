import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { Device, Panel, Toggle, useClock } from '../kit'

// Fig. 4 — FIN-X's fallback chain, simplified. Type anything; take providers down.
const MARKET = [
  'nifty', 'sensex', 'nse', 'bse', 'stock', 'stocks', 'share', 'shares', 'market', 'deal', 'block', 'bulk', 'rsi', 'macd',
  'ema', 'bollinger', 'price', 'ipo', 'fii', 'dii', 'promoter', 'earnings', 'dividend', 'volume', 'sector', 'buy', 'sell',
  'chart', 'trend', 'rally', 'crash', 'portfolio', 'investor', 'investors', 'smallcap', 'midcap', 'largecap', 'futures',
  'options', 'signal', 'technicals', 'breakout', 'support', 'resistance', 'valuation', 'quarter', 'results', 'overbought', 'oversold',
]
const TICKERS = /\b(RELIANCE|HDFCBANK|TCS|INFY|ICICIBANK|SBIN|ITC|LT|BHARTIARTL|ADANIENT|TATAMOTORS|WIPRO|AXISBANK|KOTAKBANK|HCLTECH|MARUTI)\b/gi
function classify(q) {
  const words = q.toLowerCase().match(/[a-z0-9]+/g) || []
  const hits = [...new Set(words.filter((w) => MARKET.includes(w)))]
  const t = [...new Set((q.match(TICKERS) || []).map((x) => x.toUpperCase()))]
  return [...t, ...hits]
}

const NODES = [
  { id: 'q', x: 70, label: 'question' },
  { id: 'intent', x: 250, label: 'intent check' },
  { id: 't1', x: 430, label: 'Llama-3.3-70b', tier: 'tier 1' },
  { id: 't2', x: 610, label: 'GPT-4o mini', tier: 'tier 2' },
  { id: 't3', x: 790, label: 'rule engine', tier: 'tier 3' },
]
const NY = 96
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))
const ROLE = {
  q: ['question', 'Free text from the user, as typed.'],
  intent: ['intent check', 'Looks for market terms and NSE tickers. Off-topic questions are answered by the rule engine and never reach a model.'],
  t1: ['tier 1 · Llama-3.3-70b', 'Primary model, served through Groq. Explains deals and signals in plain language.'],
  t2: ['tier 2 · GPT-4o mini', 'Fallback model. Takes over automatically if tier 1 is unavailable.'],
  t3: ['tier 3 · rule engine', 'Deterministic, always available. Builds a templated explanation from the signal data.'],
}
const TAPE = ['RELIANCE', 'HDFCBANK', 'TCS', 'INFY', 'ICICIBANK', 'SBIN', 'ITC', 'LT', 'BHARTIARTL', 'AXISBANK', 'KOTAKBANK', 'HCLTECH', 'MARUTI', 'WIPRO', 'ADANIENT', 'TATAMOTORS']
const SUGGEST = ['Why was there a block deal in HDFCBANK today?', 'Is RELIANCE overbought on RSI?', 'Write me a poem about cricket']

function plan(query, up) {
  const hits = classify(query)
  if (!hits.length) return { hits, hops: [['q'], ['intent', 'fail'], ['t3', 'ok', 'arc']], answer: ['rule engine', 'A polite no, and a pointer back to markets. No model was called.'] }
  const hops = [['q'], ['intent', 'pass']]
  if (up.t1) return { hits, hops: [...hops, ['t1', 'ok']], answer: ['Llama-3.3-70b', 'Explains the signal in plain language.'] }
  hops.push(['t1', 'fail'])
  if (up.t2) return { hits, hops: [...hops, ['t2', 'ok']], answer: ['GPT-4o mini', 'Fallback answered; the user never sees the outage.'] }
  hops.push(['t2', 'fail'])
  return { hits, hops: [...hops, ['t3', 'ok']], answer: ['rule engine', 'Templated explanation built from the signal data itself.'] }
}

export default function RouterToy() {
  const [up, setUp] = useState({ t1: true, t2: true })
  const [q, setQ] = useState('')
  const [route, setRoute] = useState(null) // { d, marks:[{id,at,st}], answer }
  const [prog, setProg] = useState(0)
  const [busy, setBusy] = useState(false)
  const [lens, setLens] = useState(1)
  const pathRef = useRef(null)
  const [dot, setDot] = useState(null)
  const anim = useRef(null)
  const [history, setHistory] = useState([])
  const [node, setNode] = useState(null)
  const closeNode = useCallback(() => setNode(null), [])
  const now = useClock()
  const lastQ = useRef('')

  const go = (text) => {
    const query = (text ?? q).trim()
    if (!query || busy) return
    const { hops, answer } = plan(query, up)
    // build the path and where each hop sits along it
    let d = `M ${byId.q.x} ${NY}`
    let L = 0
    const marks = [{ id: 'q', at: 0, st: 'pass' }]
    for (let i = 1; i < hops.length; i++) {
      const [id, st, kind] = hops[i]
      const a = byId[hops[i - 1][0]], b = byId[id]
      if (kind === 'arc') {
        const cx = (a.x + b.x) / 2
        d += ` Q ${cx} ${NY - 150} ${b.x} ${NY}`
        L += Math.hypot(b.x - a.x, 150) * 1.15
      } else {
        d += ` L ${b.x} ${NY}`
        L += b.x - a.x
      }
      marks.push({ id, at: L, st })
    }
    marks.forEach((m) => (m.at /= L || 1))
    anim.current?.stop()
    setBusy(true)
    lastQ.current = query
    setRoute({ d, marks, answer, key: Math.random() })
    setProg(0)
  }

  useLayoutEffect(() => { setLens(pathRef.current ? pathRef.current.getTotalLength() : 1) }, [route])
  useEffect(() => {
    if (!route) return
    const hops = route.marks.length - 1
    anim.current = animate(0, 1, {
      duration: 0.55 * hops,
      ease: [0.45, 0, 0.2, 1],
      onUpdate: (k) => {
        setProg(k)
        const p = pathRef.current
        if (p) { const pt = p.getPointAtLength(k * p.getTotalLength()); setDot([pt.x, pt.y]) }
      },
      onComplete: () => {
        setBusy(false)
        const n = route.marks.filter((m) => m.st === 'fail' && m.id !== 'intent').length
        setHistory((h) => [{ id: route.key, t: new Date().toLocaleTimeString('en-GB', { hour12: false }), q: lastQ.current, by: route.answer[0], n }, ...h].slice(0, 4))
      },
    })
    return () => anim.current?.stop()
  }, [route])

  const reached = (id) => route?.marks.find((m) => m.id === id && prog >= m.at - 0.001)
  const hits = classify(q)
  const done = route && prog >= 0.999

  return (
    <Device
      className="dark"
      name="FIN-X · router console"
      sub="NSE · 3-tier LLM fallback"
      status={busy ? 'run' : 'live'}
      statusLabel={busy ? 'routing' : 'online'}
      toolbar={
        <>
          {[['t1', 'Llama-3.3-70b'], ['t2', 'GPT-4o mini']].map(([t, name]) => (
            <label key={t} className="flex items-center gap-2.5 font-mono text-[12px]">
              <Toggle on={up[t]} onChange={(v) => setUp((u) => ({ ...u, [t]: v }))} label={`${name} available`} cursorLabel={up[t] ? 'take it down' : 'bring it back'} />
              <span className={`transition-colors ${up[t] ? '' : 'text-mute line-through'}`}>{name}</span>
              <span className={`rounded px-1.5 py-0.5 text-[9.5px] ${up[t] ? 'bg-signal/15 text-signal' : 'bg-ink/10 text-mute'}`}>{up[t] ? 'UP' : 'DOWN'}</span>
            </label>
          ))}
          <span className="flex items-center gap-2.5 font-mono text-[12px] text-mute">
            rule engine <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[9.5px] text-signal">UP</span>
          </span>
        </>
      }
      footer={
        <>
          <span>{history.length} routed this session</span>
          <span>click a node for its role</span>
          <span className="ml-auto">{now} IST</span>
        </>
      }
    >
      {/* watchlist tape */}
      <div className="relative overflow-hidden border-b border-rule py-1.5 font-mono text-[10.5px] text-mute [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div className="flex w-max gap-6 whitespace-nowrap" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
          {[...TAPE, ...TAPE].map((t, i) => (
            <span key={i}><span className="text-ink">{t}</span> <span className="text-signal">●</span> watching</span>
          ))}
        </motion.div>
      </div>
      <div className="paper-grid px-3 pb-5 pt-3 md:px-6">
        <div className="relative mx-auto max-w-[860px]">
        <svg viewBox="0 0 860 150" className="mx-auto block w-full max-w-[860px] overflow-visible" role="img" aria-label="Routing diagram">
          <line x1={70} x2={790} y1={NY} y2={NY} className="stroke-ink" strokeOpacity="0.15" strokeWidth="2" />
          {route && (
            <>
              <path ref={pathRef} d={route.d} fill="none" stroke="none" />
              <motion.path
                key={route.key}
                d={route.d}
                fill="none"
                className="stroke-signal"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${lens} ${lens}`}
                strokeDashoffset={lens * (1 - prog)}
              />
            </>
          )}
          {NODES.map((n) => {
            const m = reached(n.id)
            const st = m?.st
            const down = (n.id === 't1' && !up.t1) || (n.id === 't2' && !up.t2)
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${NY})`}
                role="button"
                tabIndex={0}
                aria-label={ROLE[n.id][0]}
                data-cursor="snap"
                data-cursor-label="what it does"
                onClick={() => setNode(n.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setNode(n.id))}
                className="outline-none [&:focus-visible>g>circle:nth-of-type(1)]:stroke-signal"
              >
                <circle r="30" fill="transparent" />
                <motion.g
                  animate={st === 'fail' ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {st === 'ok' && (
                    <motion.circle r="22" className="fill-signal" initial={{ scale: 1, opacity: 0.45 }} animate={{ scale: 2.1, opacity: 0 }} transition={{ duration: 0.9 }} />
                  )}
                  <motion.circle
                    r="20"
                    strokeWidth="1.6"
                    initial={false}
                    animate={{ scale: m ? 1.08 : 1 }}
                    className={
                      st === 'ok' ? 'fill-signal stroke-signal' : st === 'pass' ? 'fill-ink stroke-ink' : st === 'fail' ? 'fill-paper stroke-ink' : down ? 'fill-paper stroke-ink/30' : 'fill-paper stroke-ink/50'
                    }
                    strokeDasharray={down && !st ? '3 4' : ''}
                  />
                  <text textAnchor="middle" y="4.5" className={`font-mono ${st === 'ok' ? 'fill-signal-ink' : st === 'pass' ? 'fill-canvas' : 'fill-ink'}`} fontSize="13">
                    {st === 'fail' ? '✕' : st === 'ok' ? '✓' : n.id === 'q' ? '?' : n.id === 'intent' ? 'ƒ' : n.tier.slice(-1)}
                  </text>
                </motion.g>
                <text textAnchor="middle" y="42" className={`font-mono ${down ? 'fill-mute' : 'fill-ink'}`} fontSize="11.5" textDecoration={down ? 'line-through' : ''}>{n.label}</text>
                {n.tier && <text textAnchor="middle" y="56" className="fill-mute font-mono" fontSize="10">{n.tier}</text>}
              </g>
            )
          })}
          {dot && busy && (
            <g transform={`translate(${dot[0]} ${dot[1]})`}>
              <circle r="11" className="fill-signal" opacity="0.18" />
              <circle r="5.5" className="fill-signal" />
            </g>
          )}
        </svg>
        <Panel open={!!node} onClose={closeNode} left={node ? (byId[node].x / 860) * 100 : 50} top={88} title={node ? ROLE[node][0] : ''}>
          {node ? ROLE[node][1] : ''}
        </Panel>
        </div>

        <form className="mx-auto mt-3 flex max-w-[860px] items-center gap-2 rounded-full border border-ink/20 bg-canvas py-1.5 pl-4 pr-1.5 shadow-[0_8px_24px_-18px_rgb(0_0_0/0.4)] focus-within:border-ink" onSubmit={(e) => { e.preventDefault(); go() }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask FIN-X anything…" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-mute" aria-label="Question for FIN-X" />
          <span className="hidden items-center gap-1 sm:flex">
            <AnimatePresence>
              {hits.slice(0, 3).map((h) => (
                <motion.span key={h} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="rounded-full bg-signal/12 px-2 py-0.5 font-mono text-[10.5px] text-signal">
                  {h}
                </motion.span>
              ))}
            </AnimatePresence>
            {q.trim() && !hits.length && <span className="font-mono text-[10.5px] text-mute">off-topic</span>}
          </span>
          <button disabled={busy} className="rounded-full bg-ink px-4 py-2 font-mono text-[12px] text-canvas transition-colors hover:bg-signal hover:text-signal-ink disabled:opacity-40" data-cursor-label="send">
            route →
          </button>
        </form>
        <div className="mx-auto mt-2.5 flex max-w-[860px] flex-wrap gap-1.5">
          {SUGGEST.map((s) => (
            <button key={s} disabled={busy} onClick={() => { setQ(s); go(s) }} className="rounded-full border border-ink/15 bg-canvas px-3 py-1.5 text-[14px] text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-4 min-h-[64px] max-w-[860px]">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key={route.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 rounded-xl border border-rule bg-canvas p-3.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-signal" />
                <p className="text-[15.5px] leading-snug">
                  <span className="mr-2 font-mono text-[11.5px] text-signal">{route.answer[0]}</span>
                  {route.answer[1]}
                  <span className="ml-2 font-mono text-[11px] text-mute">{(() => { const n = route.marks.filter((m) => m.st === 'fail' && m.id !== 'intent').length; return n ? `${n} fallback${n > 1 ? 's' : ''} used` : 'first choice answered' })()}</span>
                </p>
              </motion.div>
            ) : (
              <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-3 text-center font-mono text-[12px] text-mute">
                {busy ? 'routing…' : 'type a question or pick one above'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {history.length > 0 && (
          <ul className="mx-auto mt-3 max-w-[860px] divide-y divide-rule rounded-xl border border-rule">
            <AnimatePresence initial={false}>
              {history.map((h) => (
                <motion.li
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 font-mono text-[11px]"
                >
                  <span className="text-mute">{h.t}</span>
                  <span className="truncate text-ink-2">{h.q}</span>
                  <span className={`rounded-full px-2 py-0.5 ${h.n ? 'bg-ink/10 text-ink' : 'bg-signal/15 text-signal'}`}>{h.by}{h.n ? ` · ${h.n} fallback${h.n > 1 ? 's' : ''}` : ''}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Device>
  )
}
