import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateId,
  getTodayString,
  formatTime,
  getStatusColor,
  type DoseRecord,
  type Medication,
  type FamilyMember,
} from "../lib/storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("generateId", () => {
  it("should generate a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("should generate unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe("getTodayString", () => {
  it("should return a date string in YYYY-MM-DD format", () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should return today's date", () => {
    const today = getTodayString();
    const expected = new Date().toISOString().split("T")[0];
    expect(today).toBe(expected);
  });
});

describe("formatTime", () => {
  it("should return the time string as-is", () => {
    expect(formatTime("08:00")).toBe("08:00");
    expect(formatTime("14:30")).toBe("14:30");
    expect(formatTime("20:00")).toBe("20:00");
  });
});

describe("getStatusColor", () => {
  it("should return green for taken status", () => {
    const color = getStatusColor("taken");
    expect(color).toBe("#22C55E");
  });

  it("should return red for missed status", () => {
    const color = getStatusColor("missed");
    expect(color).toBe("#EF4444");
  });

  it("should return yellow/amber for pending status", () => {
    const color = getStatusColor("pending");
    expect(color).toBe("#F59E0B");
  });
});

describe("Medication type validation", () => {
  it("should create a valid medication object", () => {
    const med: Medication = {
      id: generateId(),
      name: "Losartana",
      dosage: "50mg",
      color: "#3B82F6",
      times: [{ id: generateId(), time: "08:00" }],
      notes: "Tomar com água",
      createdAt: new Date().toISOString(),
      active: true,
    };

    expect(med.name).toBe("Losartana");
    expect(med.dosage).toBe("50mg");
    expect(med.times).toHaveLength(1);
    expect(med.times[0].time).toBe("08:00");
    expect(med.active).toBe(true);
  });
});

describe("DoseRecord type validation", () => {
  it("should create a valid dose record", () => {
    const record: DoseRecord = {
      id: generateId(),
      medicationId: generateId(),
      medicationName: "Losartana",
      scheduledTime: "08:00",
      date: getTodayString(),
      status: "pending",
    };

    expect(record.medicationName).toBe("Losartana");
    expect(record.status).toBe("pending");
    expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should support taken status with takenAt timestamp", () => {
    const record: DoseRecord = {
      id: generateId(),
      medicationId: generateId(),
      medicationName: "Metformina",
      scheduledTime: "12:00",
      date: getTodayString(),
      status: "taken",
      takenAt: new Date().toISOString(),
    };

    expect(record.status).toBe("taken");
    expect(record.takenAt).toBeDefined();
  });
});

describe("FamilyMember type validation", () => {
  it("should create a valid family member", () => {
    const member: FamilyMember = {
      id: generateId(),
      name: "Maria Silva",
      contact: "maria@email.com",
      notificationsEnabled: true,
      createdAt: new Date().toISOString(),
    };

    expect(member.name).toBe("Maria Silva");
    expect(member.contact).toBe("maria@email.com");
    expect(member.notificationsEnabled).toBe(true);
  });
});
