# The key line on the detection bench, and its relative major/minor flips

Branch `exec/key-line` (worktree `~/work/locust-wt/key-line`), from `exec/detect-combined` (512baae): main didn't have
the detection work yet. Written Nov 2, 01:35 EST. Nothing merged, nothing pushed; no visible Toaster opened (the
bench's hidden, muted pages only).

## In short

- **The bench measures the key line now.** harmony.mjs (from exec/ds-harmony) scores the share of the time the key
  shown is right, on its relative or parallel key, its changes a minute and the key it settles on. Two new sets: `key`
  (Better Off Alone, Toz Pembe at five poll phases) and `held` (the key work's twelve held-out songs). The key line
  can also be replayed offline on any bench run (keyreplay.mjs): 0 of 203,678 sampled moments differ from the real
  run.
- **The cause was the first chord heard.** `listenOpening` took the first clear chord as home, and home overruled
  the notes' fit within a 0.3 margin for the whole song. Starboy's first chord heard is C and Thriller's is E, each
  the relative major. Better Off Alone's is E, neither of the pair; then its intro's blended bars made it B major in
  7 of 15 runs, held for the rest of the song.
- **The mechanism.** Of a key and its relative, home is now the one whose tonic the music keeps coming back to. The
  engine counts how often each tonic is the bar's chord and the bass note: the bass by the beat from the bass
  tracker, the first chord heard counting as one bar. A side wins only with a clear lead, the parallel-key rule's
  "3 votes, over 1.25 times the other's" plus more than one bar's worth. That way a loop that plays both tonic chords
  (Am F C G) never argues with itself. Otherwise the first chord decides, as before.
- **Results, all sets, three poll offsets each:**
  - The songs whose key two methods agree on, from the start: right 0.67 → 0.72, relative 0.14 → 0.09.
  - Better Off Alone and Toz Pembe: right 0.72 → 0.93. Better Off Alone settles on A-flat minor in 15 of 15 runs, was
    8 of 15.
  - Held-out: 0.77 → 0.76. Songs from 1:00: 0.70 → 0.69. Both within the bench's spread.
  - The test songs: 1.00, unchanged.
  - Changes a minute rose: from the start 0.42 → 0.44, from 1:00 0.99 → 1.09. Most of it is wrong keys corrected
    once; three runs gained a new back-and-forth (below).
- **Nothing else moved:**
  - beats, tempo, every other line and the notes are identical on all 546 runs;
  - score.mjs --pairs: tempo, bar one, kick, clap and synth +0.00, no song better or worse;
  - chords and bass notes: no song moved;
  - unit suite 714 pass, 0 fail, 20 skipped (6 new tests).

## The commits

| Commit | What | Measured |
| :--- | :--- | :--- |
| f78ef8f | The bench scores the key line, chords and bass notes (harmony.mjs, page.js, run.mjs from exec/ds-harmony), and the held-out references move into docs/key-stability/heldout | the 480 standard jobs give the same beats, tempo, lines and notes as exec/detect-combined's own bench run |
| 6c06cc2 | The key line in its own three steps (keyReset, keyOpening, keyBar); page.js logs their inputs; keyreplay.mjs replays any checkout's key line on a run | all 546 runs identical to before the move; the replay matches the run's own key line at 203,678 of 203,678 moments |
| b954733 | The tonic decides the relative pair (tonicOf, keyTonic); the key log carries the opening's bass and the tracker's beats; 6 unit tests | everything below |

## How it was measured

- **Runs:** `node tools/detbench/run.mjs --sets=full,mid,kick,synth,key,held --offsets=0,5,10`: 546 runs, about 6
  minutes each. All three runs are in `~/work/scratch/detbench/key-line/`:
  - base.json: 512baae with the new bench;
  - refactor.json: the move;
  - tonic.json: the fix.
- **Scoring:** `node tools/detbench/harmony.mjs tonic.json --vs=base.json`. A song's runs (three offsets, and the key
  set's five phases on top, so 15 runs of each key song) are averaged into one row.
- **References:**
  - docs/key-stability/references: the key the chord model (madmom) and the whole mix's key profile agree on, else
    the chord model's;
  - Better Off Alone: A-flat minor;
  - Toz Pembe: D minor;
  - docs/key-stability/heldout: round 3's twelve, made the same way.
  - "Right, agreed" counts only the songs both methods agree on (12 of the full set, 4 of the held-out). "Right, all"
    counts every song with a reference, disputed ones included: there it measures steadiness more than truth.
- **Choosing the fix:**
  - Candidates were tried by replaying their key line on refactor.json (seconds each).
  - The one kept was then run for real (tonic.json); its numbers are the real run's.
  - Every candidate was judged on all sets together at three offsets, never one song.

## Why the key went to the relative

The relative pair shares its notes, so the notes' fit (Krumhansl-Kessler profiles over the chords heard) barely tells
them apart, and the major side tends to win: in a minor loop i-VI-III-VII, the III's root is in three of the four
chords. The engine's answer was the first chord heard: "home", which kept the relative pair on its side unless the
notes' fit disagreed by 0.3 (they never do, between relatives). In the 165 runs heard from the start, the first
chord heard was one of the pair's two tonics in 63, and the right one in 50 of those (4 in 5). In the other 102 it
was neither tonic. When it was the wrong one, it held the wrong key for most of the song:

- **Starboy (A minor)** hears C first: C major in 2 of 3 runs, 0.23 right, though over its three runs its bars have
  52 A minor chords and no C major one.
- **Thriller (C# minor)** hears E first: E major in 2 of 3 runs, 0.32 right, against 117 C# minor bars and 42 E
  major (over its three runs).
- **Better Off Alone (A-flat minor)** hears E first, which is neither. Its intro plays the loop at twice the bar's
  speed, so the chord search reads some bars as B (their notes summed). In 7 of 15 runs the notes' fit made it B
  major in the first eight bars, and the line's hold on a shown key (8 bars for a relative change, 16 once settled,
  plus a 0.1 margin for any change of root) kept it there.

Counting, over each whole run, how often each tonic was the bar's chord and the bass note picks the reference's side
of the pair in 76 of 79 song-and-start pairs (all four sets with references, runs pooled).

## What the engine does now

- **`keyTonic`:** each bar with a chord is a vote for the key on the chord's root in its mode. Its bass is a vote for
  the two keys on the bass note: a quarter a beat by the bass tracker's notes where it has them, else the bar's one
  bass note. Votes fade 1% a bar, as the chord counts do. The tracker is the right source because harmonyBar's own
  notes say it's right more often than the note analysis's bar note. And where the bass moves within a bar, each note
  gets its beats, not the whole bar: Better Off Alone's blended bars give B a chord vote but little bass.
- **`keyOpening`:** the first chord heard still names home, and now also counts as one bar of its tonic heard (its
  chord, and its bass note).
- **`tonicOf`** (exported, unit-tested): of key k and its relative, the side clearly ahead, else null. Clear means:
  - 3 votes or more, and over 1.25 times the other's, both as chordModeEvidence decides a mode;
  - and ahead by more than one bar's worth (a chord and its bass, 2) rather than 1. One time round a loop that plays
    both tonic chords can put either side a bar ahead, whichever came round last; the extra bar keeps such loops
    neither.
- **In `keyBar`:**
  - the first chord's 0.3 rule applies only when the tonic isn't clear;
  - then preferCurrentKey;
  - then a clear tonic picks its side of whatever pair the key is in.
  - A relative change the tonic vouches for needs two bars running, as a parallel change the chords vouch for does.
    Every other hold is as it was.

## What was tried on the way (replays over the same 546 runs)

| Candidate | Right, agreed: full / from 1:00 / key songs / held-out | Test songs | Why not |
| :--- | :--- | ---: | :--- |
| The key line before | 0.671 / 0.700 / 0.718 / 0.768 | 1.000 | |
| The tonic decides on any lead | 0.768 / 0.678 / 0.894 / 0.670 | 0.345 | The test songs' loops play both tonic chords: 2.9 relative flips a minute |
| Clear lead as chordModeEvidence's (1.25 times, + 1), else the first chord | 0.738 / 0.676 / 0.854 / 0.748 | 0.676 | One time round Am F C G, heard from F, C leads 4 to 2: "clear" |
| 1.5 times + 1, tracker beats, first chord one chord vote | 0.722 / 0.696 / 0.916 / 0.729 | 1.000 | Music for Machines: two bars of B-flat overrule its first chord, G minor |
| **1.25 times + 2, first chord as a bar, own vote counts (kept)** | 0.721 / 0.689 / 0.918 / 0.759 | 1.000 | (replay; the real run: 0.722 / 0.689 / 0.926 / 0.759) |
| The same, the bar's bass note instead of the tracker's beats | 0.737 / 0.696 / 0.887 / 0.768 | 1.000 | Within the spread of the kept one; the tracker is the engine's better bass source, and Better Off Alone needs it |
| The same, a vouched relative change waits 8 or 16 bars | 0.722 / 0.686 / 0.890 / 0.752 | 1.000 | Slower corrections; it removed only two back-and-forths, both in the 1:00 set |
| The same, the tonic counts never fade | 0.723 / 0.689 / 0.926 / 0.756 | 1.000 | No difference within 150 s |

Also measured: the first chord's vote added to the chord counts that chordModeEvidence reads slowed Toz Pembe's
D major to D minor fix (0.91 to 0.88). The tonic counts therefore have their own array, and the parallel decision is
exactly as it was.

## Results

### By set (before → after; ▲ ▼ mark moves of 0.05 or more)

| Set | Songs (agreed) | Right, agreed | Relative, agreed | Right, all with a reference | Relative, all | Changes a minute | Changes to the relative a minute | Ends right, agreed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| full | 33 (12) | 0.67 → 0.72 ▲ | 0.14 → 0.09 | 0.54 → 0.59 | 0.10 → 0.05 | 0.42 → 0.44 | 0.03 → 0.05 | 0.78 → 0.83 ▲ |
| mid | 32 (12) | 0.70 → 0.69 | 0.00 → 0.03 | 0.62 → 0.62 | 0.04 → 0.05 | 0.99 → 1.09 ▼ | 0.10 → 0.16 ▼ | 0.81 → 0.83 |
| key | 2 (2) | 0.72 → 0.93 ▲ | 0.23 → 0.03 ▲ | 0.72 → 0.93 ▲ | 0.23 → 0.03 ▲ | 0.50 → 0.59 ▼ | 0.04 → 0.12 ▼ | 0.80 → 1.00 ▲ |
| held | 12 (4) | 0.77 → 0.76 | 0.00 → 0.01 | 0.66 → 0.66 | 0.07 → 0.07 | 0.33 → 0.37 | 0.01 → 0.05 | 0.92 → 0.92 |
| synth | 38 (32) | 1.00 → 1.00 | 0.00 → 0.00 | 1.00 → 1.00 | 0.00 → 0.00 | 0.04 → 0.04 | 0.00 → 0.00 | 1.00 → 1.00 |

How much of that is the poll timing: the key line is chaotic in it, more than the drum lines. The base's own set
means move by 0.10 to 0.20 between offsets: right, agreed, at 0 / 5 / 10 ms is 0.615 / 0.713 / 0.685 from the start,
0.681 / 0.651 / 0.767 from 1:00, and 0.822 / 0.638 / 0.842 held-out. After the change:
- from the start, 0.680 / 0.723 / 0.765, better at every offset;
- from 1:00, 0.669 / 0.681 / 0.718, mixed;
- held-out, 0.822 / 0.638 / 0.818, the same at two and 0.024 lower at one.

### Song by song (right, relative and changes a minute, each the mean of the song's runs; settled: the key most shown in each run's second half)

#### From the start (full: 150 s from 0)

| Song | Reference | Right | Relative | Changes a minute | Settled on (runs) |
| :--- | :--- | ---: | ---: | ---: | :--- |
| aroundtheworld-daftpunk | Em | 0.17 → 0.17 | 0.02 → 0.02 | 0.96 → 0.96 | Am 2/3, Em 1/3 |
| atdoomsgate-mickgordon | D | 0.80 → 0.80 | 0.00 → 0.00 | 0.00 → 0.00 | D 3/3 |
| bangarang-skrillex | G | 0.03 → 0.03 | 0.00 → 0.00 | 0.41 → 0.41 | Gm 3/3 |
| callingforyou | Am (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.14 → 0.14 | Am 3/3 |
| codingtrance | Gm (agreed) | 0.41 → 0.41 | 0.00 → 0.00 | 0.41 → 0.41 | Gm 3/3 |
| craveyou | B (agreed) | 0.88 → 0.89 | 0.00 → 0.00 | 0.57 → 0.57 | B 3/3 |
| dance-justice | F#m | 0.22 → 0.62 ▲ | 0.44 → 0.06 ▲ | 0.82 → 0.98 ▼ | A 2/3, F#m 1/3 → F#m 3/3 |
| delilah | Gm (agreed) | 0.98 → 0.98 | 0.00 → 0.00 | 0.30 → 0.30 | Gm 3/3 |
| doechii | Dm | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Dm 3/3 |
| duvet-boa | Bm (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Bm 3/3 |
| eyeswithoutaface | E | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | E 3/3 |
| fein-travisscott | Ebm (agreed) | 0.93 → 0.93 | 0.00 → 0.00 | 0.00 → 0.00 | Ebm 3/3 |
| gotye | Dm | 0.97 → 1.00 | 0.03 → 0.00 | 0.14 → 0.00 ▲ | Dm 3/3 |
| gypsywoman | F | 0.00 → 0.00 | 0.11 → 0.11 | 0.42 → 0.42 | Am 3/3 |
| midnightcity | Bm | 0.11 → 0.11 | 0.00 → 0.00 | 0.73 → 0.73 | A 2/3, G 1/3 |
| nicolekidman | Gm | 0.17 → 0.17 | 0.00 → 0.00 | 0.74 → 0.74 | Dm 3/3 |
| notlikeus | Bm | 0.49 → 0.49 | 0.00 → 0.00 | 0.72 → 0.72 | B 2/3, Bm 1/3 |
| obsidianvortex-atliens | C# | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | C# 3/3 |
| onemoretime-daftpunk | G | 0.00 → 0.00 | 0.00 → 0.00 | 0.82 → 0.82 | D 3/3 |
| percocet | Fm (agreed) | 0.90 → 0.90 | 0.00 → 0.00 | 0.48 → 0.48 | Fm 3/3 |
| ramalama | C#m | 0.93 → 0.93 | 0.00 → 0.00 | 0.44 → 0.44 | C#m 3/3 |
| rumble | C#m | 0.03 → 0.03 | 0.00 → 0.00 | 1.13 → 1.13 | C# 2/3, Fm 1/3 |
| spacesong-beachhouse | Eb | 1.00 → 0.66 ▼ | 0.00 → 0.34 ▼ | 0.00 → 0.30 ▼ | Eb 3/3 → Cm 2/3, Eb 1/3 |
| starboy | Am (agreed) | 0.23 → 0.84 ▲ | 0.67 → 0.09 ▲ | 0.30 → 0.62 ▼ | C 2/3, Am 1/3 → Am 3/3 |
| starships | Bm (agreed) | 0.00 → 0.00 | 1.00 → 1.00 | 0.00 → 0.00 | D 3/3 |
| storm2 | F | 0.66 → 0.79 ▲ | 0.24 → 0.11 ▲ | 0.95 → 0.95 | F 3/3 |
| sunsetlover | F# (agreed) | 0.73 → 0.73 | 0.00 → 0.00 | 0.43 → 0.43 | F# 3/3 |
| technologic-daftpunk | E | 0.00 → 0.00 | 0.00 → 0.00 | 0.75 → 0.60 ▲ | Em 3/3 → G 3/3 |
| thriller | C#m | 0.32 → 0.93 ▲ | 0.68 → 0.07 ▲ | 0.14 → 0.42 ▼ | E 2/3, C#m 1/3 → C#m 3/3 |
| timeback | Fm (agreed) | 0.95 → 0.95 | 0.00 → 0.00 | 0.34 → 0.34 | Fm 3/3 |
| treehouse-alexg | D | 0.00 → 0.00 | 0.00 → 0.00 | 0.72 → 0.72 | Gm 3/3 |
| watchingme | C#m | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | C#m 3/3 |
| wewillrockyou | A (agreed) | 0.05 → 0.05 | 0.00 → 0.00 | 0.86 → 0.86 | Em 3/3 |

#### From 1:00 (mid: 60 s, as a DJ drops in; no first chord heard)

| Song | Reference | Right | Relative | Changes a minute | Settled on (runs) |
| :--- | :--- | ---: | ---: | ---: | :--- |
| aroundtheworld-daftpunk | Em | 0.33 → 0.47 ▲ | 0.67 → 0.53 ▲ | 0.72 → 1.08 ▼ | G 2/3, Em 1/3 → Em 2/3, G 1/3 |
| bangarang-skrillex | G | 0.00 → 0.00 | 0.00 → 0.00 | 0.00 → 0.00 | Gm 3/3 |
| callingforyou | Am (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Am 3/3 |
| codingtrance | Gm (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Gm 3/3 |
| craveyou | B (agreed) | 0.28 → 0.28 | 0.00 → 0.00 | 1.83 → 1.83 | F#m 3/3 |
| dance-justice | F#m | 0.87 → 0.87 | 0.00 → 0.00 | 1.80 → 1.80 | F#m 3/3 |
| delilah | Gm (agreed) | 0.24 → 0.57 ▲ | 0.00 → 0.00 | 2.25 → 2.62 ▼ | F 2/3, Gm 1/3 → Gm 3/3 |
| doechii | Dm | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Dm 3/3 |
| duvet-boa | Bm (agreed) | 0.02 → 0.02 | 0.00 → 0.00 | 0.74 → 0.74 | Em 3/3 |
| eyeswithoutaface | E | 0.11 → 0.11 | 0.00 → 0.00 | 1.14 → 1.14 | Abm 2/3, B 1/3 |
| fein-travisscott | Ebm (agreed) | 0.83 → 0.83 | 0.00 → 0.00 | 1.12 → 1.12 | Ebm 3/3 |
| gotye | Dm | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Dm 3/3 |
| gypsywoman | F | 1.00 → 1.00 | 0.00 → 0.00 | 1.07 → 1.07 | F 3/3 |
| midnightcity | Bm | 0.02 → 0.10 ▲ | 0.18 → 0.10 ▲ | 1.10 → 1.47 ▼ | A 2/3, D 1/3 |
| nicolekidman | Gm | 0.75 → 0.75 | 0.00 → 0.00 | 2.86 → 2.86 | Dm 2/3, Gm 1/3 |
| notlikeus | Bm | 0.38 → 0.38 | 0.00 → 0.00 | 2.38 → 2.38 | B 2/3, Bm 1/3 |
| obsidianvortex-atliens | C# | 1.00 → 1.00 | 0.00 → 0.00 | 0.71 → 0.71 | C# 3/3 |
| onemoretime-daftpunk | G | 1.00 → 1.00 | 0.00 → 0.00 | 1.44 → 1.44 | G 3/3 |
| percocet | Fm (agreed) | 0.97 → 0.97 | 0.00 → 0.00 | 0.00 → 0.00 | Fm 3/3 |
| ramalama | C#m | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | C#m 3/3 |
| rumble | C#m | 0.07 → 0.07 | 0.00 → 0.00 | 1.06 → 0.71 ▲ | F#m 2/3, Fm 1/3 → F#m 2/3, C# 1/3 |
| spacesong-beachhouse | Eb | 0.00 → 0.00 | 0.38 → 0.55 ▼ | 2.22 → 3.72 ▼ | Bb 2/3, Cm 1/3 → Cm 3/3 |
| starboy | Am (agreed) | 0.71 → 0.71 | 0.00 → 0.00 | 1.60 → 1.60 | D 1/3, Dm 1/3, Am 1/3 |
| starships | Bm (agreed) | 0.74 → 0.74 | 0.00 → 0.00 | 2.22 → 2.22 | Bm 3/3 |
| storm2 | F | 0.96 → 0.96 | 0.00 → 0.00 | 0.00 → 0.00 | F 3/3 |
| sunsetlover | F# (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.75 → 0.75 | F# 3/3 |
| technologic-daftpunk | E | 0.00 → 0.00 | 0.00 → 0.00 | 1.46 → 1.80 ▼ | Em 3/3 → G 3/3 |
| thriller | C#m | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | C#m 3/3 |
| timeback | Fm (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Fm 3/3 |
| treehouse-alexg | D | 0.00 → 0.00 | 0.00 → 0.00 | 1.89 → 1.89 | Gm 3/3 |
| watchingme | C#m | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | C#m 3/3 |
| wewillrockyou | A (agreed) | 0.62 → 0.16 ▼ | 0.00 → 0.39 ▼ | 1.25 → 2.07 ▼ | A 3/3 → F#m 2/3, A 1/3 |

#### Better Off Alone and Toz Pembe (key: 15 runs each)

| Song | Reference | Right | Relative | Changes a minute | Settled on (runs) |
| :--- | :--- | ---: | ---: | ---: | :--- |
| betteroffalone-alicedeejay | Abm (agreed) | 0.52 → 0.94 ▲ | 0.46 → 0.05 ▲ | 0.47 → 0.64 ▼ | Abm 8/15, B 7/15 → Abm 15/15 |
| tozpembe-manifest | Dm (agreed) | 0.91 → 0.91 | 0.00 → 0.00 | 0.53 → 0.53 | Dm 15/15 |

#### The held-out twelve (held: 150 s from 0)

| Song | Reference | Right | Relative | Changes a minute | Settled on (runs) |
| :--- | :--- | ---: | ---: | ---: | :--- |
| afterdark-mrkitty | Gm (agreed) | 0.87 → 0.87 | 0.00 → 0.00 | 0.00 → 0.00 | Gm 3/3 |
| baptism-crystalcastles | Em | 1.00 → 1.00 | 0.00 → 0.00 | 0.14 → 0.14 | Em 3/3 |
| callonme-prydz | Bb | 0.11 → 0.11 | 0.00 → 0.00 | 1.00 → 1.00 | Ebm 3/3 |
| char-crystalcastles | Ebm | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Ebm 3/3 |
| dracula-tameimpala | Ebm | 0.82 → 0.82 | 0.00 → 0.00 | 0.44 → 0.44 | Ebm 3/3 |
| ghostbusters-rpj | E | 0.95 → 0.95 | 0.00 → 0.00 | 0.85 → 0.85 | E 3/3 |
| goomuck | E (agreed) | 0.50 → 0.50 | 0.00 → 0.00 | 0.73 → 0.73 | E 2/3, A 1/3 |
| lady-modjo | Bbm (agreed) | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | Bbm 3/3 |
| language-porter | F#m | 0.00 → 0.00 | 0.80 → 0.80 | 0.86 → 0.86 | A 3/3 |
| levels-avicii | C#m | 1.00 → 1.00 | 0.00 → 0.00 | 0.00 → 0.00 | C#m 3/3 |
| musicformachines-grimes | Gm (agreed) | 0.70 → 0.67 | 0.00 → 0.03 | 0.00 → 0.42 ▼ | Gm 3/3 |
| prettyravegirl-s3rl | C | 0.00 → 0.00 | 0.00 → 0.00 | 0.00 → 0.00 | Em 3/3 |

The test songs (synth, 38 takes): no take moved.

### Better Off Alone, run by run (A-flat minor)

The 8 runs that were right are unchanged. The 7 that showed B major for the rest of the song (one went back at 140
s) now go back to A-flat minor at 23 to 37 s:

| Run (poll offset, phase) | Key line before (key, from s) | After |
| :--- | :--- | :--- |
| 0 ms, 0 ms | E 6.3, Abm 10.5 | the same |
| 0 ms, 3 ms | E 5.7, Abm 9.2 | the same |
| 0 ms, 6 ms | E 5.3, Abm 9.2 | the same |
| 0 ms, 9 ms | E 4.6, Abm 8.4, B 11.9, Abm 140.0 | E 4.6, Abm 8.4, B 11.9, Abm 37.0 |
| 0 ms, 12 ms | E 4.6, Abm 8.4, B 11.9 | E 4.6, Abm 8.4, B 11.9, Abm 30.3 |
| 5 ms, 0 ms | Em 4.9, Abm 9.2 | the same |
| 5 ms, 3 ms | B 8.4 | B 8.4, Abm 30.3 |
| 5 ms, 6 ms | E 7.2, Abm 26.7 | E 7.2, Abm 16.3 |
| 5 ms, 9 ms | E 7.5, Abm 32.0 | the same |
| 5 ms, 12 ms | E 3.0, B 11.0 | E 3.0, B 11.0, Abm 23.3 |
| 10 ms, 0 ms | E 6.7, B 11.9 | E 6.7, B 11.9, Abm 30.3 |
| 10 ms, 3 ms | E 5.7, Abm 14.5 | the same |
| 10 ms, 6 ms | E 4.7, B 10.1 | E 4.7, B 10.1, Abm 31.8 |
| 10 ms, 9 ms | E 6.4, B 11.9 | E 6.4, B 11.9, Abm 23.3 |
| 10 ms, 12 ms | E 7.5, Abm 14.5 | the same |

Toz Pembe: all 15 runs unchanged. It starts on D major (its first chord heard) and turns D minor at 12 to 38 s. That
is the parallel key, which this change leaves to chordModeEvidence as before.

### Back-and-forth (a key line returning to a key it left)

| Set | Runs | Changes | To the relative | Returns, before → after | Between relatives, before → after |
| :--- | ---: | ---: | ---: | ---: | ---: |
| full | 99 | 93 → 98 | 6 → 11 | 12 → 12 | 0 → 0 |
| mid | 96 | 85 → 94 | 9 → 14 | 15 → 19 | 1 → 2 |
| key | 30 | 36 → 42 | 3 → 9 | 5 → 6 | 1 → 2 |
| held | 36 | 28 → 30 | 1 → 3 | 0 → 1 | 0 → 1 |
| kick (no key references) | 171 | 149 → 165 | 16 → 31 | 13 → 18 | 0 → 2 |

Of the runs whose returns changed:
- **Four end on the reference now, after showing the wrong key a while first:**
  - Better Off Alone (offset 0, phase 12): B for good → A-flat minor at 30 s;
  - Around the World from 1:00: G for good → E minor at 102 s;
  - Delilah from 1:00: F for good → G minor at 95 s;
  - Midnight City from 1:00: D → B minor at 109 s.
- **Three are new excursions:**
  - Music for Machines (offset 10): G minor, B-flat at 67 s, G minor at 80 s. Its intro climbs the scale from B-flat,
    two bars a chord;
  - Good Lies (no reference): F minor, A-flat for 4 s at 10 s, F minor;
  - Caribou's Can't Do Without You (no reference): C, A minor at 24 s, C at 88 s.
- **Space Song from 1:00, at two offsets, adds a C minor and a G minor stretch.** It's wrong before and after
  (reference E-flat); its C minor and E-flat tonics are heard about equally.
- **Four kick-set songs gain one relative change.** Acceptable in the 80s goes E minor → G at 29 s in 2 of 3 runs,
  Feel So Close ends on G in 3 of 3 runs, and Strobe ends on A-flat minor in 3 of 3. The kick set has no key references, so these
  can't be scored.

## What is not fixed, or not good

- **Starships (B minor, agreed) still reads D major, in 3 of 3 runs.** Its D major and B minor tonics are heard
  about equally over its three runs (D 93 chord bars and 40 bass, B minor 60 and 69), so neither is clear, and its
  first chord heard (D) decides, as before.
- **The 1:00 set: right 0.70 → 0.69, changes a minute 0.99 → 1.09.** The whole loss in right is one song, We Will
  Rock You from 1:00 (0.62 → 0.16): stomps and a voice, a few stray chords, and two F# minor bars vouch for F# minor
  for half a minute before the A chords come. Delilah from 1:00 gains about as much (0.24 → 0.57).
- **The held-out set: 0.768 → 0.759.** All of it is one run of Music for Machines (above). These twelve were scored
  by round 3 already and looked at here throughout, so they're no longer a clean test of anything.
- **Changes a minute went up wherever the fix corrects a wrong start.** One extra change, wrong to right. Starboy:
  0.30 → 0.62 a minute, right 0.23 → 0.83. Thriller: 0.14 → 0.42, right 0.32 → 0.93.
- **Parallel-key errors are untouched:** Coding Trance (G for G minor), Bangarang and Technologic (minor for major),
  Not Like Us, and Toz Pembe's D-major start.
- **Wrong roots are untouched:** Pretty Rave Girl (E minor for C), One More Time, Treehouse, Rumble.
- **The references are model-made.** Where the two methods disagree (21 of the 34, 8 of the 12 held-out), "right" is
  agreement with the chord model.
- **The old key-study scripts no longer run on this engine.** tools/key-root-study.mjs and key-stability-report.mjs
  cut the key code out of engine.js by its indentation and need the PC-era `_checks` captures. keyreplay.mjs does
  their job with the engine's own functions.
- **The per-bar harmony record is costly.** A full run's results file is about 18 MB, against about 6 MB without it.

## Parallel keys (looked into afterwards, not changed)

Colin asked for the parallel-key errors next (D major shown for D minor and the like). With the relative flips fixed,
they're about as much of the wrong time as the relatives: 0.059 of the time against 0.054, over the 79 song-and-start
pairs with a reference. They sit in a few songs:

| Song | Reference (chord method / whole-mix profile) | Time on the parallel key | Shown |
| :--- | :--- | ---: | :--- |
| Bangarang, from the start and from 1:00 | G (0.82, G minor 0.76) / G minor (0.71) | 0.97, 0.94 | G minor |
| Not Like Us, from the start and from 1:00 | B minor (0.95) / B (0.76, B minor 0.73) | 0.51, 0.59 | B in 2 of 3 runs |
| Coding Trance (agreed) | G minor / G minor | 0.59 | G for its first 45 to 89 s, then G minor |
| Technologic, from 1:00 | E (0.79, E minor 0.78) / A-flat minor | 0.26 | |
| Starships, from 1:00 (agreed) | B minor / B minor | 0.26 | B through its B major stretch |
| Rumble | C# minor / A-flat minor | 0.23 | |
| Toz Pembe (15 runs) | D minor | 0.04 | D for its first 12 to 38 s |

What they are:
- **Four have references that disagree on the mode itself** (Bangarang, Not Like Us, Technologic, Rumble), so the
  key shown isn't clearly wrong.
- **The two trusted ones have real major-sounding stretches.** Coding Trance's first 45 s are a G whose bars carry a
  B at 0.15 to 0.18 of their notes (the minor third 0.04). madmom hears G major there too (60 s of it), and only the
  later Eb and Cm say G minor; the line then waits the settled key's 16 bars. Toz Pembe's early bars have hardly any
  third at all (0.04 and 0.05 of the notes), so the chord search calls them D or D minor bar by bar. madmom hears 30 s
  of D major in it as well.
- **No cut to make.** How clearly a chord's third is heard has no natural cut-off: over the bench's 22,289 chord
  bars, the chord's own third's share of its two possible thirds runs smoothly from 0.5 to 1 (56% of bars above 0.9).
  So two weightings with a fixed meaning were tried (0 when both thirds sound alike, 1 when only the chord's own
  sounds), replayed on all sets at three offsets:

| Candidate | Right, agreed: full / from 1:00 / key songs / held-out | Parallel, key songs | Changes a minute, from 1:00 | Why not |
| :--- | :--- | ---: | ---: | :--- |
| As committed | 0.722 / 0.689 / 0.926 / 0.759 | 0.044 | 1.09 | |
| A chord's vote on the mode as strong as its third is clear | 0.727 / 0.689 / 0.902 / 0.759 | 0.068 | 1.09 | Toz Pembe's minor chords are as unclear as its misread major ones, so its minor evidence comes later too |
| The third's weight in the notes' fit as clear as it is | 0.709 / 0.696 / 0.927 / 0.822 | 0.042 | 1.26 | Held-out up and full down, inside the spread; more changes |
| Both | 0.710 / 0.693 / 0.892 / 0.822 | 0.077 | 1.27 | Both of the above |

Neither lowers the time on the parallel key, so nothing was changed. The lever left is the chord search's thirds
(bestChord's allowance for the bass's overtone on the major third), a harmony change to be measured on the chords'
own accuracy as well.

## Reproduce

```
git -C ~/work/now-coding worktree add ~/work/locust-wt/key-line exec/key-line
ln -s ~/work/now-coding/node_modules ~/work/locust-wt/key-line/node_modules
cd ~/work/locust-wt/key-line
node tools/detbench/run.mjs --root=$PWD --out=$HOME/work/scratch/detbench/key-line/tonic.json --sets=full,mid,kick,synth,key,held --offsets=0,5,10
node tools/detbench/harmony.mjs ~/work/scratch/detbench/key-line/tonic.json --vs=$HOME/work/scratch/detbench/key-line/base.json --songs
node tools/detbench/score.mjs ~/work/scratch/detbench/key-line/tonic.json --vs=$HOME/work/scratch/detbench/key-line/base.json --pairs
node tools/detbench/keyreplay.mjs ~/work/scratch/detbench/key-line/tonic.json --check                       # 0 moments differ
node tools/detbench/keyreplay.mjs <run.json> --root=<another checkout> --out=<replayed.json>               # its key line on the same run
node --test tools/*.test.mjs
```
