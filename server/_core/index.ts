import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiRouter } from "../apiRest";
import { uploadChunkedRouter } from "../uploadChunked";
import { whatsappWebhookRouter } from "../whatsappWebhook";
import { verificarEEnviarLembretes } from "../lembretesService";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import * as db from "../db";
import { sdk } from "./sdk";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Lista usuários do banco pra tela de dev login
  app.get("/api/dev-users", async (req, res) => {
    if (process.env.NODE_ENV !== "development") return res.status(404).send("Not found");
    try {
      const rows = await db.listUsers();
      res.json(rows);
    } catch { res.json([]); }
  });

  // Rota de Login de Desenvolvedor (Bypass) — apenas em desenvolvimento
  app.get("/api/dev-login", async (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).send("Not found");
    }
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
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
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

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Scheduler de lembretes de perícia — executa ao iniciar e a cada hora
  verificarEEnviarLembretes().catch(console.error);
  setInterval(() => {
    verificarEEnviarLembretes().catch(console.error);
  }, 60 * 60 * 1000);
}

startServer().catch(console.error);
