'use client';

import { useState } from 'react';
import WelcomeStep from './_components/WelcomeStep';
import QuestionnaireStep from './_components/QuestionnaireStep';
import PlanReadyStep from './_components/PlanReadyStep';
import DashboardStep from './_components/DashboardStep';
import { generatePlan, completeSession, type PlanView } from '@/lib/stub/engine';
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

  function submit(a: QuestionnaireAnswers) {
    if (!member || !gym) return;
    setAnswers(a);
    setView(generatePlan(member, gym, a));
    setCompletedCount(0);
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

  if (step === 'welcome') return <WelcomeStep onStart={start} />;
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
      <DashboardStep
        member={member}
        view={view}
        lastUpdate={lastUpdate}
        onComplete={complete}
        onRestart={restart}
      />
    );
  return null;
}
