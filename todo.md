# MediAlert – TODO

## Branding & Setup
- [x] Gerar logo do aplicativo
- [x] Configurar tema de cores (azul médico)
- [x] Atualizar app.config.ts com nome e logo
- [x] Configurar ícones da tab bar

## Banco de Dados (AsyncStorage)
- [x] Modelo de dados: Medicamento
- [x] Modelo de dados: Dose (histórico de ingestão)
- [x] Modelo de dados: Familiar
- [x] Context/Provider para gerenciar estado global

## Navegação
- [x] Configurar 4 tabs: Hoje, Remédios, Histórico, Familiares
- [x] Configurar stack para telas de detalhe/edição

## Tela Home (Hoje)
- [x] Header com saudação e data
- [x] Resumo do dia (doses totais, tomadas, pendentes)
- [x] Lista de doses agendadas para hoje
- [x] Card de medicamento com status visual
- [x] Botão "Marcar como tomado"
- [x] Estado vazio (sem medicamentos cadastrados)
- [x] FAB para adicionar medicamento

## Tela Medicamentos
- [x] Lista de todos os medicamentos
- [x] Card com nome, dosagem, frequência
- [x] Toque para editar
- [x] Botão deletar com confirmação
- [x] Botão para adicionar
- [x] Estado vazio

## Formulário de Medicamento
- [x] Campo nome
- [x] Campo dosagem
- [x] Seletor de frequência (1x, 2x, 3x ao dia)
- [x] Seletor de horários
- [x] Campo observações
- [x] Salvar e agendar notificações

## Notificações
- [x] Solicitar permissão de notificação
- [x] Agendar notificação local por horário de dose
- [x] Cancelar notificações ao deletar medicamento
- [x] Notificação de confirmação para familiares

## Confirmação de Ingestão
- [x] Marcar dose como tomada
- [x] Feedback haptico na confirmação
- [x] Registrar no histórico
- [x] Enviar notificação para familiares

## Tela Histórico
- [x] Lista de doses por data (agrupada)
- [x] Status visual: tomado / perdido / pendente
- [x] Porcentagem de aderência ao tratamento

## Tela Familiares
- [x] Lista de familiares cadastrados
- [x] Adicionar familiar (nome + contato)
- [x] Toggle ativar/desativar notificações
- [x] Deletar familiar

## Polimento
- [x] Suporte a modo escuro (tema automático)
- [x] Testes unitários (12 testes passando)

## Melhorias v2.0

### Autenticação & Onboarding
- [x] Tela de boas-vindas (welcome.tsx) com login OAuth
- [x] Tela de onboarding com seleção de papel (familiar/paciente)
- [x] Tela de entrada de código de convite (join-invite.tsx)
- [x] Redirecionamento automático para welcome se não autenticado
- [x] Redirecionamento para onboarding se papel não definido

### Biometria
- [x] Hook useBiometricLock com Face ID / impressão digital
- [x] BiometricLockScreen exibida sobre o app quando bloqueado
- [x] Re-lock após 5 minutos em background

### Novo fluxo de papéis
- [x] Familiar gera código de convite e compartilha com paciente
- [x] Paciente insere código para vincular ao familiar
- [x] Tela Familiares refatorada com visão por papel

### Notificações push reais
- [x] Hook usePushToken para registrar token no servidor
- [x] Notificação push real ao familiar quando paciente confirma dose
- [x] Backend: rotas user.setRole, user.registerPushToken, user.getProfile
- [x] Backend: rotas invite.create, invite.accept, invite.getMyPatients, invite.getMyCaregiver
- [x] Backend: rotas doses.confirmTaken com envio de push para familiar

## Bugs

- [x] Corrigir erro "OAuth callback failed" ao fazer login no Expo Go (celular)
- [x] Corrigir erro "code and state are required" no login OAuth nativo (Expo Go)
- [x] Corrigir erro "code and state are required" no login OAuth via browser web no celular
- [x] Corrigir retorno à tela de login após autenticação no browser web (token não persiste)
- [x] Centralizar AuthContext para evitar múltiplas instâncias do useAuth causando deslogin

## Redesign v3.0 — Interface Premium de Autenticação

### Backend Auth Próprio
- [x] Rota auth.register (nome, email, senha com hash bcrypt)
- [x] Rota auth.login (email + senha, retorna sessionToken)
- [x] Rota auth.forgotPassword (envio de código de reset)
- [x] Rota auth.resetPassword (novo password com código)
- [x] Rota auth.logout
- [x] Migração: tabela users com campo passwordHash

### Tela de Login
- [x] Design premium com gradiente, logo, card com sombra
- [x] Campo e-mail com teclado email e validação de formato
- [x] Campo senha com toggle mostrar/ocultar
- [x] Botão Entrar com estado de carregamento
- [x] Link "Esqueci minha senha"
- [x] Link "Criar conta"
- [x] Mensagem de erro clara por campo
- [x] Suporte a tema claro/escuro

### Tela de Criar Conta
- [x] Campo nome
- [x] Campo e-mail com validação
- [x] Campo senha (mínimo 8 caracteres)
- [x] Campo confirmar senha
- [x] Botão Criar conta com estado de carregamento
- [x] Link "Já tenho conta"
- [x] Validação em tempo real por campo
- [x] Feedback de sucesso e redirecionamento automático

### Tela de Esqueci minha Senha
- [x] Campo e-mail
- [x] Botão enviar código
- [x] Campo código de verificação
- [x] Campo nova senha + confirmar
- [x] Navegação de volta ao login

