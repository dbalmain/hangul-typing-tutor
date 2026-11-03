import assert from "node:assert/strict";
import test from "node:test";
import {
  KEYS,
  LESSON_COUNT,
  ORDER,
  applyPlace,
  focusStroke,
  generateLine,
  generatePracticeLine,
  generateWord,
  introduced,
  isBoardToggle,
  isCompetent,
  isHintRequest,
  latinStrokes,
  mulberry32,
  noteAttempt,
  passingStat,
  placeIndex,
  poolForLesson,
  poolIsCompetent,
  renderStrokes,
  stageName,
  statusReport,
  strokeKey,
  strokeMatches,
  strokeOf,
  struggling,
  syllableParts,
  undoHit,
} from "./tutor.js";

test("known words come out of the QWERTY key sequence", () => {
  const words = {
    dkssud: "안녕",
    gksrmf: "한글",
    rkatkgkqslek: "감사합니다",
    ekfr: "닭",
    rkqt: "값",
    dhk: "와",
    dml: "의",
    Qkffl: "빨리",
    gksdk: "한아",
  };
  for (const [latin, hangul] of Object.entries(words)) {
    assert.equal(renderStrokes(latinStrokes(latin)), hangul, latin);
  }
});

test("lesson 1 is only ㅇ and ㅏ, then one jamo at a time, home row first", () => {
  assert.equal(LESSON_COUNT, 32);
  assert.equal(ORDER.length, 33);
  const first = poolForLesson(0).map((stroke) => stroke.jamo);
  assert.deepEqual(first, ["ㅇ", "ㅏ"]);
  assert.deepEqual(
    introduced(0).map((stroke) => stroke.jamo),
    ["ㅇ", "ㅏ"],
  );
  assert.deepEqual(introduced(1).map((stroke) => stroke.jamo), ["ㄴ"]);
  const home = poolForLesson(7).map((stroke) => stroke.jamo);
  assert.deepEqual(home, ["ㅇ", "ㅏ", "ㄴ", "ㅣ", "ㅓ", "ㄹ", "ㅗ", "ㅁ", "ㅎ"]);
  assert.equal(stageName(0), "Home row");
  assert.equal(stageName(7), "Home row");
  assert.equal(stageName(8), "Rest of the keyboard");
  assert.equal(introduced(8)[0].jamo, "ㄱ");
  assert.equal(stageName(25), "Shift");
  assert.equal(introduced(25)[0].jamo, "ㅆ");
  assert.equal(introduced(25)[0].shift, true);
});

test("drills stay inside the unlocked keys and include the new one", () => {
  for (let lesson = 0; lesson < LESSON_COUNT; lesson++) {
    const pool = poolForLesson(lesson);
    const newest = introduced(lesson).at(-1);
    const rng = mulberry32(1000 + lesson);
    for (let n = 0; n < 20; n++) {
      const word = generateWord(rng, pool, newest);
      for (const stroke of word.strokes) {
        assert.ok(
          pool.some((item) => item.code === stroke.code && item.shift === stroke.shift),
          `${stroke.jamo} leaked into lesson ${lesson}`,
        );
      }
      assert.ok(
        word.strokes.some((stroke) => stroke.code === newest.code && stroke.shift === newest.shift),
        `lesson ${lesson} word missed ${newest.jamo}`,
      );
      assert.equal(renderStrokes(word.strokes), word.text);
      assert.equal(word.syllables.length, 2);
      assert.deepEqual(word.syllables.flat(), word.strokes);
      assert.equal(
        word.syllables.map((part) => renderStrokes(part)).join(""),
        word.text,
      );
      assert.equal(
        syllableParts(word.syllables[0]).parts.some((part) => part.role === "jong"),
        false,
      );
      assert.ok([...word.text].every((ch) => ch >= "가" && ch <= "힣"));
    }
  }
});

test("a batchim does not glue onto the next syllable", () => {
  const pool = poolForLesson(LESSON_COUNT - 1);
  const rng = mulberry32(7);
  for (let n = 0; n < 200; n++) {
    const word = generateWord(rng, pool, null);
    assert.equal(renderStrokes(word.strokes), word.text);
  }
  const line = generateLine(12, mulberry32(3));
  assert.equal(line.length, 4);
});

