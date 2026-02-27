/**
 * AUDITORIA MGM v2 — Rede em Árvore Real
 *
 * Cenário principal: Dr. Bruno é N1 de Dr. Alfredo E também indica 3 médicos abaixo dele.
 * Isso testa se o sistema calcula corretamente comissões em múltiplas direções.
 *
 * ESTRUTURA DA REDE:
 *
 *   Dr. Alfredo (Raiz, 4 anos)
 *   └── Dr. Bruno (N1-Alfredo, 2 anos) ← MÉDIO: recebe E paga comissões
 *       ├── Dra. Carla (N1-Bruno / N2-Alfredo, 1 ano)
 *       ├── Dr. Diego (N1-Bruno / N2-Alfredo, 2 anos)
 *       └── Dra. Elena (N1-Bruno / N2-Alfredo, 3+ anos)
 *
 *   Dra. Fernanda (Raiz, 3 anos)
 *   └── Dr. Gustavo (N1-Fernanda, 1 ano)
 *       └── Dra. Helena (N1-Gustavo / N2-Fernanda, 1 ano)
 *           └── Dr. Igor (N1-Helena / N2-Gustavo / N3-Fernanda, 1 ano)
 *
 *   Dr. Julio (Raiz isolada — sem indicados, sem indicador)
 *
 * CENÁRIOS DE ELEGIBILIDADE:
 * - Carla: 1 ano → Ano 1 → R$100 para Bruno, R$50 para Alfredo
 * - Diego: 2 anos → Ano 2 → R$70 para Bruno, R$35 para Alfredo
 * - Elena: 3+ anos → Ano 3+ → R$50 para Bruno, R$25 para Alfredo
 * - Gustavo: 1 ano → Ano 1 → R$100 para Fernanda
 * - Helena: 1 ano → Ano 1 → R$100 para Gustavo, R$50 para Fernanda
 * - Igor: 1 ano → Ano 1 → R$100 para Helena, R$50 para Gustavo, R$25 para Fernanda
 * - Bruno: 2 anos → Ano 2 → R$70 para Alfredo (Bruno também é indicado!)
 *
 * TOTAL ESPERADO PARA ALFREDO:
 *   De Bruno (Ano2): R$70
 *   De Carla (N2, Ano1): R$50
 *   De Diego (N2, Ano2): R$35
 *   De Elena (N2, Ano3+): R$25
 *   TOTAL: R$180
 *
 * TOTAL ESPERADO PARA BRUNO:
 *   De Carla (N1, Ano1): R$100
 *   De Diego (N1, Ano2): R$70
 *   De Elena (N1, Ano3+): R$50
 *   TOTAL: R$220
 */
