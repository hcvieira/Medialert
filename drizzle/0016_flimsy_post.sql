CREATE TABLE `platform_fees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorProfileId` int NOT NULL,
	`referenceMonth` varchar(7) NOT NULL,
	`monthlyRevenue` decimal(10,2) NOT NULL,
	`feeAmount` decimal(10,2) NOT NULL,
	`feeType` enum('percentage','minimum') NOT NULL,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_fees_id` PRIMARY KEY(`id`)
);