test("the next letter waits until every current one is competent", () => {
  const pool = poolForLesson(0);
  const [ieung, a] = pool;
  const tally = {
    [strokeKey(ieung)]: { hit: 10, miss: 0 },
    [strokeKey(a)]: { hit: 9, miss: 1 },
  };
  assert.equal(isCompetent(tally[strokeKey(ieung)]), true);
  assert.equal(isCompetent({ hit: 9, miss: 0 }), false);
  assert.equal(isCompetent({ hit: 8, miss: 2 }), false);
  assert.equal(poolIsCompetent(pool, tally), true);
  assert.equal(focusStroke(pool, tally).jamo, "ㅏ");
  tally[strokeKey(a)] = { hit: 10, miss: 0 };
  assert.equal(focusStroke(pool, tally), null);

  tally[strokeKey(a)] = { hit: 8, miss: 2 };
  assert.equal(poolIsCompetent(pool, tally), false);
  assert.equal(focusStroke(pool, tally).jamo, "ㅏ");

  const withNieun = poolForLesson(1);
  const nieun = introduced(1)[0];
  const practiced = {
    [strokeKey(ieung)]: { hit: 10, miss: 0 },
    [strokeKey(a)]: { hit: 10, miss: 1 },
    [strokeKey(nieun)]: { hit: 3, miss: 0 },
  };
  assert.equal(focusStroke(withNieun, practiced).jamo, "ㄴ");
  practiced[strokeKey(nieun)] = { hit: 10, miss: 0 };
  practiced[strokeKey(ieung)] = { hit: 10, miss: 6 };
  assert.equal(focusStroke(withNieun, practiced).jamo, "ㅇ");
});

test("struggling letters are the ones missed most often", () => {
  const pool = poolForLesson(2);
  const [ieung, a, nieun] = pool;
  const tally = {
    [strokeKey(ieung)]: { hit: 20, miss: 2 },
    [strokeKey(a)]: { hit: 4, miss: 6 },
    [strokeKey(nieun)]: { hit: 10, miss: 0 },
  };
  const ranked = struggling(pool, tally, 5).map((item) => item.stroke.jamo);
  assert.deepEqual(ranked, ["ㅏ", "ㅇ"]);
});

test("a practice line stays in the pool and includes the focused letter", () => {
  const pool = poolForLesson(3);
  const focus = introduced(3)[0];
  const line = generatePracticeLine(mulberry32(4), pool, focus);
  assert.equal(line.length, 4);
  for (const word of line) {
    assert.ok(word.strokes.some((stroke) => stroke.jamo === focus.jamo));
    for (const stroke of word.strokes) {
      assert.ok(pool.some((item) => item.jamo === stroke.jamo && item.shift === stroke.shift));
    }
  }
});

test("a rough start falls out of the last 10 presses", () => {
  const giyeok = ORDER.find((stroke) => stroke.jamo === "ㄱ" && !stroke.shift);
  assert.equal(isCompetent({ hit: 2, miss: 8 }), false);
  let stat = { hit: 2, miss: 8 };
  for (let i = 0; i < 10; i++) stat = noteAttempt(stat, 1);
  assert.equal(stat.recent.length, 10);
  assert.equal(isCompetent(stat), true);
  stat = noteAttempt(stat, 0);
  assert.equal(isCompetent(stat), true);
  stat = noteAttempt(stat, 0);
  assert.equal(isCompetent(stat), false);
  assert.equal(isCompetent({ hit: 100, miss: 0, recent: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0] }), false);
  assert.equal(isCompetent({ hit: 2, miss: 8, recent: [1, 1, 1] }), false);
  let capped;
  for (let i = 0; i < 25; i++) capped = noteAttempt(capped, 1);
  assert.equal(capped.recent.length, 20);
  const undone = undoHit(noteAttempt(undefined, 1));
  assert.deepEqual(undone.recent, []);
  assert.equal(undone.hit, 0);
  assert.deepEqual(undoHit(noteAttempt(undefined, 0)).recent, [0]);
  const pool = poolForLesson(8);
  const tally = {};
  for (const stroke of pool) {
    tally[strokeKey(stroke)] = stroke === giyeok ? stat : { hit: 10, miss: 0 };
  }
  assert.equal(poolIsCompetent(pool, tally), false);
  tally[strokeKey(giyeok)] = { hit: 2, miss: 8, recent: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] };
  assert.equal(poolIsCompetent(pool, tally), true);
});

