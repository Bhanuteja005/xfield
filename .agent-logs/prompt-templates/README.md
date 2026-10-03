# Service-agent prompt templates

These are edited, reusable prompts supplied for future development. They are **not historical transcripts**, execution receipts, or evidence that the seven roles below have run.

Use [service-prompts.md](service-prompts.md) for a new run. Capture the actual submitted prompt and actual response through the normal logging mechanism. Record the real model, session and test results; do not substitute a template for an earlier exchange.

The existing Codex and Opus transcripts in the parent directory remain separate. The parent directory also contains existing Opus sub-agent records; those records should only be used to describe the work they actually contain.

The proposed architecture is Next.js 16, a framework-independent API, Drizzle/Postgres with PGlite fallback, and shared Zod contracts. Implementation and verification claims must be checked against the current source, not inferred from these prompts.

Run order: orchestrator plan → human approval → contracts → database → API and web → QA → documentation. Concurrent agents must have distinct file ownership. Every handoff should name its dependencies, exports, changed files, verification commands and unresolved issues.

Status: templates prepared; no new service-agent execution initiated by creating these files.
