// Standalone runner: seeds ONLY the VITAL module (skills, levels, tools, questions,
// recommendations, stages, grade bands). `prisma migrate deploy` creates the tables
// but does not run seeds, so run this once after deploying:
//
//   npm run seed:vital
//
// Idempotent: upserts on natural keys, so re-running never wipes existing data.
import * as fs from 'node:fs'
import * as path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedVital } from './seed-vital'

// Load .env.local then .env (first match wins) so DATABASE_URL is available when
// run outside the Next.js runtime - mirrors prisma.config.ts.
for (const file of ['.env.local', '.env']) {
  const filePath = path.resolve(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) process.env[key] = val
      }
    }
    break
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (checked environment, .env.local, .env)')
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  })
  try {
    await seedVital(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
