'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export function CefrRegisterDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [vendor, setVendor] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function reset() {
    setName('')
    setVendor('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/cefr/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), vendor: vendor.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      toast.success(`"${name.trim()}" registered for CEFR evaluation`)
      setOpen(false)
      reset()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="bg-emerald-800 hover:bg-emerald-900 text-white"
        onClick={() => { reset(); setOpen(true) }}
      >
        <PlusIcon className="mr-1.5 size-3.5" />
        Register Platform
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) { setOpen(v); if (!v) reset() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Platform for CEFR</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="cefr-name">Platform name</Label>
              <Input
                id="cefr-name"
                placeholder="e.g. Canvas LMS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cefr-vendor">Vendor</Label>
              <Input
                id="cefr-vendor"
                placeholder="e.g. Instructure"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-[13px] font-medium text-destructive">{error}</p>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => { setOpen(false); reset() }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim() || !vendor.trim()}>
                {loading ? 'Registering…' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
