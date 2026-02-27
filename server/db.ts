import { alias, and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  caregiverPatients,
  medications,
  medicationTimes,
  doseRecords,
  InsertMedication,
  InsertDoseRecord,
  InsertCaregiverPatient,
  doctorProfiles,
  doctorPatients,
  appointments,
  clinicalNotes,
  InsertDoctorProfile,
  InsertDoctorPatient,
  InsertAppointment,
  InsertClinicalNote,
  patientAuditLog,
  doctorReviews,
  InsertDoctorReview,
  consultationRequests,
  InsertConsultationRequest,
  doctorNotifications,
  InsertDoctorNotification,
  DoctorNotification,
  commissionRules,
  commissionsLedger,
  InsertCommissionLedger,
  doctorInsuranceFees,
  InsertDoctorInsuranceFee,
  appointmentRevenues,
  platformFees,
  InsertPlatformFee,
  PlatformFee,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createEmailUser(data: { name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updateUserPasswordHash(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function updateUserResetToken(userId: number, token: string | null, expiry: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, userId));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateUserAppRole(userId: number, appRole: "caregiver" | "patient" | "doctor") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ appRole }).where(eq(users.id, userId));
}

export async function updateUserPushToken(userId: number, pushToken: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ pushToken }).where(eq(users.id, userId));
}

// ─── Caregiver ↔ Patient ──────────────────────────────────────────────────────

export async function createInvite(data: InsertCaregiverPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(caregiverPatients).values(data);
}

export async function getInviteByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(caregiverPatients).where(eq(caregiverPatients.inviteCode, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function acceptInvite(inviteId: number, patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(caregiverPatients).set({ patientId, accepted: true }).where(eq(caregiverPatients.id, inviteId));
}

/** Used when the patient generated the code and the caregiver accepts it */
export async function acceptInviteAsCaregiver(inviteId: number, caregiverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(caregiverPatients).set({ caregiverId, accepted: true }).where(eq(caregiverPatients.id, inviteId));
}

/** Removes the link between a caregiver and a patient (either side can call) */
export async function unlinkCaregiverPatient(caregiverId: number, patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(caregiverPatients)
    .where(and(eq(caregiverPatients.caregiverId, caregiverId), eq(caregiverPatients.patientId, patientId)));
}

export async function getCaregiverPatients(caregiverId: number) {
  const db = await getDb();
  if (!db) return [];
  // Single JOIN query instead of N+1
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl,
      appRole: users.appRole,
      role: users.role,
      pushToken: users.pushToken,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
      openId: users.openId,
      loginMethod: users.loginMethod,
      passwordHash: users.passwordHash,
    })
    .from(caregiverPatients)
    .innerJoin(users, eq(users.id, caregiverPatients.patientId))
    .where(and(eq(caregiverPatients.caregiverId, caregiverId), eq(caregiverPatients.accepted, true)));
  return rows;
}

export async function getPatientCaregiver(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(caregiverPatients)
    .where(and(eq(caregiverPatients.patientId, patientId), eq(caregiverPatients.accepted, true))).limit(1);
  if (result.length === 0) return null;
  return (await getUserById(result[0].caregiverId)) ?? null;
}

/** Returns the raw link row (with caregiverId) for a patient */
export async function getPatientCaregiverLink(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(caregiverPatients)
    .where(and(eq(caregiverPatients.patientId, patientId), eq(caregiverPatients.accepted, true))).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Returns all active caregiver-patient links (for server-side batch jobs) */
export async function getAllActiveCaregiverLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caregiverPatients).where(eq(caregiverPatients.accepted, true));
}

/**
 * Infers the roles of a user dynamically from their links and medications.
 * A user is a caregiver if they have accepted links as caregiverId.
 * A user is a patient if they have accepted links as patientId OR have medications.
 * A user with no links and no medications defaults to the appRole set in their profile.
 */
export async function getUserRoles(userId: number): Promise<{ isPatient: boolean; isCaregiver: boolean }> {
  const db = await getDb();
  if (!db) {
    // Fallback: use stored appRole
    const user = await getUserById(userId);
    const role = (user as any)?.appRole ?? "patient";
    return { isPatient: role !== "caregiver", isCaregiver: role === "caregiver" };
  }

  const [caregiverLinks, patientLinks, meds] = await Promise.all([
    db.select().from(caregiverPatients)
      .where(and(eq(caregiverPatients.caregiverId, userId), eq(caregiverPatients.accepted, true))),
    db.select().from(caregiverPatients)
      .where(and(eq(caregiverPatients.patientId, userId), eq(caregiverPatients.accepted, true))),
    db.select().from(medications)
      .where(and(eq(medications.patientId, userId), eq(medications.active, true))).limit(1),
  ]);

  const isCaregiver = caregiverLinks.length > 0;
  const isPatientByLink = patientLinks.length > 0;
  const isPatientByMeds = meds.length > 0;

  // If no links and no meds, fall back to stored appRole
  if (!isCaregiver && !isPatientByLink && !isPatientByMeds) {
    const user = await getUserById(userId);
    const role = (user as any)?.appRole ?? "patient";
    return { isPatient: role !== "caregiver", isCaregiver: role === "caregiver" };
  }

  return {
    isPatient: isPatientByLink || isPatientByMeds || (!isCaregiver),
    isCaregiver,
  };
}

// ─── Medications ──────────────────────────────────────────────────────────────

export async function getMedicationsForPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  const meds = await db.select().from(medications)
    .where(and(eq(medications.patientId, patientId), eq(medications.active, true)));
  const result = await Promise.all(
    meds.map(async (med) => {
      const times = await db!.select().from(medicationTimes).where(eq(medicationTimes.medicationId, med.id));
      return { ...med, times };
    })
  );
  return result;
}

/** Returns ALL medications (active + inactive) for a patient, for history view */
export async function getAllMedicationsForPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  const meds = await db.select().from(medications)
    .where(eq(medications.patientId, patientId));
  const result = await Promise.all(
    meds.map(async (med) => {
      const times = await db!.select().from(medicationTimes).where(eq(medicationTimes.medicationId, med.id));
      return { ...med, times };
    })
  );
  return result;
}

export async function createMedication(data: InsertMedication, times: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medications).values(data);
  const medId = (result as any)[0].insertId as number;
  if (times.length > 0) {
    await db.insert(medicationTimes).values(times.map((t) => ({ medicationId: medId, time: t })));
  }
  return medId;
}

export async function updateMedication(id: number, data: Partial<InsertMedication>, times?: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(medications).set(data).where(eq(medications.id, id));
  if (times !== undefined) {
    await db.delete(medicationTimes).where(eq(medicationTimes.medicationId, id));
    if (times.length > 0) {
      await db.insert(medicationTimes).values(times.map((t) => ({ medicationId: id, time: t })));
    }
  }
}

export async function softDeleteMedication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(medications).set({ active: false, canceledAt: new Date() }).where(eq(medications.id, id));
}

export async function reactivateMedication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(medications).set({ active: true, canceledAt: null }).where(eq(medications.id, id));
}

/** Cancel all pending dose records for a medication (called when prescription is cancelled) */
export async function cancelPendingDosesForMedication(medicationId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(doseRecords)
    .set({ status: "cancelled" as any })
    .where(and(eq(doseRecords.medicationId, medicationId), eq(doseRecords.status, "pending")));
}

// ─── Dose Records ─────────────────────────────────────────────────────────────

export async function getDoseRecordsForPatient(patientId: number, date?: string) {
  const db = await getDb();
  if (!db) return [];
  // Join with medications to only return doses for ACTIVE medications
  // This ensures that when a doctor cancels a prescription, the patient
  // no longer sees pending doses for that medication
  const conditions = [
    eq(doseRecords.patientId, patientId),
    eq(medications.active, true),
  ];
  if (date) conditions.push(eq(doseRecords.date, date));
  return db
    .select({
      id: doseRecords.id,
      medicationId: doseRecords.medicationId,
      patientId: doseRecords.patientId,
      medicationName: doseRecords.medicationName,
      scheduledTime: doseRecords.scheduledTime,
      date: doseRecords.date,
      status: doseRecords.status,
      takenAt: doseRecords.takenAt,
      createdAt: doseRecords.createdAt,
    })
    .from(doseRecords)
    .innerJoin(medications, eq(doseRecords.medicationId, medications.id))
    .where(and(...conditions));
}

export async function createDoseRecord(data: InsertDoseRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(doseRecords).values(data);
  return (result as any)[0].insertId as number;
}

export async function updateDoseRecord(id: number, data: Partial<InsertDoseRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doseRecords).set(data).where(eq(doseRecords.id, id));
}

