import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { STATUT_LABELS, STATUT_COLORS, TYPE_VEHICULE_LABELS } from "@/lib/constants";
import CommandeActions from "@/components/commandes/CommandeActions";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { StatutCommande } from "@prisma/client";

const STEPS: { statut: StatutCommande; label: string }[] = [
  { statut: "DEMANDE_INSPECTION", label: "Demande créée" },
  { statut: "EN_ATTENTE_VALIDATION", label: "En attente validation" },
  { statut: "VALIDEE", label: "Validée" },
  { statut: "COMMANDEE_FOURNISSEUR", label: "Commandée fournisseur" },
  { statut: "PNEUS_LIVRES", label: "Pneus livrés" },
  { statut: "MONTEE", label: "Montée" },
];

const ORDER: StatutCommande[] = [
  "DEMANDE_INSPECTION",
  "INSPECTION_EN_COURS",
  "INSPECTION_TERMINEE",
  "EN_ATTENTE_VALIDATION",
  "VALIDEE",
  "COMMANDEE_FOURNISSEUR",
  "PNEUS_LIVRES",
  "MONTEE",
];

export default async function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;

  const commande = await prisma.commande.findUnique({
    where: { id },
    include: {
      entreprise: true,
      createur: true,
      validateur: true,
      agentCommercial: true,
      serviceAchat: true,
      siteMontage: true,
      pneus: true,
      historiques: {
        orderBy: { createdAt: "asc" },
        include: { utilisateur: true },
      },
    },
  });

  if (!commande) notFound();

  const currentIndex = ORDER.indexOf(commande.statut);

  const sitesForForm =
    session.user.role === "AGENT_COMMERCIAL"
      ? await prisma.siteMontage.findMany({ where: { actif: true }, orderBy: { ville: "asc" } })
      : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{commande.reference}</h1>
          <p className="text-gray-500 mt-1">{commande.entreprise.nom}</p>
        </div>
        <Badge className={`text-sm px-3 py-1 ${STATUT_COLORS[commande.statut]}`}>
          {STATUT_LABELS[commande.statut]}
        </Badge>
      </div>

      {/* Timeline */}
      {commande.statut !== "REJETEE" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-0">
              {STEPS.map((step, i) => {
                const stepIndex = ORDER.indexOf(step.statut);
                const done = stepIndex < currentIndex;
                const active = stepIndex === currentIndex || (currentIndex > stepIndex && stepIndex <= ORDER.indexOf("MONTEE"));
                const isCurrent = step.statut === commande.statut;

                return (
                  <div key={step.statut} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      {done || (currentIndex >= stepIndex) ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                      )}
                      <span className={`text-xs mt-1 text-center w-20 ${isCurrent ? "font-semibold text-gray-900" : "text-gray-400"}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 mx-1 ${currentIndex > stepIndex ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Infos véhicule */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Véhicule</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span>{TYPE_VEHICULE_LABELS[commande.typeVehicule]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Immatriculation</span>
              <span className="font-mono font-medium">{commande.immatriculation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chauffeur</span>
              <span>{commande.numeroChauffeur}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ville</span>
              <span>{commande.villeDepart}</span>
            </div>
          </CardContent>
        </Card>

        {/* Infos commande */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Commande</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Créée par</span>
              <span>{commande.createur.prenom} {commande.createur.nom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span>{new Date(commande.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
            {commande.agentCommercial && (
              <div className="flex justify-between">
                <span className="text-gray-500">Agent commercial</span>
                <span>{commande.agentCommercial.prenom} {commande.agentCommercial.nom}</span>
              </div>
            )}
            {commande.siteMontage && (
              <div className="flex justify-between">
                <span className="text-gray-500">Site montage</span>
                <span>{commande.siteMontage.nom} — {commande.siteMontage.ville}</span>
              </div>
            )}
            {commande.prixTotal !== null && (
              <div className="flex justify-between font-semibold">
                <span className="text-gray-500">Prix total</span>
                <span>{commande.prixTotal.toLocaleString("fr-FR")} MAD</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pneus */}
      {commande.pneus.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Pneus</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left pb-2">Marque</th>
                  <th className="text-left pb-2">Référence</th>
                  <th className="text-left pb-2">Dimension</th>
                  <th className="text-center pb-2">Qté</th>
                  <th className="text-right pb-2">Prix unit.</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commande.pneus.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 font-medium">{p.marque}</td>
                    <td className="py-2 text-gray-500">{p.reference || "—"}</td>
                    <td className="py-2">{p.dimension}</td>
                    <td className="py-2 text-center">{p.quantite}</td>
                    <td className="py-2 text-right">{p.prixUnitaire.toLocaleString("fr-FR")} MAD</td>
                    <td className="py-2 text-right font-medium">{(p.prixUnitaire * p.quantite).toLocaleString("fr-FR")} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Inspection notes */}
      {commande.notesInspection && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes d&apos;inspection</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-line">{commande.notesInspection}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <CommandeActions
        commande={{
          id: commande.id,
          statut: commande.statut,
          pneus: commande.pneus,
          siteMontageId: commande.siteMontageId,
        }}
        role={session.user.role}
        sites={sitesForForm}
      />

      {/* Historique */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Historique</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commande.historiques.map((h) => (
              <div key={h.id} className="flex gap-3">
                <div className="mt-0.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${STATUT_COLORS[h.statut]}`}>{STATUT_LABELS[h.statut]}</Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  {h.commentaire && <p className="text-sm text-gray-600 mt-0.5">{h.commentaire}</p>}
                  {h.utilisateur && (
                    <p className="text-xs text-gray-400">{h.utilisateur.prenom} {h.utilisateur.nom}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
