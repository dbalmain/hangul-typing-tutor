import {
  KEYS,
  KEY_ROWS,
  ORDER,
  RECENT_CAP,
  applyPlace,
  emptyMeter,
  focusStroke,
  generatePracticeLine,
  isBoardToggle,
  isCompetent,
  isHintRequest,
  keyLabel,
  meterView,
  mulberry32,
  normalizeMeter,
  noteAttempt,
  placeIndex,
  preferredShift,
  recordRound,
  renderStrokes,
  scoreKey,
  stageName,
  statusReport,
  strokeKey,
  strokeMatches,
  struggling,
  syllableParts,
  undoHit,
} from "./tutor.js";

const STORAGE = "hangul-keys-progress-v2";
const LEGACY = "hangul-keys-progress-v1";
const KEYBOARD = "hangul-keys-keyboard";

const eyebrow = document.querySelector("#eyebrow");
const title = document.querySelector("#title");
const score = document.querySelector("#score");
const help = document.querySelector("#help");
const struggle = document.querySelector("#struggle");
const stage = document.querySelector("#stage");
const callout = document.querySelector("#callout");
const board = document.querySelector("#board");
const repeatButton = document.querySelector("#repeat");
const placeSelect = document.querySelector("#place");
const resetButton = document.querySelector("#reset");
const keyboardButton = document.querySelector("#keyboard");
const saveButton = document.querySelector("#save");

let progress = loadProgress();
let keyboardHidden = localStorage.getItem(KEYBOARD) === "hidden";
let drill = null;
let badTimer = 0;

function freshProgress() {
  return { pool: 2, tally: {}, finished: false, meter: emptyMeter() };
}

function clampPool(pool) {
  if (!Number.isInteger(pool)) return 2;
  return Math.max(2, Math.min(ORDER.length, pool));
}

function loadProgress() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE) || ""));
  } catch {
    try {
      const old = JSON.parse(localStorage.getItem(LEGACY) || "");
      const lesson = Number.isInteger(old.current) ? old.current : 0;
      return normalize({ pool: lesson + 2, tally: {}, finished: old.finished });
    } catch {
      return freshProgress();
    }
  }
}

function keptRecent(recent) {
  if (!Array.isArray(recent)) return [];
  const bits = [];
  for (const bit of recent) {
    if (bit === 0 || bit === 1) bits.push(bit);
  }
  return bits.slice(-RECENT_CAP);
}

function normalize(data) {
  const tally = {};
  if (data.tally && typeof data.tally === "object") {
    for (const [key, stat] of Object.entries(data.tally)) {
      if (!stat || typeof stat !== "object") continue;
      const recent = keptRecent(stat.recent);
      tally[key] = {
        hit: Math.max(0, stat.hit | 0),
        miss: Math.max(0, stat.miss | 0),
        ...(recent.length ? { recent } : {}),
      };
    }
  }
  return {
    pool: clampPool(data.pool),
    tally,
    finished: Boolean(data.finished),
    meter: normalizeMeter(data.meter),
  };
}

function saveProgress() {
  localStorage.setItem(STORAGE, JSON.stringify(progress));
}

function currentPool() {
  return ORDER.slice(0, progress.pool);
}

function note(stroke, bit) {
  const key = strokeKey(stroke);
  progress.tally[key] = noteAttempt(progress.tally[key], bit);
  saveProgress();
}

function applyKeyboard() {
  document.body.classList.toggle("keyboard-hidden", keyboardHidden);
  keyboardButton.textContent = keyboardHidden ? "Show keyboard (`)" : "Hide keyboard (`)";
  keyboardButton.setAttribute("aria-pressed", String(keyboardHidden));
}

function toggleKeyboard() {
  keyboardHidden = !keyboardHidden;
  localStorage.setItem(KEYBOARD, keyboardHidden ? "hidden" : "shown");
  applyKeyboard();
}

function beginLine(notice = "") {
  const pool = currentPool();
  const focus = focusStroke(pool, progress.tally);
  const rng = mulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0);
  drill = {
    words: generatePracticeLine(rng, pool, focus),
    wi: 0,
    ki: 0,
    correct: 0,
    wrong: 0,
    burst: false,
    phase: "drill",
    badCode: null,
    hint: false,
    notice,
  };
  render();
}

