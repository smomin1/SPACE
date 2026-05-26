import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { WeightLevel } from '@prisma/client'

// ─── Exported types ────────────────────────────────────────────────────────────

export type ComparisonRow = {
  name: string
  vendor: string
  status: string
  compliancePass: boolean | null
  pedagogyPct: number | null
  technicalPct: number | null
  combinedPct: number | null
  recommendation: string | null
  evalState: string | null
}

export type CategoryBreakdownRow = {
  category: string
  platforms: { platformId: string; name: string; pct: number | null; color: string }[]
}

export type BestFitData = {
  members: {
    name: string
    vendor: string
    overallPct: number | null
    marginalGainPct: number
  }[]
  combinedPct: number
  satisfiedCount: number
  partialCount: number
  uncoveredCount: number
  totalCount: number
  gaps: {
    title: string
    category: string
    weight: WeightLevel
    type: 'uncovered' | 'weak'
    bestAvailableScore: number | null
  }[]
}

export type BuildReadinessRow = {
  name: string
  vendor: string
  overallPct: number | null
  keywordGroups: { keyword: string; pct: number | null }[]
}

export type MatrixData = {
  platforms: { id: string; name: string; vendor: string }[]
  categories: string[]
  rows: {
    id: string
    title: string
    category: string
    weight: WeightLevel
    evaluatorType: string
    scores: (number | null)[]
  }[]
}

