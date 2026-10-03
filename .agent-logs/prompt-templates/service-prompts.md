# Xfield service-agent prompts

Document type: edited prompt templates. These prompts are intended for future execution and do not replace original log entries. Acceptance criteria are requirements, not claims of completed work.

## Orchestrator — planning only

I'm building Xfield, an AI image/video generation studio, as an npm-workspaces monorepo: Next.js 16 web, a framework-independent API package, a Drizzle/Postgres database package and shared Zod contracts.

Don't write code or start implementation agents yet. Inspect the current repository and distinguish existing behavior from proposed changes. Produce:

1. A phased implementation plan with priorities, dependencies and explicit exclusions.
2. The service split and exclusive file ownership for each agent.
3. The API contract list: methods, endpoints, request/response schemas, status codes and authentication rules.
4. The agent run order, safe parallel work and verification gates.

Include landing, signup/onboarding, studio, assets, projects and account journeys in the scope assessment. Identify external credentials or services required for real generation and deployment. Do not promise unsupported functionality. Wait for my approval before implementation.

## Contracts agent

ROLE: Contracts agent.

GOAL: Define Zod request schemas and response types for projects, assets, generation and account in `packages/shared/src/contracts.ts`.

SCOPE: Only `packages/shared`. Read the approved plan and API contract list before editing. Do not modify another agent's files.

ACCEPTANCE:

- Every endpoint in the approved plan has the required request and response schema.
- Public response shapes expose neither workspace owner IDs nor session credentials, password hashes or provider keys.
- Validation covers lengths, enums, optional fields and invalid input.
- `tests/contracts.test.mjs` passes against these exports.

VERIFY: Run the relevant contract and package type checks. Report exact commands and observed results; report an unavailable test instead of claiming it passed.

OUTPUT: Exported schemas/types, changed files, compatibility notes and blockers for the DB/API/web agents.

## Database agent

ROLE: DB agent.

GOAL: Implement the Drizzle schema and migrations matching the approved domain contracts.

SCOPE: Only `packages/db`. Report a required change outside that package to the orchestrator.

CONSTRAINTS: Postgres; must also run on PGlite when `DATABASE_URL` is absent. Keep database ownership fields internal. Preserve applied migrations and add new migrations for subsequent schema changes.

ACCEPTANCE:

- Migrations apply cleanly on a fresh PGlite database.
- Tables, relationships and constraints support the approved API behavior.
- Indexes support owner and `created_at` query patterns without redundant indexes.
- Connection and migration lifecycle work in both supported modes.

VERIFY: Run the migration and package type checks. Include the actual output summary, database mode and any unverified Postgres behavior.

OUTPUT: Schema exports, migration files, connection/migration interfaces and handoff notes for the API agent.

## API agent

ROLE: API agent.

GOAL: Implement routes → controllers → services in `packages/api`, using the approved shared contracts and database schema.

SCOPE: Only `packages/api`. Don't edit `packages/shared`. If a contract is wrong or incomplete, report the proposed correction to the orchestrator.

CONSTRAINTS:

- Framework-independent `Request → Response` entry point.
- Origin check on state-changing requests.
- Guest workspace cookie with appropriate security attributes; ownership enforced for private operations.
- Errors mapped through `HttpError` with consistent public response shapes.
- Explicit dependency injection; no mutable globals in services.
- Provider secrets and internal workspace credentials never appear in responses or logs.

ACCEPTANCE:

- Every endpoint in the approved contract list responds with its documented schema and status.
- Unknown routes return 404; unsupported methods return 405 with `Allow`.
- Generation submission, polling, cancellation and storage have explicit failure behavior.
- `tests/api.test.mjs` passes.

VERIFY: Run API type checks and the relevant integration tests. Label real-provider verification separately from mocked or local-preview tests.

OUTPUT: Implemented endpoints, dependency interfaces, actual test results and unresolved integration requirements.

## Web agent

ROLE: Web agent.

GOAL: Build the landing page and approved studio sections in `apps/web`, calling `/api/*` through the shared types.

SCOPE: Only `apps/web`. Coordinate contract changes through the orchestrator.

ACCEPTANCE:

- Strict TypeScript, with no explicit `any` or disabled checks used to hide errors.
- Landing and approved onboarding/studio journeys use the implemented API behavior.
- Usable at 375px width without clipped controls or horizontal overflow.
- Every list has loading, error and empty states.
- Forms preserve input on failure; dialogs support keyboard dismissal and focus management.
- `npm run build` passes.

VERIFY: Run package type checks and build. Inspect the actual browser at desktop and 375px widths, and report the flows tested and any unavailable live integrations.

OUTPUT: Implemented routes/journeys, browser verification results, screenshots when available and remaining UI gaps.

## Test/QA agent

ROLE: QA agent.

GOAL: Write integration tests for every approved endpoint and security tests proving responses do not expose internal owner IDs or credentials.

SCOPE: Only `tests/` and `.github/workflows/`. Don't fix application code.

ACCEPTANCE:

- Test methods, status codes, request validation and response schemas.
- Test ownership isolation, unauthenticated behavior, origin rejection and 404/405 handling.
- Test persistence, relevant concurrent/idempotent operations and error recovery.
- Keep funded-provider calls opt-in and explicitly distinguish them from local tests.
- CI runs the supported install, migration, type-check, lint, test and build sequence.

VERIFY: Execute the tests against the supported database modes available in this environment. Preserve failures as findings; never modify assertions merely to make an implementation pass.

OUTPUT: Actual test commands/results and failures with `file:line`, reproduction steps, expected behavior and observed behavior. Report coverage limitations.

## Documentation agent

ROLE: Docs agent.

GOAL: Update README setup, environment variables, scripts and Vercel deployment instructions, plus `docs/ARCHITECTURE.md`, to match the current implementation.

SCOPE: Only `README.md` and `docs/`. Don't rewrite historical transcripts or modify application code.

CONSTRAINTS: Only document what exists. Distinguish implemented features, verified behavior, proposed architecture and remaining work. Do not include project-origin branding in product documentation. Do not republish through ChatGPT Sites.

VERIFY: Cross-check every documented script, package, environment variable and deployment assumption against the source and observed test results. Explain any external service required for a complete Vercel deployment.

OUTPUT: Updated files, checked setup/deployment steps and unresolved documentation dependencies.
