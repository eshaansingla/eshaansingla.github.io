import { useEffect, useState } from 'react'

// A slim contents list in the empty left margin of wide screens, following the section you are reading.
const ITEMS = [
  ['work', '1', 'Selected work'],
  ['icp', '1.1', 'Pran', true],
  ['finx', '1.2', 'FIN-X', true],
  ['sanchaalan', '1.3', 'Sanchaalan Saathi', true],
  ['lpd', '1.4', 'License plates', true],
  ['aether', '1.5', 'AETHER', true],
  ['nyaaya', '1.6', 'NyaayaBot', true],
  ['experience', '2', 'Research'],
  ['results', '3', 'Results'],
  ['education', '4', 'Education'],
  ['appendix', 'A', 'Appendix'],
  ['off-the-clock', 'B', 'Off the clock'],
  ['references', 'R', 'References'],
]

export default function SideNav() {
  const [active, setActive] = useState(null)
  useEffect(() => {
    // the active section is the last heading that has reached the band just under the header
    // (a jump puts its heading at 84 px, so anything within 140 px of the top counts as current)
    const els = ITEMS.map(([id]) => document.getElementById(id)).filter(Boolean)
    let raf = 0
    const update = () => {
      raf = 0
      const line = Math.min(140, innerHeight * 0.33)
      let cur = null
      els.forEach((el) => { if (el.getBoundingClientRect().top <= line) cur = el.id })
      setActive(cur)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])
  return (
    <nav
      aria-label="Sections"
      className={`fixed left-[max(16px,calc((100vw-1040px)/2-196px))] top-1/2 z-30 hidden w-[172px] -translate-y-1/2 transition-opacity duration-500 min-[1400px]:block ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <ol className="space-y-0.5 border-l border-rule">
        {ITEMS.map(([id, n, label, sub]) => {
          const on = active === id
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={on ? 'location' : undefined}
                className={`-ml-px flex gap-2 border-l py-[3px] font-mono text-[10.5px] leading-snug transition-colors ${sub ? 'pl-5' : 'pl-3'} ${on ? 'border-signal text-signal' : 'border-transparent text-mute hover:text-ink'}`}
              >
                <span className="w-6 shrink-0 opacity-70">{n}</span>
                <span className="truncate">{label}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
