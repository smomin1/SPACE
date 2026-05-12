import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'access:admin')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return Response.json({ ok: true })
}
