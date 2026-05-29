"use client"

import * as React from "react"
import { CheckIcon, PlusCircleIcon } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface Option {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: Option[]
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const selectedValues = new Set(column?.getFilterValue() as string[])

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
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-3.5 bg-stone-300" />
              <span className="font-mono text-[10.5px] tracking-wider text-emerald-800 tabular-nums">
                {selectedValues.size}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1" align="start">
        <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
          Filter by {title}
        </div>
        <div className="p-0.5">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value)
            return (
              <div
                key={option.value}
                role="button"
                tabIndex={0}
                className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-[13px] text-emerald-950 outline-none hover:bg-emerald-900/[0.04]"
                onClick={() => {
                  if (isSelected) {
                    selectedValues.delete(option.value)
                  } else {
                    selectedValues.add(option.value)
                  }
                  const filterValues = Array.from(selectedValues)
                  column?.setFilterValue(filterValues.length ? filterValues : undefined)
                }}
              >
                <div
                  className={cn(
                    "mr-2.5 flex size-4 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-emerald-800 bg-emerald-700 text-white"
                      : "border-stone-300 [&_svg]:invisible",
                  )}
                >
                  <CheckIcon className="size-3" strokeWidth={3} />
                </div>
                {option.icon && (
                  <option.icon className="mr-2 size-4 text-stone-500" />
                )}
                <span className="flex-1">{option.label}</span>
                {facets?.get(option.value) != null && (
                  <span className="ml-auto font-mono text-[10.5px] text-stone-500 tabular-nums">
                    {facets.get(option.value)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {selectedValues.size > 0 && (
          <>
            <Separator className="my-1 bg-stone-200" />
            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-[12px] text-stone-500 hover:bg-stone-50 hover:text-emerald-900"
              onClick={() => column?.setFilterValue(undefined)}
            >
              Clear filter
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
