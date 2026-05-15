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
          ? 'Cannot delete — this requirement has recorded scores.'
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

function buildColumns(): ColumnDef<Requirement>[] {
  return [
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
          <span className="text-stone-400">—</span>
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

  const columns = React.useMemo(buildColumns, [])

  const data = React.useMemo(
    () => (gatesOnly ? initialData.filter((r) => r.isComplianceGate) : initialData),
    [initialData, gatesOnly]
  )

  const table = useReactTable({
    data,
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
            { label: 'Compliance', value: 'COMPLIANCE' },
            { label: 'Pedagogy',   value: 'PEDAGOGY' },
            { label: 'Technical',  value: 'TECHNICAL' },
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
