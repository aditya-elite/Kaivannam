# UI Lab — working notes

Local only. `/ui-lab` is in `.gitignore`, so nothing here is pushed. This is scratch
space for deciding what to build, not code to copy wholesale.

Open `index.html` in a browser. Every demo is live and standalone — no build, no
dependencies, same constraint the product itself works under.

---

## STATUS — all 20 recommendations shipped

Every proposal marked *ship it* or *worth trying* is now in `src/`. Typecheck clean,
`next build` green, all 11 routes 200 across en/hi/ta.

| Study | Shipped |
|---|---|
| 01 Surface | khadi grain, ink bleed, deckle, dye-lot, letterpress, selvedge — 6/6 |
| 02 Type | tabular IDs, stat figures, scale gap, per-script sizing, versal, hanging punctuation — 6/6 |
| 03 Motion | thread-snap, scroll-linked kolam, spatial stagger, photo develop — 4/4 |
| 04 Components | hairline fields, wax-seal tier, artisan card, printed tag — 4/4 |

**The three refusals were NOT implemented, deliberately** — pointer-tilt, count-up
stats, photo parallax. They are documented below as decisions, not as a backlog. Building
them would contradict the reasoning this lab exists to record.

Two things changed from the lab spec once they met real code, both noted in
the source:

- **Dye-lot range is asymmetric**, not the ±3% the demo used. Lightness only ever moves
  *down* from the certified base. `hsl(18 87% 44%)` measures 4.47:1 on white and fails AA;
  the original note in this file had the direction backwards. See `src/lib/dyelot.ts`.
- **Versal and hanging punctuation are never on the same paragraph.** `::first-letter`
  already absorbs the opening quote into the drop cap, so a negative `text-indent` pulls
  the floated capital off the margin instead of the punctuation. Versal went on the story
  card, hanging punctuation on the artisan bio.

---

## The argument in one paragraph

The motion and geometry spec is built and the vocabulary is right. What is missing is
**material**. Every surface in the app is perfectly flat, every repeated element is
byte-identical to its neighbour, and the type is set as though there were only one
writing system. Those three things are what make a hand-made thing look hand-made, and
all three are cheap. Nothing in this lab proposes new motion for its own sake.

---

## Priority order

Grouped by how I would actually schedule them, not by category.

### Pass one — one afternoon, touches every screen

| Item | Where | Effort |
|---|---|---|
| Tabular + tracked product IDs | `globals.css`, lookup field, tag, verify details | 15 min |
| Khadi paper grain | `globals.css` `body::before` | 30 min |
| Hairline form fields | `components/form/fields.tsx` | 45 min |
| Selvedge strip | footer / Tier A section breaks | 20 min |
| Per-script sizing | `globals.css`, keyed off `html[lang]` | 30 min |

Everything above is CSS. None of it can break a state machine, and none of it needs a
new component.

### Pass two — a day, higher judgement

- Wax-seal tier badge — replaces `TierBadge`, reuses the `Seal.tsx` path
- Printed tag furniture — cut marks, fold, signature rule, in `@media print`
- Artisan card assembly — shear + `rule-hand` + edition number, no new CSS
- Spatial stagger — one line in the `Reveal` observer callback
- Scroll-linked kolam — additive `@supports` block, existing IO version untouched

### Pass three — only with a device in hand

- Dye-lot colour variance
- Letterpress display type
- Ink bleed on Tier A plates
- Deckled edge on the story card

These four are all judgement calls about how something reads on a cheap screen in
daylight. Building them is easy; deciding whether they help is not.

---

## Decided against, with reasons

Keeping these written down so the same conversation doesn't recur.

**Pointer-tracking card tilt.** Does nothing on a touchscreen, which is the target
device. Needs a `mousemove` handler per card and permanent `will-change`. Highest cost,
lowest reach.

**Counting-up stat numbers.** The stats sit in `<dd>` elements. Animating the text means
a screen reader can be interrupted mid-announcement with a different value. Fixing that
properly costs more machinery than the effect is worth.

**Parallax on artisan photographs.** Continuous large-area repaint while scrolling — the
most reliable way to drop frames on a Snapdragon 4. The thin edge ornament already exists
as the cheap outlet for this impulse.

**Paper-curl corner shadows.** Requires an animated blurred `box-shadow`, which §0 of the
motion spec forbids outright, and reads as 2011 skeuomorphism rather than craft.

**A display serif for headings.** Would need matched Devanagari and Tamil serifs. The
pairing will be wrong in at least one script, and the one it is wrong in will be a script
I cannot evaluate.

---

## Open questions I could not settle alone

1. **Hairline fields vs. discoverability.** A boxed input advertises "type here" more
   loudly than a ruled one. For users with low digital literacy that may matter more than
   the editorial look. Needs a real user, not an opinion.

2. **Dye-lot range.** ±4° hue and ±3% lightness looks handmade on my screen. On a cheap
   LCD in sunlight it may just look like a rendering bug. Also drifting lightness drifts
   contrast — the darkest lot must still clear 4.5:1 with white text.

3. **`::first-letter` on Devanagari and Tamil.** It can split a conjunct or orphan a vowel
   mark. Gated to English in the demo. Someone who reads each script needs to look before
   it is enabled more widely.

4. **Letterpress and screen gamma.** The effect depends on two 1px shadows that may
   vanish or muddy depending on the panel. Verify before rolling out.

---

## Guardrails that still apply

Everything in this lab inherits the existing constraints — they are not renegotiated here:

- `transform` and `opacity` only for animation; `clip-path` and `stroke-dashoffset` where
  specified. The static `filter: blur()` in the ink-bleed demo is acceptable *only*
  because it never animates.
- 16px body minimum, in every script. Per-script tuning may scale up, never down.
- Every animation needs a designed reduced-motion variant. Geometry survives; motion does not.
- 4× CPU throttle plus Slow 3G is the test that decides. Below 50fps there means it does
  not ship, however good it looks on a laptop.

---

## Honest note on this document

The demos are real and the trade-offs are the ones I would actually argue for, but the
priority ranking is a judgement call made without seeing the app on a target device or
watching anyone use it. Treat the ordering as a starting proposal to disagree with —
particularly pass three, where I have flagged low confidence deliberately rather than
presenting four ideas as though they were equally settled.
