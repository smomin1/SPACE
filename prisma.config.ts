import { defineConfig } from 'prisma/config'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local first (takes precedence), then .env, so DATABASE_URL is
// available when this config runs outside of the Next.js runtime.
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

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
})
