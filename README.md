# Xfield Creative Studio

A Higgsfield-inspired creative workspace: a public landing page, a studio for images, video,
campaigns and canvases, and a typed backend. Built as a Next.js monorepo.

```
apps/web          Next.js 16 app: landing page, studio pages, /api route
packages/api      backend: routes → controllers → services → infrastructure
packages/db       Drizzle schema and Postgres migrations
packages/shared   Zod contracts shared by the browser, the API and the tests
```

See [architecture](docs/ARCHITECTURE.md) for the request lifecycle and design decisions.

## Run locally

Node 24 or newer. No database or cloud account is needed: without configuration the API uses an
embedded Postgres and local file storage under `apps/web/.data/`.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks

```sh
npm run check            # format, lint, strict typecheck, production build
npm run start &          # then, with the server on port 3000:
npm test                 # API integration tests and contract tests
```

GitHub Actions runs the same steps on every push. The integration tests run against the real API
and database and cover workspace isolation, private media, upload signature checks, folders,
projects, publication and revocation, validation, idempotent generation, credential
non-disclosure and 404/405 handling.

## Working flows

- Landing page at `/` with a prompt bar that hands the idea to the studio.
- Browse inspiration, search, presets, model choices and creative directions.
- Create concept previews; inspect history, reuse prompts and download results.
- Upload assets, rename, favorite, organize into folders, and publish or revoke them.
- Save a canvas with draggable references, editable notes and generation nodes.
- Prepare a marketing brief, generate campaign directions and send one to the image studio.
- Profile, provider connection, template-based planning, help and responsive navigation.

Live generation supports Higgsfield **Soul 2** text-to-image and **Seedance 2.0**
text-to-video. Each user enters their own API key in Settings; it stays in an HTTP-only cookie
and is used only server-side. No funded key was available during development, so paid output
has not been verified.

Concept previews are clearly labelled procedural SVGs. Audio plays browser speech synthesis.
Other models, advanced editing, payments and recoverable accounts are not built; plans are
illustrative.

## Deployment

Vercel for the app and API, Supabase for Postgres and storage. Follow
[the deployment guide](docs/DEPLOYMENT.md). The hosted path has not been exercised yet.

## Research and process

All 140 Mobbin flow records and 557 unique reference-screen identifiers are inventoried under
`recon/`; screenshots stay local. See [coverage](docs/COVERAGE.md) and
[walkthrough](docs/WALKTHROUGH.md). Original implementation; no third-party clone source was
copied. Photo sources are recorded in `recon/asset-sources.json`.

How the project was built with AI agents, step by step: [AI workflow](docs/AI-WORKFLOW.md).

Prompt and final-response logs from Codex, Claude Code and its parallel sub-agents live in `.agent-logs/`. Project-origin
branding is redacted at the user's request, so the logs are not unmodified transcripts. See
[capture status](CAPTURE-TEST.md).
