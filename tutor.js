// 두벌식 drills. The text on screen is whatever the key sequence produces,
// and a batchim is only allowed on the last syllable of a word. A following
// syllable always starts with a consonant, so the batchim is not stolen and
// does not glue onto the next initial (갈+가 would otherwise become 갉).

const CHO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const JONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const JUNG_COMBINE = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅘㅣ: "ㅙ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅝㅣ: "ㅞ",
  ㅡㅣ: "ㅢ",
};

const JONG_CLUSTER = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
};

const JONG_SPLIT = Object.fromEntries(
  Object.entries(JONG_CLUSTER).map(([pair, cluster]) => [cluster, [...pair]]),
);

const VOWELS = new Set([..."ㅛㅕㅑㅐㅔㅗㅓㅏㅣㅠㅜㅡㅒㅖ"]);
// Vowels that sit under the initial. The rest sit to its right.
const HORIZONTAL_VOWEL = new Set([..."ㅗㅛㅜㅠㅡ"]);

/** @type {Record<string, { us: string, jamo: string, shiftJamo: string | null, finger: string, home: boolean, bump: boolean }>} */
export const KEYS = {
  KeyQ: { us: "Q", jamo: "ㅂ", shiftJamo: "ㅃ", finger: "left pinky", home: false, bump: false },
  KeyW: { us: "W", jamo: "ㅈ", shiftJamo: "ㅉ", finger: "left ring", home: false, bump: false },
  KeyE: { us: "E", jamo: "ㄷ", shiftJamo: "ㄸ", finger: "left middle", home: false, bump: false },
  KeyR: { us: "R", jamo: "ㄱ", shiftJamo: "ㄲ", finger: "left index", home: false, bump: false },
  KeyT: { us: "T", jamo: "ㅅ", shiftJamo: "ㅆ", finger: "left index", home: false, bump: false },
  KeyY: { us: "Y", jamo: "ㅛ", shiftJamo: null, finger: "right index", home: false, bump: false },
  KeyU: { us: "U", jamo: "ㅕ", shiftJamo: null, finger: "right index", home: false, bump: false },
  KeyI: { us: "I", jamo: "ㅑ", shiftJamo: null, finger: "right middle", home: false, bump: false },
  KeyO: { us: "O", jamo: "ㅐ", shiftJamo: "ㅒ", finger: "right ring", home: false, bump: false },
  KeyP: { us: "P", jamo: "ㅔ", shiftJamo: "ㅖ", finger: "right pinky", home: false, bump: false },
  KeyA: { us: "A", jamo: "ㅁ", shiftJamo: null, finger: "left pinky", home: true, bump: false },
  KeyS: { us: "S", jamo: "ㄴ", shiftJamo: null, finger: "left ring", home: true, bump: false },
  KeyD: { us: "D", jamo: "ㅇ", shiftJamo: null, finger: "left middle", home: true, bump: false },
  KeyF: { us: "F", jamo: "ㄹ", shiftJamo: null, finger: "left index", home: true, bump: true },
  KeyG: { us: "G", jamo: "ㅎ", shiftJamo: null, finger: "left index", home: true, bump: false },
  KeyH: { us: "H", jamo: "ㅗ", shiftJamo: null, finger: "right index", home: true, bump: false },
  KeyJ: { us: "J", jamo: "ㅓ", shiftJamo: null, finger: "right index", home: true, bump: true },
  KeyK: { us: "K", jamo: "ㅏ", shiftJamo: null, finger: "right middle", home: true, bump: false },
  KeyL: { us: "L", jamo: "ㅣ", shiftJamo: null, finger: "right ring", home: true, bump: false },
  KeyZ: { us: "Z", jamo: "ㅋ", shiftJamo: null, finger: "left pinky", home: false, bump: false },
  KeyX: { us: "X", jamo: "ㅌ", shiftJamo: null, finger: "left ring", home: false, bump: false },
  KeyC: { us: "C", jamo: "ㅊ", shiftJamo: null, finger: "left middle", home: false, bump: false },
  KeyV: { us: "V", jamo: "ㅍ", shiftJamo: null, finger: "left index", home: false, bump: false },
  KeyB: { us: "B", jamo: "ㅠ", shiftJamo: null, finger: "left index", home: false, bump: false },
  KeyN: { us: "N", jamo: "ㅜ", shiftJamo: null, finger: "right index", home: false, bump: false },
  KeyM: { us: "M", jamo: "ㅡ", shiftJamo: null, finger: "right index", home: false, bump: false },
};

