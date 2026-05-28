// FAQ content for SPACE. Add new entries here; the page picks them up automatically.
//
// Authoring rules:
//   * Each entry has a short, scannable question and a concise answer.
//   * Use plain prose. Line breaks render as paragraph separators.
//   * Avoid em dashes; prefer colons, commas, or periods.
//   * Keep keywords visible so search filtering finds them.

export interface FAQItem {
  question: string
  answer: string
  keywords?: string[]
}

export interface FAQCategory {
  id: string
  title: string
  description?: string
  items: FAQItem[]
}

export const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'The basics of SPACE and how to find your way around.',
    items: [
      {
        question: 'What is SPACE?',
        answer:
          'SPACE stands for Software Platform Analysis, Comparison, and Evaluation. It is a structured tool for evaluating educational technology platforms against a shared requirement set, then comparing them for procurement decisions.',
        keywords: ['acronym', 'overview', 'definition', 'edtech'],
      },
      {
        question: 'What is the difference between Tool Scanner and Tool Evaluator?',
        answer:
          'Tool Scanner is the Layer 1 exploratory tool. You give it a platform name and URL and an AI audits public sources to produce automatic 0 to 4 scores against every requirement. Use it to triage and shortlist.\n\nTool Evaluator is the Layer 2 structured workflow. Trained pedagogy and technical evaluators score platforms independently, conflicts are resolved through discussion, and the result is the authoritative record used in procurement.',
        keywords: ['layer 1', 'layer 2', 'pet', 'search', 'compare', 'workflow'],
      },
      {
        question: 'What user roles exist?',
        answer:
          'There are five roles: Super Admin (full system control including user management), Admin (manages requirements, contexts, platforms, and evaluations), Pedagogy Evaluator (scores pedagogy-typed requirements), Technical Evaluator (scores technical-typed requirements), and Viewer (read-only access to results and Tool Scanner).',
        keywords: ['permissions', 'access', 'admin', 'evaluator', 'viewer'],
      },
      {
        question: 'How do I sign in?',
        answer:
          'Go to the login page, enter your email and password, and click Sign in. An administrator must create your account first. If you forgot your password, ask an administrator to reset it for you.',
        keywords: ['login', 'password', 'authentication'],
      },
      {
        question: 'Where do I find my profile settings?',
        answer:
          'Click your avatar or name at the bottom of the sidebar. From the Profile page you can update your name, change your email, or set a new password.',
        keywords: ['account', 'settings', 'change password'],
      },
    ],
  },
  {
    id: 'tool-scanner',
    title: 'Tool Scanner (Layer 1)',
    description: 'Exploratory, AI-driven evaluation against public web sources.',
    items: [
      {
        question: 'How does Tool Scanner work?',
        answer:
          'You provide a platform name and its website URL. The AI then audits multiple public sources: the vendor website, documentation, help centres, app store listings, third-party reviews, and product demos. It scores each requirement on a 0 to 4 scale based on the evidence it finds.',
        keywords: ['ai', 'audit', 'web', 'sources', 'how it works'],
      },
      {
        question: 'What does each score (0 to 4) mean?',
        answer:
          '0: Absent. No evidence found across public sources, or the feature is explicitly not supported.\n1: Minimal. The feature is vaguely implied or mentioned in passing with no supporting detail.\n2: Partial. The feature is mentioned but lacks depth, sits behind a "coming soon" tag, or is indirectly implied.\n3: Mostly supported. Clearly present with reasonable evidence, but minor gaps remain.\n4: Full support. Clearly and fully supported with documented evidence, screenshots, or technical descriptions.',
        keywords: ['rubric', 'scoring scale', '0-4', 'meaning'],
      },
      {
        question: 'Why might the same platform get a different score on a re-run?',
        answer:
          'Tool Scanner relies on public web evidence available at the moment of the scan. As vendors update their websites and as third parties publish new reviews or documentation, the available evidence changes. Re-running a scan periodically is healthy, but expect a small margin of variance.',
        keywords: ['variance', 'consistency', 'rerun', 'margin of error'],
      },
      {
        question: 'Can I scope a scan to a specific context?',
        answer:
          'Yes. Use the Context filter at the top of the Tool Scanner pages. When a context is selected, all rankings, matrices, and category breakdowns are recomputed using only that context\'s requirements and any context-specific weight overrides.',
        keywords: ['context', 'filter', 'override', 'scoping'],
      },
      {
        question: 'What is the Scoring Matrix tab?',
        answer:
          'It shows every Tool Scanner platform side by side as columns, with each requirement as a row. You can filter by platform and category, and download the entire matrix as an Excel file for offline analysis.',
        keywords: ['matrix', 'compare', 'excel', 'download'],
      },
      {
        question: 'What is Categorical Analysis?',
        answer:
          'A per-category competency view. Pick up to three platforms and see what percentage of the maximum possible weighted score they achieved in each category. Useful for spotting strengths and gaps quickly.',
        keywords: ['category', 'competency', 'comparison'],
      },
      {
        question: 'How do I delete a Tool Scanner evaluation?',
        answer:
          'On the Evaluator tab, find the row in the Past evaluations table and click the trash icon. The evaluation is removed immediately and cannot be recovered.',
        keywords: ['delete', 'remove', 'evaluation'],
      },
      {
        question: 'Should I trust Tool Scanner results for procurement decisions?',
        answer:
          'Tool Scanner is exploratory. It produces a fast, AI-driven estimate based only on what is publicly visible online. For procurement, use Tool Evaluator: deliberate human evaluation by trained pedagogy and technical teams, slower but evidence-backed.',
        keywords: ['trust', 'procurement', 'decision', 'accuracy'],
      },
    ],
  },
  {
    id: 'tool-evaluator',
    title: 'Tool Evaluator (Layer 2)',
    description: 'The structured, human-driven evaluation workflow.',
    items: [
      {
        question: 'Who can score in Tool Evaluator?',
        answer:
          'Pedagogy Evaluators and Technical Evaluators score requirements in their respective domains. A requirement marked BOTH is scored by both teams independently. Admins can also score in either role.',
        keywords: ['evaluators', 'pedagogy', 'technical', 'both'],
      },
      {
        question: 'What are PEDAGOGY, TECHNICAL, and BOTH evaluator types?',
        answer:
          'Each requirement is tagged with the evaluator type that should score it. PEDAGOGY requirements are visible only to pedagogy evaluators. TECHNICAL requirements are visible only to technical evaluators. BOTH requirements are scored independently by both teams; the higher quality consensus emerges through conflict resolution.',
        keywords: ['evaluator type', 'pedagogy', 'technical', 'both'],
      },
      {
        question: 'What is the evaluation workflow?',
        answer:
          'Every evaluation moves through three states.\n\nIN_PROGRESS: assigned evaluators score independently. Cross-team scores are hidden.\n\nMERGED: both teams have submitted. Conflicts surface and team discussion begins.\n\nFINALISED: all conflicts are resolved and threads are closed. The evaluation is locked and flows into Results.',
        keywords: ['workflow', 'state machine', 'in progress', 'merged', 'finalised'],
      },
      {
        question: 'What is a conflict?',
        answer:
          'A conflict occurs when two evaluators differ by more than one point on the same requirement. A conflict thread is created so the team can discuss, share evidence, and update their scores until they agree.',
        keywords: ['conflict', 'disagreement', 'discussion', 'threshold'],
      },
      {
        question: 'Why can\'t I see the other team\'s scores during IN_PROGRESS?',
        answer:
          'Score isolation is a deliberate design choice. Pedagogy scores are hidden from Technical Evaluators and vice versa until both teams submit independently. This prevents anchoring bias and produces a more honest evaluation.',
        keywords: ['isolation', 'bias', 'hidden', 'cross-team'],
      },
      {
        question: 'What is a Team Lead?',
        answer:
          'A Team Lead is the senior evaluator on a team. They co-ordinate the team\'s scoring and are the one who triggers the merge into the MERGED state once everyone on the team has submitted.',
        keywords: ['lead', 'team lead', 'merge', 'role'],
      },
      {
        question: 'Can a finalised evaluation be reopened?',
        answer:
          'Yes, but only by an administrator and only with a documented reason. Reopening creates a permanent audit log entry.',
        keywords: ['reopen', 'finalised', 'audit', 'admin'],
      },
      {
        question: 'How are scores recorded and audited?',
        answer:
          'Every score submission is attributed to the user and timestamped. Edits never overwrite silently: each change creates a new ScoreAuditLog entry, so the full history of every score is preserved.',
        keywords: ['audit log', 'history', 'change tracking'],
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring & Weights',
    description: 'How individual scores combine into the overall weighted percentage.',
    items: [
      {
        question: 'What does N/A mean?',
        answer:
          'N/A indicates the requirement does not apply to this platform, or that the evaluator could not gather enough evidence to score it confidently. N/A scores are excluded from the weighted percentage entirely: they neither help nor hurt.',
        keywords: ['n/a', 'not applicable', 'excluded'],
      },
      {
        question: 'What are HIGH, MEDIUM, and LOW weights?',
        answer:
          'Each requirement carries a weight that reflects its importance: HIGH counts triple, MEDIUM counts double, LOW counts as one. The weight is set globally when the requirement is created, but it can be overridden per context.',
        keywords: ['weight', 'multiplier', 'priority', 'importance'],
      },
      {
        question: 'How is the weighted percentage calculated?',
        answer:
          'For each requirement that was actually scored (not N/A), we multiply the score by the weight multiplier (HIGH=3, MEDIUM=2, LOW=1) and sum these to get the numerator. The denominator is the maximum possible: 4 times the weight multiplier, summed across the same requirements. The percentage is numerator divided by denominator times 100.',
        keywords: ['formula', 'calculation', 'percentage', 'weighted'],
      },
      {
        question: 'What is a context-specific weight override?',
        answer:
          'A requirement\'s global weight (HIGH, MEDIUM, LOW) can be overridden for a single context. For example, "data export" might be HIGH globally but MEDIUM for a specific K-12 reading context where it matters less. When you filter by that context, the override weight is used in all calculations.',
        keywords: ['override', 'context', 'weight'],
      },
    ],
  },
  {
    id: 'compliance-gates',
    title: 'Compliance Gates',
    description: 'Hard pass or fail requirements that block platforms outright.',
    items: [
      {
        question: 'What is a Compliance Gate?',
        answer:
          'A Compliance Gate is a requirement marked as a hard pass or fail blocker. Compliance Gates are typically used for legal, accessibility, safety, or privacy requirements where any failure is unacceptable.',
        keywords: ['gate', 'blocker', 'compliance', 'mandatory'],
      },
      {
        question: 'How does a Compliance Gate FAIL affect scoring?',
        answer:
          'A FAIL (score of 0) on any Compliance Gate immediately marks the platform as DISQUALIFIED. The platform is removed from comparisons and recommendations regardless of how well it scores on other requirements.',
        keywords: ['fail', 'disqualified', 'blocker', 'gate'],
      },
      {
        question: 'How are Compliance Gates scored?',
        answer:
          'In Tool Evaluator, Compliance Gates are scored Yes or No (pass or fail) rather than 0 to 4. In Tool Scanner, they use the same 0 to 4 scale as everything else, but any score of 0 or 1 is flagged as a potential blocker.',
        keywords: ['yes no', 'pass fail', 'scoring'],
      },
      {
        question: 'Can I have multiple Compliance Gates?',
        answer:
          'Yes. Any requirement can be a Compliance Gate, and you can have as many as you need. Each one is evaluated independently and any single failure disqualifies the platform.',
        keywords: ['multiple', 'count'],
      },
    ],
  },
  {
    id: 'contexts',
    title: 'Contexts',
    description: 'Scope evaluations and results to specific use cases.',
    items: [
      {
        question: 'What is a Context?',
        answer:
          'A Context is a named scenario (for example: "Adult Beginner ESL", "K-12 Reading Intervention", "Corporate Training"). Contexts are used to filter results, define which requirements apply, and override weights for that scenario.',
        keywords: ['context', 'scope', 'scenario', 'use case'],
      },
      {
        question: 'Can a platform belong to multiple contexts?',
        answer:
          'Yes. A platform can be tagged with as many contexts as apply. When you filter Results by context, only platforms tagged with that context appear.',
        keywords: ['platform', 'multi-context', 'tags'],
      },
      {
        question: 'Can a requirement belong to multiple contexts?',
        answer:
          'Yes. A requirement can be linked to multiple contexts, and each link can carry its own optional weight override. The link is what enables a requirement to count toward a context\'s scoring.',
        keywords: ['requirement', 'multi-context', 'shared'],
      },
      {
        question: 'How do contexts affect Results?',
        answer:
          'The Results dashboard has a context filter. Selecting a context limits the comparison to platforms in that context, filters requirements to those linked to the context, and applies any weight overrides that context defines.',
        keywords: ['results', 'filter', 'analytics'],
      },
    ],
  },
  {
    id: 'requirements',
    title: 'Requirements',
    description: 'Manage the master list of evaluation criteria.',
    items: [
      {
        question: 'What is a Requirement?',
        answer:
          'A Requirement is one evaluation criterion: a short title, a longer description, an evaluator type (PEDAGOGY, TECHNICAL, or BOTH), a weight (HIGH, MEDIUM, or LOW), an optional category, and an optional Compliance Gate flag.',
        keywords: ['requirement', 'criterion', 'definition'],
      },
      {
        question: 'How do I add a Requirement?',
        answer:
          'Admins can add requirements from Admin > Requirements. Click "New Requirement", fill in the form, and save. The new requirement immediately appears in active evaluations.',
        keywords: ['add', 'create', 'new requirement'],
      },
      {
        question: 'Can I bulk import requirements?',
        answer:
          'Yes. From Admin > Requirements, click "Bulk Import" and upload an XLSX file (download the template from the same dialog). The importer validates each row and reports failures without aborting the entire import.',
        keywords: ['bulk', 'xlsx', 'import', 'upload'],
      },
      {
        question: 'What is a Category?',
        answer:
          'A Category is a free-form label that groups related requirements (for example: "Accessibility", "Data Privacy", "Curriculum Coverage"). Categories drive the breakdown views in Results and Tool Scanner.',
        keywords: ['category', 'grouping', 'tag'],
      },
      {
        question: 'What is Display Order?',
        answer:
          'Display Order is the sort position of a requirement within its category. Lower numbers appear first. Use it to put high-priority items at the top of each category.',
        keywords: ['order', 'sort', 'position'],
      },
    ],
  },
  {
    id: 'results',
    title: 'Results & Analytics',
    description: 'How Tool Evaluator results are presented and interpreted.',
    items: [
      {
        question: 'What does the Comparison view show?',
        answer:
          'A side-by-side weighted-score table of every finalised platform: pedagogy %, technical %, combined %, compliance pass/fail, and a recommendation tier.',
        keywords: ['comparison', 'side by side', 'overview'],
      },
      {
        question: 'What is "Best Fit"?',
        answer:
          'Best Fit recommends the minimum combination of platforms that together cover the most requirements. It uses a greedy set-cover algorithm to identify which platforms complement each other, so you can fill gaps with multiple complementary tools rather than seeking a single perfect one.',
        keywords: ['best fit', 'combination', 'set cover', 'complementary'],
      },
      {
        question: 'What is "Build Readiness"?',
        answer:
          'Build Readiness highlights how each platform scores on technical integration requirements (APIs, LTI, data export, SSO, interoperability). It signals which platforms are easiest to incorporate into your existing infrastructure.',
        keywords: ['build readiness', 'technical', 'integration', 'api'],
      },
      {
        question: 'What does each recommendation tier mean?',
        answer:
          'TOP_PICK: 85% or higher weighted score. Strong recommendation.\nRECOMMENDED: 70 to 84%. Solid choice.\nCONSIDER: 50 to 69%. Has gaps but may fit specific needs.\nNOT_RECOMMENDED: below 50%. Does not meet the threshold for adoption.\nDISQUALIFIED: failed a Compliance Gate.',
        keywords: ['tier', 'recommendation', 'top pick', 'consider'],
      },
      {
        question: 'Why is a platform marked DISQUALIFIED?',
        answer:
          'A platform receives DISQUALIFIED status when it fails any Compliance Gate requirement. This overrides its overall score and removes it from procurement consideration regardless of how well it scores elsewhere.',
        keywords: ['disqualified', 'fail', 'compliance'],
      },
    ],
  },
  {
    id: 'exports',
    title: 'Exports',
    description: 'Take SPACE data outside the application.',
    items: [
      {
        question: 'What export formats are available?',
        answer:
          'PDF (a full Platform Evaluation Report with cover, comparison, category breakdown, best fit, build readiness, and matrix), Excel (raw tabular data), and CSV.',
        keywords: ['export', 'pdf', 'xlsx', 'csv'],
      },
      {
        question: 'Can I export the Tool Scanner matrix?',
        answer:
          'Yes. From the Scoring Matrix tab in Tool Scanner, click "Download Matrix" to get an XLSX with platforms as columns and requirements as rows.',
        keywords: ['tool scanner', 'matrix', 'download'],
      },
      {
        question: 'What does the PDF report contain?',
        answer:
          'A branded cover page, a side-by-side platform comparison, a per-category breakdown, the Best Fit recommendation, Build Readiness scores, and the complete requirement-by-platform matrix. Every page carries the SPACE wordmark and page number.',
        keywords: ['pdf', 'report', 'content'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    description: 'Manage your account details.',
    items: [
      {
        question: 'How do I change my password?',
        answer:
          'Click your name in the sidebar to open Profile. In the Change Password section, enter your current password, then your new password twice. Click Save.',
        keywords: ['password', 'change', 'update'],
      },
      {
        question: 'How do I change my email or name?',
        answer:
          'Same place: Profile, under Identity. Update the fields and click Save. Email addresses must be unique across all accounts.',
        keywords: ['email', 'name', 'identity'],
      },
      {
        question: 'Who can change my role?',
        answer:
          'Only a Super Admin can change roles. Roles control which areas of SPACE you can access, so changes are deliberately restricted.',
        keywords: ['role', 'change', 'permission'],
      },
    ],
  },
]
