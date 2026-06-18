// Diagnostic: runs the real scan logic directly (bypassing Next.js, HAProxy, and
// SSE) to isolate whether a stuck scan is an app/proxy problem or an environment
// (network) problem. Run on the VM:  npx tsx prisma/scan-diagnose.ts
// Safe to delete. Does NOT write to the database.
import * as fs from 'node:fs'
import * as path from 'node:path'

for (const file of ['.env.local', '.env']) {
  const fp = path.resolve(process.cwd(), file)
  if (fs.existsSync(fp)) {
    for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    break
  }
}

async function main() {
  console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)
  const { runToolScanEvaluation } = await import('../lib/claude-tool-scanner')
  const { SCREENING_QUESTIONS } = await import('./screening-data')

  // A small representative slice keeps it fast while exercising the same call path.
  const questions = SCREENING_QUESTIONS.filter((q) => ['Cost', 'Tool identity'].includes(q.category)).map(
    (q) => ({ id: `q${q.num}`, num: q.num, category: q.category, question: q.question, whatToLookFor: q.whatToLookFor }),
  )

  const t0 = Date.now()
  const ts = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`
  console.log(`[${ts()}] calling Anthropic (${questions.length} questions)…`)

  try {
    for await (const chunk of runToolScanEvaluation('Duolingo', 'https://www.duolingo.com', questions)) {
      if (chunk.type === 'metadata') console.log(`[${ts()}] metadata:`, JSON.stringify(chunk.metadata))
      else if (chunk.type === 'category') console.log(`[${ts()}] category "${chunk.category}": ${chunk.results.length} answers`)
    }
    console.log(`[${ts()}] DONE — the call path works on this machine.`)
  } catch (err) {
    console.error(`[${ts()}] FAILED:`, err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
