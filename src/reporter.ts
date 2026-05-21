import OpenAI from "openai";
import { config } from "./config.js";
import { cleanText, pageToEvidence, truncate } from "./extractor.js";
import { loadDefaultPrompts, renderPromptTemplate } from "./prompts.js";
import { openAiReportJsonSchema, prospectReportSchema } from "./reportSchema.js";
import type { CrawledPage, EvidenceItem, ProspectReport, ScoredProposal } from "./types.js";

export interface ReportPromptOptions {
  userPrompt?: string;
}

export async function buildReport(
  websiteUrl: string,
  pages: CrawledPage[],
  model = config.openAiModel,
  promptOptions: ReportPromptOptions = {}
): Promise<ProspectReport> {
  const evidence = pages.map(pageToEvidence);
  if (!config.openAiApiKey) {
    return buildHeuristicReport(websiteUrl, pages, evidence, model);
  }

  try {
    const generated = await buildOpenAiReport(websiteUrl, pages, evidence, model, promptOptions);
    return prospectReportSchema.parse(generated);
  } catch (error) {
    const fallback = buildHeuristicReport(websiteUrl, pages, evidence, model);
    fallback.caveats.unshift(`OpenAI generation failed; heuristic fallback was used. ${String(error).slice(0, 180)}`);
    return fallback;
  }
}

