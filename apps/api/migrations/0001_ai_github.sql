CREATE TABLE `ai_repos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`owner` text NOT NULL,
	`repo` text NOT NULL,
	`branch` text DEFAULT 'main' NOT NULL,
	`token_enc` text NOT NULL,
	`last_reviewed_sha` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`commit_sha` text NOT NULL,
	`commit_message` text,
	`status` text NOT NULL,
	`summary` text,
	`rating` real,
	`findings` text,
	`suggested_fixes` text,
	`comment_url` text,
	`tokens_used` integer,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `ai_repos`(`id`) ON UPDATE no action ON DELETE no action
);