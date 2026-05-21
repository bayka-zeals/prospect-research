import test from "node:test";
import assert from "node:assert/strict";
import { extractPage } from "../src/extractor.js";

test("extractPage collects title, headings, ctas, and links", () => {
  const page = extractPage(
    "https://example.jp/",
    `<!doctype html><title>Example Beauty</title><meta name="description" content="Salon booking"><body><h1>美容サロン</h1><a href="/reserve">予約する</a><a href="/faq">FAQ</a></body>`
  );

  assert.equal(page.title, "Example Beauty");
  assert.equal(page.description, "Salon booking");
  assert.deepEqual(page.headings, ["美容サロン"]);
  assert.equal(page.ctas[0], "予約する");
  assert.ok(page.links.includes("https://example.jp/reserve"));
});
