# Deployment

One Vercel project serves everything: the Next.js pages and the API route handler at
`/api/*`. Supabase provides Postgres and private file storage.

```
browser ──> Vercel (Next.js: pages + /api/*) ──> Supabase Postgres + Storage
```

Status: the build and the full test suite are verified locally on both the embedded database and
a real Postgres server, including migrations. What has not run yet is anything specific to
Supabase: the pooled connection string and the Supabase Storage driver. Check uploads and
previews first after deploying (step 6).

## What you need to create

| Item                         | Where                              | Notes                                         |
| ---------------------------- | ---------------------------------- | --------------------------------------------- |
| Supabase project             | supabase.com/dashboard             | Free plan. Allows 2 active projects per user. |
| Private storage bucket       | Supabase SQL editor (step 3)       | Named `media`.                                |
| Vercel project               | vercel.com, import the GitHub repo | Root directory `apps/web`.                    |
| Higgsfield API key, optional | Entered by each user in Settings   | Only needed for live generation.              |

## Steps

1. **Create a Supabase project** in your own Supabase account.
2. **Create the tables.** Run `DATABASE_URL=... npm run db:migrate` with the connection string
   from step 4. Alternatively paste each file in `packages/db/migrations/` into the SQL editor,
   in numeric order.
3. **Create the bucket.** In the SQL editor:
   ```sql
   insert into storage.buckets (id, name, public) values ('media', 'media', false);
   ```
4. **Collect three values** from the Supabase dashboard:
   - Project Settings → Database → Connection string → **Transaction pooler** → `DATABASE_URL`
   - Project Settings → API → Project URL → `SUPABASE_URL`
   - Project Settings → API → `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret)
5. **Create the Vercel project.** Import the repository, set **Root Directory** to `apps/web`,
   keep the detected Next.js settings, and add the three variables plus `SUPABASE_BUCKET=media`
   under Environment Variables. Deploy.
6. **Verify while signed out**, in a private window:
   - `https://<your-app>.vercel.app/api/health` returns `{"ok":true}`.
   - The landing page loads and **Open studio** reaches Explore.
   - A concept preview completes in Image studio and appears in My assets.
   - An image upload under 4 MB succeeds and opens from My assets.
   - Reloading keeps the same workspace.

## Limits that come from the platform

- Vercel caps a function request body at 4.5 MB, so uploads are limited to 4 MB. Larger uploads
  would need direct-to-storage signed uploads.
- Media is served by redirecting to a short-lived signed Supabase URL, so large generated videos
  never pass through a function response.
- Without `DATABASE_URL` the API falls back to the embedded database. That is correct for local
  development and CI, but on Vercel it would not persist, so always set the variables there.
