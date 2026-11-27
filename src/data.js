import resumeUrl from './assets/Eshaan_Singla_Resume.pdf'
import stats from './assets/stats.json'
import rl from './assets/rl.json'

const LC = stats.leetcode, CF = stats.codeforces
// Single source of truth for all site content.
// Sources: résumé (Nov 2026), the project repositories on github.com/eshaansingla, LeetCode and Codeforces.

export const profile = {
  name: 'Eshaan Singla',
  email: 'eshaansingla2807@gmail.com',
  resume: resumeUrl,
}

// Every public profile, in the order they appear on the page
export const profileLinks = [
  { label: 'GitHub', handle: 'eshaansingla', href: 'https://github.com/eshaansingla' },
  { label: 'LinkedIn', handle: 'in/eshaansingla', href: 'https://www.linkedin.com/in/eshaansingla' },
  { label: 'LeetCode', handle: 'eshaansingla', href: 'https://leetcode.com/u/eshaansingla/' },
  { label: 'Codeforces', handle: 'EshaanSingla', href: 'https://codeforces.com/profile/EshaanSingla' },
]

export const education = [
  { title: 'B.E. Computer Science Engineering', org: 'Thapar Institute of Engineering and Technology', period: '2023 – Present', score: 'CGPA 9.00' },
  { title: 'Higher Secondary (PCM)', org: 'Bhupindra International Public School', period: '2021 – 2023', score: '95.6%' },
  { title: 'Secondary (CISCE)', org: 'The British Co-Ed High School', period: '2019 – 2021', score: '96.14%' },
]

export const honors = [
  { title: 'Merit-1 Scholarship', detail: 'Rank 1 in B.E. CSE, JEE Main 98.4 percentile', year: '2023–24' },
  { title: 'ELC Summer Research Fellow', detail: 'Competitively selected among top AI/ML candidates', year: '2025' },
  { title: '500+ DSA problems solved', detail: 'Across LeetCode and Codeforces', year: 'Ongoing' },
]

// LeetCode and Codeforces numbers come from src/assets/stats.json, which a scheduled GitHub Action
// refreshes from both sites every hour (scripts/fetch-stats.mjs)
export const competitive = {
  leetcode: { ...stats.leetcode, href: 'https://leetcode.com/u/eshaansingla/' },
  codeforces: { ...stats.codeforces, href: 'https://codeforces.com/profile/EshaanSingla' },
}

export const skills = [
  {
    group: 'Languages',
    code: 'LANG',
    items: ['Python', 'C++', 'JavaScript / TypeScript', 'SQL', 'HTML / CSS'],
  },
  {
    group: 'AI/ML & Signal Processing',
    code: 'ML/DSP',
    items: ['TensorFlow', 'Keras', 'Scikit-learn', 'XGBoost', 'OpenCV', 'YOLOv8', 'SciPy', 'Pandas', 'NumPy'],
  },
  {
    group: 'Full-Stack & Infra',
    code: 'STACK',
    items: ['React', 'Node.js', 'Express', 'FastAPI', 'PostgreSQL', 'SQLite', 'Git', 'Vercel', 'Render', 'REST / WebSockets'],
  },
]

// Reference list, cited inline as [n]
export const refs = {
  1: { label: 'GitHub', text: 'github.com/eshaansingla, all public code', href: 'https://github.com/eshaansingla' },
  2: { label: 'LinkedIn', text: 'linkedin.com/in/eshaansingla', href: 'https://www.linkedin.com/in/eshaansingla' },
  3: { label: 'LeetCode', text: `Contest rating ${LC.rating} (top ${LC.top}), ${LC.solved} solved: ${LC.easy} easy, ${LC.medium} medium, ${LC.hard} hard`, href: 'https://leetcode.com/u/eshaansingla/' },
  4: { label: 'Codeforces', text: `Rating ${CF.rating}, ${CF.rank}`, href: 'https://codeforces.com/profile/EshaanSingla' },
  5: { label: 'Pran', text: 'Optical eardrum sensing: firmware, 146-subject study, 14 models, leakage audit', href: 'https://github.com/eshaansingla/Pran' },
  6: { label: 'FIN-X (live)', text: 'finx-pi.vercel.app, real-time NSE intelligence', href: 'https://finx-pi.vercel.app' },
  7: { label: 'FIN-X (code)', text: 'github.com/eshaansingla/finx', href: 'https://github.com/eshaansingla/finx' },
  8: { label: 'Sanchaalan Saathi', text: 'sanchaalan-saathi.vercel.app, NGO coordination platform', href: 'https://sanchaalan-saathi.vercel.app' },
  9: { label: 'NyaayaBot', text: 'github.com/eshaansingla/NyaayaBot', href: 'https://github.com/eshaansingla/NyaayaBot' },
  10: { label: 'License-Plate-Detection', text: 'YOLOv8L detection and tracking', href: 'https://github.com/eshaansingla/License-Plate-Detection' },
  11: { label: 'AETHER', text: 'Desktop GenAI assistant; evaluation run of 6 decoding strategies', href: 'https://github.com/eshaansingla/Aether' },
  12: { label: 'Parkinson’s Early Prediction', text: 'Voice CNN + tremor DNN fusion (ELC internship)', href: 'https://github.com/eshaansingla/ParkinsonsEarlyPrediction' },
}

// Rocket League: edit src/assets/rl.json (no public API to pull it from). The snapshot date is the
// date of the last commit that touched that file, so it stays right without editing it by hand.
const fmtDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const rocketLeague = { ...rl, snapshot: fmtDate(__RL_DATE__ || rl.updated) }
