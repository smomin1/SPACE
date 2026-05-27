'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const profileSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(120),
    email: z.string().email('Invalid email address').max(200),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.newPassword && !d.currentPassword) return false
      return true
    },
    { message: 'Current password is required', path: ['currentPassword'] },
  )
  .refine(
    (d) => {
      if (d.newPassword && d.newPassword !== d.confirmPassword) return false
      return true
    },
    { message: 'Passwords do not match', path: ['confirmPassword'] },
  )

type FormValues = z.infer<typeof profileSchema>

interface Props {
  initialName: string
  initialEmail: string
}

export function ProfileForm({ initialName, initialEmail }: Props) {
  const router = useRouter()
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialName,
      email: initialEmail,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const watchNewPassword = form.watch('newPassword')

  async function onSubmit(values: FormValues) {
    const payload: Record<string, string> = {}

    if (values.name !== initialName) payload.name = values.name
    if (values.email !== initialEmail) payload.email = values.email
    if (values.newPassword) {
      payload.currentPassword = values.currentPassword!
      payload.newPassword = values.newPassword
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save.')
      return
    }

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      form.setError('root', { message: data.error ?? 'An error occurred. Please try again.' })
      return
    }

    toast.success('Profile updated successfully.')
    // Clear password fields
    form.reset({
      name: data.user.name,
      email: data.user.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Identity */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Identity
          </h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  Changing your email will take effect on your next sign-in.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Password */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Change password
          </h2>
          <p className="text-sm text-muted-foreground -mt-3">
            Leave these blank if you do not want to change your password.
          </p>

          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchNewPassword && (
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
