CREATE TABLE `caregiver_patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverId` int NOT NULL,
	`patientId` int NOT NULL,
	`inviteCode` varchar(32) NOT NULL,
	`accepted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caregiver_patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `caregiver_patients_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `dose_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicationId` int NOT NULL,
	`patientId` int NOT NULL,
	`medicationName` varchar(255) NOT NULL,
	`scheduledTime` varchar(5) NOT NULL,
	`date` varchar(10) NOT NULL,
	`status` enum('pending','taken','missed') NOT NULL DEFAULT 'pending',
	`takenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dose_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medication_times` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicationId` int NOT NULL,
	`time` varchar(5) NOT NULL,
	CONSTRAINT `medication_times_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`caregiverId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`dosage` varchar(128) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#3B82F6',
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `appRole` enum('caregiver','patient') DEFAULT 'caregiver' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pushToken` varchar(512);