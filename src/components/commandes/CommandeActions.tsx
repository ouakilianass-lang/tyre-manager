"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatutCommande, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Pneu = {
  marque: string;
  reference?: string | null;
  dimension: string;
  quantite: number;
  prixUnitaire: number;
  disponible: boolean;
  notes?: string | null;
};

type Site = { id: string; nom: string; ville: string };

type Props = {
  commande: {
    id: string;
    statut: StatutCommande;
    pneus: Pneu[];
    siteMontageId: string | null;
  };
  role: Role;
  sites: Site[];
};

const emptyPneu = (): Pneu => ({
  marque: "",
  reference: "",
  dimension: "",
  quantite: 1,
  prixUnitaire: 0,
  disponible: true,
  notes: "",
});

export default function CommandeActions({ commande, role, sites }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [siteId, setSiteId] = useState(commande.siteMontageId || "");
  const [pneus, setPneus] = useState<Pneu[]>(
    commande.pneus.length > 0 ? commande.pneus : [emptyPneu()]
  );
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  async function callApi(action: string, extra: Record<string, any> = {}) {
    setLoading(true);
    await fetch(`/api/commandes/${commande.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setLoading(false);
    router.refresh();
  }

  function updatePneu(index: number, field: keyof Pneu, value: any) {
    setPneus((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addPneu() {
    setPneus((prev) => [...prev, emptyPneu()]);
  }

  function removePneu(index: number) {
    setPneus((prev) => prev.filter((_, i) => i !== index));
  }

  // Agent commercial : bouton prendre en charge
  if (role === "AGENT_COMMERCIAL" && commande.statut === "DEMANDE_INSPECTION") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader><CardTitle className="text-sm text-blue-800">Action requise</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-4">Prenez en charge cette inspection.</p>
          <Button onClick={() => callApi("inspection", { notesInspection: "", siteMontageId: null, pneus: [] })} disabled={loading}>
            Prendre en charge
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Agent commercial : saisie inspection
  if (role === "AGENT_COMMERCIAL" && (commande.statut === "INSPECTION_EN_COURS" || commande.statut === "DEMANDE_INSPECTION")) {
    if (!showInspectionForm) {
      return (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <Button onClick={() => setShowInspectionForm(true)}>Saisir l&apos;inspection</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-blue-200">
        <CardHeader><CardTitle className="text-sm">Saisie inspection</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Site de montage *</Label>
            <Select value={siteId} onValueChange={(v) => setSiteId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nom} — {s.ville}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes d&apos;inspection</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              rows={3}
              placeholder="Observations, état des pneus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pneus</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPneu}>
                + Ajouter
              </Button>
            </div>
            {pneus.map((p, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Marque *</Label>
                    <Input
                      placeholder="Michelin, Bridgestone..."
                      value={p.marque}
                      onChange={(e) => updatePneu(i, "marque", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Référence</Label>
                    <Input
                      placeholder="REF-001"
                      value={p.reference || ""}
                      onChange={(e) => updatePneu(i, "reference", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dimension *</Label>
                    <Input
                      placeholder="295/80R22.5"
                      value={p.dimension}
                      onChange={(e) => updatePneu(i, "dimension", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantité *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={p.quantite}
                      onChange={(e) => updatePneu(i, "quantite", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prix unitaire (MAD) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={p.prixUnitaire}
                      onChange={(e) => updatePneu(i, "prixUnitaire", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removePneu(i)}
                      disabled={pneus.length === 1}
                      className="w-full"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowInspectionForm(false)}>Annuler</Button>
            <Button
              disabled={loading || !siteId || pneus.some((p) => !p.marque || !p.dimension)}
              onClick={() => callApi("inspection", { notesInspection: notes, siteMontageId: siteId, pneus })}
            >
              {loading ? "Envoi..." : "Valider l'inspection"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // N+1 client : valider ou rejeter
  if (role === "N1_CLIENT" && commande.statut === "EN_ATTENTE_VALIDATION") {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader><CardTitle className="text-sm text-yellow-800">Validation requise</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-yellow-700">Vérifiez l&apos;inspection et le prix, puis validez ou rejetez.</p>
          {showRejectForm ? (
            <div className="space-y-3">
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={2}
                placeholder="Motif du rejet..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>Annuler</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  onClick={() => callApi("rejeter", { commentaire: rejectComment })}
                >
                  Confirmer le rejet
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={() => callApi("valider")} disabled={loading}>
                Valider la commande
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectForm(true)} disabled={loading}>
                Rejeter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Service achat : passer la commande
  if (role === "SERVICE_ACHAT" && commande.statut === "VALIDEE") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader><CardTitle className="text-sm text-green-800">Action requise</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-green-700 mb-4">La commande est validée. Passez la commande fournisseur.</p>
          <Button onClick={() => callApi("commander")} disabled={loading}>
            Confirmer la commande fournisseur
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Agent commercial : pneus livrés
  if (role === "AGENT_COMMERCIAL" && commande.statut === "COMMANDEE_FOURNISSEUR") {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <p className="text-sm text-orange-700 mb-4">Confirmer l&apos;arrivée des pneus au point de montage.</p>
          <Button onClick={() => callApi("livrer")} disabled={loading}>
            Pneus livrés au point de montage
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Agent commercial : montage effectué
  if (role === "AGENT_COMMERCIAL" && commande.statut === "PNEUS_LIVRES") {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm text-emerald-700">Confirmer le montage effectué.</p>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={2}
            placeholder="Notes de montage (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={() => callApi("monter", { notes })} disabled={loading}>
            Confirmer le montage
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
