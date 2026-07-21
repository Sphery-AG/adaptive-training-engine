# Week 2 UI/UX, API, and Schema Plan

**Project:** Adaptive Workout Plan Generator  
**Week:** July 20-24, 2026  
**Current workspace state:** scope agreed, local MySQL export running, Next.js app still at starter screen, no backend code committed in this branch.  
**Local reference material:** `_local` is a workspace symlink to `/Users/anthonymccrovitz/conductor/repos/adaptive-training-engine/_local`, which resolves to the original Desktop checkout's confidential `_local` folder.  
**Reference context checked:** live `spherych_devapp` MySQL schema, `_local/miro-board`, `_local/miro-frame`, `_local/ux-concept`, the richer adjacent `louisville` workspace's engine/API contract, and a shallow clone of `Sphery-AG/TheSphere-Kiosk` in `.context/kiosk-repo`.

## What Changed After Inspecting The Local Data

The planning target is more concrete now:

- The integration-ready output should be `CreateTrainingRequest`, matching Sphery circle training creation, not RaceConfig/WorkoutPreset as the top-level plan output.
- `RaceConfigs` and `WorkoutPresets` still matter for Racer/ExerCube history and feature extraction.
- The existing Sphery schema already has the raw signals we need for v1 estimation: `Workouts`, `HrValues`, `HrStats`, `SpeedCages`, `SpeedCageRounds`, `CircleTrainingExerciseLogs`, and `HealthData`.
- `HealthData.hrRestingPulse` and `HealthData.hrMax` exist but are empty in the export, so the engine should estimate them instead of relying on them.
- Goal, questionnaire answers, generated plan state, fitness estimates, and adaptation reasons are not represented in the existing schema and need an additive plan-side design.
- The local data-model frame proposes five core new plan-side tables: questionnaire answer, plan, plan session, fitness estimate, and adaptation event. Rewards/habit-loop state can stay demo-generated unless the team explicitly wants it persisted in v1.
- The kiosk repo confirms the app sits between the Sphery app identity flow and kiosk runtime: Sphery app/login provides the Spieler ID and auth context; the plan app generates/adapts the plan; the kiosk runs a `circle-trainings` session and sends exercise logs back.

Live export counts checked July 20:

- `Users`: 1,019
- `HealthData`: 713 rows; `dob` 704, `weight` 700, `height` 700, `gender` 199
- `HealthData.hrRestingPulse`: 0 populated
- `HealthData.hrMax`: 0 populated
- `Workouts`: 20,945; completed 14,667
- `HrValues`: 1,062,687
- `CircleTrainings`: 242

## North Star

Build a demoable v1 flow where a member can be selected from the local Sphery export, complete a short intake, see a fitness snapshot, and receive a personalized circle-training plan. The plan must be explainable and exportable as a valid `CreateTrainingRequest`.

This week should answer:

1. What does the member experience feel like from user select to plan review?
2. What exact API/data contract connects the UI to the engine?
3. What additive schema does Michel need for questionnaire answers, fitness estimates, generated plans, and adaptations?

## Availability Constraint

You are only working Monday-Wednesday, with Thursday morning as an optional handoff buffer. Thursday afternoon/evening is travel: train from Zurich to Geneva, then flight to Amsterdam. Plan this week as a three-day sprint, not a five-day sprint.

This changes the bar for the week:

- **Must finish by Wednesday EOD:** conceptual product positioning, UI flow direction, API/schema brief for Michel, and a small implementation plan that another person can understand.
- **Thursday morning only if available:** quick review with Michel, final edits, and handoff notes. No deep implementation should depend on Thursday.
- **Defer:** polish, full UI buildout, and anything that needs long debugging.

## Week 2 Outcome

By Wednesday, July 22, with Thursday morning as buffer:

- The app has a crafted end-to-end product flow, not a starter screen.
- Intake follows the local UX concept: Goal & Focus, Training Setup, and Health Details.
- User select reads or realistically represents real users from the local export.
- Cold-start generation works from questionnaire data alone.
- Rule-based generation produces visibly different plans by goal/profile.
- Existing user summaries are grounded in real Sphery tables.
- The frontend/backend contract is documented.
- Michel has an additive schema brief tied to the existing schema.

## Product Positioning For Sphery

This product should be framed as part of the **Sphere gym concept**, not as a standalone fitness app.

Sphery is selling B2B2C:

