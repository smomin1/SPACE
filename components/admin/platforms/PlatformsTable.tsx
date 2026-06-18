'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import {
  PlusIcon,
  FilterXIcon,
  EyeIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  PlusCircleIcon,
  CheckIcon,
  SearchIcon,
} from 'lucide-react'
import type { EvaluationState, LicenceType } from '@prisma/client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { EvalStateBadge, StatusChip } from '@/components/admin/_shared/badges'
import { toast } from 'sonner'

type PlatformRow = {
  id: string
  name: string
  vendor: string
  track: string
  licenceType: LicenceType | null
  trialAvailable: boolean
  evaluatorAssignments: { id: string; evaluatorType: string }[]
  evaluations: { id: string; state: EvaluationState }[]
  vitalTools?: { id: string; v2Percent: number | null }[]
  cefrEvaluation?: { status: 'DRAFT' | 'COMPLETED' } | null
}

const PAGE_SIZE = 25

const LICENCE_LABELS: Partial<Record<LicenceType, string>> = {
  PERPETUAL: 'Perpetual',
  SUBSCRIPTION: 'Subscription',
  PER_SEAT: 'Per Seat',
  SITE_LICENCE: 'Site Licence',
  OPEN_SOURCE: 'Open Source',
}

function ColHeader<T, V>({
  column,
  title,
}: {
  column: import('@tanstack/react-table').Column<T, V>
  title: string
}) {
  if (!column.getCanSort()) {
    return (
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
        {title}
      </span>
    )
  }
  const sorted = column.getIsSorted()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            '-ml-1.5 h-6 px-1.5 text-[11px] font-medium uppercase tracking-[0.08em]',
            sorted ? 'text-emerald-900' : 'text-emerald-950/55 hover:text-emerald-950',
          )}
        >
          {title}
          {sorted === 'desc' ? (
            <ArrowDownIcon className="ml-1 size-3 text-emerald-800" />
          ) : sorted === 'asc' ? (
            <ArrowUpIcon className="ml-1 size-3 text-emerald-800" />
          ) : (
            <ChevronsUpDownIcon className="ml-1 size-3 text-stone-400" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowUpIcon className="mr-2 size-3.5 text-emerald-800/70" /> Asc
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowDownIcon className="mr-2 size-3.5 text-emerald-800/70" /> Desc
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => column.clearSorting()}>
          <ChevronsUpDownIcon className="mr-2 size-3.5 text-stone-500" /> Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FacetFilter<T, V>({
  column,
  title,
  options,
}: {
  column: import('@tanstack/react-table').Column<T, V>
  title: string
  options: { label: string; value: string }[]
}) {
  const selected = new Set(column.getFilterValue() as string[] | undefined)
  const facets = column.getFacetedUniqueValues()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed border-stone-300 bg-transparent text-emerald-950/75 hover:border-emerald-900/30 hover:bg-stone-50 hover:text-emerald-950"
        >
          <PlusCircleIcon className="mr-1.5 size-3.5 text-emerald-800/70" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-3.5 bg-stone-300" />
              <span className="font-mono text-[10.5px] tabular-nums text-emerald-800">
                {selected.size}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
          Filter by {title}
        </div>
        {options.map((opt) => {
          const active = selected.has(opt.value)
          return (
            <div
              key={opt.value}
              role="button"
              tabIndex={0}
              className="flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-[13px] text-emerald-950 hover:bg-emerald-900/[0.04]"
              onClick={() => {
                if (active) selected.delete(opt.value)
                else selected.add(opt.value)
                const vals = [...selected]
                column.setFilterValue(vals.length ? vals : undefined)
              }}
            >
              <div
                className={cn(
                  'mr-2.5 flex size-4 items-center justify-center rounded border transition-colors',
                  active
                    ? 'border-emerald-800 bg-emerald-700 text-white'
                    : 'border-stone-300 [&_svg]:invisible',
                )}
              >
                <CheckIcon className="size-3" strokeWidth={3} />
              </div>
              <span className="flex-1">{opt.label}</span>
              {facets.get(opt.value) != null && (
                <span className="ml-auto font-mono text-[10.5px] tabular-nums text-stone-500">
                  {facets.get(opt.value)}
                </span>
              )}
            </div>
          )
        })}
        {selected.size > 0 && (
          <>
            <Separator className="my-1 bg-stone-200" />
            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-[12px] text-stone-500 hover:bg-stone-50 hover:text-emerald-900"
              onClick={() => column.setFilterValue(undefined)}
            >
              Clear filter
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function DeleteAction({ platform }: { platform: PlatformRow }) {
  const router = useRouter()

  async function handleDelete() {
    const res = await fetch(`/api/platforms/${platform.id}`, { method: 'DELETE' })
    if (res.status === 204) {
      toast.success(`"${platform.name}" deleted`)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(
        data.code === 'HAS_EVALUATIONS'
          ? 'Cannot delete - this platform has existing evaluations.'
          : (data.error ?? 'Delete failed.'),
      )
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 text-stone-500 hover:bg-amber-50 hover:text-amber-800"
        >
          <Trash2Icon className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete platform?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>&ldquo;{platform.name}&rdquo;</strong> and all its assignments will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-700 text-amber-50 hover:bg-amber-800"
            onClick={handleDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// CEFR and VITAL platforms are assigned through the edit page; flag rows with no
// evaluators so the table prompts an assignment (and links to the edit form).
function needsEvaluatorAssignment(
  activeTab: 'tool' | 'vital' | 'cefr',
  row: PlatformRow,
): boolean {
  if (activeTab === 'cefr') {
    // CEFR is "assigned" once its evaluation exists or a CEFR evaluator is set.
    if (row.cefrEvaluation) return false
    return !row.evaluatorAssignments.some((a) => a.evaluatorType === 'CEFR')
  }
  if (activeTab === 'vital') {
    if (row.evaluatorAssignments.some((a) => a.evaluatorType === 'VITAL')) return false
    // A linked, completed assessment also satisfies the VITAL stage.
    if ((row.vitalTools?.length ?? 0) > 0) return false
    return true
  }
  // Tool Evaluator needs a Pedagogy/Technical evaluator (e.g. a pipeline-advanced
  // platform arrives here with none).
  return !row.evaluatorAssignments.some(
    (a) => a.evaluatorType === 'PEDAGOGY' || a.evaluatorType === 'TECHNICAL' || a.evaluatorType === 'BOTH',
  )
}

function buildColumns(activeTab: 'tool' | 'vital' | 'cefr'): ColumnDef<PlatformRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <ColHeader column={column} title="Platform" />,
      cell: ({ row }) => {
        const needsAssignment = needsEvaluatorAssignment(activeTab, row.original)
        return (
          <Link
            href={needsAssignment ? `/admin/platforms/${row.original.id}/edit` : `/admin/platforms/${row.original.id}`}
            className="font-medium text-emerald-950 decoration-emerald-700/40 underline-offset-2 hover:text-emerald-800 hover:underline"
          >
            {row.original.name}
          </Link>
        )
      },
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => <ColHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="text-stone-600">{row.original.vendor}</span>,
    },
    {
      accessorKey: 'licenceType',
      header: () => (
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
          Licence
        </span>
      ),
      cell: ({ row }) =>
        row.original.licenceType ? (
          <span className="text-emerald-950/85">{LICENCE_LABELS[row.original.licenceType]}</span>
        ) : (
          <span className="text-stone-400">-</span>
        ),
      filterFn: (row, id, value: string[]) => {
        const v = row.getValue(id)
        return v != null && value.includes(v as string)
      },
    },
    {
      id: 'trial',
      header: () => (
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
          Trial
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.trialAvailable ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Available
          </span>
        ) : (
          <span className="text-[12px] text-stone-400">-</span>
        ),
    },
    {
      id: 'evaluators',
      header: () => (
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
          Evaluators
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-[12.5px] tabular-nums text-emerald-950">
          {row.original.evaluatorAssignments.length}
        </span>
      ),
    },
    {
      id: 'evalState',
      header: () => (
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
          Eval Status
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        if (needsEvaluatorAssignment(activeTab, row.original)) {
          return (
            <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Assign evaluation
            </span>
          )
        }
        // CEFR status comes from the CefrEvaluation record (survives the VITAL advance).
        if (activeTab === 'cefr') {
          const status = row.original.cefrEvaluation?.status
          return (
            <StatusChip tone={status === 'COMPLETED' ? 'forest' : 'emerald'}>
              {status === 'COMPLETED' ? 'Completed' : 'In progress'}
            </StatusChip>
          )
        }
        // VITAL satisfied by linking an already-scored assessment → mark Completed.
        if (activeTab === 'vital') {
          const linked = row.original.vitalTools?.find((t) => t.v2Percent != null)
          if (linked) return <StatusChip tone="forest">Completed</StatusChip>
        }
        return <EvalStateBadge value={row.original.evaluations[0]?.state ?? null} />
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => {
        const needsAssignment = needsEvaluatorAssignment(activeTab, row.original)
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="sm" className="size-7 p-0 text-stone-500 hover:text-emerald-900" asChild>
              <Link href={needsAssignment ? `/admin/platforms/${row.original.id}/edit` : `/admin/platforms/${row.original.id}`}>
                <EyeIcon className="size-3.5" />
                <span className="sr-only">View</span>
              </Link>
            </Button>
            <DeleteAction platform={row.original} />
          </div>
        )
      },
    },
  ]
}

interface PlatformsTableProps {
  initialData: PlatformRow[]
  activeTab?: 'tool' | 'vital' | 'cefr'
}

export function PlatformsTable({ initialData, activeTab = 'tool' }: PlatformsTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }])

  const columns = React.useMemo(() => buildColumns(activeTab), [activeTab])

  const table = useReactTable({
    data: initialData,
    columns,
    initialState: { pagination: { pageSize: PAGE_SIZE, pageIndex: 0 } },
    state: { columnFilters, globalFilter, sorting },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isFiltered = columnFilters.length > 0 || globalFilter !== ''
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const totalPages = Math.max(1, table.getPageCount())
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search platforms…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-72 pl-8 text-[12.5px]"
          />
        </div>

        <FacetFilter
          column={table.getColumn('licenceType')!}
          title="Licence"
          options={[
            { label: 'Perpetual', value: 'PERPETUAL' },
            { label: 'Subscription', value: 'SUBSCRIPTION' },
            { label: 'Per Seat', value: 'PER_SEAT' },
            { label: 'Site Licence', value: 'SITE_LICENCE' },
            { label: 'Open Source', value: 'OPEN_SOURCE' },
          ]}
        />

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-stone-500 hover:text-emerald-900"
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter('')
            }}
          >
            <FilterXIcon className="mr-1 size-3.5" />
            Reset
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12px] text-stone-500 md:inline">
            <span className="font-mono tabular-nums text-emerald-950">{initialData.length}</span> platforms
          </span>
          <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white" asChild>
            <Link href={`/admin/platforms/new?track=${activeTab === 'cefr' ? 'CEFR' : activeTab === 'vital' ? 'VITAL' : 'TOOL'}`}>
              <PlusIcon className="mr-1.5 size-3.5" />
              Register Platform
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-stone-200/80 bg-stone-50/60 hover:bg-stone-50/60">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="h-9">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-stone-200/60 transition-colors last:border-b-0 hover:bg-emerald-900/[0.025]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-stone-500">
                  No platforms registered yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[12px] text-stone-500">
          {totalRows === 0 ? 'No results' : (
            <>
              Showing <span className="font-mono tabular-nums text-emerald-950">{from}</span>-<span className="font-mono tabular-nums text-emerald-950">{to}</span> of{' '}
              <span className="font-mono tabular-nums text-emerald-950">{totalRows}</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-stone-500">
            Page <span className="font-mono tabular-nums text-emerald-950">{pageIndex + 1}</span> /{' '}
            <span className="font-mono tabular-nums text-emerald-950">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="size-7 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeftIcon className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="size-7 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeftIcon className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="size-7 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRightIcon className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="size-7 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
