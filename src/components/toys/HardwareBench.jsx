import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Device, Seg } from '../kit'
import DATA from '../../assets/pran_recordings.json'

/*
 * Pran's hardware on a test dummy, replaying two real recordings.
 * The rig follows the capstone report and the firmware (hardware/icpfinalboss.ino): an ESP32 samples at 50 Hz
 * on a timer, reads the four BPW34 quadrant channels through LM358 TIAs and an ADS1115, the MAX30102 PPG and
 * the MPU6050, and prints one CSV row per sample.
 * Rows come from the two uploaded recordings (every 5th sample of each session's median-scoring 10 s window).
 * Every window score was computed offline with the repo's final XGBoost model and scaler
 * (hardware-vasalva-method/XGBoost) and the threshold it fixed on validation subjects.
 * Parts are drawn in a breadboard-simulator style for this page.
 */

const SESSIONS = {
  1: { label: 'head-up 30°', tilt: 30 },
  0: { label: 'supine', tilt: 0 },
  2: { label: 'head-down 10°', tilt: -10 },
  3: { label: 'Valsalva', tilt: 0 },
}
const ORDER = [0, 1, 2, 3] // order the sessions were recorded in
const TABS = {
  elevated: { file: 'elevated', csv: 'elevated.csv', who: 'subject 83 M', age: 83, start: 3, label: 'Elevated' },
  normal: { file: 'non_elevated', csv: 'non-elevated.csv', who: 'subject 19 M', age: 19, start: 0, label: 'Not elevated' },
}
const THR = DATA.threshold

const PARTS = {
  esp: { name: 'ESP32 (classic) dev board', role: 'Hardware timer at 50 Hz, I²C master, USB serial at 115200 baud', cost: 300 },
  ads: { name: 'ADS1115 16-bit ADC', role: 'Digitises the four photodiode channels at 860 SPS; the four reads take about 4.6 ms of each 20 ms sample', cost: 125 },
  tia: { name: '2 × LM358 + 1% resistors', role: 'Four transimpedance amplifiers turn each BPW34 photocurrent into a voltage, V = −I × Rf', cost: 67 },
  max: { name: 'MAX30102 PPG', role: 'Infrared and red pulse signal from the finger, an independent cardiac reference', cost: 114 },
  mpu: { name: 'MPU6050 IMU', role: 'Fixed to the headphone; flags movement artefacts and reports the tilt', cost: 173 },
  btn: { name: 'Push-button, GPIO 15', role: 'Marks the Valsalva window. In these recordings session_label numbers each session: 0 supine, 1 head-up, 2 head-down, 3 Valsalva.', cost: null },
  pwr: { name: 'LiPo, TP4056, boost and regulator', role: '3.7 V battery with charging, a 3.3 V rail for logic and 5 V for the laser. The switch stops the replay.', cost: 377 + 20 + 36 + 15 },
  head: { name: 'Optical head', role: '650 nm laser about 3 cm from the ear, with four BPW34 photodiodes around it, inside an over-ear headphone cup', cost: 31 + 80 },
}
const TOTAL = 1934
const COLS = ['timestamp_ms', 'ir_raw', 'red_raw', 'disp_raw', 'disp_x', 'disp_y', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'artifact_flag', 'session_label']

