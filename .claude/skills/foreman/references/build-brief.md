# The build brief (Phase 3)

The brief is the actual artifact of this phase. You write it, they correct it, then it freezes. Aim for 600 to 1000 words.

## Two rules that outrank the template

**1. Include context the coding agent cannot derive, exclude instructions it can.**

Give it who the owner is, what the site must accomplish, the locked tokens, what is off limits, and how success will be judged. Leave component structure, package choices, and file organization to it. Over-prescribing implementation makes output worse, not better, and it wastes the one thing the coding agent is genuinely better at than both of you.

**2. Acceptance criteria beat adjectives.**

"Clean and modern" is unfalsifiable and will be interpreted as the current default look. "Lighthouse mobile 95+, no layout shift when the hero loads, readable at 375px, tab order matches visual order" is a test the coding agent can run against its own output.

## Template

```
PROJECT
Site for: [name]. Audience: [who]. Register: [one word].
The one action a visitor should take: [action].

STACK
[framework], static build, deployed to [host] from [git repo].

CONTENT
[Final copy for every section. Written by the owner, not generated.]

DESIGN TOKENS (locked, do not substitute)
Background [hex] / Surface [hex] / Text [hex] / Muted [hex] / Accent [hex]
Display font: [name]. Body font: [name]. Type scale: [3 sizes].
Signature element: [the one thing this page is remembered by].

QUALITY FLOOR
Responsive to 375px. Visible keyboard focus, tab order matches visual order.
Contrast passes WCAG AA. prefers-reduced-motion respected.
Lighthouse mobile 95+. Hero media under 1.5 MB with a poster fallback.
Custom 404 reusing the site layout, with a way back.

NON-GOALS
No [contact form / analytics / carousel / animation / blog] in v1.

HOW TO WORK WITH ME
One concern per turn. Commit after each working step with a descriptive message.
Do not refactor anything I did not ask you to touch.
Do not offer to do steps that require my accounts or credentials.
Ask before assuming anything about my background or my content.
```

## Before you freeze it

Read the brief back against the register word from Phase 1. If a stranger read only this brief, would they produce something recognizably theirs, or the generic version of this category? If it is the generic version, the missing piece is almost always in the content or the signature element, not in the instructions.
