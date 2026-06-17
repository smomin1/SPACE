import { redirect } from 'next/navigation'

export default function CefrOverviewPage() {
  redirect('/evaluations?track=CEFR')
}
