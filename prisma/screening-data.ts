import type { ScreeningHardFail } from '@prisma/client'

// The 50 AI Screening questions for the Tool Scanner, grouped 1-50 across 9 categories.
// Source of truth for seeding; admin can edit/add/remove afterwards.
export type ScreeningSeed = {
  num: number
  category: string
  question: string
  whatToLookFor: string
  hardFail: ScreeningHardFail | null
}

export const SCREENING_QUESTIONS: ScreeningSeed[] = [
  // ─── Tool identity ───────────────────────────────────────────────────────────
  {
    num: 1,
    category: 'Tool identity',
    question: "What is the tool's primary purpose as stated on its website / documentation?",
    whatToLookFor: 'Homepage headline, About page, product positioning statement.',
    hardFail: null,
  },
  {
    num: 2,
    category: 'Tool identity',
    question:
      'Which English language skill(s) does the tool primarily target? (Speaking / Listening / Reading / Writing / Grammar / Vocabulary / Mixed)',
    whatToLookFor: 'Skill labels in product description, feature list, or marketing copy.',
    hardFail: null,
  },
  {
    num: 3,
    category: 'Tool identity',
    question: 'What age group or learner profile is the tool designed for?',
    whatToLookFor: 'Grade level, age range, or learner persona stated in marketing or docs.',
    hardFail: null,
  },
  {
    num: 4,
    category: 'Tool identity',
    question: 'Does the vendor explicitly claim CEFR alignment?',
    whatToLookFor: "Look for 'CEFR', 'A1–C2', 'Common European Framework' in docs or website.",
    hardFail: null,
  },
  {
    num: 5,
    category: 'Tool identity',
    question: 'What CEFR level range does the vendor claim the tool covers?',
    whatToLookFor: 'Level range stated in docs, FAQ, or feature list.',
    hardFail: null,
  },
  {
    num: 6,
    category: 'Tool identity',
    question: 'Is the tool designed for independent student use, teacher-led use, or blended?',
    whatToLookFor: "Described as 'self-paced', 'teacher-led', 'classroom tool', etc.",
    hardFail: null,
  },

  // ─── Content & curriculum ──────────────────────────────────────────────────────
  {
    num: 7,
    category: 'Content & curriculum',
    question: 'Does the tool provide adaptive content that adjusts to learner proficiency?',
    whatToLookFor: "Keywords: 'adaptive', 'personalised', 'AI-powered progression', 'levelled'.",
    hardFail: null,
  },
  {
    num: 8,
    category: 'Content & curriculum',
    question:
      'Does the tool offer content across multiple CEFR levels within a single session or plan?',
    whatToLookFor: 'Multi-level content libraries, level selectors, or adaptive branching described.',
    hardFail: null,
  },
  {
    num: 9,
    category: 'Content & curriculum',
    question: 'Is there evidence of culturally diverse, grade-appropriate content (Grades 5–8)?',
    whatToLookFor: 'Content samples, screenshots, or curriculum overviews visible online.',
    hardFail: null,
  },
  {
    num: 10,
    category: 'Content & curriculum',
    question:
      'Does the tool include audio/video stimuli with metadata (accent, speed, topic, CEFR level)?',
    whatToLookFor: 'Metadata tags, filter options, or content library screenshots.',
    hardFail: null,
  },
  {
    num: 11,
    category: 'Content & curriculum',
    question:
      'Does the tool offer reading passages with differentiated difficulty within a CEFR level?',
    whatToLookFor: "'Beginner / Intermediate / Advanced within each level' or equivalent.",
    hardFail: null,
  },

  // ─── Assessment ────────────────────────────────────────────────────────────────
  {
    num: 12,
    category: 'Assessment',
    question: 'Does the tool include an adaptive placement / diagnostic assessment?',
    whatToLookFor: "'Placement test', 'diagnostic', 'adaptive assessment' in feature list.",
    hardFail: null,
  },
  {
    num: 13,
    category: 'Assessment',
    question:
      "Does the tool's assessment produce a CEFR level recommendation with a confidence rating?",
    whatToLookFor: 'Output described as CEFR level, score-to-level mapping, or proficiency band.',
    hardFail: null,
  },
  {
    num: 14,
    category: 'Assessment',
    question:
      'Does the tool support multiple question types: MCQ, fill-in-the-blank, drag-and-drop, short answer?',
    whatToLookFor: 'Question type list in feature overview or sample screenshots.',
    hardFail: null,
  },
  {
    num: 15,
    category: 'Assessment',
    question: 'Does the tool auto-mark constructed (short text) responses using synonym matching or NLP?',
    whatToLookFor: "'Synonym detection', 'NLP scoring', 'flexible marking' stated.",
    hardFail: null,
  },
  {
    num: 16,
    category: 'Assessment',
    question:
      'Does the tool assess all CEFR sub-skills: main idea, detail, implied meaning (for listening/reading)?',
    whatToLookFor: 'Assessment rubric or question type descriptions.',
    hardFail: null,
  },
  {
    num: 17,
    category: 'Assessment',
    question: 'Does the tool offer pre-, mid-, and post-assessments?',
    whatToLookFor: 'Multiple assessment touchpoints described.',
    hardFail: null,
  },
  {
    num: 18,
    category: 'Assessment',
    question: 'Does the tool flag learners for CEFR level advancement when mastery threshold is met?',
    whatToLookFor: "'Auto-progression', '>80% accuracy triggers level up', or equivalent.",
    hardFail: null,
  },

  // ─── Speaking ──────────────────────────────────────────────────────────────────
  {
    num: 19,
    category: 'Speaking',
    question: 'Does the tool provide AI-powered speech-to-text transcription in real time?',
    whatToLookFor: "'Real-time STT', 'live transcription', speech recognition feature described.",
    hardFail: null,
  },
  {
    num: 20,
    category: 'Speaking',
    question: 'Does the tool provide phoneme-level pronunciation feedback?',
    whatToLookFor: "'Phoneme analysis', 'pronunciation scoring', 'word-level feedback' stated.",
    hardFail: null,
  },
  {
    num: 21,
    category: 'Speaking',
    question:
      'Does the tool score speaking across multiple dimensions (fluency, pronunciation, grammar, vocabulary, prosody, task achievement)?',
    whatToLookFor: 'Multi-dimensional scoring rubric stated.',
    hardFail: null,
  },
  {
    num: 22,
    category: 'Speaking',
    question: 'Does the tool offer an AI conversation partner for open-ended spoken practice?',
    whatToLookFor: "'AI tutor', 'conversation bot', 'speaking partner' described.",
    hardFail: null,
  },
  {
    num: 23,
    category: 'Speaking',
    question: 'Is speaking feedback delivered within 5 seconds of student finishing?',
    whatToLookFor: 'Latency claim in performance specs or SLA.',
    hardFail: null,
  },

  // ─── Writing ───────────────────────────────────────────────────────────────────
  {
    num: 24,
    category: 'Writing',
    question:
      'Does the tool provide real-time grammar and style error highlighting as the student writes?',
    whatToLookFor: "'Real-time feedback', 'inline correction', 'grammar checker' described.",
    hardFail: null,
  },
  {
    num: 25,
    category: 'Writing',
    question:
      'Does the tool evaluate writing against CEFR criteria (vocabulary range, grammar complexity, coherence)?',
    whatToLookFor: 'CEFR rubric-based scoring or equivalent described.',
    hardFail: null,
  },
  {
    num: 26,
    category: 'Writing',
    question: 'Does the tool provide a holistic writing score?',
    whatToLookFor: 'Score format described (stars, numeric, band).',
    hardFail: null,
  },
  {
    num: 27,
    category: 'Writing',
    question: 'Does the tool accept typed and optionally handwritten input?',
    whatToLookFor: 'Input modes described.',
    hardFail: null,
  },

  // ─── Analytics & progress ──────────────────────────────────────────────────────
  {
    num: 28,
    category: 'Analytics & progress',
    question: 'Does the tool provide a student-facing progress dashboard?',
    whatToLookFor: 'Dashboard screenshots or feature description.',
    hardFail: null,
  },
  {
    num: 29,
    category: 'Analytics & progress',
    question:
      'Does the tool provide a teacher-facing dashboard with real-time visibility of student responses?',
    whatToLookFor: 'Teacher view, class dashboard, or live monitoring described.',
    hardFail: null,
  },
  {
    num: 30,
    category: 'Analytics & progress',
    question: 'Does the tool track and surface error patterns / weak areas per student?',
    whatToLookFor: "'Error pattern analysis', 'weak area identification', 'skill gap report' described.",
    hardFail: null,
  },
  {
    num: 31,
    category: 'Analytics & progress',
    question: 'Does the tool maintain a skill map with spaced-repetition / decay logic?',
    whatToLookFor: "'Skill decay', 'spaced repetition', 'forgetting curve' mentioned.",
    hardFail: null,
  },
  {
    num: 32,
    category: 'Analytics & progress',
    question: 'Does the tool generate weekly activity plans automatically?',
    whatToLookFor: "'Weekly plan', 'auto-schedule', 'daily plan generator' described.",
    hardFail: null,
  },
  {
    num: 33,
    category: 'Analytics & progress',
    question: 'Are reports or dashboards described as easy to read without specialist training?',
    whatToLookFor: "'No training needed', 'simple dashboard', 'at a glance' language.",
    hardFail: null,
  },

  // ─── Platform & technical ──────────────────────────────────────────────────────
  {
    num: 34,
    category: 'Platform & technical',
    question: 'Does the tool have a publicly accessible privacy policy?',
    whatToLookFor: 'Privacy policy page present and linked from homepage.',
    hardFail: null,
  },
  {
    num: 35,
    category: 'Platform & technical',
    question: 'Does the privacy policy cover GDPR and/or CCPA compliance?',
    whatToLookFor: 'GDPR / CCPA explicitly mentioned in privacy policy.',
    hardFail: null,
  },
  {
    num: 36,
    category: 'Platform & technical',
    question: 'Does the tool state it encrypts data in transit and at rest?',
    whatToLookFor: 'Security page or privacy policy states encryption standard (e.g. TLS, AES-256).',
    hardFail: null,
  },
  {
    num: 37,
    category: 'Platform & technical',
    question: 'Does the tool have a child safety / COPPA compliance statement?',
    whatToLookFor: 'Child safety, COPPA, under-13 consent process described.',
    hardFail: null,
  },
  {
    num: 38,
    category: 'Platform & technical',
    question: 'Is there evidence of WCAG 2.1 AA accessibility compliance?',
    whatToLookFor: 'Accessibility statement, WCAG certification, or accessibility features listed.',
    hardFail: null,
  },
  {
    num: 39,
    category: 'Platform & technical',
    question: 'Does the tool state compatibility with mobile devices (Android / iOS)?',
    whatToLookFor: "Mobile app links, 'works on all devices', responsive design stated.",
    hardFail: null,
  },
  {
    num: 40,
    category: 'Platform & technical',
    question: 'Does the tool describe offline or low-bandwidth capability?',
    whatToLookFor: "'Offline mode', 'works on slow connections', 'cached content' stated.",
    hardFail: null,
  },
  {
    num: 41,
    category: 'Platform & technical',
    question: 'Does the tool describe LMS or Moodle integration (API, LTI, SSO)?',
    whatToLookFor: "'LTI 1.3', 'SCORM', 'Moodle plugin', 'SSO', 'Google Classroom' integration stated.",
    hardFail: null,
  },
  {
    num: 42,
    category: 'Platform & technical',
    question: 'Can data or outputs be exported (CSV, PDF, LMS grade passback)?',
    whatToLookFor: 'Export options described in feature list or integrations page.',
    hardFail: null,
  },
  {
    num: 43,
    category: 'Platform & technical',
    question: 'Does the tool state an uptime SLA of ≥99.9%?',
    whatToLookFor: 'SLA page or terms of service state uptime guarantee.',
    hardFail: null,
  },
  {
    num: 44,
    category: 'Platform & technical',
    question: 'Is API response time for lesson data stated as ≤500 ms?',
    whatToLookFor: 'Performance specifications or technical docs.',
    hardFail: null,
  },

  // ─── Cost ──────────────────────────────────────────────────────────────────────
  {
    num: 45,
    category: 'Cost',
    question: 'Is pricing publicly available on the vendor website?',
    whatToLookFor: 'Pricing page accessible without contacting sales.',
    hardFail: null,
  },
  {
    num: 46,
    category: 'Cost',
    question: 'Is there a free trial or demo available?',
    whatToLookFor: "'Try for free', 'request a demo', 'free plan' on website.",
    hardFail: null,
  },
  {
    num: 47,
    category: 'Cost',
    question: "Does pricing fall within the programme's affordability threshold?",
    whatToLookFor: 'Compare listed price to threshold (record currency and billing cycle).',
    hardFail: null,
  },

  // ─── Safeguarding ──────────────────────────────────────────────────────────────
  {
    num: 48,
    category: 'Safeguarding',
    question:
      'Does the tool present any safeguarding or content-risk concerns based on its public description?',
    whatToLookFor:
      'Unmoderated user content, social features, chat with strangers, no content moderation described.',
    hardFail: 'IF_YES',
  },
  {
    num: 49,
    category: 'Safeguarding',
    question: 'Is the tool appropriate for learners aged 10–14 based on content and interface?',
    whatToLookFor: 'Age rating, content description, design language observed.',
    hardFail: 'IF_NO',
  },
  {
    num: 50,
    category: 'Safeguarding',
    question: 'Is there a guardrail or moderation system described for AI-generated responses?',
    whatToLookFor: "'Content filter', 'AI safety', 'moderation layer', 'inappropriate content blocked' stated.",
    hardFail: null,
  },
]
