import { useState } from 'react'
import { Cite, Figure, H2, H3, Num, P, Row } from './ui'
import { Btn, Seg } from './kit'
import AuditFig from './toys/AuditFig'
import FilterToy from './toys/FilterToy'
import RouterToy from './toys/RouterToy'
import AssignToy from './toys/AssignToy'
import ThresholdToy from './toys/ThresholdToy'
import MetricRank from './toys/MetricRank'
import BottleneckToy from './toys/BottleneckToy'
import RocketLeague from './toys/RocketLeague'
import { archive, competitive, education, honors, profile, refs, skills } from '../data'

const RESULTS = [
  ['Pran', 'AUC on 29 untouched test subjects', '0.995', 'chance (0.5)', 'icp'],
  ['Pran', 'Sensitivity / specificity on the same subjects', '0.957 / 0.967', 'threshold set on validation only', 'icp'],
  ['Pran', 'Same pipeline, labels shuffled within subject', '0.501', 'should be ~0.5', 'icp'],
  ['FIN-X', 'Data rendering latency', '< 200 ms', 'two-phase load', 'finx'],
  ['FIN-X', 'Active users / requests per day, month 1', '100+ / 5,000+', '—', 'finx'],
  ['FIN-X', 'API test suites', '22', '—', 'finx'],
  ['Plates', 'Throughput on 1080p video', '30+ FPS', '—', 'lpd'],
  ['Plates', 'Detection accuracy', '92%', 'custom-annotated set', 'lpd'],
  ['Plates', 'Low-light false positives', '−30%', 'one fixed threshold', 'lpd'],
  ['AETHER', 'Best ROUGE-L (greedy decoding)', '0.761', '5 other strategies', 'aether'],
  ['NyaayaBot', 'Queries handled / IPC categories', '1,200+ / 100+', '—', 'nyaaya'],
  ['Parkinson’s', 'Multimodal classification accuracy', '91%', '—', 'experience'],
  ['Parkinson’s', 'False-negative rate', '−18%', 'logistic regression', 'experience'],
  ['Parkinson’s', 'Feature-extraction time, 40,000+ samples', '−40%', 'previous pipeline', 'experience'],
]

