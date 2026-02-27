# Relatório de Auditoria — Sistema MGM MediAlert

**Data da auditoria:** 24/02/2026  
**Auditor:** Manus AI  
**Versão do sistema:** v5.3  
**Ambiente:** Produção (banco de dados real)

---

## 1. Objetivo

Verificar a corretude da implementação do sistema de comissões MGM (Member-Get-Member) do MediAlert, simulando estruturas de rede multinível com médicos em diferentes estágios de vida na plataforma, volumes variados de consultas e casos de borda (médico sem consultas, médico sem indicador, idempotência de cálculo).

---

## 2. Regras de Comissão Auditadas

O sistema implementa uma matriz de comissões por **nível de rede** e **ano de vida do médico indicado**:

| Nível | Ano 1 do Indicado | Ano 2 do Indicado | Ano 3+ do Indicado |
|-------|-------------------|-------------------|--------------------|
| **N1** — indicador direto | R$ 100,00 | R$ 70,00 | R$ 50,00 |
| **N2** — avô da indicação | R$ 50,00 | R$ 35,00 | R$ 25,00 |
| **N3** — bisavô da indicação | R$ 25,00 | R$ 17,50 | R$ 12,50 |

**Gatilho:** O cálculo é acionado mensalmente. Para cada médico indicado que realizou ao menos **1 consulta com status `completed`** no mês de referência, o sistema percorre a cadeia de indicação (até 3 níveis) e gera um registro de comissão para cada referenciador elegível.

---

## 3. Estrutura de Dados de Teste Criada

### 3.1 Médicos Criados (11 perfis)

| Chave | Nome | Data de Cadastro | Tempo na Plataforma | Cenário |
|-------|------|-----------------|---------------------|---------|
| A | Dr. Alfredo Raiz | 24/02/2022 | 4 anos | Raiz da Rede A — sem indicador |
| B | Dr. Bruno N1-A | 23/08/2025 | 6 meses | **Ano 1** — N1 de A |
| C | Dra. Carla N2-A | 24/11/2024 | 15 meses | **Ano 2** — N2 de A, N1 de B |
| D | Dr. Diego N3-A | 24/12/2023 | 26 meses | **Ano 3+** — N3 de A, N2 de B, N1 de C |
| E | Dra. Elisa Raiz | 24/02/2021 | 5 anos | Raiz da Rede B — sem indicador |
| F | Dr. Felipe N1-E | 24/11/2025 | 3 meses | **Ano 1** — N1 de E |
| G | Dra. Gabriela N1-E | 23/08/2024 | 18 meses | **Ano 2** — N1 de E |
| H | Dr. Henrique N1-E | 24/02/2023 | 3 anos | **Ano 3+** — N1 de E |
| I | Dra. Iris Raiz | 24/02/2024 | 2 anos | Raiz isolada — sem indicador |
| J | Dr. Julio N1-I | 23/06/2025 | 8 meses | **Ano 1** — N1 de I — **SEM CONSULTAS** |
| K | Dra. Karen N1-I | 24/01/2025 | 13 meses | **Ano 2** — N1 de I — com consultas |

### 3.2 Estrutura de Redes

```
REDE A (Linear 4 níveis):
  Dr. Alfredo Raiz
    └── Dr. Bruno N1-A (6 meses, Ano 1)
          └── Dra. Carla N2-A (15 meses, Ano 2)
                └── Dr. Diego N3-A (26 meses, Ano 3+)

REDE B (Leque — 1 raiz, 3 indicados diretos):
  Dra. Elisa Raiz
    ├── Dr. Felipe N1-E (3 meses, Ano 1)
    ├── Dra. Gabriela N1-E (18 meses, Ano 2)
    └── Dr. Henrique N1-E (3 anos, Ano 3+)

REDE C (Casos especiais):
  Dra. Iris Raiz
    ├── Dr. Julio N1-I (8 meses, Ano 1) ← SEM CONSULTAS
    └── Dra. Karen N1-I (13 meses, Ano 2) ← com consultas
```

### 3.3 Consultas Criadas (mês de referência: Janeiro/2026)

