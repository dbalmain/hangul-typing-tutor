import {
  KEYS,
  KEY_ROWS,
  LESSON_COUNT,
  LINES_PER_DRILL,
  PASS_ACCURACY,
  PASS_NEW,
  generateLine,
  introduced,
  keyLabel,
  mulberry32,
  poolForLesson,
  preferredShift,
  sameStroke,
  stageName,
  strokeMatches,
} from "./tutor.js";

const STORAGE = "hangul-keys-progress-v1";

const eyebrow = document.querySelector("#eyebrow");
const title = document.querySelector("#title");
const score = document.querySelector("#score");
const help = document.querySelector("#help");
const stage = document.querySelector("#stage");
const callout = document.querySelector("#callout");
const board = document.querySelector("#board");
const lessonSelect = document.querySelector("#lesson");
const repeatButton = document.querySelector("#repeat");
const nextButton = document.querySelector("#next");
const resetButton = document.querySelector("#reset");

let progress = loadProgress();
let drill = null;
let badTimer = 0;
let optionSignature = "";

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE) || "");
    const unlocked = clampLesson(data.unlocked ?? 0);
    return {
      unlocked,
      current: clampLesson(Math.min(data.current ?? 0, unlocked)),
      finished: Boolean(data.finished),
    };
  } catch {
    return { unlocked: 0, current: 0, finished: false };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE, JSON.stringify(progress));
}

function clampLesson(index) {
  if (!Number.isInteger(index)) return 0;
  return Math.max(0, Math.min(LESSON_COUNT - 1, index));
}

function startDrill() {
  const rng = mulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0);
  const lines = [];
  for (let i = 0; i < LINES_PER_DRILL; i++) lines.push(generateLine(progress.current, rng));
  drill = {
    lines,
    li: 0,
    wi: 0,
    ki: 0,
    correct: 0,
    wrong: 0,
    newHits: 0,
    newMisses: 0,
    phase: "drill",
    badCode: null,
  };
  render();
}

function currentWord() {
  return drill.lines[drill.li][drill.wi];
}

function introducedNow() {
  return introduced(progress.current);
}

function isNew(stroke) {
  return introducedNow().some((item) => sameStroke(item, stroke));
}

