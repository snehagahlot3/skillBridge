ALTER TABLE `ai_repos` ADD `gh_login` text;
ALTER TABLE `jobs` ADD `ai_gate_threshold` real;
ALTER TABLE `review_runs` ADD `pr_number` integer;
ALTER TABLE `review_runs` ADD `kind` text DEFAULT 'commit';