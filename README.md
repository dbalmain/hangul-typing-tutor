# Hangul keys

A browser tutor for two-set Hangul (두벌식) on a US QWERTY keyboard. Practice
starts on the home row and adds one jamo at a time, once the letters you already
have are reliable. The page reads the physical key, so a US keyboard works with
Korean input on or off. Press `?` when you want the US letter for the current
stroke. Press `` ` `` to hide the keyboard.

## Run

```sh
./start
```

That serves the page on `127.0.0.1` and opens it in your browser. Ctrl-C stops
the server. There is no build step. Node is only used for the tests.

## Tests

```sh
node --test tutor.test.mjs
```

## Practice

A drill is 4 lines of 4 words, and the next one starts on its own. A letter is
in when 9 of its last 10 presses are right. Misses older than that no longer
count, so a rough start can clear. The next jamo joins after every letter in the
current set has reached that. The syllable you are typing marks the piece just
typed and the piece to type next. Letters you miss are listed as "Missed most",
the most frequent first. Press `` ` `` to hide the keyboard. Progress stays in
the browser under `hangul-keys-progress-v2`. Reset clears that progress and
leaves the keyboard choice alone.
