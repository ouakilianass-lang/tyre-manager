"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function NouveauSiteForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nom: "", adresse: "", ville: "", telephone: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setOpen(false);
    setForm({ nom: "", adresse: "", ville: "", telephone: "" });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button><Plus className="w-4 h-4 mr-2" />Nouveau site</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Créer un site de montage</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Nom du site *</Label>
            <Input value={form.nom} onChange={(e) => setForm(p => ({ ...p, nom: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label>Adresse *</Label>
            <Input value={form.adresse} onChange={(e) => setForm(p => ({ ...p, adresse: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label>Ville *</Label>
            <Input value={form.ville} onChange={(e) => setForm(p => ({ ...p, ville: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label>Téléphone</Label>
            <Input value={form.telephone} onChange={(e) => setForm(p => ({ ...p, telephone: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>{loading ? "Création..." : "Créer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
