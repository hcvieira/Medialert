CREATE TABLE `consultation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`message` text,
	`status` enum('pending','contacted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultation_requests_id` PRIMARY KEY(`id`)
);
