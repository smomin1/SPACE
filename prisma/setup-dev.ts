/**
 * Dev setup script — seeds users, requirements, and one test evaluation.
 * Run with: DATABASE_URL=... npx tsx prisma/setup-dev.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── Users ────────────────────────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@eval.com' },
      update: {},
      create: { email: 'admin@eval.com', name: 'Admin', role: 'ADMIN', passwordHash: await hash('Admin1234!', 12) },
    }),
    prisma.user.upsert({
      where: { email: 'ped1@eval.com' },
      update: {},
      create: { email: 'ped1@eval.com', name: 'Alice (Pedagogy)', role: 'PEDAGOGY_EVALUATOR', passwordHash: await hash('Evaluator1234!', 12) },
    }),
    prisma.user.upsert({
      where: { email: 'ped2@eval.com' },
      update: {},
      create: { email: 'ped2@eval.com', name: 'Bob (Pedagogy)', role: 'PEDAGOGY_EVALUATOR', passwordHash: await hash('Evaluator1234!', 12) },
    }),
    prisma.user.upsert({
      where: { email: 'tech1@eval.com' },
      update: {},
      create: { email: 'tech1@eval.com', name: 'Charlie (Technical)', role: 'TECHNICAL_EVALUATOR', passwordHash: await hash('Evaluator1234!', 12) },
    }),
    prisma.user.upsert({
      where: { email: 'tech2@eval.com' },
      update: {},
      create: { email: 'tech2@eval.com', name: 'Dana (Technical)', role: 'TECHNICAL_EVALUATOR', passwordHash: await hash('Evaluator1234!', 12) },
    }),
    prisma.user.upsert({
      where: { email: 'viewer@eval.com' },
      update: {},
      create: { email: 'viewer@eval.com', name: 'Viewer', role: 'VIEWER', passwordHash: await hash('Viewer1234!', 12) },
    }),
  ])
  console.log(`✓ ${users.length} users`)

  // ── Requirements ─────────────────────────────────────────────────────────────
  await prisma.scoreAuditLog.deleteMany()
  await prisma.score.deleteMany()
  await prisma.requirementContext.deleteMany()
  await prisma.requirement.deleteMany()
  await prisma.requirement.createMany({
    data: [
      { title: 'Data Protection Compliance', description: 'Platform must demonstrate GDPR/UK GDPR compliance.', evaluatorType: 'PEDAGOGY', weight: 'HIGH', isComplianceGate: true, category: 'Compliance', order: 1 },
      { title: 'Curriculum Alignment', description: 'Content maps clearly to national curriculum objectives.', evaluatorType: 'PEDAGOGY', weight: 'HIGH', isComplianceGate: false, category: 'Pedagogy', order: 2 },
      { title: 'Differentiation Support', description: 'Platform supports differentiated learning paths.', evaluatorType: 'PEDAGOGY', weight: 'MEDIUM', isComplianceGate: false, category: 'Pedagogy', order: 3 },
      { title: 'Assessment & Feedback', description: 'Built-in formative assessment tools with actionable feedback.', evaluatorType: 'PEDAGOGY', weight: 'HIGH', isComplianceGate: false, category: 'Pedagogy', order: 4 },
      { title: 'LTI Integration', description: 'Supports LTI 1.3 for VLE integration.', evaluatorType: 'TECHNICAL', weight: 'HIGH', isComplianceGate: false, category: 'Interoperability', order: 1 },
      { title: 'Data Export Standards', description: 'Exports learner data in open formats (CSV, xAPI).', evaluatorType: 'TECHNICAL', weight: 'MEDIUM', isComplianceGate: false, category: 'Interoperability', order: 2 },
      { title: 'API Availability', description: 'REST or GraphQL API for institutional integration.', evaluatorType: 'TECHNICAL', weight: 'MEDIUM', isComplianceGate: false, category: 'Interoperability', order: 3 },
      { title: 'Uptime SLA', description: 'Vendor guarantees ≥99.5% uptime with documented incident response.', evaluatorType: 'TECHNICAL', weight: 'HIGH', isComplianceGate: false, category: 'Reliability', order: 4 },
    ],
  })
  console.log('✓ 8 requirements')

  // ── Platform + Evaluation ────────────────────────────────────────────────────
  const platform = await prisma.platform.upsert({
    where: { id: 'plat-demo' },
    update: {},
    create: { id: 'plat-demo', name: 'EduLearn Pro', vendor: 'EduLearn Ltd', status: 'ACTIVE' },
  })

  // Clear any existing evaluation for idempotency
  await prisma.score.deleteMany({ where: { evaluation: { platformId: 'plat-demo' } } })
  await prisma.evaluatorAssignment.deleteMany({ where: { evaluation: { platformId: 'plat-demo' } } })
  await prisma.conflictThread.deleteMany({ where: { evaluation: { platformId: 'plat-demo' } } })
  await prisma.evaluation.deleteMany({ where: { platformId: 'plat-demo' } })

  const evaluation = await prisma.evaluation.create({
    data: {
      platformId: platform.id,
      state: 'IN_PROGRESS',
      assignments: {
        create: [
          { userId: users[1].id, evaluatorType: 'PEDAGOGY',  isLead: true  },   // Alice — Pedagogy Lead
          { userId: users[2].id, evaluatorType: 'PEDAGOGY',  isLead: false },   // Bob
          { userId: users[3].id, evaluatorType: 'TECHNICAL', isLead: true  },   // Charlie — Technical Lead
          { userId: users[4].id, evaluatorType: 'TECHNICAL', isLead: false },   // Dana
        ],
      },
    },
  })
  console.log(`✓ Evaluation created: ${evaluation.id}`)
  console.log()
  console.log('── Accounts ──────────────────────────────────────────────────')
  console.log('  admin@eval.com        / Admin1234!         (Admin)')
  console.log('  ped1@eval.com         / Evaluator1234!     (Alice — Pedagogy)')
  console.log('  ped2@eval.com         / Evaluator1234!     (Bob — Pedagogy)')
  console.log('  tech1@eval.com        / Evaluator1234!     (Charlie — Technical)')
  console.log('  tech2@eval.com        / Evaluator1234!     (Dana — Technical)')
  console.log('  viewer@eval.com       / Viewer1234!        (Viewer)')
  console.log()
  console.log('── Workspace URL ─────────────────────────────────────────────')
  console.log(`  http://localhost:3000/evaluate/${evaluation.id}`)
  console.log()
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
