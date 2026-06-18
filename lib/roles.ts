import type { Role } from '@prisma/client'

// ─── Role display: single source of truth ───────────────────────────────────────
//
// The Role ENUM VALUES (PEDAGOGY_EVALUATOR, TECHNICAL_EVALUATOR, VITAL_EVALUATOR, …)
// are stored in the database and never change here - only the human-readable labels
// do. The pipeline rebrand maps:
//   PEDAGOGY_EVALUATOR  → "PRD - Pedagogical Evaluator"
//   TECHNICAL_EVALUATOR → "PRD - Technical Evaluator"
//   VITAL_EVALUATOR     → "CEFR & VITAL Evaluator"   (one pedagogy person does both)

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN:         'Super Admin',
  ADMIN:               'Administrator',
  PEDAGOGY_EVALUATOR:  'PRD - Pedagogical Evaluator',
  TECHNICAL_EVALUATOR: 'PRD - Technical Evaluator',
  VITAL_EVALUATOR:     'CEFR & VITAL Evaluator',
  VIEWER:              'Viewer',
}

// Compact labels for tight UI (sidebar header, conflict threads).
export const ROLE_SHORT_LABELS: Record<Role, string> = {
  SUPER_ADMIN:         'Super Admin',
  ADMIN:               'Admin',
  PEDAGOGY_EVALUATOR:  'PRD Pedagogy',
  TECHNICAL_EVALUATOR: 'PRD Technical',
  VITAL_EVALUATOR:     'CEFR & VITAL',
  VIEWER:              'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN:         'Full access including user account creation and management.',
  ADMIN:               'Full access to platforms, requirements, contexts, and evaluations. Cannot create accounts.',
  PEDAGOGY_EVALUATOR:  'Scores PRD pedagogy requirements.',
  TECHNICAL_EVALUATOR: 'Scores PRD technical requirements.',
  VITAL_EVALUATOR:     'Runs the CEFR and VITAL evaluations for assigned platforms.',
  VIEWER:              'Read-only access to results and dashboards.',
}

export const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN:         'bg-violet-100 text-violet-800 ring-violet-300/60',
  ADMIN:               'bg-emerald-100 text-emerald-800 ring-emerald-300/60',
  PEDAGOGY_EVALUATOR:  'bg-blue-100 text-blue-800 ring-blue-300/60',
  TECHNICAL_EVALUATOR: 'bg-amber-100 text-amber-800 ring-amber-300/60',
  VITAL_EVALUATOR:     'bg-teal-100 text-teal-800 ring-teal-300/60',
  VIEWER:              'bg-stone-100 text-stone-700 ring-stone-300/60',
}

export type RoleOption = { value: Role; label: string; description: string }

function opt(value: Role): RoleOption {
  return { value, label: ROLE_LABELS[value], description: ROLE_DESCRIPTIONS[value] }
}

// Every role, in display order (admin user-creation form).
export const ALL_ROLE_OPTIONS: RoleOption[] = [
  opt('SUPER_ADMIN'),
  opt('ADMIN'),
  opt('PEDAGOGY_EVALUATOR'),
  opt('TECHNICAL_EVALUATOR'),
  opt('VITAL_EVALUATOR'),
  opt('VIEWER'),
]

// Self-service access-request options (no admin/super-admin).
export const ACCESS_REQUEST_ROLE_OPTIONS: RoleOption[] = [
  opt('PEDAGOGY_EVALUATOR'),
  opt('TECHNICAL_EVALUATOR'),
  opt('VITAL_EVALUATOR'),
  opt('VIEWER'),
]
