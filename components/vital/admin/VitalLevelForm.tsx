"use client";

import * as React from "react";
import type { VitalLevel } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function VitalLevelForm({
  level,
  onClose,
  onSaved,
}: {
  level: VitalLevel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    code: level?.code ?? "",
    label: level?.label ?? "",
    order: String(level?.order ?? 0),
    scoreBand: level?.scoreBand ?? "",
    cefrStatus: level?.cefrStatus ?? "Standard CEFR",
    bandGroup: level?.bandGroup ?? "",
    isPreEmergent: level?.isPreEmergent ?? false,
    assessmentOnly: level?.assessmentOnly ?? false,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      level ? `/api/vital/levels/${level.id}` : "/api/vital/levels",
      {
        method: level ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    setSaving(false);
    if (res.ok) onSaved();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
    }
  }

  const text = (k: keyof typeof form, label: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={String(form[k])}
        onChange={(e) => set(k, e.target.value as never)}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{level ? "Edit level" : "New level"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {text("code", "Code (use − U+2212 for minus)")}
          {text("label", "Label")}
          {text("order", "Order")}
          {text("scoreBand", "Score band")}
          {text("cefrStatus", "CEFR status")}
          {text("bandGroup", "Band group")}
          <label className="flex items-center gap-2 text-[13px]">
            <Switch
              checked={form.isPreEmergent}
              onCheckedChange={(v) => set("isPreEmergent", v)}
            />
            Pre-emergent
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <Switch
              checked={form.assessmentOnly}
              onCheckedChange={(v) => set("assessmentOnly", v)}
            />
            Assessment-only
          </label>
        </div>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !form.code.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
