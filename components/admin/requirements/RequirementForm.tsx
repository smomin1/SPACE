"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldAlertIcon } from "lucide-react"

import { requirementBaseSchema } from "@/lib/requirement-schema"
import type { z } from "zod"

type RequirementFormValues = z.output<typeof requirementBaseSchema>
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type RequirementFormInput = z.input<typeof requirementBaseSchema>

interface RequirementFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<RequirementFormInput>
  id?: string
}

export function RequirementForm({ mode, defaultValues, id }: RequirementFormProps) {
  const router = useRouter()

  const form = useForm<RequirementFormValues, unknown, RequirementFormValues>({
    resolver: zodResolver(requirementBaseSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      evaluatorType: "BOTH",
      weight: "MEDIUM",
      isComplianceGate: false,
      category: null,
      ...defaultValues,
    },
  })

  const watchIsComplianceGate = form.watch("isComplianceGate")
  const watchEvaluatorType = form.watch("evaluatorType")

  async function onSubmit(values: RequirementFormValues) {
    const url =
      mode === "create" ? "/api/admin/requirements" : `/api/admin/requirements/${id}`
    const method = mode === "create" ? "POST" : "PUT"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      form.setError("root", { message: data.error ?? "An error occurred" })
      return
    }

    router.push("/admin/requirements")
    router.refresh()
  }

  return (
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
                    <SelectItem value="PEDAGOGY">Pedagogy</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="BOTH">Both (Pedagogy + Technical)</SelectItem>
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
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormDescription>Optional grouping for the data table</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isComplianceGate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 rounded-lg border p-4">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-0.5">
                <FormLabel className="text-base cursor-pointer">
                  Compliance Gate
                </FormLabel>
                <FormDescription>
                  A FAIL on this requirement immediately disqualifies the platform
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {watchIsComplianceGate && (
          <Alert variant="destructive">
            <ShieldAlertIcon className="h-4 w-4" />
            <AlertTitle>Compliance Gate Active</AlertTitle>
            <AlertDescription>
              A <strong>FAIL</strong> score on this requirement will immediately{" "}
              <strong>disqualify the entire platform</strong> from evaluation and halt
              further scoring. Enable this only for hard pass/fail blockers.
            </AlertDescription>
          </Alert>
        )}

        {watchIsComplianceGate && (
          <p className="text-sm text-muted-foreground">
            Note: Compliance gate is enabled. A No/Fail score will immediately disqualify the platform.
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
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create Requirement"
                : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/requirements")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
