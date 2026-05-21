import { z } from "zod";

export const scoredProposalSchema = z.object({
  titleJa: z.string().min(1),
  titleEn: z.string().min(1),
  descriptionJa: z.string().min(1),
  descriptionEn: z.string().min(1),
  impact: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
  evidenceIds: z.array(z.string()).default([])
});

export const prospectReportSchema = z.object({
  companyName: z.string().min(1),
  websiteUrl: z.string().url(),
  generatedAt: z.string(),
  model: z.string(),
  analysisMode: z.enum(["openai", "heuristic"]),
  executiveSummaryJa: z.string().min(1),
  executiveSummaryEn: z.string().min(1),
  companyOverview: z.string().min(1),
  productServiceSummary: z.string().min(1),
  targetCustomers: z.string().min(1),
  likelyCustomerJourney: z.string().min(1),
  currentConversionPath: z.string().min(1),
  observedPainPoints: z.array(z.string()).min(1),
  lineOpportunityAreas: z.array(z.string()).min(1),
  proposals: z.array(scoredProposalSchema).min(3).max(5),
  evidence: z.array(
    z.object({
      id: z.string(),
      url: z.string().url(),
      title: z.string(),
      type: z.enum(["official", "social", "review", "news", "search", "other"]),
      extractedAt: z.string(),
      facts: z.array(z.string()),
      confidence: z.enum(["high", "medium", "low"])
    })
  ),
  caveats: z.array(z.string()).default([])
});

export const openAiReportJsonSchema = {
  name: "zeals_prospect_report",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "companyName",
      "executiveSummaryJa",
      "executiveSummaryEn",
      "companyOverview",
      "productServiceSummary",
      "targetCustomers",
      "likelyCustomerJourney",
      "currentConversionPath",
      "observedPainPoints",
      "lineOpportunityAreas",
      "proposals",
      "caveats"
    ],
    properties: {
      companyName: { type: "string" },
      executiveSummaryJa: { type: "string" },
      executiveSummaryEn: { type: "string" },
      companyOverview: { type: "string" },
      productServiceSummary: { type: "string" },
      targetCustomers: { type: "string" },
      likelyCustomerJourney: { type: "string" },
      currentConversionPath: { type: "string" },
      observedPainPoints: { type: "array", minItems: 1, items: { type: "string" } },
      lineOpportunityAreas: { type: "array", minItems: 1, items: { type: "string" } },
      proposals: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "titleJa",
            "titleEn",
            "descriptionJa",
            "descriptionEn",
            "impact",
            "effort",
            "confidence",
            "evidenceIds"
          ],
          properties: {
            titleJa: { type: "string" },
            titleEn: { type: "string" },
            descriptionJa: { type: "string" },
            descriptionEn: { type: "string" },
            impact: { type: "integer", minimum: 1, maximum: 5 },
            effort: { type: "integer", minimum: 1, maximum: 5 },
            confidence: { type: "integer", minimum: 1, maximum: 5 },
            evidenceIds: { type: "array", items: { type: "string" } }
          }
        }
      },
      caveats: { type: "array", items: { type: "string" } }
    }
  },
  strict: true
} as const;
