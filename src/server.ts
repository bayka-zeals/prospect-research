import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import { config } from "./config.js";
import { crawlProspectSite } from "./crawler.js";
import { ReportStore } from "./db.js";
import { loadDefaultPrompts } from "./prompts.js";
import { buildReport } from "./reporter.js";
import { normalizeUrl } from "./urlUtils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const devPublicDir = join(__dirname, "..", "public");
const builtPublicDir = join(__dirname, "..", "..", "public");
const publicDir = existsSync(devPublicDir) ? devPublicDir : builtPublicDir;
const store = new ReportStore(config.dataDir);

const generateInputSchema = z.object({
  url: z.string().min(3),
  maxPages: z.number().int().min(1).max(30).optional(),
  model: z.string().min(1).optional(),
  prompt: z.string().min(20).max(20000).optional()
});

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(config.geminiApiKey),
    defaultModel: config.geminiModel,
    availableModels: config.geminiModels
  });
});

app.get("/api/prompts/default", (_req, res) => {
  const prompts = loadDefaultPrompts();
  res.json({ userPrompt: prompts.userPrompt });
});

app.get("/api/reports", (_req, res) => {
  res.json({ reports: store.list() });
});

app.get("/api/reports/:id", (req, res) => {
  const report = store.get(req.params.id);
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  res.json({ report });
});

app.delete("/api/reports/:id", (req, res) => {
  res.json({ deleted: store.delete(req.params.id) });
});

app.post("/api/reports", async (req, res) => {
  const parsed = generateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
    return;
  }

  try {
    const url = normalizeUrl(parsed.data.url);
    const maxPages = parsed.data.maxPages ?? config.maxCrawlPages;
    const pages = await crawlProspectSite(url, maxPages);
    if (!pages.length) {
      res.status(422).json({ error: "No public HTML pages could be crawled for this URL." });
      return;
    }

    const report = await buildReport(url, pages, parsed.data.model ?? config.geminiModel, {
      userPrompt: parsed.data.prompt
    });
    const saved = store.save(report, randomUUID());
    res.status(201).json({ reportId: saved.id, report, crawledPages: pages.length });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate report.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(join(publicDir, "index.html"));
});

const server = app.listen(config.port, () => {
  console.log(`ZEALS Prospect Research running at http://localhost:${config.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
