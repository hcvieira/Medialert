CREATE TABLE `doctor_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctor_reviews_id` PRIMARY KEY(`id`)
);
