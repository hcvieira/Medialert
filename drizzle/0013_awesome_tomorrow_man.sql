CREATE TABLE `appointment_revenues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`doctorProfileId` int NOT NULL,
	`insuranceName` varchar(128),
	`feeAmount` decimal(10,2) NOT NULL,
	`referenceMonth` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_revenues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_insurance_fees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorProfileId` int NOT NULL,
	`insuranceName` varchar(128) NOT NULL,
	`feeAmount` decimal(10,2) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctor_insurance_fees_id` PRIMARY KEY(`id`)
);
