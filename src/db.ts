import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ProspectReport, SavedReport } from "./types.js";

export class ReportStore {
  private db: DatabaseSync;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(join(dataDir, "reports.sqlite"));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        company_name TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        model TEXT NOT NULL,
        analysis_mode TEXT NOT NULL,
        report_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);
    `);
  }

  save(report: ProspectReport, id: string): SavedReport {
    const statement = this.db.prepare(`
      INSERT OR REPLACE INTO reports
        (id, url, company_name, generated_at, model, analysis_mode, report_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    statement.run(
      id,
      report.websiteUrl,
      report.companyName,
      report.generatedAt,
      report.model,
      report.analysisMode,
      JSON.stringify(report)
    );
    return {
      id,
      url: report.websiteUrl,
      companyName: report.companyName,
      generatedAt: report.generatedAt,
      model: report.model,
      analysisMode: report.analysisMode
    };
  }

  list(): SavedReport[] {
    const rows = this.db
      .prepare(
        "SELECT id, url, company_name, generated_at, model, analysis_mode FROM reports ORDER BY generated_at DESC LIMIT 100"
      )
      .all() as Array<Record<string, string>>;
    return rows.map(rowToSavedReport);
  }

  get(id: string): ProspectReport | null {
    const row = this.db.prepare("SELECT report_json FROM reports WHERE id = ?").get(id) as
      | { report_json: string }
      | undefined;
    return row ? (JSON.parse(row.report_json) as ProspectReport) : null;
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM reports WHERE id = ?").run(id);
    return result.changes > 0;
  }

  close() {
    this.db.close();
  }
}

function rowToSavedReport(row: Record<string, string>): SavedReport {
  return {
    id: row.id,
    url: row.url,
    companyName: row.company_name,
    generatedAt: row.generated_at,
    model: row.model,
    analysisMode: row.analysis_mode as SavedReport["analysisMode"]
  };
}
