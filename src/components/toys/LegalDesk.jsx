import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device } from '../kit'

/*
 * NyaayaBot figure: one question at a time, with the work behind the answer laid open.
 *   1. intent:   the repo's domain keywords are matched in the question (no match and no context means refuse)
 *   2. clause:   candidate provisions are scored on keyword overlap and the best one is cited
 *   3. memory:   the last 10 exchanges ride along, so a follow-up with no keywords still resolves
 *   4. answer:   written for this page (the real bot sends the clause and history to Gemini)
 */
const KEYWORDS = ['tenant', 'rent', 'landlord', 'lease', 'evict', 'rental', 'agreement', 'deposit', 'notice']
const MEMORY = 10

const CLAUSES = [
  {
    id: 'mta11',
    cite: 'Model Tenancy Act, 2021, s. 11',
    gist: 'Security deposit for residential premises capped at two months’ rent; refunded when the landlord takes back vacant possession, less lawful dues.',
    tags: ['deposit', 'refund', 'security', 'back', 'return', 'moved', 'vacate', 'pay'],
  },
  {
    id: 'tpa106',
    cite: 'Transfer of Property Act, 1882, s. 106',
    gist: 'Without a contract saying otherwise, a month-to-month lease ends on fifteen days’ written notice.',
    tags: ['evict', 'notice', 'leave', 'vacate', 'quit', 'month', 'terminate', 'out'],
  },
  {
    id: 'tpa107',
    cite: 'Transfer of Property Act, 1882, s. 107',
    gist: 'Leases of a year or more need a registered instrument; shorter ones can be made orally with possession handed over.',
    tags: ['verbal', 'oral', 'written', 'valid', 'agreement', 'paper', 'unregistered'],
  },
  {
    id: 'reg17',
    cite: 'Registration Act, 1908, s. 17(1)(d)',
    gist: 'Leases from year to year, or for any term over one year, are compulsorily registrable.',
    tags: ['register', 'registered', 'unregistered', 'year', 'stamp', 'agreement', 'valid'],
  },
]

const ANSWERS = {
  mta11: 'Your deposit is meant to come back when you hand over the keys, minus only what you genuinely owe, such as unpaid rent or damage beyond normal wear. Ask for it in writing first and list what you are owed. Keep the move-out photos and the rent receipts together.',
  tpa106: 'If your lease does not say otherwise and you pay month to month, the landlord has to give you written notice, fifteen days under the general rule, before the tenancy ends. A lock change or cutting the power instead of notice is not a lawful shortcut.',
  tpa107: 'A spoken arrangement can still be a valid tenancy if it is for less than a year and you were given possession. Rent receipts, bank transfers and messages all help show what was agreed. For a year or longer, the lease needs to be in writing and registered.',
  reg17: 'Any lease for more than a year has to be registered to be enforceable as written. Many people sign 11-month agreements for exactly this reason. If yours is longer and unregistered, its terms are harder to rely on, though the tenancy itself is not void.',
}
const FOLLOW = {
  mta11: 'Then send a formal notice asking for the refund within a set time, say fifteen days. If that goes unanswered, the Rent Authority under your state’s tenancy law, or a civil suit for recovery, are the next steps. Keep every message.',
  tpa106: 'Then stay and keep paying rent on time, with proof. A landlord who wants possession without proper notice has to go through the Rent Authority or a court; doing it by force is not allowed.',
  tpa107: 'Then put what you agreed into a short written note, signed by both of you if possible. Even an informal record makes the terms much easier to prove later.',
  reg17: 'Then consider registering a fresh agreement, or switching to a term under a year. The sub-registrar’s office can tell you the stamp duty for your state.',
}
const CAUTION = 'State rent laws differ, so check the rules where you live, and see a lawyer before you act on anything serious.'
const REFUSAL = 'I only help with tenancy and rent questions in India, so that one is outside my lane. Ask me about a lease, a deposit or a notice and I’m all yours.'
const CLARIFY = 'Happy to help. Are you the tenant or the landlord, and which state is the property in? The answer changes with both.'

const PRESETS = [
  'My landlord kept my deposit after I moved out. What can I do?',
  'Can my landlord evict me without notice?',
  'Is a verbal rent agreement valid?',
  'What if he still refuses?',
  'Who won the IPL final?',
]

