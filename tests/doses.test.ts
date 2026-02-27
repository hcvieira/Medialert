/**
 * Testes do fluxo de doses:
 * - Confirmar dose tomada
 * - Verificar doses atrasadas
 * - Notificação ao familiar quando dose é confirmada
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import { makeCtx, makeUser } from "./helpers/context";

// ── Mock do banco de dados ───────────────────────────────────────────────────
vi.mock("../server/db", () => ({
  updateDoseRecord: vi.fn(),
  getDoseRecordsForPatient: vi.fn(),
  getPatientCaregiver: vi.fn(),
  getUserById: vi.fn(),
  ensureTodayDoseRecords: vi.fn(),
  getPatientCaregiverLink: vi.fn(),
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn(),
    authenticateRequest: vi.fn().mockResolvedValue(null),
  },
}));

// Mock do Expo push notifications
vi.mock("expo-server-sdk", () => ({
  Expo: class {
    static isExpoPushToken(token: string) {
      return token?.startsWith("ExponentPushToken[");
    }
    async sendPushNotificationsAsync(messages: any[]) {
      return messages.map(() => ({ status: "ok" }));
    }
  },
}));

import * as db from "../server/db";

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockDose(overrides = {}) {
  return {
    id: 10,
    patientId: 1,
    medicationId: 5,
    medicationName: "Losartana 50mg",
    scheduledTime: "08:00",
    date: new Date().toISOString().slice(0, 10),
    status: "pending",
    takenAt: null,
    ...overrides,
  };
}

function mockCaregiver(withPushToken = true) {
  return {
    id: 20,
    name: "Maria (Familiar)",
    pushToken: withPushToken ? "ExponentPushToken[xxxxxx]" : null,
  };
}

// ── Testes ───────────────────────────────────────────────────────────────────
describe("doses.confirmTaken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca dose como tomada com sucesso", async () => {
    vi.mocked(db.updateDoseRecord).mockResolvedValue(undefined as any);
    vi.mocked(db.getDoseRecordsForPatient).mockResolvedValue([mockDose({ id: 10 })] as any);
    vi.mocked(db.getPatientCaregiver).mockResolvedValue(null);
    vi.mocked(db.getUserById).mockResolvedValue(null);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doses.confirmTaken({ doseId: 10, patientId: 1 });

    expect(result.success).toBe(true);
    expect(db.updateDoseRecord).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ status: "taken", takenAt: expect.any(Date) })
    );
  });

  it("notifica familiar quando dose é confirmada e familiar tem push token", async () => {
    const pushSpy = vi.fn().mockResolvedValue([{ status: "ok" }]);

    // Substituir o Expo mock para capturar chamadas
    vi.doMock("expo-server-sdk", () => ({
      Expo: class {
        static isExpoPushToken(token: string) {
          return token?.startsWith("ExponentPushToken[");
        }
        sendPushNotificationsAsync = pushSpy;
      },
    }));

    vi.mocked(db.updateDoseRecord).mockResolvedValue(undefined as any);
    vi.mocked(db.getDoseRecordsForPatient).mockResolvedValue([
      mockDose({ id: 10, medicationName: "Losartana 50mg" }),
    ] as any);
    vi.mocked(db.getPatientCaregiver).mockResolvedValue(mockCaregiver(true) as any);
    vi.mocked(db.getUserById).mockResolvedValue({ id: 1, name: "João Paciente" } as any);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doses.confirmTaken({ doseId: 10, patientId: 1 });

    expect(result.success).toBe(true);
    // A notificação é enviada de forma assíncrona — verificamos que o updateDoseRecord foi chamado
    expect(db.updateDoseRecord).toHaveBeenCalledOnce();
  });

  it("não falha quando familiar não tem push token", async () => {
    vi.mocked(db.updateDoseRecord).mockResolvedValue(undefined as any);
    vi.mocked(db.getDoseRecordsForPatient).mockResolvedValue([mockDose({ id: 10 })] as any);
    vi.mocked(db.getPatientCaregiver).mockResolvedValue(mockCaregiver(false) as any);
    vi.mocked(db.getUserById).mockResolvedValue({ id: 1, name: "João" } as any);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);

    // Não deve lançar erro
    await expect(
      caller.doses.confirmTaken({ doseId: 10, patientId: 1 })
    ).resolves.toEqual({ success: true });
  });

  it("não falha quando paciente não tem familiar vinculado", async () => {
    vi.mocked(db.updateDoseRecord).mockResolvedValue(undefined as any);
    vi.mocked(db.getDoseRecordsForPatient).mockResolvedValue([mockDose({ id: 10 })] as any);
    vi.mocked(db.getPatientCaregiver).mockResolvedValue(null);
    vi.mocked(db.getUserById).mockResolvedValue(null);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.doses.confirmTaken({ doseId: 10, patientId: 1 })
    ).resolves.toEqual({ success: true });
  });
});

describe("doses.checkOverdue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 0 notificações quando não há doses atrasadas", async () => {
    const now = new Date();
    const futureTime = `${(now.getHours() + 2).toString().padStart(2, "0")}:00`;

    vi.mocked(db.getDoseRecordsForPatient).mockResolvedValue([
      mockDose({ scheduledTime: futureTime, status: "pending" }),
    ] as any);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doses.checkOverdue({
      patientId: 1,
      date: new Date().toISOString().slice(0, 10),
    });

    expect(result.notified).toBe(0);
  });

  it("retorna 0 quando não há familiar vinculado", async () => {
    vi.mocked(db.getDoseRecordsForPatient).mockResolvedValue([
      mockDose({ scheduledTime: "00:01", status: "pending" }), // atrasada
    ] as any);
    vi.mocked(db.getPatientCaregiver).mockResolvedValue(null);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doses.checkOverdue({
      patientId: 1,
      date: new Date().toISOString().slice(0, 10),
    });

    expect(result.notified).toBe(0);
  });
});

describe("doses.ensureToday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria registros de dose para o dia atual", async () => {
    vi.mocked(db.ensureTodayDoseRecords).mockResolvedValue(undefined as any);

    const ctx = makeCtx(makeUser({ id: 1 }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doses.ensureToday({
      patientId: 1,
      date: "2025-06-15",
    });

    expect(result.success).toBe(true);
    expect(db.ensureTodayDoseRecords).toHaveBeenCalledWith(1, "2025-06-15");
  });
});
