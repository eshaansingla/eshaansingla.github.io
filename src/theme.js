import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const root = () => document.documentElement
const current = () => (root().classList.contains('dark') ? 'dark' : 'light')

/** Read a CSS custom property (theme-aware colours for canvas drawing). */
export const cssVar = (name, el = root()) => getComputedStyle(el).getPropertyValue(name).trim()

/** Re-run `fn` whenever the theme class flips. */
export function onThemeChange(fn) {
  const mo = new MutationObserver(fn)
  mo.observe(root(), { attributes: true, attributeFilter: ['class'] })
  return () => mo.disconnect()
}

export function useTheme() {
  const [theme, setTheme] = useState(current)

  useEffect(() => onThemeChange(() => setTheme(current())), [])

  // follow the OS until the visitor picks
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const f = (e) => {
      let saved = null
      try { saved = localStorage.getItem('theme') } catch { /* private mode */ }
      if (!saved) root().classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  const toggle = useCallback((e) => {
    const next = current() === 'dark' ? 'light' : 'dark'
    const apply = () => {
      root().classList.toggle('dark', next === 'dark')
      try { localStorage.setItem('theme', next) } catch { /* ignore */ }
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduced) return apply()
    const x = e?.clientX ?? innerWidth - 40
    const y = e?.clientY ?? 24
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const t = document.startViewTransition(() => flushSync(apply))
    t.ready.then(() => {
      root().animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }, [])

  return { theme, toggle }
}