export default function HardwareBench() {
  const [tab, setTab] = useState('elevated')
  const [session, setSession] = useState(TABS.elevated.start)
  const [power, setPower] = useState(true)
  const [hot, setHot] = useState(null)
  const [rows, setRows] = useState([])
  const T = TABS[tab]
  const rec = DATA.recordings[T.file]
  const seg = rec.segments[session]
  const elevated = seg.p >= THR
  const live = useRef({})
  live.current = { seg, power }

  const spotRef = useRef(null)
  const readout = useRef(null)
  const ledRef = useRef(null)
  const trace = useRef(null)
  const rootRef = useRef(null)
  const [tilt, setTilt] = useState(0)

  const pickTab = (id) => { setTab(id); setSession(TABS[id].start) }

  // replay: rows were kept at 10 Hz (every 5th of the 50 Hz samples); the window loops
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, prev = performance.now(), acc = 0, i = 0, cur = null, tiltNow = 0, tiltShown = 0, visible = true
    const el = rootRef.current
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    if (el) io.observe(el)
    const stats = (seg) => {
      const R = seg.rows
      const mx = R.reduce((s, r) => s + r[4], 0) / R.length, my = R.reduce((s, r) => s + r[5], 0) / R.length
      const sd = Math.sqrt(R.reduce((s, r) => s + (r[4] - mx) ** 2 + (r[5] - my) ** 2, 0) / R.length) || 1
      return { mx, my, sd }
    }
    let st = null
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!visible) return
      const L = live.current
      const target = SESSIONS[L.seg.rows[0][13]]?.tilt ?? 0
      tiltNow += (target - tiltNow) * Math.min(1, dt * (reduced ? 99 : 2.2))
      if (Math.abs(tiltNow - tiltShown) > 0.05) { tiltShown = tiltNow; setTilt(tiltNow) }
      if (cur !== L.seg) { cur = L.seg; i = 0; acc = 0; st = stats(cur); setRows([]) }
      if (!L.power) return
      acc += dt
      while (acc >= 0.1) {
        acc -= 0.1
        const r = cur.rows[i % cur.rows.length]
        i++
        setRows((rs) => [...rs.slice(-7), { r, k: i }])
        // the spot follows the recorded displacement around its own mean, magnified so it is visible
        const sx = Math.max(-1, Math.min(1, (r[4] - st.mx) / (2.5 * st.sd)))
        const sy = Math.max(-1, Math.min(1, (r[5] - st.my) / (2.5 * st.sd)))
        spotRef.current?.setAttribute('cx', String(60 + sx * 26))
        spotRef.current?.setAttribute('cy', String(60 + sy * 26))
        if (readout.current) readout.current.textContent = `disp_x ${String(r[4]).padStart(6)}   disp_y ${String(r[5]).padStart(6)}   ir ${r[1]}`
        if (ledRef.current) ledRef.current.style.opacity = i % 2 ? '1' : '0.35'
        if (trace.current) {
          const R = cur.rows, n = R.length, lo = Math.min(...R.map((q) => q[1])), hi = Math.max(...R.map((q) => q[1]))
          const k = i % n
          trace.current.setAttribute('d', R.slice(0, k + 1).map((q, j) => `${j ? 'L' : 'M'}${(j / (n - 1)) * 300} ${36 - ((q[1] - lo) / (hi - lo || 1)) * 32}`).join(' '))
        }
      }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  const info = hot ? PARTS[hot] : null
  const strainKey = session === 3 && power
  const cross = session === 3 // arms folded across the chest for the Valsalva session
  const k = useEased(cross ? 1 : 0, 950)
  // [shoulder angle, elbow angle] in degrees, lying along the body vs folded onto the chest
  const near = armPose([174, 212], 62, 60, [5, -1], [-2, -160], k)
  const far = armPose([178, 207], 62, 60, [3, 0], [-6, -156], k)
  const m = SESSIONS[session]

  return (
    <div ref={rootRef}>
    <Device
      name="PRAN rig, bench test"
      sub="two real recordings, replayed on a test dummy"
      status={power ? 'live' : 'idle'}
      statusLabel={power ? 'replay' : 'off'}
      toolbar={
        <>
          <Seg label="Recording" value={tab} onChange={pickTab} options={Object.entries(TABS).map(([id, t]) => [id, t.label])} />
          <div className="overflow-x-auto"><Seg size="sm" label="Session" value={String(session)} onChange={(v) => setSession(+v)} options={ORDER.map((s) => [String(s), SESSIONS[s].label])} /></div>
          <button onClick={() => setPower((p) => !p)} aria-pressed={power} className="ml-auto rounded-full border border-ink/20 px-3 py-1.5 font-mono text-[12px] transition-colors hover:border-ink">{power ? 'pause' : 'play'}</button>
        </>
      }
      footer={
        <>
          <span>{T.who}, real CSV rows; scores from the repo’s final model</span>
          <span className="ml-auto">all parts about Rs {TOTAL.toLocaleString('en-IN')}</span>
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* the bench: tilt table, dummy, headphone sensor */}
        <div className="relative border-b border-rule lg:border-b-0 lg:border-r">
          <svg viewBox="0 -50 600 450" className="block h-auto w-full" role="img" aria-label={`Test dummy strapped to a tilt table, ${m.label}`}>
            <defs>
              {/* limb shading: lit from above, so each cylinder is lighter on top */}
              <linearGradient id="hb-limb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="0.35" stopColor="#f2c23a" /><stop offset="1" stopColor="#b98a16" /></linearGradient>
              <radialGradient id="hb-skull" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffe48a" /><stop offset="0.55" stopColor="#efbd34" /><stop offset="1" stopColor="#b98a16" /></radialGradient>
              <linearGradient id="hb-chest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe17a" /><stop offset="0.45" stopColor="#efbd34" /><stop offset="1" stopColor="#c0921c" /></linearGradient>
              <linearGradient id="hb-pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6f9fbe" /><stop offset="0.5" stopColor="#4d7f9f" /><stop offset="1" stopColor="#3a6582" /></linearGradient>
              <linearGradient id="hb-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d5d8dc" /><stop offset="0.5" stopColor="#a7abb1" /><stop offset="1" stopColor="#7d8187" /></linearGradient>
              <linearGradient id="hb-cup" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a4a52" /><stop offset="1" stopColor="#1c1c20" /></linearGradient>
              <radialGradient id="hb-floor" cx="0.5" cy="0" r="0.8"><stop offset="0" stopColor="var(--ink)" stopOpacity="0.08" /><stop offset="1" stopColor="var(--ink)" stopOpacity="0" /></radialGradient>
            </defs>
            <rect x="0" y="352" width="600" height="48" fill="url(#hb-floor)" />
            <line x1="20" y1="352" x2="580" y2="352" stroke="var(--rule-2)" />
            {/* base: H-frame on castors, a column and a lift actuator */}
            <ellipse cx="300" cy="352" rx="120" ry="5" fill="var(--ink)" opacity="0.12" />
            <rect x="200" y="330" width="200" height="10" rx="3" fill="url(#hb-steel)" />
            {[212, 388].map((x) => (
              <g key={x}>
                <rect x={x - 4} y="338" width="8" height="6" fill="#6b6f75" />
                <circle cx={x} cy="346" r="6" fill="#2b2b2f" /><circle cx={x} cy="346" r="2.2" fill="#8b8f96" />
              </g>
            ))}
            <rect x="290" y="250" width="20" height="82" rx="3" fill="url(#hb-steel)" />
            <path d="M300 300 L262 262" stroke="#5d6168" strokeWidth="6" strokeLinecap="round" />
            <path d="M300 300 L276 276" stroke="#a7abb1" strokeWidth="3.5" strokeLinecap="round" />
            <g transform={`rotate(${tilt} 300 250)`}>
              {/* table frame, side rail and footboard */}
              <rect x="66" y="240" width="468" height="14" rx="3" fill="url(#hb-steel)" />
              <rect x="66" y="244" width="468" height="2" fill="#ffffff" opacity="0.35" />
              <circle cx="300" cy="250" r="9" fill="#d5d8dc" stroke="#6b6f75" strokeWidth="2" />
              <circle cx="300" cy="250" r="3" fill="#6b6f75" />
              <rect x="524" y="176" width="10" height="72" rx="2" fill="url(#hb-steel)" />
              {/* padded mattress with stitching */}
              <rect x="72" y="224" width="454" height="18" rx="8" fill="url(#hb-pad)" />
              <path d="M80 229 H518" stroke="#ffffff" strokeOpacity="0.18" strokeDasharray="3 3" />
              {[180, 300, 420].map((x) => <line key={x} x1={x} y1="225" x2={x} y2="241" stroke="#2f5670" strokeOpacity="0.5" />)}

              {/* ── the dummy, supine, head to the left ── */}
              {/* far arm: behind the torso until its forearm lifts clear of the body */}
              <Limb from={far.S} to={far.E} w={12} shade />
              {k < 0.3 && <><Limb from={far.E} to={far.H} w={10.5} shade /><circle cx={far.H[0]} cy={far.H[1]} r="6.5" fill="#c79a1e" stroke="#7a5a10" strokeWidth="0.9" /></>}
              {/* legs */}
              <path d="M344 212 L422 208" fill="none" stroke="url(#hb-limb)" strokeWidth="23" strokeLinecap="round" />
              <path d="M422 209 L488 213" fill="none" stroke="url(#hb-limb)" strokeWidth="17" strokeLinecap="round" />
              <path d="M480 224 C478 208 480 190 487 181 C493 174 504 176 507 185 C510 196 509 212 507 224 Z" fill="url(#hb-limb)" stroke="#8a6612" strokeWidth="0.8" />
              <rect x="478" y="219" width="31" height="6" rx="2" fill="#26262a" />
              <path d="M352 203 C376 200 400 199 418 199" fill="none" stroke="#fff3c4" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
              {/* pelvis and abdomen */}
              <path d="M262 226 L262 200 C276 197 290 197 300 196 C318 195 334 190 346 196 C352 202 354 214 352 226 Z" fill="url(#hb-chest)" stroke="#8a6612" strokeWidth="0.8" />
              <path d="M300 197 V224 M322 194 V224" stroke="#8a6612" strokeOpacity="0.35" />
              {/* chest: rises on Valsalva */}
              <motion.g animate={{ scaleY: strainKey ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 110, damping: 14 }} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
                <path d="M158 226 L158 204 C160 194 172 188 190 186 C214 182 240 183 256 188 C266 191 270 198 270 206 L270 226 Z" fill="url(#hb-chest)" stroke="#8a6612" strokeWidth="0.8" />
                <path d="M190 192 C212 187 236 187 252 192 M196 199 C214 195 232 195 248 199 M200 206 C216 203 230 203 244 206" fill="none" stroke="#8a6612" strokeOpacity="0.3" />
              </motion.g>
              {/* arms in front: the far forearm once it is above the body, then the near arm */}
              {k >= 0.3 && <><Limb from={far.E} to={far.H} w={10.5} shade /><circle cx={far.H[0]} cy={far.H[1]} r="6.5" fill="#c79a1e" stroke="#7a5a10" strokeWidth="0.9" /></>}
              <Limb from={near.S} to={near.E} w={14} />
              <Limb from={near.E} to={near.H} w={12} />
              <circle cx={near.H[0]} cy={near.H[1]} r="7.5" fill="#efbd34" stroke="#8a6612" strokeWidth="0.9" />
              <Bolt x={near.S[0]} y={near.S[1]} r={5} />
              <Bolt x={near.E[0]} y={near.E[1]} r={3.8} />
              <Bolt x={344} y={212} r={5} />
              <Bolt x={422} y={209} r={4.6} />
              <Bolt x={488} y={213} r={3.4} />
              <Target x={216} y={197} r={5} />
              <Target x={384} y={209} r={5} />
              {/* neck: rubber discs between aluminium plates */}
              <rect x="134" y="200" width="28" height="20" rx="4" fill="#26262a" />
              {[139, 146, 153].map((x) => <rect key={x} x={x} y="199" width="3" height="22" rx="1" fill="#8b8f96" />)}
              {/* head: skull, brow, nose and chin in profile, facing up */}
              <path d="M110 226 C94 226 86 214 86 201 C86 189 93 181 102 178 C106 177 109 177 111 176 C113 173 115 172 117 172 C119 173 119 175 119 177 C121 178 123 178 125 179 C127 178 129 178 131 179 C135 180 138 183 140 187 C142 192 144 196 146 199 L147 213 C145 222 134 226 122 226 Z" fill="url(#hb-skull)" stroke="#8a6612" strokeWidth="0.8" />
              <path d="M103 182 C106 180 109 180 111 180" fill="none" stroke="#8a6612" strokeOpacity="0.55" />
              <path d="M126 182 C128 183 130 183 132 182" fill="none" stroke="#8a6612" strokeOpacity="0.5" />
              <ellipse cx="108" cy="184" rx="2.4" ry="1.4" fill="#7a5c10" />
              <motion.ellipse cx="130" cy="187" rx="6.5" ry="4.5" fill="#e6a91d" animate={{ opacity: strainKey ? 1 : 0, scale: strainKey ? 1 : 0.4 }} />
              {/* headphone: padded band round the crown, cup over the ear, IMU on the band */}
              <path d="M112 186 C100 176 86 182 84 196 C83 208 88 216 96 220" fill="none" stroke="#1f1f23" strokeWidth="7" strokeLinecap="round" />
              <path d="M110 184 C100 177 88 183 86 195" fill="none" stroke="#55555c" strokeWidth="1.6" strokeLinecap="round" />
              <ellipse cx="110" cy="207" rx="18" ry="17" fill="#2a2a2e" />
              <ellipse cx="110" cy="207" rx="15" ry="14" fill="url(#hb-cup)" />
              <ellipse cx="110" cy="207" rx="9" ry="8.5" fill="none" stroke="#5d5d64" strokeWidth="1" />
              <path d="M101 199 C105 196 112 195 117 198" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.4" strokeLinecap="round" />
              <motion.circle cx="110" cy="207" r="3.2" fill="#ff3b30" animate={{ opacity: power ? [0.55, 1, 0.55] : 0.1 }} transition={{ duration: 1.4, repeat: Infinity }} />
              <g transform="rotate(-40 95 182)">
                <rect x="88" y="178" width="15" height="8" rx="1.5" fill="#2a5db0" />
                <rect x="93" y="180" width="5" height="4" fill="#111" />
              </g>
              {/* straps over chest and thighs, with buckles */}
              {[[262, 190], [392, 196]].map(([x, top]) => (
                <g key={x}>
                  <path d={`M${x - 5} 244 L${x - 5} ${top} Q${x} ${top - 4} ${x + 5} ${top} L${x + 5} 244 Z`} fill="#2b2f36" opacity="0.88" />
                  <rect x={x - 6.5} y={top + 10} width="13" height="7" rx="1" fill="none" stroke="#b9bdc3" strokeWidth="1.6" />
                </g>
              ))}
            </g>
            <Cable tilt={tilt} />
            <text x="300" y="384" textAnchor="middle" className="fill-[var(--mute)] font-mono" fontSize="11">
              {m.label}{tilt ? `, IMU reads ${Math.abs(tilt).toFixed(1)}° ${tilt > 0 ? 'head-up' : 'head-down'}` : ', flat'}
            </text>
            {strainKey && <text x="150" y="140" className="fill-[var(--signal)] font-mono" fontSize="11">straining</text>}
          </svg>

          {/* close-up of the optical head */}
          <button
            onPointerEnter={(e) => e.pointerType === 'mouse' && setHot('head')}
            onClick={() => setHot((h) => (h === 'head' ? null : 'head'))}
            onFocus={() => setHot('head')}
            className={`relative mx-3 mb-3 flex max-w-[280px] items-stretch gap-2 rounded-xl border bg-paper/95 p-2 text-left shadow-lg backdrop-blur transition-colors sm:absolute sm:right-3 sm:top-3 sm:mx-0 sm:mb-0 sm:w-[52%] sm:max-w-[250px] ${hot === 'head' ? 'border-signal' : 'border-rule-2'}`}
          >
            <svg viewBox="0 0 120 120" className="block w-[46%] shrink-0">
              <defs>
                <radialGradient id="hb-spot"><stop offset="0" stopColor="#ff5a40" stopOpacity="0.95" /><stop offset="0.5" stopColor="#ff3b30" stopOpacity="0.45" /><stop offset="1" stopColor="#ff3b30" stopOpacity="0" /></radialGradient>
              </defs>
              <circle cx="60" cy="60" r="58" fill="#1e1e22" />
              <rect x="18" y="18" width="84" height="84" rx="4" fill="#2f6b3b" />
              {Array.from({ length: 49 }, (_, i) => <circle key={i} cx={24 + (i % 7) * 12} cy={24 + Math.floor(i / 7) * 12} r="1.1" fill="#c9a24a" opacity="0.6" />)}
              {[[78, 42, 'q1'], [42, 42, 'q2'], [42, 78, 'q3'], [78, 78, 'q4']].map(([x, y, l]) => (
                <g key={l}>
                  <rect x={x - 13} y={y - 13} width="26" height="26" rx="2" fill="#0f0f12" />
                  <rect x={x - 9} y={y - 9} width="18" height="18" rx="1" fill="#3b3550" />
                  <text x={x} y={y + 21} textAnchor="middle" fontSize="6" fill="#d8d4c8" fontFamily="JetBrains Mono Variable, monospace">{l}</text>
                </g>
              ))}
              <circle cx="60" cy="60" r="7.5" fill="#b8862e" stroke="#6b4c14" />
              <circle cx="60" cy="60" r="3" fill={power ? '#ff3b30' : '#4a2020'} />
              <circle ref={spotRef} cx="60" cy="60" r="11" fill="url(#hb-spot)" style={{ transition: 'cx 0.1s linear, cy 0.1s linear' }} />
            </svg>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-mute">inside the cup</p>
              <p className="mt-0.5 font-mono text-[9px] leading-tight text-ink-2">the spot follows the recorded disp_x and disp_y, magnified</p>
              <p className="mt-1 font-mono text-[10px] text-signal">laser + 4 × BPW34, Rs 111</p>
              <p className="mt-auto font-mono text-[9px] text-mute">IR pulse, this window</p>
              <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="h-8 w-full">
                <path ref={trace} d="" fill="none" stroke="var(--signal)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </button>
        </div>

        {/* the electronics, breadboard-simulator style */}
        <div className="relative">
          <Breadboard hot={hot} setHot={setHot} power={power} label={session} setPower={setPower} ledRef={ledRef} />
          {/* part details sit under the board, so they never cover a part */}
          <div className="relative min-h-[104px] border-t border-rule px-4 py-3" aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              {info ? (
                <motion.div key={hot} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.06 } }} transition={{ duration: 0.16 }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[12px] text-ink">{info.name}</p>
                    <p className="shrink-0 font-mono text-[17px] leading-none text-signal">{info.cost ? `Rs ${info.cost}` : 'not priced in the BOM'}</p>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-snug text-ink-2">{info.role}</p>
                </motion.div>
              ) : (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.05 } }} className="font-mono text-[11.5px] text-mute">
                  Tap or hover any part on the board, or the cup close-up, for its price and what it does.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* classifier */}
      <Classifier rec={rec} seg={seg} session={session} setSession={setSession} elevated={elevated} who={T.who} />

      {/* part info */}
      <div className="border-t border-rule px-4 py-2.5">
        <p ref={readout} className="overflow-hidden whitespace-pre font-mono text-[11px] text-mute"> </p>
      </div>

      {/* serial monitor */}
      <div className="border-t border-rule bg-[#111113] px-4 py-3 font-mono text-[10.5px] text-[#d8d4c8]">
        <div className="mb-1.5 flex items-center justify-between text-[#8d877c]">
          <span>serial monitor, 115200 baud, {T.csv}</span>
          <span>every 5th row of the window</span>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Serial monitor rows">
          <table className="w-full min-w-[640px] border-collapse text-right tabular-nums">
            <thead className="text-[#8d877c]"><tr>{COLS.map((h) => <th key={h} className="px-1 font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {power || rows.length ? rows.map(({ r, k }) => (
                <tr key={k} style={{ color: r[12] ? '#ff5a5a' : r[13] === 3 ? '#ff8a52' : undefined }}>
                  {r.map((v, i) => <td key={i} className="px-1">{i === 3 ? (v / 100).toFixed(2) : v}</td>)}
                </tr>
              )) : (
                <tr><td colSpan={14} className="py-3 text-center text-[#8d877c]">paused</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Device>
    </div>
  )
}

