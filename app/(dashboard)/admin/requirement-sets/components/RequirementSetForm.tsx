'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { requirementSetBaseSchema } from '@/lib/requirement-set-schema'
import type { RequirementSetFormValues } from '@/lib/requirement-set-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface RequirementSetFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<RequirementSetFormValues>
  id?: string
}

export function RequirementSetForm({ mode, defaultValues, id }: RequirementSetFormProps) {
  const router = useRouter()

  const form = useForm<RequirementSetFormValues>({
    resolver: zodResolver(requirementSetBaseSchema) as never,
    defaultValues: {
      key: '',
      name: '',
      description: null,
      order: 0,
      isActive: true,
      ...defaultValues,
    },
  })

  async function onSubmit(values: RequirementSetFormValues) {
    const url = mode === 'create' ? '/api/requirement-sets' : `/api/requirement-sets/${id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      form.setError('root', { message: data.error ?? 'An error occurred. Please try again.' })
      return
    }

    router.push('/admin/requirement-sets')
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. LMS Platforms" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. lms"
                  disabled={mode === 'edit'}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                />
              </FormControl>
              <FormDescription>
                Lowercase slug used in URLs and API calls. Cannot be changed after creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description of this domain"
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create Requirement Set'
                : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/requirement-sets')}
          >
            Discard
          </Button>
        </div>
      </form>
    </Form>
  )
}
