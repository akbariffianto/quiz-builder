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
frontend (React + Vite)  --POST /api/generate-quiz-->  backend (Express)  --Gemini API-->  Google AI
        |                                                      |
   quiz-taking UI                                    prompt construction +
   scoring + review                                  JSON parsing/validation
```

The backend exists only to keep the Gemini API key server-side (never
exposed to the browser) and to construct the prompt consistently. It does not
use a database; each quiz is generated fresh and lives only in the frontend's
React state for that session.

## Stack

- **Frontend:** React 18 + Vite, plain CSS (no UI framework) so every visual
  choice is intentional rather than default Tailwind/shadcn styling.
- **Backend:** Node.js + Express, `@google/generative-ai`.
- **Model:** Gemini (`gemini-2.0-flash`) with `responseMimeType: "application/json"`
  set in the generation config, plus an explicit "output only JSON" instruction
  in the prompt as a second line of defense. See `PROMPTS.md` for the exact
  system/user prompts and why they're written the way they are.

## Running it locally

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

- `backend/server.js` — Express server + Gemini API call + prompt construction.
- `frontend/src/App.jsx` — setup form, quiz-taking flow, results/review.
- `frontend/src/App.css` — visual design (navy/blueprint theme with a gold
  accent, corner-bracket "drawing" cards, and a ruler-tick progress bar —
  chosen to evoke property/architecture rather than a generic AI-app look).
- `PROMPTS.md` — the exact prompts used, pasted as plain text for review.