function ResultsTable() {
  const [filter, setFilter] = useState('all')
  const groups = ['all', ...new Set(RESULTS.map((r) => r[0]))]
  const rows = RESULTS.filter((r) => filter === 'all' || r[0] === filter)
  return (
    <div className="mx-auto max-w-[1040px] px-5 md:px-8">
      <div className="mb-4 overflow-x-auto pb-1">
        <Seg size="sm" label="Filter results" value={filter} onChange={setFilter} options={groups} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="mb-2 caption-top text-left text-[15px] italic text-ink-2">
            <span className="mr-3 font-mono text-[12px] not-italic uppercase tracking-wider text-signal">Table 1</span>
            Each figure next to what it was measured against. Click a row to jump to it.
          </caption>
          <thead>
            <tr className="border-y-2 border-ink font-mono text-[11px] uppercase tracking-wider text-mute">
              <th className="py-2 pr-4 font-normal">Project</th>
              <th className="py-2 pr-4 font-normal">Measure</th>
              <th className="py-2 pr-4 text-right font-normal">Value</th>
              <th className="py-2 font-normal">Against</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([proj, m, v, base, id]) => (
              <tr
                key={proj + m}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                data-cursor="free"
                data-cursor-label="jump"
                className="group border-b border-rule transition-colors hover:bg-paper"
              >
                <td className="py-2 pr-4 align-top text-[15px] text-mute">{proj}</td>
                <td className="py-2 pr-4 text-[16px]">{m}</td>
                <td className="whitespace-nowrap py-2 pr-4 text-right font-mono text-[14px] transition-colors group-hover:text-signal">{v}</td>
                <td className="py-2 font-mono text-[11.5px] text-mute">{base}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Correspondence() {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard?.writeText(profile.email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  return (
    <Row className="mt-10">
      <div className="border-y-2 border-ink py-6">
        <p className="smallcaps text-mute">Correspondence</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <a href={`mailto:${profile.email}`} className="break-all text-[clamp(1.3rem,3.2vw,2rem)] italic hover:text-signal">
            {profile.email}
          </a>
          <Btn onClick={copy} aria-live="polite" data-cursor-label={copied ? 'copied' : 'copy address'}>
            {copied ? 'copied ✓' : 'copy'}
          </Btn>
        </div>
        <a href={`tel:${profile.phone.replace(/-/g, '')}`} className="mt-2 inline-block font-mono text-[14px] text-ink-2 hover:text-signal">
          {profile.phone}
        </a>
      </div>
    </Row>
  )
}

const code = (n, label = 'code ↗') => (
  <a className="text-signal hover:underline" href={refs[n].href} target="_blank" rel="noreferrer">{label}</a>
)

export default function Paper() {
  const lc = competitive.leetcode
  return (
    <main>
      {/* ───────────── 1 WORK ───────────── */}
      <H2 id="work" n="1">Selected work</H2>
      <P>
        Six projects. Each figure is a working model of the one idea the project depends on, and
        where I have real numbers the figure uses them. Code for all of it is on GitHub <Cite n={1} />.
      </P>

      <H3 id="icp" n="1.1" meta={<>Capstone · 2025–26 · complete<br />Team of five; I led the ML and worked on data collection<br />ESP32 · XGBoost · scikit-learn · SciPy · Flask<br />{code(5)}</>}>
        Pran: reading pressure changes through the eardrum
      </H3>
      <P>
        Intracranial pressure is normally measured with a probe through the skull. Our capstone
        asked a smaller question first: can a laser and a photodiode aimed at the eardrum see a
        pressure change at all? The rig is an ESP32 reading a quad BPW34 photodiode through an
        ADS1115, alongside a MAX30105 PPG and an MPU6050 IMU, at <Num>50 Hz</Num> <Cite n={5} />.
      </P>
      <P note={<>46,407 windows · 32 optical features<br />14 models, one protocol<br />test subjects scored once</>}>
        We recorded <Num>146</Num> volunteers lying flat, tilted head-up, tilted head-down and
        straining (the Valsalva manoeuvre). Before any modelling, <Num>29</Num> of them were set
        aside and only scored at the very end. On those subjects the top group of models
        (XGBoost, LightGBM, HistGradBoost and CatBoost, within 0.001 of each other) reached
        AUC <Num>0.995</Num>, with sensitivity <Num>0.957</Num> and specificity <Num>0.967</Num>.
      </P>
      <P>
        A number that high has to earn trust, so most of the work went into trying to break it:
        shuffled labels, held-out recording batches, early-versus-late splits and a plain linear
        baseline. The result held every time (Fig. 2), and the custom optics turned out to be
        what makes it work.
      </P>
      <Figure n={2} caption="Seven attempts to break one result, every number taken from the repository. Run them, then open any row to see what it tests. Shuffled labels and elapsed time fall to chance, exactly as they should, while unseen subjects, recording batches and a simpler model all hold the result.">
        <AuditFig />
      </Figure>
      <Figure n={3} caption="Why each window is filtered forward and then backward. A single pass removes noise but delays every peak, which corrupts timing features like the gap between P1 and P2. Running the filter again in reverse cancels the delay. Drag across the plot to move the cutoff and watch the lag.">
        <FilterToy />
      </Figure>

      <H3 id="finx" n="1.2" meta={<>2026 · live<br />FastAPI · PostgreSQL · WebSockets · React · Groq · OpenAI<br />{code(6, 'live ↗')} · {code(7)}</>}>
        FIN-X: real-time market intelligence for the NSE
      </H3>
      <P note="Spelled FIN-X, said “Phoenix”.">
        Retail investors can see institutional bulk and block deals, but rarely what they mean.
        FIN-X streams NSE data over WebSockets and explains it in plain language <Cite n={6} />. In its
        first month it had <Num>100+</Num> active users and <Num>5,000+</Num> requests a day.
        Prices load in two phases over feeds that adjust to Indian market hours, which keeps
        rendering under <Num>200 ms</Num>.
      </P>
      <P>
        Explanations come from a three-tier router: Llama-3.3-70b first, GPT-4o mini if it is
        down, and a rule engine that never is. An intent check keeps off-topic questions away
        from the models entirely. Auth uses JWT rotation, Google OAuth 2.0 and bcrypt-12, covered
        by <Num>22</Num> pytest suites <Cite n={7} />.
      </P>
      <Figure n={4} caption="The fallback chain, simplified (the production router also picks a tier by intent). Type a question, then take providers down and ask again. Something always answers, and off-topic questions never reach a model.">
        <RouterToy />
      </Figure>

      <H3 id="sanchaalan" n="1.3" meta={<>2026 · live<br />Next.js 15 · Django Channels · PostgreSQL · Neo4j · Gemini<br />{code(8, 'live ↗')}</>}>
        Sanchaalan Saathi: coordination for NGOs
      </H3>
      <P>
        NGOs running relief work coordinate through WhatsApp photos and spreadsheets. Sanchaalan
        Saathi turns a field photo into a structured task with Gemini (need, urgency, location,
        headcount), links related incidents in a Neo4j graph so a blocked road and a food
        shortage show up as one problem, assigns volunteers on skill, distance and workload, and
        checks the proof-of-completion photo before closing a task <Cite n={8} />.
      </P>
      <Figure n={5} caption="Why not just send the nearest volunteer? Nearest-first (dashed) takes the closest pair and pays for it on the rest. The Hungarian algorithm (solid, running live in your browser) minimises total distance. Drag volunteers, click empty space to add one, double-click to remove one. “Waste” is the extra distance nearest-first costs.">
        <AssignToy />
      </Figure>

      <H3 id="lpd" n="1.4" meta={<>2025<br />YOLOv8L · OpenCV · PyTorch<br />{code(10)}</>}>
        License-plate detection at night
      </H3>
      <P>
        A YOLOv8L detector and tracker for 1080p video at <Num>30+ FPS</Num> and <Num>92%</Num>{' '}
        accuracy on a custom-annotated dataset. Low light was the hard part: false detections
        climb as soon as headlights come on. Confidence thresholds that adapt to conditions, plus
        bounding-box refinement, cut low-light false positives by <Num>30%</Num> <Cite n={10} />.
      </P>
      <Figure n={6} caption="An illustrative scene, not the trained model. Slide toward night: glare gains confidence and one threshold lets it through. Penalising detections in glary regions pushes them back below the line while the plates stay. Drag the red line on the ruler to set the threshold yourself.">
        <ThresholdToy />
      </Figure>

      <H3 id="aether" n="1.5" meta={<>2026 · team of three; I built the backend and Electron shell<br />FastAPI · Transformers · faster-whisper · Electron<br />{code(11)}</>}>
        AETHER: which way of generating text is “best”?
      </H3>
      <P>
        A Windows assistant you type or speak to. It either acts (opens apps, takes notes, sets
        reminders) or writes, and when it writes it runs <Num>6</Num> decoding strategies side by
        side and scores each one, so the choice is visible instead of hidden <Cite n={11} />. On
        the evaluation prompts, greedy decoding had the best ROUGE-L (<Num>0.761</Num>) while beam
        search scored the lowest perplexity (<Num>8.82</Num>) yet matched the reference answers
        least closely.
      </P>
      <Figure n={7} caption="Real results from AETHER’s evaluation run. Rank by perplexity and beam search wins; rank by agreement with a reference answer and it comes last. The metric you choose decides which strategy ships. Top-k and beam ran on a small local model, which is part of the story.">
        <MetricRank />
      </Figure>

      <H3 id="nyaaya" n="1.6" meta={<>2025<br />Gemini API · Gradio<br />{code(9)}</>}>
        NyaayaBot: a legal assistant that cites
      </H3>
      <P>
        A Gemini-based assistant for Indian law that handled <Num>1,200+</Num> queries across{' '}
        <Num>100+</Num> IPC categories. Intent recognition keeps it on topic, multi-turn memory
        keeps the context, and a ranking step ties each answer to the legal text it came from <Cite n={9} />.
      </P>

      <Row className="mt-12">
        <p className="smallcaps mb-2 text-mute">Also on GitHub</p>
        <ul className="border-t border-rule">
          {archive.map((a) => (
            <li key={a.name} className="border-b border-rule">
              <a href={a.href} target="_blank" rel="noreferrer" className="group flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="font-mono text-[11px] text-mute">{a.year}</span>
                <span className="text-[17px] group-hover:text-signal">{a.name}</span>
                <span className="text-[15px] text-mute">— {a.what}</span>
              </a>
            </li>
          ))}
        </ul>
      </Row>

      {/* ───────────── 2 EXPERIENCE ───────────── */}
      <H2 id="experience" n="2">Research experience</H2>
      <H3 n="2.1" meta={<>Jun – Jul 2025<br />ELC, Thapar Institute<br />Competitively selected summer fellow<br />{code(12)}</>}>
        Research Intern, ML &amp; Computer Vision
      </H3>
      <P>
        Early Parkinson’s detection from two signals: voice and hand tremor. I built a multimodal
        pipeline with a CNN on voice and IMU data that reached <Num>91%</Num> classification
        accuracy, and a TensorFlow dense network for tremor that cut the false-negative rate
        by <Num>18%</Num> against a logistic-regression baseline across <Num>10,000+</Num>{' '}
        accelerometer epochs. Reworking the Pandas/NumPy feature pipeline made extraction{' '}
        <Num>40%</Num> faster over <Num>40,000+</Num> samples <Cite n={12} />.
      </P>
      <Figure n={8} caption="The speed-up, as a puzzle. Stage times here are illustrative; the 40% is the measured result. Fix stages until the bar crosses the line, for as little effort as you can. Each fix changes which stage is slowest.">
        <BottleneckToy />
      </Figure>

      {/* ───────────── 3 RESULTS ───────────── */}
      <H2 id="results" n="3">What changed, measured</H2>
      <ResultsTable />

      {/* ───────────── 4 EDUCATION ───────────── */}
      <H2 id="education" n="4">Education &amp; honours</H2>
      <Row>
        <dl>
          {education.map((e) => (
            <div key={e.title} className="grid grid-cols-[1fr_auto] gap-x-6 border-b border-rule py-3 sm:grid-cols-[120px_1fr_auto]">
              <dt className="order-3 col-span-2 font-mono text-[12px] text-mute sm:order-none sm:col-span-1 sm:pt-1">{e.period}</dt>
              <dd>
                <span className="text-[18px]">{e.title}</span>
                <span className="block text-[15px] text-mute">{e.org}</span>
              </dd>
              <dd className="font-mono text-[14px]">{e.score}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-8 space-y-3">
          {honors.map((h) => (
            <li key={h.title} className="grid grid-cols-[1fr_auto] gap-x-4">
              <span>
                <span className="italic">{h.title}</span>
                <span className="text-mute">. {h.detail}.</span>
              </span>
              <span className="font-mono text-[12px] text-mute">{h.year}</span>
            </li>
          ))}
        </ul>
      </Row>

      {/* ───────────── APPENDIX ───────────── */}
      <H2 id="appendix" n="A">Appendix: tools &amp; practice</H2>
      <Row>
        <dl className="space-y-4">
          {skills.map((g) => (
            <div key={g.group}>
              <dt className="smallcaps text-mute">{g.group}</dt>
              <dd className="text-[17px] leading-relaxed">{g.items.join(', ')}.</dd>
            </div>
          ))}
        </dl>
      </Row>
      <Row className="mt-10" note="From LeetCode and Codeforces, Nov 2026.">
        <p className="smallcaps mb-3 text-mute">Competitive programming</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <a href={lc.href} target="_blank" rel="noreferrer" className="group block rounded-xl border border-rule-2 bg-paper p-4 transition-colors hover:border-ink">
            <p className="font-mono text-[11px] text-mute">LeetCode</p>
            <p className="mt-1 text-[2.6rem] leading-none">{lc.rating}</p>
            <p className="mt-1 font-mono text-[11px] text-mute">contest rating · top {lc.top}</p>
            <div className="mt-4 flex h-2 w-full" title={`${lc.easy} easy · ${lc.medium} medium · ${lc.hard} hard`}>
              <span className="bg-ink/25" style={{ width: `${(lc.easy / lc.solved) * 100}%` }} />
              <span className="bg-ink" style={{ width: `${(lc.medium / lc.solved) * 100}%` }} />
              <span className="bg-signal" style={{ width: `${(lc.hard / lc.solved) * 100}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-ink-2">{lc.solved} solved · {lc.easy} E · {lc.medium} M · {lc.hard} H</p>
          </a>
          <a href={competitive.codeforces.href} target="_blank" rel="noreferrer" className="group block rounded-xl border border-rule-2 bg-paper p-4 transition-colors hover:border-ink">
            <p className="font-mono text-[11px] text-mute">Codeforces</p>
            <p className="mt-1 text-[2.6rem] leading-none">{competitive.codeforces.rating}</p>
            <p className="mt-1 font-mono text-[11px] text-mute">{competitive.codeforces.rank}</p>
            <div className="relative mt-4 h-2 w-full bg-ink/10">
              <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${((competitive.codeforces.rating - 800) / 1200) * 100}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-ink-2">on an 800 to 2000 scale</p>
          </a>
        </div>
      </Row>

      {/* ───────────── OFF THE CLOCK ───────────── */}
      <H2 id="off-the-clock" n="B">Off the clock</H2>
      <P>
        Outside work I play Rocket League, mostly Doubles: <Num>744</Num> ranked 2v2 matches this
        season, a peak of <Num>680</Num> MMR, and <Num>2,114</Num> lifetime wins. Saves are my
        best stat, in the top 20% of players tracked on tracker.gg.
      </P>
      <Figure n={9} caption="Snapshot from tracker.gg (Epic, PC). Switch playlists to see each rank and click any lifetime stat for the detail. The emblems are drawn for this page.">
        <RocketLeague />
      </Figure>

      {/* ───────────── REFERENCES ───────────── */}
      <H2 id="references" n="R">References &amp; correspondence</H2>
      <Row>
        <ol className="space-y-2">
          {Object.entries(refs).map(([n, r]) => (
            <li key={n} className="grid grid-cols-[40px_1fr] text-[16px] leading-snug">
              <span className="font-mono text-[13px] text-signal">[{n}]</span>
              <span>
                <a href={r.href} target="_blank" rel="noreferrer" className="italic underline decoration-rule-2 underline-offset-2 hover:text-signal">{r.label}</a>
                <span className="text-mute">. {r.text}.</span>
              </span>
            </li>
          ))}
        </ol>
      </Row>
      <Correspondence />

      <Row className="mb-16 mt-16">
        <p className="font-mono text-[11px] leading-relaxed text-mute">
          Set in Newsreader and JetBrains Mono. Built with React, Vite, Tailwind and Framer Motion.
          Figures 2 and 7 use real project data; the rest are simulations written for this page.
          © {new Date().getFullYear()} Eshaan Singla.
        </p>
      </Row>
    </main>
  )
}
