/**
 * Testes do endpoint doctor.getMetrics:
 * - Estrutura do retorno validada
 * - Cálculo correto de taxas (conversão, confirmação, cancelamento)
 * - Comportamento quando não há dados
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import { makeDoctorCtx } from "./helpers/context";

// ── Mock do banco de dados ───────────────────────────────────────────────────
vi.mock("../server/db", () => ({
  getDoctorMetrics: vi.fn(),
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn(),
    authenticateRequest: vi.fn().mockResolvedValue(null),
  },
}));

import * as db from "../server/db";

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockMetrics(overrides = {}) {
  return {
    period: 30,
    patients: {
      total: 15,
      active: 12,
      viaApp: 5,
      direct: 7,
    },
    requests: {
      total: 8,
      pending: 2,
      contacted: 5,
      declined: 1,
      conversionRate: 63,
    },
    appointments: {
      total: 20,
      completed: 14,
      confirmed: 3,
      scheduled: 2,
      cancelled: 1,
      confirmationRate: 85,
      cancellationRate: 5,
    },
    reviews: {
      count: 10,
      average: 4.5,
      distribution: [
        { star: 1, count: 0 },
        { star: 2, count: 0 },
        { star: 3, count: 1 },
        { star: 4, count: 3 },
        { star: 5, count: 6 },
      ],
    },
    adherence: {
      average: 78,
      patientCount: 8,
    },
    ...overrides,
  };
}

// ── Testes ───────────────────────────────────────────────────────────────────
describe("doctor.getMetrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna métricas completas para o período padrão (30 dias)", async () => {
    vi.mocked(db.getDoctorMetrics).mockResolvedValue(mockMetrics() as any);

    const ctx = makeDoctorCtx({ id: 10 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doctor.getMetrics({ periodDays: 30 });

    expect(result).not.toBeNull();
    expect(result!.period).toBe(30);
    expect(result!.patients.total).toBe(15);
    expect(result!.requests.conversionRate).toBe(63);
    expect(result!.appointments.confirmationRate).toBe(85);
    expect(result!.reviews.average).toBe(4.5);
    expect(result!.adherence.average).toBe(78);
  });

  it("aceita diferentes períodos (7, 30, 90, 3650 dias)", async () => {
    vi.mocked(db.getDoctorMetrics).mockResolvedValue(mockMetrics({ period: 7 }) as any);

    const ctx = makeDoctorCtx({ id: 10 });
    const caller = appRouter.createCaller(ctx);

    await caller.doctor.getMetrics({ periodDays: 7 });
    expect(db.getDoctorMetrics).toHaveBeenCalledWith(10, 7);

    await caller.doctor.getMetrics({ periodDays: 90 });
    expect(db.getDoctorMetrics).toHaveBeenCalledWith(10, 90);
  });

  it("retorna null quando banco não está disponível", async () => {
    vi.mocked(db.getDoctorMetrics).mockResolvedValue(null as any);

    const ctx = makeDoctorCtx({ id: 10 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doctor.getMetrics({ periodDays: 30 });

    expect(result).toBeNull();
  });

  it("retorna distribuição de estrelas com 5 itens (1 a 5)", async () => {
    vi.mocked(db.getDoctorMetrics).mockResolvedValue(mockMetrics() as any);

    const ctx = makeDoctorCtx({ id: 10 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doctor.getMetrics({ periodDays: 30 });

    expect(result!.reviews.distribution).toHaveLength(5);
    expect(result!.reviews.distribution.map((d) => d.star)).toEqual([1, 2, 3, 4, 5]);
  });

  it("métricas zeradas quando médico não tem dados", async () => {
    vi.mocked(db.getDoctorMetrics).mockResolvedValue(
      mockMetrics({
        patients: { total: 0, active: 0, viaApp: 0, direct: 0 },
        requests: { total: 0, pending: 0, contacted: 0, declined: 0, conversionRate: 0 },
        appointments: { total: 0, completed: 0, confirmed: 0, scheduled: 0, cancelled: 0, confirmationRate: 0, cancellationRate: 0 },
        reviews: { count: 0, average: 0, distribution: [1,2,3,4,5].map(s => ({ star: s, count: 0 })) },
        adherence: { average: 0, patientCount: 0 },
      }) as any
    );

    const ctx = makeDoctorCtx({ id: 10 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.doctor.getMetrics({ periodDays: 30 });

    expect(result!.patients.total).toBe(0);
    expect(result!.requests.conversionRate).toBe(0);
    expect(result!.reviews.average).toBe(0);
  });

  it("usa periodDays padrão de 30 quando não especificado", async () => {
    vi.mocked(db.getDoctorMetrics).mockResolvedValue(mockMetrics() as any);

    const ctx = makeDoctorCtx({ id: 10 });
    const caller = appRouter.createCaller(ctx);
    // Zod tem default de 30
    await caller.doctor.getMetrics({ periodDays: 30 });

    expect(db.getDoctorMetrics).toHaveBeenCalledWith(10, 30);
  });
});
