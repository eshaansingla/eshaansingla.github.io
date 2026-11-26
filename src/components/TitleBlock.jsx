import { useState } from 'react'
import { motion } from 'framer-motion'
import Monitor from './toys/Monitor'
import { Figure, Row, Num } from './ui'
import { profile } from '../data'

const EASE = [0.22, 1, 0.36, 1]

export default function TitleBlock() {
  const [mode, setMode] = useState('physio')
  const [man, setMan] = useState('supine')
  return (
    <div id="top">
      <Row className="pt-14 md:pt-20">
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          className="font-mono text-[11.5px] text-mute"
        >
          Working paper · revised 26 Nov 2026 · Patiala, IN
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          className="mt-5 text-[clamp(2.3rem,5.4vw,4.1rem)] font-normal leading-[1.03] tracking-[-0.022em] [text-wrap:balance]"
          style={{ fontVariationSettings: '"opsz" 72' }}
        >
          Making technology <em className="text-signal">perform</em>: find the bottleneck, fix it, <em>prove</em> it.
        </motion.h1>
      </Row>

      <Row
        className="mt-8"
        note={<>Received Jul 2023 (JEE Main <b className="text-ink">98.4</b> percentile).<br />Merit-1 Scholarship: rank 1, B.E. CSE.<br />Status: final year, graduating 2027.</>}
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.35 }}>
          <p className="text-[2rem] leading-tight">
            Eshaan Singla<sup className="ml-0.5 font-mono text-[0.45em] text-signal">1</sup>
          </p>
          <p className="mt-1 text-[15px] leading-snug text-mute">
            <sup className="font-mono text-signal">1</sup> B.E. Computer Science, Thapar Institute of Engineering and Technology, Patiala ·{' '}
            <a href={`mailto:${profile.email}`} className="underline decoration-rule-2 underline-offset-2 hover:text-signal">{profile.email}</a>
          </p>
        </motion.div>
      </Row>

      <Row className="mt-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}>
          <p className="prose-p">
            <span className="smallcaps mr-2 font-semibold text-ink">Abstract.</span>
            I’m a final-year computer science student at Thapar (CGPA <Num>9.00</Num>) and I like
            problems where the number has to be checked before anyone acts on it. Does an optical
            sensor pointed at the eardrum really see a pressure change? Does a market explanation
            arrive while it still matters? Does a model’s <Num>0.995</Num> survive someone trying to
            break it? Below are six projects and one internship, each with the figure I’d draw on a
            whiteboard to explain it. All of them respond to you.
          </p>
          <p className="mt-4 text-[16px] text-mute">
            <span className="smallcaps mr-2 text-ink">Keywords:</span>
            signal processing · real-time systems · applied ML · evaluation · full-stack
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href={profile.resume} download className="inline-block rounded-full bg-ink px-5 py-3 font-mono text-[12.5px] leading-none text-canvas transition-colors hover:bg-signal hover:text-signal-ink">
              Download résumé (PDF)
            </a>
            <a href="#references" className="inline-block rounded-full border border-ink/30 px-5 py-3 font-mono text-[12.5px] leading-none transition-colors hover:border-signal hover:text-signal">
              Correspondence →
            </a>
          </div>
        </motion.div>
      </Row>

      <Figure
        id="fig-1"
        n={1}
        caption={
          mode === 'physio' ? (
            <>The four postures our 146 volunteers went through: head-up 30°, supine, head-down 10° and the Valsalva manoeuvre. The simulated pulse responds in proportion to the response measured in the repository: unchanged head-up, a clear lift head-down, and the largest change on Valsalva, where P2 climbs past P1. Pick a manoeuvre (or press 1–4), hold the trace or Space for Valsalva, and click a readout for the numbers.</>
          ) : (
            <>A simulated intraday tick stream, quantised to tick size, like the feed FIN-X renders in under 200 ms. Move across it to read any sample off the cursor. Switch back to morph it into a pulse.</>
          )
        }
      >
        <Monitor mode={mode} setMode={setMode} man={man} setMan={setMan} />
      </Figure>
    </div>
  )
}
