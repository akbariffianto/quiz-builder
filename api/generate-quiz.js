import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  generationConfig: { responseMimeType: "application/json" },
});

// ---- PROMPT DESIGN -------------------------------------------------------
// Identical to backend/server.js and PROMPTS.md. This is the version that
// actually runs in production (Vercel serverless function). backend/server.js
// is kept for local Express development / as a reference implementation.

const SYSTEM_PROMPT = `You are a training content designer for 99 Group, a property-technology company that runs 99.co, Rumah123, and iProperty. You write short internal knowledge quizzes for employees (agents, marketing, ops, tech) about the property industry.

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
}`;

function buildUserPrompt(topic, numQuestions, difficulty) {
  return `Generate an employee knowledge quiz.

Topic: "${topic}"
Number of questions: ${numQuestions}
Difficulty: ${difficulty}

Return only the JSON object described in the system prompt.`;
}
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, numQuestions = 5, difficulty = "mixed" } = req.body || {};

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "Topic is required" });
  }
  const n = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 3), 10);

  try {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: buildUserPrompt(topic, n, difficulty) }] },
      ],
      systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
    });

    const raw = result.response.text();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(cleaned);

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("Model returned no questions");
    }

    return res.status(200).json(quiz);
  } catch (err) {
    console.error("Quiz generation failed:", err.message);
    return res.status(500).json({
      error: "Failed to generate quiz",
      detail: err.message,
    });
  }
}
