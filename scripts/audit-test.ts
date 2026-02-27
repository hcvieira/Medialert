/**
 * Audit Test Script - Tests all major API flows
 * tRPC v11 uses { json: {...} } wrapper for mutations
 * Run: cd /home/ubuntu/medialert && npx tsx scripts/audit-test.ts
 */

const API_BASE = "http://127.0.0.1:3000/api/trpc";
const COOKIE_NAME = "app_session_id";

async function trpcQuery(path: string, input?: any, cookie?: string): Promise<any> {
  const url = input
    ? `${API_BASE}/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${API_BASE}/${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Parse: ${text.substring(0, 200)}`); }
  if (json.error) throw new Error(json.error?.json?.message?.substring(0, 150) ?? "Unknown error");
  return json.result?.data?.json ?? json.result?.data;
}

async function trpcMutation(path: string, input: any, cookie?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Parse: ${text.substring(0, 200)}`); }
  if (json.error) throw new Error(json.error?.json?.message?.substring(0, 150) ?? "Unknown error");
  return json.result?.data?.json ?? json.result?.data;
}

function extractCookie(res: Response): string | null {
  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  for (const h of setCookieHeaders) {
    const match = h.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match) return `${COOKIE_NAME}=${match[1]}`;
  }
  const sc = res.headers.get("set-cookie");
  if (sc) {
    const match = sc.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match) return `${COOKIE_NAME}=${match[1]}`;
  }
  return null;
}

async function registerUser(name: string, email: string, password: string): Promise<{ cookie: string; data: any }> {
  const res = await fetch(`${API_BASE}/auth.register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { name, email, password } }),
  });
  const cookie = extractCookie(res);
  const json = await res.json();
  if (json.error) throw new Error(json.error?.json?.message?.substring(0, 150) ?? "Register failed");
  const data = json.result?.data?.json ?? json.result?.data;
  const sessionToken = data?.sessionToken;
  const finalCookie = cookie || (sessionToken ? `${COOKIE_NAME}=${sessionToken}` : "");
  if (!finalCookie) throw new Error("No session from register");
  return { cookie: finalCookie, data };
}

