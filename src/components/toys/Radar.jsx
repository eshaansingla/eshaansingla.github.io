import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device, Stat, Toggle } from '../kit'

/*
 * FIN-X's Opportunity Radar, as a simulated live terminal.
 * Deal cards stream in (simulated, labelled as such). Selecting one sends a question through
 * the same router as before: intent check, then Llama-3.3-70b, GPT-4o mini, rule engine.
 */
const MARKET = [
  'nifty', 'sensex', 'nse', 'bse', 'stock', 'stocks', 'share', 'shares', 'market', 'deal', 'block', 'bulk', 'rsi', 'macd',
  'ema', 'bollinger', 'price', 'ipo', 'fii', 'dii', 'promoter', 'earnings', 'dividend', 'volume', 'sector', 'buy', 'sell',
  'chart', 'trend', 'rally', 'crash', 'portfolio', 'investor', 'investors', 'smallcap', 'midcap', 'largecap', 'futures',
  'options', 'signal', 'technicals', 'breakout', 'support', 'resistance', 'valuation', 'quarter', 'results', 'overbought', 'oversold',
  'bought', 'sold', 'why', 'institution', 'fund',
]
const TICKERS = ['RELIANCE', 'HDFCBANK', 'TCS', 'INFY', 'ICICIBANK', 'SBIN', 'ITC', 'LT', 'BHARTIARTL', 'AXISBANK', 'KOTAKBANK', 'HCLTECH', 'MARUTI', 'WIPRO', 'TATAMOTORS', 'ADANIENT']
const TICK_RE = new RegExp(`\\b(${TICKERS.join('|')})\\b`, 'gi')
function classify(q) {
  const words = q.toLowerCase().match(/[a-z0-9]+/g) || []
  const hits = [...new Set(words.filter((w) => MARKET.includes(w)))]
  const t = [...new Set((q.match(TICK_RE) || []).map((x) => x.toUpperCase()))]
  return [...t, ...hits]
}
const CATS = ['Foreign institution', 'Mutual fund', 'Insurance company', 'Promoter group', 'Proprietary desk']

