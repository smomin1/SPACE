import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { VitalAnswer, VitalPillar } from '@prisma/client'
import {
  derivePillarLetter,
  deriveFromResponses,
  verdictFromTotal50,
  pillarScore,
} from '@/lib/vital/compute'

// ── Fixtures: the committed 16-tool V2 answer set ──
interface QuestionsFile {
  questions: { key: string; pillar: VitalPillar }[]
  answers: Record<string, Record<string, VitalAnswer>>
}
const data = JSON.parse(
  readFileSync(join(process.cwd(), 'prisma', 'vital-data', 'questions.json'), 'utf8'),
) as QuestionsFile
const pillarByKey = new Map(data.questions.map((q) => [q.key, q.pillar]))

function derive(tool: string) {
  const responses = Object.entries(data.answers[tool]).map(([key, answer]) => ({
    pillar: pillarByKey.get(key)!,
    answer,
  }))
  return deriveFromResponses(responses)
}

// Expected total /50 + verdict straight from the workbook's V2 sheet.
const EXPECTED: Record<string, { total: number; verdict: string }> = {
  Journeys: { total: 9, verdict: 'POOR_FIT' },
  'Jolly Phonics': { total: 12, verdict: 'POOR_FIT' },
  Starfall: { total: 13, verdict: 'POOR_FIT' },
  'ESL Kids Stuff': { total: 12, verdict: 'POOR_FIT' },
  'Raz-Kids': { total: 30, verdict: 'GOOD_FIT' },
  'Learning Upgrade': { total: 36, verdict: 'STRONG_FIT' },
  CommonLit: { total: 31, verdict: 'GOOD_FIT' },
  Off2Class: { total: 37, verdict: 'STRONG_FIT' },
  'Write & Improve': { total: 26, verdict: 'GOOD_FIT' },
  'Khan Academy': { total: 32, verdict: 'GOOD_FIT' },
  Duolingo: { total: 31, verdict: 'GOOD_FIT' },
  PhonicsPlay: { total: 14, verdict: 'POOR_FIT' },
  'ICT Games': { total: 12, verdict: 'POOR_FIT' },
  'BookR / Epic Books': { total: 20, verdict: 'PARTIAL_FIT' },
  Twinkl: { total: 12, verdict: 'POOR_FIT' },
  Elsaspeak: { total: 32, verdict: 'GOOD_FIT' },
}

describe('VITAL question-driven derivation', () => {
  it('reproduces the workbook total /50 + verdict for all 16 tools', () => {
    for (const [tool, exp] of Object.entries(EXPECTED)) {
      const { totals } = derive(tool)
      expect(totals.total, `${tool} total`).toBe(exp.total)
      expect(totals.verdict, `${tool} verdict`).toBe(exp.verdict)
    }
  })

  it('verdict thresholds match the /50 bands', () => {
    expect(verdictFromTotal50(35)).toBe('STRONG_FIT')
    expect(verdictFromTotal50(34)).toBe('GOOD_FIT')
    expect(verdictFromTotal50(25)).toBe('GOOD_FIT')
    expect(verdictFromTotal50(24)).toBe('PARTIAL_FIT')
    expect(verdictFromTotal50(15)).toBe('PARTIAL_FIT')
    expect(verdictFromTotal50(14)).toBe('POOR_FIT')
  })

  it('pillar letter uses >=7 Y / >=5 P / else N', () => {
    expect(derivePillarLetter(7)).toBe('Y')
    expect(derivePillarLetter(6)).toBe('P')
    expect(derivePillarLetter(5)).toBe('P')
    expect(derivePillarLetter(4)).toBe('N')
    expect(derivePillarLetter(0)).toBe('N')
  })

  it('excludes N/A from a pillar score and its max', () => {
    expect(pillarScore(['YES', 'NA', 'NO'])).toEqual({ score: 2, max: 4 })
    expect(pillarScore(['NA', 'NA'])).toEqual({ score: 0, max: 0 })
  })

  it('derives deterministic pillar letters from the /10 score', () => {
    // Off2Class: V5→P, I6→P, T9→Y, A8→Y, L9→Y (from the V2 sheet scores).
    expect(derive('Off2Class').pillarLetters).toMatchObject({
      V: 'P', I: 'P', T: 'Y', A: 'Y', L: 'Y',
    })
    // Twinkl: only T scores (8) → Y; the rest are 0 → N.
    expect(derive('Twinkl').pillarLetters).toMatchObject({
      V: 'N', I: 'N', T: 'Y', A: 'N', L: 'N',
    })
  })
})
