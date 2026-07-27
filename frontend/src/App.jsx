import { useState } from "react";

const SAMPLE_TOPICS = [
  "Top skills of a property agent in 2025",
  "Jakarta property market updates",
  "KPR & mortgage basics for new agents",
  "Fair housing & ethical listing practices",
];

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "mixed", label: "Mixed" },
  { value: "advanced", label: "Advanced" },
];

// STAGE: "setup" | "loading" | "error" | "quiz" | "results"

export default function App() {
  const [stage, setStage] = useState("setup");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("mixed");
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  async function generateQuiz(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setStage("loading");
    setError("");
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, numQuestions, difficulty }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Quiz generation failed");
      }
      const data = await res.json();
      setQuiz(data);
      setCurrent(0);
      setAnswers([]);
      setSelected(null);
      setRevealed(false);
      setStage("quiz");
    } catch (err) {
      setError(err.message);
      setStage("error");
    }
  }

  function pickOption(idx) {
    if (revealed) return;
    setSelected(idx);
  }

  function confirmAnswer() {
    if (selected === null) return;
    setRevealed(true);
    setAnswers((prev) => [...prev, selected]);
  }

  function nextQuestion() {
    if (current + 1 >= quiz.questions.length) {
      setStage("results");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  function restart() {
    setStage("setup");
    setQuiz(null);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    setCurrent(0);
  }

  const score = quiz
    ? answers.filter((a, i) => a === quiz.questions[i].correct_index).length
    : 0;

  return (
    <div className="page">
      <header className="header">
        <div className="header-mark">99G</div>
        <div className="header-text">
          <span className="eyebrow">Employee Knowledge Quiz</span>
          <h1>Quiz Builder</h1>
        </div>
      </header>

      <main className="sheet">
        {stage === "setup" && (
          <form className="setup" onSubmit={generateQuiz}>
            <label className="field">
              <span className="field-label">Topic</span>
              <input
                type="text"
                placeholder="e.g. Property Market Updates in Jakarta"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </label>

            <div className="chips">
              {SAMPLE_TOPICS.map((t) => (
                <button
                  type="button"
                  key={t}
                  className="chip"
                  onClick={() => setTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Questions</span>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className="primary-btn">
              Generate quiz
            </button>
          </form>
        )}

        {stage === "loading" && (
          <div className="status">
            <div className="spinner" />
            <p>Drafting {numQuestions} questions on “{topic}”…</p>
          </div>
        )}

        {stage === "error" && (
          <div className="status status-error">
            <p>Quiz generation didn't complete: {error}</p>
            <button className="primary-btn" onClick={() => setStage("setup")}>
              Back to setup
            </button>
          </div>
        )}

        {stage === "quiz" && quiz && (
          <QuestionCard
            quiz={quiz}
            current={current}
            selected={selected}
            revealed={revealed}
            onPick={pickOption}
            onConfirm={confirmAnswer}
            onNext={nextQuestion}
          />
        )}

        {stage === "results" && quiz && (
          <Results quiz={quiz} answers={answers} score={score} onRestart={restart} />
        )}
      </main>
    </div>
  );
}

function QuestionCard({ quiz, current, selected, revealed, onPick, onConfirm, onNext }) {
  const q = quiz.questions[current];
  const total = quiz.questions.length;

  return (
    <div className="card">
      <div className="ruler">
        {quiz.questions.map((_, i) => (
          <span key={i} className={`tick ${i <= current ? "tick-done" : ""}`} />
        ))}
      </div>

      <div className="card-frame">
        <span className="corner corner-tl" />
        <span className="corner corner-tr" />
        <span className="corner corner-bl" />
        <span className="corner corner-br" />

        <div className="stamp">
          Q.{String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>

        <h2 className="question">{q.question}</h2>

        <div className="options">
          {q.options.map((opt, idx) => {
            let cls = "option";
            if (revealed) {
              if (idx === q.correct_index) cls += " option-correct";
              else if (idx === selected) cls += " option-wrong";
            } else if (idx === selected) {
              cls += " option-selected";
            }
            return (
              <button
                key={idx}
                type="button"
                className={cls}
                onClick={() => onPick(idx)}
                disabled={revealed}
              >
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                {opt}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="explanation">
            <strong>{selected === q.correct_index ? "Correct." : "Not quite."}</strong>{" "}
            {q.explanation}
          </div>
        )}

        {!revealed ? (
          <button className="primary-btn" disabled={selected === null} onClick={onConfirm}>
            Check answer
          </button>
        ) : (
          <button className="primary-btn" onClick={onNext}>
            {current + 1 >= total ? "See results" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}

function Results({ quiz, answers, score, onRestart }) {
  const total = quiz.questions.length;
  const pct = Math.round((score / total) * 100);

  return (
    <div className="card">
      <div className="card-frame results-frame">
        <span className="corner corner-tl" />
        <span className="corner corner-tr" />
        <span className="corner corner-bl" />
        <span className="corner corner-br" />

        <div className="stamp">RESULT</div>
        <h2 className="question">{quiz.quiz_title}</h2>
        <p className="score-line">
          {score} / {total} correct <span className="pct">({pct}%)</span>
        </p>

        <ol className="review-list">
          {quiz.questions.map((q, i) => {
            const correct = answers[i] === q.correct_index;
            return (
              <li key={i} className={correct ? "review-ok" : "review-bad"}>
                <span className="review-icon">{correct ? "✓" : "✗"}</span>
                <div>
                  <div className="review-q">{q.question}</div>
                  <div className="review-a">
                    Correct answer: {q.options[q.correct_index]}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <button className="primary-btn" onClick={onRestart}>
          Build another quiz
        </button>
      </div>
    </div>
  );
}
