import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ScreeningQuestionsTable } from '@/app/(dashboard)/admin/screening-questions/components/ScreeningQuestionsTable'

export default async function ToolScannerScreeningPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/tool-scanner')

  const questions = await prisma.screeningQuestion.findMany({
    orderBy: { num: 'asc' },
  })

  return <ScreeningQuestionsTable initialData={questions} basePath="/tool-scanner/screening" />
}