- **B2B buyer:** franchise gym owner / operator.
- **B2C user:** gym member who needs a reason to come back.
- **Sphery product system:** Sphery app + Nexus kiosk + instrumented stations + backend.

The adaptive training app's role:

- It is the **personalization and retention layer** between the Sphery app and Nexus kiosk.
- It turns "a gym with futuristic equipment" into "a guided plan that tells each member exactly what to do next."
- It helps the owner sell retention: members get a plan, progress, confidence, and reasons to return.
- It helps the member feel coached without requiring one human trainer per member.

The concept should be explained as:

> The Sphery app owns identity, membership, and the member home. The Nexus kiosk owns the live training session. The adaptive plan layer owns the question "what should this member do next, and why?"

That positioning prevents scope creep. The app should not become another leaderboard, another kiosk controller, or another session-results screen. It should own planning, explanation, adaptation, and the "next session is ready" habit loop.

## Existing Schema To Build Around

### Profile and identity

- `Users`: `id`, `email`, `username`, `role`, `roleLocation`, timestamps.
- `HealthData`: `userId`, `dob`, `age`, `height`, `weight`, `gender`, `hrRestingPulse`, `hrReserve`, `hrMax`.

Use `dob` to compute age. Treat `age` as legacy/unreliable unless Michel says otherwise.

### Racer / Workout history

- `Workouts`: completion, duration, HR summary, score, body/brain/dualflow scores, exercise correctness, HR zone durations `timeInTier1` through `timeInTier5`, `workoutPresetId`, `userId`, `sessionId`.
- `RaceConfigs`: `adaptivityType`, `difficulty`, `duration`, `startSpeed`, `hrTarget`, `workoutId`.
- `WorkoutPresets`: preset names and exercise pools.
- `HrValues`: per-workout HR curve, with `time`, `value`, `workoutId`.

Week 2 should use this for history summaries. Week 3 should use it for fitness features.

### SpeedCage history

- `SpeedCages`: score, reaction time, targets, duration, HR fields, zone durations, `brainSpeed`, `hrRecovery`, `hrMaxForZoneCalc`, `speedCageGameModeConfigId`.
- `SpeedCageRounds`: round-level score, HR fields, zone durations.
- `SpeedCageGameModeConfigs`: `trainingName`.
- `SpeedCageRoundStatistics` and `SpeedCageRoundTargetData`: reaction-time and target distribution detail.
- `HrStats`: round-level HR start/end/pause data linked to SpeedCage rounds.

SpeedCage is valuable for cognitive-motor features and later Brain Age, but Week 2 can keep this to summary-level display.

### Circle training / target output

- `CircleTrainings`: `kioskId`, `setupByUserId`, `hyrox`, `name`, `mode`, `status`, `style`, timestamps.
- `CircleTrainingExercises`: `circleTrainingId`, `orderIndex`, `style`, `name`, `target`.
- `CircleTrainingParticipants`: `circleTrainingId`, `userId`, `category`, `division`, finished summary.
- `CircleTrainingExerciseLogs`: per-station duration, score, repetitions, status, calories, `hrAverage`.

The target API object is `CreateTrainingRequest`:

```ts
type CreateTrainingRequest = {
  kioskId: string;
  setupByUserId: number;
  hyrox: boolean;
  name: string;
  mode: "single" | "double" | "relay";
  status: "setup";
  style: "duration" | "score" | "repetitions";
  startedAt?: string | null;
  completedAt?: string | null;
  exercises: Array<{
    orderIndex: number;
    style: "duration" | "score" | "repetitions";
    name: string;
    target: string;
  }>;
  participants: Array<{
    userId: number;
    category: "men" | "women" | "mixed";
    division?: "open" | "pro" | null;
    teamName?: string | null;
  }>;
};
```

Important gap: `CircleTrainingExercises.target` is a free string like `"1000m"` or `"50x"`. There is no canonical HR target or stimulus field in the circle-training contract today.

Kiosk API flow verified from `TheSphere-Kiosk`:

