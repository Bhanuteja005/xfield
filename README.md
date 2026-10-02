# Xfield Creative Studio

A Higgsfield-inspired creative workspace rebuilt for the 8x assignment. It includes a responsive frontend and a persistent Worker API, rather than a set of static screenshots.

## Run locally

Use Node 24 or newer. From this folder:

```sh
npm ci
npm run build
npm run db:local
npm run backend
```

In a second terminal:

```sh
npm run dev
```

Open http://127.0.0.1:5173. The backend runs on port 8787. Local storage is under `.wrangler/` and is excluded from Git. You can also use the complete production build directly at http://127.0.0.1:8787.

## Checks

With the local backend running:

```sh
npm run check
npm run format:check
```

The quality workflow repeats formatting, lint, strict shared-contract/API-client type checking, production build, migrations, and API/contract tests on GitHub. Views are JSX; this is not a fully TypeScript frontend. Integration tests verify workspace isolation, private media, uploads, folders, projects, publication/revocation, validation and idempotency against real local D1/R2.

## Working flows

- Browse inspiration, search, presets, model choices and studio directions.
- Create procedural concept previews; inspect history, reuse prompts and download results.
- Upload assets, rename, favorite, organize into folders, and publish/revoke community visibility.
- Create and save a canvas with draggable references, editable notes and generation nodes.
- Prepare a marketing brief, generate campaign directions and send a concept to image studio.
- Profile settings, provider connection, template-based creative planning, help and responsive navigation.

Live generation supports the documented Higgsfield **Soul 2** text-to-image and **Seedance 2.0** text-to-video endpoints. Enter your own full API key in Settings. The key stays in an HTTP-only session cookie; calls and result storage happen server-side. It is never committed. No funded provider key was available during development, so actual paid output has not been verified.

Concept previews are clearly labeled procedural SVGs. Video previews do not export actual video. Audio plays browser speech synthesis and has no downloadable output. Other models, advanced video editing, motion control, commerce and cross-device account recovery remain outside the shipped integration scope. Plans are illustrative and do not charge money.

## Structure and research

See [architecture](docs/ARCHITECTURE.md), [coverage](docs/COVERAGE.md) and [walkthrough](docs/WALKTHROUGH.md). All 140 Mobbin flow records and 557 unique reference-screen identifiers are inventoried under `recon/`. Reference screenshots remain local and are excluded from the public repository. Original implementation; no unlicensed clone source was copied. Photographic asset sources are recorded in `public/media/asset-sources.json`.

Automatic prompt/final-response capture lives in `.agent-logs/`. The user waived waiting for the assignment's two canaries; [CAPTURE-TEST.md](CAPTURE-TEST.md) records that honestly.
