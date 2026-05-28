'use client'

import * as React from 'react'
import { SearchIcon, XIcon, ChevronDownIcon, HelpCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FAQCategory, FAQItem } from '@/lib/faq-data'

interface Props {
  categories: FAQCategory[]
}

interface FilteredCategory extends FAQCategory {
  items: (FAQItem & { matchScore: number })[]
}

/** Case-insensitive match against question, answer, and keywords. */
function matchItem(item: FAQItem, q: string): number {
  if (!q) return 1
  const needle = q.toLowerCase()
  const inQ = item.question.toLowerCase().includes(needle)
  const inA = item.answer.toLowerCase().includes(needle)
  const inK = item.keywords?.some((k) => k.toLowerCase().includes(needle)) ?? false
  // Weight question matches more heavily than keyword/answer matches.
  return (inQ ? 4 : 0) + (inK ? 2 : 0) + (inA ? 1 : 0)
}

export function FAQClient({ categories }: Props) {
  const [query, setQuery] = React.useState('')
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null)

  const trimmed = query.trim()

  const filtered: FilteredCategory[] = React.useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items
          .map((item) => ({ ...item, matchScore: matchItem(item, trimmed) }))
          .filter((item) => item.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [categories, trimmed])

  const totalCount = filtered.reduce((sum, c) => sum + c.items.length, 0)
  const isSearching = trimmed.length > 0

  // When user is browsing (no query), show all categories, optionally scoped to the active one.
  const displayedCategories = isSearching
    ? filtered
    : activeCategoryId
      ? filtered.filter((c) => c.id === activeCategoryId)
      : filtered

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <HelpCircleIcon className="size-5 text-emerald-800" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/70">
            Help Centre
          </p>
        </div>
        <h1 className="mt-1 font-serif text-[28px] tracking-tight text-emerald-950">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-stone-600">
          Everything you need to know about SPACE, Tool Scanner, Tool Evaluator,
          scoring, and the workflow that ties them together.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, keywords, or topics..."
          className={cn(
            'h-11 w-full rounded-lg border border-stone-200/80 bg-white pl-10 pr-10 text-[14px]',
            'placeholder:text-stone-400',
            'focus:border-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-700/15',
          )}
          aria-label="Search FAQs"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-emerald-900"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Category chips (only when not searching) */}
      {!isSearching && (
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label="All"
            count={categories.reduce((s, c) => s + c.items.length, 0)}
            active={activeCategoryId === null}
            onClick={() => setActiveCategoryId(null)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.title}
              count={c.items.length}
              active={activeCategoryId === c.id}
              onClick={() => setActiveCategoryId(c.id)}
            />
          ))}
        </div>
      )}

      {/* Result count */}
      {isSearching && (
        <p className="text-[12.5px] text-stone-500">
          {totalCount === 0
            ? `No results for "${trimmed}".`
            : `${totalCount} result${totalCount === 1 ? '' : 's'} for "${trimmed}".`}
        </p>
      )}

      {/* Sections */}
      {displayedCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/40 px-6 py-16 text-center">
          <HelpCircleIcon className="mx-auto size-6 text-stone-300" />
          <p className="mt-3 text-[13.5px] text-stone-500">
            No questions match your search. Try a different keyword, or clear the
            search to browse all topics.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {displayedCategories.map((cat) => (
            <CategorySection key={cat.id} category={cat} expandAll={isSearching} />
          ))}
        </div>
      )}

      {/* Closing footnote */}
      <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 px-5 py-4 text-[12.5px] leading-relaxed text-stone-600">
        <strong className="font-medium text-emerald-950">Did not find what you needed?</strong>{' '}
        Contact your SPACE administrator. They can clarify role-specific behaviour,
        update requirements, or escalate to the engineering team.
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-emerald-900 text-white'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
      )}
    >
      {label}
      <span
        className={cn(
          'font-mono text-[10.5px] tabular-nums',
          active ? 'text-white/70' : 'text-stone-400',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function CategorySection({
  category,
  expandAll,
}: {
  category: FilteredCategory
  expandAll: boolean
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-serif text-[20px] tracking-tight text-emerald-950">
          {category.title}
        </h2>
        {category.description && (
          <p className="mt-0.5 text-[12.5px] text-stone-500">{category.description}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
        {category.items.map((item, i) => (
          <FAQEntry
            key={`${category.id}-${i}`}
            item={item}
            defaultOpen={expandAll}
            isFirst={i === 0}
            isLast={i === category.items.length - 1}
          />
        ))}
      </div>
    </section>
  )
}

function FAQEntry({
  item,
  defaultOpen,
  isFirst,
  isLast,
}: {
  item: FAQItem
  defaultOpen: boolean
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group transition-colors',
        !isFirst && 'border-t border-stone-200/60',
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer items-start justify-between gap-4 px-5 py-4 list-none',
          'hover:bg-stone-50/60',
        )}
      >
        <span className="text-[14px] font-medium text-emerald-950">
          {item.question}
        </span>
        <ChevronDownIcon
          className="mt-0.5 size-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className={cn('px-5 pb-5 pt-1', isLast && 'rounded-b-xl')}>
        <div className="space-y-2 text-[13.5px] leading-relaxed text-stone-700">
          {item.answer.split('\n\n').map((para, idx) => (
            <p key={idx} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      </div>
    </details>
  )
}