export async function ensureTodayDoseRecords(patientId: number, date: string) {
  const db = await getDb();
  if (!db) return;
  const meds = await getMedicationsForPatient(patientId);
  const existing = await getDoseRecordsForPatient(patientId, date);
  const existingKeys = new Set(existing.map((r) => `${r.medicationId}-${r.scheduledTime}`));
  const toInsert: InsertDoseRecord[] = [];
  for (const med of meds) {
    for (const t of med.times) {
      const key = `${med.id}-${t.time}`;
      if (!existingKeys.has(key)) {
        toInsert.push({ medicationId: med.id, patientId, medicationName: med.name, scheduledTime: t.time, date, status: "pending" });
      }
    }
  }
  if (toInsert.length > 0) await db.insert(doseRecords).values(toInsert);
}

// ─── Doctor Profiles ──────────────────────────────────────────────────────────

export async function getAllDoctors() {
  const db = await getDb();
  if (!db) return [];
  // Single JOIN query: users + doctor_profiles
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      photoUrl: doctorProfiles.photoUrl,
      userPhotoUrl: users.photoUrl,
      specialty: doctorProfiles.specialty,
      crm: doctorProfiles.crm,
      crmState: doctorProfiles.crmState,
      insurances: doctorProfiles.insurances,
      phone: doctorProfiles.phone,
      bio: doctorProfiles.bio,
      address: doctorProfiles.address,
    })
    .from(users)
    .innerJoin(doctorProfiles, eq(doctorProfiles.userId, users.id))
    .where(eq(users.appRole, "doctor"));

  return rows
    .filter((d) => d.crm && d.crm !== "")
    .map((d) => ({
      ...d,
      photoUrl: d.photoUrl ?? d.userPhotoUrl ?? null,
    }));
}

export async function getDoctorProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDoctorBankInfo(profileId: number, bankData: {
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankAccountType: "corrente" | "poupanca" | null;
  pixKey: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorProfiles).set(bankData).where(eq(doctorProfiles.id, profileId));
}

export async function upsertDoctorProfile(data: InsertDoctorProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getDoctorProfile(data.userId);
  if (existing) {
    await db.update(doctorProfiles).set(data).where(eq(doctorProfiles.userId, data.userId));
    return getDoctorProfile(data.userId);
  } else {
    await db.insert(doctorProfiles).values(data);
    return getDoctorProfile(data.userId);
  }
}

// ─── Doctor ↔ Patient ──────────────────────────────────────────────────────────────

export async function createDoctorInvite(doctorId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(doctorPatients).values({ doctorId, patientId: 0, inviteCode, accepted: false });
  return inviteCode;
}

/** Doctor adds a patient directly (new flow v4.2) */
export async function addPatientByDoctor(data: {
  doctorId: number;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  patientBirthDate?: string;
  patientInsurancePlan?: string;
  patientNotes?: string;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(doctorPatients).values({
    doctorId: data.doctorId,
    patientId: 0,
    inviteCode,
    accepted: false,
    patientName: data.patientName,
    patientEmail: data.patientEmail,
    patientPhone: data.patientPhone,
    patientBirthDate: data.patientBirthDate,
    patientInsurancePlan: data.patientInsurancePlan,
    patientNotes: data.patientNotes,
  });
  return inviteCode;
}

/** Update doctor's profile photo URL */
export async function updateDoctorPhoto(userId: number, photoUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorProfiles).set({ photoUrl }).where(eq(doctorProfiles.userId, userId));
}

/** Update patient's photo URL */
export async function updatePatientPhoto(linkId: number, photoUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorPatients).set({ patientPhotoUrl: photoUrl }).where(eq(doctorPatients.id, linkId));
}

/** Update user's own display name */
export async function updateUserName(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ name }).where(eq(users.id, userId));
}

/** Update user's own profile photo URL */
export async function updateUserPhoto(userId: number, photoUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ photoUrl }).where(eq(users.id, userId));
}

/** Update patient info stored by doctor */
export async function updateDoctorPatientInfo(linkId: number, data: {
  patientName?: string;
  patientPhone?: string;
  patientBirthDate?: string;
  patientInsurancePlan?: string;
  patientNotes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorPatients).set(data).where(eq(doctorPatients.id, linkId));
}

/** Get all doctor_patients entries for a doctor (including pending invites) */
export async function getDoctorPatientsAll(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(doctorPatients).where(eq(doctorPatients.doctorId, doctorId));
}

export async function getDoctorInviteByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(doctorPatients).where(eq(doctorPatients.inviteCode, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function acceptDoctorInvite(inviteId: number, patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorPatients).set({ patientId, accepted: true }).where(eq(doctorPatients.id, inviteId));
}

export async function getDoctorPatients(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  // Single JOIN query instead of N+1
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl,
      appRole: users.appRole,
      role: users.role,
      pushToken: users.pushToken,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
      openId: users.openId,
      loginMethod: users.loginMethod,
      passwordHash: users.passwordHash,
    })
    .from(doctorPatients)
    .innerJoin(users, eq(users.id, doctorPatients.patientId))
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.accepted, true)));
  return rows;
}

export async function getPatientDoctors(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  // Single JOIN query: doctorPatients → users + doctorProfiles
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl,
      appRole: users.appRole,
      role: users.role,
      pushToken: users.pushToken,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
      openId: users.openId,
      loginMethod: users.loginMethod,
      passwordHash: users.passwordHash,
      profile: {
        id: doctorProfiles.id,
        crm: doctorProfiles.crm,
        crmState: doctorProfiles.crmState,
        specialty: doctorProfiles.specialty,
        insurances: doctorProfiles.insurances,
        phone: doctorProfiles.phone,
        bio: doctorProfiles.bio,
        address: doctorProfiles.address,
        photoUrl: doctorProfiles.photoUrl,
        referralCode: doctorProfiles.referralCode,
        indicatedById: doctorProfiles.indicatedById,
        onboardingCompleted: doctorProfiles.onboardingCompleted,
      },
    })
    .from(doctorPatients)
    .innerJoin(users, eq(users.id, doctorPatients.doctorId))
    .leftJoin(doctorProfiles, eq(doctorProfiles.userId, doctorPatients.doctorId))
    .where(and(eq(doctorPatients.patientId, patientId), eq(doctorPatients.accepted, true)));
  return rows;
}

export async function isPatientLinkedToDoctor(patientId: number, doctorId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId), eq(doctorPatients.accepted, true)))
    .limit(1);
  return result.length > 0;
}

/** Returns true if doctor has ANY link to patient (accepted or pending) — used for prescription management */
export async function isDoctorRelatedToPatient(patientId: number, doctorId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Check accepted link
  const accepted = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
    .limit(1);
  if (accepted.length > 0) return true;
  // Also check if doctor prescribed this medication (caregiver check)
  const med = await db.select().from(medications)
    .where(and(eq(medications.patientId, patientId), eq(medications.caregiverId, doctorId)))
    .limit(1);
  return med.length > 0;
}

// ─── Appointments ──────────────────────────────────────────────────────────────

export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(appointments).values(data);
  return (result as any)[0].insertId as number;
}

export async function getAppointmentsForDoctor(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
}

export async function getAppointmentsForPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(eq(appointments.patientId, patientId));
}

export async function updateAppointmentStatus(id: number, status: "scheduled" | "confirmed" | "cancelled" | "completed" | "reschedule_requested") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set({ status }).where(eq(appointments.id, id));
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set(data).where(eq(appointments.id, id));
}

// ─── Clinical Notes ────────────────────────────────────────────────────────────

export async function createClinicalNote(data: InsertClinicalNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clinicalNotes).values(data);
  return (result as any)[0].insertId as number;
}

export async function getClinicalNotes(doctorId: number, patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clinicalNotes)
    .where(and(eq(clinicalNotes.doctorId, doctorId), eq(clinicalNotes.patientId, patientId)))
    .orderBy(clinicalNotes.createdAt);
}

export async function updateClinicalNote(id: number, note: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clinicalNotes).set({ note }).where(eq(clinicalNotes.id, id));
}

export async function deleteClinicalNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clinicalNotes).where(eq(clinicalNotes.id, id));
}

