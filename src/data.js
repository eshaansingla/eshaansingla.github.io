import resumeUrl from './assets/Eshaan_Singla_Resume.pdf'
// Single source of truth for all site content.
// Sources: resume (Nov 2026), github.com/eshaansingla, LeetCode + Codeforces public APIs.

export const profile = {
  name: 'Eshaan Singla',
  role: 'CS Undergraduate · AI/ML + Full-Stack Engineer',
  location: 'Patiala, India',
  headline: 'Making technology perform: find the bottleneck, fix it, prove it.',
  bio: 'B.E. Computer Science undergraduate at Thapar Institute of Engineering and Technology (CGPA: 9.00, Rank 1 Merit Scholar). Focused on bridging real-time distributed systems, applied machine learning, and clinical signal processing.',
  email: 'eshaansingla2807@gmail.com',
  phone: '+91-8847507948',
  resume: resumeUrl,
  links: {
    github: 'https://github.com/eshaansingla',
    linkedin: 'https://www.linkedin.com/in/eshaansingla',
    leetcode: 'https://leetcode.com/u/eshaansingla/',
    codeforces: 'https://codeforces.com/profile/EshaanSingla',
  },
}

export const telemetry = [
  { label: 'CGPA', value: '9.00', note: 'B.E. CSE · TIET' },
  { label: 'MERIT', value: 'R-01', note: 'Rank 1 · Merit-1 Scholar' },
  { label: 'LEETCODE', value: '1541', note: 'Contest rating' },
  { label: 'CODEFORCES', value: '1268', note: 'Pupil' },
]

