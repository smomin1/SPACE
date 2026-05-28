'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NO_CONTEXT_VALUE = '__all__'

export function ContextFilter({
  contexts,
}: {
  contexts: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get('context') ?? NO_CONTEXT_VALUE

  function handleChange(value: string) {
    const next = new URLSearchParams(params.toString())
    if (value === NO_CONTEXT_VALUE) next.delete('context')
    else next.set('context', value)
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-stone-500">
        Context
      </label>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-[200px] text-[12.5px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_CONTEXT_VALUE}>All requirements (global)</SelectItem>
          {contexts.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
