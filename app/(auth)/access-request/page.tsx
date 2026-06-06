'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TEAM_OPTIONS = [
  { value: 'STRATEGY_1',              label: 'Strategy 1' },
  { value: 'STRATEGY_2',              label: 'Strategy 2' },
  { value: 'STRATEGY_3',              label: 'Strategy 3' },
  { value: 'STRATEGY_4',              label: 'Strategy 4' },
  { value: 'STRATEGY_5',              label: 'Strategy 5' },
  { value: 'STRATEGY_6',              label: 'Strategy 6' },
  { value: 'LEARNING_SCIENCES',       label: 'Learning Sciences' },
  { value: 'EMERGING_TECHNOLOGY',     label: 'Emerging Technology' },
  { value: 'RESEARCH_AND_INNOVATION', label: 'Research and Innovation Team' },
  { value: 'STEERING_COMMITTEE',      label: 'Steering Committee' },
]

const ROLE_OPTIONS = [
  { value: 'PEDAGOGY_EVALUATOR',  label: 'Pedagogy Evaluator',  description: 'Scores pedagogy requirements' },
  { value: 'TECHNICAL_EVALUATOR', label: 'Technical Evaluator', description: 'Scores technical requirements' },
  { value: 'VITAL_EVALUATOR',     label: 'VITAL Evaluator',     description: 'Manages the VITAL evaluation module' },
  { value: 'VIEWER',              label: 'Viewer',              description: 'Read-only access to results' },
]

type FieldErrors = {
  name?: string
  email?: string
  team?: string
  role?: string
  notes?: string
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-[12px] text-red-500 mt-1">{msg}</p>
}

