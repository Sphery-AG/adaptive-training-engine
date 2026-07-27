'use client';

import { useState } from 'react';
import { Icon, type IconName } from '../_components/icons';

type Surface = 'nexus' | 'member' | 'station';

const surfaces: Array<{ id: Surface; label: string; sublabel: string; icon: IconName }> = [
  { id: 'nexus', label: 'Nexus', sublabel: 'kiosk home', icon: 'trend' },
  { id: 'member', label: 'Member app', sublabel: 'plan companion', icon: 'heart' },
  { id: 'station', label: 'Station', sublabel: 'session handoff', icon: 'zap' },
];

const planRows = [
  { day: 'MON', title: 'Reaction threshold', station: 'ExerCube 01', zone: 'Z3', duration: '30 min', active: true },
  { day: 'WED', title: 'Base capacity', station: 'ExerCube 02', zone: 'Z2', duration: '28 min', active: false },
  { day: 'FRI', title: 'Precision recovery', station: 'ExerCube 01', zone: 'Z1', duration: '22 min', active: false },
];

export default function DesignDirectionsPage() {
  const [surface, setSurface] = useState<Surface>('nexus');
  const [started, setStarted] = useState(false);

  return (
    <main className="min-h-screen bg-[#090a0b] text-[#f4f7f8]">
      <header className="border-b border-white/10 bg-[#0d0f11]">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <SpheryMark />
            <div className="leading-none">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00d1ff]">Sphery</div>
              <div className="mt-1 text-xs text-white/45">Unified training system</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-white/45 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#00d1ff] shadow-[0_0_16px_rgba(0,209,255,0.85)]" />
            Nexus network online
          </div>
        </div>
      </header>

      <section className="border-b border-white/10 bg-[#0d0f11]">
        <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00d1ff]">Direction reset</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-[1.05] sm:text-5xl">
                Training software built around the room, not a moodboard.
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/52">
              One visual system for the member plan, the Nexus kiosk, and the ExerCube handoff.
            </p>
          </div>

          <div className="mt-7 flex overflow-x-auto border-b border-white/10" role="tablist" aria-label="Product surfaces">
            {surfaces.map((item) => {
              const selected = surface === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSurface(item.id)}
                  className={`relative flex min-w-[172px] items-center gap-3 px-0 py-4 pr-8 text-left transition-colors ${
                    selected ? 'text-white' : 'text-white/42 hover:text-white/70'
                  }`}
                >
                  <span className={`grid h-9 w-9 place-items-center border ${selected ? 'border-[#00d1ff] bg-[#00d1ff] text-[#001a20]' : 'border-white/15 text-white/55'}`}>
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] text-current opacity-65">{item.sublabel}</span>
                  </span>
                  {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#00d1ff]" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 sm:py-8">
        {surface === 'nexus' && <NexusSurface started={started} onStart={() => setStarted(true)} />}
        {surface === 'member' && <MemberSurface />}
        {surface === 'station' && <StationSurface started={started} onStart={() => setStarted(true)} />}
      </section>

      <section className="border-t border-white/10 bg-[#0d0f11]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-7 sm:px-8 md:grid-cols-3">
          <Rule number="01" title="One active color">Cyan means ready, selected, or in progress. It does not decorate the screen.</Rule>
          <Rule number="02" title="The room is part of the UI">A plan resolves into real stations, availability, and a clear physical next step.</Rule>
          <Rule number="03" title="Motion confirms state">The system moves when a plan becomes ready or a station receives the session, never just to look alive.</Rule>
        </div>
      </section>
    </main>
  );
}

function SpheryMark() {
  return (
    <span className="relative grid h-8 w-8 place-items-center border border-[#00d1ff] bg-[#001b22]" aria-hidden="true">
      <span className="h-3 w-3 rounded-full border border-[#00d1ff]" />
      <span className="absolute h-5 w-5 border border-[#00d1ff]/35" />
    </span>
  );
}

