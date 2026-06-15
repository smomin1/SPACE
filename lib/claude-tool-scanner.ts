import Anthropic from '@anthropic-ai/sdk'
import type { ScreeningAnswer } from '@prisma/client'

// maxRetries: 0 — a slow scan must NOT be silently retried (each retry is another
// paid web-search call). timeout caps a single call so a hung request fails fast
// instead of running for many minutes and burning credits.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0,
  timeout: 180_000, // 3 minutes
})

const MODEL = 'claude-sonnet-4-6'

// Anthropic server-side web search: the model actually browses live sources and
// the API runs the search loop internally, returning the final answer in one call.
// max_uses caps searches per request — one comprehensive pass covers all 50
// questions, so this is also the per-scan search ceiling (≈$0.01/search).
const WEB_SEARCH_TOOL: Anthropic.Messages.MessageCreateParams['tools'] = [
  { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
]

// ─── Metadata taxonomy (unchanged from the original classification step) ────────
const ALLOWED_GRADES = [
  'K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'High School', 'Adult',
]
const ALLOWED_FLUENCY = [
  'Pre-beginner(No Background)', 'Beginner', 'Intermediate', 'Advanced/Fluent',
]
const ALLOWED_AUDIENCES = ['Students', 'Teachers', 'Parents', 'Corporate', 'General Learners']

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScreeningQuestionInput {
  id: string
  num: number
  category: string
  question: string
  whatToLookFor: string | null
}

export interface ToolScannerMetadata {
  Target_Audience: string
  Fluency_Levels: string[]
  Grade_Levels: string[]
}

export interface ScreeningResult {
  questionId: string
  answer: ScreeningAnswer
  evidence: string | null
  flag: string | null
  notes: string | null
}

export type ToolScannerChunk =
  | { type: 'metadata'; metadata: ToolScannerMetadata }
  | { type: 'category'; category: string; results: ScreeningResult[] }
  | { type: 'error'; message: string }

// ─── Response parsing helpers ───────────────────────────────────────────────────

/** All text blocks from a (possibly tool-interleaved) response. */
function textBlocks(content: Anthropic.Messages.ContentBlock[]): string[] {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
}

/** Parse the first JSON object in a string, tolerating ``` fences and prose. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    // Fall back to the outermost {...} span (model may wrap JSON in prose).
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Extract the JSON object from a web-search response. With server-side web
 * search the model can emit several text blocks (interim notes then the JSON),
 * so try the last block first, then each earlier block, then the concatenation.
 */
function extractJson(content: Anthropic.Messages.ContentBlock[]): Record<string, unknown> | null {
  const blocks = textBlocks(content)
  for (let i = blocks.length - 1; i >= 0; i--) {
    const parsed = parseJsonObject(blocks[i])
    if (parsed) return parsed
  }
  return parseJsonObject(blocks.join('\n'))
}

const VALID_ANSWERS: ReadonlySet<string> = new Set(['YES', 'PARTIAL', 'NO', 'UNKNOWN'])

function normAnswer(raw: unknown): ScreeningAnswer {
  const s = String(raw ?? '').trim().toUpperCase()
  return (VALID_ANSWERS.has(s) ? s : 'UNKNOWN') as ScreeningAnswer
}

function cleanField(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'n/a') return null
  return s.slice(0, 2000)
}

// ─── Main generator ──────────────────────────────────────────────────────────────

