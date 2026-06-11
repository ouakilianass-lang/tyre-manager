import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUT_LABELS, STATUT_COLORS, TYPE_VEHICULE_LABELS } from "@/lib/constants";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";

export default async function InspectionsPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const entrepriseId = session.user.entrepriseId;

  const where =
    role === "AGENT_CLIENT" || role === "N1_CLIENT"
      ? { entrepriseId: entrepriseId! }
      : {};

  const commandes = await prisma.commande.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      entreprise: true,
      createur: true,
      agentCommercial: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspections & Commandes</h1>
          <p className="text-gray-500 mt-1">{commandes.length} commande(s)</p>
        </div>
        {role === "AGENT_CLIENT" && (
          <div className="flex gap-2">
            <Link href="/commandes/directe">
              <Button variant="outline">
                <Zap className="w-4 h-4 mr-2 text-sky-500" />
                Commande directe
              </Button>
            </Link>
            <Link href="/inspections/nouvelle">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Demande d&apos;inspection
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {commandes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Aucune demande pour le moment.</p>
              {role === "AGENT_CLIENT" && (
                <Link href="/inspections/nouvelle">
                  <Button className="mt-4" variant="outline">
                    Créer une demande d&apos;inspection
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {commandes.map((cmd) => (
                <Link
                  key={cmd.id}
                  href={`/commandes/${cmd.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{cmd.reference}</span>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_VEHICULE_LABELS[cmd.typeVehicule]}
                      </Badge>
                      {cmd.typeCommande === "DIRECTE" && (
                        <Badge className="text-xs bg-sky-100 text-sky-700">⚡ Directe</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {cmd.immatriculation} · Chauffeur: {cmd.numeroChauffeur}
                    </p>
                    <p className="text-xs text-gray-400">
                      {cmd.entreprise.nom} · {cmd.villeDepart} ·{" "}
                      {new Date(cmd.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge className={STATUT_COLORS[cmd.statut]}>
                    {STATUT_LABELS[cmd.statut]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
