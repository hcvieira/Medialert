import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  Medication,
  DoseRecord,
  FamilyMember,
  getMedications,
  getDoseRecords,
  getFamilyMembers,
  saveMedications,
  saveDoseRecords,
  saveFamilyMembers,
  addMedication,
  updateMedication,
  deleteMedication,
  addDoseRecord,
  updateDoseRecord,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  generateId,
  getTodayString,
} from "./storage";
import {
  requestNotificationPermissions,
  scheduleMedicationNotifications,
  cancelMedicationNotifications,
  sendFamilyNotification,
} from "./notifications";

// ─── Context Types ────────────────────────────────────────────────────────────

type AppContextType = {
  medications: Medication[];
  doseRecords: DoseRecord[];
  familyMembers: FamilyMember[];
  isLoading: boolean;
  loadError: boolean;
  // Medication actions
  addMed: (med: Omit<Medication, "id" | "createdAt">) => Promise<void>;
  updateMed: (med: Medication) => Promise<void>;
  deleteMed: (id: string) => Promise<void>;
  // Dose actions
  markDoseTaken: (record: DoseRecord) => Promise<void>;
  getTodayDoses: () => DoseRecord[];
  ensureTodayDoses: () => Promise<void>;
  // Family actions
  addFamily: (member: Omit<FamilyMember, "id" | "createdAt">) => Promise<void>;
  updateFamily: (member: FamilyMember) => Promise<void>;
  deleteFamily: (id: string) => Promise<void>;
  // Reload
  reload: () => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [meds, records, family] = await Promise.all([
        getMedications(),
        getDoseRecords(),
        getFamilyMembers(),
      ]);
      setMedications(meds);
      setDoseRecords(records);
      setFamilyMembers(family);
    } catch (e) {
      console.error("[AppContext] Erro ao carregar dados locais:", e);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    requestNotificationPermissions();
  }, [reload]);

  // Ensure today's doses are created for all active medications
  const ensureTodayDoses = useCallback(async () => {
    const today = getTodayString();
    const allRecords = await getDoseRecords();
    const todayRecords = allRecords.filter((r) => r.date === today);
    const meds = await getMedications();
    const activeMeds = meds.filter((m) => m.active);

    const newRecords: DoseRecord[] = [];
    for (const med of activeMeds) {
      for (const doseTime of med.times) {
        const exists = todayRecords.some(
          (r) => r.medicationId === med.id && r.scheduledTime === doseTime.time
        );
        if (!exists) {
          newRecords.push({
            id: generateId(),
            medicationId: med.id,
            medicationName: med.name,
            scheduledTime: doseTime.time,
            date: today,
            status: "pending",
          });
        }
      }
    }

    if (newRecords.length > 0) {
      const updated = [...allRecords, ...newRecords];
      await saveDoseRecords(updated);
      setDoseRecords(updated);
    }
  }, []);

  const addMed = useCallback(async (med: Omit<Medication, "id" | "createdAt">) => {
    const newMed: Medication = {
      ...med,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    await addMedication(newMed);
    setMedications((prev) => [...prev, newMed]);
    await scheduleMedicationNotifications(newMed);
    // Create today's doses for this new medication
    const today = getTodayString();
    const newRecords: DoseRecord[] = newMed.times.map((t) => ({
      id: generateId(),
      medicationId: newMed.id,
      medicationName: newMed.name,
      scheduledTime: t.time,
      date: today,
      status: "pending" as const,
    }));
    const allRecords = await getDoseRecords();
    await saveDoseRecords([...allRecords, ...newRecords]);
    setDoseRecords((prev) => [...prev, ...newRecords]);
  }, []);

  const updateMed = useCallback(async (med: Medication) => {
    await updateMedication(med);
    setMedications((prev) => prev.map((m) => (m.id === med.id ? med : m)));
  }, []);

  const deleteMed = useCallback(async (id: string) => {
    await cancelMedicationNotifications(id);
    await deleteMedication(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
    // Remove future pending doses for this medication
    const allRecords = await getDoseRecords();
    const today = getTodayString();
    const filtered = allRecords.filter(
      (r) => !(r.medicationId === id && r.date >= today && r.status === "pending")
    );
    await saveDoseRecords(filtered);
    setDoseRecords(filtered);
  }, []);

  const markDoseTaken = useCallback(async (record: DoseRecord) => {
    const updated: DoseRecord = {
      ...record,
      status: "taken",
      takenAt: new Date().toISOString(),
    };
    await updateDoseRecord(updated);
    setDoseRecords((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
    // Notify family members
    await sendFamilyNotification(record.medicationName, updated.takenAt!);
  }, []);

  const getTodayDoses = useCallback((): DoseRecord[] => {
    const today = getTodayString();
    return doseRecords
      .filter((r) => r.date === today)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [doseRecords]);

  const addFamily = useCallback(async (member: Omit<FamilyMember, "id" | "createdAt">) => {
    const newMember: FamilyMember = {
      ...member,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    await addFamilyMember(newMember);
    setFamilyMembers((prev) => [...prev, newMember]);
  }, []);

  const updateFamily = useCallback(async (member: FamilyMember) => {
    await updateFamilyMember(member);
    setFamilyMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
  }, []);

  const deleteFamily = useCallback(async (id: string) => {
    await deleteFamilyMember(id);
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        medications,
        doseRecords,
        familyMembers,
        isLoading,
        loadError,
        addMed,
        updateMed,
        deleteMed,
        markDoseTaken,
        getTodayDoses,
        ensureTodayDoses,
        addFamily,
        updateFamily,
        deleteFamily,
        reload,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
