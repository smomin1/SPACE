'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldAlertIcon } from 'lucide-react'
import { z } from 'zod'

import { requirementBaseSchema } from '@/lib/requirement-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
      // User is trying to ENABLE it — show warning dialog first
      confirmGateRef.current = () => onChange(true)
      setShowGateDialog(true)
    } else {
      // User is disabling — no confirmation needed
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
      {/* Compliance gate confirmation dialog — shown before the toggle is enabled */}
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
                This setting is intended only for hard pass/fail blockers — legal,
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
                className={`flex flex-row items-center gap-3 rounded-lg border p-4 transition-colors ${
                  watchIsComplianceGate
                    ? 'border-destructive/50 bg-destructive/5'
                    : ''
                }`}
              >
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      handleComplianceGateChange(field.value, field.onChange)
                    }
                    aria-label="Compliance gate"
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="cursor-pointer text-base">
                    Compliance Gate
                    {watchIsComplianceGate && (
                      <span className="ml-2 text-xs font-normal text-destructive">
                        (active — FAIL disqualifies platform)
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
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Note: Compliance gate is enabled for a non-COMPLIANCE evaluator type. The
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
