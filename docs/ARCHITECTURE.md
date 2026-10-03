# Xfield architecture

An npm-workspaces monorepo. Applications live in `apps/`, reusable code in `packages/`.

```
apps/web                    Next.js 16 (App Router)
  app/page.tsx                public landing page, server-rendered
  app/(studio)/[section]      every studio page, statically generated from lib/sections.ts
  app/api/[...path]/route.ts  forwards /api/* to @xfield/api (one file, no logic)
  components/studio           shell, shared workspace state, asset detail
  features/*                  one folder per product area
packages/api                @xfield/api: the backend, framework-independent
  src/app                     request pipeline
  src/routes                  the whole HTTP surface in one table
  src/controllers             HTTP in/out: parse, validate, call a service, shape the reply
  src/services                business rules and queries
  src/infrastructure          storage drivers (Supabase, local) and the provider client
  src/middlewares             origin check, guest session, error mapping
  src/shared                  router, HTTP helpers, request context
  src/config.ts               every limit and constant
packages/db                 @xfield/db: Drizzle schema, migrations, connection
packages/shared             @xfield/shared: Zod request contracts and response types
tests                       API integration tests and contract tests
```

The API is a plain `Request -> Response` function. Next.js only hosts it, so it can be tested
without a browser and moved to another runtime without changes.

## Request lifecycle

1. `/api/health` answers immediately.
2. State-changing requests must carry an `Origin` whose host matches the request host. This is
   the CSRF defence for cookie authentication.
3. The router resolves method and path to a controller, or answers 404 / 405 with `Allow`.
4. The workspace id is read from the session cookie, or minted for a first visit.
5. The controller validates input with the shared Zod contract and calls a service.
6. Services receive the database and storage as arguments, never through globals.
7. Failures are thrown as `HttpError` and mapped to JSON in one place. Unexpected errors are
   logged as structured JSON with the path and request id, and return a generic 500.

## Data

- **Postgres everywhere.** Production uses Supabase through `postgres.js` with
  `prepare: false` for the transaction pooler. Without `DATABASE_URL`, an embedded Postgres
  (PGlite) runs in-process and applies the same migrations, so development and CI need no setup
  and test the same SQL dialect as production.
- **Storage drivers** share one interface. Supabase Storage uses a private bucket and serves
  reads through short-lived signed URLs; the local driver writes to `.data/media`.

## Decisions

- **Guest workspaces.** A visitor gets a random 128-bit workspace id in an HTTP-only cookie.
  Because the id is a credential, no response includes it: queries select explicit columns and
  leave `owner` and the idempotency token out. A test enforces this.
- **Accounts adopt the guest workspace.** Signing up attaches the current workspace to the new
  account, so nothing made beforehand is lost and it becomes reachable from other devices. From
  then on the guest id is rejected as a credential, so signing out really ends access.
- **Passwords and sessions.** Passwords are hashed with scrypt and a per-password salt, and
  compared in constant time. An unknown email is verified against a decoy hash so both failures
  take the same time and return the same message. Session tokens are random 256-bit values;
  only their SHA-256 digest is stored.
- **Rate limit without a race.** The recent-job count and the insert run in one transaction
  under a per-workspace advisory lock. A test fires ten parallel submissions and expects exactly
  six to be accepted.
- **Tenant isolation.** Every query filters by workspace, and every stored object key is prefixed
  with it. A test proves a second workspace cannot read or change the first one's data.
- **Idempotent generation.** The client sends a token per submission and a unique index enforces
  it, so a retry returns the original job instead of billing twice.
- **Guarded state changes.** Completing a job and recording its asset happen in one transaction
  that only applies while the job is still `processing`, so a late result cannot overwrite a
  cancellation.
- **Untrusted uploads.** The declared type must be on the allow-list and must match the file's
  leading bytes. Local media is served with `nosniff` and a restrictive content security policy.
- **Provider key.** Held in an HTTP-only cookie, used only server-side, never stored.
- **No workspace row until needed.** Browsing costs no database write.

## Known limits

- Provider status is refreshed when the job list is read, at most five jobs per request. A
  background worker cannot do this, by design: the provider key lives only in the user's cookie
  and is never stored, so only a request from that user can poll.
- Uploads are limited to 4 MB by the hosting platform's request size cap. Lifting it needs
  direct-to-storage signed uploads, which should be built against a real Supabase project.
- Sign-in attempts are not throttled, and there is no password reset by email.
- No error-reporting service is wired in. Errors are logged as structured JSON with a request id
  that is also returned in the `X-Request-Id` header.
- The Supabase Storage driver has not run against a real project. Postgres has: the full suite
  passes against a real server locally and in CI.
- Paid provider output has never been verified with a funded key.
- No payments.
