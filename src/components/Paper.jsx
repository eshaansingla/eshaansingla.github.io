import { useState } from 'react'
import { Cite, Figure, H2, H3, Num, P, Row } from './ui'
import { Btn, Seg } from './kit'
import HardwareBench from './toys/HardwareBench'
import AuditFig from './toys/AuditFig'
import Radar from './toys/Radar'
import OpsRoom from './toys/OpsRoom'
import TrafficCam from './toys/TrafficCam'
import MetricRank from './toys/MetricRank'
import LegalDesk from './toys/LegalDesk'
import BottleneckToy from './toys/BottleneckToy'
import RocketLeague from './toys/RocketLeague'
import { competitive, education, honors, profile, profileLinks, refs, skills } from '../data'

const RESULTS = [
  ['Pran', 'AUC on 29 untouched test subjects', '0.995', 'chance (0.5)', 'icp'],
  ['Pran', 'Sensitivity / specificity on the same subjects', '0.957 / 0.967', 'threshold set on validation only', 'icp'],
  ['Pran', 'Same pipeline, labels shuffled within subject', '0.501', 'should be ~0.5', 'icp'],
  ['Pran', 'Hardware cost, full parts list', 'Rs 1,934', 'Rs 5,000 budget', 'icp'],
  ['FIN-X', 'Data rendering latency', '< 200 ms', 'two-phase load', 'finx'],
  ['FIN-X', 'Active users / requests per day, month 1', '100+ / 5,000+', '', 'finx'],
  ['FIN-X', 'API test suites', '22', '', 'finx'],
  ['Plates', 'Throughput on 1080p video', '30+ FPS', '', 'lpd'],
  ['Plates', 'Detection accuracy', '92%', 'custom-annotated set', 'lpd'],
  ['Plates', 'Low-light false positives', '−30%', 'one fixed threshold', 'lpd'],
  ['AETHER', 'Best ROUGE-L (greedy decoding)', '0.761', '5 other strategies', 'aether'],
  ['NyaayaBot', 'Queries handled / IPC categories', '1,200+ / 100+', '', 'nyaaya'],
  ['Parkinson’s', 'Multimodal classification accuracy', '91%', '', 'experience'],
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
      <ul className="space-y-2 sm:hidden">
        {rows.map(([proj, m, v, base, id]) => (
          <li key={proj + m}>
            <button onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} className="w-full rounded-xl border border-rule px-3.5 py-3 text-left transition-colors active:bg-paper">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[11px] text-mute">{proj}</span>
                <span className="font-mono text-[15px] text-ink">{v}</span>
              </span>
              <span className="mt-1 block text-[15.5px] leading-snug">{m}</span>
              {base && <span className="mt-0.5 block font-mono text-[11px] text-mute">against {base}</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
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
                data-cursor
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
          <a
            href={`mailto:${profile.email}?subject=${encodeURIComponent('Hello Eshaan')}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-mono text-[12.5px] leading-none text-canvas transition-colors hover:bg-signal hover:text-signal-ink"
          >
            Mail me <span aria-hidden="true">↗</span>
          </a>
          <Btn onClick={copy} aria-live="polite">
            {copied ? 'copied ✓' : 'copy'}
          </Btn>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...profileLinks, { label: 'Résumé', handle: 'PDF', href: profile.resume, download: true }].map((l) => (
            <a
              key={l.label}
              href={l.href}
              {...(l.download ? { download: 'Eshaan_Singla_Resume.pdf' } : { target: '_blank', rel: 'noreferrer' })}
              className="group flex items-center justify-between rounded-xl border border-rule px-3.5 py-3 transition-colors hover:border-signal"
            >
              <span>
                <span className="block text-[16px] leading-tight group-hover:text-signal">{l.label}</span>
                <span className="block font-mono text-[11px] text-mute">{l.handle}</span>
              </span>
              <span className="text-mute transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-signal">{l.download ? '↓' : '↗'}</span>
            </a>
          ))}
        </div>
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

      <H3 id="icp" n="1.1" meta={<>Capstone, 2025–26, ongoing<br />Team of five; I led the ML and worked on data collection<br />ESP32, XGBoost, scikit-learn, SciPy, Flask<br />Parts about Rs 1,934, budget Rs 5,000<br />{code(5)}</>}>
        Pran: reading pressure changes through the eardrum
      </H3>
      <P>
        Intracranial pressure is normally measured with a probe through the skull. Our capstone
        asked a smaller question first: can a laser aimed at the eardrum, read by four
        photodiodes inside an over-ear headphone, see a pressure change at all? An ESP32 samples
        it with a pulse sensor and a motion sensor at <Num>50 Hz</Num> and does no processing of
        its own, so every number can be reproduced from the raw recordings <Cite n={5} />.
      </P>
      <Figure n={1} caption="The rig on a test dummy, replaying two real recordings. Elevated plays subject 83 M straining through the Valsalva manoeuvre; Not elevated plays subject 19 M lying flat. Pick any session, or click the timeline, to see the same person in another state. The rows are the actual CSV samples in the firmware’s format, the reflected spot follows the recorded displacement, and every 10 s window carries the score the repository’s final XGBoost model gave it, against the 0.54 threshold fixed on validation subjects. Both volunteers took part in the 146-subject study. Tap or hover any part for what it does and what it cost.">
        <HardwareBench />
      </Figure>
      <P note={<>46,407 windows, 32 optical features<br />14 models, one protocol<br />test subjects scored once</>}>
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

      <H3 id="finx" n="1.2" meta={<>2026, live; spelled FIN-X, said “Phoenix”<br />FastAPI, PostgreSQL, WebSockets, React, Groq, OpenAI<br />{code(6, 'live ↗')}, {code(7)}</>}>
        FIN-X: real-time market intelligence for the NSE
      </H3>
      <P>
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
      <Figure n={3} caption="The Opportunity Radar, with a simulated feed. Deals stream in; pick one and the question goes through the real routing order: an intent check, then Llama-3.3-70b, GPT-4o mini if it is down, and the rule engine if both are. Switch providers off to watch the fallback, or ask your own follow-up. The render time is measured live in your browser.">
        <Radar />
      </Figure>

      <H3 id="sanchaalan" n="1.3" meta={<>2026, live<br />Next.js 15, Django Channels, PostgreSQL, Neo4j, Gemini<br />{code(8, 'live ↗')}</>}>
        Sanchaalan Saathi: coordination for NGOs
      </H3>
      <P>
        NGOs running relief work coordinate through WhatsApp photos and spreadsheets. Sanchaalan
        Saathi turns a field photo into a structured task with Gemini (need, urgency, location,
        headcount), links related incidents in a Neo4j graph so a blocked road and a food
        shortage show up as one problem, assigns volunteers on skill, distance and workload, and
        checks the proof-of-completion photo before closing a task <Cite n={8} />.
      </P>
      <Figure n={4} caption="The operations room as a live simulation on a street map. A field report arrives, the need, headcount and area are read from it, and the incident drops onto the map. Volunteers then drive to it by road on the Hungarian assignment, re-solved whenever anything changes. A debris report closes its road until it is cleared, so routes detour round it and the river can only be crossed at the bridges. Click a road to file a report, drag the map or a volunteer, zoom in, or turn on nearest-first to see how much further it would drive.">
        <OpsRoom />
      </Figure>

      <H3 id="lpd" n="1.4" meta={<>2025<br />YOLOv8L, OpenCV, PyTorch<br />{code(10)}</>}>
        License-plate detection at night
      </H3>
      <P>
        A YOLOv8L detector and tracker for 1080p video at <Num>30+ FPS</Num> and <Num>92%</Num>{' '}
        accuracy on a custom-annotated dataset. Low light was the hard part: false detections
        climb as soon as headlights come on. Confidence thresholds that adapt to conditions, plus
        bounding-box refinement, cut low-light false positives by <Num>30%</Num> <Cite n={10} />.
      </P>
      <Figure n={5} caption="A live camera over both carriageways, illustrative rather than the trained model, with made-up plates. Cars driving away are read from the rear plate and oncoming cars from the front, and each plate the detector keeps gets a magnified crop beside it. At night headlights, tail lights and the wet road throw confident false boxes; switch to glare-aware and they drop below the line while the plates stay. Slide toward day, drag the threshold, or click any box for its score.">
        <TrafficCam />
      </Figure>

      <H3 id="aether" n="1.5" meta={<>2026, team of three; I built the backend and Electron shell<br />FastAPI, Transformers, faster-whisper, Electron<br />{code(11)}</>}>
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
      <Figure n={6} caption="Real results from AETHER’s evaluation run. Rank by perplexity and beam search wins; rank by agreement with a reference answer and it comes last. The metric you choose decides which strategy ships. Top-k and beam ran on a small local model, which is part of the story.">
        <MetricRank />
      </Figure>

      <H3 id="nyaaya" n="1.6" meta={<>2025<br />Gemini API, Gradio<br />{code(9)}</>}>
        NyaayaBot: a legal assistant that cites
      </H3>
      <P>
        A Gemini-based assistant for Indian law that handled <Num>1,200+</Num> queries across{' '}
        <Num>100+</Num> IPC categories. Intent recognition keeps it on topic, multi-turn memory
        keeps the context, and a ranking step ties each answer to the legal text it came from <Cite n={9} />.
      </P>
      <Figure n={7} caption="One question at a time, with the work behind the answer laid open: the repository’s domain keywords decide whether it is in scope, candidate provisions are scored and the best one is cited, and the last ten exchanges travel with every question so a follow-up like “what if he still refuses?” still resolves. Try an off-topic question too. The provisions are real; the answers are written for this page, where the live bot asks Gemini.">
        <LegalDesk />
      </Figure>


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
            <p className="mt-1 font-mono text-[11px] text-mute">contest rating, top {lc.top}</p>
            <div className="mt-4 flex h-2 w-full" title={`${lc.easy} easy, ${lc.medium} medium, ${lc.hard} hard`}>
              <span className="bg-ink/25" style={{ width: `${(lc.easy / lc.solved) * 100}%` }} />
              <span className="bg-ink" style={{ width: `${(lc.medium / lc.solved) * 100}%` }} />
              <span className="bg-signal" style={{ width: `${(lc.hard / lc.solved) * 100}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-ink-2">{lc.solved} solved, {lc.easy} E, {lc.medium} M, {lc.hard} H</p>
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
          © {new Date().getFullYear()} Eshaan Singla.
        </p>
      </Row>
    </main>
  )
}
