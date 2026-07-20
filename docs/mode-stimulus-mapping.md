# ExerCube mode → stimulus mapping (draft)

**Status:** Draft for expert review — this is the hand-made table from the scope
agreement (week 1 deliverable). Stimulus assignments are informed by observed
data in the July 2026 production export, but the intended training stimulus per
mode is still open question #4 in `SCOPE.md` (no
sports-science documentation exists yet). Sphery expert input should refine it.

Stimulus vocabulary comes from `web/lib/types/plan.ts` (`StimulusType`):
`cardio_endurance` · `cardio_intensity` · `cognitive_motor` · `recovery`.
"Export adaptivity" is the `AdaptivityType` a session in that mode would
normally use when translated to RaceConfig (`performance` | `hrTracking` |
`cognitionOnly`).

## Context established July 2026 (websites + user)

- **Racer and SpeedCage are both ExerCube games** — sphery.ch's season
  leaderboards track exactly "Racer Score" and "Speed cage Score". Both belong
  to the single `exercube` equipment profile as modes; they are not separate
  equipment.
- Sphery runs **12 seasons with weekly challenges**, which is why `Season` and
  `WeeklyChallenge` dominate the SpeedCage data.
- Everything else at The Sphere Darmstadt (XR Fighter, ICAROS Guardian, Runner
  sprint machine, Ski/Row ergs, Performance Bikes, HYROX stations) is separate
  equipment → future `EquipmentProfile`s, out of scope for v1.

## Game 1: Racer (`Workouts` + `RaceConfigs`, 1:1 — 20,945 workouts)

Racer "modes" are the six `WorkoutPresets` (exercise-pool variants of one game).
Observed columns are averages over completed workouts.

| Preset (id) | n | avg HR | % time z4–5 | brain-instrumented | Draft stimuli | Export adaptivity | Notes |
|---|---|---|---|---|---|---|---|
| DualFlow (1) | 6,951 | 145 | 44% | yes (brainScore ≈185 scale) | cognitive_motor, cardio_intensity, cardio_endurance | hrTracking or performance | Flagship dual-task mode; only preset with real brainScore data. Most versatile — can serve any non-recovery stimulus depending on HR zone prescribed. |
| LeagueQualification (5) | 2,999 | 137 | 51% | no | cardio_intensity | performance | Competitive/scored; not user-configurable (`customizable=0`). |
| UpperBody (2) | 2,944 | 144 | 36% | no | cardio_endurance, cardio_intensity | hrTracking | Sustained work, moderate z4–5 share. |
| RehaFlow (6) | 1,680 | 135 | 61%* | no | recovery | hrTracking | Rehab intent → recovery. *High z4–5 share is a data caveat, not intent: rehab users likely have mis-estimated hrMax, inflating zone shares. Fixed low difficulty on export. |
| LegDay (3) | 82 | 148 | 2% | no | cardio_endurance | hrTracking | Small n; strength-leaning exercise pool. |
| HomeFlow (4) | 11 | 100 | — | no | cardio_endurance | hrTracking | Negligible data; keep mapped but never preferred. |

`recovery` sessions resolve to RehaFlow or to DualFlow/UpperBody at zone 1–2
with low fixed difficulty — no dedicated recovery mode exists.

## Game 2: SpeedCage (`SpeedCages` + `SpeedCageGameModeConfigs` — 6,345 games)

`trainingName` is free text; the allowlist below excludes test junk (see
bottom). Only ~10% of completed SpeedCage games have HR data (chest strap
optional), so HR columns are thin — reaction time is the more reliable signal.
`avg HR` / `% z4–5` computed over rows with `hrAverage > 0` only.

