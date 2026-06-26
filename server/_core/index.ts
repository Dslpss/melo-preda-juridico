import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiRouter } from "../apiRest";
import { uploadChunkedRouter } from "../uploadChunked";
import { whatsappWebhookRouter } from "../whatsappWebhook";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Rota de Login de Desenvolvedor (Bypass) com suporte a múltiplos perfis de teste
  app.get("/api/dev-login", async (req, res) => {
    const userId = (req.query.id as string) || "123";
    const openId = `dev-user-${userId}`;
    const name = (req.query.name as string) || `Desenvolvedor ${userId}`;
    const email = (req.query.email as string) || `dev-${userId}@exemplo.com`;
    const role = (req.query.role === "admin" || req.query.role === "user") ? req.query.role : "admin";

    try {
      await db.upsertUser({
        openId,
        name,
        email,
        role,
        profileCompleted: 1
      });
      const token = await sdk.createSessionToken(openId, { name });
      res.cookie(COOKIE_NAME, token, { 
        maxAge: ONE_YEAR_MS, 
        httpOnly: true,
        path: '/'
      });
      res.redirect("/");
    } catch (error) {
      console.error("[DevLogin] Failed:", error);
      res.status(500).send("Erro no login de desenvolvedor");
    }
  });

  // API REST pública do Agente IA
  app.use('/api/v1', apiRouter);
  // Upload chunked (multipart, sem limite de tamanho)
  app.use('/api/upload', uploadChunkedRouter);
  // WhatsApp webhook (Evolution API)
  app.use('/api/whatsapp', whatsappWebhookRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
