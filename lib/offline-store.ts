/**
 * Offline Store
 *
 * Provides two capabilities:
 * 1. Cache — save server responses locally so they're available offline
 * 2. Mutation Queue — queue write operations while offline and replay them when back online
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "@medialert_cache:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type CacheEntry<T> = {
  data: T;
  savedAt: number;
};

export const offlineCache = {
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = { data, savedAt: Date.now() };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Silently fail — cache is best-effort
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      // Expire after TTL
      if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },

  async clear(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch {}
  },
};

// ─── Mutation Queue ───────────────────────────────────────────────────────────

const QUEUE_KEY = "@medialert_mutation_queue";

export type PendingMutation = {
  id: string;
  type: "dose.confirmTaken" | "dose.markMissed" | "medication.add" | "medication.update" | "medication.delete";
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
};

export const mutationQueue = {
  async getAll(): Promise<PendingMutation[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PendingMutation[];
    } catch {
      return [];
    }
  },

  async add(mutation: Omit<PendingMutation, "id" | "createdAt" | "retries">): Promise<string> {
    const id = `${mutation.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry: PendingMutation = { ...mutation, id, createdAt: Date.now(), retries: 0 };
    const queue = await mutationQueue.getAll();
    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return id;
  },

  async remove(id: string): Promise<void> {
    const queue = await mutationQueue.getAll();
    const filtered = queue.filter((m) => m.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  async incrementRetries(id: string): Promise<void> {
    const queue = await mutationQueue.getAll();
    const updated = queue.map((m) => (m.id === id ? { ...m, retries: m.retries + 1 } : m));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  async count(): Promise<number> {
    const queue = await mutationQueue.getAll();
    return queue.length;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};

// ─── Cache Keys ───────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  todayDoses: (userId: number) => `today_doses_${userId}`,
  medications: (userId: number) => `medications_${userId}`,
  doseHistory: (userId: number) => `dose_history_${userId}`,
  appointments: (userId: number) => `appointments_${userId}`,
  userProfile: (userId: number) => `user_profile_${userId}`,
  familyPatient: (userId: number) => `family_patient_${userId}`,
};
