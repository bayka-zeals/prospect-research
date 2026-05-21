import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyUsefulPage, normalizeUrl, scoreLink } from "../src/urlUtils.js";

test("normalizeUrl adds scheme and removes tracking params", () => {
  assert.equal(normalizeUrl("example.jp/path/?utm_source=x&a=1#top"), "https://example.jp/path?a=1");
});

test("isLikelyUsefulPage filters static assets", () => {
  assert.equal(isLikelyUsefulPage("https://example.jp/logo.png"), false);
  assert.equal(isLikelyUsefulPage("https://example.jp/faq"), true);
});

test("scoreLink prioritizes conversion and FAQ pages", () => {
  assert.ok(scoreLink("https://example.jp/reserve", "予約する") > scoreLink("https://example.jp/blog/2020", "old"));
});