test("the place dropdown lands on one letter and marks the earlier ones learned", () => {
  assert.equal(placeIndex(2, {}), 0);
  const start = applyPlace(0);
  assert.equal(start.pool, 2);
  assert.equal(start.notice, "");
  assert.equal(start.finished, false);
  assert.deepEqual(start.tally, {});
  assert.equal(placeIndex(start.pool, start.tally), 0);

  const giyeok = ORDER.findIndex((stroke) => stroke.jamo === "ㄱ" && !stroke.shift);
  const atGiyeok = applyPlace(giyeok);
  assert.equal(atGiyeok.pool, giyeok + 1);
  assert.equal(atGiyeok.notice, "Up to ㄱ");
  assert.equal(atGiyeok.finished, false);
  assert.equal(poolIsCompetent(ORDER.slice(0, giyeok), atGiyeok.tally), true);
  assert.equal(poolIsCompetent(ORDER.slice(0, giyeok + 1), atGiyeok.tally), false);
  assert.equal(focusStroke(ORDER.slice(0, atGiyeok.pool), atGiyeok.tally).jamo, "ㄱ");
  assert.equal(placeIndex(atGiyeok.pool, atGiyeok.tally), giyeok);
  assert.equal(isCompetent(passingStat()), true);

  const ssang = ORDER.findIndex((stroke) => stroke.jamo === "ㅆ");
  const atSsang = applyPlace(ssang);
  assert.equal(atSsang.pool, ssang + 1);
  assert.equal(focusStroke(ORDER.slice(0, atSsang.pool), atSsang.tally).jamo, "ㅆ");
  assert.equal(poolIsCompetent(ORDER.slice(0, ssang), atSsang.tally), true);

  const last = applyPlace(ORDER.length - 1);
  assert.equal(last.pool, ORDER.length);
  assert.equal(last.finished, false);
  assert.equal(last.notice, "Up to ㅖ");
  assert.equal(poolIsCompetent(ORDER.slice(0, ORDER.length - 1), last.tally), true);
  assert.equal(poolIsCompetent(ORDER, last.tally), false);
  const all = {};
  for (const stroke of ORDER) all[strokeKey(stroke)] = passingStat();
  assert.equal(placeIndex(ORDER.length, all), ORDER.length - 1);
  assert.equal(applyPlace(-1), null);
  assert.equal(applyPlace(ORDER.length), null);
});

test("a status report names the letters still blocking the next one", () => {
  const pool = poolForLesson(8);
  const giyeok = pool.find((stroke) => stroke.jamo === "ㄱ");
  const tally = {};
  for (const stroke of pool) tally[strokeKey(stroke)] = { hit: 10, miss: 0 };
  tally[strokeKey(giyeok)] = { hit: 2, miss: 8, recent: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0] };
  const report = statusReport({ pool: pool.length, tally, finished: false }, { keyboard: "hidden" });
  const row = report.letters.find((letter) => letter.jamo === "ㄱ");
  assert.equal(row.competent, false);
  assert.equal(row.key, "R");
  assert.deepEqual(report.blocking, ["ㄱ"]);
  assert.equal(report.focus.jamo, "ㄱ");
  assert.equal(report.keyboard, "hidden");
  assert.equal(report.letters.filter((letter) => letter.competent).length, pool.length - 1);
});

test("syllable pieces sit beside, under, or both", () => {
  const roles = (latin) =>
    syllableParts(latinStrokes(latin)).parts.map((part) => `${part.role}:${part.jamo}`);
  assert.equal(syllableParts(latinStrokes("rk")).kind, "vertical");
  assert.deepEqual(roles("rk"), ["cho:ㄱ", "v:ㅏ"]);
  assert.equal(syllableParts(latinStrokes("rh")).kind, "horizontal");
  assert.deepEqual(roles("rh"), ["cho:ㄱ", "h:ㅗ"]);
  assert.equal(syllableParts(latinStrokes("dhk")).kind, "mixed");
  assert.deepEqual(roles("dhk"), ["cho:ㅇ", "h:ㅗ", "v:ㅏ"]);
  assert.equal(syllableParts(latinStrokes("dml")).kind, "mixed");
  assert.deepEqual(roles("dml"), ["cho:ㅇ", "h:ㅡ", "v:ㅣ"]);
  assert.deepEqual(roles("ekfr"), ["cho:ㄷ", "v:ㅏ", "jong:ㄹ", "jong:ㄱ"]);
  assert.deepEqual(roles("rkqt"), ["cho:ㄱ", "v:ㅏ", "jong:ㅂ", "jong:ㅅ"]);
});

test("? asks for the US key and ` hides the keyboard", () => {
  assert.equal(isHintRequest("Slash", true, "?"), true);
  assert.equal(isHintRequest("Slash", true, "Shift"), true);
  assert.equal(isHintRequest("Slash", false, "/"), false);
  assert.equal(isHintRequest("KeyA", false, "a"), false);
  assert.equal(isBoardToggle("Backquote", false), true);
  assert.equal(isBoardToggle("Backquote", true), false);
  assert.equal(isBoardToggle("Slash", false), false);
});

test("shift is required only when the letter changes", () => {
  const sieut = strokeOf(["KeyT", false]);
  const ssang = strokeOf(["KeyT", true]);
  assert.equal(strokeMatches(sieut, { code: "KeyT", shift: false }), true);
  assert.equal(strokeMatches(sieut, { code: "KeyT", shift: true }), false);
  assert.equal(strokeMatches(ssang, { code: "KeyT", shift: true }), true);
  assert.equal(strokeMatches(ssang, { code: "KeyT", shift: false }), false);
  const ieung = strokeOf(["KeyD", false]);
  assert.equal(strokeMatches(ieung, { code: "KeyD", shift: true }), true);
  assert.equal(KEYS.KeyD.shiftJamo, null);
});
