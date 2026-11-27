import { useEffect, useRef, useSyncExternalStore } from 'react'
import { POSES, clonePose, drawCat, easePose, makePalette } from './cat'

/*
  Now and then a cat wanders in along the bottom of the screen, sits down and watches you.
  Leave her be and she just sits there, blinking and swishing her tail, following your pointer with her eyes.
  Walk up slowly and click her and she is tamed. Rush her, or miss, and she lets you know what she thinks.
  She keeps to the empty margins on wide screens and to the bottom corner on narrow ones.
*/

// ---------- score, shared with the footer ----------
const KEY = 'cat-tamed'
let tally = { tamed: 0, escaped: 0, allTime: 0, present: false, visits: 0 }
try { tally.allTime = Number(localStorage.getItem(KEY)) || 0 } catch { /* storage off */ }
const subs = new Set()
const emit = () => { tally = { ...tally }; subs.forEach((f) => f()) }
const setTally = (patch) => { Object.assign(tally, patch); emit() }
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
  { kind: 'flick', text: 'She turns her back and flicks her tail.' },
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

    let cat = null, raf = 0, prev = 0, nextAt = performance.now() + 20000
    let px = null, py = null, pvx = 0, pvy = 0, lastMove = 0
    let palette = null, dark = false, noteTimer = 0

    const readTheme = () => {
      dark = document.documentElement.classList.contains('dark')
      palette = makePalette(getComputedStyle(document.documentElement).getPropertyValue('--signal') || '#c2410c')
    }

    const say = (text, ms = 2600) => {
      if (!cat) return
      nt.textContent = text
      nt.style.opacity = '1'
      clearTimeout(noteTimer)
      noteTimer = setTimeout(() => { nt.style.opacity = '0' }, ms)
    }

    // where she may be: the margin beside the text column, or the bottom-left corner when there is none
    const layout = () => {
      const W = innerWidth, m = (W - COL) / 2
      const S = W < 640 ? 0.95 : W < 1100 ? 1.05 : 1.2
      if (m >= 170) {
        const side = Math.random() < 0.5 ? -1 : 1
        const x0 = side < 0 ? 10 + 48 * S : W - m + 10 + 48 * S
        const x1 = side < 0 ? m - 10 - 48 * S : W - 10 - 48 * S
        return { S, side, x0, x1, mode: 'margin' }
      }
      const spot = m >= 90 ? m / 2 : 5 * S // on a phone she only peeks in: head and one paw
      return { S, side: -1, x0: spot, x1: spot, mode: 'corner' }
    }

    const go = (state, extra = {}) => { Object.assign(cat, { state, st: 0 }, extra) }
    const poseTo = (name) => { cat.want = POSES[name] }
    const offscreen = () => (cat.L.side < 0 ? -90 * cat.L.S : innerWidth + 90 * cat.L.S)

    const spawn = () => {
      readTheme()
      const L = layout()
      const fromX = L.side < 0 ? -90 * L.S : innerWidth + 90 * L.S
      cat = {
        L, x: fromX, dir: L.side < 0 ? 1 : -1, pose: clonePose(POSES.walk), want: POSES.walk, gaitKind: 'walk', cyc: 0,
        t: 0, st: 0, state: 'walk', goal: rnd(L.x0, L.x1), then: 'watch', speed: 52,
        face: 0, look: [0, 0], blink: 0, blinkAt: 2, swish: 0, swishAt: rnd(3, 6), twitchAt: rnd(2, 5), earTwitch: false,
        purr: false, breath: 0, pupil: 0.5, groom: null, headTilt: 0, flick: false,
        watchFor: coarse ? rnd(18, 26) : rnd(45, 60), misses: 0, counted: false, glance: [0, 0], glanceAt: 0,
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
      nextAt = performance.now() + (coarse ? rnd(60000, 120000) : rnd(50000, 110000))
      setTally({ present: false })
    }

    const escape = () => {
      if (!cat.counted) { cat.counted = true; setTally({ escaped: tally.escaped + 1 }) }
    }

    const mock = (leaveAfter) => {
      const m = pick(MOCKS)
      cat.mock = m.kind
      cat.leaveAfter = leaveAfter
      if (leaveAfter) escape()
      go('mock')
      say(m.text, 2800)
    }

    const tame = () => {
      if (!cat.counted) {
        cat.counted = true
        tally.allTime++
        try { localStorage.setItem(KEY, String(tally.allTime)) } catch { /* storage off */ }
        setTally({ tamed: tally.tamed + 1 })
      }
      go('tamed')
      say('Tamed. She trusts you now.', 3000)
      navigator.vibrate?.(20)
    }

    const tryCatch = () => {
      if (!cat) return
      const s = cat.state
      if (s === 'tamed' || s === 'loaf') { cat.slowBlink = 1.4; cat.purrFor = 2.5; say('Purr.', 1400); return }
      if (['bolt', 'leave', 'mock', 'stretch', 'startle'].includes(s)) return
      // on a touch screen a cat on the move may still slip away
      if (coarse && (s === 'walk') && Math.random() < 0.5) { miss(); return }
      tame()
    }

    const miss = () => {
      if (!cat || ['bolt', 'leave', 'mock', 'tamed', 'loaf', 'stretch'].includes(cat.state)) return
      cat.misses++
      if (cat.misses >= 2) { mock(true); return }
      // a little hop away, then the look
      const L = cat.L
      const away = cat.x + (px != null && px > cat.x ? -1 : 1) * 40 * L.S
      cat.goal = clamp(away, L.mode === 'corner' ? L.x0 : L.x0, L.mode === 'corner' ? L.x0 + 30 * L.S : L.x1)
      cat.then = 'mockStay'
      go('run', { speed: 170 })
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!cat) { raf = 0; return }
      const c = cat, L = c.L, S = L.S
      c.t += dt; c.st += dt
      const floor = innerHeight - 6
      const ek = 1 - Math.exp(-dt / 0.16)

      // where the pointer is, and how fast it is coming
      const head = [c.x + c.dir * 12 * S, floor - 50 * S]
      const d = px == null ? Infinity : Math.hypot(px - c.x, py - (floor - 30 * S))
      const speed = Math.hypot(pvx, pvy)
      const approaching = px != null && ((c.x - px) * pvx + (floor - 30 * S - py) * pvy) > 0

      // move towards a goal
      const walkTo = (onArrive) => {
        const dx = c.goal - c.x
        if (Math.abs(dx) < 2) { onArrive(); return }
        c.dir = dx > 0 ? 1 : -1
        const v = c.speed * S
        c.x += Math.sign(dx) * Math.min(Math.abs(dx), v * dt)
        const run = c.gaitKind === 'run'
        const T = ((run ? 30 : 26) * S) / ((run ? 0.45 : 0.62) * v)
        c.cyc += dt / T
      }
      const faceIn = () => { c.dir = L.side < 0 ? 1 : -1 }

      switch (c.state) {
        case 'walk':
          poseTo('walk'); c.gaitKind = 'walk'; c.face += (0 - c.face) * ek
          if (fine && c.then !== 'gone' && d < 150 * S && speed > 900 && approaching) { go('startle'); break }
          walkTo(() => go(c.then))
          break
        case 'run':
          poseTo('run'); c.gaitKind = 'run'; c.face += (0 - c.face) * ek
          walkTo(() => {
            if (c.then === 'mockStay') { faceIn(); const m = pick(MOCKS); c.mock = m.kind; c.leaveAfter = false; go('mock'); say(m.text, 2600) }
            else if (c.then === 'mockLeave') { faceIn(); mock(true) }
            else if (c.then === 'gone') finish()
            else go(c.then)
          })
          break
        case 'watch': {
          // sitting, studying you
          faceIn()
          poseTo('sit'); c.face += (1 - c.face) * ek
          if (fine && d < 150 * S && speed > 900 && approaching) { go('startle'); break }
          c.pupil += ((d < 150 * S ? 0.95 : 0.45) - c.pupil) * ek
          if (c.st > c.watchFor) { go('stretch'); c.then = 'leave' }
          break
        }
        case 'startle':
          poseTo('crouch'); c.face += (0 - c.face) * ek * 2; c.pupil = 1
          if (c.st > 0.3) {
            escape()
            if (L.mode === 'margin') {
              const far = Math.abs(L.x0 - c.x) > Math.abs(L.x1 - c.x) ? L.x0 : L.x1
              c.goal = far; c.then = 'mockLeave'
            } else { c.goal = offscreen(); c.then = 'gone' ; say('Too fast. She bolts.', 2000) }
            go('run', { speed: 230 })
          }
          break
        case 'mock': {
          const k = c.mock
          poseTo('sit')
          if (k === 'yawn') {
            c.face += (1 - c.face) * ek
            c.want = { ...POSES.sit, mouth: c.st > 0.3 && c.st < 1.7 ? 1 : 0, eye: c.st > 0.3 && c.st < 1.7 ? 0.12 : 1, tilt: c.st > 0.3 && c.st < 1.7 ? -0.3 : 0 }
          } else if (k === 'groom') {
            c.face += (0 - c.face) * ek
            const lick = c.st > 0.4 && c.st < 2.4
            c.want = { ...POSES.sit, tilt: lick ? 0.45 + Math.sin(c.t * 9) * 0.08 : 0, eye: lick ? 0.3 : 1 }
            c.groom = lick ? [POSES.sit.sh[0] + 13, POSES.sit.sh[1] - 4] : null
          } else {
            // back turned, tail flicking
            c.dir = L.side < 0 ? -1 : 1
            c.face += (0 - c.face) * ek
            c.flick = c.st < 2.2
          }
          if (c.st > 2.8) {
            c.groom = null; c.flick = false
            if (c.leaveAfter) { c.goal = offscreen(); c.then = 'gone'; go('walk', { speed: 60 }) } else go('watch', { watchFor: c.st + rnd(14, 22) })
          }
          break
        }
        case 'tamed':
          faceIn()
          poseTo('sit'); c.face += (1 - c.face) * ek
          c.purr = true; c.pupil += (0.6 - c.pupil) * ek
          if (c.st < 2.4) c.slowBlink = Math.max(c.slowBlink || 0, 0.01)
          if (c.st > 3) { go(coarse ? 'stretch' : 'loaf'); if (coarse) c.then = 'leave' }
          break
        case 'loaf':
          faceIn()
          poseTo('loaf'); c.face += (1 - c.face) * ek
          c.purr = (c.purrFor || 0) > 0
          c.breath = 1
          if (c.st > 25) { c.breath = 0; go('stretch'); c.then = 'leave' }
          break
        case 'stretch':
          poseTo('stretch'); c.face += (0 - c.face) * ek; c.purr = false
          if (c.st > 1.5) { c.goal = offscreen(); go('walk', { speed: 55, then: 'gone' }); c.then = 'gone' }
          break
        case 'gone':
          finish()
          return
        default:
          break
      }
      if (c.state === 'walk' && c.then === 'gone' && (c.x < -80 * S || c.x > innerWidth + 80 * S)) { finish(); return }

      // small life: blinks, tail swishes, ear twitches, glances
      if ((c.blinkAt -= dt) <= 0) { c.blinkAt = rnd(2.2, 6); c.blinkT = 0.2 }
      if (c.blinkT > 0) { c.blinkT -= dt; c.blink = Math.sin((1 - c.blinkT / 0.2) * Math.PI) } else c.blink = 0
      if (c.slowBlink > 0) {
        // the slow blink: a cat's "I trust you"
        c.slowBlink += dt
        const sb = c.slowBlink
        c.blink = sb < 0.7 ? sb / 0.7 : sb < 1.3 ? 1 : sb < 2 ? 1 - (sb - 1.3) / 0.7 : 0
        if (sb >= 2) c.slowBlink = 0
      }
      if (c.purrFor > 0) c.purrFor -= dt
      if ((c.swishAt -= dt) <= 0) { c.swishAt = rnd(4, 9); c.swishT = 1.4 }
      if (c.swishT > 0) { c.swishT -= dt; c.swish = Math.sin((1 - c.swishT / 1.4) * Math.PI) * 0.3 } else c.swish = 0
      if ((c.twitchAt -= dt) <= 0) { c.twitchAt = rnd(3, 8); c.twitchT = 0.25 }
      c.earTwitch = (c.twitchT -= dt) > 0

      // eyes: on the pointer if there is one, otherwise glancing about the page
      let tx, ty
      if (fine && px != null && now - lastMove < 6000) { tx = px; ty = py }
      else {
        if ((c.glanceAt -= dt) <= 0) { c.glanceAt = rnd(1.5, 4); c.glance = [rnd(innerWidth * 0.25, innerWidth * 0.75), rnd(innerHeight * 0.2, innerHeight * 0.7)] }
        ;[tx, ty] = c.glance
      }
      const lx = clamp((tx - head[0]) / 260, -1, 1), ly = clamp((ty - head[1]) / 260, -1, 1)
      c.look[0] += (lx - c.look[0]) * ek * 1.5
      c.look[1] += (ly * 0.8 - c.look[1]) * ek * 1.5
      c.headTilt += ((c.face > 0.5 ? c.look[0] * c.dir * 0.08 : 0) - c.headTilt) * ek

      easePose(c.pose, c.want, ek)
      if (c.state !== 'mock' || c.mock !== 'groom') c.groom = c.groom && c.state === 'mock' ? c.groom : null

      // draw
      const dpr = Math.min(2, devicePixelRatio || 1)
      const CW = 220 * S, CH = 140 * S
      if (cv.width !== Math.round(CW * dpr)) { cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr); cv.style.width = `${CW}px`; cv.style.height = `${CH}px` }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.setTransform(dpr * S * c.dir, 0, 0, dpr * S, dpr * 110 * S, dpr * 128 * S)
      const box = drawCat(ctx, {
        pose: c.pose, cyc: c.cyc, gaitKind: c.gaitKind, t: c.t, dark, palette, dir: c.dir,
        breath: c.breath, purr: c.purr, blink: c.blink, look: c.look, face: clamp(c.face, 0, 1), pupil: c.pupil,
        groom: c.groom, flick: c.flick, swish: c.swish, earTwitch: c.earTwitch, headTilt: c.headTilt,
      })
      cv.style.transform = `translate3d(${c.x - 110 * S}px, ${floor - 128 * S}px, 0)`

      // the part you can click: her body and head, never the empty canvas around her
      const bx0 = c.dir > 0 ? c.x + box.x0 * S : c.x - box.x1 * S
      const bx1 = c.dir > 0 ? c.x + box.x1 * S : c.x - box.x0 * S
      const w = Math.max(44, bx1 - bx0 + 8), h = Math.max(44, (box.y1 - box.y0) * S + 6)
      hb.style.transform = `translate3d(${clamp((bx0 + bx1) / 2 - w / 2, 0, innerWidth - w)}px, ${floor - h + 2}px, 0)`
      hb.style.width = `${w}px`; hb.style.height = `${h}px`
      hb.style.pointerEvents = ['leave', 'bolt'].includes(c.state) || (c.state === 'run' && c.then === 'gone') ? 'none' : 'auto'

      // the caption sits above her, kept on screen
      const nw = nt.offsetWidth
      nt.style.transform = `translate3d(${clamp(c.x - nw / 2, 8, innerWidth - nw - 8)}px, ${floor - 112 * S}px, 0)`

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
    const onDownAnywhere = (e) => {
      if (!cat || e.target === hb) return
      const floor = innerHeight - 6
      const d = Math.hypot(e.clientX - cat.x, e.clientY - (floor - 30 * cat.L.S))
      if (d < 110 * cat.L.S) { px = e.clientX; py = e.clientY; miss() }
    }
    const onHit = (e) => { e.stopPropagation(); e.preventDefault(); tryCatch() }
    const decay = setInterval(() => { if (performance.now() - lastMove > 150) { pvx = 0; pvy = 0 } }, 100)

    const busy = () => {
      const a = document.activeElement
      return document.hidden || (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) ||
        document.querySelector('[aria-label="Close menu"]')
    }
    const tick = setInterval(() => {
      if (cat || busy() || performance.now() < nextAt) return
      if (!tally.visits && scrollY < innerHeight * 0.6) return
      if (Math.random() < 0.35) { nextAt = performance.now() + rnd(8000, 20000); return } // keep it a surprise
      spawn()
    }, 1000)
    const onCall = () => { if (!cat) spawn() }

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerdown', onDownAnywhere, { capture: true, passive: true })
    hb.addEventListener('pointerdown', onHit)
    addEventListener('cat:call', onCall)
    return () => {
      clearInterval(tick); clearInterval(decay); cancelAnimationFrame(raf); clearTimeout(noteTimer)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerdown', onDownAnywhere, { capture: true })
      hb.removeEventListener('pointerdown', onHit)
      removeEventListener('cat:call', onCall)
    }
  }, [])

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-[35] hidden overflow-hidden print:!hidden" aria-hidden="true">
      <canvas ref={canvas} className="absolute left-0 top-0" />
      <div ref={hit} className="absolute left-0 top-0 cursor-pointer touch-manipulation" data-cursor role="presentation" />
      <p
        ref={note}
        className="absolute left-0 top-0 whitespace-nowrap font-mono text-[11px] italic text-ink-2 opacity-0 transition-opacity duration-300 [text-shadow:0_0_6px_var(--canvas),0_0_2px_var(--canvas)]"
      />
    </div>
  )
}

/** The line at the foot of the page, once she has visited. */
export function CatTally() {
  const t = useCatTally()
  if (!t.visits) return null
  const parts = [`Cats tamed: ${t.tamed}`]
  if (t.escaped) parts.push(`got away: ${t.escaped}`)
  if (t.allTime > t.tamed) parts.push(`${t.allTime} across visits`)
  return (
    <p className="mt-2 font-mono text-[11px] leading-relaxed text-mute">
      {parts.join(', ')}.{' '}
      {!t.present && (
        <button type="button" onClick={callCat} className="text-signal underline decoration-signal/40 underline-offset-2 hover:decoration-signal">
          call her back
        </button>
      )}
    </p>
  )
}
