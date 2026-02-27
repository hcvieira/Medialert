import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Role in the app: "caregiver" (familiar), "patient" (paciente) or "doctor" (médico) */
  appRole: mysqlEnum("appRole", ["caregiver", "patient", "doctor"]).default("caregiver").notNull(),
  /** Hashed password for email/password auth */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Password reset token */
  resetToken: varchar("resetToken", { length: 128 }),
  /** Password reset token expiry */
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  /** Push token for Expo notifications */
  pushToken: varchar("pushToken", { length: 512 }),
  /** S3 URL for user's own profile photo */
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Caregiver ↔ Patient links ────────────────────────────────────────────────

export const caregiverPatients = mysqlTable("caregiver_patients", {
  id: int("id").autoincrement().primaryKey(),
  caregiverId: int("caregiverId").notNull(),
  patientId: int("patientId").notNull(),
  /** Invite code used to link caregiver and patient */
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
  /** Whether the patient has accepted the invite */
  accepted: boolean("accepted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaregiverPatient = typeof caregiverPatients.$inferSelect;
export type InsertCaregiverPatient = typeof caregiverPatients.$inferInsert;

// ─── Medications ──────────────────────────────────────────────────────────────

export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  /** The patient this medication belongs to */
  patientId: int("patientId").notNull(),
  /** The caregiver who created this medication */
  caregiverId: int("caregiverId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 128 }).notNull(),
  color: varchar("color", { length: 16 }).notNull().default("#3B82F6"),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

// ─── Medication Times ─────────────────────────────────────────────────────────

export const medicationTimes = mysqlTable("medication_times", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(),
  time: varchar("time", { length: 5 }).notNull(), // "HH:MM"
});

export type MedicationTime = typeof medicationTimes.$inferSelect;
export type InsertMedicationTime = typeof medicationTimes.$inferInsert;

// ─── Dose Records ─────────────────────────────────────────────────────────────

export const doseRecords = mysqlTable("dose_records", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(),
  patientId: int("patientId").notNull(),
  medicationName: varchar("medicationName", { length: 255 }).notNull(),
  scheduledTime: varchar("scheduledTime", { length: 5 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // "YYYY-MM-DD"
  status: mysqlEnum("status", ["pending", "taken", "missed", "cancelled"]).default("pending").notNull(),
  takenAt: timestamp("takenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DoseRecord = typeof doseRecords.$inferSelect;
export type InsertDoseRecord = typeof doseRecords.$inferInsert;

// ─── Doctor Profiles ──────────────────────────────────────────────────────────

export const doctorProfiles = mysqlTable("doctor_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  crm: varchar("crm", { length: 32 }).notNull(),
  crmState: varchar("crmState", { length: 2 }).notNull().default("SP"),
  specialty: varchar("specialty", { length: 128 }).notNull(),
  insurances: text("insurances").notNull().default("[]"), // JSON array
  phone: varchar("phone", { length: 20 }),
  bio: text("bio"),
  /** Clinic/office address */
  address: varchar("address", { length: 512 }),
  /** S3 URL for doctor's profile photo or logo */
  photoUrl: text("photoUrl"),
  /** Unique referral code for MGM (Member Get Member) program */
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  /** ID of the doctor_profile who referred this doctor (N1 referrer) */
  indicatedById: int("indicatedById"),
  /** Whether the doctor has completed the onboarding flow */
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  /** Bank name */
  bankName: varchar("bankName", { length: 128 }),
  /** Bank agency number */
  bankAgency: varchar("bankAgency", { length: 20 }),
  /** Bank account number */
  bankAccount: varchar("bankAccount", { length: 32 }),
  /** Account type: corrente or poupanca */
  bankAccountType: mysqlEnum("bankAccountType", ["corrente", "poupanca"]),
  /** PIX key (CPF, e-mail, phone or random) */
  pixKey: varchar("pixKey", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DoctorProfile = typeof doctorProfiles.$inferSelect;
export type InsertDoctorProfile = typeof doctorProfiles.$inferInsert;

// ─── Doctor ↔ Patient links ───────────────────────────────────────────────────

export const doctorPatients = mysqlTable("doctor_patients", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: int("doctorId").notNull(),
  patientId: int("patientId").notNull().default(0),
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
  accepted: boolean("accepted").default(false).notNull(),
  // Patient info filled by doctor at registration
  patientName: varchar("patientName", { length: 255 }),
  patientEmail: varchar("patientEmail", { length: 320 }),
  patientPhone: varchar("patientPhone", { length: 20 }),
  patientBirthDate: varchar("patientBirthDate", { length: 10 }), // "YYYY-MM-DD"
  patientInsurancePlan: varchar("patientInsurancePlan", { length: 128 }),
  patientNotes: text("patientNotes"),
  /** S3 URL for patient's profile photo */
  patientPhotoUrl: text("patientPhotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DoctorPatient = typeof doctorPatients.$inferSelect;
export type InsertDoctorPatient = typeof doctorPatients.$inferInsert;

// ─── Clinical Notes ───────────────────────────────────────────────────────────

export const clinicalNotes = mysqlTable("clinical_notes", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: int("doctorId").notNull(),
  patientId: int("patientId").notNull(),
  appointmentId: int("appointmentId"),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type InsertClinicalNote = typeof clinicalNotes.$inferInsert;

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: int("doctorId").notNull(),
  patientId: int("patientId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // "YYYY-MM-DD"
  time: varchar("time", { length: 5 }).notNull(),  // "HH:MM"
  insurance: varchar("insurance", { length: 128 }),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "confirmed", "cancelled", "completed", "reschedule_requested"]).default("scheduled").notNull(),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Patient Audit Log ────────────────────────────────────────────────────────

export const patientAuditLog = mysqlTable("patient_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: int("doctorId").notNull(),
  linkId: int("linkId").notNull(),
  /** Field that was changed */
  field: varchar("field", { length: 64 }).notNull(),
  /** Previous value (JSON string) */
  oldValue: text("oldValue"),
  /** New value (JSON string) */
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatientAuditLog = typeof patientAuditLog.$inferSelect;
export type InsertPatientAuditLog = typeof patientAuditLog.$inferInsert;

// ─── Doctor Reviews ─────────────────────────────────────────────────────────────────────────────────

export const doctorReviews = mysqlTable("doctor_reviews", {
  id: int("id").autoincrement().primaryKey(),
  /** Doctor being reviewed */
  doctorId: int("doctorId").notNull(),
  /** Patient who left the review */
  patientId: int("patientId").notNull(),
  /** Appointment that triggered the review */
  appointmentId: int("appointmentId"),
  /** Rating from 1 to 5 */
  rating: int("rating").notNull(),
  /** Optional comment */
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DoctorReview = typeof doctorReviews.$inferSelect;
export type InsertDoctorReview = typeof doctorReviews.$inferInsert;

// ─── Consultation Requests ───────────────────────────────────────────────────
export const consultationRequests = mysqlTable("consultation_requests", {
  id: int("id").autoincrement().primaryKey(),
  /** Patient who sent the request */
  patientId: int("patientId").notNull(),
  /** Doctor who received the request */
  doctorId: int("doctorId").notNull(),
  /** Patient phone for contact */
  phone: varchar("phone", { length: 32 }).notNull(),
  /** Optional message from the patient */
  message: text("message"),
  /** Status: pending, contacted, declined */
  status: mysqlEnum("status", ["pending", "contacted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConsultationRequest = typeof consultationRequests.$inferSelect;
export type InsertConsultationRequest = typeof consultationRequests.$inferInsert;

// ─── Doctor Notifications ────────────────────────────────────────────
export const doctorNotifications = mysqlTable("doctor_notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** Doctor who receives the notification */
  doctorId: int("doctorId").notNull(),
  /** Type: consultation_request | new_review | commission_paid | welcome */
  type: mysqlEnum("type", ["consultation_request", "new_review", "commission_paid", "welcome"]).notNull(),
  /** Short title shown in the bell dropdown */
  title: varchar("title", { length: 128 }).notNull(),
  /** Body text with more detail */
  body: varchar("body", { length: 512 }).notNull(),
  /** ID of the related entity (requestId or reviewId) */
  referenceId: int("referenceId"),
  /** Whether the doctor has read/dismissed this notification */
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DoctorNotification = typeof doctorNotifications.$inferSelect;
export type InsertDoctorNotification = typeof doctorNotifications.$inferInsert;

// ─── Commission Rules ─────────────────────────────────────────────────────────
// Stores the commission values per network level and year of the referred doctor's life.
// year_of_referred = 1 means the first 12 months after the referred doctor starts paying (month 7+).
export const commissionRules = mysqlTable("commission_rules", {
  id: int("id").autoincrement().primaryKey(),
  /** Network level: 1 = direct referral (filho), 2 = neto, 3 = bisneto */
  level: int("level").notNull(),
  /** Year of the referred doctor's paying life (1 = year 1, 2 = year 2, etc.) */
  yearOfReferred: int("yearOfReferred").notNull().default(1),
  /** Commission amount in BRL */
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  /** Whether this rule is active */
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommissionRule = typeof commissionRules.$inferSelect;
export type InsertCommissionRule = typeof commissionRules.$inferInsert;

// ─── Commissions Ledger ───────────────────────────────────────────────────────
// Audit trail of every commission event generated by the monthly job.
export const commissionsLedger = mysqlTable("commissions_ledger", {
  id: int("id").autoincrement().primaryKey(),
  /** The doctor_profile who EARNS the commission (the referrer) */
  referrerId: int("referrerId").notNull(),
  /** The doctor_profile whose activity TRIGGERED the commission (the referred) */
  referredId: int("referredId").notNull(),
  /** Network level that generated this commission (1, 2 or 3) */
  level: int("level").notNull(),
  /** Reference month in YYYY-MM format (e.g. '2025-08') */
  referenceMonth: varchar("referenceMonth", { length: 7 }).notNull(),
  /** Number of completed appointments the referred doctor had that month */
  appointmentsCount: int("appointmentsCount").notNull().default(0),
  /** Year of the referred doctor's paying life when this commission was generated */
  yearOfReferred: int("yearOfReferred").notNull().default(1),
  /** Commission amount in BRL (copied from commission_rules at calculation time) */
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  /** Payment status */
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  /** When this commission was marked as paid */
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionLedger = typeof commissionsLedger.$inferSelect;
export type InsertCommissionLedger = typeof commissionsLedger.$inferInsert;

// ─── Doctor Insurance Fees ──────────────────────────────────────────────────────────────────────────────
// Stores the fee amount each doctor charges per insurance plan.
export const doctorInsuranceFees = mysqlTable("doctor_insurance_fees", {
  id: int("id").autoincrement().primaryKey(),
  /** References doctor_profiles.id */
  doctorProfileId: int("doctorProfileId").notNull(),
  /** Insurance plan name (e.g. "Unimed", "Bradesco Saúde", "Particular") */
  insuranceName: varchar("insuranceName", { length: 128 }).notNull(),
  /** Fee amount in BRL for this insurance plan */
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).notNull(),
  /** Whether this is the default fee when no specific plan matches */
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DoctorInsuranceFee = typeof doctorInsuranceFees.$inferSelect;
export type InsertDoctorInsuranceFee = typeof doctorInsuranceFees.$inferInsert;

// ─── Appointment Revenues ──────────────────────────────────────────────────────────────────────────────
// Records the revenue generated by each completed appointment.
export const appointmentRevenues = mysqlTable("appointment_revenues", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  doctorProfileId: int("doctorProfileId").notNull(),
  /** Insurance plan used in this appointment */
  insuranceName: varchar("insuranceName", { length: 128 }),
  /** Fee amount charged (snapshot at time of completion) */
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).notNull(),
  /** Reference month YYYY-MM */
  referenceMonth: varchar("referenceMonth", { length: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AppointmentRevenue = typeof appointmentRevenues.$inferSelect;
export type InsertAppointmentRevenue = typeof appointmentRevenues.$inferInsert;

// ─── Platform Fees ─────────────────────────────────────────────────────────────
// Monthly platform fee charged to doctors after 6 months of use.
// Rule: 2.5% of monthly revenue if >= R$12,000, otherwise R$100 minimum.
export const platformFees = mysqlTable("platform_fees", {
  id: int("id").autoincrement().primaryKey(),
  /** References doctor_profiles.id */
  doctorProfileId: int("doctorProfileId").notNull(),
  /** Reference month YYYY-MM */
  referenceMonth: varchar("referenceMonth", { length: 7 }).notNull(),
  /** Total revenue that month (basis for calculation) */
  monthlyRevenue: decimal("monthlyRevenue", { precision: 10, scale: 2 }).notNull(),
  /** Fee amount charged: 2.5% of revenue if >= 12000, else 100.00 */
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).notNull(),
  /** How fee was calculated */
  feeType: mysqlEnum("feeType", ["percentage", "minimum"]).notNull(),
  /** Payment status */
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  /** When this fee was marked as paid */
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlatformFee = typeof platformFees.$inferSelect;
export type InsertPlatformFee = typeof platformFees.$inferInsert;
