# Demo walkthrough — Adaptive Training

For Stephan. Everything you need to run the demo in front of a client.

**Link:** https://sphere-adaptive-training.vercel.app
**Use Marco.** His plan visibly changes when you rate a session, which is the moment worth showing.

**What this is for.** It is built for you to walk a client through, not for
someone to go away and test on their own yet. There is no real login and nothing
saves between visits, so a tester would lose their plan the moment they
refreshed. Making it something people can use on their own is the next piece of
work: saving plans, and real sign-in.

## Before you start

- **Open the app once before you need it.** Measured: the first request after a
  quiet spell takes about 1.6 seconds, and everything after that is a quarter of
  a second. So it is a beat, not a wait — but open it in the lift rather than in
  front of the client.
- **Don't refresh once you're going.** Nothing is saved yet, so a refresh sends
  you back to the start. If it happens, you are about ninety seconds from being
  back where you were.
- **Use the link above, not one Vercel shows you elsewhere.** Other versions of
  the address ask for a login.

## The walkthrough

**1. Sign in.** Tap *Continue with NEXUS*, then pick **Marco**.

> "He signs in with the same NEXUS account he uses at the kiosk, and his
> training history comes with him."

**2. Answer the questions.** Goal, focus, a little about him, any injuries, then
a review screen. Take them at a normal pace; each one takes a tap.

> "This is the only thing we ask him for. Everything else we already know from
> how he has trained."

**3. The plan appears.** Eight weeks, three sessions a week.

> "That took a couple of seconds because it is being worked out now, for him.
> It is not a template with his name on it."

**4. On the main screen, point at the badge under his name.** It says
**Live engine · 257 sessions**.

> "That is the real number of sessions he has done on the ExerCube. The plan you
> are looking at was built from them. When that badge is missing, you are
> looking at sample data — so you always know which one you have."

**5. Show the chart.** Tap between Sessions, Daily, Weekly, Monthly.

> "His actual training history. Scores, how much he has done. Gaps are weeks he
> didn't train, and we leave them as gaps rather than pretending."

It reads *"Up to your last session, 9 Apr 2025"*, because that is genuinely when
Marco last used an ExerCube. If anyone asks: "the chart ends at his last real
session rather than at today — we would rather show the gap than invent one."
Some of his heart-rate lines are empty for the same reason: he trained without a
strap, and we show nothing rather than a zero.

**6. Open today's session.** Tap the play button on the Up Next card. You get a
preview first: the stations in order, how long at each, and the heart-rate zone
he should be in.

> "The plan doesn't say 'ExerCube'. It says what kind of work and how hard.
> Whatever equipment the gym has, the plan lands on it."

**7. Run it.** Tap *Start session* on that preview, then *Complete station*
through all seven, then *Finish session* and *Log session · update my plan*.
Rate it **Too easy**.

The heart rate moving on this screen is simulated, not measured — there is no
strap in the room. If anyone asks, say so plainly: "the heart rate here is
stand-in data for the demo; in the gym it comes off the belt like it does on
the kiosk."

**8. This is the important screen.** The plan changes and tells him why.

> "He said it was too easy, so the sessions ahead just got harder — and it says
> so in plain language. Every change explains itself. That is what 'adaptive'
> means here: the plan answers back."

**9. Close with the Cards tab** if there is time.

> "Every exercise in the gym is a card he collects by training it. Early days,
> but it is how we keep him coming back."

## If someone asks

**"Is this live?"** — Yes. It is running on Marco's real training history from
the ExerCube, and the plan is being generated while you watch. What is not live
yet: signing in is picked from a list rather than a password, and nothing is
saved between visits. Both are the next pieces of work, not open questions.

**"Can I have it on my phone?"** — Yes, open the link. It is built for a phone.

**"Is my data safe?"** — What is on the server is two members' training numbers,
scores and heart-rate estimates, with no names, no birthdays, nothing that
identifies anyone. Those two were approved for this demo, and the full member
database never leaves Sphery. Anything beyond this demo waits on the data
agreement.

(That approval is yours, 18 September: "that is fine with the data of the two
members." Nothing else about a member is anywhere near this.)

**"When can members use it?"** — Weeks, not months, and the honest answer is that
it depends on where the database lives and on the data agreement. Point that at
Anthony.

## If something goes wrong

- **Screen looks stuck on the first visit** - give it two seconds, it is waking up.
- **Badge missing, or the chart says "Sample"** — the app is running on sample
  data. Say so, carry on with the demo, tell Anthony afterwards.
- **You end up back at the sign-in screen** — something refreshed. Sign in as
  Marco again; ninety seconds and you're back.
