"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const totalPages = Math.max(1, table.getPageCount())
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <p className="text-[12px] text-stone-500">
        {totalRows === 0 ? (
          "No results"
        ) : (
          <>
            Showing{" "}
            <span className="font-mono text-emerald-950 tabular-nums">{from}</span>
            –<span className="font-mono text-emerald-950 tabular-nums">{to}</span> of{" "}
            <span className="font-mono text-emerald-950 tabular-nums">{totalRows}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-6">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-[12px] text-stone-500">Rows per page</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-7 w-[64px] text-[12px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-[12px] text-stone-500">
          Page{" "}
          <span className="font-mono text-emerald-950 tabular-nums">{pageIndex + 1}</span> /{" "}
          <span className="font-mono text-emerald-950 tabular-nums">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hidden size-7 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon className="size-3.5" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-3.5" />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="size-3.5" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden size-7 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon className="size-3.5" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
