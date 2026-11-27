import { motion } from 'framer-motion'
import { EASE } from './kit'

// The figures at a glance: each project's headline number, one tap from its section.
const ITEMS = [
  { id: 'icp', n: '1.1', name: 'Pran', value: '0.995', what: 'AUC on 29 untouched subjects', glyph: 'pulse' },
  { id: 'finx', n: '1.2', name: 'FIN-X', value: '< 200 ms', what: 'data rendering latency', glyph: 'candles' },
  { id: 'sanchaalan', n: '1.3', name: 'Sanchaalan Saathi', value: 'live', what: 'NGO coordination platform', glyph: 'pin' },
  { id: 'lpd', n: '1.4', name: 'License-plate detection', value: '−30%', what: 'low-light false positives', glyph: 'plate' },
  { id: 'aether', n: '1.5', name: 'AETHER', value: '0.761', what: 'best ROUGE-L, greedy decoding', glyph: 'bars' },
  { id: 'nyaaya', n: '1.6', name: 'NyaayaBot', value: '1,200+', what: 'tenancy-law queries handled', glyph: 'section' },
]
const INTERN = { id: 'experience', n: '2.1', name: 'Research intern, ELC Thapar', value: '91%', what: 'multimodal Parkinson’s classification accuracy', glyph: 'tremor' }

function Glyph({ kind }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg viewBox="0 0 32 20" className="h-5 w-8 text-signal transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true">
      {kind === 'pulse' && <path {...p} d="M1 14h6l2-9 3 13 3-8 2 4h14" />}
      {kind === 'candles' && <g {...p}><path d="M5 3v14M12 6v10M19 2v12M26 7v9" /><rect x="3.2" y="6" width="3.6" height="7" rx=".6" /><rect x="10.2" y="8" width="3.6" height="5" rx=".6" /><rect x="17.2" y="4" width="3.6" height="7" rx=".6" /><rect x="24.2" y="9" width="3.6" height="5" rx=".6" /></g>}
      {kind === 'pin' && <g {...p}><path d="M16 18s-6-6-6-10a6 6 0 0 1 12 0c0 4-6 10-6 10z" /><circle cx="16" cy="8" r="2" /><path d="M2 18h8M22 18h8" /></g>}
      {kind === 'plate' && <g {...p}><rect x="3" y="4" width="26" height="12" rx="2" /><path d="M7 8v4M10 8h2v4M15 8h2l-2 4h2M21 8v4M24 8h2v4" /></g>}
      {kind === 'bars' && <g {...p}><path d="M4 18V9M10 18V4M16 18V11M22 18V7M28 18V13" /></g>}
      {kind === 'section' && <g {...p}><path d="M19 4c-2-2-7-1-6 2s7 3 7 6-4 4-6 2M13 8c-2 1-2 4 0 5" /><path d="M2 18h28" /></g>}
      {kind === 'tremor' && <path {...p} d="M1 10c2-5 3 5 5 0s3 5 5 0 3 5 5 0 3 5 5 0 3 5 5 0 3 5 4 0" />}
    </svg>
  )
}

function Card({ it, wide, i }) {
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.6 + i * 0.05 }} className={wide ? 'col-span-2 sm:col-span-3' : ''}>
      <a
        href={`#${it.id}`}
        className={`group flex h-full rounded-xl border border-rule-2 bg-paper p-3.5 transition-colors hover:border-ink focus-visible:border-ink ${wide ? 'flex-row items-center gap-4' : 'flex-col'}`}
      >
        <span className={`flex items-center justify-between gap-2 ${wide ? 'shrink-0' : ''}`}>
          <span className="font-mono text-[10.5px] text-mute">{it.n}</span>
          {!wide && <Glyph kind={it.glyph} />}
        </span>
        <span className={wide ? 'min-w-0 flex-1' : 'mt-2'}>
          <span className="block text-[15.5px] leading-tight text-ink">{it.name}</span>
          <span className="mt-2 block font-mono text-[19px] leading-none text-ink">{it.value}</span>
          <span className="mt-1 block font-mono text-[10.5px] leading-snug text-mute">{it.what}</span>
        </span>
        {wide && <Glyph kind={it.glyph} />}
      </a>
    </motion.li>
  )
}

export default function ProjectIndex() {
  return (
    <nav aria-label="Projects at a glance" className="mt-10">
      <p className="smallcaps mb-3 text-mute">At a glance</p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ITEMS.map((it, i) => <Card key={it.id} it={it} i={i} />)}
        <Card it={INTERN} wide i={ITEMS.length} />
      </ul>
    </nav>
  )
}
