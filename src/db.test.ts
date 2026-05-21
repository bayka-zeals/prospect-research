import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ReportStore } from "./db.js";
import type { ProspectReport } from "./types.js";

test("ReportStore saves and reads reports", () => {
  const store = new ReportStore(mkdtempSync(join(tmpdir(), "zeals-reports-")));
  const report: ProspectReport = {
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
    proposals: [],
    evidence: [],
    caveats: []
  };

  store.save(report, "r1");
  assert.equal(store.list()[0].companyName, "Example");
  assert.equal(store.get("r1")?.websiteUrl, "https://example.jp");
  assert.equal(store.delete("r1"), true);
  assert.equal(store.get("r1"), null);
  store.close();
});