- Login: `POST auth/sign_in`, QR login polling: `POST auth/qr_exercube`, then `GET user`.
- Create setup: `POST circle-trainings` with `CreateTrainingRequest`.
- Created response: `TrainingResponse` returns the `training.id`, created `exercises`, `participants`, and each participant's `exerciseLogs`.
- Start/stop training: `POST circle-trainings/{id}/start`, `POST circle-trainings/{id}/stop`.
- Start/stop/update station logs: `POST circle-trainings/exercise-logs/{exerciseLogId}/start`, `POST circle-trainings/exercise-logs/{exerciseLogId}/stop`, `PATCH circle-trainings/exercise-logs/{exerciseLogId}`.
- The exercise-log id, not the exercise id alone, is the runtime handle for start/stop/update.
- `hrAverage` is sent today. HR-zone fields exist in kiosk classes only as `JsonIgnore` TODOs for Michel, so they are not API payload fields yet.

## Product Shape

The UI should feel like a practical training tool. The first screen should be the working product.

Core screens:

1. **Member Select**
   - Search/select a member from the export.
   - Show decision-useful metadata: age, available profile data, workout count, last workout date, HR data availability, confidence.
   - Include a clear "new member / cold start" path.

2. **Intake**
   - Follow the three-section local prototype:
     - Goal & Focus: exactly one of eight goals, then up to two focus choices.
     - Training Setup: fitness level, current training minutes/intensity, available days, and other sports/activities.
     - Health Details: one simple health/injury question first; branch into pain scale, recovery stage, and clearance only when needed.
   - Make required fields visible. For safety- or outcome-critical goals such as Move Pain-Free and Prepare for an Event, require at least one focus answer.
   - Keep optional fields skippable so the form does not feel like a medical intake.

3. **Fitness Snapshot**
   - Cold start: show low confidence and explain it is based on questionnaire only.
   - Existing user: show history count, HR availability, consistency, observed max HR, estimated resting/max HR, and recent trend.
   - Avoid medical claims. Treat Body Age / Brain Age as motivational metrics if used.

4. **Review Setup**
   - Group answers into Goal & Focus, Training Setup, and Health.
   - Let the user jump back by section.
   - Treat this screen as the exact payload checkpoint before generation.

5. **Generated Plan**
   - Weekly structure: sessions per week, duration, intensity, progression.
   - Session rows/cards: stimulus, HR zone, duration, difficulty, rationale, resolved station/exercise.
   - Explain why the plan fits this member.
   - Show `CreateTrainingRequest` preview as the integration proof.
   - Match the local `ux_09_plan_ready` payoff: clear weekly cadence, selected training days, session themes, points earned, and a primary Start Training action.

6. **Rewards / Habit Loop**
   - Surface points, streaks, and rewards as part of the product promise.
   - For Week 2 this can be demo state. Do not let reward persistence block plan/schema work.

7. **Adaptation Preview**
   - Show what changed after a new workout or simulated new session.
   - Use direct reasons: "HR recovery improved", "recent HR stayed high", "score improved at same difficulty", "missed target sessions".

## Product Boundaries: Do Not Duplicate Existing Surfaces

The adaptive plan app should not display data just because it exists. It should show only what helps the member understand the plan and what helps Sphery prove the product value.

Do not duplicate the Sphery app:

- Account/profile management.
- Membership and booking ownership, unless needed as a handoff placeholder.
- Full historical result dashboards already available to members.
- Generic achievement/history surfaces that are not tied to the next plan decision.

Do not duplicate the Nexus kiosk:

- Live station control.
- Start/stop exercise controls.
- Sensor pairing flow.
- Live leaderboard.
- Runtime exercise status for active teams.
- Full kiosk setup flow for standard circles.

What this app should show instead:

- The member's goal and focus.
- The generated 4-week plan.
- Why this plan fits this member.
- The next recommended session.
- Confidence and missing-data notes when the estimate is weak.
- Adaptation reasons after new training data arrives.
- A small reward/streak/quest surface only when it reinforces returning for the next planned session.

Rule of thumb: if the information answers "what should I do next and why?", it belongs here. If it answers "what is happening live at the station?", it belongs in Nexus. If it answers "who am I as a Sphery member?", it belongs in the Sphery app.

## UI/UX Work Plan

### Monday, July 20 - Concept Lock + Contract Shape

- Replace the starter Next.js page with the product shell.
- Define the main journey: member select -> Goal & Focus -> Training Setup -> Health Details -> Review Setup -> fitness snapshot -> generated plan -> export preview/rewards.
- Create or port TypeScript types:
  - `TrainingGoal`
  - `TrainingFocus`
  - `ActivityLevel`
  - `OtherActivity`
  - `HealthDetails`
  - `QuestionnaireAnswers`
  - `FitnessEstimate`
  - `Plan`
  - `PlannedSession`
  - `CreateTrainingRequest`
  - `AdaptiveUpdate`
