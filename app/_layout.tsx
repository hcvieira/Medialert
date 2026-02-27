import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { AppProvider } from "@/lib/app-context";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { useBiometricLock } from "@/hooks/use-biometric-lock";
import { BiometricLockScreen } from "@/components/biometric-lock-screen";
import { AuthProvider, useAuthContext } from "@/lib/auth-context";
import { usePushToken } from "@/hooks/use-push-token";
import { AppErrorBoundary } from "@/components/error-boundary";
import { OfflineSyncProvider } from "@/lib/offline-sync";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppInner() {
  const { user } = useAuthContext();
  const { state, authenticate } = useBiometricLock();
  usePushToken();

  if (user && (state === "locked" || state === "authenticating")) {
    return <BiometricLockScreen state={state} onRetry={authenticate} />;
  }

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oauth/callback" />
        <Stack.Screen name="welcome" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="join-invite" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="signup" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="forgot-password" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="medication/add" options={{ presentation: "modal" }} />
        <Stack.Screen name="medication/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="doctor/setup-profile" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="doctor/onboarding-guide" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="doctor/dashboard" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="doctor/patient-detail" options={{ presentation: "modal" }} />
        <Stack.Screen name="patient/appointments" options={{ presentation: "modal" }} />
        <Stack.Screen name="patient/my-doctors" options={{ presentation: "modal" }} />
        <Stack.Screen name="patient/accept-invite" options={{ presentation: "modal" }} />
        <Stack.Screen name="patient/doctor-directory" options={{ presentation: "modal" }} />
        <Stack.Screen name="patient/doctor-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="family/patient-overview" options={{ presentation: "modal" }} />
        <Stack.Screen name="doctor/mgm-referral" options={{ presentation: "modal" }} />
        <Stack.Screen name="doctor/mgm-my-network" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="doctor/insurance-fees" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="doctor/my-revenues" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/dashboard" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/mgm-dashboard" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/users" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/export" options={{ presentation: "modal" }} />
        <Stack.Screen name="admin/ranking" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/revenue-ranking" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/network-tree" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/pending-commissions" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="admin/platform-fees" options={{ presentation: "fullScreenModal" }} />
      </Stack>
    </AppProvider>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests: 1x para queries, 0x para mutations
            retry: (failureCount, error: any) => {
              // Não tentar novamente em erros de autenticação ou validação
              const msg = error?.message ?? "";
              if (msg.includes("Não autorizado") || msg.includes("inválido")) return false;
              return failureCount < 1;
            },
            // Stale time: 30 segundos (evita refetch desnecessário)
            staleTime: 30_000,
          },
          mutations: {
            // Não tentar novamente mutations (evita ações duplicadas)
            retry: false,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <OfflineSyncProvider>
              <AppContent />
              <StatusBar style="auto" />
            </OfflineSyncProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
