'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2Icon } from 'lucide-react'
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

export function DeleteToolScanButton({ id, platformName }: { id: string; platformName: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/tool-scanner/evaluations/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex size-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-amber-800"
          aria-label={`Delete ${platformName}`}
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this evaluation?</AlertDialogTitle>
          <AlertDialogDescription>
            The Tool Scanner evaluation for <strong>{platformName}</strong> will be permanently
            removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