/** Full patient history: appointments + clinical notes + dose adherence + patient personal info */
export async function getPatientFullHistory(doctorId: number, patientId: number, linkId?: number) {
  const db = await getDb();
  if (!db) return { appointments: [], notes: [], doseRecords: [], patientName: null, patientPhone: null, patientBirthDate: null, patientInsurancePlan: null, patientNotes: null };

  // For pending patients (patientId=0), fetch link by linkId to get personal info
  let linkRecord: typeof doctorPatients.$inferSelect | undefined;
  if (patientId === 0 && linkId) {
    const linkResult = await db.select().from(doctorPatients).where(and(eq(doctorPatients.id, linkId), eq(doctorPatients.doctorId, doctorId))).limit(1);
    linkRecord = linkResult[0];
    return {
      appointments: [],
      notes: [],
      doseRecords: [],
      patientName: linkRecord?.patientName ?? null,
      patientPhone: linkRecord?.patientPhone ?? null,
      patientBirthDate: linkRecord?.patientBirthDate ?? null,
      patientInsurancePlan: linkRecord?.patientInsurancePlan ?? null,
      patientNotes: linkRecord?.patientNotes ?? null,
    };
  }

  const [appts, notes, doses, links] = await Promise.all([
    db.select().from(appointments)
      .where(and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patientId)))
      .orderBy(appointments.date),
    getClinicalNotes(doctorId, patientId),
    db.select().from(doseRecords).where(eq(doseRecords.patientId, patientId)).orderBy(doseRecords.date),
    db.select().from(doctorPatients)
      .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
      .limit(1),
  ]);
  const link = links[0];
  return {
    appointments: appts,
    notes,
    doseRecords: doses,
    patientName: link?.patientName ?? null,
    patientPhone: link?.patientPhone ?? null,
    patientBirthDate: link?.patientBirthDate ?? null,
    patientInsurancePlan: link?.patientInsurancePlan ?? null,
    patientNotes: link?.patientNotes ?? null,
  };
}

/** Calculate medication adherence for a patient over the last 7 and 30 days */
export async function getAdherenceReport(patientId: number) {
  const db = await getDb();
  if (!db) return { last7: { taken: 0, total: 0, pct: 0 }, last30: { taken: 0, total: 0, pct: 0 }, byMedication: [] };

  const now = new Date();
  const date7 = new Date(now); date7.setDate(now.getDate() - 7);
  const date30 = new Date(now); date30.setDate(now.getDate() - 30);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const allDoses = await db.select().from(doseRecords)
    .where(and(eq(doseRecords.patientId, patientId)));

  const doses7 = allDoses.filter(d => d.date >= fmt(date7));
  const doses30 = allDoses.filter(d => d.date >= fmt(date30));

  const calcPct = (doses: typeof allDoses) => {
    const total = doses.length;
    const taken = doses.filter(d => d.status === "taken").length;
    return { taken, total, pct: total > 0 ? Math.round((taken / total) * 100) : 0 };
  };

  // Per-medication breakdown (last 30 days)
  const medMap = new Map<number, { name: string; taken: number; total: number; missed7: number }>();
  for (const d of doses30) {
    const entry = medMap.get(d.medicationId) ?? { name: d.medicationName, taken: 0, total: 0, missed7: 0 };
    entry.total++;
    if (d.status === "taken") entry.taken++;
    medMap.set(d.medicationId, entry);
  }
  // Count missed doses in last 7 days per medication
  for (const d of doses7) {
    const entry = medMap.get(d.medicationId);
    if (entry && (d.status === "missed" || d.status === "pending")) {
      entry.missed7++;
    }
  }
  const byMedication = Array.from(medMap.entries()).map(([id, v]) => ({
    medicationId: id,
    name: v.name,
    taken: v.taken,
    total: v.total,
    pct: v.total > 0 ? Math.round((v.taken / v.total) * 100) : 0,
    missedLast7: v.missed7,
  }));

  return {
    last7: calcPct(doses7),
    last30: calcPct(doses30),
    byMedication,
  };
}

/** Get weekly adherence (last 7 days) broken down by day and by medication */
export async function getWeeklyAdherenceByMedication(patientId: number) {
  const db = await getDb();
  if (!db) return { days: [], medications: [] };

  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // Build last 7 days array (oldest first)
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    last7Days.push(fmt(d));
  }

  const date7 = new Date(now);
  date7.setDate(now.getDate() - 6);

  const doses = await db.select().from(doseRecords)
    .where(and(
      eq(doseRecords.patientId, patientId),
    ));

  const doses7 = doses.filter(d => d.date >= fmt(date7));

  // Collect unique medications
  const medMap = new Map<number, string>();
  for (const d of doses7) {
    if (!medMap.has(d.medicationId)) medMap.set(d.medicationId, d.medicationName);
  }

  // Build per-medication per-day data
  const medications = Array.from(medMap.entries()).map(([medicationId, name]) => {
    const dayData = last7Days.map(date => {
      const dayDoses = doses7.filter(d => d.medicationId === medicationId && d.date === date);
      const total = dayDoses.length;
      const taken = dayDoses.filter(d => d.status === "taken").length;
      return { date, taken, total, pct: total > 0 ? Math.round((taken / total) * 100) : null };
    });
    return { medicationId, name, days: dayData };
  });

  return { days: last7Days, medications };
}

/** Add an audit log entry for patient data changes */
export async function addPatientAuditLog(data: {
  doctorId: number;
  linkId: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(patientAuditLog).values({
    doctorId: data.doctorId,
    linkId: data.linkId,
    field: data.field,
    oldValue: data.oldValue,
    newValue: data.newValue,
  });
}

/** Get audit log entries for a patient link */
export async function getPatientAuditLog(linkId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(patientAuditLog)
    .where(eq(patientAuditLog.linkId, linkId))
    .orderBy(desc(patientAuditLog.createdAt));
}

// ─── Doctor Reviews ───────────────────────────────────────────────────────────

/** Submit or update a review for a doctor after a completed appointment */
export async function upsertDoctorReview(data: InsertDoctorReview) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Check if patient already reviewed this appointment
  if (data.appointmentId) {
    const existing = await db
      .select({ id: doctorReviews.id })
      .from(doctorReviews)
      .where(
        and(
          eq(doctorReviews.patientId, data.patientId),
          eq(doctorReviews.appointmentId, data.appointmentId)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(doctorReviews)
        .set({ rating: data.rating, comment: data.comment ?? null })
        .where(eq(doctorReviews.id, existing[0].id));
      return existing[0].id;
    }
  }
  const result = await db.insert(doctorReviews).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

/** Get average rating and review count for a doctor */
export async function getDoctorRatingSummary(doctorId: number) {
  const db = await getDb();
  if (!db) return { average: 0, count: 0 };
  const rows = await db
    .select()
    .from(doctorReviews)
    .where(eq(doctorReviews.doctorId, doctorId));
  if (rows.length === 0) return { average: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / rows.length) * 10) / 10, count: rows.length };
}

/** Get all reviews for a doctor */
export async function getDoctorReviews(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(doctorReviews)
    .where(eq(doctorReviews.doctorId, doctorId))
    .orderBy(desc(doctorReviews.createdAt));
}

