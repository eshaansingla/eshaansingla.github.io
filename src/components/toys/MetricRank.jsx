import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device, Seg, Tween } from '../kit'

// Fig. 7, real numbers: AETHER evaluation run, 9 prompts × 6 strategies
// (aether/backend/eval_results/latest_summary.md).
const ROWS = [
  { s: 'Greedy decoding', ppl: 1539.82, bleu: 32.89, rouge: 0.761 },
  { s: 'Low-temperature sampling', ppl: 1540.28, bleu: 32.78, rouge: 0.744 },
  { s: 'Nucleus (top-p)', ppl: 1512.81, bleu: 31.42, rouge: 0.685 },
  { s: 'High-temperature sampling', ppl: 815.72, bleu: 35.08, rouge: 0.677 },
  { s: 'Top-k', ppl: 19.61, bleu: 4.14, rouge: 0.121, local: true },
  { s: 'Beam search, 5 beams', ppl: 8.82, bleu: 5.31, rouge: 0.168, local: true },
]
const M = {
  rouge: { label: 'ROUGE-L', hi: true, f: (v) => v.toFixed(3), bar: (v) => v / 0.8, note: 'overlap with a reference answer, higher is better, 7 prompts' },
  bleu: { label: 'BLEU', hi: true, f: (v) => v.toFixed(2), bar: (v) => v / 36, note: 'n-gram match with a reference, higher is better, 7 prompts' },
  ppl: { label: 'perplexity', hi: false, f: (v) => v.toFixed(2), bar: (v) => 1 - Math.log10(v) / Math.log10(2000), note: 'how unsurprising the text is to a fixed distilgpt2, lower is better, 9 prompts' },
}

export default function MetricRank() {
  const [m, setM] = useState('rouge')
  const k = M[m]
  const [open, setOpen] = useState(null)
  const rankIn = (key, r) => [...ROWS].sort((a, b) => (M[key].hi ? b[key] - a[key] : a[key] - b[key])).indexOf(r) + 1
  const sorted = [...ROWS].sort((a, b) => (k.hi ? b[m] - a[m] : a[m] - b[m]))

  return (
    <Device
      name="AETHER, eval leaderboard"
      sub="run 2026-11-17, 9 prompts × 6 strategies"
      status="live"
      statusLabel="results"
      toolbar={
        <>
          <span className="font-mono text-[12px] text-mute">rank by</span>
          <Seg label="Metric" value={m} onChange={setM} options={[['rouge', 'ROUGE-L'], ['bleu', 'BLEU'], ['ppl', 'perplexity']]} />
          <AnimatePresence mode="wait">
            <motion.span key={m} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="ml-auto max-w-[340px] text-right font-mono text-[11px] leading-snug text-mute">
              {k.note}
            </motion.span>
          </AnimatePresence>
        </>
      }
      footer={
        <>
          <span>source: aether/backend/eval_results/latest_summary.md</span>
          <span className="ml-auto">click a row for all three scores</span>
        </>
      }
    >
      <ol className="px-3 py-3 md:px-4">
        {sorted.map((r, i) => (
          <motion.li layout key={r.s} transition={{ type: 'spring', stiffness: 260, damping: 30 }} className={`rounded-xl ${i === 0 ? 'bg-signal/[0.06]' : ''}`}>
          <button
            onClick={() => setOpen(open === r.s ? null : r.s)}
            aria-expanded={open === r.s}
            data-cursor-label={open === r.s ? 'close' : 'all scores'}
            className="relative grid w-full grid-cols-[30px_minmax(0,1fr)_76px] items-center gap-x-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-ink/[0.03] md:grid-cols-[30px_230px_minmax(0,1fr)_84px]"
          >
            <span className={`font-mono text-[12px] ${i === 0 ? 'text-signal' : 'text-mute'}`}>#{i + 1}</span>
            <span className="flex items-center gap-2 text-[15.5px] leading-tight">
              {r.s}
              {r.local && <span className="rounded-full bg-ink/[0.07] px-1.5 py-0.5 font-mono text-[9.5px] text-mute">local model</span>}
              {i === 0 && (
                <motion.span layoutId="winner" className="rounded-full bg-signal px-2 py-0.5 font-mono text-[9.5px] text-signal-ink">would ship</motion.span>
              )}
            </span>
            <span className="relative col-span-3 col-start-1 mt-2 h-2.5 overflow-hidden rounded-full bg-ink/[0.06] md:col-span-1 md:col-start-auto md:mt-0">
              <motion.span
                className={`absolute inset-y-0 left-0 rounded-full ${i === 0 ? 'bg-signal' : 'bg-ink/60'}`}
                initial={false}
                animate={{ width: `${Math.max(3, Math.min(100, k.bar(r[m]) * 100))}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              />
            </span>
            <span className="col-start-3 row-start-1 text-right font-mono text-[13px] md:col-start-auto md:row-start-auto">
              <Tween value={r[m]} format={k.f} duration={0.7} />
            </span>
          </button>
          <AnimatePresence initial={false}>
            {open === r.s && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <motion.div initial="h" animate="s" transition={{ staggerChildren: 0.06 }} className="grid gap-2 px-2 pb-3 pl-[42px] sm:grid-cols-3">
                  {Object.entries(M).map(([key, mm]) => (
                    <motion.div key={key} variants={{ h: { opacity: 0, y: 6 }, s: { opacity: 1, y: 0 } }} className={`rounded-lg border p-2.5 ${key === m ? 'border-signal/50' : 'border-rule'}`}>
                      <div className="flex justify-between font-mono text-[10.5px] text-mute"><span>{mm.label}</span><span>rank {rankIn(key, r)} / 6</span></div>
                      <div className="mt-1 font-mono text-[15px]">{mm.f(r[key])}</div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                        <motion.div className={`h-full rounded-full ${key === m ? 'bg-signal' : 'bg-ink/50'}`} initial={{ width: 0 }} animate={{ width: `${Math.max(3, Math.min(100, mm.bar(r[key]) * 100))}%` }} transition={{ duration: 0.6, delay: 0.1 }} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.li>
        ))}
      </ol>
    </Device>
  )
}
