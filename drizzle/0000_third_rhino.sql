CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`model` text DEFAULT 'Upload' NOT NULL,
	`folder` text DEFAULT '' NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assets_owner_created` ON `assets` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_folders_owner` ON `folders` (`owner`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`token` text NOT NULL,
	`prompt` text NOT NULL,
	`model` text NOT NULL,
	`kind` text NOT NULL,
	`settings` text NOT NULL,
	`status` text NOT NULL,
	`provider` text,
	`asset` text,
	`error` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_owner_created` ON `jobs` (`owner`,`created`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_owner_token` ON `jobs` (`owner`,`token`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_owner` ON `projects` (`owner`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Creator' NOT NULL,
	`created` integer NOT NULL
);
