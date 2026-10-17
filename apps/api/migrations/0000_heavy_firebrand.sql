CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`applicant_id` text NOT NULL,
	`pitch` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`details` text,
	`timestamp` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`sector` text,
	`city` text,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`udyam_number` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mentor_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`expertise` text,
	`organization` text,
	`bio` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text,
	`city` text,
	`college` text,
	`bio` text,
	`skills` text,
	`public_slug` text,
	`passport_consent` integer DEFAULT false,
	`linkedin` text,
	`github` text,
	`portfolio` text,
	`resume_key` text,
	`resume_name` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_public_slug_unique` ON `profiles` (`public_slug`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`required_skills` text,
	`budget_type` text NOT NULL,
	`budget_amount` real,
	`deadline` text,
	`acceptance_criteria` text,
	`rubric` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`mentor_id` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mentor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewer_type` text NOT NULL,
	`rubric_scores` text,
	`comments` text,
	`decision` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`applicant_id` text NOT NULL,
	`notes` text,
	`file_urls` text,
	`submitted_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verified_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`skill` text NOT NULL,
	`level` text NOT NULL,
	`project_id` text NOT NULL,
	`review_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE no action
);
