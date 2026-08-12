import type { TrainingGoal } from './types/plan';

/**
 * The compact view of a plan that the switcher UIs read — enough to name a
 * plan, say where it runs, and show how far through it you are, without
 * handing a whole PlanView to a component that only draws a row.
 *
 * A member can hold several plans at once; the app state that owns them lives
 * in app/page.tsx, which derives this shape once so every switcher agrees.
 */
export interface PlanSummary {
  id: string;
  goal: TrainingGoal;
  gymName: string;
  weeks: number;
  completed: number;
  total: number;
}
