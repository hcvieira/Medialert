/**
 * Offline Sync Context
 *
 * Provides:
 * - Network status (isOnline)
 * - Pending mutations count
 * - syncNow() — manually trigger sync
 * - Auto-sync when coming back online
 * - Toast-style feedback on sync completion
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Animated, StyleSheet, Platform } from "react-native";
import { mutationQueue, PendingMutation, offlineCache, CACHE_KEYS } from "./offline-store";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

// ─── Context ──────────────────────────────────────────────────────────────────

type OfflineSyncContextType = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  lastSyncAt: Date | null;
};

const OfflineSyncContext = createContext<OfflineSyncContextType>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  syncNow: async () => {},
  lastSyncAt: null,
});

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}

// ─── Sync Banner ──────────────────────────────────────────────────────────────

type BannerState = "offline" | "syncing" | "synced" | "hidden";

function SyncBanner({ state }: { state: BannerState }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "hidden") {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      // Auto-hide "synced" after 3 seconds
      if (state === "synced") {
        const timer = setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [state]);

  if (state === "hidden") return null;

  const config = {
    offline: { bg: "#374151", text: "Sem conexão — dados salvos localmente", icon: "📵" },
    syncing: { bg: "#1D4ED8", text: "Sincronizando dados...", icon: "🔄" },
    synced: { bg: "#15803D", text: "Dados sincronizados com sucesso", icon: "✅" },
    hidden: { bg: "transparent", text: "", icon: "" },
  }[state];

  return (
    <Animated.View style={[styles.banner, { backgroundColor: config.bg, opacity }]}>
      <Text style={styles.bannerText}>{config.icon}  {config.text}</Text>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [bannerState, setBannerState] = useState<BannerState>("hidden");
  const wasOnlineRef = useRef(true);
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  // Update pending count periodically
  const refreshPendingCount = useCallback(async () => {
    const count = await mutationQueue.count();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Process a single mutation against the server
  const processMutation = useCallback(async (mutation: PendingMutation): Promise<boolean> => {
    try {
      if (mutation.type === "dose.confirmTaken") {
        const { doseId } = mutation.payload as { doseId: number };
        await utils.client.medications.markTaken.mutate({ doseId });
      }
      // Additional mutation types can be added here as the app grows
      return true;
    } catch (err: unknown) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      // Don't retry auth errors or validation errors
      if (code === "UNAUTHORIZED" || code === "BAD_REQUEST") return true; // discard
      return false;
    }
  }, [utils]);

  // Sync all pending mutations
  const syncNow = useCallback(async () => {
    const queue = await mutationQueue.getAll();
    if (queue.length === 0) return;

    setIsSyncing(true);
    setBannerState("syncing");

    let syncedCount = 0;
    for (const mutation of queue) {
      if (mutation.retries >= 3) {
        // Give up after 3 retries
        await mutationQueue.remove(mutation.id);
        continue;
      }
      const success = await processMutation(mutation);
      if (success) {
        await mutationQueue.remove(mutation.id);
        syncedCount++;
      } else {
        await mutationQueue.incrementRetries(mutation.id);
      }
    }

    // Invalidate queries to refresh data from server
    if (syncedCount > 0) {
      await queryClient.invalidateQueries();
    }

    await refreshPendingCount();
    setIsSyncing(false);
    setLastSyncAt(new Date());
    setBannerState(syncedCount > 0 ? "synced" : "hidden");

    // Hide synced banner after delay
    if (syncedCount > 0) {
      setTimeout(() => setBannerState("hidden"), 3500);
    }
  }, [processMutation, queryClient, refreshPendingCount]);

  // React to connectivity changes
  useEffect(() => {
    const wasOffline = !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (!isOnline) {
      setBannerState("offline");
    } else if (wasOffline && isOnline) {
      // Just came back online — sync
      syncNow();
    } else if (isOnline && bannerState === "offline") {
      setBannerState("hidden");
    }
  }, [isOnline]);

  return (
    <OfflineSyncContext.Provider value={{ isOnline, pendingCount, isSyncing, syncNow, lastSyncAt }}>
      <View style={{ flex: 1 }}>
        <SyncBanner state={bannerState} />
        {children}
      </View>
    </OfflineSyncContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    // On web, position at top
    ...(Platform.OS === "web" ? { position: "relative" as const } : {}),
  },
  bannerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