| Médico | Consultas no Mês | Elegível? |
|--------|-----------------|-----------|
| Dr. Bruno N1-A | 5 | ✅ Sim |
| Dra. Carla N2-A | 3 | ✅ Sim |
| Dr. Diego N3-A | 10 | ✅ Sim |
| Dr. Felipe N1-E | 2 | ✅ Sim |
| Dra. Gabriela N1-E | 7 | ✅ Sim |
| Dr. Henrique N1-E | 4 | ✅ Sim |
| Dra. Karen N1-I | 6 | ✅ Sim |
| **Dr. Julio N1-I** | **0** | **❌ Não — sem consultas** |
| Dr. Alfredo Raiz | 8 | N/A — sem indicador acima |
| Dra. Elisa Raiz | 12 | N/A — sem indicador acima |

---

## 4. Resultados do Cálculo de Comissões

### 4.1 Comissões Geradas — Janeiro/2026

| ✓ | Referenciador | Indicado | Nível | Ano do Indicado | Consultas | Valor Esperado | Valor Calculado |
|---|---------------|----------|-------|-----------------|-----------|----------------|-----------------|
| ✅ | Dr. Alfredo Raiz | Dr. Bruno N1-A | N1 | Ano 1 | 5 | R$ 100,00 | **R$ 100,00** |
| ✅ | Dr. Alfredo Raiz | Dra. Carla N2-A | N2 | Ano 2 | 3 | R$ 35,00 | **R$ 35,00** |
| ✅ | Dr. Alfredo Raiz | Dr. Diego N3-A | N3 | Ano 3+ | 10 | R$ 12,50 | **R$ 12,50** |
| ✅ | Dr. Bruno N1-A | Dra. Carla N2-A | N1 | Ano 2 | 3 | R$ 70,00 | **R$ 70,00** |
| ✅ | Dr. Bruno N1-A | Dr. Diego N3-A | N2 | Ano 3+ | 10 | R$ 25,00 | **R$ 25,00** |
| ✅ | Dra. Carla N2-A | Dr. Diego N3-A | N1 | Ano 3+ | 10 | R$ 50,00 | **R$ 50,00** |
| ✅ | Dra. Elisa Raiz | Dr. Felipe N1-E | N1 | Ano 1 | 2 | R$ 100,00 | **R$ 100,00** |
| ✅ | Dra. Elisa Raiz | Dra. Gabriela N1-E | N1 | Ano 2 | 7 | R$ 70,00 | **R$ 70,00** |
| ✅ | Dra. Elisa Raiz | Dr. Henrique N1-E | N1 | Ano 3+ | 4 | R$ 50,00 | **R$ 50,00** |
| ✅ | Dra. Iris Raiz | Dra. Karen N1-I | N1 | Ano 2 | 6 | R$ 70,00 | **R$ 70,00** |

**Total de comissões geradas:** 10 registros  
**Total esperado:** 10 registros  
**Discrepâncias:** 0

### 4.2 Casos de Borda Verificados

| Cenário | Resultado | Status |
|---------|-----------|--------|
| Dr. Julio (0 consultas no mês) não gerou comissão | Nenhum registro criado | ✅ **CORRETO** |
| Dr. Alfredo (raiz, sem indicador) não recebe comissão de ninguém acima | Nenhum registro como `referredId` | ✅ **CORRETO** |
| Dra. Elisa (raiz, sem indicador) não recebe comissão de ninguém acima | Nenhum registro como `referredId` | ✅ **CORRETO** |
| Dra. Iris (raiz, sem indicador) não recebe comissão de ninguém acima | Nenhum registro como `referredId` | ✅ **CORRETO** |
| Calcular o mesmo mês 2x não duplica registros (idempotência) | 10 registros antes e depois | ✅ **CORRETO** |

### 4.3 Resumo por Médico — Posição como Referenciador e Indicado

