import { HelpCircleIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { FAQClient } from '@/components/faq/FAQClient'
import { FAQ_CATEGORIES } from '@/lib/faq-data'

export const metadata = {
  title: 'FAQ · SPACE',
  description: 'Answers to common questions about SPACE, Tool Scanner, and Tool Evaluator.',
}

export default function FAQPage() {
  return (
    <div>
      <PageHeader
        icon={HelpCircleIcon}
        kicker="Help Centre"
        title="Frequently Asked Questions"
        description="Everything you need to know about SPACE, Tool Scanner, Tool Evaluator, scoring, and the workflow that ties them together."
      />
      <main className="container mx-auto max-w-4xl px-6 py-6">
        <FAQClient categories={FAQ_CATEGORIES} />
      </main>
    </div>
  )
}