/** The bar, not the per-letter window, adds the next letter. */
function closeRound() {
  const recorded = recordRound(progress.meter, { hit: drill.correct, miss: drill.wrong });
  progress.meter = recorded.meter;
  let notice = "";
  if (recorded.filled && progress.pool < ORDER.length) {
    progress.pool += 1;
    notice = `Added ${ORDER[progress.pool - 1].jamo}`;
    progress.meter = emptyMeter();
    progress.finished = false;
  } else if (recorded.filled && !progress.finished) {
    progress.finished = true;
    notice = "Full set";
    progress.meter = emptyMeter();
  }
  saveProgress();
  beginLine(notice);
}

function currentWord() {
  return drill.words[drill.wi];
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function onKey(event) {
  if (event.repeat) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isBoardToggle(event.code, event.shiftKey)) {
    event.preventDefault();
    toggleKeyboard();
    return;
  }
  const tag = event.target && event.target.tagName;
  if (tag === "BUTTON" || tag === "SELECT" || tag === "OPTION") return;
  if (isHintRequest(event.code, event.shiftKey, event.key)) {
    event.preventDefault();
    if (!drill || drill.phase !== "drill") return;
    drill.hint = !drill.hint;
    render();
    return;
  }
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
  drill.burst = false;
  const stroke = currentWord().strokes[drill.ki];
  progress.tally[strokeKey(stroke)] = undoHit(progress.tally[strokeKey(stroke)]);
  saveProgress();
  drill.hint = false;
  render();
}

function press(pressed) {
  const word = currentWord();
  const atEnd = drill.ki === word.strokes.length;
  const correct = atEnd
    ? pressed.code === "Space" && !pressed.shift
    : strokeMatches(word.strokes[drill.ki], pressed);
  const scored = scoreKey(drill.burst, correct);
  drill.burst = scored.burst;
  if (correct) {
    if (atEnd) {
      advanceWord();
      return;
    }
    const expected = word.strokes[drill.ki];
    drill.ki += 1;
    drill.correct += 1;
    note(expected, 1);
    drill.hint = false;
    render();
    return;
  }
  if (scored.miss) {
    drill.wrong += 1;
    if (!atEnd) note(word.strokes[drill.ki], 0);
  }
  drill.badCode = pressed.code;
  window.clearTimeout(badTimer);
  badTimer = window.setTimeout(() => {
    if (drill) drill.badCode = null;
    render();
  }, 160);
  render();
}

function advanceWord() {
  drill.ki = 0;
  drill.hint = false;
  drill.burst = false;
  drill.wi += 1;
  if (drill.wi < drill.words.length) {
    render();
    return;
  }
  closeRound();
}

function chip(stroke, state) {
  const shift = stroke.shift ? `<small>${preferredShift(stroke)} shift</small>` : "";
  return `<kbd class="${state}">${shift}${stroke.us}</kbd>`;
}

function vowelFit(parts) {
  const vertical = parts.find((part) => part.role === "v");
  if (!vertical) return "";
  if ("ㅐㅔㅒㅖ".includes(vertical.jamo)) return "v-wide";
  if (vertical.jamo === "ㅣ") return "v-narrow";
  return "v-std";
}

function glyphHtml(strokes, at) {
  const composed = renderStrokes(strokes);
  const { kind, parts } = syllableParts(strokes);
  const jongs = parts.filter((part) => part.role === "jong");
  const slices = parts.map((part) => {
    const state = part.index < at ? "done" : part.index === at ? "now" : "ahead";
    const split = part.role === "jong" && jongs.length > 1 ? (part.index === jongs[0].index ? " j1" : " j2") : "";
    return `<span class="slice ${part.role}${split} ${state}" aria-hidden="true"><span>${composed}</span></span>`;
  });
  const flags = [
    kind,
    kind === "mixed" ? vowelFit(parts) : "",
    jongs.length ? "has-jong" : "",
    jongs.length > 1 ? "split" : "",
  ].filter(Boolean);
  return `<span class="glyph ${flags.join(" ")}" role="img" aria-label="${composed}">${slices.join("")}</span>`;
}