function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry(2026)
let nextId = 1
function makeDeal() {
  const type = rnd() < 0.5 ? 'BULK' : 'BLOCK'
  const side = rnd() < 0.62 ? 'BUY' : 'SELL'
  const pct = type === 'BULK' ? 0.5 + rnd() * 1.3 : 0.2 + rnd() * 1.6
  const walk = [0]
  for (let i = 1; i < 32; i++) walk.push(walk[i - 1] + (rnd() - 0.5 + (side === 'BUY' ? 0.06 : -0.06)))
  return {
    id: nextId++,
    ticker: TICKERS[Math.floor(rnd() * TICKERS.length)],
    type, side, pct,
    cat: CATS[Math.floor(rnd() * CATS.length)],
    walk,
    risk: pct > 1.3 ? 'high' : pct > 0.8 ? 'medium' : 'low',
    time: new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

function explain(deal, tier) {
  const pct = `${deal.pct.toFixed(2)}%`
  const who = deal.cat.toLowerCase()
  if (tier === 'rule engine') {
    return `${deal.side === 'BUY' ? 'Purchase' : 'Sale'} of ${pct} of ${deal.ticker} by a ${who}, reported as a ${deal.type.toLowerCase()} deal. Built from the signal fields alone.`
  }
  const how = deal.type === 'BLOCK'
    ? 'Block deals are negotiated in a separate trading window, so they reflect one large investor’s decision rather than broad demand on the order book.'
    : 'Bulk deals go through the normal order book; anything above 0.5% of a company’s shares in a day has to be disclosed, which is why this one surfaced.'
  const read = deal.side === 'BUY'
    ? `A ${who} adding ${pct} is usually read as a vote of confidence, though one deal says little about the next few sessions.`
    : `A ${who} selling ${pct} is often portfolio rebalancing or profit-taking, not necessarily a view on the business.`
  return `${how} ${read}`
}
const OFFTOPIC = 'FIN-X only answers questions about Indian markets. Try asking about this deal instead.'

function Spark({ walk, side, draw }) {
  const min = Math.min(...walk), max = Math.max(...walk)
  const d = walk.map((v, i) => `${i ? 'L' : 'M'}${(i / (walk.length - 1)) * 100} ${28 - ((v - min) / (max - min || 1)) * 24}`).join(' ')
  // reveal with a clip, not pathLength: pathLength miscounts with a non-scaling stroke and leaves gaps
  return (
    <motion.div initial={{ clipPath: draw ? 'inset(0 100% 0 0)' : 'inset(0 0% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 0.9, ease: 'easeOut' }}>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-full">
        <path d={d} fill="none" className={side === 'BUY' ? 'stroke-signal' : 'stroke-ink/60'} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    </motion.div>
  )
}

// The longest title, question and answer any deal can produce. Each is laid out invisibly under the
// real one, so the panel is always the height of the longest case and the page below never jumps.
const longest = (xs) => xs.reduce((a, b) => (b.length > a.length ? b : a), '')
const ALL = TICKERS.flatMap((ticker) => CATS.flatMap((cat) => ['BULK', 'BLOCK'].flatMap((type) => ['BUY', 'SELL'].map((side) => ({ ticker, cat, type, side, pct: 1.88 })))))
const LONG_TITLE = longest(ALL.map((d) => `${d.ticker} ${d.side === 'BUY' ? 'bought' : 'sold'} 1.88% by a ${d.cat.toLowerCase()}`))
const LONG_ANSWER = longest([OFFTOPIC, ...ALL.flatMap((d) => [explain(d, 'Llama-3.3-70b'), explain(d, 'rule engine')])])

const NODES = [['intent', 'intent'], ['t1', 'Llama'], ['t2', 'GPT-4o mini'], ['t3', 'rules']]

export default function Radar() {
  const [deals, setDeals] = useState(() => Array.from({ length: 4 }, makeDeal).reverse())
  const [pinned, setPinned] = useState(null)
  const [up, setUp] = useState({ t1: true, t2: true })
  const [q, setQ] = useState('')
  const [route, setRoute] = useState({ lit: {}, tier: null, text: '', typed: 0, key: 0 })
  const [render, setRender] = useState(null)
  const t0 = useRef(0)
  const box = useRef(null)
  const visible = useRef(true)
  const timers = useRef([])
  const [typing, setTyping] = useState(false)
  const hold = useRef({ pinned: null, typing: false, auto: false })
  useEffect(() => { hold.current.pinned = pinned; hold.current.typing = typing }, [pinned, typing])

  const selected = deals.find((x) => x.id === pinned) || deals[0]

  // stream deals while on screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting))
    io.observe(box.current)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = reduced ? null : setInterval(() => {
      // hold the feed while someone is typing a question, so the deal they are asking about stays put
      if (!visible.current || hold.current.typing) return
      t0.current = performance.now()
      setDeals((ds) => {
        const next = [makeDeal(), ...ds]
        // a pinned deal never drops off the bottom of the list
        const keep = hold.current.pinned != null && next.slice(0, 6).every((x) => x.id !== hold.current.pinned)
        return keep ? [...next.slice(0, 5), next.find((x) => x.id === hold.current.pinned)] : next.slice(0, 6)
      })
    }, 3400)
    return () => { clearInterval(id); io.disconnect() }
  }, [])
  // measure how long the new card took to render (real, in this browser)
  useLayoutEffect(() => { if (t0.current) { setRender(performance.now() - t0.current); t0.current = 0 } }, [deals])

  // route a question through the chain, then type the answer out
  const ask = (deal, question) => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const inDomain = classify(question).length > 0
    const steps = []
    let tier
    if (!inDomain) { steps.push(['intent', 'fail'], ['t3', 'ok']); tier = 'rule engine' }
    else {
      steps.push(['intent', 'pass'])
      if (up.t1) { steps.push(['t1', 'ok']); tier = 'Llama-3.3-70b' }
      else {
        steps.push(['t1', 'fail'])
        if (up.t2) { steps.push(['t2', 'ok']); tier = 'GPT-4o mini' }
        else { steps.push(['t2', 'fail'], ['t3', 'ok']); tier = 'rule engine' }
      }
    }
    const text = inDomain ? explain(deal, tier) : OFFTOPIC
    const key = Date.now()
    setRoute({ lit: {}, tier: null, text, typed: 0, key, question })
    steps.forEach(([n, s], i) => timers.current.push(setTimeout(() => setRoute((r) => (r.key === key ? { ...r, lit: { ...r.lit, [n]: s } } : r)), 260 * (i + 1))))
    const start = 260 * (steps.length + 1)
    timers.current.push(setTimeout(() => setRoute((r) => (r.key === key ? { ...r, tier } : r)), start))
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) timers.current.push(setTimeout(() => setRoute((r) => (r.key === key ? { ...r, typed: text.length } : r)), start))
    else for (let c = 1; c <= text.length; c += 3) timers.current.push(setTimeout(() => setRoute((r) => (r.key === key ? { ...r, typed: Math.min(text.length, c + 2) } : r)), start + c * 9))
  }
  const defaultQ = (dl) => `Why did a ${dl.cat.toLowerCase()} ${dl.side === 'BUY' ? 'buy' : 'sell'} ${dl.pct.toFixed(2)}% of ${dl.ticker}?`
  useEffect(() => { ask(selected, defaultQ(selected)) }, [selected?.id, up.t1, up.t2]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const hits = classify(q)

  return (
    <Device
      name="FIN-X, Opportunity Radar"
      sub="NSE bulk and block deals"
      status="live"
      statusLabel="live feed"
      toolbar={
        <>
          {[['t1', 'Llama-3.3-70b'], ['t2', 'GPT-4o mini']].map(([t, name]) => (
            <label key={t} className="flex items-center gap-2.5 font-mono text-[12px]">
              <Toggle on={up[t]} onChange={(v) => setUp((u) => ({ ...u, [t]: v }))} label={`${name} available`} />
              <span className={up[t] ? '' : 'text-mute line-through'}>{name}</span>
            </label>
          ))}
          <span className="font-mono text-[12px] text-mute">rule engine always on</span>
          <div className="ml-auto flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <Stat label="deals">{deals[0].id + 3}</Stat>
            <Stat label="last card render" accent>{render == null ? 'waiting' : `${render.toFixed(1)} ms`}</Stat>
          </div>
        </>
      }
      footer={
        <>
          <span className="ml-auto">{pinned ? 'pinned' : 'following the newest deal'}</span>
        </>
      }
    >
      <div ref={box} className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[300px_minmax(0,1fr)]">
        {/* feed */}
        <ul className="max-h-[460px] overflow-hidden border-b border-rule md:border-b-0 md:border-r">
          <AnimatePresence initial={false}>
            {deals.map((dl, i) => {
              const on = dl.id === selected.id
              return (
                <motion.li key={dl.id} layout initial={{ opacity: 0, y: -18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                  <button
                    onClick={() => { hold.current.auto = false; setPinned(dl.id === pinned ? null : dl.id) }}
                    className={`relative block w-full border-b border-rule px-4 py-3 text-left transition-colors hover:bg-ink/[0.04] ${on ? 'bg-ink/[0.06]' : ''}`}
                  >
                    {on && <motion.span layoutId="radar-sel" className="absolute inset-y-0 left-0 w-[3px] bg-signal" />}
                    {i === 0 && !pinned && <motion.span className="absolute inset-0 bg-signal/10" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />}
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[14px] font-semibold tracking-tight">{dl.ticker}</span>
                      <span className="font-mono text-[10.5px] text-mute">{dl.time}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-2 font-mono text-[10.5px]">
                      <span className={`rounded px-1.5 py-0.5 ${dl.side === 'BUY' ? 'bg-signal/20 text-signal' : 'bg-ink/10 text-ink'}`}>{dl.side}</span>
                      <span className="text-mute">{dl.type}</span>
                      <span className="text-ink">{dl.pct.toFixed(2)}% of equity</span>
                    </span>
                    <Spark walk={dl.walk} side={dl.side} draw={i === 0} />
                    <span className="flex justify-between font-mono text-[10px] text-mute">
                      <span>{dl.cat}</span>
                      <span className={dl.risk === 'high' ? 'text-signal' : ''}>{dl.risk} impact</span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>

        {/* explanation */}
        <div className="flex min-h-[420px] flex-col p-5 md:p-6">
          <div className="grid">
          <div aria-hidden="true" className="invisible [grid-area:1/1]">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em]">BLOCK deal, 00:00:00 IST</p>
            <p className="mt-1 text-[1.5rem] leading-tight">{LONG_TITLE}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={selected.id} className="[grid-area:1/1]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{selected.type} deal, {selected.time} IST</p>
              <p className="mt-1 text-[1.5rem] leading-tight">
                <span className="font-mono font-semibold">{selected.ticker}</span>{' '}
                <span className={selected.side === 'BUY' ? 'text-signal' : 'text-ink-2'}>{selected.side === 'BUY' ? 'bought' : 'sold'}</span>{' '}
                {selected.pct.toFixed(2)}% by a {selected.cat.toLowerCase()}
              </p>
            </motion.div>
          </AnimatePresence>
          </div>

          {/* route strip */}
          <div className="mt-5 flex items-center gap-1.5">
            {NODES.map(([id, label], i) => {
              const s = route.lit[id]
              const down = (id === 't1' && !up.t1) || (id === 't2' && !up.t2)
              return (
                <div key={id} className="flex flex-1 items-center gap-1.5">
                  <motion.span
                    animate={s === 'fail' ? { x: [0, -3, 3, 0] } : { x: 0 }}
                    className={`min-w-0 flex-1 whitespace-nowrap rounded-lg border px-1.5 py-1.5 text-center font-mono text-[10.5px] transition-colors duration-200 sm:px-2 ${
                      s === 'ok' ? 'border-signal bg-signal text-signal-ink' : s === 'pass' ? 'border-ink bg-ink text-canvas' : s === 'fail' ? 'border-ink/40 text-mute line-through' : down ? 'border-dashed border-ink/25 text-mute' : 'border-ink/20 text-ink-2'
                    }`}
                  >
                    {id === 't2' ? <><span className="lg:hidden">GPT-4o</span><span className="hidden lg:inline">{label}</span></> : label}
                  </motion.span>
                  {i < NODES.length - 1 && <span className="text-mute">›</span>}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex-1 rounded-xl border border-rule bg-ink/[0.03] p-4">
            <div className="grid">
              <p aria-hidden="true" className="invisible font-mono text-[11px] [grid-area:1/1]">“Why did a foreign institution sell 1.88% of BHARTIARTL?”</p>
              <p className="font-mono text-[11px] text-mute [grid-area:1/1]">“{route.question}”</p>
            </div>
            <motion.p aria-hidden={!route.tier} animate={{ opacity: route.tier ? 1 : 0 }} className="mt-2 font-mono text-[11px] text-signal">
              answered by {route.tier || 'Llama-3.3-70b'}
            </motion.p>
            <div className="mt-1.5 grid text-[16.5px] leading-relaxed">
              <p aria-hidden="true" className="invisible [grid-area:1/1]">{LONG_ANSWER}</p>
              <p className="[grid-area:1/1]">
                {route.text.slice(0, route.typed)}
                {route.typed < route.text.length && route.tier && <span className="ml-0.5 inline-block h-4 w-[7px] translate-y-0.5 animate-pulse bg-signal" />}
              </p>
            </div>
          </div>

          <form className="mt-4 flex items-center gap-2 rounded-full border border-ink/20 bg-canvas py-1.5 pl-4 pr-1.5 focus-within:border-ink" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { hold.current.auto = false; ask(selected, q.trim()) } }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => {
                setTyping(true)
                // pin the deal on screen so the feed can't swap it out mid-question
                if (pinned == null) { hold.current.auto = true; setPinned(selected.id) }
              }}
              onBlur={() => {
                setTyping(false)
                // nothing typed: go back to following the newest deal
                if (hold.current.auto && !q.trim()) { hold.current.auto = false; setPinned(null) }
              }} placeholder={`Ask about ${selected.ticker}…`} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-mute" aria-label="Follow-up question" />
            <span className="hidden gap-1 sm:flex">
              <AnimatePresence>
                {hits.slice(0, 2).map((h) => (
                  <motion.span key={h} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[10.5px] text-signal">{h}</motion.span>
                ))}
              </AnimatePresence>
            </span>
            <button className="rounded-full bg-ink px-4 py-2 font-mono text-[12px] text-canvas transition-colors hover:bg-signal hover:text-signal-ink">ask</button>
          </form>
        </div>
      </div>
    </Device>
  )
}