export const KEY_ROWS = [
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"],
];

// Home row first, one new jamo per lesson after the opening pair.
// A syllable needs a consonant and a vowel, so lesson 1 is D ㅇ and K ㅏ.
const ORDER_SPEC = [
  ["KeyD", false],
  ["KeyK", false],
  ["KeyS", false],
  ["KeyL", false],
  ["KeyJ", false],
  ["KeyF", false],
  ["KeyH", false],
  ["KeyA", false],
  ["KeyG", false],
  ["KeyR", false],
  ["KeyT", false],
  ["KeyE", false],
  ["KeyN", false],
  ["KeyM", false],
  ["KeyO", false],
  ["KeyP", false],
  ["KeyQ", false],
  ["KeyW", false],
  ["KeyU", false],
  ["KeyC", false],
  ["KeyI", false],
  ["KeyX", false],
  ["KeyZ", false],
  ["KeyV", false],
  ["KeyY", false],
  ["KeyB", false],
  ["KeyT", true],
  ["KeyR", true],
  ["KeyE", true],
  ["KeyQ", true],
  ["KeyW", true],
  ["KeyO", true],
  ["KeyP", true],
];

const COMPOUND_JUNG = [
  ["ㅗ", "ㅏ"],
  ["ㅗ", "ㅐ"],
  ["ㅗ", "ㅣ"],
  ["ㅜ", "ㅓ"],
  ["ㅜ", "ㅔ"],
  ["ㅜ", "ㅣ"],
  ["ㅡ", "ㅣ"],
];

const COMPOUND_JONG = Object.keys(JONG_CLUSTER).map((pair) => [...pair]);

/**
 * @typedef {Object} Stroke
 * @property {string} code
 * @property {boolean} shift
 * @property {string} jamo
 * @property {string} us
 * @property {string} finger
 * @property {boolean} vowel
 */

/** @param {[string, boolean]} spec */
export function strokeOf(spec) {
  const [code, shift] = spec;
  const key = KEYS[code];
  if (!key) throw new Error(`unknown key ${code}`);
  const jamo = shift ? key.shiftJamo : key.jamo;
  if (!jamo) throw new Error(`${key.us} has no shift letter`);
  return {
    code,
    shift,
    jamo,
    us: key.us,
    finger: key.finger,
    vowel: VOWELS.has(jamo),
  };
}

export const ORDER = ORDER_SPEC.map((spec) => strokeOf(spec));

/** Lessons after the opening pair. Lesson 0 teaches the first two jamo. */
export const LESSON_COUNT = ORDER.length - 1;

export const PASS_ACCURACY = 0.95;
export const PASS_NEW = 0.9;
export const MIN_ATTEMPTS = 10;
export const RECENT_CAP = 20;
export const LINES_PER_DRILL = 4;
export const WORDS_PER_LINE = 4;

/** @param {Stroke} stroke */
export function strokeKey(stroke) {
  return `${stroke.code}:${stroke.shift ? 1 : 0}`;
}

/**
 * Last 10 presses, once that many exist. A lifetime ratio never drops an
 * early miss, so two misses on ㄱ used to demand 18 later hits before the
 * next letter could join. Saved tallies with no window keep the lifetime
 * ratio until the new presses fill one.
 * @param {{ hit?: number, miss?: number, recent?: number[] } | null | undefined} stat
 */
export function isCompetent(stat) {
  const recent = cleanRecent(stat?.recent);
  if (recent.length >= MIN_ATTEMPTS) {
    const window = recent.slice(-MIN_ATTEMPTS);
    const hits = window.reduce((sum, bit) => sum + bit, 0);
    return hits / MIN_ATTEMPTS >= PASS_NEW;
  }
  const hit = stat?.hit ?? 0;
  const miss = stat?.miss ?? 0;
  const total = hit + miss;
  return total >= MIN_ATTEMPTS && hit / total >= PASS_NEW;
}