// Bento layout spans (lg grid is 6 cols)
export const projects = [
  {
    id: 'icp',
    index: '01',
    title: 'Non-Invasive ICP Monitoring System',
    kicker: 'Capstone Research',
    status: 'Ongoing',
    year: '2025–26',
    span: 'md:col-span-2 lg:col-span-4 lg:row-span-2',
    tags: ['Biomedical ML', 'Embedded Systems', 'Full-Stack'],
    summary:
      'Multi-sensor ESP32 rig that estimates intracranial-pressure risk from the ear, without a single incision.',
    pills: [
      { k: 'XGBoost AUC', v: '0.951' },
      { k: 'F1', v: '0.854' },
      { k: 'LSTM AUC', v: '0.896' },
      { k: 'ICU windows', v: '550K+' },
    ],
    description:
      'Multi-sensor ESP32 hardware setup (BPW34 tympanic sensor, MAX30102 PPG, MPU6050 IMU) extracting 6 physiological features via db4 wavelet decomposition & zero-phase Butterworth filtering (50 Hz). Trained XGBoost (AUC 0.951, F1 0.854) and LSTM temporal forecaster (AUC 0.896) across 25+ subjects + MIMIC-III/CHARIS ICU datasets (166 patients, 550K+ windows) with SHAP explainability. Deployed FastAPI + React/TypeScript clinical dashboard; targeting EMBC/INDICON 2026.',
    architecture: [
      { stage: 'Sense', detail: 'BPW34 tympanic · MAX30102 PPG · MPU6050 IMU on ESP32' },
      { stage: 'Condition', detail: 'Zero-phase Butterworth @ 50 Hz · db4 wavelet decomposition' },
      { stage: 'Features', detail: '6 physiological features per window' },
      { stage: 'Model', detail: 'XGBoost classifier + LSTM 15-min-ahead forecaster · SHAP' },
      { stage: 'Validate', detail: '25+ subjects + MIMIC-III WDB / CHARIS (166 patients)' },
      { stage: 'Serve', detail: 'FastAPI inference · React/TS clinical dashboard · CSV export' },
    ],
    metrics: [
      { k: 'XGBoost AUC', v: '0.951' },
      { k: 'XGBoost F1', v: '0.854' },
      { k: 'LSTM forecaster AUC', v: '0.896' },
      { k: 'ICU patients', v: '166' },
      { k: 'Signal windows', v: '550K+' },
      { k: 'Hardware subjects', v: '25+' },
    ],
    stack: ['ESP32', 'Python', 'SciPy', 'PyWavelets', 'XGBoost', 'TensorFlow', 'SHAP', 'FastAPI', 'React', 'TypeScript'],
    links: [{ label: 'GitHub', href: 'https://github.com/eshaansingla/Pran' }],
    visual: 'pulse',
  },
  {
    id: 'finx',
    index: '02',
    title: 'FIN-X',
    kicker: 'Real-Time AI Fintech Platform',
    status: 'Live',
    year: '2026',
    span: 'lg:col-span-2 lg:row-span-2',
    tags: ['Full-Stack', 'AI', 'Finance'],
    summary: 'Real-time NSE market intelligence: institutional deal flow, explained in plain language.',
    pills: [
      { k: 'Render', v: '<200ms' },
      { k: 'Users', v: '100+' },
      { k: 'Req/day', v: '5,000+' },
    ],
    description:
      'Real-time NSE market intelligence platform using WebSockets & React (100+ active users, 5,000+ daily requests in month 1). Engineered a 3-tier LLM router (Llama-3.3-70b, GPT-4o mini, custom rule engine), achieved <200ms rendering latency via two-phase IST-aware WebSocket feeds, and secured auth with JWT rotation, Google OAuth 2.0, and bcrypt-12 (22 API pytest suites).',
    architecture: [
      { stage: 'Ingest', detail: 'NSE bulk & block deals · live price feed' },
      { stage: 'Stream', detail: 'Two-phase price load · IST-aware adaptive WebSockets' },
      { stage: 'Route', detail: '3-tier LLM router: Llama-3.3-70b → GPT-4o mini → rule engine' },
      { stage: 'Secure', detail: 'JWT rotation · Google OAuth 2.0 · bcrypt-12' },
      { stage: 'Test', detail: '22 API pytest suites' },
    ],
    metrics: [
      { k: 'Render latency', v: '<200ms' },
      { k: 'Active users (month 1)', v: '100+' },
      { k: 'Daily requests', v: '5,000+' },
      { k: 'LLM tiers', v: '3' },
      { k: 'API test suites', v: '22' },
    ],
    stack: ['FastAPI', 'PostgreSQL', 'WebSockets', 'React', 'TypeScript', 'Groq', 'OpenAI', 'OAuth 2.0'],
    links: [
      { label: 'Live', href: 'https://finx-pi.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/eshaansingla/finx' },
    ],
    visual: 'tick',
  },
  {
    id: 'sanchaalan',
    index: '03',
    title: 'Sanchaalan Saathi',
    kicker: 'AI NGO Coordination Platform',
    status: 'Live',
    year: '2026',
    span: 'lg:col-span-2',
    tags: ['Full-Stack', 'Generative AI', 'Optimization'],
    summary: 'Two-portal platform that turns field photos into tasks and optimally assigns volunteers.',
    pills: [
      { k: 'Matching', v: 'Hungarian' },
      { k: 'Graph', v: 'Neo4j' },
    ],
    description:
      'AI-native coordination platform for NGOs that replaces WhatsApp groups and spreadsheets. Gemini Flash extracts need, urgency, location and headcount from field media; the Hungarian algorithm computes a globally optimal volunteer-to-task assignment by skill, distance and workload; a Neo4j causal graph links related incidents for root-cause resolution; AI vision verifies photo proof before a task closes. NGO and volunteer portals share one real-time backend.',
    architecture: [
      { stage: 'Capture', detail: 'Field photo / report → Gemini Flash entity extraction' },
      { stage: 'Graph', detail: 'Neo4j node linked to location and causal chain' },
      { stage: 'Assign', detail: 'Hungarian algorithm · skill · distance · workload' },
      { stage: 'Verify', detail: 'AI vision checks proof photo → task resolved' },
      { stage: 'Serve', detail: 'Next.js 15 on Vercel · Django + Channels on Railway' },
    ],
    metrics: [
      { k: 'Portals', v: 'NGO + Volunteer' },
      { k: 'Assignment', v: 'Globally optimal' },
      { k: 'Realtime', v: 'WebSockets' },
    ],
    stack: ['Next.js 15', 'TypeScript', 'Django', 'Channels', 'PostgreSQL', 'Neo4j', 'Gemini', 'Firebase'],
    links: [
      { label: 'Live', href: 'https://sanchaalan-saathi.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/eshaansingla/SanchaalanSathi' },
    ],
    visual: 'graph',
  },
  {
    id: 'nyaaya',
    index: '04',
    title: 'NyaayaBot',
    kicker: 'Legal AI Assistant',
    status: 'Shipped',
    year: '2025',
    span: 'lg:col-span-2',
    tags: ['Generative AI', 'NLP'],
    summary: 'Citation-grounded Gemini assistant for Indian law queries.',
    pills: [
      { k: 'Queries', v: '1,200+' },
      { k: 'IPC categories', v: '100+' },
    ],
    description:
      'Gemini API legal assistant handling 1,200+ queries across 100+ IPC categories using custom intent recognition, multi-turn context retention, and citation-grounded response ranking.',
    architecture: [
      { stage: 'Intent', detail: 'Custom intent recognition, domain-gated' },
      { stage: 'Context', detail: 'Multi-turn memory · PDF agreement upload' },
      { stage: 'Ground', detail: 'Ranking that maps intent to cited legal text' },
      { stage: 'Generate', detail: 'Gemini API · Gradio interface' },
    ],
    metrics: [
      { k: 'User queries', v: '1,200+' },
      { k: 'IPC categories', v: '100+' },
    ],
    stack: ['Python', 'Gemini API', 'Gradio', 'NLP'],
    links: [{ label: 'GitHub', href: 'https://github.com/eshaansingla/NyaayaBot' }],
    visual: 'text',
  },
  {
    id: 'lpd',
    index: '05',
    title: 'License Plate Detection',
    kicker: 'Real-Time Computer Vision',
    status: 'Shipped',
    year: '2025',
    span: 'lg:col-span-2',
    tags: ['Computer Vision', 'Deep Learning'],
    summary: 'YOLOv8L tracking on 1080p video, hardened for low light.',
    pills: [
      { k: 'FPS', v: '30+' },
      { k: 'Accuracy', v: '92%' },
      { k: 'Low-light FP', v: '−30%' },
    ],
    description:
      'Real-time YOLOv8L vehicle tracking on 1080p video (30+ FPS, 92% accuracy), cutting low-light false positives by 30% via dynamic confidence thresholding.',
    architecture: [
      { stage: 'Data', detail: 'Custom-annotated plate dataset (LabelImg)' },
      { stage: 'Detect', detail: 'YOLOv8L on 1080p frames' },
      { stage: 'Refine', detail: 'Dynamic confidence thresholds · bounding-box refinement' },
      { stage: 'Track', detail: 'Multi-vehicle tracking in real time' },
    ],
    metrics: [
      { k: 'Throughput', v: '30+ FPS @ 1080p' },
      { k: 'Detection accuracy', v: '92%' },
      { k: 'Low-light false positives', v: '−30%' },
    ],
    stack: ['Python', 'YOLOv8', 'Ultralytics', 'OpenCV', 'PyTorch'],
    links: [{ label: 'GitHub', href: 'https://github.com/eshaansingla/License-Plate-Detection' }],
    visual: 'box',
  },
  {
    id: 'aether',
    index: '06',
    title: 'AETHER',
    kicker: 'Desktop GenAI Assistant',
    status: 'Shipped',
    year: '2026',
    span: 'md:col-span-2 lg:col-span-6',
    tags: ['Generative AI', 'Desktop', 'Evaluation'],
    summary:
      'Windows assistant that runs 6 decoding strategies side by side and scores each one, so you can see how text generation actually works.',
    pills: [
      { k: 'Sampling strategies', v: '6' },
      { k: 'Metrics', v: 'PPL · BLEU · ROUGE' },
    ],
    description:
      'A Windows desktop assistant you type or speak to. It executes system commands (open apps, notes, reminders, file search, volume, Wi-Fi) or writes a reply using six sampling strategies in parallel, scored with perplexity, BLEU and ROUGE so the best output is chosen transparently. Uses a cloud LLM (Groq, Gemini or OpenAI) plus a local distilgpt2 for top-k and beam strategies cloud APIs do not expose. Built as a team of three; I owned the FastAPI backend and Electron shell.',
    architecture: [
      { stage: 'Input', detail: 'Text or voice (faster-whisper)' },
      { stage: 'Route', detail: 'Intent → system action or generation' },
      { stage: 'Generate', detail: '6 strategies: cloud LLM + local distilgpt2' },
      { stage: 'Score', detail: 'Perplexity · BLEU · ROUGE, side by side' },
      { stage: 'Shell', detail: 'Electron + React/TypeScript · FastAPI + SQLite' },
    ],
    metrics: [
      { k: 'Decoding strategies', v: '6' },
      { k: 'LLM providers', v: 'Groq · Gemini · OpenAI' },
    ],
    stack: ['Python', 'FastAPI', 'SQLite', 'Transformers', 'PyTorch', 'faster-whisper', 'Electron', 'React', 'TypeScript'],
    links: [{ label: 'GitHub', href: 'https://github.com/eshaansingla/Aether' }],
    visual: 'bars',
  },
]

