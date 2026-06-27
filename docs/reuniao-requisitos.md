# Documentação completa da reunião sobre sistema para escritório de advocacia

Created: 2026-06-15T20:35:08.106Z

## Objetivo da reunião
- Levantar as necessidades reais de um escritório de advocacia para iniciar o desenvolvimento de um sistema interno.
- Organizar o atendimento, reduzir tarefas manuais e melhorar o acompanhamento de clientes, processos e documentos.
- Entender o fluxo atual, principalmente o atendimento via WhatsApp, a distribuição interna das demandas e o controle de perícias.

## Contexto do escritório
- O escritório atua com demandas jurídicas e previdenciárias.
- O atendimento principal ocorre por um número central de WhatsApp.
- Existem **três escritórios/polos físicos** e cerca de **10 pessoas** envolvidas nas rotinas operacionais.
- O fluxo atual funciona, mas depende fortemente de ações manuais, repasses entre pessoas e controles paralelos.

## Principais dores identificadas
### Limitações do WhatsApp
- A versão web limita o número de conexões simultâneas.
- A versão baixada permite ligações, mas não oferece o mesmo controle de etiquetas.
- A versão web não permite ligações.
- O histórico de conversas não fica acessível por muito tempo.
- O uso alternado entre web e aplicativo gera retrabalho.

### Atendimento manual
- Um atendente central recebe tudo, faz a triagem e repassa para outros colaboradores.
- Quando a demanda muda de setor, o repasse é feito manualmente.
- Falta uma ferramenta única para organizar o fluxo completo.

### Público com baixa escolaridade
- Muitos clientes têm dificuldade de leitura e escrita.
- Menus automáticos com opções numeradas não funcionam bem.
- O atendimento por áudio e ligação é mais eficiente.
- O sistema não pode constranger o cliente nem exigir muita leitura.

### Gestão documental
- O fluxo de documentos é muito manual.
- Há etapas como escaneamento, envio por e-mail, download, organização em pasta e repasse ao cliente.
- Isso consome tempo e aumenta o risco de falhas.

## Fluxo atual de atendimento
### Primeiro contato
- O primeiro atendimento é feito por uma pessoa responsável, identificada no fluxo como **Felipe**.
- Essa pessoa:
  - recebe a mensagem inicial;
  - identifica a necessidade do cliente;
  - verifica se é cliente novo ou recorrente;
  - direciona para o setor correto;
  - aplica etiquetas no WhatsApp;
  - repassa a conversa quando necessário.

### Continuidade do atendimento
- Depois da triagem inicial, a demanda pode seguir para:
  - financeiro;
  - jurídico;
  - administrativo;
  - atendimento com advogado;
  - outros responsáveis específicos.
- O colaborador que assume a conversa precisa ter acesso ao contexto completo.

## Setores identificados
- **Primeiro atendimento**
- **Financeiro**
- **Jurídico / atendimento com advogado**
- **Administrativo**
- **Processos**
- **Setor de repasse e acompanhamento interno**

## Fluxo previdenciário e de perícias
### Importância das perícias
- A perícia é um ponto crítico do processo previdenciário.
- Cada cliente pode passar por duas perícias.
- As datas são marcadas com muita antecedência.

### Necessidade de lembretes
- O escritório precisa:
  - avisar o cliente com antecedência;
  - reenviar lembretes periodicamente;
  - confirmar se o cliente não esqueceu a data;
  - reforçar local, horário e documentos necessários.

### Problema atual
- O controle é manual.
- A equipe precisa consultar sistemas externos, gerar PDFs, enviar ao cliente e acompanhar depois.
- Isso demanda muito tempo e aumenta a chance de esquecimento.

## Fluxo de documentos
### Processo atual
- O cliente entrega documentos presencialmente ou envia por WhatsApp.
- O primeiro atendente cria uma etiqueta.
- Outra pessoa extrai os documentos.
- Os arquivos são organizados em pasta/drive.
- O material é repassado internamente.

### Problemas atuais
- Dependência de várias pessoas.
- Risco de perda de informação.
- Retrabalho.
- Falta de centralização.

## Requisitos funcionais levantados
### 1. Atendimento centralizado
- Receber mensagens em um único número.
- Distribuir para vários usuários internos.
- Manter histórico completo da conversa.
- Permitir continuidade do atendimento por diferentes colaboradores.

### 2. Triagem inteligente
- Identificar o tipo de demanda.
- Classificar cliente novo ou recorrente.
- Direcionar para o setor correto.
- Registrar observações do atendimento.

### 3. Cadastro de clientes
- Cadastrar cliente com dados básicos.
- Vincular cliente a um escritório/polo.
- Registrar histórico de atendimento.
- Armazenar observações relevantes.

### 4. Cadastro de processos
- Registrar processos por cliente.
- Acompanhar status.
- Associar documentos.
- Controlar etapas e datas importantes.