type Props = {
  generatedAt: string
  comparison: ComparisonRow[]
  categoryBreakdown: CategoryBreakdownRow[]
  bestFitData: BestFitData | null
  buildReadiness: BuildReadinessRow[]
  matrixData: MatrixData
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#2B2B2B',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    lineHeight: 1.4,
  },
  pageLandscape: {
    fontFamily: 'Helvetica',
    fontSize: 6,
    color: '#2B2B2B',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 32,
    lineHeight: 1.3,
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
    color: '#1A4731',
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

  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A4731',
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
    color: '#2B2B2B',
  },
  tdLight: {
    fontSize: 8,
    color: '#78716c',
  },

  // Badge
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

  // Category breakdown bar chart
  barContainer: {
    height: 8,
    backgroundColor: '#f5f5f4',
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
  },
  barInner: {
    height: 8,
    borderRadius: 4,
  },

  // Matrix
  matrixHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  matrixRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  matrixRowAlt: {
    backgroundColor: '#fafaf9',
  },
  matrixCatHeader: {
    flexDirection: 'row',
    backgroundColor: '#e7e5e4',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  matrixTh: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#78716c',
  },
  matrixTd: {
    fontSize: 6,
    color: '#2B2B2B',
  },
  matrixTdLight: {
    fontSize: 6,
    color: '#78716c',
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtPct(n: number | null): string {
  if (n === null) return '-'
  return `${n.toFixed(1)}%`
}

function fmtCompliance(v: boolean | null): string {
  if (v === null) return '-'
  return v ? 'Pass' : 'Fail'
}

function barColor(pct: number | null): string {
  if (pct === null) return '#d6d3d1'
  if (pct >= 75) return '#059669'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

function scoreTextColor(pct: number | null): string {
  if (pct === null) return '#a8a29e'
  if (pct >= 75) return '#059669'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

function fmtMatrixScore(v: number | null): string {
  if (v === null) return '-'
  if (v === 0) return 'FAIL'
  return v.toFixed(1)
}

const REC_COLORS: Record<string, { bg: string; text: string }> = {
  TOP_PICK:        { bg: '#1A4731', text: '#ffffff' },
  RECOMMENDED:     { bg: '#d1fae5', text: '#1A4731' },
  CONSIDER:        { bg: '#fef3c7', text: '#92400e' },
  NOT_RECOMMENDED: { bg: '#f5f5f4', text: '#57534e' },
  DISQUALIFIED:    { bg: '#fee2e2', text: '#991b1b' },
}

const WEIGHT_COLORS: Record<WeightLevel, { bg: string; text: string }> = {
  HIGH:   { bg: '#fee2e2', text: '#991b1b' },
  MEDIUM: { bg: '#fef3c7', text: '#92400e' },
  LOW:    { bg: '#f5f5f4', text: '#57534e' },
}

const MAX_SCORE = 4

// ─── Document ──────────────────────────────────────────────────────────────────

export function EvaluationReportPDF({
  generatedAt,
  comparison,
  categoryBreakdown,
  bestFitData,
  buildReadiness,
  matrixData,
}: Props) {
  // Split matrix platforms into groups of 10 for landscape pages
  const MATRIX_PLATFORM_GROUP_SIZE = 10
  const platformGroups: typeof matrixData.platforms[] = []
  for (let i = 0; i < matrixData.platforms.length; i += MATRIX_PLATFORM_GROUP_SIZE) {
    platformGroups.push(matrixData.platforms.slice(i, i + MATRIX_PLATFORM_GROUP_SIZE))
  }

  // Fixed column widths for comparison
  const cmpColW = ['22%', '16%', '8%', '10%', '10%', '10%', '12%', '12%']

  return (
    <Document title="Platform Evaluation Report">

      {/* ── 1. Cover Page ─────────────────────────────────────────────────── */}
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

      {/* ── 2. Platform Comparison ────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Platform Comparison</Text>
        <Text style={s.sectionSub}>
          Weighted scores across all finalised evaluations. Pedagogy and Technical percentages are
          calculated independently; Combined is the aggregate.
        </Text>

        <View style={s.table}>
          <View style={s.tableHeader}>
            {['Platform', 'Vendor', 'Status', 'Compliance', 'Pedagogy', 'Technical', 'Combined', 'Recommendation'].map(
              (h, i) => (
                <Text key={h} style={[s.th, { width: cmpColW[i] }]}>{h}</Text>
              ),
            )}
          </View>

          {comparison.map((row, idx) => (
            <View key={row.name} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
              <View style={{ width: cmpColW[0] }}>
                <Text style={s.td}>{row.name}</Text>
                {row.evalState && (
                  <Text style={[s.tdLight, { fontSize: 7 }]}>
                    {row.evalState === 'FINALISED' ? 'Finalised' : 'Merged'}
                  </Text>
                )}
              </View>
              <Text style={[s.tdLight, { width: cmpColW[1] }]}>{row.vendor}</Text>
              <Text style={[s.td, { width: cmpColW[2], color: row.status === 'DISQUALIFIED' ? '#dc2626' : '#059669' }]}>
                {row.status === 'DISQUALIFIED' ? 'Disq.' : 'Active'}
              </Text>
              <Text style={[
                s.td,
                {
                  width: cmpColW[3],
                  color: row.compliancePass === false
                    ? '#dc2626'
                    : row.compliancePass
                    ? '#059669'
                    : '#a8a29e',
                },
              ]}>
                {fmtCompliance(row.compliancePass)}
              </Text>
              <Text style={[s.td, { width: cmpColW[4], color: scoreTextColor(row.pedagogyPct) }]}>
                {fmtPct(row.pedagogyPct)}
              </Text>
              <Text style={[s.td, { width: cmpColW[5], color: scoreTextColor(row.technicalPct) }]}>
                {fmtPct(row.technicalPct)}
              </Text>
              <Text style={[s.td, { width: cmpColW[6], fontFamily: 'Helvetica-Bold', color: scoreTextColor(row.combinedPct) }]}>
                {fmtPct(row.combinedPct)}
              </Text>
              <View style={{ width: cmpColW[7] }}>
                {row.recommendation ? (
                  <View style={[s.badgePill, { backgroundColor: REC_COLORS[row.recommendation]?.bg ?? '#f5f5f4' }]}>
                    <Text style={[s.badgeText, { color: REC_COLORS[row.recommendation]?.text ?? '#2B2B2B' }]}>
                      {row.recommendation.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.tdLight}>-</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* ── 3. Category Breakdown ─────────────────────────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Category Breakdown</Text>
          <Text style={s.sectionSub}>
            Weighted score per active platform per category.
            Green ≥75%, amber ≥50%, red &lt;50%.
          </Text>

          {/* Legend */}
          {categoryBreakdown[0]?.platforms.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 8 }}>
              {categoryBreakdown[0].platforms.map(p => (
                <View key={p.platformId} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.color }} />
                  <Text style={{ fontSize: 7, color: '#57534e' }}>{p.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '25%' }]}>Category</Text>
              <Text style={[s.th, { flex: 1 }]}>Platform scores</Text>
            </View>

            {categoryBreakdown.map((row, idx) => (
              <View
                key={row.category}
                style={[
                  s.tableRow,
                  idx % 2 === 1 ? s.tableRowAlt : {},
                  { alignItems: 'center', minHeight: 20 },
                ]}
              >
                <Text style={[s.td, { width: '25%', fontFamily: 'Helvetica-Bold', fontSize: 7 }]}>
                  {row.category}
                </Text>
                <View style={{ flex: 1, gap: 3 }}>
                  {row.platforms.map(p => (
                    <View key={p.platformId} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {/* Color swatch */}
                      <View style={{ width: 4, height: 4, borderRadius: 1, backgroundColor: p.color }} />
                      {/* Bar */}
                      <View style={[s.barContainer, { height: 6 }]}>
                        <View
                          style={[
                            s.barInner,
                            {
                              height: 6,
                              width: p.pct !== null ? `${Math.min(100, p.pct)}%` : '0%',
                              backgroundColor: barColor(p.pct),
                            },
                          ]}
                        />
                      </View>
                      {/* Pct label */}
                      <Text style={{ fontSize: 6, color: scoreTextColor(p.pct), width: 28, textAlign: 'right' }}>
                        {fmtPct(p.pct)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* ── 4. Best Fit: Recommended Combination ────────────────────────── */}
      {bestFitData !== null && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Best Fit: Recommended Combination</Text>
          <Text style={s.sectionSub}>
            Greedy set-cover algorithm selects the minimum combination of platforms that
            best satisfies all requirements (≥75% of max score = satisfied).
          </Text>

          {/* Stats row */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#f0fdf4',
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
            gap: 16,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1A4731' }}>
                {bestFitData.combinedPct.toFixed(1)}%
              </Text>
              <Text style={{ fontSize: 7, color: '#78716c' }}>combined score</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#d6d3d1' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#059669' }}>
                {bestFitData.satisfiedCount}
              </Text>
              <Text style={{ fontSize: 7, color: '#78716c' }}>satisfied</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#d97706' }}>
                {bestFitData.partialCount}
              </Text>
              <Text style={{ fontSize: 7, color: '#78716c' }}>partial</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#dc2626' }}>
                {bestFitData.uncoveredCount}
              </Text>
              <Text style={{ fontSize: 7, color: '#78716c' }}>uncovered</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#57534e' }}>
                {bestFitData.totalCount}
              </Text>
              <Text style={{ fontSize: 7, color: '#78716c' }}>total reqs</Text>
            </View>
          </View>

          {/* Members table */}
          <View style={s.table}>
            <View style={s.tableHeader}>
              {['#', 'Platform', 'Vendor', 'Score', 'Marginal Gain'].map((h, i) => (
                <Text key={h} style={[s.th, { width: ['6%', '30%', '28%', '18%', '18%'][i] }]}>{h}</Text>
              ))}
            </View>
            {bestFitData.members.map((m, idx) => (
              <View key={m.name} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tdLight, { width: '6%' }]}>#{idx + 1}</Text>
                <Text style={[s.td, { width: '30%', fontFamily: idx === 0 ? 'Helvetica-Bold' : 'Helvetica' }]}>
                  {m.name}
                </Text>
                <Text style={[s.tdLight, { width: '28%' }]}>{m.vendor}</Text>
                <Text style={[s.td, { width: '18%', color: scoreTextColor(m.overallPct) }]}>
                  {fmtPct(m.overallPct)}
                </Text>
                <Text style={[s.td, { width: '18%', color: '#78716c' }]}>
                  {idx === 0 ? 'Primary' : `+${m.marginalGainPct.toFixed(1)}%`}
                </Text>
              </View>
            ))}
          </View>

          {/* Gaps */}
          {bestFitData.gaps.length > 0 && (
            <View>
              <Text style={[s.sectionTitle, { marginTop: 12, fontSize: 9 }]}>Coverage Gaps</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  {['Requirement', 'Category', 'Weight', 'Type', 'Best Available'].map((h, i) => (
                    <Text key={h} style={[s.th, { width: ['30%', '22%', '10%', '14%', '24%'][i] }]}>{h}</Text>
                  ))}
                </View>
                {bestFitData.gaps.map((gap, idx) => (
                  <View key={`${gap.title}-${idx}`} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
                    <Text style={[s.td, { width: '30%', fontSize: 7 }]}>
                      {gap.title}
                    </Text>
                    <Text style={[s.tdLight, { width: '22%', fontSize: 7 }]}>{gap.category}</Text>
                    <View style={{ width: '10%' }}>
                      <View style={[s.badgePill, {
                        backgroundColor: WEIGHT_COLORS[gap.weight].bg,
                        paddingHorizontal: 3,
                        paddingVertical: 1,
                      }]}>
                        <Text style={[s.badgeText, { fontSize: 6, color: WEIGHT_COLORS[gap.weight].text }]}>
                          {gap.weight}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      s.td,
                      { width: '14%', fontSize: 7, color: gap.type === 'uncovered' ? '#dc2626' : '#d97706' },
                    ]}>
                      {gap.type === 'uncovered' ? 'Uncovered' : 'Weak'}
                    </Text>
                    <Text style={[s.tdLight, { width: '24%', fontSize: 7 }]}>
                      {gap.bestAvailableScore !== null
                        ? `${((gap.bestAvailableScore / MAX_SCORE) * 100).toFixed(0)}%`
                        : 'No data'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Page>
      )}

      {/* ── 5. Build Readiness ────────────────────────────────────────────── */}
      {buildReadiness.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Build Readiness</Text>
          <Text style={s.sectionSub}>
            Technical integration scores by keyword group: API, LTI, Export, SSO, Integration, Interoperability.
            Active platforms only.
          </Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '18%' }]}>Platform</Text>
              <Text style={[s.th, { width: '14%' }]}>Vendor</Text>
              <Text style={[s.th, { width: '10%' }]}>Overall</Text>
              {['API', 'LTI', 'Export', 'SSO', 'Integration', 'Interop'].map(kw => (
                <Text key={kw} style={[s.th, { flex: 1 }]}>{kw}</Text>
              ))}
            </View>

            {buildReadiness.map((row, idx) => (
              <View key={row.name} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.td, { width: '18%' }]}>{row.name}</Text>
                <Text style={[s.tdLight, { width: '14%' }]}>{row.vendor}</Text>
                <Text style={[s.td, { width: '10%', fontFamily: 'Helvetica-Bold', color: scoreTextColor(row.overallPct) }]}>
                  {fmtPct(row.overallPct)}
                </Text>
                {row.keywordGroups.map(kg => (
                  <Text key={kg.keyword} style={[s.td, { flex: 1, color: scoreTextColor(kg.pct) }]}>
                    {fmtPct(kg.pct)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* ── 6. Full Requirements Score Matrix (landscape) ─────────────────── */}
      {platformGroups.map((platformGroup, groupIdx) => {
        // Fixed col widths: title, category, weight, type, then one per platform
        const numPlatCols = platformGroup.length
        const fixedW = { title: 120, category: 60, weight: 28, type: 50 }
        const platColW = 32

        // Group rows by category
        const rowsByCategory = new Map<string, typeof matrixData.rows>()
        for (const cat of matrixData.categories) {
          rowsByCategory.set(cat, [])
        }
        for (const row of matrixData.rows) {
          const arr = rowsByCategory.get(row.category) ?? []
          arr.push(row)
          rowsByCategory.set(row.category, arr)
        }

        return (
          <Page key={`matrix-${groupIdx}`} size="A4" orientation="landscape" style={s.pageLandscape}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1A4731', marginBottom: 6 }}>
              Full Requirements Score Matrix
              {platformGroups.length > 1 ? ` (${groupIdx + 1}/${platformGroups.length})` : ''}
            </Text>
            <Text style={{ fontSize: 6, color: '#78716c', marginBottom: 8 }}>
              All requirements × platforms with evaluated scores. N/A shown as -, failure as FAIL.
              Scores are averages (1 decimal). Platform names truncated to 10 chars.
            </Text>

            {/* Header */}
            <View style={s.matrixHeader}>
              <Text style={[s.matrixTh, { width: fixedW.title }]}>Requirement</Text>
              <Text style={[s.matrixTh, { width: fixedW.category }]}>Category</Text>
              <Text style={[s.matrixTh, { width: fixedW.weight }]}>Wt</Text>
              <Text style={[s.matrixTh, { width: fixedW.type }]}>Type</Text>
              {platformGroup.map(p => (
                <Text key={p.id} style={[s.matrixTh, { width: platColW, textAlign: 'center' }]}>
                  {p.name.slice(0, 10)}
                </Text>
              ))}
            </View>

            {/* Rows grouped by category */}
            {matrixData.categories.map(cat => {
              const catRows = rowsByCategory.get(cat) ?? []
              if (catRows.length === 0) return null

              // Compute platform indices for this group
              const groupPlatformIds = new Set(platformGroup.map(p => p.id))
              const platformIndexInAll = matrixData.platforms.reduce<Record<string, number>>((acc, p, i) => {
                acc[p.id] = i
                return acc
              }, {})

              return (
                <View key={cat}>
                  {/* Category header row */}
                  <View style={s.matrixCatHeader}>
                    <Text style={[s.matrixTh, { flex: 1, color: '#1A4731' }]}>{cat}</Text>
                    {/* Pad remaining cols */}
                    {platformGroup.map(p => (
                      <View key={p.id} style={{ width: platColW }} />
                    ))}
                  </View>

                  {/* Requirement rows */}
                  {catRows.map((row, rowIdx) => {
                    return (
                      <View
                        key={row.id}
                        style={[s.matrixRow, rowIdx % 2 === 1 ? s.matrixRowAlt : {}]}
                      >
                        <Text style={[s.matrixTd, { width: fixedW.title }]}>
                          {row.title}
                        </Text>
                        <Text style={[s.matrixTdLight, { width: fixedW.category }]}>{row.category}</Text>
                        <View style={{ width: fixedW.weight }}>
                          <View style={[s.badgePill, {
                            backgroundColor: WEIGHT_COLORS[row.weight].bg,
                            paddingHorizontal: 2,
                            paddingVertical: 1,
                          }]}>
                            <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: WEIGHT_COLORS[row.weight].text }}>
                              {row.weight.slice(0, 1)}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.matrixTdLight, { width: fixedW.type }]}>
                          {row.evaluatorType === 'COMPLIANCE' ? 'COMP' : row.evaluatorType === 'PEDAGOGY' ? 'PED' : 'TECH'}
                        </Text>
                        {platformGroup.map(p => {
                          const scoreIdx = platformIndexInAll[p.id]
                          const score = scoreIdx !== undefined ? row.scores[scoreIdx] : null
                          const display = fmtMatrixScore(score !== undefined ? score : null)
                          const isFail  = score === 0
                          const isNA    = score === null
                          return (
                            <Text
                              key={p.id}
                              style={[
                                s.matrixTd,
                                {
                                  width: platColW,
                                  textAlign: 'center',
                                  color: isFail ? '#dc2626' : isNA ? '#d6d3d1' : '#2B2B2B',
                                  fontFamily: isFail ? 'Helvetica-Bold' : 'Helvetica',
                                },
                              ]}
                            >
                              {display}
                            </Text>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </Page>
        )
      })}

    </Document>
  )
}
