# MediAlert – Design Document

## Conceito
Aplicativo de controle de medicamentos para pessoas que precisam tomar remédios em horários específicos. Foco em simplicidade para idosos e cuidadores, com confirmação de ingestão e notificação para familiares.

---

## Paleta de Cores

| Token       | Valor (Light)  | Valor (Dark)   | Uso                          |
|-------------|---------------|----------------|------------------------------|
| primary     | #1A7FE8       | #3B9EFF        | Botões principais, destaque  |
| background  | #F0F6FF       | #0D1117        | Fundo de telas               |
| surface     | #FFFFFF       | #161B22        | Cards, modais                |
| foreground  | #0D1B2A       | #E8F0FE        | Texto principal              |
| muted       | #6B7A8D       | #8B96A5        | Texto secundário             |
| success     | #22C55E       | #4ADE80        | Confirmação tomado           |
| warning     | #F59E0B       | #FBBF24        | Alerta próximo vencimento    |
| error       | #EF4444       | #F87171        | Não tomado / atrasado        |
| border      | #D1E3F8       | #21262D        | Bordas e divisores           |

---

## Telas

### 1. Home (Hoje)
- Header com saudação e data atual
- Resumo do dia: total de doses, tomadas, pendentes
- Lista de medicamentos agendados para hoje (FlatList)
  - Card com: nome do remédio, horário, dosagem, status (tomado / pendente / atrasado)
  - Botão "Marcar como tomado" em cada card
- FAB (Floating Action Button) para adicionar novo medicamento

### 2. Medicamentos (Minha Farmácia)
- Lista de todos os medicamentos cadastrados
- Card com: nome, dosagem, frequência, próxima dose
- Swipe para deletar / toque para editar
- FAB para adicionar novo medicamento

### 3. Adicionar / Editar Medicamento (Modal/Sheet)
- Campo: Nome do medicamento
- Campo: Dosagem (ex: 500mg, 1 comprimido)
- Campo: Frequência (1x, 2x, 3x ao dia, personalizado)
- Seletor de horários (ex: 08:00, 14:00, 20:00)
- Campo: Observações
- Botão Salvar

### 4. Histórico
- Calendário ou lista por data
- Registro de todas as doses: tomadas, puladas, atrasadas
- Porcentagem de aderência ao tratamento

### 5. Familiares
- Lista de familiares cadastrados (nome + contato)
- Toggle para ativar/desativar notificações por familiar
- Botão para adicionar familiar
- Informação: familiar recebe notificação quando dose é confirmada

### 6. Configurações
- Tema (claro/escuro)
- Ativar/desativar sons de alerta
- Gerenciar notificações

---

## Fluxos Principais

### Fluxo 1: Tomar Medicamento
1. Notificação push dispara no horário agendado
2. Usuário abre o app → tela Home mostra o card com alerta
3. Usuário toca "Marcar como tomado"
4. Animação de confirmação (check verde + haptic)
5. Familiares cadastrados recebem notificação: "João tomou Losartana às 08:05"

### Fluxo 2: Cadastrar Medicamento
1. Usuário toca FAB na tela Home ou Medicamentos
2. Sheet modal sobe com formulário
3. Preenche nome, dosagem, horários
4. Salva → medicamento aparece na lista e alertas são agendados

### Fluxo 3: Adicionar Familiar
1. Usuário vai em Familiares → toca "Adicionar"
2. Preenche nome e contato (e-mail ou telefone)
3. Familiar passa a receber notificações de confirmação

---

## Componentes Reutilizáveis

- `MedicationCard` – Card de medicamento com status visual
- `DoseStatusBadge` – Badge colorido (tomado/pendente/atrasado)
- `TimeSelector` – Seletor de horário
- `FamilyMemberCard` – Card de familiar com toggle
- `ConfirmationSheet` – Bottom sheet de confirmação
- `EmptyState` – Tela vazia com ilustração e CTA

---

## Navegação (Tab Bar)

| Tab         | Ícone SF Symbol       | Tela              |
|-------------|----------------------|-------------------|
| Hoje        | pill.fill            | Home              |
| Remédios    | cross.case.fill      | Medicamentos      |
| Histórico   | clock.fill           | Histórico         |
| Familiares  | person.2.fill        | Familiares        |
