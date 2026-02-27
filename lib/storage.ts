import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DoseTime = {
  id: string;
  time: string; // "HH:MM"
};

export type Medication = {
  id: string;
  name: string;
  dosage: string; // e.g. "500mg" or "1 comprimido"
  color: string; // pill color for visual identification
  times: DoseTime[];
  notes?: string;
  createdAt: string;
  active: boolean;
};

export type DoseRecord = {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // "HH:MM"
  date: string; // "YYYY-MM-DD"
  takenAt?: string; // ISO timestamp when taken
  status: "pending" | "taken" | "missed";
};

export type FamilyMember = {
  id: string;
  name: string;
  contact: string; // email or phone
  notificationsEnabled: boolean;
  createdAt: string;
};

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  MEDICATIONS: "@medialert:medications",
  DOSE_RECORDS: "@medialert:dose_records",
  FAMILY_MEMBERS: "@medialert:family_members",
};

// ─── Medications ──────────────────────────────────────────────────────────────

export async function getMedications(): Promise<Medication[]> {
  const raw = await AsyncStorage.getItem(KEYS.MEDICATIONS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveMedications(medications: Medication[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(medications));
}

export async function addMedication(medication: Medication): Promise<void> {
  const list = await getMedications();
  await saveMedications([...list, medication]);
}

export async function updateMedication(updated: Medication): Promise<void> {
  const list = await getMedications();
  await saveMedications(list.map((m) => (m.id === updated.id ? updated : m)));
}

export async function deleteMedication(id: string): Promise<void> {
  const list = await getMedications();
  await saveMedications(list.filter((m) => m.id !== id));
}

// ─── Dose Records ─────────────────────────────────────────────────────────────

export async function getDoseRecords(): Promise<DoseRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.DOSE_RECORDS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveDoseRecords(records: DoseRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DOSE_RECORDS, JSON.stringify(records));
}

export async function addDoseRecord(record: DoseRecord): Promise<void> {
  const list = await getDoseRecords();
  await saveDoseRecords([...list, record]);
}

export async function updateDoseRecord(updated: DoseRecord): Promise<void> {
  const list = await getDoseRecords();
  await saveDoseRecords(list.map((r) => (r.id === updated.id ? updated : r)));
}

export async function getDoseRecordsForDate(date: string): Promise<DoseRecord[]> {
  const all = await getDoseRecords();
  return all.filter((r) => r.date === date);
}

// ─── Family Members ───────────────────────────────────────────────────────────

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const raw = await AsyncStorage.getItem(KEYS.FAMILY_MEMBERS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFamilyMembers(members: FamilyMember[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.FAMILY_MEMBERS, JSON.stringify(members));
}

export async function addFamilyMember(member: FamilyMember): Promise<void> {
  const list = await getFamilyMembers();
  await saveFamilyMembers([...list, member]);
}

export async function updateFamilyMember(updated: FamilyMember): Promise<void> {
  const list = await getFamilyMembers();
  await saveFamilyMembers(list.map((m) => (m.id === updated.id ? updated : m)));
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const list = await getFamilyMembers();
  await saveFamilyMembers(list.filter((m) => m.id !== id));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatTime(time: string): string {
  return time; // "HH:MM" already formatted
}

export function getStatusColor(status: DoseRecord["status"]): string {
  switch (status) {
    case "taken":
      return "#22C55E";
    case "missed":
      return "#EF4444";
    default:
      return "#F59E0B";
  }
}
