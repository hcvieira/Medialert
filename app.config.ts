// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "space.manus.medialert.t20260221144757";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "MediAlert",
  appSlug: "medialert",
  // API base URL - read from environment so it works in both dev and production
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  oauthPortalUrl: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://private-us-east-1.manuscdn.com/sessionFile/o2rgabYR5n2Q7FCvZ4AorA/sandbox/gcvaK5xcsAdfaToG1xEs5Q-img-1_1771703381000_na1fn_bWVkaWFsZXJ0LWljb24.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvbzJyZ2FiWVI1bjJRN0ZDdlo0QW9yQS9zYW5kYm94L2djdmFLNXhjc0FkZmFUb0cxeEVzNVEtaW1nLTFfMTc3MTcwMzM4MTAwMF9uYTFmbl9iV1ZrYVdGc1pYSjBMV2xqYjI0LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=nhRuQ6vpE-8TFWxUe7ThDoF-VDq8N48nQbEfPU0QEfFQR643BmHiwMj7qhWvdDL8X0NRNEVq-lmJK0PGZhylwdDktI~alVcmERE~hgaiayt7IcBqUkajeNFkVqjJFGBvOtbGfVqBPflsDHW0br-TYxUxoYQLOx5ivkWT5DRJY8u6R22-ecJruGsQsEFi9A0fqwiTYdrHbOpwv-4bcIs7aWz-1CsQI6TC~mrWjZMcT2MIdaggbjHqtVQWDQmmNbMrpTczE0TjTDcBPvmWPxnl9AcpbB8wG0iNhrCb8cgEaefoQPDlqX4Chcvlx5b53WB6aAPQgnKoVqLHu9iamY9~Mg__",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "react-native-maps",
    [
      "expo-camera",
      {
        "cameraPermission": "Permitir que o MediAlert acesse a c\u00e2mera para escanear QR Codes de convite."
      }
    ],
    [
      "expo-calendar",
      {
        "calendarPermission": "O MediAlert precisa acessar seu calendário para salvar consultas."
      }
    ],
    [
      "expo-local-authentication",
      {
        "faceIDPermission": "Permitir que o MediAlert use o Face ID para proteger o acesso ao aplicativo."
      }
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
   extra: {
    apiBaseUrl: env.apiBaseUrl,
    oauthPortalUrl: env.oauthPortalUrl,
    appId: env.appId,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};
export default config;