### Remoção do Manus
- [x] Remover botão "Entrar com Manus" da welcome.tsx
- [x] Remover imports e dependências do OAuth Manus
- [x] Ícones de autenticação adicionados ao icon-symbol.tsx

## Bugs v3.1

- [x] Usuário com conta OAuth existente não consegue login por e-mail/senha (sem passwordHash) — mensagem clara orienta a usar "Esqueci minha senha"
- [x] Código de reset de senha não é enviado por e-mail — integrado Resend para envio real de e-mail HTML

## Bugs v3.2

- [x] Usuário OAuth (Google) não consegue definir senha pela primeira vez — fluxo de reset já suportava contas sem passwordHash; mensagem de erro no login orienta o usuário

## Bugs v3.3

- [x] Código de reset não chega por e-mail (domínio Resend não verificado) — código exibido diretamente na tela quando e-mail falha

## Módulo Médico v4.0

### Backend
- [x] Novo appRole: "doctor" na tabela users
- [x] Tabela doctor_profiles: CRM, especialidade, convênios, telefone, bio
- [x] Tabela doctor_patients: vínculo médico-paciente com código de convite
- [x] Tabela appointments: consultas agendadas (médico, paciente, data, hora, status, convênio)
- [x] Rotas: doctor.getProfile, doctor.setupProfile, doctor.generateInvite, doctor.acceptInvite
- [x] Rotas: doctor.getPatients, doctor.getPatientMedications, doctor.prescribeMedication, doctor.getMyDoctors
- [x] Rotas: appointments.create, appointments.listForDoctor, appointments.listForPatient, appointments.confirm, appointments.cancel
- [x] Push notification para paciente ao prescrever medicamento e agendar consulta

### Onboarding do Médico
- [x] Opção "Sou médico" na tela de onboarding
- [x] Tela de perfil médico: CRM, especialidade, convênios aceitos, telefone, bio
- [x] Geração de código de convite para pacientes

### Painel do Médico (web + mobile)
- [x] Tab "Pacientes" — lista de pacientes vinculados com status de adesão
- [x] Tab "Agenda" — lista de consultas do médico agrupadas por data
- [x] Tela de detalhe do paciente: medicamentos, histórico de doses, próxima consulta
- [x] Tela de prescrição: adicionar medicamento com horários para o paciente
- [x] Tela de agendar consulta: data, hora, convênio, observações
- [x] Redirecionamento automático para painel do médico após login

### Lado do Paciente
- [x] Tela para aceitar convite do médico (via código)
- [x] Botões de acesso rápido "Consultas" e "Meus Médicos" na home
- [x] Tela de consultas do paciente com confirmação de presença
- [x] Tela de lista de médicos vinculados com informações do perfil
- [x] Medicamentos prescritos pelo médico aparecem automaticamente com alertas

## Melhoria v4.1 — Seleção de perfil no cadastro

- [x] Adicionar seleção de perfil (médico / paciente+familiar) no início da tela de criar conta
- [x] Fluxo médico: após cadastro, ir direto para setup-profile (CRM, especialidade)
- [x] Fluxo paciente/familiar: após cadastro, ir para onboarding normal
- [x] Visual diferenciado por perfil selecionado (cor, ícone, descrição, gradiente)

## Módulo Médico v4.2 — Fluxo invertido (médico cadastra paciente)

### Backend
- [x] Campo phone, birthDate, insurancePlan na tabela doctor_patients (ficha do paciente)
- [x] Tabela clinical_notes: anotações clínicas por consulta (doctorId, patientId, note, createdAt)
- [x] Rota doctor.addPatient: médico cadastra paciente por nome+email+telefone, envia convite por e-mail
- [x] Rota doctor.updatePatientInfo: médico atualiza dados do paciente
- [x] Rota clinicalNotes.add: médico adiciona anotação clínica
- [x] Rota clinicalNotes.list: histórico de anotações por paciente
- [x] Rota doctor.getPatientHistory: histórico completo (consultas + doses + anotações + dados pessoais)
- [x] E-mail de convite enviado pelo Resend ao cadastrar paciente

### Painel do Médico
- [x] Botão "Adicionar paciente" com formulário (nome, e-mail, telefone, data nasc., convênio)
- [x] Ficha completa do paciente: dados pessoais, medicamentos, histórico de consultas, notas clínicas
- [x] Tela de detalhe com 4 abas: Ficha, Remédios, Consultas, Notas
- [x] Modal de edição de ficha do paciente (nome, telefone, nasc., convênio, observações)
- [x] Histórico de todas as consultas com status (agendada/confirmada/cancelada)

### Agenda
- [x] Lista de consultas agrupadas por data no painel do médico
- [x] Status de cada consulta (confirmada, pendente, cancelada)
- [x] Acesso rápido à ficha do paciente a partir da agenda

### Lado do Paciente
- [x] Aceitar convite via código gerado pelo médico
- [x] Ver histórico de consultas com status de confirmação

## Bugs v4.3

- [x] Código de convite do médico retorna "inválido" ao ser usado pelo paciente — campo maxLength aumentado de 10 para 20 caracteres (código tem 14 chars)
- [x] Pacientes com status "pendente" no painel do médico não têm opções de ação — modal adicionado com código completo e botão de compartilhar

## Bugs v4.4

- [x] Código de convite alfanumérico de 14 chars não cabe no campo do paciente — trocar para 6 dígitos numéricos
- [x] Modal de paciente pendente não mostra dados cadastrais nem ficha médica — adicionar botão "Ver ficha completa" que abre patient-detail.tsx

## Bugs v4.5