- Use local mock data first, but shape it around the real Sphery tables.
- Write down the product boundary: plan/explanation/adaptation only, not kiosk runtime or app membership.
- Draft Michel's five-table schema brief with example questionnaire answers.

### Tuesday, July 21 - UI Flow + Michel Draft

- Build intake flow and validation.
- Use the local UX principle: one decision per screen, section-based progress, visible required states, and branching health details only when needed.
- Add goal-specific plan defaults and rationale copy.
- Build the plan display with real-feeling generated data.
- Keep the interface dense, calm, and readable.
- Prepare a short Michel handoff packet: one-page concept, five-table schema, `CreateTrainingRequest` contract, and open questions.

### Wednesday, July 22 - Handoff-Ready Demo And Schema Review

- Build the fitness snapshot and explanation layer.
- Add empty, low-confidence, and high-confidence states.
- Define uncertainty display: confidence score, data sources, missing-data notes.
- Review the API object and five-table schema brief with Michel.
- Run the demo with at least:
  - one cold-start member,
  - one existing member with little history,
  - one existing member with rich history.
- End the day with a written "Michel needs to decide" list.

### Thursday, July 23 Morning - Optional Buffer Only

- Only use this for final handoff, quick corrections, or a Michel sync.
- Hand Michel the schema/API brief and the two specific API gaps: `hrTarget` per exercise and HR-zone durations in circle logs.
- Do not start work that would leave the repo half-broken before travel.

## Backend/API Work This Week

The backend does not need to become production-complete this week. It needs to stabilize the contract and prove DB-in, plan-out.

Recommended minimum endpoints:

- `GET /health`
  - Confirms engine is running.
- `GET /members`
  - Returns searchable demo members from `Users` plus profile/history summary.
- `GET /members/{userId}/history-summary`
  - Reads `HealthData`, `Workouts`, `HrValues`, SpeedCage tables, and circle summaries.
- `POST /estimate`
  - Input: optional `userId`, questionnaire answers.
  - Output: `FitnessEstimate`, sources, confidence, limitations.
- `POST /generate-plan`
  - Input: optional `userId`, questionnaire answers, constraints.
  - Output: canonical plan, explanation, and `CreateTrainingRequest`.
- `POST /plans/{planId}/create-training-request`
  - Optional boundary if generation and kiosk handoff are separate.
  - Output must include required `setupByUserId`; the kiosk asserts that this user has an auth token before calling `POST circle-trainings`.
- `POST /update-plan`
  - Input: plan id plus new workout/session id or simulated update.
  - Output: plan diff, new estimate, adaptation explanation, engagement changes.

If time is tight, prioritize `GET /members`, `GET /members/{userId}/history-summary`, and `POST /generate-plan`.

## Schema Brief For Michel

This should be additive. Do not modify existing Sphery tables until the team agrees how adaptive training should live beside the current app/kiosk data.

The `_local/miro-frame/data-model.html` concept proposes five core plan-side tables. The names below can be adapted to Sphery's naming conventions, but the boundaries are the important part.

### 1. Questionnaire Answer

Purpose: store the complete intake that current Sphery data does not capture.

Suggested table: `AdaptiveQuestionnaireAnswers`

Fields:

- `id`
- `userId` -> `Users.id`
- `goal`
- `focusJson`
- `experienceLevel`
- `activityLevel`
- `sessionsPerWeek`
- `sessionLengthMinutes`
- `availableDaysJson`
- `currentTrainingMinutesPerWeek`
- `currentIntensity`
- `otherActivitiesJson`
- `gymId`
- `injuriesJson`
- `medicalJson`
- `hasMedicalFlags`
- `heightCmSnapshot`
- `weightKgSnapshot`
- `genderSnapshot`
- `questionnaireVersion`
- `createdAt`
- `updatedAt`

Guidance:

- Keep height/weight/gender as snapshots or overrides, not replacements for `HealthData`, unless Michel wants this feature to update `HealthData`.
- `goal` is required for adaptive generation because Sphery history does not contain member intent.
- `focusJson`, `otherActivitiesJson`, `injuriesJson`, and `medicalJson` match the local UX concept's branching form without over-normalizing v1.

Example answer:

