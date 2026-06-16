'use client'

import * as React from 'react'

// Renders a timestamp without tripping React hydration. The server and the first
// client paint use a fixed UTC format (deterministic, so they match); after mount
// we re-render in the viewer's local timezone. `suppressHydrationWarning` covers
// the intentional first-paint text swap.
export function LocalTime({
  value,
  options,
}: {
  value: string | number | Date
  options?: Intl.DateTimeFormatOptions
}) {
  const date = React.useMemo(() => new Date(value), [value])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const text = mounted
    ? new Intl.DateTimeFormat('en-US', options).format(date)
    : new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date)

  return (
    <time dateTime={date.toISOString()} suppressHydrationWarning>
      {text}
    </time>
  )
}
