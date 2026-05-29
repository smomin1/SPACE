'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  { value: 'ADMIN',                label: 'Admin' },
  { value: 'PEDAGOGY_EVALUATOR',   label: 'Pedagogy Evaluator' },
  { value: 'TECHNICAL_EVALUATOR',  label: 'Technical Evaluator' },
  { value: 'VIEWER',               label: 'Viewer' },
]

export default function AccessRequestPage() {
  const [name,  setName]  = React.useState('')
  const [email, setEmail] = React.useState('')
  const [team,  setTeam]  = React.useState('')
  const [role,  setRole]  = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!team || !role) {
      setErrorMsg('Please select a team and role.')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, team, requestedRole: role, notes: notes || undefined }),
      })
      if (res.ok) {
        setStatus('done')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Something went wrong.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Something went wrong.')
      setStatus('error')
    }
  }

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
              <p className="text-sm text-emerald-800">
                Your request has been submitted. You will receive an email once it has been reviewed.
              </p>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger id="team">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role access needed</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Additional notes
                  <span className="ml-1 text-stone-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Brief reason for access or any relevant context…"
                  rows={3}
                  maxLength={500}
                />
              </div>
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Submitting…' : 'Submit request'}
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
