CREATE TABLE `commission_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` int NOT NULL,
	`yearOfReferred` int NOT NULL DEFAULT 1,
	`amount` decimal(10,2) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commission_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissions_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredId` int NOT NULL,
	`level` int NOT NULL,
	`referenceMonth` varchar(7) NOT NULL,
	`appointmentsCount` int NOT NULL DEFAULT 0,
	`yearOfReferred` int NOT NULL DEFAULT 1,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissions_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `referralCode` varchar(16);--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `indicatedById` int;--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_referralCode_unique` UNIQUE(`referralCode`);