async function buildOpenAiReport(
  websiteUrl: string,
  pages: CrawledPage[],
  evidence: EvidenceItem[],
  model: string,
  promptOptions: ReportPromptOptions
): Promise<ProspectReport> {
  const client = new OpenAI({ apiKey: config.openAiApiKey });
  const defaultPrompts = loadDefaultPrompts();
  const sourcePack = pages.map((page, index) => ({
    evidenceId: evidence[index]?.id,
    url: page.url,
    title: page.title,
    sourceType: page.sourceType,
    description: page.description,
    headings: page.headings.slice(0, 12),
    ctas: page.ctas.slice(0, 12),
    excerpt: truncate(page.text, 2500)
  }));

  const userPrompt = renderPromptTemplate(promptOptions.userPrompt?.trim() || defaultPrompts.userPrompt, {
    websiteUrl,
    evidenceJson: JSON.stringify(sourcePack, null, 2)
  });

  const response = await (client as any).responses.create({
    model,
    input: [
      {
        role: "system",
        content: defaultPrompts.systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    text: {
      format: {
        type: "json_schema",
        ...openAiReportJsonSchema
      }
    }
  });

  const raw = response.output_text ?? response.output?.flatMap((item: any) => item.content ?? [])?.[0]?.text;
  if (!raw) throw new Error("OpenAI response did not include JSON text.");
  const parsed = JSON.parse(raw);

  return {
    ...parsed,
    websiteUrl,
    generatedAt: new Date().toISOString(),
    model,
    analysisMode: "openai",
    evidence
  };
}

export function buildHeuristicReport(
  websiteUrl: string,
  pages: CrawledPage[],
  evidence: EvidenceItem[],
  model: string
): ProspectReport {
  const officialPages = pages.filter((page) => page.sourceType === "official");
  const homepage = officialPages[0] ?? pages[0];
  const companyName = inferCompanyName(homepage, websiteUrl);
  const allCtas = [...new Set(officialPages.flatMap((page) => page.ctas))].slice(0, 10);
  const pageTitles = officialPages.map((page) => page.title).filter(Boolean).slice(0, 8);
  const socialCount = pages.filter((page) => page.sourceType === "social" || page.sourceType === "review").length;
  const evidenceIds = evidence.slice(0, 5).map((item) => item.id);

  const proposals: ScoredProposal[] = [
    {
      titleJa: "LINE友だち追加を入口にした離脱防止シナリオ",
      titleEn: "LINE friend-add recovery flow",
      descriptionJa:
        "予約・問い合わせ・購入前のユーザーにLINE友だち追加を提案し、検討理由に合わせたリマインド、FAQ、限定オファーを自動配信する。",
      descriptionEn:
        "Invite users to add LINE before booking, inquiry, or purchase, then automate reminders, FAQs, and offers based on their intent.",
      impact: 5,
      effort: 3,
      confidence: allCtas.length ? 4 : 3,
      evidenceIds
    },
    {
      titleJa: "FAQ/不安解消チャットで問い合わせ前の摩擦を下げる",
      titleEn: "FAQ chatbot to reduce pre-inquiry friction",
      descriptionJa:
        "料金、予約方法、来店前の不安、商品選びをチャットで即時回答し、最後に予約・購入・相談へ誘導する。",
      descriptionEn:
        "Answer pricing, booking, preparation, and product-choice questions instantly, then route users to booking, purchase, or consultation.",
      impact: 4,
      effort: 2,
      confidence: pageTitles.some((title) => /faq|よくある|料金|price/i.test(title)) ? 4 : 3,
      evidenceIds
    },
    {
      titleJa: "初回限定オファーとセグメント配信",
      titleEn: "First-time offer with segmented follow-up",
      descriptionJa:
        "初回ユーザー、比較検討中ユーザー、リピート見込みユーザーをLINE内で分岐し、それぞれに異なるオファーと事例を配信する。",
      descriptionEn:
        "Segment first-time, comparison-stage, and repeat-potential users in LINE, then send tailored offers and proof points.",
      impact: 4,
      effort: 3,
      confidence: 3,
      evidenceIds
    }
  ];

  return prospectReportSchema.parse({
    companyName,
    websiteUrl,
    generatedAt: new Date().toISOString(),
    model,
    analysisMode: "heuristic",
    executiveSummaryJa: `${companyName}は、公式サイト上のCTAや商品・サービス情報を起点に、LINEで検討中ユーザーを捕捉し、予約・問い合わせ・購入への再誘導を強化できる可能性があります。`,
    executiveSummaryEn: `${companyName} appears to have opportunities to capture undecided visitors through LINE and guide them back to booking, inquiry, or purchase flows.`,
    companyOverview: `${companyName} / ${new URL(websiteUrl).hostname}. Evidence is based on public official pages${
      socialCount ? " plus directional public social/review signals" : ""
    }.`,
    productServiceSummary: summarizeList(
      [
        homepage?.description,
        ...pageTitles,
        ...officialPages.flatMap((page) => page.headings.slice(0, 2))
      ],
      "The site presents consumer-facing products or services, but more detailed positioning should be verified manually."
    ),
    targetCustomers:
      "Likely customers are Japanese consumers comparing options online, checking price/service details, and deciding whether to book, inquire, visit, or purchase.",
    likelyCustomerJourney:
      "Discovery through search/social, product or service comparison on the website, FAQ or price confirmation, then conversion via reservation, inquiry, purchase, store visit, or LINE/contact CTA.",
    currentConversionPath: allCtas.length
      ? `Visible conversion cues include: ${allCtas.join(", ")}.`
      : "The crawler did not find strong visible CTA text; manual review should confirm the primary conversion path.",
    observedPainPoints: [
      "Users may leave while comparing price, availability, service differences, or trust signals.",
      "Visitors who are not ready to convert immediately may not have a low-friction follow-up path.",
      "FAQ and consultation needs can create friction before reservation, inquiry, or purchase."
    ],
    lineOpportunityAreas: [
      "Capture undecided visitors as LINE friends before they leave.",
      "Automate FAQ, product/service selection, and consultation triage.",
      "Send segmented reminders, limited offers, and proof points after site visits."
    ],
    proposals,
    evidence,
    caveats: [
      "Heuristic report generated because OPENAI_API_KEY is not configured.",
      "Social and review signals, when present, are directional and should be verified before client-facing claims.",
      "The crawler only inspected public pages available during this run."
    ]
  });
}

function inferCompanyName(page: CrawledPage | undefined, websiteUrl: string): string {
  const title = cleanText(page?.title ?? "");
  if (title) {
    return title
      .split(/[｜|ー\-–—]/)[0]
      .replace(/公式サイト|公式|ホームページ|TOP|トップ/gi, "")
      .trim()
      .slice(0, 80);
  }
  return new URL(websiteUrl).hostname.replace(/^www\./, "");
}

function summarizeList(values: Array<string | undefined>, fallback: string): string {
  const cleaned = [...new Set(values.map((value) => cleanText(value ?? "")).filter(Boolean))].slice(0, 8);
  return cleaned.length ? cleaned.join(" / ") : fallback;
}
