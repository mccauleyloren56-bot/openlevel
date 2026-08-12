# Worked example

A compressed run, Phase 0 to frozen brief, so you can see the shape and the standard. Do not reuse this content. Reuse the moves.

## Phase 0

**You:** What are you building, and what do you already have for it?

**Them:** A portfolio site. I have my CV and some screenshots from a robotics project.

Logged: no written copy, no logo, no domain, one project with visuals, one CV to mine.

## Phase 1

**You:** Who is the one reader you actually care about, and what should they do after ninety seconds?

**Them:** Research group leads. I want them to email me about a PhD position.

**You:** Then the site has one job and one action. What have you actually built that a group lead would care about?

**Them:** A sim-to-real transfer pipeline for a quadruped. It cut retraining time.

**You:** By how much, and what was the hard part?

**Them:** About 60 percent. The hard part was domain randomization limits, we kept overfitting to the sim.

That exchange is the whole phase. A number and a real constraint replaced "passionate about robotics".

Non-goals agreed: no blog, no contact form (email link only), no analytics, no scroll animation beyond the one signature element.

## Phase 2

Built `brand.html` with three variants using their real bio text. They picked the second: technical, high contrast, one accent.

Locked: `#0B0D10` background, `#151A20` surface, `#EDF1F5` text, `#8B95A1` muted, `#5B8DEF` accent. Display face for headings only, system stack for body, three sizes.

Signature element: the quadruped gait plotted as a live SVG in the hero, drawn from real logged data, animating once on load and respecting reduced motion.

That single element carries the personality. Everything else stays quiet.

## Phase 3

Brief written and frozen. Copy final, tokens verbatim, budget set, non-goals explicit, acceptance criteria testable.

**Handoff line to them:** paste this into your coding agent, let it build, come back with what breaks.

## What went wrong later, and how it got handled

The coding agent shipped an 8 MB hero. Lighthouse mobile came back at 51. The fix was not a new prompt, it was one constraint the brief had left out: hero media under 1.5 MB with a poster fallback. That constraint now lives in `references/performance-and-access.md` and goes into every brief.
