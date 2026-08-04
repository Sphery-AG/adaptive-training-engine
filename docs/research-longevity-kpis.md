# Research: longevity-center KPIs for the Progress page

**Date:** August 3, 2026. Commissioned off Stephan's Friday question: could the KPIs
longevity centers track be useful for our app? Short verdict: mostly not, with two
strong exceptions and one naming fix that matters more than the KPI question itself.

---

## 1. What the longevity space actually tracks

The field splits into three tiers, and only the third is reachable from workout data.

**Tier 1: blood and imaging (the actual business model).** Function Health sells 100+ to 160+ lab markers per year at $365 to $499 (ApoB, Lp(a), hs-CRP, homocysteine, fasting insulin, HbA1c, hormones, thyroid, autoimmune, cancer markers). Lanserhof's Longevity package runs bloodwork, full-body MRI, DEXA, sleep lab, bioimpedance, lactate and spiroergometry against the "Hallmarks of Aging" framework. Biograph, Human Longevity and the rest follow the same shape. **None of this is reachable from ExerCube data.** If the mental model of "longevity KPIs" is Function Health, the honest answer is that the overlap with our data is roughly zero.

**Tier 2: functional performance tests.** This is the tier that matters for a gym. Biograph's baseline assessment is explicitly VO2max, grip strength, body composition and movement analysis, organised into four pillars: Strength, Stability, Aerobic Capacity, Metabolic Flexibility. Fitnescity's consumer-facing "8 numbers that predict your healthspan" are lean muscle mass, visceral fat, bone density, resting heart rate, RMR, grip strength, VO2max, coronary artery calcium. VO2max is the near-universal headline: it is the single strongest predictor of all-cause mortality in this literature and it is what every longevity clinic leads with.

**Tier 3: passive/derived signals.** Resting HR, HRV, heart rate recovery, zone 2 minutes, sleep. These come from wearables, not clinics, and they are the ones with a plausible path from our data.

**The competitive reality check.** The relevant comparable is not Function Health, it is **EGYM BioAge**, already deployed in German gyms. BioAge compares strength, cardio, metabolism and flexibility against age and gender norms. But EGYM measures it: strength from instrumented machines, VO2max from a cardio test, body composition from Tanita scales plus a 3D camera. They have hardware for every input. We have a heart rate belt and a game. That gap is the whole story of this report.

Consumer analogues worth knowing: Garmin Fitness Age (derived from a Firstbeat VO2max estimate, anchored to population norms, accuracy about ±3 to 5 years), Oura Cardiovascular Age (PPG waveform to pulse wave velocity), Apple Cardio Fitness (submaximal HR plus GPS pace, ICC 0.86 to 0.89 against lab).

---

## 2. What we actually have (verified against the repo)

Facts that constrain everything below:

