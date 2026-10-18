CREATE TABLE `email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`body_preview` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` text DEFAULT (datetime('now'))
);