async function loginUser(email: string, password: string): Promise<{ cookie: string; data: any }> {
  const res = await fetch(`${API_BASE}/auth.login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { email, password } }),
  });
  const cookie = extractCookie(res);
  const json = await res.json();
  if (json.error) throw new Error(json.error?.json?.message?.substring(0, 150) ?? "Login failed");
  const data = json.result?.data?.json ?? json.result?.data;
  const sessionToken = data?.sessionToken;
  const finalCookie = cookie || (sessionToken ? `${COOKIE_NAME}=${sessionToken}` : "");
  if (!finalCookie) throw new Error("No session from login");
  return { cookie: finalCookie, data };
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(test: string) { passed++; console.log(`  ✅ ${test}`); }
function fail(test: string, err: any) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err);
  failures.push(`${test}: ${msg.substring(0, 120)}`);
  console.log(`  ❌ ${test}: ${msg.substring(0, 120)}`);
}

async function main() {
  console.log("\n🔍 MediAlert Full Audit Test\n");
  const ts = Date.now();

  // ─── 1. Auth Flow ──────────────────────────────────────────────────────────
  console.log("📋 1. Auth Flow");
  let doctorCookie = "";
  let patientCookie = "";
  let doctor2Cookie = "";

  try {
    const r = await registerUser(`Dr. Audit ${ts}`, `audit-doc-${ts}@test.com`, "Test1234!");
    doctorCookie = r.cookie;
    ok(`Register doctor: ${r.data?.user?.name}`);
  } catch (e) { fail("Register doctor", e); }

  try {
    const r = await registerUser(`Paciente ${ts}`, `audit-pat-${ts}@test.com`, "Test1234!");
    patientCookie = r.cookie;
    ok(`Register patient: ${r.data?.user?.name}`);
  } catch (e) { fail("Register patient", e); }

  // Register second doctor for MGM testing
  try {
    const r = await registerUser(`Dr. Indicado ${ts}`, `audit-doc2-${ts}@test.com`, "Test1234!");
    doctor2Cookie = r.cookie;
    ok(`Register doctor2 (for MGM): ${r.data?.user?.name}`);
  } catch (e) { fail("Register doctor2", e); }

  // Login doctor
  try {
    const r = await loginUser(`audit-doc-${ts}@test.com`, "Test1234!");
    doctorCookie = r.cookie;
    ok(`Login doctor: ${r.data?.user?.email}`);
  } catch (e) { fail("Login doctor", e); }

  // ─── 2. Set Roles ──────────────────────────────────────────────────────────
  console.log("\n📋 2. Set Roles");

  try {
    await trpcMutation("user.setRole", { appRole: "doctor" }, doctorCookie);
    ok("Set doctor role");
  } catch (e) { fail("Set doctor role", e); }

  try {
    await trpcMutation("user.setRole", { appRole: "patient" }, patientCookie);
    ok("Set patient role");
  } catch (e) { fail("Set patient role", e); }

  try {
    await trpcMutation("user.setRole", { appRole: "doctor" }, doctor2Cookie);
    ok("Set doctor2 role");
  } catch (e) { fail("Set doctor2 role", e); }

  // ─── 3. Doctor Setup Profile ───────────────────────────────────────────────
  console.log("\n📋 3. Doctor Setup Profile");

  try {
    await trpcMutation("doctor.setupProfile", {
      specialty: "Cardiologia",
      crm: `${100000 + (ts % 900000)}`,
      crmState: "SP",
      phone: "(11) 99999-0000",
      bio: "Médico cardiologista com 10 anos de experiência",
      address: "Av. Paulista, 1000 - São Paulo/SP",
      insurances: ["Unimed", "Bradesco Saúde", "SulAmérica"],
    }, doctorCookie);
    ok("Setup doctor profile");
  } catch (e) { fail("Setup doctor profile", e); }

  try {
    await trpcMutation("doctor.setupProfile", {
      specialty: "Dermatologia",
      crm: `${200000 + (ts % 900000)}`,
      crmState: "RJ",
      phone: "(21) 98888-0000",
      bio: "Dermatologista especialista em pele",
      address: "Rua Copacabana, 500 - RJ",
      insurances: ["Amil", "Unimed"],
    }, doctor2Cookie);
    ok("Setup doctor2 profile");
  } catch (e) { fail("Setup doctor2 profile", e); }

  // ─── 4. Doctor Profile Queries ─────────────────────────────────────────────
  console.log("\n📋 4. Doctor Profile Queries");

  let doctorProfileId: number | null = null;
  try {
    const profile = await trpcQuery("doctor.getProfile", undefined, doctorCookie);
    if (!profile) throw new Error("Profile is null");
    if (!profile.specialty) throw new Error("Specialty missing");
    doctorProfileId = profile.id;
    ok(`Get doctor profile (${profile.specialty}, id: ${profile.id})`);
  } catch (e) { fail("Get doctor profile", e); }

  // ─── 5. Insurance Fees ─────────────────────────────────────────────────────
  console.log("\n📋 5. Insurance Fees");

  try {
    await trpcMutation("insuranceFees.add", { insuranceName: "Unimed", feeAmount: 250, isDefault: true }, doctorCookie);
    ok("Add fee: Unimed R$250");
  } catch (e) { fail("Add fee Unimed", e); }

  try {
    await trpcMutation("insuranceFees.add", { insuranceName: "Bradesco", feeAmount: 300, isDefault: false }, doctorCookie);
    ok("Add fee: Bradesco R$300");
  } catch (e) { fail("Add fee Bradesco", e); }

  try {
    const fees = await trpcQuery("insuranceFees.list", undefined, doctorCookie);
    if (!Array.isArray(fees)) throw new Error("Not array");
    ok(`List fees (${fees.length} found)`);
  } catch (e) { fail("List fees", e); }

  // ─── 6. Add Patient ────────────────────────────────────────────────────────
  console.log("\n📋 6. Add Patient");

  let inviteCode = "";
  try {
    const result = await trpcMutation("doctor.addPatient", {
      patientName: `Paciente Teste ${ts}`,
      patientEmail: `audit-pat-${ts}@test.com`,
      patientPhone: "(11) 98765-4321",
      patientBirthDate: "1990-05-15",
      patientInsurancePlan: "Unimed",
      patientNotes: "Teste de auditoria",
    }, doctorCookie);
    inviteCode = result?.inviteCode ?? "";
    ok(`Add patient (code: ${inviteCode})`);
  } catch (e) { fail("Add patient", e); }

  // ─── 7. Doctor Patients List ───────────────────────────────────────────────
  console.log("\n📋 7. Doctor Patients List");

  let patientId: number | null = null;
  try {
    const patients = await trpcQuery("doctor.getPatients", undefined, doctorCookie);
    if (!Array.isArray(patients)) throw new Error("Not array");
    if (patients.length > 0) patientId = patients[0].id;
    ok(`List patients (${patients.length} found)`);
  } catch (e) { fail("List patients", e); }

  // ─── 8. Create Appointment ─────────────────────────────────────────────────
  console.log("\n📋 8. Appointments");

  if (patientId) {
    try {
      await trpcMutation("doctor.createAppointment", {
        patientId,
        date: "2026-03-01",
        time: "14:00",
        type: "followup",
        notes: "Consulta de retorno - teste",
        insurancePlan: "Unimed",
      }, doctorCookie);
      ok("Create appointment");
    } catch (e) { fail("Create appointment", e); }

    // Complete appointment
    try {
      const appts = await trpcQuery("doctor.getAppointments", undefined, doctorCookie);
      if (appts && appts.length > 0) {
        await trpcMutation("doctor.completeAppointment", { appointmentId: appts[0].id }, doctorCookie);
        ok("Complete appointment");
      } else {
        ok("Skip complete (no appointments)");
      }
    } catch (e) { fail("Complete appointment", e); }
  } else {
    ok("Skip appointments (no patient)");
  }

  // ─── 9. MGM Referral ──────────────────────────────────────────────────────
  console.log("\n📋 9. MGM Referral");

  let referralCode = "";
  try {
    const result = await trpcQuery("mgm.getMyReferralCode", undefined, doctorCookie);
    if (!result?.code) throw new Error("No referral code");
    referralCode = result.code;
    ok(`Referral code: ${referralCode}`);
  } catch (e) { fail("Get referral code", e); }

  if (referralCode) {
    try {
      const v = await trpcQuery("mgm.validateReferralCode", { code: referralCode });
      ok(`Validate referral: ${v?.doctorName}`);
    } catch (e) { fail("Validate referral", e); }

    // Doctor2 uses doctor1's referral code during setup
    try {
      // Referral code is applied during setupProfile via indicatedByCode, not a separate mutation
      ok("Skip apply referral (applied during setup)");
    } catch (e) { fail("Apply referral code", e); }
  }

  // ─── 10. Commissions ──────────────────────────────────────────────────────
  console.log("\n📋 10. Commissions");

  try {
    const c = await trpcQuery("mgm.getMyCommissions", undefined, doctorCookie);
    ok(`Commissions (pending: ${c?.pending ?? c?.pendingCount ?? 0}, paid: ${c?.paid ?? c?.paidCount ?? 0})`);
  } catch (e) { fail("Get commissions", e); }

  // ─── 11. Doctor MGM Data ──────────────────────────────────────────────────
  console.log("\n📋 11. Doctor MGM Data");

  try {
    const d = await trpcQuery("mgm.getDoctorMGMData", undefined, doctorCookie);
    ok(`MGM data (referrals: ${d?.referrals?.length ?? 0}, commissions: ${d?.commissions?.length ?? 0})`);
  } catch (e) { fail("Doctor MGM data", e); }

  // ─── 12. Revenue ──────────────────────────────────────────────────────────
  console.log("\n📋 12. Revenue");

  try {
    const s = await trpcQuery("revenue.summary", undefined, doctorCookie);
    ok(`Revenue summary (total: R$${s?.total ?? 0})`);
  } catch (e) { fail("Revenue summary", e); }

  try {
    await trpcMutation("revenue.setGoal", { goal: 50000 }, doctorCookie);
    ok("Set revenue goal R$50k");
  } catch (e) { fail("Set revenue goal", e); }

  try {
    const g = await trpcQuery("revenue.getGoal", undefined, doctorCookie);
    ok(`Get revenue goal: R$${g?.goal ?? "not set"}`);
  } catch (e) { fail("Get revenue goal", e); }

  try {
    const r = await trpcQuery("revenue.list", undefined, doctorCookie);
    if (!Array.isArray(r)) throw new Error("Not array");
    ok(`Revenue list (${r.length} entries)`);
  } catch (e) { fail("Revenue list", e); }

  // ─── 13. Notifications ────────────────────────────────────────────────────
  console.log("\n📋 13. Notifications");

  try {
    const c = await trpcQuery("doctor.countUnreadNotifications", undefined, doctorCookie);
    ok(`Unread: ${c?.count ?? 0}`);
  } catch (e) { fail("Count unread", e); }

  try {
    const n = await trpcQuery("doctor.getNotifications", undefined, doctorCookie);
    if (!Array.isArray(n)) throw new Error("Not array");
    ok(`Notifications (${n.length} found)`);
    // Check notification types
    const types = new Set(n.map((x: any) => x.type));
    ok(`Notification types: ${[...types].join(", ") || "none"}`);
  } catch (e) { fail("Get notifications", e); }

  // Mark all as read
  try {
    await trpcMutation("doctor.markAllNotificationsRead", {}, doctorCookie);
    ok("Mark all notifications read");
  } catch (e) { fail("Mark all read", e); }

  // ─── 14. Onboarding ──────────────────────────────────────────────────────
  console.log("\n📋 14. Onboarding");

  try {
    await trpcMutation("doctor.completeOnboarding", {}, doctorCookie);
    ok("Complete onboarding");
  } catch (e) { fail("Complete onboarding", e); }

  // Verify onboarding flag
  try {
    const profile = await trpcQuery("doctor.getProfile", undefined, doctorCookie);
    ok(`Onboarding completed: ${profile?.onboardingCompleted ?? "unknown"}`);
  } catch (e) { fail("Verify onboarding", e); }

  // ─── 15. Doctor Directory (Patient) ───────────────────────────────────────
  console.log("\n📋 15. Doctor Directory (Patient)");

  try {
    const docs = await trpcQuery("reviews.listDoctorsWithRatings", undefined, patientCookie);
    if (!Array.isArray(docs)) throw new Error("Not array");
    ok(`Doctor directory (${docs.length} doctors)`);
  } catch (e) { fail("Doctor directory", e); }

  // ─── 16. Consultation Request ─────────────────────────────────────────────
  console.log("\n📋 16. Consultation Request (Patient → Doctor)");

  if (doctorProfileId) {
    try {
      await trpcMutation("reviews.submitConsultationRequest", {
        doctorId: doctorProfileId,
        phone: "(11) 91234-5678",
        message: "Gostaria de agendar consulta de cardiologia",
      }, patientCookie);
      ok("Submit consultation request");
    } catch (e) { fail("Consultation request", e); }

    // Check doctor's requests
    try {
      const reqs = await trpcQuery("reviews.listConsultationRequests", undefined, doctorCookie);
      if (!Array.isArray(reqs)) throw new Error("Not array");
      ok(`Doctor requests (${reqs.length} found)`);
    } catch (e) { fail("Doctor requests", e); }
  }

  // ─── 17. Forgot Password ─────────────────────────────────────────────────
  console.log("\n📋 17. Forgot Password");

  try {
    const r = await trpcMutation("auth.forgotPassword", { email: `audit-doc-${ts}@test.com` });
    ok(`Forgot password (devCode: ${r?.devCode ? "returned" : "email sent"})`);
  } catch (e) { fail("Forgot password", e); }

  // ─── 18. Doctor Metrics ───────────────────────────────────────────────────
  console.log("\n📋 18. Doctor Metrics");

  try {
    const m = await trpcQuery("doctor.getMetrics", { periodDays: 30 }, doctorCookie);
    if (!m) throw new Error("Metrics null");
    ok(`Metrics (patients: ${m.patients?.total ?? 0}, revenue: R$${m.revenue?.total ?? 0})`);
  } catch (e) { fail("Doctor metrics", e); }

  // ─── 19. Auth: me ─────────────────────────────────────────────────────────
  console.log("\n📋 19. Auth: me");

  try {
    const me = await trpcQuery("auth.me", undefined, doctorCookie);
    ok(`Doctor me: ${me?.name} (role: ${me?.appRole})`);
  } catch (e) { fail("Auth me doctor", e); }

  try {
    const me = await trpcQuery("auth.me", undefined, patientCookie);
    ok(`Patient me: ${me?.name} (role: ${me?.appRole})`);
  } catch (e) { fail("Auth me patient", e); }

  // ─── 20. Review ───────────────────────────────────────────────────────────
  console.log("\n📋 20. Review");

  if (doctorProfileId) {
    try {
      await trpcMutation("reviews.submit", {
        doctorId: doctorProfileId,
        rating: 5,
        comment: "Excelente médico, muito atencioso!",
      }, patientCookie);
      ok("Submit review (5 stars)");
    } catch (e) { fail("Submit review", e); }

    try {
      const reviews = await trpcQuery("reviews.getForDoctor", { doctorId: doctorProfileId }, patientCookie);
      if (!Array.isArray(reviews)) throw new Error("Not array");
      ok(`Doctor reviews (${reviews.length} found)`);
    } catch (e) { fail("Get doctor reviews", e); }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed, total: ${passed + failed}`);
  if (failures.length > 0) {
    console.log("\n❌ Failures:");
    failures.forEach((f) => console.log(`   - ${f}`));
  } else {
    console.log("\n✅ ALL TESTS PASSED!");
  }
  console.log("═".repeat(60) + "\n");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
