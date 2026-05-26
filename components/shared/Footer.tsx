export function Footer() {
  return (
    <footer
      style={{
        background: '#0e2118',
        padding: '4rem 2rem 2rem',
        width: '100%',
        boxSizing: 'border-box',
        borderTop: '2px solid var(--color-secondary)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Brand & Name Origin */}
        <div className="flex flex-col items-center text-center space-y-5 px-4 md:px-16">
          <span className="relative group inline-block">
            <span
              className="font-serif text-[1.35rem] tracking-[0.35em]"
              style={{ color: 'var(--color-secondary)' }}
            >
              S P A C E
            </span>
            <span
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded px-[0.85rem] py-[0.4rem] text-[0.78rem] text-white opacity-0 transition-opacity duration-150 ease-in group-hover:opacity-100"
              style={{
                background: 'var(--color-text)',
                borderBottom: '1px solid var(--color-secondary)',
                fontFamily: 'var(--font-sans, Inter, sans-serif)',
              }}
            >
              Software Platform Analysis, Comparison, and Evaluation
            </span>
          </span>

          <p
            className="max-w-2xl text-[0.9rem] leading-[1.8] text-white/75"
            style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}
          >
            Some names are chosen. This one was recognised. The work of evaluating
            platforms for institutional adoption has always demanded precision, patience,
            and intellectual rigour, the same qualities a good space affords. Room to
            think. Room to compare. Room to arrive at a considered judgement. And in the
            world of education, space already carries meaning. The learning space. The
            digital space. The shared space where knowledge moves between people. SPACE
            inhabits that language naturally, not as a metaphor borrowed from elsewhere,
            but as a word that already belongs in the conversation.
          </p>
        </div>

        {/* Gold divider */}
        <hr
          style={{
            borderTop: '1px solid var(--color-secondary)',
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            opacity: 0.35,
            margin: '2rem 0',
          }}
        />

        {/* Copyright bar */}
        <p
          className="text-center text-[0.8rem] text-white/50"
          style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}
        >
          © SPACE, Research and Innovation Team.
        </p>
      </div>
    </footer>
  )
}
