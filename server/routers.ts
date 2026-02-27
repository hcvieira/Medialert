import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail, sendCommissionPaidEmail, sendDoctorWelcomeEmail } from "./_core/email";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { Expo } from "expo-server-sdk";

const expo = new Expo();

async function sendPushNotification(
  pushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;
  try {
    await expo.sendPushNotificationsAsync([{ to: pushToken, title, body, data: data ?? {}, sound: "default" }]);
  } catch (e) {
    console.warn("[Push] Failed to send notification:", e);
  }
}

export const appRouter = router({
  system: systemRouter,

  doctor: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      return profile ?? null;
    }),

    /** Mark onboarding as completed */
    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markOnboardingCompleted(ctx.user.id);
      return { success: true };
    }),

    /** Update doctor's bank info for commission payments */
    updateBankInfo: protectedProcedure
      .input(z.object({
        bankName: z.string().optional(),
        bankAgency: z.string().optional(),
        bankAccount: z.string().optional(),
        bankAccountType: z.enum(["corrente", "poupanca"]).optional(),
        pixKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getDoctorProfile(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil não encontrado" });
        await db.updateDoctorBankInfo(profile.id, {
          bankName: input.bankName ?? null,
          bankAgency: input.bankAgency ?? null,
          bankAccount: input.bankAccount ?? null,
          bankAccountType: input.bankAccountType ?? null,
          pixKey: input.pixKey ?? null,
        });
        return { success: true };
      }),

    /** List all doctors registered in the app (for patient directory) */
    listAll: protectedProcedure.query(async () => {
      return db.getAllDoctors();
    }),

    setupProfile: protectedProcedure
      .input(z.object({
        crm: z.string().min(1, "CRM é obrigatório"),
        crmState: z.string().length(2).default("SP"),
        specialty: z.string().min(1, "Especialidade é obrigatória"),
        insurances: z.array(z.string()).default([]),
        phone: z.string().optional(),
        bio: z.string().optional(),
        address: z.string().optional(),
        indicatedByCode: z.string().optional(),
        bankName: z.string().optional(),
        bankAgency: z.string().optional(),
        bankAccount: z.string().optional(),
        bankAccountType: z.enum(["corrente", "poupanca"]).optional(),
        pixKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Update user role to doctor
        await db.updateUserAppRole(ctx.user.id, "doctor");
        // Resolve indicatedById from referral code if provided
        let indicatedById: number | null = null;
        if (input.indicatedByCode) {
          const referrer = await db.getDoctorProfileByReferralCode(input.indicatedByCode);
          if (referrer) indicatedById = referrer.id;
        }
        await db.upsertDoctorProfile({
          userId: ctx.user.id,
          crm: input.crm,
          crmState: input.crmState,
          specialty: input.specialty,
          insurances: JSON.stringify(input.insurances),
          phone: input.phone ?? null,
          bio: input.bio ?? null,
          address: input.address ?? null,
          indicatedById,
          bankName: input.bankName ?? null,
          bankAgency: input.bankAgency ?? null,
          bankAccount: input.bankAccount ?? null,
          bankAccountType: input.bankAccountType ?? null,
          pixKey: input.pixKey ?? null,
        });

        // Generate referral code for the new doctor
        const profile = await db.getDoctorProfile(ctx.user.id);
        let referralCode = "";
        if (profile && !profile.referralCode) {
          let code = await db.generateReferralCode();
          for (let i = 0; i < 5; i++) {
            const existing = await db.getDoctorProfileByReferralCode(code);
            if (!existing) break;
            code = await db.generateReferralCode();
          }
          await db.setDoctorReferralCode(profile.id, code);
          referralCode = code;
        } else if (profile?.referralCode) {
          referralCode = profile.referralCode;
        }

        // Send welcome notification (in-app)
        await db.createDoctorNotification({
          doctorId: ctx.user.id,
          type: "welcome",
          title: "Bem-vindo(a) ao MediAlert!",
          body: "Configure seus convênios, adicione pacientes e comece a usar o programa de indicações.",
          referenceId: null,
        });

        // Send welcome email
        const user = await db.getUserById(ctx.user.id);
        if (user?.email) {
          sendDoctorWelcomeEmail(user.email, user.name, referralCode)
            .catch((e) => console.warn("[Email] welcome email error:", e));
        }

        // Send welcome push notification
        if (user?.pushToken) {
          sendPushNotification(
            user.pushToken,
            "🎉 Bem-vindo(a) ao MediAlert!",
            "Seu perfil médico foi criado. Configure seus convênios e adicione pacientes para começar."
          );
        }

        // Return a simple serializable object to avoid SuperJSON issues
        // with Date fields (createdAt/updatedAt) in raw DB rows
        return { success: true, userId: ctx.user.id };
      }),

    generateInvite: protectedProcedure.mutation(async ({ ctx }) => {
      const inviteCode = await db.createDoctorInvite(ctx.user.id);
      return { inviteCode };
    }),

    /** Upload doctor's profile photo (base64 image) */
    uploadDoctorPhoto: protectedProcedure
      .input(z.object({ base64: z.string().nullable(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ ctx, input }) => {
        if (!input.base64) {
          await db.updateDoctorPhoto(ctx.user.id, null);
          return { url: null };
        }
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `doctor-photos/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateDoctorPhoto(ctx.user.id, url);
        return { url };
      }),

    /** Upload patient's profile photo (base64 image) */
    uploadPatientPhoto: protectedProcedure
      .input(z.object({ linkId: z.number(), base64: z.string().nullable(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ ctx, input }) => {
        if (!input.base64) {
          // Remove photo
          await db.updatePatientPhoto(input.linkId, null);
          return { url: null };
        }
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `patient-photos/${ctx.user.id}-${input.linkId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updatePatientPhoto(input.linkId, url);
        return { url };
      }),

    /** New v4.2: doctor adds patient directly with their info */
    addPatient: protectedProcedure
      .input(z.object({
        patientName: z.string().min(2, "Nome é obrigatório"),
        patientEmail: z.string().email("E-mail inválido"),
        patientPhone: z.string().optional(),
        patientBirthDate: z.string().optional(),
        patientInsurancePlan: z.string().optional(),
        patientNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const inviteCode = await db.addPatientByDoctor({
          doctorId: ctx.user.id,
          patientName: input.patientName,
          patientEmail: input.patientEmail,
          patientPhone: input.patientPhone,
          patientBirthDate: input.patientBirthDate,
          patientInsurancePlan: input.patientInsurancePlan,
          patientNotes: input.patientNotes,
        });
        // Send invite email
        const doctorUser = await db.getUserById(ctx.user.id);
        const doctorProfile = await db.getDoctorProfile(ctx.user.id);
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "MediAlert <onboarding@resend.dev>",
            to: input.patientEmail,
            subject: `Dr. ${doctorUser?.name ?? "Médico"} convidou você para o MediAlert`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                <h2 style="color:#0D5BBF;">Você foi convidado para o MediAlert</h2>
                <p>Dr. <strong>${doctorUser?.name ?? "Médico"}</strong>${doctorProfile?.specialty ? ` (${doctorProfile.specialty})` : ""} adicionou você como paciente no MediAlert.</p>
                <p>Use o código abaixo para vincular sua conta:</p>
                <div style="background:#EBF4FF;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
                  <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#0D5BBF;">${inviteCode}</span>
                </div>
                <p style="color:#6B7A8D;font-size:13px;">Baixe o MediAlert, crie sua conta e insira este código na tela de "Meus Médicos".</p>
              </div>
            `,
          });
        } catch (e) {
          console.warn("[Email] Failed to send invite email:", e);
        }
        return { success: true, inviteCode };
      }),

    /** Update patient info stored by doctor */
    updatePatientInfo: protectedProcedure
      .input(z.object({
        linkId: z.number(),
        patientName: z.string().optional(),
        patientPhone: z.string().optional(),
        patientBirthDate: z.string().optional(),
        patientInsurancePlan: z.string().optional(),
        patientNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { linkId, ...data } = input;
        // Get current values for audit log
        const links = await db.getDoctorPatientsAll(ctx.user.id);
        const current = links.find((l) => l.id === linkId);
        if (current) {
          const fieldMap: Record<string, string> = {
            patientName: "Nome",
            patientPhone: "Telefone",
            patientBirthDate: "Data de nascimento",
            patientInsurancePlan: "Plano de saúde",
            patientNotes: "Observações",
          };
          for (const [key, label] of Object.entries(fieldMap)) {
            const newVal = (data as any)[key];
            if (newVal !== undefined) {
              const oldVal = (current as any)[key] ?? null;
              if (String(oldVal ?? "") !== String(newVal ?? "")) {
                await db.addPatientAuditLog({
                  doctorId: ctx.user.id,
                  linkId,
                  field: label,
                  oldValue: oldVal ? String(oldVal) : null,
                  newValue: newVal ? String(newVal) : null,
                });
              }
            }
          }
        }
        await db.updateDoctorPatientInfo(linkId, data);
        return { success: true };
      }),

    /** Get audit log for a patient link */
    getPatientAuditLog: protectedProcedure
      .input(z.object({ linkId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getPatientAuditLog(input.linkId);
      }),

    /** Get all patients (including pending invites) */
    getPatientsAll: protectedProcedure.query(async ({ ctx }) => {
      const links = await db.getDoctorPatientsAll(ctx.user.id);
      const enriched = await Promise.all(links.map(async (link) => {
        let userInfo = null;
        if (link.accepted && link.patientId > 0) {
          userInfo = await db.getUserById(link.patientId);
        }
        return { ...link, userInfo };
      }));
      return enriched;
    }),

    /** Get full patient history */
    getPatientHistory: protectedProcedure
      .input(z.object({ patientId: z.number(), linkId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return db.getPatientFullHistory(ctx.user.id, input.patientId, input.linkId);
      }),

    getPatients: protectedProcedure.query(async ({ ctx }) => {
      const patients = await db.getDoctorPatients(ctx.user.id);
      return patients;
    }),

    getPatientMedications: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        return db.getMedicationsForPatient(input.patientId);
      }),

    prescribeMedication: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        name: z.string().min(1),
        dosage: z.string().min(1),
        color: z.string().default("#0D5BBF"),
        notes: z.string().optional(),
        times: z.array(z.string()).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        const medId = await db.createMedication(
          { patientId: input.patientId, caregiverId: ctx.user.id, name: input.name, dosage: input.dosage, color: input.color, notes: input.notes ?? null, active: true },
          input.times
        );
        // Create today's dose records
        const today = new Date().toISOString().split("T")[0];
        for (const t of input.times) {
          await db.createDoseRecord({ medicationId: medId, patientId: input.patientId, medicationName: input.name, scheduledTime: t, date: today, status: "pending" });
        }
        // Push notification to patient
        const patient = await db.getUserById(input.patientId);
        if (patient?.pushToken) {
          const doctorUser = await db.getUserById(ctx.user.id);
          await sendPushNotification(patient.pushToken, "💊 Novo medicamento prescrito", `Dr. ${doctorUser?.name ?? "Médico"} prescreveu ${input.name}`);
        }
        return { success: true, medId };
      }),

    /** Export patient record as PDF (generates HTML, converts to PDF via puppeteer-like approach, uploads to S3) */
    exportPatientPDF: protectedProcedure
      .input(z.object({ patientId: z.number(), linkId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const related = await db.isDoctorRelatedToPatient(input.patientId, ctx.user.id);
        if (!related) throw new Error("Sem permissão para exportar ficha deste paciente");
        // Gather all data
        const history = await db.getPatientFullHistory(ctx.user.id, input.patientId, input.linkId);
        const meds = await db.getAllMedicationsForPatient(input.patientId);
        const adherence = input.patientId > 0 ? await db.getAdherenceReport(input.patientId) : null;
        const doctorUser = await db.getUserById(ctx.user.id);
        const doctorProfile = await db.getDoctorProfile(ctx.user.id);

        const patientName = history?.patientName ?? "Paciente";
        const now = new Date().toLocaleDateString("pt-BR");

        const activeMeds = meds.filter((m: any) => m.active);
        const inactiveMeds = meds.filter((m: any) => !m.active);
        const appointments = history?.appointments ?? [];
        const notes = history?.notes ?? [];

        const medsRows = activeMeds.map((m: any) =>
          `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${(m.times ?? []).join(", ")}</td><td>${m.notes ?? ""}</td></tr>`
        ).join("");

        const apptRows = appointments.slice(0, 20).map((a: any) =>
          `<tr><td>${a.date}</td><td>${a.time}</td><td>${a.status}</td><td>${a.notes ?? ""}</td></tr>`
        ).join("");

        const noteRows = notes.slice(0, 20).map((n: any) =>
          `<tr><td>${new Date(n.createdAt).toLocaleDateString("pt-BR")}</td><td>${n.note}</td></tr>`
        ).join("");

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body{font-family:Arial,sans-serif;color:#1a1a1a;padding:32px;}
          h1{color:#0D5BBF;font-size:22px;margin-bottom:4px;}
          h2{color:#0D5BBF;font-size:16px;margin-top:28px;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px;}
          .meta{color:#666;font-size:13px;margin-bottom:24px;}
          table{width:100%;border-collapse:collapse;font-size:13px;}
          th{background:#EBF4FF;color:#0D5BBF;padding:8px;text-align:left;}
          td{padding:8px;border-bottom:1px solid #eee;}
          .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;}
          .green{background:#DCFCE7;color:#16A34A;} .red{background:#FEE2E2;color:#DC2626;}
        </style></head><body>
          <h1>Ficha Médica — ${patientName}</h1>
          <div class="meta">
            Médico: Dr. ${doctorUser?.name ?? ""} (${doctorProfile?.specialty ?? ""})
            &nbsp;&nbsp;|&nbsp;&nbsp; Exportado em: ${now}
          </div>
          ${history?.patientBirthDate ? `<p><strong>Nascimento:</strong> ${history.patientBirthDate}</p>` : ""}
          ${history?.patientPhone ? `<p><strong>Telefone:</strong> ${history.patientPhone}</p>` : ""}
          ${history?.patientInsurancePlan ? `<p><strong>Plano:</strong> ${history.patientInsurancePlan}</p>` : ""}

          <h2>Medicamentos Ativos (${activeMeds.length})</h2>
          ${activeMeds.length > 0 ? `<table><tr><th>Nome</th><th>Dosagem</th><th>Horários</th><th>Observações</th></tr>${medsRows}</table>` : "<p>Nenhum medicamento ativo.</p>"}

          ${inactiveMeds.length > 0 ? `<h2>Histórico de Medicamentos (${inactiveMeds.length})</h2><p style="color:#888;font-size:13px;">${inactiveMeds.map((m: any) => m.name).join(", ")}</p>` : ""}

          ${adherence ? `<h2>Adesão ao Tratamento</h2><p>Últimos 7 dias: <strong>${adherence.last7.pct}%</strong> &nbsp;|&nbsp; Últimos 30 dias: <strong>${adherence.last30.pct}%</strong></p>` : ""}

          <h2>Consultas (${appointments.length})</h2>
          ${appointments.length > 0 ? `<table><tr><th>Data</th><th>Hora</th><th>Status</th><th>Observações</th></tr>${apptRows}</table>` : "<p>Nenhuma consulta registrada.</p>"}

          <h2>Notas Clínicas (${notes.length})</h2>
          ${notes.length > 0 ? `<table><tr><th>Data</th><th>Nota</th></tr>${noteRows}</table>` : "<p>Nenhuma nota registrada.</p>"}
        </body></html>`;

        // Upload HTML as a shareable file (PDF generation on mobile is complex; return HTML URL)
        const { storagePut } = await import("./storage");
        const key = `patient-records/${ctx.user.id}-${input.patientId}-${Date.now()}.html`;
        const { url } = await storagePut(key, html, "text/html");
        return { url, patientName };
      }),

    /** Get adherence report for a patient (last 7 and 30 days) */
    getAdherenceReport: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        return db.getAdherenceReport(input.patientId);
      }),

    getWeeklyAdherence: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        return db.getWeeklyAdherenceByMedication(input.patientId);
      }),

    /** Update a prescribed medication */
    updatePrescription: protectedProcedure
      .input(z.object({
        medicationId: z.number(),
        patientId: z.number(),
        name: z.string().min(1).optional(),
        dosage: z.string().optional(),
        notes: z.string().optional(),
        times: z.array(z.string()).min(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const related = await db.isDoctorRelatedToPatient(input.patientId, ctx.user.id);
        if (!related) throw new Error("Sem permissão para editar prescrições deste paciente");
        const { medicationId, patientId, times, ...data } = input;
        await db.updateMedication(medicationId, data, times);
        return { success: true };
      }),

    /** Deactivate (soft-delete) a prescribed medication */
    cancelPrescription: protectedProcedure
      .input(z.object({ medicationId: z.number(), patientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const related = await db.isDoctorRelatedToPatient(input.patientId, ctx.user.id);
        if (!related) throw new Error("Sem permissão para cancelar prescrições deste paciente");

        // Fetch medication name before deleting (for notification message)
        const allMeds = await db.getAllMedicationsForPatient(input.patientId);
        const med = allMeds.find((m: any) => m.id === input.medicationId);
        const medName = med?.name ?? "Medicamento";

        // Cancel pending doses before soft-deleting the medication
        await db.cancelPendingDosesForMedication(input.medicationId);
        await db.softDeleteMedication(input.medicationId);

        // Notify the patient about the prescription cancellation
        const patient = await db.getUserById(input.patientId);
        const doctorUser = await db.getUserById(ctx.user.id);
        const doctorName = doctorUser?.name ?? "Médico";
        if (patient?.pushToken) {
          await sendPushNotification(
            patient.pushToken,
            "❌ Prescrição encerrada",
            `Dr. ${doctorName} encerrou a prescrição de ${medName}`
          );
        }

        // Notify the caregiver/familiar linked to this patient
        const caregiver = await db.getPatientCaregiver(input.patientId);
        if (caregiver?.pushToken) {
          const patientName = patient?.name ?? "Paciente";
          await sendPushNotification(
            caregiver.pushToken,
            "❌ Prescrição encerrada",
            `Dr. ${doctorName} encerrou a prescrição de ${medName} para ${patientName}`
          );
        }

        return { success: true };
      }),

    /** Get ALL medications (active + inactive) for history view */
    getAllPatientMedications: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const related = await db.isDoctorRelatedToPatient(input.patientId, ctx.user.id);
        if (!related) throw new Error("Sem permissão para ver medicamentos deste paciente");
        return db.getAllMedicationsForPatient(input.patientId);
      }),

    /** Reactivate a previously cancelled medication */
    reactivatePrescription: protectedProcedure
      .input(z.object({ medicationId: z.number(), patientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const related = await db.isDoctorRelatedToPatient(input.patientId, ctx.user.id);
        if (!related) throw new Error("Sem permissão para reativar prescrições deste paciente");
        await db.reactivateMedication(input.medicationId);
        return { success: true };
      }),

    acceptInvite: protectedProcedure
      .input(z.object({ inviteCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invite = await db.getDoctorInviteByCode(input.inviteCode.toUpperCase());
        if (!invite) throw new Error("Código de convite inválido");
        if (invite.accepted) throw new Error("Este convite já foi utilizado");
        await db.acceptDoctorInvite(invite.id, ctx.user.id);
        const doctorUser = await db.getUserById(invite.doctorId);
        const doctorProfile = await db.getDoctorProfile(invite.doctorId);
        return { success: true, doctorName: doctorUser?.name, specialty: doctorProfile?.specialty };
      }),

    getMyDoctors: protectedProcedure.query(async ({ ctx }) => {
      return db.getPatientDoctors(ctx.user.id);
    }),

    /** Get metrics for the doctor's reports dashboard */
    getMetrics: protectedProcedure
      .input(z.object({ periodDays: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        const metrics = await db.getDoctorMetrics(ctx.user.id, input.periodDays);
        return metrics;
      }),

    /** Get all in-app notifications for the logged-in doctor */
    getNotifications: protectedProcedure.query(async ({ ctx }) => {
      return db.getDoctorNotifications(ctx.user.id);
    }),

    /** Count unread in-app notifications */
    countUnreadNotifications: protectedProcedure.query(async ({ ctx }) => {
      const count = await db.countUnreadDoctorNotifications(ctx.user.id);
      return { count };
    }),

    /** Mark a single notification as read */
    markNotificationRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markDoctorNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Mark all notifications as read */
    markAllNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllDoctorNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  clinicalNotes: router({
    add: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        note: z.string().min(1, "Anotação não pode ser vazia"),
        appointmentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        const id = await db.createClinicalNote({
          doctorId: ctx.user.id,
          patientId: input.patientId,
          appointmentId: input.appointmentId ?? null,
          note: input.note,
        });
        return { success: true, id };
      }),

    list: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        return db.getClinicalNotes(ctx.user.id, input.patientId);
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), note: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateClinicalNote(input.id, input.note);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteClinicalNote(input.id);
        return { success: true };
      }),
  }),

  appointments: router({
    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        date: z.string(),
        time: z.string(),
        insurance: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const linked = await db.isPatientLinkedToDoctor(input.patientId, ctx.user.id);
        if (!linked) throw new Error("Paciente não vinculado a este médico");
        const apptId = await db.createAppointment({
          doctorId: ctx.user.id,
          patientId: input.patientId,
          date: input.date,
          time: input.time,
          insurance: input.insurance ?? null,
          location: input.location ?? null,
          notes: input.notes ?? null,
          status: "scheduled",
          reminderSent: false,
        });
        // Push notification to patient
        const patient = await db.getUserById(input.patientId);
        const doctorUser = await db.getUserById(ctx.user.id);
        if (patient?.pushToken) {
          await sendPushNotification(
            patient.pushToken,
            "📅 Consulta agendada",
            `Dr. ${doctorUser?.name ?? "Médico"} agendou uma consulta para ${input.date} às ${input.time}`
          );
        }
        return { success: true, apptId };
      }),

    listForDoctor: protectedProcedure.query(async ({ ctx }) => {
      const appts = await db.getAppointmentsForDoctor(ctx.user.id);
      // Enrich with patient info
      const enriched = await Promise.all(appts.map(async (a) => {
        const patient = await db.getUserById(a.patientId);
        return { ...a, patientName: patient?.name ?? "Paciente" };
      }));
      return enriched;
    }),

    listForPatient: protectedProcedure.query(async ({ ctx }) => {
      const appts = await db.getAppointmentsForPatient(ctx.user.id);
      // Enrich with doctor info
      const enriched = await Promise.all(appts.map(async (a) => {
        const doctor = await db.getUserById(a.doctorId);
        const profile = await db.getDoctorProfile(a.doctorId);
        return { ...a, doctorId: a.doctorId, doctorName: doctor?.name ?? "Médico", specialty: profile?.specialty ?? "" };
      }));
      return enriched;
    }),

    confirm: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const appt = await db.getAppointmentById(input.appointmentId);
        if (!appt || appt.patientId !== ctx.user.id) throw new Error("Consulta não encontrada");
        await db.updateAppointmentStatus(input.appointmentId, "confirmed");
        // Notify doctor
        const doctor = await db.getUserById(appt.doctorId);
        const patient = await db.getUserById(ctx.user.id);
        if (doctor?.pushToken) {
          await sendPushNotification(doctor.pushToken, "✅ Presença confirmada", `${patient?.name ?? "Paciente"} confirmou presença para ${appt.date} às ${appt.time}`);
        }
        return { success: true };
      }),

    cancel: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const appt = await db.getAppointmentById(input.appointmentId);
        if (!appt) throw new Error("Consulta não encontrada");
        if (appt.patientId !== ctx.user.id && appt.doctorId !== ctx.user.id) throw new Error("Sem permissão");
        await db.updateAppointmentStatus(input.appointmentId, "cancelled");
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        appointmentId: z.number(),
        date: z.string(),
        time: z.string(),
        insurance: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const appt = await db.getAppointmentById(input.appointmentId);
        if (!appt) throw new Error("Consulta não encontrada");
        if (appt.doctorId !== ctx.user.id) throw new Error("Sem permissão");
        await db.updateAppointment(input.appointmentId, {
          date: input.date,
          time: input.time,
          insurance: input.insurance ?? null,
          location: input.location ?? null,
          notes: input.notes ?? null,
        });
        // Notify patient about the change — include before/after details if date or time changed
        const patient = await db.getUserById(appt.patientId);
        const doctor = await db.getUserById(ctx.user.id);
        if (patient?.pushToken) {
          const dateChanged = appt.date !== input.date;
          const timeChanged = appt.time !== input.time;
          const formatDate = (d: string) => d.split("-").reverse().join("/");
          let body: string;
          if (dateChanged && timeChanged) {
            body = `Dr. ${doctor?.name ?? "Médico"} reagendou sua consulta.\nDe: ${formatDate(appt.date)} às ${appt.time}\nPara: ${formatDate(input.date)} às ${input.time}`;
          } else if (dateChanged) {
            body = `Dr. ${doctor?.name ?? "Médico"} alterou a data da sua consulta.\nDe: ${formatDate(appt.date)}\nPara: ${formatDate(input.date)} às ${input.time}`;
          } else if (timeChanged) {
            body = `Dr. ${doctor?.name ?? "Médico"} alterou o horário da sua consulta de ${formatDate(input.date)}.\nDe: ${appt.time}\nPara: ${input.time}`;
          } else {
            body = `Dr. ${doctor?.name ?? "Médico"} atualizou os detalhes da sua consulta de ${formatDate(input.date)} às ${input.time}.`;
          }
          await sendPushNotification(patient.pushToken, "📅 Consulta atualizada", body);
        }
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        appointmentId: z.number(),
        status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "reschedule_requested"]),
        rescheduleNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const appt = await db.getAppointmentById(input.appointmentId);
        if (!appt) throw new Error("Consulta não encontrada");
        // Only doctor or patient can update
        if (appt.doctorId !== ctx.user.id && appt.patientId !== ctx.user.id) throw new Error("Sem permissão");
        await db.updateAppointmentStatus(input.appointmentId, input.status);
        // If marked as completed, record revenue automatically
        if (input.status === "completed") {
          try {
            const doctorProfile = await db.getDoctorProfile(appt.doctorId);
            if (doctorProfile) {
              const feeAmount = await db.getFeeForInsurance(doctorProfile.id, appt.insurance);
              await db.recordAppointmentRevenue(appt.id, doctorProfile.id, appt.insurance, feeAmount);
            }
          } catch (e) {
            // Non-blocking: revenue recording failure should not break status update
            console.error("[revenue] Failed to record appointment revenue:", e);
          }
        }
        // Notify the other party
        const isDoctor = appt.doctorId === ctx.user.id;
        const statusLabels: Record<string, string> = {
          confirmed: "confirmada",
          completed: "marcada como realizada",
          cancelled: "cancelada",
          scheduled: "reagendada",
          reschedule_requested: "com solicitação de reagendamento",
        };
        const label = statusLabels[input.status] ?? input.status;
        if (isDoctor) {
          // Notify patient
          const patient = await db.getUserById(appt.patientId);
          const doctor = await db.getUserById(ctx.user.id);
          if (patient?.pushToken) {
            await sendPushNotification(
              patient.pushToken,
              `📅 Consulta ${label}`,
              `Dr. ${doctor?.name ?? "Médico"} ${label} sua consulta de ${appt.date} às ${appt.time}`
            );
            // If marked as completed, send a separate review request notification
            if (input.status === "completed") {
              await sendPushNotification(
                patient.pushToken,
                `⭐ Como foi sua consulta?`,
                `Avalie o atendimento de Dr. ${doctor?.name ?? "Médico"} e ajude outros pacientes.`
              );
            }
          }
        } else {
          // Notify doctor
          const doctor = await db.getUserById(appt.doctorId);
          const patient = await db.getUserById(ctx.user.id);
          if (doctor?.pushToken) {
            if (input.status === "reschedule_requested") {
              const note = input.rescheduleNote ? `\nMotivo: ${input.rescheduleNote}` : "";
              await sendPushNotification(
                doctor.pushToken,
                `🔄 Solicitação de reagendamento`,
                `${patient?.name ?? "Paciente"} solicitou reagendamento da consulta de ${appt.date} às ${appt.time}${note}`
              );
            } else {
              await sendPushNotification(
                doctor.pushToken,
                `✅ Consulta ${label}`,
                `${patient?.name ?? "Paciente"} ${label} a consulta de ${appt.date} às ${appt.time}`
              );
            }
          }
        }
        return { success: true };
      }),
  }),


  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    register: publicProcedure
      .input(z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("E-mail inválido"),
        password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if email already exists
        const existing = await db.getUserByEmail(input.email.toLowerCase());
        if (existing) {
          throw new Error("Este e-mail já está cadastrado.");
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);

        // Create user
        const user = await db.createEmailUser({
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          passwordHash,
        });

        if (!user) throw new Error("Erro ao criar conta. Tente novamente.");

        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          sessionToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            appRole: user.appRole,
          },
        };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email("E-mail inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Find user by email
        const user = await db.getUserByEmail(input.email.toLowerCase());
        if (!user) {
          throw new Error("E-mail ou senha incorretos.");
        }
        // Account exists but was created via OAuth (no password set)
        if (!user.passwordHash) {
          throw new Error("Esta conta não possui senha cadastrada. Use \"Esqueci minha senha\" para criar uma senha e acessar sua conta.");
        }

        // Verify password
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValid) {
          throw new Error("E-mail ou senha incorretos.");
        }

        // Update last signed in
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          sessionToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            appRole: user.appRole,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email("E-mail inválido") }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email.toLowerCase());
        // Always return success to avoid email enumeration
        if (!user) {
          return { success: true };
        }

        // Generate 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await db.updateUserResetToken(user.id, resetCode, expiry);

        // Send email with reset code
        let emailSent = false;
        try {
          await sendPasswordResetEmail(user.email!, user.name, resetCode);
          emailSent = true;
        } catch (emailError) {
          console.error("[Auth] Failed to send reset email:", emailError);
          // Email failed — return code in response so user can proceed (dev mode)
        }

        // If email was sent successfully, don't expose the code in the response
        // If email failed (e.g., domain not verified), return code so user can proceed
        return {
          success: true,
          devCode: emailSent ? undefined : resetCode,
        };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6, "Código deve ter 6 dígitos"),
        newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email.toLowerCase());
        if (!user || !user.resetToken || !user.resetTokenExpiry) {
          throw new Error("Código inválido ou expirado.");
        }

        if (user.resetToken !== input.code) {
          throw new Error("Código incorreto.");
        }

        if (new Date() > user.resetTokenExpiry) {
          throw new Error("Código expirado. Solicite um novo.");
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPasswordHash(user.id, passwordHash);
        await db.updateUserResetToken(user.id, null, null);

        return { success: true };
      }),
  }),

  user: router({
    setRole: protectedProcedure
      .input(z.object({ appRole: z.enum(["caregiver", "patient", "doctor"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserAppRole(ctx.user.id, input.appRole);
        // Send welcome push notification if user already has a push token registered
        try {
          const user = await db.getUserById(ctx.user.id);
          if (user?.pushToken) {
            const roleLabel = input.appRole === "doctor" ? "Médico" : input.appRole === "patient" ? "Paciente" : "Familiar/Cuidador";
            const firstName = (user.name ?? "").split(" ")[0] || "usuário";
            await sendPushNotification(
              user.pushToken,
              `👋 Bem-vindo ao MediAlert, ${firstName}!`,
              input.appRole === "doctor"
                ? "Seu perfil de médico está pronto. Cadastre seus pacientes e gerencie consultas."
                : input.appRole === "patient"
                ? "Seu perfil de paciente está ativo. Aguarde seu médico vincular seus medicamentos."
                : "Seu perfil de cuidador está ativo. Vincule-se ao paciente para acompanhar os medicamentos."
            );
          }
        } catch {
          // Non-fatal: welcome notification failure should not block onboarding
        }
        return { success: true };
      }),

    registerPushToken: protectedProcedure
      .input(z.object({ token: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPushToken(ctx.user.id, input.token);
        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return (await db.getUserById(ctx.user.id)) ?? null;
    }),

    /** Update user's own name */
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await import("./db");
        await db2.updateUserName(ctx.user.id, input.name);
        return { success: true };
      }),

    /** Upload user's own profile photo (base64 image) */
    uploadSelfPhoto: protectedProcedure
      .input(z.object({ base64: z.string().nullable(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ ctx, input }) => {
        if (!input.base64) {
          await db.updateUserPhoto(ctx.user.id, null);
          return { url: null };
        }
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `user-photos/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateUserPhoto(ctx.user.id, url);
        return { url };
      }),
  }),

  invite: router({
    create: protectedProcedure.mutation(async ({ ctx }) => {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await db.createInvite({ caregiverId: ctx.user.id, patientId: 0, inviteCode: code, accepted: false });
      return { code };
    }),

    /**
     * Patient generates a code for a caregiver/familiar to scan.
     * Creates an invite record with patientId = ctx.user.id and caregiverId = 0.
     * The caregiver then calls acceptAsCaregiverInvite to link.
     */
    createForCaregiver: protectedProcedure.mutation(async ({ ctx }) => {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await db.createInvite({ caregiverId: 0, patientId: ctx.user.id, inviteCode: code, accepted: false });
      return { code };
    }),

    /**
     * Caregiver/familiar accepts a code generated by the patient.
     * Links caregiverId = ctx.user.id to the patientId stored in the invite.
     */
    acceptAsCaregiverInvite: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invite = await db.getInviteByCode(input.code.trim().toUpperCase());
        if (!invite) throw new Error("Código de convite inválido.");
        if (invite.accepted) throw new Error("Este convite já foi utilizado.");
        if (invite.patientId === 0) throw new Error("Este código é para pacientes, não para familiares.");
        // Link: set caregiverId = ctx.user.id, mark accepted
        await db.acceptInviteAsCaregiver(invite.id, ctx.user.id);
        await db.updateUserAppRole(ctx.user.id, "caregiver");
        return { success: true };
      }),

    accept: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invite = await db.getInviteByCode(input.code);
        if (!invite) throw new Error("Código de convite inválido.");
        if (invite.accepted) throw new Error("Este convite já foi utilizado.");
        await db.acceptInvite(invite.id, ctx.user.id);
        await db.updateUserAppRole(ctx.user.id, "patient");
        // Notify the caregiver that the patient accepted
        try {
          const caregiver = await db.getUserById(invite.caregiverId);
          const patient = await db.getUserById(ctx.user.id);
          if (caregiver?.pushToken) {
            await sendPushNotification(
              caregiver.pushToken,
              "🔗 Paciente vinculado!",
              `${patient?.name ?? "Um paciente"} aceitou seu convite e agora você acompanha seus medicamentos.`
            );
          }
        } catch {}
        return { success: true };
      }),

    /** Caregiver accepts patient-generated code — notify patient */
    acceptAsCaregiverInviteWithNotify: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invite = await db.getInviteByCode(input.code.trim().toUpperCase());
        if (!invite) throw new Error("Código de convite inválido.");
        if (invite.accepted) throw new Error("Este convite já foi utilizado.");
        if (invite.patientId === 0) throw new Error("Este código é para pacientes, não para familiares.");
        await db.acceptInviteAsCaregiver(invite.id, ctx.user.id);
        await db.updateUserAppRole(ctx.user.id, "caregiver");
        // Notify the patient that the caregiver accepted
        try {
          const patient = await db.getUserById(invite.patientId);
          const caregiver = await db.getUserById(ctx.user.id);
          if (patient?.pushToken) {
            await sendPushNotification(
              patient.pushToken,
              "🔗 Familiar vinculado!",
              `${caregiver?.name ?? "Um familiar"} aceitou seu convite e agora acompanha seus medicamentos.`
            );
          }
        } catch {}
        return { success: true };
      }),

    /**
     * Unlink a caregiver-patient relationship.
     * Can be called by the patient (provides caregiverId) or caregiver (provides patientId).
     */
    unlink: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getUserById(ctx.user.id);
        const appRole = (profile as any)?.appRole ?? "patient";
        let caregiverId: number;
        let patientId: number;
        if (appRole === "caregiver") {
          caregiverId = ctx.user.id;
          patientId = input.otherUserId;
        } else {
          // patient
          patientId = ctx.user.id;
          caregiverId = input.otherUserId;
        }
        await db.unlinkCaregiverPatient(caregiverId, patientId);
        return { success: true };
      }),

    /** Returns today's dose summary for a linked patient (for caregiver overview) */
    getPatientDosesSummary: protectedProcedure
      .input(z.object({ patientId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        const patients = await db.getCaregiverPatients(ctx.user.id);
        const linked = patients.some((p: any) => p.id === input.patientId);
        if (!linked) throw new Error("Sem permissão para ver dados deste paciente");
        const doses = await db.getDoseRecordsForPatient(input.patientId, input.date);
        const meds = await db.getMedicationsForPatient(input.patientId);
        const total = doses.length;
        const taken = doses.filter((d: any) => d.status === "taken").length;
        const pending = doses.filter((d: any) => d.status === "pending").length;
        const skipped = doses.filter((d: any) => d.status === "skipped").length;
        return { doses, meds, total, taken, pending, skipped };
      }),

    getMyPatients: protectedProcedure.query(async ({ ctx }) => {
      return db.getCaregiverPatients(ctx.user.id);
    }),

    getMyCaregiver: protectedProcedure.query(async ({ ctx }) => {
      const caregiver = await db.getPatientCaregiver(ctx.user.id);
      return caregiver ?? null;
    }),

    /**
     * Returns the dynamically inferred roles for the current user.
     * isPatient = has medications or is linked as a patient
     * isCaregiver = has patients linked to them
     * Both can be true simultaneously.
     */
    getMyRoles: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserRoles(ctx.user.id);
    }),

    /** Caregiver fetches medications of a linked patient */
    getPatientMedications: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify the caregiver is linked to this patient
        const patients = await db.getCaregiverPatients(ctx.user.id);
        const linked = patients.some((p: any) => p.id === input.patientId);
        if (!linked) throw new Error("Sem permissão para ver medicamentos deste paciente");
        return db.getMedicationsForPatient(input.patientId);
      }),

    /** Caregiver fetches today's dose records of a linked patient */
    getPatientDosesToday: protectedProcedure
      .input(z.object({ patientId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        const patients = await db.getCaregiverPatients(ctx.user.id);
        const linked = patients.some((p: any) => p.id === input.patientId);
        if (!linked) throw new Error("Sem permissão para ver doses deste paciente");
        return db.getDoseRecordsForPatient(input.patientId, input.date);
      }),

    /** Caregiver ensures today's dose records exist for a linked patient */
    ensurePatientDosesToday: protectedProcedure
      .input(z.object({ patientId: z.number(), date: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const patients = await db.getCaregiverPatients(ctx.user.id);
        const linked = patients.some((p: any) => p.id === input.patientId);
        if (!linked) throw new Error("Sem permissão");
        await db.ensureTodayDoseRecords(input.patientId, input.date);
        return { success: true };
      }),

    /**
     * Universal code acceptance: detects whether the code was generated by a caregiver
     * (patientId=0) or by a patient (caregiverId=0) and routes to the correct handler.
     * This removes the need for the user to know which "type" of code they received.
     */
    acceptAnyCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const code = input.code.trim().toUpperCase();
        const invite = await db.getInviteByCode(code);
        if (!invite) throw new Error("Código de convite inválido. Verifique e tente novamente.");
        if (invite.accepted) throw new Error("Este convite já foi utilizado.");

        const profile = await db.getUserById(ctx.user.id);
        const appRole = (profile as any)?.appRole ?? "patient";

        if (invite.patientId === 0 && invite.caregiverId > 0) {
          // Code generated by a caregiver → the acceptor becomes a patient in this link
          // Do NOT change appRole — a user can be both patient and caregiver simultaneously
          await db.acceptInvite(invite.id, ctx.user.id);
          // Notify the caregiver
          try {
            const caregiver = await db.getUserById(invite.caregiverId);
            const patient = await db.getUserById(ctx.user.id);
            if (caregiver?.pushToken) {
              await sendPushNotification(
                caregiver.pushToken,
                "🔗 Paciente vinculado!",
                `${patient?.name ?? "Um paciente"} aceitou seu convite e agora você acompanha seus medicamentos.`
              );
            }
          } catch {}
          return { success: true, linkedAs: "patient" };
        }

        if (invite.caregiverId === 0 && invite.patientId > 0) {
          // Code generated by a patient → the acceptor becomes a caregiver in this link
          // Do NOT change appRole — a user can be both patient and caregiver simultaneously
          await db.acceptInviteAsCaregiver(invite.id, ctx.user.id);
          // Notify the patient
          try {
            const patient = await db.getUserById(invite.patientId);
            const caregiver = await db.getUserById(ctx.user.id);
            if (patient?.pushToken) {
              await sendPushNotification(
                patient.pushToken,
                "🔗 Familiar vinculado!",
                `${caregiver?.name ?? "Um familiar"} aceitou seu convite e agora acompanha seus medicamentos.`
              );
            }
          } catch {}
          return { success: true, linkedAs: "caregiver" };
        }

        throw new Error("Código inválido ou já utilizado.");
      }),

    /**
     * Checks adherence for all linked patients and sends push alerts to caregivers
     * when a patient has taken less than 50% of today's doses.
     * Called by the patient app after marking a dose, or triggered server-side.
     * Can also be called by the patient themselves to trigger a check.
     */
    checkAdherenceAlert: protectedProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Works for patient role: check their own adherence and notify their caregiver
        const profile = await db.getUserById(ctx.user.id);
        const appRole = (profile as any)?.appRole ?? "patient";

        let patientIds: number[] = [];

        if (appRole === "caregiver") {
          // Caregiver can trigger check for all their patients
          const patients = await db.getCaregiverPatients(ctx.user.id);
          patientIds = patients.map((p: any) => p.id);
        } else {
          // Patient triggers check for themselves
          patientIds = [ctx.user.id];
        }

        let alertsSent = 0;

        for (const patientId of patientIds) {
          const doses = await db.getDoseRecordsForPatient(patientId, input.date);
          if (doses.length === 0) continue;

          const taken = doses.filter((d: any) => d.status === "taken").length;
          const total = doses.length;
          const pct = total > 0 ? taken / total : 1;

          // Only alert if adherence < 50% and there are at least 2 doses scheduled
          if (pct < 0.5 && total >= 2) {
            const link = await db.getPatientCaregiverLink(patientId);
            if (!link) continue;
            const caregiver = await db.getUserById(link.caregiverId);
            const patient = await db.getUserById(patientId);
            if (caregiver?.pushToken) {
              await sendPushNotification(
                caregiver.pushToken,
                "⚠️ Adesão baixa",
                `${patient?.name ?? "Paciente"} tomou apenas ${taken} de ${total} doses hoje (${Math.round(pct * 100)}%). Verifique se está tudo bem.`,
                { patientId, screen: "family/patient-overview" }
              );
              alertsSent++;
            }
          }
        }

        return { alertsSent };
      }),
  }),

  medications: router({
    list: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return db.getMedicationsForPatient(input.patientId);
      }),

    /** Patient fetches their own medications from the server (prescribed by doctors) */
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return db.getMedicationsForPatient(ctx.user.id);
    }),

    /** Patient fetches ALL medications (active + inactive) to show prescription history */
    listAllMine: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllMedicationsForPatient(ctx.user.id);
    }),

    /** Patient fetches their own dose records for today from the server */
    listMyDosesToday: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getDoseRecordsForPatient(ctx.user.id, input.date);
      }),

    /** Patient marks a server dose as taken */
    markTaken: protectedProcedure
      .input(z.object({ doseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDoseRecord(input.doseId, { status: "taken", takenAt: new Date() });
        return { success: true };
      }),

    /** Ensure today's server dose records exist for the patient */
    ensureMyDosesToday: protectedProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.ensureTodayDoseRecords(ctx.user.id, input.date);
        return { success: true };
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        name: z.string().min(1),
        dosage: z.string().min(1),
        color: z.string(),
        notes: z.string().optional(),
        times: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const medId = await db.createMedication(
          { patientId: input.patientId, caregiverId: ctx.user.id, name: input.name, dosage: input.dosage, color: input.color, notes: input.notes },
          input.times
        );
        return { id: medId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        dosage: z.string().optional(),
        color: z.string().optional(),
        notes: z.string().optional(),
        times: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, times, ...data } = input;
        await db.updateMedication(id, data, times);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.softDeleteMedication(input.id);
        return { success: true };
      }),
  }),

  doses: router({
    listForPatient: protectedProcedure
      .input(z.object({ patientId: z.number(), date: z.string().optional() }))
      .query(async ({ input }) => {
        return db.getDoseRecordsForPatient(input.patientId, input.date);
      }),

    ensureToday: protectedProcedure
      .input(z.object({ patientId: z.number(), date: z.string() }))
      .mutation(async ({ input }) => {
        await db.ensureTodayDoseRecords(input.patientId, input.date);
        return { success: true };
      }),

    confirmTaken: protectedProcedure
      .input(z.object({ doseId: z.number(), patientId: z.number() }))
      .mutation(async ({ input }) => {
        const takenAt = new Date();
        await db.updateDoseRecord(input.doseId, { status: "taken", takenAt });
        const doses = await db.getDoseRecordsForPatient(input.patientId);
        const dose = doses.find((d) => d.id === input.doseId);
        const caregiver = await db.getPatientCaregiver(input.patientId);
        const patient = await db.getUserById(input.patientId);
        if (caregiver?.pushToken && dose) {
          const time = takenAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          await sendPushNotification(
            caregiver.pushToken,
            "✅ Medicamento tomado",
            `${patient?.name ?? "Paciente"} tomou ${dose.medicationName} às ${time}`
          );
        }
        return { success: true };
      }),

    /**
     * Called by the patient app periodically (e.g., every 5 min) to check for overdue doses.
     * If a pending dose is >= 30 min past its scheduled time, notifies the linked caregiver.
     */
    checkOverdue: protectedProcedure
      .input(z.object({ patientId: z.number(), date: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        const doses = await db.getDoseRecordsForPatient(input.patientId, input.date);
        const pending = doses.filter((d: any) => d.status === "pending");

        const overdue = pending.filter((d: any) => {
          const [h, m] = (d.scheduledTime ?? "00:00").split(":").map(Number);
          const scheduledMinutes = h * 60 + m;
          return nowMinutes - scheduledMinutes >= 30;
        });

        if (overdue.length === 0) return { notified: 0 };

        const caregiver = await db.getPatientCaregiver(input.patientId);
        const patient = await db.getUserById(input.patientId);
        if (!caregiver?.pushToken) return { notified: 0 };

        const names = overdue.map((d: any) => d.medicationName).join(", ");
        const count = overdue.length;
        await sendPushNotification(
          caregiver.pushToken,
          `⚠️ Dose${count > 1 ? "s" : ""} atrasada${count > 1 ? "s" : ""}`,
          `${patient?.name ?? "Paciente"} ainda não tomou: ${names}`
        );

        return { notified: count };
      }),
  }),

  reviews: router({
    /** Submit or update a review for a doctor after a completed appointment */
    submit: protectedProcedure
      .input(
        z.object({
          doctorId: z.number(),
          appointmentId: z.number().optional(),
          rating: z.number().min(1).max(5),
          comment: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.upsertDoctorReview({
          doctorId: input.doctorId,
          patientId: ctx.user.id,
          appointmentId: input.appointmentId,
          rating: input.rating,
          comment: input.comment,
        });
        // Create in-app notification for doctor
        const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
        const patientName = ctx.user.name ?? "Paciente";
        await db.createDoctorNotification({
          doctorId: input.doctorId,
          type: "new_review",
          title: "Nova avaliação recebida",
          body: `${patientName} avaliou você com ${stars}${input.comment ? `: "${input.comment.slice(0, 80)}"` : "."}`,
        });
        return { success: true };
      }),

    /** Get average rating and review count for a doctor */
    getRatingSummary: protectedProcedure
      .input(z.object({ doctorId: z.number() }))
      .query(async ({ input }) => {
        return db.getDoctorRatingSummary(input.doctorId);
      }),

    /** Get all reviews for a doctor */
    getForDoctor: protectedProcedure
      .input(z.object({ doctorId: z.number() }))
      .query(async ({ input }) => {
        return db.getDoctorReviews(input.doctorId);
      }),

    /** Get a patient's review for a specific appointment */
    getMyReviewForAppointment: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getPatientReviewForAppointment(ctx.user.id, input.appointmentId);
      }),

    /** List all doctors with their rating summaries (for directory) */
    listDoctorsWithRatings: protectedProcedure.query(async () => {
      return db.getAllDoctorsWithRatings();
    }),

    /** Submit a consultation request from a patient to a doctor */
    submitConsultationRequest: protectedProcedure
      .input(
        z.object({
          doctorId: z.number(),
          phone: z.string().min(8).max(32),
          message: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Find doctor user id from doctorProfile id
        const doctorProfile = await db.getDoctorProfileById(input.doctorId);
        if (!doctorProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Médico não encontrado." });
        const doctorUser = await db.getUserById(doctorProfile.userId);
        await db.createConsultationRequest({
          patientId: ctx.user.id,
          doctorId: input.doctorId,
          phone: input.phone,
          message: input.message,
        });
        // Create in-app notification for doctor
        const requestRows = await db.getDoctorConsultationRequests(doctorProfile.userId);
        const newRequest = requestRows[0]; // most recent
        await db.createDoctorNotification({
          doctorId: doctorProfile.userId,
          type: "consultation_request",
          title: "Nova solicitação de consulta",
          body: `${ctx.user.name ?? "Paciente"} quer agendar uma consulta. Tel: ${input.phone}`,
          referenceId: newRequest?.id ?? null,
        });
        // Notify doctor via push
        if (doctorUser?.pushToken) {
          await sendPushNotification(
            doctorUser.pushToken,
            "📋 Nova solicitação de consulta",
            `${ctx.user.name ?? "Paciente"} quer agendar uma consulta. Telefone: ${input.phone}`,
            { type: "consultation_request" }
          );
        }
        return { success: true };
      }),

    /** List consultation requests for the logged-in doctor */
    listConsultationRequests: protectedProcedure.query(async ({ ctx }) => {
      const requests = await db.getDoctorConsultationRequests(ctx.user.id);
      // Enrich with patient names
      const enriched = await Promise.all(
        requests.map(async (r) => {
          const patient = await db.getUserById(r.patientId);
          return {
            ...r,
            patientName: patient?.name ?? "Paciente",
            patientPhoto: patient?.photoUrl ?? null,
          };
        })
      );
      return enriched;
    }),

    /** Update status of a consultation request (doctor action) */
    updateConsultationRequestStatus: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          status: z.enum(["pending", "contacted", "declined"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateConsultationRequestStatus(input.requestId, input.status);
        // Notify patient when doctor marks as contacted
        if (input.status === "contacted") {
          const request = await db.getConsultationRequestById(input.requestId);
          if (request) {
            const doctorUser = await db.getUserById(ctx.user.id);
            const patient = await db.getUserById(request.patientId);
            if (patient?.pushToken) {
              await sendPushNotification(
                patient.pushToken,
                "📞 Médico entrará em contato",
                `Dr(a). ${doctorUser?.name ?? "seu médico"} recebeu sua solicitação e entrará em contato em breve.`,
                { type: "consultation_request_contacted", requestId: input.requestId }
              );
            }
          }
        }
        return { success: true };
      }),

    /** Get full public profile of a doctor including reviews */
    getPublicDoctorProfile: protectedProcedure
      .input(z.object({ doctorId: z.number() }))
      .query(async ({ input }) => {
        // doctorId here is doctorProfiles.id (profile PK), not userId
        const profile = await db.getDoctorProfileById(input.doctorId);
        if (!profile) return null;
        const doctorUser = await db.getUserById(profile.userId);
        if (!doctorUser) return null;
        const ratingSummary = await db.getDoctorRatingSummary(input.doctorId);
        const reviews = await db.getDoctorReviews(input.doctorId);
        // Enrich reviews with patient names
        const enrichedReviews = await Promise.all(
          reviews.map(async (r) => {
            const patient = await db.getUserById(r.patientId);
            return {
              ...r,
              patientName: patient?.name ?? "Paciente",
            };
          })
        );
        return {
          id: doctorUser.id,
          name: doctorUser.name,
          photoUrl: doctorUser.photoUrl ?? null,
          specialty: profile?.specialty ?? null,
          crm: profile?.crm ?? null,
          crmState: profile?.crmState ?? null,
          phone: profile?.phone ?? null,
          bio: profile?.bio ?? null,
          address: profile?.address ?? null,
          insurances: profile?.insurances ?? "[]",
          averageRating: ratingSummary.average,
          reviewCount: ratingSummary.count,
              reviews: enrichedReviews.map((r) => ({
            ...r,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
          })),
        };
      }),
   }),

  // ─── MGM: Referral & Commissions ───────────────────────────────────────────
  mgm: router({
    /** Get or generate referral code for the logged-in doctor */
    getMyReferralCode: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil de médico não encontrado" });
      if (!profile.referralCode) {
        let code = await db.generateReferralCode();
        for (let i = 0; i < 5; i++) {
          const existing = await db.getDoctorProfileByReferralCode(code);
          if (!existing) break;
          code = await db.generateReferralCode();
        }
        await db.setDoctorReferralCode(profile.id, code);
        return { code, profileId: profile.id };
      }
      return { code: profile.referralCode, profileId: profile.id };
    }),

    /** Validate a referral code (public) */
    validateReferralCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const profile = await db.getDoctorProfileByReferralCode(input.code.toUpperCase());
        if (!profile) return null;
        const user = await db.getUserById(profile.userId);
        return { profileId: profile.id, doctorName: user?.name ?? "Médico", specialty: profile.specialty ?? null };
      }),

    /** Get commissions summary for the logged-in doctor */
    getMyCommissions: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) return { pending: 0, paid: 0, total: 0, entries: [] };
      return db.getDoctorCommissionsSummary(profile.id);
    }),

    /** Admin: get all commissions */
    adminGetAllCommissions: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "paid"]).optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.getAllCommissions(input.status);
      }),

    /** Admin: get MGM KPIs */
    adminGetKPIs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getMGMKPIs();
    }),

    /** Admin: get MGM network tree */
    adminGetNetwork: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getMGMNetwork();
    }),

    /** Admin: get commission rules */
    adminGetRules: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getCommissionRules();
    }),

    /** Admin: update commission rule amount */
    adminUpdateRule: protectedProcedure
      .input(z.object({ id: z.number(), amount: z.number().min(0) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateCommissionRule(input.id, input.amount);
        return { success: true };
      }),

    /** Admin: mark commission as paid */
    adminMarkPaid: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const commission = await db.markCommissionPaid(input.id);
        // Send push + email notification to the referrer doctor
        if (commission) {
          const referrerProfile = await db.getDoctorProfileById(commission.referrerId);
          if (referrerProfile) {
            const referrerUser = await db.getUserById(referrerProfile.userId);
            const amountStr = Number(commission.amount).toFixed(2).replace(".", ",");
            const paidDate = new Date().toLocaleDateString("pt-BR");
            // In-app notification
            await db.createDoctorNotification({
              doctorId: referrerProfile.userId,
              type: "commission_paid",
              title: `Desconto aplicado: R$ ${amountStr}`,
              body: `Seu desconto de R$ ${amountStr} referente a ${commission.referenceMonth} foi aplicado na sua assinatura.`,
              referenceId: commission.id,
            });
            // Push notification
            if (referrerUser?.pushToken) {
              sendPushNotification(
                referrerUser.pushToken,
                "🏷️ Desconto Aplicado!",
                `Seu desconto de R$ ${amountStr} referente a ${commission.referenceMonth} foi aplicado na sua assinatura.`,
                { type: "commission_paid", commissionId: commission.id }
              );
            }
            // Email notification
            if (referrerUser?.email) {
              sendCommissionPaidEmail(
                referrerUser.email,
                referrerUser.name,
                amountStr,
                commission.referenceMonth,
                paidDate
              ).catch((e) => console.warn("[Email] discount applied error:", e));
            }
          }
        }
        return { success: true };
      }),

    /** Admin: run monthly commission calculation */
    adminCalculateMonth: protectedProcedure
      .input(z.object({ referenceMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.calculateMonthlyCommissions(input.referenceMonth);
      }),
    /** Admin: list all users */
    adminGetAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getAllUsersAdmin();
    }),
    /** Admin: export commissions as CSV data */
    adminExportCommissionsCSV: protectedProcedure
      .input(z.object({ referenceMonth: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const rows = await db.getAllCommissionsForExport(input.referenceMonth);
        const header = ["ID", "Indicador", "Email Indicador", "Indicado", "Email Indicado", "Nivel", "Mes", "Ano Indicado", "Consultas", "Valor (R$)", "Status", "Pago em", "Criado em"];
        const csvRows = rows.map((r) => [
          r.id,
          `"${r.referrerName}"`,
          `"${r.referrerEmail}"`,
          `"${r.referredName}"`,
          `"${r.referredEmail}"`,
          r.level,
          r.referenceMonth,
          r.yearOfReferred,
          r.appointmentsCount,
          r.amount.toFixed(2).replace(".", ","),
          r.status === "paid" ? "Pago" : "Pendente",
          r.paidAt ? r.paidAt.substring(0, 10) : "",
          r.createdAt.substring(0, 10),
        ].join(";"));
        return { csv: [header.join(";"), ...csvRows].join("\n"), count: rows.length };
      }),
    /** Admin: ranking of top referrers */
    adminGetRanking: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getMGMRanking();
    }),
    /** Admin: full network tree */
    adminGetNetworkTree: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getMGMNetworkTree();
    }),
    /** Admin: get financial KPIs (gross revenue, pending commissions, net) */
    adminGetFinancialKPIs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getFinancialKPIsReal();
    }),
    /** Admin: ranking of doctors by revenue */
    adminGetRevenueRanking: protectedProcedure
      .input(z.object({ referenceMonth: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.getDoctorRevenueRanking(input.referenceMonth);
      }),
    /** Admin: get platform-wide KPIs */
    adminGetPlatformKPIs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getPlatformKPIs();
    }),
    /** Doctor: get own MGM data (referrals + commissions with payment dates) */
    getDoctorMGMData: protectedProcedure.query(async ({ ctx }) => {
      return db.getDoctorMGMData(ctx.user.id);
    }),
  }),

  // ─── Doctor Insurance Fees ──────────────────────────────────────────────────
  insuranceFees: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) return [];
      return db.getDoctorInsuranceFees(profile.id);
    }),
    add: protectedProcedure.input(z.object({
      insuranceName: z.string().min(1).max(128),
      feeAmount: z.number().positive(),
      isDefault: z.boolean().optional().default(false),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil de médico não encontrado" });
      if (input.feeAmount < 120) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O valor mínimo por consulta é R$ 120,00. Valores abaixo disso não são permitidos." });
      }
      await db.upsertDoctorInsuranceFee({
        doctorProfileId: profile.id,
        insuranceName: input.insuranceName,
        feeAmount: String(input.feeAmount),
        isDefault: input.isDefault,
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      insuranceName: z.string().min(1).max(128).optional(),
      feeAmount: z.number().positive().optional(),
      isDefault: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil de médico não encontrado" });
      if (input.feeAmount !== undefined && input.feeAmount < 120) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O valor mínimo por consulta é R$ 120,00. Valores abaixo disso não são permitidos." });
      }
      const { id, ...data } = input;
      await db.updateDoctorInsuranceFee(id, profile.id, {
        ...data,
        feeAmount: data.feeAmount ? String(data.feeAmount) : undefined,
      });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil de médico não encontrado" });
      await db.deleteDoctorInsuranceFee(input.id, profile.id);
      return { success: true };
    }),
  }),
  // ─── Platform Fees ────────────────────────────────────────────────────────
  platformFees: router({
    /** Admin: list all platform fees */
    adminList: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "paid"]).optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.getAllPlatformFees(input.status);
      }),
    /** Admin: calculate fees for a given month */
    adminCalculate: protectedProcedure
      .input(z.object({ referenceMonth: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.calculateMonthlyPlatformFees(input.referenceMonth);
      }),
    /** Admin: mark a platform fee as paid */
    adminMarkPaid: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.markPlatformFeePaid(input.id);
        return { success: true };
      }),
    /** Admin: get platform fee KPIs */
    adminKPIs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getPlatformFeeKPIs();
    }),
    /** Doctor: get own platform fees */
    myFees: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) return [];
      return db.getDoctorPlatformFees(profile.id);
    }),
    /** Doctor: get platform fee for current month */
    currentMonthFee: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) return null;
      const now = new Date();
      const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const fee = await db.getDoctorPlatformFeeForMonth(profile.id, referenceMonth);
      // Also compute what it would be if not yet calculated
      if (!fee) {
        const revSummary = await db.getDoctorRevenueSummary(profile.id);
        const thisMonthRevenue = revSummary.thisMonth;
        const calc = db.calculatePlatformFee(thisMonthRevenue, profile.createdAt, referenceMonth);
        if (!calc) return { status: "grace_period" as const, monthsRemaining: 0 };
        return { status: "preview" as const, feeAmount: calc.feeAmount, feeType: calc.feeType, monthlyRevenue: thisMonthRevenue };
      }
      return fee;
    }),
  }),

  // ─── Doctor Revenue ─────────────────────────────────────────────────────────
  revenue: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) return { total: 0, thisMonth: 0, byInsurance: [], byMonth: [] };
      return db.getDoctorRevenueSummary(profile.id);
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) return [];
      return db.getDoctorRevenues(profile.id);
    }),
    getGoal: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDoctorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      const goal = await db.getDoctorRevenueGoal(profile.id);
      return { goal };
    }),
    setGoal: protectedProcedure
      .input(z.object({ goal: z.number().min(0) }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getDoctorProfile(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.setDoctorRevenueGoal(profile.id, input.goal);
        return { success: true };
      }),
  }),

});
export type AppRouter = typeof appRouter;
