// Refreshes src/assets/stats.json with live LeetCode and Codeforces numbers.
// Run by .github/workflows/stats.yml on a schedule. A source that fails keeps its last values,
// so a LeetCode or Codeforces outage never breaks the site. The file only changes when a number does.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'

const FILE = new URL('../src/assets/stats.json', import.meta.url)
const LC_USER = 'eshaansingla'
const CF_USER = 'EshaanSingla'
const today = new Date().toISOString().slice(0, 10)
const old = JSON.parse(readFileSync(FILE, 'utf8'))
const title = (s) => (s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : s)

async function getJSON(url, init) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`${url} answered ${r.status}`)
  return r.json()
}

async function leetcode() {
  const query = `query ($u: String!) {
    userContestRanking(username: $u) { rating topPercentage attendedContestsCount }
    matchedUser(username: $u) { submitStatsGlobal { acSubmissionNum { difficulty count } } }
  }`
  const j = await getJSON('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', referer: `https://leetcode.com/u/${LC_USER}/`, 'user-agent': 'Mozilla/5.0 (portfolio stats)' },
    body: JSON.stringify({ query, variables: { u: LC_USER } }),
  })
  const c = j.data?.userContestRanking, m = j.data?.matchedUser
  if (!m) throw new Error('LeetCode returned no user')
  const n = Object.fromEntries(m.submitStatsGlobal.acSubmissionNum.map((x) => [x.difficulty.toLowerCase(), x.count]))
  return {
    rating: c ? Math.round(c.rating) : old.leetcode.rating,
    top: c ? `${c.topPercentage}%` : old.leetcode.top,
    contests: c ? c.attendedContestsCount : old.leetcode.contests,
    solved: n.all, easy: n.easy, medium: n.medium, hard: n.hard,
  }
}

async function codeforces() {
  const j = await getJSON(`https://codeforces.com/api/user.info?handles=${CF_USER}`)
  if (j.status !== 'OK') throw new Error(`Codeforces: ${j.comment}`)
  const u = j.result[0]
  return { rating: u.rating, rank: title(u.rank), maxRating: u.maxRating, maxRank: title(u.maxRank) }
}

const next = structuredClone(old)
let changed = false
for (const [key, get] of [['leetcode', leetcode], ['codeforces', codeforces]]) {
  try {
    const fresh = await get()
    const prev = old[key]
    if (Object.keys(fresh).some((k) => prev[k] !== fresh[k])) {
      next[key] = { ...fresh, updated: today }
      changed = true
      console.log(`${key}: updated`, fresh)
    } else console.log(`${key}: no change`)
  } catch (e) {
    console.warn(`${key}: kept last values (${e.message})`)
  }
}
if (changed) writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n')
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`)
