'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, XIcon, ClockIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@prisma/client'
import { cn, formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AccessRequest = {
  id: string
  email: string
  name: string
  team: string
  requestedRole: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes: string | null
  createdAt: Date | string
  reviewedAt: Date | string | null
  reviewedBy: { id: string; name: string } | null
}

const TEAM_LABELS: Record<string, string> = {
  STRATEGY_1:              'Strategy 1',
  STRATEGY_2:              'Strategy 2',
  STRATEGY_3:              'Strategy 3',
  STRATEGY_4:              'Strategy 4',
  STRATEGY_5:              'Strategy 5',
  STRATEGY_6:              'Strategy 6',
  STRATEGY_7:              'Strategy 7',
  IMPLEMENTATION_LAB:      'Implementation Lab',
  LEARNING_SCIENCES:       'Learning Sciences',
  EMERGING_TECHNOLOGY:     'Emerging Technology',
  RESEARCH_AND_INNOVATION: 'Research & Innovation',
  STEERING_COMMITTEE:      'Steering Committee',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-800 ring-amber-300/60',
  APPROVED: 'bg-emerald-100 text-emerald-800 ring-emerald-300/60',
  REJECTED: 'bg-red-100 text-red-800 ring-red-300/60',
}

function ActionButtons({ request }: { request: AccessRequest }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState<'approve' | 'reject' | null>(null)
  const [tempPassword, setTempPassword] = React.useState<string | null>(null)

  async function act(action: 'approve' | 'reject') {
    setLoading(action)
    try {
      const res = await fetch(`/api/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (action === 'approve') {
          if (data.emailSent === false && data.tempPassword) {
            setTempPassword(data.tempPassword)
          } else {
            toast.success(`Approved: temporary password emailed to ${request.email}`)
          }
        } else {
          toast.success(`Rejected request from ${request.name}`)
        }
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? `Failed to ${action}`)
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {/* Shown when email delivery fails; admin can copy and share manually */}
      <Dialog open={tempPassword !== null} onOpenChange={(open) => { if (!open) setTempPassword(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account created, email not sent</DialogTitle>
            <DialogDescription>
              The account for <strong>{request.name}</strong> ({request.email}) was created but the welcome email could not be delivered. Share this temporary password with them directly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <span className="flex-1 font-mono text-lg tracking-widest text-emerald-900">
              {tempPassword}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(tempPassword ?? '')
                toast.success('Copied to clipboard')
              }}
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
          <p className="text-[12px] text-stone-500">
            They will be required to set a new password on first sign-in.
          </p>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-emerald-800 hover:bg-emerald-50"
        onClick={() => act('approve')}
        disabled={loading !== null}
        title="Approve and create account"
      >
        <CheckIcon className="mr-1 size-3.5" />
        Approve
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-red-700 hover:bg-red-50"
            disabled={loading !== null}
            title="Reject request"
          >
            <XIcon className="mr-1 size-3.5" />
            Reject
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject access request?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{request.name}</strong> ({request.email}) will be notified that their request was not approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 text-red-50 hover:bg-red-800"
              onClick={() => act('reject')}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}

interface AccessRequestsTableProps {
  initialData: AccessRequest[]
}

export function AccessRequestsTable({ initialData }: AccessRequestsTableProps) {
  const [filter, setFilter] = React.useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

  const rows = filter === 'ALL' ? initialData : initialData.filter((r) => r.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
              filter === f
                ? 'bg-emerald-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
            )}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== 'ALL' && (
              <span className="ml-1.5 font-mono tabular-nums">
                {initialData.filter((r) => r.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-stone-200/80 bg-stone-50/60 hover:bg-stone-50/60">
              <TableHead className="h-9 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Name</TableHead>
              <TableHead className="h-9 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Email</TableHead>
              <TableHead className="h-9 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Team</TableHead>
              <TableHead className="h-9 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Role requested</TableHead>
              <TableHead className="h-9 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Status</TableHead>
              <TableHead className="h-9 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Submitted</TableHead>
              <TableHead className="h-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((req) => (
                <TableRow key={req.id} className="border-b border-stone-200/60 last:border-b-0 hover:bg-emerald-900/[0.025]">
                  <TableCell className="py-2.5 align-top font-medium text-emerald-950">
                    {req.name}
                    {req.notes && (
                      <p className="mt-1 max-w-sm whitespace-pre-wrap break-words text-[11px] font-normal leading-relaxed text-stone-500">
                        {req.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 align-top font-mono text-[12.5px] text-stone-600">{req.email}</TableCell>
                  <TableCell className="py-2.5 align-top text-[13px]">{TEAM_LABELS[req.team] ?? req.team}</TableCell>
                  <TableCell className="py-2.5 align-top text-[13px]">
                    {ROLE_LABELS[req.requestedRole as Role] ?? req.requestedRole}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', STATUS_BADGE[req.status])}>
                      {req.status === 'PENDING' && <ClockIcon className="size-3" />}
                      {req.status === 'APPROVED' && <CheckIcon className="size-3" />}
                      {req.status === 'REJECTED' && <XIcon className="size-3" />}
                      {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                    </span>
                    {req.reviewedBy && (
                      <p className="mt-0.5 text-[11px] text-stone-400">by {req.reviewedBy.name}</p>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-[12.5px] text-stone-500 tabular-nums">
                    {formatDate(req.createdAt)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {req.status === 'PENDING' && <ActionButtons request={req} />}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-stone-500">
                  No {filter === 'ALL' ? '' : filter.toLowerCase()} requests.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
