// Standalone runner: seeds ONLY the CEFR 22-point set (skills, levels, questions).
// `prisma migrate deploy` creates the tables but does not run seeds, so run this
// once in production after deploying:
//
//   npm run seed:cefr
//
// Idempotent: upserts in place, so re-running never wipes existing CefrResponse rows.
import * as fs from 'node:fs'
import * as path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedCefr } from './seed-cefr'

// Load .env.local then .env (first match wins) so DATABASE_URL is available when
// run outside the Next.js runtime — mirrors prisma.config.ts.
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
    await seedCefr(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