/** @param {unknown} recent */
function cleanRecent(recent) {
  if (!Array.isArray(recent)) return [];
  const bits = [];
  for (const bit of recent) {
    if (bit === 0 || bit === 1) bits.push(bit);
  }
  return bits.slice(-RECENT_CAP);
}

/**
 * @param {{ hit?: number, miss?: number, recent?: number[] } | null | undefined} stat
 * @param {0 | 1} bit
 */
export function noteAttempt(stat, bit) {
  const mark = bit ? 1 : 0;
  return {
    hit: Math.max(0, (stat?.hit ?? 0) + mark),
    miss: Math.max(0, (stat?.miss ?? 0) + (mark ? 0 : 1)),
    recent: [...cleanRecent(stat?.recent), mark].slice(-RECENT_CAP),
  };
}

/**
 * Drop one correct press. A trailing miss stays, because undo only walks
 * back a stroke that was accepted.
 * @param {{ hit?: number, miss?: number, recent?: number[] } | null | undefined} stat
 */
export function undoHit(stat) {
  const recent = cleanRecent(stat?.recent);
  if (recent.at(-1) === 1) recent.pop();
  return {
    hit: Math.max(0, (stat?.hit ?? 0) - 1),
    miss: Math.max(0, stat?.miss ?? 0),
    recent,
  };
}

/** @param {Stroke[]} pool @param {Record<string, {hit: number, miss: number}>} tally */
export function poolIsCompetent(pool, tally) {
  return pool.every((stroke) => isCompetent(tally[strokeKey(stroke)]));
}

/**
 * Letters with at least one miss, most misses first.
 * @param {Stroke[]} pool
 * @param {Record<string, {hit: number, miss: number}>} tally
 * @param {number} [limit]
 */
export function struggling(pool, tally, limit = 5) {
  return pool
    .map((stroke) => {
      const stat = tally[strokeKey(stroke)] ?? { hit: 0, miss: 0 };
      const total = stat.hit + stat.miss;
      return {
        stroke,
        hit: stat.hit,
        miss: stat.miss,
        accuracy: total === 0 ? 1 : stat.hit / total,
      };
    })
    .filter((item) => item.miss > 0)
    .sort(
      (a, b) =>
        b.miss - a.miss ||
        a.accuracy - b.accuracy ||
        a.stroke.jamo.codePointAt(0) - b.stroke.jamo.codePointAt(0),
    )
    .slice(0, limit);
}

/**
 * The letter this drill should force into every word.
 * A new letter stays in focus until it is competent. After that, the
 * least competent letter with the most misses does.
 * @param {Stroke[]} pool
 * @param {Record<string, {hit: number, miss: number}>} tally
 * @returns {Stroke | null}
 */
export function focusStroke(pool, tally) {
  if (!pool.length) return null;
  const newest = pool[pool.length - 1];
  if (!isCompetent(tally[strokeKey(newest)])) return newest;
  const weak = struggling(pool, tally, pool.length).find(
    (item) => !isCompetent(tally[strokeKey(item.stroke)]),
  );
  if (weak) return weak.stroke;
  const top = struggling(pool, tally, 1)[0];
  return top ? top.stroke : null;
}

/**
 * Readable copy of saved progress. ./start writes this to status.json.
 * @param {{ pool: number, tally?: Record<string, {hit?: number, miss?: number, recent?: number[]}>, finished?: boolean }} progress
 * @param {{ keyboard?: string, drill?: { line: number, lines: number, correct: number, wrong: number } | null }} [extra]
 */
