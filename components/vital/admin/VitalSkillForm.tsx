"use client";

import * as React from "react";
import type { VitalSkill } from "@prisma/client";
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

export function VitalSkillForm({
  skill,
  onClose,
  onSaved,
}: {
  skill: VitalSkill | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(skill?.name ?? "");
  const [order, setOrder] = React.useState(String(skill?.order ?? 0));
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      skill ? `/api/vital/skills/${skill.id}` : "/api/vital/skills",
      {
        method: skill ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, order }),
      }
    );
    setSaving(false);
    if (res.ok) onSaved();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{skill ? "Edit skill" : "New skill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Order</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
