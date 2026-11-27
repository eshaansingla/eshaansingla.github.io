import resumeUrl from './assets/Eshaan_Singla_Resume.pdf'
// Single source of truth for all site content.
// Sources: résumé (Nov 2026), the project repositories on github.com/eshaansingla, LeetCode, Codeforces and tracker.gg.

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
  { label: 'Rocket League', handle: 'EshaanS_05', href: 'https://rocketleague.tracker.network/rocket-league/profile/epic/EshaanS_05/overview' },
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

export const competitive = {
  leetcode: {
    rating: 1541,
    top: '34.7%',
    solved: 576,
    easy: 267,
    medium: 282,
    hard: 27,
    href: 'https://leetcode.com/u/eshaansingla/',
  },
  codeforces: {
    rating: 1268,
    rank: 'Pupil',
    href: 'https://codeforces.com/profile/EshaanSingla',
  },
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
  3: { label: 'LeetCode', text: 'Contest rating 1541 (top 34.7%), 576 solved: 267 easy, 282 medium, 27 hard', href: 'https://leetcode.com/u/eshaansingla/' },
  4: { label: 'Codeforces', text: 'Rating 1268, Pupil', href: 'https://codeforces.com/profile/EshaanSingla' },
  5: { label: 'Pran', text: 'Optical eardrum sensing: firmware, 146-subject study, 14 models, leakage audit', href: 'https://github.com/eshaansingla/Pran' },
  6: { label: 'FIN-X (live)', text: 'finx-pi.vercel.app, real-time NSE intelligence', href: 'https://finx-pi.vercel.app' },
  7: { label: 'FIN-X (code)', text: 'github.com/eshaansingla/finx', href: 'https://github.com/eshaansingla/finx' },
  8: { label: 'Sanchaalan Saathi', text: 'sanchaalan-saathi.vercel.app, NGO coordination platform', href: 'https://sanchaalan-saathi.vercel.app' },
  9: { label: 'NyaayaBot', text: 'github.com/eshaansingla/NyaayaBot', href: 'https://github.com/eshaansingla/NyaayaBot' },
  10: { label: 'License-Plate-Detection', text: 'YOLOv8L detection and tracking', href: 'https://github.com/eshaansingla/License-Plate-Detection' },
  11: { label: 'AETHER', text: 'Desktop GenAI assistant; evaluation run of 6 decoding strategies', href: 'https://github.com/eshaansingla/Aether' },
  12: { label: 'Parkinson’s Early Prediction', text: 'Voice CNN + tremor DNN fusion (ELC internship)', href: 'https://github.com/eshaansingla/ParkinsonsEarlyPrediction' },
}

// Rocket League, snapshot from rocketleague.tracker.network (Epic, PC), 27 Nov 2026
export const rocketLeague = {
  handle: 'EshaanS_05',
  platform: 'Epic, PC',
  season: 'Season 24',
  rewardLevel: 'Platinum',
  snapshot: '27 Nov 2026',
  href: 'https://rocketleague.tracker.network/rocket-league/profile/epic/EshaanS_05/overview',
  allTimeBest: { rating: 680, playlist: 'Doubles 2v2', season: 'Season 18' },
  playlists: [
    { id: '2v2', name: 'Doubles', mode: '2v2', tier: 'Platinum', tierN: 1, div: 1, rating: 655, peak: 655, best: 680, bestSeason: 'S18', matches: 744, streak: 2, nextDiv: 4, main: true },
    { id: '3v3', name: 'Standard', mode: '3v3', tier: 'Gold', tierN: 1, div: 3, rating: 507, peak: 524, best: 565, bestSeason: 'S14', matches: 10, streak: 2, nextDiv: 10 },
    { id: '1v1', name: 'Duel', mode: '1v1', tier: 'Gold', tierN: 1, div: 3, rating: 491, peak: 491, best: 638, bestSeason: 'S16', matches: 4, streak: 1 },
    { id: 'tour', name: 'Tournaments', mode: '3v3', tier: 'Platinum', tierN: 1, div: 3, rating: 680, peak: 680, best: 680, bestSeason: 'S24', matches: 20, streak: 1, nextDiv: 17 },
    { id: 'hoops', name: 'Hoops', mode: '2v2', tier: 'Gold', tierN: 3, div: 3, rating: 615, matches: 0, streak: 1, top: 'Top 44%' },
    { id: 'heat', name: 'Heatseeker', mode: '2v2', tier: 'Gold', tierN: 2, div: 1, rating: 518, peak: 580, matches: 24, streak: 2, nextDiv: 1 },
  ],
  lifetime: [
    { k: 'Saves', v: 7066, top: 'Top 20%' },
    { k: 'MVPs', v: 1146, top: 'Top 30%' },
    { k: 'Shots', v: 13185, top: 'Top 34%' },
    { k: 'Wins', v: 2114, top: 'Top 39%' },
    { k: 'Goals', v: 5792, top: 'Top 40%' },
    { k: 'Assists', v: 1380 },
  ],
  goalShot: 43.9,
}
