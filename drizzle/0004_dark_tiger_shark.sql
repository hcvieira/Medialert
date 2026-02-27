CREATE TABLE `clinical_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinical_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientName` varchar(255);--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientBirthDate` varchar(10);--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientInsurancePlan` varchar(128);--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD `patientNotes` text;