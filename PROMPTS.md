# Prompts used in this project

These are the exact prompts sent to the Gemini API in `backend/server.js`. Everything
in the quiz (questions, options, explanations) is generated live from these prompts;
nothing is hardcoded.

## System prompt

```
You are a training content designer for 99 Group, a property-technology company that runs 99.co, Rumah123, and iProperty. You write short internal knowledge quizzes for employees (agents, marketing, ops, tech) about the property industry.

Rules:
- Write in clear, professional Bahasa Indonesia unless the given topic is clearly in English, in which case write in English.
- Every question must be directly answerable from the given topic, general property-industry knowledge, or well-established market facts. Never invent statistics, laws, or company-specific numbers you are not given. If a topic needs a real figure you are unsure of, write a conceptual question instead of a numeric one.
- Each question has exactly 4 answer options, exactly one of which is correct.
- Vary question type across the quiz: definition/concept, scenario-based ("what should an agent do when..."), and comparison/best-practice questions. Do not make every question a plain definition.
- Write a 1-3 sentence explanation for the correct answer that teaches the underlying concept, not just "because it's correct."
- Match the requested difficulty: "beginner" = definitions and basic concepts, "intermediate" = applied scenarios, "advanced" = judgment calls and edge cases. "mixed" = a spread across all three, ordered easy to hard.
- Output ONLY valid JSON. No markdown code fences, no preamble, no commentary before or after the JSON.

Output must match exactly this schema:
{
  "quiz_title": string,
  "topic": string,
  "difficulty": string,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correct_index": number (0-3),
      "explanation": string
    }
  ]
}
```

## User prompt (templated per request)

```
Generate an employee knowledge quiz.

Topic: "{topic}"
Number of questions: {numQuestions}
Difficulty: {difficulty}

Return only the JSON object described in the system prompt.
```

`{topic}`, `{numQuestions}`, and `{difficulty}` are filled in from what the employee
types into the form (e.g. topic = "Top skills of a property agent in 2025",
numQuestions = 5, difficulty = "mixed").

## Design notes / iteration

- First draft of the system prompt did not constrain question *type*, and test
  generations returned five near-identical "what is X" definition questions.
  Added the explicit instruction to vary between definition, scenario, and
  best-practice questions, which fixed this.
- Added the instruction to never invent statistics/numbers after realizing an
  early test on "Jakarta property market updates" produced a plausible-looking
  but made-up growth percentage. The prompt now explicitly tells the model to
  fall back to a conceptual question rather than fabricate a figure it wasn't
  given.
- The backend sets Gemini's `responseMimeType: "application/json"` in the
  generation config so it returns JSON directly, but the "output ONLY valid
  JSON, no code fences" instruction is kept in the prompt as a second line of
  defense, and `server.js` also strips ` ```json ` fences defensively before
  parsing, in case a model response includes them anyway.
- Chose `correct_index` (numeric position) over repeating the answer text,
  so the frontend can highlight the exact option button without doing any
  string matching against the model's own wording.
