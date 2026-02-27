CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`time` varchar(5) NOT NULL,
	`insurance` varchar(128),
	`notes` text,
	`status` enum('scheduled','confirmed','cancelled','completed') NOT NULL DEFAULT 'scheduled',
	`reminderSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int NOT NULL DEFAULT 0,
	`inviteCode` varchar(32) NOT NULL,
	`accepted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctor_patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctor_patients_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `doctor_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`crm` varchar(32) NOT NULL,
	`crmState` varchar(2) NOT NULL DEFAULT 'SP',
	`specialty` varchar(128) NOT NULL,
	`insurances` text NOT NULL DEFAULT ('[]'),
	`phone` varchar(20),
	`bio` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctor_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctor_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `appRole` enum('caregiver','patient','doctor') NOT NULL DEFAULT 'caregiver';