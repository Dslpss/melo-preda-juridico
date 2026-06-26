CREATE TABLE `filiais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cidade` varchar(100),
	`estado` varchar(50),
	`endereco` text,
	`telefone` varchar(20),
	`responsavelNome` varchar(255),
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filiais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `setores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`cor` varchar(7) DEFAULT '#6366f1',
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `setores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clientes` ADD `filialId` int;--> statement-breakpoint
ALTER TABLE `clientes` ADD `preferenciaContato` enum('whatsapp','ligacao','audio','presencial') DEFAULT 'whatsapp';--> statement-breakpoint
ALTER TABLE `clientes` ADD `setorAtualId` int;