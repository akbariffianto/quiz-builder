# 99 Group Employee Quiz Builder

A tool that takes a topic (e.g. "Top skills of a property agent in 2025" or
"Property Market updates in Jakarta") and generates a multi-choice knowledge
quiz for 99 Group employees, then lets them take it in the browser with
instant feedback and a scored review at the end.

## What it does

1. Employee types a topic, picks a question count (3-10) and difficulty
   (beginner / mixed / advanced).
2. The backend sends a prompt to the Gemini API, which returns a structured
   JSON quiz (title, questions, 4 options each, correct answer, explanation).
3. The frontend renders the quiz one question at a time, reveals the correct
   answer with an explanation after each pick, and shows a final score with
   a right/wrong review at the end.

Every question is generated live per request. Nothing is hardcoded except the
four sample topic chips on the setup screen, which are just shortcuts.

## Architecture

```
frontend/ (React + Vite, static build)  --POST /api/generate-quiz-->  frontend/api/generate-quiz.js (Vercel serverless function)  --Gemini API-->  Google AI
```

`api/generate-quiz.js` lives inside `frontend/` on purpose: when Vercel's Root
Directory is set to `frontend`, it auto-detects this as a single Vite project
with a colocated API route, rather than a multi-app monorepo. That avoids
Vercel's "Services" auto-detection trying to deploy `backend/` as a second,
separate application.

The `backend/` folder (Express) is kept as a local-dev / reference
implementation with the identical prompt logic, in case you want to run this
on a persistent server instead (e.g. your own VPS) rather than serverless. It
is not deployed to Vercel.

The Gemini API key never reaches the browser: it only exists as a Vercel
environment variable read inside `frontend/api/generate-quiz.js`.

## Stack

- **Frontend:** React 18 + Vite, plain CSS (no UI framework) so every visual
  choice is intentional rather than default Tailwind/shadcn styling.
- **Backend (production):** a single Vercel serverless function at
  `frontend/api/generate-quiz.js`.
- **Backend (local dev alternative):** Node.js + Express in `backend/`, same
  prompt logic, useful if you want to run this on a regular server instead.
- **Model:** Gemini (`gemini-flash-latest`, an alias Google auto-updates to
  its current GA flash model, chosen so this doesn't break every time a
  specific model version gets deprecated) with `responseMimeType: "application/json"`
  set in the generation config, plus an explicit "output only JSON" instruction
  in the prompt as a second line of defense. See `PROMPTS.md` for the exact
  system/user prompts and why they're written the way they are.

## Deploying (Vercel, free, no credit card)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), sign up with GitHub (no card
   required for the free Hobby plan).
3. **New Project** → import this repo.
4. On the import screen, set **Root Directory** to `frontend`. This is the
   important step — it makes Vercel treat this as one Vite project with a
   colocated `/api` route, instead of detecting `frontend` and `backend` as
   two separate apps to deploy.
5. Leave the Framework Preset as the auto-detected **Vite**, and leave Build
   Command / Output Directory on their auto-detected defaults.
6. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key
7. Deploy. You'll get one URL that serves both the quiz UI and the API
   (e.g. `https://quiz-builder.vercel.app`) — no separate frontend/backend
   deploys, no CORS setup needed.
8. Test it by opening the URL and generating a quiz.

## Running it locally (frontend + Express, for development)

```bash
# 1. Backend
cd backend
cp .env.example .env      # then paste your GEMINI_API_KEY into .env
npm install
npm start                 # runs on http://localhost:3001

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev               # runs on http://localhost:5173, proxies /api to :3001
```

Open `http://localhost:5173`, type a topic, and generate a quiz.

If you want to test the actual Vercel serverless function locally instead
of the Express backend, install the Vercel CLI (`npm i -g vercel`) and run
`vercel dev` from the repo root — it serves the built frontend and `/api`
functions together on one local port, matching production exactly.

## What I'd change with more time

- **No persistence.** Quiz results aren't saved anywhere, so there's no way
  for HR/managers to see who took what quiz or aggregate scores across the
  team. Next step would be a lightweight store (even a Google Sheet via API,
  similar to how I log data in my n8n expense-bot project) keyed by employee
  and topic.
- **No answer-quality check before showing the quiz.** The prompt tells the
  model not to invent statistics, but there's no automated second pass that
  verifies factual claims in generated questions. For anything with real
  numbers (market data, regulations) I'd add a review step, or restrict
  numeric questions to topics where I supply the source facts in the prompt
  rather than letting the model generate them from its own knowledge.
- **Single quiz format.** Every question is 4-option multiple choice. Property
  concepts like process ordering (e.g. steps in a KPR application) would be
  better tested with sequencing or matching questions, which the current
  schema doesn't support.
- **No auth.** Anyone with the URL can generate quizzes; there's no concept of
  "this is for 99 Group employees only." Fine for a prototype, not for
  internal rollout.

## Files

- `frontend/api/generate-quiz.js` — Vercel serverless function that runs in
  production: Gemini API call + prompt construction.
- `backend/server.js` — Express equivalent for local dev / non-serverless
  hosting, same prompt logic.
- `frontend/src/App.jsx` — setup form, quiz-taking flow, results/review.
- `frontend/src/App.css` — visual design (navy/blueprint theme with a gold
  accent, corner-bracket "drawing" cards, and a ruler-tick progress bar —
  chosen to evoke property/architecture rather than a generic AI-app look).
- `PROMPTS.md` — the exact prompts used, pasted as plain text for review.
