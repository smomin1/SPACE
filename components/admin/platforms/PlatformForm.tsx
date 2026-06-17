'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LicenceType, EvaluatorType, EvaluationTrack, type Role } from '@prisma/client'
import { platformBaseSchema, type PlatformFormValues } from '@/lib/platform-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { XIcon, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  isLead: boolean
}

// ── Evaluator section sub-component ─────────────────────────────────────────

function EvaluatorSection({
  label,
  type,
  evaluators,
  available,
  open,
  onOpenChange,
  onAdd,
  onRemove,
  onToggleLead,
}: {
  label: string
  type: EvaluatorType
  evaluators: EvaluatorAssignment[]
  available: UserOption[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (u: UserOption) => void
  onRemove: (userId: string) => void
  onToggleLead: (userId: string) => void
}) {
  const members = evaluators.filter((e) => e.evaluatorType === type)
  const showLeadToggle = members.length > 1

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {members.map((e) => (
          <span
            key={e.userId}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-100/80 ring-1 ring-inset ring-stone-200 px-2 h-[26px] text-[11.5px] font-medium tracking-tight text-emerald-950"
          >
            {showLeadToggle && (
              <button
                type="button"
                title={e.isLead ? 'Team lead' : 'Set as lead'}
                onClick={() => onToggleLead(e.userId)}
                className="shrink-0 transition-colors"
              >
                <Star
                  className={cn(
                    'size-3',
                    e.isLead
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-stone-300 hover:text-amber-400'
                  )}
                />
              </button>
            )}
            {e.isLead && !showLeadToggle && (
              <Star className="size-3 fill-amber-400 text-amber-500 shrink-0" />
            )}
            {e.name}
            <button
              type="button"
              onClick={() => onRemove(e.userId)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-[26px] text-xs border-stone-200">
              + Add
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            {available.length > 0 ? (
              available.map((u) => (
                <div
                  key={u.id}
                  className="flex cursor-pointer flex-col rounded-sm px-2 py-1.5 hover:bg-stone-50"
                  onClick={() => onAdd(u)}
                >
                  <span className="text-sm font-medium text-emerald-950">{u.name}</span>
                  <span className="text-xs text-stone-400 font-mono">{u.email}</span>
                </div>
              ))
            ) : (
              <p className="p-2 text-sm text-stone-400">No available users.</p>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

type VitalToolOption = { id: string; name: string }

interface PlatformFormProps {
  defaultValues?: Partial<PlatformFormValues>
  platformId?: string
  initialEvaluators?: EvaluatorAssignment[]
  users: UserOption[]
  /** Available VITAL apps to link (Tool track only, excludes assessment tools) */
  vitalTools?: VitalToolOption[]
  /** ID of the VITAL tool already linked to this platform (edit mode) */
  linkedVitalToolId?: string | null
  /** Where to redirect after save (defaults to /evaluations for new, /admin/platforms for edit) */
  backHref?: string
}

export function PlatformForm({
  defaultValues,
  platformId,
  initialEvaluators = [],
  users,
  vitalTools = [],
  linkedVitalToolId = null,
  backHref,
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
    defaultValues: { trialAvailable: false, track: EvaluationTrack.TOOL, ...defaultValues },
  })

  const trialAvailable = watch('trialAvailable')
  const track = watch('track') ?? EvaluationTrack.TOOL
  const isVital = track === EvaluationTrack.VITAL
  const isCefr = track === EvaluationTrack.CEFR

  const [evaluators, setEvaluators] = React.useState<EvaluatorAssignment[]>(initialEvaluators)
  const [evalError, setEvalError] = React.useState<string | null>(null)
  const [pedagogyOpen, setPedagogyOpen] = React.useState(false)
  const [technicalOpen, setTechnicalOpen] = React.useState(false)
  const [vitalOpen, setVitalOpen] = React.useState(false)
  const [cefrOpen, setCefrOpen] = React.useState(false)
  const [vitalToolId, setVitalToolId] = React.useState<string | null>(linkedVitalToolId)

  function addEvaluator(user: UserOption, type: EvaluatorType) {
    if (evaluators.some((e) => e.userId === user.id)) return
    // First of this type becomes lead automatically
    const isFirstOfType = !evaluators.some((e) => e.evaluatorType === type)
    setEvaluators((prev) => [
      ...prev,
      { userId: user.id, name: user.name, email: user.email, evaluatorType: type, isLead: isFirstOfType },
    ])
    setEvalError(null)
  }

  function removeEvaluator(userId: string) {
    setEvaluators((prev) => {
      const next = prev.filter((e) => e.userId !== userId)
      const removed = prev.find((e) => e.userId === userId)
      // If we removed the lead, promote the first remaining member of that team
      if (removed?.isLead) {
        const firstOfType = next.find((e) => e.evaluatorType === removed.evaluatorType)
        if (firstOfType) firstOfType.isLead = true
      }
      return [...next]
    })
  }

  function toggleLead(userId: string) {
    setEvaluators((prev) => {
      const target = prev.find((e) => e.userId === userId)
      if (!target || target.isLead) return prev // already lead, no-op
      return prev.map((e) =>
        e.evaluatorType === target.evaluatorType
          ? { ...e, isLead: e.userId === userId }
          : e
      )
    })
  }

  function validateEvaluators(): boolean {
    if (isVital) {
      // A VITAL platform is satisfied by EITHER an assigned evaluator (who fills the
      // profile) OR a linked existing VITAL assessment that's already been completed.
      const hasVital = evaluators.some((e) => e.evaluatorType === EvaluatorType.VITAL)
      if (!hasVital && !vitalToolId) {
        setEvalError('Assign at least one VITAL evaluator, or link an existing VITAL assessment.')
        return false
      }
      return true
    }
    if (isCefr) {
      const hasCefr = evaluators.some((e) => e.evaluatorType === EvaluatorType.CEFR)
      if (!hasCefr) {
        setEvalError('At least one CEFR evaluator is required.')
        return false
      }
      return true
    }
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
        body: JSON.stringify({ userId: e.userId, evaluatorType: e.evaluatorType, isLead: e.isLead, action: 'assign' }),
      })
    }

    // On create with CEFR track, initialise a CefrEvaluation record
    if (!isEdit && isCefr) {
      await fetch('/api/cefr/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId: pid }),
      })
    }

    // On create, auto-create an Evaluation with all assigned evaluators
    if (!isEdit) {
      await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: pid,
          evaluators: evaluators.map(e => ({
            userId: e.userId,
            evaluatorType: e.evaluatorType,
            isLead: e.isLead,
          })),
        }),
      })
    }

    // Sync VITAL app link (Tool + VITAL tracks; field is only shown when vitalTools.length > 0)
    if (!isCefr && vitalTools.length > 0) {
      await fetch(`/api/platforms/${pid}/vital-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitalToolId }),
      })
    }

    const destination = backHref ?? (isEdit ? '/admin/platforms' : '/evaluations')
    router.push(destination)
    router.refresh()
  }

  const pedagogyUsers = users.filter((u) => u.role === 'PEDAGOGY_EVALUATOR' || u.role === 'ADMIN')
  const technicalUsers = users.filter((u) => u.role === 'TECHNICAL_EVALUATOR' || u.role === 'ADMIN')
  const vitalUsers = users.filter((u) => u.role === 'VITAL_EVALUATOR' || u.role === 'ADMIN')
  const assignedUserIds = new Set(evaluators.map((e) => e.userId))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

      {/* ── Section 1: Platform Details ─────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Platform Details</h2>

        {/* Evaluation track, chosen at registration, fixed thereafter. */}
        <div className="space-y-1.5">
          <Label>Evaluation track</Label>
          {isEdit ? (
            <div className="flex h-9 w-fit items-center rounded-md border border-stone-200 bg-stone-50 px-3 text-[13px] text-stone-700">
              {isVital ? 'VITAL' : isCefr ? 'CEFR Evaluations' : 'Tool Evaluator'}
            </div>
          ) : (
            <div className="inline-flex rounded-md border border-stone-200 p-0.5">
              {[
                { value: EvaluationTrack.TOOL, label: 'Tool Evaluator' },
                { value: EvaluationTrack.VITAL, label: 'VITAL' },
                { value: EvaluationTrack.CEFR, label: 'CEFR Evaluations' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setValue('track', opt.value); setEvaluators([]); setEvalError(null) }}
                  className={cn(
                    'rounded px-3 h-8 text-[13px] font-medium transition-colors',
                    track === opt.value
                      ? 'bg-emerald-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {isVital
              ? 'A VITAL evaluator fills the tool profile; the recommendation engine reruns on submit.'
              : isCefr
              ? 'A CEFR evaluator conducts the language-alignment evaluation.'
              : 'Scored independently by Pedagogy and Technical evaluators.'}
          </p>
        </div>

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

        {/* VITAL app link - Tool track (enrich Results) and VITAL track (use an
            already-completed assessment instead of assigning a fresh evaluator). */}
        {!isCefr && vitalTools.length > 0 && (
          <div className="space-y-1.5">
            <Label>{isVital ? 'Link an existing VITAL assessment' : 'Linked VITAL app'}</Label>
            <Select
              value={vitalToolId ?? '__none__'}
              onValueChange={(v) => setVitalToolId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {vitalTools.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isVital
                ? 'Optional: link a VITAL assessment that has already been completed instead of assigning an evaluator. Its score feeds the pipeline directly.'
                : 'Link this platform to its VITAL catalogue entry so VITAL attributes appear in Results.'}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Section 2: Evaluator Assignment ─────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Evaluators</h2>
        <p className="text-sm text-muted-foreground">
          {isVital
            ? 'Assign at least one VITAL evaluator. They fill the VITAL profile after registration.'
            : isCefr
            ? 'Assign at least one CEFR evaluator to conduct the language-alignment evaluation.'
            : 'Assign at least one Pedagogy and one Technical evaluator.'}
        </p>

        {isVital ? (
          <EvaluatorSection
            label="VITAL"
            type={EvaluatorType.VITAL}
            evaluators={evaluators}
            available={vitalUsers.filter((u) => !assignedUserIds.has(u.id))}
            open={vitalOpen}
            onOpenChange={setVitalOpen}
            onAdd={(u) => { addEvaluator(u, EvaluatorType.VITAL); setVitalOpen(false) }}
            onRemove={removeEvaluator}
            onToggleLead={toggleLead}
          />
        ) : isCefr ? (
          <EvaluatorSection
            label="CEFR Evaluator"
            type={EvaluatorType.CEFR}
            evaluators={evaluators}
            available={vitalUsers.filter((u) => !assignedUserIds.has(u.id))}
            open={cefrOpen}
            onOpenChange={setCefrOpen}
            onAdd={(u) => { addEvaluator(u, EvaluatorType.CEFR); setCefrOpen(false) }}
            onRemove={removeEvaluator}
            onToggleLead={toggleLead}
          />
        ) : (
          <>
            <EvaluatorSection
              label="Pedagogy"
              type={EvaluatorType.PEDAGOGY}
              evaluators={evaluators}
              available={pedagogyUsers.filter((u) => !assignedUserIds.has(u.id))}
              open={pedagogyOpen}
              onOpenChange={setPedagogyOpen}
              onAdd={(u) => { addEvaluator(u, EvaluatorType.PEDAGOGY); setPedagogyOpen(false) }}
              onRemove={removeEvaluator}
              onToggleLead={toggleLead}
            />
            <EvaluatorSection
              label="Technical"
              type={EvaluatorType.TECHNICAL}
              evaluators={evaluators}
              available={technicalUsers.filter((u) => !assignedUserIds.has(u.id))}
              open={technicalOpen}
              onOpenChange={setTechnicalOpen}
              onAdd={(u) => { addEvaluator(u, EvaluatorType.TECHNICAL); setTechnicalOpen(false) }}
              onRemove={removeEvaluator}
              onToggleLead={toggleLead}
            />
          </>
        )}

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
