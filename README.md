# ConceptLab v1.0

Textbook photo -> AI reading -> syllabus-matched lesson + interactive simulation.
See `docs/ARCHITECTURE.md` for the design and `docs/SCENE-SCHEMA.md` for the
constrained AI visual format.

## Run locally

There is no build step. The front end is `public/index.html`; the API is Vercel
serverless functions in `api/`.

```bash
npm test                     # engine, sanitiser, matcher and v1.0 validation checks
npx vercel dev               # optional: serve the page and /api functions together
```

Opening `public/index.html` directly works for the built-in simulations, but
photo analysis needs the `/api` functions (use `vercel dev` or a deployed site).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Vision model access for `/api/analyze`. |
| `GROQ_MODEL` | No | Overrides the first model id (default `qwen/qwen3.8-27b`). |
| `XAI_API_KEY` / `ANTHROPIC_API_KEY` | No | Legacy fallbacks read by `api/analyze.js` if `GROQ_API_KEY` is absent. They are not used to change the endpoint. |

No new environment variables are required for v1.0. Mistake reports use the
existing function log; there is no external reporting service, database,
authentication or payment configuration. `.env.example` lists the required key.

Keep keys in Vercel project settings (or a local untracked `.env`). The app never
logs keys, full uploaded images or student personal details.

## Deploy on Vercel

1. Push the repository and import it in Vercel (framework preset: Other).
2. Add `GROQ_API_KEY` in Project Settings -> Environment Variables for the
   Production/Preview environments you use.
3. Function runtime: Node.js 18 or newer (`package.json` `engines`).
4. Deploy. `api/syllabus.js`, `api/analyze.js` and `api/report.js` are detected
   automatically; no routing or build configuration is needed.
5. After deploying, verify a sample scan and one built-in simulation. Reports
   appear in Vercel -> Project -> Logs as JSON lines with
   `"type":"conceptlab.mistake_report"` (retention follows your Vercel plan).

## Checks and evaluation

- `npm test` is the project's defined check.
- `docs/EVALUATION.md` documents the 30-photo evaluation procedure. No accuracy
  results are claimed here or anywhere in the app until that procedure has been
  run and recorded.

## Privacy and safety notes

- Uploaded photos are resized in the browser, sent to the configured AI service
  for reading, and are not stored by ConceptLab.
- AI output is sanitised on the server and validated again before rendering.
  AI models may configure only allowlisted visual primitives; they cannot supply
  HTML, CSS, JavaScript or executable behaviour.
- The original photo and personal information are excluded from mistake reports
  by default.
