'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { screeningQuestionBaseSchema } from '@/lib/screening-schema'
import type { ScreeningQuestionFormValues } from '@/lib/screening-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const NEW_CATEGORY_SENTINEL = '__new__'
const NO_HARD_FAIL = '__none__'

interface ScreeningQuestionFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<ScreeningQuestionFormValues>
  id?: string
  categories?: string[]
  backPath?: string
}

export function ScreeningQuestionForm({
  mode,
  defaultValues,
  id,
  categories = [],
  backPath = '/admin/screening-questions',
}: ScreeningQuestionFormProps) {
  const router = useRouter()

  const initialIsNew =
    categories.length === 0 ||
    (!!defaultValues?.category && !categories.includes(defaultValues.category))
  const [isNewCategory, setIsNewCategory] = React.useState(initialIsNew)

  const form = useForm<ScreeningQuestionFormValues>({
    resolver: zodResolver(screeningQuestionBaseSchema) as never,
    defaultValues: {
      num: 1,
      category: '',
      question: '',
      whatToLookFor: null,
      hardFail: null,
      ...defaultValues,
    },
  })

  async function onSubmit(values: ScreeningQuestionFormValues) {
    const url = mode === 'create' ? '/api/screening-questions' : `/api/screening-questions/${id}`
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

    router.push(backPath)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <FormField
            control={form.control}
            name="num"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Order</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                {!isNewCategory && categories.length > 0 ? (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => {
                      if (v === NEW_CATEGORY_SENTINEL) {
                        field.onChange('')
                        setIsNewCategory(true)
                      } else {
                        field.onChange(v)
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CATEGORY_SENTINEL} className="text-muted-foreground italic">
                        + Add new category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <FormControl>
                      <Input
                        placeholder="e.g. Assessment, Safeguarding"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        autoFocus={isNewCategory && categories.length > 0}
                      />
                    </FormControl>
                    {categories.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-0.5"
                        onClick={() => {
                          field.onChange('')
                          setIsNewCategory(false)
                        }}
                      >
                        Choose existing category
                      </button>
                    )}
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="The screening question the AI should answer"
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="whatToLookFor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What to look for</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Evidence hint for the AI (keywords, pages, signals to search for)"
                  className="resize-none"
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormDescription>Optional guidance shown to the AI investigator</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hardFail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hard-fail rule</FormLabel>
              <Select
                value={field.value ?? NO_HARD_FAIL}
                onValueChange={(v) => field.onChange(v === NO_HARD_FAIL ? null : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_HARD_FAIL}>None</SelectItem>
                  <SelectItem value="IF_YES">Hard-fail if answered Yes</SelectItem>
                  <SelectItem value="IF_NO">Hard-fail if answered No</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                A hard-fail answer flags the platform as a safeguarding blocker
              </FormDescription>
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
                ? 'Create Question'
                : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/screening-questions')}
          >
            Discard
          </Button>
        </div>
      </form>
    </Form>
  )
}
