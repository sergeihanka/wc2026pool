# WC 2026 Pool

A Progressive Web App for a 6-person FIFA World Cup 2026 pool. Shows live match scores, a real-time leaderboard, and delivers push notifications for goals and match events. Deployed on Netlify.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19, TypeScript, Vite 6 |
| Component library | MUI v9 |
| Data cache | Supabase (match cache + push subscriptions) |
| Live scores | football-data.org API |
| Push notifications | OneSignal |
| Hosting | Netlify (static) + Netlify Functions (serverless) |
| Leaderboard animation | react-flip-toolkit (FLIP) |
| PWA / service worker | vite-plugin-pwa (Workbox) |

---

## Getting Started

```bash
git clone <repo-url>
cd wc2026pool
npm install
```

Create your local environment files (see `.env.example` for all required variables):

```
local-env/services/external.env    # VITE_FOOTBALL_API_KEY, VITE_ONESIGNAL_APP_ID, etc.
local-env/databases/supabase.env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

Then start the dev server:

```bash
npm run dev
```

---

## Architecture

```
football-data.org API
       │
       ▼
PollingService (client)  ──writes──▶  Supabase match cache
       │
       └── useScores (hook) polls cache every second via getLastFetchTime()
                  │
                  ▼
           ScoresPage / Leaderboard (computed client-side from cache reads)

OneSignal push fanout  ◀──  Netlify Function (push-fanout)
                               reads Supabase push_subscriptions table
```

- **PollingService** fetches live scores from football-data.org and writes them to Supabase, acting as a shared cache so all clients stay in sync without hammering the external API.
- **Leaderboard** scoring is computed entirely client-side by mapping each member's assigned teams to match results.
- **Push notifications** are triggered by the Netlify Function, which reads Supabase for active subscriptions and calls the OneSignal REST API for fanout.

---

## Deployment

Push to `main` — Netlify auto-deploys on every commit.

Set the following environment variables in the **Netlify dashboard** (Site → Environment Variables):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS — server-side only) |
| `ONESIGNAL_APP_ID` | OneSignal app ID |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST API key |

Client-side variables (`VITE_*`) are also set in the Netlify dashboard and embedded at build time by Vite.

---

## PWA Icons

See `public/icons/README.md` for the list of required PNG icon files and their dimensions. The build succeeds without them but icons are needed for a complete PWA install experience on iOS and Android.

---

## Pool Configuration

Pool members and their assigned national teams are defined in `src/config/pool.ts`. Passwords are base64-obfuscated for cosmetic purposes only — this is not cryptographic security (per PRD §5.3).
