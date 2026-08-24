# LeetCode Accountability Bot

A working Discord bot skeleton for the flow we talked through: daily
check-ins, streaks, curated problem lists, and both automatic and manual
solve tracking. Everything below is real, type-checked, and smoke-tested —
not pseudocode — but it's a foundation to build on, not a finished product.

## What's actually here

```
src/
  env.ts              loads & validates .env
  db.ts                SQLite schema + every query the bot needs (users, solves, lists)
  leetcode.ts           direct call to LeetCode's public GraphQL endpoint
  auto-check.ts         polls every registered user, records new accepted submissions
  digest.ts              builds & posts the daily embed
  types.ts                shared Command interface
  deploy-commands.ts    one-off script to register slash commands with Discord
  index.ts                entry point: wires commands, seeds the demo list, schedules the cron
  data/starter-list.ts  a small demo list so /list next works before you import anything
  commands/
    register.ts  /register  — link your LeetCode username
    solved.ts    /solved    — manually log a solve
    streak.ts    /streak    — check your (or a friend's) streak + progress
    list.ts      /list      — create / import / switch / next / progress
    sync.ts      /sync      — manually trigger the auto-check
```

## How the pieces fit together

- **`solves` table** is the source of truth. Every row is one problem solved
  by one person on one day, tagged `manual` or `auto`. Streaks are computed
  from this table at read time (consecutive distinct `solved_date`s ending
  today-or-yesterday) — nothing is stored redundantly.
- **`lists` / `list_problems`** are separate from solves entirely. A list is
  just an ordered set of `(slug, title, difficulty)`. "Progress" is a join
  between what's on your active list and what you've solved — so solving a
  problem that happens to be on your list advances it automatically; solving
  something off-list still counts for your streak, just not toward that
  list's percentage.
- **Two ways a solve gets recorded**, matching what we discussed:
  1. `/solved` — instant, manual, works for anything (not just LeetCode).
  2. `auto-check.ts` — polls each registered user's public LeetCode
     submissions and inserts any accepted ones since the last run. It's
     called both by the cron job (right before the daily digest) and
     on-demand via `/sync`.
     Both write to the same `solves` table with a `UNIQUE(discord_id, slug,
date)` constraint, so if both happen to catch the same solve, it's a
     harmless no-op rather than a duplicate.
- **The daily digest** (`digest.ts`) runs on a cron schedule, does one
  auto-check pass to catch anything missed, then posts one embed: who
  solved what, everyone's streak, everyone's list progress — the message
  shown in the "day in the life" walkthrough.

## Tracking a curated list

This is the part your "what if I want to track a curated list" question was
about:

- `/list create hrt-prep` — makes a new empty list.
- `/list import name:hrt-prep csv:<file>` — upload a `.csv` with one problem
  per line: `title,slug,difficulty` (difficulty optional, header row
  optional). The `slug` is the part of the LeetCode URL after
  `/problems/` — e.g. for `leetcode.com/problems/two-sum/` it's `two-sum`.
  This is how you'd bring in NeetCode 150, Blind 75, or a hand-picked set —
  export or type up a CSV and import it. I seeded a small 12-problem demo
  list (`starter`) so the bot works immediately, but I deliberately didn't
  bake in a full copy of anyone's curated 150-problem list — that curation
  is NeetCode's own editorial product, and CSV import is more flexible
  anyway (works for any list, not just one).
- `/list switch hrt-prep` — makes that your active list. Everyone can be on
  a different list at once; `/list next` and `/list progress` always act on
  whichever one is currently active for that person.
- `/list next` — your next unsolved problem on your active list, in import
  order.

## Setup

1. **Create the Discord application** at
   [discord.com/developers/applications](https://discord.com/developers/applications) →
   New Application → Bot tab → Reset Token (copy it) → OAuth2 → URL
   Generator → check `bot` + `applications.commands` scopes, `Send
Messages` + `Use Slash Commands` permissions → open the generated URL to
   invite it to your server.
2. **Copy `.env.example` to `.env`** and fill in `DISCORD_TOKEN`,
   `DISCORD_CLIENT_ID` (Application ID, same page as the bot token),
   `DISCORD_GUILD_ID` (your server ID — right-click the server icon with
   Developer Mode on), and `DIGEST_CHANNEL_ID` (right-click the channel).
3. **Install and register commands:**
   ```bash
   npm install
   npm run deploy-commands   # registers /register /solved /streak /list /sync to your server
   npm run dev               # starts the bot
   ```
4. Try `/register`, then `/solved`, then `/list next` in your server.

For production, `npm run build && npm start` runs the compiled JS instead of
`tsx`; deploy it anywhere that can run a long-lived Node process (Railway,
Fly.io, a spare machine — anything that stays up 24/7, since it needs to be
listening for slash commands, not just running on a cron tick).

## Known scaffold limitations (worth knowing before you extend this)

- **`/solved`'s slug is guessed** from the title (lowercased, hyphenated),
  not looked up against LeetCode's actual problem catalog. It's consistent
  enough for streaks, and will usually match a list's slug, but for exact
  matching you'd want to add a problem-search lookup (LeetCode's
  `problemsetQuestionList` GraphQL query) and possibly autocomplete on the
  `problem` option.
- **LeetCode's `recentSubmissionList` caps at 20 entries.** If someone's
  registered account goes unchecked for a long time (bot downtime) and they
  solve more than 20 problems in that gap, only the most recent 20 get
  picked up. Fine for daily polling, worth knowing if the bot is offline
  for a while.
- **The unofficial GraphQL endpoint can change** without notice — it's not
  a documented, versioned API. `leetcode.ts` is kept as one small,
  self-contained function specifically so it's easy to patch if/when that
  happens.
- **Streak day boundaries are UTC**, not each person's local timezone. Fine
  for a single-timezone friend group; worth revisiting if you're spread
  across time zones.
- **No admin/permission checks** — anyone can `/list create` or `/sync`.
  Fine for a small trusted friend group; add a role check in `list.ts` if
  that ever matters.