/** Get a patient's review for a specific appointment */
export async function getPatientReviewForAppointment(patientId: number, appointmentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(doctorReviews)
    .where(
      and(
        eq(doctorReviews.patientId, patientId),
        eq(doctorReviews.appointmentId, appointmentId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Get all doctors with their rating summaries (for directory) */
export async function getAllDoctorsWithRatings() {
  const db = await getDb();
  if (!db) return [];
  const doctors = await db
    .select({
      id: doctorProfiles.id,
      userId: doctorProfiles.userId,
      crm: doctorProfiles.crm,
      crmState: doctorProfiles.crmState,
      specialty: doctorProfiles.specialty,
      insurances: doctorProfiles.insurances,
      phone: doctorProfiles.phone,
      bio: doctorProfiles.bio,
      address: doctorProfiles.address,
      photoUrl: doctorProfiles.photoUrl,
      name: users.name,
    })
    .from(doctorProfiles)
    .innerJoin(users, eq(doctorProfiles.userId, users.id));

  // Fetch ratings aggregated in a single SQL query instead of N+1
  const withRatings = await db
    .select({
      id: doctorProfiles.id,
      userId: doctorProfiles.userId,
      crm: doctorProfiles.crm,
      crmState: doctorProfiles.crmState,
      specialty: doctorProfiles.specialty,
      insurances: doctorProfiles.insurances,
      phone: doctorProfiles.phone,
      bio: doctorProfiles.bio,
      address: doctorProfiles.address,
      photoUrl: doctorProfiles.photoUrl,
      name: users.name,
      averageRating: sql<number>`COALESCE(AVG(CAST(${doctorReviews.rating} AS DECIMAL(3,1))), 0)`,
      reviewCount: sql<number>`COUNT(${doctorReviews.id})`,
    })
    .from(doctorProfiles)
    .innerJoin(users, eq(doctorProfiles.userId, users.id))
    .leftJoin(doctorReviews, eq(doctorReviews.doctorProfileId, doctorProfiles.id))
    .groupBy(
      doctorProfiles.id, doctorProfiles.userId, doctorProfiles.crm, doctorProfiles.crmState,
      doctorProfiles.specialty, doctorProfiles.insurances, doctorProfiles.phone,
      doctorProfiles.bio, doctorProfiles.address, doctorProfiles.photoUrl, users.name
    );
  return withRatings;
}

// ─── Consultation Requests ───────────────────────────────────────────────────

/** Create a new consultation request from a patient to a doctor */
export async function createConsultationRequest(data: InsertConsultationRequest) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(consultationRequests).values(data);
  return result;
}

/** Get all pending consultation requests for a doctor */
export async function getDoctorConsultationRequests(doctorUserId: number) {
  const db = await getDb();
  if (!db) return [];
  // doctorUserId is the user.id of the doctor; we need to find their doctorProfile.id
  const profile = await getDoctorProfile(doctorUserId);
  if (!profile) return [];
  return db
    .select()
    .from(consultationRequests)
    .where(eq(consultationRequests.doctorId, profile.id))
    .orderBy(consultationRequests.createdAt);
}

/** Update the status of a consultation request */
export async function updateConsultationRequestStatus(
  requestId: number,
  status: "pending" | "contacted" | "declined"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(consultationRequests)
    .set({ status })
    .where(eq(consultationRequests.id, requestId));
}

/** Get a doctor profile by its primary key (profile.id, not userId) */
export async function getDoctorProfileById(profileId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, profileId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Get a consultation request by ID */
export async function getConsultationRequestById(requestId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(consultationRequests).where(eq(consultationRequests.id, requestId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Get comprehensive metrics for a doctor's dashboard */
export async function getDoctorMetrics(doctorId: number, periodDays: number) {
  const db = await getDb();
  if (!db) return null;

  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

  // Total patients linked to doctor
  const allPatients = await db
    .select()
    .from(doctorPatients)
    .where(eq(doctorPatients.doctorId, doctorId));
  const totalPatients = allPatients.length;
  const activePatients = allPatients.filter((p) => p.accepted === true).length;

  // Patients who came via app (consultation requests that were contacted)
  const requestsAll = await db
    .select()
    .from(consultationRequests)
    .where(eq(consultationRequests.doctorId, doctorId));
  const requestsTotal = requestsAll.length;
  const requestsContacted = requestsAll.filter((r) => r.status === "contacted").length;
  const requestsDeclined = requestsAll.filter((r) => r.status === "declined").length;
  const requestsPending = requestsAll.filter((r) => r.status === "pending").length;

  // Appointments in period
  const apptAll = await db
    .select()
    .from(appointments)
    .where(eq(appointments.doctorId, doctorId));
  const apptInPeriod = apptAll.filter((a) => a.createdAt && new Date(a.createdAt) >= since);
  const apptCompleted = apptInPeriod.filter((a) => a.status === "completed").length;
  const apptCancelled = apptInPeriod.filter((a) => a.status === "cancelled").length;
  const apptConfirmed = apptInPeriod.filter((a) => a.status === "confirmed").length;
  const apptScheduled = apptInPeriod.filter((a) => a.status === "scheduled").length;
  const apptTotal = apptInPeriod.length;
  const confirmationRate = apptTotal > 0 ? Math.round(((apptConfirmed + apptCompleted) / apptTotal) * 100) : 0;
  const cancellationRate = apptTotal > 0 ? Math.round((apptCancelled / apptTotal) * 100) : 0;

  // Conversion rate: requests that became appointments
  const conversionRate = requestsTotal > 0 ? Math.round((requestsContacted / requestsTotal) * 100) : 0;

  // Reviews
  const reviews = await db
    .select()
    .from(doctorReviews)
    .where(eq(doctorReviews.doctorId, doctorId));
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const ratingDist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  // Adherence: average dose adherence across all active patients
  const patientIds = allPatients.filter((p) => p.accepted === true).map((p) => p.patientId);
  let adherenceSum = 0;
  let adherenceCount = 0;
  for (const patientId of patientIds) {
    const doses = await db
      .select()
      .from(doseRecords)
      .where(eq(doseRecords.patientId, patientId));
    const dosesInPeriod = doses.filter((d) => d.date && new Date(d.date) >= since);
    if (dosesInPeriod.length > 0) {
      const taken = dosesInPeriod.filter((d) => d.status === "taken").length;
      adherenceSum += Math.round((taken / dosesInPeriod.length) * 100);
      adherenceCount++;
    }
  }
  const avgAdherence = adherenceCount > 0 ? Math.round(adherenceSum / adherenceCount) : 0;

  return {
    period: periodDays,
    patients: {
      total: totalPatients,
      active: activePatients,
      viaApp: requestsContacted,
      direct: Math.max(0, activePatients - requestsContacted),
    },
    requests: {
      total: requestsTotal,
      pending: requestsPending,
      contacted: requestsContacted,
      declined: requestsDeclined,
      conversionRate,
    },
    appointments: {
      total: apptTotal,
      completed: apptCompleted,
      confirmed: apptConfirmed,
      scheduled: apptScheduled,
      cancelled: apptCancelled,
      confirmationRate,
      cancellationRate,
    },
    reviews: {
      count: reviewCount,
      average: avgRating,
      distribution: ratingDist,
    },
    adherence: {
      average: avgAdherence,
      patientCount: adherenceCount,
    },
  };
}

// ─── Doctor Notifications ─────────────────────────────────────────────────────

export async function createDoctorNotification(data: InsertDoctorNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(doctorNotifications).values(data);
}

export async function getDoctorNotifications(doctorId: number): Promise<DoctorNotification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(doctorNotifications)
    .where(eq(doctorNotifications.doctorId, doctorId))
    .orderBy(desc(doctorNotifications.createdAt))
    .limit(50);
}

export async function countUnreadDoctorNotifications(doctorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(doctorNotifications)
    .where(and(eq(doctorNotifications.doctorId, doctorId), eq(doctorNotifications.isRead, false)));
  return rows.length;
}

export async function markDoctorNotificationRead(id: number, doctorId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(doctorNotifications)
    .set({ isRead: true })
    .where(and(eq(doctorNotifications.id, id), eq(doctorNotifications.doctorId, doctorId)));
}

export async function markAllDoctorNotificationsRead(doctorId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(doctorNotifications)
    .set({ isRead: true })
    .where(and(eq(doctorNotifications.doctorId, doctorId), eq(doctorNotifications.isRead, false)));
}

// ─── MGM: Referral & Commissions ─────────────────────────────────────────────

/** Generate a unique 8-char referral code for a doctor */
export async function generateReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Set referral code for a doctor profile */
export async function setDoctorReferralCode(profileId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorProfiles).set({ referralCode: code }).where(eq(doctorProfiles.id, profileId));
}

/** Get doctor profile by referral code */
export async function getDoctorProfileByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(doctorProfiles).where(eq(doctorProfiles.referralCode, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Set the indicatedById on a doctor profile (who referred this doctor) */
export async function setDoctorIndicatedBy(profileId: number, referrerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctorProfiles).set({ indicatedById: referrerId }).where(eq(doctorProfiles.id, profileId));
}

/** Get all commission rules */
export async function getCommissionRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commissionRules).where(eq(commissionRules.active, true));
}

/** Update a commission rule amount */
export async function updateCommissionRule(id: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commissionRules).set({ amount: String(amount) }).where(eq(commissionRules.id, id));
}

/** Get the referral chain for a doctor (N1, N2, N3) */
export async function getDoctorReferralChain(profileId: number): Promise<{ level: number; referrerId: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const chain: { level: number; referrerId: number }[] = [];

  let currentProfileId = profileId;
  for (let level = 1; level <= 3; level++) {
    const profile = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, currentProfileId)).limit(1);
    if (!profile[0] || !profile[0].indicatedById) break;
    chain.push({ level, referrerId: profile[0].indicatedById });
    currentProfileId = profile[0].indicatedById;
  }
  return chain;
}

/** Calculate year of a referred doctor (1 = first year, 2 = second, 3+ = third+) */
function calcYearOfReferred(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (diffYears < 1) return 1;
  if (diffYears < 2) return 2;
  return 3;
}

/** Run monthly commission calculation for a given month (YYYY-MM) */
export async function calculateMonthlyCommissions(referenceMonth: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Parse month range
  const [year, month] = referenceMonth.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all doctor profiles with indicatedById set
  const allProfiles = await db.select().from(doctorProfiles).where(sql`${doctorProfiles.indicatedById} IS NOT NULL`);

  const rules = await getCommissionRules();

  let totalInserted = 0;

  for (const profile of allProfiles) {
    if (!profile.indicatedById) continue;

    // Count completed appointments for this doctor in the month
    const appts = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, profile.userId),
          eq(appointments.status, "completed"),
          gte(appointments.date, startDate.toISOString().split("T")[0]),
          lte(appointments.date, endDate.toISOString().split("T")[0])
        )
      );

    if (appts.length === 0) continue;

    const yearOfReferred = calcYearOfReferred(profile.createdAt ?? new Date());

    // Walk up the referral chain (up to 3 levels)
    const chain = await getDoctorReferralChain(profile.id);

    for (const { level, referrerId } of chain) {
      // Find applicable rule
      const rule = rules.find(
        (r) => r.level === level && r.yearOfReferred === Math.min(yearOfReferred, 3)
      );
      if (!rule) continue;

      const amount = Number(rule.amount);
      if (amount <= 0) continue;

      // Check if already calculated for this month
      const existing = await db
        .select()
        .from(commissionsLedger)
        .where(
          and(
            eq(commissionsLedger.referrerId, referrerId),
            eq(commissionsLedger.referredId, profile.id),
            eq(commissionsLedger.referenceMonth, referenceMonth),
            eq(commissionsLedger.level, level)
          )
        )
        .limit(1);

      if (existing.length > 0) continue; // Already calculated

      await db.insert(commissionsLedger).values({
        referrerId,
        referredId: profile.id,
        level,
        referenceMonth,
        appointmentsCount: appts.length,
        yearOfReferred,
        amount: String(amount),
        status: "pending",
      });
      totalInserted++;
    }
  }

  return { totalInserted };
}

