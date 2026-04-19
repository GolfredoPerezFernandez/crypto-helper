/*
 * WHAT IS THIS FILE?
 *
 * It's the entry point for the Express HTTP server when building for production.
 */
import {
  createQwikCity,
  type PlatformNode,
} from "@builder.io/qwik-city/middleware/node";
import "dotenv/config";
import qwikCityPlan from "@qwik-city-plan";
import { manifest } from "@qwik-client-manifest";
import render from "./entry.ssr";
import express from "express";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  registerCryptoGhostRoutes,
  scheduleCryptoGhostJobs,
} from "./server/register-crypto-ghost-express";

declare global {
  interface QwikCityPlatform extends PlatformNode { }
}

const distDir = join(fileURLToPath(import.meta.url), "..", "..", "dist");
const buildDir = join(distDir, "build");
const PORT = process.env.PORT ?? 3000;

const { router, notFound } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
});

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(`/build`, express.static(buildDir, { immutable: true, maxAge: "1y" }));
app.use(express.static(distDir, { redirect: false }));

app.use(
  "/api/webhook",
  express.json({ limit: "4mb" }),
);
app.use("/api/internal", express.json({ limit: "32kb" }));

registerCryptoGhostRoutes(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) =>
    req.path.startsWith("/api/stream/") ||
    req.path.startsWith("/api/crypto/") ||
    req.path.startsWith("/api/push/") ||
    req.path.startsWith("/build/"),
});
app.use(limiter);

app.use(router);
app.use(notFound);

const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server started: http://0.0.0.0:${PORT}/`);
  scheduleCryptoGhostJobs();
});
