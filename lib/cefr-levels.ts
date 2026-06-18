// ─── Canonical CEFR micro-level scale (single source of truth) ──────────────────
//
// The one authoritative list of CEFR micro-levels used across the whole app: the
// CEFR pedagogy stage (CefrLevel/CefrQuestion) and the VITAL module (VitalLevel,
// recommendation + stage matrices). Both modules derive their levels from here so
// the two scales can never drift apart again.
//
// Codes are PLAIN ASCII ("A1-", "A1+", "B1.5+") - not superscript or U+2212 minus -
// so a level code means the same string everywhere and joins across modules work.
//
// `active` gates which levels are live. The 25 active levels are shown and seeded
// today. The 12 reserved levels (the A1.5 / A2.5 / C1.5 / C2.5 half-bands) are the
// approved FUTURE scale: they sit here ready to enable, but are NOT shown, seeded,
// or scaffolded with questions/cells until activated. To switch one on: flip its
// `active` flag, then add its content (CEFR questions, VITAL matrix cells) and
// re-seed. `order` is the position in the full 37-level scale, so activating a
// reserved level slots it into place with no renumbering.

export type CefrStatus = 'Standard CEFR' | 'Non-CEFR (school-defined)'

export type CanonicalCefrLevel = {
  code: string
  bandGroup: string
  cefrStatus: CefrStatus
  scoreBand: string
  isPreEmergent: boolean
  active: boolean
}

const STANDARD: CefrStatus = 'Standard CEFR'
const NONCEFR: CefrStatus = 'Non-CEFR (school-defined)'

// Score-band labels for the minus / plain / plus step within a band group.
const UP = 'Up to 33%'
const MID = '34%-66%'
const HI = '67%-100%'

type Seed = Omit<CanonicalCefrLevel, 'isPreEmergent' | 'active'> & {
  isPreEmergent?: boolean
  active?: boolean // defaults to true; reserved future levels set false
}

// The full 37-level scale. Reserved (active:false) levels are the half-bands
// A1.5 / A2.5 / C1.5 / C2.5 - present and ordered, but dormant until enabled.
const SEED: Seed[] = [
  { code: 'A0',     bandGroup: 'A0',   cefrStatus: NONCEFR,  scoreBand: 'Pre-emergent', isPreEmergent: true },
  { code: 'A1-',    bandGroup: 'A',    cefrStatus: STANDARD, scoreBand: UP },
  { code: 'A1',     bandGroup: 'A',    cefrStatus: STANDARD, scoreBand: MID },
  { code: 'A1+',    bandGroup: 'A',    cefrStatus: STANDARD, scoreBand: HI },
  { code: 'A1.5-',  bandGroup: 'A1.5', cefrStatus: NONCEFR,  scoreBand: UP,  active: false },
  { code: 'A1.5',   bandGroup: 'A1.5', cefrStatus: NONCEFR,  scoreBand: MID, active: false },
  { code: 'A1.5+',  bandGroup: 'A1.5', cefrStatus: NONCEFR,  scoreBand: HI,  active: false },
  { code: 'A2-',    bandGroup: 'A',    cefrStatus: STANDARD, scoreBand: UP },
  { code: 'A2',     bandGroup: 'A',    cefrStatus: STANDARD, scoreBand: MID },
  { code: 'A2+',    bandGroup: 'A',    cefrStatus: STANDARD, scoreBand: HI },
  { code: 'A2.5-',  bandGroup: 'A2.5', cefrStatus: NONCEFR,  scoreBand: UP,  active: false },
  { code: 'A2.5',   bandGroup: 'A2.5', cefrStatus: NONCEFR,  scoreBand: MID, active: false },
  { code: 'A2.5+',  bandGroup: 'A2.5', cefrStatus: NONCEFR,  scoreBand: HI,  active: false },
  { code: 'B1-',    bandGroup: 'B1',   cefrStatus: STANDARD, scoreBand: UP },
  { code: 'B1',     bandGroup: 'B1',   cefrStatus: STANDARD, scoreBand: MID },
  { code: 'B1+',    bandGroup: 'B1',   cefrStatus: STANDARD, scoreBand: HI },
  { code: 'B1.5-',  bandGroup: 'B1.5', cefrStatus: NONCEFR,  scoreBand: UP },
  { code: 'B1.5',   bandGroup: 'B1.5', cefrStatus: NONCEFR,  scoreBand: MID },
  { code: 'B1.5+',  bandGroup: 'B1.5', cefrStatus: NONCEFR,  scoreBand: HI },
  { code: 'B2-',    bandGroup: 'B2',   cefrStatus: STANDARD, scoreBand: UP },
  { code: 'B2',     bandGroup: 'B2',   cefrStatus: STANDARD, scoreBand: MID },
  { code: 'B2+',    bandGroup: 'B2',   cefrStatus: STANDARD, scoreBand: HI },
  { code: 'B2.5-',  bandGroup: 'B2.5', cefrStatus: NONCEFR,  scoreBand: UP },
  { code: 'B2.5',   bandGroup: 'B2.5', cefrStatus: NONCEFR,  scoreBand: MID },
  { code: 'B2.5+',  bandGroup: 'B2.5', cefrStatus: NONCEFR,  scoreBand: HI },
  { code: 'C1-',    bandGroup: 'C1',   cefrStatus: STANDARD, scoreBand: UP },
  { code: 'C1',     bandGroup: 'C1',   cefrStatus: STANDARD, scoreBand: MID },
  { code: 'C1+',    bandGroup: 'C1',   cefrStatus: STANDARD, scoreBand: HI },
  { code: 'C1.5-',  bandGroup: 'C1.5', cefrStatus: NONCEFR,  scoreBand: UP,  active: false },
  { code: 'C1.5',   bandGroup: 'C1.5', cefrStatus: NONCEFR,  scoreBand: MID, active: false },
  { code: 'C1.5+',  bandGroup: 'C1.5', cefrStatus: NONCEFR,  scoreBand: HI,  active: false },
  { code: 'C2-',    bandGroup: 'C2',   cefrStatus: STANDARD, scoreBand: UP },
  { code: 'C2',     bandGroup: 'C2',   cefrStatus: STANDARD, scoreBand: MID },
  { code: 'C2+',    bandGroup: 'C2',   cefrStatus: STANDARD, scoreBand: HI },
  { code: 'C2.5-',  bandGroup: 'C2.5', cefrStatus: NONCEFR,  scoreBand: UP,  active: false },
  { code: 'C2.5',   bandGroup: 'C2.5', cefrStatus: NONCEFR,  scoreBand: MID, active: false },
  { code: 'C2.5+',  bandGroup: 'C2.5', cefrStatus: NONCEFR,  scoreBand: HI,  active: false },
]

// Every level (37), ordered by final position in the full scale.
export const ALL_CEFR_LEVELS: (CanonicalCefrLevel & { label: string; order: number })[] =
  SEED.map((l, i) => ({
    ...l,
    isPreEmergent: l.isPreEmergent ?? false,
    active: l.active ?? true,
    label: l.code,
    order: i + 1,
  }))

// The live scale used by both modules today (the 25 active levels).
export const CANONICAL_CEFR_LEVELS = ALL_CEFR_LEVELS.filter((l) => l.active)

// The approved-but-dormant future levels (the .5 half-bands), for reference/tooling.
export const RESERVED_CEFR_LEVELS = ALL_CEFR_LEVELS.filter((l) => !l.active)

export const CANONICAL_CEFR_CODES: string[] = CANONICAL_CEFR_LEVELS.map((l) => l.code)