- [x] Prescrição do médico não permite personalizar horários — adicionar campo de horários customizáveis além das opções pré-definidas
- [x] Medicamentos prescritos pelo médico não aparecem na tela do paciente vinculado — investigar e corrigir fluxo de exibição

## Melhorias v4.6

- [x] Notificação de lembrete nos horários exatos das doses prescritas pelo médico (push notification agendada)
- [x] Relatório de adesão ao tratamento na ficha do paciente (% doses tomadas vs. total nos últimos 7/30 dias)
- [x] Editar prescrição pelo médico (dosagem, horários)
- [x] Cancelar/desativar prescrição pelo médico

## Bugs v4.7

- [x] Botão X (cancelar prescrição) não funciona — corrigir a mutation cancelPrescription no backend
- [x] Aba Remédios mostra todos os medicamentos juntos — separar em seção "Ativos" e seção "Histórico" (inativos)

## Melhorias v4.8

- [x] Botão "Reativar" nos cards do histórico de medicamentos
- [x] Data de cancelamento exibida nos medicamentos inativos (ex: "Cancelado em 22/02/2026")
- [x] Contador de doses perdidas nos últimos 7 dias em cada card de medicamento ativo

## Melhorias v4.9

- [x] Filtro de busca por nome na tela de pacientes do médico
- [x] Filtro por status (Todos / Ativos / Pendentes) na tela de pacientes do médico

## Melhorias v4.10

- [x] Ordenação da lista de pacientes (A-Z, mais recente, adesão)
- [x] Badges de contagem nos chips de filtro (ex: "Pendentes 3")
- [x] Busca por nome e data na aba Agenda

## Melhorias v4.11

- [x] Edição de status de consulta pelo médico (Agendada → Confirmada → Realizada)
- [x] Confirmação automática de consulta pelo paciente via push ou app muda status na tela do médico
- [x] Visão semanal da agenda do médico com indicadores visuais por dia
- [x] Exportar ficha do paciente em PDF (dados pessoais, medicamentos ativos, histórico de consultas)

## Melhorias v4.12

- [x] Foto de perfil do paciente (upload via câmera/galeria, armazenado no S3)
- [x] Foto/logo do médico na visualização do paciente (upload via câmera/galeria, armazenado no S3)
- [x] Notificação de lembrete de consulta 24h antes com botão de confirmação
- [x] Notificação de lembrete de consulta 1h antes com botão de confirmação

## Melhorias v4.13

- [x] Menu câmera/galeria no upload de foto do paciente e do médico
- [x] Foto do paciente nos cards da lista de pacientes do médico
- [x] Push notification ao médico quando paciente confirma consulta (já estava implementado no backend)

## Melhorias v4.14

- [x] Opção "Remover foto" no menu de upload (paciente e médico)
- [x] Compressão de imagem antes do upload (qualidade 0.7 já aplicada no ImagePicker)
- [x] Push notification ao paciente quando médico prescreve novo medicamento (já estava implementado)

## Melhorias v4.15

- [x] Crop circular na seleção de foto (allowsEditing já ativo, aspecto 1:1 garantido)
- [x] Modo escuro na tela de login
- [x] Histórico de alterações do paciente (log de edições com data/hora)

## Melhorias v4.16

- [x] Botão "Salvar no calendário" na tela de consultas do paciente (evento no calendário nativo)

## Melhorias v4.17

- [x] Verificação de duplicata ao salvar consulta no calendário
- [x] Campo de localização/endereço na consulta (médico ao agendar, paciente vê no card)
- [x] Botão "Compartilhar" no card de consulta do paciente (share sheet nativo)

## Melhorias v4.18

- [x] Mapa integrado ao endereço da consulta — tocar no 📍 abre Google Maps/Apple Maps com o endereço
- [x] Edição de consulta pelo médico — editar data, hora, local e convênio de consulta já agendada
- [x] Filtro de consultas por data/período na agenda do médico — seletor de intervalo de datas com atalhos (esta semana, este mês, próx. 30 dias)

## Melhorias v4.19

- [x] Notificação push de reagendamento com resumo das alterações (de/para data e hora)
- [ ] Visualização mensal na agenda do médico com indicadores de dias com consultas

## Melhorias v4.20

- [x] Tela de visualização do familiar — ver medicamentos e doses do dia do paciente vinculado em tempo real
- [x] Visualização mensal na agenda do médico — calendário com grade mensal e indicadores de dias com consultas

## Melhorias v4.21

- [x] Bottom sheet ao tocar no dia do calendário mensal — lista de consultas do dia com edição e alteração de status
- [x] Notificação push para o familiar em dose atrasada — alerta se dose ficar pendente 30 min após horário programado
- [x] Exportação da agenda em texto formatado — share sheet nativo com consultas do período

## Melhorias v4.22

- [x] Upload de logo/foto já no cadastro do médico (tela setup-profile)
- [x] Upload de foto já no cadastro do paciente (tela de onboarding/registro)

## Melhorias v4.23

- [x] Exibir avatar do usuário na home do paciente (cabeçalho com saudação)
- [x] Foto do familiar/cuidador no card de paciente vinculado na tela do médico
- [x] Tela de configurações com edição de foto, nome e opções do usuário

## Melhorias v4.24

- [x] Acesso à tela de configurações no dashboard do médico (avatar clicável no perfil)
- [x] Notificação push de boas-vindas após completar o onboarding
- [x] Indicador de perfil incompleto na home do paciente (sem foto ou nome)

## Bugs