### 5. Gestão de perícias
- Cadastrar datas de perícia.
- Enviar lembretes automáticos.
- Permitir reenvio periódico.
- Registrar confirmação de contato.

### 6. Gestão de setores
- Criar setores internos no sistema.
- Distribuir demandas por área.
- Identificar responsáveis por cada tipo de atendimento.
- Manter o histórico de encaminhamento.

### 7. Multiatendimento
- Permitir vários usuários acessando o mesmo número central.
- Organizar filas ou salas por setor.
- Evitar dependência da versão web do WhatsApp.
- Permitir continuidade do atendimento por diferentes colaboradores.

### 8. Controle de perfil do cliente
- Registrar observações sobre o cliente.
- Indicar preferência por áudio, ligação ou texto.
- Armazenar informações úteis para atendimentos futuros.
- Apoiar a triagem sem constranger o cliente.

### 9. Integração com WhatsApp
- Conectar o número central ao sistema.
- Receber mensagens em tempo real.
- Permitir resposta dentro da plataforma.
- Manter o atendimento organizado por conversa.

### 10. Envio de mensagens automáticas
- Disparar lembretes de perícia.
- Reenviar mensagens em intervalos configuráveis.
- Avisar sobre documentos pendentes.
- Notificar retornos e acompanhamentos.

## Requisitos não funcionais
### Usabilidade
- O sistema precisa ser simples e intuitivo.
- Deve se adaptar ao fluxo real do escritório.

### Baixa complexidade operacional
- A equipe não quer uma ferramenta difícil de treinar.
- A solução não pode bagunçar a rotina atual.

### Confiabilidade
- O sistema deve reduzir erros.
- Deve evitar perda de histórico.
- Precisa manter os dados organizados.

### Escalabilidade
- Deve suportar múltiplos atendentes.
- Precisa atender vários setores e vários clientes ao mesmo tempo.

### Segurança
- Como haverá dados sensíveis, o sistema deve controlar acesso por perfil de usuário.

## Fluxo ideal desejado
1. O cliente envia mensagem para o número central.
2. O primeiro atendente identifica a demanda.
3. O sistema registra o perfil do cliente e o setor responsável.
4. A conversa é encaminhada internamente.
5. O sistema salva histórico, documentos, observações e status.
6. O sistema dispara lembretes automáticos de perícia e retorno.
7. O cliente é acompanhado sem depender de controles paralelos.

## Problemas que o sistema precisa resolver
- Centralização do atendimento.
- Multiatendimento real.
- Organização por setores.
- Histórico acessível.
- Controle de documentos.
- Lembretes automáticos.
- Acompanhamento de perícias.
- Redução de retrabalho.
- Melhor distribuição interna.
- Adaptação ao público com baixa escolaridade.

## Sugestão de módulos para o desenvolvimento
### Módulo 1 — Atendimento
- Entrada de mensagens.
- Triagem.
- Distribuição.
- Histórico.

### Módulo 2 — Clientes
- Cadastro.
- Observações.
- Perfil de atendimento.
- Vínculo com filial.

### Módulo 3 — Processos
- Cadastro de processo.
- Status.
- Etapas.
- Documentos.
- Datas importantes.

### Módulo 4 — Perícias e lembretes
- Cadastro de perícias.
- Alertas automáticos.
- Reenvio periódico.
- Confirmação de contato.

### Módulo 5 — Setores e usuários
- Criação de setores.
- Permissões.
- Responsáveis.
- Filas de atendimento.

### Módulo 6 — Documentos
- Upload.
- Organização.
- Associação ao cliente/processo.
- Consulta rápida.

### Módulo 7 — Integração WhatsApp
- Conexão com número central.
- Recebimento de mensagens.
- Resposta pelo sistema.
- Organização de conversas.

## Prioridades para a primeira versão
1. Centralizar o atendimento.
2. Permitir multiusuário.
3. Organizar por setores.
4. Registrar histórico completo.
5. Cadastrar clientes e processos.
6. Automatizar lembretes de perícia.
7. Vincular documentos ao cliente.
8. Criar observações sobre o perfil do cliente.

## Observações importantes
- O escritório não quer perder o fluxo atual que já funciona.
- O primeiro atendimento precisa continuar humanizado.
- A automação deve apoiar, não substituir totalmente o atendimento humano.
- O sistema precisa respeitar o perfil dos clientes.
- O maior ganho esperado é reduzir trabalho manual e organizar o repasse interno.

## Conclusão
- O escritório possui uma operação funcional, porém muito dependente de WhatsApp, controles manuais e repasses internos.
- O sistema deve atuar como uma plataforma central de atendimento e gestão.
- A solução precisa integrar triagem, setores, clientes, processos, documentos e lembretes automáticos.
