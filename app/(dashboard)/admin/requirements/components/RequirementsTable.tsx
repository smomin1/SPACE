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
} from 'lucide-react'
import type { Requirement } from '@prisma/client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { ComplianceGateBadge } from './ComplianceGateBadge'

const PAGE_SIZE = 25

// ── Inline column header with sort ──────────────────────────────────────────

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
        <Button variant="ghost" size="sm" className="-ml-2 h-7">
          {title}
          {column.getIsSorted() === 'desc' ? (
            <ArrowDownIcon className="ml-1 size-3.5" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUpIcon className="ml-1 size-3.5" />
          ) : (
            <ChevronsUpDownIcon className="ml-1 size-3.5 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
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

// ── Inline faceted filter ────────────────────────────────────────────────────

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
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircleIcon className="mr-1.5 size-3.5" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span className="font-mono text-xs">{selected.size}</span>
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
              className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                if (active) selected.delete(opt.value)
                else selected.add(opt.value)
                const vals = [...selected]
                column.setFilterValue(vals.length ? vals : undefined)
              }}
            >
              <div
                className={cn(
                  'mr-2 flex size-4 items-center justify-center rounded-sm border border-primary',
                  active ? 'bg-primary text-primary-foreground' : 'opacity-40'
                )}
              >
                <CheckIcon className="size-3" />
              </div>
              <span className="flex-1">{opt.label}</span>
              {facets.get(opt.value) != null && (
                <span className="ml-auto text-xs text-muted-foreground">
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
              className="cursor-pointer rounded-sm px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent"
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

// ── Type / weight badge styles ───────────────────────────────────────────────

const TYPE_CLS: Record<string, string> = {
  COMPLIANCE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PEDAGOGY:   'bg-blue-100  text-blue-700  dark:bg-blue-900/50  dark:text-blue-300',
  TECHNICAL:  'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
}
const WEIGHT_CLS: Record<string, string> = {
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  LOW:    'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
}

function Chip({ value, map }: { value: string; map: Record<string, string> }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', map[value])}>
      {value.charAt(0) + value.slice(1).toLowerCase()}
    </span>
  )
}

// ── Delete row action ────────────────────────────────────────────────────────

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
          className="size-7 p-0 text-muted-foreground hover:text-destructive"
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
            {err && <span className="mt-1 block font-medium text-destructive">{err}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <ColHeader column={column} title="Requirement" />,
      cell: ({ row }) => (
        <span className={row.original.isComplianceGate ? 'font-medium' : undefined}>
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <ColHeader column={column} title="Category" />,
      cell: ({ row }) =>
        row.original.category ?? (
          <span className="text-muted-foreground">—</span>
        ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'evaluatorType',
      header: 'Type',
      cell: ({ row }) => <Chip value={row.original.evaluatorType} map={TYPE_CLS} />,
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'weight',
      header: 'Weight',
      cell: ({ row }) => <Chip value={row.original.weight} map={WEIGHT_CLS} />,
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
          <Button variant="ghost" size="sm" className="size-7 p-0" asChild>
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
        <Input
          placeholder="Search requirements…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-60"
        />

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
            { label: 'High (3×)',   value: 'HIGH' },
            { label: 'Medium (2×)', value: 'MEDIUM' },
            { label: 'Low (1×)',    value: 'LOW' },
          ]}
        />

        <Button
          variant={gatesOnly ? 'default' : 'outline'}
          size="sm"
          className="h-8"
          onClick={() => setGatesOnly((v) => !v)}
        >
          Gates only
        </Button>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
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

        <div className="ml-auto">
          <Button size="sm" asChild>
            <Link href="/admin/requirements/new">
              <PlusIcon className="mr-1.5 size-4" />
              New Requirement
            </Link>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
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
                    row.original.isComplianceGate &&
                      'bg-destructive/5 hover:bg-destructive/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No requirements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalRows === 0
            ? 'No results'
            : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalRows)} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="px-2 tabular-nums">
            Page {pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
