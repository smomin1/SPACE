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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { XIcon, PlusIcon } from 'lucide-react'
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
    resolver: zodResolver(
      platformBaseSchema,
    ) as import('react-hook-form').Resolver<PlatformFormValues>,
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
        body: JSON.stringify({
          userId: e.userId,
          evaluatorType: 'PEDAGOGY',
          action: 'remove',
        }),
      })
    }

    for (const e of evaluators) {
      await fetch(`/api/platforms/${pid}/evaluators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: e.userId,
          evaluatorType: e.evaluatorType,
          action: 'assign',
        }),
      })
    }

    router.push('/admin/platforms')
    router.refresh()
  }

  const pedagogyUsers = users.filter(
    (u) => u.role === 'PEDAGOGY_EVALUATOR' || u.role === 'ADMIN',
  )
  const technicalUsers = users.filter(
    (u) => u.role === 'TECHNICAL_EVALUATOR' || u.role === 'ADMIN',
  )
  const assignedUserIds = new Set(evaluators.map((e) => e.userId))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl divide-y divide-stone-200/70">
      <FormSection
        index={1}
        title="Platform details"
        description="The product and its commercial profile."
      >
        <Field
          label="Name"
          required
          error={errors.name?.message}
          control={
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. Acme Learning Suite"
            />
          }
        />
        <Field
          label="Vendor"
          required
          error={errors.vendor?.message}
          control={
            <Input
              id="vendor"
              {...register('vendor')}
              placeholder="e.g. Acme Corp"
            />
          }
        />
        <div className="grid grid-cols-2 gap-5">
          <Field
            label="Licence type"
            control={
              <Select
                onValueChange={(v) => setValue('licenceType', v as LicenceType)}
                defaultValue={defaultValues?.licenceType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select licence type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          <Field
            label="Trial"
            control={
              <div className="flex h-9 items-center gap-3">
                <Switch
                  id="trialAvailable"
                  checked={trialAvailable}
                  onCheckedChange={(v) => setValue('trialAvailable', v)}
                />
                <Label
                  htmlFor="trialAvailable"
                  className="cursor-pointer text-[13px] font-normal normal-case tracking-normal text-emerald-950/80"
                >
                  {trialAvailable ? 'Trial available' : 'No trial period'}
                </Label>
              </div>
            }
          />
        </div>
      </FormSection>

      <FormSection
        index={2}
        title="Evaluation team"
        description="Assign at least one Pedagogy and one Technical evaluator. Compliance reviewers are optional but recommended where gated requirements apply."
      >
        <EvaluatorRow
          label="Pedagogy"
          mark="P"
          required
          list={evaluators.filter((e) => e.evaluatorType === EvaluatorType.PEDAGOGY)}
          onRemove={removeEvaluator}
          popoverOpen={pedagogyOpen}
          onPopoverChange={setPedagogyOpen}
          availableUsers={pedagogyUsers.filter((u) => !assignedUserIds.has(u.id))}
          onAdd={(u) => {
            addEvaluator(u, EvaluatorType.PEDAGOGY)
            setPedagogyOpen(false)
          }}
        />

        <EvaluatorRow
          label="Technical"
          mark="T"
          required
          list={evaluators.filter((e) => e.evaluatorType === EvaluatorType.TECHNICAL)}
          onRemove={removeEvaluator}
          popoverOpen={technicalOpen}
          onPopoverChange={setTechnicalOpen}
          availableUsers={technicalUsers.filter((u) => !assignedUserIds.has(u.id))}
          onAdd={(u) => {
            addEvaluator(u, EvaluatorType.TECHNICAL)
            setTechnicalOpen(false)
          }}
        />

        {evalError && (
          <p className="text-[12px] font-medium text-amber-800">{evalError}</p>
        )}
      </FormSection>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6">
        <div className="text-[12px] text-stone-500">
          {errors.root ? (
            <span className="font-medium text-amber-800">{errors.root.message}</span>
          ) : (
            <>Changes will not be saved until you submit.</>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Platform'}
          </Button>
        </div>
      </div>
    </form>
  )
}

/* ── Local layout primitives ──────────────────────────────────────────── */

function FormSection({
  index,
  title,
  description,
  children,
}: {
  index: number
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid grid-cols-12 gap-x-8 gap-y-5 py-8 first:pt-0">
      <div className="col-span-12 md:col-span-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums tracking-wider text-emerald-700/80">
            0{index}
          </span>
          <h2 className="font-serif text-[16px] tracking-tight text-emerald-950">{title}</h2>
        </div>
        {description && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-500">{description}</p>
        )}
      </div>
      <div className="col-span-12 space-y-5 md:col-span-8">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  control,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  control: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="block">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-emerald-950/70">
          {label}
          {required && <span className="ml-1 text-amber-700/80">*</span>}
        </span>
        {hint && (
          <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-stone-500">
            {hint}
          </span>
        )}
      </Label>
      {control}
      {error && <p className="text-[12px] font-medium text-amber-800">{error}</p>}
    </div>
  )
}

function EvaluatorRow({
  label,
  mark,
  required,
  list,
  onRemove,
  popoverOpen,
  onPopoverChange,
  availableUsers,
  onAdd,
}: {
  label: string
  mark: string
  required?: boolean
  list: EvaluatorAssignment[]
  onRemove: (userId: string) => void
  popoverOpen: boolean
  onPopoverChange: (open: boolean) => void
  availableUsers: UserOption[]
  onAdd: (u: UserOption) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="block">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-emerald-950/70">
          {label}
          {required && <span className="ml-1 text-amber-700/80">*</span>}
        </span>
      </Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {list.map((e) => (
          <span
            key={e.userId}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-900/[0.06] pl-2 pr-1 ring-1 ring-inset ring-emerald-900/10 text-[12px] text-emerald-950"
          >
            <span className="font-mono text-[9.5px] tracking-wider text-emerald-800/70">
              {mark}
            </span>
            <span className="font-medium">{e.name}</span>
            <span className="mx-0.5 text-stone-400">·</span>
            <span className="font-mono text-[11px] text-stone-500">{e.email}</span>
            <button
              type="button"
              onClick={() => onRemove(e.userId)}
              className="ml-1 inline-flex size-4 items-center justify-center rounded text-stone-400 hover:bg-stone-200 hover:text-emerald-950"
              aria-label={`Remove ${e.name}`}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}

        <Popover open={popoverOpen} onOpenChange={onPopoverChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed border-stone-300 px-2.5 text-[12px] font-medium text-emerald-950/70 transition-colors',
                'hover:border-emerald-900/40 hover:bg-stone-50 hover:text-emerald-950',
              )}
            >
              <PlusIcon className="size-3" />
              Add evaluator
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1">
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
              Add {label.toLowerCase()} evaluator
            </div>
            {availableUsers.length === 0 ? (
              <p className="px-2 py-3 text-[12.5px] text-stone-500">No available users.</p>
            ) : (
              availableUsers.map((u) => (
                <div
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer flex-col rounded-md px-2 py-1.5 hover:bg-emerald-900/[0.04]"
                  onClick={() => onAdd(u)}
                >
                  <span className="text-[13px] font-medium text-emerald-950">{u.name}</span>
                  <span className="font-mono text-[11px] text-stone-500">{u.email}</span>
                </div>
              ))
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
