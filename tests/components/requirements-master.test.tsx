/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── next/navigation mock ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}))

// ── next/link mock ───────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// ── radix-ui mock (resolves multiple-React-instances issue in worktree) ───────
vi.mock('radix-ui', async () => {
  const R = await import('react')

  // Slot — merges props (incl. id, aria-*) from FormControl into its child
  const SlotImpl = R.forwardRef<unknown, { children?: R.ReactNode; [k: string]: unknown }>(
    function Slot({ children, ...props }, ref) {
      const child = R.Children.only(children) as R.ReactElement
      return R.cloneElement(child, { ...props, ...(ref ? { ref } : {}) })
    }
  )

  // AlertDialog
  const AlertDialogRoot = ({
    children, open,
  }: { children?: R.ReactNode; open?: boolean }) =>
    open ? R.createElement('div', { 'data-alert-open': 'true' }, children) : null

  const AlertDialogContent = ({ children }: { children?: R.ReactNode }) =>
    R.createElement('div', { role: 'alertdialog' }, children)

  const AlertDialogAction = ({
    children, onClick, className,
  }: { children?: R.ReactNode; onClick?: () => void; className?: string }) =>
    R.createElement('button', { onClick, className, type: 'button' }, children)

  const AlertDialogCancel = ({
    children, onClick,
  }: { children?: R.ReactNode; onClick?: () => void }) =>
    R.createElement('button', { onClick, type: 'button' }, children)

  const passThrough = ({ children }: { children?: R.ReactNode }) =>
    R.createElement(R.Fragment, null, children)

  // Switch — must expose role="switch" + aria-checked for accessible queries
  const SwitchRoot = R.forwardRef<
    HTMLButtonElement,
    { checked?: boolean; onCheckedChange?: (v: boolean) => void; [k: string]: unknown }
  >(function SwitchRoot({ checked, onCheckedChange, className, ...rest }, ref) {
    return R.createElement('button', {
      role: 'switch',
      type: 'button',
      'aria-checked': checked,
      className,
      ref,
      onClick: () => onCheckedChange?.(!checked),
      ...rest,
    })
  })
  const SwitchThumb = () => null

  // Select
  const SelectRoot = ({ children }: { children?: R.ReactNode }) =>
    R.createElement(R.Fragment, null, children)

  const SelectTrigger = R.forwardRef<
    HTMLButtonElement,
    { children?: R.ReactNode; [k: string]: unknown }
  >(function SelectTrigger({ children, ...props }, ref) {
    return R.createElement('button', { type: 'button', ref, ...props }, children)
  })

  const SelectContent = ({ children }: { children?: R.ReactNode }) =>
    R.createElement('div', null, children)

  const SelectItem = ({
    children, value,
  }: { children?: R.ReactNode; value: string }) =>
    R.createElement('option', { value }, children)

  // Label — must render as <label htmlFor=...> for accessible name lookup
  const LabelRoot = R.forwardRef<
    HTMLLabelElement,
    { children?: R.ReactNode; htmlFor?: string; className?: string; [k: string]: unknown }
  >(function LabelRoot({ children, htmlFor, className, ...rest }, ref) {
    return R.createElement('label', { htmlFor, className, ref, ...rest }, children)
  })

  // Popover / DropdownMenu — content hidden by default (not needed in tests)
  const hidden = () => null

  return {
    Slot: { Slot: SlotImpl, Root: SlotImpl },
    AlertDialog: {
      Root: AlertDialogRoot,
      Trigger: passThrough,
      Portal: passThrough,
      Overlay: hidden,
      Content: AlertDialogContent,
      Header: passThrough,
      Footer: passThrough,
      Title: ({ children, className }: { children?: R.ReactNode; className?: string }) =>
        R.createElement('h2', { className }, children),
      Description: ({ children, className }: { children?: R.ReactNode; className?: string }) =>
        R.createElement('div', { className }, children),
      Action: AlertDialogAction,
      Cancel: AlertDialogCancel,
    },
    Switch: { Root: SwitchRoot, Thumb: SwitchThumb },
    Select: {
      Root: SelectRoot,
      Group: passThrough,
      Value: ({ placeholder }: { placeholder?: string }) =>
        R.createElement('span', null, placeholder),
      Trigger: SelectTrigger,
      ScrollUpButton: hidden,
      ScrollDownButton: hidden,
      Portal: passThrough,
      Viewport: passThrough,
      Content: SelectContent,
      Label: ({ children }: { children?: R.ReactNode }) =>
        R.createElement('span', null, children),
      Item: SelectItem,
      ItemText: ({ children }: { children?: R.ReactNode }) =>
        R.createElement(R.Fragment, null, children),
      ItemIndicator: hidden,
      Separator: hidden,
      Icon: hidden,
    },
    Label: { Root: LabelRoot },
    Popover: {
      Root: passThrough,
      Trigger: passThrough,
      Anchor: passThrough,
      Portal: passThrough,
      Content: hidden,
      Arrow: hidden,
      Close: passThrough,
    },
    DropdownMenu: {
      Root: passThrough,
      Trigger: passThrough,
      Portal: passThrough,
      Sub: passThrough,
      SubTrigger: passThrough,
      SubContent: hidden,
      Content: hidden,
      Group: passThrough,
      Item: ({ children, onSelect }: { children?: R.ReactNode; onSelect?: () => void }) =>
        R.createElement('button', { type: 'button', onClick: onSelect }, children),
      CheckboxItem: passThrough,
      RadioGroup: passThrough,
      RadioItem: passThrough,
      ItemIndicator: hidden,
      Label: ({ children }: { children?: R.ReactNode }) =>
        R.createElement('span', null, children),
      Separator: hidden,
      Shortcut: passThrough,
      Arrow: hidden,
    },
    Separator: {
      Root: ({ className }: { className?: string }) =>
        R.createElement('hr', { className }),
    },
    Dialog: {
      Root: passThrough,
      Trigger: passThrough,
      Portal: passThrough,
      Overlay: hidden,
      Content: ({ children }: { children?: R.ReactNode }) =>
        R.createElement('div', { role: 'dialog' }, children),
      Close: passThrough,
      Title: ({ children, className }: { children?: R.ReactNode; className?: string }) =>
        R.createElement('h2', { className }, children),
      Description: ({ children, className }: { children?: R.ReactNode; className?: string }) =>
        R.createElement('div', { className }, children),
    },
  }
})

