import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in background triggers re-auth

export type BiometricState = "idle" | "locked" | "authenticating" | "unlocked" | "unavailable";

export function useBiometricLock() {
  const [state, setState] = useState<BiometricState>("idle");
  const backgroundTime = useRef<number | null>(null);
  const hasChecked = useRef(false);

  const checkBiometricAvailability = useCallback(async () => {
    if (Platform.OS === "web") {
      setState("unavailable");
      return false;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    const available = await checkBiometricAvailability();
    if (!available) {
      setState("unlocked");
      return true;
    }

    setState("authenticating");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Identifique-se para acessar o MediAlert",
        fallbackLabel: "Usar senha",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setState("unlocked");
        return true;
      } else {
        setState("locked");
        return false;
      }
    } catch {
      setState("locked");
      return false;
    }
  }, [checkBiometricAvailability]);

  // Initial authentication on mount
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    (async () => {
      const available = await checkBiometricAvailability();
      if (!available) {
        setState("unlocked");
        return;
      }
      setState("locked");
      await authenticate();
    })();
  }, [authenticate, checkBiometricAvailability]);

  // Re-lock after background timeout
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundTime.current = Date.now();
      } else if (nextState === "active" && backgroundTime.current) {
        const elapsed = Date.now() - backgroundTime.current;
        backgroundTime.current = null;
        if (elapsed > LOCK_TIMEOUT_MS) {
          const available = await checkBiometricAvailability();
          if (available) {
            setState("locked");
            await authenticate();
          }
        }
      }
    });
    return () => subscription.remove();
  }, [authenticate, checkBiometricAvailability]);

  return { state, authenticate };
}
