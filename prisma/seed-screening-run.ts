// Standalone runner: seeds ONLY the 50 screening questions — nothing else
// (no users, requirements, or VITAL data). `prisma migrate deploy` creates the
// ScreeningQuestion table but does not run seeds, so run this once in production
// after deploying:
//
//   npm run seed:screening
//
// Idempotent: matches on `num` and updates in place, so re-running never wipes
// existing ScreeningResponse rows.
import * as fs from 'node:fs'
import * as path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedScreening } from './seed-screening'

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
    await seedScreening(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