function renderHangul(word, active) {
  if (!active || !word.syllables || drill.ki >= word.strokes.length) {
    return `<span class="hangul">${word.text}</span>`;
  }
  let offset = 0;
  const pieces = word.syllables.map((strokes) => {
    const end = offset + strokes.length;
    let html;
    if (drill.ki >= end) html = `<span class="syllable done">${renderStrokes(strokes)}</span>`;
    else if (drill.ki >= offset) html = glyphHtml(strokes, drill.ki - offset);
    else html = `<span class="syllable ahead">${renderStrokes(strokes)}</span>`;
    offset = end;
    return html;
  });
  return `<span class="hangul">${pieces.join("")}</span>`;
}

function renderStage() {
  const words = drill.words;
  stage.innerHTML = `<div class="line">${words
    .map((word, index) => {
      const active = index === drill.wi;
      const ready = active && drill.ki === word.strokes.length;
      let chips = "";
      if (drill.hint) {
        chips = word.strokes
          .map((stroke, keyIndex) => {
            const state = !active ? "" : keyIndex < drill.ki ? "done" : keyIndex === drill.ki ? "now" : "";
            return chip(stroke, state);
          })
          .join("");
        if (ready) chips += `<kbd class="now">Space</kbd>`;
        chips = `<span class="chips">${chips}</span>`;
      }
      const klass = index < drill.wi || ready ? "done" : active ? "now" : "ahead";
      return `<div class="word ${klass}">${renderHangul(word, active)}${chips}</div>`;
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
    callout.innerHTML = drill.hint
      ? `<p class="finger">thumb</p><p class="bigkey">Space</p><p class="jamo-note">next word</p>`
      : `<p class="jamo-note">next word</p>`;
    return;
  }
  const stroke = word.strokes[drill.ki];
  if (!drill.hint) {
    callout.innerHTML = `<p class="finger">${stroke.finger}</p>`;
    return;
  }
  const shift = stroke.shift ? `${preferredShift(stroke)} shift, then ` : "";
  callout.innerHTML = `<p class="finger">${shift}${stroke.finger}</p><p class="bigkey">${stroke.us}</p><p class="jamo-note">${stroke.jamo}</p>`;
}

function keyUnlocked(code) {
  const pool = currentPool();
  const key = KEYS[code];
  return pool.some((stroke) => stroke.jamo === key.jamo || stroke.jamo === key.shiftJamo);
}

function renderBoard() {
  const expected =
    drill && drill.phase === "drill" && drill.ki < currentWord().strokes.length
      ? currentWord().strokes[drill.ki]
      : null;
  const pool = currentPool();
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

function renderStruggle() {
  const items = struggling(currentPool(), progress.tally, 5);
  if (!items.length) {
    struggle.hidden = true;
    struggle.textContent = "";
    return;
  }
  struggle.hidden = false;
  const body = items
    .map((item) => `${item.stroke.jamo} ${item.miss}`)
    .join("  ·  ");
  struggle.innerHTML = `<span>Missed most</span>  ${body}`;
}

function renderChrome() {
  const pool = currentPool();
  const learning = pool.filter((stroke) => !isCompetent(progress.tally[strokeKey(stroke)]));
  const shown = learning.length ? learning : pool.slice(-1);
  document.body.classList.toggle("hints", Boolean(drill && drill.hint));
  eyebrow.textContent = `${progress.pool} of ${ORDER.length} · ${stageName(progress.pool - 2)}`;
  title.textContent = shown
    .map((stroke) => (drill && drill.hint ? `${keyLabel(stroke)} ${stroke.jamo}` : stroke.jamo))
    .join("  ·  ");
  help.textContent =
    "Fingers rest on the home row. The bumps are under the index fingers. The syllable marks the piece to type next. Press ? to see the US key, and ` to hide the keyboard. The page reads the physical key, so a US keyboard works with Korean input on or off. A run of wrong keys counts once. The bar is the next letter.";
  renderScore();
  placeSelect.value = String(placeIndex(progress.pool, progress.tally));
  renderStruggle();
}