function stats() {
  const total = drill.correct + drill.wrong;
  const accuracy = total === 0 ? 1 : drill.correct / total;
  const neu = drill.newHits + drill.newMisses;
  const neuAccuracy = neu === 0 ? 0 : drill.newHits / neu;
  const passed = total > 0 && accuracy >= PASS_ACCURACY && neu > 0 && neuAccuracy >= PASS_NEW;
  return { total, accuracy, neu, neuAccuracy, passed };
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function onKey(event) {
  if (event.repeat) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const tag = event.target && event.target.tagName;
  if (tag === "BUTTON" || tag === "SELECT" || tag === "OPTION") return;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") return;
  const typing = event.code === "Space" || event.code === "Backspace" || event.code.startsWith("Key");
  if (!typing) return;
  event.preventDefault();
  if (!drill || drill.phase !== "drill") return;
  if (event.code === "Backspace") {
    undo();
    return;
  }
  press({ code: event.code, shift: event.shiftKey });
}

function undo() {
  if (drill.ki === 0) return;
  drill.ki -= 1;
  drill.correct -= 1;
  if (isNew(currentWord().strokes[drill.ki])) drill.newHits -= 1;
  render();
}

function press(pressed) {
  const word = currentWord();
  if (drill.ki === word.strokes.length) {
    if (pressed.code === "Space" && !pressed.shift) advanceWord();
    else markWrong(pressed.code, null);
    return;
  }
  const expected = word.strokes[drill.ki];
  if (strokeMatches(expected, pressed)) {
    drill.ki += 1;
    drill.correct += 1;
    if (isNew(expected)) drill.newHits += 1;
    render();
    return;
  }
  markWrong(pressed.code, expected);
}

function markWrong(code, expected) {
  drill.wrong += 1;
  if (expected && isNew(expected)) drill.newMisses += 1;
  drill.badCode = code;
  window.clearTimeout(badTimer);
  badTimer = window.setTimeout(() => {
    if (drill) drill.badCode = null;
    render();
  }, 160);
  render();
}

function advanceWord() {
  drill.ki = 0;
  drill.wi += 1;
  if (drill.wi < drill.lines[drill.li].length) {
    render();
    return;
  }
  drill.wi = 0;
  drill.li += 1;
  if (drill.li < drill.lines.length) {
    render();
    return;
  }
  drill.phase = "summary";
  const { passed } = stats();
  if (passed && progress.current < LESSON_COUNT - 1) {
    progress.unlocked = Math.max(progress.unlocked, progress.current + 1);
  }
  if (passed && progress.current === LESSON_COUNT - 1) progress.finished = true;
  saveProgress();
  render();
}

function chip(stroke, state) {
  const shift = stroke.shift ? `<small>${preferredShift(stroke)} shift</small>` : "";
  return `<kbd class="${state}">${shift}${stroke.us}</kbd>`;
}

function renderStage() {
  if (drill.phase === "summary") {
    const { accuracy, neuAccuracy, passed } = stats();
    const intro = introducedNow();
    const introText = intro.map((stroke) => `${keyLabel(stroke)} ${stroke.jamo}`).join(" and ");
    const nextLesson = progress.current + 1;
    let detail;
    if (passed && nextLesson < LESSON_COUNT) {
      const upcoming = introduced(nextLesson)
        .map((stroke) => `${keyLabel(stroke)} ${stroke.jamo}`)
        .join(" and ");
      detail = `Next letter: ${upcoming}.`;
    } else if (passed) {
      detail = "That was the last letter. The set now includes every 두벌식 key.";
    } else {
      detail = `${percent(PASS_ACCURACY)} overall and ${percent(PASS_NEW)} on ${introText} unlocks the next letter.`;
    }
    stage.innerHTML = `<div class="summary">
      <p class="big ${passed ? "pass" : "fail"}">${percent(accuracy)}</p>
      <p>${introText} was ${percent(neuAccuracy)}.</p>
      <p>${detail}</p>
    </div>`;
    return;
  }

  const words = drill.lines[drill.li];
  stage.innerHTML = `<div class="line">${words
    .map((word, index) => {
      if (index < drill.wi) {
        return `<div class="word done"><span class="hangul">${word.text}</span></div>`;
      }
      const chips = word.strokes
        .map((stroke, keyIndex) => {
          const state = index !== drill.wi ? "" : keyIndex < drill.ki ? "done" : keyIndex === drill.ki ? "now" : "";
          return chip(stroke, state);
        })
        .join("");
      const space =
        index === drill.wi && drill.ki === word.strokes.length ? `<kbd class="now">Space</kbd>` : "";
      const klass = index === drill.wi ? "now" : "ahead";
      return `<div class="word ${klass}"><span class="hangul">${word.text}</span><span class="chips">${chips}${space}</span></div>`;
    })
    .join("")}</div>`;
}

function renderCallout() {
  if (!drill || drill.phase !== "drill") {
    callout.hidden = true;
    callout.innerHTML = "";
    return;
  }
  const word = currentWord();
  callout.hidden = false;
  if (drill.ki === word.strokes.length) {
    callout.innerHTML = `<p class="finger">thumb</p><p class="bigkey">Space</p><p class="jamo-note">next word</p>`;
    return;
  }
  const stroke = word.strokes[drill.ki];
  const shift = stroke.shift ? `${preferredShift(stroke)} shift, then ` : "";
  callout.innerHTML = `<p class="finger">${shift}${stroke.finger}</p><p class="bigkey">${stroke.us}</p><p class="jamo-note">${stroke.jamo}</p>`;
}

function keyUnlocked(code) {
  const pool = poolForLesson(progress.current);
  const key = KEYS[code];
  return pool.some((stroke) => stroke.jamo === key.jamo || stroke.jamo === key.shiftJamo);
}

function renderBoard() {
  const expected =
    drill && drill.phase === "drill" && drill.ki < currentWord().strokes.length
      ? currentWord().strokes[drill.ki]
      : null;
  const pool = poolForLesson(progress.current);
  const rows = KEY_ROWS.map((row, index) => {
    const keys = row
      .map((code) => {
        const key = KEYS[code];
        const unlocked = keyUnlocked(code);
        const shiftUnlocked = key.shiftJamo && pool.some((stroke) => stroke.jamo === key.shiftJamo);
        const classes = ["key"];
        if (key.home) classes.push("home");
        if (key.bump) classes.push("bump");
        if (!unlocked) classes.push("locked");
        if (expected && expected.code === code) classes.push("next");
        if (drill && drill.badCode === code) classes.push("bad");
        const alt = shiftUnlocked ? `<span class="alt">${key.shiftJamo}</span>` : "";
        return `<div class="${classes.join(" ")}">${alt}<span class="us">${key.us}</span><span class="ko">${key.jamo}</span></div>`;
      })
      .join("");
    const klass = index === 1 ? "home" : index === 2 ? "bottom" : "top";
    if (index !== 2) return `<div class="row ${klass}">${keys}</div>`;
    const shiftClass = (side) => {
      const on = expected && expected.shift && preferredShift(expected) === side;
      return `key shift${on ? " next" : ""}`;
    };
    return `<div class="row ${klass}"><div class="${shiftClass("left")}">left shift</div>${keys}<div class="${shiftClass("right")}">right shift</div></div>`;
  });
  board.innerHTML = rows.join("");
}

function renderChrome() {
  const lesson = progress.current;
  const intro = introduced(lesson)
    .map((stroke) => `${keyLabel(stroke)} ${stroke.jamo}`)
    .join("  ·  ");
  eyebrow.textContent = `Lesson ${lesson + 1} of ${LESSON_COUNT} · ${stageName(lesson)}`;
  title.textContent = intro;
  help.textContent =
    "Fingers rest on A S D F and J K L. The bumps are under F and J. The page reads the physical key, so a US keyboard works with Korean input on or off.";
  if (!drill || drill.correct + drill.wrong === 0) {
    score.textContent = drill && drill.phase === "drill" ? `Line 1 of ${LINES_PER_DRILL}` : "";
  } else if (drill.phase === "drill") {
    score.textContent = `${percent(stats().accuracy)} · line ${drill.li + 1} of ${LINES_PER_DRILL}`;
  } else {
    score.textContent = percent(stats().accuracy);
  }

  const { passed } = drill && drill.phase === "summary" ? stats() : { passed: false };
  const more = lesson < LESSON_COUNT - 1;
  nextButton.disabled = !(drill && drill.phase === "summary" && passed && more);
  nextButton.textContent = progress.finished && !more ? "All letters unlocked" : "Add the next letter";

  const signature = `${progress.unlocked}:${progress.finished}`;
  if (signature !== optionSignature) {
    optionSignature = signature;
    lessonSelect.innerHTML = "";
    for (let i = 0; i < LESSON_COUNT; i++) {
      const option = document.createElement("option");
      option.value = String(i);
      const label = introduced(i)
        .map((stroke) => stroke.jamo)
        .join(" ");
      option.textContent = `${i + 1}  ${label}`;
      option.disabled = i > progress.unlocked;
      lessonSelect.append(option);
    }
  }
  if (lessonSelect.value !== String(lesson)) lessonSelect.value = String(lesson);
}

function render() {
  renderChrome();
  renderStage();
  renderCallout();
  renderBoard();
}

window.addEventListener("keydown", onKey, true);

repeatButton.addEventListener("click", () => {
  repeatButton.blur();
  startDrill();
});

nextButton.addEventListener("click", () => {
  nextButton.blur();
  if (progress.current >= LESSON_COUNT - 1) return;
  progress.current += 1;
  progress.unlocked = Math.max(progress.unlocked, progress.current);
  saveProgress();
  startDrill();
});

lessonSelect.addEventListener("change", () => {
  const next = clampLesson(Number(lessonSelect.value));
  if (next > progress.unlocked) return;
  progress.current = next;
  saveProgress();
  lessonSelect.blur();
  startDrill();
});

resetButton.addEventListener("click", () => {
  resetButton.blur();
  if (!window.confirm("Clear lesson progress and start from ㅇ and ㅏ?")) return;
  progress = { unlocked: 0, current: 0, finished: false };
  saveProgress();
  startDrill();
});

startDrill();
