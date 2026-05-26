'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldAlertIcon } from 'lucide-react'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import { requirementBaseSchema } from '@/lib/requirement-schema'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type FormValues = z.output<typeof requirementBaseSchema>
type FormInput = z.input<typeof requirementBaseSchema>

interface RequirementFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<FormInput>
  id?: string
}

export function RequirementForm({ mode, defaultValues, id }: RequirementFormProps) {
  const router = useRouter()
  const [showGateDialog, setShowGateDialog] = React.useState(false)
  // Stores the resolver callback passed by the AlertDialog confirmation
  const confirmGateRef = React.useRef<(() => void) | null>(null)

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(requirementBaseSchema) as never,
    defaultValues: {
      title: '',
      description: '',
      evaluatorType: 'COMPLIANCE',
      weight: 'MEDIUM',
      isComplianceGate: false,
      category: null,
      order: 0,
      ...defaultValues,
    },
  })

  const watchIsComplianceGate = form.watch('isComplianceGate')
  const watchEvaluatorType = form.watch('evaluatorType')

  function handleComplianceGateChange(
    currentValue: boolean,
    onChange: (v: boolean) => void
  ) {
    if (!currentValue) {
      // User is trying to ENABLE it - show warning dialog first
      confirmGateRef.current = () => onChange(true)
      setShowGateDialog(true)
    } else {
      // User is disabling - no confirmation needed
      onChange(false)
    }
  }

  async function onSubmit(values: FormValues) {
    const url =
      mode === 'create' ? '/api/requirements' : `/api/requirements/${id}`
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

    router.push('/admin/requirements')
    router.refresh()
  }

  return (
    <>
      {/* Compliance gate confirmation dialog - shown before the toggle is enabled */}
      <AlertDialog open={showGateDialog} onOpenChange={setShowGateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlertIcon className="size-5" />
              Enable Compliance Gate?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                <span>A FAIL score on this requirement will</span>{' '}
                <strong className="text-destructive">
                  immediately disqualify the entire platform
                </strong>{' '}
                from evaluation and halt all further scoring.
              </span>
              <span className="block">
                This setting is intended only for hard pass/fail blockers - legal,
                accessibility, or safety requirements where failure is absolute.
              </span>
              <span className="block font-medium">
                Are you sure you want to enable the compliance gate on this requirement?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                confirmGateRef.current = null
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                confirmGateRef.current?.()
                confirmGateRef.current = null
                setShowGateDialog(false)
              }}
            >
              Enable Compliance Gate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Requirement title" {...field} />
                </FormControl>
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
                    placeholder="Describe what this requirement evaluates"
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="evaluatorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evaluator Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                      <SelectItem value="PEDAGOGY">Pedagogy</SelectItem>
                      <SelectItem value="TECHNICAL">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select weight" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="HIGH">High (3×)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (2×)</SelectItem>
                      <SelectItem value="LOW">Low (1×)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Compliance, Interoperability"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription>Optional grouping label</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>Sort position within category</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isComplianceGate"
            render={({ field }) => (
              <FormItem
                onClick={() => handleComplianceGateChange(field.value, field.onChange)}
                className={cn(
                  'flex flex-row items-center gap-3 rounded-lg border p-4 transition-colors cursor-pointer select-none',
                  watchIsComplianceGate
                    ? 'border-amber-500 bg-amber-100/80'
                    : 'border-stone-200/80 hover:bg-stone-50/50',
                )}
              >
                <FormControl>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    aria-label="Compliance gate"
                  />
                </FormControl>
                <div className={cn(
                  'size-5 shrink-0 rounded-full border-2 transition-all flex items-center justify-center',
                  watchIsComplianceGate
                    ? 'border-amber-700 bg-amber-700'
                    : 'border-stone-300 bg-white',
                )}>
                  {watchIsComplianceGate && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <FormLabel className={cn('cursor-pointer text-base', watchIsComplianceGate && 'text-amber-900')}>
                    Compliance Gate
                    {watchIsComplianceGate && (
                      <span className="ml-2 text-xs font-normal text-amber-700">
                        (active: FAIL disqualifies platform)
                      </span>
                    )}
                  </FormLabel>
                  <FormDescription>
                    A FAIL score on this requirement immediately disqualifies the platform
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {watchIsComplianceGate && watchEvaluatorType !== 'COMPLIANCE' && (
            <p className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-800">
              Note: Compliance gate is enabled for a non-Compliance evaluator type. The
              platform disqualification rule still applies.
            </p>
          )}

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
                  ? 'Create Requirement'
                  : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/requirements')}
            >
              Discard
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
