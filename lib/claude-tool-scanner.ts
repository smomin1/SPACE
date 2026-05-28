import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Allowed taxonomies (same as FetchAppInfo) ─────────────────────────────────
const ALLOWED_GRADES = [
  'K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'High School', 'Adult',
]
const ALLOWED_FLUENCY = [
  'Pre-beginner(No Background)', 'Beginner', 'Intermediate', 'Advanced/Fluent',
]
const ALLOWED_AUDIENCES = ['Students', 'Teachers', 'Parents', 'Corporate', 'General Learners']

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ToolScannerRequirement {
  id: string
  title: string
  description: string
  category: string | null
  weight: string
  isComplianceGate: boolean
}

export interface ToolScannerMetadata {
  Target_Audience: string
  Fluency_Levels: string[]
  Grade_Levels: string[]
}

export type ToolScannerScoreChunk =
  | { type: 'metadata'; metadata: ToolScannerMetadata }
  | { type: 'category'; category: string; scores: Record<string, number> }
  | { type: 'error'; message: string }

// ─── Main generator ────────────────────────────────────────────────────────────

export async function* runToolScanEvaluation(
  platformName: string,
  url: string,
  requirements: ToolScannerRequirement[],
): AsyncGenerator<ToolScannerScoreChunk> {
  // ── Call 1: Metadata classification (original FetchAppInfo prompt) ────────────
  const metaPrompt = `ROLE:
You are an Investigative EdTech Analyst specializing in competitive intelligence.

OBJECTIVE:
Conduct a multi-source, deep-dive audit of the platform **${platformName}** (${url}) to accurately map it to our internal classification framework.

INVESTIGATIVE PROTOCOL:
1. Targeted Web Search: Do NOT rely solely on the provided URL. Perform an active web search for "**${platformName}**" to find:
   - Independent pedagogical reviews
   - Recent news, press releases, or funding announcements that clarify their current market focus.
   - App Store/Play Store metadata and user reviews to confirm actual user demographics and use cases.
2. Fact-Checking & Triangulation: Cross-reference the marketing claims found on ${url} with external evidence found during your search. If claims conflict, prioritize the most recent third-party evidence.
3. Evidence-Based Inference: Analyze content complexity, technical requirements, and UI design to determine the most likely classifications if explicit data is missing from the public domain.

Allowed Categories (use ONLY these values):
- **Grades:** ${ALLOWED_GRADES.join(', ')}
- **Audiences:** ${ALLOWED_AUDIENCES.join(', ')}
- **Fluency Levels:** ${ALLOWED_FLUENCY.join(', ')}

### CONSTRAINTS
- **Multi-Label Classification:** Select ALL values that apply across the platform's different modules.
- **Output Integrity:** Return ONLY a valid JSON object. No reasoning, no markdown headers, and no extra text.

### DATA MAPPING
- **Target_Audience:** Identify every stakeholder group targeted. Return as a single comma-separated string.
- **Fluency_Levels:** Identify the supported English proficiency levels. Return as a list of strings.
- **Grade_Levels:** Identify the supported educational grade levels. Return as a list of strings.

### OUTPUT FORMAT:
{
    "Target_Audience": str,
    "Fluency_Levels": list,
    "Grade_Levels": list
}`

  const metaResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a highly precise EdTech classification engine. You strictly follow allowed category constraints and always return valid JSON.',
    messages: [{ role: 'user', content: metaPrompt }],
  })

  const metaText = metaResponse.content[0].type === 'text' ? metaResponse.content[0].text : ''
  try {
    // Strip markdown code fences if present
    const cleaned = metaText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const metadata = JSON.parse(cleaned) as ToolScannerMetadata
    yield { type: 'metadata', metadata }
  } catch {
    yield {
      type: 'metadata',
      metadata: { Target_Audience: '', Fluency_Levels: [], Grade_Levels: [] },
    }
  }

  // ── Call 2: Per-category scoring (original FetchAppInfo prompt, 0–4 scale) ───
  const byCategory = new Map<string, ToolScannerRequirement[]>()
  for (const req of requirements) {
    const cat = req.category ?? 'General'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(req)
  }

  for (const [category, reqs] of byCategory.entries()) {
    const reqStr = reqs
      .map((r) => `${r.id}: ${r.title}. ${r.description}`)
      .join('\n')

    const scoringPrompt = `ROLE:
You are an expert EdTech Product Auditor specializing in Technical Feature Verification.

OBJECTIVE:
Perform a deep-dive evaluation of the platform **${platformName}** (${url}) specifically for the category: "**${category}**".

EVALUATION PROTOCOL:
1. Multi-Source Verification: Use the provided URL as a starting point, but perform targeted web searches for "**${platformName}** ${category} features" to find:
   - Technical support documentation and Help Center articles.
   - User walkthroughs or YouTube feature demos.
   - Detailed product spec sheets or "feature comparison" pages.
2. Evidence-Driven Logic: Do not take marketing slogans at face value. Look for screenshots, specific UI mentions, or technical descriptions that prove a feature exists.
3. Strict Independence: Evaluate EACH requirement in the list below as a standalone item. The presence of one feature does not guarantee the presence of another.

SCORING RULES:
- 0 (Absent/No Evidence): Not mentioned, no evidence found across web sources, OR explicitly stated as not supported.
- 1 (Minimal): Feature is vaguely implied or mentioned in passing with no supporting detail.
- 2 (Partial/Ambiguous): Feature is mentioned but lacks depth, is behind a "coming soon" tag, or is indirectly implied without clear documentation.
- 3 (Mostly Supported): Feature is clearly present with reasonable evidence but minor gaps remain.
- 4 (Full Support): Clearly and fully supported with documented evidence, screenshots, or technical descriptions.

REQUIREMENTS TO SCORE:
${reqStr}

STRICTURES:
- Prefer 0 over guessing: If you cannot find external proof or direct website mention, the score MUST be 0.
- No Hallucinations: Base scores ONLY on information found during the current search and the provided site.

OUTPUT FORMAT (STRICT JSON ONLY):
{
    "requirementId": score
}

Return a flat JSON object mapping each requirement ID to its integer score (0–4). No preamble. No explanations. No extra text.`

    const scoringResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'You are a strict, evidence-based scoring engine for EdTech products. You do not guess and you always return valid JSON.',
      messages: [{ role: 'user', content: scoringPrompt }],
    })

    const scoreText =
      scoringResponse.content[0].type === 'text' ? scoringResponse.content[0].text : '{}'
    try {
      const cleaned = scoreText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const rawScores = JSON.parse(cleaned) as Record<string, unknown>

      // Clamp all values to integers 0–4; default missing reqs to 0
      const scores: Record<string, number> = {}
      for (const req of reqs) {
        const raw = rawScores[req.id]
        const n = typeof raw === 'number' ? raw : Number(raw)
        scores[req.id] = isNaN(n) ? 0 : Math.max(0, Math.min(4, Math.round(n)))
      }
      yield { type: 'category', category, scores }
    } catch {
      // Default all to 0 on parse failure
      const scores: Record<string, number> = {}
      for (const req of reqs) scores[req.id] = 0
      yield { type: 'category', category, scores }
    }
  }
}
