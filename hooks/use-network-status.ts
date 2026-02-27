import { useState, useEffect, useRef } from "react";
import * as Network from "expo-network";
import { AppState, AppStateStatus } from "react-native";

export type NetworkStatus = {
  isOnline: boolean;
  isChecking: boolean;
};

/**
 * Hook that monitors network connectivity in real time.
 * - Polls every 10s while app is active
 * - Re-checks immediately when app comes to foreground
 * - Uses isInternetReachable (not just isConnected) for accuracy
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNetwork = async () => {
    try {
      setIsChecking(true);
      const state = await Network.getNetworkStateAsync();
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    } catch {
      // If check fails, assume offline
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkNetwork();

    // Poll every 10 seconds
    intervalRef.current = setInterval(checkNetwork, 10_000);

    // Re-check when app comes to foreground
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") checkNetwork();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, []);

  return { isOnline, isChecking };
}
