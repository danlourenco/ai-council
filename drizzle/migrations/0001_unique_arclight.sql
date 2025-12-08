PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`mode` text DEFAULT 'quick' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_conversations`("id", "project_id", "title", "mode", "created_by", "created_at", "updated_at") SELECT "id", "project_id", "title", "mode", "created_by", "created_at", "updated_at" FROM `conversations`;--> statement-breakpoint
DROP TABLE `conversations`;--> statement-breakpoint
ALTER TABLE `__new_conversations` RENAME TO `conversations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `conversations_project_id_idx` ON `conversations` (`project_id`);--> statement-breakpoint
CREATE INDEX `conversations_created_by_idx` ON `conversations` (`created_by`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `password` text;