const words = (q) => q.toLowerCase().match(/[a-z']+/g) || []
const kwOf = (w) => KEYWORDS.find((k) => w.startsWith(k))

/** The pipeline, computed once per question. */
function analyse(q, history) {
  const ws = words(q)
  const hits = ws.filter(kwOf)
  const scored = CLAUSES.map((c) => ({ ...c, score: ws.reduce((s, w) => s + (c.tags.some((t) => w.startsWith(t)) ? 1 : 0), 0) + (hits.length ? 0 : 0) }))
    .sort((a, b) => b.score - a.score)
  const lastTopic = [...history].reverse().find((h) => h.topic)?.topic
  if (!hits.length && !lastTopic) return { ws, hits, scored, kind: 'refuse', text: REFUSAL }
  if (!hits.length && lastTopic) {
    const s = scored.map((c) => (c.id === lastTopic ? { ...c, score: c.score + 2 } : c)).sort((a, b) => b.score - a.score)
    return { ws, hits, scored: s, kind: 'context', topic: lastTopic, text: FOLLOW[lastTopic] }
  }
  if (scored[0].score === 0) return { ws, hits, scored, kind: 'clarify', text: CLARIFY }
  return { ws, hits, scored, kind: 'answer', topic: scored[0].id, text: ANSWERS[scored[0].id] }
}

export default function LegalDesk() {
  const [turns, setTurns] = useState([])
  const [cur, setCur] = useState(null) // { q, a, stage, typed }
  const [input, setInput] = useState('')
  const [hoverCite, setHoverCite] = useState(false)
  const timers = useRef([])
  const scroller = useRef(null)
  const busy = cur && cur.stage < 4

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => { scroller.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [turns, cur?.typed, cur?.stage])

  const ask = (q) => {
    if (!q.trim() || busy) return
    timers.current.forEach(clearTimeout)
    if (cur) setTurns((t) => [...t, cur].slice(-MEMORY))
    const a = analyse(q, [...turns, ...(cur ? [cur] : [])])
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = { q, a, stage: reduced ? 4 : 0, typed: reduced ? a.text.length : 0, topic: a.topic }
    setCur(next)
    setInput('')
    if (reduced) return
    ;[1, 2, 3].forEach((s, i) => timers.current.push(setTimeout(() => setCur((c) => c && { ...c, stage: s }), 420 * (i + 1))))
    timers.current.push(setTimeout(() => {
      setCur((c) => c && { ...c, stage: 4 })
      let n = 0
      const tick = () => {
        n += 3
        setCur((c) => c && { ...c, typed: Math.min(c.a.text.length, n) })
        if (n < a.text.length) timers.current.push(setTimeout(tick, 16))
      }
      tick()
    }, 1700))
  }

  const reset = () => { timers.current.forEach(clearTimeout); setTurns([]); setCur(null) }
  const memoryUsed = turns.length + (cur ? 1 : 0)
  const top = cur?.a.scored[0]
  const cited = cur && (cur.a.kind === 'answer' || cur.a.kind === 'context')

  return (
    <Device
      name="NyaayaBot"
      sub="tenancy-law assistant, answers written for this page"
      status={busy ? 'run' : 'live'}
      statusLabel={busy ? 'thinking' : 'ready'}
      footer={
        <>
          <span>keywords from the repo; clauses are real provisions</span>
          <span className="ml-auto">memory {Math.min(memoryUsed, MEMORY)} / {MEMORY} turns</span>
        </>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* chat */}
        <div className="flex min-h-[300px] flex-col md:min-h-[420px]">
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:max-h-[420px]">
            {!turns.length && !cur && (
              <p className="pt-6 text-center text-[15px] italic text-mute">Ask about a lease, a deposit or a notice, or pick a question below.</p>
            )}
            {[...turns, ...(cur ? [cur] : [])].map((t, i, arr) => {
              const live = i === arr.length - 1 && cur
              const text = live ? t.a.text.slice(0, t.typed) : t.a.text
              const showA = !live || t.stage >= 4
              return (
                <div key={i + t.q} className="space-y-2">
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[15px] leading-snug text-canvas">
                    {t.q}
                  </motion.div>
                  {showA ? (
                    <div className={`w-fit max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-[15px] leading-snug ${t.a.kind === 'refuse' ? 'border-ink/15 text-ink-2' : 'border-rule-2 bg-paper'}`}>
                      {text}
                      {(t.a.kind === 'answer' || t.a.kind === 'context') && (!live || t.typed >= t.a.text.length) && (
                        <>
                          {' '}
                          <sup
                            className={`cursor-default font-mono text-[11px] ${live && hoverCite ? 'text-ink' : 'text-signal'}`}
                            onPointerEnter={() => live && setHoverCite(true)}
                            onPointerLeave={() => setHoverCite(false)}
                          >
                            [{t.a.scored[0].cite.replace(/, \d{4}/, '')}]
                          </sup>
                          <span className="mt-1.5 block text-[13px] italic text-mute">{CAUTION}</span>
                        </>
                      )}
                      {live && t.typed < t.a.text.length && <span className="ml-0.5 inline-block h-[1em] w-[7px] translate-y-[2px] bg-signal motion-safe:animate-pulse" />}
                    </div>
                  ) : (
                    <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md border border-rule-2 px-3.5 py-3">
                      {[0, 1, 2].map((k) => (
                        <motion.span key={k} className="h-1.5 w-1.5 rounded-full bg-mute" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="border-t border-rule px-4 pb-4 pt-3">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p} disabled={busy} onClick={() => ask(p)} className="rounded-full border border-ink/15 px-2.5 py-1 text-left font-mono text-[11px] text-ink-2 transition-colors hover:border-signal hover:text-signal disabled:opacity-40">
                  {p}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex items-center gap-2 rounded-full border border-ink/20 bg-canvas py-1 pl-4 pr-1 focus-within:border-signal">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your own question…" aria-label="Ask NyaayaBot" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute" />
              <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-ink px-3.5 py-1.5 font-mono text-[12px] text-canvas transition-colors hover:bg-signal hover:text-signal-ink disabled:opacity-40">ask</button>
              {(turns.length > 0 || cur) && <button type="button" onClick={reset} className="rounded-full px-2.5 py-1.5 font-mono text-[11px] text-mute hover:text-ink">clear</button>}
            </form>
          </div>
        </div>

        {/* behind the answer */}
        <div className="border-t border-rule bg-ink/[0.015] px-4 py-4 md:border-l md:border-t-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">Behind the answer</p>
          {!cur ? (
            <p className="mt-6 text-[15px] italic text-mute">Each step lights up here as a question goes through.</p>
          ) : (
            <ol className="mt-3 space-y-4">
              <Step n={1} on={cur.stage >= 1} title="Is it a tenancy question?">
                <p className="text-[14.5px] leading-relaxed">
                  {cur.a.ws.map((w, i) => (
                    <span key={i} className={kwOf(w) ? 'rounded bg-signal/15 px-0.5 text-signal' : 'text-ink-2'}>{w} </span>
                  ))}
                </p>
                <p className="mt-1 font-mono text-[11px] text-mute">
                  {cur.a.hits.length ? `matched: ${[...new Set(cur.a.hits.map(kwOf))].join(', ')}` : cur.a.kind === 'context' ? 'no keywords, but the conversation is about tenancy' : 'no tenancy keywords and no prior context'}
                </p>
              </Step>
              <Step n={2} on={cur.stage >= 2} title={cur.a.kind === 'refuse' ? 'Clause search skipped' : 'Which provision fits?'}>
                {cur.a.kind === 'refuse' ? (
                  <p className="font-mono text-[11px] text-mute">out of scope, so nothing is looked up</p>
                ) : (
                  <ul className="space-y-1.5">
                    {cur.a.scored.map((c, i) => {
                      const max = Math.max(1, cur.a.scored[0].score)
                      const pick = i === 0 && cited
                      return (
                        <li key={c.id} className={`rounded-lg border px-2.5 py-1.5 transition-colors ${pick ? (hoverCite ? 'border-ink bg-ink/[0.04]' : 'border-signal/60') : 'border-rule'}`}>
                          <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                            <span className={pick ? 'text-signal' : 'text-ink-2'}>{c.cite}</span>
                            <span className="text-mute">{c.score}</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/10">
                            <motion.div className={`h-full ${pick ? 'bg-signal' : 'bg-ink/40'}`} initial={{ width: 0 }} animate={{ width: cur.stage >= 2 ? `${(c.score / max) * 100}%` : 0 }} transition={{ duration: 0.5, delay: i * 0.06 }} />
                          </div>
                          {pick && <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">{c.gist}</p>}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Step>
              <Step n={3} on={cur.stage >= 3} title="What has been said so far?">
                <div className="flex gap-1" aria-label={`${Math.min(memoryUsed, MEMORY)} of ${MEMORY} memory slots used`}>
                  {Array.from({ length: MEMORY }, (_, i) => (
                    <motion.span key={i} className="h-3 flex-1 rounded-sm" animate={{ backgroundColor: i < memoryUsed ? 'var(--signal)' : 'color-mix(in srgb, var(--ink) 10%, transparent)' }} />
                  ))}
                </div>
                <p className="mt-1 font-mono text-[11px] text-mute">{cur.a.kind === 'context' ? 'follow-up resolved from the earlier turn' : `${Math.min(memoryUsed, MEMORY)} of the last ${MEMORY} exchanges sent with the question`}</p>
              </Step>
              <Step n={4} on={cur.stage >= 4} title="Answer">
                <p className="font-mono text-[11px] text-mute">
                  {{ answer: 'plain-language answer, citing the provision', context: 'follow-up answered in context', clarify: 'asks a clarifying question first', refuse: 'politely declines and redirects' }[cur.a.kind]}
                </p>
              </Step>
            </ol>
          )}
        </div>
      </div>
    </Device>
  )
}

function Step({ n, on, title, children }) {
  return (
    <li className="grid grid-cols-[22px_1fr] gap-x-2">
      <motion.span
        className="mt-0.5 grid h-[18px] w-[18px] place-items-center rounded-full font-mono text-[10px]"
        animate={{ backgroundColor: on ? 'var(--signal)' : 'color-mix(in srgb, var(--ink) 10%, transparent)', color: on ? 'var(--signal-ink)' : 'var(--mute)' }}
      >
        {n}
      </motion.span>
      <div>
        <p className={`text-[15px] leading-tight transition-colors ${on ? 'text-ink' : 'text-mute'}`}>{title}</p>
        <AnimatePresence>
          {on && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }} className="mt-1.5 overflow-hidden">
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  )
}
