CREATE TABLE `work_log_items` (
	`id` text PRIMARY KEY NOT NULL,
	`work_log_id` text NOT NULL,
	`content` text NOT NULL,
	`is_cancelled` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`source_task_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_log_id`) REFERENCES `work_logs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `work_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` integer NOT NULL,
	`week_end` integer NOT NULL,
	`project_progress` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