export async function* runToolScanEvaluation(
  platformName: string,
  url: string,
  questions: ScreeningQuestionInput[],
): AsyncGenerator<ToolScannerChunk> {
  const byCategory = new Map<string, ScreeningQuestionInput[]>()
  for (const q of questions) {
    if (!byCategory.has(q.category)) byCategory.set(q.category, [])
    byCategory.get(q.category)!.push(q)
  }

  // ── Single consolidated call: classify + answer all questions in one pass ─────
  // One investigation covers the whole platform, so the site is searched and read
  // once (not re-searched per category). This is the dominant cost lever: it caps
  // web-search volume and avoids pulling the same page content into context N times.
  const questionBlock = [...byCategory.entries()]
    .map(
      ([category, qs]) =>
        `## ${category}\n` +
        qs.map((q) => `${q.id} | ${q.question} | look for: ${q.whatToLookFor ?? '-'}`).join('\n'),
    )
    .join('\n\n')

  const prompt = `OBJECTIVE
Screen the platform "${platformName}" (${url}) for an EdTech procurement shortlist. In ONE investigation, (a) classify the platform and (b) answer all ${questions.length} screening questions below from EVIDENCE you find via web search, not assumptions.

INVESTIGATION PROTOCOL (use the web_search tool)
1. Investigate the official site (${url}): home, features, pricing, privacy/security, accessibility, help/docs.
2. Search beyond it: "${platformName} review", "${platformName} pricing", "${platformName} privacy policy GDPR", "${platformName} LTI / Moodle integration", app-store listings, independent reviews.
3. Triangulate: prefer official docs and recent third-party evidence over marketing slogans; on conflict trust the most specific/recent source. Investigate broadly enough to cover every category below, then answer all questions from what you found.

CLASSIFY (metadata) using ONLY these allowed values, selecting ALL that apply across the platform's modules:
- Audiences: ${ALLOWED_AUDIENCES.join(', ')}
- Fluency Levels: ${ALLOWED_FLUENCY.join(', ')}
- Grades: ${ALLOWED_GRADES.join(', ')}

ANSWER EACH QUESTION (exactly one of):
- YES     clear documented evidence the criterion is met (cite source).
- PARTIAL present but limited, ambiguous, "coming soon", or only indirectly evidenced.
- NO      you found positive evidence it is absent or explicitly unsupported.
- UNKNOWN public sources don't reveal enough to decide. Prefer this over guessing. (UNKNOWN is not NO.)
For each: evidence (the single best URL you actually retrieved, or "" if UNKNOWN), flag (short risk/safeguarding concern or null), notes (ONE short sentence, 25 words max). Keep every field short so the JSON stays small and complete.

QUESTIONS (id | question | what to look for), grouped by category:
${questionBlock}

RULES
- Only answer YES with real retrieved evidence. Prefer UNKNOWN over guessing. Never invent URLs. Keep text short.

OUTPUT (STRICT JSON ONLY, no markdown):
{
  "metadata": { "Target_Audience": "comma-separated string", "Fluency_Levels": ["..."], "Grade_Levels": ["..."] },
  "answers": { "<id>": { "answer": "YES|PARTIAL|NO|UNKNOWN", "evidence": "...", "flag": null, "notes": "..." }, ... }
}
Return one "answers" entry per question id above. No preamble.`

  let parsed: Record<string, unknown>
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      tools: WEB_SEARCH_TOOL,
      system:
        'You are a meticulous EdTech procurement screening auditor and classifier. You investigate platforms using live web search and answer only from evidence you actually retrieve. You never fabricate URLs or features. You always return valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    })
    parsed = extractJson(response.content) ?? {}
  } catch (err) {
    // Fail fast and visibly. Don't silently degrade to an all-UNKNOWN scan (which
    // would save a junk 0% result and hide that the call timed out or errored).
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tool-scanner] investigation failed:', message)
    throw new Error(`AI investigation failed: ${message}`)
  }

  // Metadata
  const md = (parsed.metadata ?? {}) as Record<string, unknown>
  yield {
    type: 'metadata',
    metadata: {
      Target_Audience: typeof md.Target_Audience === 'string' ? md.Target_Audience : '',
      Fluency_Levels: Array.isArray(md.Fluency_Levels) ? md.Fluency_Levels.map(String) : [],
      Grade_Levels: Array.isArray(md.Grade_Levels) ? md.Grade_Levels.map(String) : [],
    },
  }

  // Answers, sliced back into per-category chunks so the progress UI still advances.
  const answers = (parsed.answers ?? {}) as Record<string, Record<string, unknown> | undefined>
  for (const [category, qs] of byCategory.entries()) {
    const results: ScreeningResult[] = qs.map((q) => {
      const entry = answers[q.id]
      return {
        questionId: q.id,
        answer: normAnswer(entry?.answer),
        evidence: cleanField(entry?.evidence),
        flag: cleanField(entry?.flag),
        notes: cleanField(entry?.notes),
      }
    })
    yield { type: 'category', category, results }
  }
}