export function statusReport(progress, extra = {}) {
  const tally = progress.tally ?? {};
  const pool = ORDER.slice(0, progress.pool);
  const focus = focusStroke(pool, tally);
  const letters = pool.map((stroke) => {
    const stat = tally[strokeKey(stroke)] ?? { hit: 0, miss: 0 };
    const recent = Array.isArray(stat.recent) ? stat.recent.filter((bit) => bit === 0 || bit === 1) : [];
    return {
      jamo: stroke.jamo,
      key: keyLabel(stroke),
      hit: stat.hit ?? 0,
      miss: stat.miss ?? 0,
      recent,
      competent: isCompetent(stat),
    };
  });
  return {
    pool: progress.pool,
    lettersTotal: ORDER.length,
    stage: stageName(Math.max(0, progress.pool - 2)),
    finished: Boolean(progress.finished),
    keyboard: extra.keyboard ?? "shown",
    focus: focus ? { jamo: focus.jamo, key: keyLabel(focus) } : null,
    struggling: struggling(pool, tally).map((item) => ({
      jamo: item.stroke.jamo,
      key: keyLabel(item.stroke),
      hit: item.hit,
      miss: item.miss,
    })),
    blocking: letters.filter((letter) => !letter.competent).map((letter) => letter.jamo),
    letters,
    drill: extra.drill ?? null,
  };
}

/** Physical Shift+/ on a US keyboard, or a key that produced "?". */
export function isHintRequest(code, shift, key) {
  return (code === "Slash" && shift) || key === "?";
}

/** Unshifted ` / ~ key. Shifted is not the toggle. */
export function isBoardToggle(code, shift) {
  return code === "Backquote" && !shift;
}

/** @param {number} lessonIndex */
export function poolForLesson(lessonIndex) {
  if (lessonIndex < 0 || lessonIndex >= LESSON_COUNT) {
    throw new Error(`lesson ${lessonIndex} out of range`);
  }
  return ORDER.slice(0, lessonIndex + 2);
}

/** @param {number} lessonIndex */
export function introduced(lessonIndex) {
  const pool = poolForLesson(lessonIndex);
  return lessonIndex === 0 ? pool.slice(0, 2) : pool.slice(-1);
}

/** @param {number} lessonIndex */
export function stageName(lessonIndex) {
  if (lessonIndex <= 7) return "Home row";
  if (lessonIndex <= 24) return "Rest of the keyboard";
  return "Shift";
}

/** A window that already counts as learned. */
export function passingStat() {
  return {
    hit: MIN_ATTEMPTS,
    miss: 0,
    recent: Array.from({ length: MIN_ATTEMPTS }, () => 1),
  };
}

/**
 * The letter the dropdown should show. The opening pair starts at ㅇ.
 * @param {number} poolLength
 * @param {Record<string, {hit?: number, miss?: number, recent?: number[]}>} [tally]
 */
export function placeIndex(poolLength, tally = {}) {
  const pool = ORDER.slice(0, Math.max(0, poolLength | 0));
  const found = pool.findIndex((stroke) => !isCompetent(tally[strokeKey(stroke)]));
  if (found === -1) return Math.max(0, pool.length - 1);
  return found;
}

/**
 * Practice with this letter as the current one. Earlier letters count as
 * learned. The chosen letter is left unlearned. Index 0 keeps the
 * opening pair and clears the tally.
 * @param {number} index
 * @returns {{ pool: number, tally: Record<string, {hit: number, miss: number, recent: number[]}>, finished: boolean, notice: string } | null}
 */
export function applyPlace(index) {
  if (!Number.isInteger(index) || index < 0 || index >= ORDER.length) return null;
  const tally = {};
  for (let i = 0; i < index; i += 1) tally[strokeKey(ORDER[i])] = passingStat();
  return {
    pool: Math.max(2, index + 1),
    tally,
    finished: false,
    notice: index === 0 ? "" : `Up to ${ORDER[index].jamo}`,
  };
}

/** @param {Stroke} stroke */
export function keyLabel(stroke) {
  return stroke.shift ? `Shift+${stroke.us}` : stroke.us;
}

/** Right shift for a left-hand letter, left shift for a right-hand letter. */
export function preferredShift(stroke) {
  return stroke.finger.startsWith("left") ? "right" : "left";
}

/** @param {Stroke} a @param {Stroke} b */
export function sameStroke(a, b) {
  return a.code === b.code && a.shift === b.shift;
}

/**
 * @param {Stroke} stroke
 * @param {{ code: string, shift: boolean }} pressed
 */