/** Get commissions summary for a doctor (as referrer) */
export async function getDoctorCommissionsSummary(referrerId: number) {
  const db = await getDb();
  if (!db) return { pending: 0, paid: 0, total: 0, entries: [] };

  const entries = await db
    .select()
    .from(commissionsLedger)
    .where(eq(commissionsLedger.referrerId, referrerId))
    .orderBy(desc(commissionsLedger.createdAt));

  const pending = entries.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
  const paid = entries.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);

  return { pending, paid, total: pending + paid, entries };
}

/** Get full MGM network for admin dashboard */
export async function getMGMNetwork() {
  const db = await getDb();
  if (!db) return [];
  // Single query: JOIN profiles + users, subquery para contagem de indicados
  const rows = await db
    .select({
      profileId: doctorProfiles.id,
      userId: doctorProfiles.userId,
      name: users.name,
      referralCode: doctorProfiles.referralCode,
      indicatedById: doctorProfiles.indicatedById,
      createdAt: doctorProfiles.createdAt,
    })
    .from(doctorProfiles)
    .innerJoin(users, eq(users.id, doctorProfiles.userId));

  // Compute referredCount in-memory (já temos todos os perfis)
  const countMap = new Map<number, number>();
  for (const r of rows) {
    if (r.indicatedById !== null) {
      countMap.set(r.indicatedById, (countMap.get(r.indicatedById) ?? 0) + 1);
    }
  }
  return rows.map((r) => ({
    ...r,
    referralCode: r.referralCode ?? null,
    indicatedById: r.indicatedById ?? null,
    referredCount: countMap.get(r.profileId) ?? 0,
  }));
}

/** Get all commissions for admin (with referrer/referred names) */
export async function getAllCommissions(status?: "pending" | "paid") {
  const db = await getDb();
  if (!db) return [];

  const referrerUser = alias(users, "referrer_user");
  const referredUser = alias(users, "referred_user");
  const referrerProfile = alias(doctorProfiles, "referrer_profile");
  const referredProfile = alias(doctorProfiles, "referred_profile");

  const conditions = status ? [eq(commissionsLedger.status, status)] : [];

  const rows = await db
    .select({
      id: commissionsLedger.id,
      referrerId: commissionsLedger.referrerId,
      referredId: commissionsLedger.referredId,
      level: commissionsLedger.level,
      referenceMonth: commissionsLedger.referenceMonth,
      appointmentsCount: commissionsLedger.appointmentsCount,
      yearOfReferred: commissionsLedger.yearOfReferred,
      amount: commissionsLedger.amount,
      status: commissionsLedger.status,
      paidAt: commissionsLedger.paidAt,
      createdAt: commissionsLedger.createdAt,
      referrerName: referrerUser.name,
      referredName: referredUser.name,
      bankName: referrerProfile.bankName,
      bankAgency: referrerProfile.bankAgency,
      bankAccount: referrerProfile.bankAccount,
      bankAccountType: referrerProfile.bankAccountType,
      pixKey: referrerProfile.pixKey,
    })
    .from(commissionsLedger)
    .leftJoin(referrerProfile, eq(referrerProfile.id, commissionsLedger.referrerId))
    .leftJoin(referrerUser, eq(referrerUser.id, referrerProfile.userId))
    .leftJoin(referredProfile, eq(referredProfile.id, commissionsLedger.referredId))
    .leftJoin(referredUser, eq(referredUser.id, referredProfile.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(commissionsLedger.createdAt));

  return rows.map((r) => ({
    ...r,
    referrerName: r.referrerName ?? "—",
    referredName: r.referredName ?? "—",
    amount: Number(r.amount),
  }));
}

/** Get a single commission ledger entry by ID */
export async function getCommissionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(commissionsLedger).where(eq(commissionsLedger.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Mark a commission as paid and return the entry */
export async function markCommissionPaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(commissionsLedger)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(commissionsLedger.id, id));
  return getCommissionById(id);
}

/** Mark doctor onboarding as completed */
export async function markOnboardingCompleted(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(doctorProfiles).set({ onboardingCompleted: true }).where(eq(doctorProfiles.userId, userId));
}

/** Get admin MGM KPIs */
export async function getMGMKPIs() {
  const db = await getDb();
  if (!db) return { totalDoctors: 0, referredDoctors: 0, pendingAmount: 0, paidAmount: 0, conversionRate: 0 };

  const allProfiles = await db.select().from(doctorProfiles);
  const referredProfiles = allProfiles.filter((p) => p.indicatedById !== null);

  const allCommissions = await db.select().from(commissionsLedger);
  const pendingAmount = allCommissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount), 0);
  const paidAmount = allCommissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  return {
    totalDoctors: allProfiles.length,
    referredDoctors: referredProfiles.length,
    pendingAmount,
    paidAmount,
    conversionRate: allProfiles.length > 0 ? (referredProfiles.length / allProfiles.length) * 100 : 0,
  };
}

/** Get all users for admin management */
export async function getAllUsersAdmin() {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    appRole: users.appRole,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
  return allUsers;
}

/** Get all commissions with referrer/referred info for CSV export */
export async function getAllCommissionsForExport(referenceMonth?: string) {
  const db = await getDb();
  if (!db) return [];

  const referrerUser = alias(users, "referrer_user");
  const referredUser = alias(users, "referred_user");
  const referrerProfile = alias(doctorProfiles, "referrer_profile");
  const referredProfile = alias(doctorProfiles, "referred_profile");

  const conditions = referenceMonth ? [eq(commissionsLedger.referenceMonth, referenceMonth)] : [];

  const rows = await db
    .select({
      id: commissionsLedger.id,
      referrerName: referrerUser.name,
      referrerEmail: referrerUser.email,
      referredName: referredUser.name,
      referredEmail: referredUser.email,
      level: commissionsLedger.level,
      referenceMonth: commissionsLedger.referenceMonth,
      yearOfReferred: commissionsLedger.yearOfReferred,
      appointmentsCount: commissionsLedger.appointmentsCount,
      amount: commissionsLedger.amount,
      status: commissionsLedger.status,
      paidAt: commissionsLedger.paidAt,
      createdAt: commissionsLedger.createdAt,
    })
    .from(commissionsLedger)
    .leftJoin(referrerProfile, eq(referrerProfile.id, commissionsLedger.referrerId))
    .leftJoin(referrerUser, eq(referrerUser.id, referrerProfile.userId))
    .leftJoin(referredProfile, eq(referredProfile.id, commissionsLedger.referredId))
    .leftJoin(referredUser, eq(referredUser.id, referredProfile.userId))
    .where(conditions.length > 0 ? and(...(conditions as any)) : undefined)
    .orderBy(desc(commissionsLedger.createdAt));

  return rows.map((r) => ({
    ...r,
    referrerName: r.referrerName ?? "—",
    referrerEmail: r.referrerEmail ?? "—",
    referredName: r.referredName ?? "—",
    referredEmail: r.referredEmail ?? "—",
    amount: Number(r.amount),
    paidAt: r.paidAt ? (r.paidAt as Date).toISOString() : null,
    createdAt: (r.createdAt as Date).toISOString(),
  }));
}


