CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"model" text DEFAULT 'Upload' NOT NULL,
	"folder" text DEFAULT '' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"token" text NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"kind" text NOT NULL,
	"settings" jsonb NOT NULL,
	"status" text NOT NULL,
	"provider" text,
	"asset" text,
	"error" text,
	"created" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"created" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Creator' NOT NULL,
	"created" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_assets_owner_created" ON "assets" USING btree ("owner","created");--> statement-breakpoint
CREATE INDEX "idx_assets_published_created" ON "assets" USING btree ("published","created");--> statement-breakpoint
CREATE INDEX "idx_folders_owner" ON "folders" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "idx_jobs_owner_created" ON "jobs" USING btree ("owner","created");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_jobs_owner_token" ON "jobs" USING btree ("owner","token");--> statement-breakpoint
CREATE INDEX "idx_projects_owner" ON "projects" USING btree ("owner","created");