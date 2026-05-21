import test from "node:test";
import assert from "node:assert/strict";
import { renderPromptTemplate } from "../src/prompts.js";

test("renderPromptTemplate replaces known placeholders", () => {
  assert.equal(
    renderPromptTemplate("Website: {{websiteUrl}}\nEvidence: {{evidenceJson}}", {
      websiteUrl: "https://example.jp",
      evidenceJson: "[]"
    }),
    "Website: https://example.jp\nEvidence: []"
  );
});
