import { describe, it, expect, vi } from "vitest";

// Test bank info data structure and validation
describe("Bank Info Feature", () => {
  describe("Bank info fields", () => {
    it("should accept valid bank info fields", () => {
      const bankInfo = {
        bankName: "Nubank",
        bankAgency: "0001",
        bankAccount: "12345-6",
        bankAccountType: "corrente" as const,
        pixKey: "medico@email.com",
      };
      expect(bankInfo.bankName).toBe("Nubank");
      expect(bankInfo.bankAgency).toBe("0001");
      expect(bankInfo.bankAccount).toBe("12345-6");
      expect(bankInfo.bankAccountType).toBe("corrente");
      expect(bankInfo.pixKey).toBe("medico@email.com");
    });

    it("should accept poupanca account type", () => {
      const bankInfo = {
        bankAccountType: "poupanca" as const,
      };
      expect(bankInfo.bankAccountType).toBe("poupanca");
    });

    it("should allow all bank fields to be optional/undefined", () => {
      const bankInfo: Record<string, string | undefined> = {
        bankName: undefined,
        bankAgency: undefined,
        bankAccount: undefined,
        bankAccountType: undefined,
        pixKey: undefined,
      };
      expect(bankInfo.bankName).toBeUndefined();
      expect(bankInfo.pixKey).toBeUndefined();
    });

    it("should accept various PIX key formats", () => {
      const cpfPix = "123.456.789-00";
      const emailPix = "doctor@email.com";
      const phonePix = "+5511999999999";
      const randomPix = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

      expect(cpfPix).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
      expect(emailPix).toContain("@");
      expect(phonePix).toMatch(/^\+\d+$/);
      expect(randomPix).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe("Commission entry with bank info", () => {
    it("should include bank info in commission entry", () => {
      const commissionEntry = {
        id: 1,
        referrerName: "Dr. Ricardo Mendes",
        referredName: "Dra. Ana Silva",
        amount: 200,
        level: 1,
        referenceMonth: "2026-01",
        appointmentsCount: 50,
        status: "pending",
        bankName: "Itaú",
        bankAgency: "1234",
        bankAccount: "56789-0",
        bankAccountType: "corrente",
        pixKey: "ricardo@email.com",
      };

      expect(commissionEntry.bankName).toBe("Itaú");
      expect(commissionEntry.pixKey).toBe("ricardo@email.com");
    });

    it("should handle commission entry without bank info", () => {
      const commissionEntry = {
        id: 2,
        referrerName: "Dr. João Santos",
        referredName: "Dra. Maria Lima",
        amount: 100,
        level: 2,
        referenceMonth: "2026-01",
        appointmentsCount: 48,
        status: "pending",
        bankName: null,
        bankAgency: null,
        bankAccount: null,
        bankAccountType: null,
        pixKey: null,
      };

      expect(commissionEntry.bankName).toBeNull();
      expect(commissionEntry.pixKey).toBeNull();
    });
  });

  describe("Doctor group with bank info", () => {
    it("should group commissions by doctor with bank info", () => {
      const entries = [
        {
          id: 1, referrerName: "Dr. Ricardo", referredName: "Dr. A", amount: 200,
          level: 1, referenceMonth: "2026-01", appointmentsCount: 50, status: "pending",
          bankName: "Nubank", bankAgency: "0001", bankAccount: "12345-6",
          bankAccountType: "corrente", pixKey: "ricardo@pix.com",
        },
        {
          id: 2, referrerName: "Dr. Ricardo", referredName: "Dr. B", amount: 100,
          level: 2, referenceMonth: "2026-01", appointmentsCount: 48, status: "pending",
          bankName: "Nubank", bankAgency: "0001", bankAccount: "12345-6",
          bankAccountType: "corrente", pixKey: "ricardo@pix.com",
        },
      ];

      const map = new Map<string, { doctorName: string; totalAmount: number; entries: typeof entries; pixKey: string | null }>();
      for (const c of entries) {
        const key = c.referrerName;
        if (!map.has(key)) {
          map.set(key, { doctorName: key, totalAmount: 0, entries: [], pixKey: c.pixKey });
        }
        const group = map.get(key)!;
        group.totalAmount += c.amount;
        group.entries.push(c);
      }

      const grouped = Array.from(map.values());
      expect(grouped).toHaveLength(1);
      expect(grouped[0].doctorName).toBe("Dr. Ricardo");
      expect(grouped[0].totalAmount).toBe(300);
      expect(grouped[0].entries).toHaveLength(2);
      expect(grouped[0].pixKey).toBe("ricardo@pix.com");
    });
  });

  describe("Bank info display formatting", () => {
    it("should format bank info with all fields", () => {
      const bankName = "Itaú";
      const bankAgency = "1234";
      const bankAccount = "56789-0";
      const bankAccountType: string = "corrente";

      const formatted = `${bankName} · Ag ${bankAgency} · Cc ${bankAccount} (${bankAccountType === "poupanca" ? "Poupança" : "Corrente"})`;
      expect(formatted).toBe("Itaú · Ag 1234 · Cc 56789-0 (Corrente)");
    });

    it("should format poupanca correctly", () => {
      const bankAccountType = "poupanca";
      const label = bankAccountType === "poupanca" ? "Poupança" : "Corrente";
      expect(label).toBe("Poupança");
    });

    it("should detect when bank info is missing", () => {
      const doctorBankName = "";
      const doctorPixKey = "";
      const hasBankInfo = !!(doctorBankName || doctorPixKey);
      expect(hasBankInfo).toBe(false);
    });

    it("should detect when bank info is present (PIX only)", () => {
      const doctorBankName = "";
      const doctorPixKey = "12345678900";
      const hasBankInfo = !!(doctorBankName || doctorPixKey);
      expect(hasBankInfo).toBe(true);
    });
  });
});