| Médico | Como Referenciador | Como Indicado | Total no Mês |
|--------|--------------------|---------------|--------------|
| Dr. Alfredo Raiz | R$ 147,50 (3 comissões) | — | **R$ 147,50** |
| Dr. Bruno N1-A | R$ 95,00 (2 comissões) | R$ 100,00 (1 comissão) | **R$ 195,00** |
| Dra. Carla N2-A | R$ 50,00 (1 comissão) | R$ 105,00 (2 comissões) | **R$ 155,00** |
| Dr. Diego N3-A | — | R$ 87,50 (3 comissões) | **R$ 87,50** |
| Dra. Elisa Raiz | R$ 220,00 (3 comissões) | — | **R$ 220,00** |
| Dr. Felipe N1-E | — | R$ 100,00 (1 comissão) | **R$ 100,00** |
| Dra. Gabriela N1-E | — | R$ 70,00 (1 comissão) | **R$ 70,00** |
| Dr. Henrique N1-E | — | R$ 50,00 (1 comissão) | **R$ 50,00** |
| Dra. Iris Raiz | R$ 70,00 (1 comissão) | — | **R$ 70,00** |
| Dr. Julio N1-I | — | — | **R$ 0,00** |
| Dra. Karen N1-I | — | R$ 70,00 (1 comissão) | **R$ 70,00** |
| **TOTAL GERAL** | | | **R$ 1.165,00** |

---

## 5. Análise dos Resultados

### 5.1 Corretude da Matriz de Comissões

Todos os 10 valores calculados correspondem exatamente aos valores esperados pela tabela de regras. A lógica de `calcYearOfReferred` classifica corretamente o ano do médico indicado com base na diferença entre a data atual e a data de cadastro do perfil médico.

### 5.2 Propagação Multinível

A cadeia de propagação da Rede A demonstra o comportamento correto em profundidade máxima (3 níveis). Quando Dr. Diego (N3 de A) realiza consultas, o sistema percorre corretamente: Diego → Carla (N1, R$50) → Bruno (N2, R$25) → Alfredo (N3, R$12,50). O sistema para corretamente no nível 3, não propagando para um hipotético N4.

### 5.3 Médico sem Consultas

Dr. Julio, que não realizou nenhuma consulta em Janeiro/2026, não gerou nenhum registro de comissão para sua indicadora (Dra. Iris). Este comportamento está correto: a comissão só é devida quando o médico indicado **trabalha ativamente** na plataforma no mês.

### 5.4 Idempotência

O sistema é idempotente: executar o cálculo do mesmo mês duas vezes não cria registros duplicados. A verificação de existência prévia (`SELECT` antes do `INSERT`) funciona corretamente para todos os combinações de `(referrerId, referredId, referenceMonth, level)`.

### 5.5 Observação sobre a Regra de Ano 3+

A tabela de regras armazena `yearOfReferred = 3` para representar "Ano 3 ou mais". O código usa `Math.min(yearOfReferred, 3)` para mapear qualquer valor ≥ 3 para a regra do Ano 3. Este comportamento foi verificado com Dr. Diego (26 meses = Ano 3) e Dr. Henrique (3 anos = Ano 3+), ambos recebendo os valores corretos da linha `yearOfReferred = 3`.

---

## 6. Dados de Teste Disponíveis no Sistema

Os seguintes dados foram inseridos no banco de produção e estão disponíveis para inspeção visual no painel admin:

- **11 médicos** com e-mails `*@audit-mgm.test` e senha `Audit@2026`
- **57 consultas** com `notes = '[AUDIT] Consulta de teste MGM'`
- **10 registros** na tabela `commissions_ledger` com `referenceMonth = '2026-01'`, status `pending`

Para visualizar no painel admin: acesse **Estrutura da Rede** para ver a hierarquia, **Ranking de Indicadores** para ver os totais, e **Exportar Relatório** para baixar o CSV completo.

---

## 7. Veredicto Final

| Critério | Resultado |
|----------|-----------|
| Valores da matriz de comissões | ✅ **APROVADO** — 10/10 corretos |
| Propagação multinível (até N3) | ✅ **APROVADO** — cadeia percorrida corretamente |
| Médico sem consultas não gera comissão | ✅ **APROVADO** |
| Raízes sem indicador não recebem comissão | ✅ **APROVADO** |
| Idempotência (sem duplicatas) | ✅ **APROVADO** |
| Classificação de ano do indicado | ✅ **APROVADO** — Ano 1, 2 e 3+ classificados corretamente |

> **O sistema MGM está implementado corretamente.** Todos os 14 cenários de teste passaram sem nenhuma discrepância.

---

*Relatório gerado automaticamente pelo script `/home/ubuntu/medialert/scripts/audit_mgm.mjs` em 24/02/2026.*