function renderScore() {
  const partial = drill ? { hit: drill.correct, miss: drill.wrong } : null;
  const view = meterView(progress.meter, partial);
  const parts = [];
  if (drill && drill.notice) parts.push(drill.notice);
  if (view.accuracy != null) parts.push(percent(view.accuracy));
  score.replaceChildren();
  if (parts.length) {
    const text = document.createElement("span");
    text.className = "score-text";
    text.textContent = parts.join(" · ");
    score.append(text);
  }
  if (progress.pool >= ORDER.length) return;
  const meter = document.createElement("span");
  meter.className = "meter";
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "100");
  meter.setAttribute("aria-valuenow", String(Math.round(view.progress * 100)));
  meter.setAttribute("aria-label", "Progress to the next letter");
  meter.title = "Next letter. Four clean lines fill this. The last 4 lines set the pace, and at 40% or below it stays empty.";
  const fill = document.createElement("span");
  fill.className = "meter-fill";
  fill.style.width = `${view.progress * 100}%`;
  meter.append(fill);
  score.append(meter);
}

function render() {
  renderChrome();
  renderStage();
  renderCallout();
  renderBoard();
}

window.addEventListener("keydown", onKey, true);

applyKeyboard();

keyboardButton.addEventListener("click", () => {
  keyboardButton.blur();
  toggleKeyboard();
});

let saveTimer = 0;

function flashSave(text) {
  window.clearTimeout(saveTimer);
  saveButton.textContent = text;
  saveTimer = window.setTimeout(() => {
    saveButton.textContent = "Save status";
  }, 1400);
}

async function saveStatus() {
  saveButton.blur();
  const report = statusReport(progress, {
    keyboard: keyboardHidden ? "hidden" : "shown",
    drill: drill
      ? {
          correct: drill.correct,
          wrong: drill.wrong,
          rounds: progress.meter.rounds,
          accuracy: meterView(progress.meter, { hit: drill.correct, miss: drill.wrong }).accuracy,
          towardNext:
            progress.pool < ORDER.length
              ? meterView(progress.meter, { hit: drill.correct, miss: drill.wrong }).progress
              : null,
        }
      : null,
  });
  report.savedAt = new Date().toISOString();
  try {
    const response = await fetch("/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error(String(response.status));
    flashSave("Saved");
  } catch {
    flashSave("Save failed");
  }
}

saveButton.addEventListener("click", () => {
  saveStatus();
});

repeatButton.addEventListener("click", () => {
  repeatButton.blur();
  beginLine("");
});

function fillPlace() {
  /** @type {Map<string, HTMLOptGroupElement>} */
  const groups = new Map();
  ORDER.forEach((stroke, index) => {
    const name = stageName(Math.max(0, index - 1));
    let group = groups.get(name);
    if (!group) {
      group = document.createElement("optgroup");
      group.label = name;
      groups.set(name, group);
    }
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = stroke.jamo;
    group.append(option);
  });
  placeSelect.replaceChildren(...groups.values());
}

fillPlace();

placeSelect.addEventListener("change", () => {
  const index = Number(placeSelect.value);
  const current = placeIndex(progress.pool, progress.tally);
  if (index === current) return;
  placeSelect.blur();
  const jamo = ORDER[index].jamo;
  const message =
    index === 0
      ? "Start over from ㅇ and ㅏ?"
      : index > current
        ? `Practice from ${jamo}? Earlier letters will count as learned.`
        : `Go back to ${jamo}? Later letters will need to be learned again.`;
  if (!window.confirm(message)) {
    placeSelect.value = String(current);
    return;
  }
  const applied = applyPlace(index);
  if (!applied) {
    placeSelect.value = String(current);
    return;
  }
  progress = {
    pool: applied.pool,
    tally: applied.tally,
    finished: applied.finished,
    meter: applied.meter,
  };
  saveProgress();
  beginLine(applied.notice);
});

resetButton.addEventListener("click", () => {
  resetButton.blur();
  if (!window.confirm("Clear progress and start from ㅇ and ㅏ?")) return;
  progress = freshProgress();
  saveProgress();
  beginLine("");
});

beginLine("");
