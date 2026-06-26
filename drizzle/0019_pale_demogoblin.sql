CREATE TABLE `atendimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telefoneCliente` varchar(30) NOT NULL,
	`nomeCliente` varchar(255),
	`clienteId` int,
	`setorId` int,
	`usuarioId` int,
	`status` enum('aberto','em_atendimento','encerrado') NOT NULL DEFAULT 'aberto',
	`canal` varchar(20) NOT NULL DEFAULT 'whatsapp',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atendimentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mensagens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`atendimentoId` int NOT NULL,
	`origem` enum('cliente','atendente','sistema') NOT NULL,
	`tipo` enum('texto','audio','imagem','documento','video') NOT NULL DEFAULT 'texto',
	`conteudo` text NOT NULL,
	`evolutionMsgId` varchar(100),
	`usuarioId` int,
	`lida` int NOT NULL DEFAULT 0,
	`criadaEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mensagens_id` PRIMARY KEY(`id`)
);
