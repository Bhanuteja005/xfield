ALTER TABLE "users" ADD COLUMN "onboarding" jsonb;--> statement-breakpoint
-- Accounts that existed before onboarding shipped are treated as onboarded.
UPDATE "users" SET "onboarding" = '{}'::jsonb;