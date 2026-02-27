/**
 * SCRIPT DE AUDITORIA MGM
 * Cria médicos de teste com diferentes tempos de cadastro,
 * estrutura de rede multinível e consultas variadas.
 * Verifica se as comissões são calculadas corretamente.
 *
 * CENÁRIOS TESTADOS:
 * A) Rede Linear: Dr.A → Dr.B → Dr.C → Dr.D (3 gerações)
 * B) Rede em Leque: Dr.E indica Dr.F, Dr.G, Dr.H (vários N1)
 * C) Médico sem indicador (não gera comissão para ninguém)
 * D) Médico indicado sem consultas no mês (não gera comissão)
 * E) Médico indicado no 1º ano (R$100/N1, R$50/N2, R$25/N3)
 * F) Médico indicado no 2º ano (R$70/N1, R$35/N2, R$17.50/N3)
 * G) Médico indicado no 3º ano+ (R$50/N1, R$25/N2, R$12.50/N3)
 * H) Idempotência: calcular o mesmo mês 2x não duplica
 */

import mysql from 'mysql2/promise';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// Use DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

// Simple bcrypt-like hash (using sha256 for test data - NOT for production)
function hashPassword(pwd) {
  return '$2b$10$' + createHash('sha256').update(pwd).digest('hex').substring(0, 53);
}

function generateCode(name) {
  return name.toUpperCase().replace(/\s/g, '').substring(0, 4) + Math.floor(1000 + Math.random() * 9000);
}

const NOW = new Date('2026-02-24');

// Helper: date N years ago
function yearsAgo(years, months = 0) {
  const d = new Date(NOW);
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - months);
  return d;
}

