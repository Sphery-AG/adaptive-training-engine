'use client';

import { useEffect, useState } from 'react';
import { DEMO_MEMBERS, GYMS, type DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';

/**
 * The front door. Replaces the old "who's training?" member roster, which read
 * as "log into anyone's data". Instead: a Sphere-branded sign-in that tells the
 * ecosystem story — one tap with your Sphere account and your training history
 * comes with you. Returning members sign in; new members start cold.
 *
 * Auth is faked for the demo (a few Sphere accounts map to seeded members), but
 * the shape is real: this screen is the seam where Sphere SSO slots in later.
 */

const HOME_GYM_ID = 'sphere-darmstadt';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Orbital brand mark — the Sphere Loop motif. `gradient` for standalone hero
 * use; `mono` inherits currentColor so it reads crisply as an SSO-style logo on
 * the bright "Continue with Sphere" button.
 */
function SphereMark({
  size = 72,
  spinning = false,
  mono = false,
}: {
  size?: number;
  spinning?: boolean;
  mono?: boolean;
}) {
  const orbit = mono ? 'currentColor' : 'url(#sphere-mark)';
  const dot = mono ? 'currentColor' : 'var(--orbit-cyan)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={spinning ? 'animate-spin [animation-duration:2.4s]' : undefined}
    >
      {!mono && (
        <defs>
          <linearGradient id="sphere-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--orbit-cyan)" />
            <stop offset="100%" stopColor="var(--orbit-fuchsia)" />
          </linearGradient>
        </defs>
      )}
      <ellipse cx="32" cy="32" rx="27" ry="12" stroke={orbit} strokeWidth="1.8" opacity={mono ? 0.85 : 0.55} />
      <ellipse
        cx="32"
        cy="32"
        rx="12"
        ry="27"
        stroke={orbit}
        strokeWidth="1.8"
        opacity={mono ? 0.85 : 0.55}
        transform="rotate(45 32 32)"
      />
      <circle cx="32" cy="32" r="8.5" fill={orbit} />
      <circle cx="59" cy="32" r="2.4" fill={dot} />
    </svg>
  );
}

type Phase = 'idle' | 'signup' | 'connecting' | 'chooser' | 'gym';