// ── lucide-react mock ────────────────────────────────────────────────────────
vi.mock('lucide-react', async () => {
  const R = await import('react')
  const Icon = R.forwardRef<SVGSVGElement, R.SVGProps<SVGSVGElement>>(
    function Icon(props, ref) { return R.createElement('svg', { ...props, ref }) }
  )
  // Explicit exports for every icon used across all tested components
  return {
    ShieldAlertIcon: Icon,
    ShieldAlert: Icon,
    PlusIcon: Icon,
    FilterXIcon: Icon,
    PencilIcon: Icon,
    Trash2Icon: Icon,
    ChevronLeftIcon: Icon,
    ChevronRightIcon: Icon,
    ChevronsLeftIcon: Icon,
    ChevronsRightIcon: Icon,
    ArrowUpIcon: Icon,
    ArrowDownIcon: Icon,
    ChevronsUpDownIcon: Icon,
    CheckIcon: Icon,
    PlusCircleIcon: Icon,
    ChevronDownIcon: Icon,
    ChevronUpIcon: Icon,
    MoreHorizontal: Icon,
    X: Icon,
    UploadIcon: Icon,
    DownloadIcon: Icon,
    ListChecksIcon: Icon,
    EyeIcon: Icon,
    MonitorIcon: Icon,
    TagsIcon: Icon,
    XIcon: Icon,
    LayoutDashboardIcon: Icon,
    ClipboardListIcon: Icon,
    BarChart2Icon: Icon,
  }
})