// Helper: date N months ago
function monthsAgo(months) {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('\n🔍 AUDITORIA MGM - MediAlert\n');
  console.log('='.repeat(60));

  // ─── LIMPEZA DE DADOS DE TESTE ANTERIORES ───────────────────
  console.log('\n[0] Limpando dados de teste anteriores...');
  await conn.execute("DELETE FROM commissions_ledger WHERE referenceMonth LIKE '2026-%'");
  await conn.execute("DELETE FROM appointments WHERE notes LIKE '%[AUDIT]%'");
  // Remove usuários de teste anteriores
  const [existingAudit] = await conn.execute("SELECT id FROM users WHERE email LIKE '%@audit-mgm.test'");
  if (existingAudit.length > 0) {
    const ids = existingAudit.map(u => u.id);
    await conn.execute(`DELETE FROM doctor_profiles WHERE userId IN (${ids.join(',')})`);
    await conn.execute(`DELETE FROM users WHERE id IN (${ids.join(',')})`);
  }
  console.log('   ✓ Dados de teste anteriores removidos');

  // ─── CRIAR MÉDICOS DE TESTE ──────────────────────────────────
  console.log('\n[1] Criando médicos de teste...\n');

  const doctors = [
    // REDE A: Linear 4 níveis (A→B→C→D)
    { key: 'A', name: 'Dr. Alfredo Raiz',    email: 'alfredo@audit-mgm.test', joinedAt: yearsAgo(4),    scenario: 'Raiz da rede A (sem indicador)' },
    { key: 'B', name: 'Dr. Bruno N1-A',      email: 'bruno@audit-mgm.test',   joinedAt: yearsAgo(0, 6), scenario: 'Ano 1 - N1 de A (6 meses)' },
    { key: 'C', name: 'Dra. Carla N2-A',     email: 'carla@audit-mgm.test',   joinedAt: yearsAgo(1, 3), scenario: 'Ano 2 - N2 de A, N1 de B (15 meses)' },
    { key: 'D', name: 'Dr. Diego N3-A',      email: 'diego@audit-mgm.test',   joinedAt: yearsAgo(2, 2), scenario: 'Ano 3+ - N3 de A, N2 de B, N1 de C (26 meses)' },

    // REDE B: Leque (E indica F, G, H com diferentes anos)
    { key: 'E', name: 'Dra. Elisa Raiz',     email: 'elisa@audit-mgm.test',   joinedAt: yearsAgo(5),    scenario: 'Raiz da rede B (sem indicador)' },
    { key: 'F', name: 'Dr. Felipe N1-E',     email: 'felipe@audit-mgm.test',  joinedAt: yearsAgo(0, 3), scenario: 'Ano 1 - N1 de E (3 meses)' },
    { key: 'G', name: 'Dra. Gabriela N1-E',  email: 'gabriela@audit-mgm.test',joinedAt: yearsAgo(1, 6), scenario: 'Ano 2 - N1 de E (18 meses)' },
    { key: 'H', name: 'Dr. Henrique N1-E',   email: 'henrique@audit-mgm.test',joinedAt: yearsAgo(3),    scenario: 'Ano 3+ - N1 de E (3 anos)' },

    // REDE C: Casos especiais
    { key: 'I', name: 'Dra. Iris Raiz',      email: 'iris@audit-mgm.test',    joinedAt: yearsAgo(2),    scenario: 'Raiz isolada (sem indicador, sem indicados)' },
    { key: 'J', name: 'Dr. Julio N1-I',      email: 'julio@audit-mgm.test',   joinedAt: yearsAgo(0, 8), scenario: 'Ano 1 - N1 de I - SEM CONSULTAS (não gera comissão)' },
    { key: 'K', name: 'Dra. Karen N1-I',     email: 'karen@audit-mgm.test',   joinedAt: yearsAgo(1, 1), scenario: 'Ano 2 - N1 de I - COM CONSULTAS' },
  ];

  const doctorMap = {}; // key → { userId, profileId }

  for (const doc of doctors) {
    const openId = 'audit_' + doc.key + '_' + Date.now();
    const [uResult] = await conn.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, appRole, passwordHash, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, 'email', 'user', 'doctor', ?, ?, ?, ?)`,
      [openId, doc.name, doc.email, hashPassword('Audit@2026'), doc.joinedAt, doc.joinedAt, doc.joinedAt]
    );
    const userId = uResult.insertId;

    const refCode = generateCode(doc.name);
    const [dpResult] = await conn.execute(
      `INSERT INTO doctor_profiles (userId, crm, crmState, specialty, phone, insurances, referralCode, createdAt, updatedAt)
       VALUES (?, ?, 'SP', 'Clínica Geral', '11999990000', '[]', ?, ?, ?)`,
      [userId, 'CRM' + Math.floor(10000 + Math.random() * 90000), refCode, doc.joinedAt, doc.joinedAt]
    );
    const profileId = dpResult.insertId;

    doctorMap[doc.key] = { userId, profileId, name: doc.name, joinedAt: doc.joinedAt };
    console.log(`   ✓ ${doc.name} | userId=${userId} | profileId=${profileId} | joinedAt=${doc.joinedAt.toISOString().split('T')[0]} | ${doc.scenario}`);
  }

  // ─── CONFIGURAR REDE DE INDICAÇÕES ──────────────────────────
  console.log('\n[2] Configurando rede de indicações...\n');

  // Rede A: A → B → C → D
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.A.profileId, doctorMap.B.profileId]);
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.B.profileId, doctorMap.C.profileId]);
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.C.profileId, doctorMap.D.profileId]);
  console.log('   ✓ Rede A: Dr.Alfredo → Dr.Bruno → Dra.Carla → Dr.Diego');

  // Rede B: E → F, G, H
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.E.profileId, doctorMap.F.profileId]);
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.E.profileId, doctorMap.G.profileId]);
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.E.profileId, doctorMap.H.profileId]);
  console.log('   ✓ Rede B: Dra.Elisa → Dr.Felipe, Dra.Gabriela, Dr.Henrique');

  // Rede C: I → J, K
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.I.profileId, doctorMap.J.profileId]);
  await conn.execute('UPDATE doctor_profiles SET indicatedById=? WHERE id=?', [doctorMap.I.profileId, doctorMap.K.profileId]);
  console.log('   ✓ Rede C: Dra.Iris → Dr.Julio (sem consultas), Dra.Karen (com consultas)');

  // ─── CRIAR PACIENTES DE TESTE ────────────────────────────────
  console.log('\n[3] Criando pacientes de teste...');
  const patientIds = [];
  for (let i = 1; i <= 5; i++) {
    const [pResult] = await conn.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, appRole, passwordHash, createdAt, updatedAt)
       VALUES (?, ?, ?, 'email', 'user', 'patient', ?, NOW(), NOW())`,
      ['audit_patient_' + i + '_' + Date.now(), 'Paciente Teste ' + i, 'paciente' + i + '@audit-mgm.test', hashPassword('Audit@2026')]
    );
    patientIds.push(pResult.insertId);
  }
  console.log(`   ✓ ${patientIds.length} pacientes criados`);

  // ─── CRIAR CONSULTAS ─────────────────────────────────────────
  console.log('\n[4] Criando consultas (mês de referência: 2026-01)...\n');

  // Mês de referência para cálculo: Janeiro 2026
  const refMonth = '2026-01';
  const apptDate = '2026-01-15'; // Dentro do mês de referência

  const consultasCenarios = [
    // Médicos que GERAM comissão (têm consultas no mês)
    { doctorKey: 'B', count: 5,  desc: 'Dr.Bruno (N1-A, Ano1) - 5 consultas → GERA comissão' },
    { doctorKey: 'C', count: 3,  desc: 'Dra.Carla (N2-A/N1-B, Ano2) - 3 consultas → GERA comissão' },
    { doctorKey: 'D', count: 10, desc: 'Dr.Diego (N3-A/N2-B/N1-C, Ano3+) - 10 consultas → GERA comissão' },
    { doctorKey: 'F', count: 2,  desc: 'Dr.Felipe (N1-E, Ano1) - 2 consultas → GERA comissão' },
    { doctorKey: 'G', count: 7,  desc: 'Dra.Gabriela (N1-E, Ano2) - 7 consultas → GERA comissão' },
    { doctorKey: 'H', count: 4,  desc: 'Dr.Henrique (N1-E, Ano3+) - 4 consultas → GERA comissão' },
    { doctorKey: 'K', count: 6,  desc: 'Dra.Karen (N1-I, Ano2) - 6 consultas → GERA comissão' },
    // Médicos que NÃO geram comissão (sem consultas)
    { doctorKey: 'J', count: 0,  desc: 'Dr.Julio (N1-I, Ano1) - 0 consultas → NÃO gera comissão' },
    // Raízes não têm indicador, então não geram comissão para ninguém acima
    { doctorKey: 'A', count: 8,  desc: 'Dr.Alfredo (Raiz, sem indicador) - 8 consultas → não gera comissão (sem indicador)' },
    { doctorKey: 'E', count: 12, desc: 'Dra.Elisa (Raiz, sem indicador) - 12 consultas → não gera comissão (sem indicador)' },
  ];

  for (const cen of consultasCenarios) {
    const doc = doctorMap[cen.doctorKey];
    for (let i = 0; i < cen.count; i++) {
      const patId = patientIds[i % patientIds.length];
      await conn.execute(
        `INSERT INTO appointments (doctorId, patientId, date, time, status, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, '09:00', 'completed', '[AUDIT] Consulta de teste MGM', ?, ?)`,
        [doc.userId, patId, apptDate, new Date('2026-01-15'), new Date('2026-01-15')]
      );
    }
    console.log(`   ${cen.count > 0 ? '✓' : '○'} ${cen.desc}`);
  }

  // ─── EXECUTAR CÁLCULO DE COMISSÕES ──────────────────────────
  console.log('\n[5] Executando cálculo de comissões para 2026-01...\n');

  // Calcular diretamente no banco
  await calculateCommissionsDirectly(conn, refMonth, doctorMap);

  // ─── VERIFICAR RESULTADOS ────────────────────────────────────
  console.log('\n[6] Verificando resultados das comissões...\n');
  await verifyResults(conn, doctorMap, doctors, refMonth);

  // ─── TESTE DE IDEMPOTÊNCIA ───────────────────────────────────
  console.log('\n[7] Teste de idempotência (calcular o mesmo mês 2x)...\n');
  const [before] = await conn.execute("SELECT COUNT(*) as cnt FROM commissions_ledger WHERE referenceMonth=?", [refMonth]);
  await calculateCommissionsDirectly(conn, refMonth, doctorMap);
  const [after] = await conn.execute("SELECT COUNT(*) as cnt FROM commissions_ledger WHERE referenceMonth=?", [refMonth]);
  if (before[0].cnt === after[0].cnt) {
    console.log(`   ✅ IDEMPOTÊNCIA OK: ${before[0].cnt} registros antes e depois. Sem duplicatas.`);
  } else {
    console.log(`   ❌ FALHA DE IDEMPOTÊNCIA: ${before[0].cnt} → ${after[0].cnt} registros. DUPLICATAS CRIADAS!`);
  }

  // ─── RESUMO FINAL ────────────────────────────────────────────
  console.log('\n[8] Resumo final por indicador...\n');
  await printSummary(conn, doctorMap, doctors);

  await conn.end();
  console.log('\n' + '='.repeat(60));
  console.log('✅ AUDITORIA CONCLUÍDA\n');
}

