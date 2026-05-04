import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";

const h = React.createElement;
const steps = [
  "Start from radicals",
  "Connect words to those parts",
  "Listen before reading",
  "Read one sentence closely",
  "Use the grammar point immediately"
];

function pickChineseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((voice) => /zh-CN|cmn-Hans-CN/i.test(voice.lang)) ||
    voices.find((voice) => /zh-TW|cmn-Hant-TW/i.test(voice.lang)) ||
    voices.find((voice) => voice.lang?.startsWith("zh")) ||
    null
  );
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.82;
  const voice = pickChineseVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function tone(kind = "tap") {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const frequencies = kind === "next" ? [420, 640] : kind === "done" ? [560, 780] : [300, 360];

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequencies[0], now);
  oscillator.frequency.exponentialRampToValueAtTime(frequencies[1], now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

function App() {
  const [lessons, setLessons] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("welcome");
  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === activeId) || lessons[0],
    [lessons, activeId]
  );

  useEffect(() => {
    fetch("/api/lessons")
      .then((response) => response.json())
      .then((data) => {
        setLessons(data.lessons || []);
        setActiveId(data.lessons?.[0]?.id || null);
      });

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, []);

  function openLesson(id) {
    setActiveId(id);
    setView("lesson");
    tone("next");
  }

  return h(
    "main",
    { className: "shell" },
    h(Header, { view, setView }),
    view === "welcome" && h(Welcome, { setView }),
    view === "tutorial" && h(Tutorial, { setView }),
    view === "roadmap" && h(Roadmap, { lessons, activeId, openLesson }),
    view === "lesson" && activeLesson && h(Lesson, { lesson: activeLesson, lessons, openLesson })
  );
}

function Header({ view, setView }) {
  const items = [
    ["welcome", "Home"],
    ["tutorial", "Tutorial"],
    ["roadmap", "Roadmap"],
    ["lesson", "Lesson"]
  ];

  return h(
    "header",
    { className: "topbar" },
    h("button", { className: "brand", onClick: () => setView("welcome") }, "普通话 Path"),
    h(
      "nav",
      null,
      items.map(([id, label]) =>
        h(
          "button",
          {
            key: id,
            className: view === id ? "active" : "",
            onClick: () => {
              setView(id);
              tone();
            }
          },
          label
        )
      )
    )
  );
}

function Mascot() {
  return h(
    "div",
    { className: "mascot", "aria-label": "Mascot" },
    h("div", { className: "mascot-ear left" }),
    h("div", { className: "mascot-ear right" }),
    h("div", { className: "mascot-face" }, h("span", null, "学"))
  );
}

function Welcome({ setView }) {
  return h(
    "section",
    { className: "welcome" },
    h("div", { className: "welcome-copy" },
      h("p", { className: "eyebrow" }, "Sound-first Mandarin tutorials"),
      h("h1", null, "Mandarin Path"),
      h("p", null, "Learn Chinese through radicals, tightly linked words, and one sentence at a time."),
      h("div", { className: "actions" },
        h("button", { className: "primary", onClick: () => { setView("tutorial"); tone("next"); } }, "Start"),
        h("button", { onClick: () => speak("你好，欢迎学习中文。") }, "▶ Mascot")
      )
    ),
    h(Mascot)
  );
}

function Tutorial({ setView }) {
  return h(
    "section",
    { className: "panel" },
    h("h2", null, "Tutorial"),
    h("div", { className: "steps" },
      steps.map((step, index) =>
        h("button", { key: step, onClick: () => tone(index === steps.length - 1 ? "done" : "next") },
          h("span", null, String(index + 1).padStart(2, "0")),
          step
        )
      )
    ),
    h("button", { className: "primary", onClick: () => { setView("roadmap"); tone("next"); } }, "Open Roadmap")
  );
}

function Roadmap({ lessons, activeId, openLesson }) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const nodes = Array.from({ length: 300 }, (_, index) => index + 1);

  return h(
    "section",
    { className: "panel" },
    h("h2", null, "Roadmap"),
    h("div", { className: "roadmap" },
      nodes.map((id) => {
        const lesson = byId.get(id);
        return h("button", {
          key: id,
          className: `lesson-dot ${lesson ? "ready" : "locked"} ${activeId === id ? "selected" : ""}`,
          disabled: !lesson,
          onClick: () => lesson && openLesson(id),
          title: lesson ? lesson.title : `Lesson ${id}`
        }, lesson ? id : "·");
      })
    )
  );
}

function Lesson({ lesson, lessons, openLesson }) {
  const next = lessons.find((item) => item.id === lesson.id + 1);

  return h(
    "section",
    { className: "lesson" },
    h("div", { className: "lesson-head" },
      h("div", null, h("p", { className: "eyebrow" }, `Lesson ${lesson.id}`), h("h2", null, lesson.title)),
      h("button", { onClick: () => speak(lesson.reading.sentence) }, "▶ Sentence")
    ),
    h("div", { className: "grid two" },
      h(Card, { title: "Radicals" },
        h("div", { className: "tiles" },
          lesson.radicals.map((radical) =>
            h("button", { className: "tile radical", key: radical.character, onClick: () => speak(radical.character) },
              h("strong", null, radical.character),
              h("span", null, radical.meaning)
            )
          )
        )
      ),
      h(Card, { title: "Words" },
        h("div", { className: "word-list" },
          lesson.words.map((word) =>
            h("button", { key: word.hanzi, onClick: () => speak(word.hanzi) },
              h("strong", null, word.hanzi),
              h("span", null, word.pinyin),
              h("em", null, word.meaning),
              h("small", null, word.radicals.join(" "))
            )
          )
        )
      )
    ),
    h(Card, { title: "Reading" },
      h("div", { className: "dictionary" },
        lesson.words.map((word) => h("span", { key: word.hanzi }, `${word.hanzi} ${word.meaning}`))
      ),
      h("button", { className: "sentence", onClick: () => speak(lesson.reading.sentence) }, lesson.reading.sentence),
      h("p", { className: "translation" }, lesson.reading.translation),
      h("div", { className: "grammar" },
        h("strong", null, lesson.reading.grammar.title),
        h("p", null, lesson.reading.grammar.explanation)
      )
    ),
    h("div", { className: "footer-actions" },
      h("button", { onClick: () => openLesson(1) }, "First Lesson"),
      next && h("button", { className: "primary", onClick: () => openLesson(next.id) }, "Next Lesson")
    )
  );
}

function Card({ title, children }) {
  return h("section", { className: "card" }, h("h3", null, title), children);
}

createRoot(document.getElementById("root")).render(h(App));
