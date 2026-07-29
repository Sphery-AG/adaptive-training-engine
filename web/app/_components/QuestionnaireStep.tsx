'use client';

/**
 * Intake orchestrator. Owns the reducer and maps the current screen to shell
 * chrome + a body from the screen registry. All flow logic (validity,
 * branching, progress, the CTA label) is derived from state — this component
 * only wires the state machine to the presentation.
 */
import { useReducer } from 'react';
import { IntakeShell } from './intake/IntakeShell';
import { SCREENS } from './intake/screens';
import { SECTIONS } from '@/lib/intake/model';
import {
  canAdvance,
  initialState,
  isLastScreen,
  isSkippable,
  reducer,
  sectionProgress,
  toQuestionnaireAnswers,
  type IntakeState,
} from '@/lib/intake/state';
import type { DemoMember } from '@/lib/stub/data';
import type { QuestionnaireAnswers } from '@/lib/types/plan';

function ctaLabel(s: IntakeState): string {
  if (isLastScreen(s)) return 'Create My Plan';
  if (s.screen === 'health') return s.hasInjury ? 'Continue' : 'Review My Setup';
  if (s.screen === 'injury') return 'Review My Setup';
  return 'Continue';
}

export default function QuestionnaireStep({
  member,
  onSubmit,
  onBack,
}: {
  member: DemoMember;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  onBack: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, { age: member.baseline?.actualAge }, initialState);
  const def = SCREENS[state.screen];
  const Body = def.Body;

  const stepCount = state.hasInjury ? 6 : 5;
  const stepNumber = Math.min(state.history.length + 1, stepCount);

  return (
    <IntakeShell
      screenKey={state.screen}
      stepNumber={stepNumber}
      stepCount={stepCount}
      progressFractions={sectionProgress(state)}
      progressLabels={SECTIONS.map((s) => s.label)}
      eyebrow={def.eyebrow}
      title={def.title}
      subtitle={def.subtitle?.(state)}
      required={def.required?.(state)}
      onBack={() => (state.history.length > 0 ? dispatch({ type: 'back' }) : onBack())}
      ctaLabel={ctaLabel(state)}
      ctaEnabled={canAdvance(state)}
      onCta={() =>
        isLastScreen(state) ? onSubmit(toQuestionnaireAnswers(state)) : dispatch({ type: 'advance' })
      }
      onSkip={isSkippable(state) ? () => dispatch({ type: 'advance' }) : undefined}
    >
      <Body state={state} dispatch={dispatch} />
    </IntakeShell>
  );
}
