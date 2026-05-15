import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1c1917',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    lineHeight: 1.4,
  },

  // Cover
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
  },
  coverLabel: {
    fontSize: 8,
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#064e3b',
    marginBottom: 8,
  },
  coverSub: {
    fontSize: 10,
    color: '#57534e',
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 8,
    color: '#a8a29e',
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginVertical: 16,
  },

  // Section header
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#064e3b',
    marginBottom: 8,
    marginTop: 20,
  },
  sectionSub: {
    fontSize: 8,
    color: '#78716c',
    marginBottom: 10,
  },

  // Table
  table: {
    width: '100%',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  tableRowAlt: {
    backgroundColor: '#fafaf9',
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 8,
    color: '#292524',
  },
  tdLight: {
    fontSize: 8,
    color: '#78716c',
  },

  // Recommendation badge
  badgePill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },

  // Best fit
  contextName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#064e3b',
    marginBottom: 4,
    marginTop: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
})

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ComparisonRow = {
  name: string
  vendor: string
  compliancePass: boolean | null
  pedagogyPct: number | null
  technicalPct: number | null
  combinedPct: number | null
  recommendation: string | null
  evalState: string | null
}

export type BestFitContext = {
  contextName: string
  platforms: { name: string; vendor: string; pct: number | null; rank: number }[]
}

type Props = {
  generatedAt: string
  comparison: ComparisonRow[]
  bestFit: BestFitContext[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number | null): string {
  if (n === null) return '—'
  return `${n.toFixed(1)}%`
}

function compliance(v: boolean | null): string {
  if (v === null) return '—'
  return v ? 'Pass' : 'Fail'
}

const REC_COLORS: Record<string, { bg: string; text: string }> = {
  TOP_PICK:     { bg: '#065f46', text: '#ffffff' },
  RECOMMENDED:  { bg: '#d1fae5', text: '#065f46' },
  CONSIDER:     { bg: '#fef3c7', text: '#92400e' },
  DISQUALIFIED: { bg: '#fee2e2', text: '#991b1b' },
}

// ─── Document ──────────────────────────────────────────────────────────────────

export function EvaluationReportPDF({ generatedAt, comparison, bestFit }: Props) {
  const colWidths = ['26%', '18%', '10%', '10%', '10%', '13%', '13%']

  return (
    <Document title="Platform Evaluation Report">
      {/* Cover Page */}
      <Page size="A4" style={s.page}>
        <View style={s.coverPage}>
          <Text style={s.coverLabel}>Confidential</Text>
          <Text style={s.coverTitle}>Platform{'\n'}Evaluation{'\n'}Report</Text>
          <Text style={s.coverSub}>
            A structured assessment of educational technology platforms.
          </Text>
          <View style={s.divider} />
          <Text style={s.coverMeta}>Generated {generatedAt}</Text>
        </View>
      </Page>

      {/* Platform Comparison */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Platform Comparison</Text>
        <Text style={s.sectionSub}>
          Weighted scores across all active evaluations. Pedagogy and Technical percentages
          are calculated independently; Combined is the aggregate.
        </Text>

        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeader}>
            {['Platform', 'Vendor', 'Compliance', 'Pedagogy', 'Technical', 'Combined', 'Recommendation'].map((h, i) => (
              <Text key={h} style={[s.th, { width: colWidths[i] }]}>{h}</Text>
            ))}
          </View>

          {comparison.map((row, idx) => (
            <View key={row.name} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
              <View style={{ width: colWidths[0] }}>
                <Text style={s.td}>{row.name}</Text>
                {row.evalState && (
                  <Text style={[s.tdLight, { fontSize: 7 }]}>
                    {row.evalState === 'FINALISED' ? 'Finalised' : 'Merged'}
                  </Text>
                )}
              </View>
              <Text style={[s.tdLight, { width: colWidths[1] }]}>{row.vendor}</Text>
              <Text style={[s.td, { width: colWidths[2], color: row.compliancePass === false ? '#dc2626' : row.compliancePass ? '#059669' : '#a8a29e' }]}>
                {compliance(row.compliancePass)}
              </Text>
              <Text style={[s.td, { width: colWidths[3] }]}>{pct(row.pedagogyPct)}</Text>
              <Text style={[s.td, { width: colWidths[4] }]}>{pct(row.technicalPct)}</Text>
              <Text style={[s.td, { width: colWidths[5], fontFamily: 'Helvetica-Bold' }]}>{pct(row.combinedPct)}</Text>
              <View style={{ width: colWidths[6] }}>
                {row.recommendation ? (
                  <View style={[s.badgePill, { backgroundColor: REC_COLORS[row.recommendation]?.bg ?? '#f5f5f4' }]}>
                    <Text style={[s.badgeText, { color: REC_COLORS[row.recommendation]?.text ?? '#292524' }]}>
                      {row.recommendation.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.tdLight}>—</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* Best Fit Recommendations */}
      {bestFit.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Best Fit Recommendations</Text>
          <Text style={s.sectionSub}>
            Platforms ranked by combined weighted score within each context.
          </Text>

          {bestFit.map(ctx => (
            <View key={ctx.contextName}>
              <Text style={s.contextName}>{ctx.contextName}</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  {['Rank', 'Platform', 'Vendor', 'Combined %'].map((h, i) => (
                    <Text key={h} style={[s.th, { width: ['8%', '35%', '35%', '22%'][i] }]}>{h}</Text>
                  ))}
                </View>
                {ctx.platforms.map((p, idx) => (
                  <View key={p.name} style={[s.rankRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
                    <Text style={[s.tdLight, { width: '8%' }]}>#{p.rank}</Text>
                    <Text style={[s.td, { width: '35%', fontFamily: idx === 0 ? 'Helvetica-Bold' : 'Helvetica' }]}>{p.name}</Text>
                    <Text style={[s.tdLight, { width: '35%' }]}>{p.vendor}</Text>
                    <Text style={[s.td, { width: '22%' }]}>{pct(p.pct)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Page>
      )}
    </Document>
  )
}
