import { useEffect, useRef, useSyncExternalStore } from 'react'
import { POSES, clonePose, drawCat, easePose, makePalette } from './cat'

/*
  A ginger cat in the site's orange drops by now and then, on her own or when called, and stays a while.
  She lives on her own schedule: grooming, scratching, yawning, kneading, lying down, rolling over, dozing
  (with dreams), stretching, wandering, the odd fit of zoomies or tail-chasing, and now and then a ball of yarn.
  She watches you: head, ears, eyes and pupils follow the pointer; she sniffs it when it rests near her nose,
  bats at it with a paw when it comes in reach, rears up for it above her head, chatters at it when it darts
  about high up like a bird, and slow-blinks back if you stay still near her.
  Click her and she meows and tilts her head (the first click tames her); stroke her and she purrs.
  Miss her twice and she runs off, after letting you know what she thinks.
  She keeps to the empty margins on wide screens and only peeks in at the bottom-left corner on phones.
*/

// ---------- score: this visit, and across visits ----------
const KEY = 'cat-stats'
let tally = { tamed: 0, ran: 0, tamedAll: 0, ranAll: 0, present: false, visits: 0 }
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
  tally.tamedAll = Number(saved.tamed) || 0
  tally.ranAll = Number(saved.ran) || 0
} catch { /* storage off */ }
const subs = new Set()
const emit = () => { tally = { ...tally }; subs.forEach((f) => f()) }
const setTally = (patch) => {
  Object.assign(tally, patch)
  try { localStorage.setItem(KEY, JSON.stringify({ tamed: tally.tamedAll, ran: tally.ranAll })) } catch { /* storage off */ }
  emit()
}
export const callCat = () => dispatchEvent(new Event('cat:call'))
export function useCatTally() {
  return useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => tally, () => tally)
}

const rnd = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x) }
const COL = 1040

const MOCKS = [
  { kind: 'yawn', text: 'Missed. She yawns at you.' },
  { kind: 'groom', text: 'She licks her paw, unimpressed.' },
  { kind: 'back', text: 'She turns her back and flicks her tail.' },
]
const MEOWS = ['Meow!', 'Mrrp?', 'Meow.', 'Mrrrow!', 'Mew!']

// a kitten's "mew": high and thin, a clear tone with a little reed in it, rising then falling,
// shaped by bright vowel resonances, with a breath at the start and a tiny vibrato
let audio = null
function meowSound(pitch = 1, len = 1) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    audio = audio || new AC()
    if (audio.state === 'suspended') audio.resume()
    const ac = audio, t = ac.currentTime + 0.01, d = 0.55 * len
    const at = (k) => t + d * k
    const env = ac.createGain()
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3
    env.connect(comp); comp.connect(ac.destination)

    // the voice: mostly a pure tone, a little sawtooth for the reedy edge
    const f0 = [[0, 720], [0.14, 960], [0.34, 1180], [0.58, 1080], [0.84, 880], [1, 760]]
    const sine = ac.createOscillator(), saw = ac.createOscillator()
    sine.type = 'sine'; saw.type = 'sawtooth'
    for (const o of [sine, saw]) {
      o.frequency.setValueAtTime(f0[0][1] * pitch, t)
      for (const [k, f] of f0.slice(1)) o.frequency.linearRampToValueAtTime(f * pitch, at(k))
    }
    const vib = ac.createOscillator(), vg = ac.createGain()
    vib.frequency.value = 9
    vg.gain.setValueAtTime(3, t); vg.gain.linearRampToValueAtTime(14, at(0.9))
    vib.connect(vg); vg.connect(sine.frequency); vg.connect(saw.frequency)

    const sineG = ac.createGain(); sineG.gain.value = 0.55
    sine.connect(sineG); sineG.connect(env)
    const sawLP = ac.createBiquadFilter(); sawLP.type = 'lowpass'; sawLP.frequency.value = 5200
    const sawG = ac.createGain(); sawG.gain.value = 0.5
    saw.connect(sawLP); sawLP.connect(sawG)

    // bright, small-mouthed vowel: "m" closing into "ee" and opening to a short "ew"
    const formants = [
      [[0, 800], [0.2, 1150], [0.5, 1250], [1, 950]],
      [[0, 2100], [0.25, 2900], [0.55, 2600], [1, 2000]],
      [[0, 3800], [0.4, 4300], [1, 3700]],
    ]
    const fg = [0.9, 0.55, 0.22]
    formants.forEach((track, i) => {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [3, 6, 8][i]
      bp.frequency.setValueAtTime(track[0][1], t)
      for (const [k, f] of track.slice(1)) bp.frequency.linearRampToValueAtTime(f, at(k))
      const g = ac.createGain(); g.gain.value = fg[i]
      sawG.connect(bp); bp.connect(g); g.connect(env)
    })

    // a soft breath at the start
    const noise = ac.createBufferSource(), nb = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate)
    const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    noise.buffer = nb
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 4500; nf.Q.value = 1
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.025, at(0.08)); ng.gain.linearRampToValueAtTime(0.0001, at(0.5))
    noise.connect(nf); nf.connect(ng); ng.connect(env)

    // loudness: a quick soft start, a full middle, and a gentle trail
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.08, at(0.06))
    env.gain.exponentialRampToValueAtTime(0.26, at(0.2))
    env.gain.setValueAtTime(0.26, at(0.6))
    env.gain.exponentialRampToValueAtTime(0.08, at(0.88))
    env.gain.exponentialRampToValueAtTime(0.0001, at(1))

    for (const n of [sine, saw, vib, noise]) { n.start(t); n.stop(at(1) + 0.03) }
  } catch { /* no sound */ }
}

function heart(ctx, x, y, s) {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.35)
  ctx.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.05, x - s * 0.5, y + s * 0.3)
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.75, x, y + s)
  ctx.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3)
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.05, x, y, x, y + s * 0.35)
  ctx.fill()
}

const YARN = `<svg viewBox="-12 -12 24 24" width="100%" height="100%" style="overflow:visible;display:block">
  <circle r="10.5" fill="#8f9aa6"/>
  <g fill="none" stroke="#66727e" stroke-width="1.3" stroke-linecap="round">
    <path d="M-9 -4 C-3 -9 4 -9 9 -3"/><path d="M-10 1 C-3 -5 5 -5 10 2"/><path d="M-8 6 C-2 1 5 1 8 7"/>
    <path d="M-3 -10 C-7 -3 -6 4 -2 10"/><path d="M3 -10 C7 -2 6 5 2 10"/>
  </g>
  <circle r="10.5" fill="none" stroke="#5a6570" stroke-width="0.8"/>
</svg>`

