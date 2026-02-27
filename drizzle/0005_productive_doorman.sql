CREATE TABLE `patient_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`linkId` int NOT NULL,
	`field` varchar(64) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientPhotoUrl` text;--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `canceledAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `photoUrl` text;