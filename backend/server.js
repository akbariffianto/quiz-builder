import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json" },
});

// ---- PROMPT DESIGN -------------------------------------------------------
// These two prompts are the core "prompt engineering" artifact of this project.
// They are copied verbatim into PROMPTS.md for the submission text box as well,
// so this file and PROMPTS.md must be kept in sync if edited.

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

app.post("/api/generate-quiz", async (req, res) => {
  const { topic, numQuestions = 5, difficulty = "mixed" } = req.body;

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

    res.json(quiz);
  } catch (err) {
    console.error("Quiz generation failed:", err.message);
    res.status(500).json({
      error: "Failed to generate quiz",
      detail: err.message,
    });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Quiz backend running on port ${PORT}`));
