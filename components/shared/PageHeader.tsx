import * as React from 'react'

interface PageHeaderProps {
  /** Optional small icon shown beside the kicker. */
  icon?: React.ComponentType<{ className?: string }>
  /** Small uppercase label above the title (e.g. "Layer 1: Tool Scanner"). */
  kicker?: string
  /** The page title rendered as h1 in serif. */
  title: string
  /** Optional descriptive line below the title. */
  description?: string
  /** Optional right-side slot for buttons or filters. */
  actions?: React.ReactNode
}

/**
 * Standardised page header used across SPACE. Matches the Tool Scanner pattern:
 *   small icon + uppercase kicker, then a serif page title underneath.
 *
 * Pairs nicely with a content area like:
 *   <main className="mx-auto max-w-7xl px-6 py-6">...</main>
 */
export function PageHeader({
  icon: Icon,
  kicker,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="border-b border-stone-200/70 bg-white/60 px-6 pb-3 pt-6">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {kicker && (
            <div className="flex items-center gap-2">
              {Icon && <Icon className="size-4 text-emerald-800" />}
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/80">
                {kicker}
              </p>
            </div>
          )}
          <h1 className="mt-1 font-serif text-[24px] tracking-tight text-emerald-950">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[13px] text-stone-500">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
