# ZEALS Prospect Research

Local research app for ZEALS sales reps. Paste a Japanese B2C company URL, generate a bilingual prospect report, save it locally, and export the rendered report as PDF from the browser print dialog.

## Setup

### Prerequisites

- Node.js 22.5 or newer. Node 24+ is recommended.
- npm, which is included with Node.js.
- No separate SQLite installation is required. The app uses Node's built-in `node:sqlite` module and automatically creates `data/reports.sqlite` on first run.

Check your local versions:

```bash
node --version
npm --version
```

If `node --version` is older than 22.5, install a newer Node release before continuing.

### Install and Run

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run dev
```

Open `http://localhost:4177`.

`GEMINI_API_KEY` is optional for UI testing. Without it, the app returns a clearly labeled heuristic report using the crawled evidence. Add a real key to `.env` when you want AI-generated reports.

## Environment

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
PORT=4177
MAX_CRAWL_PAGES=18
```

The UI model dropdown includes `gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash`, and `gemini-2.5-flash-lite`. `GEMINI_MODEL` controls which option is selected by default.

## Prompt Defaults

- Default prompts live in `prompts/system.txt` and `prompts/user.txt`.
- The system prompt stays server-side.
- The user prompt appears in the web app under the Model dropdown and can be edited before each report run.
- Keep `{{websiteUrl}}` and `{{evidenceJson}}` in the user prompt if you want the model to receive the crawled source pack.

## Scripts

```bash
npm run dev      # start the local app at http://localhost:4177
npm run build    # compile TypeScript into dist/
npm start        # run the compiled server after npm run build
npm test         # build and run unit tests
```

## Fresh Machine Checklist

1. Clone the repo.
2. Run `node --version` and confirm Node is 22.5 or newer.
3. Run `npm install`.
4. Run `npx playwright install chromium`.
5. Run `cp .env.example .env`.
6. Add `GEMINI_API_KEY` to `.env` if AI reports are needed.
7. Run `npm run dev`.
8. Open `http://localhost:4177`.

## Notes

- Reports are stored in `data/reports.sqlite`.
- `data/` is ignored by git because reports are local machine data.
- `requirement.txt` summarizes the fresh-machine dependency checklist; npm dependencies remain the source of truth in `package.json` and `package-lock.json`.
- The crawler respects same-domain limits, rate limits requests, and checks `robots.txt` where possible.
- Public social/review links discovered from the official site are treated as directional signals.
- If Playwright is not installed, normal HTML fetching still works, but JavaScript-heavy websites may not render correctly.

## Troubleshooting

- `Cannot find module node:sqlite` or SQLite-related startup errors: upgrade Node.js to 22.5 or newer.
- `Executable doesn't exist` from Playwright: run `npx playwright install chromium`.
- Port conflict on `4177`: change `PORT` in `.env`, then restart `npm run dev`.
- Report generation works but says `heuristic`: set `GEMINI_API_KEY` in `.env` and restart the server.
