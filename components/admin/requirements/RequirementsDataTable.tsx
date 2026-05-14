"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
} from "@tanstack/react-table"
import { PlusIcon, FilterXIcon, PencilIcon, Trash2Icon, SearchIcon } from "lucide-react"
import type { Requirement } from "@prisma/client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
} from "@/components/ui/alert-dialog"
import { DataTableColumnHeader } from "@/components/shared/data-table/DataTableColumnHeader"
import { DataTableFacetedFilter } from "@/components/shared/data-table/DataTableFacetedFilter"
import { DataTablePagination } from "@/components/shared/data-table/DataTablePagination"
import {
  ComplianceGateBadge,
  TypeBadge,
  WeightTier,
} from "@/components/admin/_shared/badges"
import { BulkImportDialog } from "@/components/admin/requirements/BulkImportDialog"

const EVALUATOR_TYPE_OPTIONS = [
  { label: "Compliance", value: "COMPLIANCE" },
  { label: "Pedagogy", value: "PEDAGOGY" },
  { label: "Technical", value: "TECHNICAL" },
]

const WEIGHT_OPTIONS = [
  { label: "High (3×)", value: "HIGH" },
  { label: "Medium (2×)", value: "MEDIUM" },
  { label: "Low (1×)", value: "LOW" },
]

function DeleteButton({ requirement }: { requirement: Requirement }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    const res = await fetch(`/api/admin/requirements/${requirement.id}`, {
      method: "DELETE",
    })
    if (res.status === 204) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      if (data.code === "HAS_SCORES") {
        setError("Cannot delete: this requirement has recorded scores against it.")
      } else {
        setError(data.error ?? "Failed to delete requirement")
      }
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
          <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>&ldquo;{requirement.title}&rdquo;</strong> will be permanently deleted.
            This action cannot be undone.
            {error && (
              <span className="mt-2 block font-medium text-amber-800">{error}</span>
            )}
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

const columns: ColumnDef<Requirement>[] = [
  {
    accessorKey: "order",
    header: () => (
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
        #
      </span>
    ),
    size: 48,
    enableColumnFilter: false,
    cell: ({ row }) => (
      <span className="font-mono text-[12px] tabular-nums text-stone-500">
        {String(row.original.order).padStart(2, "0")}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Requirement" />,
    cell: ({ row }) => (
      <span
        className={cn(
          "text-[13.5px] leading-snug text-emerald-950",
          row.original.isComplianceGate && "font-medium",
        )}
      >
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) =>
      row.original.category ? (
        <span className="text-stone-600">{row.original.category}</span>
      ) : (
        <span className="text-stone-400">—</span>
      ),
    filterFn: "includesString",
  },
  {
    accessorKey: "evaluatorType",
    header: () => (
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
        Type
      </span>
    ),
    cell: ({ row }) => <TypeBadge value={row.original.evaluatorType} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "weight",
    header: () => (
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
        Weight
      </span>
    ),
    cell: ({ row }) => <WeightTier value={row.original.weight} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "isComplianceGate",
    header: () => (
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
        Gate
      </span>
    ),
    cell: ({ row }) =>
      row.original.isComplianceGate ? (
        <ComplianceGateBadge />
      ) : (
        <span className="text-stone-400 text-[12px]">—</span>
      ),
    filterFn: (row, id, value: boolean) => {
      if (!value) return true
      return row.getValue(id) === true
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-0.5">
        <Button variant="ghost" size="sm" className="size-7 p-0 text-stone-500 hover:text-emerald-900" asChild>
          <Link href={`/admin/requirements/${row.original.id}/edit`}>
            <PencilIcon className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Link>
        </Button>
        <DeleteButton requirement={row.original} />
      </div>
    ),
  },
]

interface RequirementsDataTableProps {
  initialData: Requirement[]
}

export function RequirementsDataTable({ initialData }: RequirementsDataTableProps) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "order", desc: false }])
  const [gatesOnly, setGatesOnly] = React.useState(false)

  const filteredData = React.useMemo(() => {
    if (!gatesOnly) return initialData
    return initialData.filter((r) => r.isComplianceGate)
  }, [initialData, gatesOnly])

  const table = useReactTable({
    data: filteredData,
    columns,
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

  const isFiltered = columnFilters.length > 0 || globalFilter !== "" || gatesOnly

  const totalGates = initialData.filter((r) => r.isComplianceGate).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search requirements…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-72 pl-8 text-[12.5px]"
          />
        </div>

        <DataTableFacetedFilter
          column={table.getColumn("evaluatorType")}
          title="Type"
          options={EVALUATOR_TYPE_OPTIONS}
        />

        <DataTableFacetedFilter
          column={table.getColumn("weight")}
          title="Weight"
          options={WEIGHT_OPTIONS}
        />

        <Button
          variant={gatesOnly ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            gatesOnly
              ? "bg-amber-100 text-amber-900 ring-1 ring-amber-700/30 hover:bg-amber-200"
              : "border-stone-300",
          )}
          onClick={() => setGatesOnly((v) => !v)}
        >
          <ComplianceGateBadge />
          <span className="ml-0.5">only</span>
        </Button>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-stone-500 hover:text-emerald-900"
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter("")
              setGatesOnly(false)
            }}
          >
            <FilterXIcon className="mr-1 size-3.5" />
            Reset
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-4 text-[12px] text-stone-500 md:flex">
            <span>
              <span className="font-mono tabular-nums text-emerald-950">
                {initialData.length}
              </span>{" "}
              total
            </span>
            <span className="h-3.5 w-px bg-stone-300" />
            <span>
              <span className="font-mono tabular-nums text-amber-800">{totalGates}</span> gates
            </span>
          </div>
          <BulkImportDialog onSuccess={() => router.refresh()} />
          <Button size="sm" asChild>
            <Link href="/admin/requirements/new">
              <PlusIcon className="mr-1.5 size-3.5" />
              New Requirement
            </Link>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-stone-200/80 bg-stone-50/60 hover:bg-stone-50/60"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-9 text-emerald-950/55">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                    "border-b border-stone-200/60 transition-colors last:border-b-0",
                    row.original.isComplianceGate
                      ? "bg-amber-50/30 hover:bg-amber-50/50"
                      : "hover:bg-emerald-900/[0.025]",
                  )}
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-stone-500"
                >
                  No requirements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
