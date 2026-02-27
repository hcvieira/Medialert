import { useEffect, useRef } from "react";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, ActivityIndicator, View } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuthContext } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const router = useRouter();
  const { user, loading, logout } = useAuthContext();
  const redirectedRef = useRef(false);

  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: !!user,
    // No retry — if profile fails once, treat it as stale session immediately
    retry: false,
    // Short stale time to ensure fresh data
    staleTime: 10_000,
  });

  useEffect(() => {
    if (loading) return;
    if (redirectedRef.current) return;

    if (!user) {
      redirectedRef.current = true;
      router.replace("/welcome" as any);
      return;
    }

    if (profileQuery.isLoading) return;

    // 401 / profile not found → session is stale, force logout and redirect
    if (profileQuery.isError || !profileQuery.data) {
      redirectedRef.current = true;
      // Clear stale session from SecureStore so next app open goes to login
      logout().finally(() => {
        router.replace("/welcome" as any);
      });
      return;
    }

    redirectedRef.current = true;
    if ((profileQuery.data as any).role === "admin") {
      router.replace("/admin/dashboard" as any);
    } else if (!profileQuery.data.appRole) {
      router.replace("/onboarding" as any);
    } else if (profileQuery.data.appRole === "doctor") {
      router.replace("/doctor/dashboard" as any);
    }
    // patient/caregiver stays on tabs — no redirect needed
  }, [user, loading, profileQuery.isLoading, profileQuery.isError, profileQuery.data, router, logout]);

  // Safety timeout: if still loading after 8 seconds, force redirect to welcome
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        logout().finally(() => {
          router.replace("/welcome" as any);
        });
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [logout, router]);

  if (loading || (user && profileQuery.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoje",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="pill.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Remédios",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cross.case.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Familiares",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
