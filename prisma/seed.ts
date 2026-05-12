import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@edplatform.local' },
    update: {},
    create: {
      email: 'admin@edplatform.local',
      name: 'Admin User',
      hashedPassword,
      role: 'ADMIN',
    },
  })

  const pedagogy = await prisma.user.upsert({
    where: { email: 'pedagogy@edplatform.local' },
    update: {},
    create: {
      email: 'pedagogy@edplatform.local',
      name: 'Pedagogy Evaluator',
      hashedPassword: await bcrypt.hash('evaluator123', 12),
      role: 'PEDAGOGY_EVALUATOR',
    },
  })

  const technical = await prisma.user.upsert({
    where: { email: 'technical@edplatform.local' },
    update: {},
    create: {
      email: 'technical@edplatform.local',
      name: 'Technical Evaluator',
      hashedPassword: await bcrypt.hash('evaluator123', 12),
      role: 'TECHNICAL_EVALUATOR',
    },
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@edplatform.local' },
    update: {},
    create: {
      email: 'viewer@edplatform.local',
      name: 'Viewer User',
      hashedPassword: await bcrypt.hash('viewer123', 12),
      role: 'VIEWER',
    },
  })

  console.log('Seeded users:')
  console.log(`  ADMIN               ${admin.email}  /  admin123`)
  console.log(`  PEDAGOGY_EVALUATOR  ${pedagogy.email}  /  evaluator123`)
  console.log(`  TECHNICAL_EVALUATOR ${technical.email}  /  evaluator123`)
  console.log(`  VIEWER              ${viewer.email}  /  viewer123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