// ── @tanstack/react-table mock ───────────────────────────────────────────────
vi.mock('@tanstack/react-table', () => {
  function useReactTable(options: {
    data: unknown[]
    columns: { id?: string; accessorKey?: string; cell?: (ctx: unknown) => unknown }[]
    [k: string]: unknown
  }) {
    const rows = options.data.map((item, i) => ({
      id: String(i),
      original: item,
      getVisibleCells: () =>
        options.columns.map((col, j) => ({
          id: `cell_${i}_${j}`,
          column: { columnDef: col, id: col.id ?? col.accessorKey ?? String(j) },
          getContext: () => ({ row: { original: item }, getValue: () => undefined }),
        })),
    }))
    return {
      getHeaderGroups: () => [],
      getRowModel: () => ({ rows }),
      getState: () => ({
        pagination: { pageIndex: 0, pageSize: 25 },
        columnFilters: [],
        globalFilter: '',
        sorting: [],
      }),
      getFilteredRowModel: () => ({ rows }),
      setColumnFilters: () => {},
      setGlobalFilter: () => {},
      setSorting: () => {},
      setPageSize: () => {},
      setPageIndex: () => {},
      resetColumnFilters: () => {},
      previousPage: () => {},
      nextPage: () => {},
      getCanPreviousPage: () => false,
      getCanNextPage: () => false,
      getPageCount: () => 1,
      getAllColumns: () =>
        options.columns.map((c) => ({
          id: c.id ?? c.accessorKey,
          getIsVisible: () => true,
          toggleVisibility: () => {},
        })),
      getColumn: () => ({
        getFilterValue: () => undefined,
        setFilterValue: () => {},
        getFacetedUniqueValues: () => new Map(),
      }),
    }
  }

  return {
    flexRender: (cell: unknown, ctx: unknown) =>
      typeof cell === 'function' ? cell(ctx) : cell,
    useReactTable,
    getCoreRowModel: () => () => ({}),
    getFilteredRowModel: () => () => ({}),
    getPaginationRowModel: () => () => ({}),
    getSortedRowModel: () => () => ({}),
    getFacetedRowModel: () => () => ({}),
    getFacetedUniqueValues: () => () => new Map(),
  }
})

// ── global fetch mock ────────────────────────────────────────────────────────
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { ComplianceGateBadge } from '@/app/(dashboard)/admin/requirements/components/ComplianceGateBadge'
import { RequirementForm } from '@/app/(dashboard)/admin/requirements/components/RequirementForm'

// ── Minimal Requirement type for table tests ─────────────────────────────────
type Requirement = {
  id: string
  title: string
  description: string
  evaluatorType: string
  weight: string
  isComplianceGate: boolean
  category: string | null
  order: number
  createdAt: Date
  updatedAt: Date
}

const makeReq = (overrides?: Partial<Requirement>): Requirement => ({
  id: 'req-1',
  title: 'Data Protection',
  description: 'GDPR compliance.',
  evaluatorType: 'COMPLIANCE',
  weight: 'HIGH',
  isComplianceGate: false,
  category: 'Compliance',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
})

// ── 4. ComplianceGateBadge is visually distinct ──────────────────────────────

