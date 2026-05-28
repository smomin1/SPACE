import { FAQClient } from '@/components/faq/FAQClient'
import { FAQ_CATEGORIES } from '@/lib/faq-data'

export const metadata = {
  title: 'FAQ — SPACE',
  description: 'Answers to common questions about SPACE, Tool Scanner, and Tool Evaluator.',
}

export default function FAQPage() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-10">
      <FAQClient categories={FAQ_CATEGORIES} />
    </div>
  )
}
