'use client';

import { useState } from 'react';
import LoginStep from './_components/LoginStep';
import QuestionnaireStep from './_components/QuestionnaireStep';
import PlanReadyStep from './_components/PlanReadyStep';
import MemberApp from './_components/MemberApp';
import {
  generatePlan,
  planViewFromEngine,
  completeSession,
  difficultyShift,
  type AdaptationResult,
  type PlanView,
  type ResolvedWeek,
} from '@/lib/stub/engine';
import { fetchEnginePlan, fetchEngineUpdate, withLiveBaseline } from '@/lib/engine/client';
import type { Plan } from '@/lib/types/plan';
import type { DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';
import type { QuestionnaireAnswers } from '@/lib/types/plan';
import type { AdaptiveUpdate, PerceivedEffort } from '@/lib/types/engagement';

type Step = 'welcome' | 'questionnaire' | 'planReady' | 'dashboard';

export default function Home() {
  const [step, setStep] = useState<Step>('welcome');
  const [member, setMember] = useState<DemoMember | null>(null);
  const [gym, setGym] = useState<GymConcept | null>(null);
  const [view, setView] = useState<PlanView | null>(null);
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<AdaptiveUpdate | null>(null);

  function start(m: DemoMember, g: GymConcept) {
    setMember(m);
    setGym(g);
    setStep('questionnaire');
  }

  async function submit(a: QuestionnaireAnswers) {
    if (!member || !gym) return;
    setAnswers(a);
    // Local dev with the Python engine running: the engine generates the plan
    // (real estimate + rules in Python). The stub only assembles engagement
    // and remains the full fallback on Vercel or when the engine is down.
    const { member: liveMember } = await withLiveBaseline(member);
    const enginePlan = await fetchEnginePlan(liveMember, gym, a);
    const generated = enginePlan
      ? planViewFromEngine(enginePlan as { plan: Plan; resolved: ResolvedWeek[] }, liveMember, gym, a)
      : generatePlan(liveMember, gym, a);
    setView(generated);
    // Returning members open the app already a couple of sessions into week 1,
    // matching the seeded engagement state, so the dashboard looks alive. A new
    // member (no baseline) starts fresh at zero.
    setCompletedCount(generated.engagement.streak.weekProgress.completed);
    setLastUpdate(null);
    setStep('planReady');
  }

  async function complete(livePoints: number, effort?: PerceivedEffort): Promise<AdaptationResult> {
    if (!view) throw new Error('No plan to update');
    const { view: next, update } = completeSession(view, completedCount, livePoints, effort);
    // With the local engine running, the adaptive decision comes from Python
    // (the member's effort rating, then real score-trend evidence); the stub's
    // own step is replaced by whatever the engine concluded, "plan holds"
    // included.
    if (member) {
      const sessionId = nthSessionId(view, completedCount);
      const engineUpdate = sessionId ? await fetchEngineUpdate(member, view, sessionId, effort) : null;
      if (engineUpdate) {
        next.plan = engineUpdate.plan as PlanView['plan'];
        next.resolved = engineUpdate.resolved as ResolvedWeek[];
        update.planChanges = engineUpdate.planChanges;
        update.summary = engineUpdate.summary;
      }
    }
    setView(next);
    setCompletedCount((c) => c + 1);
    setLastUpdate(update);
    // The shift is read off the two plans rather than reported, so the number
    // the member sees is the one that actually landed.
    return { update, shift: difficultyShift(view, next) };
  }

  /** Id of the (n+1)-th session across the plan's weeks, in order. */
  function nthSessionId(v: PlanView, n: number): string | null {
    let i = 0;
    for (const wk of v.resolved) {
      for (const rs of wk.sessions) {
        if (i === n) return rs.session.id;
        i++;
      }
    }
    return null;
  }

  function restart() {
    setStep('welcome');
    setMember(null);
    setGym(null);
    setView(null);
    setAnswers(null);
    setCompletedCount(0);
    setLastUpdate(null);
  }

  if (step === 'welcome') return <LoginStep onStart={start} />;
  if (step === 'questionnaire' && member && gym)
    return <QuestionnaireStep member={member} onSubmit={submit} onBack={() => setStep('welcome')} />;
  if (step === 'planReady' && view && answers)
    return (
      <PlanReadyStep
        view={view}
        answers={answers}
        onStart={() => setStep('dashboard')}
        onEdit={() => setStep('questionnaire')}
      />
    );
  if (step === 'dashboard' && view && member)
    return (
      <MemberApp
        member={member}
        view={view}
        completedCount={completedCount}
        lastUpdate={lastUpdate}
        onComplete={complete}
        onRestart={restart}
      />
    );
  return null;
}
