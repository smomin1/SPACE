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
  ListChecksIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  PlusCircleIcon,
  CheckIcon,
} from 'lucide-react'
import type { Context, DeploymentMode } from '@prisma/client'

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

type ContextRow = Context & {
  _count: { requirements: number }
}

const PAGE_SIZE = 25

const DEPLOYMENT_LABELS: Record<DeploymentMode, string> = {
  CLOUD: 'Cloud',
  ON_PREMISE: 'On-Premise',
  HYBRID: 'Hybrid',
}

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
      <PopoverContent align="start" className="w-52 p-1">
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

function DeleteAction({ ctx }: { ctx: ContextRow }) {
  const router = useRouter()
  const [err, setErr] = React.useState<string | null>(null)

  async function handleDelete() {
    setErr(null)
    const res = await fetch(`/api/contexts/${ctx.id}`, { method: 'DELETE' })
    if (res.status === 204) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setErr(data.error ?? 'Delete failed.')
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
          <AlertDialogTitle>Delete context?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>&ldquo;{ctx.name}&rdquo;</strong> and all its requirement assignments will be
            permanently removed.
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

function buildColumns(): ColumnDef<ContextRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <ColHeader column={column} title="Name" />,
    },
    {
      accessorKey: 'learningLevels',
      header: 'Learning Levels',
      enableSorting: false,
      cell: ({ row }) => {
        const levels = row.original.learningLevels as string[]
        if (!levels.length) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-sm">
            {levels.map((l) => l.replace('_', ' ')).join(', ')}
          </span>
        )
      },
    },
    {
      accessorKey: 'cefrMin',
      header: 'CEFR Range',
      enableSorting: false,
      cell: ({ row }) => {
        const { cefrMin, cefrMax } = row.original as Context
        if (!cefrMin && !cefrMax) return <span className="text-muted-foreground">—</span>
        if (cefrMin && cefrMax) return <span className="font-mono text-sm">{cefrMin} – {cefrMax}</span>
        return <span className="font-mono text-sm">{cefrMin ?? cefrMax}</span>
      },
    },
    {
      accessorKey: 'deploymentMode',
      header: 'Deployment',
      cell: ({ row }) => {
        const m = row.original.deploymentMode as DeploymentMode | null
        return m ? (
          <span className="text-sm">{DEPLOYMENT_LABELS[m]}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
      filterFn: (row, id, value: string[]) => {
        const v = row.getValue(id)
        return v != null && value.includes(v as string)
      },
    },
    {
      id: 'requirementCount',
      header: 'Requirements',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">{row.original._count.requirements}</span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="size-7 p-0" asChild>
            <Link href={`/admin/contexts/${row.original.id}/requirements`}>
              <ListChecksIcon className="size-3.5" />
              <span className="sr-only">Assign Requirements</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="size-7 p-0" asChild>
            <Link href={`/admin/contexts/${row.original.id}/edit`}>
              <PencilIcon className="size-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteAction ctx={row.original} />
        </div>
      ),
    },
  ]
}

interface ContextsTableProps {
  initialData: ContextRow[]
}

export function ContextsTable({ initialData }: ContextsTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }])

  const columns = React.useMemo(buildColumns, [])

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search contexts…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-60"
        />

        <FacetFilter
          column={table.getColumn('deploymentMode')!}
          title="Deployment"
          options={[
            { label: 'Cloud', value: 'CLOUD' },
            { label: 'On-Premise', value: 'ON_PREMISE' },
            { label: 'Hybrid', value: 'HYBRID' },
          ]}
        />

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter('')
            }}
          >
            <FilterXIcon className="mr-1 size-3.5" />
            Reset
          </Button>
        )}

        <div className="ml-auto">
          <Button size="sm" asChild>
            <Link href="/admin/contexts/new">
              <PlusIcon className="mr-1.5 size-4" />
              New Context
            </Link>
          </Button>
        </div>
      </div>

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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No contexts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalRows === 0
            ? 'No results'
            : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalRows)} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="px-2 tabular-nums">
            Page {pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
