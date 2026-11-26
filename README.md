# Eshaan Singla, working notes

Personal site of Eshaan Singla, laid out as a working paper. Every figure is a small working instrument:

| Fig. | Instrument | What it shows |
|---|---|---|
| 1 | Bench test | The Pran rig on a test dummy replaying two real recordings (elevated.csv, non-elevated.csv), scored window by window with the repo's final XGBoost model |
| 2 | Test runner | The Pran leakage audit (real numbers from the repo) |
| 3 | FIN-X terminal | Simulated deal feed through the 3-tier LLM router with intent check |
| 4 | Operations room | Street map with road routing, closures and the Hungarian assignment vs nearest-first (Sanchaalan Saathi) |
| 5 | Traffic camera | Two-way traffic, front and rear plates with magnified crops, fixed vs glare-aware thresholds (plates are made up) |
| 6 | Eval leaderboard | AETHER's real evaluation results, re-ranked by metric |
| 7 | Legal desk | NyaayaBot's keyword gate, cited provision and 10-turn memory |
| 8 | Profiler | Bottleneck puzzle built on the internship's 40% speed-up |
| 9 | Rocket League | Snapshot from tracker.gg with original tier emblems |

Every figure works with a mouse, touch or keyboard: anything that reacts to hover also responds to a tap or click.

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
