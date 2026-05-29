'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Role, Team } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALL_ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: 'SUPER_ADMIN',          label: 'Super Admin',          description: 'Full access including user account creation and management.' },
  { value: 'ADMIN',                label: 'Admin',                description: 'Full access to platforms, requirements, contexts, and evaluations. Cannot create accounts.' },
  { value: 'PEDAGOGY_EVALUATOR',   label: 'Pedagogy Evaluator',   description: 'Scores pedagogy requirements.' },
  { value: 'TECHNICAL_EVALUATOR',  label: 'Technical Evaluator',  description: 'Scores technical requirements.' },
  { value: 'VIEWER',               label: 'Viewer',               description: 'Read-only access to results and dashboards.' },
]

const TEAM_OPTIONS: { value: Team; label: string }[] = [
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

type UserData = {
  id: string
  email: string
  name: string
  role: Role
  team?: Team | null
  isActive: boolean
}

interface UserFormProps {
  mode: 'create' | 'edit'
  user?: UserData
  isSelf?: boolean
  currentUserRole: Role
}

export function UserForm({ mode, user, isSelf = false, currentUserRole }: UserFormProps) {
  const router = useRouter()
  const [name,     setName]     = React.useState(user?.name  ?? '')
  const [email,    setEmail]    = React.useState(user?.email ?? '')
  const [role,     setRole]     = React.useState<Role>(user?.role ?? 'PEDAGOGY_EVALUATOR')
  const [team,     setTeam]     = React.useState<Team | ''>((user?.team ?? '') as Team | '')
  const [isActive, setIsActive] = React.useState(user?.isActive ?? true)
  const [password, setPassword] = React.useState('')
  const [showPwd,  setShowPwd]  = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  // ADMIN cannot assign or see the SUPER_ADMIN option
  const roleOptions = currentUserRole === 'SUPER_ADMIN'
    ? ALL_ROLE_OPTIONS
    : ALL_ROLE_OPTIONS.filter(o => o.value !== 'SUPER_ADMIN')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required')
      return
    }

    if (mode === 'edit' && password.length > 0 && password.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      const url    = mode === 'create' ? '/api/users' : `/api/users/${user!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        role,
        team: team || null,
        isActive,
      }
      if (mode === 'edit' && password.length > 0) body.password = password

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? `Failed to ${mode === 'create' ? 'create' : 'update'} user`)
        return
      }

      toast.success(
        mode === 'create'
          ? 'User created — a temporary password has been sent to their email'
          : 'User updated',
      )
      router.push('/admin/users')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-stone-200/80 bg-white p-6">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          autoComplete="off"
          required
        />
        <p className="text-[11px] text-stone-400">Used for login. Must be unique.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="team">Team</Label>
        <Select value={team} onValueChange={(v) => setTeam(v as Team)}>
          <SelectTrigger id="team">
            <SelectValue placeholder="Select team (optional)" />
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
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSelf && mode === 'edit'}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-[11px] text-stone-500">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && mode === 'edit' && (
          <p className="text-[11px] text-amber-700">You cannot change your own role.</p>
        )}
      </div>

      {mode === 'create' ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-[13px] text-emerald-800">
          A temporary password will be generated and emailed to the user. They will be required to set a new password on first sign-in.
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="password">
            New password
            <span className="text-stone-400 font-normal ml-1">(leave blank to keep current)</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
              tabIndex={-1}
            >
              {showPwd ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>
      )}

      <div className={cn(
        'flex items-center justify-between rounded-md border px-4 py-3 transition-colors',
        isActive
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-stone-200/80 bg-stone-100/60',
      )}>
        <div className="space-y-0.5">
          <Label
            htmlFor="isActive"
            className={cn('text-sm font-medium', isActive ? 'text-emerald-800' : 'text-stone-500')}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Label>
          <p className="text-[11px] text-stone-500">
            {isActive ? 'User can sign in and access the platform.' : 'Sign-in disabled. Account is preserved.'}
          </p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={isSelf && mode === 'edit'}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/users">Cancel</Link>
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
