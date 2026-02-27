import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// Set notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // Set Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medialert", {
      name: "MediAlert",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1A7FE8",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[Push] Permission not granted");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e) {
    console.warn("[Push] Failed to get push token:", e);
    return null;
  }
}

export function usePushToken() {
  const { user } = useAuth();
  const registerToken = trpc.user.registerPushToken.useMutation();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    registered.current = true;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        try {
          await registerToken.mutateAsync({ token });
          console.log("[Push] Token registered:", token.substring(0, 30) + "...");
        } catch (e) {
          console.warn("[Push] Failed to register token:", e);
        }
      }
    })();
  }, [user]);
}