function NexusSurface({ started, onStart }: { started: boolean; onStart: () => void }) {
  return (
    <div className="overflow-hidden border border-white/12 bg-[#121416] shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
      <div className="flex min-h-12 items-center justify-between border-b border-white/10 bg-[#15181a] px-4 text-[11px] uppercase tracking-[0.14em] text-white/42">
        <span>Nexus / Member session</span>
        <span className="font-mono text-[#00d1ff]">STATION SYNCED</span>
      </div>

      <div className="grid min-h-[700px] lg:grid-cols-[196px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#0d0f11] p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5 lg:block">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#b9d2d9] text-sm font-bold text-[#0b1113]">HM</div>
            <div className="lg:mt-3">
              <div className="font-semibold">Hanna Muller</div>
              <div className="mt-1 text-xs text-white/42">Member since 2024</div>
            </div>
          </div>
          <nav className="mt-5 grid grid-cols-3 gap-1 text-xs lg:grid-cols-1" aria-label="Nexus navigation">
            <NavItem label="Today" active icon="pulse" />
            <NavItem label="Training plan" icon="flag" />
            <NavItem label="Progress" icon="trend" />
          </nav>
          <div className="mt-8 hidden border-t border-white/10 pt-5 lg:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Readiness</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-mono text-3xl text-white">82</span>
              <span className="mb-1 text-xs text-[#00d1ff]">Good to train</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00d1ff]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00d1ff]" /> Week 01 / session 02
              </div>
              <h2 className="mt-3 text-3xl font-semibold leading-none sm:text-5xl">Reaction threshold</h2>
              <p className="mt-3 text-sm text-white/50">Today&apos;s session is built from your current block, readiness, and the stations in this room.</p>
            </div>
            <div className="border border-white/10 px-4 py-3 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Plan state</div>
              <div className="mt-1 text-sm font-semibold text-[#00d1ff]">Ready to start</div>
            </div>
          </div>

          <div className="grid gap-0 border-b border-white/10 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="pr-0 xl:border-r xl:border-white/10 xl:pr-7">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Today in the room</div>
                <div className="font-mono text-xs text-white/42">30:00</div>
              </div>
              <div className="mt-4 grid gap-px bg-white/10 sm:grid-cols-3">
                <Metric label="Intensity" value="Z3" detail="142-152 BPM" accent />
                <Metric label="Difficulty" value="06" detail="of 10" />
                <Metric label="Focus" value="R+M" detail="reaction + movement" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Warm up', 'Target runs', 'Cognitive switches', 'Cool down'].map((phase, index) => (
                  <span key={phase} className={`border px-3 py-2 text-xs ${index === 1 ? 'border-[#00d1ff] bg-[#00d1ff]/10 text-[#9ceeff]' : 'border-white/10 text-white/48'}`}>
                    <span className="mr-2 font-mono text-[10px] opacity-60">0{index + 1}</span>{phase}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-7 xl:mt-0 xl:pl-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Target zone</div>
              <div className="mt-3 flex items-center gap-5">
                <ZoneDial />
                <div>
                  <div className="font-mono text-2xl font-semibold">142-152</div>
                  <div className="mt-1 text-xs text-white/42">beats per minute</div>
                  <div className="mt-4 border-l-2 border-[#00d1ff] pl-3 text-xs leading-relaxed text-white/62">Keep the workload controlled. The next block scales only if your recovery stays stable.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-7 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Your week</div>
                <button type="button" className="text-xs text-[#00d1ff] hover:text-white">View full plan</button>
              </div>
              <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                {planRows.map((row) => <PlanRow key={row.day} {...row} />)}
              </div>
            </div>
            <StationMap started={started} onStart={onStart} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberSurface() {
  return (
    <div className="grid min-h-[700px] overflow-hidden border border-white/12 bg-[#101214] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col justify-between border-b border-white/10 p-6 sm:p-10 lg:border-b-0 lg:border-r">
        <div>
          <div className="flex items-center gap-3">
            <SpheryMark />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00d1ff]">Member app</span>
          </div>
          <h2 className="mt-8 max-w-md text-4xl font-semibold leading-[1.02] sm:text-6xl">A plan that already knows the room.</h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/54">The app shows the next useful decision. Nexus and the station carry the operational detail when the member arrives.</p>
        </div>
        <div className="mt-14 border-t border-white/10 pt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">System behavior</div>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/62">Plan changes have a reason, stations resolve before the member gets there, and the active session never asks them to interpret a chart.</p>
        </div>
      </div>

      <div className="relative grid place-items-center overflow-hidden bg-[#090a0b] p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative w-full max-w-[390px] border border-white/15 bg-[#15181a] p-4 shadow-[0_36px_100px_rgba(0,0,0,0.58)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-sm font-semibold">My training</span>
            <span className="font-mono text-xs text-white/40">WEEK 01</span>
          </div>
          <div className="border-b border-white/10 py-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#00d1ff]">Next session</div>
            <h3 className="mt-2 text-3xl font-semibold leading-none">Reaction threshold</h3>
            <p className="mt-3 text-sm text-white/52">Monday, 18:30 at The Sphere</p>
            <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-3">
              <SmallMetric label="Time" value="30m" />
              <SmallMetric label="Target" value="Z3" />
              <SmallMetric label="Station" value="01" />
            </div>
          </div>
          <div className="divide-y divide-white/10 border-b border-white/10">
            {planRows.map((row) => (
              <div key={row.day} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 py-4">
                <span className={`text-[10px] font-semibold ${row.active ? 'text-[#00d1ff]' : 'text-white/35'}`}>{row.day}</span>
                <span>
                  <span className="block text-sm font-medium">{row.title}</span>
                  <span className="mt-1 block text-xs text-white/40">{row.duration} / {row.zone}</span>
                </span>
                <span className={`h-2 w-2 rounded-full ${row.active ? 'bg-[#00d1ff]' : 'bg-white/15'}`} />
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 h-13 w-full bg-[#00d1ff] text-sm font-bold text-[#00191f] transition hover:bg-[#78e7ff]">I&apos;m on my way</button>
        </div>
      </div>
    </div>
  );
}

function StationSurface({ started, onStart }: { started: boolean; onStart: () => void }) {
  return (
    <div className="min-h-[700px] overflow-hidden border border-white/12 bg-[#07090a] p-5 sm:p-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <SpheryMark />
          <div>
            <div className="text-sm font-semibold">ExerCube 01</div>
            <div className="mt-1 text-xs text-white/42">Nexus station handoff</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#00d1ff]"><span className="h-2 w-2 rounded-full bg-[#00d1ff]" /> Connected</div>
      </div>

      <div className="grid gap-8 py-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00d1ff]">{started ? 'Configuration sent' : 'Session prepared'}</div>
          <h2 className="mt-4 text-5xl font-semibold leading-[0.95] sm:text-7xl">{started ? 'You are ready to move.' : 'Your station is ready.'}</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/55">{started ? 'The ExerCube has your duration, difficulty and target zone. Step inside when the countdown starts.' : 'Your plan is now resolved to ExerCube 01. The station will load the right training stimulus when you begin.'}</p>
          <div className="mt-8 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4">
            <SmallMetric label="Duration" value="30:00" />
            <SmallMetric label="Target" value="Z3" />
            <SmallMetric label="Difficulty" value="06" />
          </div>
          <button type="button" onClick={onStart} className="mt-8 h-14 w-full max-w-sm bg-[#00d1ff] text-sm font-bold text-[#00191f] transition hover:bg-[#78e7ff]">
            {started ? 'Start countdown' : 'Send session to ExerCube'}
          </button>
        </div>
        <CubeVisual started={started} />
      </div>
    </div>
  );
}

function NavItem({ label, icon, active = false }: { label: string; icon: IconName; active?: boolean }) {
  return <button type="button" className={`flex items-center gap-2 border px-3 py-3 text-left transition ${active ? 'border-[#00d1ff]/40 bg-[#00d1ff]/10 text-white' : 'border-transparent text-white/48 hover:border-white/12 hover:text-white'}`}><Icon name={icon} size={16} /><span>{label}</span></button>;
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="bg-[#121416] p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{label}</div><div className={`mt-3 font-mono text-3xl font-semibold ${accent ? 'text-[#00d1ff]' : 'text-white'}`}>{value}</div><div className="mt-1 text-[11px] text-white/42">{detail}</div></div>;
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div className="px-3 first:pl-0 last:pr-0"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">{label}</div><div className="mt-1.5 font-mono text-lg font-semibold">{value}</div></div>;
}

function ZoneDial() {
  return <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full border border-[#00d1ff] before:absolute before:inset-2 before:rounded-full before:border before:border-[#00d1ff]/35 after:absolute after:-inset-1 after:rounded-full after:border after:border-[#00d1ff]/15"><span className="relative z-10 font-mono text-3xl font-semibold text-[#00d1ff]">Z3</span></div>;
}

function PlanRow({ day, title, station, zone, duration, active }: (typeof planRows)[number]) {
  return <div className={`grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-4 sm:grid-cols-[70px_minmax(0,1fr)_120px_54px] ${active ? 'bg-[#00d1ff]/7' : ''}`}><span className={`font-mono text-xs ${active ? 'text-[#00d1ff]' : 'text-white/35'}`}>{day}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-white/38 sm:hidden">{station}</span></span><span className="hidden text-xs text-white/45 sm:block">{station}</span><span className={`text-right font-mono text-xs ${active ? 'text-[#00d1ff]' : 'text-white/48'}`}>{zone}<span className="hidden sm:inline"> / {duration}</span></span></div>;
}

function StationMap({ started, onStart }: { started: boolean; onStart: () => void }) {
  return <div className="border border-white/10 bg-[#0c0e0f] p-4"><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Station map</div><div className="mt-1 text-sm font-semibold">ExerCube 01</div></div><span className="text-xs text-[#00d1ff]">Available</span></div><div className="mt-4 grid aspect-[16/9] grid-cols-3 gap-1 bg-[#00d1ff]/10 p-1"><div className="relative bg-[#152126]"><Target x="left-3 top-3" /><Target x="bottom-3 right-3" /></div><div className="relative bg-[#1a2c32]"><Target x="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" bright /></div><div className="relative bg-[#152126]"><Target x="right-3 top-5" /><Target x="bottom-4 left-4" /></div></div><button type="button" onClick={onStart} className={`mt-4 h-11 w-full border text-xs font-semibold transition ${started ? 'border-[#00d1ff] bg-[#00d1ff]/10 text-[#9ceeff]' : 'border-white/15 text-white hover:border-[#00d1ff] hover:text-[#00d1ff]'}`}>{started ? 'Configuration sent to station' : 'Send configuration'}</button></div>;
}

function Target({ x, bright = false }: { x: string; bright?: boolean }) {
  return <span className={`absolute h-5 w-5 rounded-full border ${x} ${bright ? 'border-[#00d1ff] bg-[#00d1ff]/30 shadow-[0_0_24px_rgba(0,209,255,0.9)]' : 'border-[#00d1ff]/60'}`} />;
}

function CubeVisual({ started }: { started: boolean }) {
  return <div className="relative min-h-[420px] overflow-hidden border border-white/10 bg-[#0d1214] p-4 sm:p-7"><div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,209,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(0,209,255,0.13)_1px,transparent_1px)] [background-size:32px_32px]" /><div className="relative grid h-full min-h-[360px] grid-cols-[0.75fr_1.1fr_0.75fr] gap-2 border border-[#00d1ff]/40 bg-[#071315] p-2"><CubeWall side="left" /><CubeWall main started={started} /><CubeWall side="right" /></div><div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-white/10 pt-4 text-xs"><span className="text-white/45">{started ? 'COUNTDOWN ARMED' : 'PROFILE LOADED'}</span><span className="font-mono text-[#00d1ff]">H. MULLER / Z3</span></div></div>;
}

function CubeWall({ side, main, started }: { side?: 'left' | 'right'; main?: boolean; started?: boolean }) {
  return <div className={`relative overflow-hidden border border-[#00d1ff]/25 ${main ? 'bg-[#12323a]' : 'bg-[#0f2429]'}`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,209,255,0.18),transparent_42%)]" />{main && <><div className="absolute left-1/2 top-[20%] h-20 w-20 -translate-x-1/2 rounded-full border border-[#00d1ff] bg-[#00d1ff]/15 shadow-[0_0_48px_rgba(0,209,255,0.7)]" /><div className="absolute left-1/2 top-[42%] -translate-x-1/2 text-center"><div className="font-mono text-4xl font-semibold text-[#a5f2ff]">{started ? '03' : 'Z3'}</div><div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00d1ff]">{started ? 'ready' : 'target zone'}</div></div></>}{side && <><Target x={side === 'left' ? 'left-4 top-[27%]' : 'right-4 top-[30%]'} /><Target x={side === 'left' ? 'right-5 bottom-[22%]' : 'left-5 bottom-[20%]'} bright={started} /></>}</div>;
}

function Rule({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <div className="border-t border-white/10 pt-4"><div className="font-mono text-xs text-[#00d1ff]">{number}</div><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mt-2 max-w-sm text-xs leading-relaxed text-white/48">{children}</p></div>;
}
