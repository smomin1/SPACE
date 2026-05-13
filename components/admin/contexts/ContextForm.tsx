'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CEFRLevel, LearningLevel, Skill, DeploymentMode } from '@prisma/client'
import { contextBaseSchema, type ContextFormValues } from '@/lib/context-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    const next = skills.includes(skill)
      ? skills.filter((s) => s !== skill)
      : [...skills, skill]
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} placeholder="e.g. K-12 English Language Arts" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} rows={3} placeholder="Optional description" />
      </div>

      {/* Learning Levels */}
      <div className="space-y-2">
        <Label>Learning Levels *</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEARNING_LEVEL_LABELS) as LearningLevel[]).map((level) => {
            const selected = learningLevels.includes(level)
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggleLearningLevel(level)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                  selected
                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-foreground hover:bg-accent hover:border-ring'
                )}
              >
                {selected && <CheckIcon className="size-3.5 shrink-0" />}
                {LEARNING_LEVEL_LABELS[level]}
              </button>
            )
          })}
        </div>
        {errors.learningLevels && (
          <p className="text-sm text-destructive">{errors.learningLevels.message}</p>
        )}
      </div>

      {/* CEFR Range */}
      <div className="space-y-2">
        <Label>CEFR Range</Label>
        <div className="flex items-center gap-3">
          <Select
            onValueChange={(v) => setValue('cefrMin', v as CEFRLevel)}
            defaultValue={defaultValues?.cefrMin}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent>
              {CEFR_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">to</span>
          <Select
            onValueChange={(v) => setValue('cefrMax', v as CEFRLevel)}
            defaultValue={defaultValues?.cefrMax}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Max" />
            </SelectTrigger>
            <SelectContent>
              {CEFR_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.cefrMin && <p className="text-sm text-destructive">{errors.cefrMin.message}</p>}
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label>Skills *</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SKILL_LABELS) as Skill[]).map((skill) => {
            const selected = skills.includes(skill)
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                  selected
                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-foreground hover:bg-accent hover:border-ring'
                )}
              >
                {selected && <CheckIcon className="size-3.5 shrink-0" />}
                {SKILL_LABELS[skill]}
              </button>
            )
          })}
        </div>
        {errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}
      </div>

      {/* Deployment Mode */}
      <div className="space-y-1.5">
        <Label>Deployment Mode</Label>
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
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Context'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
