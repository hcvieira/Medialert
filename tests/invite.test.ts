/**
 * Testes do fluxo de vinculação familiar-paciente:
 * - Geração de código de convite
 * - Aceitação de código (ambos os sentidos)
 * - Rejeição de código inválido/já usado
 * - Desvinculação
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import { makeCtx, makeUser, makeCaregiverCtx } from "./helpers/context";

// ── Mock do banco de dados ───────────────────────────────────────────────────
vi.mock("../server/db", () => ({
  createInvite: vi.fn(),
  getInviteByCode: vi.fn(),
  acceptInvite: vi.fn(),
  acceptInviteAsCaregiver: vi.fn(),
  updateUserAppRole: vi.fn(),
  getUserById: vi.fn(),
  unlinkCaregiverPatient: vi.fn(),
  getCaregiverPatients: vi.fn(),
  getPatientCaregiver: vi.fn(),
  getUserRoles: vi.fn(),
  getDoseRecordsForPatient: vi.fn(),
  getPatientCaregiverLink: vi.fn(),
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-token"),
    authenticateRequest: vi.fn().mockResolvedValue(null),
  },
}));

import * as db from "../server/db";

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockInviteFromCaregiver() {
  return {
    id: 1,
    caregiverId: 20,  // familiar gerou o código
    patientId: 0,     // paciente ainda não vinculado
    inviteCode: "ABC12345",
    accepted: false,
    createdAt: new Date(),
  };
}

function mockInviteFromPatient() {
  return {
    id: 2,
    caregiverId: 0,   // familiar ainda não vinculado
    patientId: 1,     // paciente gerou o código
    inviteCode: "XYZ67890",
    accepted: false,
    createdAt: new Date(),
  };
}

// ── Testes ───────────────────────────────────────────────────────────────────
describe("invite.create (familiar gera código para paciente)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gera código de convite e retorna string não vazia", async () => {
    vi.mocked(db.createInvite).mockResolvedValue(undefined as any);

    const ctx = makeCaregiverCtx({ id: 20 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.create();

    expect(result.code).toBeTruthy();
    expect(typeof result.code).toBe("string");
    expect(result.code.length).toBeGreaterThan(0);
    expect(db.createInvite).toHaveBeenCalledOnce();
  });
});

describe("invite.createForCaregiver (paciente gera código para familiar)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gera código de convite com patientId preenchido", async () => {
    vi.mocked(db.createInvite).mockResolvedValue(undefined as any);

    const ctx = makeCtx(makeUser({ id: 1, appRole: "patient" }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.createForCaregiver();

    expect(result.code).toBeTruthy();
    expect(db.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 1, caregiverId: 0 })
    );
  });
});

describe("invite.acceptAnyCode — código do familiar (paciente aceita)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("vincula paciente ao familiar com código válido", async () => {
    vi.mocked(db.getInviteByCode).mockResolvedValue(mockInviteFromCaregiver() as any);
    vi.mocked(db.acceptInvite).mockResolvedValue(undefined as any);
    vi.mocked(db.getUserById).mockResolvedValue(null);

    const ctx = makeCtx(makeUser({ id: 1, appRole: "patient" }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.acceptAnyCode({ code: "ABC12345" });

    expect(result.success).toBe(true);
    expect(result.linkedAs).toBe("patient");
    expect(db.acceptInvite).toHaveBeenCalledOnce();
  });
});

describe("invite.acceptAnyCode — código do paciente (familiar aceita)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("vincula familiar ao paciente com código válido", async () => {
    vi.mocked(db.getInviteByCode).mockResolvedValue(mockInviteFromPatient() as any);
    vi.mocked(db.acceptInviteAsCaregiver).mockResolvedValue(undefined as any);
    vi.mocked(db.getUserById).mockResolvedValue(null);

    const ctx = makeCaregiverCtx({ id: 20 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.acceptAnyCode({ code: "XYZ67890" });

    expect(result.success).toBe(true);
    expect(result.linkedAs).toBe("caregiver");
    expect(db.acceptInviteAsCaregiver).toHaveBeenCalledOnce();
  });
});

describe("invite.acceptAnyCode — casos de erro", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejeita código inválido (não encontrado no banco)", async () => {
    vi.mocked(db.getInviteByCode).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.invite.acceptAnyCode({ code: "INVALIDO" })
    ).rejects.toThrow("inválido");
  });

  it("rejeita código já utilizado", async () => {
    vi.mocked(db.getInviteByCode).mockResolvedValue({
      ...mockInviteFromCaregiver(),
      accepted: true,
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.invite.acceptAnyCode({ code: "ABC12345" })
    ).rejects.toThrow("já foi utilizado");
  });

  it("normaliza código para maiúsculas antes de buscar", async () => {
    vi.mocked(db.getInviteByCode).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    try {
      await caller.invite.acceptAnyCode({ code: "abc12345" });
    } catch {}

    // Deve ter buscado com o código em maiúsculas
    expect(db.getInviteByCode).toHaveBeenCalledWith("ABC12345");
  });
});

describe("invite.unlink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("desvincula familiar do paciente com sucesso", async () => {
    vi.mocked(db.unlinkCaregiverPatient).mockResolvedValue(undefined as any);

    const ctx = makeCtx(makeUser({ id: 1, appRole: "patient" }));
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.unlink({ otherUserId: 20 });

    expect(result.success).toBe(true);
    expect(db.unlinkCaregiverPatient).toHaveBeenCalledOnce();
  });
});