- [x] Botão "Sair da conta" na tela de configurações não funciona (corrigido: navega explicitamente para /welcome após logout)
- [x] Botão "Sair da conta" não funciona no dispositivo real (Expo Go) — corrigido com dismissAll() antes do replace
- [x] App trava no spinner quando usuário tem sessão ativa mas perfil foi apagado do banco (corrigido: redireciona para /welcome se query retornar erro ou sem dados)
- [x] Botão de foto no setup-profile do médico não abre câmera/galeria no dispositivo real (corrigido: ActionSheetIOS + Pressable com zIndex)
- [x] Modal de nota clínica abre teclado mas não exibe o modal no dispositivo real (iOS) — corrigido: KeyboardAvoidingView + removido autoFocus

## Melhorias v4.25

- [x] Máscara de data no padrão brasileiro (DD/MM/AAAA) com preenchimento automático das barras em todos os campos de data
- [x] KeyboardAvoidingView em todos os modais com TextInput para que o teclado não cubra os campos

## Melhorias v4.26

- [x] Máscara de horário HH:MM com auto-inserção dos dois-pontos em todos os campos de horário
- [x] Confirmação e solicitação de reagendamento de consultas pelo paciente
- [x] Gráfico de adesão semanal por medicamento na aba Remédios da ficha do paciente

## Melhorias v4.27

- [x] Campo de endereço do consultório no perfil do médico (setup-profile e configurações)
- [x] Pré-preenchimento automático do campo Local ao agendar/editar consulta com o endereço do médico
- [x] Botão "Alterar endereço" no campo Local para digitar endereço diferente do consultório

## Bugs v4.28

- [x] Erro "POP_TO_TOP was not handled by any navigator" no rodapé da tela do paciente
- [x] Remédio excluído pelo médico ainda aparece para o paciente

## Bugs v4.29

- [x] Remédio inativo no médico ainda aparece ativo/pendente para o paciente (doses orphans no banco)
- [x] Erro POP_TO_TOP ainda ocorre na tela home do paciente (tab bar)

## Melhorias v4.30

- [x] Marcar doses pendentes do dia como canceladas ao encerrar uma prescrição
- [x] Seção "Prescrições encerradas" na aba Remédios da ficha do paciente (com data de cancelamento e botão Reativar)

## Melhorias v4.31

- [x] Notificação push ao familiar vinculado quando o médico cancela uma prescrição do paciente

## Melhorias v4.32

- [x] Banner de próxima consulta na Home do paciente com data, horário, médico e local
- [x] Tela de diretório de médicos com busca por cidade e filtro por especialidade
- [x] Botão "Buscar Médico" adicionado nos atalhos rápidos da Home do paciente

## Melhorias v4.33

- [x] Avaliação de médico (1-5 estrelas) após consulta realizada — tabela no banco, endpoint, modal pós-consulta
- [x] Média de estrelas exibida no diretório de médicos
- [x] Filtro por convênio no diretório de médicos

## Melhorias v4.34

- [x] Redesign premium da tela "Minhas Consultas" do paciente
- [x] Corrigir erro POP_TO_TOP persistente na tela de consultas do paciente

## Bugs v4.35

- [x] Familiar não consegue inserir código de convite do paciente — aba "Familiares" agora tem campo para inserir código do paciente
- [x] Onboarding do familiar não orienta como vincular ao paciente via código — aba Familiares explica o fluxo bidirecional

## Melhorias v4.35 — Vinculação bidirecional familiar-paciente

- [x] Backend: endpoint invite.createForCaregiver (paciente gera código para familiar)
- [x] Backend: endpoint invite.acceptAsCaregiverInvite (familiar insere código do paciente)
- [x] UI: aba Familiares do caregiver — campo para inserir código gerado pelo paciente
- [x] UI: aba Familiares do paciente — opção de gerar código para o familiar inserir

## Melhorias v4.36

- [x] Backend: endpoint invite.unlink (desvincular familiar/paciente)
- [x] Backend: notificação push quando vínculo é aceito (ambos os lados)
- [x] UI: botão "Desvincular" na aba Familiares do paciente e do caregiver
- [x] UI: tela de visão geral do paciente para o familiar (doses do dia, resumo de adesão)

## Melhorias v4.37

- [x] Backend: alerta de adesão baixa para o familiar (notificação push quando paciente < 50% das doses tomadas)

## Bugs v4.38

- [x] Erro "Este código é para pacientes, não para familiares" ao inserir código no campo errado — endpoint universal acceptAnyCode detecta o tipo e vincula corretamente

## Refatoração v4.39 — Papéis dinâmicos

- [x] Backend: endpoint invite.getMyRoles que infere isPatient/isCaregiver a partir dos vínculos
- [x] Backend: remover updateUserAppRole do acceptAnyCode (papel não muda ao vincular)
- [x] UI: aba Familiares exibe seção de pacientes E seção de familiar quando usuário tem os dois papéis
- [x] UI: onboarding — papel vira sugestão inicial, não restrição permanente

## Melhorias v4.40 — QR Code para vinculação

- [x] QR Code exibido ao gerar código de convite (junto com código alfanumérico)
- [x] Scanner de QR Code no campo de inserção de código

## Bugs v4.41

- [x] Erro "Query data cannot be undefined" na aba Familiares — corrigido: todas as funções do db.ts agora retornam null em vez de undefined

## Backlog Futuro — Telemedicina (não implementar sem registro no CRM)