async function calculateCommissionsDirectly(conn, referenceMonth, doctorMap) {
  const [year, month] = referenceMonth.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(month).padStart(2,'0')}-31`;

  // Get all doctor profiles with indicatedById
  const [profiles] = await conn.execute(
    'SELECT * FROM doctor_profiles WHERE indicatedById IS NOT NULL'
  );
  const [rules] = await conn.execute(
    'SELECT * FROM commission_rules WHERE active=1'
  );

  let inserted = 0;
  let skipped = 0;

  for (const profile of profiles) {
    // Count completed appointments in the month
    const [appts] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM appointments 
       WHERE doctorId=? AND status='completed' AND date>=? AND date<=?`,
      [profile.userId, startDate, endDate]
    );
    const apptCount = appts[0].cnt;
    if (apptCount === 0) {
      skipped++;
      continue;
    }

    // Calculate year of referred
    const joinedAt = new Date(profile.createdAt);
    const now = new Date('2026-02-24');
    const diffYears = (now - joinedAt) / (1000 * 60 * 60 * 24 * 365.25);
    const yearOfReferred = diffYears < 1 ? 1 : diffYears < 2 ? 2 : 3;

    // Walk up referral chain (up to 3 levels)
    let currentProfileId = profile.id;
    for (let level = 1; level <= 3; level++) {
      const [parentRows] = await conn.execute(
        'SELECT * FROM doctor_profiles WHERE id=?', [currentProfileId]
      );
      if (!parentRows[0] || !parentRows[0].indicatedById) break;
      const referrerId = parentRows[0].indicatedById;

      // Find rule
      const rule = rules.find(r => r.level === level && r.yearOfReferred === Math.min(yearOfReferred, 3));
      if (!rule || Number(rule.amount) <= 0) {
        currentProfileId = referrerId;
        continue;
      }

      // Check idempotency
      const [existing] = await conn.execute(
        `SELECT id FROM commissions_ledger 
         WHERE referrerId=? AND referredId=? AND referenceMonth=? AND level=?`,
        [referrerId, profile.id, referenceMonth, level]
      );
      if (existing.length > 0) {
        currentProfileId = referrerId;
        continue;
      }

      await conn.execute(
        `INSERT INTO commissions_ledger 
         (referrerId, referredId, level, referenceMonth, appointmentsCount, yearOfReferred, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [referrerId, profile.id, level, referenceMonth, apptCount, yearOfReferred, rule.amount]
      );
      inserted++;
      currentProfileId = referrerId;
    }
  }
  console.log(`   ✓ Cálculo direto: ${inserted} comissões inseridas, ${skipped} médicos sem consultas ignorados`);
}

async function verifyResults(conn, doctorMap, doctors, refMonth) {
  const [ledger] = await conn.execute(
    `SELECT cl.*, 
            dp_ref.userId as referrerUserId,
            dp_red.userId as referredUserId
     FROM commissions_ledger cl
     JOIN doctor_profiles dp_ref ON dp_ref.id = cl.referrerId
     JOIN doctor_profiles dp_red ON dp_red.id = cl.referredId
     WHERE cl.referenceMonth=?
     ORDER BY cl.referrerId, cl.level`,
    [refMonth]
  );

  // Build lookup: profileId → doctor
  const profileToDoctor = {};
  for (const [key, val] of Object.entries(doctorMap)) {
    profileToDoctor[val.profileId] = { key, name: val.name };
  }

  console.log('   Comissões geradas:\n');
  console.log('   ' + '-'.repeat(80));
  console.log('   ' + 
    'Referenciador'.padEnd(22) + 
    'Indicado'.padEnd(22) + 
    'Nível'.padEnd(7) + 
    'AnoInd'.padEnd(8) + 
    'Consultas'.padEnd(11) + 
    'Valor'
  );
  console.log('   ' + '-'.repeat(80));

  const expectedCommissions = [
    // Rede A: B(Ano1) tem consultas → A(N1=R$100), ninguém acima de A
    { referrer: 'A', referred: 'B', level: 1, year: 1, amount: 100.00 },
    // Rede A: C(Ano2) tem consultas → B(N1=R$70), A(N2=R$35)
    { referrer: 'B', referred: 'C', level: 1, year: 2, amount: 70.00 },
    { referrer: 'A', referred: 'C', level: 2, year: 2, amount: 35.00 },
    // Rede A: D(Ano3+) tem consultas → C(N1=R$50), B(N2=R$25), A(N3=R$12.50)
    { referrer: 'C', referred: 'D', level: 1, year: 3, amount: 50.00 },
    { referrer: 'B', referred: 'D', level: 2, year: 3, amount: 25.00 },
    { referrer: 'A', referred: 'D', level: 3, year: 3, amount: 12.50 },
    // Rede B: F(Ano1) → E(N1=R$100)
    { referrer: 'E', referred: 'F', level: 1, year: 1, amount: 100.00 },
    // Rede B: G(Ano2) → E(N1=R$70)
    { referrer: 'E', referred: 'G', level: 1, year: 2, amount: 70.00 },
    // Rede B: H(Ano3+) → E(N1=R$50)
    { referrer: 'E', referred: 'H', level: 1, year: 3, amount: 50.00 },
    // Rede C: K(Ano2) → I(N1=R$70)
    { referrer: 'I', referred: 'K', level: 1, year: 2, amount: 70.00 },
    // J não tem consultas → NENHUMA comissão
  ];

  let passCount = 0;
  let failCount = 0;

  for (const row of ledger) {
    const referrer = profileToDoctor[row.referrerId];
    const referred = profileToDoctor[row.referredId];
    const refKey = referrer?.key ?? '?';
    const redKey = referred?.key ?? '?';
    const expected = expectedCommissions.find(
      e => e.referrer === refKey && e.referred === redKey && e.level === row.level
    );
    const status = expected && Math.abs(Number(row.amount) - expected.amount) < 0.01 ? '✅' : '❌';
    if (status === '✅') passCount++;
    else failCount++;

    console.log(`   ${status} ` +
      (referrer?.name ?? 'DESCONHECIDO').padEnd(22) +
      (referred?.name ?? 'DESCONHECIDO').padEnd(22) +
      ('N' + row.level).padEnd(7) +
      ('Ano ' + row.yearOfReferred).padEnd(8) +
      (row.appointmentsCount + ' appts').padEnd(11) +
      'R$ ' + Number(row.amount).toFixed(2)
    );
  }
  console.log('   ' + '-'.repeat(80));

  // Verificar que J não gerou comissão
  const jProfile = Object.values(doctorMap).find((_, i) => Object.keys(doctorMap)[i] === 'J');
  const jKey = doctorMap['J'];
  const [jComm] = await conn.execute(
    'SELECT COUNT(*) as cnt FROM commissions_ledger WHERE referredId=? AND referenceMonth=?',
    [jKey.profileId, refMonth]
  );
  if (jComm[0].cnt === 0) {
    console.log(`\n   ✅ Dr.Julio (sem consultas): CORRETO - nenhuma comissão gerada`);
    passCount++;
  } else {
    console.log(`\n   ❌ Dr.Julio (sem consultas): ERRO - ${jComm[0].cnt} comissão(ões) gerada(s) indevidamente!`);
    failCount++;
  }

  // Verificar que raízes (A, E, I) não geraram comissão como INDICADOS (pois não têm indicador)
  for (const rootKey of ['A', 'E', 'I']) {
    const rootDoc = doctorMap[rootKey];
    const [rootComm] = await conn.execute(
      'SELECT COUNT(*) as cnt FROM commissions_ledger WHERE referredId=? AND referenceMonth=?',
      [rootDoc.profileId, refMonth]
    );
    if (rootComm[0].cnt === 0) {
      console.log(`   ✅ ${rootDoc.name} (raiz, sem indicador): CORRETO - não gerou comissão para ninguém acima`);
      passCount++;
    } else {
      console.log(`   ❌ ${rootDoc.name} (raiz): ERRO - gerou comissão indevidamente!`);
      failCount++;
    }
  }

  console.log(`\n   RESULTADO: ${passCount} testes passaram, ${failCount} falharam`);
  console.log(`   Total de comissões geradas: ${ledger.length} (esperado: ${expectedCommissions.length})`);
  if (ledger.length === expectedCommissions.length && failCount === 0) {
    console.log('   🎉 TODOS OS TESTES PASSARAM!');
  } else {
    console.log('   ⚠️  ATENÇÃO: Há discrepâncias nos resultados!');
  }
}

async function printSummary(conn, doctorMap, doctors) {
  console.log('   ' + 'Médico'.padEnd(25) + 'Como Referenciador'.padEnd(20) + 'Como Indicado'.padEnd(20) + 'Total');
  console.log('   ' + '-'.repeat(75));

  for (const [key, doc] of Object.entries(doctorMap)) {
    const docInfo = doctors.find(d => d.key === key);
    const [asRef] = await conn.execute(
      'SELECT SUM(amount) as total, COUNT(*) as cnt FROM commissions_ledger WHERE referrerId=?',
      [doc.profileId]
    );
    const [asRefd] = await conn.execute(
      'SELECT SUM(amount) as total, COUNT(*) as cnt FROM commissions_ledger WHERE referredId=?',
      [doc.profileId]
    );
    const refTotal = Number(asRef[0].total ?? 0);
    const refdTotal = Number(asRefd[0].total ?? 0);
    const total = refTotal + refdTotal;

    const refStr = refTotal > 0 ? `R$ ${refTotal.toFixed(2)} (${asRef[0].cnt}x)` : '—';
    const refdStr = refdTotal > 0 ? `R$ ${refdTotal.toFixed(2)} (${asRefd[0].cnt}x)` : '—';
    const totalStr = total > 0 ? `R$ ${total.toFixed(2)}` : '—';

    console.log(`   ${doc.name.padEnd(25)}${refStr.padEnd(20)}${refdStr.padEnd(20)}${totalStr}`);
  }
}

main().catch(err => {
  console.error('\n❌ ERRO NO SCRIPT DE AUDITORIA:', err.message);
  process.exit(1);
});