export function strokeMatches(stroke, pressed) {
  if (pressed.code !== stroke.code) return false;
  if (KEYS[stroke.code].shiftJamo) return pressed.shift === stroke.shift;
  return true;
}

/** @param {string} cho @param {string} jung @param {string | null} jong */
export function compose(cho, jung, jong) {
  const ci = CHO.indexOf(cho);
  const ji = JUNG.indexOf(jung);
  const ki = JONG.indexOf(jong || "");
  if (ci < 0 || ji < 0 || ki < 0) {
    throw new Error(`cannot compose ${cho}${jung}${jong || ""}`);
  }
  return String.fromCodePoint(0xac00 + (ci * 21 + ji) * 28 + ki);
}

function commit(state) {
  if (state.cho && state.jung) {
    state.out += compose(state.cho, state.jung, state.jong);
  } else if (state.cho) {
    state.out += state.cho;
  } else if (state.jung) {
    state.out += compose("ㅇ", state.jung, null);
  }
  state.cho = null;
  state.jung = null;
  state.jong = null;
}

function preview(state) {
  if (state.cho && state.jung) return compose(state.cho, state.jung, state.jong);
  if (state.cho) return state.cho;
  if (state.jung) return compose("ㅇ", state.jung, null);
  return "";
}

/** @param {Stroke[]} strokes */
export function renderStrokes(strokes) {
  const state = { out: "", cho: null, jung: null, jong: null };
  for (const stroke of strokes) applyJamo(state, stroke.jamo);
  return state.out + preview(state);
}

/** @param {{ out: string, cho: string | null, jung: string | null, jong: string | null }} state */
function applyJamo(state, jamo) {
  if (VOWELS.has(jamo)) {
    if (state.jong) {
      const split = JONG_SPLIT[state.jong];
      const stolen = split ? split[1] : state.jong;
      state.jong = split ? split[0] : null;
      commit(state);
      state.cho = stolen;
    }
    if (!state.cho) state.cho = "ㅇ";
    if (!state.jung) {
      state.jung = jamo;
      return;
    }
    const combined = JUNG_COMBINE[state.jung + jamo];
    if (combined) {
      state.jung = combined;
      return;
    }
    commit(state);
    state.cho = "ㅇ";
    state.jung = jamo;
    return;
  }

  if (!state.cho) {
    state.cho = jamo;
    return;
  }
  if (!state.jung) {
    commit(state);
    state.cho = jamo;
    return;
  }
  if (!state.jong) {
    if (JONG.includes(jamo)) state.jong = jamo;
    else {
      commit(state);
      state.cho = jamo;
    }
    return;
  }
  const cluster = JONG_CLUSTER[state.jong + jamo];
  if (cluster) {
    state.jong = cluster;
    return;
  }
  commit(state);
  state.cho = jamo;
}

function canBeJong(jamo) {
  return JONG.indexOf(jamo) > 0;
}

function pick(rng, list) {
  if (list.length === 0) throw new Error("empty pick");
  return list[Math.floor(rng() * list.length)];
}

/** @param {Stroke[]} vowels */
function jungSequences(vowels) {
  /** @type {Stroke[][]} */
  const sequences = vowels.map((stroke) => [stroke]);
  for (const [a, b] of COMPOUND_JUNG) {
    const left = vowels.find((stroke) => stroke.jamo === a);
    const right = vowels.find((stroke) => stroke.jamo === b);
    if (left && right) sequences.push([left, right]);
  }
  return sequences;
}

/** @param {Stroke[]} consonants */
function jongSequences(consonants) {
  /** @type {Stroke[][]} */
  const sequences = consonants.filter((stroke) => canBeJong(stroke.jamo)).map((stroke) => [stroke]);
  for (const [a, b] of COMPOUND_JONG) {
    const left = consonants.find((stroke) => stroke.jamo === a);
    const right = consonants.find((stroke) => stroke.jamo === b);
    if (left && right) sequences.push([left, right]);
  }
  return sequences;
}

/**
 * @param {() => number} rng
 * @param {Stroke[]} pool
 * @param {Stroke | null} newest
 * @param {boolean} allowJong
 * @returns {Stroke[]}
 */
