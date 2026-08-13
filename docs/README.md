# Documentation index

Twenty-seven documents written over a ten-week internship, so a fair number of
them are records of a decision rather than descriptions of the system. This
index says which is which. **If a document is not listed under "Current", do
not build against it.**

Last trued up Aug 13, 2026.

## Current

The system as it stands. These are maintained and should stay true.

| Document | What it is |
|---|---|
| [`code-orientation.md`](code-orientation.md) | **Start here if you are picking up the code.** How a plan actually gets made, which files to read in what order, and the three things that will bite you. |
| [`limitations.md`](limitations.md) | Everything in the system that is not what it looks like: what is simulated, what the export cannot tell us, what is untested, what nobody qualified has reviewed. |
| [`model-summary.md`](model-summary.md) | The model, its features, its limitations. Acceptance criterion 6, and the honest account of where the numbers are thin. |
| [`path-to-production.md`](path-to-production.md) | What separates the demo from a product members can use, sequenced, plus the Aug 26 kiosk demo slice. |
| [`plan-app-database-design.md`](plan-app-database-design.md) | The plan app's own database — PostgreSQL 16, 58 tables. Explains `engine/db/schema.sql`, which is the source of truth. |
| [`kiosk-api.md`](kiosk-api.md) | The NEXUS kiosk circle-trainings API, v1 live and v2. Transcribed from Sphery's docs, verified against the dev system. V2 is the integration target. |
| [`product-backlog.md`](product-backlog.md) | Everything not built, grouped by epic, with the reason it was cut. |
| [`screens/README.md`](screens/README.md) | The 60 screenshots — every screen and flow the app has, at 2×. |
| [`diagrams/src/README.md`](diagrams/src/README.md) | How to regenerate the ERD and sheet diagrams. |

## Reference

Background that is still accurate but is not going to change. Read when you
need the reasoning, not the current state.

| Document | What it is |
|---|---|
| [`circuit-templates-evidence.md`](circuit-templates-evidence.md) | The training-science evidence behind the eight per-goal circuit templates. Still unsigned-off by a training lead — see below. |
| [`exercube-data.md`](exercube-data.md) | Every metric the ExerCube records, with descriptions. The reference for what the export actually contains. |
| [`mode-stimulus-mapping.md`](mode-stimulus-mapping.md) | ExerCube mode → training stimulus. Hand-made, informed by the export, still a draft awaiting expert review. |
| [`xp-leveling-design.md`](xp-leveling-design.md) | The points economy: earn rates, quests, monthly rank. Still the design behind `web/lib/types/engagement.ts`. Note the page it was drawn for — Progress — was replaced by the card collection on Aug 12; the currency survived, the surface changed. |
| [`research-hyrox-apps.md`](research-hyrox-apps.md) | The competitive landscape that shaped the habit loop. |
| [`research-longevity-kpis.md`](research-longevity-kpis.md) | Which longevity KPIs are defensible. HR recovery came out of this. Written for the Progress page, which no longer exists. |
| [`security-review-aug4.md`](security-review-aug4.md) | Report-only security review, Aug 4. |

## Superseded

Kept for the reasoning and the paper trail. Each carries a banner explaining
what replaced it. Do not implement from these.

| Document | Replaced by |
|---|---|
| [`database-schema.md`](database-schema.md) | `plan-app-database-design.md`. The 14-table draft became 58 tables. |
| [`michel-what-to-add.md`](michel-what-to-add.md) | Michel's Aug 11 call: separate store, not twelve new tables in the Sphery DB. Its survey of what already exists in the Sphery schema is still the good part. |
| [`michel_schema_handoff.md`](michel_schema_handoff.md) | Superseded July 21, before it was ever sent. |
| [`week_2_ui_ux_and_schema_plan.md`](week_2_ui_ux_and_schema_plan.md) | A July 20–24 plan. Historical. |

## Record

Point-in-time documents — meeting prep, alignment briefs, sprint plans. They
describe what was agreed or intended on a given date, not what is true now.

| Document | Date | Occasion |
|---|---|---|
| [`SCOPE.md`](SCOPE.md) | Jul 15 | The scope agreement. What was promised, and the open questions at the start. |
| [`concept-circle-training-brief.md`](concept-circle-training-brief.md) | Jul 14 | The circle-training pivot, and the first goal → stimulus → station mapping. |
| [`mvp-definition-and-milestones.md`](mvp-definition-and-milestones.md) | Jul 27 | Halfway-point alignment with Stephan. |
| [`mvp-alignment-brief.md`](mvp-alignment-brief.md) | Jul 27 | One page defining "polished MVP", so expectations matched. |
| [`miro-board-aug3.md`](miro-board-aug3.md) | Aug 3 | Paste-ready Miro board content. |
| [`max-feedback.md`](max-feedback.md) | Aug 10 | Max's review pass, and the Stephan questionnaire change that came out of it. |
| [`michel-meeting-prep.md`](michel-meeting-prep.md) | Aug 10 | Agenda for the Aug 11 database session. The decisions went differently — see the banner. |
| [`sprint-aug-10-14.md`](sprint-aug-10-14.md) | Aug 10 | The final week's plan. Mon–Tue landed, Wed did not, Thu landed halfway. |

## Still open

Carried forward, no owner assigned:

1. **Per-zone durations in Circle Trainings V2.** The kiosk does not send them,
   so circle sessions can only earn flat completion points. The live ask for
   Michel.
2. **Training-lead sign-off on the eight circuit templates.** They are
   evidence-informed drafts. One review session with Stephan.
3. **GDPR and the data-processing agreement**, before anything hosted touches
   real member data. Stephan, Michel, Helen.
4. **Where the engine gets hosted, and on whose account.** Nothing is
   provisioned.