export default function CatVisit() {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const hit = useRef(null)
  const note = useRef(null)
  const yarn = useRef(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cv = canvas.current, hb = hit.current, nt = note.current, yb = yarn.current
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    const coarse = matchMedia('(pointer: coarse)').matches
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    yb.innerHTML = YARN

    let cat = null, raf = 0, prev = 0, nextAt = performance.now() + rnd(8000, 14000), noteTimer = 0
    let px = null, py = null, pvx = 0, pvy = 0, lastMove = 0, stillSince = performance.now()
    let dark = false, palette = makePalette(), theme = { fur: '#c2410c', ink: '#121212', mute: '#6a675f' }
    let lastScrollY = scrollY, lastScrollT = performance.now(), scrollV = 0, scrollDir = 0
    let touchDown = null, missCandidate = null
    const ball = { on: false, x: 0, vx: 0, rot: 0, fade: 0 }

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement)
      const v = (n, d) => (cs.getPropertyValue(n) || d).trim()
      theme = { fur: v('--signal', '#c2410c'), ink: v('--ink', '#121212'), mute: v('--mute', '#6a675f') }
      dark = document.documentElement.classList.contains('dark')
      palette = makePalette(theme.fur)
    }

    const say = (text, ms = 2400) => {
      nt.textContent = text
      nt.style.opacity = '1'
      clearTimeout(noteTimer)
      noteTimer = setTimeout(() => { nt.style.opacity = '0' }, ms)
    }

    // where she may be: the margin beside the text column, or the bottom-left corner when there is none
    const layout = (side) => {
      const W = innerWidth, m = (W - COL) / 2
      const K = W < 640 ? 0.95 : 1.2 // CSS px per unit of her skeleton
      if (m >= 150) {
        side = side || (Math.random() < 0.5 ? -1 : 1)
        const x0 = side < 0 ? 14 + 40 * K : W - m + 14 + 40 * K
        const x1 = side < 0 ? m - 14 - 40 * K : W - 14 - 40 * K
        return { K, side, x0: Math.min(x0, x1), x1: Math.max(x0, x1), mode: 'margin', m }
      }
      const spot = m >= 90 ? m / 2 : 8 * K // on a phone she only peeks in
      return { K, side: -1, x0: spot, x1: spot, mode: 'corner', m }
    }

    const offscreen = () => (cat.L.side < 0 ? -90 * cat.L.K : innerWidth + 90 * cat.L.K)
    const go = (state, extra = {}) => Object.assign(cat, { state, st: 0, dur: 0 }, extra)
    const walkTo = (goal, then, speed = 48) => go('walk', { goal, then, speed })
    const runTo = (goal, then, speed = 210) => go('run', { goal, then, speed })
    const faceIn = () => { cat.dir = cat.L.side < 0 ? 1 : -1 }
    const faceTo = (x) => { if (Math.abs(x - cat.x) > 6) cat.dir = x > cat.x ? 1 : -1 }
    const pop = (g, n = 1, spread = 6) => {
      for (let i = 0; i < n; i++) cat.fx.push({ g, x: rnd(-spread, spread), y: 0, vy: rnd(16, 26), life: rnd(1.1, 1.6), t: 0, d: i * 0.12 })
    }
    const keep = (sec) => { if (cat) cat.leaveAt = Math.max(cat.leaveAt, cat.t + sec) } // something nice happened: she stays

    const spawn = () => {
      readTheme()
      const L = layout()
      const h = new Date().getHours()
      cat = {
        L, x: L.side < 0 ? -90 * L.K : innerWidth + 90 * L.K, dir: L.side < 0 ? 1 : -1,
        state: 'walk', st: 0, dur: 0, t: 0, goal: rnd(L.x0, L.x1), then: 'sit', speed: 46, cyc: 0,
        p: clonePose(POSES.walk), face: 0, look: [0, 0], blinkAt: 2, blinkT: 0, slowBlink: 0,
        swish: 0, swishAt: rnd(3, 6), swishT: 0, twitchAt: rnd(2, 6), twitchT: 0, earBackT: 0,
        mouth: 0, meowT: 0, meowAt: 0, tiltT: 0, tiltDir: 1, shakeT: 0, purrT: 0, petT: 0, petTotal: 0, fx: [], jump: null, lift: 0, roll: 0,
        tamed: false, misses: 0, counted: false, idleAt: rnd(3, 5), last: '', cool: {},
        leaveAt: coarse ? rnd(55, 90) : rnd(150, 260), friend: tally.tamedAll > 0, greeted: false,
        glance: null, glanceAt: 0, sleepy: h >= 22 || h < 6, wideT: 0, followUntil: 0, wiggle: false,
        paw: null, paw2: null, headPush: 0, tailHook: 0, nearSince: 0, yarnDone: false,
      }
      setTally({ present: true, visits: tally.visits + 1 })
      wrap.current.style.display = 'block'
      if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame) }
    }

    const finish = () => {
      cat = null
      ball.on = false
      yb.style.display = 'none'
      wrap.current.style.display = 'none'
      nt.style.opacity = '0'
      cancelAnimationFrame(raf); raf = 0
      nextAt = performance.now() + (coarse ? rnd(30000, 70000) : rnd(25000, 60000))
      setTally({ present: false })
    }

    const ranAway = () => {
      if (cat.counted) return
      cat.counted = true
      setTally({ ran: tally.ran + 1, ranAll: tally.ranAll + 1 })
    }

    const mock = (leave) => {
      const m = pick(MOCKS)
      if (leave) ranAway()
      go('mock', { mock: m.kind, leave })
      say(m.text, 2800)
    }

    const startle = () => {
      if (['startle', 'run', 'mock'].includes(cat.state)) return
      go('startle')
      cat.fx.push({ g: '!', x: 0, y: 0, vy: 0, life: 0.8, t: 0, d: 0, still: true })
    }

    const miss = () => {
      if (!cat || cat.tamed || ['run', 'mock', 'startle', 'hop', 'pounce'].includes(cat.state)) return
      if (cat.state === 'walk' && cat.then === 'gone') return
      cat.misses++
      if (cat.misses >= 2) { startle(); return }
      const L = cat.L
      const away = cat.x + (px != null && px > cat.x ? -1 : 1) * 50 * L.K
      cat.jump = { from: cat.x, to: clamp(away, L.x0, L.mode === 'corner' ? L.x0 + 20 * L.K : L.x1), t: 0, dur: 0.38, h: 24 * L.K, then: 'mockStay' }
      go('hop')
    }

    const meow = (text, len = 1) => {
      const c = cat
      c.meowT = 0.55 * len
      c.tiltT = 1.3; c.tiltDir = Math.random() < 0.5 ? -1 : 1
      if (c.t > c.meowAt) { meowSound(rnd(0.9, 1.15), len * rnd(0.85, 1.2)); c.meowAt = c.t + 0.7 }
      if (text) say(text, 1500)
    }
    const tame = (how) => {
      const c = cat, s = c.state
      c.tamed = true
      if (!c.counted) { c.counted = true; setTally({ tamed: tally.tamed + 1, tamedAll: tally.tamedAll + 1 }) }
      if (['sit', 'walk', 'lie', 'stroll', 'doze', 'stretch'].includes(s)) go('tamed')
      pop('heart', 4, 12)
      c.slowBlink = 0.01
      keep(120)
      const follow = fine && c.L.mode === 'margin' ? ' She will follow you for a bit.' : ' She trusts you now.'
      say((how === 'pet' ? 'Purrr. Tamed.' : 'Meow! Tamed.') + follow, 3000)
      navigator.vibrate?.(20)
    }

    // a click or tap on her: she meows and tilts her head; the first one tames her
    const tap = (dbl) => {
      if (!cat) return
      const c = cat, s = c.state
      if (['run', 'startle', 'zoom'].includes(s) || (s === 'walk' && c.then === 'gone')) return
      if (s === 'doze') { go('stretch', { next: 'sit' }); c.wideT = 0.6 }
      if (s === 'hop' || s === 'pounce') { c.lift = 0; go('sit') }
      meow()
      if (!c.tamed) { tame('click'); return }
      keep(60)
      if (dbl && ['sit', 'tamed', 'stroll', 'lie'].includes(s)) { c.jump = { from: c.x, to: c.x, t: 0, dur: 0.42, h: 26 * c.L.K, then: 'sit' }; go('hop') }
      pop('heart', 2, 10)
      say(pick(MEOWS), 1300)
    }

    // the things a cat does with her time, picked at random, never the same twice in a row
    const idle = (c, L, force) => {
      const ok = (k) => (c.cool[k] || 0) <= c.t && c.last !== k
      const acts = [
        ['groom', 12], ['scratch', 8], ['yawn', c.sleepy ? 14 : 8], ['roll', c.tamed ? 9 : 5], ['knead', c.tamed ? 10 : 3],
        ['lie', 9], ['doze', c.t > 25 ? (c.sleepy ? 14 : 7) : 0], ['glance', 16], ['thump', c.tamed ? 0 : 4],
        ['wander', L.mode === 'margin' ? 10 : 0], ['stroll', L.mode === 'margin' && fine && innerWidth > 1300 && !c.tamed ? 3 : 0],
        ['spin', L.mode === 'margin' ? 3 : 0], ['zoom', L.mode === 'margin' ? 2.5 : 0],
        ['yarn', L.mode === 'margin' && fine && !c.yarnDone && c.t > 20 ? 6 : 0],
      ].filter(([k, w]) => w > 0 && ok(k))
      let r = Math.random() * acts.reduce((a, [, w]) => a + w, 0), act = 'glance'
      for (const [k, w] of acts) if ((r -= w) < 0) { act = k; break }
      if (force) act = force
      c.last = act
      switch (act) {
        case 'groom': go('groom', { dur: rnd(2.2, 4.5) }); break
        case 'scratch': go('scratch', { dur: rnd(1.6, 2.8) }); break
        case 'yawn': go('yawn', { dur: rnd(1.6, 2.2) }); break
        case 'roll': go('roll', { dur: rnd(3.6, 6) }); c.cool.roll = c.t + 25; break
        case 'knead': go('knead', { dur: rnd(3, 6) }); break
        case 'lie': go('lie', { dur: rnd(6, 14) }); break
        case 'doze': go('doze', { dur: rnd(12, 24) }); c.cool.doze = c.t + 40; break
        case 'thump': c.thumpT = rnd(1.5, 2.5); break
        case 'wander': walkTo(rnd(L.x0, L.x1), 'sit', rnd(36, 52)); break
        case 'stroll': {
          const other = L.side < 0 ? innerWidth - L.m / 2 : L.m / 2
          go('walk', { goal: other, then: 'stroll', speed: 70 }); c.cool.stroll = c.t + 90; break
        }
        case 'spin': go('spin', { dur: rnd(1.8, 2.6) }); c.cool.spin = c.t + 45; break
        case 'zoom': go('zoom', { legs: [L.x1, L.x0, rnd(L.x0, L.x1)].sort(() => (c.x > (L.x0 + L.x1) / 2 ? 1 : -1)), leg: 0 }); c.cool.zoom = c.t + 60; break
        case 'yarn': {
          c.yarnDone = true
          ball.on = true; ball.fade = 0
          ball.x = L.side < 0 ? -30 : innerWidth + 30
          ball.vx = (L.side < 0 ? 1 : -1) * rnd(260, 360)
          go('play', { dur: rnd(14, 22) })
          say('A ball of yarn rolls in.', 2000)
          break
        }
        default:
          c.glance = [rnd(innerWidth * 0.1, innerWidth * 0.9), rnd(innerHeight * 0.1, innerHeight * 0.8)]
          c.glanceAt = rnd(1.2, 2.8)
      }
    }

    // ---------- the frame ----------
    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!cat) { raf = 0; return }
      const c = cat, L = c.L, K = L.K
      c.t += dt; c.st += dt
      const floor = innerHeight - 4
      const head = c.headAt || [c.x, floor - 50 * K]
      const speed = Math.hypot(pvx, pvy)
      const pointerLive = fine && px != null && now - lastMove < 6000
      const inZone = px != null && px > L.x0 - 40 * K && px < L.x1 + 40 * K
      // the pointer in her own frame: x forward, y up negative, in skeleton units
      const lp = px == null ? null : [((px - c.x) / K) * c.dir, (py - (floor - c.lift)) / K]
      const still = now - stillSince
      const settled = ['sit', 'lie', 'tamed'].includes(c.state)

      const move = (onArrive) => {
        const dx = c.goal - c.x
        if (Math.abs(dx) < 1.5) { c.x = c.goal; onArrive(); return }
        c.dir = dx > 0 ? 1 : -1
        // ease into and out of a walk
        const ramp = Math.min(1, c.st / 0.35, Math.abs(dx) / (30 * K) + 0.25)
        const step = Math.min(Math.abs(dx), c.speed * K * dt * ramp)
        c.x += Math.sign(dx) * step
        const run = c.state === 'run' || c.state === 'zoom'
        c.cyc += ((step / K) * (run ? 0.45 : 0.62)) / (run ? 30 : 26)
      }

      // ---------- reacting to you (only while she is settled) ----------
      if (settled && fine && pointerLive && lp && c.lift === 0) {
        const sh = c.p.sh
        const dxs = lp[0] - sh[0], dys = lp[1] - (sh[1] + 3)
        const reach = Math.hypot(dxs, dys)
        // bat at the pointer when it comes into reach
        if (lp[0] > -6 && speed > 40 && (c.cool.swat || 0) < c.t && (reach < 40 || (lp[1] < -55 && reach < 60))) {
          c.cool.swat = c.t + rnd(1.2, 2.6)
          if (lp[1] < -55) go('rear', { dur: rnd(1.1, 1.6) })
          else go('swat', { dur: 0.5, two: Math.random() < 0.3 })
        }
        // a pointer darting about high above her is a bird
        else if (py < floor - 240 && speed > 1300 && (c.cool.chatter || 0) < c.t && Math.abs(px - c.x) < 420) {
          c.cool.chatter = c.t + rnd(18, 30)
          go('chatter', { dur: rnd(1.4, 2) })
          say('ek-ek-ek', 1400)
        }
        // a pointer resting by her nose gets sniffed
        else if (Math.hypot(lp[0] - (sh[0] + c.p.head[0] + 12), lp[1] - (sh[1] + c.p.head[1])) < 26 && speed < 60 && (c.cool.sniff || 0) < c.t && c.state !== 'tamed') {
          c.cool.sniff = c.t + rnd(6, 10)
          go('sniff', { dur: rnd(1.2, 1.8) })
        }
        // stay still near her and she slow-blinks back at you
        if (still > 2500 && Math.hypot(px - c.x, py - (floor - 40 * K)) < 200 && (c.cool.blinkBack || 0) < c.t) {
          c.cool.blinkBack = c.t + 9
          c.slowBlink = 0.01
        }
      }

      // ---------- behaviour ----------
      let pose = 'sit'
      c.paw = null; c.paw2 = null
      switch (c.state) {
        case 'walk':
          pose = 'walk'
          move(() => {
            if (c.then === 'gone') { finish(); return }
            if (c.then === 'sit' && !c.tamed) faceIn()
            go(c.then)
            if (c.then === 'sit' && c.friend && !c.greeted) { c.greeted = true; meow('Mrrp! She remembers you.'); c.slowBlink = 0.01; c.tailHookT = 3 }
          })
          break
        case 'run':
          pose = 'run'
          move(() => {
            if (c.then === 'gone') { finish(); return }
            if (c.then === 'mockLeave') { faceIn(); mock(true); return }
            go(c.then)
          })
          break
        case 'sit': {
          pose = 'sit'
          if (!c.tamed) faceIn()
          else if (pointerLive) faceTo(px)
          // a pointer wriggling low near her, a little way off, is a toy
          if (fine && pointerLive && inZone && L.mode === 'margin' && py > floor - 90 * K && Math.abs(px - c.x) > 60 * K && speed > 120 && speed < 900 && (c.cool.pounce || 0) < c.t) {
            c.cool.pounce = c.t + rnd(6, 10)
            c.target = clamp(px, L.x0, L.x1)
            faceTo(c.target); go('stalk'); break
          }
          // tamed, she follows you along the floor
          if (c.tamed && fine && L.mode === 'margin' && c.t < c.followUntil && pointerLive && inZone && Math.abs(px - c.x) > 55 * K) {
            const g = clamp(px - Math.sign(px - c.x) * 30 * K, L.x0, L.x1)
            if (Math.abs(g - c.x) > 40) {
              const far = Math.abs(g - c.x) > 180
              go(far ? 'run' : 'walk', { goal: g, then: 'sit', speed: far ? 210 : 70 })
              break
            }
          }
          if (c.t > c.leaveAt) { go('stretch', { next: 'leave' }); break }
          if ((c.idleAt -= dt) <= 0) { c.idleAt = rnd(3, 7); idle(c, L) }
          break
        }
        case 'stroll':
          pose = 'sit'
          if (c.st > 2.6) walkTo(rnd(L.x0, L.x1), 'sit', 60)
          break
        case 'groom':
          pose = 'groom'
          if (c.st > c.dur) go('sit')
          break
        case 'scratch':
          pose = 'scratch'
          if (c.st > c.dur) { c.shakeT = 0.45; go('sit') }
          break
        case 'yawn': {
          pose = 'sit'
          const k = c.st / c.dur
          c.mouth = k < 0.12 ? 0 : k < 0.8 ? smooth01(Math.sin(((k - 0.12) / 0.68) * Math.PI) * 1.3) : k < 0.95 ? 0.18 : 0 // a lick of the lips at the end
          if (c.st > c.dur) { c.mouth = 0; go('sit') }
          break
        }
        case 'knead': {
          // making biscuits: front paws pressing in turn, eyes half shut, purring
          pose = 'sit'
          const ph = c.t * 5.5
          c.paw = [10, -0.5 - Math.max(0, Math.sin(ph)) * 4.5]
          c.paw2 = [8, -0.5 - Math.max(0, Math.sin(ph + Math.PI)) * 4.5]
          c.purrT = Math.max(c.purrT, 0.2)
          if (c.st > c.dur) go('sit')
          break
        }
        case 'lie':
          pose = 'lie'
          if (c.st > c.dur) go('sit')
          break
        case 'roll': {
          pose = 'lie'
          const st = c.st, d = c.dur
          c.roll = st < 0.6 ? 0 : st < 1.3 ? smooth01((st - 0.6) / 0.7) : st < d - 0.8 ? 1 : smooth01(1 - (st - (d - 0.8)) / 0.7)
          if (st > d) { c.roll = 0; go('sit') }
          break
        }
        case 'doze': {
          pose = 'loaf'
          c.zAt = (c.zAt ?? 0) - dt
          if (c.zAt <= 0) { c.zAt = rnd(1, 1.6); c.fx.push({ g: 'z', x: 4, y: 0, vy: 14, life: 2, t: 0, d: 0, drift: 1 }) }
          // dreaming: an ear flicks, a whisker twitches
          if (Math.random() < dt * 0.5) c.twitchT = 0.25
          if (c.st > c.dur) go('stretch', { next: 'sit' })
          break
        }
        case 'stretch':
          pose = 'stretch'
          c.mouth = c.st > 0.3 && c.st < 1.1 ? 0.55 * Math.sin(((c.st - 0.3) / 0.8) * Math.PI) : 0
          if (c.st > 1.7) {
            c.mouth = 0
            if (c.next === 'leave') walkTo(offscreen(), 'gone', 44)
            else go('sit')
          }
          break
        case 'swat': {
          // a quick bat at the pointer, sometimes a one-two
          pose = 'sit'
          const k = c.st / c.dur
          const reachK = Math.sin(clamp(k, 0, 1) * Math.PI)
          const sh = c.p.sh
          const tgt = lp ? [clamp(lp[0], sh[0] + 2, sh[0] + 30), clamp(lp[1], sh[1] - 18, -4)] : [sh[0] + 20, sh[1]]
          const rest = [sh[0] + 6, -2]
          c.paw = [rest[0] + (tgt[0] - rest[0]) * reachK, rest[1] + (tgt[1] - rest[1]) * reachK]
          if (c.two && k > 0.45) {
            const k2 = Math.sin(clamp((k - 0.45) / 0.55, 0, 1) * Math.PI)
            c.paw2 = [rest[0] + (tgt[0] - rest[0]) * k2, rest[1] + (tgt[1] - rest[1]) * k2]
          }
          c.wideT = 0.3
          if (c.st > c.dur * (c.two ? 1.5 : 1)) go('sit')
          break
        }
        case 'rear': {
          // up on her hind legs, batting at something above her head
          pose = 'rear'
          const sh = POSES.rear.sh
          const tgt = lp ? [clamp(lp[0], sh[0] - 2, sh[0] + 24), clamp(lp[1], sh[1] - 22, sh[1] + 6)] : [sh[0] + 14, sh[1] - 14]
          const a = Math.sin(c.st * 11), b = Math.sin(c.st * 11 + Math.PI)
          c.paw = [sh[0] + 8 + (tgt[0] - sh[0] - 8) * Math.max(0, a), sh[1] + 10 + (tgt[1] - sh[1] - 10) * Math.max(0, a)]
          c.paw2 = [sh[0] + 6 + (tgt[0] - sh[0] - 6) * Math.max(0, b), sh[1] + 12 + (tgt[1] - sh[1] - 12) * Math.max(0, b)]
          c.wideT = 0.3
          if (c.st > c.dur) go('sit')
          break
        }
        case 'chatter':
          pose = 'sit'
          c.mouth = 0.12 + Math.abs(Math.sin(c.t * 38)) * 0.22
          c.wideT = 0.3
          if (c.st > c.dur) { c.mouth = 0; go('sit') }
          break
        case 'sniff':
          pose = 'sit'
          c.headPush = 4 * Math.sin(clamp(c.st / c.dur, 0, 1) * Math.PI)
          if (c.st > c.dur) {
            c.headPush = 0
            if (c.tamed) { pop('heart', 2, 8); c.purrT = 1.4; c.tiltT = 1; c.tiltDir = 1 }
            else if (Math.random() < 0.4) go('swat', { dur: 0.45 })
            else { go('sit'); c.slowBlink = 0.01 }
            if (c.state === 'sniff') go('sit')
          }
          break
        case 'thump':
          pose = 'sit'
          break
        case 'spin': {
          // chasing her own tail
          pose = 'run'
          c.cyc += dt * 2.6
          if (Math.floor(c.st / 0.3) !== c.spinStep) { c.spinStep = Math.floor(c.st / 0.3); c.dir *= -1 }
          c.lift = Math.abs(Math.sin(c.st * 10)) * 4 * K
          if (c.st > c.dur) { c.lift = 0; faceIn(); go('sit'); c.wideT = 0.8 }
          break
        }
        case 'zoom':
          // a sudden fit of zoomies across her patch
          pose = 'run'
          c.goal = c.legs[c.leg]
          c.speed = 300
          move(() => {
            c.leg++
            if (c.leg >= c.legs.length) { faceIn(); go('sit'); c.wideT = 1.2 }
          })
          break
        case 'play': {
          // batting the yarn about and chasing it
          if (!ball.on) { go('sit'); break }
          const near = Math.abs(ball.x - c.x)
          const ahead = Math.sign(ball.x - c.x) || 1
          if (near > 34 * K) {
            pose = near > 140 ? 'run' : 'walk'
            c.goal = clamp(ball.x - ahead * 22 * K, L.x0 - 30 * K, L.x1 + 30 * K); c.speed = near > 140 ? 230 : 80
            c.state = 'play'
            const dx = c.goal - c.x
            if (Math.abs(dx) > 2) {
              c.dir = dx > 0 ? 1 : -1
              const step = Math.min(Math.abs(dx), c.speed * K * dt)
              c.x += Math.sign(dx) * step
              c.cyc += ((step / K) * (pose === 'run' ? 0.45 : 0.62)) / (pose === 'run' ? 30 : 26)
            }
          } else {
            pose = 'crouch'
            faceTo(ball.x)
            if (Math.abs(ball.vx) < 60 && (c.cool.bat || 0) < c.t) {
              c.cool.bat = c.t + rnd(0.5, 1.1)
              c.batT = 0.35
              // bat it back towards the middle of her patch, mostly
              const mid = (L.x0 + L.x1) / 2
              ball.vx = (Math.random() < 0.75 ? Math.sign(mid - ball.x) || ahead : ahead) * rnd(180, 420)
            }
          }
          if (c.batT > 0) {
            c.batT -= dt
            const k = Math.sin((1 - c.batT / 0.35) * Math.PI)
            c.paw = [18 + 12 * k, -2 - 6 * k]
            pose = 'sit'
          }
          if (c.st > c.dur) { faceIn(); go('sit') }
          break
        }
        case 'stalk':
          pose = 'crouch'
          c.wiggle = c.st > 0.35
          if (pointerLive) c.target = clamp(px, L.x0, L.x1)
          if (c.st > 1.1) {
            c.wiggle = false
            faceTo(c.target)
            c.jump = { from: c.x, to: c.target, t: 0, dur: clamp(Math.abs(c.target - c.x) / 420, 0.32, 0.6), h: 34 * K, then: 'sit' }
            go('pounce')
          }
          break
        case 'pounce':
        case 'hop': {
          pose = 'jump'
          const j = c.jump
          j.t += dt
          const k = clamp(j.t / j.dur, 0, 1)
          if (j.to !== j.from) c.dir = j.to > j.from ? 1 : -1
          c.x = j.from + (j.to - j.from) * smooth01(k)
          c.lift = Math.sin(Math.PI * k) * j.h
          if (k >= 1) {
            c.lift = 0
            if (j.then === 'mockStay') { faceIn(); const m = pick(MOCKS); go('mock', { mock: m.kind, leave: false }); say(m.text, 2600) }
            else go('sit')
          }
          break
        }
        case 'startle':
          pose = 'puff'
          c.earBackT = 0.5
          if (c.st > 0.45) {
            ranAway()
            if (L.mode === 'margin') {
              const far = Math.abs(L.x0 - c.x) > Math.abs(L.x1 - c.x) ? L.x0 : L.x1
              runTo(far, 'mockLeave')
            } else { runTo(offscreen(), 'gone'); say('She bolts.', 2000) }
          }
          break
        case 'mock': {
          const k = c.mock
          pose = k === 'groom' ? 'groom' : 'sit'
          if (k === 'back') c.dir = L.side < 0 ? -1 : 1
          if (k === 'yawn') c.mouth = c.st > 0.3 && c.st < 1.6 ? Math.sin(((c.st - 0.3) / 1.3) * Math.PI) : 0
          if (c.st > 2.8) {
            c.mouth = 0
            if (c.leave) walkTo(offscreen(), 'gone', 52)
            else { faceIn(); go('sit'); c.leaveAt = Math.max(c.leaveAt, c.t + rnd(30, 45)) }
          }
          break
        }
        case 'tamed':
          pose = 'sit'
          c.tailHookT = 3
          if (c.st > 2.4) { c.followUntil = c.t + (fine && L.mode === 'margin' ? 25 : 0); go('sit') }
          break
        default:
          break
      }
      if (!cat) return
      if (c.state !== 'roll' && c.roll > 0) c.roll = Math.max(0, c.roll - dt * 2.5)
      if (!['yawn', 'stretch', 'mock', 'chatter'].includes(c.state) && c.mouth > 0) c.mouth = Math.max(0, c.mouth - dt * 3)
      if (c.state !== 'sniff') c.headPush = Math.max(0, c.headPush - dt * 10)

      // ---------- small life ----------
      if ((c.blinkAt -= dt) <= 0) { c.blinkAt = rnd(2.2, 5.5); c.blinkT = 0.16; if (Math.random() < 0.2) c.blinkAt = 0.3 } // sometimes a double blink
      let blink = 0
      if (c.blinkT > 0) { c.blinkT -= dt; blink = Math.sin((1 - c.blinkT / 0.16) * Math.PI) }
      if (c.slowBlink > 0) {
        // the slow blink: a cat's way of saying she trusts you
        c.slowBlink += dt
        const sb = c.slowBlink
        blink = sb < 0.5 ? smooth01(sb / 0.5) : sb < 1.2 ? 1 : sb < 1.7 ? 1 - smooth01((sb - 1.2) / 0.5) : 0
        if (sb >= 1.7) c.slowBlink = 0
      }
      if (c.purrT > 0 || c.state === 'knead') blink = Math.max(blink, 0.6) // contented, half-closed eyes
      if ((c.swishAt -= dt) <= 0) { c.swishAt = rnd(3.5, 8); c.swishT = rnd(0.9, 1.8) }
      if (c.swishT > 0) c.swishT -= dt
      if (c.thumpT > 0) c.thumpT -= dt
      const busyTail = c.swishT > 0 || c.state === 'stalk' || c.state === 'play' || (c.state === 'mock' && c.mock === 'back')
      c.swish += ((busyTail ? 0.45 : 0.05) - c.swish) * Math.min(1, dt * 4)
      c.tailHookT = Math.max(0, (c.tailHookT || 0) - dt)
      c.tailHook += (((c.tailHookT > 0 || (c.tamed && c.purrT > 0)) && pose === 'sit' ? 1 : 0) - c.tailHook) * Math.min(1, dt * 4)
      if ((c.twitchAt -= dt) <= 0) { c.twitchAt = rnd(2.5, 7); c.twitchT = 0.25 }
      c.twitchT -= dt
      if (scrollV > 2500 && settled) { c.wideT = 0.6; c.earBackT = 0.6 }
      c.earBackT = Math.max(0, c.earBackT - dt)
      c.wideT = Math.max(0, c.wideT - dt)
      c.meowT = Math.max(0, c.meowT - dt)
      c.tiltT = Math.max(0, c.tiltT - dt)
      c.shakeT = Math.max(0, c.shakeT - dt)

      // petting: a slow pointer stroking her, or a finger dragged across her
      const strokingMouse = fine && px != null && onCatBox(px, py) && speed > 25 && speed < 900
      const strokingTouch = touchDown && touchDown.moved > 12 && touchDown.onCat
      if ((strokingMouse || strokingTouch) && !['run', 'startle', 'zoom', 'spin'].includes(c.state)) {
        c.petT += dt
        c.petTotal += dt
        if (!c.tamed && c.petTotal > 1.2 && !['mock'].includes(c.state)) tame('pet')
        else if (c.purrT <= 0) say('Purrr...', 1600)
        c.purrT = 0.9
        keep(30)
        if (c.petT > 0.55) { c.petT = 0; pop('heart', 1, 8) }
      }
      c.purrT = Math.max(0, c.purrT - dt)

      // eyes, ears and head: on the pointer if there is one, otherwise glancing about (or at the page as it scrolls)
      let tx = null, ty = null
      if (c.state === 'play' && ball.on) { tx = ball.x; ty = floor - 8 }
      else if (pointerLive) { tx = px; ty = py }
      else if (scrollV > 400) { tx = innerWidth / 2; ty = scrollDir > 0 ? 0 : innerHeight }
      else if (c.glance && (c.glanceAt -= dt) > 0) { [tx, ty] = c.glance }
      else if (!fine) { tx = innerWidth / 2; ty = innerHeight * 0.4 }
      const lk = tx != null ? [clamp((tx - head[0]) / 180, -1, 1), clamp((ty - head[1]) / 180, -1, 1)] : [0, 0]
      c.look[0] += (lk[0] - c.look[0]) * Math.min(1, dt * 10)
      c.look[1] += (lk[1] * 0.85 - c.look[1]) * Math.min(1, dt * 10)

      // ---------- pose ----------
      const base = {
        walk: POSES.walk, run: POSES.run, jump: POSES.run, sit: POSES.sit, groom: POSES.sit, scratch: POSES.sit,
        loaf: POSES.loaf, stretch: POSES.stretch, crouch: POSES.crouch, lie: POSES.lie, rear: POSES.rear,
        puff: { ...POSES.walk, gait: 0, ear: 1, tail: [1.6, 0.0, 0.02], hip: [-20, -32], sh: [19, -33] },
      }[pose] || POSES.sit
      const target = {
        ...base,
        mouth: Math.max(c.mouth, c.meowT > 0 ? Math.sin(clamp(c.meowT / 0.55, 0, 1) * Math.PI) * 0.5 : 0),
        eye: pose === 'loaf' ? 0 : pose === 'stretch' ? 0.25 : pose === 'groom' ? 0.3 : 1,
      }
      if (c.earBackT > 0) target.ear = 0.9
      if (pose === 'crouch' && c.wiggle) target.hip = [base.hip[0] + Math.sin(c.t * 22) * 1.6, base.hip[1]]
      if (pose === 'groom') target.tilt = 0.45 + Math.sin(c.t * 9) * 0.06
      if (pose === 'scratch') target.tilt = 0.32
      if (c.thumpT > 0 && pose === 'sit') target.tail = [base.tail[0], base.tail[1], 0.22] // bored: the tail tip thumps
      if (pose === 'lie' && c.roll > 0.9) {
        const w = (k) => Math.sin(c.t * 7 + k) * 3 // paws paddling in the air
        target.feet = { lf: [21 + w(0), -2 + w(1)], rf: [18 + w(2), -1 + w(3)], lh: [-6 + w(4), -2 + w(5)], rh: [-9 + w(6), -1 + w(7)] }
      }
      const fast = ['jump', 'puff', 'rear'].includes(pose) || ['swat'].includes(c.state)
      easePose(c.p, target, fast ? Math.min(1, dt * 14) : 1 - Math.exp(-dt / 0.22))
      const faceWant = (['sit', 'loaf', 'lie', 'scratch', 'rear'].includes(pose) && !(c.state === 'mock' && c.mock === 'back') && c.state !== 'play') || c.meowT > 0 ? 1 : 0
      c.face += (faceWant - c.face) * Math.min(1, dt * 5)
      const tiltClick = c.tiltT > 0 ? Math.sin(Math.min(1, (1.3 - c.tiltT) / 0.25) * Math.PI * 0.5) * 0.3 * c.tiltDir * Math.min(1, c.tiltT / 0.3) : 0
      const tiltLook = c.face > 0.5 ? c.look[0] * c.dir * 0.08 : 0
      const shake = c.shakeT > 0 ? Math.sin(c.shakeT * 70) * 0.18 * (c.shakeT / 0.45) : 0

      // ---------- draw ----------
      const dpr = Math.min(2, devicePixelRatio || 1)
      const CW = 240 * K, CH = 160 * K
      if (cv.width !== Math.round(CW * dpr)) {
        cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr)
        cv.style.width = `${CW}px`; cv.style.height = `${CH}px`
      }
      const ox = 120 * K, oy = 150 * K // her ground point inside the canvas, CSS px
      const lift = c.lift || 0
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.setTransform(dpr * K * c.dir, 0, 0, dpr * K, dpr * ox, dpr * (oy - lift))
      if (c.roll > 0) {
        // rolling over: turn the whole cat about the middle of her body
        const a = c.roll * Math.PI
        ctx.translate(0, -12.5); ctx.rotate(-a); ctx.translate(0, 12.5 - Math.sin(a) * 4)
      }
      const scratchAt = pose === 'scratch' ? [POSES.sit.sh[0] + 2, POSES.sit.sh[1] - 12 + Math.sin(c.t * 34) * 2.2] : null
      const groomAt = pose === 'groom' ? [POSES.sit.sh[0] + 13 + Math.sin(c.t * 9) * 1.5, POSES.sit.sh[1] - 4] : null
      const box = drawCat(ctx, {
        pose: c.p, cyc: pose === 'jump' ? 0.3 : c.cyc, gaitKind: pose === 'run' || pose === 'jump' ? 'run' : 'walk', t: c.t,
        palette, dark, dir: c.dir, face: c.face, look: c.look, blink,
        pupil: c.wideT > 0 || pose === 'crouch' ? 0.95 : c.purrT > 0 ? 0.35 : 0.5,
        breath: ['sit', 'loaf', 'lie', 'scratch', 'groom'].includes(pose) ? (pose === 'loaf' ? 1.6 : 0.8) : 0, purr: c.purrT > 0,
        groom: groomAt || c.paw, paw2: c.paw2, scratch: scratchAt, swish: c.swish, flick: c.state === 'mock' && c.mock === 'back',
        earTwitch: c.twitchT > 0, earLook: c.face > 0.5 ? c.look[0] * 0.8 : 0, headTilt: tiltClick + tiltLook + shake,
        headPush: c.headPush, tailHook: c.tailHook,
      })

      // hearts, z's and marks, the right way round above her head
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const hx = ox + (box.head ? box.head[0] : 10) * K * c.dir
      const hy = oy + (box.head ? box.head[1] : -50) * K - lift
      c.headAt = [c.x - ox + hx, floor - oy + hy]
      c.fx = c.fx.filter((f) => {
        if (f.d > 0) { f.d -= dt; return true }
        f.t += dt
        if (!f.still) f.y += f.vy * dt
        const k = f.t / f.life
        if (k >= 1) return false
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
        const x = hx + f.x * K + (f.drift ? Math.sin(f.t * 3) * 5 : 0), y = hy - 22 * K - f.y
        if (f.g === 'heart') { ctx.fillStyle = theme.fur; heart(ctx, x, y - 8, 9 + k * 3) }
        else {
          ctx.fillStyle = f.g === 'z' ? theme.mute : theme.ink
          ctx.font = f.g === 'z' ? `italic ${12 + k * 6}px Newsreader Variable, Georgia, serif` : 'bold 15px JetBrains Mono Variable, monospace'
          ctx.fillText(f.g, x, y)
        }
        ctx.globalAlpha = 1
        return true
      })

      cv.style.transform = `translate3d(${c.x - ox}px, ${floor - oy}px, 0)`

      // the yarn: rolls, slows, bounces off the edges of her patch
      if (ball.on) {
        ball.fade = Math.min(1, ball.fade + dt * 3)
        ball.x += ball.vx * dt
        ball.vx *= Math.exp(-dt * 1.3)
        if (Math.abs(ball.vx) < 4) ball.vx = 0
        const lo = L.x0 - 30 * K, hi = L.x1 + 30 * K
        if (ball.x < lo && ball.vx < 0 && ball.fade > 0.9) { ball.x = lo; ball.vx *= -0.55 }
        if (ball.x > hi && ball.vx > 0 && ball.fade > 0.9) { ball.x = hi; ball.vx *= -0.55 }
        const r = 7 * K
        ball.rot += (ball.vx * dt) / r
        yb.style.display = 'block'
        yb.style.width = yb.style.height = `${r * 2}px`
        yb.style.opacity = String(ball.fade)
        yb.style.transform = `translate3d(${ball.x - r}px, ${floor - r * 2}px, 0) rotate(${ball.rot}rad)`
      }

      // the part you can click or stroke: her body and head
      const bx0 = c.x + (c.dir > 0 ? box.x0 : -box.x1) * K, bx1 = c.x + (c.dir > 0 ? box.x1 : -box.x0) * K
      const w = Math.max(48, bx1 - bx0 + 8), hh = Math.max(48, (box.y1 - box.y0) * K + 8)
      c.hit = [clamp((bx0 + bx1) / 2 - w / 2, 0, innerWidth - w), floor - hh - lift + 2, w, hh]
      hb.style.transform = `translate3d(${c.hit[0]}px, ${c.hit[1]}px, 0)`
      hb.style.width = `${w}px`; hb.style.height = `${hh}px`
      hb.style.pointerEvents = ['run', 'startle', 'zoom'].includes(c.state) || (c.state === 'walk' && c.then === 'gone') ? 'none' : 'auto'

      const nw = nt.offsetWidth
      nt.style.transform = `translate3d(${clamp(c.x - nw / 2, 8, innerWidth - nw - 8)}px, ${floor - 112 * K - lift}px, 0)`

      raf = requestAnimationFrame(frame)
    }

    // ---------- input ----------
    function onCatBox(x, y) {
      const h = cat?.hit
      return !!h && x >= h[0] && x <= h[0] + h[2] && y >= h[1] && y <= h[1] + h[3]
    }
    // is this point on her, to within a finger's width?
    function onCat(x, y) {
      if (!cat) return false
      const r = cv.getBoundingClientRect()
      const dpr = cv.width / r.width
      const tol = Math.round((coarse ? 14 : 8) * dpr)
      const cx = Math.round((x - r.left) * dpr), cy = Math.round((y - r.top) * dpr)
      const x0 = clamp(cx - tol, 0, cv.width - 1), y0 = clamp(cy - tol, 0, cv.height - 1)
      const w = clamp(cx + tol, 0, cv.width) - x0, h = clamp(cy + tol, 0, cv.height) - y0
      if (w <= 0 || h <= 0) return false
      const d = ctx.getImageData(x0, y0, w, h).data
      for (let i = 3; i < d.length; i += 16) if (d[i] > 60) return true
      return false
    }

    const trail = []
    const onMove = (e) => {
      if (touchDown && e.pointerId === touchDown.id) {
        touchDown.moved += Math.hypot(e.clientX - touchDown.x, e.clientY - touchDown.y)
        touchDown.x = e.clientX; touchDown.y = e.clientY
        touchDown.onCat = onCatBox(e.clientX, e.clientY)
      }
      if (e.pointerType !== 'mouse') return
      const t = performance.now()
      if (px == null || Math.hypot(e.clientX - px, e.clientY - py) > 3) stillSince = t
      trail.push([t, e.clientX, e.clientY])
      while (trail.length > 2 && t - trail[0][0] > 160) trail.shift()
      const [t0, x0, y0] = trail[0]
      const span = Math.max(40, t - t0)
      pvx = ((e.clientX - x0) / span) * 1000
      pvy = ((e.clientY - y0) / span) * 1000
      px = e.clientX; py = e.clientY; lastMove = t
    }
    const onOut = (e) => { if (!e.relatedTarget) px = py = null }
    let lastTap = 0
    const tapNow = () => {
      const t = performance.now()
      const dbl = t - lastTap < 320
      lastTap = t
      tap(dbl)
    }
    const onDownAnywhere = (e) => {
      if (!cat || e.target === hb || e.target === yb || yb.contains(e.target)) return
      if (onCat(e.clientX, e.clientY)) { tapNow(); return }
      if (e.target.closest?.('a, button, input, textarea, select, label, summary, [role], [tabindex], figure, canvas, svg, table, pre, code')) return
      const floor = innerHeight - 4
      const dd = Math.hypot(e.clientX - cat.x, e.clientY - (floor - 25 * cat.L.K))
      if (dd >= 110) return
      // with a finger, only a real tap counts as a miss, never the start of a scroll
      if (e.pointerType !== 'mouse') { missCandidate = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), sy: scrollY }; return }
      px = e.clientX; py = e.clientY; miss()
    }
    const onHit = (e) => {
      e.stopPropagation(); e.preventDefault()
      if (e.pointerType !== 'mouse') touchDown = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, onCat: true }
      tapNow()
    }
    // kick the yarn yourself, and she will chase it
    const onYarn = (e) => {
      e.stopPropagation(); e.preventDefault()
      if (!cat || !ball.on) return
      ball.vx = (Math.sign(ball.x - e.clientX) || 1) * rnd(320, 520)
      if (!['run', 'startle', 'mock'].includes(cat.state) && !(cat.state === 'walk' && cat.then === 'gone')) go('play', { dur: rnd(10, 16) })
      keep(40)
    }
    const onUp = (e) => {
      if (touchDown && e.pointerId === touchDown.id) touchDown = null
      const m = missCandidate
      if (m && e.pointerId === m.id) {
        missCandidate = null
        if (Math.hypot(e.clientX - m.x, e.clientY - m.y) < 10 && performance.now() - m.t < 450 && Math.abs(scrollY - m.sy) < 2) miss()
      }
    }
    const decay = setInterval(() => {
      if (performance.now() - lastMove > 150) { pvx = 0; pvy = 0 }
      scrollV *= 0.5
    }, 100)
    const onScroll = () => {
      const t = performance.now()
      const dy = scrollY - lastScrollY
      scrollV = Math.max(scrollV, (Math.abs(dy) / Math.max(16, t - lastScrollT)) * 1000)
      if (dy) scrollDir = Math.sign(dy)
      lastScrollY = scrollY; lastScrollT = t
    }
    // she notices the lights change
    const mo = new MutationObserver(() => {
      if (!cat) return
      readTheme(); cat.wideT = 1
      cat.fx.push({ g: '?', x: 0, y: 0, vy: 0, life: 1, t: 0, d: 0, still: true })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const busy = () => {
      const a = document.activeElement
      return document.hidden || (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) ||
        document.querySelector('[aria-label="Close menu"]')
    }
    const tick = setInterval(() => {
      if (cat || busy() || performance.now() < nextAt) return
      spawn()
    }, 1000)
    const onCall = () => { if (!cat) spawn() }
    // resizing or turning the phone: keep her inside her patch, or let her slip away if it is gone
    const onResize = () => {
      if (!cat) return
      const was = cat.L
      const L = layout(was.side)
      if (L.mode !== was.mode) { finish(); return }
      cat.L = L
      if (!['walk', 'run', 'zoom', 'play'].includes(cat.state)) cat.x = clamp(cat.x, L.x0, L.x1)
      if (cat.x < -100 || cat.x > innerWidth + 100) finish()
    }
    // for testing: ?catdebug lets a script put her in a given state
    if (/catdebug/.test(location.search)) window.__cat = { go: (st, x) => cat && go(st, x || {}), get: () => cat, idle: (a) => cat && idle(cat, cat.L, a) }

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerout', onOut)
    addEventListener('pointerdown', onDownAnywhere, { capture: true, passive: true })
    addEventListener('pointerup', onUp, { passive: true })
    addEventListener('pointercancel', onUp, { passive: true })
    addEventListener('scroll', onScroll, { passive: true })
    hb.addEventListener('pointerdown', onHit)
    yb.addEventListener('pointerdown', onYarn)
    addEventListener('cat:call', onCall)
    addEventListener('resize', onResize)
    return () => {
      clearInterval(tick); clearInterval(decay); cancelAnimationFrame(raf); clearTimeout(noteTimer); mo.disconnect()
      removeEventListener('pointermove', onMove); removeEventListener('pointerout', onOut)
      removeEventListener('pointerdown', onDownAnywhere, { capture: true })
      removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp)
      removeEventListener('scroll', onScroll)
      hb.removeEventListener('pointerdown', onHit)
      yb.removeEventListener('pointerdown', onYarn)
      removeEventListener('cat:call', onCall)
      removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-[35] hidden overflow-hidden print:!hidden" aria-hidden="true">
      <canvas ref={canvas} className="absolute left-0 top-0" />
      <div ref={yarn} className="pointer-events-auto absolute left-0 top-0 hidden cursor-pointer touch-manipulation" data-cursor role="presentation" />
      <div ref={hit} className="absolute left-0 top-0 cursor-pointer touch-none" data-cursor role="presentation" />
      <p
        ref={note}
        className="absolute left-0 top-0 whitespace-nowrap font-mono text-[11px] italic text-ink-2 opacity-0 transition-opacity duration-300 [text-shadow:0_0_6px_var(--canvas),0_0_2px_var(--canvas)]"
      />
    </div>
  )
}

/** The line at the foot of the page, once she has visited (on this visit or before). */
export function CatTally() {
  const t = useCatTally()
  if (!t.visits && !t.tamedAll && !t.ranAll) return null
  return (
    <p className="mt-2 font-mono text-[11px] leading-relaxed text-mute">
      Cats tamed: {t.tamed} ({t.tamedAll} across visits). Ran away: {t.ran} ({t.ranAll} across visits).{' '}
      {!t.present && (
        <button type="button" onClick={callCat} className="text-signal underline decoration-signal/40 underline-offset-2 hover:decoration-signal">
          call her back
        </button>
      )}
    </p>
  )
}
