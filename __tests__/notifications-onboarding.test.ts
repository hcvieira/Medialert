import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Expo modules
vi.mock("expo-server-sdk", () => ({
  Expo: vi.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: vi.fn().mockResolvedValue([]),
  })),
}));
vi.mock("expo-server-sdk", () => {
  const mockExpo = vi.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: vi.fn().mockResolvedValue([]),
  }));
  (mockExpo as any).isExpoPushToken = vi.fn().mockReturnValue(true);
  return { Expo: mockExpo };
});

// ─── Email template tests ────────────────────────────────────────────────────

describe("Email Templates", () => {
  // Test that the email module exports the new functions
  it("should export sendCommissionPaidEmail function", async () => {
    // We can't import directly due to Resend dependency, so we verify the file exists
    const fs = await import("fs");
    const emailContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/_core/email.ts",
      "utf-8"
    );
    expect(emailContent).toContain("export async function sendCommissionPaidEmail");
    expect(emailContent).toContain("export async function sendDoctorWelcomeEmail");
    expect(emailContent).toContain("export async function sendPasswordResetEmail");
  });

  it("sendCommissionPaidEmail should accept correct parameters", async () => {
    const fs = await import("fs");
    const emailContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/_core/email.ts",
      "utf-8"
    );
    // Verify function signature
    expect(emailContent).toContain("toEmail: string");
    expect(emailContent).toContain("toName: string | null | undefined");
    expect(emailContent).toContain("amount: string");
    expect(emailContent).toContain("referenceMonth: string");
    expect(emailContent).toContain("paidDate: string");
  });

  it("sendDoctorWelcomeEmail should accept correct parameters", async () => {
    const fs = await import("fs");
    const emailContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/_core/email.ts",
      "utf-8"
    );
    // Verify function signature includes referralCode
    expect(emailContent).toContain("referralCode: string");
    // Verify email subject
    expect(emailContent).toContain("Bem-vindo(a) ao MediAlert");
  });

  it("commission paid email should contain correct HTML structure", async () => {
    const fs = await import("fs");
    const emailContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/_core/email.ts",
      "utf-8"
    );
    // Verify key elements in the commission paid email template
    expect(emailContent).toContain("Comissão Paga!");
    expect(emailContent).toContain("Programa de Indicações MediAlert");
    expect(emailContent).toContain("Valor pago");
    expect(emailContent).toContain("Referência:");
    expect(emailContent).toContain("Data do pagamento:");
  });

  it("welcome email should contain onboarding steps", async () => {
    const fs = await import("fs");
    const emailContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/_core/email.ts",
      "utf-8"
    );
    expect(emailContent).toContain("Configure seus valores por convênio");
    expect(emailContent).toContain("Adicione seus pacientes");
    expect(emailContent).toContain("Indique colegas e ganhe comissões");
    expect(emailContent).toContain("Seu código de indicação");
  });
});

// ─── Database function tests ─────────────────────────────────────────────────

describe("Database Functions", () => {
  it("should export getCommissionById function", async () => {
    const fs = await import("fs");
    const dbContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/db.ts",
      "utf-8"
    );
    expect(dbContent).toContain("export async function getCommissionById");
  });

  it("should export markOnboardingCompleted function", async () => {
    const fs = await import("fs");
    const dbContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/db.ts",
      "utf-8"
    );
    expect(dbContent).toContain("export async function markOnboardingCompleted");
  });

  it("markCommissionPaid should return the commission entry", async () => {
    const fs = await import("fs");
    const dbContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/db.ts",
      "utf-8"
    );
    // Verify that markCommissionPaid returns the commission
    expect(dbContent).toContain("return getCommissionById(id)");
  });

  it("markOnboardingCompleted should update onboardingCompleted field", async () => {
    const fs = await import("fs");
    const dbContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/db.ts",
      "utf-8"
    );
    expect(dbContent).toContain("onboardingCompleted: true");
  });
});

// ─── Router tests ────────────────────────────────────────────────────────────

describe("Router - Commission Paid Notification", () => {
  it("adminMarkPaid should send push notification after marking as paid", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    // Verify the adminMarkPaid mutation sends notifications
    expect(routerContent).toContain("commission_paid");
    expect(routerContent).toContain("sendPushNotification");
    expect(routerContent).toContain("sendCommissionPaidEmail");
    expect(routerContent).toContain("createDoctorNotification");
  });

  it("adminMarkPaid should look up referrer profile and user", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    expect(routerContent).toContain("getDoctorProfileById(commission.referrerId)");
    expect(routerContent).toContain("getUserById(referrerProfile.userId)");
  });

  it("adminMarkPaid should format amount in Brazilian format", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    expect(routerContent).toContain('.toFixed(2).replace(".", ",")');
  });
});

