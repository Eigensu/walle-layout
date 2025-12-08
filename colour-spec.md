1. Core Blues (Base Theme)

Use these for page background, nav, and cards.

Token Hex Use
--bg-body #050816 Main page background (very dark blue)
--bg-elevated #090F2A Header / side nav
--bg-card #111735 Cards & widgets
--bg-card-soft #171E40 Hover state / secondary cards
--bg-chip #222959 Pills, small stat chips

⸻

2. Brand Accents

Pink (around #CA3985)

Token Hex Use
--accent-pink #CA3985 Primary CTA, key stats
--accent-pink-soft #E462A1 Button hover / subtle gradients
--accent-pink-deep #8A1F57 Borders, shadows, active states
--accent-pink-faint #F6C0DA Badges, subtle highlights on dark bg

Orange (around #D26C32)

Token Hex Use
--accent-orange #D26C32 Secondary CTA, important numbers
--accent-orange-soft #F59B4C Button hover / subtle gradients
--accent-orange-deep #8E3E19 Borders / shadows
--accent-orange-faint #FFD1A1 Tags, light fills on dark bg

⸻

3. Text & Neutrals

Token Hex Use
--text-main #FFFFFF Primary text on dark
--text-muted #C4CAE8 Secondary labels
--text-subtle #8A8FB5 Hints, helper text
--border-subtle #252B4A Card & table borders
--border-strong #3B4270 Dividers, strong outlines

Optional status colors that still match the palette:

Token Hex
--success #23D18B
--warning #FACC15
--danger #FF4B6E

⸻

4. Gradients (for that FPL-style look)

a) navbar (top strip)

Dark blue sweep, no accent yet:

--gradient-hero: linear-gradient(
120deg,
#050816 0%,
#101A3E 35%,
#1A2558 70%,
#22346F 100%
);
Use this for big buttons, hero overlay, or key stat panels.

c) Card Background (subtle depth)

--gradient-card: linear-gradient(
145deg,
#151A3A 0%,
#101634 45%,
#171F43 100%
);

d) Button Gradients

Primary CTA:

--gradient-button-primary: linear-gradient(
135deg,
#CA3985 0%,
#F59B4C 100%
);

Secondary CTA (more blue, hint of pink):

--gradient-button-secondary: linear-gradient(
135deg,
#101A3E 0%,
#22346F 55%,
#CA3985 100%
);

⸻

5. Example CSS Variables Block

:root {
/_ Base blues _/
--bg-body: #050816;
--bg-elevated: #090f2a;
--bg-card: #111735;
--bg-card-soft: #171e40;
--bg-chip: #222959;

/_ Accents _/
--accent-pink: #ca3985;
--accent-pink-soft: #e462a1;
--accent-pink-deep: #8a1f57;
--accent-pink-faint: #f6c0da;

--accent-orange: #d26c32;
--accent-orange-soft: #f59b4c;
--accent-orange-deep: #8e3e19;
--accent-orange-faint: #ffd1a1;

/_ Text & borders _/
--text-main: #ffffff;
--text-muted: #c4cae8;
--text-subtle: #8a8fb5;
--border-subtle: #252b4a;
--border-strong: #3b4270;

/_ Status _/
--success: #23d18b;
--warning: #facc15;
--danger: #ff4b6e;

/_ Gradients _/
--gradient-hero: linear-gradient(120deg, #050816 0%, #101a3e 35%, #1a2558 70%, #22346f 100%);
--gradient-brand: linear-gradient(135deg, #ca3985 0%, #d26c32 100%);
--gradient-card: linear-gradient(145deg, #151a3a 0%, #101634 45%, #171f43 100%);
--gradient-button-primary: linear-gradient(135deg, #ca3985 0%, #f59b4c 100%);
--gradient-button-secondary: linear-gradient(135deg, #101a3e 0%, #22346f 55%, #ca3985 100%);
}
