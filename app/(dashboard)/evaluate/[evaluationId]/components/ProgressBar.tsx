interface ProgressBarProps {
  total: number
  scored: number
  hasSubmitted: boolean
}

export function ProgressBar({ total, scored, hasSubmitted }: ProgressBarProps) {
  const pct = total === 0 ? 100 : Math.round((scored / total) * 100)
  const allDone = scored === total

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {hasSubmitted ? 'Submitted' : `${scored} of ${total} requirements answered`}
        </span>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            hasSubmitted
              ? 'bg-green-500'
              : allDone
                ? 'bg-primary'
                : 'bg-primary/60'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {!hasSubmitted && allDone && (
        <p className="mt-2 text-xs text-muted-foreground">
          All requirements answered - you can now submit.
        </p>
      )}
      {hasSubmitted && (
        <p className="mt-2 text-xs text-green-600 font-medium">
          Your scores have been submitted.
        </p>
      )}
    </div>
  )
}
