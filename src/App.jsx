import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// 🧠 Mental Math Trainer v11 (V9 + UI UPGRADE)
// - full v9 systems restored
// - glassmorphism UI (mobile-first)
// - boss mode + exam mode + skills + history
// - localStorage persistence

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

    if (navigator.vibrate) {
      navigator.vibrate(type === "correct" ? 20 : 80);
    }
  } catch {}
};

const generateQuestion = (level, weak = null) => {
  let a = rand(1, 10 + level * 20);
  let b = rand(1, 10 + level * 20);

  const ops = ["+", "-", "*", "/"];
  let op = ops[rand(0, Math.min(3, level))];

  if (weak === "sub") op = "-";
  if (weak === "mul") op = "*";

  let answer;
  switch (op) {
    case "+": answer = a + b; break;
    case "-": answer = a - b; break;
    case "*": answer = a * b; break;
    case "/": answer = Math.round((a / b) * 100) / 100; break;
  }

  return { a, b, op, answer };
};

const load = (k, f) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : f;
  } catch {
    return f;
  }
};

export default function App() {
  const [username, setUsername] = useState(load("username", "Player"));

  const [level, setLevel] = useState(load("level", 1));
  const [xp, setXp] = useState(load("xp", 0));
  const [score, setScore] = useState(load("score", 0));

  const [mode, setMode] = useState("normal");
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");

  const [question, setQuestion] = useState(generateQuestion(1));
  const [startTime, setStartTime] = useState(Date.now());

  const [history, setHistory] = useState(load("history", []));
  const [skills, setSkills] = useState(load("skills", { add: 1, sub: 1, mul: 1, div: 1 }));

  const [bossHp, setBossHp] = useState(100);
  const [bossPhase, setBossPhase] = useState(1);

  const [examActive, setExamActive] = useState(false);
  const [examQ, setExamQ] = useState(0);
  const [examScore, setExamScore] = useState(0);

  const weakSpot = useMemo(() => {
    if (skills.sub < skills.mul) return "sub";
    if (skills.mul < skills.sub) return "mul";
    return null;
  }, [skills]);

  const stats = useMemo(() => {
    const total = history.length;
    const correct = history.filter(h => h.correct).length;
    const avg = total ? history.reduce((a,b)=>a+b.rt,0)/total : 0;
    return { total, correct, avg, acc: total ? correct/total : 0 };
  }, [history]);

  const next = () => {
    setQuestion(generateQuestion(level, weakSpot));
    setStartTime(Date.now());
  };

  const updateSkill = (op, correct) => {
    setSkills(s => ({
      ...s,
      add: op === "+" ? s.add + (correct ? 1 : 0) : s.add,
      sub: op === "-" ? s.sub + (correct ? 1 : 0) : s.sub,
      mul: op === "*" ? s.mul + (correct ? 1 : 0) : s.mul,
      div: op === "/" ? s.div + (correct ? 1 : 0) : s.div
    }));
  };

  const check = () => {
    const user = parseFloat(input);
    const rt = Date.now() - startTime;
    const correct = Math.abs(user - question.answer) < 0.01;

    updateSkill(question.op, correct);

    setHistory(h => [...h.slice(-300), { correct, rt, op: question.op }]);

    if (correct) {
      setScore(s => s + 1);
      setXp(x => x + 10);
      setFeedback("✅ Dobrze!");
      feedbackFX("correct");
    } else {
      setFeedback(`❌ Źle. Poprawna: ${question.answer}`);
      feedbackFX("wrong");
    }

    if (mode === "boss") {
      setBossHp(h => Math.max(0, h - (correct ? 10 * bossPhase : -5)));
      if (bossHp < 50 && bossPhase === 1) setBossPhase(2);
    }

    if (examActive) {
      setExamQ(q => q + 1);
      if (correct) setExamScore(s => s + 1);
      if (examQ >= 99) setExamActive(false);
    }

    setInput("");
    next();
  };

  const startExam = () => {
    setExamActive(true);
    setExamQ(0);
    setExamScore(0);
  };

  const exportBackup = () => {
    const data = JSON.stringify({ username, level, xp, score, history, skills });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "math-backup.json";
    a.click();
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result);
      Object.keys(data).forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
      window.location.reload();
    };
    reader.readAsText(file);
  };

 return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-black to-purple-900 text-white p-4">

    <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-bold text-center">
        🧠 Math Trainer
      </h1>

      <p className="text-center text-gray-300 text-sm mt-1">
        XP {xp} • Score {score} • Level {level}
      </p>

      {/* MODE */}
      <div className="flex gap-2 justify-center mt-4">
        <button className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">
          Normal
        </button>
        <button className="px-3 py-1 rounded-full bg-red-500/70 hover:bg-red-500">
          Boss
        </button>
        <button className="px-3 py-1 rounded-full bg-green-500/70 hover:bg-green-500">
          Exam
        </button>
      </div>

      {/* QUESTION CARD */}
      <div className="mt-8 text-center">
        <div className="text-5xl font-extrabold tracking-wide">
          {question.a} {question.op} {question.b}
        </div>
        <div className="text-gray-400 mt-2">= ?</div>
      </div>

      {/* INPUT */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full mt-6 p-4 rounded-2xl bg-black/40 border border-white/20 text-center text-lg focus:outline-none focus:border-indigo-400"
        placeholder="Wpisz odpowiedź"
      />

      {/* BUTTON */}
      <button
        onClick={check}
        className="w-full mt-4 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 transition font-semibold"
      >
        Sprawdź
      </button>

      {/* FEEDBACK */}
      <div className="text-center mt-4 text-lg text-gray-200">
        {feedback}
      </div>

      {/* STATS */}
      <div className="mt-6 text-center text-xs text-gray-400">
        Accuracy: {(stats.acc * 100).toFixed(1)}%
      </div>

    </div>
  </div>
);
}