describe('ComplianceGateBadge', () => {
  it('renders the badge text', () => {
    render(<ComplianceGateBadge />)
    expect(screen.getByText('Compliance Gate')).toBeInTheDocument()
  })

  it('renders with destructive colour classes', () => {
    const { container } = render(<ComplianceGateBadge />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('destructive')
  })

  it('contains a shield icon (svg)', () => {
    const { container } = render(<ComplianceGateBadge />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})

describe('RequirementsTable — compliance gate row', () => {
  it('renders ComplianceGateBadge for a gate requirement', async () => {
    const { RequirementsTable } = await import(
      '@/app/(dashboard)/admin/requirements/components/RequirementsTable'
    )
    const gateReq = makeReq({ isComplianceGate: true, title: 'GDPR Compliance' })
    render(<RequirementsTable initialData={[gateReq]} />)
    expect(screen.getByText('Compliance Gate')).toBeInTheDocument()
  })

  it('does NOT render ComplianceGateBadge for a non-gate requirement', async () => {
    const { RequirementsTable } = await import(
      '@/app/(dashboard)/admin/requirements/components/RequirementsTable'
    )
    const nonGateReq = makeReq({ isComplianceGate: false, title: 'Curriculum Alignment' })
    render(<RequirementsTable initialData={[nonGateReq]} />)
    expect(screen.queryByText('Compliance Gate')).not.toBeInTheDocument()
  })

  it('applies a red background tint to gate rows', async () => {
    const { RequirementsTable } = await import(
      '@/app/(dashboard)/admin/requirements/components/RequirementsTable'
    )
    const gateReq = makeReq({ isComplianceGate: true })
    const { container } = render(<RequirementsTable initialData={[gateReq]} />)
    const rows = container.querySelectorAll('tbody tr')
    const gateRow = rows[0] as HTMLElement
    expect(gateRow.className).toMatch(/destructive/)
  })
})

// ── 5. RequirementForm — validation errors on empty submit ───────────────────

describe('RequirementForm validation', () => {
  it('shows a title error when title is empty on submit', async () => {
    const user = userEvent.setup()
    render(<RequirementForm mode="create" />)

    await user.click(screen.getByRole('button', { name: /create requirement/i }))

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('shows a description error when description is empty on submit', async () => {
    const user = userEvent.setup()
    render(<RequirementForm mode="create" />)

    await user.type(screen.getByPlaceholderText(/requirement title/i), 'Some title')
    await user.click(screen.getByRole('button', { name: /create requirement/i }))

    await waitFor(() => {
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    })
  })

  it('does not call fetch when form is submitted with missing required fields', async () => {
    const user = userEvent.setup()
    render(<RequirementForm mode="create" />)

    await user.click(screen.getByRole('button', { name: /create requirement/i }))

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls POST /api/requirements when all required fields are filled', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ requirement: { id: 'req-new' } }), { status: 201 })
    )

    render(<RequirementForm mode="create" />)

    await user.type(screen.getByPlaceholderText(/requirement title/i), 'LTI Integration')
    await user.type(
      screen.getByPlaceholderText(/describe what this requirement evaluates/i),
      'Supports LTI 1.3 for VLE integration.'
    )
    await user.click(screen.getByRole('button', { name: /create requirement/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/requirements',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows the compliance gate warning dialog when the switch is toggled on', async () => {
    const user = userEvent.setup()
    render(<RequirementForm mode="create" />)

    const gateSwitch = screen.getByRole('switch', { name: /compliance gate/i })
    expect(gateSwitch).not.toBeChecked()

    await user.click(gateSwitch)

    await waitFor(() => {
      expect(
        screen.getByText(/a fail score on this requirement will/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /enable compliance gate/i })
      ).toBeInTheDocument()
    })
  })

  it('enables the gate switch only after confirming the dialog', async () => {
    const user = userEvent.setup()
    render(<RequirementForm mode="create" />)

    const gateSwitch = screen.getByRole('switch', { name: /compliance gate/i })
    await user.click(gateSwitch)

    await user.click(screen.getByRole('button', { name: /enable compliance gate/i }))

    await waitFor(() => {
      expect(gateSwitch).toBeChecked()
    })
  })

  it('leaves the gate switch unchecked when the dialog is cancelled', async () => {
    const user = userEvent.setup()
    render(<RequirementForm mode="create" />)

    const gateSwitch = screen.getByRole('switch', { name: /compliance gate/i })
    await user.click(gateSwitch)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(gateSwitch).not.toBeChecked()
    })
  })
})
