# MediAlert — Plataforma de Gestão Médica

> **MediAlert** é uma plataforma mobile completa para gestão de consultórios médicos, controle de medicamentos, relacionamento médico-paciente e programa de indicações (MGM). O aplicativo conecta médicos, pacientes e familiares/cuidadores em um ecossistema integrado com backend próprio, notificações push em tempo real e modelo de receita baseado em comissões e taxas de plataforma.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Como Rodar Localmente](#como-rodar-localmente)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Funcionalidades Implementadas](#funcionalidades-implementadas)
7. [Pendências e Próximos Passos](#pendências-e-próximos-passos)
8. [Banco de Dados](#banco-de-dados)
9. [API — Routers tRPC](#api--routers-trpc)
10. [Decisões Técnicas](#decisões-técnicas)
11. [Credenciais de Teste](#credenciais-de-teste)

---

## Visão Geral

O MediAlert resolve três problemas centrais do ecossistema de saúde privada:

**Para o médico:** centraliza o gerenciamento de pacientes, agenda de consultas, prescrições, anotações clínicas e receita financeira em um único painel mobile. O médico acompanha a adesão ao tratamento de cada paciente em tempo real e recebe comissões por indicar outros médicos à plataforma.

**Para o paciente:** recebe lembretes automáticos de doses, confirma consultas, acessa prescrições do médico e compartilha seu histórico com familiares/cuidadores.

**Para o familiar/cuidador:** monitora a adesão ao tratamento do paciente vinculado e recebe notificações push quando doses são tomadas ou atrasadas.

**Para a MediAlert (admin):** painel completo de gestão com KPIs financeiros, controle de comissões MGM de 3 níveis, taxas de plataforma, ranking de médicos e exportação de dados.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Runtime mobile** | React Native | 0.81.5 |
| **Framework mobile** | Expo SDK | 54.0.29 |
| **Roteamento** | Expo Router | 6.0.19 |
| **Linguagem** | TypeScript | 5.9.3 |
| **UI / Estilização** | NativeWind (Tailwind CSS) | 4.2.1 |
| **Animações** | React Native Reanimated | 4.1.6 |
| **Estado do servidor** | TanStack Query | 5.90.12 |
| **API type-safe** | tRPC | 11.7.2 |
| **Backend** | Node.js + Express | 4.22.1 |
| **ORM** | Drizzle ORM | 0.44.7 |
| **Banco de dados** | MySQL (PlanetScale / compatível) | — |
| **Autenticação** | JWT + cookie httpOnly | jose 6.1.0 |
| **E-mail transacional** | Resend | via API |
| **Notificações push** | Expo Push Notifications | SDK 54 |
| **Armazenamento de arquivos** | S3-compatible | via SDK |
| **Gestos** | React Native Gesture Handler | 2.28.0 |
| **Ícones** | SF Symbols (iOS) + Material Icons | — |
| **Testes** | Vitest | 2.1.9 |
| **Build tool** | Metro Bundler + esbuild | — |

---

## Estrutura de Pastas

```
medialert/
├── app/                          # Telas do aplicativo (Expo Router file-based)
│   ├── (tabs)/                   # Tab bar principal (paciente/familiar)
│   │   ├── index.tsx             # Home — doses do dia
│   │   ├── medications.tsx       # Lista de medicamentos
│   │   ├── history.tsx           # Histórico de doses
│   │   └── family.tsx            # Gerenciamento de familiares
│   ├── admin/                    # Painel administrativo (MediAlert)
│   │   ├── dashboard.tsx         # KPIs financeiros e de plataforma
│   │   ├── mgm-dashboard.tsx     # Gestão de comissões MGM
│   │   ├── pending-commissions.tsx # Comissões pendentes a pagar
│   │   ├── platform-fees.tsx     # Taxas de plataforma por médico
│   │   ├── network-tree.tsx      # Árvore de indicações (3 níveis)
│   │   ├── ranking.tsx           # Ranking de médicos por indicações
│   │   ├── revenue-ranking.tsx   # Ranking por receita
│   │   ├── users.tsx             # Gestão de usuários
│   │   └── export.tsx            # Exportação de dados CSV
│   ├── doctor/                   # Painel do médico
│   │   ├── dashboard.tsx         # Painel principal com métricas
│   │   ├── setup-profile.tsx     # Cadastro inicial do médico
│   │   ├── onboarding-guide.tsx  # Guia de 5 passos pós-cadastro
│   │   ├── patient-detail.tsx    # Ficha completa do paciente
│   │   ├── insurance-fees.tsx    # Tabela de valores por convênio
│   │   ├── my-revenues.tsx       # Receita e metas financeiras
│   │   ├── mgm-referral.tsx      # Código e link de indicação
│   │   └── mgm-my-network.tsx    # Rede de indicados e comissões
│   ├── patient/                  # Telas do paciente
│   │   ├── appointments.tsx      # Consultas agendadas
│   │   ├── my-doctors.tsx        # Médicos vinculados
│   │   ├── doctor-directory.tsx  # Diretório público de médicos
│   │   ├── doctor-profile.tsx    # Perfil público do médico
│   │   └── accept-invite.tsx     # Aceitar convite do médico
│   ├── family/
│   │   └── patient-overview.tsx  # Visão do familiar sobre o paciente
│   ├── medication/
│   │   ├── add.tsx               # Adicionar medicamento
│   │   └── [id].tsx              # Editar medicamento
│   ├── welcome.tsx               # Tela de boas-vindas / login
│   ├── signup.tsx                # Criação de conta
│   ├── onboarding.tsx            # Seleção de papel (médico/paciente)
│   ├── settings.tsx              # Configurações e dados bancários
│   ├── forgot-password.tsx       # Recuperação de senha
│   └── join-invite.tsx           # Entrar com código de convite
│
├── components/                   # Componentes reutilizáveis
│   ├── screen-container.tsx      # SafeArea wrapper (usar em todas as telas)
│   ├── notification-bell.tsx     # Sino de notificações com badge
│   ├── biometric-lock-screen.tsx # Tela de bloqueio biométrico
│   ├── date-input.tsx            # Input com máscara DD/MM/AAAA
│   ├── time-input.tsx            # Input com máscara HH:MM
│   ├── invite-qr-modal.tsx       # Modal de QR code de convite
│   ├── qr-scanner-modal.tsx      # Scanner de QR code
│   ├── weekly-adherence-chart.tsx # Gráfico de adesão semanal
│   ├── query-error-view.tsx      # Componente de erro de query
│   └── ui/
│       ├── icon-symbol.tsx       # Mapeamento SF Symbols → Material Icons
│       └── icon-symbol.ios.tsx   # SF Symbols nativos (iOS only)
│
├── hooks/                        # Hooks customizados
│   ├── use-auth.ts               # Estado de autenticação
│   ├── use-colors.ts             # Paleta de cores do tema atual
│   ├── use-color-scheme.ts       # Detecção light/dark mode
│   ├── use-biometric-lock.ts     # Bloqueio biométrico (Face ID / Touch ID)
│   ├── use-push-token.ts         # Registro de token push
│   ├── use-network-status.ts     # Status de conectividade
│   ├── use-favorite-doctors.ts   # Médicos favoritos (AsyncStorage)
│   └── use-screen-size.ts        # Dimensões da tela
│
├── lib/                          # Utilitários e contextos
│   ├── auth-context.tsx          # Contexto global de autenticação
│   ├── app-context.tsx           # Contexto de estado da aplicação
│   ├── trpc.ts                   # Cliente tRPC configurado
│   ├── notifications.ts          # Helpers de notificações locais
│   ├── offline-store.ts          # Store offline (AsyncStorage)
│   ├── offline-sync.tsx          # Provider de sincronização offline
│   ├── theme-provider.tsx        # Provider de tema light/dark
│   └── utils.ts                  # cn() e utilitários gerais
│
├── server/                       # Backend Node.js
│   ├── routers.ts                # Todos os endpoints tRPC (~2.000 linhas)
│   ├── db.ts                     # Funções de acesso ao banco (~1.500 linhas)
│   ├── storage.ts                # Upload/download de arquivos S3
│   └── _core/                    # Infraestrutura do servidor
│       ├── index.ts              # Entry point Express
│       ├── trpc.ts               # Configuração tRPC
│       ├── context.ts            # Contexto de request (user, db)
│       ├── auth.ts               # JWT + bcrypt
│       ├── email.ts              # Templates e envio via Resend
│       ├── notification.ts       # Envio de push via Expo
│       ├── env.ts                # Variáveis de ambiente
│       └── sdk.ts                # SDK Manus (storage, LLM, push)
│
├── drizzle/                      # Migrações e schema do banco
│   ├── schema.ts                 # Definição de todas as tabelas
│   ├── relations.ts              # Relações entre tabelas
│   └── *.sql                     # 17 arquivos de migração
│
├── shared/                       # Tipos compartilhados (client + server)
│   ├── types.ts                  # Interfaces e tipos globais
│   └── const.ts                  # Constantes compartilhadas
│
├── tests/                        # Testes de integração (Vitest)
├── scripts/                      # Scripts utilitários
│   ├── seed-realistic.ts         # Seed com 2 anos de dados simulados
│   └── audit-test.ts             # 40 testes de integração via API
│
├── theme.config.js               # Paleta de cores (light + dark)
├── tailwind.config.js            # Configuração Tailwind/NativeWind
├── app.config.ts                 # Configuração Expo (bundle ID, plugins)
├── drizzle.config.ts             # Configuração Drizzle ORM
└── package.json                  # Dependências e scripts
```

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 22+ e pnpm 9.12+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go instalado no celular (iOS ou Android)
- Banco de dados MySQL acessível (PlanetScale, Railway, ou local)
- Conta Resend para e-mails transacionais (opcional em dev)

### Passo a Passo

**1. Clonar e instalar dependências**

```bash
git clone <repositório>
cd medialert
pnpm install
```

**2. Configurar variáveis de ambiente**

Crie um arquivo `.env` na raiz com as variáveis listadas na seção [Variáveis de Ambiente](#variáveis-de-ambiente).

**3. Executar migrações do banco de dados**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

**4. Iniciar o servidor de desenvolvimento**

```bash
pnpm dev
```

Isso inicia simultaneamente:
- **Metro Bundler** (Expo) na porta `8081`
- **Servidor backend** (Express + tRPC) na porta `3000`

**5. Abrir no celular**

Escaneie o QR code exibido no terminal com o aplicativo **Expo Go**. Para gerar o QR code separadamente:

```bash
pnpm qr
```

**6. Criar conta de administrador**

Após rodar as migrações, crie o primeiro usuário admin diretamente no banco:

```sql
INSERT INTO users (id, email, name, appRole, passwordHash, createdAt)
VALUES (
  FLOOR(RAND() * 1000000),
  'admin@suaempresa.com',
  'Admin',
  'admin',
  '$2b$10$...', -- hash bcrypt de sua senha
  NOW()
);
```

Ou use o script de seed para popular o banco com dados de teste:

```bash
npx tsx scripts/seed-realistic.ts
```

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados MySQL (obrigatório)
DATABASE_URL=mysql://usuario:senha@host:3306/medialert

# Segredo JWT para cookies de sessão (obrigatório)
JWT_SECRET=sua-chave-secreta-aqui-minimo-32-chars

# Resend — e-mails transacionais (opcional em dev)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

# Expo Push Notifications (gerado automaticamente pelo SDK)
# Não requer configuração manual

# Manus SDK (preenchido automaticamente no ambiente Manus)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_APP_ID=
OWNER_OPEN_ID=
OAUTH_SERVER_URL=
```

> **Nota de segurança:** nunca commite o arquivo `.env` no repositório. Adicione-o ao `.gitignore`.

---

## Funcionalidades Implementadas

### Autenticação e Papéis

O sistema suporta quatro papéis de usuário: **admin**, **doctor**, **patient** e **caregiver** (familiar). O cadastro é feito com e-mail e senha (hash bcrypt), com recuperação de senha via código enviado por e-mail. A sessão é mantida via cookie httpOnly com JWT. Bloqueio biométrico (Face ID / Touch ID) é aplicado automaticamente após 5 minutos em background.

### Módulo do Médico

O médico cadastra seu perfil com CRM, especialidade, convênios aceitos, foto, bio, endereço e dados bancários (banco, agência, conta e chave PIX). A partir do painel, gerencia pacientes, agenda consultas, prescreve medicamentos com horários customizáveis, registra anotações clínicas e exporta fichas em PDF. A agenda possui visualização diária, semanal e mensal com indicadores visuais. O médico acompanha sua receita financeira com metas mensais e histórico por convênio.

### Módulo do Paciente

O paciente recebe lembretes push nos horários exatos das doses prescritas, confirma consultas, salva eventos no calendário nativo, compartilha detalhes de consultas via share sheet e acessa o diretório público de médicos da plataforma. Familiares/cuidadores são vinculados via código de 6 dígitos e recebem notificações de doses tomadas ou atrasadas.

### Programa de Indicações MGM (Member-Get-Member)

Médicos recebem um código e link de indicação únicos. Quando um médico indicado atinge **45 consultas/mês** por **3 meses consecutivos**, o indicador passa a receber comissões de 3 níveis:

| Nível | Percentual | Condição |
|-------|-----------|----------|
| Nível 1 (indicado direto) | 5% da receita | 45 consultas/mês por 3 meses |
| Nível 2 (indicado do indicado) | 3% da receita | Mesmo critério |
| Nível 3 (terceiro nível) | 1% da receita | Mesmo critério |

O admin visualiza a árvore completa de indicações, calcula comissões mensais e marca pagamentos. Ao marcar como pago, o médico recebe push notification e e-mail HTML com detalhamento do valor.

### Taxa de Plataforma

Após **6 meses de uso**, a MediAlert cobra uma taxa mensal do médico:

- Faturamento ≥ R$12.000/mês: **2,5%** sobre o faturamento
- Faturamento < R$12.000/mês: **taxa mínima de R$100**
- Primeiros 6 meses: **isento**

O admin calcula as taxas do mês, visualiza por médico e marca como pagas. O médico vê sua taxa atual e histórico no painel financeiro.

### Validações de Negócio

O sistema bloqueia o cadastro de qualquer convênio ou consulta particular com valor inferior a **R$120,00**, tanto no frontend (feedback imediato) quanto no backend (validação na mutation).

### Painel Administrativo

O admin possui dashboard com KPIs em tempo real: receita bruta da plataforma, comissões pendentes, taxa líquida, total de médicos/pacientes/consultas, resumo MGM e taxas de plataforma pendentes. Todas as seções são clicáveis e abrem telas de detalhamento com ações (marcar como pago, exportar CSV, visualizar árvore de rede).

### Notificações

O sistema envia notificações push e e-mails HTML nos seguintes eventos:

| Evento | Push | E-mail |
|--------|------|--------|
| Lembrete de dose (horário exato) | ✓ | — |
| Dose atrasada 30 min (para familiar) | ✓ | — |
| Lembrete de consulta 24h antes | ✓ | — |
| Lembrete de consulta 1h antes | ✓ | — |
| Consulta confirmada pelo paciente | ✓ | — |
| Consulta reagendada pelo médico | ✓ | — |
| Medicamento prescrito pelo médico | ✓ | — |
| Comissão paga pelo admin | ✓ | ✓ |
| Boas-vindas ao médico | ✓ | ✓ |

### Onboarding Guiado

Novos médicos passam por um fluxo de 5 passos após o primeiro cadastro: boas-vindas, cadastro de convênios, cadastro de pacientes, programa de indicações e dicas de uso. O onboarding é exibido apenas uma vez (flag `onboardingCompleted` no banco).

---

## Pendências e Próximos Passos

As seguintes funcionalidades foram identificadas como melhorias prioritárias, mas ainda não foram implementadas:

**Central de notificações in-app** — Tela dedicada para listar todas as notificações recebidas pelo médico (desconto aplicado, boas-vindas, novas consultas) com marcação de lidas/não lidas e histórico persistido.

**Visualização mensal da agenda** — O calendário mensal com grade visual e indicadores de dias com consultas foi parcialmente implementado, mas o bottom sheet de detalhes do dia ainda precisa de refinamentos de UX.

**Relatório mensal por e-mail** — Envio automático de resumo mensal ao médico com total de consultas, receita e comissões do período (cron job no backend).

**E-mail de lembrete de consulta ao paciente** — Complementar o push notification com e-mail 24h antes da consulta, incluindo endereço e link para Google Maps.

**Filtro por mês na tela de comissões pendentes** — Permitir ao admin filtrar comissões por mês de referência específico.

**Dados bancários nos médicos simulados** — O seed atual não popula os campos bancários dos 35 médicos de teste; necessário atualizar o script para incluir PIX e dados bancários fictícios.

**Testes de cobertura de UI** — Os testes atuais cobrem integração de API (40 testes) e lógica de negócio (35 testes unitários), mas não há testes de componentes React Native.

---

## Banco de Dados

O banco utiliza **MySQL** com **Drizzle ORM**. As 18 tabelas principais são:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários da plataforma (todos os papéis) |
| `caregiver_patients` | Vínculo familiar-paciente |
| `medications` | Medicamentos cadastrados |
| `medication_times` | Horários de cada medicamento |
| `dose_records` | Histórico de doses (tomada/perdida/cancelada) |
| `doctor_profiles` | Perfil completo do médico (CRM, convênios, dados bancários) |
| `doctor_patients` | Vínculo médico-paciente com ficha clínica |
| `clinical_notes` | Anotações clínicas por consulta |
| `appointments` | Consultas agendadas com status e localização |
| `patient_audit_log` | Log de alterações na ficha do paciente |
| `doctor_reviews` | Avaliações de consultas (1-5 estrelas) |
| `consultation_requests` | Solicitações de consulta via diretório |
| `doctor_notifications` | Notificações in-app do médico |
| `commission_rules` | Regras de desconto em cascata por nível |
| `commissions_ledger` | Registro de comissões calculadas e pagas |
| `doctor_insurance_fees` | Tabela de valores por convênio do médico |
| `appointment_revenues` | Receita por consulta realizada |
| `platform_fees` | Taxas de plataforma mensais por médico |

O histórico completo de migrações está em `drizzle/*.sql` (17 arquivos, do `0000` ao `0016`).

---

## API — Routers tRPC

Todos os endpoints são type-safe via tRPC v11. Os routers disponíveis são:

| Router | Descrição | Principais endpoints |
|--------|-----------|---------------------|
| `auth` | Autenticação | `register`, `login`, `logout`, `forgotPassword`, `resetPassword` |
| `user` | Perfil do usuário | `me`, `setRole`, `registerPushToken`, `getProfile`, `updateProfile`, `uploadSelfPhoto` |
| `invite` | Convites | `create`, `accept`, `getMyPatients`, `getMyCaregiver`, `acceptAnyCode` |
| `doctor` | Módulo médico | `setupProfile`, `getPatients`, `addPatient`, `prescribeMedication`, `getMetrics`, `getNotifications`, `updateBankInfo`, `completeOnboarding` |
| `clinicalNotes` | Anotações clínicas | `add`, `list`, `update`, `delete` |
| `appointments` | Consultas | `create`, `listForDoctor`, `listForPatient`, `confirm`, `cancel`, `update`, `updateStatus` |
| `medications` | Medicamentos | `list`, `listMine`, `create`, `update`, `delete`, `confirmTaken` |
| `doses` | Doses | `listMyDosesToday`, `markTaken`, `ensureMyDosesToday`, `checkOverdue` |
| `reviews` | Avaliações | `submit`, `getRatingSummary`, `getForDoctor`, `listDoctorsWithRatings` |
| `mgm` | Programa de indicações | `getMyReferralCode`, `validateReferralCode`, `getMyCommissions`, `adminGetAllCommissions`, `adminMarkPaid`, `adminCalculateMonth`, `adminGetKPIs`, `adminGetNetworkTree`, `adminGetFinancialKPIs` |
| `insuranceFees` | Convênios | `list`, `add`, `update`, `remove` |
| `platformFees` | Taxas de plataforma | `adminList`, `adminCalculate`, `adminMarkPaid`, `adminKPIs`, `myFees`, `currentMonthFee` |
| `revenue` | Receita | `summary`, `list`, `getGoal` |

---

## Decisões Técnicas

**tRPC em vez de REST:** A escolha por tRPC elimina a necessidade de definir contratos de API manualmente. O TypeScript compartilhado entre cliente e servidor garante que qualquer mudança de schema seja detectada em tempo de compilação, reduzindo bugs de integração.

**Drizzle ORM em vez de Prisma:** O Drizzle foi escolhido por sua compatibilidade nativa com MySQL serverless (PlanetScale), menor overhead de runtime e sintaxe mais próxima de SQL puro, facilitando queries complexas de desconto em cascata e receita.

**NativeWind (Tailwind) para estilização:** Permite reutilizar o vocabulário de design do Tailwind CSS no React Native, mantendo consistência entre web e mobile e acelerando o desenvolvimento de UI.

**Cookie httpOnly em vez de AsyncStorage para sessão:** Tokens de sessão armazenados em cookies httpOnly não são acessíveis via JavaScript, protegendo contra ataques XSS. O tRPC client inclui o cookie automaticamente em cada request.

**Expo Push Notifications sem FCM/APNs direto:** O serviço de push do Expo abstrai FCM (Android) e APNs (iOS), eliminando a necessidade de configurar certificados e chaves separadamente para cada plataforma.

**Estrutura MGM calculada sob demanda:** As comissões não são calculadas em tempo real a cada consulta, mas sim processadas em batch pelo admin ao final de cada mês (`adminCalculateMonth`). Isso evita carga desnecessária no banco e garante que o cálculo seja revisado antes do pagamento.

**Valor mínimo de R$120 em dupla camada:** A validação é aplicada tanto no frontend (feedback imediato com mensagem de erro) quanto no backend (throw de TRPCError), garantindo que a regra não possa ser contornada por chamadas diretas à API.

**Seed de 2 anos para testes:** O script `seed-realistic.ts` cria 35 médicos em 14 especialidades, 111 pacientes, 19.424 consultas, 103 comissões e 24.034 registros de doses usando batch inserts para performance. Isso permite testar todos os fluxos financeiros e MGM com dados próximos da realidade.

---

## Credenciais de Teste

| Papel | E-mail | Senha |
|-------|--------|-------|
| **Admin** | heliton@medialert.com | *(senha original do cadastro)* |
| **Médico fundador** | ricardo.mendes@medialert.com | Medialert@2024 |
| **Médico nível 1** | ana.santos@medialert.com | Medialert@2024 |
| **Médico nível 2** | carlos.oliveira@medialert.com | Medialert@2024 |

Todos os 35 médicos do seed seguem o padrão `[nome].[sobrenome]@medialert.com` com senha `Medialert@2024`.

---

*Documentação gerada em 27/02/2026. Versão do projeto: checkpoint `318b5d4f`.*

---

## Variáveis de ambiente adicionadas (segurança)

| Variável | Descrição | Exemplo |
|---|---|---|
| `ALLOWED_ORIGINS` | Origens CORS permitidas (separadas por vírgula). Sempre defina em produção. | `https://app.medialert.com.br,https://admin.medialert.com.br` |

