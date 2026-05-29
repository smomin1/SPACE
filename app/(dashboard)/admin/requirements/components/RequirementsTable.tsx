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
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import {
  PlusIcon,
  FilterXIcon,
  PencilIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  CheckIcon,
  PlusCircleIcon,
  SearchIcon,
} from 'lucide-react'
import type { Requirement } from '@prisma/client'

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
import {
  TypeBadge,
  WeightTier,
  ComplianceGateBadge,
} from '@/components/admin/_shared/badges'
import { BulkImportDialog } from '@/components/admin/requirements/BulkImportDialog'

const PAGE_SIZE = 25

// ── Column header with sort ──────────────────────────────────────────────────

function ColHeader<T, V>({
  column,
  title,
}: {
  column: import('@tanstack/react-table').Column<T, V>
  title: string
}) {
  if (!column.getCanSort()) return <span>{title}</span>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2 h-7 text-xs font-medium text-stone-500 hover:text-emerald-950">
          {title}
          {column.getIsSorted() === 'desc' ? (
            <ArrowDownIcon className="ml-1 size-3" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUpIcon className="ml-1 size-3" />
          ) : (
            <ChevronsUpDownIcon className="ml-1 size-3 opacity-40" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowUpIcon className="mr-2 size-3.5" /> Asc
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowDownIcon className="mr-2 size-3.5" /> Desc
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => column.clearSorting()}>
          <ChevronsUpDownIcon className="mr-2 size-3.5" /> Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Faceted filter ───────────────────────────────────────────────────────────

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
          className="h-8 border-stone-200 text-xs font-medium text-stone-600 hover:border-stone-300 hover:bg-stone-50"
        >
          <PlusCircleIcon className="mr-1.5 size-3.5 text-stone-400" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-3.5" />
              <span className="font-mono text-[11px] text-emerald-700">{selected.size}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {options.map((opt) => {
          const active = selected.has(opt.value)
          return (
            <div
              key={opt.value}
              className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-stone-50"
              onClick={() => {
                if (active) selected.delete(opt.value)
                else selected.add(opt.value)
                const vals = [...selected]
                column.setFilterValue(vals.length ? vals : undefined)
              }}
            >
              <div
                className={cn(
                  'mr-2 flex size-4 items-center justify-center rounded-sm border',
                  active
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-stone-300 opacity-60'
                )}
              >
                {active && <CheckIcon className="size-3" />}
              </div>
              <span className="flex-1 text-emerald-950">{opt.label}</span>
              {facets.get(opt.value) != null && (
                <span className="ml-auto font-mono text-[11px] text-stone-400">
                  {facets.get(opt.value)}
                </span>
              )}
            </div>
          )
        })}
        {selected.size > 0 && (
          <>
            <Separator className="my-1" />
            <div
              className="cursor-pointer rounded-sm px-2 py-1.5 text-center text-xs text-stone-500 hover:bg-stone-50"
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

// ── Delete action ────────────────────────────────────────────────────────────

function DeleteAction({ req }: { req: Requirement }) {
  const router = useRouter()
  const [err, setErr] = React.useState<string | null>(null)

  async function handleDelete() {
    setErr(null)
    const res = await fetch(`/api/requirements/${req.id}`, { method: 'DELETE' })
    if (res.status === 204) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setErr(
        data.code === 'HAS_SCORES'
          ? 'Cannot delete - this requirement has recorded scores.'
          : (data.error ?? 'Delete failed.')
      )
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 text-stone-400 hover:text-amber-700"
        >
          <Trash2Icon className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>&ldquo;{req.title}&rdquo;</strong> will be permanently removed.
            {err && <span className="mt-1 block font-medium text-amber-800">{err}</span>}
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

// ── Column definitions ───────────────────────────────────────────────────────

// Inline checkbox styled to match the rest of the app (no shadcn Checkbox in this project)
function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all cursor-pointer',
        checked || indeterminate
          ? 'border-emerald-700 bg-emerald-700 text-white'
          : 'border-stone-300 bg-white hover:border-stone-400',
      )}
    >
      {indeterminate ? (
        <span className="block h-0.5 w-2 rounded bg-white" />
      ) : checked ? (
        <CheckIcon className="size-2.5" />
      ) : null}
    </button>
  )
}

function buildColumns(): ColumnDef<Requirement>[] {
  return [
    {
      id: 'select',
      size: 32,
      enableSorting: false,
      enableColumnFilter: false,
      header: ({ table }) => (
        <SelectCheckbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
          }
          onChange={(v) => table.toggleAllPageRowsSelected(v)}
          ariaLabel="Select all on page"
        />
      ),
      cell: ({ row }) => (
        <SelectCheckbox
          checked={row.getIsSelected()}
          onChange={(v) => row.toggleSelected(v)}
          ariaLabel={`Select ${row.original.title}`}
        />
      ),
    },
    {
      accessorKey: 'order',
      header: '#',
      size: 48,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-stone-400 tabular-nums">
          {row.original.order}
        </span>
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <ColHeader column={column} title="Requirement" />,
      cell: ({ row }) => (
        <span className={cn('text-[13px] text-emerald-950', row.original.isComplianceGate && 'font-medium')}>
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <ColHeader column={column} title="Category" />,
      cell: ({ row }) =>
        row.original.category ? (
          <span className="text-[13px] text-emerald-950/70">{row.original.category}</span>
        ) : (
          <span className="text-stone-400">-</span>
        ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'evaluatorType',
      header: 'Type',
      cell: ({ row }) => <TypeBadge value={row.original.evaluatorType} />,
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'weight',
      header: 'Weight',
      cell: ({ row }) => <WeightTier value={row.original.weight} />,
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'isComplianceGate',
      header: 'Gate',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => row.original.isComplianceGate ? <ComplianceGateBadge /> : null,
    },
    {
      id: 'actions',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="size-7 p-0 text-stone-400 hover:text-emerald-800" asChild>
            <Link href={`/admin/requirements/${row.original.id}/edit`}>
              <PencilIcon className="size-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteAction req={row.original} />
        </div>
      ),
    },
  ]
}

// ── Main component ───────────────────────────────────────────────────────────

interface RequirementsTableProps {
  initialData: Requirement[]
}

export function RequirementsTable({ initialData }: RequirementsTableProps) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'category', desc: false },
    { id: 'order', desc: false },
  ])
  const [gatesOnly, setGatesOnly] = React.useState(false)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [bulkDeleteResult, setBulkDeleteResult] = React.useState<
    { deleted: number; failed: { id: string; title: string; reason: string }[] } | null
  >(null)
  const [bulkDeleting, setBulkDeleting] = React.useState(false)

  const columns = React.useMemo(buildColumns, [])

  const data = React.useMemo(
    () => (gatesOnly ? initialData.filter((r) => r.isComplianceGate) : initialData),
    [initialData, gatesOnly]
  )

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: PAGE_SIZE, pageIndex: 0 } },
    state: { columnFilters, globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  )

  async function runBulkDelete() {
    setBulkDeleting(true)
    setBulkDeleteResult(null)
    try {
      const res = await fetch('/api/requirements/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBulkDeleteResult({ deleted: 0, failed: [{ id: '', title: data.error ?? 'Delete failed', reason: 'UNKNOWN' }] })
      } else {
        setBulkDeleteResult({ deleted: data.deleted ?? 0, failed: data.failed ?? [] })
        if ((data.deleted ?? 0) > 0) {
          setRowSelection({})
          router.refresh()
        }
      }
    } finally {
      setBulkDeleting(false)
    }
  }

  const isFiltered = columnFilters.length > 0 || globalFilter !== '' || gatesOnly
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
          <Input
            placeholder="Search requirements…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-72 pl-8 text-sm border-stone-200 placeholder:text-stone-400"
          />
        </div>

        <FacetFilter
          column={table.getColumn('evaluatorType')!}
          title="Type"
          options={[
            { label: 'Pedagogy',  value: 'PEDAGOGY' },
            { label: 'Technical', value: 'TECHNICAL' },
            { label: 'Both',      value: 'BOTH' },
          ]}
        />

        <FacetFilter
          column={table.getColumn('weight')!}
          title="Weight"
          options={[
            { label: 'High (3×)',    value: 'HIGH' },
            { label: 'Medium (2×)', value: 'MEDIUM' },
            { label: 'Low (1×)',    value: 'LOW' },
          ]}
        />

        <Button
          variant={gatesOnly ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs',
            gatesOnly
              ? 'bg-amber-700 text-amber-50 hover:bg-amber-800 border-transparent'
              : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
          )}
          onClick={() => setGatesOnly((v) => !v)}
        >
          <ComplianceGateBadge />
          only
        </Button>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-stone-500 hover:text-emerald-950"
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter('')
              setGatesOnly(false)
            }}
          >
            <FilterXIcon className="mr-1 size-3.5" />
            Reset
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <BulkImportDialog onSuccess={() => router.refresh()} />
          <Button size="sm" className="h-8 bg-emerald-800 hover:bg-emerald-900 text-white" asChild>
            <Link href="/admin/requirements/new">
              <PlusIcon className="mr-1.5 size-3.5" />
              New Requirement
            </Link>
          </Button>
        </div>
      </div>

      {/* Bulk action bar - shown when one or more rows are selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-900/[0.04] px-3 py-2 ring-1 ring-emerald-900/10">
          <p className="text-[13px] text-emerald-950">
            <span className="font-mono tabular-nums font-semibold">{selectedIds.length}</span>{' '}
            requirement{selectedIds.length === 1 ? '' : 's'} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-stone-600 hover:text-emerald-950"
              onClick={() => setRowSelection({})}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 border-amber-300 text-xs text-amber-800 hover:bg-amber-50"
              onClick={() => {
                setBulkDeleteResult(null)
                setBulkDeleteOpen(true)
              }}
            >
              <Trash2Icon className="size-3.5" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} requirement{selectedIds.length === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteResult ? (
                <span className="block space-y-2">
                  {bulkDeleteResult.deleted > 0 && (
                    <span className="block text-emerald-800">
                      Deleted <strong>{bulkDeleteResult.deleted}</strong> requirement
                      {bulkDeleteResult.deleted === 1 ? '' : 's'}.
                    </span>
                  )}
                  {bulkDeleteResult.failed.length > 0 && (
                    <span className="block">
                      <span className="block font-medium text-amber-800">
                        {bulkDeleteResult.failed.length} could not be deleted:
                      </span>
                      <span className="mt-1 block max-h-32 overflow-y-auto rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 ring-1 ring-amber-200">
                        {bulkDeleteResult.failed.map((f, i) => (
                          <span key={i} className="block">
                            &ldquo;{f.title}&rdquo;{' '}
                            <span className="text-amber-700">
                              ({f.reason === 'HAS_SCORES'
                                ? 'has recorded scores'
                                : f.reason === 'NOT_FOUND'
                                  ? 'not found'
                                  : 'error'})
                            </span>
                          </span>
                        ))}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  This will permanently remove the selected requirements. Items with
                  recorded scores will be skipped and reported.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {bulkDeleteResult ? (
              <AlertDialogAction onClick={() => setBulkDeleteOpen(false)}>
                Done
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-amber-700 text-amber-50 hover:bg-amber-800"
                  disabled={bulkDeleting}
                  onClick={(e) => {
                    e.preventDefault()
                    runBulkDelete()
                  }}
                >
                  {bulkDeleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Table */}
      <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-stone-200/80 bg-stone-50/60 hover:bg-stone-50/60">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-xs font-medium text-stone-500 h-9">
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
                  className={cn(
                    'border-b border-stone-200/60 transition-colors',
                    row.original.isComplianceGate
                      ? 'bg-amber-50/30 hover:bg-amber-50/50'
                      : 'hover:bg-emerald-900/[0.025]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-stone-400"
                >
                  No requirements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-stone-500 tabular-nums">
        <span>
          {totalRows === 0
            ? 'No results'
            : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalRows)} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0 border-stone-200"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0 border-stone-200"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <span className="px-2">
            Page {pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0 border-stone-200"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0 border-stone-200"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
