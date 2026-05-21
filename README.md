# ZEALS Prospect Research

Local research app for ZEALS sales reps. Paste a Japanese B2C company URL, generate a bilingual prospect report, save it locally, and export the rendered report as PDF from the browser print dialog.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:4177`.

`OPENAI_API_KEY` is optional for UI testing. Without it, the app returns a clearly labeled heuristic report using the crawled evidence.

## Environment

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
PORT=4177
MAX_CRAWL_PAGES=18
```

The UI model dropdown includes `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.4`, and `gpt-5.5`. `OPENAI_MODEL` controls which option is selected by default.

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Notes

- Reports are stored in `data/reports.sqlite`.
- The crawler respects same-domain limits, rate limits requests, and checks `robots.txt` where possible.
- Public social/review links discovered from the official site are treated as directional signals.
