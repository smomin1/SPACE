// Seeds the CEFR 22-point human evaluator set (skills, micro-levels, questions)
// from the committed data file. Idempotent: skills match on name, levels on code,
// questions on (level, skill, num) — re-running never wipes existing CefrResponse
// rows (which cascade off CefrQuestion).
import type { PrismaClient } from '@prisma/client'
import { CEFR_SKILLS, CEFR_LEVELS, CEFR_QUESTIONS } from './cefr-data'

export async function seedCefr(prisma: PrismaClient) {
  // Skills
  const skillIdByName = new Map<string, string>()
  for (const s of CEFR_SKILLS) {
    const row = await prisma.cefrSkill.upsert({
      where: { name: s.name },
      update: { group: s.group, order: s.order },
      create: { name: s.name, group: s.group, order: s.order },
    })
    skillIdByName.set(s.name, row.id)
  }

  // Levels
  const levelIdByCode = new Map<string, string>()
  for (const l of CEFR_LEVELS) {
    const row = await prisma.cefrLevel.upsert({
      where: { code: l.code },
      update: { label: l.label, order: l.order },
      create: { code: l.code, label: l.label, order: l.order },
    })
    levelIdByCode.set(l.code, row.id)
  }

  // Questions
  for (const q of CEFR_QUESTIONS) {
    const levelId = levelIdByCode.get(q.levelCode)
    const skillId = skillIdByName.get(q.skillName)
    if (!levelId || !skillId) continue
    await prisma.cefrQuestion.upsert({
      where: { levelId_skillId_num: { levelId, skillId, num: q.num } },
      update: { text: q.text, quickReference: q.quickReference },
      create: { levelId, skillId, num: q.num, text: q.text, quickReference: q.quickReference },
    })
  }

  const [skills, levels, questions] = await Promise.all([
    prisma.cefrSkill.count(),
    prisma.cefrLevel.count(),
    prisma.cefrQuestion.count(),
  ])
  console.log(`Seeded CEFR set: ${skills} skills, ${levels} levels, ${questions} questions.`)
}
