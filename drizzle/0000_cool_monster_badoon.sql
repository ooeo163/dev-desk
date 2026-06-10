CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`username` text,
	`password_cipher` text,
	`api_key_cipher` text,
	`totp_secret_cipher` text,
	`notes` text,
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo',
	`priority` integer DEFAULT 0,
	`credential_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`credential_id`) REFERENCES `credentials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vault_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