function validateName(v: string): string | undefined {
  if (!v.trim()) return 'Full name is required'
  if (v.trim().length < 2) return 'Name must be at least 2 characters'
  if (!/^[\p{L}\s'\-.]+$/u.test(v.trim())) return 'Name can only contain letters, spaces, hyphens, and apostrophes'
}

function validateEmail(v: string): string | undefined {
  if (!v.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Please enter a valid email address'
}

export default function AccessRequestPage() {
  const [name,  setName]  = React.useState('')
  const [email, setEmail] = React.useState('')
  const [team,  setTeam]  = React.useState('')
  const [role,  setRole]  = React.useState('')
  const [requestAdmin, setRequestAdmin] = React.useState(false)
  const [notes, setNotes] = React.useState('')

  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done'>('idle')

  function touch(field: string) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  // Re-validate a field when it changes (only if already touched)
  React.useEffect(() => {
    if (!touched.name) return
    setErrors((e) => ({ ...e, name: validateName(name) }))
  }, [name, touched.name])

  React.useEffect(() => {
    if (!touched.email) return
    setErrors((e) => ({ ...e, email: validateEmail(email) }))
  }, [email, touched.email])

  React.useEffect(() => {
    if (!touched.team) return
    setErrors((e) => ({ ...e, team: team ? undefined : 'Please select your team' }))
  }, [team, touched.team])

  React.useEffect(() => {
    if (!touched.role) return
    setErrors((e) => ({ ...e, role: role ? undefined : 'Please select the role access you need' }))
  }, [role, touched.role])

  function validateAll(): FieldErrors {
    return {
      name:  validateName(name),
      email: validateEmail(email),
      team:  team ? undefined : 'Please select your team',
      role:  role ? undefined : 'Please select the role access you need',
      notes: notes.length > 500 ? 'Notes must be under 500 characters' : undefined,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Mark all fields touched so errors show
    setTouched({ name: true, email: true, team: true, role: true, notes: true })

    const fieldErrors = validateAll()
    setErrors(fieldErrors)
    if (Object.values(fieldErrors).some(Boolean)) return

    setStatus('loading')
    let succeeded = false
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), team, requestedRole: role, requestAdmin, notes: notes.trim() || undefined }),
      })

      if (res.ok) {
        succeeded = true
        setStatus('done')
        return
      }

      const data = await res.json().catch(() => ({}))

      // Map server field errors back to inline messages
      if (data.issues) {
        setErrors(data.issues)
      } else if (data.field) {
        setErrors((prev) => ({ ...prev, [data.field]: data.error }))
      } else {
        setErrors((prev) => ({ ...prev, email: data.error ?? 'Something went wrong. Please try again.' }))
      }
    } catch {
      setErrors((prev) => ({ ...prev, email: 'Something went wrong. Please try again.' }))
    } finally {
      if (!succeeded) setStatus('idle')
    }
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4">
      <div className="mb-8 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dome.svg" alt="SPACE" className="size-20" />
        <p className="mt-3 font-serif text-[28px] tracking-[0.18em] text-gold">SPACE</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white">
          Software Platform Analysis, Comparison, and Evaluation
        </p>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-[22px] tracking-tight text-emerald-950">
            Request access
          </CardTitle>
          <CardDescription>
            Fill in your details and a Super Admin will review your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'done' ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="size-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">Request submitted</p>
                <p className="text-sm text-stone-500 mt-1">
                  You will receive an email at <strong>{email}</strong> once your request has been reviewed.
                </p>
              </div>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Name */}
              <div className="space-y-1">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => touch('name')}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className={cn(touched.name && errors.name && 'border-red-400 focus-visible:ring-red-300')}
                />
                <FieldError msg={touched.name ? errors.name : undefined} />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch('email')}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  className={cn(touched.email && errors.email && 'border-red-400 focus-visible:ring-red-300')}
                />
                <FieldError msg={touched.email ? errors.email : undefined} />
              </div>

              {/* Team */}
              <div className="space-y-1">
                <Label htmlFor="team">Team</Label>
                <Select
                  value={team}
                  onValueChange={(v) => { setTeam(v); touch('team') }}
                >
                  <SelectTrigger
                    id="team"
                    className={cn(touched.team && errors.team && 'border-red-400 focus-visible:ring-red-300')}
                  >
                    <SelectValue placeholder="Select your team" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={touched.team ? errors.team : undefined} />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <Label htmlFor="role">Role access needed</Label>
                <Select
                  value={role}
                  onValueChange={(v) => { setRole(v); touch('role') }}
                >
                  <SelectTrigger
                    id="role"
                    className={cn(touched.role && errors.role && 'border-red-400 focus-visible:ring-red-300')}
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col py-0.5">
                          <span className="text-sm font-medium">{opt.label}</span>
                          <span className="text-[11px] text-stone-500">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={touched.role ? errors.role : undefined} />
              </div>

              {/* Admin access (additive) */}
              <label
                htmlFor="requestAdmin"
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
                  requestAdmin ? 'border-emerald-300 bg-emerald-50/60' : 'border-stone-200 hover:bg-stone-50',
                )}
              >
                <input
                  id="requestAdmin"
                  type="checkbox"
                  checked={requestAdmin}
                  onChange={(e) => setRequestAdmin(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-300"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-emerald-950">
                    Also request admin access
                  </span>
                  <span className="block text-[12px] text-stone-500">
                    Adds platform management on top of your role. A Super Admin must approve it.
                  </span>
                </span>
              </label>

              {/* Notes */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes">
                    Additional notes
                    <span className="ml-1 text-stone-400 font-normal">(optional)</span>
                  </Label>
                  <span className={cn('text-[11px] tabular-nums', notes.length > 480 ? 'text-amber-600' : 'text-stone-400')}>
                    {notes.length}/500
                  </span>
                </div>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => touch('notes')}
                  placeholder="Brief reason for access or any relevant context"
                  rows={3}
                  maxLength={500}
                  className={cn(touched.notes && errors.notes && 'border-red-400 focus-visible:ring-red-300')}
                />
                <FieldError msg={touched.notes ? errors.notes : undefined} />
              </div>

              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Submitting...' : 'Submit request'}
              </Button>

              <p className="text-center text-[13px] text-stone-500">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
