import robotsParser from "robots-parser";
import { chromium } from "playwright";
import { config } from "./config.js";
import { extractPage } from "./extractor.js";
import type { CrawledPage, EvidenceItem } from "./types.js";
import { isLikelyUsefulPage, isSameRegistrableHost, normalizeUrl, scoreLink } from "./urlUtils.js";

interface RobotsCacheEntry {
  checkedAt: number;
  parser: ReturnType<typeof robotsParser> | null;
}

const robotsCache = new Map<string, RobotsCacheEntry>();
const SOCIAL_OR_REVIEW_HOSTS = [
  "instagram.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "line.me",
  "lin.ee",
  "youtube.com",
  "tiktok.com",
  "google.com",
  "maps.app.goo.gl",
  "hotpepper.jp",
  "rakuten.co.jp",
  "yahoo.co.jp",
  "tabelog.com",
  "ekiten.jp",
  "minhyo.jp"
];

export async function crawlProspectSite(rootInput: string, maxPages: number): Promise<CrawledPage[]> {
  const rootUrl = normalizeUrl(rootInput);
  const visited = new Set<string>();
  const queue: Array<{ url: string; label: string; score: number }> = [{ url: rootUrl, label: "home", score: 999 }];
  const pages: CrawledPage[] = [];

  while (queue.length && pages.length < maxPages) {
    queue.sort((a, b) => b.score - a.score);
    const next = queue.shift();
    if (!next) break;

    const url = normalizeUrl(next.url);
    if (visited.has(url) || !isLikelyUsefulPage(url) || !isSameRegistrableHost(url, rootUrl)) continue;
    visited.add(url);

    if (!(await isAllowedByRobots(url))) continue;
    const html = await fetchHtml(url);
    if (!html) continue;

    const page = extractPage(url, html, "official");
    pages.push(page);

    for (const link of page.links) {
      try {
        const normalized = normalizeUrl(link);
        if (!visited.has(normalized) && isSameRegistrableHost(normalized, rootUrl) && isLikelyUsefulPage(normalized)) {
          queue.push({ url: normalized, label: link, score: scoreLink(normalized, link) });
        }
      } catch {
        // Ignore malformed links discovered on the page.
      }
    }

    await wait(350);
  }

  const publicSignals = discoverPublicSignalPages(pages).slice(0, 8);
  for (const signal of publicSignals) {
    if (pages.length >= maxPages + 6) break;
    if (visited.has(signal.url)) continue;
    const html = await fetchHtml(signal.url, false);
    if (!html) continue;
    pages.push(extractPage(signal.url, html, signal.type));
    visited.add(signal.url);
    await wait(350);
  }

  return pages;
}

export function discoverPublicSignalPages(pages: CrawledPage[]): Array<{ url: string; type: EvidenceItem["type"] }> {
  const links = pages.flatMap((page) => page.links);
  const signals: Array<{ url: string; type: EvidenceItem["type"] }> = [];
  const seen = new Set<string>();

  for (const link of links) {
    let parsed: URL;
    try {
      parsed = new URL(link);
    } catch {
      continue;
    }
    const host = parsed.hostname.replace(/^www\./, "");
    if (!SOCIAL_OR_REVIEW_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) continue;
    const type: EvidenceItem["type"] =
      host.includes("hotpepper") ||
      host.includes("tabelog") ||
      host.includes("ekiten") ||
      host.includes("minhyo") ||
      host.includes("google")
        ? "review"
        : "social";
    const normalized = parsed.toString();
    if (!seen.has(normalized)) {
      signals.push({ url: normalized, type });
      seen.add(normalized);
    }
  }

  return signals;
}

async function fetchHtml(url: string, allowBrowserFallback = true): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": config.userAgent,
        accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000)
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("html")) return null;
    const html = await response.text();
    if (allowBrowserFallback && shouldTryBrowser(html)) {
      const rendered = await fetchWithPlaywright(url);
      return rendered ?? html;
    }
    return html;
  } catch {
    if (!allowBrowserFallback) return null;
    return fetchWithPlaywright(url);
  }
}

async function fetchWithPlaywright(url: string): Promise<string | null> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: config.userAgent });
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    return await page.content();
  } catch {
    return null;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function shouldTryBrowser(html: string): boolean {
  const textLikeLength = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").length;
  return textLikeLength < 1400 && /__next|nuxt|app-root|enable javascript|javascriptを有効/i.test(html);
}

async function isAllowedByRobots(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const origin = parsed.origin;
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.checkedAt < 1000 * 60 * 60) {
    return cached.parser?.isAllowed(url, config.userAgent) ?? true;
  }

  try {
    const robotsUrl = `${origin}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: { "user-agent": config.userAgent },
      signal: AbortSignal.timeout(7000)
    });
    const text = response.ok ? await response.text() : "";
    const parser = robotsParser(robotsUrl, text);
    robotsCache.set(origin, { checkedAt: Date.now(), parser });
    return parser.isAllowed(url, config.userAgent) ?? true;
  } catch {
    robotsCache.set(origin, { checkedAt: Date.now(), parser: null });
    return true;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