// Additional public work on GitHub
export const archive = [
  { name: 'Parkinson’s Early Prediction', what: 'Voice CNN + tremor DNN fusion pipeline (internship work)', stack: 'TensorFlow · Librosa', href: 'https://github.com/eshaansingla/ParkinsonsEarlyPrediction', year: '2025' },
  { name: 'Solara.Ai', what: 'Solar-plant anomaly, efficiency & failure-risk models behind a FastAPI service', stack: 'scikit-learn · FastAPI · React', href: 'https://github.com/eshaansingla/Solara.Ai', year: '2026' },
  { name: 'KRYOSE', what: 'Cold-storage intelligence dashboard with alerts & analytics', stack: 'React · TypeScript · Node', href: 'https://github.com/eshaansingla/KRYOSE', year: '2026' },
  { name: 'ScamurAi', what: 'Chrome extension that flags scam ads and fake articles in real time', stack: 'MV3 Extension · Python', href: 'https://github.com/eshaansingla/Scamurai', year: '2025' },
  { name: 'Movies Recommendation', what: 'Content-based + collaborative filtering recommender', stack: 'Pandas · scikit-learn', href: 'https://github.com/eshaansingla/Movies-Recommendation', year: '2025' },
  { name: 'Vital (Hackowasp)', what: 'Hackathon health-recommendation app with sentiment analysis', stack: 'MERN · NLP', href: 'https://github.com/eshaansingla/Hackowasp', year: '2024' },
]