/** The verdict for the replayed window, and every window of the recording against the threshold. */
function Classifier({ rec, seg, session, setSession, elevated, who }) {
  const tl = rec.timeline
  const t0 = tl[0][0], t1 = tl[tl.length - 1][0]
  const x = (t) => ((t - t0) / (t1 - t0)) * 100
  const bands = ORDER.map((s) => {
    const ws = tl.filter((w) => w[1] === s)
    return { s, a: x(ws[0][0]), b: x(ws[ws.length - 1][0]) }
  })
  return (
    <div className="grid gap-4 border-t border-rule px-4 py-4 md:grid-cols-[230px_minmax(0,1fr)]">
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">This window</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={`${who}${session}`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`mt-1 text-[1.7rem] leading-none ${elevated ? 'text-signal' : 'text-ink'}`}
          >
            {elevated ? 'Elevated' : 'Not elevated'}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1.5 font-mono text-[11px] text-ink-2">p = {seg.p.toFixed(3)}, threshold {THR.toFixed(2)}</p>
        <div className="relative mt-2 h-2.5 rounded-full bg-ink/10">
          <motion.div className={`h-full rounded-full ${elevated ? 'bg-signal' : 'bg-ink/50'}`} animate={{ width: `${Math.max(1.5, seg.p * 100)}%` }} transition={{ type: 'spring', stiffness: 140, damping: 20 }} />
          <span className="absolute -top-1 bottom-[-4px] w-[2px] bg-ink" style={{ left: `${THR * 100}%` }} />
        </div>
        <p className="mt-2 font-mono text-[10.5px] leading-snug text-mute">{who}, {SESSIONS[session].label}: {seg.flagged_pct}% of {seg.n} windows called elevated</p>
      </div>
      <div>
        <div className="flex items-baseline justify-between font-mono text-[10.5px] text-mute">
          <span>every 10 s window of the {Math.round((t1 - t0) / 60000)}-minute recording</span>
          <span>click a session</span>
        </div>
        <div className="relative mt-1.5 h-24">
          {bands.map((b) => (
            <button
              key={b.s}
              onClick={() => setSession(b.s)}
              aria-label={`Show the ${SESSIONS[b.s].label} session`}
              className={`absolute inset-y-0 rounded transition-colors ${b.s === session ? 'bg-signal/[0.12]' : 'bg-ink/[0.03] hover:bg-ink/[0.07]'}`}
              style={{ left: `${b.a}%`, width: `${b.b - b.a}%` }}
            >
              <span className="absolute left-1 top-1 font-mono text-[9.5px] text-mute">{SESSIONS[b.s].label}</span>
            </button>
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <line x1="0" x2="100" y1={100 - THR * 80} y2={100 - THR * 80} stroke="var(--ink)" strokeDasharray="1.2 1.2" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            {tl.map(([t, s, p], i) => (
              <line key={i} x1={x(t)} x2={x(t)} y1="100" y2={100 - p * 80} stroke={p >= THR ? 'var(--signal)' : 'var(--ink)'} strokeOpacity={p >= THR ? 0.9 : 0.35} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={x(seg.t)} x2={x(seg.t)} y1="0" y2="100" stroke="var(--signal)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="pointer-events-none absolute right-1 hidden rounded bg-paper/80 px-1 font-mono text-[9.5px] text-mute sm:block" style={{ top: `${100 - THR * 80 - 14}%` }}>threshold</span>
        </div>
        <p className="mt-1.5 font-mono text-[10.5px] leading-snug text-mute">Orange bars cross the threshold. The replayed window is the session’s median-scoring one, not a hand-picked example.</p>
      </div>
    </div>
  )
}

const lerp = (a, b, t) => a + (b - a) * t
/** Shoulder at S; upper arm L1 at angle a, forearm L2 bent by f at the elbow. */
function armPose(S, L1, L2, down, up, k) {
  const r = Math.PI / 180, a = lerp(down[0], up[0], k), f = lerp(down[1], up[1], k)
  const E = [S[0] + L1 * Math.cos(a * r), S[1] + L1 * Math.sin(a * r)]
  return { S, E, H: [E[0] + L2 * Math.cos((a + f) * r), E[1] + L2 * Math.sin((a + f) * r)] }
}
/** Ease a number toward a target (cubic in-out), for poses drawn from plain geometry. */
function useEased(target, ms) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = cur.current, t0 = performance.now()
    let raf
    const step = (now) => {
      const p = reduced ? 1 : Math.min(1, (now - t0) / ms)
      cur.current = from + (target - from) * (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2)
      setV(cur.current)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
/** One limb segment: outline, body colour and a highlight along the top. */
function Limb({ from, to, w, shade = false }) {
  const d = `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`
  return (
    <g>
      <path d={d} stroke={shade ? '#7a5a10' : '#8a6612'} strokeWidth={w + 1.8} strokeLinecap="round" />
      <path d={d} stroke={shade ? '#c79a1e' : '#efbd34'} strokeWidth={w} strokeLinecap="round" />
      <path d={d} stroke="#ffe48a" strokeOpacity={shade ? 0.35 : 0.7} strokeWidth={w * 0.28} strokeLinecap="round" transform="translate(0 -2.4)" />
    </g>
  )
}

/** A joint bolt. */
function Bolt({ x, y, r = 4.5 }) {
  return (
    <g stroke="none">
      <circle cx={x} cy={y} r={r} fill="#8b8f96" />
      <circle cx={x} cy={y} r={r * 0.55} fill="#5d6168" />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.25} fill="#c9ccd1" />
    </g>
  )
}

/** Crash-test calibration target. */
function Target({ x, y, r = 6 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#111" />
      <path d={`M${x} ${y} L${x + r} ${y} A${r} ${r} 0 0 1 ${x} ${y + r} Z M${x} ${y} L${x - r} ${y} A${r} ${r} 0 0 1 ${x} ${y - r} Z`} fill="#f2c94c" />
    </g>
  )
}

/** The sensor lead: leaves the headphone cup and hangs down to the right, following the table's tilt. */
function Cable({ tilt }) {
  const a = (tilt * Math.PI) / 180
  const rot = (x, y) => [300 + (x - 300) * Math.cos(a) - (y - 250) * Math.sin(a), 250 + (x - 300) * Math.sin(a) + (y - 250) * Math.cos(a)]
  const [x0, y0] = rot(110, 224)
  const [x1, y1] = rot(110, 262)
  return <path d={`M${x0} ${y0} C${x1 - 70} ${y1 + 20} 40 330 140 349 S 480 352 600 318`} fill="none" stroke="#2b2b2f" strokeWidth="3" strokeLinecap="round" />
}

function Part({ id, hot, setHot, children, label }) {
  const on = hot === id
  // a transparent box over the whole part, so a tap between its pins still lands on it
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  useLayoutEffect(() => { try { setBox(ref.current.getBBox()) } catch { /* not rendered */ } }, [])
  return (
    <g
      ref={ref}
      tabIndex={0}
      role="button"
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHot(id)}
      onClick={() => setHot(id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setHot(id)}
      onFocus={() => setHot(id)}
      className="cursor-pointer outline-none"
      style={{ filter: on ? 'drop-shadow(0 0 4px rgba(255,106,44,0.8))' : 'none', transition: 'filter 0.2s' }}
    >
      {box && <rect x={box.x - 1} y={box.y - 1} width={box.width + 2} height={box.height + 2} fill="transparent" />}
      {children}
    </g>
  )
}

/** A jumper wire: insulated body with a highlight, and a Dupont housing at each end. */
function Wire({ d, color, ends = [] }) {
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.8 1.4)" />
      <path d={d} fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" transform="translate(-0.6 -0.7)" />
      {ends.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 2.6} y={y - 4.5} width="5.2" height="9" rx="0.8" fill="#151517" />
          <rect x={x - 1.6} y={y - 3.5} width="1.2" height="7" fill="#3a3a3e" />
        </g>
      ))}
    </g>
  )
}

function Pins({ x, y, n, step = 6.4, gold = true }) {
  return Array.from({ length: n }, (_, i) => (
    <g key={i}>
      <rect x={x + i * step - 1.9} y={y - 1.9} width="3.8" height="3.8" fill="#1a1a1a" />
      <rect x={x + i * step - 1} y={y - 1} width="2" height="2" fill={gold ? '#d4b05a' : '#b9bbbe'} />
    </g>
  ))
}

function Breadboard({ hot, setHot, power, label, setPower, ledRef }) {
  const holes = useMemo(() => {
    const out = []
    for (let c = 0; c < 30; c++) for (let r = 0; r < 10; r++) out.push([42 + c * 15.4, 166 + r * 15 + (r > 4 ? 12 : 0)])
    for (let c = 0; c < 25; c++) for (const y of [142, 150, 320, 328]) out.push([48 + c * 18 + Math.floor(c / 5) * 4, y])
    return out
  }, [])
  const W = { red: '#d63a3a', black: '#2a2a2a', green: '#2e9b4f', yellow: '#e0b52c', orange: '#e8742a', blue: '#3d7bd9', white: '#e8e6e0', grey: '#8d9096' }
  const i2c = {
    sda: 'M173.2 176 C173.2 150 271.2 156 271.2 187 C271.2 140 294 118 294 78 C300 98 410 96 424.2 63',
    scl: 'M183.8 176 C183.8 156 264.8 162 264.8 187 C264.8 136 287 116 287 78 C292 104 418 102 430.4 63',
  }
  const mono = 'JetBrains Mono Variable, monospace'
  return (
    <svg viewBox="0 0 520 430" className="block h-auto w-full" role="group" aria-label="Breadboard with the ESP32, ADS1115, LM358 amplifiers, MAX30102, MPU6050, push-button and power parts">
      <defs>
        <filter id="hb-sh" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" floodOpacity="0.35" /></filter>
        <linearGradient id="hb-can" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e3e5e8" /><stop offset="0.5" stopColor="#c3c6ca" /><stop offset="1" stopColor="#a9acb1" /></linearGradient>
        <linearGradient id="hb-bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1eee7" /><stop offset="1" stopColor="#e2ded4" /></linearGradient>
      </defs>

      {/* breadboard with rails, letters and numbers */}
      <g filter="url(#hb-sh)">
        <rect x="20" y="132" width="480" height="206" rx="8" fill="url(#hb-bb)" stroke="#cfcac0" />
      </g>
      <line x1="30" y1="137" x2="490" y2="137" stroke={W.red} strokeWidth="1" />
      <line x1="30" y1="155" x2="490" y2="155" stroke={W.blue} strokeWidth="1" />
      <line x1="30" y1="315" x2="490" y2="315" stroke={W.red} strokeWidth="1" />
      <line x1="30" y1="333" x2="490" y2="333" stroke={W.blue} strokeWidth="1" />
      <rect x="20" y="236" width="480" height="8" fill="#d6d2c7" />
      {holes.map(([x, y], i) => <rect key={i} x={x - 1.7} y={y - 1.7} width="3.4" height="3.4" rx="0.6" fill="#55524b" opacity="0.6" />)}
      {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((l, r) => <text key={l} x="30" y={168 + r * 15 + (r > 4 ? 12 : 0)} fontSize="5" fill="#9a958a" fontFamily={mono}>{l}</text>)}
      {[1, 5, 10, 15, 20, 25, 30].map((c) => <text key={c} x={42 + (c - 1) * 15.4} y="162" textAnchor="middle" fontSize="4.5" fill="#9a958a" fontFamily={mono}>{c}</text>)}

      {/* ribbon cable from the optical head: four photodiode cores and the laser supply, into a header by the amplifiers */}
      <g fill="none" strokeLinecap="round">
        {[0, 1, 2, 3, 4].map((k) => (
          <path key={k} d={`M0 ${94 + k * 2.6} C90 ${94 + k * 2.6} 200 ${104 + k * 2.6} 228 ${124 + k * 2.6} S 316 ${238 + k * 2.6} ${327 + k * 5} 296`} stroke={k === 4 ? '#d63a3a' : '#cfcfcf'} strokeWidth="2.5" />
        ))}
      </g>
      <g filter="url(#hb-sh)"><rect x="322" y="294" width="28" height="9" rx="1" fill="#151517" /></g>
      {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={325.5 + k * 5} y="297" width="2" height="3" fill="#d4b05a" />)}
      <text x="6" y="86" fontSize="7" className="fill-[var(--mute)]" fontFamily={mono}>from the optical head</text>

      {/* power jumpers to the rails */}
      <Wire d="M120 302 C120 318 128 315 138 315" color={W.red} ends={[[138, 315]]} />
      <Wire d="M152 302 C152 324 160 333 170 333" color={W.black} ends={[[170, 333]]} />
      <Wire d="M252 187 C252 168 246 152 246 137" color={W.red} ends={[[252, 187], [246, 137]]} />
      <Wire d="M258.4 187 C258.4 172 262 162 262 155" color={W.black} ends={[[262, 155]]} />
      {/* op-amp outputs into A0 to A3 */}
      {[[348, 290.4], [376.5, 296.8], [404, 303.2], [432.5, 309.6]].map(([x0, x1], i) => (
        <Wire key={i} d={`M${x0} 250 C${x0} ${214 - i * 4} ${x1} ${206 - i * 4} ${x1} 187`} color={W.orange} ends={[[x1, 187]]} />
      ))}
      {/* I²C: ESP32 GPIO 21/22 to the ADS1115, then on to the MPU6050 and the MAX30102 */}
      <Wire d={i2c.sda} color={W.green} ends={[[173.2, 176], [271.2, 187], [294, 78], [424.2, 63]]} />
      <Wire d={i2c.scl} color={W.yellow} ends={[[183.8, 176], [264.8, 187], [287, 78], [430.4, 63]]} />
      <Wire d="M454 262 C440 246 230 246 196 220" color={W.blue} ends={[[196, 220]]} />
      {power && [i2c.sda, i2c.scl].map((p, i) => (
        <circle key={i} r="3" fill="#fff" stroke={i ? W.yellow : W.green} strokeWidth="1.5">
          <animateMotion dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" path={p} />
        </circle>
      ))}

      {/* ESP32 dev board */}
      <Part id="esp" hot={hot} setHot={setHot} label="ESP32 development board">
        <g filter="url(#hb-sh)">
          <rect x="36" y="170" width="170" height="132" rx="5" fill="#1b1d20" />
        </g>
        <Pins x={46} y={176} n={15} step={10.6} />
        <Pins x={46} y={296} n={15} step={10.6} />
        <rect x="96" y="190" width="98" height="88" rx="3" fill="#2b2d31" />
        <rect x="100" y="194" width="90" height="62" rx="2" fill="url(#hb-can)" stroke="#8a8c90" strokeWidth="0.6" />
        <text x="145" y="216" textAnchor="middle" fontSize="7" fill="#4a4c50" fontFamily={mono}>ESP32-WROOM-32</text>
        <text x="145" y="226" textAnchor="middle" fontSize="5" fill="#6a6c70" fontFamily={mono}>CE  FCC ID 2AC7Z</text>
        <rect x="122" y="234" width="46" height="2" fill="#9a9ca0" />
        <path d="M102 262 h8 v-6 h8 v6 h8 v-6 h8 v6 h8 v-6 h8 v6 h8 v-6 h8" fill="none" stroke="#c9a24a" strokeWidth="1.2" />
        <rect x="24" y="222" width="22" height="26" rx="2" fill="url(#hb-can)" stroke="#7d8084" />
        <rect x="27" y="229" width="10" height="12" rx="1" fill="#2b2b2f" />
        {[[56, 190, 'EN'], [56, 262, 'BOOT']].map(([x, y, t]) => (
          <g key={t}>
            <rect x={x - 6} y={y - 6} width="12" height="12" rx="1.5" fill="#c3c6ca" />
            <circle cx={x} cy={y} r="3.4" fill="#2b2b2f" />
            <text x={x + 9} y={y + 2} fontSize="4.5" fill="#d8d4c8" fontFamily={mono}>{t}</text>
          </g>
        ))}
        <rect x="56" y="216" width="14" height="14" rx="1" fill="#0d0d0f" /><text x="63" y="236" textAnchor="middle" fontSize="3.6" fill="#9a958a" fontFamily={mono}>CP2102</text>
        <rect x="74" y="244" width="10" height="7" rx="0.8" fill="#0d0d0f" /><text x="79" y="257" textAnchor="middle" fontSize="3.6" fill="#9a958a" fontFamily={mono}>1117</text>
        <circle cx="80" cy="206" r="2.6" fill="#ff4b3a" opacity={power ? 1 : 0.2} />
        <circle ref={ledRef} cx="88" cy="206" r="2.6" fill="#4ba3ff" opacity={power ? 1 : 0.15} />
        <text x="96" y="290" fontSize="5.5" fill="#d8d4c8" fontFamily={mono}>ESP32 DEVKIT V1</text>
        {[['D21', 173.2], ['D22', 183.8]].map(([t, x]) => <text key={t} x={x} y="185" textAnchor="middle" fontSize="3.6" fill="#d8d4c8" fontFamily={mono}>{t}</text>)}
        {[['3V3', 120], ['GND', 152]].map(([t, x]) => <text key={t} x={x} y="291" textAnchor="middle" fontSize="3.6" fill="#d8d4c8" fontFamily={mono}>{t}</text>)}
      </Part>

      {/* ADS1115 breakout */}
      <Part id="ads" hot={hot} setHot={setHot} label="ADS1115 analog to digital converter">
        <g filter="url(#hb-sh)"><rect x="246" y="182" width="70" height="46" rx="3" fill="#5a3c8c" /></g>
        <Pins x={252} y={187} n={10} step={6.4} />
        <rect x="270" y="200" width="20" height="13" rx="1" fill="#141414" />
        <circle cx="272" cy="202" r="0.9" fill="#555" />
        {[[296, 202], [300, 202], [296, 210]].map(([x, y], i) => <rect key={i} x={x} y={y} width="3" height="1.8" fill="#c9a24a" />)}
        <circle cx="251" cy="222" r="2.2" fill="#f1eee7" /><circle cx="311" cy="222" r="2.2" fill="#f1eee7" />
        <text x="281" y="224" textAnchor="middle" fontSize="5.5" fill="#e9e3f5" fontFamily={mono}>ADS1115</text>
        {['VDD', 'GND', 'SCL', 'SDA', 'ADDR', 'ALRT', 'A0', 'A1', 'A2', 'A3'].map((t, i) => <text key={t} x={252 + i * 6.4} y="194.5" textAnchor="middle" fontSize="2.6" fill="#e9e3f5" fontFamily={mono}>{t}</text>)}
      </Part>

      {/* LM358 TIA stage with 1% metal-film resistors */}
      <Part id="tia" hot={hot} setHot={setHot} label="LM358 transimpedance amplifiers">
        {[344, 400].map((x) => (
          <g key={x}>
            {Array.from({ length: 4 }, (_, i) => <rect key={'a' + i} x={x + 4 + i * 9.5} y="250" width="3" height="5" fill="#b9bbbe" />)}
            {Array.from({ length: 4 }, (_, i) => <rect key={'b' + i} x={x + 4 + i * 9.5} y="281" width="3" height="5" fill="#b9bbbe" />)}
            <g filter="url(#hb-sh)"><rect x={x} y="254" width="40" height="28" rx="2" fill="#18181a" /></g>
            <path d={`M${x} 265 a3 3 0 0 1 0 6`} fill="#2e2e32" />
            <circle cx={x + 6} cy="276" r="1.4" fill="#3a3a40" />
            <text x={x + 22} y="267" textAnchor="middle" fontSize="5.8" fill="#d8d4c8" fontFamily={mono}>LM358N</text>
            <text x={x + 22} y="274" textAnchor="middle" fontSize="3.8" fill="#8d877c" fontFamily={mono}>TI 2347</text>
          </g>
        ))}
        {[350, 368, 406, 424].map((x) => (
          <g key={x}>
            <line x1={x} y1="290" x2={x} y2="312" stroke="#9a9ca0" strokeWidth="1.1" />
            <rect x={x - 3.6} y="294" width="7.2" height="14" rx="3.2" fill="#7fb3d9" />
            {['#6b3a1c', '#111', '#111', '#d63a3a', '#a8742a'].map((c, i) => <rect key={i} x={x - 3.6} y={296 + i * 2.2} width="7.2" height="1.3" fill={c} />)}
          </g>
        ))}
      </Part>

      {/* push-button on GPIO 15 */}
      <Part id="btn" hot={hot} setHot={setHot} label={`Valsalva marker button, session label ${label}`}>
        <g filter="url(#hb-sh)"><rect x="440" y="258" width="30" height="30" rx="3" fill="#2a2a2c" /></g>
        {[[440, 262], [466, 262], [440, 280], [466, 280]].map(([x, y], i) => <rect key={i} x={x - 2} y={y} width="6" height="4" fill="#b9bbbe" />)}
        <circle cx="455" cy="273" r="9" fill={label === 3 ? '#ff6a2c' : '#4b4b50'} />
        <circle cx="452" cy="270" r="3" fill="#fff" opacity="0.15" />
        <text x="455" y="300" textAnchor="middle" fontSize="7" className="fill-[var(--mute)]" fontFamily={mono}>GPIO 15</text>
        <text x="455" y="250" textAnchor="middle" fontSize="7.5" fill={label === 3 ? '#ff6a2c' : 'var(--mute)'} fontFamily={mono}>label {label}</text>
      </Part>

      {/* off-board sensors */}
      <Part id="mpu" hot={hot} setHot={setHot} label="MPU6050 motion sensor">
        <g filter="url(#hb-sh)"><rect x="268" y="38" width="60" height="46" rx="3" fill="#2a5db0" /></g>
        <rect x="288" y="48" width="20" height="20" rx="1" fill="#141414" />
        <circle cx="290" cy="50" r="0.9" fill="#555" />
        <Pins x={273} y={78} n={8} step={7} />
        <circle cx="273" cy="43" r="2.2" fill="#f1eee7" /><circle cx="323" cy="43" r="2.2" fill="#f1eee7" />
        <text x="314" y="66" fontSize="4.5" fill="#dfe8f7" fontFamily={mono}>GY-521</text>
        <text x="298" y="30" textAnchor="middle" fontSize="7" className="fill-[var(--mute)]" fontFamily={mono}>MPU6050, on the headphone</text>
      </Part>
      <Part id="max" hot={hot} setHot={setHot} label="MAX30102 pulse sensor">
        <g filter="url(#hb-sh)"><rect x="412" y="28" width="50" height="40" rx="3" fill="#4a2f7a" /></g>
        <rect x="426" y="38" width="22" height="15" rx="2" fill="#141414" />
        <rect x="429" y="41" width="7" height="9" rx="1" fill="#2a2a30" />
        <motion.circle cx="441" cy="45.5" r="2.6" fill="#ff2a2a" animate={{ opacity: power ? [0.4, 1, 0.4] : 0.1 }} transition={{ duration: 0.83, repeat: Infinity }} />
        <Pins x={418} y={63} n={7} step={6.2} />
        <text x="437" y="20" textAnchor="middle" fontSize="7" className="fill-[var(--mute)]" fontFamily={mono}>MAX30102, on the finger</text>
      </Part>

      {/* power */}
      <Part id="pwr" hot={hot} setHot={setHot} label="Battery, charger, regulators and power switch">
        <path d="M156 378 C166 378 168 376 176 376 M212 376 L224 376 M256 376 L268 376 M290 376 L310 376 M354 376 C380 376 400 340 420 333" fill="none" stroke={W.red} strokeWidth="2.4" strokeLinecap="round" />
        <g filter="url(#hb-sh)">
          <rect x="36" y="354" width="120" height="50" rx="6" fill="#a9bccf" stroke="#6f8599" />
        </g>
        <rect x="40" y="358" width="112" height="16" rx="3" fill="#8299ae" />
        <rect x="146" y="366" width="10" height="20" rx="1" fill="#e0dccf" />
        <text x="92" y="391" textAnchor="middle" fontSize="7.5" fill="#20303f" fontFamily={mono}>LiPo 3.7 V 1000 mAh</text>
        <g filter="url(#hb-sh)">
          <rect x="176" y="362" width="36" height="28" rx="2" fill="#1f5fa8" />
          <rect x="224" y="364" width="32" height="24" rx="2" fill="#1f5fa8" />
          <rect x="268" y="366" width="22" height="20" rx="2" fill="#18181a" />
        </g>
        <rect x="186" y="364" width="14" height="6" rx="1" fill="url(#hb-can)" />
        <rect x="190" y="374" width="10" height="9" rx="1" fill="#141414" />
        <circle cx="240" cy="376" r="6" fill="#2b2b2f" /><circle cx="240" cy="376" r="3.4" fill="#4a4a50" />
        <rect x="274" y="370" width="10" height="12" fill="#2b2b2f" />
        <text x="194" y="400" textAnchor="middle" fontSize="6" className="fill-[var(--mute)]" fontFamily={mono}>TP4056</text>
        <text x="240" y="400" textAnchor="middle" fontSize="6" className="fill-[var(--mute)]" fontFamily={mono}>MT3608</text>
        <text x="279" y="400" textAnchor="middle" fontSize="6" className="fill-[var(--mute)]" fontFamily={mono}>3.3 V</text>
        <g onClick={() => setPower((p) => !p)}>
          <g filter="url(#hb-sh)"><rect x="310" y="366" width="44" height="18" rx="3" fill="#2a2a2c" /></g>
          <motion.rect y="369" width="18" height="12" rx="2" fill={power ? '#ff6a2c' : '#6b6b70'} animate={{ x: power ? 333 : 313 }} />
          <text x="332" y="400" textAnchor="middle" fontSize="6.5" className="fill-[var(--mute)]" fontFamily={mono}>{power ? 'ON' : 'OFF'}</text>
        </g>
      </Part>
    </svg>
  )
}
