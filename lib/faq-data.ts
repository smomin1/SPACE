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
          'SPACE stands for Software Platform Analysis, Comparison, and Evaluation. It is a structured platform for evaluating educational technology tools across four sequential stages: AI Screening, CEFR Evaluation, VITAL Evaluation, and PRD Tool Evaluation. The result is a ranked, evidence-backed shortlist for procurement decisions.',
        keywords: ['acronym', 'overview', 'definition', 'edtech', 'what is'],
      },
      {
        question: 'What are the four evaluation stages?',
        answer:
          'Stage 1 (AI Screening): an automated Tool Scanner audit of public sources gives each platform a coverage score. Platforms that pass the threshold move to Stage 2.\n\nStage 2 (CEFR Evaluation): a CEFR & VITAL Evaluator scores each platform against the CEFR language-alignment questionnaire. Passing the CEFR threshold unlocks Stage 3.\n\nStage 3 (VITAL Evaluation): the same evaluator completes a VITAL profile covering pillars, skills, and CEFR level coverage. Passing the VITAL threshold unlocks Stage 4.\n\nStage 4 (PRD Tool Evaluation): trained Pedagogy and Technical Evaluators score the platform against the full shared requirement set. The combined weighted score is the platform\'s final PRD result.\n\nA platform must clear all four thresholds to appear in the Final Ranking.',
        keywords: ['pipeline', 'stages', 'overview', 'ai screening', 'cefr', 'vital', 'prd', 'four stages'],
      },
      {
        question: 'What user roles exist?',
        answer:
          'There are six roles.\n\nSuper Admin: full system access including creating and managing all user accounts. Only one Super Admin can exist.\n\nAdmin: manages platforms, requirements, contexts, evaluations, and the VITAL catalogue. Cannot create or manage user accounts.\n\nPRD Pedagogical Evaluator: scores Pedagogy-typed PRD requirements for assigned platforms.\n\nPRD Technical Evaluator: scores Technical-typed PRD requirements for assigned platforms.\n\nCEFR & VITAL Evaluator: runs the CEFR language-alignment evaluation and completes VITAL profiles for assigned platforms.\n\nViewer: read-only access to all Results dashboards and VITAL Insights.',
        keywords: ['roles', 'permissions', 'access', 'admin', 'evaluator', 'viewer', 'super admin'],
      },
      {
        question: 'How do I sign in?',
        answer:
          'Go to the login page, enter your email and password, and click Sign in. First-time users receive a temporary password by email and must set a permanent password immediately after signing in.',
        keywords: ['login', 'sign in', 'password', 'authentication'],
      },
      {
        question: 'How do I request access to SPACE?',
        answer:
          'From the login page, click "Request access". Fill in your name, work email, team, and the role you need, then submit. A Super Admin will review your request and either approve or reject it. If approved, you will receive an email with a temporary password. You will be required to change it on first login.',
        keywords: ['request access', 'sign up', 'account', 'register', 'new user'],
      },
      {
        question: 'I forgot my password. What do I do?',
        answer:
          'From the login page, click "Forgot password". Enter your email address and a reset link will be sent to you. The link is valid for a limited time. If you no longer have access to your email, ask a Super Admin to reset your password from your user profile.',
        keywords: ['forgot password', 'reset', 'locked out'],
      },
      {
        question: 'How does a Super Admin reset a user\'s password?',
        answer:
          'Go to Admin > Users, open the user\'s edit page, and click "Reset password". A new temporary password is generated, emailed to the user, and the user is required to change it on their next login. The temporary password is not shown to the admin.',
        keywords: ['reset password', 'super admin', 'temporary password', 'admin'],
      },
      {
        question: 'Where do I find my profile settings?',
        answer:
          'Click your name at the bottom of the sidebar to open your Profile page. From there you can update your name, email address, or password.',
        keywords: ['profile', 'account', 'settings', 'change password'],
      },
    ],
  },
  {
    id: 'pipeline',
    title: 'Evaluation Pipeline',
    description: 'How platforms progress through all four evaluation stages.',
    items: [
      {
        question: 'Where can I see the full pipeline status for all platforms?',
        answer:
          'Go to Pipeline in the sidebar. The Pipeline board shows every active platform as a row with its current status across all four stages (AI Screening, CEFR, VITAL, PRD). Each cell shows the stage status (Not started, Queued, In progress, Passed, Failed, or Skipped) and the platform\'s score for that stage. The board recomputes stage data from the latest source records every time the page loads.',
        keywords: ['pipeline', 'board', 'status', 'overview'],
      },
      {
        question: 'What do the pipeline stage statuses mean?',
        answer:
          'Not started: the stage has not been run yet for this platform.\n\nQueued: the previous stage passed, so this stage is ready to begin.\n\nIn progress: work on this stage has started but a final score is not yet recorded.\n\nPassed: the stage score met or exceeded the configured threshold.\n\nFailed: the stage score was below the configured threshold.\n\nSkipped: an admin manually skipped this stage. A skipped stage is excluded from the aggregate score calculation.',
        keywords: ['status', 'queued', 'passed', 'failed', 'skipped', 'in progress'],
      },
      {
        question: 'How are stage thresholds and weights configured?',
        answer:
          'At the top of the Pipeline page there is a "Thresholds and weights" panel. Each stage has a pass threshold (the minimum score percentage required to advance) and a weight (how much that stage contributes to the aggregate score). Weights do not have to sum to 100, but 100 is clearest. Click "Save config" to apply changes.',
        keywords: ['threshold', 'weight', 'config', 'configure', 'pass'],
      },
      {
        question: 'What is the aggregate score?',
        answer:
          'The aggregate is a single weighted score across all completed pipeline stages. It is calculated as the sum of (stage score multiplied by stage weight) divided by the sum of the weights for stages that have a score. Skipped stages are excluded and the remaining weights are renormalised, so partially evaluated platforms still receive a provisional aggregate.',
        keywords: ['aggregate', 'score', 'weighted', 'formula'],
      },
      {
        question: 'Can a stage be skipped?',
        answer:
          'Yes. Admins can skip any stage from the Pipeline board by clicking the "skip" link below the stage cell. Skipping a stage removes it from the aggregate calculation and auto-queues the next stage so the platform can continue through the pipeline. A skipped stage can be un-skipped at any time.',
        keywords: ['skip', 'unskip', 'bypass', 'stage'],
      },
      {
        question: 'How do I link a Tool Scanner scan to a platform?',
        answer:
          'On the Pipeline board, find the platform row and click "link" under the AI Screening cell. A dropdown lists all completed scans that are not yet linked to a platform. Select the scan and confirm. The pipeline will recompute the AI Screening score from that scan.',
        keywords: ['link', 'scan', 'tool scanner', 'ai screening'],
      },
      {
        question: 'How do I link a VITAL assessment to a platform?',
        answer:
          'On the Pipeline board, click "link" under the VITAL cell for the relevant platform. A dropdown lists available VITAL assessment tools that are not yet linked. Select the one that corresponds to this platform and confirm.',
        keywords: ['link', 'vital', 'assessment', 'pipeline'],
      },
      {
        question: 'What happens when a platform fails a stage?',
        answer:
          'A failed stage does not automatically disqualify the platform. The platform remains in the pipeline and the next stage does not advance to Queued. Admins can choose to skip the failed stage if appropriate, which allows the pipeline to continue. A platform is only marked Disqualified if it fails a Compliance Gate requirement during the PRD evaluation.',
        keywords: ['fail', 'failed', 'disqualified', 'threshold'],
      },
      {
        question: 'Does changing a threshold retroactively affect platforms already in CEFR?',
        answer:
          'Only partially. If a platform has already had its CEFR evaluation started (even as a draft), it remains on the CEFR tab permanently regardless of what the AI Screening threshold is set to. Threshold changes only affect platforms that have not yet begun their CEFR evaluation: those platforms may drop off the CEFR tab if their AI score no longer meets the new threshold.',
        keywords: ['threshold', 'cefr', 'retroactive', 'change', 'affect'],
      },
    ],
  },
  {
    id: 'tool-scanner',
    title: 'Stage 1: AI Screening (Tool Scanner)',
    description: 'Automated AI audit of public sources to triage and shortlist platforms.',
    items: [
      {
        question: 'What is the Tool Scanner?',
        answer:
          'Tool Scanner is the first stage of the evaluation pipeline. You provide a platform name and its website URL. The AI audits multiple public sources: the vendor website, documentation, help centres, app store listings, third-party reviews, and product demos. It produces a coverage percentage that represents how well the platform appears to meet the requirements based on publicly available information.',
        keywords: ['tool scanner', 'ai', 'audit', 'web', 'sources', 'how it works', 'layer 1'],
      },
      {
        question: 'What does the AI Screening coverage score represent?',
        answer:
          'The coverage percentage is calculated from the Tool Scanner\'s responses to all screening questions. A higher percentage means the AI found stronger public evidence of feature coverage across the requirement set. This score feeds directly into the pipeline: platforms that meet or exceed the AI Screening threshold advance to the CEFR stage.',
        keywords: ['coverage', 'score', 'percentage', 'ai screening'],
      },
      {
        question: 'What are screening questions?',
        answer:
          'Screening questions are a set of structured prompts the AI answers about each platform. Each question corresponds to a requirement or feature area. Some questions are marked as "hard fail" blockers: a YES answer (or NO answer, depending on the flag) immediately fails the entire scan, used for safeguarding or critical compliance issues.',
        keywords: ['screening questions', 'hard fail', 'blocker', 'questions'],
      },
      {
        question: 'What do the screening answer values mean?',
        answer:
          'YES: the AI found clear evidence this feature or condition is present.\nPARTIAL: some evidence exists but it is incomplete or ambiguous.\nNO: no evidence found, or the feature is explicitly not present.\nUNKNOWN: insufficient information to determine.',
        keywords: ['screening', 'answers', 'yes', 'no', 'partial', 'unknown'],
      },
      {
        question: 'Why might the same platform get a different score on a re-run?',
        answer:
          'Tool Scanner relies on public web evidence at the moment of the scan. As vendors update their websites and as third parties publish new reviews or documentation, the available evidence changes. Re-running a scan periodically is healthy, but expect some variance between runs.',
        keywords: ['variance', 'consistency', 'rerun', 'different score'],
      },
      {
        question: 'What is the Scoring Matrix tab?',
        answer:
          'It shows every Tool Scanner platform side by side as columns, with each requirement as a row. You can filter by platform and category and download the entire matrix as an Excel file for offline analysis.',
        keywords: ['matrix', 'compare', 'excel', 'download'],
      },
      {
        question: 'What is Categorical Analysis?',
        answer:
          'A per-category competency view. Pick up to three platforms and see the weighted percentage they achieved in each requirement category. Useful for spotting strengths and gaps quickly before committing to a full human evaluation.',
        keywords: ['category', 'competency', 'comparison', 'categorical'],
      },
      {
        question: 'Should I rely on Tool Scanner results for procurement decisions?',
        answer:
          'No. Tool Scanner is an exploratory triage tool. It produces a fast AI-driven estimate based only on what is publicly visible online. Use it to identify promising platforms and eliminate obvious non-starters before committing evaluator time to a full four-stage pipeline assessment.',
        keywords: ['trust', 'procurement', 'decision', 'accuracy', 'triage'],
      },
    ],
  },
  {
    id: 'cefr-evaluation',
    title: 'Stage 2: CEFR Evaluation',
    description: 'Language-alignment scoring by a CEFR & VITAL Evaluator.',
    items: [
      {
        question: 'What is the CEFR Evaluation?',
        answer:
          'The CEFR Evaluation is the second stage of the pipeline. A CEFR & VITAL Evaluator works through a questionnaire that tests how well a platform covers each CEFR level (A1 through C2) across six language skills: Speaking, Listening, Reading, Vocabulary, Grammar, and Writing. The result is an alignment percentage that reflects how comprehensively the platform maps to the CEFR framework.',
        keywords: ['cefr', 'evaluation', 'language', 'alignment', 'stage 2'],
      },
      {
        question: 'Who can complete a CEFR Evaluation?',
        answer:
          'The CEFR & VITAL Evaluator role, plus Super Admins and Admins with the submit:cefr_score permission. PRD Pedagogy and Technical Evaluators cannot complete CEFR evaluations.',
        keywords: ['cefr', 'who', 'permission', 'evaluator', 'access'],
      },
      {
        question: 'How are CEFR questions answered?',
        answer:
          'Each question has four answer options.\n\nYES: the platform fully supports this skill at this level.\nPARTIAL: partial or limited support exists.\nNO: no meaningful support at this level for this skill.\nN/A: not applicable to this platform or context.\n\nN/A answers are excluded from the alignment percentage. YES scores 2 points, PARTIAL scores 1, NO scores 0. The alignment percentage is the total points divided by the maximum possible (excluding N/A).',
        keywords: ['cefr', 'answer', 'yes', 'partial', 'no', 'na', 'scoring', 'how'],
      },
      {
        question: 'What is a CEFR alignment percentage?',
        answer:
          'The alignment percentage shows how well a platform covers the CEFR framework based on the evaluator\'s responses. It is calculated per level and overall. A higher percentage means stronger curriculum alignment across the language skills and CEFR bands tested. This percentage is the score used in the pipeline threshold check for Stage 2.',
        keywords: ['alignment', 'percentage', 'cefr', 'score', 'calculation'],
      },
      {
        question: 'Can a CEFR evaluation be saved and continued later?',
        answer:
          'Yes. The evaluation is saved as a draft automatically whenever you click Submit. You can return to it at any time from Evaluations > CEFR tab. The evaluation only moves to Completed when you intentionally submit it with a final status.',
        keywords: ['draft', 'save', 'continue', 'incomplete', 'cefr'],
      },
      {
        question: 'How does a platform appear on the CEFR tab in Platforms?',
        answer:
          'Any platform whose AI Screening score passed the configured AI Screening threshold automatically appears on the CEFR tab. Once a CEFR evaluation has been started for that platform, it remains on the CEFR tab permanently regardless of any future threshold changes. Platforms without a started CEFR evaluation may disappear from the tab if the AI Screening threshold is raised later.',
        keywords: ['cefr', 'tab', 'platforms', 'appear', 'threshold', 'auto'],
      },
      {
        question: 'What does the eval status show for platforms on the CEFR tab?',
        answer:
          '"Not started" (with the AI Screening score shown as context): the platform passed AI Screening but no CEFR evaluation has been created yet.\n"In progress": a CEFR evaluation exists as a draft.\n"Completed": the evaluator submitted a final CEFR evaluation.\n"Assign evaluation": no CEFR evaluator has been assigned to this platform yet.',
        keywords: ['cefr', 'status', 'not started', 'in progress', 'completed', 'assign'],
      },
    ],
  },
  {
    id: 'vital-evaluation',
    title: 'Stage 3: VITAL Evaluation',
    description: 'VITAL framework profiling by a CEFR & VITAL Evaluator.',
    items: [
      {
        question: 'What is the VITAL Evaluation stage in the pipeline?',
        answer:
          'After passing the CEFR stage, a platform enters the VITAL stage. The same CEFR & VITAL Evaluator completes a profile that scores the platform across the five VITAL pillars (Visible learning, Inclusive pedagogy, Technology, Assessment for learning, Learner agency), across language skills, and across CEFR levels. The resulting V2 percentage is used as the pipeline score for this stage.',
        keywords: ['vital', 'stage 3', 'pipeline', 'pillar', 'profile', 'evaluator'],
      },
      {
        question: 'Who completes the VITAL profile for a platform?',
        answer:
          'The CEFR & VITAL Evaluator assigned to that platform. Admins and Super Admins can also complete it via the manage:vital permission.',
        keywords: ['vital', 'who', 'evaluator', 'permission', 'profile'],
      },
      {
        question: 'What is the VITAL Insights section?',
        answer:
          'VITAL Insights is a standalone read-only section available to all signed-in users. It provides multiple views of the VITAL catalogue.\n\nRecommendations: pick a skill and CEFR level to see the best core and supplementary tool with combined pillar coverage.\nLevel Stack: the full skill stack for one selected CEFR level.\nAssessment Landscape: all assessment tools with adaptive testing and level coverage mapped.\nTool Catalogue: browse every tool and open its detailed profile.',
        keywords: ['vital insights', 'recommendations', 'level stack', 'assessment', 'catalogue'],
      },
      {
        question: 'How is the VITAL / 10 score calculated?',
        answer:
          'VITAL / 10 is derived automatically from the five pillar ratings. Each pillar rated Y contributes 2 points, P contributes 1, N contributes 0. Five pillars give a maximum of 10. Assessment tools have no pillar profile, so their VITAL / 10 is left blank. The score updates live in the admin form as you change the ratings.',
        keywords: ['vital', 'score', '10', 'pillars', 'calculated', 'derived'],
      },
      {
        question: 'What is the V2 / 50 score?',
        answer:
          'V2 / 50 is a separate rubric score carried over from the source workbooks. Unlike VITAL / 10, it is not derived from pillar ratings, so it is entered manually in the tool form. The V2 percentage (V2 score out of 50) is what the pipeline uses as the VITAL stage score.',
        keywords: ['vital', 'v2', '50', 'rubric', 'manual', 'pipeline score'],
      },
      {
        question: 'What do the VITAL verdicts mean?',
        answer:
          'STRONG_FIT: the tool is a strong match for the skill and level context.\nGOOD_FIT: a solid choice with minor gaps.\nPARTIAL_FIT: some alignment but notable gaps.\nPOOR_FIT: insufficient coverage for this context.',
        keywords: ['vital', 'verdict', 'strong fit', 'good fit', 'partial fit', 'poor fit'],
      },
      {
        question: 'What do the VITAL risk levels mean?',
        answer:
          'LOW: minimal deployment risk; the tool is stable and well-supported.\nMEDIUM: moderate risk; some gaps in stability, support, or alignment.\nHIGH: significant risk; major concerns about stability, evidence quality, or fit.',
        keywords: ['vital', 'risk', 'low', 'medium', 'high'],
      },
      {
        question: 'How are VITAL recommendations chosen?',
        answer:
          'For each skill and CEFR level, the core and supplementary tool slots are filled automatically from the catalogue. Only tools that cover both the skill and the level are eligible. Eligible tools are ranked first by coverage strength (Full beats Partial), then by highest VITAL / 10, then by lowest risk. The Core role pool fills the core slot; the Supplementary pool fills the supplementary slot. Admins can override any slot with a manual pick, which is preserved through future recomputes.',
        keywords: ['vital', 'recommendation', 'derived', 'ranking', 'core', 'supplementary', 'eligibility'],
      },
      {
        question: 'How do I import VITAL data from a workbook?',
        answer:
          'From Admin > Manage VITAL and CEFR, click Import and upload an XLSX workbook. The importer shows a preview listing new rows (auto-selected) and changed rows as a before-and-after diff with per-row checkboxes. Nothing is written until you confirm. Approved changes are applied in one step and recorded in the import history.',
        keywords: ['vital', 'import', 'xlsx', 'workbook', 'diff', 'review'],
      },
    ],
  },
  {
    id: 'prd-tool-evaluator',
    title: 'Stage 4: PRD Tool Evaluator',
    description: 'Structured human evaluation by Pedagogy and Technical Evaluators.',
    items: [
      {
        question: 'What is the PRD Tool Evaluator?',
        answer:
          'The PRD Tool Evaluator is the fourth and final stage of the pipeline. Assigned Pedagogy and Technical Evaluators independently score the platform against the full shared requirement set. Their scores are merged, conflicts are resolved through threaded discussion, and the finalised weighted percentage is the platform\'s definitive PRD result.',
        keywords: ['prd', 'tool evaluator', 'stage 4', 'pedagogy', 'technical', 'scoring'],
      },
      {
        question: 'What are the three states an evaluation moves through?',
        answer:
          'IN_PROGRESS: assigned evaluators are actively scoring. Cross-team scores are hidden from each other.\n\nMERGED: all assigned evaluators on both teams have submitted. Scores from both teams are now visible to everyone. Conflicts are identified and discussed.\n\nFINALISED: all conflict threads are closed and all age range conflicts are resolved. The evaluation is locked and the result flows into the Results dashboards.',
        keywords: ['state', 'in progress', 'merged', 'finalised', 'workflow'],
      },
      {
        question: 'What is score isolation and why does it exist?',
        answer:
          'During IN_PROGRESS, Pedagogy Evaluators cannot see Technical scores, and Technical Evaluators cannot see Pedagogy scores. This is enforced at the database level, not just in the interface. The isolation prevents anchoring bias and ensures each team arrives at genuinely independent judgements before scores are compared in the MERGED state.',
        keywords: ['score isolation', 'bias', 'hidden', 'cross-team', 'independent'],
      },
      {
        question: 'How do I score a requirement?',
        answer:
          'From your Evaluations page, click on the platform you are evaluating. Use the score buttons (N/A, 0, 1, 2, 3, 4) next to each requirement. Select an evidence type from the dropdown (Trial, Demo, Documentation, or Vendor Claim) and optionally add notes. Every score is saved automatically the moment you click it. You do not need to complete the evaluation in one sitting.',
        keywords: ['score', 'requirement', 'how to', 'evidence', 'notes', 'auto-save'],
      },
      {
        question: 'What does each score value mean?',
        answer:
          '0: Absent. No evidence of this feature.\n1: Minimal. Vaguely implied or mentioned in passing.\n2: Partial. Feature exists but has gaps, is incomplete, or is only indirectly implied.\n3: Mostly supported. Clearly present with minor gaps remaining.\n4: Full support. Fully supported with strong, documented evidence.',
        keywords: ['score', '0', '1', '2', '3', '4', 'scale', 'meaning', 'rubric'],
      },
      {
        question: 'What is the difference between the four evidence types?',
        answer:
          'TRIAL: direct hands-on experience with the live product. Highest confidence.\nDEMO: vendor-led demonstration. High confidence but limited to what the vendor chose to show.\nDOCUMENTATION: technical documentation, manuals, or detailed product descriptions. Moderate confidence.\nVENDOR_CLAIM: marketing material, website copy, or sales assertions without independent verification. Lowest confidence.\n\nEvidence quality (TRIAL > DEMO > DOCUMENTATION > VENDOR_CLAIM) is used to filter and rank results.',
        keywords: ['evidence', 'trial', 'demo', 'documentation', 'vendor claim', 'quality'],
      },
      {
        question: 'What is a Pedagogy Evaluator\'s age range assessment?',
        answer:
          'Pedagogy Evaluators must record the target age range they believe this platform is appropriate for (minimum and maximum age). This is separate from scoring and must be completed before a Pedagogy Evaluator can submit. If two Pedagogy Evaluators record different age ranges, an Age Range Conflict is created and must be resolved before the evaluation can be finalised.',
        keywords: ['age range', 'pedagogy', 'target age', 'conflict', 'submit'],
      },
      {
        question: 'When can I submit my scores?',
        answer:
          'You can submit when all requirements visible to you have a score (including N/A), and, if you are a Pedagogy Evaluator, your age range is set. Submission is the act of locking in your individual assessment. After submission you can still update your scores if the evaluation remains IN_PROGRESS, but you cannot change scores after the evaluation reaches MERGED.',
        keywords: ['submit', 'when', 'conditions', 'requirements', 'age range'],
      },
      {
        question: 'What is a Team Lead and what can they do?',
        answer:
          'A Team Lead is the senior member of a Pedagogy or Technical team. In addition to scoring, a Lead can:\n\n- Trigger an early merge: if the Lead has submitted and at least one evaluator from each team has submitted (but not all), the Lead can force the evaluation to MERGED before everyone has submitted.\n- Close conflict threads: Leads can close any open thread on requirements that belong to their team\'s evaluator type.\n\nLead status is set per assignment by an admin.',
        keywords: ['team lead', 'lead', 'merge', 'close thread', 'early merge'],
      },
      {
        question: 'How does the evaluation move from IN_PROGRESS to MERGED?',
        answer:
          'Once every assigned evaluator on both teams has submitted, the evaluation automatically advances to MERGED. Alternatively, the Team Lead can trigger an early merge if at least one evaluator from each team has submitted. When MERGED, cross-team scores become visible for the first time and any conflicts are surfaced.',
        keywords: ['merge', 'submit', 'transition', 'team lead', 'automatic'],
      },
      {
        question: 'What is a conflict?',
        answer:
          'A conflict occurs when two evaluators score the same requirement more than one point apart. When the evaluation merges, a conflict thread is created for each conflicting requirement. Threads must be closed before the evaluation can be finalised.',
        keywords: ['conflict', 'disagreement', 'thread', 'threshold', 'more than one point'],
      },
      {
        question: 'How are conflicts resolved?',
        answer:
          'In the MERGED view, open conflicts are listed first. Click "Resolve Conflict" on a requirement to open the conflict thread in a side panel. Team members can read each other\'s scores and evidence types, post messages to discuss, and update their own scores within the thread. A thread is closed when a Lead or Admin clicks "Close thread". If scores converge (the difference drops to 1 or less), the thread can be closed automatically. All threads must be closed before finalisation.',
        keywords: ['resolve', 'conflict', 'thread', 'discussion', 'close', 'merged'],
      },
      {
        question: 'What happens to the final score after conflict resolution?',
        answer:
          'SPACE does not auto-average scores. The final scores reflect genuine agreement: evaluators update their individual scores during the thread discussion until they reach consensus. The combined average used in the weighted percentage is derived from the actual submitted scores after the thread closes.',
        keywords: ['final score', 'average', 'consensus', 'conflict', 'resolution'],
      },
      {
        question: 'How is the evaluation finalised?',
        answer:
          'An Admin or Super Admin can finalise the evaluation once all conflict threads are closed and all age range conflicts are resolved. Click "Finalise" in the admin toolbar at the top of the MERGED view. A confirmation dialog appears before the evaluation is locked.',
        keywords: ['finalise', 'lock', 'admin', 'close threads', 'conditions'],
      },
      {
        question: 'Can a finalised evaluation be reopened?',
        answer:
          'Yes, but only by an Admin or Super Admin. Reopening the evaluation returns it to IN_PROGRESS, unlocks all scores, and creates a permanent audit log entry recording when and why it was reopened.',
        keywords: ['reopen', 'finalised', 'audit', 'admin', 'unlock'],
      },
      {
        question: 'How are scores saved? Do I lose work if I close the browser?',
        answer:
          'Scores are saved automatically the moment you click a score button, change the evidence type, or move focus away from the notes field. There is no manual save step. You can close the browser and return at any time; all your progress is preserved.',
        keywords: ['auto-save', 'save', 'progress', 'browser', 'close'],
      },
      {
        question: 'How are scores audited?',
        answer:
          'Every score is attributed to the submitting user and timestamped. Edits do not overwrite silently: each change creates a new ScoreAuditLog entry. The full history of every score is preserved and visible in the activity log in the MERGED view.',
        keywords: ['audit log', 'history', 'change tracking', 'timestamp'],
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring & Weights',
    description: 'How individual scores combine into the overall weighted percentage.',
    items: [
      {
        question: 'What does N/A mean in scoring?',
        answer:
          'N/A indicates the requirement does not apply to this platform, or the evaluator could not gather sufficient evidence to score it. N/A scores are excluded entirely from the weighted percentage: they contribute neither positively nor negatively. A requirement where all evaluators scored N/A does not appear in the denominator.',
        keywords: ['n/a', 'not applicable', 'excluded', 'calculation'],
      },
      {
        question: 'What are HIGH, MEDIUM, and LOW weights?',
        answer:
          'Each requirement carries a weight that reflects its importance to the evaluation. HIGH counts as a multiplier of 3, MEDIUM as 2, and LOW as 1. Weights are set globally per requirement but can be overridden per context.',
        keywords: ['weight', 'multiplier', 'high', 'medium', 'low', 'priority'],
      },
      {
        question: 'How is the weighted percentage calculated?',
        answer:
          'For each requirement that was scored (not N/A), multiply the combined average score by the weight multiplier. Sum these across all scored requirements to get the numerator. The denominator is the maximum possible: for regular requirements that is 4 multiplied by the weight multiplier, and for Compliance Gate requirements it is 1 multiplied by the weight multiplier. Divide numerator by denominator and multiply by 100.',
        keywords: ['formula', 'calculation', 'percentage', 'weighted', 'how'],
      },
      {
        question: 'What is the combined average score for a requirement?',
        answer:
          'When more than one evaluator scores the same requirement, the combined average is the mean of all their non-N/A scores. For BOTH-type requirements where both Pedagogy and Technical Evaluators score the same requirement, all non-N/A scores from both teams are averaged together.',
        keywords: ['combined', 'average', 'multiple evaluators', 'both'],
      },
      {
        question: 'What is a context-specific weight override?',
        answer:
          'A requirement\'s global weight (HIGH, MEDIUM, LOW) can be overridden for a single context. For example, "Data Export" might be HIGH globally but LOW for a specific K-12 reading context. When the Results dashboard is filtered by that context, the override weight is used in all calculations.',
        keywords: ['override', 'context', 'weight', 'context weight'],
      },
    ],
  },
  {
    id: 'compliance-gates',
    title: 'Compliance Gates',
    description: 'Hard pass-or-fail requirements that immediately disqualify a platform on failure.',
    items: [
      {
        question: 'What is a Compliance Gate?',
        answer:
          'A Compliance Gate is a requirement that is a hard pass-or-fail blocker. It is used for legal, safeguarding, accessibility, or privacy requirements where any failure is unacceptable regardless of the platform\'s performance elsewhere.',
        keywords: ['compliance gate', 'gate', 'blocker', 'mandatory', 'hard fail'],
      },
      {
        question: 'How are Compliance Gates scored in the PRD Tool Evaluator?',
        answer:
          'Compliance Gates use a binary Yes or No scale instead of the 0 to 4 scale used for regular requirements. Yes (1) means the requirement is met. No (0) means it is not met. Scoring No on any Compliance Gate immediately marks the platform as DISQUALIFIED server-side. The disqualification is enforced on every score submission, not only at the end.',
        keywords: ['compliance gate', 'yes', 'no', 'binary', 'scoring', 'prd'],
      },
      {
        question: 'What happens when a platform is DISQUALIFIED?',
        answer:
          'The platform is removed from all procurement comparisons and recommendations. Its weighted percentage is no longer shown in the Results dashboards (other than the Comparison view where disqualified platforms can be unhidden with the "Show disqualified" toggle). The disqualification is permanent unless the score is changed by reopening the evaluation.',
        keywords: ['disqualified', 'removed', 'comparison', 'procurement', 'effect'],
      },
      {
        question: 'Can I have multiple Compliance Gates?',
        answer:
          'Yes. Any requirement can be flagged as a Compliance Gate, and you can have as many as needed. Each one is evaluated independently. Any single failure immediately disqualifies the platform.',
        keywords: ['multiple', 'compliance gates', 'many'],
      },
    ],
  },
  {
    id: 'contexts',
    title: 'Contexts',
    description: 'Scope evaluations and results to specific use cases or learning scenarios.',
    items: [
      {
        question: 'What is a Context?',
        answer:
          'A Context is a named evaluation scenario, for example "Adult Beginner ESL", "K-12 Reading Intervention", or "Corporate Training". Contexts are used to filter the Results dashboards, define which requirements are relevant to a scenario, and optionally override requirement weights for that scenario.',
        keywords: ['context', 'scope', 'scenario', 'use case', 'what is'],
      },
      {
        question: 'Does a context affect what evaluators score?',
        answer:
          'No. Evaluators always score the full requirements set regardless of which contexts are assigned to a platform. Context filtering is applied only at the results and analytics layer.',
        keywords: ['context', 'evaluator', 'scoring', 'full set'],
      },
      {
        question: 'Can a platform belong to multiple contexts?',
        answer:
          'Yes. A platform can be tagged with as many contexts as are relevant. The Results dashboard context filter will then include that platform when any of its contexts is selected.',
        keywords: ['platform', 'multi-context', 'multiple contexts'],
      },
      {
        question: 'Can a requirement belong to multiple contexts?',
        answer:
          'Yes. A requirement can be linked to multiple contexts. Each link can carry its own optional weight override, so the same requirement can have different importance levels in different contexts.',
        keywords: ['requirement', 'multi-context', 'weight override'],
      },
      {
        question: 'How do contexts affect the Results dashboards?',
        answer:
          'Selecting a context in the Results filter narrows the comparison to platforms assigned to that context, restricts the scored requirements to those linked to that context, and applies any context-specific weight overrides. All weighted percentages are recalculated based on those filtered requirements and overrides.',
        keywords: ['results', 'filter', 'context', 'effect', 'dashboard'],
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
          'A Requirement is one evaluation criterion. It has a title, a description, an evaluator type (PEDAGOGY, TECHNICAL, or BOTH), a weight (HIGH, MEDIUM, or LOW), an optional category for grouping, a display order within that category, and an optional Compliance Gate flag.',
        keywords: ['requirement', 'criterion', 'definition', 'what is'],
      },
      {
        question: 'What does the evaluator type control?',
        answer:
          'PEDAGOGY: the requirement is visible only to Pedagogy Evaluators.\nTECHNICAL: the requirement is visible only to Technical Evaluators.\nBOTH: the requirement is scored independently by both teams. Both sets of scores are averaged together in the combined weighted percentage.',
        keywords: ['evaluator type', 'pedagogy', 'technical', 'both', 'visibility'],
      },
      {
        question: 'How do I add a requirement?',
        answer:
          'Admins can add requirements from Admin > Requirements by clicking "New Requirement". Fill in the form fields and save. New requirements appear in active evaluations immediately.',
        keywords: ['add', 'create', 'new requirement', 'admin'],
      },
      {
        question: 'Can I bulk import requirements?',
        answer:
          'Yes. From Admin > Requirements, click "Bulk Import" and upload an XLSX file. Download the template from the same dialog to ensure the correct format. The importer validates each row and reports individual failures without aborting the entire import.',
        keywords: ['bulk', 'xlsx', 'import', 'upload', 'template'],
      },
      {
        question: 'What is Display Order?',
        answer:
          'Display Order is the sort position of a requirement within its category. Lower numbers appear first. Use it to put the highest-priority items at the top of each category in both the evaluation workspace and the results tables.',
        keywords: ['order', 'sort', 'position', 'display order'],
      },
    ],
  },
  {
    id: 'results',
    title: 'Results & Analytics',
    description: 'How evaluation results are presented and interpreted.',
    items: [
      {
        question: 'What results views are available?',
        answer:
          'Final Report: the master pipeline ranking combining all four stage scores.\nComparison Table: a side-by-side weighted score view of all platforms.\nCategory Breakdown: bar or radar chart comparing platforms by requirement category.\nBest Fit: a procurement recommendation using a greedy set-cover algorithm.\nBuild Readiness: integration and API readiness scores ranked across platforms.',
        keywords: ['results', 'views', 'dashboards', 'overview'],
      },
      {
        question: 'What is the Final Report?',
        answer:
          'The Final Report shows platforms that have cleared all four pipeline stages, ranked by their weighted aggregate score. Each row shows the score for each stage plus the overall aggregate. A recommendation tier badge (TOP PICK, RECOMMENDED, CONSIDER, or NOT RECOMMENDED) is shown alongside the aggregate. Platforms still progressing through the pipeline are listed in a footnote.',
        keywords: ['final report', 'ranking', 'aggregate', 'tier', 'completed'],
      },
      {
        question: 'What do the recommendation tiers mean?',
        answer:
          'TOP PICK: 85% or higher. Strong recommendation.\nRECOMMENDED: 70% to 84%. Solid choice.\nCONSIDER: 50% to 69%. Has gaps but may suit specific needs.\nNOT RECOMMENDED: below 50%. Does not meet the threshold for adoption.\nDISQUALIFIED: failed a Compliance Gate requirement.',
        keywords: ['tier', 'recommendation', 'top pick', 'recommended', 'consider', 'not recommended'],
      },
      {
        question: 'What is the Comparison Table?',
        answer:
          'A side-by-side table of all platforms with their overall weighted percentage, per-category scores, compliance gate result, recommendation tier, and (if available) VITAL profile data. You can filter by context, platform, evaluation status, VITAL verdict, or age range. Disqualified platforms are hidden by default but can be shown with the "Show disqualified" toggle.',
        keywords: ['comparison', 'side by side', 'table', 'filter'],
      },
      {
        question: 'What is Best Fit?',
        answer:
          'Best Fit recommends the minimum combination of platforms that together cover the most weighted requirements. It uses a greedy set-cover algorithm: at each step it picks the platform that newly satisfies the most remaining requirements, stopping when no additional platform adds coverage or the set reaches five platforms. A requirement is "satisfied" when the best score in the current set is at least 75% of the maximum (3 out of 4 for regular requirements, 1 out of 1 for compliance gates).',
        keywords: ['best fit', 'combination', 'set cover', 'algorithm', 'complementary'],
      },
      {
        question: 'What is Build Readiness?',
        answer:
          'Build Readiness shows how each platform scores specifically on integration and API requirements. The score is drawn from requirements in the "Integration & APIs" category. It indicates how straightforward it would be to integrate each platform into an existing technical infrastructure.',
        keywords: ['build readiness', 'technical', 'integration', 'api', 'infrastructure'],
      },
      {
        question: 'What does Category Breakdown show?',
        answer:
          'A bar or radar chart comparing up to three platforms by their weighted percentage in each requirement category. Use it to spot where one platform clearly outperforms others in a specific area. The chart type can be toggled between bar and radar. Filters include context, category, evaluator type, and platform.',
        keywords: ['category', 'breakdown', 'bar', 'radar', 'chart', 'comparison'],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin & User Management',
    description: 'Responsibilities and tools for Admins and Super Admins.',
    items: [
      {
        question: 'What is the difference between Admin and Super Admin?',
        answer:
          'Admin can manage platforms, requirements, contexts, evaluations, and the VITAL catalogue, but cannot create or manage user accounts.\n\nSuper Admin has all Admin capabilities plus exclusive control over user management: creating accounts, approving or rejecting access requests, changing roles, deactivating users, and resetting passwords. Only one Super Admin account can exist at a time.',
        keywords: ['admin', 'super admin', 'difference', 'user management'],
      },
      {
        question: 'How do I create a new user account?',
        answer:
          'Only a Super Admin can create accounts. Go to Admin > Users and click "Create User". Fill in the name, email, team, and role, then save. A temporary password is generated and emailed to the new user automatically. The user will be required to change it on first login.',
        keywords: ['create user', 'new account', 'super admin', 'temporary password'],
      },
      {
        question: 'How do I approve an access request?',
        answer:
          'Go to Admin > Access Requests. Pending requests are listed first. Click "Approve" on a request to create the user account and send a temporary password email, or "Reject" to send a rejection notification. Only a Super Admin can approve or reject requests.',
        keywords: ['access request', 'approve', 'reject', 'super admin'],
      },
      {
        question: 'What is the Admin access toggle on a user?',
        answer:
          'The "Admin access" toggle grants an evaluator or viewer full platform management permissions (managing platforms, requirements, contexts, evaluations, and VITAL) on top of their existing role. It does not grant user management capabilities, which remain exclusive to Super Admin. The toggle is not available for users who already have an Admin or Super Admin role.',
        keywords: ['admin access', 'toggle', 'grant', 'permissions', 'evaluator'],
      },
      {
        question: 'How do I deactivate a user?',
        answer:
          'Go to Admin > Users, open the user\'s edit page, and toggle "Active" to off. Deactivated users cannot sign in, but their account and all associated evaluation history is preserved. Deactivating is preferred over deleting for users who have existing score or evaluation records.',
        keywords: ['deactivate', 'inactive', 'disable', 'user'],
      },
      {
        question: 'Can I delete a user?',
        answer:
          'Only if the user has no existing score or evaluation history. If a user has submitted any scores or been assigned to any evaluations, deletion is blocked. Deactivate them instead to preserve the data integrity of past evaluations.',
        keywords: ['delete', 'user', 'blocked', 'history'],
      },
      {
        question: 'How do I assign evaluators to a platform?',
        answer:
          'Go to Admin > Platforms, open the platform\'s edit page, and use the Evaluators section. Add Pedagogy and Technical evaluators for PRD evaluations, or a CEFR & VITAL Evaluator for CEFR and VITAL stages. Mark one evaluator per team as Team Lead. At least one evaluator of each relevant type must be assigned before the evaluation can begin.',
        keywords: ['assign', 'evaluators', 'platform', 'edit', 'team lead'],
      },
      {
        question: 'What does the Admin Dashboard show?',
        answer:
          'The Admin Dashboard provides a system-wide overview: a stat strip (total platforms, in-progress, merged, finalised), a pending access requests banner (Super Admin only), a stalled evaluations callout (MERGED evaluations with open conflict threads), an Evaluation Health table showing submission progress per team, a notifications panel, and a recent activity feed.',
        keywords: ['admin dashboard', 'overview', 'stats', 'health', 'notifications'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    description: 'Manage your own account details.',
    items: [
      {
        question: 'How do I change my password?',
        answer:
          'Click your name in the sidebar to open your Profile page. In the "Change Password" section, enter your current password, then your new password. Click Save.',
        keywords: ['password', 'change', 'update', 'profile'],
      },
      {
        question: 'How do I change my name or email?',
        answer:
          'Open your Profile page from the sidebar. Update the name or email fields under Identity and click Save. Email addresses must be unique across all accounts.',
        keywords: ['email', 'name', 'identity', 'update'],
      },
      {
        question: 'Who can change my role?',
        answer:
          'Only a Super Admin can change user roles. Roles control which sections of SPACE you can access, so changes are deliberately restricted to the Super Admin.',
        keywords: ['role', 'change', 'permission', 'super admin'],
      },
      {
        question: 'What happens on first login after a temporary password?',
        answer:
          'You will be redirected to a mandatory password change page before you can access any part of SPACE. Enter your temporary password in the "Current password" field and set a new permanent password. After saving, you are redirected to the main dashboard.',
        keywords: ['first login', 'temporary password', 'change password', 'mandatory'],
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
          'PDF: a full platform evaluation report including a cover, comparison table, category breakdown, best fit recommendation, build readiness scores, and requirement matrix.\nExcel (XLSX): raw tabular data for offline analysis.\nCSV: lightweight comma-separated format.',
        keywords: ['export', 'pdf', 'xlsx', 'csv', 'formats'],
      },
      {
        question: 'Can I export the Tool Scanner scoring matrix?',
        answer:
          'Yes. From the Scoring Matrix tab in Tool Scanner, click "Download Matrix" to get an XLSX file with platforms as columns and requirements as rows.',
        keywords: ['tool scanner', 'matrix', 'download', 'excel'],
      },
      {
        question: 'What does the PDF report contain?',
        answer:
          'A branded cover page, a side-by-side platform comparison, a per-category score breakdown, the Best Fit recommendation, Build Readiness scores, and the complete requirement-by-platform score matrix. Every page carries the SPACE wordmark and page number.',
        keywords: ['pdf', 'report', 'content', 'what is in'],
      },
    ],
  },
]
