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
  KeyRoundIcon,
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
import type { Role, Team } from '@prisma/client'
import { ROLE_LABELS, ROLE_BADGE } from '@/lib/roles'
import { formatDate } from '@/lib/utils'

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
import { toast } from 'sonner'

const TEAM_LABELS: Record<Team, string> = {
  STRATEGY_1:              'Strategy 1',
  STRATEGY_2:              'Strategy 2',
  STRATEGY_3:              'Strategy 3',
  STRATEGY_4:              'Strategy 4',
  STRATEGY_5:              'Strategy 5',
  STRATEGY_6:              'Strategy 6',
  STRATEGY_7:              'Strategy 7',
  IMPLEMENTATION_LAB:      'Implementation Lab',
  LEARNING_SCIENCES:       'Learning Sciences',
  EMERGING_TECHNOLOGY:     'Emerging Technology',
  RESEARCH_AND_INNOVATION: 'Research & Innovation',
  STEERING_COMMITTEE:      'Steering Committee',
}

type UserRow = {
  id: string
  email: string
  name: string
  role: Role
  isAdmin: boolean
  team: Team | null
  isActive: boolean
  createdAt: Date
}

const PAGE_SIZE = 25

// Role labels and badge colours come from the single source of truth in lib/roles.

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

function DeleteAction({ user, disabled }: { user: UserRow; disabled: boolean }) {
  const router = useRouter()

  async function handleDelete() {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.status === 204) {
      toast.success(`"${user.name}" deleted`)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Delete failed.')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 text-stone-500 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-30"
          disabled={disabled}
          title={disabled ? "You can't delete your own account" : 'Delete user'}
        >
          <Trash2Icon className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>&ldquo;{user.name}&rdquo;</strong> ({user.email}) will be permanently removed. If they have any
            scores or evaluation history, the delete will be blocked - deactivate them instead.
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

function ResetPasswordAction({ user, disabled }: { user: UserRow; disabled: boolean }) {
  const [busy, setBusy] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  async function handleReset() {
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Reset failed.')
        return
      }
      toast.success(
        `Password reset for "${user.name}". Temporary password: ${data.tempPassword}`,
        { duration: 12000 },
      )
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 text-stone-500 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-30"
          disabled={disabled}
          title={disabled ? "You can't reset your own password here" : 'Reset password'}
        >
          <KeyRoundIcon className="size-3.5" />
          <span className="sr-only">Reset password</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset password?</AlertDialogTitle>
          <AlertDialogDescription>
            A new temporary password will be generated and emailed to{' '}
            <strong>{user.name}</strong> ({user.email}). They will be required to set a new
            password on their next login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-sky-700 text-sky-50 hover:bg-sky-800"
            onClick={(e) => { e.preventDefault(); handleReset() }}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Reset password'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function buildColumns(currentUserId: string): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <ColHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users/${row.original.id}/edit`}
            className="font-medium text-emerald-950 decoration-emerald-700/40 underline-offset-2 hover:text-emerald-800 hover:underline"
          >
            {row.original.name}
          </Link>
          {row.original.id === currentUserId && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
              You
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <ColHeader column={column} title="Email" />,
      cell: ({ row }) => <span className="text-stone-600 font-mono text-[12.5px]">{row.original.email}</span>,
    },
    {
      accessorKey: 'team',
      header: () => (
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">Team</span>
      ),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.team ? (
          <span className="text-[12.5px] text-stone-600">{TEAM_LABELS[row.original.team]}</span>
        ) : (
          <span className="text-[12px] text-stone-400">-</span>
        ),
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <ColHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', ROLE_BADGE[row.original.role])}>
            {ROLE_LABELS[row.original.role]}
          </span>
          {row.original.isAdmin && row.original.role !== 'ADMIN' && row.original.role !== 'SUPER_ADMIN' && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-semibold text-violet-800 ring-1 ring-inset ring-violet-300/60">
              + Admin
            </span>
          )}
        </div>
      ),
      filterFn: (row, id, value: string[]) => {
        const v = row.getValue(id)
        return v != null && value.includes(v as string)
      },
    },
    {
      accessorKey: 'isActive',
      header: () => (
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
          Status
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.isActive ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-400">
            <span className="size-1.5 rounded-full bg-stone-300" />
            Inactive
          </span>
        ),
      filterFn: (row, id, value: string[]) => {
        const v = String(row.getValue(id))
        return value.includes(v)
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <ColHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <span className="text-[12.5px] text-stone-500 tabular-nums">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => {
        const isSelf = row.original.id === currentUserId
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="sm" className="size-7 p-0 text-stone-500 hover:text-emerald-900" asChild>
              <Link href={`/admin/users/${row.original.id}/edit`}>
                <PencilIcon className="size-3.5" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
            <ResetPasswordAction user={row.original} disabled={isSelf} />
            <DeleteAction user={row.original} disabled={isSelf} />
          </div>
        )
      },
    },
  ]
}

interface UsersTableProps {
  initialData: UserRow[]
  currentUserId: string
  canCreate: boolean
}

export function UsersTable({ initialData, currentUserId, canCreate }: UsersTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter,  setGlobalFilter]  = React.useState('')
  const [sorting,       setSorting]       = React.useState<SortingState>([{ id: 'name', desc: false }])

  const columns = React.useMemo(() => buildColumns(currentUserId), [currentUserId])

  const table = useReactTable({
    data: initialData,
    columns,
    initialState: { pagination: { pageSize: PAGE_SIZE, pageIndex: 0 } },
    state: { columnFilters, globalFilter, sorting },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange:  setGlobalFilter,
    onSortingChange:       setSorting,
    getCoreRowModel:        getCoreRowModel(),
    getFilteredRowModel:    getFilteredRowModel(),
    getPaginationRowModel:  getPaginationRowModel(),
    getSortedRowModel:      getSortedRowModel(),
    getFacetedRowModel:     getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isFiltered = columnFilters.length > 0 || globalFilter !== ''
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows  = table.getFilteredRowModel().rows.length
  const totalPages = Math.max(1, table.getPageCount())
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to   = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search by name or email…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-72 pl-8 text-[12.5px]"
          />
        </div>

        <FacetFilter
          column={table.getColumn('role')!}
          title="Role"
          options={[
            { label: 'Admin',               value: 'ADMIN' },
            { label: 'Pedagogy Evaluator',  value: 'PEDAGOGY_EVALUATOR' },
            { label: 'Technical Evaluator', value: 'TECHNICAL_EVALUATOR' },
            { label: 'Viewer',              value: 'VIEWER' },
          ]}
        />
        <FacetFilter
          column={table.getColumn('isActive')!}
          title="Status"
          options={[
            { label: 'Active',   value: 'true' },
            { label: 'Inactive', value: 'false' },
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
            <span className="font-mono tabular-nums text-emerald-950">{initialData.length}</span> users
          </span>
          {canCreate && (
            <Button size="sm" asChild>
              <Link href="/admin/users/new">
                <PlusIcon className="mr-1.5 size-3.5" />
                Create User
              </Link>
            </Button>
          )}
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
                  className={cn(
                    'border-b border-stone-200/60 transition-colors last:border-b-0 hover:bg-emerald-900/[0.025]',
                    !row.original.isActive && 'opacity-60',
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-stone-500">
                  No users found.
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
