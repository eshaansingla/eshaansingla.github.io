import { useEffect, useRef, useSyncExternalStore } from 'react'
import { POSES, clonePose, drawCat, easePose, makePalette } from './cat'

/*
  A ginger cat in the site's orange drops by now and then, on her own or when called.
  She breathes, blinks, looks around, wags her tail and twitches her ears; her eyes (and pupils) follow your pointer.
  She walks about, sits, grooms, scratches, yawns, rolls over, falls asleep and stretches when she wakes.
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
const COL = 1040

const MOCKS = [
  { kind: 'yawn', text: 'Missed. She yawns at you.' },
  { kind: 'groom', text: 'She licks her paw, unimpressed.' },
  { kind: 'back', text: 'She turns her back and flicks her tail.' },
]
const MEOWS = ['Meow!', 'Mrrp?', 'Meow.', 'Mrrrow!', 'Mew!']

// a short, soft meow: a sawtooth swept up and down through a vowel-like filter
let audio = null
function meowSound(pitch = 1) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    audio = audio || new AC()
    const t = audio.currentTime
    const o = audio.createOscillator(), f = audio.createBiquadFilter(), f2 = audio.createBiquadFilter(), g = audio.createGain()
    const vib = audio.createOscillator(), vg = audio.createGain()
    o.type = 'sawtooth'
    vib.frequency.value = 7; vg.gain.value = 12; vib.connect(vg); vg.connect(o.frequency)
    o.frequency.setValueAtTime(430 * pitch, t)
    o.frequency.linearRampToValueAtTime(760 * pitch, t + 0.13)
    o.frequency.linearRampToValueAtTime(520 * pitch, t + 0.42)
    f.type = 'bandpass'; f.Q.value = 5
    f.frequency.setValueAtTime(800, t); f.frequency.linearRampToValueAtTime(1700, t + 0.16); f.frequency.linearRampToValueAtTime(950, t + 0.44)
    f2.type = 'lowpass'; f2.frequency.value = 3200
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48)
    o.connect(f); f.connect(f2); f2.connect(g); g.connect(audio.destination)
    o.start(t); vib.start(t); o.stop(t + 0.5); vib.stop(t + 0.5)
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

export default function CatVisit() {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const hit = useRef(null)
  const note = useRef(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cv = canvas.current, hb = hit.current, nt = note.current
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    const coarse = matchMedia('(pointer: coarse)').matches
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches

    let cat = null, raf = 0, prev = 0, nextAt = performance.now() + rnd(8000, 14000), noteTimer = 0
    let px = null, py = null, pvx = 0, pvy = 0, lastMove = 0
    let dark = false, palette = makePalette(), theme = { fur: '#c2410c', ink: '#121212', mute: '#6a675f' }
    let lastScrollY = scrollY, lastScrollT = performance.now(), scrollV = 0
    let touchDown = null

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
    const layout = () => {
      const W = innerWidth, m = (W - COL) / 2
      const K = W < 640 ? 0.95 : 1.2 // CSS px per unit of her skeleton
      if (m >= 150) {
        const side = Math.random() < 0.5 ? -1 : 1
        const x0 = side < 0 ? 14 + 40 * K : W - m + 14 + 40 * K
        const x1 = side < 0 ? m - 14 - 40 * K : W - 14 - 40 * K
        return { K, side, x0: Math.min(x0, x1), x1: Math.max(x0, x1), mode: 'margin', m }
      }
      const spot = m >= 90 ? m / 2 : 8 * K // on a phone she only peeks in
      return { K, side: -1, x0: spot, x1: spot, mode: 'corner', m }
    }

    const offscreen = () => (cat.L.side < 0 ? -90 * cat.L.K : innerWidth + 90 * cat.L.K)
    const go = (state, extra = {}) => Object.assign(cat, { state, st: 0 }, extra)
    const walkTo = (goal, then, speed = 48) => go('walk', { goal, then, speed })
    const runTo = (goal, then) => go('run', { goal, then, speed: 200 })
    const faceIn = () => { cat.dir = cat.L.side < 0 ? 1 : -1 }
    const faceTo = (x) => { if (Math.abs(x - cat.x) > 6) cat.dir = x > cat.x ? 1 : -1 }
    const pop = (g, n = 1, spread = 6) => {
      for (let i = 0; i < n; i++) cat.fx.push({ g, x: rnd(-spread, spread), y: 0, vy: rnd(16, 26), life: rnd(1.1, 1.6), t: 0, d: i * 0.12 })
    }

    const spawn = () => {
      readTheme()
      const L = layout()
      const h = new Date().getHours()
      cat = {
        L, x: L.side < 0 ? -90 * L.K : innerWidth + 90 * L.K, dir: L.side < 0 ? 1 : -1,
        state: 'walk', st: 0, t: 0, goal: rnd(L.x0, L.x1), then: 'sit', speed: 46, cyc: 0,
        p: clonePose(POSES.walk), face: 0, look: [0, 0], open: 1, blinkAt: 2, blinkT: 0, slowBlink: 0,
        swish: 0, swishAt: rnd(3, 6), swishT: 0, twitchAt: rnd(2, 6), twitchT: 0, earBackT: 0,
        mouth: 0, meowT: 0, tiltT: 0, tiltDir: 1, purrT: 0, petT: 0, fx: [], jump: null, lift: 0, roll: 0,
        tamed: false, misses: 0, counted: false, watchFor: coarse ? rnd(35, 50) : rnd(100, 150), idleAt: rnd(4, 7), friend: tally.tamedAll > 0, greeted: false, meowAt: 0, petTotal: 0,
        pounceAt: 0, glance: null, glanceAt: 0, sleepy: h >= 22 || h < 6, wideT: 0, followUntil: 0, wiggle: false,
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

    const meow = (text) => {
      const c = cat
      c.meowT = 0.55
      c.tiltT = 1.3; c.tiltDir = Math.random() < 0.5 ? -1 : 1
      if (c.t > c.meowAt) { meowSound(rnd(0.92, 1.12)); c.meowAt = c.t + 0.5 }
      if (text) say(text, 1300)
    }
    const tame = (how) => {
      const c = cat, s = c.state
      c.tamed = true
      if (!c.counted) { c.counted = true; setTally({ tamed: tally.tamed + 1, tamedAll: tally.tamedAll + 1 }) }
      if (!['groom', 'scratch', 'yawn', 'roll', 'hop', 'pounce'].includes(s)) go('tamed')
      pop('heart', 4, 12)
      c.slowBlink = 0.01
      const follow = fine && c.L.mode === 'margin' ? ' She will follow you for a bit.' : ' She trusts you now.'
      say((how === 'pet' ? 'Purrr. Tamed.' : 'Meow! Tamed.') + follow, 3000)
      navigator.vibrate?.(20)
    }

    // a click or tap on her: she meows and tilts her head; the first one tames her
    const tap = (dbl) => {
      if (!cat) return
      const c = cat, s = c.state
      if (['run', 'startle'].includes(s) || (s === 'walk' && c.then === 'gone')) return
      if (s === 'doze') { go('stretch', { next: 'sit' }); c.wideT = 0.6 }
      if (s === 'hop' || s === 'pounce') { c.lift = 0; go('sit') }
      meow()
      if (!c.tamed) { tame('click'); return }
      if (dbl && ['sit', 'tamed', 'stroll'].includes(s)) { c.jump = { from: c.x, to: c.x, t: 0, dur: 0.42, h: 26 * c.L.K, then: 'sit' }; go('hop') }
      pop('heart', 2, 10)
      say(pick(MEOWS), 1300)
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
      const pointerLive = fine && px != null && now - lastMove < 5000
      const inZone = px != null && px > L.x0 - 40 * K && px < L.x1 + 40 * K

      const move = (onArrive) => {
        const dx = c.goal - c.x
        if (Math.abs(dx) < 1.5) { c.x = c.goal; onArrive(); return }
        c.dir = dx > 0 ? 1 : -1
        const step = Math.min(Math.abs(dx), c.speed * K * dt)
        c.x += Math.sign(dx) * step
        const run = c.state === 'run'
        c.cyc += ((step / K) * (run ? 0.45 : 0.62)) / (run ? 30 : 26)
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
            if (c.then === 'sit' && c.friend && !c.greeted) { c.greeted = true; meow('Mrrp! She remembers you.'); c.slowBlink = 0.01 }
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
          if (fine && pointerLive && inZone && L.mode === 'margin' && py > floor - 90 * K && Math.abs(px - c.x) > 60 * K && speed > 120 && speed < 900 && c.t > c.pounceAt) {
            c.pounceAt = c.t + rnd(6, 10)
            c.target = clamp(px, L.x0, L.x1)
            faceTo(c.target); go('stalk'); break
          }
          // tamed, she follows you along the floor
          if (c.tamed && fine && L.mode === 'margin' && c.t < c.followUntil && pointerLive && inZone && Math.abs(px - c.x) > 55 * K) {
            const g = clamp(px - Math.sign(px - c.x) * 30 * K, L.x0, L.x1)
            if (Math.abs(g - c.x) > 40) {
              const far = Math.abs(g - c.x) > 180
              go(far ? 'run' : 'walk', { goal: g, then: 'sit', speed: far ? 200 : 70 })
              break
            }
          }
          // the things a cat does while you ignore her
          if ((c.idleAt -= dt) <= 0) {
            c.idleAt = rnd(4, 8)
            const r = Math.random()
            if (r < 0.14) { go('groom'); break }
            if (r < 0.25) { go('scratch'); break }
            if (r < 0.36 || (c.sleepy && r < 0.45)) { go('yawn'); break }
            if (r < 0.44) { go('roll'); break }
            if (r < 0.56 && L.mode === 'margin') { walkTo(rnd(L.x0, L.x1), 'sit', 40); break }
            if (r < 0.6 && L.mode === 'margin' && fine && innerWidth > 1300 && !c.tamed) {
              // a stroll across the bottom of the screen, to the other margin and back
              const other = L.side < 0 ? innerWidth - L.m / 2 : L.m / 2
              go('walk', { goal: other, then: 'stroll', speed: 70 }); break
            }
            if (r < 0.72 && c.st > 15) { go('doze', { sleepFor: rnd(10, 16), thenLeave: false }); break }
            c.glance = [rnd(innerWidth * 0.1, innerWidth * 0.9), rnd(innerHeight * 0.1, innerHeight * 0.8)]
            c.glanceAt = rnd(1.2, 2.6)
          }
          if (c.tamed && c.followUntil && c.t > c.followUntil + 6) { go('doze', { sleepFor: rnd(14, 20), thenLeave: true }); break }
          if (!c.tamed && c.t > c.watchFor) { go('stretch', { next: 'leave' }); break }
          break
        }
        case 'stroll':
          // she reached the far side; look around, then wander home
          pose = 'sit'
          if (c.st > rnd(2, 3.5)) walkTo(rnd(L.x0, L.x1), 'sit', 60)
          break
        case 'groom':
          pose = 'groom'
          if (c.st > 2.6) go('sit')
          break
        case 'scratch':
          pose = 'scratch'
          if (c.st > 2.2) go('sit')
          break
        case 'yawn':
          pose = 'sit'
          c.mouth = c.st > 0.25 && c.st < 1.5 ? clamp(Math.sin(((c.st - 0.25) / 1.25) * Math.PI) * 1.2, 0, 1) : 0
          if (c.st > 1.7) { c.mouth = 0; go('sit') }
          break
        case 'roll': {
          // down onto her side, over onto her back with her paws in the air, then up again
          pose = 'lie'
          const st = c.st
          c.roll = st < 0.6 ? 0 : st < 1.2 ? (st - 0.6) / 0.6 : st < 3.4 ? 1 : st < 4 ? 1 - (st - 3.4) / 0.6 : 0
          if (st > 4.3) { c.roll = 0; go('sit') }
          break
        }
        case 'doze': {
          pose = 'loaf'
          c.zAt = (c.zAt ?? 0) - dt
          if (c.zAt <= 0) { c.zAt = 1.2; c.fx.push({ g: 'z', x: 4, y: 0, vy: 14, life: 2, t: 0, d: 0, drift: 1 }) }
          if (c.st > (c.sleepFor || 14)) go('stretch', { next: c.thenLeave ? 'leave' : 'sit' })
          break
        }
        case 'stretch':
          pose = 'stretch'
          c.mouth = c.st > 0.3 && c.st < 1.1 ? 0.6 : 0
          if (c.st > 1.6) {
            c.mouth = 0
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
          if (k === 'yawn') c.mouth = c.st > 0.3 && c.st < 1.6 ? 1 : 0
          if (c.st > 2.8) {
            c.mouth = 0
            if (c.leave) walkTo(offscreen(), 'gone', 52)
            else { faceIn(); go('sit'); c.watchFor = Math.max(c.watchFor, c.t + rnd(25, 35)) }
          }
          break
        }
        case 'tamed':
          pose = 'sit'
          if (c.st > 2.4) {
            c.followUntil = c.t + (fine && L.mode === 'margin' ? 22 : 0)
            if (coarse || L.mode === 'corner') go('doze', { sleepFor: rnd(7, 10), thenLeave: true })
            else go('sit')
          }
          break
        default:
          break
      }
      if (!cat) return
      if (c.state !== 'roll' && c.roll > 0) c.roll = Math.max(0, c.roll - dt * 2.5)
      if (!['yawn', 'stretch', 'mock'].includes(c.state) && c.mouth > 0) c.mouth = Math.max(0, c.mouth - dt * 3)

      // ---------- small life ----------
      if ((c.blinkAt -= dt) <= 0) { c.blinkAt = rnd(2.2, 5.5); c.blinkT = 0.16 }
      let blink = 0
      if (c.blinkT > 0) { c.blinkT -= dt; blink = Math.sin((1 - c.blinkT / 0.16) * Math.PI) }
      if (c.slowBlink > 0) {
        // the slow blink: a cat's way of saying she trusts you
        c.slowBlink += dt
        const sb = c.slowBlink
        blink = sb < 0.5 ? sb / 0.5 : sb < 1.2 ? 1 : sb < 1.7 ? 1 - (sb - 1.2) / 0.5 : 0
        if (sb >= 1.7) c.slowBlink = 0
      }
      if (c.purrT > 0) blink = Math.max(blink, 0.65) // contented, half-closed eyes
      if ((c.swishAt -= dt) <= 0) { c.swishAt = rnd(3.5, 8); c.swishT = 1.3 }
      if (c.swishT > 0) c.swishT -= dt
      const busyTail = c.swishT > 0 || c.state === 'stalk' || (c.state === 'mock' && c.mock === 'back')
      c.swish += ((busyTail ? 0.45 : 0.05) - c.swish) * Math.min(1, dt * 5)
      if ((c.twitchAt -= dt) <= 0) { c.twitchAt = rnd(3, 8); c.twitchT = 0.25 }
      c.twitchT -= dt
      if (scrollV > 2500 && pose === 'sit') { c.wideT = 0.6; c.earBackT = 0.6 }
      c.earBackT = Math.max(0, c.earBackT - dt)
      c.wideT = Math.max(0, c.wideT - dt)
      c.meowT = Math.max(0, c.meowT - dt)
      c.tiltT = Math.max(0, c.tiltT - dt)

      // petting: a slow pointer stroking her, or a finger dragged across her
      const strokingMouse = fine && px != null && onCatBox(px, py) && speed > 25 && speed < 900
      const strokingTouch = touchDown && touchDown.moved > 12 && touchDown.onCat
      if (strokingMouse || strokingTouch) {
        c.petT += dt
        c.petTotal += dt
        if (!c.tamed && c.petTotal > 1.2 && !['run', 'startle', 'mock'].includes(c.state)) tame('pet')
        else if (c.purrT <= 0) say('Purrr...', 1600)
        c.purrT = 0.9
        if (c.petT > 0.55) { c.petT = 0; pop('heart', 1, 8) }
      }
      c.purrT = Math.max(0, c.purrT - dt)

      // eyes and head: on the pointer if there is one, otherwise glancing about the page
      let tx = null, ty = null
      if (pointerLive) { tx = px; ty = py }
      else if (c.glance && (c.glanceAt -= dt) > 0) { [tx, ty] = c.glance }
      else if (!fine) { tx = innerWidth / 2; ty = innerHeight * 0.4 }
      const lk = tx != null ? [clamp((tx - head[0]) / 200, -1, 1), clamp((ty - head[1]) / 200, -1, 1)] : [0, 0]
      c.look[0] += (lk[0] - c.look[0]) * Math.min(1, dt * 9)
      c.look[1] += (lk[1] * 0.8 - c.look[1]) * Math.min(1, dt * 9)

      // ---------- pose ----------
      const base = {
        walk: POSES.walk, run: POSES.run, jump: POSES.run, sit: POSES.sit, groom: POSES.sit, scratch: POSES.sit,
        loaf: POSES.loaf, stretch: POSES.stretch, crouch: POSES.crouch, lie: POSES.lie,
        puff: { ...POSES.walk, gait: 0, ear: 1, tail: [1.6, 0.0, 0.02], hip: [-20, -32], sh: [19, -33] },
      }[pose] || POSES.sit
      const target = { ...base, mouth: Math.max(c.mouth, c.meowT > 0 ? Math.sin((c.meowT / 0.55) * Math.PI) * 0.55 : 0), eye: pose === 'loaf' ? 0 : pose === 'stretch' ? 0.25 : pose === 'groom' ? 0.3 : 1 }
      if (c.earBackT > 0) target.ear = 0.9
      if (pose === 'crouch' && c.wiggle) target.hip = [base.hip[0] + Math.sin(c.t * 22) * 1.6, base.hip[1]]
      if (pose === 'groom') target.tilt = 0.45 + Math.sin(c.t * 9) * 0.06
      if (pose === 'scratch') target.tilt = 0.32
      if (pose === 'lie' && c.roll > 0.9) {
        // paws paddling in the air
        const w = (k) => Math.sin(c.t * 7 + k) * 3
        target.feet = { lf: [21 + w(0), -2 + w(1)], rf: [18 + w(2), -1 + w(3)], lh: [-6 + w(4), -2 + w(5)], rh: [-9 + w(6), -1 + w(7)] }
      }
      easePose(c.p, target, pose === 'jump' || pose === 'puff' ? Math.min(1, dt * 16) : 1 - Math.exp(-dt / 0.15))
      const faceWant = (['sit', 'loaf', 'lie', 'scratch'].includes(pose) && !(c.state === 'mock' && c.mock === 'back')) || c.meowT > 0 ? 1 : 0
      c.face += (faceWant - c.face) * Math.min(1, dt * 7)
      const tiltClick = c.tiltT > 0 ? Math.sin(Math.min(1, (1.3 - c.tiltT) / 0.25) * Math.PI * 0.5) * 0.3 * c.tiltDir * Math.min(1, c.tiltT / 0.3) : 0
      const tiltLook = c.face > 0.5 ? c.look[0] * c.dir * 0.06 : 0

      // ---------- draw ----------
      const dpr = Math.min(2, devicePixelRatio || 1)
      const CW = 230 * K, CH = 150 * K
      if (cv.width !== Math.round(CW * dpr)) {
        cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr)
        cv.style.width = `${CW}px`; cv.style.height = `${CH}px`
      }
      const ox = 115 * K, oy = 140 * K // her ground point inside the canvas, CSS px
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
      const box = drawCat(ctx, {
        pose: c.p, cyc: pose === 'jump' ? 0.3 : c.cyc, gaitKind: pose === 'run' || pose === 'jump' ? 'run' : 'walk', t: c.t,
        palette, dark, dir: c.dir, face: c.face, look: c.look, blink, pupil: c.wideT > 0 || pose === 'crouch' ? 0.95 : c.purrT > 0 ? 0.35 : 0.5,
        breath: ['sit', 'loaf', 'lie', 'scratch', 'groom'].includes(pose) ? (pose === 'loaf' ? 1.6 : 0.8) : 0, purr: c.purrT > 0,
        groom: pose === 'groom' ? [POSES.sit.sh[0] + 13 + Math.sin(c.t * 9) * 1.5, POSES.sit.sh[1] - 4] : null,
        scratch: scratchAt, swish: c.swish, flick: c.state === 'mock' && c.mock === 'back', earTwitch: c.twitchT > 0,
        headTilt: tiltClick + tiltLook,
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
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
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

      // the part you can click or stroke: her body and head
      const bx0 = c.x + (c.dir > 0 ? box.x0 : -box.x1) * K, bx1 = c.x + (c.dir > 0 ? box.x1 : -box.x0) * K
      const w = Math.max(48, bx1 - bx0 + 8), hh = Math.max(48, (box.y1 - box.y0) * K + 8)
      c.hit = [clamp((bx0 + bx1) / 2 - w / 2, 0, innerWidth - w), floor - hh - lift + 2, w, hh]
      hb.style.transform = `translate3d(${c.hit[0]}px, ${c.hit[1]}px, 0)`
      hb.style.width = `${w}px`; hb.style.height = `${hh}px`
      hb.style.pointerEvents = ['run', 'startle'].includes(c.state) || (c.state === 'walk' && c.then === 'gone') ? 'none' : 'auto'

      const nw = nt.offsetWidth
      nt.style.transform = `translate3d(${clamp(c.x - nw / 2, 8, innerWidth - nw - 8)}px, ${floor - 108 * K - lift}px, 0)`

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
      if (!cat || e.target === hb) return
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
    let missCandidate = null
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
      scrollV = Math.max(scrollV, (Math.abs(scrollY - lastScrollY) / Math.max(16, t - lastScrollT)) * 1000)
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
    const onResize = () => {
      if (!cat) return
      const L = layout()
      const was = cat.L
      if (L.mode !== was.mode || (L.mode === 'margin' && was.mode === 'margin' && (cat.x < 0 || cat.x > innerWidth))) {
        // her patch of screen is gone: she quietly leaves, and comes back later
        finish(); return
      }
      // same kind of patch: keep her side, and move the bounds
      if (L.mode === 'margin') {
        const m = (innerWidth - COL) / 2, K = L.K
        const x0 = was.side < 0 ? 14 + 40 * K : innerWidth - m + 14 + 40 * K
        const x1 = was.side < 0 ? m - 14 - 40 * K : innerWidth - 14 - 40 * K
        cat.L = { ...L, side: was.side, x0: Math.min(x0, x1), x1: Math.max(x0, x1) }
      } else cat.L = L
      if (!['walk', 'run'].includes(cat.state)) cat.x = clamp(cat.x, cat.L.x0, cat.L.x1)
      else cat.goal = clamp(cat.goal, Math.min(cat.L.x0, cat.goal), Math.max(cat.L.x1, cat.goal))
    }
    // for testing: ?catdebug lets a script put her in a given state
    if (/catdebug/.test(location.search)) window.__cat = { go: (st, x) => cat && go(st, x || {}), get: () => cat }

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerout', onOut)
    addEventListener('pointerdown', onDownAnywhere, { capture: true, passive: true })
    addEventListener('pointerup', onUp, { passive: true })
    addEventListener('pointercancel', onUp, { passive: true })
    addEventListener('scroll', onScroll, { passive: true })
    hb.addEventListener('pointerdown', onHit)
    addEventListener('cat:call', onCall)
    addEventListener('resize', onResize)
    return () => {
      clearInterval(tick); clearInterval(decay); cancelAnimationFrame(raf); clearTimeout(noteTimer); mo.disconnect()
      removeEventListener('pointermove', onMove); removeEventListener('pointerout', onOut)
      removeEventListener('pointerdown', onDownAnywhere, { capture: true })
      removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp)
      removeEventListener('scroll', onScroll)
      hb.removeEventListener('pointerdown', onHit)
      removeEventListener('cat:call', onCall)
      removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-[35] hidden overflow-hidden print:!hidden" aria-hidden="true">
      <canvas ref={canvas} className="absolute left-0 top-0" />
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
