CREATE TABLE `email_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(128),
	`locale` enum('en','zh') NOT NULL DEFAULT 'zh',
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`unsubscribeToken` varchar(64) NOT NULL,
	`lastSentAt` timestamp,
	`sentCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_subscriptions_email_unique` UNIQUE(`email`),
	CONSTRAINT `email_subscriptions_unsubscribeToken_unique` UNIQUE(`unsubscribeToken`)
);
