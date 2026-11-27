import { useEffect, useRef, useSyncExternalStore } from 'react'
import { glyph } from './pixelcat'
import { FLAT, POSES, clonePose, drawCat, easePose } from './cat'

/*
  Now and then a little pixel cat wanders in along the bottom of the screen and sits down to study you.
  Ignore her and she just sits there: blinking, swishing her tail, grooming, yawning, now and then dozing off.
  Move slowly and click her: she is tamed, shows you hearts and (with a mouse) follows your pointer about.
  Rush at her or miss, and she bolts, then makes sure you know what she thinks of you.
  Wiggle the pointer low near her and she stalks it and pounces. She keeps to the empty margins on wide screens
  and only peeks in at the bottom-left corner on phones, so she never sits on the text.
*/

// ---------- score: this visit, and across visits ----------
const KEY = 'cat-stats'
let tally = { tamed: 0, ran: 0, tamedAll: 0, ranAll: 0, present: false, visits: 0 }
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
  tally.tamedAll = Number(saved.tamed) || Number(localStorage.getItem('cat-tamed')) || 0
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
const COL = 1040
const EYE = [17, 17, 16]
const hexRgb = (h) => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = [...h].map((x) => x + x).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0) }

const MOCKS = [
  { kind: 'yawn', text: 'Missed. She yawns at you.' },
  { kind: 'groom', text: 'She licks her paw, unimpressed.' },
  { kind: 'back', text: 'She turns her back and flicks her tail.' },
]

