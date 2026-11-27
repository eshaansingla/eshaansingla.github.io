import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// the Rocket League snapshot date: when src/assets/rl.json was last committed (empty outside git)
const rlDate = () => {
  try { return execSync('git log -1 --format=%cs -- src/assets/rl.json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()), __RL_DATE__: JSON.stringify(rlDate()) },
})
