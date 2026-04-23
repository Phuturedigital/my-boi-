# my boi

Internal Business Bank L&D retrieval assistant. Answers only come from the
Supabase knowledge base — if a question doesn't match, the app returns
`Not in current scope.`

## Stack
- React + TypeScript (Vite)
- Express API (`POST /api/ask`)
- Supabase (Postgres) for the knowledge base

## Setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Provision Supabase**
   - Create a project at https://supabase.com
   - Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql)
     (it creates tables, RLS policies, and seeds all data)

3. **Configure env**
   ```bash
   cp .env.example .env
   # then fill in SUPABASE_URL and SUPABASE_ANON_KEY
   ```

4. **Run dev servers**
   ```bash
   npm run dev
   ```
   - Web: http://localhost:5173
   - API: http://localhost:3001 (proxied from the web app at `/api/*`)

## Production

```bash
npm run build   # builds the React app into ./dist
npm start       # serves API + built frontend on $PORT (default 3001)
```

## Deploy to Netlify

The repo ships with `netlify.toml` and a Netlify Function at
`netlify/functions/ask.ts`, so the same `/api/ask` URL works in dev (Express)
and in prod (Netlify Function).

1. **Connect the repo** in Netlify → "Add new site → Import from Git".
   Netlify will auto-detect `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
2. **Set env vars** in Site settings → Environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. **Deploy.** The included redirects route `POST /api/ask` to the function
   and fall back to `index.html` for SPA routes.

If the site deploys but asking returns a 500, the env vars are almost
certainly missing — check the function log in Netlify.

## Behaviour

| User asks | Intent | Response |
|---|---|---|
| "What are we working on?" | `list` | All workstream names, one per line |
| "Who owns BBA?" | `owner` | Owner's full name |
| "Who should I shout out for onboarding?" | `shoutout` | Owner + team, no duplicates |
| "What is Governance & Planning?" | `detail` | Description, what's being done, owner, team |
| "Tell me about product learning at a high level" | `summary` | Short paragraph |
| Anything off-topic | `out_of_scope` | `Not in current scope.` |

## Code map
- `supabase/schema.sql` — schema + seed (idempotent)
- `server/` — Express API with `detectIntent`, `matchWorkstream`, `formatAnswer`
- `src/` — React UI
