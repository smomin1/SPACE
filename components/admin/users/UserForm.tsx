'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Role } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: 'ADMIN',               label: 'Admin',               description: 'Full access, manages users, platforms, requirements, and finalises evaluations.' },
  { value: 'PEDAGOGY_EVALUATOR',  label: 'Pedagogy Evaluator',  description: 'Scores pedagogy requirements.' },
  { value: 'TECHNICAL_EVALUATOR', label: 'Technical Evaluator', description: 'Scores technical requirements.' },
  { value: 'VIEWER',              label: 'Viewer',              description: 'Read-only access to results and dashboards.' },
]

type UserData = {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
}

interface UserFormProps {
  mode: 'create' | 'edit'
  user?: UserData
  isSelf?: boolean
}

export function UserForm({ mode, user, isSelf = false }: UserFormProps) {
  const router = useRouter()
  const [name,     setName]     = React.useState(user?.name  ?? '')
  const [email,    setEmail]    = React.useState(user?.email ?? '')
  const [role,     setRole]     = React.useState<Role>(user?.role ?? 'PEDAGOGY_EVALUATOR')
  const [isActive, setIsActive] = React.useState(user?.isActive ?? true)
  const [password, setPassword] = React.useState('')
  const [showPwd,  setShowPwd]  = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required')
      return
    }

    if (mode === 'create' && password.length < 8) {
      toast.error('Password must be at least 8 characters')
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

      const body: Record<string, unknown> = { name: name.trim(), email: email.trim(), role, isActive }
      if (password.length > 0) body.password = password

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

      toast.success(mode === 'create' ? 'User created' : 'User updated')
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
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSelf && mode === 'edit'}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
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

      <div className="space-y-2">
        <Label htmlFor="password">
          {mode === 'create' ? 'Password' : 'New password'}
          {mode === 'edit' && <span className="text-stone-400 font-normal ml-1">(leave blank to keep current)</span>}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'create' ? 'At least 8 characters' : '••••••••'}
            autoComplete="new-password"
            required={mode === 'create'}
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

      <div className="flex items-center justify-between rounded-md border border-stone-200/80 bg-stone-50/40 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="isActive" className="text-sm">Active</Label>
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
