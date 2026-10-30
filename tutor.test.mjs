import assert from "node:assert/strict";
import test from "node:test";
import {
  KEYS,
  LESSON_COUNT,
  ORDER,
  generateLine,
  generateWord,
  introduced,
  latinStrokes,
  mulberry32,
  poolForLesson,
  renderStrokes,
  stageName,
  strokeMatches,
  strokeOf,
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
