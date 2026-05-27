"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldAlertIcon } from "lucide-react"

import { requirementBaseSchema } from "@/lib/requirement-schema"
import type { z } from "zod"

type RequirementFormValues = z.output<typeof requirementBaseSchema>

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { ComplianceGateBadge } from "@/components/admin/_shared/badges"

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
      order: 0,
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

  /* Override shadcn FormLabel style to match the eyebrow treatment */
  const labelClass = "text-[11.5px] font-semibold uppercase tracking-[0.08em] text-emerald-950/70"

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-3xl divide-y divide-stone-200/70"
      >
        {/* ── 01 Statement ─────────────────────────────────────────── */}
        <FormSection
          index={1}
          title="Statement"
          description="A short, evaluable claim. One assertion per requirement."
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  Title <span className="ml-1 text-amber-700/80">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. WCAG 2.2 AA conformance" {...field} />
                </FormControl>
                <FormMessage className="text-[12px] text-amber-800" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  Description
                  <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-stone-500">
                    Describe what reviewers should look for
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what this requirement evaluates"
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[12px] text-amber-800" />
              </FormItem>
            )}
          />
        </FormSection>

        {/* ── 02 Classification ────────────────────────────────────── */}
        <FormSection
          index={2}
          title="Classification"
          description="Determines which evaluator scores this requirement and how much it counts."
        >
          <div className="grid grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="evaluatorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Evaluator type <span className="ml-1 text-amber-700/80">*</span>
                  </FormLabel>
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
                  <FormMessage className="text-[12px] text-amber-800" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Weight <span className="ml-1 text-amber-700/80">*</span>
                  </FormLabel>
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
                  <FormMessage className="text-[12px] text-amber-800" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Category
                    <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-stone-500">
                      Optional · groups in the data table
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Compliance, Interoperability"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage className="text-[12px] text-amber-800" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Display order
                    <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-stone-500">
                      Sort position
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage className="text-[12px] text-amber-800" />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* ── 03 Compliance gate ───────────────────────────────────── */}
        <FormSection
          index={3}
          title="Compliance gate"
          description="A gated requirement immediately disqualifies a platform on failure."
        >
          <FormField
            control={form.control}
            name="isComplianceGate"
            render={({ field }) => (
              <FormItem
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  field.value
                    ? "border-amber-700/30 bg-amber-50/40"
                    : "border-stone-200/80 bg-white",
                )}
              >
                <div className="flex items-start gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="cursor-pointer text-[13.5px] font-medium normal-case tracking-normal text-emerald-950">
                      Make this requirement a compliance gate
                    </FormLabel>
                    <FormDescription className="mt-0.5 text-[12.5px] text-stone-600">
                      When enabled, a FAIL score on this item halts the evaluation and marks the
                      platform as disqualified.
                    </FormDescription>
                  </div>
                  {field.value && <ComplianceGateBadge />}
                </div>

                {field.value && (
                  <div className="mt-4 ml-12 flex gap-3 rounded-lg bg-white/70 p-3 ring-1 ring-amber-700/20">
                    <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-800" />
                    <div className="text-[12.5px] leading-relaxed text-amber-900">
                      <p className="font-semibold tracking-tight">Compliance gate active</p>
                      <p className="mt-0.5 text-amber-900/85">
                        A <span className="font-semibold">FAIL</span> on this requirement will
                        immediately <span className="font-semibold">disqualify the entire platform</span>{" "}
                        from evaluation and halt further scoring. Enable only for hard pass/fail
                        blockers.
                      </p>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          {watchIsComplianceGate && (
            <p className="text-[12.5px] text-stone-500">
              Note: a compliance gate is enabled. A No/Fail score will immediately disqualify the platform.
            </p>
          )}
        </FormSection>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6">
          <div className="text-[12px] text-stone-500">
            {form.formState.errors.root ? (
              <span className="font-medium text-amber-800">
                {form.formState.errors.root.message}
              </span>
            ) : (
              <>Required fields marked with <span className="text-amber-700/80">*</span></>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/requirements")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Create Requirement"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

function FormSection({
  index,
  title,
  description,
  children,
}: {
  index: number
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid grid-cols-12 gap-x-8 gap-y-5 py-8 first:pt-0">
      <div className="col-span-12 md:col-span-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums tracking-wider text-emerald-700/80">
            0{index}
          </span>
          <h2 className="font-serif text-[16px] tracking-tight text-emerald-950">{title}</h2>
        </div>
        {description && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-500">{description}</p>
        )}
      </div>
      <div className="col-span-12 space-y-5 md:col-span-8">{children}</div>
    </section>
  )
}
