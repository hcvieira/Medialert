/**
 * Shared test helpers for creating tRPC contexts and mock users.
 * Used across all test files to avoid repetition.
 */
import type { TrpcContext } from "../../server/_core/context";
import type { User } from "../../drizzle/schema";

export type MockUser = NonNullable<TrpcContext["user"]>;

/** Base mock user — override fields as needed */
export function makeUser(overrides: Partial<User> = {}): MockUser {
  return {
    id: 1,
    openId: "test-open-id",
    email: "test@medialert.com",
    name: "Usuário Teste",
    loginMethod: "email",
    role: "user",
    appRole: "patient",
    passwordHash: null,
    resetToken: null,
    resetTokenExpiry: null,
    pushToken: null,
    photoUrl: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    lastSignedIn: new Date("2025-01-01"),
    ...overrides,
  };
}

/** Creates a minimal tRPC context with an authenticated user */
export function makeCtx(user: MockUser | null = makeUser()): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      hostname: "3000-test.manus.computer",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

/** Creates a context for a doctor user */
export function makeDoctorCtx(overrides: Partial<User> = {}): TrpcContext {
  return makeCtx(makeUser({ id: 10, appRole: "doctor", ...overrides }));
}

/** Creates a context for a caregiver user */
export function makeCaregiverCtx(overrides: Partial<User> = {}): TrpcContext {
  return makeCtx(makeUser({ id: 20, appRole: "caregiver", ...overrides }));
}

/** Creates a context for an unauthenticated user */
export function makePublicCtx(): TrpcContext {
  return makeCtx(null);
}