- `HrValues` is 1,062,687 rows of `(workoutId, time, value)`. That is a **sampled HR curve, not RR intervals** (`docs/week_2_ui_ux_and_schema_plan.md:28,101`).
- **HR coverage is roughly 10% of workouts.** `engine/app/features.py:12-13` documents `Workouts.hrAverage` populated on about 2,009 of 20,945 workouts. Dividing 1.06M HrValues rows by ~2,009 gives ~529 samples per HR workout, so roughly one sample every 3 seconds on a 25 to 30 minute session (arithmetic inference, not a verified query). **Curve resolution is fine. Coverage is the problem.**
- `HealthData` exists for 713 of 1,019 users. dob 704, weight 700, height 700, **gender only 199 (28%)**. `hrRestingPulse` and `hrMax` are 0 populated.
- **There is no calibrated external workload.** `docs/exercube-data.md:69` states Distance is "converted to moderate jogging based on workout duration, number, and type of exercises". It is synthetic. `RaceConfigs` carries difficulty (a 0 to 3 enum), hrTarget (a fraction) and duration.
- **`bodyScore` is degenerate in this export** (~1 for almost every row, `engine/app/features.py:11-12`), and score scales are inconsistent per preset (DualFlow rows average brainScore ≈185 while most presets sit at 0.7 to 1.0).
- **Body Score = "% of exercises performed correctly". Brain Score = "% of timings performed correctly"** (`docs/exercube-data.md:62-64`, Sphery's own wording).
- The **Brain Speed Assessment** is a monthly standardized protocol with a fixed benchmark round, and the device already displays results **against an age and gender benchmark** (`docs/exercube-data.md:44-49`).
- `boost_health_longevity` is already one of the eight questionnaire goals (`web/lib/types/plan.ts`).

---

## 3. KPI feasibility table

| KPI | Computable from our data? | How | Worth showing? |
|---|---|---|---|
| **Heart rate recovery** | **Yes, best-in-class fit** | Already computed: `AVG(pauseStartHR - pauseEndHR)` from `HrStats` (`features.py:178-188`). Upgrade: read a fixed 60s window off the `HrValues` curve so it maps to the literature | **Yes. This is the one.** Cole 1999 NEJM: &lt;12 bpm at 1 min roughly doubles all-cause mortality; a 2017 meta-analysis of 41,000+ found 68% higher risk. Real science, real data, already built |
| **Cognitive processing speed** | **Yes** | RT-Average, RT distribution across 0-4s thirds, plus the monthly Brain Speed Assessment (`brainSpeed`) which is already a fixed-benchmark protocol with age/gender norms on-device | **Yes, and it is the differentiator.** No longevity clinic and no gym chain has this. Processing speed is an established cognitive-aging biomarker; MindCrowd (n=75,666) gives public age norms. Sphery is the only company here that can honestly ship a cognitive KPI from training data |
| **Zone minutes / zone 2** | **Yes, trivially** | `timeInTier1-5`, already summed into zone shares (`features.py:213-219`) | **Yes, but frame as adherence not longevity.** Compare to the WHO 150 min/week guideline. Caveat: ExerCube is intermittent HIIT, so zone 2 accumulation will be genuinely low, and zones derive from an estimated hrMax. Do not market "3 hours of zone 2" (Attia's target) as something the cube delivers, because it does not |
| **Resting HR** | **Partly, and currently mislabeled** | `MIN(hrMin)` from `HrStats` floored at 30 bpm (`features.py:170-174`) | **Trend yes, absolute number no.** This is the lowest in-session round minimum, not true resting HR. It will read 20 to 40 bpm high. RHR has solid mortality data (RR 1.09 to 1.17 per +10 bpm) but only if the number is real. Ship it as "training heart rate at rest between rounds", or ship the trend arrow only |
| **HR at matched workload** | **Yes** | Same mode + same difficulty + same duration, regression of avg HR over time | **Yes, underrated.** Falling submaximal HR at a fixed workload is a textbook, unambiguous marker of aerobic adaptation. It needs no estimation model and no invented science. Reads as "same session, 9 bpm easier than in March" |
| **VO2max** | **Technically yes, honestly no** | Two paths, both weak. (a) Non-exercise: NTNU/HUNT model from age, BMI, resting HR, self-reported activity, claimed ±3.5 ml/kg/min. But that is a questionnaire result, it barely touches our proprietary data. (b) Submaximal HR-workload regression (Firstbeat/Apple method) requires speed or power, which Firstbeat's own white paper confirms is mandatory. **We have no calibrated workload** | **Not as a headline.** Polar's OwnIndex, the closest analogue to what we could build, validates at MAPE 13.7%, ICC 0.743, **limits of agreement ±11.4 ml/kg/min**, and overestimates by ~30% in fit populations. ±11 spans two full ACSM percentile categories. A number that wrong is a credibility liability in front of a HYROX prospect. See recommendation 4 for the fix |
| **Fitness age / biological age** | **No, as currently framed** | Would be built on estimated resting HR + BMI + self-reported activity | **No.** This is where it tips into marketing fiction. EGYM can ship BioAge because they measure four pillars with dedicated hardware. Ours would be the NTNU questionnaire in a costume, and a member who also uses EGYM or Garmin will see three different "ages" and trust none. **Percentile-vs-peers is the honest version of the same emotional payload** (see rec 3) |
| **HRV** | **No. Hard no** | `HrValues` is sampled HR, not beat-to-beat intervals. HRV requires RR intervals | **Not today.** Worth flagging as a cheap future unlock: the chest belts almost certainly already transmit RR intervals, they are just not being logged. One logging change opens HRV, and HRV is table stakes in the longevity conversation |
| **Body composition** | **BMI only** | Deurenberg: BF% = 1.20×BMI + 0.23×age − 10.8×sex − 5.4 (R²=0.79, SEE 4.1%) | **No.** SEE 4.1% BF, overestimates in muscular people, needs gender (only 28% filled), and weight is a stale one-time `HealthData` entry. Lean mass and visceral fat are what longevity centers actually sell here, and BMI is not a proxy for either |
| **Grip strength** | **No** | Not in the data | **No from data, but flag it.** It is on both the Biograph and Fitnescity lists and a dynamometer costs about €100. Cheapest possible way to add a genuine tier-2 longevity KPI to the gym floor. Speculation: unverified whether the Darmstadt circuit has a station where this fits |
| **Bone density, visceral fat, RMR, CAC, blood markers** | **No** | Requires DEXA, CT, metabolic cart, phlebotomy | **No.** Do not gesture at them |

---

## 4. Verdict

**Mostly not useful, with two real exceptions and one naming fix that matters more than the KPI question.**

The longevity industry's KPIs are overwhelmingly blood-and-imaging, and the functional tier (VO2max, grip strength, body composition) needs measurement hardware we do not have. Chasing that list leads to estimating things badly. But the underlying instinct is right, and the diagnosis is sharper than "add longevity KPIs": **Body Score and Brain Score are not confusing because they are the wrong KPIs, they are confusing because they are named wrong.** Body Score sounds like body composition. It is actually "percentage of exercises performed correctly", an execution-accuracy percentage. Users are not failing to understand a fitness metric, they are correctly failing to guess that a metric called "Body Score" is a movement-accuracy grade.

### Top 5 recommendations, ordered

**1. Fix the names before adding anything. Cheapest, highest impact.**
Rename to what they measure: "Movement Accuracy" and "Timing Accuracy" (or keep Sphery's brand names but always render the one-line definition on the card). Separately: `bodyScore` is degenerate in this export (~1 everywhere) and score scales are inconsistent per preset, so verify the live values behave before shipping either metric prominently. Right now the Progress page may be showing a constant.

**2. Ship Recovery as the one genuinely longevity-credible KPI.**
Heart rate recovery is the rare case where the science is strong, the marketing is easy, and we already compute it. Standardize it to a fixed 60-second window off the HrValues curve so it maps to published norms, then show it against age and gender peers. The story writes itself: "your heart recovers 8 bpm faster than three months ago". Cole 1999 gives the credibility, and it is measured, not estimated.

**3. Use percentiles, not ages, for the emotional payload.**
"You recover faster than 72% of men your age" delivers everything Fitness Age delivers without making a biological-age claim we cannot defend. It is instantly legible, it needs no model, and it is exactly the pattern the ExerCube Brain Speed screen already uses. This sidesteps the trap of shipping a third conflicting "age" number to members who already have Garmin and EGYM.

**4. Do not ship VO2max as a headline. If we want it, change the product, not the model.**
Add a **standardized submaximal test round**: fixed preset, fixed game speed, fixed duration, measure HR response. That single change turns VO2max from an unfalsifiable estimate into something defensible, because it supplies the calibrated workload the estimate mathematically requires. Bonus: run it monthly, aligned with the "Trainingsplan alle 4 Wochen" membership promise, and it becomes a recurring re-engagement event rather than a passive number. In the meantime, "HR at matched workload" (same session, lower heart rate) delivers most of the same message with none of the error bars.

**5. Lead with cognitive. It is the only KPI on this list nobody else can ship.**
The longevity market cares enormously about cognitive decline, and the entire industry proxies it with blood markers and MRI. Sphery measures reaction time under physical load, monthly, against a standardized benchmark, and already has age/gender norms on the device. Elevating Brain Speed from a buried assessment to a headline Progress KPI is the strongest longevity positioning available, it costs almost nothing, and it is uniquely ours. For the Aug 26 Gold's/MAG visit, that is the demo moment.

### The blocker to raise before any of this

**Roughly 90% of workouts have no HR data at all.** Every KPI in recommendations 2, 3 and 4 renders blank for most members. Before investing in longevity metrics, the belt has to become default or mandatory, or the new Progress page will be emptier than the current one. This is arguably the most actionable finding in the report and it is an operations decision, not an engineering one.

### Flagged as speculation
- The ~529 samples/workout figure is arithmetic from two documented counts, not a verified query (Docker was not running, so the DB could not be queried directly).
- The claim that the chest belts already transmit RR intervals is an inference from typical Polar-class hardware, unverified against Sphery's belt model or the kiosk logging path. Worth 20 minutes to check, because it is the cheapest possible unlock for HRV.
- Whether a grip-strength station fits the Darmstadt circuit layout is unverified.

---

Sources: [Function Health](https://www.functionhealth.com/), [Function Health FAQ](https://www.functionhealth.com/faq), [Lanserhof Longevity Programme](https://lanserhof.com/en/health-guide/lanserhof-longevity-package/), [Lanserhof clinic profile](https://worldlongevityclinics.com/clinics/lanserhof/), [Biograph longevity plan](https://www.biograph.com/blog/from-insight-to-action-turning-complex-health-data-into-a-personalized-longevity-plan), [Fitnescity: 8 numbers that predict healthspan](https://www.fitnescity.com/blog/the-8-numbers-that-predict-your-healthspan), [EGYM BioAge](https://us.egym.com/en-us/blog/egym-bioage), [EGYM BioAge calculation](https://support.egym.com/hc/en-us/articles/4596796255767-How-is-the-BioAge-calculated), [EGYM longevity training](https://us.egym.com/en-us/longevity-training), [Cole et al. 1999, NEJM heart-rate recovery](https://www.nejm.org/doi/full/10.1056/NEJM199910283411804), [Resting HR and mortality meta-analysis, CMAJ](https://www.cmaj.ca/content/188/3/E53), [Firstbeat VO2max white paper](https://www.firstbeat.com/wp-content/uploads/2017/06/white_paper_VO2max_30.6.2017.pdf), [Firstbeat Fitness Level](https://www.firstbeat.com/en/science-and-physiology/fitness-level/), [Polar Fitness Test validation](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12473405/), [Apple Watch VO2max validation, PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0323741), [Garmin Fitness Age accuracy](https://the5krunner.com/garmin-features/physiology/fitness-age/), [Oura Cardiovascular Age](https://support.ouraring.com/hc/en-us/articles/28451491040019-Cardiovascular-Age), [NTNU CERG fitness calculator](https://www.ntnu.edu/cerg/vo2max), [Non-exercise VO2max estimation, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3173948/), [MindCrowd reaction time cohorts, npj Aging](https://www.nature.com/articles/s41514-021-00067-6), [Processing speed as cognitive-aging biomarker](https://pubmed.ncbi.nlm.nih.gov/20230141/), [Firstbeat HRV science](https://www.firstbeat.com/en/science-and-physiology/heart-rate-variability/), [Deurenberg BMI-to-body-fat formulas](https://pubmed.ncbi.nlm.nih.gov/2043597/), [Cooper Institute VO2max percentiles](https://pmc.ncbi.nlm.nih.gov/articles/PMC4711926/), [Attia Zone 2 framework](https://www.gethealthspan.com/research/article/zone-2-endurance-training-longevity-cardiovascular-musculoskeletal-health), [Longevity gyms and retention](https://www.serenityways.com/posts/fitness-future-longevity-gyms)
