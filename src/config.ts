import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadDotEnv() {
  const envPath = join(process.cwd(), ".env");
  try {
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env is optional for local UI testing.
  }
}

loadDotEnv();

export const config = {
  port: Number(process.env.PORT ?? 4177),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  geminiModels: [
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ],
  maxCrawlPages: Number(process.env.MAX_CRAWL_PAGES ?? 18),
  dataDir: process.env.DATA_DIR ?? "data",
  userAgent:
    process.env.CRAWLER_USER_AGENT ??
    "ZEALSProspectResearchBot/0.1 (+https://zeals.co.jp; local research prototype)"
};
