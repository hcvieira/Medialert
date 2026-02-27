# MediAlert — Documento de Produto

> **Versão:** 4.40 | **Data:** Fevereiro de 2026 | **Plataformas:** iOS · Android · Web

---

## Sumário

1. [O que é o MediAlert](#1-o-que-é-o-medialert)
2. [Perfis de Usuário](#2-perfis-de-usuário)
3. [Funcionalidades por Perfil](#3-funcionalidades-por-perfil)
4. [Fluxos Principais do Usuário](#4-fluxos-principais-do-usuário)
5. [Sistema de Vinculação Familiar-Paciente](#5-sistema-de-vinculação-familiar-paciente)
6. [Sistema de Consultas Médicas](#6-sistema-de-consultas-médicas)
7. [Notificações e Alertas](#7-notificações-e-alertas)
8. [Regras de Negócio](#8-regras-de-negócio)
9. [Segurança e Privacidade](#9-segurança-e-privacidade)

---

## 1. O que é o MediAlert

O MediAlert é um aplicativo de controle de medicamentos que conecta **pacientes**, **familiares/cuidadores** e **médicos** em um único ecossistema. O objetivo central é garantir que o paciente tome seus medicamentos nos horários corretos, com acompanhamento ativo de quem cuida dele.

O aplicativo resolve três problemas comuns no tratamento medicamentoso:

**Esquecimento de doses.** O paciente visualiza todas as doses do dia na tela inicial, marca cada uma como tomada e recebe o histórico completo de adesão ao tratamento.

**Falta de acompanhamento familiar.** O familiar pode vincular-se ao paciente e acompanhar em tempo real se as doses estão sendo tomadas, recebendo alertas automáticos quando a adesão cai abaixo de 50%.

**Fragmentação da comunicação médico-paciente.** O médico prescreve medicamentos diretamente pelo app, agenda consultas, registra notas clínicas e acompanha a adesão do paciente ao tratamento prescrito.

---

## 2. Perfis de Usuário

O MediAlert possui três perfis distintos, cada um com sua própria experiência no aplicativo.

| Perfil | Quem é | O que faz no app |
|--------|--------|-----------------|
| **Paciente** | A pessoa que toma os medicamentos | Registra doses, acompanha histórico, agenda consultas, vincula familiares e médicos |
| **Familiar / Cuidador** | Cônjuge, filho, pai, cuidador profissional | Acompanha doses do paciente vinculado, recebe alertas de adesão baixa |
| **Médico** | Profissional de saúde com CRM | Prescreve medicamentos, agenda consultas, registra notas clínicas, acompanha adesão |

> **Importante:** Um mesmo usuário pode ser **paciente e familiar ao mesmo tempo**. Por exemplo, um filho que toma seus próprios medicamentos e também acompanha os medicamentos do pai. O aplicativo detecta automaticamente os dois papéis e exibe as seções correspondentes.

---

## 3. Funcionalidades por Perfil

### 3.1 Paciente

**Controle de medicamentos.** O paciente cadastra seus medicamentos informando nome, dosagem, cor de identificação, horários e observações. Para cada horário cadastrado, o app gera automaticamente um registro de dose no início do dia.

**Doses de hoje.** A tela inicial exibe todos os medicamentos do dia com seus respectivos horários. O paciente toca em cada dose para marcá-la como tomada, e os contadores (Total, Tomados, Pendentes) são atualizados em tempo real.

**Histórico de adesão.** A aba "Histórico" permite consultar doses de qualquer data passada, com filtro por status (tomada, pendente, pulada). O paciente consegue visualizar sua evolução ao longo do tempo.

**Consultas médicas.** O paciente acessa a tela "Minhas Consultas" para ver todas as consultas agendadas, confirmar presença, solicitar reagendamento ou cancelar. Cada consulta exibe status colorido (verde = confirmada, amarelo = pendente, roxo = realizada, vermelho = cancelada) e pode ser salva no calendário do dispositivo.

**Diretório de médicos.** O paciente pode buscar médicos cadastrados no app por nome ou especialidade, visualizar o perfil completo (CRM, convênios aceitos, endereço, avaliações) e solicitar vínculo via código de convite.

**Vinculação com familiar.** O paciente pode gerar um código para o familiar inserir, ou inserir o código gerado pelo familiar. Após o vínculo, o familiar passa a acompanhar suas doses.

### 3.2 Familiar / Cuidador

**Visão geral do paciente.** Ao tocar no card do paciente vinculado, o familiar acessa uma tela com o avatar do paciente, três indicadores (Tomados, Pendentes, Pulados), uma barra de progresso com o percentual de adesão do dia e a lista completa de doses com status colorido.

**Alertas de adesão baixa.** Quando o paciente toma menos de 50% das doses do dia (com pelo menos 2 doses agendadas), o familiar recebe automaticamente uma notificação push informando o percentual de adesão e um link direto para a tela de visão geral.

**Múltiplos pacientes.** O familiar pode acompanhar vários pacientes simultaneamente. Cada paciente aparece como um card na aba "Familiares" com acesso rápido à visão geral do dia.

**Desvincular.** O familiar pode desvincular-se de um paciente a qualquer momento, com confirmação antes de remover o vínculo.

### 3.3 Médico

**Perfil profissional.** O médico configura seu perfil com CRM, estado, especialidade, convênios aceitos, telefone, bio e endereço do consultório. O perfil fica visível no diretório de médicos para todos os pacientes do app.

**Gerenciamento de pacientes.** O médico cadastra pacientes informando nome, e-mail, telefone, data de nascimento, plano de saúde e observações. Gera um código de convite para o paciente se vincular ao seu prontuário no app.

**Prescrição de medicamentos.** O médico prescreve medicamentos diretamente pelo app, definindo nome, dosagem, horários e observações. As prescrições aparecem automaticamente na lista de medicamentos do paciente.

**Consultas.** O médico agenda consultas para seus pacientes, define data, horário, local e convênio. Pode confirmar, cancelar ou atualizar o status de cada consulta. Recebe notificações quando o paciente confirma presença ou cancela.

**Notas clínicas.** O médico registra notas clínicas vinculadas ao paciente e, opcionalmente, a uma consulta específica. As notas ficam visíveis apenas para o médico.

**Relatório de adesão.** O médico acessa o histórico de doses do paciente e um relatório de adesão semanal com gráfico de barras, útil para avaliar a efetividade do tratamento nas consultas.

**Avaliações.** Os pacientes podem avaliar o médico com nota de 1 a 5 estrelas e comentário após uma consulta realizada. A média das avaliações é exibida no diretório de médicos.

---

## 4. Fluxos Principais do Usuário

### 4.1 Primeiro acesso — Paciente

O usuário abre o app e é direcionado para a tela de boas-vindas. Ao tocar em "Criar conta", preenche nome, e-mail e senha. Em seguida, o onboarding pergunta qual é o seu papel: ao selecionar "Sou paciente", é direcionado para a tela inicial. O papel pode ser refinado automaticamente conforme os vínculos são criados.

### 4.2 Cadastrar um medicamento

Na aba "Remédios", o paciente toca no botão "+" para abrir o formulário de cadastro. Preenche o nome do medicamento, a dosagem (ex: "500mg"), seleciona uma cor de identificação e adiciona os horários de tomada. Ao salvar, o medicamento aparece na lista e as doses do dia são geradas automaticamente.

### 4.3 Marcar uma dose como tomada

Na tela "Hoje", o paciente visualiza todas as doses do dia organizadas por horário. Ao tocar em uma dose, ela é marcada como tomada com feedback tátil e visual. O contador "Tomados" é incrementado. Se o paciente tiver um familiar vinculado, o sistema verifica automaticamente a adesão e pode disparar um alerta.

### 4.4 Vincular um familiar

O paciente acessa a aba "Familiares" e toca em "Gerar código para o familiar". Um modal exibe o QR Code e o código alfanumérico. O paciente compartilha o código com o familiar (via WhatsApp, SMS, etc.). O familiar abre o app, acessa a aba "Familiares", toca no ícone de câmera para escanear o QR Code ou digita o código manualmente, e o vínculo é criado.

### 4.5 Agendar uma consulta (médico)

No painel do médico, ao acessar o perfil de um paciente, o médico toca em "Agendar consulta". Preenche data, horário, local e convênio. A consulta aparece na lista do médico e na tela "Minhas Consultas" do paciente com status "Agendada".

### 4.6 Confirmar presença em uma consulta (paciente)

Na tela "Minhas Consultas", o paciente visualiza a consulta com o botão "Confirmar presença" em destaque verde. Ao tocar, o status muda para "Confirmada" e o médico recebe uma notificação push.

---

## 5. Sistema de Vinculação Familiar-Paciente

O vínculo entre familiar e paciente é estabelecido por um **código de convite de 8 caracteres**. O sistema é completamente bidirecional: qualquer um dos lados pode iniciar o processo.

### 5.1 Fluxo A — Familiar inicia

O familiar acessa a aba "Familiares" e toca em "Gerar código de convite". Um código é gerado e exibido em um modal com QR Code. O familiar compartilha o código com o paciente. O paciente insere o código na aba "Familiares" do seu app (ou escaneia o QR Code). O vínculo é criado e ambos recebem uma notificação de confirmação.

### 5.2 Fluxo B — Paciente inicia

O paciente acessa a aba "Familiares" e toca em "Gerar código para o familiar". O código é gerado e exibido com QR Code. O paciente compartilha com o familiar. O familiar insere o código na aba "Familiares" do seu app. O vínculo é criado.

### 5.3 Código universal

O campo de inserção de código aceita **qualquer tipo de código** — o sistema detecta automaticamente se é um código gerado pelo familiar ou pelo paciente e cria o vínculo no sentido correto, sem necessidade de o usuário saber qual tipo de código está inserindo.

### 5.4 Desvincular

Tanto o familiar quanto o paciente podem desvincular a qualquer momento. O botão "Desvincular" aparece no card do paciente (visão do familiar) e no card do familiar (visão do paciente). Uma confirmação é solicitada antes de remover o vínculo.

---

## 6. Sistema de Consultas Médicas

### 6.1 Status das consultas

| Status | Cor | Descrição |
|--------|-----|-----------|
| Agendada | Amarelo | Consulta criada, aguardando confirmação |
| Confirmada | Verde | Paciente confirmou presença |
| Realizada | Roxo | Consulta concluída |
| Cancelada | Vermelho | Consulta cancelada por qualquer parte |
| Reagendamento solicitado | Laranja | Paciente solicitou novo horário |

### 6.2 Ações disponíveis por status

O paciente pode **confirmar presença** em consultas com status "Agendada", **solicitar reagendamento** em consultas futuras e **cancelar** consultas que ainda não foram realizadas. O médico pode **confirmar**, **cancelar**, **atualizar** e **marcar como realizada** qualquer consulta.

### 6.3 Salvar no calendário

O paciente pode salvar qualquer consulta no calendário nativo do dispositivo (iOS Calendar / Google Calendar) diretamente pela tela "Minhas Consultas", com data, horário e local preenchidos automaticamente.

---

## 7. Notificações e Alertas

O MediAlert utiliza notificações push para manter todos os envolvidos informados sobre eventos importantes. O usuário deve conceder permissão de notificações ao abrir o app pela primeira vez.

| Evento | Quem recebe | Conteúdo |
|--------|-------------|----------|
| Vínculo familiar aceito | Ambos os lados | "Vínculo estabelecido com [nome]" |
| Adesão baixa (< 50%) | Familiar | "João tomou apenas 1 de 3 doses hoje (33%). Verifique se está tudo bem." |
| Consulta confirmada pelo paciente | Médico | "Paciente confirmou presença na consulta de [data]" |
| Consulta cancelada pelo paciente | Médico | "Paciente cancelou a consulta de [data]" |

---

## 8. Regras de Negócio

**Geração de doses.** Os registros de dose são gerados automaticamente no início de cada dia para todos os medicamentos ativos do paciente. Se o paciente abrir o app e não houver registros para o dia atual, eles são gerados no momento do acesso.

**Código de convite de uso único.** Cada código de convite só pode ser utilizado uma vez. Após o vínculo ser criado, o código é marcado como aceito e não pode ser reutilizado. O usuário pode gerar um novo código a qualquer momento.

**Papel dinâmico.** O papel exibido na interface (paciente, familiar ou ambos) é inferido automaticamente a partir dos vínculos existentes. Um usuário que tem medicamentos próprios E acompanha outro paciente verá as funcionalidades dos dois papéis simultaneamente.

**Alerta de adesão.** O alerta de adesão baixa é disparado apenas quando o paciente tem **pelo menos 2 doses agendadas** no dia e tomou **menos de 50%** delas. Isso evita alertas desnecessários para pacientes com apenas 1 dose diária.

**Prescrição pelo médico.** Quando um médico prescreve um medicamento para um paciente, o medicamento aparece automaticamente na lista de medicamentos do paciente. O paciente não precisa cadastrá-lo manualmente.

**Histórico imutável.** Registros de doses marcadas como tomadas não podem ser desfeitos pela interface do paciente, garantindo a integridade do histórico de adesão.

---

## 9. Segurança e Privacidade

**Autenticação.** As senhas são armazenadas como hash bcrypt (nunca em texto puro). As sessões são mantidas por cookie HTTP-only, impedindo acesso via JavaScript no navegador.

**Bloqueio biométrico.** O aplicativo suporta bloqueio por Face ID ou Touch ID. Quando ativado nas configurações, o app solicita autenticação biométrica ao ser aberto ou ao retornar do segundo plano.

**Isolamento de dados.** Cada usuário acessa apenas os dados para os quais tem permissão explícita: o paciente vê apenas seus próprios medicamentos; o familiar vê apenas os dados dos pacientes vinculados a ele; o médico vê apenas os dados dos seus pacientes cadastrados.

**Recuperação de senha.** O link de recuperação de senha expira em 1 hora e é de uso único. Após a redefinição, o token é invalidado imediatamente.

**Fotos de perfil.** As fotos são armazenadas em S3 com URLs assinadas. Não são armazenadas localmente no dispositivo.

---

*Documento de Produto — MediAlert v4.40 — Fevereiro de 2026*
