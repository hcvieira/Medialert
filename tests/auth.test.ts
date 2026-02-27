/**
 * Testes de autenticação: registro, login, logout, reset de senha.
 * Todos os acessos ao banco são mockados para rodar sem conexão real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import { makeCtx, makePublicCtx } from "./helpers/context";

// ── Mock do banco de dados ───────────────────────────────────────────────────
vi.mock("../server/db", () => ({
  getUserByEmail: vi.fn(),
  createEmailUser: vi.fn(),
  upsertUser: vi.fn(),
  updateUserResetToken: vi.fn(),
  updateUserPasswordHash: vi.fn(),
  getUserByResetToken: vi.fn(),
  getUserById: vi.fn(),
  updateUserAppRole: vi.fn(),
  updateUserPushToken: vi.fn(),
}));

// Mock do SDK (criação de sessão)
vi.mock("../server/_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
    authenticateRequest: vi.fn().mockResolvedValue(null),
  },
}));

// Mock do email (não enviar e-mails reais nos testes)
vi.mock("../server/_core/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "../server/db";

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockDbUser(overrides = {}) {
  return {
    id: 1,
    openId: "user-open-id",
    email: "paciente@medialert.com",
    name: "João Silva",
    loginMethod: "email",
    role: "user",
    appRole: "patient",
    passwordHash: "$2a$12$hashedpassword",
    resetToken: null,
    resetTokenExpiry: null,
    pushToken: null,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

// ── Testes ───────────────────────────────────────────────────────────────────
describe("auth.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria conta com sucesso quando e-mail não existe", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(null);
    vi.mocked(db.createEmailUser).mockResolvedValue(mockDbUser() as any);

    const ctx = makePublicCtx();
    // Adicionar cookie mock
    const cookies: any[] = [];
    (ctx.res as any).cookie = (name: string, value: string, opts: any) => cookies.push({ name, value, opts });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      name: "João Silva",
      email: "paciente@medialert.com",
      password: "senha12345",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("paciente@medialert.com");
    expect(db.createEmailUser).toHaveBeenCalledOnce();
  });

  it("rejeita e-mail já cadastrado", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockDbUser() as any);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.register({
        name: "João Silva",
        email: "paciente@medialert.com",
        password: "senha12345",
      })
    ).rejects.toThrow("já está cadastrado");
  });

  it("rejeita senha com menos de 8 caracteres", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.register({
        name: "João Silva",
        email: "novo@medialert.com",
        password: "curta",
      })
    ).rejects.toThrow();
  });

  it("rejeita e-mail com formato inválido", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.register({
        name: "João Silva",
        email: "nao-e-email",
        password: "senha12345",
      })
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("realiza login com credenciais corretas", async () => {
    // bcrypt hash de "senha12345"
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("senha12345", 10);
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockDbUser({ passwordHash: hash }) as any);
    vi.mocked(db.upsertUser).mockResolvedValue(undefined);

    const ctx = makePublicCtx();
    const cookies: any[] = [];
    (ctx.res as any).cookie = (name: string, value: string, opts: any) => cookies.push({ name, value, opts });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      email: "paciente@medialert.com",
      password: "senha12345",
    });

    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("mock-session-token");
    expect(result.user.email).toBe("paciente@medialert.com");
    expect(cookies).toHaveLength(1);
  });

  it("rejeita senha incorreta", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("senha-correta", 10);
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockDbUser({ passwordHash: hash }) as any);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.login({
        email: "paciente@medialert.com",
        password: "senha-errada",
      })
    ).rejects.toThrow("E-mail ou senha incorretos");
  });

  it("rejeita usuário inexistente", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(null);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.login({
        email: "naoexiste@medialert.com",
        password: "qualquersenha",
      })
    ).rejects.toThrow("E-mail ou senha incorretos");
  });

  it("orienta usuário OAuth a usar reset de senha", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      mockDbUser({ passwordHash: null }) as any
    );

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.login({
        email: "oauth@medialert.com",
        password: "qualquersenha",
      })
    ).rejects.toThrow("Esqueci minha senha");
  });
});

describe("auth.logout", () => {
  it("limpa o cookie de sessão e retorna sucesso", async () => {
    const ctx = makeCtx();
    const cleared: any[] = [];
    (ctx.res as any).clearCookie = (name: string, opts: any) => cleared.push({ name, opts });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(cleared).toHaveLength(1);
    expect(cleared[0].opts.maxAge).toBe(-1);
  });
});

describe("auth.forgotPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna sucesso mesmo quando e-mail não existe (evita enumeração)", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(null);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.forgotPassword({ email: "naoexiste@medialert.com" });

    expect(result.success).toBe(true);
    expect(db.updateUserResetToken).not.toHaveBeenCalled();
  });

  it("gera código de reset para e-mail válido", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      mockDbUser({ email: "paciente@medialert.com" }) as any
    );
    vi.mocked(db.updateUserResetToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.forgotPassword({ email: "paciente@medialert.com" });

    expect(result.success).toBe(true);
    expect(db.updateUserResetToken).toHaveBeenCalledOnce();
  });
});

describe("auth.resetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejeita código expirado", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      mockDbUser({
        resetToken: "123456",
        resetTokenExpiry: new Date(Date.now() - 1000), // expirado
      }) as any
    );

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.resetPassword({
        email: "paciente@medialert.com",
        code: "123456",
        newPassword: "novasenha123",
      })
    ).rejects.toThrow("expirado");
  });

  it("rejeita código incorreto", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      mockDbUser({
        resetToken: "123456",
        resetTokenExpiry: new Date(Date.now() + 60000),
      }) as any
    );

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.resetPassword({
        email: "paciente@medialert.com",
        code: "999999",
        newPassword: "novasenha123",
      })
    ).rejects.toThrow("incorreto");
  });

  it("redefine senha com código válido", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      mockDbUser({
        resetToken: "123456",
        resetTokenExpiry: new Date(Date.now() + 60000),
      }) as any
    );
    vi.mocked(db.updateUserPasswordHash).mockResolvedValue(undefined);
    vi.mocked(db.updateUserResetToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.resetPassword({
      email: "paciente@medialert.com",
      code: "123456",
      newPassword: "novasenha123",
    });

    expect(result.success).toBe(true);
    expect(db.updateUserPasswordHash).toHaveBeenCalledOnce();
    // Deve limpar o token após uso
    expect(db.updateUserResetToken).toHaveBeenCalledWith(1, null, null);
  });
});