/** Calculate the next payment date (10th of next month, adjusted for weekends) */
export function getNextPaymentDate(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  // Payment is on the 10th of the month AFTER the reference month
  let payYear = year;
  let payMonth = month + 1;
  if (payMonth > 12) { payMonth = 1; payYear += 1; }
  const date = new Date(payYear, payMonth - 1, 10); // month is 0-indexed
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (dow === 6) date.setDate(12); // Saturday → Monday
  if (dow === 0) date.setDate(11); // Sunday → Monday
  return date.toISOString().split("T")[0];
}

/** Get ranking of top referrers */
export async function getMGMRanking() {
  const db = await getDb();
  if (!db) return [];
  const allProfiles = await db.select().from(doctorProfiles);
  const allCommissions = await db.select().from(commissionsLedger);

  const rankMap = new Map<number, { profileId: number; totalReferrals: number; activeReferrals: number; totalEarned: number; pendingAmount: number }>();

  for (const p of allProfiles) {
    rankMap.set(p.id, { profileId: p.id, totalReferrals: 0, activeReferrals: 0, totalEarned: 0, pendingAmount: 0 });
  }

  // Count direct referrals
  for (const p of allProfiles) {
    if (p.indicatedById !== null) {
      const entry = rankMap.get(p.indicatedById);
      if (entry) {
        entry.totalReferrals += 1;
        entry.activeReferrals += 1;
      }
    }
  }

  // Sum commissions
  for (const c of allCommissions) {
    const entry = rankMap.get(c.referrerId);
    if (entry) {
      if (c.status === "paid") entry.totalEarned += Number(c.amount);
      if (c.status === "pending") entry.pendingAmount += Number(c.amount);
    }
  }

  // Enrich with user names — single query joining all needed profiles
  const topEntries = Array.from(rankMap.values())
    .filter((e) => e.totalReferrals > 0 || e.totalEarned > 0 || e.pendingAmount > 0)
    .sort((a, b) => b.totalReferrals - a.totalReferrals || b.totalEarned - a.totalEarned)
    .slice(0, 50);

  // Build a map of profileId → name using the already-fetched allProfiles + a single users fetch
  const profileIds = topEntries.map((e) => e.profileId);
  const profilesInTop = allProfiles.filter((p) => profileIds.includes(p.id));
  const userIds = profilesInTop.map((p) => p.userId);
  const userRows = userIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(sql`${users.id} IN ${userIds}`)
    : [];
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));

  const result = topEntries.map((entry) => {
    const profile = allProfiles.find((p) => p.id === entry.profileId);
    return {
      profileId: entry.profileId,
      name: profile ? (userMap.get(profile.userId) ?? "—") : "—",
      referralCode: profile?.referralCode ?? null,
      totalReferrals: entry.totalReferrals,
      activeReferrals: entry.activeReferrals,
      totalEarned: entry.totalEarned,
      pendingAmount: entry.pendingAmount,
    };
  });
  return result;
}

/** Get full network tree for admin view */
export async function getMGMNetworkTree() {
  const db = await getDb();
  if (!db) return [];

  // Fetch all profiles + users in 2 queries, enrich in-memory
  const allProfiles = await db.select().from(doctorProfiles);
  const allCommissions = await db.select().from(commissionsLedger);

  const allUserIds = [...new Set(allProfiles.map((p) => p.userId))];
  const allUsers = allUserIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(sql`${users.id} IN ${allUserIds}`)
    : [];
  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

  return allProfiles.map((p) => {
    const directReferrals = allProfiles.filter((x) => x.indicatedById === p.id);
    const myCommissions = allCommissions.filter((c) => c.referrerId === p.id);
    const totalEarned = myCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
    const pendingAmount = myCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
    const indicatorProfile = p.indicatedById ? allProfiles.find((x) => x.id === p.indicatedById) : null;
    return {
      profileId: p.id,
      name: userMap.get(p.userId) ?? "—",
      referralCode: p.referralCode ?? null,
      indicatedById: p.indicatedById ?? null,
      indicatorName: indicatorProfile ? (userMap.get(indicatorProfile.userId) ?? null) : null,
      directReferralCount: directReferrals.length,
      totalEarned,
      pendingAmount,
      joinedAt: (p.createdAt as Date).toISOString().split("T")[0],
    };
  });
}

/** Get a doctor's own MGM data: their referrals, commissions (paid + pending) with payment dates */
export async function getDoctorMGMData(doctorUserId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get doctor profile
  const profileRows = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, doctorUserId)).limit(1);
  if (profileRows.length === 0) return null;
  const profile = profileRows[0];

  const allProfiles = await db.select().from(doctorProfiles);

  // Direct referrals (N1)
  const directReferrals = await Promise.all(
    allProfiles
      .filter((p) => p.indicatedById === profile.id)
      .map(async (p) => {
        const user = await getUserById(p.userId);
        // Get their own referrals (N2)
        const n2Referrals = allProfiles.filter((x) => x.indicatedById === p.id);
        return {
          profileId: p.id,
          name: user?.name ?? "—",
          referralCode: p.referralCode ?? null,
          joinedAt: (p.createdAt as Date).toISOString().split("T")[0],
          n2Count: n2Referrals.length,
        };
      })
  );

  // All commissions for this doctor
  const myCommissions = await db
    .select()
    .from(commissionsLedger)
    .where(eq(commissionsLedger.referrerId, profile.id))
    .orderBy(desc(commissionsLedger.referenceMonth));

  const commissionsWithDates = await Promise.all(
    myCommissions.map(async (c) => {
      const referredProfile = allProfiles.find((p) => p.id === c.referredId);
      const referredUser = referredProfile ? await getUserById(referredProfile.userId) : null;
      const paymentDate = c.status === "paid" && c.paidAt
        ? (c.paidAt as Date).toISOString().split("T")[0]
        : getNextPaymentDate(c.referenceMonth);
      return {
        id: c.id,
        referredName: referredUser?.name ?? "—",
        level: c.level,
        referenceMonth: c.referenceMonth,
        yearOfReferred: c.yearOfReferred,
        amount: Number(c.amount),
        status: c.status,
        paymentDate,
        paidAt: c.paidAt ? (c.paidAt as Date).toISOString().split("T")[0] : null,
      };
    })
  );

  const totalPaid = commissionsWithDates.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const totalPending = commissionsWithDates.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  // Next payment date based on current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nextPaymentDate = getNextPaymentDate(currentMonth);

  return {
    profile: {
      id: profile.id,
      referralCode: profile.referralCode ?? null,
      joinedAt: (profile.createdAt as Date).toISOString().split("T")[0],
    },
    directReferrals,
    commissions: commissionsWithDates,
    summary: {
      totalReferrals: directReferrals.length,
      totalPaid,
      totalPending,
      nextPaymentDate,
    },
  };
}

/** Get overall platform KPIs for admin dashboard */
export async function getPlatformKPIs() {
  const db = await getDb();
  if (!db) return { totalDoctors: 0, totalPatients: 0, totalCaregivers: 0, totalAppointments: 0, completedAppointments: 0, appointmentsThisMonth: 0 };
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const [doctorCount, patientCount, caregiverCount, totalAppts, completedAppts, monthAppts] = await Promise.all([
    db.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.appRole, "doctor")),
    db.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.appRole, "patient")),
    db.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.appRole, "caregiver")),
    db.select({ count: sql`COUNT(*)` }).from(appointments),
    db.select({ count: sql`COUNT(*)` }).from(appointments).where(eq(appointments.status, "completed")),
    db.select({ count: sql`COUNT(*)` }).from(appointments).where(gte(appointments.date, firstOfMonth)),
  ]);
  return {
    totalDoctors: Number((doctorCount[0] as any).count),
    totalPatients: Number((patientCount[0] as any).count),
    totalCaregivers: Number((caregiverCount[0] as any).count),
    totalAppointments: Number((totalAppts[0] as any).count),
    completedAppointments: Number((completedAppts[0] as any).count),
    appointmentsThisMonth: Number((monthAppts[0] as any).count),
  };
}

const CONSULTA_VALOR_MEDIO = 300; // R$ por consulta realizada

