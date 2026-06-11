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
  id?: string;
  marque: string;
  reference?: string | null;
  dimension: string;
  quantite: number;
  prixUnitaire: number;
  disponible: boolean;
  choisi?: boolean;
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
    marqueDemandee?: string | null;
    dimensionDemandee?: string | null;
    quantiteDemandee?: number | null;
  };
  role: Role;
  sites: Site[];
};

const emptyPneu = (): Pneu => ({
  marque: "", reference: "", dimension: "",
  quantite: 1, prixUnitaire: 0, disponible: true, notes: "",
});

export default function CommandeActions({ commande, role, sites }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [siteId, setSiteId] = useState(commande.siteMontageId || "");
  const [pneus, setPneus] = useState<Pneu[]>([emptyPneu()]);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formulaire besoins agent client
  const [marqueDemandee, setMarqueDemandee] = useState(commande.marqueDemandee || "");
  const [dimensionDemandee, setDimensionDemandee] = useState(commande.dimensionDemandee || "");
  const [quantiteDemandee, setQuantiteDemandee] = useState(commande.quantiteDemandee || 1);
  const [notesDevis, setNotesDevis] = useState("");

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

  function updatePneu(i: number, field: keyof Pneu, value: any) {
    setPneus((prev) => prev.map((p, j) => (j === i ? { ...p, [field]: value } : p)));
  }

  const totalHT = pneus.reduce((s, p) => s + p.prixUnitaire * p.quantite, 0);

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 1 — Commercial : Prendre en charge
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "DEMANDE_INSPECTION") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader><CardTitle className="text-sm text-blue-800">Nouvelle demande</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-4">Une demande d&apos;inspection est en attente.</p>
          <Button onClick={() => callApi("prendre_en_charge")} disabled={loading}>
            {loading ? "En cours..." : "Prendre en charge"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 2 — Commercial : Envoyer la fiche par mail
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "INSPECTION_EN_COURS") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader><CardTitle className="text-sm text-blue-800">Inspection en cours</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-blue-700">Effectuez l&apos;inspection puis envoyez la fiche par mail.</p>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>✏️ Saisir les observations</Button>
          ) : (
            <div className="space-y-3">
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
                rows={4}
                placeholder="État des pneumatiques, usure, anomalies, dimensions actuelles..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button onClick={() => callApi("envoyer_inspection", { notesInspection: notes })} disabled={loading}>
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
  // ÉTAPE 3 — Agent client & N+1 : Valider l'inspection
  // ═══════════════════════════════════════════════════════════════════
  if ((role === "AGENT_CLIENT" || role === "N1_CLIENT") && commande.statut === "INSPECTION_ENVOYEE") {
    const dejaValide = role === "AGENT_CLIENT" ? commande.inspectionValideeAgent : commande.inspectionValideeN1;
    return (
      <Card className="border-cyan-200 bg-cyan-50">
        <CardHeader><CardTitle className="text-sm text-cyan-800">Validation de l&apos;inspection</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {[
              { label: "Agent client", done: commande.inspectionValideeAgent },
              { label: "Responsable N+1", done: commande.inspectionValideeN1 },
            ].map(({ label, done }) => (
              <span key={label} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${done ? "bg-green-100 border-green-400 text-green-700" : "bg-white border-gray-300 text-gray-500"}`}>
                {done ? "✓" : "○"} {label}
              </span>
            ))}
          </div>
          {dejaValide ? (
            <p className="text-sm text-green-700 font-medium">✓ Vous avez déjà validé. En attente de l&apos;autre validation.</p>
          ) : (
            <Button onClick={() => callApi("valider_inspection")} disabled={loading}>
              {loading ? "En cours..." : "✓ Valider l'inspection"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 4 — Agent client : Saisir marque + dimension + quantité
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_CLIENT" && commande.statut === "DEVIS_DEMANDE") {
    return (
      <Card className="border-indigo-200 bg-indigo-50">
        <CardHeader><CardTitle className="text-sm text-indigo-800">Saisir vos besoins en pneus</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-indigo-700">
            Indiquez la marque souhaitée, la dimension et la quantité. L&apos;agent commercial vous proposera les prix disponibles.
          </p>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>📋 Saisir mes besoins</Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Marque souhaitée *</Label>
                  <Input
                    placeholder="Michelin, Bridgestone, Goodyear..."
                    value={marqueDemandee}
                    onChange={(e) => setMarqueDemandee(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Dimension *</Label>
                  <Input
                    placeholder="Ex: 295/80R22.5"
                    value={dimensionDemandee}
                    onChange={(e) => setDimensionDemandee(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantité *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantiteDemandee}
                    onChange={(e) => setQuantiteDemandee(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Précisions / remarques</Label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
                  rows={2}
                  placeholder="Indice de charge, vitesse, type de route..."
                  value={notesDevis}
                  onChange={(e) => setNotesDevis(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button
                  disabled={loading || !marqueDemandee || !dimensionDemandee}
                  onClick={() => callApi("saisir_besoins", { marqueDemandee, dimensionDemandee, quantiteDemandee, notesDevis })}
                >
                  {loading ? "Envoi..." : "Envoyer la demande →"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 5 — Commercial : Proposer marques dispo + prix HT
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "DEVIS_EN_COURS") {
    return (
      <Card className="border-violet-200 bg-violet-50">
        <CardHeader><CardTitle className="text-sm text-violet-800">Proposer les pneus disponibles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {commande.marqueDemandee && (
            <div className="bg-white rounded-lg p-3 border border-violet-200 text-sm">
              <p className="text-xs text-gray-500 mb-1">Demande du client :</p>
              <p><span className="font-medium">{commande.quantiteDemandee}x</span> {commande.marqueDemandee} — {commande.dimensionDemandee}</p>
            </div>
          )}
          <p className="text-sm text-violet-700">Saisissez les marques disponibles avec leurs prix HT et références.</p>

          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>💰 Saisir le devis</Button>
          ) : (
            <div className="space-y-5">
              {/* Site de montage */}
              <div className="space-y-2">
                <Label>Point de montage *</Label>
                <Select value={siteId} onValueChange={(v) => setSiteId(String(v ?? ""))}>
                  <SelectTrigger><SelectValue placeholder="Choisir le site de montage" /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nom} — {s.ville}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Liste des pneus proposés */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pneus disponibles</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPneus((p) => [...p, emptyPneu()])}>
                    + Ajouter
                  </Button>
                </div>

                {pneus.map((p, i) => (
                  <div key={i} className="border rounded-lg p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Option #{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={p.disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {p.disponible ? "✓ Disponible" : "✗ Indisponible"}
                        </Badge>
                        {pneus.length > 1 && (
                          <button onClick={() => setPneus((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Marque *</Label>
                        <Input placeholder="Michelin, Bridgestone..." value={p.marque} onChange={(e) => updatePneu(i, "marque", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Référence produit</Label>
                        <Input placeholder="Ex: XZA3+, R168" value={p.reference || ""} onChange={(e) => updatePneu(i, "reference", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dimension *</Label>
                        <Input placeholder="Ex: 295/80R22.5" value={p.dimension} onChange={(e) => updatePneu(i, "dimension", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantité *</Label>
                        <Input type="number" min={1} value={p.quantite} onChange={(e) => updatePneu(i, "quantite", parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix HT unitaire (MAD) *</Label>
                        <Input type="number" min={0} step="0.01" placeholder="0.00" value={p.prixUnitaire || ""} onChange={(e) => updatePneu(i, "prixUnitaire", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sous-total HT</Label>
                        <div className="h-10 flex items-center px-3 bg-gray-50 border rounded-md text-sm font-semibold">
                          {(p.prixUnitaire * p.quantite).toLocaleString("fr-FR")} MAD
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-xs">Disponibilité :</Label>
                      {[true, false].map((val) => (
                        <button key={String(val)} type="button" onClick={() => updatePneu(i, "disponible", val)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${p.disponible === val ? (val ? "bg-green-100 border-green-400 text-green-700" : "bg-red-100 border-red-400 text-red-700") : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
                          {val ? "✓ Disponible" : "✗ Indisponible"}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Délai / remarques</Label>
                      <Input placeholder="Ex: 3 jours, stock limité..." value={p.notes || ""} onChange={(e) => updatePneu(i, "notes", e.target.value)} />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-2 border-t">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total HT</p>
                    <p className="text-xl font-bold">{totalHT.toLocaleString("fr-FR")} MAD</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button
                  disabled={loading || !siteId || pneus.some((p) => !p.marque || !p.dimension || p.prixUnitaire <= 0)}
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
  // ÉTAPE 6 — Agent client : Choisir parmi les propositions
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_CLIENT" && commande.statut === "DEVIS_PROPOSE") {
    const propositions = commande.pneus.filter((p) => p.disponible);
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader><CardTitle className="text-sm text-amber-800">Choisir une proposition</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-amber-700">
            Sélectionnez la marque et le prix qui vous conviennent parmi les propositions ci-dessous.
          </p>
          <div className="space-y-2">
            {commande.pneus.map((p) => (
              <div key={p.id} className={`border rounded-lg p-4 bg-white ${!p.disponible ? "opacity-50" : "hover:border-amber-400 cursor-pointer transition-colors"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{p.marque} {p.reference && <span className="text-gray-500 font-normal text-sm">— {p.reference}</span>}</p>
                    <p className="text-sm text-gray-600">{p.dimension} · {p.quantite} pneu(s)</p>
                    {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{(p.prixUnitaire * p.quantite).toLocaleString("fr-FR")} MAD HT</p>
                    <p className="text-xs text-gray-500">{p.prixUnitaire.toLocaleString("fr-FR")} MAD / unité</p>
                    <Badge className={p.disponible ? "bg-green-100 text-green-700 mt-1" : "bg-red-100 text-red-700 mt-1"}>
                      {p.disponible ? "✓ Disponible" : "✗ Indisponible"}
                    </Badge>
                  </div>
                </div>
                {p.disponible && (
                  <Button
                    className="mt-3 w-full"
                    disabled={loading}
                    onClick={() => callApi("choisir_pneu", { pneuId: p.id })}
                  >
                    {loading ? "En cours..." : `Choisir ${p.marque}`}
                  </Button>
                )}
              </div>
            ))}
            {propositions.length === 0 && (
              <p className="text-sm text-red-600 text-center py-4">Aucune proposition disponible. Contactez l&apos;agent commercial.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 7 — Service achat : Passer la commande
  // ═══════════════════════════════════════════════════════════════════
  if (role === "SERVICE_ACHAT" && commande.statut === "VALIDEE") {
    const pneuChoisi = commande.pneus.find((p) => p.choisi);
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader><CardTitle className="text-sm text-green-800">Commande à passer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pneuChoisi && (
            <div className="bg-white rounded-lg p-3 border border-green-200 text-sm">
              <p className="text-xs text-gray-500 mb-1">Pneu choisi par le client :</p>
              <p className="font-medium">{pneuChoisi.marque} {pneuChoisi.reference && `— ${pneuChoisi.reference}`}</p>
              <p className="text-gray-600">{pneuChoisi.dimension} · {pneuChoisi.quantite} unité(s) · {(pneuChoisi.prixUnitaire * pneuChoisi.quantite).toLocaleString("fr-FR")} MAD HT</p>
            </div>
          )}
          <Button onClick={() => callApi("commander")} disabled={loading} className="w-full">
            {loading ? "En cours..." : "✓ Confirmer la commande fournisseur"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 8 — Commercial : Pneus livrés
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "COMMANDEE_FOURNISSEUR") {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader><CardTitle className="text-sm text-orange-800">Livraison</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700 mb-4">Confirmez l&apos;arrivée des pneus au point de montage.</p>
          <Button onClick={() => callApi("livrer")} disabled={loading}>
            {loading ? "En cours..." : "🚚 Pneus livrés au point de montage"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÉTAPE 9 — Commercial : Montage effectué
  // ═══════════════════════════════════════════════════════════════════
  if (role === "AGENT_COMMERCIAL" && commande.statut === "PNEUS_LIVRES") {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader><CardTitle className="text-sm text-emerald-800">Montage</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={2}
            placeholder="Notes de montage (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={() => callApi("monter", { notes })} disabled={loading}>
            {loading ? "En cours..." : "✓ Confirmer le montage"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