function syllableStrokes(rng, pool, newest, allowJong) {
  const consonants = pool.filter((stroke) => !stroke.vowel);
  const vowels = pool.filter((stroke) => stroke.vowel);
  let cho = pick(rng, consonants);
  let jung = pick(rng, jungSequences(vowels));
  /** @type {Stroke[]} */
  let jong = [];
  if (allowJong && rng() < 0.65) {
    const options = jongSequences(consonants);
    if (options.length) jong = pick(rng, options);
  }
  if (newest) {
    if (newest.vowel) {
      const biased = jungSequences(vowels).filter((seq) => seq.some((stroke) => sameStroke(stroke, newest)));
      if (biased.length) jung = pick(rng, biased);
    } else if (allowJong && canBeJong(newest.jamo) && rng() < 0.55) {
      const biased = jongSequences(consonants).filter((seq) =>
        seq.some((stroke) => sameStroke(stroke, newest)),
      );
      jong = biased.length ? pick(rng, biased) : [newest];
    } else {
      cho = newest;
    }
  }
  return [cho, ...jung, ...jong];
}

/**
 * Where each stroke sits in a syllable block. A finished Hangul character is
 * one code point, so the pieces have to be drawn separately to color one of
 * them. `h` is the vowel under the initial, `v` is the vowel on its right.
 *
 * @param {Stroke[]} strokes
 * @returns {{ kind: "vertical" | "horizontal" | "mixed", parts: { role: "cho" | "v" | "h" | "jong", jamo: string, index: number }[] }}
 */
export function syllableParts(strokes) {
  /** @type {{ role: "cho" | "v" | "h" | "jong", jamo: string, index: number }[]} */
  const parts = [];
  let horizontal = false;
  let vertical = false;
  strokes.forEach((stroke, index) => {
    if (index === 0) {
      parts.push({ role: "cho", jamo: stroke.jamo, index });
      return;
    }
    if (stroke.vowel) {
      const role = HORIZONTAL_VOWEL.has(stroke.jamo) ? "h" : "v";
      if (role === "h") horizontal = true;
      else vertical = true;
      parts.push({ role, jamo: stroke.jamo, index });
      return;
    }
    parts.push({ role: "jong", jamo: stroke.jamo, index });
  });
  const kind = horizontal && vertical ? "mixed" : horizontal ? "horizontal" : "vertical";
  return { kind, parts };
}

/**
 * Two syllables. The newest jamo is in one of them. Only the second syllable
 * may carry a batchim, so the key sequence renders as those two blocks.
 * `syllables` is the same strokes, split where each block starts.
 *
 * @param {() => number} rng
 * @param {Stroke[]} pool
 * @param {Stroke | null} newest
 */
export function generateWord(rng, pool, newest) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const host = newest ? (rng() < 0.5 ? 0 : 1) : -1;
    const syllables = [0, 1].map((index) =>
      syllableStrokes(rng, pool, index === host ? newest : null, index === 1),
    );
    const strokes = syllables.flat();
    const text = renderStrokes(strokes);
    const pieces = syllables.map((part) => renderStrokes(part));
    if (text === pieces.join("")) return { strokes, text, syllables };
  }
  throw new Error("could not build a stable word");
}

/**
 * @param {number} lessonIndex
 * @param {() => number} rng
 */
export function generateLine(lessonIndex, rng) {
  const pool = poolForLesson(lessonIndex);
  const [newest] = introduced(lessonIndex).slice(-1);
  return generatePracticeLine(rng, pool, newest);
}

/** @param {() => number} rng @param {Stroke[]} pool @param {Stroke | null} focus */
export function generatePracticeLine(rng, pool, focus) {
  const words = [];
  for (let i = 0; i < WORDS_PER_LINE; i++) words.push(generateWord(rng, pool, focus));
  return words;
}

/** @param {string} latin QWERTY letters, uppercase for Shift. */
export function latinStrokes(latin) {
  return [...latin].map((ch) => {
    const shift = ch !== ch.toLowerCase();
    return strokeOf([`Key${ch.toUpperCase()}`, shift]);
  });
}

/** @param {number} seed */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
