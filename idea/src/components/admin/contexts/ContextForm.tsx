'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CEFRLevel, LearningLevel, Skill, DeploymentMode } from '@prisma/client'
import { contextBaseSchema, type ContextFormValues } from '@/lib/context-schema'
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'

const LEARNING_LEVEL_LABELS: Record<LearningLevel, string> = {
  EARLY_CHILDHOOD: 'Early Childhood',
  K12: 'K-12',
  HIGHER_ED: 'Higher Education',
  ADULT_LEARNING: 'Adult Learning',
  PROFESSIONAL: 'Professional',
}

const SKILL_LABELS: Record<Skill, string> = {
  READING: 'Reading',
  WRITING: 'Writing',
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  GRAMMAR: 'Grammar',
  VOCABULARY: 'Vocabulary',
  PRONUNCIATION: 'Pronunciation',
}

const CEFR_LEVELS = Object.values(CEFRLevel)
const DEPLOYMENT_MODES = Object.values(DeploymentMode)

interface ContextFormProps {
  defaultValues?: Partial<ContextFormValues>
  contextId?: string
}

export function ContextForm({ defaultValues, contextId }: ContextFormProps) {
  const router = useRouter()
  const isEdit = !!contextId

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ContextFormValues>({
    resolver: zodResolver(contextBaseSchema),
    defaultValues: {
      learningLevels: [],
      skills: [],
      ...defaultValues,
    },
  })

  const learningLevels = watch('learningLevels') ?? []
  const skills = watch('skills') ?? []

  function toggleLearningLevel(level: LearningLevel) {
    const next = learningLevels.includes(level)
      ? learningLevels.filter((l) => l !== level)
      : [...learningLevels, level]
    setValue('learningLevels', next, { shouldValidate: true })
  }

  function toggleSkill(skill: Skill) {
    const next = skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill]
    setValue('skills', next, { shouldValidate: true })
  }

  async function onSubmit(data: ContextFormValues) {
    const url = isEdit ? `/api/contexts/${contextId}` : '/api/contexts'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push('/admin/contexts')
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      setError('root', { message: json.error ?? 'Save failed. Please try again.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl divide-y divide-stone-200/70">
      <FormSection
        index={1}
        title="Identity"
        description="A clear, concise name and an optional description visible to evaluators."
      >
        <Field
          label="Name"
          required
          error={errors.name?.message}
          control={
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. K-12 English Language Arts"
            />
          }
        />
        <Field
          label="Description"
          hint="Optional · Appears in the requirement matrix"
          control={
            <Textarea
              id="description"
              {...register('description')}
              rows={3}
              placeholder="Optional description"
            />
          }
        />
      </FormSection>

      <FormSection
        index={2}
        title="Audience"
        description="Who this context is for. Multiple selections allowed."
      >
        <Field
          label="Learning Levels"
          required
          error={errors.learningLevels?.message}
          control={
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LEARNING_LEVEL_LABELS) as LearningLevel[]).map((level) => {
                const selected = learningLevels.includes(level)
                return (
                  <ChoiceChip
                    key={level}
                    selected={selected}
                    onClick={() => toggleLearningLevel(level)}
                  >
                    {LEARNING_LEVEL_LABELS[level]}
                  </ChoiceChip>
                )
              })}
            </div>
          }
        />

        <Field
          label="CEFR Range"
          hint="Common European Framework of Reference for Languages"
          error={errors.cefrMin?.message}
          control={
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(v) => setValue('cefrMin', v as CEFRLevel)}
                defaultValue={defaultValues?.cefrMin}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="font-mono text-[12px] text-stone-400">→</span>
              <Select
                onValueChange={(v) => setValue('cefrMax', v as CEFRLevel)}
                defaultValue={defaultValues?.cefrMax}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Max" />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </FormSection>

      <FormSection
        index={3}
        title="Skills"
        description="Language skills emphasised in this context. Drives downstream scoring weight."
      >
        <Field
          label="Skills"
          required
          error={errors.skills?.message}
          control={
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SKILL_LABELS) as Skill[]).map((skill) => {
                const selected = skills.includes(skill)
                return (
                  <ChoiceChip
                    key={skill}
                    selected={selected}
                    onClick={() => toggleSkill(skill)}
                  >
                    {SKILL_LABELS[skill]}
                  </ChoiceChip>
                )
              })}
            </div>
          }
        />
      </FormSection>

      <FormSection
        index={4}
        title="Deployment"
        description="The intended deployment model. Used to filter eligible platforms."
        optional
      >
        <Field
          label="Deployment Mode"
          control={
            <Select
              onValueChange={(v) => setValue('deploymentMode', v as DeploymentMode)}
              defaultValue={defaultValues?.deploymentMode}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {DEPLOYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </FormSection>

      {/* Form footer */}
      <div className="flex items-center justify-between pt-6">
        <div className="text-[12px] text-stone-500">
          {errors.root ? (
            <span className="font-medium text-amber-800">{errors.root.message}</span>
          ) : (
            <>Required fields marked with <span className="text-amber-700/80">*</span></>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Context'}
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
  optional,
  children,
}: {
  index: number
  title: string
  description?: string
  optional?: boolean
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
          {optional && (
            <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-stone-400">
              Optional
            </span>
          )}
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

function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-all',
        selected
          ? 'border border-emerald-900 bg-emerald-800 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border border-stone-300/80 bg-white text-emerald-950/80 hover:border-emerald-900/30 hover:bg-stone-50',
      )}
    >
      {selected && <CheckIcon className="size-3" strokeWidth={3} />}
      {children}
    </button>
  )
}