```json
{
  "userId": 82,
  "goal": "build_strength_muscle",
  "focusJson": ["hypertrophy", "functional_strength"],
  "experienceLevel": "beginner",
  "activityLevel": "moderate",
  "sessionsPerWeek": 3,
  "sessionLengthMinutes": 45,
  "availableDaysJson": ["mon", "wed", "fri"],
  "currentTrainingMinutesPerWeek": 180,
  "currentIntensity": 3,
  "otherActivitiesJson": [
    { "name": "football", "minutesPerWeek": 90, "intensity": 4 }
  ],
  "gymId": "sphere_darmstadt",
  "hasMedicalFlags": false
}
```

Why Michel needs it: this is the missing "intent" layer. Existing Sphery tables know what the member did, but not what they want, how often they can train, what else they do, or whether safety constraints should block automatic plan issue.

### 2. Fitness Estimate

Purpose: freeze the engine's interpretation of the member when a plan is generated or adapted.

Suggested table: `AdaptiveFitnessEstimates`

Fields:

- `id`
- `userId` -> `Users.id`
- `questionnaireAnswerId` -> `AdaptiveQuestionnaireAnswers.id`, nullable
- `source` (`questionnaire_only`, `session_history`, `adaptation`)
- `sourceWorkoutCount`
- `sourceSpeedCageCount`
- `sourceCircleTrainingCount`
- `sourceStartDate`
- `sourceEndDate`
- `estimatedRestingHr`
- `estimatedMaxHr`
- `fitnessScore`
- `recoveryScore`
- `enduranceScore`
- `performanceScore`
- `cognitiveMotorScore`
- `bodyAge`
- `brainAge`
- `confidence`
- `featuresJson`
- `modelVersion`
- `basedOnThroughWorkoutId`
- `basedOnThroughSpeedCageId`
- `basedOnThroughCircleTrainingParticipantId`
- `createdAt`

Guidance:

- `featuresJson` should include exact derived inputs from `Workouts`, `HrValues`, `SpeedCages`, and circle logs so explanations are auditable.
- Do not write back to `HealthData.hrRestingPulse` or `HealthData.hrMax` in v1 unless the team explicitly decides these estimates should become product data.

Example estimate:

```json
{
  "userId": 82,
  "source": "session_history",
  "sourceWorkoutCount": 42,
  "sourceSpeedCageCount": 8,
  "sourceCircleTrainingCount": 3,
  "estimatedRestingHr": 61,
  "estimatedMaxHr": 188,
  "fitnessScore": 68,
  "recoveryScore": 72,
  "enduranceScore": 64,
  "performanceScore": 70,
  "cognitiveMotorScore": 59,
  "confidence": 0.78,
  "featuresJson": {
    "recentAvgHr": 146,
    "observedMaxHr": 184,
    "avgZone4To5Share": 0.34,
    "medianHrRecovery": 24,
    "completedWorkoutsLast30Days": 6
  },
  "modelVersion": "rules_v0.1"
}
```

Why Michel needs it: the generated plan should be reproducible later. If someone asks why the plan got harder, this snapshot shows the estimate and the input features used at that moment.

### 3. Plan

Purpose: store the plan parent object and the reason it exists.

Suggested table: `AdaptiveTrainingPlans`

Fields:

- `id`
- `userId` -> `Users.id`
- `questionnaireAnswerId` -> `AdaptiveQuestionnaireAnswers.id`
- `fitnessEstimateId` -> `AdaptiveFitnessEstimates.id`
- `status` (`draft`, `active`, `completed`, `superseded`, `held_for_review`)
- `goal`
- `startDate`
- `endDate`
- `cycleWeeks` default 4
- `sessionsPerWeek`
- `generatorVersion`
- `configFormat` (`CreateTrainingRequest`)
- `rationale`
- `createdAt`
- `updatedAt`

Guidance:

- Store the rationale with the plan so adaptation decisions remain explainable later.
- `held_for_review` handles medical/safety flags without pretending the app can medically clear someone.

Example plan:

```json
{
  "userId": 82,
  "questionnaireAnswerId": 12,
  "fitnessEstimateId": 31,
  "status": "active",
  "goal": "build_strength_muscle",
  "cycleWeeks": 4,
  "sessionsPerWeek": 3,
  "configFormat": "CreateTrainingRequest",
  "rationale": "Strength-focused plan with conditioning support because the member chose hypertrophy and functional strength, has moderate current activity, and has enough HR history for a medium-confidence estimate."
}
```

Why Michel needs it: this is the member's current plan object. It lets the app show "My Plan", supersede old plans, and connect plan sessions to generated kiosk trainings.

