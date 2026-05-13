'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LicenceType, EvaluatorType, type Role } from '@prisma/client'
import { platformBaseSchema, type PlatformFormValues } from '@/lib/platform-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { XIcon } from 'lucide-react'

const LICENCE_LABELS: Record<LicenceType, string> = {
  PERPETUAL: 'Perpetual',
  SUBSCRIPTION: 'Subscription',
  PER_SEAT: 'Per Seat',
  SITE_LICENCE: 'Site Licence',
  OPEN_SOURCE: 'Open Source',
}

type UserOption = { id: string; name: string; email: string; role: Role }

export type EvaluatorAssignment = {
  userId: string
  name: string
  email: string
  evaluatorType: EvaluatorType
}

interface PlatformFormProps {
  defaultValues?: Partial<PlatformFormValues>
  platformId?: string
  initialEvaluators?: EvaluatorAssignment[]
  users: UserOption[]
}

export function PlatformForm({
  defaultValues,
  platformId,
  initialEvaluators = [],
  users,
}: PlatformFormProps) {
  const router = useRouter()
  const isEdit = !!platformId

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PlatformFormValues>({
    resolver: zodResolver(platformBaseSchema) as import('react-hook-form').Resolver<PlatformFormValues>,
    defaultValues: { trialAvailable: false, ...defaultValues },
  })

  const trialAvailable = watch('trialAvailable')

  const [evaluators, setEvaluators] = React.useState<EvaluatorAssignment[]>(initialEvaluators)
  const [evalError, setEvalError] = React.useState<string | null>(null)
  const [pedagogyOpen, setPedagogyOpen] = React.useState(false)
  const [technicalOpen, setTechnicalOpen] = React.useState(false)

  function addEvaluator(user: UserOption, type: EvaluatorType) {
    if (evaluators.some((e) => e.userId === user.id)) return
    setEvaluators((prev) => [
      ...prev,
      { userId: user.id, name: user.name, email: user.email, evaluatorType: type },
    ])
    setEvalError(null)
  }

  function removeEvaluator(userId: string) {
    setEvaluators((prev) => prev.filter((e) => e.userId !== userId))
  }

  function validateEvaluators(): boolean {
    const hasPedagogy = evaluators.some((e) => e.evaluatorType === EvaluatorType.PEDAGOGY)
    const hasTechnical = evaluators.some((e) => e.evaluatorType === EvaluatorType.TECHNICAL)
    if (!hasPedagogy || !hasTechnical) {
      setEvalError('At least one Pedagogy and one Technical evaluator are required.')
      return false
    }
    return true
  }

  async function onSubmit(data: PlatformFormValues) {
    if (!validateEvaluators()) return
    setEvalError(null)

    const url = isEdit ? `/api/platforms/${platformId}` : '/api/platforms'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError('root', { message: json.error ?? 'Save failed. Please try again.' })
      return
    }

    const { platform } = await res.json()
    const pid: string = platformId ?? platform.id

    // Sync evaluators: replace all
    const existing = isEdit
      ? await fetch(`/api/platforms/${pid}/evaluators`)
          .then((r) => r.json())
          .then((d) => d.evaluators as { id: string; userId: string }[])
          .catch(() => [])
      : []

    for (const e of existing) {
      await fetch(`/api/platforms/${pid}/evaluators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: e.userId, evaluatorType: 'PEDAGOGY', action: 'remove' }),
      })
    }

    for (const e of evaluators) {
      await fetch(`/api/platforms/${pid}/evaluators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: e.userId, evaluatorType: e.evaluatorType, action: 'assign' }),
      })
    }

    router.push('/admin/platforms')
    router.refresh()
  }

  const pedagogyUsers = users.filter((u) => u.role === 'PEDAGOGY_EVALUATOR' || u.role === 'ADMIN')
  const technicalUsers = users.filter((u) => u.role === 'TECHNICAL_EVALUATOR' || u.role === 'ADMIN')
  const assignedUserIds = new Set(evaluators.map((e) => e.userId))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

      {/* ── Section 1: Platform Details ─────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Platform Details</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="e.g. Acme Learning Suite" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vendor">Vendor *</Label>
          <Input id="vendor" {...register('vendor')} placeholder="e.g. Acme Corp" />
          {errors.vendor && <p className="text-sm text-destructive">{errors.vendor.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Licence Type</Label>
          <Select
            onValueChange={(v) => setValue('licenceType', v as LicenceType)}
            defaultValue={defaultValues?.licenceType}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select licence type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LICENCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="trialAvailable"
            checked={trialAvailable}
            onCheckedChange={(v) => setValue('trialAvailable', v)}
          />
          <Label htmlFor="trialAvailable">Trial available</Label>
        </div>
      </div>

      <Separator />

      {/* ── Section 2: Evaluator Assignment ─────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Evaluators</h2>
        <p className="text-sm text-muted-foreground">
          Assign at least one Pedagogy and one Technical evaluator.
        </p>

        {/* Pedagogy */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pedagogy</Label>
          <div className="flex flex-wrap gap-2">
            {evaluators
              .filter((e) => e.evaluatorType === EvaluatorType.PEDAGOGY)
              .map((e) => (
                <span
                  key={e.userId}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  {e.name}
                  <button type="button" onClick={() => removeEvaluator(e.userId)}>
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            <Popover open={pedagogyOpen} onOpenChange={setPedagogyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">+ Add</Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1">
                {pedagogyUsers
                  .filter((u) => !assignedUserIds.has(u.id))
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex cursor-pointer flex-col rounded-sm px-2 py-1.5 hover:bg-accent"
                      onClick={() => { addEvaluator(u, EvaluatorType.PEDAGOGY); setPedagogyOpen(false) }}
                    >
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  ))}
                {pedagogyUsers.filter((u) => !assignedUserIds.has(u.id)).length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">No available users.</p>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Technical */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Technical</Label>
          <div className="flex flex-wrap gap-2">
            {evaluators
              .filter((e) => e.evaluatorType === EvaluatorType.TECHNICAL)
              .map((e) => (
                <span
                  key={e.userId}
                  className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                >
                  {e.name}
                  <button type="button" onClick={() => removeEvaluator(e.userId)}>
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            <Popover open={technicalOpen} onOpenChange={setTechnicalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">+ Add</Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1">
                {technicalUsers
                  .filter((u) => !assignedUserIds.has(u.id))
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex cursor-pointer flex-col rounded-sm px-2 py-1.5 hover:bg-accent"
                      onClick={() => { addEvaluator(u, EvaluatorType.TECHNICAL); setTechnicalOpen(false) }}
                    >
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  ))}
                {technicalUsers.filter((u) => !assignedUserIds.has(u.id)).length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">No available users.</p>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {evalError && <p className="text-sm text-destructive">{evalError}</p>}
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Platform'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
