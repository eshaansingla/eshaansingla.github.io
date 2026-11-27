import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { profile } from '../data'

// On phones: once the title block has scrolled away, the résumé stays one tap away,
// and steps aside again at the contact section, which has its own link.
export default function ResumePill() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const contact = document.getElementById('references')
      const atEnd = contact && contact.getBoundingClientRect().top < innerHeight * 0.9
      setShow(scrollY > innerHeight * 1.1 && !atEnd)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])
  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href={profile.resume}
          download
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-ink px-4 py-2.5 font-mono text-[12px] leading-none text-canvas shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)] sm:hidden"
        >
          résumé ↓
        </motion.a>
      )}
    </AnimatePresence>
  )
}