export default function CatVisit() {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const hit = useRef(null)
  const note = useRef(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cv = canvas.current, hb = hit.current, nt = note.current
    const ctx = cv.getContext('2d')
    const coarse = matchMedia('(pointer: coarse)').matches
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches

    let cat = null, raf = 0, prev = 0, nextAt = performance.now() + rnd(8000, 14000), noteTimer = 0
    let px = null, py = null, pvx = 0, pvy = 0, lastMove = 0
    let colours = { fur: '#c2410c', eye: '#111110', ink: '#121212', mute: '#6a675f' }
    let lastScrollY = scrollY, lastScrollT = performance.now(), scrollV = 0

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement)
      const v = (n, d) => (cs.getPropertyValue(n) || d).trim()
      colours = { fur: v('--signal', '#c2410c'), eye: '#111110', ink: v('--ink', '#121212'), mute: v('--mute', '#6a675f') }
    }

    const say = (text, ms = 2600) => {
      nt.textContent = text
      nt.style.opacity = '1'
      clearTimeout(noteTimer)
      noteTimer = setTimeout(() => { nt.style.opacity = '0' }, ms)
    }

    // where she may be: the margin beside the text column, or the bottom-left corner when there is none
    const layout = () => {
      const W = innerWidth, m = (W - COL) / 2
      const u = W < 640 ? 3 : 4 // spacing unit, in CSS px
      const K = W < 640 ? 0.95 : 1.2 // CSS px per unit of the cat's skeleton
      if (m >= 150) {
        const side = Math.random() < 0.5 ? -1 : 1
        const x0 = side < 0 ? 14 + 10 * u : W - m + 14 + 10 * u
        const x1 = side < 0 ? m - 14 - 10 * u : W - 14 - 10 * u
        return { u, K, side, x0, x1, mode: 'margin' }
      }
      const spot = m >= 90 ? m / 2 : 2 * u // on a phone she only peeks in
      return { u, K, side: -1, x0: spot, x1: spot, mode: 'corner' }
    }

    const offscreen = () => (cat.L.side < 0 ? -30 * cat.L.u : innerWidth + 30 * cat.L.u)
    const go = (state, extra = {}) => Object.assign(cat, { state, st: 0 }, extra)
    const walkTo = (goal, then, speed = 50) => go('walk', { goal, then, speed })
    const runTo = (goal, then) => go('run', { goal, then, speed: 190 })
    const faceIn = () => { cat.dir = cat.L.side < 0 ? 1 : -1 }
    const faceTo = (x) => { if (Math.abs(x - cat.x) > 6) cat.dir = x > cat.x ? 1 : -1 }
    const pop = (g, n = 1, spread = 6) => {
      for (let i = 0; i < n; i++) cat.fx.push({ g, x: rnd(-spread, spread), y: 0, vy: rnd(9, 14), life: rnd(1.1, 1.6), t: 0, d: i * 0.12 })
    }

    const spawn = () => {
      readTheme()
      const L = layout()
      const h = new Date().getHours()
      cat = {
        L, x: L.side < 0 ? -30 * L.u : innerWidth + 30 * L.u, dir: L.side < 0 ? 1 : -1,
        state: 'walk', st: 0, t: 0, goal: rnd(L.x0, L.x1), then: 'sit', speed: 46, odo: 0,
        eyes: { dx: 0, dy: 0, open: 1, wide: false }, blinkAt: 2, blinkT: 0, slowBlink: 0,
        tail: 0, swish: 0.4, swishAt: rnd(3, 6), swishT: 0, earTwitchAt: rnd(2, 6), earTwitchT: 0, earBack: false, earBackT: 0,
        mouth: 0, breath: false, purrT: 0, fx: [], jump: null, lift: 0, tamed: false, misses: 0, counted: false,
        watchFor: coarse ? rnd(22, 32) : rnd(60, 90), idleAt: rnd(5, 9), pounceAt: 0, glance: null, glanceAt: 0,
        sleepy: h >= 22 || h < 6, wideT: 0, followUntil: 0, petT: 0, wiggle: false,
        p: clonePose(POSES.walk), cyc: 0, face: 0, look: [0, 0],
      }
      setTally({ present: true, visits: tally.visits + 1 })
      wrap.current.style.display = 'block'
      if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame) }
    }

    const finish = () => {
      cat = null
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

    const tame = () => {
      cat.tamed = true
      if (!cat.counted) { cat.counted = true; setTally({ tamed: tally.tamed + 1, tamedAll: tally.tamedAll + 1 }) }
      go('tamed')
      pop('heart', 5, 10)
      cat.slowBlink = 0.01
      cat.purrT = 2.5
      say(fine && cat.L.mode === 'margin' ? 'Tamed. She will follow you for a bit.' : 'Tamed. She trusts you now.', 3000)
      navigator.vibrate?.(20)
    }

    const startle = () => {
      if (['startle', 'run', 'mock'].includes(cat.state)) return
      go('startle')
      cat.fx.push({ g: 'bang', x: 0, y: 2, vy: 0, life: 0.8, t: 0, d: 0, still: true })
    }

    const miss = () => {
      if (!cat || cat.tamed || ['run', 'mock', 'startle', 'hop', 'pounce'].includes(cat.state)) return
      if (cat.state === 'walk' && cat.then === 'gone') return
      cat.misses++
      if (cat.misses >= 2) { startle(); return }
      // a hop away, then the look
      const L = cat.L
      const away = cat.x + (px != null && px > cat.x ? -1 : 1) * 14 * L.u
      cat.jump = { from: cat.x, to: clamp(away, L.x0, L.mode === 'corner' ? L.x0 + 6 * L.u : L.x1), t: 0, dur: 0.38, h: 7 * L.u, then: 'mockStay' }
      go('hop')
    }

    const tryCatch = (dbl) => {
      if (!cat) return
      const s = cat.state
      if (cat.tamed) {
        if (['hop', 'pounce', 'walk', 'run'].includes(s)) return
        if (dbl || Math.random() < 0.3) { cat.jump = { from: cat.x, to: cat.x, t: 0, dur: 0.42, h: 9 * cat.L.u, then: 'sit' }; go('hop'); pop('heart', 2, 8) }
        else { pop('heart', 3, 8); cat.purrT = 2; cat.slowBlink = 0.01; if (s === 'doze') { cat.breath = false; go('sit') } }
        return
      }
      if (['run', 'mock', 'startle'].includes(s)) return
      if (s === 'hop' || s === 'pounce') { cat.lift = 0 }
      // on a touch screen a cat on the move may still slip away
      if (coarse && s === 'walk' && Math.random() < 0.25) { miss(); return }
      tame()
    }

    // ---------- the frame ----------
    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!cat) { raf = 0; return }
      const c = cat, L = c.L, u = L.u
      c.t += dt; c.st += dt
      const floor = innerHeight - 4
      const head = c.headAt || [c.x, floor - 50]
      const d = px == null ? Infinity : Math.hypot(px - c.x, py - (floor - 6 * u))
      const speed = Math.hypot(pvx, pvy)
      const approaching = px != null && ((c.x - px) * pvx + (floor - 6 * u - py) * pvy) > 0
      const pointerLive = fine && px != null && now - lastMove < 5000
      const inZone = px != null && px > L.x0 - 12 * u && px < L.x1 + 12 * u

      const move = (onArrive) => {
        const dx = c.goal - c.x
        if (Math.abs(dx) < 1.5) { c.x = c.goal; onArrive(); return }
        c.dir = dx > 0 ? 1 : -1
        const step = Math.min(Math.abs(dx), c.speed * (u / 4) * dt)
        c.x += Math.sign(dx) * step
        c.odo += step
        const run = c.state === 'run'
        c.cyc += (step / L.K) * (run ? 0.45 : 0.62) / (run ? 30 : 26)
      }

      // ---------- behaviour ----------
      let pose = 'sit'
      switch (c.state) {
        case 'walk':
          pose = 'walk'
          move(() => {
            if (c.then === 'gone') { finish(); return }
            if (c.then === 'sit' && !c.tamed) faceIn()
            go(c.then)
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
          // a pointer wriggling low near her is a toy
          if (fine && pointerLive && inZone && L.mode === 'margin' && py > floor - 26 * u && Math.abs(px - c.x) > 18 * u && speed > 120 && speed < 900 && c.t > c.pounceAt) {
            c.pounceAt = c.t + rnd(5, 9)
            c.target = clamp(px, L.x0, L.x1)
            if (Math.abs(c.target - c.x) > 4 * u) { faceTo(c.target); go('stalk'); break }
          }
          // tamed, she follows you along the floor
          if (c.tamed && fine && L.mode === 'margin' && c.t < c.followUntil && pointerLive && inZone && Math.abs(px - c.x) > 16 * u) {
            const g = clamp(px - Math.sign(px - c.x) * 8 * u, L.x0, L.x1)
            if (Math.abs(g - c.x) > 40) {
              const far = Math.abs(g - c.x) > 160
              go(far ? 'run' : 'walk', { goal: g, then: 'sit', speed: far ? 190 : 70 })
              break
            }
          }
          // things a cat does while you ignore her
          if ((c.idleAt -= dt) <= 0) {
            c.idleAt = rnd(5, 10)
            const r = Math.random()
            if (r < 0.2) { go('groom'); break }
            if (r < 0.34 || (c.sleepy && r < 0.5)) { go('yawn'); break }
            if (r < 0.46 && L.mode === 'margin' && !c.tamed) { walkTo(rnd(L.x0, L.x1), 'sit', 40); break }
            if (r < 0.58 && c.st > 20) { go('doze', { sleepFor: rnd(10, 16), thenLeave: false }); break }
            c.glance = [rnd(innerWidth * 0.2, innerWidth * 0.8), rnd(innerHeight * 0.15, innerHeight * 0.7)]
            c.glanceAt = rnd(1, 2.5)
          }
          if (c.tamed && c.t > c.followUntil + 4 && c.state === 'sit') { go('doze', { sleepFor: rnd(14, 20), thenLeave: true }); break }
          if (!c.tamed && c.st > c.watchFor) { go('stretch', { next: 'leave' }); break }
          break
        }
        case 'groom':
          pose = 'groom'
          if (c.st > 2.4) go('sit')
          break
        case 'yawn':
          pose = 'sit'
          c.mouth = c.st > 0.25 && c.st < 1.4 ? (c.st > 0.5 && c.st < 1.2 ? 2 : 1) : 0
          if (c.st > 1.6) { c.mouth = 0; go('sit') }
          break
        case 'doze': {
          pose = 'loaf'
          c.breath = Math.sin(c.t * 2.4) > 0
          c.zAt = (c.zAt ?? 0) - dt
          if (c.zAt <= 0) { c.zAt = 1.1; c.fx.push({ g: 'z', x: 2, y: 0, vy: 8, life: 1.8, t: 0, d: 0, drift: 1 }) }
          // she wakes if you come close, or after a while
          if (fine && d < 110 && speed > 200 && !c.tamed) { c.breath = false; c.wideT = 0.8; go('sit'); break }
          if (c.st > (c.sleepFor || 14)) { c.breath = false; go('stretch', { next: c.thenLeave ? 'leave' : 'sit' }) }
          break
        }
        case 'stretch':
          pose = 'stretch'
          if (c.st > 1.3) {
            if (c.next === 'leave') walkTo(offscreen(), 'gone', 44)
            else go('sit')
          }
          break
        case 'stalk':
          pose = 'crouch'
          c.wiggle = c.st > 0.35
          if (pointerLive) c.target = clamp(px, L.x0, L.x1)
          if (c.st > 1.1) {
            c.wiggle = false
            faceTo(c.target)
            c.jump = { from: c.x, to: c.target, t: 0, dur: clamp(Math.abs(c.target - c.x) / 420, 0.32, 0.6), h: 10 * u, then: 'sit' }
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
          c.x = j.from + (j.to - j.from) * k
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
          c.earBack = true
          if (c.st > 0.4) {
            c.earBack = false
            ranAway()
            if (L.mode === 'margin') {
              const far = Math.abs(L.x0 - c.x) > Math.abs(L.x1 - c.x) ? L.x0 : L.x1
              runTo(far, 'mockLeave')
            } else { runTo(offscreen(), 'gone'); say('Too fast. She bolts.', 2000) }
          }
          break
        case 'mock': {
          const k = c.mock
          pose = k === 'back' ? 'back' : k === 'groom' ? 'groom' : 'sit'
          if (k === 'back') c.dir = L.side < 0 ? -1 : 1
          if (k === 'yawn') c.mouth = c.st > 0.3 && c.st < 1.6 ? 2 : 0
          if (c.st > 2.8) {
            c.mouth = 0
            if (c.leave) walkTo(offscreen(), 'gone', 52)
            else { faceIn(); go('sit', { watchFor: rnd(20, 30) }) }
          }
          break
        }
        case 'tamed':
          pose = 'sit'
          if (c.st > 2.6) {
            c.followUntil = c.t + (fine && L.mode === 'margin' ? 22 : 0)
            if (coarse || L.mode === 'corner') go('doze', { sleepFor: rnd(7, 10), thenLeave: true })
            else go('sit')
          }
          break
        default:
          break
      }
      if (!cat) return

      // ---------- small life ----------
      if ((c.blinkAt -= dt) <= 0) { c.blinkAt = rnd(2.4, 6); c.blinkT = 0.16 }
      let open = 1
      if (c.blinkT > 0) { c.blinkT -= dt; open = 0.4 }
      if (c.slowBlink > 0) {
        // the slow blink: a cat's "I trust you"
        c.slowBlink += dt
        open = c.slowBlink < 0.35 ? 0.4 : c.slowBlink < 1.2 ? 0 : c.slowBlink < 1.5 ? 0.4 : 1
        if (c.slowBlink > 1.5) c.slowBlink = 0
      }
      if (pose === 'loaf' || pose === 'groom' || pose === 'stretch' || c.mouth === 2) open = 0
      c.eyes.open = open
      c.wideT = Math.max(0, c.wideT - dt)
      c.eyes.wide = pose === 'puff' || c.wideT > 0 || c.state === 'stalk'

      if ((c.swishAt -= dt) <= 0) { c.swishAt = rnd(3.5, 8); c.swishT = 1.2 }
      if (c.swishT > 0) c.swishT -= dt
      const busyTail = c.swishT > 0 || c.state === 'stalk' || (c.state === 'mock' && c.mock === 'back')
      const swishTarget = c.state === 'mock' && c.mock === 'back' ? 1.4 : busyTail ? 1.1 : 0.35
      c.swish += (swishTarget - c.swish) * Math.min(1, dt * 6)
      c.tail += dt * (busyTail ? 9 : 3)
      if ((c.earTwitchAt -= dt) <= 0) { c.earTwitchAt = rnd(3, 8); c.earTwitchT = 0.22 }
      c.earTwitchT -= dt
      // a fast scroll makes her start
      if (scrollV > 2500 && pose === 'sit') { c.wideT = 0.6; c.earBack = true; c.earBackT = 0.6 }
      if (c.earBackT > 0) { c.earBackT -= dt; if (c.earBackT <= 0 && c.state !== 'startle') c.earBack = false }

      // petting: a slow pointer over a tamed cat
      if (c.tamed && fine && px != null && Math.abs(px - c.x) < 9 * u && py > floor - 18 * u && speed > 30 && speed < 700) {
        c.petT += dt
        if (c.petT > 0.5) { c.petT = 0; pop('heart', 1, 6); c.purrT = 1.2 }
      }
      if (c.purrT > 0) c.purrT -= dt

      // eyes: on the pointer if there is one, otherwise glancing about the page
      let tx = null, ty = null
      if (pointerLive) { tx = px; ty = py }
      else if (c.glance && (c.glanceAt -= dt) > 0) { [tx, ty] = c.glance }
      else if (!fine && pose === 'sit') { tx = innerWidth / 2; ty = innerHeight / 2 }
      const lk = tx != null ? [clamp((tx - head[0]) / 220, -1, 1), clamp((ty - head[1]) / 220, -1, 1)] : [0, 0]
      c.look[0] += (lk[0] - c.look[0]) * Math.min(1, dt * 8)
      c.look[1] += (lk[1] * 0.8 - c.look[1]) * Math.min(1, dt * 8)

      // ---------- pose ----------
      const want = {
        walk: POSES.walk, run: POSES.run, jump: POSES.run, sit: POSES.sit, groom: POSES.sit, back: POSES.sit,
        loaf: POSES.loaf, stretch: POSES.stretch, crouch: POSES.crouch,
        puff: { ...POSES.walk, gait: 0, ear: 1, tail: [1.55, 0.0, 0.02], hip: [-20, -31], sh: [19, -32] },
      }[pose] || POSES.sit
      const target = { ...want, mouth: c.mouth / 2, eye: 1 }
      if (pose === 'crouch' && c.wiggle) target.hip = [want.hip[0] + Math.sin(c.t * 22) * 1.5, want.hip[1]]
      easePose(c.p, target, pose === 'jump' || pose === 'puff' ? Math.min(1, dt * 18) : 1 - Math.exp(-dt / 0.14))
      const faceWant = ['sit', 'loaf'].includes(pose) && c.state !== 'mock' ? 1 : 0
      c.face += (faceWant - c.face) * Math.min(1, dt * 10)
      const blink = 1 - c.eyes.open

      // ---------- draw: the cat in flat orange, snapped to a pixel grid ----------
      const K = L.K, P = 2
      const dpr = Math.min(2, devicePixelRatio || 1)
      const CW = 220 * K, CH = 140 * K
      const lw = Math.ceil(CW / P), lh = Math.ceil(CH / P)
      if (!c.low) { c.low = document.createElement('canvas'); c.lctx = c.low.getContext('2d', { willReadFrequently: true }) }
      if (c.low.width !== lw) { c.low.width = lw; c.low.height = lh }
      const lc = c.lctx
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, lw, lh)
      const lift = c.lift || 0
      lc.setTransform((K / P) * c.dir, 0, 0, K / P, (110 * K) / P, (128 * K - lift) / P)
      const box = drawCat(lc, {
        pose: c.p, cyc: pose === 'jump' ? 0.3 : c.cyc, gaitKind: pose === 'run' || pose === 'jump' ? 'run' : 'walk', t: c.t,
        palette: FLAT, flat: true, dir: c.dir, face: c.face, look: c.look, blink, breath: c.breath ? 1 : 0, purr: c.purrT > 0,
        groom: pose === 'groom' ? [POSES.sit.sh[0] + 13 + (Math.floor(c.t * 5) % 2), POSES.sit.sh[1] - 4] : null,
        swish: c.swish * 0.25, flick: c.state === 'mock' && c.mock === 'back', earTwitch: c.earTwitchT > 0,
      })
      // snap every pixel to fur, far-side fur or eye, with hard edges
      const img = lc.getImageData(0, 0, lw, lh), px8 = img.data
      const fur = c.rgb || (c.rgb = hexRgb(colours.fur))
      const farc = fur // one flat colour, like a sticker
      for (let i = 0; i < px8.length; i += 4) {
        if (px8[i + 3] < 120) { px8[i + 3] = 0; continue }
        const r = px8[i], g = px8[i + 1], b = px8[i + 2]
        const col = b > r && b > g ? EYE : g > r ? farc : fur
        px8[i] = col[0]; px8[i + 1] = col[1]; px8[i + 2] = col[2]; px8[i + 3] = 255
      }
      lc.putImageData(img, 0, 0)
      c.mask = { data: px8, lw, lh, P }

      const W = lw * P, H = lh * P
      if (cv.width !== Math.round(W * dpr)) {
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
        cv.style.width = `${W}px`; cv.style.height = `${H}px`
      }
      const ox = 110 * K, oy = 128 * K // her ground point inside the canvas, CSS px
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.imageSmoothingEnabled = false
      // a one-pixel shadow on the floor, shrinking as she jumps
      const bx0l = c.dir > 0 ? box.x0 : -box.x1, bx1l = c.dir > 0 ? box.x1 : -box.x0
      const shw = (bx1l - bx0l - 10) * K * (1 - Math.min(0.6, lift / 40))
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      ctx.fillRect(Math.round((ox + ((bx0l + bx1l) / 2) * K - shw / 2) * dpr), Math.round(oy * dpr), Math.round(shw * dpr), Math.round(P * dpr))
      ctx.drawImage(c.low, 0, 0, Math.round(W * dpr), Math.round(H * dpr))

      // hearts, zeds and exclamation marks, drawn the right way round above her head
      const hxl = box.head ? box.head[0] * c.dir : 0, hyl = box.head ? box.head[1] : -50
      c.headAt = [c.x + hxl * K, floor + hyl * K - lift]
      c.fx = c.fx.filter((f) => {
        if (f.d > 0) { f.d -= dt; return true }
        f.t += dt
        if (!f.still) f.y += f.vy * dt
        const k = f.t / f.life
        if (k >= 1) return false
        ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25
        ctx.fillStyle = f.g === 'heart' ? colours.fur : f.g === 'z' ? colours.mute : colours.ink
        const cell = Math.round(P * dpr)
        const gx = (ox + hxl * K + f.x * P + (f.drift ? Math.sin(f.t * 3) * 2 * P : 0)) * dpr - cell * 2.5
        const gy = (oy + (hyl - 14) * K - lift - f.y * P) * dpr
        glyph(ctx, f.g, gx, gy, cell)
        ctx.globalAlpha = 1
        return true
      })

      cv.style.transform = `translate3d(${c.x - ox}px, ${floor - oy}px, 0)`

      // the part you can click: her body and head, never the empty canvas around her
      const bx0 = c.x + bx0l * K, bx1 = c.x + bx1l * K
      const w = Math.max(44, bx1 - bx0 + 6), hh = Math.max(44, (box.y1 - box.y0) * K + 6)
      hb.style.transform = `translate3d(${clamp((bx0 + bx1) / 2 - w / 2, 0, innerWidth - w)}px, ${floor - hh - lift + 2}px, 0)`
      hb.style.width = `${w}px`; hb.style.height = `${hh}px`
      hb.style.pointerEvents = ['run', 'startle'].includes(c.state) || (c.state === 'walk' && c.then === 'gone') ? 'none' : 'auto'

      const nw = nt.offsetWidth
      nt.style.transform = `translate3d(${clamp(c.x - nw / 2, 8, innerWidth - nw - 8)}px, ${floor - 27 * u}px, 0)`

      raf = requestAnimationFrame(frame)
    }

    // ---------- input ----------
    const trail = []
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      const t = performance.now()
      trail.push([t, e.clientX, e.clientY])
      while (trail.length > 2 && t - trail[0][0] > 160) trail.shift()
      const [t0, x0, y0] = trail[0]
      const span = Math.max(40, t - t0)
      pvx = ((e.clientX - x0) / span) * 1000
      pvy = ((e.clientY - y0) / span) * 1000
      px = e.clientX; py = e.clientY; lastMove = t
    }
    const onOut = (e) => { if (!e.relatedTarget) px = py = null }
    // is this point on her (or within a finger's width of her)?
    const onCat = (x, y) => {
      const m = cat?.mask
      if (!m) return false
      const r = cv.getBoundingClientRect()
      const cx = Math.floor((x - r.left) / m.P), cy = Math.floor((y - r.top) / m.P)
      const tol = Math.ceil((coarse ? 14 : 8) / m.P)
      for (let j = -tol; j <= tol; j++) for (let i = -tol; i <= tol; i++) {
        const xx = cx + i, yy = cy + j
        if (xx < 0 || yy < 0 || xx >= m.lw || yy >= m.lh) continue
        if (m.data[(yy * m.lw + xx) * 4 + 3] > 0) return true
      }
      return false
    }
    const onDownAnywhere = (e) => {
      if (!cat || e.target === hb) return
      if (onCat(e.clientX, e.clientY)) { tap(); return }
      const floor = innerHeight - 4
      const dd = Math.hypot(e.clientX - cat.x, e.clientY - (floor - 6 * cat.L.u))
      if (dd < 100) { px = e.clientX; py = e.clientY; miss() }
    }
    let lastTap = 0
    function tap() {
      const t = performance.now()
      const dbl = t - lastTap < 320
      lastTap = t
      tryCatch(dbl)
    }
    const onHit = (e) => { e.stopPropagation(); e.preventDefault(); tap() }
    const decay = setInterval(() => {
      if (performance.now() - lastMove > 150) { pvx = 0; pvy = 0 }
      scrollV *= 0.5
    }, 100)
    const onScroll = () => {
      const t = performance.now()
      scrollV = Math.max(scrollV, (Math.abs(scrollY - lastScrollY) / Math.max(16, t - lastScrollT)) * 1000)
      lastScrollY = scrollY; lastScrollT = t
    }
    // she notices the lights change
    const mo = new MutationObserver(() => {
      if (!cat) return
      readTheme(); cat.rgb = null; cat.wideT = 1
      cat.fx.push({ g: 'huh', x: 0, y: 2, vy: 0, life: 1, t: 0, d: 0, still: true })
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

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerout', onOut)
    addEventListener('pointerdown', onDownAnywhere, { capture: true, passive: true })
    addEventListener('scroll', onScroll, { passive: true })
    hb.addEventListener('pointerdown', onHit)
    addEventListener('cat:call', onCall)
    return () => {
      clearInterval(tick); clearInterval(decay); cancelAnimationFrame(raf); clearTimeout(noteTimer); mo.disconnect()
      removeEventListener('pointermove', onMove); removeEventListener('pointerout', onOut)
      removeEventListener('pointerdown', onDownAnywhere, { capture: true })
      removeEventListener('scroll', onScroll)
      hb.removeEventListener('pointerdown', onHit)
      removeEventListener('cat:call', onCall)
    }
  }, [])

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-[35] hidden overflow-hidden print:!hidden" aria-hidden="true">
      <canvas ref={canvas} className="absolute left-0 top-0" style={{ imageRendering: 'pixelated' }} />
      <div ref={hit} className="absolute left-0 top-0 cursor-pointer touch-manipulation" data-cursor role="presentation" />
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
