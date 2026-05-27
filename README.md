# Strata

A modern SaaS web app to connect any PostgreSQL database — Neon, Supabase, RDS, or self-hosted — and browse, query, and edit your data from one elegant workspace. Connection strings are encrypted with AES-256-GCM before being stored.

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** + **shadcn/ui**
- **BetterAuth** — email + password sessions
- **Drizzle ORM** — schema + migrations
- **Neon Postgres** (`@neondatabase/serverless`) — Strata's own meta database
- **`pg`** (node-postgres) — opens fresh connections to user databases on demand
- **Zod** — input validation everywhere
- **AES-256-GCM** via Node `crypto` — connection-string encryption

## Prerequisites

- Node.js 20.9+ (Node 22 recommended)
- A PostgreSQL database for Strata's own data (free tier at <https://neon.tech>)
- `npm`

## Setup

```bash
git clone https://github.com/bahrawyx/strata.git
cd strata
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
DATABASE_URL=postgresql://...        # your Neon (or any Postgres) URL
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=http://localhost:3000
ENCRYPTION_KEY=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate keys:

```bash
# BETTER_AUTH_SECRET and ENCRYPTION_KEY must each be a 32-byte hex string.
openssl rand -hex 32
```

Push the schema to your meta database:

```bash
npm run db:push
```

Start the dev server:

```bash
npm run dev
```

Visit <http://localhost:3000>, sign up, add a connection, and start browsing your tables.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server (Turbopack) |
| `npm run build` | Build the production bundle |
| `npm run start` | Run the built production bundle |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate a new SQL migration from the Drizzle schema |
| `npm run db:push` | Push the schema directly to the database (great for the meta DB) |
| `npm run db:studio` | Open Drizzle Studio against the meta DB |

## Project structure

```
strata/
├── app/
│   ├── (auth)/                        # /login, /signup
│   ├── (dashboard)/                   # /connections, /connections/new, /db/[id]/*
│   ├── api/auth/[...all]/route.ts     # BetterAuth handler
│   ├── layout.tsx
│   ├── page.tsx                       # public landing page
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── auth/                          # LoginForm, SignupForm
│   ├── brand/Logo.tsx
│   ├── connections/                   # ConnectionCard, NewConnectionForm, EmptyConnections, DbTypeBadge
│   ├── layout/                        # Sidebar, Topbar, SchemaTree
│   ├── query/SqlEditor.tsx
│   ├── table/                         # DataGrid, RowEditor, cell-utils
│   └── ui/                            # shadcn components
├── lib/
│   ├── auth.ts                        # BetterAuth server config
│   ├── auth-client.ts                 # BetterAuth React client
│   ├── crypto.ts                      # AES-256-GCM encrypt/decrypt
│   ├── db.ts                          # Drizzle + Neon (meta DB)
│   ├── schema.ts                      # Drizzle schema
│   ├── user-db.ts                     # `pg` driver for user databases
│   ├── utils.ts                       # cn, formatBytes, relativeTime, …
│   └── validations.ts                 # Zod schemas
├── server/
│   └── actions/                       # session, connections, schema, table, query
├── drizzle/migrations/
├── proxy.ts                           # auth-aware redirects (Next 16's `middleware`)
├── drizzle.config.ts
└── next.config.ts
```

> **Heads up:** Next 16 renamed the `middleware` file convention to `proxy`. Same idea, same matcher API — just a different filename.

## Security

- All user connection strings are encrypted with **AES-256-GCM** before they ever touch the database. Decryption happens only when a connection needs to be opened.
- The `ENCRYPTION_KEY` is read from the environment at runtime — never committed, never logged.
- Every server action verifies the session and confirms the requested `connectionId` belongs to the caller.
- All user data values go through parameterized `pg` queries (`$1, $2, …`). Table and column identifiers are validated against `/^[a-zA-Z_][a-zA-Z0-9_]*$/` before quoting.
- `statement_timeout = 30s` is enforced on every query the user runs via Strata.
- Sessions use `httpOnly`, `secure` (in production), `sameSite=lax` cookies signed by BetterAuth.
- BetterAuth's built-in rate limiter is enabled (30 requests/minute by default).
- Postgres error messages are sanitized — internal paths and stack details are stripped before returning to the client.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in <https://vercel.com/new>.
3. Set the env vars from `.env.example` in **Project Settings → Environment Variables**. Use real `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` for your domain.
4. Hit **Deploy**.
5. After the first deploy, run `npm run db:push` against your production database (or via Drizzle Studio) to create the BetterAuth tables.

## License

MIT
