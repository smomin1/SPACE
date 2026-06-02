"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, PencilIcon, Trash2Icon, LockIcon, RefreshCwIcon } from "lucide-react";
import type {
  VitalTool,
  VitalRecommendation,
  VitalSkill,
  VitalLevel,
  VitalToolPillarRating,
  VitalToolSkillCoverage,
  VitalToolLevelMapping,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { TOOL_ROLE_LABEL, VERDICT_LABEL, STATUS_LABEL } from "@/lib/vital/labels";
import { VitalToolForm } from "./VitalToolForm";
import { VitalRecommendationForm } from "./VitalRecommendationForm";
import { VitalLevelForm } from "./VitalLevelForm";
import { VitalSkillForm } from "./VitalSkillForm";
import { VitalImportDialog } from "./VitalImportDialog";

type ToolWithChildren = VitalTool & {
  pillarRatings: VitalToolPillarRating[];
  skillCoverage: VitalToolSkillCoverage[];
  levelMappings: VitalToolLevelMapping[];
};
type RecWithRelations = VitalRecommendation & {
  skill: VitalSkill;
  level: VitalLevel;
  coreTool: VitalTool | null;
  suppTool: VitalTool | null;
};
interface ImportRow {
  id: string;
  fileName: string;
  workbookType: string;
  created: number;
  updated: number;
  skipped: number;
  importedAt: string;
  by: string;
}

type Tab = "tools" | "recommendations" | "levels" | "skills" | "imports";

const TABS: { id: Tab; label: string }[] = [
  { id: "tools", label: "Tools" },
  { id: "recommendations", label: "Recommendations" },
  { id: "levels", label: "Levels" },
  { id: "skills", label: "Skills" },
  { id: "imports", label: "Import history" },
];

export function VitalAdmin({
  tools,
  recommendations,
  levels,
  skills,
  imports,
}: {
  tools: ToolWithChildren[];
  recommendations: RecWithRelations[];
  levels: VitalLevel[];
  skills: VitalSkill[];
  imports: ImportRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("tools");

  // Edit dialog state per entity
  const [editTool, setEditTool] = React.useState<ToolWithChildren | null>(null);
  const [editRec, setEditRec] = React.useState<RecWithRelations | null>(null);
  const [editLevel, setEditLevel] = React.useState<VitalLevel | null>(null);
  const [editSkill, setEditSkill] = React.useState<VitalSkill | null>(null);
  const [creating, setCreating] = React.useState(false);

  const [del, setDel] = React.useState<{ url: string; label: string } | null>(null);
  const [delError, setDelError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [recomputing, setRecomputing] = React.useState(false);
  const [recomputeMsg, setRecomputeMsg] = React.useState<string | null>(null);

  async function recomputeAll() {
    setRecomputing(true);
    setRecomputeMsg(null);
    const res = await fetch("/api/vital/recommendations/recompute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "respect-locks" }),
    });
    setRecomputing(false);
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      setRecomputeMsg(`Recomputed: ${d.changed ?? 0} of ${d.total ?? 0} updated.`);
      refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setRecomputeMsg(d.error ?? "Recompute failed");
    }
  }

  function refresh() {
    router.refresh();
  }

  function closeAll() {
    setEditTool(null);
    setEditRec(null);
    setEditLevel(null);
    setEditSkill(null);
    setCreating(false);
  }

  async function confirmDelete() {
    if (!del) return;
    setDeleting(true);
    setDelError(null);
    const res = await fetch(del.url, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setDel(null);
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setDelError(data.error ?? "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-lg bg-stone-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {tab === "recommendations" && (
            <Button size="sm" variant="outline" onClick={recomputeAll} disabled={recomputing}>
              <RefreshCwIcon className={cn("mr-1 size-4", recomputing && "animate-spin")} />
              {recomputing ? "Recomputing…" : "Recompute"}
            </Button>
          )}
          <VitalImportDialog onApplied={refresh} />
          {tab !== "imports" && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon className="mr-1 size-4" /> New
            </Button>
          )}
        </div>
      </div>

      {tab === "recommendations" && recomputeMsg && (
        <p className="text-[12px] text-stone-500">{recomputeMsg}</p>
      )}

      {tab === "tools" && (
        <EntityTable
          headers={["Name", "Role", "Type", "VITAL/10", "Verdict", ""]}
          rows={tools.map((t) => ({
            key: t.id,
            cells: [
              t.name,
              TOOL_ROLE_LABEL[t.role],
              t.isAssessmentTool ? "Assessment" : "Teaching",
              t.vitalScore10 ?? "-",
              t.verdict ? VERDICT_LABEL[t.verdict] : "-",
            ],
            onEdit: () => setEditTool(t),
            onDelete: () => setDel({ url: `/api/vital/tools/${t.id}`, label: t.name }),
          }))}
        />
      )}

      {tab === "recommendations" && (
        <EntityTable
          headers={["Skill", "Level", "Core", "Supplementary", "Status", ""]}
          rows={recommendations
            .slice()
            .sort((a, b) =>
              a.level.order - b.level.order || a.skill.order - b.skill.order
            )
            .map((r) => ({
              key: r.id,
              cells: [
                r.skill.name,
                r.level.code,
                <ToolCell key="c" name={r.coreTool?.name} locked={r.coreToolLocked} />,
                <ToolCell key="s" name={r.suppTool?.name} locked={r.suppToolLocked} />,
                STATUS_LABEL[r.status],
              ],
              onEdit: () => setEditRec(r),
              onDelete: () =>
                setDel({
                  url: `/api/vital/recommendations/${r.id}`,
                  label: `${r.skill.name} · ${r.level.code}`,
                }),
            }))}
        />
      )}

      {tab === "levels" && (
        <EntityTable
          headers={["Code", "Order", "Score band", "CEFR status", "Assessment-only", ""]}
          rows={levels.map((l) => ({
            key: l.id,
            cells: [
              l.code,
              l.order,
              l.scoreBand,
              l.cefrStatus,
              l.assessmentOnly ? "Yes" : "-",
            ],
            onEdit: () => setEditLevel(l),
            onDelete: () => setDel({ url: `/api/vital/levels/${l.id}`, label: l.code }),
          }))}
        />
      )}

      {tab === "skills" && (
        <EntityTable
          headers={["Name", "Order", ""]}
          rows={skills.map((s) => ({
            key: s.id,
            cells: [s.name, s.order],
            onEdit: () => setEditSkill(s),
            onDelete: () => setDel({ url: `/api/vital/skills/${s.id}`, label: s.name }),
          }))}
        />
      )}

      {tab === "imports" && (
        <div className="overflow-x-auto rounded-lg border border-stone-200/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Skipped</TableHead>
                <TableHead>By</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-stone-400">
                    No imports yet.
                  </TableCell>
                </TableRow>
              ) : (
                imports.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.fileName}</TableCell>
                    <TableCell>{i.workbookType}</TableCell>
                    <TableCell>{i.created}</TableCell>
                    <TableCell>{i.updated}</TableCell>
                    <TableCell>{i.skipped}</TableCell>
                    <TableCell>{i.by}</TableCell>
                    <TableCell className="text-[12px] text-stone-500">
                      {new Date(i.importedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Forms */}
      {(editTool || (creating && tab === "tools")) && (
        <VitalToolForm
          tool={editTool}
          skills={skills}
          levels={levels}
          onClose={closeAll}
          onSaved={() => {
            closeAll();
            refresh();
          }}
        />
      )}
      {(editRec || (creating && tab === "recommendations")) && (
        <VitalRecommendationForm
          recommendation={editRec}
          skills={skills}
          levels={levels}
          tools={tools}
          onClose={closeAll}
          onSaved={() => {
            closeAll();
            refresh();
          }}
        />
      )}
      {(editLevel || (creating && tab === "levels")) && (
        <VitalLevelForm
          level={editLevel}
          onClose={closeAll}
          onSaved={() => {
            closeAll();
            refresh();
          }}
        />
      )}
      {(editSkill || (creating && tab === "skills")) && (
        <VitalSkillForm
          skill={editSkill}
          onClose={closeAll}
          onSaved={() => {
            closeAll();
            refresh();
          }}
        />
      )}

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {del?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
              {delError && (
                <span className="mt-2 block text-destructive">{delError}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDelError(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToolCell({ name, locked }: { name?: string | null; locked: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {name ?? "-"}
      {locked && (
        <LockIcon className="size-3 text-amber-500" aria-label="Pinned (override)" />
      )}
    </span>
  );
}

function EntityTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: {
    key: string;
    cells: React.ReactNode[];
    onEdit: () => void;
    onDelete: () => void;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200/80">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              {r.cells.map((c, i) => (
                <TableCell key={i} className={i === 0 ? "font-medium text-stone-700" : ""}>
                  {c}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={r.onEdit}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={r.onDelete}>
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
