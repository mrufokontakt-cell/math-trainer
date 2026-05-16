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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4 text-white">

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">

        <h1 className="text-2xl font-bold text-center mb-1">
          🧠 Mental Math Trainer
        </h1>

        <p className="text-center text-gray-400 text-sm mb-3">
          XP {xp} • Score {score} • Level {level}
        </p>

        <div className="flex gap-2 justify-center mb-3">
          <button onClick={() => setMode("normal")} className="bg-gray-700 px-2 py-1 rounded">Normal</button>
          <button onClick={() => setMode("boss")} className="bg-red-600 px-2 py-1 rounded">Boss</button>
          <button onClick={startExam} className="bg-green-600 px-2 py-1 rounded">Exam</button>
        </div>

        {mode === "boss" && (
          <div className="text-center text-sm mb-2">
            Boss HP: {bossHp} | Phase {bossPhase}
          </div>
        )}

        <div className="text-center text-3xl font-bold my-6">
          {question.a} {question.op} {question.b} = ?
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-center"
          placeholder="Wpisz odpowiedź"
        />

        <button
          onClick={check}
          className="w-full mt-3 bg-blue-500 hover:bg-blue-600 transition rounded-xl py-3 font-semibold"
        >
          Sprawdź
        </button>

        <div className="text-center mt-3">
          {feedback}
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          Accuracy: {(stats.acc * 100).toFixed(1)}%
        </div>

      </div>
    </div>
  );
}
