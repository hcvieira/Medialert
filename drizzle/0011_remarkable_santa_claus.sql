CREATE TABLE `doctor_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`type` enum('consultation_request','new_review') NOT NULL,
	`title` varchar(128) NOT NULL,
	`body` varchar(512) NOT NULL,
	`referenceId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctor_notifications_id` PRIMARY KEY(`id`)
);