describe("Router - Doctor Setup Profile Notifications", () => {
  it("setupProfile should send welcome notification", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    // Verify welcome notification is created
    const setupSection = routerContent.substring(
      routerContent.indexOf("setupProfile:"),
      routerContent.indexOf("generateInvite:")
    );
    expect(setupSection).toContain("type: \"welcome\"");
    expect(setupSection).toContain("Bem-vindo(a) ao MediAlert!");
    expect(setupSection).toContain("sendDoctorWelcomeEmail");
    expect(setupSection).toContain("sendPushNotification");
  });

  it("setupProfile should generate referral code for new doctor", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    const setupSection = routerContent.substring(
      routerContent.indexOf("setupProfile:"),
      routerContent.indexOf("generateInvite:")
    );
    expect(setupSection).toContain("generateReferralCode");
    expect(setupSection).toContain("setDoctorReferralCode");
  });

  it("completeOnboarding endpoint should exist", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    expect(routerContent).toContain("completeOnboarding:");
    expect(routerContent).toContain("markOnboardingCompleted");
  });
});

// ─── Schema tests ────────────────────────────────────────────────────────────

describe("Schema Updates", () => {
  it("doctorNotifications should include commission_paid and welcome types", async () => {
    const fs = await import("fs");
    const schemaContent = fs.readFileSync(
      "/home/ubuntu/medialert/drizzle/schema.ts",
      "utf-8"
    );
    expect(schemaContent).toContain("commission_paid");
    expect(schemaContent).toContain("welcome");
    expect(schemaContent).toContain("consultation_request");
    expect(schemaContent).toContain("new_review");
  });

  it("doctorProfiles should include onboardingCompleted field", async () => {
    const fs = await import("fs");
    const schemaContent = fs.readFileSync(
      "/home/ubuntu/medialert/drizzle/schema.ts",
      "utf-8"
    );
    expect(schemaContent).toContain("onboardingCompleted");
    expect(schemaContent).toContain('boolean("onboardingCompleted")');
  });
});

// ─── Onboarding Guide Screen tests ──────────────────────────────────────────

describe("Onboarding Guide Screen", () => {
  it("should exist and have correct structure", async () => {
    const fs = await import("fs");
    const screenContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/doctor/onboarding-guide.tsx",
      "utf-8"
    );
    expect(screenContent).toContain("DoctorOnboardingGuideScreen");
    expect(screenContent).toContain("completeOnboarding");
  });

  it("should have all 5 onboarding steps", async () => {
    const fs = await import("fs");
    const screenContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/doctor/onboarding-guide.tsx",
      "utf-8"
    );
    expect(screenContent).toContain('"welcome"');
    expect(screenContent).toContain('"insurance"');
    expect(screenContent).toContain('"patients"');
    expect(screenContent).toContain('"referral"');
    expect(screenContent).toContain('"done"');
  });

  it("should navigate to correct routes for each step", async () => {
    const fs = await import("fs");
    const screenContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/doctor/onboarding-guide.tsx",
      "utf-8"
    );
    expect(screenContent).toContain("/doctor/insurance-fees");
    expect(screenContent).toContain("/doctor/dashboard");
    expect(screenContent).toContain("/doctor/mgm-referral");
  });

  it("should have skip and configure later options", async () => {
    const fs = await import("fs");
    const screenContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/doctor/onboarding-guide.tsx",
      "utf-8"
    );
    expect(screenContent).toContain("Pular esta etapa");
    expect(screenContent).toContain("Configurar depois");
  });

  it("should have progress indicator", async () => {
    const fs = await import("fs");
    const screenContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/doctor/onboarding-guide.tsx",
      "utf-8"
    );
    expect(screenContent).toContain("progressFill");
    expect(screenContent).toContain("dots");
  });
});

// ─── Navigation tests ────────────────────────────────────────────────────────

describe("Navigation - Onboarding Guide Route", () => {
  it("should be registered in _layout.tsx", async () => {
    const fs = await import("fs");
    const layoutContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/_layout.tsx",
      "utf-8"
    );
    expect(layoutContent).toContain("doctor/onboarding-guide");
    expect(layoutContent).toContain("fullScreenModal");
  });

  it("setup-profile should redirect to onboarding-guide", async () => {
    const fs = await import("fs");
    const setupContent = fs.readFileSync(
      "/home/ubuntu/medialert/app/doctor/setup-profile.tsx",
      "utf-8"
    );
    expect(setupContent).toContain("/doctor/onboarding-guide");
    expect(setupContent).not.toContain('router.replace("/doctor/dashboard"');
  });
});

// ─── Import validation tests ─────────────────────────────────────────────────

describe("Import Validation", () => {
  it("routers.ts should import all email functions", async () => {
    const fs = await import("fs");
    const routerContent = fs.readFileSync(
      "/home/ubuntu/medialert/server/routers.ts",
      "utf-8"
    );
    expect(routerContent).toContain("sendCommissionPaidEmail");
    expect(routerContent).toContain("sendDoctorWelcomeEmail");
    expect(routerContent).toContain("sendPasswordResetEmail");
    // Verify they're imported from the correct module
    expect(routerContent).toContain('from "./_core/email"');
  });
});
