# Eval — Forest Green redesign

A bespoke, sage-forest re-skin of the Eval admin tool. **No API, useForm, or data-structure
changes** — only layout, Tailwind classes, and UI component usage.

Drop the contents of `src/` into your existing Next.js project (paths mirror your `components/`
tree). Then replace `src/app/globals.css` to flip the shadcn tokens to the new palette.

---

## What changed

### Design system

- **Surfaces** — warm sage canvas (`#f6f7f4`) + clean white cards. Sidebar is `emerald-950` with
  cream text for the bespoke enterprise feel the moment the app loads.
- **Typography** — `Inter` for UI, `Source Serif 4` for editorial H1s & big stats, `JetBrains Mono`
  for IDs, counts, CEFR codes, and weight tiers. All page titles and section eyebrows use
  a tight serif/mono pair.
- **Status system** — no more rainbow chips. **One** chip shell, differentiated by a tiny
  leading colored dot (`emerald-600` / `emerald-900` / `stone-500` / `amber-600`) and a
  monospaced letter mark (`C` / `P` / `T`).
- **Weight** — rendered as a 3-bar tier indicator (▮▮▮ / ▮▮▯ / ▮▯▯) instead of a colored
  pill. Sophisticated, accessible, immediately legible.
- **Compliance Gate** — kept dignified. Ochre seal with a shield icon, not screaming red.
- **Tables** — zebra-less, hairlines on `stone-200/60`, soft emerald hover, mono numerals,
  uppercase tracking-wide column headers in `emerald-950/55`.

### Files redesigned

```
src/
├─ app/globals.css                                 ← Forest Green tokens for shadcn
└─ components/
   ├─ shared/
   │  ├─ Sidebar.tsx                               ← deep emerald shell + serif wordmark
   │  └─ data-table/
   │     ├─ DataTableColumnHeader.tsx
   │     ├─ DataTableFacetedFilter.tsx
   │     └─ DataTablePagination.tsx
   └─ admin/
      ├─ _shared/
      │  └─ badges.tsx                             ← new — TypeBadge, WeightTier,
      │                                              EvalStateBadge, PlatformStatusDot,
      │                                              ComplianceGateBadge, StatusChip
      ├─ contexts/
      │  ├─ ContextsTable.tsx
      │  ├─ ContextForm.tsx                        ← numbered FormSection layout
      │  └─ RequirementMatrix.tsx                  ← summary band + grouped matrix
      ├─ platforms/
      │  ├─ PlatformsTable.tsx
      │  ├─ PlatformForm.tsx                       ← numbered FormSection layout
      │  └─ PlatformDetail.tsx                     ← serif H1 + facts strip + team list
      └─ requirements/
         ├─ RequirementsDataTable.tsx              ← gate-row tint + weight tiers
         ├─ RequirementForm.tsx
         ├─ ComplianceGateBadge.tsx                ← re-exports from _shared/badges
         └─ BulkImportDialog.tsx
```

### What's intentionally preserved

- Every `useForm` call, resolver, defaultValues, field names, validators
- Every `fetch` URL, method, and body
- Every Prisma type import and data shape (`ContextRow`, `PlatformRow`, `RequirementRow`,
  `EvaluatorAssignment`, `RowFailure`)
- Every `@tanstack/react-table` config and column accessor
- All routing (`/admin/platforms`, `/admin/contexts/[id]/requirements`, etc.)

---

## Applying it

1. Copy `src/app/globals.css` over your existing globals (or merge the `:root` block).
2. Copy each component file in `src/components/` over the matching file in your codebase.
   The `_shared/badges.tsx` is new — it ships alongside the redesigned components.
3. Verify your shadcn primitives (`Button`, `Badge`, `Input`, `Select`, `Switch`, `Dialog`,
   `AlertDialog`, `Popover`, `Separator`, `Form*`, `Table*`) still resolve. The redesigned
   components do not modify those primitives — they restyle through class names and the new
   CSS-variable palette.

### Tailwind config (optional)

If your `tailwind.config.ts` doesn't already include serif and mono families, add:

```ts
fontFamily: {
  sans:  ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  serif: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'serif'],
  mono:  ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
},
```

And load Google Fonts from your root layout:

```tsx
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap"
/>
```

---

## Preview

`Eval Forest Green Redesign.html` is a working visual mockup of nine screens (Platforms list,
Platform detail, Register platform, Requirements list, New requirement, Bulk import, Contexts
list, Edit context, Requirement matrix). Use the screen pills at the top right to navigate.
