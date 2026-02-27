import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const incomingSessionToken = getQueryParam(req, "sessionToken");
    const incomingUser = getQueryParam(req, "user");

    // If this is a redirect back from the server itself (native flow),
    // redirect to the frontend app with the session token in the URL hash
    if (incomingSessionToken) {
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      const redirectUrl = `${frontendUrl}/oauth/callback?sessionToken=${encodeURIComponent(incomingSessionToken)}${incomingUser ? `&user=${encodeURIComponent(incomingUser)}` : ""}`;
      console.log("[OAuth] Forwarding session token to frontend:", redirectUrl.substring(0, 80) + "...");
      res.redirect(302, redirectUrl);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Decode state to get the original redirectUri
      let decodedRedirectUri = "";
      try {
        decodedRedirectUri = Buffer.from(state, "base64").toString("utf-8");
      } catch {
        decodedRedirectUri = state;
      }

      console.log("[OAuth] Callback - decoded redirectUri:", decodedRedirectUri);

      // If the original redirectUri is a native deep link (not http/https),
      // redirect back to the app with code+state so the app can exchange the token itself
      const isNativeDeepLink = decodedRedirectUri && !decodedRedirectUri.startsWith("http");
      if (isNativeDeepLink) {
        console.log("[OAuth] Native deep link detected, redirecting back to app:", decodedRedirectUri);
        const appCallbackUrl = `${decodedRedirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        res.redirect(302, appCallbackUrl);
        return;
      }

      // Web flow: exchange code for token on the server
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Check if this is a native app request (has a native redirect in state)
      // For native apps, redirect back to the callback URL with sessionToken so
      // openAuthSessionAsync can capture it
      const callbackUrl = decodedRedirectUri || "";
      const isNativeCallback = callbackUrl.includes("/api/oauth/callback");

      if (isNativeCallback) {
        // Redirect back to the same URL with sessionToken so openAuthSessionAsync captures it
        const userJson = Buffer.from(JSON.stringify(buildUserResponse(user))).toString("base64");
        const successUrl = `${callbackUrl}?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userJson)}`;
        console.log("[OAuth] Redirecting native app back with session token");
        res.redirect(302, successUrl);
        return;
      }

      // Redirect to the frontend /oauth/callback with sessionToken
      // The frontend page will call establishSession to confirm the cookie is active
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      const userJson = Buffer.from(JSON.stringify(buildUserResponse(user))).toString("base64");
      const webCallbackUrl = `${frontendUrl}/oauth/callback?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userJson)}`;
      console.log("[OAuth] Redirecting web to frontend callback:", webCallbackUrl.substring(0, 80) + "...");
      res.redirect(302, webCallbackUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
