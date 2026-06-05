'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AGE_OPTIONS, ageLabel, gradeRangeLabel } from '@/lib/age-range'

type Props = {
  evaluationId: string
  initialAgeMin: number | null
  initialAgeMax: number | null
  disabled: boolean
  onSaved: (ageMin: number, ageMax: number) => void
}

export function AgeRangePanel({
  evaluationId,
  initialAgeMin,
  initialAgeMax,
  disabled,
  onSaved,
}: Props) {
  const [ageMin, setAgeMin] = useState<number | null>(initialAgeMin)
  const [ageMax, setAgeMax] = useState<number | null>(initialAgeMax)
  const [saving, setSaving] = useState(false)

  async function save(min: number, max: number) {
    if (min > max) {
      toast.error('Minimum age cannot exceed maximum age')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/age-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageMin: min, ageMax: max }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Failed to save age range')
      } else {
        onSaved(min, max)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleMinChange(val: string) {
    const min = Number(val)
    setAgeMin(min)
    const max = ageMax ?? min
    const effectiveMax = max < min ? min : max
    if (effectiveMax !== ageMax) setAgeMax(effectiveMax)
    save(min, effectiveMax)
  }

  function handleMaxChange(val: string) {
    const max = Number(val)
    setAgeMax(max)
    const min = ageMin ?? max
    const effectiveMin = min > max ? max : min
    if (effectiveMin !== ageMin) setAgeMin(effectiveMin)
    save(effectiveMin, max)
  }

  const gradeDisplay =
    ageMin !== null && ageMax !== null ? gradeRangeLabel(ageMin, ageMax) : null

  return (
    <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/80 mb-3">
        Target age range
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground min-w-[24px]">From</span>
          <Select
            value={ageMin !== null ? String(ageMin) : ''}
            onValueChange={handleMinChange}
            disabled={disabled || saving}
          >
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Min age…" />
            </SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map(age => (
                <SelectItem key={age} value={String(age)} className="text-xs">
                  {ageLabel(age)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground min-w-[12px]">to</span>
          <Select
            value={ageMax !== null ? String(ageMax) : ''}
            onValueChange={handleMaxChange}
            disabled={disabled || saving}
          >
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Max age…" />
            </SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map(age => (
                <SelectItem key={age} value={String(age)} className="text-xs">
                  {ageLabel(age)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {gradeDisplay && (
          <span className="text-xs text-blue-600 font-medium">
            {gradeDisplay}
          </span>
        )}
        {saving && (
          <span className="text-xs text-muted-foreground">Saving…</span>
        )}
      </div>
      {disabled && (
        <p className="text-xs text-muted-foreground mt-2">
          Submitted - age range locked until evaluation is reopened.
        </p>
      )}
    </div>
  )
}