- [ ] Módulo de teleconsulta por vídeo (WebView + Jitsi Meet)
- [ ] TCLE digital com hash + versão + timestamp vinculado ao appointment
- [ ] Sala de espera com pré-check de câmera/microfone/conexão
- [ ] Tokens efêmeros de acesso à sala (nunca persistidos em texto puro)
- [ ] Registro clínico mínimo do teleatendimento (data/hora, médico, paciente, modalidade, local do paciente)
- [ ] Upload de anexos PDF vinculados ao atendimento (S3 com URL assinada e expirável)
- [ ] Logs de auditoria: join/start/end/upload + timestamps + actorId
- [ ] Push notifications de lembrete de teleconsulta (sem dados sensíveis)
- [ ] Matriz de compliance CFM 2.314/2022 + LGPD
- [ ] PRÉ-REQUISITO LEGAL: registro da empresa no CRM do estado sede + responsável técnico médico (Art. 17 da Res. CFM 2.314/2022)
- [ ] PRÉ-REQUISITO LEGAL: assinatura digital ICP-Brasil do médico para documentos emitidos (Art. 13 da Res. CFM 2.314/2022)

## Melhorias v4.43 — Avaliação de médicos pelo paciente

- [x] Backend: tabela doctor_reviews (patientId, doctorId, appointmentId, rating 1-5, comment, createdAt)
- [x] Backend: endpoints reviews.submit, reviews.getForDoctor, reviews.getMyReview
- [x] Backend: notificação push ao paciente quando consulta muda para status "realizada" pedindo avaliação
- [x] UI: modal de avaliação com estrelas interativas e campo de comentário
- [x] UI: exibir média de estrelas e avaliações no card do médico (Meus Médicos e Diretório)
- [x] UI: botão "Avaliar médico" na lista de consultas realizadas do paciente

## Melhorias v4.44

- [x] Comentários das avaliações no diretório de médicos (2 mais recentes com estrelas, exibidos apenas quando há comentários)

## Melhorias v4.45 — Perfil detalhado do médico

- [x] Backend: endpoint reviews.getPublicDoctorProfile com dados completos + avaliações enriquecidas com nome do paciente
- [x] UI: tela doctor-profile com cabeçalho hero, bio, convênios, endereço e todas as avaliações com nome do avaliador
- [x] UI: navegação para o perfil a partir do diretório (toque no card) e de Meus Médicos (botão "Ver perfil completo")

## Melhorias v4.46 — Solicitação de consulta pelo perfil do médico

- [x] Backend: tabela consultation_requests (patientId, doctorId, phone, message, status, createdAt)
- [x] Backend: endpoints reviews.requestConsultation, reviews.listConsultationRequests, reviews.updateConsultationRequestStatus + notificação push ao médico
- [x] UI: botão "Solicitar consulta" no perfil do médico com modal de telefone e mensagem opcional
- [x] UI: aba "Solicitações" no dashboard do médico com cards de pacientes (nome, telefone, data, botões Ligar/WhatsApp/Contatado)

## Melhorias v4.47 — Painel de Métricas do Médico

- [x] Backend: notificação push ao paciente quando médico marca solicitação como "Contatado"
- [x] Backend: endpoint doctor.getMetrics com dados de aquisição, consultas, adesão e avaliações por período
- [x] UI: aba "Relatórios" no dashboard do médico com filtros de período (7d, 30d, 3m, total)
- [x] UI: seção Aquisição (total pacientes, origem, solicitações, taxa de conversão)
- [x] UI: seção Engajamento (consultas realizadas, taxa confirmação, taxa cancelamento, adesão média)
- [x] UI: seção Avaliações (nota média, distribuição de estrelas, últimas avaliações)

### Estabilidade & Proteção contra Erros v4.48
- [x] Testes automáticos: auth.login, auth.register, auth.logout, auth.forgotPassword, auth.resetPassword (14 testes)
- [x] Testes automáticos: fluxo de vinculação familiar-paciente (gerar código → aceitar → desvincular, 8 testes)
- [x] Testes automáticos: doses.confirmTaken, doses.checkOverdue, doses.ensureToday (7 testes)
- [x] Testes automáticos: doctor.getMetrics com validação de estrutura do retorno (6 testes)
- [x] Componente AppErrorBoundary global para capturar crashes de renderização React
- [x] Componente QueryErrorView e hook useQueryGuard para erros de rede nas queries
- [x] Tratamento de isError nas queries críticas: pacientes, solicitações, métricas do médico
- [x] loadError no AppContext com botão "Tentar novamente" na tela principal do paciente
- [x] QueryClient com retry inteligente (sem retry em erros de autenticação/validação, sem retry em mutations)
- [x] staleTime de 30s no QueryClient para evitar refetches desnecessários

## Responsividade Web v4.49

- [x] Hook useScreenSize para detectar mobile/tablet/desktop
- [x] Dashboard do médico: sidebar vertical em desktop (≥768px), tab bar em mobile
- [x] Layout de conteúdo com max-width e centralizado em desktop
- [x] Cards de pacientes em grid 2 colunas em desktop
- [x] Telas de Agenda, Relatórios, Solicitações e Perfil com max-width em desktop
- [x] Tela de login com card centralizado em desktop (max-width 440px)
- [x] Tela de cadastro com card centralizado em desktop (max-width 480px)
- [x] Tela de recuperação de senha com card centralizado em desktop
- [x] Testes: 50 passando, 0 erros TypeScript, JSX válido em todos os arquivos modificados

