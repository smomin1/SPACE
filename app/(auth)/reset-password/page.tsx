'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <React.Suspense>
      <ResetPasswordForm />
    </React.Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [showPwd, setShowPwd] = React.useState(false)
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (res.ok) {
        setStatus('done')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Something went wrong.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Something went wrong.')
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <Card className="w-full max-w-sm shadow-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-sm text-red-500">Invalid or missing reset link.</p>
            <Button asChild variant="ghost">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4">
      <div className="mb-8 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dome.svg" alt="SPACE" className="size-20" />
        <p className="mt-3 font-serif text-[28px] tracking-[0.18em] text-gold">SPACE</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white">
          Software Platform Analysis, Comparison, and Evaluation
        </p>
      </div>

      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-[22px] tracking-tight text-emerald-950">
            Set new password
          </CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'done' ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-emerald-800">Password updated successfully.</p>
              <Button asChild className="w-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
              </div>
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Saving…' : 'Set new password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
