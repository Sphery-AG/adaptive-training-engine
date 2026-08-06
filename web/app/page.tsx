'use client';

import { useState } from 'react';
import LoginStep from './_components/LoginStep';
import QuestionnaireStep from './_components/QuestionnaireStep';
import PlanReadyStep from './_components/PlanReadyStep';
import MemberApp from './_components/MemberApp';
import { generatePlan, completeSession, type PlanView } from '@/lib/stub/engine';
import { withLiveBaseline } from '@/lib/engine/client';
import type { DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';
import type { QuestionnaireAnswers } from '@/lib/types/plan';
import type { AdaptiveUpdate } from '@/lib/types/engagement';

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
    // Local dev with the Python engine running: swap the persona's fake
    // baseline for one computed from the real export before generating.
    // On Vercel (no NEXT_PUBLIC_ENGINE_URL) this resolves to the member as-is.
    const { member: liveMember } = await withLiveBaseline(member);
    const generated = generatePlan(liveMember, gym, a);
    setView(generated);
    // Returning members open the app already a couple of sessions into week 1,
    // matching the seeded engagement state, so the dashboard looks alive. A new
    // member (no baseline) starts fresh at zero.
    setCompletedCount(generated.engagement.streak.weekProgress.completed);
    setLastUpdate(null);
    setStep('planReady');
  }

  function complete() {
    if (!view) return;
    const { view: next, update } = completeSession(view, completedCount);
    setView(next);
    setCompletedCount((c) => c + 1);
    setLastUpdate(update);
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
