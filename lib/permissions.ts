import type { Role } from '@prisma/client'

export type { Role }

export type Action =
  | 'view:dashboard'
  | 'view:results'
  | 'view:all_scores'
  | 'submit:pedagogy_score'
  | 'submit:technical_score'
  | 'lock:evaluation'
  | 'finalise:evaluation'
  | 'manage:users'
  | 'create:users'
  | 'manage:platform'
  | 'manage:requirements'
  | 'manage:contexts'
  | 'access:admin'
  | 'access:evaluate'
  | 'view:vital'
  | 'manage:vital'

const PERMISSIONS: Record<Action, Role[]> = {
  'view:dashboard':         ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  'view:results':           ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  // Score isolation: evaluators cannot see each other's scores until both sides submit
  'view:all_scores':        ['SUPER_ADMIN', 'ADMIN', 'VIEWER'],
  'submit:pedagogy_score':  ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR'],
  'submit:technical_score': ['SUPER_ADMIN', 'ADMIN', 'TECHNICAL_EVALUATOR'],
  'lock:evaluation':        ['SUPER_ADMIN', 'ADMIN'],
  'finalise:evaluation':    ['SUPER_ADMIN', 'ADMIN'],
  'manage:users':           ['SUPER_ADMIN'],
  'create:users':           ['SUPER_ADMIN'],
  'manage:platform':        ['SUPER_ADMIN', 'ADMIN'],
  'manage:requirements':    ['SUPER_ADMIN', 'ADMIN'],
  'manage:contexts':        ['SUPER_ADMIN', 'ADMIN'],
  'access:admin':           ['SUPER_ADMIN', 'ADMIN'],
  'access:evaluate':        ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR'],
  // VITAL module: everyone can view. Catalogue administration (tools,
  // recommendations, levels, skills, import) is Super Admin / Admin only.
  // VITAL evaluators do not manage the catalogue; they submit evaluations
  // through the evaluate flow (gated by access:evaluate), which the server
  // authorises per-assignment.
  'view:vital':             ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  'manage:vital':           ['SUPER_ADMIN', 'ADMIN'],
}

export function canDo(role: Role, action: Action): boolean {
  return PERMISSIONS[action].includes(role)
}

export function canAccess(role: Role, section: 'admin' | 'evaluate'): boolean {
  return canDo(role, `access:${section}`)
}