/** Get financial KPIs for admin dashboard: gross revenue, pending commissions, net */
export async function getFinancialKPIs() {
  const db = await getDb();
  if (!db) return { grossRevenue: 0, grossRevenueThisMonth: 0, pendingCommissions: 0, netRevenue: 0, netRevenueThisMonth: 0, paidCommissions: 0 };

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [completedTotal, completedMonth, pendingComm, paidComm] = await Promise.all([
    db.select({ count: sql`COUNT(*)` }).from(appointments).where(eq(appointments.status, "completed")),
    db.select({ count: sql`COUNT(*)` }).from(appointments).where(
      and(eq(appointments.status, "completed"), gte(appointments.date, firstOfMonth))
    ),
    db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(commissionsLedger).where(eq(commissionsLedger.status, "pending")),
    db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(commissionsLedger).where(eq(commissionsLedger.status, "paid")),
  ]);

  const totalCompleted = Number((completedTotal[0] as any).count);
  const monthCompleted = Number((completedMonth[0] as any).count);
  const pendingAmount = Number((pendingComm[0] as any).total);
  const paidAmount = Number((paidComm[0] as any).total);

  const grossRevenue = totalCompleted * CONSULTA_VALOR_MEDIO;
  const grossRevenueThisMonth = monthCompleted * CONSULTA_VALOR_MEDIO;
  const netRevenue = grossRevenue - pendingAmount - paidAmount;
  const netRevenueThisMonth = grossRevenueThisMonth - pendingAmount;

  return {
    grossRevenue,
    grossRevenueThisMonth,
    pendingCommissions: pendingAmount,
    paidCommissions: paidAmount,
    netRevenue,
    netRevenueThisMonth,
    consultaValorMedio: CONSULTA_VALOR_MEDIO,
  };
}


// ─── Doctor Insurance Fees ────────────────────────────────────────────────────

export async function getDoctorInsuranceFees(doctorProfileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(doctorInsuranceFees)
    .where(eq(doctorInsuranceFees.doctorProfileId, doctorProfileId))
    .orderBy(doctorInsuranceFees.isDefault, doctorInsuranceFees.insuranceName);
}

export async function upsertDoctorInsuranceFee(data: InsertDoctorInsuranceFee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If isDefault, unset other defaults for this doctor
  if (data.isDefault) {
    await db.update(doctorInsuranceFees)
      .set({ isDefault: false })
      .where(eq(doctorInsuranceFees.doctorProfileId, data.doctorProfileId));
  }
  await db.insert(doctorInsuranceFees).values(data);
}

export async function updateDoctorInsuranceFee(id: number, doctorProfileId: number, data: { insuranceName?: string; feeAmount?: string; isDefault?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.isDefault) {
    await db.update(doctorInsuranceFees)
      .set({ isDefault: false })
      .where(eq(doctorInsuranceFees.doctorProfileId, doctorProfileId));
  }
  await db.update(doctorInsuranceFees).set(data).where(
    and(eq(doctorInsuranceFees.id, id), eq(doctorInsuranceFees.doctorProfileId, doctorProfileId))
  );
}

export async function deleteDoctorInsuranceFee(id: number, doctorProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(doctorInsuranceFees).where(
    and(eq(doctorInsuranceFees.id, id), eq(doctorInsuranceFees.doctorProfileId, doctorProfileId))
  );
}

/** Get the fee for a specific insurance plan, falling back to default */
export async function getFeeForInsurance(doctorProfileId: number, insuranceName: string | null | undefined): Promise<number> {
  const db = await getDb();
  if (!db) return 300; // fallback
  const fees = await db.select().from(doctorInsuranceFees)
    .where(eq(doctorInsuranceFees.doctorProfileId, doctorProfileId));
  if (fees.length === 0) return 300;
  if (insuranceName) {
    const match = fees.find(f => f.insuranceName.toLowerCase() === insuranceName.toLowerCase());
    if (match) return Number(match.feeAmount);
  }
  const defaultFee = fees.find(f => f.isDefault);
  if (defaultFee) return Number(defaultFee.feeAmount);
  return Number(fees[0].feeAmount);
}

// ─── Appointment Revenues ─────────────────────────────────────────────────────

/** Record revenue when an appointment is completed */
export async function recordAppointmentRevenue(appointmentId: number, doctorProfileId: number, insuranceName: string | null | undefined, feeAmount: number) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Idempotent: skip if already recorded
  const existing = await db.select().from(appointmentRevenues)
    .where(eq(appointmentRevenues.appointmentId, appointmentId)).limit(1);
  if (existing.length > 0) return;
  await db.insert(appointmentRevenues).values({
    appointmentId,
    doctorProfileId,
    insuranceName: insuranceName ?? null,
    feeAmount: String(feeAmount),
    referenceMonth,
  });
}

/** Get revenue records for a doctor */
export async function getDoctorRevenues(doctorProfileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointmentRevenues)
    .where(eq(appointmentRevenues.doctorProfileId, doctorProfileId))
    .orderBy(desc(appointmentRevenues.createdAt));
}

/** Get revenue summary for a doctor (total, by month, by insurance) */
export async function getDoctorRevenueSummary(doctorProfileId: number) {
  const db = await getDb();
  if (!db) return { total: 0, thisMonth: 0, byInsurance: [], byMonth: [] };
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [totalResult, monthResult, byInsurance, byMonth] = await Promise.all([
    db.select({ total: sql`COALESCE(SUM(feeAmount), 0)` }).from(appointmentRevenues)
      .where(eq(appointmentRevenues.doctorProfileId, doctorProfileId)),
    db.select({ total: sql`COALESCE(SUM(feeAmount), 0)` }).from(appointmentRevenues)
      .where(and(eq(appointmentRevenues.doctorProfileId, doctorProfileId), eq(appointmentRevenues.referenceMonth, thisMonth))),
    db.select({
      insuranceName: appointmentRevenues.insuranceName,
      total: sql`COALESCE(SUM(feeAmount), 0)`,
      count: sql`COUNT(*)`,
    }).from(appointmentRevenues)
      .where(eq(appointmentRevenues.doctorProfileId, doctorProfileId))
      .groupBy(appointmentRevenues.insuranceName),
    db.select({
      referenceMonth: appointmentRevenues.referenceMonth,
      total: sql`COALESCE(SUM(feeAmount), 0)`,
      count: sql`COUNT(*)`,
    }).from(appointmentRevenues)
      .where(eq(appointmentRevenues.doctorProfileId, doctorProfileId))
      .groupBy(appointmentRevenues.referenceMonth)
      .orderBy(desc(appointmentRevenues.referenceMonth))
      .limit(12),
  ]);
  return {
    total: Number((totalResult[0] as any).total),
    thisMonth: Number((monthResult[0] as any).total),
    byInsurance: byInsurance.map(r => ({ insuranceName: r.insuranceName ?? "Não informado", total: Number((r as any).total), count: Number((r as any).count) })),
    byMonth: byMonth.map(r => ({ month: r.referenceMonth, total: Number((r as any).total), count: Number((r as any).count) })),
  };
}

/** Get real financial KPIs using appointment_revenues table */
export async function getFinancialKPIsReal() {
  const db = await getDb();
  if (!db) return { grossRevenue: 0, grossRevenueThisMonth: 0, pendingCommissions: 0, netRevenue: 0, netRevenueThisMonth: 0, paidCommissions: 0, hasRealData: false };
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [totalRevenue, monthRevenue, pendingComm, paidComm, revenueCount] = await Promise.all([
    db.select({ total: sql`COALESCE(SUM(feeAmount), 0)` }).from(appointmentRevenues),
    db.select({ total: sql`COALESCE(SUM(feeAmount), 0)` }).from(appointmentRevenues)
      .where(eq(appointmentRevenues.referenceMonth, thisMonth)),
    db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(commissionsLedger).where(eq(commissionsLedger.status, "pending")),
    db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(commissionsLedger).where(eq(commissionsLedger.status, "paid")),
    db.select({ count: sql`COUNT(*)` }).from(appointmentRevenues),
  ]);
  const grossRevenue = Number((totalRevenue[0] as any).total);
  const grossRevenueThisMonth = Number((monthRevenue[0] as any).total);
  const pendingAmount = Number((pendingComm[0] as any).total);
  const paidAmount = Number((paidComm[0] as any).total);
  const hasRealData = Number((revenueCount[0] as any).count) > 0;
  return {
    grossRevenue,
    grossRevenueThisMonth,
    pendingCommissions: pendingAmount,
    paidCommissions: paidAmount,
    netRevenue: grossRevenue - pendingAmount - paidAmount,
    netRevenueThisMonth: grossRevenueThisMonth - pendingAmount,
    hasRealData,
  };
}

