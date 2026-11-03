# Hangul keys

A browser tutor for two-set Hangul (두벌식) on a US QWERTY keyboard. Practice
starts on the home row and adds one jamo at a time. The page reads the physical
key, so a US keyboard works with Korean input on or off. Press `?` when you want
the US letter for the current stroke. Press `` ` `` to hide the keyboard.

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

A round is one line of 4 words, and the next line starts when that one is done.
Wrong keys in a row count as one miss. The percentage is the last 4 lines, and
the line you are typing counts too. The bar beside it is how close the next
letter is. Four clean lines fill it. A lower percentage fills it more slowly,
and it moves back when those lines get worse. At 40% or below it stays empty.
The next letter joins at the end of a line. The syllable you are typing marks
the piece just typed and the piece to type next. Letters you miss are listed as
"Missed most", the most frequent first. Press `` ` `` to hide the keyboard.
Progress stays in the browser under `hangul-keys-progress-v2`. Reset clears that
progress and leaves the keyboard choice alone.
