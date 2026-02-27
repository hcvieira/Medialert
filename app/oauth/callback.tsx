import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/lib/auth-context";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const { refresh } = useAuthContext();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    sessionToken?: string;
    user?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      console.log("[OAuth] Callback handler triggered");
      console.log("[OAuth] Params received:", {
        code: params.code ? "present" : "missing",
        state: params.state ? "present" : "missing",
        error: params.error,
        sessionToken: params.sessionToken ? "present" : "missing",
        user: params.user ? "present" : "missing",
      });
      try {
        // Check for sessionToken in params first (web OAuth callback from server redirect)
        if (params.sessionToken) {
          console.log("[OAuth] Session token found in params");
          // Store session token for both web (localStorage) and native (SecureStore)
          await Auth.setSessionToken(params.sessionToken);
          console.log("[OAuth] Session token stored successfully");

          // Decode and store user info if available
          if (params.user) {
            try {
              const userJson =
                typeof atob !== "undefined"
                  ? atob(params.user)
                  : Buffer.from(params.user, "base64").toString("utf-8");
              const userData = JSON.parse(userJson);
              const userInfo: Auth.User = {
                id: userData.id,
                openId: userData.openId,
                name: userData.name,
                email: userData.email,
                loginMethod: userData.loginMethod,
                lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
              };
              await Auth.setUserInfo(userInfo);
              console.log("[OAuth] User info stored:", userInfo.email);
            } catch (err) {
              console.error("[OAuth] Failed to parse user data:", err);
            }
          }

          setStatus("success");
          console.log("[OAuth] Authentication successful, redirecting to home...");
          await refresh();
          router.replace("/(tabs)");
          return;
        }

        // Get URL from params or Linking
        let url: string | null = null;

        if (params.code || params.state || params.error) {
          console.log("[OAuth] Found params in route params");
          const urlParams = new URLSearchParams();
          if (params.code) urlParams.set("code", params.code);
          if (params.state) urlParams.set("state", params.state);
          if (params.error) urlParams.set("error", params.error);
          url = `?${urlParams.toString()}`;
        } else {
          console.log("[OAuth] No params found, checking Linking.getInitialURL()...");
          const initialUrl = await Linking.getInitialURL();
          console.log("[OAuth] Linking.getInitialURL():", initialUrl);
          if (initialUrl) {
            url = initialUrl;
          }
        }

        // Check for error
        const error =
          params.error || (url ? new URL(url, "http://dummy").searchParams.get("error") : null);
        if (error) {
          console.error("[OAuth] Error parameter found:", error);
          setStatus("error");
          setErrorMessage(error || "OAuth error occurred");
          return;
        }

        // Extract code, state, sessionToken from URL
        let code: string | null = null;
        let state: string | null = null;
        let sessionToken: string | null = null;

        if (params.code && params.state) {
          code = params.code;
          state = params.state;
        } else if (url) {
          try {
            const urlObj = new URL(url);
            code = urlObj.searchParams.get("code");
            state = urlObj.searchParams.get("state");
            sessionToken = urlObj.searchParams.get("sessionToken");
          } catch {
            const match = url.match(/[?&](code|state|sessionToken)=([^&]+)/g);
            if (match) {
              match.forEach((param) => {
                const [key, value] = param.substring(1).split("=");
                if (key === "code") code = decodeURIComponent(value);
                if (key === "state") state = decodeURIComponent(value);
                if (key === "sessionToken") sessionToken = decodeURIComponent(value);
              });
            }
          }
        }

        // If we have sessionToken from URL, store and redirect
        if (sessionToken) {
          console.log("[OAuth] Session token found in URL");
          await Auth.setSessionToken(sessionToken);
          console.log("[OAuth] Session token stored successfully");
          setStatus("success");
          await refresh();
          router.replace("/(tabs)");
          return;
        }

        // Exchange code for session token (native flow via /api/oauth/mobile)
        if (!code || !state) {
          console.error("[OAuth] Missing code or state parameter");
          setStatus("error");
          setErrorMessage("Missing code or state parameter");
          return;
        }

        console.log("[OAuth] Exchanging code for session token...");
        const result = await Api.exchangeOAuthCode(code, state);

        if (result.sessionToken) {
          await Auth.setSessionToken(result.sessionToken);
          console.log("[OAuth] Session token stored successfully");

          if (result.user) {
            const userInfo: Auth.User = {
              id: result.user.id,
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
            console.log("[OAuth] User info stored:", userInfo.email);
          }

          setStatus("success");
          await refresh();
          router.replace("/(tabs)");
        } else {
          console.error("[OAuth] No session token in result");
          setStatus("error");
          setErrorMessage("No session token received");
        }
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to complete authentication",
        );
      }
    };

    handleCallback();
  }, [params.code, params.state, params.error, params.sessionToken, params.user, router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Concluindo autenticação...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Autenticação realizada com sucesso!
            </Text>
            <Text className="text-sm leading-5 text-center text-muted">
              Redirecionando...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">
              Falha na autenticação
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
