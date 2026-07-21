'use client';

import { useState } from 'react';
import WelcomeStep from './_components/WelcomeStep';
import QuestionnaireStep from './_components/QuestionnaireStep';
import DashboardStep from './_components/DashboardStep';
import { generatePlan, completeSession, type PlanView } from '@/lib/stub/engine';
import type { DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';
import type { QuestionnaireAnswers } from '@/lib/types/plan';
import type { AdaptiveUpdate } from '@/lib/types/engagement';

type Step = 'welcome' | 'questionnaire' | 'dashboard';

export default function Home() {
  const [step, setStep] = useState<Step>('welcome');
  const [member, setMember] = useState<DemoMember | null>(null);
  const [gym, setGym] = useState<GymConcept | null>(null);
  const [view, setView] = useState<PlanView | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<AdaptiveUpdate | null>(null);

  function start(m: DemoMember, g: GymConcept) {
    setMember(m);
    setGym(g);
    setStep('questionnaire');
  }

  function submit(answers: QuestionnaireAnswers) {
    if (!member || !gym) return;
    setView(generatePlan(member, gym, answers));
    setCompletedCount(0);
    setLastUpdate(null);
    setStep('dashboard');
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
    setCompletedCount(0);
    setLastUpdate(null);
  }

  if (step === 'welcome') return <WelcomeStep onStart={start} />;
  if (step === 'questionnaire' && member && gym)
    return <QuestionnaireStep member={member} gym={gym} onSubmit={submit} onBack={() => setStep('welcome')} />;
  if (step === 'dashboard' && view && member)
    return (
      <DashboardStep
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