export const experience = [
  {
    role: 'Research Intern — ML & Computer Vision',
    org: 'Thapar Institute of Engineering and Technology (ELC)',
    period: 'Jun 2025 – Jul 2025',
    place: 'Patiala, India',
    points: [
      'Built a multimodal Parkinson’s detection CNN pipeline on voice + IMU data, reaching 91% classification accuracy.',
      'Cut false negatives by 18% vs. a logistic-regression baseline with a TensorFlow DNN trained on 10,000+ accelerometer epochs.',
      'Reduced preprocessing latency by 40% across 40,000+ samples by reworking the Pandas/NumPy feature pipeline.',
    ],
    pills: [
      { k: 'Accuracy', v: '91%' },
      { k: 'False negatives', v: '−18%' },
      { k: 'Latency', v: '−40%' },
    ],
    link: { label: 'Code', href: 'https://github.com/eshaansingla/ParkinsonsEarlyPrediction' },
  },
]

export const education = [
  { title: 'B.E. Computer Science Engineering', org: 'Thapar Institute of Engineering and Technology', period: '2023 – Present', score: 'CGPA 9.00' },
  { title: 'Higher Secondary (PCM)', org: 'Bhupindra International Public School', period: '2021 – 2023', score: '95.6%' },
  { title: 'Secondary (CISCE)', org: 'The British Co-Ed High School', period: '2019 – 2021', score: '96.14%' },
]

export const honors = [
  { title: 'Merit-1 Scholarship', detail: 'Rank 1 in B.E. CSE · JEE Mains 98.4 percentile', year: '2023–24' },
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

// Reference list — cited inline as [n]
export const refs = {
  1: { label: 'GitHub', text: 'github.com/eshaansingla — all public code', href: 'https://github.com/eshaansingla' },
  2: { label: 'LinkedIn', text: 'linkedin.com/in/eshaansingla', href: 'https://www.linkedin.com/in/eshaansingla' },
  3: { label: 'LeetCode', text: 'Contest rating 1541 (top 34.7%) · 576 solved: 267 easy, 282 medium, 27 hard', href: 'https://leetcode.com/u/eshaansingla/' },
  4: { label: 'Codeforces', text: 'Rating 1268 · Pupil', href: 'https://codeforces.com/profile/EshaanSingla' },
  5: { label: 'Pran', text: 'Optical eardrum sensing: firmware, 146-subject study, 14 models, leakage audit', href: 'https://github.com/eshaansingla/Pran' },
  6: { label: 'FIN-X (live)', text: 'finx-pi.vercel.app — real-time NSE intelligence', href: 'https://finx-pi.vercel.app' },
  7: { label: 'FIN-X (code)', text: 'github.com/eshaansingla/finx', href: 'https://github.com/eshaansingla/finx' },
  8: { label: 'Sanchaalan Saathi', text: 'sanchaalan-saathi.vercel.app — NGO coordination platform', href: 'https://sanchaalan-saathi.vercel.app' },
  9: { label: 'NyaayaBot', text: 'github.com/eshaansingla/NyaayaBot', href: 'https://github.com/eshaansingla/NyaayaBot' },
  10: { label: 'License-Plate-Detection', text: 'YOLOv8L detection and tracking', href: 'https://github.com/eshaansingla/License-Plate-Detection' },
  11: { label: 'AETHER', text: 'Desktop GenAI assistant; evaluation run of 6 decoding strategies', href: 'https://github.com/eshaansingla/Aether' },
  12: { label: 'Parkinson’s Early Prediction', text: 'Voice CNN + tremor DNN fusion (ELC internship)', href: 'https://github.com/eshaansingla/ParkinsonsEarlyPrediction' },
}

// Rocket League — snapshot from rocketleague.tracker.network (Epic, PC), 27 Nov 2026
export const rocketLeague = {
  handle: 'EshaanS_05',
  platform: 'Epic · PC',
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
