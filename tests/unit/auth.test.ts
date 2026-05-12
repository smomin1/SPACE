import { describe, expect, it } from 'vitest'
import { canDo } from '@/lib/permissions'
import type { Action } from '@/lib/permissions'

const ALL_ACTIONS: Action[] = [
  'view:dashboard',
  'view:results',
  'view:all_scores',
  'submit:pedagogy_score',
  'submit:technical_score',
  'lock:evaluation',
  'finalise:evaluation',
  'manage:users',
  'manage:platform',
  'access:admin',
  'access:evaluate',
]

describe('canDo()', () => {
  describe('ADMIN', () => {
    it('is allowed every action', () => {
      for (const action of ALL_ACTIONS) {
        expect(canDo('ADMIN', action), action).toBe(true)
      }
    })
  })

  describe('VIEWER', () => {
    it('can view dashboard, results, and all scores', () => {
      expect(canDo('VIEWER', 'view:dashboard')).toBe(true)
      expect(canDo('VIEWER', 'view:results')).toBe(true)
      expect(canDo('VIEWER', 'view:all_scores')).toBe(true)
    })

    it('cannot access admin or evaluate sections', () => {
      expect(canDo('VIEWER', 'access:admin')).toBe(false)
      expect(canDo('VIEWER', 'access:evaluate')).toBe(false)
    })

    it('cannot submit scores, lock, or finalise', () => {
      expect(canDo('VIEWER', 'submit:pedagogy_score')).toBe(false)
      expect(canDo('VIEWER', 'submit:technical_score')).toBe(false)
      expect(canDo('VIEWER', 'lock:evaluation')).toBe(false)
      expect(canDo('VIEWER', 'finalise:evaluation')).toBe(false)
    })

    it('cannot manage users or platform', () => {
      expect(canDo('VIEWER', 'manage:users')).toBe(false)
      expect(canDo('VIEWER', 'manage:platform')).toBe(false)
    })
  })

  describe('PEDAGOGY_EVALUATOR', () => {
    it('can view dashboard and results', () => {
      expect(canDo('PEDAGOGY_EVALUATOR', 'view:dashboard')).toBe(true)
      expect(canDo('PEDAGOGY_EVALUATOR', 'view:results')).toBe(true)
    })

    it('can access the evaluate section', () => {
      expect(canDo('PEDAGOGY_EVALUATOR', 'access:evaluate')).toBe(true)
    })

    it('can submit pedagogy scores but not technical scores', () => {
      expect(canDo('PEDAGOGY_EVALUATOR', 'submit:pedagogy_score')).toBe(true)
      expect(canDo('PEDAGOGY_EVALUATOR', 'submit:technical_score')).toBe(false)
    })

    it('cannot see all scores (score isolation)', () => {
      expect(canDo('PEDAGOGY_EVALUATOR', 'view:all_scores')).toBe(false)
    })

    it('cannot access admin section', () => {
      expect(canDo('PEDAGOGY_EVALUATOR', 'access:admin')).toBe(false)
    })

    it('cannot lock, finalise, or manage', () => {
      expect(canDo('PEDAGOGY_EVALUATOR', 'lock:evaluation')).toBe(false)
      expect(canDo('PEDAGOGY_EVALUATOR', 'finalise:evaluation')).toBe(false)
      expect(canDo('PEDAGOGY_EVALUATOR', 'manage:users')).toBe(false)
      expect(canDo('PEDAGOGY_EVALUATOR', 'manage:platform')).toBe(false)
    })
  })

  describe('TECHNICAL_EVALUATOR', () => {
    it('can view dashboard and results', () => {
      expect(canDo('TECHNICAL_EVALUATOR', 'view:dashboard')).toBe(true)
      expect(canDo('TECHNICAL_EVALUATOR', 'view:results')).toBe(true)
    })

    it('can access the evaluate section', () => {
      expect(canDo('TECHNICAL_EVALUATOR', 'access:evaluate')).toBe(true)
    })

    it('can submit technical scores but not pedagogy scores', () => {
      expect(canDo('TECHNICAL_EVALUATOR', 'submit:technical_score')).toBe(true)
      expect(canDo('TECHNICAL_EVALUATOR', 'submit:pedagogy_score')).toBe(false)
    })

    it('cannot see all scores (score isolation)', () => {
      expect(canDo('TECHNICAL_EVALUATOR', 'view:all_scores')).toBe(false)
    })

    it('cannot access admin section', () => {
      expect(canDo('TECHNICAL_EVALUATOR', 'access:admin')).toBe(false)
    })

    it('cannot lock, finalise, or manage', () => {
      expect(canDo('TECHNICAL_EVALUATOR', 'lock:evaluation')).toBe(false)
      expect(canDo('TECHNICAL_EVALUATOR', 'finalise:evaluation')).toBe(false)
      expect(canDo('TECHNICAL_EVALUATOR', 'manage:users')).toBe(false)
      expect(canDo('TECHNICAL_EVALUATOR', 'manage:platform')).toBe(false)
    })
  })
})
