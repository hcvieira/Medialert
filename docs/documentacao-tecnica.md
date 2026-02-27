# MediAlert — Documentação Técnica

> **Versão:** 4.40 | **Data:** Fevereiro de 2026 | **Stack:** React Native · Expo SDK 54 · TypeScript · tRPC · MySQL · Drizzle ORM

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Banco de Dados](#3-banco-de-dados)
4. [API — Endpoints tRPC](#4-api--endpoints-trpc)
5. [Sistema de Autenticação](#5-sistema-de-autenticação)
6. [Sistema de Papéis (Roles)](#6-sistema-de-papéis-roles)
7. [Sistema de Vinculação Familiar-Paciente](#7-sistema-de-vinculação-familiar-paciente)
8. [Sistema de Notificações Push](#8-sistema-de-notificações-push)
9. [Telas do Aplicativo](#9-telas-do-aplicativo)
10. [Componentes Reutilizáveis](#10-componentes-reutilizáveis)
11. [Configuração e Variáveis de Ambiente](#11-configuração-e-variáveis-de-ambiente)
12. [Dependências Principais](#12-dependências-principais)

---

## 1. Visão Geral da Arquitetura

O MediAlert é um aplicativo móvel multiplataforma (iOS, Android, Web) construído com **Expo SDK 54** e **React Native 0.81**. A comunicação entre cliente e servidor é feita exclusivamente via **tRPC**, garantindo tipagem end-to-end sem necessidade de codegen adicional.

```
┌─────────────────────────────────────────────────────┐
│                   Cliente (Expo)                     │
│  React Native + NativeWind + Expo Router             │
│  tRPC Client → React Query (cache + mutations)       │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / tRPC
┌────────────────────▼────────────────────────────────┐
│                  Servidor (Express)                  │
│  tRPC Router → Procedures → db.ts (Drizzle ORM)     │
│  Expo Push Notifications · S3 Storage · Email        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              MySQL (PlanetScale / Railway)            │
│  11 tabelas · Drizzle ORM · Migrações automáticas    │
└─────────────────────────────────────────────────────┘
```

O servidor Express roda na porta **3000** (desenvolvimento) e expõe a API em `/api/trpc`. O Metro Bundler do Expo roda na porta **8081**.

---

## 2. Estrutura de Pastas

```
medialert/
├── app/                        ← Telas (Expo Router — file-based routing)
│   ├── (tabs)/                 ← Abas principais (tab bar)
│   │   ├── _layout.tsx         ← Configuração da tab bar
│   │   ├── index.tsx           ← Home (Doses de Hoje)
│   │   ├── medications.tsx     ← Remédios
│   │   ├── history.tsx         ← Histórico
│   │   └── family.tsx          ← Familiares (vinculação)
│   ├── doctor/                 ← Telas do médico
│   │   ├── dashboard.tsx       ← Painel do médico
│   │   ├── patient-detail.tsx  ← Detalhes do paciente
│   │   └── setup-profile.tsx   ← Configuração do perfil médico
│   ├── family/
│   │   └── patient-overview.tsx ← Visão geral do paciente (para familiar)
│   ├── medication/
│   │   ├── add.tsx             ← Adicionar medicamento
│   │   └── [id].tsx            ← Detalhes/edição do medicamento
│   ├── patient/
│   │   ├── accept-invite.tsx   ← Aceitar convite do médico
│   │   ├── appointments.tsx    ← Minhas consultas
│   │   ├── doctor-directory.tsx ← Diretório de médicos
│   │   └── my-doctors.tsx      ← Meus médicos
│   ├── _layout.tsx             ← Root layout (providers)
│   ├── welcome.tsx             ← Tela de boas-vindas
│   ├── signup.tsx              ← Cadastro
│   ├── onboarding.tsx          ← Seleção de papel inicial
│   ├── join-invite.tsx         ← Inserir código de convite
│   ├── settings.tsx            ← Configurações
│   └── forgot-password.tsx     ← Recuperação de senha
├── components/                 ← Componentes reutilizáveis
├── server/                     ← Backend Express + tRPC
│   ├── _core/                  ← Infraestrutura do servidor
│   ├── db.ts                   ← Funções de acesso ao banco
│   ├── routers.ts              ← Todos os endpoints tRPC
│   └── storage.ts              ← Upload S3
├── drizzle/
│   └── schema.ts               ← Schema completo do banco de dados
├── lib/                        ← Utilitários e contextos do cliente
├── hooks/                      ← Custom hooks React
├── constants/                  ← Constantes de tema
├── assets/                     ← Ícones, splash, fontes
├── app.config.ts               ← Configuração Expo
├── theme.config.js             ← Paleta de cores
└── tailwind.config.js          ← Configuração NativeWind
```

---

## 3. Banco de Dados

O banco de dados é **MySQL** gerenciado via **Drizzle ORM**. As migrações são aplicadas com `pnpm db:push`.

### 3.1 Tabelas

| Tabela | Descrição | Chave Primária |
|--------|-----------|----------------|
| `users` | Todos os usuários do sistema | `id` (auto-increment) |
| `caregiver_patients` | Vínculos familiar ↔ paciente | `id` |
| `medications` | Medicamentos cadastrados | `id` |
| `medication_times` | Horários de cada medicamento | `id` |
| `dose_records` | Registro diário de doses | `id` |
| `doctor_profiles` | Perfil profissional do médico | `id` |
| `doctor_patients` | Vínculos médico ↔ paciente | `id` |
| `clinical_notes` | Notas clínicas do médico | `id` |
| `appointments` | Consultas agendadas | `id` |
| `patient_audit_log` | Log de alterações de dados do paciente | `id` |
| `doctor_reviews` | Avaliações de médicos pelos pacientes | `id` |

### 3.2 Tabela `users`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `int` PK | Identificador interno |
| `openId` | `varchar(64)` UNIQUE | Identificador do provedor OAuth ou `email_<timestamp>` |
| `name` | `text` | Nome do usuário |
| `email` | `varchar(320)` | E-mail |
| `loginMethod` | `varchar(64)` | `"email"`, `"google"`, `"apple"` |
| `role` | `enum` | `"user"` ou `"admin"` |
| `appRole` | `enum` | `"caregiver"`, `"patient"`, `"doctor"` (legado — ver §6) |
| `passwordHash` | `varchar(255)` | Hash bcrypt (apenas login por e-mail) |
| `resetToken` | `varchar(128)` | Token de recuperação de senha |
| `pushToken` | `varchar(512)` | Token Expo Push Notifications |
| `photoUrl` | `text` | URL S3 da foto de perfil |

### 3.3 Tabela `caregiver_patients`

Registra o vínculo entre familiar (caregiver) e paciente. O código de convite (`inviteCode`) é gerado por qualquer um dos lados e aceito pelo outro.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `caregiverId` | `int` | FK → `users.id` do familiar |
| `patientId` | `int` | FK → `users.id` do paciente (0 = pendente) |
| `inviteCode` | `varchar(32)` UNIQUE | Código alfanumérico de 8 caracteres |
| `accepted` | `boolean` | `true` após o vínculo ser aceito |

### 3.4 Tabela `medications`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `patientId` | `int` | FK → `users.id` do paciente |
| `caregiverId` | `int` | FK → `users.id` de quem criou (pode ser o próprio paciente) |
| `name` | `varchar(255)` | Nome do medicamento |
| `dosage` | `varchar(128)` | Dosagem (ex: "500mg") |
| `color` | `varchar(16)` | Cor do card em hex |
| `active` | `boolean` | Se o medicamento está ativo |

### 3.5 Tabela `dose_records`

Gerada diariamente por `medications.ensureMyDosesToday`. Um registro por horário por medicamento por dia.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `medicationId` | `int` | FK → `medications.id` |
| `patientId` | `int` | FK → `users.id` |
| `scheduledTime` | `varchar(5)` | Horário agendado `"HH:MM"` |
| `date` | `varchar(10)` | Data `"YYYY-MM-DD"` |
| `status` | `enum` | `"pending"`, `"taken"`, `"missed"`, `"cancelled"` |
| `takenAt` | `timestamp` | Momento em que foi marcado como tomado |

### 3.6 Tabela `appointments`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `doctorId` | `int` | FK → `users.id` do médico |
| `patientId` | `int` | FK → `users.id` do paciente |
| `date` | `varchar(10)` | Data `"YYYY-MM-DD"` |
| `time` | `varchar(5)` | Horário `"HH:MM"` |
| `status` | `enum` | `"scheduled"`, `"confirmed"`, `"cancelled"`, `"completed"`, `"reschedule_requested"` |
| `insurance` | `varchar(128)` | Plano de saúde |
| `location` | `varchar(255)` | Local da consulta |

---

## 4. API — Endpoints tRPC

Todos os endpoints são acessados via `trpc.<namespace>.<procedure>`. Procedures marcadas como **protegidas** exigem sessão autenticada (cookie `session`).

### 4.1 Namespace `auth`

| Endpoint | Tipo | Acesso | Descrição |
|----------|------|--------|-----------|
| `auth.me` | Query | Público | Retorna o usuário autenticado ou `null` |
| `auth.register` | Mutation | Público | Cadastro com e-mail e senha |
| `auth.login` | Mutation | Público | Login com e-mail e senha |
| `auth.logout` | Mutation | Público | Encerra a sessão (limpa cookie) |
| `auth.forgotPassword` | Mutation | Público | Envia e-mail de recuperação de senha |
| `auth.resetPassword` | Mutation | Público | Redefine a senha com token |

### 4.2 Namespace `user`

| Endpoint | Tipo | Acesso | Descrição |
|----------|------|--------|-----------|
| `user.setRole` | Mutation | Protegido | Define o papel inicial (`appRole`) |
| `user.registerPushToken` | Mutation | Protegido | Registra token Expo para notificações |
| `user.getProfile` | Query | Protegido | Retorna perfil do usuário autenticado |
| `user.updateProfile` | Mutation | Protegido | Atualiza nome e outros dados |
| `user.uploadSelfPhoto` | Mutation | Protegido | Faz upload da foto de perfil (base64 → S3) |

### 4.3 Namespace `invite`

Gerencia o sistema de vinculação familiar-paciente. Todos os endpoints são protegidos.

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `invite.create` | Mutation | Familiar gera código para o paciente inserir |
| `invite.createForCaregiver` | Mutation | Paciente gera código para o familiar inserir |
| `invite.accept` | Mutation | Paciente insere código gerado pelo familiar |
| `invite.acceptAsCaregiverInvite` | Mutation | Familiar insere código gerado pelo paciente |
| `invite.acceptAnyCode` | Mutation | **Universal** — detecta o tipo do código e vincula corretamente |
| `invite.unlink` | Mutation | Desvincular familiar ou paciente |
| `invite.getMyPatients` | Query | Lista pacientes vinculados ao familiar |
| `invite.getMyCaregiver` | Query | Retorna o familiar vinculado ao paciente |
| `invite.getMyRoles` | Query | Retorna `{ isPatient, isCaregiver }` inferidos dos vínculos |
| `invite.getPatientDosesSummary` | Query | Resumo de doses do dia de um paciente (para familiar) |
| `invite.getPatientMedications` | Query | Lista medicamentos de um paciente (para familiar) |
| `invite.getPatientDosesToday` | Query | Doses de hoje de um paciente (para familiar) |
| `invite.ensurePatientDosesToday` | Mutation | Gera registros de dose do dia para um paciente |
| `invite.checkAdherenceAlert` | Mutation | Verifica adesão e envia alerta ao familiar se < 50% |

### 4.4 Namespace `medications`

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `medications.list` | Query | Lista medicamentos de um paciente (por ID) |
| `medications.listMine` | Query | Lista medicamentos ativos do usuário autenticado |
| `medications.listAllMine` | Query | Lista todos os medicamentos (ativos e inativos) |
| `medications.listMyDosesToday` | Query | Doses de hoje do usuário autenticado |
| `medications.markTaken` | Mutation | Marca uma dose como tomada |
| `medications.ensureMyDosesToday` | Mutation | Gera registros de dose para o dia atual |
| `medications.create` | Mutation | Cria novo medicamento |
| `medications.update` | Mutation | Atualiza medicamento existente |
| `medications.delete` | Mutation | Remove medicamento |

### 4.5 Namespace `doses`

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `doses.listForPatient` | Query | Lista doses de um paciente em um intervalo de datas |
| `doses.ensureToday` | Mutation | Garante que os registros do dia existem |
| `doses.confirmTaken` | Mutation | Confirma dose como tomada |

### 4.6 Namespace `doctor`

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `doctor.getProfile` | Query | Retorna perfil do médico autenticado |
| `doctor.listAll` | Query | Lista todos os médicos (diretório público) |
| `doctor.setupProfile` | Mutation | Cria/atualiza perfil profissional do médico |
| `doctor.generateInvite` | Mutation | Gera código de convite para paciente |
| `doctor.uploadDoctorPhoto` | Mutation | Upload de foto do médico |
| `doctor.uploadPatientPhoto` | Mutation | Upload de foto do paciente |
| `doctor.addPatient` | Mutation | Adiciona paciente à lista do médico |
| `doctor.updatePatientInfo` | Mutation | Atualiza dados do paciente |
| `doctor.getPatientAuditLog` | Query | Log de alterações de dados do paciente |
| `doctor.getPatientsAll` | Query | Lista todos os pacientes do médico |
| `doctor.getPatientHistory` | Query | Histórico de doses de um paciente |
| `doctor.getPatients` | Query | Lista pacientes vinculados ao médico |
| `doctor.getPatientMedications` | Query | Medicamentos de um paciente |
| `doctor.prescribeMedication` | Mutation | Prescreve medicamento para paciente |
| `doctor.exportPatientPDF` | Mutation | Gera PDF com dados do paciente |
| `doctor.getAdherenceReport` | Query | Relatório de adesão do paciente |
| `doctor.getWeeklyAdherence` | Query | Adesão semanal do paciente |
| `doctor.updatePrescription` | Mutation | Atualiza prescrição existente |
| `doctor.cancelPrescription` | Mutation | Cancela prescrição |
| `doctor.getAllPatientMedications` | Query | Todos os medicamentos de todos os pacientes |
| `doctor.reactivatePrescription` | Mutation | Reativa prescrição cancelada |
| `doctor.acceptInvite` | Mutation | Paciente aceita convite do médico |
| `doctor.getMyDoctors` | Query | Lista médicos vinculados ao paciente |

### 4.7 Namespace `appointments`

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `appointments.create` | Mutation | Cria nova consulta |
| `appointments.listForDoctor` | Query | Lista consultas do médico |
| `appointments.listForPatient` | Query | Lista consultas do paciente |
| `appointments.confirm` | Mutation | Paciente confirma presença |
| `appointments.cancel` | Mutation | Cancela consulta |
| `appointments.update` | Mutation | Atualiza dados da consulta |
| `appointments.updateStatus` | Mutation | Atualiza status da consulta |

### 4.8 Namespace `clinicalNotes`

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `clinicalNotes.add` | Mutation | Adiciona nota clínica |
| `clinicalNotes.list` | Query | Lista notas de um paciente |
| `clinicalNotes.update` | Mutation | Atualiza nota clínica |
| `clinicalNotes.delete` | Mutation | Remove nota clínica |

---

## 5. Sistema de Autenticação

O MediAlert suporta dois métodos de autenticação:

**Login por e-mail e senha:** A senha é armazenada como hash bcrypt (10 rounds) no campo `passwordHash` da tabela `users`. O login valida o hash e cria uma sessão via cookie HTTP-only.

**OAuth (Google, Apple):** Implementado via `expo-web-browser` e o portal OAuth do Manus. O callback é tratado em `app/oauth/callback.tsx`. O `openId` retornado pelo provedor é usado como identificador único.

A sessão é mantida por cookie `session` (HTTP-only, SameSite=Lax, validade de 1 ano). O middleware `protectedProcedure` verifica a sessão em cada requisição e injeta o objeto `ctx.user`.

**Recuperação de senha:** Gera um token aleatório (32 bytes hex), salva em `resetToken` com expiração de 1 hora, e envia por e-mail. O endpoint `auth.resetPassword` valida o token e atualiza o hash.

---

## 6. Sistema de Papéis (Roles)

### 6.1 Papéis disponíveis

| Papel | `appRole` | Descrição |
|-------|-----------|-----------|
| Paciente | `"patient"` | Gerencia seus próprios medicamentos e consultas |
| Familiar/Cuidador | `"caregiver"` | Acompanha medicamentos de pacientes vinculados |
| Médico | `"doctor"` | Prescreve medicamentos e gerencia pacientes |

### 6.2 Inferência dinâmica de papéis

A partir da versão 4.39, o papel exibido na interface é **inferido dinamicamente** a partir dos vínculos existentes, não apenas do campo `appRole`. O endpoint `invite.getMyRoles` retorna:

```typescript
{
  isPatient: boolean,  // true se tem medicamentos próprios OU foi vinculado como paciente
  isCaregiver: boolean // true se tem pacientes vinculados a ele
}
```

Isso permite que um usuário seja **paciente e familiar ao mesmo tempo**, exibindo as duas seções na aba "Familiares" sem conflito.

---

## 7. Sistema de Vinculação Familiar-Paciente

### 7.1 Fluxo bidirecional

O vínculo pode ser iniciado por qualquer um dos lados. O endpoint universal `invite.acceptAnyCode` detecta o tipo do código e cria o vínculo corretamente:

```
Familiar gera código (caregiverId > 0, patientId = 0)
    → Paciente insere → patientId é preenchido → vínculo criado

Paciente gera código (caregiverId = 0, patientId > 0)
    → Familiar insere → caregiverId é preenchido → vínculo criado
```

### 7.2 QR Code

Ao gerar um código, o modal `InviteQRModal` exibe:
- QR Code gerado por `react-native-qrcode-svg` com o código embutido
- Código alfanumérico em destaque (8 caracteres)
- Botão "Compartilhar" via `Share.share()`

O campo de inserção de código possui um botão de câmera que abre `QRScannerModal` (usando `expo-camera` com `BarcodeScanner`), que lê o QR Code e preenche o campo automaticamente.

### 7.3 Alerta de adesão baixa

O endpoint `invite.checkAdherenceAlert` é chamado automaticamente após cada dose marcada como tomada. Se o paciente tiver tomado **menos de 50% das doses do dia** (com pelo menos 2 doses agendadas), uma notificação push é enviada ao familiar vinculado.

---

## 8. Sistema de Notificações Push

O MediAlert usa **Expo Push Notifications** via `expo-server-sdk` no backend. O token push é registrado via `user.registerPushToken` e armazenado em `users.pushToken`.

A função utilitária `sendPushNotification` no servidor valida o token com `Expo.isExpoPushToken()` antes de enviar, evitando erros com tokens inválidos.

**Notificações implementadas:**

| Evento | Destinatário | Mensagem |
|--------|-------------|----------|
| Vínculo familiar aceito | Ambos os lados | "Vínculo estabelecido com sucesso" |
| Adesão baixa (< 50%) | Familiar | "Paciente tomou X de Y doses hoje (Z%)" |
| Consulta confirmada | Médico | "Paciente confirmou presença" |
| Consulta cancelada | Médico | "Paciente cancelou a consulta" |

---

## 9. Telas do Aplicativo

### 9.1 Abas principais (`app/(tabs)/`)

| Arquivo | Título | Descrição |
|---------|--------|-----------|
| `index.tsx` | Hoje | Doses do dia com contadores (Total/Tomados/Pendentes), atalhos rápidos e lista de doses |
| `medications.tsx` | Remédios | Lista de medicamentos ativos com filtro e botão de adicionar |
| `history.tsx` | Histórico | Histórico de doses por data com filtro de status |
| `family.tsx` | Familiares | Vinculação familiar-paciente (bidirecional, QR Code, desvincular) |

### 9.2 Telas do médico (`app/doctor/`)

| Arquivo | Descrição |
|---------|-----------|
| `dashboard.tsx` | Painel com lista de pacientes, prescrições e consultas do dia |
| `patient-detail.tsx` | Detalhes do paciente: medicamentos, histórico, notas clínicas, consultas |
| `setup-profile.tsx` | Configuração do perfil profissional (CRM, especialidade, convênios) |

### 9.3 Telas do paciente (`app/patient/`)

| Arquivo | Descrição |
|---------|-----------|
| `appointments.tsx` | Minhas consultas com status colorido, confirmação e reagendamento |
| `doctor-directory.tsx` | Diretório de médicos com busca por nome/especialidade |
| `my-doctors.tsx` | Médicos vinculados ao paciente |
| `accept-invite.tsx` | Aceitar convite de médico via código |

### 9.4 Telas de medicamento (`app/medication/`)

| Arquivo | Descrição |
|---------|-----------|
| `add.tsx` | Formulário de cadastro de medicamento (nome, dosagem, horários, cor) |
| `[id].tsx` | Detalhes e edição do medicamento |

### 9.5 Telas de familiar (`app/family/`)

| Arquivo | Descrição |
|---------|-----------|
| `patient-overview.tsx` | Visão geral do paciente: avatar, stat cards (Tomados/Pendentes/Pulados), barra de progresso e lista de doses do dia |

### 9.6 Telas de autenticação e onboarding

| Arquivo | Descrição |
|---------|-----------|
| `welcome.tsx` | Tela inicial com logo e botões de entrar/cadastrar |
| `signup.tsx` | Cadastro com nome, e-mail e senha |
| `onboarding.tsx` | Seleção de papel inicial (paciente, familiar, médico) |
| `join-invite.tsx` | Inserir código de convite (usa `invite.acceptAnyCode`) |
| `forgot-password.tsx` | Recuperação de senha por e-mail |
| `settings.tsx` | Configurações: perfil, foto, biometria, tema, logout |

---

## 10. Componentes Reutilizáveis

| Componente | Descrição |
|------------|-----------|
| `ScreenContainer` | Wrapper com SafeArea, background e padding corretos para todas as telas |
| `InviteQRModal` | Modal com QR Code + código alfanumérico + botão compartilhar |
| `QRScannerModal` | Modal com câmera para escanear QR Code de convite |
| `WeeklyAdherenceChart` | Gráfico de barras com adesão dos últimos 7 dias (SVG) |
| `BiometricLockScreen` | Tela de bloqueio biométrico (Face ID / Touch ID) |
| `DateInput` | Input de data com máscara `DD/MM/AAAA` |
| `TimeInput` | Input de horário com máscara `HH:MM` |
| `IconSymbol` | Ícone multiplataforma (SF Symbols no iOS, Material Icons no Android/Web) |

---

## 11. Configuração e Variáveis de Ambiente

As variáveis de ambiente são definidas em `.env` e carregadas via `scripts/load-env.js`. As variáveis com prefixo `EXPO_PUBLIC_` são expostas ao cliente.

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão MySQL |
| `EXPO_PUBLIC_API_BASE_URL` | URL base da API (ex: `https://3000-...manus.computer`) |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | URL do portal OAuth |
| `EXPO_PUBLIC_APP_ID` | ID do app no portal Manus |
| `JWT_SECRET` | Segredo para assinatura de sessões |
| `SMTP_*` | Configurações de e-mail para recuperação de senha |
| `S3_*` | Credenciais de armazenamento de arquivos |

---

## 12. Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| `expo` | ~54.0.29 | SDK base |
| `react-native` | 0.81.5 | Framework mobile |
| `expo-router` | ~6.0.19 | Navegação file-based |
| `nativewind` | ^4.2.1 | Tailwind CSS para React Native |
| `@trpc/client` + `@trpc/server` | 11.7.2 | API type-safe |
| `@tanstack/react-query` | ^5.90.12 | Cache e estado do servidor |
| `drizzle-orm` | ^0.44.7 | ORM para MySQL |
| `expo-notifications` | ~0.32.15 | Push notifications |
| `expo-camera` | — | Scanner de QR Code |
| `react-native-qrcode-svg` | — | Geração de QR Code |
| `expo-haptics` | ~15.0.8 | Feedback tátil |
| `expo-local-authentication` | — | Biometria (Face ID / Touch ID) |
| `expo-calendar` | — | Salvar consultas no calendário |
| `react-native-reanimated` | ~4.1.6 | Animações nativas |
| `react-native-gesture-handler` | ~2.28.0 | Gestos nativos |
| `react-native-svg` | 15.12.1 | Gráficos SVG |
| `bcryptjs` | — | Hash de senhas |
| `expo-server-sdk` | — | Envio de push notifications (servidor) |
| `zod` | ^4.2.1 | Validação de schemas |

---

*Documentação gerada em Fevereiro de 2026 — MediAlert v4.40*