import mysql from 'mysql2/promise';
import { createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL não definida'); process.exit(1); }

function hashPassword(pwd) {
  return '$2b$10$' + createHash('sha256').update(pwd).digest('hex').substring(0, 53);
}
function generateCode(key) {
  return 'AUD2' + key.toUpperCase() + Math.floor(100 + Math.random() * 900);
}

const NOW = new Date('2026-02-24');
function yearsAgo(y, m = 0) {
  const d = new Date(NOW);
  d.setFullYear(d.getFullYear() - y);
  d.setMonth(d.getMonth() - m);
  return d;
}

// Calculate year of referred (same logic as db.ts)
function calcYearOfReferred(joinedAt) {
  const months = Math.floor((NOW - joinedAt) / (1000 * 60 * 60 * 24 * 30.44));
  return Math.min(Math.ceil(months / 12) || 1, 3);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('\n🔍 AUDITORIA MGM v2 — Rede em Árvore Real\n');
  console.log('='.repeat(70));

  // ─── LIMPEZA ────────────────────────────────────────────────────────────────
  console.log('\n[0] Limpando dados de auditoria v2 anteriores...');
  const [existingV2] = await conn.execute("SELECT id FROM users WHERE email LIKE '%@audit2-mgm.test'");
  if (existingV2.length > 0) {
    const ids = existingV2.map(u => u.id);
    const idStr = ids.join(',');
    await conn.execute(`DELETE FROM commissions_ledger WHERE referrerId IN (SELECT id FROM doctor_profiles WHERE userId IN (${idStr})) OR referredId IN (SELECT id FROM doctor_profiles WHERE userId IN (${idStr}))`);
    await conn.execute(`DELETE FROM appointments WHERE doctorId IN (${idStr})`);
    await conn.execute(`DELETE FROM doctor_profiles WHERE userId IN (${idStr})`);
    await conn.execute(`DELETE FROM users WHERE id IN (${idStr})`);
  }
  console.log('   ✓ Limpeza concluída');

  // ─── DEFINIÇÃO DOS MÉDICOS ───────────────────────────────────────────────────
  const doctors = [
    // Rede 1: Alfredo → Bruno → (Carla, Diego, Elena)
    { key: 'ALF', name: 'Dr. Alfredo Souza',    email: 'alfredo@audit2-mgm.test', joinedAt: yearsAgo(4),    indicatorKey: null,   desc: 'Raiz Rede 1 (4 anos)' },
    { key: 'BRU', name: 'Dr. Bruno Mendes',     email: 'bruno@audit2-mgm.test',   joinedAt: yearsAgo(2),    indicatorKey: 'ALF',  desc: 'N1-Alfredo, Ano2 — também indica Carla, Diego, Elena' },
    { key: 'CAR', name: 'Dra. Carla Lima',      email: 'carla@audit2-mgm.test',   joinedAt: yearsAgo(0, 8), indicatorKey: 'BRU',  desc: 'N1-Bruno / N2-Alfredo, Ano1 (8 meses)' },
    { key: 'DIE', name: 'Dr. Diego Costa',      email: 'diego@audit2-mgm.test',   joinedAt: yearsAgo(2),    indicatorKey: 'BRU',  desc: 'N1-Bruno / N2-Alfredo, Ano2 (2 anos)' },
    { key: 'ELE', name: 'Dra. Elena Rocha',     email: 'elena@audit2-mgm.test',   joinedAt: yearsAgo(3, 2), indicatorKey: 'BRU',  desc: 'N1-Bruno / N2-Alfredo, Ano3+ (38 meses)' },
    // Rede 2: Fernanda → Gustavo → Helena → Igor (4 níveis, mas só 3 recebem comissão)
    { key: 'FER', name: 'Dra. Fernanda Pires',  email: 'fernanda@audit2-mgm.test',joinedAt: yearsAgo(3),    indicatorKey: null,   desc: 'Raiz Rede 2 (3 anos)' },
    { key: 'GUS', name: 'Dr. Gustavo Alves',    email: 'gustavo@audit2-mgm.test', joinedAt: yearsAgo(0, 10),indicatorKey: 'FER',  desc: 'N1-Fernanda, Ano1 (10 meses)' },
    { key: 'HEL', name: 'Dra. Helena Vieira',   email: 'helena@audit2-mgm.test',  joinedAt: yearsAgo(0, 6), indicatorKey: 'GUS',  desc: 'N1-Gustavo / N2-Fernanda, Ano1 (6 meses)' },
    { key: 'IGO', name: 'Dr. Igor Nascimento',  email: 'igor@audit2-mgm.test',    joinedAt: yearsAgo(0, 3), indicatorKey: 'HEL',  desc: 'N1-Helena / N2-Gustavo / N3-Fernanda, Ano1 (3 meses)' },
    // Caso especial: raiz isolada
    { key: 'JUL', name: 'Dr. Julio Ferreira',   email: 'julio@audit2-mgm.test',   joinedAt: yearsAgo(1),    indicatorKey: null,   desc: 'Raiz isolada — sem indicados, sem indicador' },
  ];

  // ─── CRIAR USUÁRIOS E PERFIS ─────────────────────────────────────────────────
  console.log('\n[1] Criando médicos de teste...\n');
  const doctorMap = {};
  for (const doc of doctors) {
    const openId = 'audit2_' + doc.key + '_' + Date.now();
    const [uResult] = await conn.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, appRole, passwordHash, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, 'email', 'user', 'doctor', ?, ?, ?, ?)`,
      [openId, doc.name, doc.email, hashPassword('Audit@2026'), doc.joinedAt, doc.joinedAt, doc.joinedAt]
    );
    const userId = uResult.insertId;
    const refCode = generateCode(doc.key);
    const [dpResult] = await conn.execute(
      `INSERT INTO doctor_profiles (userId, crm, crmState, specialty, phone, insurances, referralCode, createdAt, updatedAt)
       VALUES (?, ?, 'SP', 'Clínica Geral', '11999990000', '[]', ?, ?, ?)`,
      [userId, 'CRM' + Math.floor(10000 + Math.random() * 90000), refCode, doc.joinedAt, doc.joinedAt]
    );
    const profileId = dpResult.insertId;
    doctorMap[doc.key] = { userId, profileId, name: doc.name, joinedAt: doc.joinedAt, yearOfReferred: calcYearOfReferred(doc.joinedAt) };
    console.log(`   ✓ ${doc.name} | profileId=${profileId} | Ano=${doctorMap[doc.key].yearOfReferred} | ${doc.desc}`);
  }

  // ─── CONFIGURAR REDE ─────────────────────────────────────────────────────────
  console.log('\n[2] Configurando rede de indicações...\n');
  for (const doc of doctors) {
    if (doc.indicatorKey) {
      const indicatorProfileId = doctorMap[doc.indicatorKey].profileId;
      await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [indicatorProfileId, doctorMap[doc.key].profileId]);
      console.log(`   ✓ ${doc.name} ← indicado por ${doctorMap[doc.indicatorKey].name}`);
    }
  }

  // ─── CRIAR PACIENTES ─────────────────────────────────────────────────────────
  console.log('\n[3] Criando pacientes de teste...');
  const patientIds = [];
  for (let i = 1; i <= 3; i++) {
    const [pResult] = await conn.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, appRole, passwordHash, createdAt, updatedAt)
       VALUES (?, ?, ?, 'email', 'user', 'patient', ?, NOW(), NOW())`,
      ['audit2_pat_' + i + '_' + Date.now(), 'Paciente Auditoria2 ' + i, 'pac2_' + i + '@audit2-mgm.test', hashPassword('Audit@2026')]
    );
    patientIds.push(pResult.insertId);
  }
  console.log(`   ✓ ${patientIds.length} pacientes criados`);

  // ─── CRIAR CONSULTAS ─────────────────────────────────────────────────────────
  console.log('\n[4] Criando consultas (mês de referência: 2026-01)...\n');
  const refMonth = '2026-01';
  const apptDate = '2026-01-20';
  // Todos os médicos indicados têm consultas (exceto Julio que é raiz isolada sem indicados)
  const consultasCenarios = [
    { key: 'BRU', count: 4,  desc: 'Bruno (N1-Alfredo, Ano2) — 4 consultas → gera R$70 para Alfredo' },
    { key: 'CAR', count: 3,  desc: 'Carla (N1-Bruno/N2-Alfredo, Ano1) — 3 consultas → R$100 Bruno + R$50 Alfredo' },
    { key: 'DIE', count: 6,  desc: 'Diego (N1-Bruno/N2-Alfredo, Ano2) — 6 consultas → R$70 Bruno + R$35 Alfredo' },
    { key: 'ELE', count: 2,  desc: 'Elena (N1-Bruno/N2-Alfredo, Ano3+) — 2 consultas → R$50 Bruno + R$25 Alfredo' },
    { key: 'GUS', count: 5,  desc: 'Gustavo (N1-Fernanda, Ano1) — 5 consultas → R$100 Fernanda' },
    { key: 'HEL', count: 3,  desc: 'Helena (N1-Gustavo/N2-Fernanda, Ano1) — 3 consultas → R$100 Gustavo + R$50 Fernanda' },
    { key: 'IGO', count: 8,  desc: 'Igor (N1-Helena/N2-Gustavo/N3-Fernanda, Ano1) — 8 consultas → R$100 Helena + R$50 Gustavo + R$25 Fernanda' },
    // Julio: raiz isolada, sem indicador → não gera comissão para ninguém
    { key: 'JUL', count: 10, desc: 'Julio (raiz isolada) — 10 consultas → NÃO gera comissão' },
  ];

  for (const c of consultasCenarios) {
    const doctorId = doctorMap[c.key].userId;
    const patientId = patientIds[0];
    for (let i = 0; i < c.count; i++) {
      await conn.execute(
        `INSERT INTO appointments (doctorId, patientId, date, time, status, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, '09:00', 'completed', '[AUDIT2] Consulta de teste', ?, ?)`,
        [doctorId, patientId, apptDate, new Date('2026-01-20'), new Date('2026-01-20')]
      );
    }
    console.log(`   ✓ ${c.desc}`);
  }

  // ─── CALCULAR COMISSÕES ──────────────────────────────────────────────────────
  console.log('\n[5] Calculando comissões para 2026-01...\n');

  // Get commission rules
  const [rules] = await conn.execute('SELECT * FROM commission_rules ORDER BY level, yearOfReferred');
  const getRuleAmount = (level, year) => {
    const rule = rules.find(r => r.level === level && r.yearOfReferred === Math.min(year, 3));
    return rule ? parseFloat(rule.amount) : 0;
  };

  // Build referral chain for each doctor
  const getChain = async (profileId) => {
    const chain = [];
    let currentId = profileId;
    for (let i = 0; i < 3; i++) {
      const [rows] = await conn.execute('SELECT indicatedById FROM doctor_profiles WHERE id=?', [currentId]);
      if (!rows[0] || !rows[0].indicatedById) break;
      currentId = rows[0].indicatedById;
      chain.push(currentId);
    }
    return chain; // [N1 profileId, N2 profileId, N3 profileId]
  };

  // For each doctor with appointments in refMonth, calculate commissions
  const [apptDoctors] = await conn.execute(
    `SELECT DISTINCT doctorId FROM appointments WHERE date LIKE '2026-01-%' AND status='completed' AND notes LIKE '%[AUDIT2]%'`
  );

  const commissionsToInsert = [];
  for (const row of apptDoctors) {
    const doctorUserId = row.doctorId;
    const [profileRows] = await conn.execute('SELECT id, indicatedById FROM doctor_profiles WHERE userId=?', [doctorUserId]);
    if (!profileRows[0] || !profileRows[0].indicatedById) continue; // No indicator = no commission

    const referredProfileId = profileRows[0].id;
    const yearOfReferred = calcYearOfReferred(doctors.find(d => doctorMap[d.key].userId === doctorUserId)?.joinedAt || new Date());
    const chain = await getChain(referredProfileId);

    for (let level = 1; level <= chain.length; level++) {
      const referrerProfileId = chain[level - 1];
      const amount = getRuleAmount(level, yearOfReferred);
      if (amount > 0) {
        commissionsToInsert.push({ referrerId: referrerProfileId, referredId: referredProfileId, level, yearOfReferred, amount, referenceMonth: refMonth });
      }
    }
  }

  // Insert commissions
  for (const c of commissionsToInsert) {
    await conn.execute(
      `INSERT INTO commissions_ledger (referrerId, referredId, level, yearOfReferred, appointmentsCount, amount, status, referenceMonth, createdAt)
       VALUES (?, ?, ?, ?, 1, ?, 'pending', ?, NOW())`,
      [c.referrerId, c.referredId, c.level, c.yearOfReferred, c.amount, c.referenceMonth]
    );
  }
  console.log(`   ✓ ${commissionsToInsert.length} comissões inseridas`);

  // ─── VERIFICAÇÃO ─────────────────────────────────────────────────────────────
  console.log('\n[6] Verificação dos resultados...\n');
  console.log('─'.repeat(70));

  // Expected totals
  const expected = {
    ALF: { name: 'Dr. Alfredo Souza', expected: 70 + 50 + 35 + 25, desc: 'Bruno(70) + Carla(50) + Diego(35) + Elena(25)' },
    BRU: { name: 'Dr. Bruno Mendes',  expected: 100 + 70 + 50,     desc: 'Carla(100) + Diego(70) + Elena(50)' },
    FER: { name: 'Dra. Fernanda Pires',expected: 100 + 50 + 25,    desc: 'Gustavo(100) + Helena(50) + Igor(25)' },
    GUS: { name: 'Dr. Gustavo Alves', expected: 100 + 50,          desc: 'Helena(100) + Igor(50)' },
    HEL: { name: 'Dra. Helena Vieira',expected: 100,               desc: 'Igor(100)' },
    JUL: { name: 'Dr. Julio Ferreira',expected: 0,                 desc: 'Raiz isolada — sem comissões' },
  };

  let allPassed = true;
  const results = [];

  for (const [key, exp] of Object.entries(expected)) {
    const profileId = doctorMap[key].profileId;
    const [rows] = await conn.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM commissions_ledger WHERE referrerId=? AND referenceMonth=?`,
      [profileId, refMonth]
    );
    const actual = parseFloat(rows[0].total);
    const passed = Math.abs(actual - exp.expected) < 0.01;
    if (!passed) allPassed = false;
    results.push({ name: exp.name, expected: exp.expected, actual, passed, desc: exp.desc });
    console.log(`   ${passed ? '✅' : '❌'} ${exp.name}`);
    console.log(`      Esperado: R$ ${exp.expected.toFixed(2)} (${exp.desc})`);
    console.log(`      Obtido:   R$ ${actual.toFixed(2)}`);
    console.log();
  }

  // ─── VERIFICAR ESTRUTURA DA REDE ─────────────────────────────────────────────
  console.log('─'.repeat(70));
  console.log('\n[7] Verificando estrutura da rede no banco...\n');

  const [networkRows] = await conn.execute(`
    SELECT dp.id, u.name, dp.referralCode, dp.indicatedById,
           (SELECT u2.name FROM doctor_profiles dp2 JOIN users u2 ON dp2.userId=u2.id WHERE dp2.id=dp.indicatedById) as indicatorName,
           (SELECT COUNT(*) FROM doctor_profiles WHERE indicatedById=dp.id) as directReferrals
    FROM doctor_profiles dp
    JOIN users u ON dp.userId=u.id
    WHERE u.email LIKE '%@audit2-mgm.test'
    ORDER BY dp.id
  `);

  console.log('   Médico                    | Indicado por          | Indicados diretos');
  console.log('   ' + '-'.repeat(65));
  for (const row of networkRows) {
    const indicator = row.indicatorName || '(raiz)';
    console.log(`   ${row.name.padEnd(26)} | ${indicator.padEnd(21)} | ${row.directReferrals}`);
  }

  // ─── RESUMO FINAL ────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 RESULTADO FINAL: ${allPassed ? '✅ TODOS OS CENÁRIOS PASSARAM' : '❌ FALHAS DETECTADAS'}`);
  console.log(`   Cenários testados: ${results.length}`);
  console.log(`   Aprovados: ${results.filter(r => r.passed).length}`);
  console.log(`   Reprovados: ${results.filter(r => !r.passed).length}`);

  if (!allPassed) {
    console.log('\n⚠️  FALHAS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ❌ ${r.name}: esperado R$${r.expected.toFixed(2)}, obtido R$${r.actual.toFixed(2)}`);
    });
  }

  console.log('\n📌 DADOS DISPONÍVEIS NO BANCO PARA INSPEÇÃO VISUAL:');
  console.log('   - Emails: *@audit2-mgm.test');
  console.log('   - Mês de referência: 2026-01');
  console.log('   - Consultas marcadas com [AUDIT2]');
  console.log('   - Acesse o painel admin para ver os dados nas telas de Estrutura da Rede e Ranking\n');

  await conn.end();
}

main().catch(err => { console.error('ERRO:', err); process.exit(1); });