### Notificações In-App para o Médico v4.50
- [x] Backend: tabela doctor_notifications (id, doctorId, type, title, body, referenceId, isRead, createdAt)
- [x] Backend: endpoint doctor.getNotifications (lista paginada, não lidas primeiro)
- [x] Backend: endpoint doctor.countUnreadNotifications
- [x] Backend: endpoint doctor.markNotificationRead (marcar uma como lida)
- [x] Backend: endpoint doctor.markAllNotificationsRead (marcar todas como lidas)
- [x] Backend: gerar notificação ao receber nova solicitação de consulta
- [x] Backend: gerar notificação ao receber nova avaliação de paciente
- [x] UI: componente NotificationBell com badge de contagem de não lidas
- [x] UI: dropdown/modal com lista de notificações (título, corpo, tempo relativo, status lida/não lida)
- [x] UI: badge desaparece ao marcar todas como lidas
- [x] UI: toque na notificação navega para a aba relevante (Solicitações ou Pacientes)
- [x] UI: sino integrado na sidebar (desktop) e no header (mobile) do dashboard
- [x] Polling a cada 30s para atualizar contagem de não lidas automaticamente

## Modo Offline-First v4.51

- [x] Hook useNetworkStatus para detectar conectividade em tempo real (polling 10s + AppState)
- [x] Sistema de cache offline com TTL de 24h (offlineCache no AsyncStorage)
- [x] Fila de mutações pendentes no AsyncStorage (mutationQueue)
- [x] Sincronização automática da fila ao reconectar (OfflineSyncProvider)
- [x] Banner visual de status: "Sem conexão" (cinza), "Sincronizando" (azul), "Sincronizado" (verde)
- [x] Banner "Sincronizado" some automaticamente após 3.5s
- [x] Tela de doses: marcar dose offline enfileira para sync posterior
- [x] Tela de doses: atualização otimista do cache ao marcar offline
- [x] Cache das doses do dia salvo automaticamente ao carregar do servidor
- [x] OfflineSyncProvider integrado no layout raiz (disponível em todo o app)
- [x] Retry inteligente: desiste após 3 tentativas, descarta erros de auth/validação

## Correção Preventiva v4.52

- [x] Substituir onSuccess deprecated nas queries por useEffect para salvar cache offline
- [x] Confirmado: todos os demais onSuccess no projeto são em useMutation (correto, não deprecated)

## Bug Fix v4.53

- [x] Corrigir erro "Unable to transform response from server" no formulário de configuração do perfil médico (setup-profile)
  - Causa: endpoint retornava objeto bruto do banco com campos Date (createdAt/updatedAt) que o SuperJSON não conseguia serializar corretamente
  - Correção: endpoint agora retorna { success: true, userId } em vez do objeto raw do banco

## Bug Fix v4.54

- [x] Corrigir aviso POP_TO_TOP no setup do perfil médico e tela de configurações
  - Causa: router.dismissAll() chamado sem modal aberto disparava POP_TO_TOP
  - Correção: removido dismissAll() do logout no dashboard.tsx e settings.tsx; router.replace() é suficiente

## Bug Fix v4.55

- [x] Corrigir botão "Sair da conta" na web (usa window.confirm() na web, Alert.alert no mobile)
- [x] Corrigir "Alterar status" de consulta na web (handleStatusChange)
- [x] Corrigir "Cancelar consulta" na web (handleCancelAppt)
  - Causa: Alert.alert é nativo iOS/Android e não funciona no browser
  - Correção: Platform.OS === "web" usa window.confirm(), demais usam Alert.alert()

## Bug Fix v4.56

- [ ] Corrigir toque no card do médico no Diretório (não navega para detalhe/solicitação de consulta)

## Bug Fix v4.56 (continuação)

- [x] Corrigir toque no card do médico no Diretório — causa: rotas patient/doctor-directory e patient/doctor-profile não estavam registradas no Stack Navigator do _layout.tsx

## Bug Fix v4.57 — "Médico não encontrado" no perfil do médico

- [x] Corrigir endpoint getPublicDoctorProfile que retornava null para todos os médicos do diretório
  - Causa: getAllDoctorsWithRatings retorna id = doctorProfiles.id (profileId), mas getPublicDoctorProfile chamava getUserById(profileId) esperando userId
  - Correção: endpoint agora busca getDoctorProfileById(profileId) primeiro, depois getUserById(profile.userId)
- [x] Corrigir Alert.alert no doctor-profile.tsx (solicitação de consulta) — usa showAlert() com window.alert() na web
- [x] Corrigir Alert.alert no appointments.tsx (confirmação, reagendamento, avaliação, cancelamento) — usa showAlert/showConfirm com web fallback
- [x] Corrigir Alert.alert no dashboard.tsx (consulta atualizada, agenda vazia, alterar status, cancelar, foto, solicitações) — usa showAlert/showConfirm
- [x] Corrigir Alert.alert no patient-detail.tsx (prescrição, consulta, notas, foto) — usa showAlert/showConfirm
- [x] Corrigir serialização de Date em reviews no endpoint getPublicDoctorProfile — createdAt convertido para ISO string
- [x] Registrar rota family/patient-overview no Stack Navigator

## Bug Fix v4.58 — Correções Visuais e Filtros do Diretório

- [x] Corrigir layout dos filtros no diretório de médicos (chips cortados/overflow horizontal)
- [x] Adicionar filtro por especialidade com label e chips horizontais com scroll
- [x] Adicionar filtro por região (cidade/estado extraído do endereço e CRM)
- [x] Adicionar filtro por convênio com label e chips horizontais com scroll
- [x] Melhorar busca para incluir nome do médico, especialidade e cidade
- [x] Adicionar botão "Limpar" no header quando há filtros ativos
- [x] Corrigir lineHeight ausente em texto de múltiplas telas (texto cortado no iOS)
  - appointments.tsx: 16 estilos corrigidos
  - my-doctors.tsx: 6 estilos corrigidos
  - doctor-profile.tsx: 8 estilos corrigidos
  - setup-profile.tsx: tagText corrigido
  - medication/add.tsx: freqChipText e timeBadgeText corrigidos

