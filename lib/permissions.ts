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
  | 'manage:platform'
  | 'access:admin'
  | 'access:evaluate'

const PERMISSIONS: Record<Action, Role[]> = {
  'view:dashboard':         ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  'view:results':           ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  // Score isolation: evaluators cannot see each other's scores until both sides submit
  'view:all_scores':        ['ADMIN', 'VIEWER'],
  'submit:pedagogy_score':  ['ADMIN', 'PEDAGOGY_EVALUATOR'],
  'submit:technical_score': ['ADMIN', 'TECHNICAL_EVALUATOR'],
  'lock:evaluation':        ['ADMIN'],
  'finalise:evaluation':    ['ADMIN'],
  'manage:users':           ['ADMIN'],
  'manage:platform':        ['ADMIN'],
  'access:admin':           ['ADMIN'],
  'access:evaluate':        ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR'],
}

export function canDo(role: Role, action: Action): boolean {
  return PERMISSIONS[action].includes(role)
}

export function canAccess(role: Role, section: 'admin' | 'evaluate'): boolean {
  return canDo(role, `access:${section}`)
}
