# my boi

Internal Business Bank L&D assistant. Lightweight retrieval-style app that answers
only from a fixed internal knowledge base of workstreams, owners and team members.
It does not generate ideas, infer, or use general AI knowledge.

## Stack

- Next.js (App Router) + React + TypeScript
- Supabase (Postgres + RLS)
- A single API route: `POST /api/ask`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create the schema and seed data. Open the Supabase SQL Editor for your project
   and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). It is
   idempotent and safe to re-run.

3. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## How answers are produced

The flow is strictly deterministic:

1. `detectIntent(question)` maps the question to one of: `list`, `owner`,
   `shoutout`, `detail`, `summary`, `out_of_scope`.
2. `matchWorkstream(question, workstreams)` scans slug, name and aliases and
   picks the longest match.
3. `formatAnswer(intent, workstream, workstreams)` renders the exact shape
   described in the spec. If nothing matches, it returns `Not in current scope.`

See `src/lib/intent.ts`, `src/lib/match.ts` and `src/lib/format.ts`.

## API

`POST /api/ask`

Request:
```json
{ "question": "Who owns BBA?" }
```

Response:
```json
{
  "answer": "Silindile Hlengwa",
  "matchedWorkstream": "Business Banking Academy",
  "intent": "owner"
}
```

## Data

Three tables:

- `team_members` - list of people
- `workstreams` - workstreams with `aliases`, `what_is_being_done`, and an owner FK
- `workstream_team_members` - many-to-many join between people and workstreams

All tables have RLS enabled with a public-read policy so the anon key can read
but not write.

The Product Learning product list is kept as a code constant in
`src/lib/products.ts` because it is delivery-scope metadata rather than DB data.
