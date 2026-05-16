import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// 🧠 Mental Math Trainer v13.1.0
// - RESTORED: difficulty selector (easy / medium / hard)
// - XP system + boss + exam preserved
// - UI alignment fix

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + 1;

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const feedbackFX = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = type === "correct" ? 900 : 180;
    g.gain.value = 0.05;
    o.start();
    o.stop(ctx.currentTime + 0.1);
  } catch {}
};

const ops = ["+", "-", "*", "/"];

const chooseOperator = (history) => {
  const last = history.slice(-30);
  if (last.length < 10) return ops[rand(0, 3)];

  const stats = { "+": [0,0], "-": [0,0], "*": [0,0], "/": [0,0] };
  last.forEach(h => {
    if (!stats[h.op]) return;
    stats[h.op][1]++;
    if (h.correct) stats[h.op][0]++;
  });

  let worst = "+";
  let worstAcc = 1;
  for (const op of ops) {
    const [c,t] = stats[op];
    const acc = t ? c/t : 0;
    if (acc < worstAcc) {
      worstAcc = acc;
      worst = op;
    }
  }

  return Math.random() < 0.7 ? worst : ops[rand(0,3)];
};

const generateQuestion = (difficulty, mode, history) => {
  const ranges = { easy: 10, medium: 50, hard: 120 };
  const base = ranges[difficulty] || 10;

  let a = rand(1, base);
  let b = rand(1, base);
  let op = chooseOperator(history) || "+";

  if (mode === "boss") {
    a = rand(20, 90);
    b = rand(2, 15);
  }

  if (mode === "exam") {
    a = rand(1, 150);
    b = rand(1, 150);
  }

  if (op === "/") {
    b = rand(2, 12);
    a = b * rand(2, 10);
  }

  let answer;
  if (op === "+") answer = a + b;
  if (op === "-") answer = a - b;
  if (op === "*") answer = a * b;
  if (op === "/") answer = a / b;

  return { a, b, op, answer };
};

export default function App() {
  const [difficulty, setDifficulty] = useState("easy");
  const [mode, setMode] = useState("normal");

  const [xp, setXp] = useState(load("xp", 0));
  const level = Math.floor(xp / 100) + 1;
  const xpProgress = xp % 100;

  const [score, setScore] = useState(load("score", 0));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [coachTip, setCoachTip] = useState("");

  const [history, setHistory] = useState(load("history", []));

  const [question, setQuestion] = useState(() => generateQuestion("easy", "normal", []));

  const [bossHp, setBossHp] = useState(100);
  const [examQ, setExamQ] = useState(0);

  const safeRender = () => {
    if (!question?.op) return <div className="text-gray-400">...</div>;
    return <>{question.a} {question.op} {question.b}</>;
  };

  const getInstantCoachTip = (op) => ({
    "+": "Dodawanie: sprawdzaj przenoszenie cyfr.",
    "-": "Odejmowanie: pilnuj kolejności liczb.",
    "*": "Mnożenie: automatyzuj tabliczkę.",
    "/": "Dzielenie: myśl odwrotnie (×)."
  }[op]);

  const next = () => {
    setQuestion(generateQuestion(difficulty, mode, history));
    setCoachTip("");
  };

  const check = () => {
    const user = parseFloat(input);
    const correct = Math.abs(user - question.answer) < 0.01;

    setHistory(h => [...h.slice(-200), { correct, op: question.op }]);

    if (correct) {
      setScore(s => s + 1);
      setXp(x => x + 10);
      setFeedback("✅ Dobrze!");
      setCoachTip("");
    } else {
      setFeedback(`❌ Źle. Poprawna: ${question.answer}`);
      setCoachTip(getInstantCoachTip(question.op));
    }

    if (mode === "boss") setBossHp(h => Math.max(0, h - (correct ? 10 : 5)));
    if (mode === "exam") setExamQ(q => q + 1);

    setInput("");
    next();
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 animated-gradient" />

      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-3xl p-6 border border-white/20">

        <h1 className="text-2xl font-bold text-center">🧠 Math Trainer v13.1 FIX</h1>

        <div className="mt-3 text-xs text-center">Level {level} • XP {xpProgress}/100</div>
        <div className="w-full bg-white/20 h-2 rounded-full mt-1">
          <div className="bg-green-400 h-2 rounded-full" style={{ width: `${xpProgress}%` }} />
        </div>

        <div className="flex gap-2 justify-center mt-3">
          {["easy","medium","hard"].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`px-2 py-1 rounded text-xs ${difficulty===d?"bg-green-400 text-black":"bg-white/10"}`}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-center mt-3">
          {["normal","boss","exam"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2 py-1 rounded text-xs ${mode===m?"bg-yellow-400 text-black":"bg-white/10"}`}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {mode === "boss" && (
          <div className="mt-2">
            <div className="text-xs text-center">Boss HP</div>
            <div className="w-full bg-red-900 h-2 rounded-full">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${bossHp}%` }} />
            </div>
          </div>
        )}

        {mode === "exam" && (
          <div className="text-center text-xs mt-2">Exam progress: {examQ}/10</div>
        )}

        <div className="text-center text-5xl mt-6 font-bold">
          {safeRender()}
        </div>

        <input value={input} onChange={e=>setInput(e.target.value)}
          className="w-full mt-4 p-3 rounded-xl bg-black/40 text-center" />

        <button onClick={check} className="w-full mt-3 bg-indigo-500 py-2 rounded-xl">
          Sprawdź
        </button>

        {feedback && <div className="text-center mt-2 text-sm">{feedback}</div>}
        {coachTip && <div className="text-center mt-1 text-yellow-300 text-sm">🧠 {coachTip}</div>}

      </div>

      <style>{`
        .animated-gradient {
          background: linear-gradient(-45deg,#4f46e5,#ec4899,#000,#7c3aed);
          background-size:400% 400%;
          animation: gradientShift 10s ease infinite;
        }
        @keyframes gradientShift {
          0%{background-position:0% 50%}
          50%{background-position:100% 50%}
          100%{background-position:0% 50%}
        }
      `}</style>
    </div>
  );
}