### 4. Plan Session

Purpose: store each prescribed session in equipment-agnostic terms, then preserve its Sphery export.

Suggested table: `AdaptiveTrainingPlanSessions`

Fields:

- `id`
- `planId` -> `AdaptiveTrainingPlans.id`
- `weekIndex`
- `sessionIndex`
- `stimulusMixJson`
- `primaryStimulusType`
- `intensityZone`
- `targetHrMin`
- `targetHrMax`
- `hrTarget`
- `durationMinutes`
- `difficulty`
- `progressionRule`
- `scheduledSlot`
- `resolvedEquipmentType`
- `resolvedModeKey`
- `resolvedExerciseName`
- `resolvedTarget`
- `circleTrainingId` -> `CircleTrainings.id`, nullable
- `createdExerciseLogIdsJson`
- `createTrainingRequestJson`
- `status` (`planned`, `done`, `skipped`)
- `createdAt`

Guidance:

- Keep stimulus fields as the source of truth; equipment resolution is derived from them.
- Store `createTrainingRequestJson` in v1 to prove integration readiness without forcing Michel to change kiosk tables immediately.
- If the product later creates real `CircleTrainings`, this table can point to `CircleTrainings.id`.
- After `POST circle-trainings`, store the returned exercise-log ids if the plan app needs to correlate planned sessions to kiosk runtime logs.
- `hrTarget` is the schema gap the local board calls out: current `CircleTrainingExercises.target` is a free work target, not an intensity target.

Example session:

```json
{
  "planId": 44,
  "weekIndex": 1,
  "sessionIndex": 1,
  "primaryStimulusType": "strength",
  "stimulusMixJson": { "strength": 0.65, "cardio_intensity": 0.25, "mobility_stability": 0.1 },
  "intensityZone": 3,
  "targetHrMin": 132,
  "targetHrMax": 148,
  "durationMinutes": 45,
  "difficulty": 5,
  "scheduledSlot": "freies_training",
  "resolvedEquipmentType": "sphere_circle",
  "resolvedExerciseName": "Leg Press",
  "resolvedTarget": "50x",
  "status": "planned"
}
```

Example `createTrainingRequestJson` excerpt:

```json
{
  "kioskId": "darmstadt-main",
  "setupByUserId": 82,
  "hyrox": false,
  "name": "My Plan - Strength W1S1",
  "mode": "single",
  "status": "setup",
  "style": "duration",
  "exercises": [
    { "orderIndex": 1, "style": "repetitions", "name": "Leg Press", "target": "50x" },
    { "orderIndex": 2, "style": "duration", "name": "ExerCube", "target": "8min" }
  ],
  "participants": [
    { "userId": 82, "category": "mixed", "division": "open", "teamName": null }
  ]
}
```

Why Michel needs it: this table is the bridge from plan logic to kiosk runtime. It stores what the engine meant, what equipment it resolved to, and the exact kiosk payload used or previewed.

### 5. Adaptation Event

Purpose: preserve why a plan changed after new training data arrived.

Suggested table: `AdaptiveTrainingPlanAdjustments`

Fields:

- `id`
- `planId` -> `AdaptiveTrainingPlans.id`
- `userId` -> `Users.id`, optional but useful for querying
- `previousPlanId` -> `AdaptiveTrainingPlans.id`
- `newPlanId` -> `AdaptiveTrainingPlans.id`
- `trigger` (`logs`, `missed_sessions`, `re_questionnaire`, `manual`)
- `basedOnLogsJson`
- `triggerWorkoutId` -> `Workouts.id`, nullable
- `triggerSpeedCageId` -> `SpeedCages.id`, nullable
- `triggerCircleTrainingParticipantId` -> `CircleTrainingParticipants.id`, nullable
- `previousFitnessEstimateId` -> `AdaptiveFitnessEstimates.id`
- `newFitnessEstimateId` -> `AdaptiveFitnessEstimates.id`
- `adjustmentType` (`increase_load`, `maintain`, `reduce_load`, `recover`, `regenerate`)
- `change`
- `rationale`
- `signalsJson`
- `createdAt`

Guidance:

- This table supports the acceptance criterion that adaptations are explainable.
- The trigger columns are nullable because the trigger may be a simulated demo event in v1.

Example event:

