import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatutCommande } from "@prisma/client";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/constants";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

async function getStats(session: any) {
  const role = session.user.role;
  const entrepriseId = session.user.entrepriseId;

  const where =
    role === "AGENT_CLIENT" || role === "N1_CLIENT"
      ? { entrepriseId: entrepriseId! }
      : {};

  const [total, enAttente, validees, livrees, montees, rejetees, recentes] =
    await Promise.all([
      prisma.commande.count({ where }),
      prisma.commande.count({ where: { ...where, statut: "EN_ATTENTE_VALIDATION" } }),
      prisma.commande.count({ where: { ...where, statut: "VALIDEE" } }),
      prisma.commande.count({ where: { ...where, statut: "PNEUS_LIVRES" } }),
      prisma.commande.count({ where: { ...where, statut: "MONTEE" } }),
      prisma.commande.count({ where: { ...where, statut: "REJETEE" } }),
      prisma.commande.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { entreprise: true, siteMontage: true },
      }),
    ]);

  return { total, enAttente, validees, livrees, montees, rejetees, recentes };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const stats = await getStats(session);

  const cards = [
    {
      title: "Total commandes",
      value: stats.total,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "En attente validation",
      value: stats.enAttente,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Validées (à commander)",
      value: stats.validees,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Pneus livrés",
      value: stats.livrees,
      icon: Truck,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Montées ce mois",
      value: stats.montees,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Rejetées",
      value: stats.rejetees,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble des commandes et inspections</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernières commandes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune commande pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentes.map((cmd) => (
                <Link
                  key={cmd.id}
                  href={`/commandes/${cmd.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border"
                >
                  <div>
                    <p className="font-medium text-sm">{cmd.reference}</p>
                    <p className="text-xs text-gray-500">
                      {cmd.immatriculation} · {cmd.entreprise.nom}
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
