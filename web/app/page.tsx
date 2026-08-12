'use client';

import { useRef, useState } from 'react';
import LoginStep from './_components/LoginStep';
import QuestionnaireStep from './_components/QuestionnaireStep';
import PlanReadyStep from './_components/PlanReadyStep';
import GymWelcomeStep from './_components/GymWelcomeStep';
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
import { GYMS, type DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';
import type { QuestionnaireAnswers } from '@/lib/types/plan';
import type { AdaptiveUpdate, PerceivedEffort } from '@/lib/types/engagement';
import type { PlanSummary } from '@/lib/plan-summary';

type Step = 'welcome' | 'questionnaire' | 'planReady' | 'gymWelcome' | 'dashboard';

/**
 * One training plan the member holds, with the progress that belongs to it.
 * A member can run more than one at a time (marathon block plus a strength
 * plan, say), so completed sessions and the last adaptation are per plan
 * rather than global — switching plans must not move the other one's counter.
 */
interface PlanSlot {
  id: string;
  view: PlanView;
  answers: QuestionnaireAnswers;
  completedCount: number;
  lastUpdate: AdaptiveUpdate | null;
}

/** Whether finishing intake creates a plan or rewrites the one in hand. */
type IntakeMode = 'add' | 'replaceActive';

export default function Home() {
  const [step, setStep] = useState<Step>('welcome');
  const [member, setMember] = useState<DemoMember | null>(null);
  const [gym, setGym] = useState<GymConcept | null>(null);
  const [plans, setPlans] = useState<PlanSlot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('add');
  // Plan generation is a real round trip to the engine. Without this the CTA
  // stays live while it runs, and a double-tap fires two generations.
  const [generating, setGenerating] = useState(false);
  // Slot ids are ours rather than plan.id: a plan regenerated for a new gym is
  // still the same plan to the member, and must keep its progress.
  const nextSlotId = useRef(1);

  const active = plans.find((p) => p.id === activeId) ?? null;

  /** The switcher's view of the plans: enough to label and rank them. */
  const planSummaries: PlanSummary[] = plans.map((p) => {
    const total = p.view.resolved.reduce((n, wk) => n + wk.sessions.length, 0);
    return {
      id: p.id,
      goal: p.view.plan.goal,
      gymName: p.view.gym.name,
      weeks: p.view.plan.weeks.length,
      completed: p.completedCount,
      total,
    };
  });

  function patchActive(patch: Partial<PlanSlot>) {
    setPlans((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  }

  /**
   * Generate a plan and install it. Shared by every way one gets made:
   * finishing intake, signing in as a member who already has a setup on file,
   * adding a second plan, and switching gyms (a plan resolves onto a gym's
   * stations, so a new gym means a genuinely different plan).
   *
   * `mode` decides whether this becomes a new plan or rewrites the active one.
   * Rewriting keeps the slot's progress: changing gyms or editing your setup
   * does not undo the sessions you already did.
   */
  async function generateFor(
    m: DemoMember,
    g: GymConcept,
    a: QuestionnaireAnswers,
    mode: IntakeMode,
    next: Step,
  ) {
    if (generating) return;
    setGenerating(true);
    try {
      // Local dev with the Python engine running: the engine generates the plan
      // (real estimate + rules in Python). The stub only assembles engagement
      // and remains the full fallback on Vercel or when the engine is down.
      const { member: liveMember } = await withLiveBaseline(m);
      const enginePlan = await fetchEnginePlan(liveMember, g, a);
      const generated = enginePlan
        ? planViewFromEngine(enginePlan as { plan: Plan; resolved: ResolvedWeek[] }, liveMember, g, a)
        : generatePlan(liveMember, g, a);

      if (mode === 'replaceActive' && activeId) {
        setPlans((prev) =>
          prev.map((p) => (p.id === activeId ? { ...p, view: generated, answers: a, lastUpdate: null } : p)),
        );
      } else {
        const id = `plan-slot-${nextSlotId.current++}`;
        setPlans((prev) => [
          ...prev,
          {
            id,
            view: generated,
            answers: a,
            // Returning members open the app already a couple of sessions into
            // week 1, matching the seeded engagement state, so the dashboard
            // looks alive. A new member (no baseline) starts fresh at zero.
            completedCount: generated.engagement.streak.weekProgress.completed,
            lastUpdate: null,
          },
        ]);
        setActiveId(id);
      }
      setStep(next);
    } finally {
      setGenerating(false);
    }
  }

  function start(m: DemoMember, g: GymConcept) {
    setMember(m);
    setGym(g);
    // A returning member already has a setup on file, so signing in drops them
    // straight at the gym welcome rather than re-asking what they want. Only a
    // member without one (guest) goes through intake.
    if (m.currentPlan) {
      void generateFor(m, g, m.currentPlan, 'add', 'gymWelcome');
    } else {
      setIntakeMode('add');
      setStep('questionnaire');
    }
  }

  async function submit(a: QuestionnaireAnswers) {
    if (!member || !gym) return;
    await generateFor(member, gym, a, intakeMode, 'planReady');
  }

  /** Switching gyms re-resolves the active plan onto the new floor's stations. */
  async function changeGym(g: GymConcept) {
    if (!member || !active) return;
    setGym(g);
    await generateFor(member, g, active.answers, 'replaceActive', 'gymWelcome');
  }

  function addPlan() {
    setIntakeMode('add');
    setStep('questionnaire');
  }

  function editActivePlan() {
    setIntakeMode('replaceActive');
    setStep('questionnaire');
  }

  async function complete(livePoints: number, effort?: PerceivedEffort): Promise<AdaptationResult> {
    if (!active) throw new Error('No plan to update');
    const { view, completedCount } = active;
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
    patchActive({ view: next, completedCount: completedCount + 1, lastUpdate: update });
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
    setPlans([]);
    setActiveId(null);
    setIntakeMode('add');
  }

  if (step === 'welcome') return <LoginStep onStart={start} />;
  if (step === 'questionnaire' && member && gym)
    return (
      <QuestionnaireStep
        member={member}
        onSubmit={submit}
        onBack={() => setStep(active ? 'gymWelcome' : 'welcome')}
        busy={generating}
      />
    );
  if (step === 'planReady' && active)
    return (
      <PlanReadyStep
        view={active.view}
        answers={active.answers}
        onStart={() => setStep('gymWelcome')}
        onEdit={editActivePlan}
      />
    );
  if (step === 'gymWelcome' && active)
    return (
      <GymWelcomeStep
        view={active.view}
        gyms={GYMS}
        plans={planSummaries}
        activeId={active.id}
        busy={generating}
        onEnter={() => setStep('dashboard')}
        onAddPlan={addPlan}
        onSwitchPlan={setActiveId}
        onChangeGym={changeGym}
      />
    );
  if (step === 'dashboard' && active && member)
    return (
      <MemberApp
        member={member}
        view={active.view}
        completedCount={active.completedCount}
        lastUpdate={active.lastUpdate}
        availableDays={active.answers.availableDays}
        plans={planSummaries}
        activeId={active.id}
        onSwitchPlan={setActiveId}
        onAddPlan={addPlan}
        onComplete={complete}
        onRestart={restart}
      />
    );
  return null;
}