```json
{
  "planId": 44,
  "previousPlanId": 44,
  "newPlanId": 45,
  "trigger": "logs",
  "triggerCircleTrainingParticipantId": 901,
  "previousFitnessEstimateId": 31,
  "newFitnessEstimateId": 38,
  "adjustmentType": "increase_load",
  "change": "Week 2 conditioning session increased from zone 3 to low zone 4.",
  "rationale": "The member completed all planned sessions, average HR stayed inside target, and HR recovery improved by 8 bpm.",
  "signalsJson": {
    "sessionsCompletedThisWeek": 3,
    "plannedSessionsThisWeek": 3,
    "hrRecoveryDelta": 8,
    "avgHrWithinTarget": true
  }
}
```

Why Michel needs it: without this table, the product cannot explain adaptation. It would generate a new plan, but nobody could audit what changed or why.

### Supporting Config: Stimulus Mapping

Purpose: version the hand-made mapping between goals, stimuli, and Sphery station/exercise choices.

Suggested config file for v1, table later if needed: `AdaptiveStimulusMappings`

Fields:

- `id`
- `mappingVersion`
- `goal`
- `stimulusType`
- `equipmentType`
- `modeKey`
- `exerciseName`
- `defaultStyle`
- `defaultTarget`
- `defaultIntensityZone`
- `supportsProgression`
- `notes`
- `reviewedBy`
- `createdAt`
- `updatedAt`

Guidance:

- A versioned JSON/YAML file is acceptable for v1 if Michel does not want a table yet.
- The current circle-training `target` field does not encode HR intensity, so adaptive intensity either stays in the adaptive tables/export metadata or requires a Sphery API extension.

### Deferred / Optional: Habit Loop State

Purpose: support the retention layer without overloading training tables.

Suggested tables:

- `AdaptiveMemberMetrics`
- `AdaptiveStreaks`
- `AdaptiveLeagueStandings`
- `AdaptiveQuests`
- `AdaptiveRewards`
- `AdaptiveRewardWallets`

V1 can also keep this as generated demo state if schema scope must stay small. If persisted, keep it separate from plan generation so the ML/generator remains understandable.

## Data Contract To Align On

Frontend request:

```ts
type GeneratePlanRequest = {
  userId?: number;
  questionnaire: {
    age: number;
    weightKg: number;
    heightCm: number;
    gender?: "male" | "female" | "other";
    goal: TrainingGoal;
    focus: string[];
    activityLevel: ActivityLevel;
    experienceLevel?: "beginner" | "intermediate" | "advanced";
    sessionsPerWeek?: number;
    sessionLengthMinutes?: 20 | 30 | 45 | 60;
    availableDays?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
    currentTrainingMinutesPerWeek?: number;
    currentIntensity?: 1 | 2 | 3 | 4 | 5;
    otherActivities?: Array<{
      name: string;
      minutesPerWeek: number;
      intensity: 1 | 2 | 3 | 4 | 5;
    }>;
    hasMedicalFlags?: boolean;
    healthDetails?: {
      injuryAreas?: string[];
      painScale?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
      recoveryStage?: string;
      medicalClearance?: boolean;
    };
  };
};
```

Frontend response:

```ts
type GeneratePlanResponse = {
  fitnessEstimate: FitnessEstimate;
  plan: Plan;
  createTrainingRequest: CreateTrainingRequest;
  kioskHandoff: {
    apiPath: "circle-trainings";
    requiresAuthenticatedSetupByUserId: true;
    expectedResponse: "TrainingResponse";
    runtimeLogHandle: "exerciseLogId";
  };
  explanation: {
    headline: string;
    factors: string[];
    limitations: string[];
  };
};
```

## Michel Questions

- Should adaptive profile snapshots ever update `HealthData`, or remain separate?
- Should v1 persist generated plans, or generate on demand and persist only later?
- Does Sphery want adaptive plans to create real `CircleTrainings`, or only produce `CreateTrainingRequest` JSON for handoff?
- Who is the correct `setupByUserId` for a plan-generated solo training: the member, a trainer/staff account, or a system user?
- Should HR target/intensity be added to circle-training schema/API, since `CircleTrainingExercises.target` is only a free work target string today?
- Can circle exercise logs add HR-zone durations? The `_local` board proposes `zone1DurationSeconds` through `zone5DurationSeconds`, while current `CircleTrainingExerciseLogs` only has `hrAverage`.
- What naming convention should we use for mode keys and exercise names so generator output matches kiosk expectations?
- Who should approve the goal -> stimulus -> station mapping before Week 3?

