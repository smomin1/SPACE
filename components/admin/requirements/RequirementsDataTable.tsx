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
import { PlusIcon, FilterXIcon, PencilIcon, Trash2Icon } from "lucide-react"
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
import { ComplianceGateBadge } from "@/components/admin/requirements/ComplianceGateBadge"
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

const EVALUATOR_TYPE_STYLES: Record<string, string> = {
  COMPLIANCE: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  PEDAGOGY: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  TECHNICAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
}

const WEIGHT_STYLES: Record<string, string> = {
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

function TypeBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        EVALUATOR_TYPE_STYLES[value] ?? ""
      )}
    >
      {value.charAt(0) + value.slice(1).toLowerCase()}
    </span>
  )
}

function WeightBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        WEIGHT_STYLES[value] ?? ""
      )}
    >
      {value.charAt(0) + value.slice(1).toLowerCase()}
    </span>
  )
}

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
        <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-destructive">
          <Trash2Icon className="size-4" />
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
              <span className="mt-2 block font-medium text-destructive">{error}</span>
            )}
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

const columns: ColumnDef<Requirement>[] = [
  {
    accessorKey: "order",
    header: "#",
    size: 48,
    enableColumnFilter: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Requirement" />,
    cell: ({ row }) => (
      <span className={cn(row.original.isComplianceGate && "font-medium")}>
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) =>
      row.original.category ? (
        row.original.category
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    filterFn: "includesString",
  },
  {
    accessorKey: "evaluatorType",
    header: "Type",
    cell: ({ row }) => <TypeBadge value={row.original.evaluatorType} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "weight",
    header: "Weight",
    cell: ({ row }) => <WeightBadge value={row.original.weight} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "isComplianceGate",
    header: "Gate",
    cell: ({ row }) => row.original.isComplianceGate ? <ComplianceGateBadge /> : null,
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
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="size-8 p-0" asChild>
          <Link href={`/admin/requirements/${row.original.id}/edit`}>
            <PencilIcon className="size-4" />
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

  const isFiltered =
    columnFilters.length > 0 || globalFilter !== "" || gatesOnly

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search requirements…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-64"
        />

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
          className="h-8"
          onClick={() => setGatesOnly((v) => !v)}
        >
          Gates only
        </Button>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter("")
              setGatesOnly(false)
            }}
          >
            <FilterXIcon className="mr-1 size-4" />
            Reset
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <BulkImportDialog onSuccess={() => router.refresh()} />
          <Button size="sm" asChild>
            <Link href="/admin/requirements/new">
              <PlusIcon className="mr-2 size-4" />
              New Requirement
            </Link>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                    row.original.isComplianceGate &&
                      "bg-destructive/5 hover:bg-destructive/10"
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
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
