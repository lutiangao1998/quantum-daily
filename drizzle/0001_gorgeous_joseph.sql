CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`title` varchar(1024) NOT NULL,
	`titleZh` varchar(1024),
	`url` text NOT NULL,
	`source` varchar(128) NOT NULL,
	`category` enum('quantum_computing','quantum_communication','quantum_sensing','quantum_cryptography','general') NOT NULL DEFAULT 'general',
	`summaryEn` text,
	`summaryZh` text,
	`importanceScore` float DEFAULT 5,
	`authors` text,
	`publishedAt` timestamp,
	`rawContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportDate` varchar(10) NOT NULL,
	`title` varchar(512) NOT NULL,
	`titleZh` varchar(512),
	`pdfUrl` text,
	`articleCount` int NOT NULL DEFAULT 0,
	`status` enum('pending','crawling','analyzing','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`summaryEn` text,
	`summaryZh` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `reports_reportDate_unique` UNIQUE(`reportDate`)
);
