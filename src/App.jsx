import { MotionConfig } from 'framer-motion'
import Header from './components/Header'
import TitleBlock from './components/TitleBlock'
import Paper from './components/Paper'
import Cursor from './components/Cursor'
import SideNav from './components/SideNav'
import ResumePill from './components/ResumePill'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-3 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>
      <Header />
      <TitleBlock />
      <Paper />
      <SideNav />
      <ResumePill />
      <Cursor />
    </MotionConfig>
  )
}
