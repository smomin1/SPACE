'use client'

import { useState, useEffect, useCallback } from 'react'
import { Maximize2Icon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FullscreenWrapper({
  children,
  title,
  className,
}: {
  children: React.ReactNode
  title?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close])

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
          {title && (
            <span className="text-[13px] font-semibold text-stone-700">{title}</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-stone-400">Esc to close</span>
            <button
              onClick={close}
              className="flex size-7 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group relative', className)}>
      <button
        onClick={() => setOpen(true)}
        title="Fullscreen"
        className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-400 shadow-sm opacity-0 transition-opacity hover:border-stone-300 hover:text-stone-700 group-hover:opacity-100"
      >
        <Maximize2Icon className="size-3.5" />
      </button>
      {children}
    </div>
  )
}
