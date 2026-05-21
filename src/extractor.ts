import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { CrawledPage, EvidenceItem } from "./types.js";

const CTA_PATTERN =
  /(予約|購入|申し込|問い合わせ|資料請求|無料|相談|登録|会員|LINE|友だち|診断|見積|体験|予約する|buy|book|reserve|contact|sign up|subscribe|download|trial)/i;

export function extractPage(url: string, html: string, sourceType: EvidenceItem["type"] = "official"): CrawledPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();

  const title = cleanText($("title").first().text() || $("h1").first().text() || new URL(url).hostname);
  const description = cleanText(
    $('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? ""
  );
  const headings = $("h1,h2,h3")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 24);
  const links = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href");
      if (!href) return "";
      try {
        return new URL(href, url).toString();
      } catch {
        return "";
      }
    })
    .get()
    .filter(Boolean);
  const ctas = $("a,button,input[type='submit']")
    .map((_, el) => cleanText($(el).text() || $(el).attr("value") || $(el).attr("aria-label") || ""))
    .get()
    .filter((text) => text.length > 1 && CTA_PATTERN.test(text))
    .slice(0, 30);

  const articleText = readableText(url, html);
  const bodyText = cleanText($("body").text());
  const text = truncate(articleText.length > bodyText.length * 0.35 ? articleText : bodyText, 12000);

  return {
    url,
    title,
    description,
    headings,
    ctas: [...new Set(ctas)],
    links: [...new Set(links)],
    text,
    sourceType,
    fetchedAt: new Date().toISOString()
  };
}

export function pageToEvidence(page: CrawledPage, index: number): EvidenceItem {
  const facts = [
    page.description,
    ...page.headings.slice(0, 5),
    page.ctas.length ? `Visible CTA examples: ${page.ctas.slice(0, 5).join(", ")}` : ""
  ]
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 8);

  return {
    id: `E${index + 1}`,
    url: page.url,
    title: page.title,
    type: page.sourceType,
    extractedAt: page.fetchedAt,
    facts,
    confidence: page.sourceType === "official" ? "high" : "medium"
  };
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

export function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function readableText(url: string, html: string): string {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return cleanText(article?.textContent ?? "");
  } catch {
    return "";
  }
}
