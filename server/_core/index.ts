import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

// ─── Allowed CORS origins ─────────────────────────────────────────────────────
// Para produção, adicione domínios via variável ALLOWED_ORIGINS (separados por vírgula)
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "exp://localhost:8081",
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
]);

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** Auth: máx 10 req / 15 min por IP — bloqueia força bruta */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
  skip: () => process.env.NODE_ENV === "test",
});

/** API geral: máx 300 req / min por IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de requisições atingido. Tente novamente em instantes." },
  skip: () => process.env.NODE_ENV === "test",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(port, () => { srv.close(() => resolve(true)); });
    srv.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Helmet: headers de segurança HTTP
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  // CORS: whitelist explícita
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  // Body limit: 5mb (era 50mb)
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // Rate limiting por rota
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.register", authLimiter);
  app.use("/api/trpc/auth.resetPassword", authLimiter);
  app.use("/api/trpc", apiLimiter);

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