## Melhorias v4.59 — Diretório de Médicos

- [x] Ordenação no diretório por "Melhor avaliação", "Mais avaliados" e "A-Z" com dropdown
- [x] Paginação no diretório — carregar 10 por vez com botão "Ver mais"
- [x] Foto do médico nos cards da listagem (com fallback de inicial e tratamento de erro de imagem)
- [x] CTA "Ver perfil e solicitar consulta" nos cards do diretório
- [x] Adição do ícone arrow.up.arrow.down ao icon-symbol.tsx

## Melhorias v4.60 — Mapa, Favoritos e Compartilhamento

- [x] Mapa de médicos com pinos no diretório (toggle lista/mapa com botão 🗺️/📋)
- [x] Favoritos no diretório — botão coração nos cards + aba "Favoritos" com contador
- [x] Compartilhamento de perfil do médico via Share nativo (iOS/Android) ou clipboard (web)

## Módulo MGM v5.0 — Sistema de Indicações Multinível e Dashboard Admin

- [x] Schema: campo `referral_code` e `indicated_by_id` na tabela `doctor_profiles`
- [x] Schema: tabela `commission_rules` (nível, ano, valor)
- [x] Schema: tabela `commissions_ledger` (quem gerou, quem recebeu, valor, status, mês)
- [x] Backend: gerar referral_code único no cadastro do médico
- [x] Backend: endpoint de cadastro via link de indicação (aceita referral_code)
- [x] Backend: job de cálculo mensal de comissões (mês 7+, 45 consultas/mês)
- [x] Backend: endpoints admin (KPIs, lista de comissões, marcar como pago, visualizar rede)
- [x] Frontend: tela de cadastro com campo de código de indicação
- [x] Frontend: Dashboard Master Admin com KPIs, tabela de comissões e visualização de rede
- [x] Frontend: tela do médico para ver seu link de indicação e rede de indicados

## Melhorias Admin v5.2
- [x] Botão "Marcar como pago" nas comissões MGM (individual e em lote) com data de pagamento
- [x] Tela de gestão de usuários no painel admin (listar médicos, pacientes, cuidadores com ativar/desativar)
- [x] Exportação de relatório de comissões em CSV (download direto no painel admin)

## MGM v5.3 — Ranking, Estrutura e Tela do Médico
- [x] Backend: endpoint de ranking de indicadores (top médicos por indicações e comissões)
- [x] Backend: endpoint de estrutura da rede (árvore hierárquica de indicações)
- [x] Backend: endpoint de comissões do médico (rede própria, provisões futuras, pagas, próxima data de pagamento)
- [x] Backend: lógica de data de pagamento (dia 10, se sábado→segunda, se domingo→segunda)
- [x] Admin: tela de ranking de indicadores com pódio e lista completa
- [x] Admin: tela de estrutura da rede MGM consultaável por médico
- [x] Médico: tela "Minha Rede MGM" com indicados vinculados, comissões futuras e pagas com datas

## Correções e Melhorias v5.4
- [x] Corrigir botão de voltar sobreposto ao título em telas admin (network-tree, ranking, users, export, mgm-dashboard)
- [x] Remover prefixo "Médico" e mostrar apenas o nome do médico na estrutura da rede e ranking
- [x] Adicionar KPIs da empresa no dashboard admin (tela de entrada): total médicos, pacientes, consultas, receita estimada
- [x] Expandir auditoria MGM com rede de 2 níveis (médico que indicou e também tem indicados abaixo dele)

## Financeiro Admin v5.5
- [x] Backend: calcular receita bruta (total de consultas completed × R$300 valor médio)
- [x] Dashboard admin: exibir Receita Bruta, Comissões Pendentes e Líquido (bruto − pendentes) na tela de entrada

## Correção Botão Voltar v5.6
- [x] Corrigir paddingTop do header no mgm-dashboard.tsx (botão voltar sobreposto à barra de status)
- [x] Auditar e corrigir todas as demais telas admin com o mesmo problema (ranking, network-tree, users, export, mgm-my-network)

## Precificação e Comissões por Consulta v5.7
- [ ] Schema: tabela `doctor_insurance_fees` (doctorId, insuranceName, feeAmount, isDefault)
- [ ] Schema: campo `feeAmount` na tabela `appointments` (valor da consulta no momento da realização)
- [ ] Backend: endpoints CRUD para valores por convênio do médico
- [ ] Backend: endpoint para calcular comissões das consultas do médico (receita por consulta)
- [ ] Backend: atualizar receita bruta no admin para usar valores reais por médico/convênio
- [ ] Frontend médico: tela de gestão de valores por convênio (no perfil do médico)
- [ ] Frontend médico: tela de comissões geradas pelas consultas realizadas
- [ ] Frontend admin: receita bruta atualizada com valores reais por médico

## Melhorias Financeiras v5.8
- [ ] Vincular convênio à consulta ao agendar e registrar receita automaticamente ao marcar como realizada
- [ ] Ranking de receita por médico no painel admin (quem mais faturou no mês)
- [ ] Meta mensal de receita para o médico com barra de progresso na tela Minhas Receitas

## Notificações Push + E-mail v5.9

### Notificação de Comissão Paga
- [x] Backend: enviar push notification ao médico quando admin marcar comissão como paga
- [x] Backend: enviar e-mail ao médico quando admin marcar comissão como paga (valor, mês referência, data pagamento)
- [x] Frontend: médico recebe push com título "Comissão Paga" e valor