## What To Give Michel This Week

Give Michel a focused packet, not the whole concept universe.

Use `docs/michel_schema_handoff.md` as the self-contained handoff. Michel does not need access to `_local` or the kiosk repo to understand the proposal.
Use `docs/adaptive_schema_draft.sql` as the implementation-shaped draft he can review or adapt.

1. **One-sentence product explanation**
   - "I am building the adaptive planning layer between the Sphery app and Nexus kiosk: the app knows who the member is, my layer decides what they should do next and why, and the kiosk runs the generated circle training."

2. **The five-table schema proposal**
   - `AdaptiveQuestionnaireAnswers`
   - `AdaptiveFitnessEstimates`
   - `AdaptiveTrainingPlans`
   - `AdaptiveTrainingPlanSessions`
   - `AdaptiveTrainingPlanAdjustments`
   - Include the examples, derivation notes, purpose, and limitations from `docs/michel_schema_handoff.md`.
   - Include the draft SQL from `docs/adaptive_schema_draft.sql`.

3. **The reason these tables are not duplicates**
   - Existing Sphery tables store identity, health basics, completed workouts, circle trainings, and runtime exercise logs.
   - These new tables store intent, generated plan state, model interpretation, future planned sessions, and adaptation explanations.

4. **The kiosk contract**
   - Generated sessions must become `CreateTrainingRequest`.
   - `setupByUserId` is required by the kiosk.
   - After `POST circle-trainings`, the returned `TrainingResponse` gives `exerciseLogs`; those ids are used for start/stop/update.

5. **The two backend gaps to discuss**
   - Where should adaptive HR targets live? Current `CircleTrainingExercises.target` is a free work target string, not intensity.
   - Can circle logs store HR-zone durations? Current `CircleTrainingExerciseLogs` has `hrAverage`; kiosk code has HR-zone TODO fields but ignores them in JSON.

6. **A concrete example**
   - Use the example "Build Strength & Muscle, hypertrophy + functional strength, 3x/week, Mon/Wed/Fri, 45 minutes" flow from this doc.
   - Show how it becomes a questionnaire answer, a fitness estimate, a plan, planned sessions, and eventually a `CreateTrainingRequest`.

7. **Decisions you need from him**
   - Table names and relationships: acceptable or adjust?
   - Persist generated plans now, or generate on demand for v1?
   - Should the plan app ever write into existing Sphery tables, or only create separate adaptive tables?
   - Who owns `setupByUserId` for a member's solo generated plan?
   - Does he prefer JSON columns for flexible v1 fields, or normalized child tables now?

Suggested Michel meeting goal: leave with approval or corrections on the five-table boundary. Do not try to solve rewards, full ML modeling, or final app/kiosk integration in that meeting.

Suggested Miro work: recreate the two Mermaid ER diagrams from `docs/michel_schema_handoff.md` as Miro boxes/arrows so the schema conversation matches the team's existing visual style.

## Local References To Reuse

- `_local/ux-concept/training-plan-ux-concept_11.html`
- `_local/ux-concept/screenshots/ux_00_landing.png` through `ux_11_rewards_catalog.png`
- `_local/miro-frame/adaptive-training-concept.html`
- `_local/miro-frame/system-and-data-flow.html`
- `_local/miro-frame/data-model.html`
- `_local/miro-frame/roadmap-and-open-questions.html`
- `_local/miro-board/board-notes.md`
- `.context/kiosk-repo/Assets/2_Code/Network API/Data/Requests/CreateTrainingRequest.cs`
- `.context/kiosk-repo/Assets/2_Code/Network API/NetworkAPI.cs`
- `.context/kiosk-repo/Assets/2_Code/Network API/Data/ExerciseLog.cs`
- `.context/kiosk-repo/Assets/2_Code/Kiosk Management/Kiosk.InternalLogic.cs`

## Personal Work Rhythm

Start each day with a demo target:

- Monday: "I can explain the product's role between Sphery app and Nexus kiosk, and the data objects are named."
- Tuesday: "The intake and plan UI direction follows the local concept and avoids duplicating existing Sphery/kiosk surfaces."
- Wednesday: "Michel can understand the five table additions, the examples, and the open backend decisions."
- Thursday morning: "Only final handoff or quick corrections before travel."

Keep assumptions visible. Anything that affects Michel's schema or API work should move into this brief immediately.
