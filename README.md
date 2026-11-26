# eshaansingla.com

Personal site of Eshaan Singla, laid out as a working paper. Every figure is a small working instrument:

| Fig. | Instrument | What it shows |
|---|---|---|
| 1 | Bedside monitor | Eardrum/PPG pulse across head-up 30°, supine, head-down 10° and Valsalva, scaled to the 146-subject results in the Pran repo; morphs into an NSE tick stream |
| 2 | Test runner | The Pran leakage audit (real numbers from the repo) |
| 3 | Signal analyzer | Single-pass vs forward-backward Butterworth, live lag and error |
| 4 | FIN-X router console | 3-tier LLM fallback with intent check |
| 5 | Dispatch map | Live Hungarian assignment vs nearest-first (Sanchaalan Saathi) |
| 6 | Camera feed | Fixed vs glare-aware detection thresholds |
| 7 | Eval leaderboard | AETHER's real evaluation results, re-ranked by metric |
| 8 | Profiler | Bottleneck puzzle built on the internship's 40% speed-up |
| 9 | Rocket League | Snapshot from tracker.gg with original tier emblems |

Stack: React 19, Vite, Tailwind CSS v4, Framer Motion, self-hosted Newsreader and JetBrains Mono. Light and dark themes.

Content lives in `src/data.js` (numbers, links, Rocket League snapshot) and `src/components/Paper.jsx` (prose).

## Run locally

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # static site in dist/
npm run build:single   # one self-contained HTML file in dist-single/index.html
```

## Deploy: GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. GitHub Pages on a free account needs a **public** repository (Settings → General → Danger Zone → Change visibility), or a GitHub Pro plan for a private one.
3. Re-run the workflow (Actions → Deploy to GitHub Pages → Run workflow) or push any commit.

The site is live at https://eshaansingla.github.io/.

### Custom domain (eshaansingla.com)

Once you own the domain: Settings → Pages → Custom domain → `eshaansingla.com`, then at your registrar add

| Type  | Name | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| CNAME | www  | eshaansingla.github.io |

and tick **Enforce HTTPS** when it becomes available.

## Deploy: Vercel (alternative)

Import the repo at vercel.com/new (Vite is detected automatically), then add `eshaansingla.com` under Project → Settings → Domains and set the DNS records Vercel shows.

## Updating

- Rankings and ratings: `src/data.js` (`competitive`, `rocketLeague`)
- Résumé: replace `src/assets/Eshaan_Singla_Resume.pdf`
- Push to `main`; the site redeploys.
