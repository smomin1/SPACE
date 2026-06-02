"use client";

import * as React from "react";
import { UploadIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FieldChange {
  field: string;
  before: string | null;
  after: string | null;
}
interface ChangedRow {
  key: string;
  record: Record<string, unknown>;
  changes: FieldChange[];
}
interface EntityDiff {
  entity: "tool" | "recommendation" | "level";
  newRows: Record<string, unknown>[];
  changedRows: ChangedRow[];
  unchangedCount: number;
}
interface PreviewResponse {
  workbookType: string;
  fileName: string;
  diff: EntityDiff;
  levelDiff?: EntityDiff;
}

type Step = "idle" | "uploading" | "preview" | "applying" | "done" | "error";

function rowLabel(entity: string, rec: Record<string, unknown>): string {
  if (entity === "tool") return String(rec.name);
  if (entity === "recommendation") return `${rec.skill} · ${rec.levelCode}`;
  return String(rec.code);
}

export function VitalImportDialog({ onApplied }: { onApplied: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("idle");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null);
  const [selectedChanges, setSelectedChanges] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ created: number; updated: number; skipped: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setStep("idle");
    setFile(null);
    setPreview(null);
    setSelectedChanges(new Set());
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  async function upload() {
    if (!file) return;
    setStep("uploading");
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/vital/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      setStep("error");
      return;
    }
    setPreview(data as PreviewResponse);
    setStep("preview");
  }

  function toggleChange(key: string) {
    setSelectedChanges((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function apply() {
    if (!preview) return;
    setStep("applying");
    setError(null);

    const approved = (d?: EntityDiff) => {
      if (!d) return [];
      return [
        ...d.newRows,
        ...d.changedRows.filter((c) => selectedChanges.has(`${d.entity}:${c.key}`)).map((c) => c.record),
      ];
    };

    const body: Record<string, unknown> = {
      workbookType: preview.workbookType,
      fileName: preview.fileName,
    };
    if (preview.diff.entity === "tool") body.tools = approved(preview.diff);
    if (preview.diff.entity === "recommendation") body.recommendations = approved(preview.diff);
    if (preview.diff.entity === "level") body.levels = approved(preview.diff);
    if (preview.levelDiff) body.levels = approved(preview.levelDiff);

    const res = await fetch("/api/vital/import/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Apply failed");
      setStep("error");
      return;
    }
    setResult(data);
    setStep("done");
    onApplied();
  }

  const sections = preview ? [preview.diff, ...(preview.levelDiff ? [preview.levelDiff] : [])] : [];
  const totalNew = sections.reduce((n, d) => n + d.newRows.length, 0);
  const totalChanged = sections.reduce((n, d) => n + d.changedRows.length, 0);
  const totalUnchanged = sections.reduce((n, d) => n + d.unchangedCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadIcon className="mr-1 size-4" /> Import workbook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import VITAL workbook</DialogTitle>
          <DialogDescription>
            Upload a Tool Landscape, Level Stack, or Recommendation workbook. New
            rows are added; changed rows are flagged for your review.
          </DialogDescription>
        </DialogHeader>

        {step === "idle" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <UploadIcon className="mx-auto mb-2 size-8 text-stone-400" />
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                id="vital-import-file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="vital-import-file">
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">Choose .xlsx file</span>
                </Button>
              </label>
              {file && <p className="mt-2 text-[13px] text-stone-500">{file.name}</p>}
            </div>
          </div>
        )}

        {step === "uploading" && <Spinner label="Analysing workbook…" />}
        {step === "applying" && <Spinner label="Applying changes…" />}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <p className="text-[13px] text-stone-500">
              Detected <span className="font-medium">{preview.workbookType}</span> ·{" "}
              {totalNew} new · {totalChanged} changed · {totalUnchanged} unchanged
            </p>

            {sections.map((d) => (
              <div key={d.entity} className="space-y-2">
                {d.newRows.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-emerald-700">
                      New {d.entity}s ({d.newRows.length}): auto-imported
                    </p>
                    <ul className="mt-1 text-[13px] text-stone-600">
                      {d.newRows.map((r, i) => (
                        <li key={i}>+ {rowLabel(d.entity, r)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.changedRows.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-amber-700">
                      Changed {d.entity}s ({d.changedRows.length}): tick to apply
                    </p>
                    <div className="mt-1 space-y-2">
                      {d.changedRows.map((c) => {
                        const id = `${d.entity}:${c.key}`;
                        return (
                          <label
                            key={id}
                            className="flex gap-2 rounded-md border border-stone-200/70 p-2 text-[13px]"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={selectedChanges.has(id)}
                              onChange={() => toggleChange(id)}
                            />
                            <div>
                              <p className="font-medium text-stone-700">
                                {rowLabel(d.entity, c.record)}
                              </p>
                              <ul className="text-[12px] text-stone-500">
                                {c.changes.map((ch, i) => (
                                  <li key={i}>
                                    {ch.field}: <span className="text-red-600">{ch.before ?? "∅"}</span> →{" "}
                                    <span className="text-emerald-700">{ch.after ?? "∅"}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {totalNew === 0 && totalChanged === 0 && (
              <p className="text-[13px] text-stone-500">
                No new or changed rows. The workbook matches current data.
              </p>
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircleIcon className="size-12 text-emerald-500" />
            <p className="font-medium">Import applied</p>
            <p className="text-[13px] text-stone-500">
              {result.created} created · {result.updated} updated · {result.skipped} skipped
            </p>
          </div>
        )}

        {step === "error" && (
          <div className="flex items-center gap-2 text-destructive">
            <XCircleIcon className="size-5" />
            <p className="text-[14px]">{error}</p>
          </div>
        )}

        <DialogFooter>
          {step === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={upload} disabled={!file}>Analyse</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={apply} disabled={totalNew === 0 && selectedChanges.size === 0}>
                Apply {totalNew + selectedChanges.size} change{totalNew + selectedChanges.size !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={() => onOpenChange(false)}>Done</Button>}
          {step === "error" && <Button variant="outline" onClick={reset}>Try again</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="size-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <p className="text-[13px] text-stone-500">{label}</p>
    </div>
  );
}
