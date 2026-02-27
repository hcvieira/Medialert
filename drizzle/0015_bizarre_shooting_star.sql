ALTER TABLE `doctor_profiles` ADD `bankName` varchar(128);--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `bankAgency` varchar(20);--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `bankAccount` varchar(32);--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `bankAccountType` enum('corrente','poupanca');--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD `pixKey` varchar(128);