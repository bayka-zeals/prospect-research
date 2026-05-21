import test from "node:test";
import assert from "node:assert/strict";
import { prospectReportSchema } from "./reportSchema.js";

test("prospectReportSchema rejects proposal scores outside 1-5", () => {
  const result = prospectReportSchema.safeParse({
    companyName: "Example",
    websiteUrl: "https://example.jp",
    generatedAt: new Date().toISOString(),
    model: "test",
    analysisMode: "heuristic",
    executiveSummaryJa: "要約",
    executiveSummaryEn: "Summary",
    companyOverview: "Overview",
    productServiceSummary: "Products",
    targetCustomers: "Customers",
    likelyCustomerJourney: "Journey",
    currentConversionPath: "Path",
    observedPainPoints: ["Pain"],
    lineOpportunityAreas: ["Area"],
    proposals: [
      {
        titleJa: "A",
        titleEn: "A",
        descriptionJa: "A",
        descriptionEn: "A",
        impact: 6,
        effort: 1,
        confidence: 1,
        evidenceIds: []
      },
      {
        titleJa: "B",
        titleEn: "B",
        descriptionJa: "B",
        descriptionEn: "B",
        impact: 1,
        effort: 1,
        confidence: 1,
        evidenceIds: []
      },
      {
        titleJa: "C",
        titleEn: "C",
        descriptionJa: "C",
        descriptionEn: "C",
        impact: 1,
        effort: 1,
        confidence: 1,
        evidenceIds: []
      }
    ],
    evidence: [],
    caveats: []
  });

  assert.equal(result.success, false);
});