export default function LoginStep({
  onStart,
}: {
  onStart: (member: DemoMember, gym: GymConcept) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [member, setMember] = useState<DemoMember | null>(null);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const homeGym = GYMS.find((g) => g.id === HOME_GYM_ID)!;
  const accounts = DEMO_MEMBERS.filter((m) => m.baseline !== null);
  const guest = DEMO_MEMBERS.find((m) => m.baseline === null)!;

  // The Sphere handoff: a short "authorizing" beat, then the account chooser.
  useEffect(() => {
    if (phase !== 'connecting') return;
    const t = setTimeout(() => setPhase('chooser'), 1300);
    return () => clearTimeout(t);
  }, [phase]);

  // After picking (or creating) an account, choose the home gym, which decides
  // the available equipment, then hand off into the plan flow.
  function signIn(m: DemoMember) {
    setMember(m);
    setPhase('gym');
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-6 py-10">
      {phase === 'idle' && (
        <div className="animate-screen-in">
          <div className="flex flex-col items-center text-center">
            <SphereMark />
            <p className="eyebrow mt-6 text-fuchsia">NEXUS</p>
            <h1 className="mt-2 text-5xl leading-[0.9]">Adaptive Training</h1>
            <p className="mt-4 text-sm text-dim">
              Personalized plans built from your training data, tuned every time you train.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            <button
              onClick={() => setPhase('connecting')}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-[image:var(--gradient-accent)] px-6 py-4 text-base font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110"
            >
              <SphereMark size={22} mono />
              Continue with NEXUS
            </button>

            <button
              onClick={() => setPhase('signup')}
              className="w-full rounded-full border border-border-strong px-6 py-4 text-base font-semibold text-foreground transition hover:border-white/40"
            >
              New to NEXUS? Get started
            </button>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-faint">
            Your data stays yours. Signing in with NEXUS brings your training history with you.
          </p>
        </div>
      )}

      {phase === 'signup' && (
        <div className="animate-screen-in">
          <div className="flex flex-col items-center text-center">
            <SphereMark />
            <p className="eyebrow mt-6 text-fuchsia">NEXUS</p>
            <h2 className="mt-2 text-4xl leading-[0.95]">Create your account</h2>
            <p className="mt-3 text-sm text-dim">Set up your profile and we build your first plan around it.</p>
          </div>

          <div className="mt-8 space-y-3">
            <input
              type="text"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              placeholder="Full name"
              aria-label="Full name"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none placeholder:text-faint focus:border-white/30"
            />
            <input
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none placeholder:text-faint focus:border-white/30"
            />
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none placeholder:text-faint focus:border-white/30"
            />
          </div>

          <button
            onClick={() => signIn(guest)}
            disabled={!signupName.trim() || !signupEmail.trim()}
            className="mt-5 w-full rounded-full bg-[image:var(--gradient-accent)] px-6 py-4 text-base font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110 disabled:opacity-40"
          >
            Create account
          </button>
          <button
            onClick={() => setPhase('idle')}
            className="mt-4 w-full text-center text-sm font-semibold text-dim transition hover:text-foreground"
          >
            Already have an account? Sign in
          </button>
        </div>
      )}

      {phase === 'connecting' && (
        <div className="animate-screen-in flex flex-col items-center text-center">
          <SphereMark size={84} spinning />
          <p className="eyebrow mt-8 text-cyan">Connecting to NEXUS</p>
          <h2 className="mt-2 text-3xl">Syncing your account</h2>
          <p className="mt-3 text-sm text-dim">
            Verifying your NEXUS account and pulling in your training history.
          </p>
          <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 rounded-full bg-[image:var(--gradient-accent)] [animation:screen-in_1.3s_ease-in-out] motion-safe:animate-pulse" />
          </div>
        </div>
      )}

      {phase === 'chooser' && (
        <div className="animate-screen-in">
          <div className="text-center">
            <p className="eyebrow text-cyan">NEXUS account</p>
            <h2 className="mt-2 text-4xl">Choose your account</h2>
            <p className="mt-3 text-sm text-dim">Pick up right where you left off.</p>
          </div>

          <div className="mt-8 space-y-3">
            {accounts.map((m) => (
              <button
                key={m.id}
                onClick={() => signIn(m)}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-white/30 hover:bg-card-hover"
              >
                <div
                  aria-hidden
                  className="font-display grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--accent-soft2)] bg-[var(--accent-soft)] text-xl leading-none text-accent"
                >
                  {initials(m.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{m.name}</div>
                  <div className="mt-0.5 truncate text-xs text-faint">
                    {m.baseline!.workoutsAnalyzed} sessions synced · {homeGym.name}
                  </div>
                </div>
                <span aria-hidden className="text-faint">
                  →
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setPhase('idle')}
            className="mt-6 w-full text-center text-sm font-semibold text-dim transition hover:text-foreground"
          >
            Use a different account
          </button>

          <p className="mt-8 text-center text-xs text-faint">Demo accounts for this preview.</p>
        </div>
      )}

      {phase === 'gym' && (
        <div className="animate-screen-in">
          <div className="text-center">
            <p className="eyebrow text-cyan">Home gym</p>
            <h2 className="mt-2 text-4xl">Where do you train?</h2>
            <p className="mt-3 text-sm text-dim">
              Pick your home gym so we build plans around the equipment there.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {GYMS.map((g) => {
              const spheryCount = g.stations.filter((s) => s.isSpheryEquipment).length;
              return (
                <button
                  key={g.id}
                  onClick={() => member && onStart(member, g)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-white/30 hover:bg-card-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{g.name}</span>
                      {g.id === HOME_GYM_ID && (
                        <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-accent">Your gym</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-faint">
                      {g.location} · {g.stations.length} stations
                      {spheryCount ? ` · ${spheryCount} Sphery` : ''}
                    </div>
                  </div>
                  <span aria-hidden className="text-faint">→</span>
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-faint">
            Your gym's equipment shapes every plan we build.
          </p>
        </div>
      )}
    </div>
  );
}