### Sistema de Notificações por E-mail
- [x] Backend: template de e-mail HTML para comissão paga
- [x] Backend: template de e-mail HTML para boas-vindas do médico
- [x] Backend: serviço centralizado de envio de e-mail (reutilizável)

### Onboarding Guiado para Novos Médicos
- [x] Tela de onboarding passo-a-passo após primeiro login do médico (welcome flow)
- [x] Passo 1: Boas-vindas com explicação do app e funcionalidades
- [x] Passo 2: Orientar cadastro de valores por convênio (link direto para tela)
- [x] Passo 3: Apresentar programa de indicações e compartilhar link
- [x] Passo 4: Dicas de uso (adicionar pacientes, agendar consultas)
- [x] Backend: flag `onboardingCompleted` no doctor_profiles para controlar exibição
- [x] E-mail de boas-vindas enviado ao médico após completar setup-profile

## Melhorias Futuras (anotadas para implementação posterior)
- [ ] Central de notificações do médico — tela dedicada para listar todas as notificações in-app com marcação de lidas/não lidas
- [ ] E-mail de lembrete de consulta — enviar e-mail automático ao paciente 24h antes de consulta agendada
- [ ] Relatório mensal por e-mail — enviar resumo mensal ao médico com total de consultas, receita e comissões

## Auditoria Completa do Sistema v5.10
- [x] Verificar estrutura do banco de dados e schema (todas as tabelas, campos, tipos)
- [x] Auditar todas as rotas do backend (routers.ts e db.ts) — verificar erros lógicos
- [x] Auditar todas as telas e fluxos de navegação do frontend
- [x] Testar fluxos completos via API (cadastro, login, comissões, indicações)
- [x] Corrigir todos os erros encontrados
- [x] Executar testes e verificar integridade final

### Correções aplicadas na auditoria:
- [x] Ícone `arrow.clockwise` adicionado ao icon-symbol.tsx (mapeado para "refresh")
- [x] Rota `admin/mgm-network` corrigida para `admin/network-tree` no dashboard.tsx e _layout.tsx
- [x] Rota `settings` adicionada ao Stack Navigator no _layout.tsx
- [x] Todos os 80 ícones usados no app verificados e mapeados corretamente
- [x] Todos os 31 arquivos de rota verificados e existentes
- [x] Zero handlers onPress vazios encontrados
- [x] Zero erros TypeScript (tsc --noEmit limpo)
- [x] 75 testes unitários passando (8 suites)
- [x] 40 testes de integração via API passando (script audit-test.ts)

## Simulação de Cenário Realista v5.11
- [x] Limpar banco de dados mantendo apenas admin (heliton@medialert.com)
- [x] Popular com 30-40 médicos com nomes brasileiros realistas (35 médicos)
- [x] Estrutura MGM de 3 níveis (5 fundadores → 11 nível 1 → 19 nível 2)
- [x] Médicos veteranos (>6 meses) com 45-60 consultas/mês (elegíveis a comissão)
- [x] Médicos novos (<6 meses) com 40-48 consultas/mês
- [x] Valores de consulta por especialidade (mín. R$300): 14 especialidades com valores realistas
- [x] Comissões calculadas até 2ª camada (103 entradas: 84 pagas R$16.600, 19 pendentes R$3.400)
- [x] 111 pacientes vinculados com 19.424 consultas e 2.815 avaliações
- [x] Histórico de 2 anos de operação simulado (receita total R$9.271.090)

## Tela de Comissões Pendentes (Detalhe Admin) v5.12
- [x] Card "Comissões Pendentes" no dashboard admin clicável → abre tela de detalhamento
- [x] Tela lista todos os médicos com comissões pendentes, valor individual e total
- [x] Mostrar próxima data de pagamento (dia 10 do próximo mês)
- [x] Permitir marcar como pago diretamente da tela

## Dados Bancários do Médico v5.13
- [x] Schema: adicionar campos bankName, bankAgency, bankAccount, bankAccountType, pixKey ao doctor_profiles
- [x] Backend: atualizar upsertDoctorProfile para aceitar dados bancários
- [x] Frontend: adicionar seção de dados bancários no setup-profile do médico
- [x] Frontend: permitir editar dados bancários nas configurações do médico
- [x] Admin: exibir dados bancários na tela de comissões pendentes para facilitar pagamento

## Correção de Métricas do Painel Médico v5.14
- [x] Investigar e corrigir "Taxa de confirmação" — renomeado para "Taxa de realização" (completed/total)
- [x] Corrigir "Adesão média dos pacientes" — criados 225 medicamentos + 24.034 dose_records (agora 81%)
- [x] Corrigir "Avaliações" — remapeados doctorIds de reviews (agora 196 reviews, média 4.0 para Ricardo)
- [x] Renomear labels para serem mais claros e intuitivos

## Taxa de Plataforma e Valor Mínimo de Consulta v5.15

- [ ] Schema: adicionar tabela platform_fees para registrar cobranças mensais por médico
- [ ] Backend: calcular taxa mensal — após 6 meses: 2,5% se faturamento ≥ R$12.000, senão R$150 fixo
- [ ] Backend: endpoint para calcular e registrar taxa do mês corrente por médico
- [ ] Backend: endpoint admin para listar todas as taxas pendentes e pagas
- [ ] Validação backend: bloquear cadastro de convênio/particular com valor < R$120
- [ ] Validação frontend: mostrar erro ao tentar salvar convênio com valor < R$120
- [ ] Dashboard médico: exibir taxa de plataforma do mês atual e histórico
- [ ] Dashboard admin: exibir total de taxas a receber e pagas
- [ ] Seed: popular taxas históricas para os 35 médicos simulados