| Mode (allowlist) | n | avg HR | % time z4–5 | avg reaction (s) | Draft stimuli | Export adaptivity | Notes |
|---|---|---|---|---|---|---|---|
| Season | 2,046 | 148 | 62% | 1.7 | cognitive_motor, cardio_intensity | performance | Dominant mode (12 seasons, weekly challenges). Genuinely mixed stimulus: high z4–5 *and* reaction-driven. |
| WeeklyChallenge | 1,630 | — | — | — | cognitive_motor | performance | Challenge variant of Season; zero HR data recorded. |
| Single45 / Single60 / Single90 | 462 / 169 / 68 | 96–122 | 4–15% | 1.6–1.8 | cognitive_motor | performance | Timed standard rounds; low cardio load — cognitive-motor is the primary stimulus. |
| Interval45 / Interval60 / Interval90 | 81 / 36 / 1 | — | — | 1.5 | cardio_intensity, cognitive_motor | hrTracking | Interval structure implies intensity intent; no HR rows observed yet — assignment is intent-based. |
| StairsUp / StairsDown / Pyramide / PyramideInverted(Extreme) | 104 / 21 / 85 / 6 | — | — | 0.9–1.5 | cardio_intensity | performance | Ramp/ladder progression structures. |
| AllBosses Easy / Medium / Hard / Legend | 108 / 79 / 70 / 56 | 132–161 | 51–85% | 1.7–1.9 | cardio_intensity, cognitive_motor | performance | Highest observed HR load in SpeedCage — legit HIIT-level. |
| BossSingle-* (Switch, SymbolSwap, WhatTimeIsIt, SideStep, SpeedOrientation, Superfast, TopDown, ManualConfusion) | 12–132 each | 141–156 (thin) | varies | 0.3–1.0 | cognitive_motor | cognitionOnly or performance | Reaction-time drills (fastest reactions in the data); ManualConfusion also shows real cardio load (156 bpm, 67% z4–5). |
| BossStory | 40 | — | — | — | cognitive_motor | performance | Story-framed boss sequence. |
| BrainSpeed / Brain | 78 / 17 | 141 / 144 | 50% / 45% | 1.7 | cognitive_motor | cognitionOnly | Only modes with the `brainSpeed` metric populated. Per "ExerCube Data.docx": Brain Speed is a **monthly standardized assessment** (fixed benchmark round for direct comparison) — schedule it as a recurring monthly check-in, not a regular training session; its score is a candidate cognitive-fitness feature for the estimator. |
| Agility | 13 | — | 86% (n≈few) | 1.5 | cognitive_motor | performance | Tiny n. |
| Racket Sports (Intensive / Orientation), Fussball, Basketball, Volleyball | 4–11 each | thin | thin | — | cognitive_motor | performance | Sport-specific perception/decision drills ("Pro Sports" vertical). Tiny n. |

**Excluded (test junk / typos, not real modes):** `Unknown`, `trainingName`,
`Sinlge 45`, `tester_*`, `newt_*`, `gh_*`, `Single90-test`,
`Einfach-*`/`Schwierig-*` (per-trainer test rows), duplicate-spelling rows
(`Boss Single` vs `BossSingle`, `Stairs Up` vs `StairsUp`, `Pyramide` id 13).
Names need URL-decoding (`%20` → space) before display.

## Caveats for whoever refines this

1. **HR coverage is asymmetric:** Racer has HR on most workouts; SpeedCage on
   ~10%. SpeedCage cardio assignments lean on small samples.
2. **Zone shares depend on estimated hrMax** (`hrMaxForZoneCalc` /
   Tanaka-derived), so % z4–5 is biased wherever hrMax is mis-estimated —
   see the RehaFlow anomaly.
3. **No SpeedCage mode maps to `recovery`.** The generator should satisfy
   recovery sessions via Racer (RehaFlow or zone-1–2 DualFlow/UpperBody).
4. Boss-mode HR rows are thin (n of 10–30); the cognitionOnly vs performance
   split for those is a judgment call for the sports-science review.
5. **Score metric definitions** (from `docs/ExerCube Data.pdf`, which answers
   scope open question #3): Racer bodyScore = % of exercises performed
   correctly, brainScore = % of timings performed correctly, dualflowScore =
   combination of both. Caveat: the export stores these on inconsistent
   scales — most presets average ≈0.7–1.0 (fractions) but DualFlow rows
   average brainScore ≈185, so normalize per preset before using them as
   features. Racer `distanceMeters` is synthetic (converted to a
   moderate-jogging equivalent), not measured.