// ─── Doctor Revenue Ranking ────────────────────────────────────────────────────
export async function getDoctorRevenueRanking(referenceMonth?: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    doctorProfileId: appointmentRevenues.doctorProfileId,
    totalRevenue: sql<string>`SUM(CAST(${appointmentRevenues.feeAmount} AS DECIMAL(10,2)))`,
    appointmentCount: sql<number>`COUNT(*)`,
  })
  .from(appointmentRevenues)
  .where(referenceMonth ? eq(appointmentRevenues.referenceMonth, referenceMonth) : sql`1=1`)
  .groupBy(appointmentRevenues.doctorProfileId)
  .orderBy(sql`SUM(CAST(${appointmentRevenues.feeAmount} AS DECIMAL(10,2))) DESC`)
  .limit(50);

  // Enrich with doctor name via JOIN instead of N+1
  const enriched = await db
    .select({
      doctorProfileId: appointmentRevenues.doctorProfileId,
      totalRevenue: sql<string>`SUM(CAST(${appointmentRevenues.feeAmount} AS DECIMAL(10,2)))`,
      appointmentCount: sql<number>`COUNT(*)`,
      doctorName: users.name,
    })
    .from(appointmentRevenues)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointmentRevenues.doctorProfileId))
    .innerJoin(users, eq(users.id, doctorProfiles.userId))
    .where(referenceMonth ? eq(appointmentRevenues.referenceMonth, referenceMonth) : sql`1=1`)
    .groupBy(appointmentRevenues.doctorProfileId, users.name)
    .orderBy(sql`SUM(CAST(${appointmentRevenues.feeAmount} AS DECIMAL(10,2))) DESC`)
    .limit(50);

  return enriched.map((row) => ({
    doctorProfileId: row.doctorProfileId,
    doctorName: row.doctorName ?? "—",
    totalRevenue: parseFloat(row.totalRevenue ?? "0"),
    appointmentCount: Number(row.appointmentCount),
  }));
}

// ─── Doctor Revenue Goal ───────────────────────────────────────────────────────
export async function getDoctorRevenueGoal(doctorProfileId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ goal: doctorInsuranceFees.feeAmount })
    .from(doctorInsuranceFees)
    .where(and(eq(doctorInsuranceFees.doctorProfileId, doctorProfileId), eq(doctorInsuranceFees.insuranceName, "__monthly_goal__")))
    .limit(1);
  return result.length > 0 ? parseFloat(result[0].goal) : null;
}

export async function setDoctorRevenueGoal(doctorProfileId: number, goal: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: doctorInsuranceFees.id })
    .from(doctorInsuranceFees)
    .where(and(eq(doctorInsuranceFees.doctorProfileId, doctorProfileId), eq(doctorInsuranceFees.insuranceName, "__monthly_goal__")))
    .limit(1);
  if (existing.length > 0) {
    await db.update(doctorInsuranceFees).set({ feeAmount: String(goal) }).where(eq(doctorInsuranceFees.id, existing[0].id));
  } else {
    await db.insert(doctorInsuranceFees).values({ doctorProfileId, insuranceName: "__monthly_goal__", feeAmount: String(goal), isDefault: false });
  }
}

// ─── Platform Fees ─────────────────────────────────────────────────────────────

/**
 * Calculate the platform fee for a doctor in a given month.
 * Rule: after 6 months of use, charge 2.5% if revenue >= R$12,000, else R$100 minimum.
 * Returns null if doctor is still in the 6-month grace period.
 */
export function calculatePlatformFee(monthlyRevenue: number, doctorCreatedAt: Date, referenceMonth: string): { feeAmount: number; feeType: "percentage" | "minimum" } | null {
  // Calculate months since doctor joined
  const [refYear, refMonth] = referenceMonth.split("-").map(Number);
  const refDate = new Date(refYear, refMonth - 1, 1);
  const joinDate = new Date(doctorCreatedAt.getFullYear(), doctorCreatedAt.getMonth(), 1);
  const monthsDiff = (refDate.getFullYear() - joinDate.getFullYear()) * 12 + (refDate.getMonth() - joinDate.getMonth());

  // Grace period: first 6 months are free
  if (monthsDiff < 6) return null;

  if (monthlyRevenue >= 12000) {
    return { feeAmount: Math.round(monthlyRevenue * 0.025 * 100) / 100, feeType: "percentage" };
  } else {
    return { feeAmount: 100.00, feeType: "minimum" };
  }
}

/**
 * Calculate and upsert platform fees for all eligible doctors in a given month.
 */
export async function calculateMonthlyPlatformFees(referenceMonth: string): Promise<{ processed: number; total: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, total: 0 };

  // Get all doctors with their join date and monthly revenue
  const doctors = await db
    .select({
      profileId: doctorProfiles.id,
      userId: doctorProfiles.userId,
      createdAt: doctorProfiles.createdAt,
    })
    .from(doctorProfiles);

  let processed = 0;
  let totalFees = 0;

  for (const doctor of doctors) {
    // Get monthly revenue
    const revenueRows = await db
      .select({ total: appointmentRevenues.feeAmount })
      .from(appointmentRevenues)
      .where(and(
        eq(appointmentRevenues.doctorProfileId, doctor.profileId),
        eq(appointmentRevenues.referenceMonth, referenceMonth)
      ));

    const monthlyRevenue = revenueRows.reduce((sum, r) => sum + parseFloat(r.total), 0);

    const feeCalc = calculatePlatformFee(monthlyRevenue, doctor.createdAt, referenceMonth);
    if (!feeCalc) continue; // Still in grace period

    // Upsert: avoid duplicates
    const existing = await db
      .select({ id: platformFees.id })
      .from(platformFees)
      .where(and(
        eq(platformFees.doctorProfileId, doctor.profileId),
        eq(platformFees.referenceMonth, referenceMonth)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(platformFees).values({
        doctorProfileId: doctor.profileId,
        referenceMonth,
        monthlyRevenue: String(monthlyRevenue),
        feeAmount: String(feeCalc.feeAmount),
        feeType: feeCalc.feeType,
        status: "pending",
      } as InsertPlatformFee);
    }

    processed++;
    totalFees += feeCalc.feeAmount;
  }

  return { processed, total: totalFees };
}

/**
 * Get all platform fees, optionally filtered by status.
 */
export async function getAllPlatformFees(status?: "pending" | "paid") {
  const db = await getDb();
  if (!db) return [];

  const conditions = status ? [eq(platformFees.status, status)] : [];

  const rows = await db
    .select({
      id: platformFees.id,
      doctorProfileId: platformFees.doctorProfileId,
      referenceMonth: platformFees.referenceMonth,
      monthlyRevenue: platformFees.monthlyRevenue,
      feeAmount: platformFees.feeAmount,
      feeType: platformFees.feeType,
      status: platformFees.status,
      paidAt: platformFees.paidAt,
      createdAt: platformFees.createdAt,
      doctorName: users.name,
      doctorEmail: users.email,
    })
    .from(platformFees)
    .innerJoin(doctorProfiles, eq(platformFees.doctorProfileId, doctorProfiles.id))
    .innerJoin(users, eq(doctorProfiles.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(platformFees.referenceMonth);

  return rows;
}

/**
 * Get platform fee summary for a specific doctor.
 */
export async function getDoctorPlatformFees(doctorProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(platformFees)
    .where(eq(platformFees.doctorProfileId, doctorProfileId))
    .orderBy(platformFees.referenceMonth);
}

/**
 * Mark a platform fee as paid.
 */
export async function markPlatformFeePaid(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformFees)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(platformFees.id, id));
}

/**
 * Get platform fee KPIs for admin dashboard.
 */
export async function getPlatformFeeKPIs() {
  const db = await getDb();
  if (!db) return { pendingCount: 0, pendingTotal: 0, paidTotal: 0 };

  const rows = await db
    .select({
      status: platformFees.status,
      feeAmount: platformFees.feeAmount,
    })
    .from(platformFees);

  const pendingRows = rows.filter(r => r.status === "pending");
  const paidRows = rows.filter(r => r.status === "paid");

  return {
    pendingCount: pendingRows.length,
    pendingTotal: pendingRows.reduce((s, r) => s + parseFloat(r.feeAmount), 0),
    paidTotal: paidRows.reduce((s, r) => s + parseFloat(r.feeAmount), 0),
  };
}

/**
 * Get platform fee for a specific doctor and month.
 */
export async function getDoctorPlatformFeeForMonth(doctorProfileId: number, referenceMonth: string): Promise<PlatformFee | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(platformFees)
    .where(and(
      eq(platformFees.doctorProfileId, doctorProfileId),
      eq(platformFees.referenceMonth, referenceMonth)
    ))
    .limit(1);

  return rows[0] ?? null;
}

