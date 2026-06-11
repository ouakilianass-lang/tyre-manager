"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatutCommande, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    inspectionValideeAgent: boolean;
    inspectionValideeN1: boolean;
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
  const [notes, setNotes] = useState("");
  const [siteId, setSiteId] = useState(commande.siteMontageId || "");
  const [pneus, setPneus] = useState<Pneu[]>([emptyPneu()]);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);

  async function callApi(action: string, extra: Record<string, any> = {}) {
    setLoading(true);
    const res = await fetch(`/api/commandes/${commande.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  function updatePneu(index: number, field: keyof Pneu, value: any) {
    setPneus((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  const totalHT = pneus.reduce((s, p) => s + p.prixUnitaire * p.quantite, 0);

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 1 — Agent commercial : Prendre en charge
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "DEMANDE_INSPECTION") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm text-blue-800">Nouvelle demande d&apos;inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-4">
            Une demande d&apos;inspection est en attente. Prenez-la en charge pour démarrer.
          </p>
          <Button onClick={() => callApi("prendre_en_charge")} disabled={loading}>
            {loading ? "En cours..." : "Prendre en charge"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 2 — Agent commercial : Envoyer la fiche d'inspection par mail
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "INSPECTION_EN_COURS") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm text-blue-800">Inspection en cours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-blue-700">
            Effectuez l&apos;inspection physique du véhicule. Une fois terminée, saisissez vos observations et envoyez la fiche par mail au client.
          </p>

          {!showInspectionForm ? (
            <Button onClick={() => setShowInspectionForm(true)}>
              ✏️ Saisir les observations
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Observations d&apos;inspection</Label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
                  rows={4}
                  placeholder="État des pneumatiques, usure, anomalies constatées, dimensions actuelles..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowInspectionForm(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => callApi("envoyer_inspection", { notesInspection: notes })}
                  disabled={loading}
                >
                  {loading ? "Envoi..." : "📧 Envoyer la fiche d'inspection par mail"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 3 — Agent client et N+1 : Valider l'inspection
  // ═══════════════════════════════════════════════════════════════════
  if (
    (role === "AGENT_CLIENT" || role === "N1_CLIENT") &&
    commande.statut === "INSPECTION_ENVOYEE"
  ) {
    const dejaValide =
      role === "AGENT_CLIENT"
        ? commande.inspectionValideeAgent
        : commande.inspectionValideeN1;

    return (
      <Card className="border-cyan-200 bg-cyan-50">
        <CardHeader>
          <CardTitle className="text-sm text-cyan-800">Validation de l&apos;inspection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Indicateurs de validation */}
          <div className="flex gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              commande.inspectionValideeAgent
                ? "bg-green-100 border-green-400 text-green-700"
                : "bg-white border-gray-300 text-gray-500"
            }`}>
              {commande.inspectionValideeAgent ? "✓" : "○"} Agent client
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              commande.inspectionValideeN1
                ? "bg-green-100 border-green-400 text-green-700"
                : "bg-white border-gray-300 text-gray-500"
            }`}>
              {commande.inspectionValideeN1 ? "✓" : "○"} Responsable N+1
            </div>
          </div>

          {dejaValide ? (
            <p className="text-sm text-green-700 font-medium">
              ✓ Vous avez déjà validé cette inspection. En attente de l&apos;autre validation.
            </p>
          ) : (
            <>
              <p className="text-sm text-cyan-700">
                Consultez la fiche d&apos;inspection reçue par mail, puis validez ci-dessous.
              </p>
              <Button
                onClick={() => callApi("valider_inspection")}
                disabled={loading}
              >
                {loading ? "En cours..." : "✓ Valider l'inspection"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 4 — Agent commercial : Proposer le devis (marques + prix HT)
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "DEVIS_DEMANDE") {
    return (
      <Card className="border-indigo-200 bg-indigo-50">
        <CardHeader>
          <CardTitle className="text-sm text-indigo-800">Devis demandé par le client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-indigo-700">
            Le client a validé l&apos;inspection et demande les références et prix. Proposez les marques disponibles avec les prix HT.
          </p>

          {!showDevisForm ? (
            <Button onClick={() => setShowDevisForm(true)}>
              💰 Saisir le devis
            </Button>
          ) : (
            <div className="space-y-5">

              {/* Site de montage */}
              <div className="space-y-2">
                <Label>Point de montage *</Label>
                <Select value={siteId} onValueChange={(v) => setSiteId(String(v ?? ""))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le site de montage" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom} — {s.ville}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pneus proposés */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pneus disponibles</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPneus((p) => [...p, emptyPneu()])}
                  >
                    + Ajouter un pneu
                  </Button>
                </div>

                {pneus.map((p, i) => (
                  <div key={i} className="border rounded-lg p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Pneu #{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={p.disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {p.disponible ? "✓ Disponible" : "✗ Indisponible"}
                        </Badge>
                        {pneus.length > 1 && (
                          <button
                            onClick={() => setPneus((prev) => prev.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 text-sm px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

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
                          placeholder="Ex: XZA3+"
                          value={p.reference || ""}
                          onChange={(e) => updatePneu(i, "reference", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dimension *</Label>
                        <Input
                          placeholder="Ex: 295/80R22.5"
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
                        <Label className="text-xs">Prix unitaire HT (MAD) *</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={p.prixUnitaire || ""}
                          onChange={(e) => updatePneu(i, "prixUnitaire", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sous-total HT</Label>
                        <div className="h-10 flex items-center px-3 bg-gray-50 border rounded-md text-sm font-semibold text-gray-700">
                          {(p.prixUnitaire * p.quantite).toLocaleString("fr-FR")} MAD
                        </div>
                      </div>
                    </div>

                    {/* Disponibilité */}
                    <div className="flex items-center gap-3">
                      <Label className="text-xs">Disponibilité :</Label>
                      <button
                        type="button"
                        onClick={() => updatePneu(i, "disponible", true)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          p.disponible
                            ? "bg-green-100 border-green-400 text-green-700"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        ✓ Disponible
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePneu(i, "disponible", false)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          !p.disponible
                            ? "bg-red-100 border-red-400 text-red-700"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        ✗ Indisponible
                      </button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes / délai</Label>
                      <Input
                        placeholder="Délai de livraison, remarques..."
                        value={p.notes || ""}
                        onChange={(e) => updatePneu(i, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                {/* Total HT */}
                <div className="flex justify-end pt-2 border-t">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total HT</p>
                    <p className="text-xl font-bold text-gray-900">
                      {totalHT.toLocaleString("fr-FR")} MAD
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDevisForm(false)}>
                  Annuler
                </Button>
                <Button
                  disabled={
                    loading ||
                    !siteId ||
                    pneus.some((p) => !p.marque || !p.dimension || p.prixUnitaire <= 0)
                  }
                  onClick={() => callApi("proposer_devis", { pneus, siteMontageId: siteId })}
                >
                  {loading ? "Envoi..." : "Envoyer le devis au client →"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 5 — N+1 : Valider ou rejeter le devis / prix
  // ═══════════════════════════════════════════════════════════════════
  if (role === "N1_CLIENT" && commande.statut === "DEVIS_PROPOSE") {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm text-yellow-800">Validation du devis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-yellow-700">
            Consultez les pneus proposés et les prix HT ci-dessus, puis validez ou rejetez le devis.
          </p>

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
                <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>
                  Annuler
                </Button>
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
              <Button onClick={() => callApi("valider_prix")} disabled={loading}>
                {loading ? "En cours..." : "✓ Valider le devis"}
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectForm(true)} disabled={loading}>
                ✗ Rejeter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 6 — Service achat : Passer la commande fournisseur
  // ═══════════════════════════════════════════════════════════════════
  if (role === "SERVICE_ACHAT" && commande.statut === "VALIDEE") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-sm text-green-800">Commande à passer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700 mb-4">
            Le devis a été validé. Passez la commande auprès du fournisseur.
          </p>
          <Button onClick={() => callApi("commander")} disabled={loading}>
            {loading ? "En cours..." : "✓ Confirmer la commande fournisseur"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 7 — Agent commercial : Pneus livrés
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "COMMANDEE_FOURNISSEUR") {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-sm text-orange-800">Livraison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700 mb-4">
            Confirmez l&apos;arrivée des pneus au point de montage.
          </p>
          <Button onClick={() => callApi("livrer")} disabled={loading}>
            {loading ? "En cours..." : "🚚 Pneus livrés au point de montage"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 8 — Agent commercial : Montage effectué
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "PNEUS_LIVRES") {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="text-sm text-emerald-800">Montage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-emerald-700">Confirmez que le montage a été effectué.</p>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={2}
            placeholder="Notes de montage (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={() => callApi("monter", { notes })} disabled={loading}>
            {loading ? "En cours..." : "✓ Confirmer le montage"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
