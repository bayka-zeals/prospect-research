export type Confidence = "high" | "medium" | "low";

export interface EvidenceItem {
  id: string;
  url: string;
  title: string;
  type: "official" | "social" | "review" | "news" | "search" | "other";
  extractedAt: string;
  facts: string[];
  confidence: Confidence;
}

export interface CrawledPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  ctas: string[];
  links: string[];
  text: string;
  sourceType: EvidenceItem["type"];
  fetchedAt: string;
}

export interface ScoredProposal {
  titleJa: string;
  titleEn: string;
  descriptionJa: string;
  descriptionEn: string;
  impact: number;
  effort: number;
  confidence: number;
  evidenceIds: string[];
}

export interface ProspectReport {
  companyName: string;
  websiteUrl: string;
  generatedAt: string;
  model: string;
  analysisMode: "openai" | "heuristic";
  executiveSummaryJa: string;
  executiveSummaryEn: string;
  companyOverview: string;
  productServiceSummary: string;
  targetCustomers: string;
  likelyCustomerJourney: string;
  currentConversionPath: string;
  observedPainPoints: string[];
  lineOpportunityAreas: string[];
  proposals: ScoredProposal[];
  evidence: EvidenceItem[];
  caveats: string[];
}

export interface SavedReport {
  id: string;
  url: string;
  companyName: string;
  generatedAt: string;
  model: string;
  analysisMode: ProspectReport["analysisMode"];
}

export interface GenerateReportInput {
  url: string;
  maxPages?: number;
  model?: string;
}
