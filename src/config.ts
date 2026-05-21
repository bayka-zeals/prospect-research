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
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  openAiModels: ["gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.4", "gpt-5.5"],
  maxCrawlPages: Number(process.env.MAX_CRAWL_PAGES ?? 18),
  dataDir: process.env.DATA_DIR ?? "data",
  userAgent:
    process.env.CRAWLER_USER_AGENT ??
    "ZEALSProspectResearchBot/0.1 (+https://zeals.co.jp; local research prototype)"
};
