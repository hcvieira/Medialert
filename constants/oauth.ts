import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as ReactNative from "react-native";
import Constants from "expo-constants";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.medialert.t20260221144757";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  // If API_BASE_URL is set via env var, use it (works on both native and web)
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // On native (Expo Go), try to get the URL from app.config.ts extra field
  // This is set at build time from EXPO_PUBLIC_API_BASE_URL env var
  const extraApiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (extraApiBaseUrl) {
    return extraApiBaseUrl.replace(/\/$/, "");
  }

  // Fallback to empty (will use relative URL)
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 * - Web: uses API server callback endpoint
 * - Native: uses the API server mobile callback endpoint (avoids custom scheme issues in Expo Go)
 */
export const getRedirectUri = () => {
  const apiBaseUrl = getApiBaseUrl();

  if (ReactNative.Platform.OS === "web") {
    return `${apiBaseUrl}/api/oauth/callback`;
  } else {
    // For native (including Expo Go), use the server's mobile callback endpoint.
    // The server will return JSON with the session token, and we capture the
    // redirect URL via openAuthSessionAsync.
    return `${apiBaseUrl}/api/oauth/callback`;
  }
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), uses WebBrowser.openAuthSessionAsync which:
 * - Opens ASWebAuthenticationSession on iOS (secure, shares cookies)
 * - Uses Chrome Custom Tabs on Android
 * - Handles the redirect back automatically
 *
 * On web, this simply redirects to the login URL.
 *
 * @returns The session token if successful, null otherwise.
 */
export async function startOAuthLogin(): Promise<{ sessionToken: string; user: any } | null> {
  const loginUrl = getLoginUrl();

  if (ReactNative.Platform.OS === "web") {
    // On web, just redirect
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  // On native, use openAuthSessionAsync to handle the OAuth flow
  // The redirectUrl here is used to detect when the auth is complete
  // We use the API server callback URL as the redirect
  const apiBaseUrl = getApiBaseUrl();
  const callbackBaseUrl = `${apiBaseUrl}/api/oauth/callback`;

  console.log("[OAuth] Starting auth session with URL:", loginUrl);
  console.log("[OAuth] Callback base URL:", callbackBaseUrl);

  try {
    // Pass callbackBaseUrl as the redirectUrl so ASWebAuthenticationSession (iOS)
    // and Chrome Custom Tabs (Android) know when to close and return to the app.
    // The server will redirect back to this URL with ?sessionToken=...
    const result = await WebBrowser.openAuthSessionAsync(loginUrl, callbackBaseUrl);
    console.log("[OAuth] Auth session result:", result.type);

    if (result.type === "success" && result.url) {
      console.log("[OAuth] Auth session URL:", result.url);
      try {
        const url = new URL(result.url);
        const sessionToken = url.searchParams.get("sessionToken");
        const userEncoded = url.searchParams.get("user");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (sessionToken) {
          console.log("[OAuth] Session token found in redirect URL");
          let user = null;
          if (userEncoded) {
            try {
              const userJson = typeof atob !== "undefined"
                ? atob(userEncoded)
                : Buffer.from(userEncoded, "base64").toString("utf-8");
              user = JSON.parse(userJson);
            } catch (e) {
              console.warn("[OAuth] Failed to decode user info:", e);
            }
          }
          return { sessionToken, user };
        }

        if (code && state) {
          console.log("[OAuth] Code and state found, exchanging for token via mobile endpoint...");
          const exchangeUrl = `${apiBaseUrl}/api/oauth/mobile?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
          const response = await fetch(exchangeUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.app_session_id) {
              return { sessionToken: data.app_session_id, user: data.user };
            }
          }
        }
      } catch (e) {
        console.error("[OAuth] Failed to parse redirect URL:", e);
      }
    }

    return null;
  } catch (error) {
    console.error("[OAuth] Failed to open auth session:", error);
    return null;
  }
}
