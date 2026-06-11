"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import { Role } from "@prisma/client";
import { Plus } from "lucide-react";

type Entreprise = { id: string; nom: string };

const ROLES_CLIENT: Role[] = ["AGENT_CLIENT", "N1_CLIENT"];
const ROLES_FOURNISSEUR: Role[] = ["SUPER_ADMIN", "AGENT_COMMERCIAL", "SERVICE_ACHAT"];

export default function NouvelUtilisateurForm({ entreprises }: { entreprises: Entreprise[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    code: "",
    role: "" as Role | "",
    entrepriseId: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const needsEntreprise = form.role && ROLES_CLIENT.includes(form.role as Role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/utilisateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur");
      return;
    }

    setOpen(false);
    setForm({ nom: "", prenom: "", email: "", code: "", role: "", entrepriseId: "" });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4 mr-2" />
        Nouvel utilisateur
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prénom *</Label>
              <Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Code d&apos;accès *</Label>
            <Input
              placeholder="Code que l'utilisateur utilisera pour se connecter"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Rôle *</Label>
            <Select onValueChange={(v) => set("role", String(v ?? ""))} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsEntreprise && (
            <div className="space-y-1">
              <Label>Entreprise cliente *</Label>
              <Select onValueChange={(v) => set("entrepriseId", String(v ?? ""))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {entreprises.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
