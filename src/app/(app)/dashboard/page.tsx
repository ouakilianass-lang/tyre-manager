import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/constants";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle, Truck, TrendingUp,
  AlertCircle, Building2, MapPin, Calendar, ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const entrepriseId = session.user.entrepriseId;
  const isClient = role === "AGENT_CLIENT" || role === "N1_CLIENT";
  const where = isClient ? { entrepriseId: entrepriseId! } : {};

  // ── Stats globales ────────────────────────────────────────────────
  const [
    total, montees, enCours, rejetees,
    demandeInspection, inspectionEnCours, inspectionEnvoyee,
    devisEnCours, devisPropose, validees, commandees, livrees,
    commandeDirecte, validationN1,
    commandesRecentes,
    statsParClient,
    statsParVille,
    vehiculesActifs,
  ] = await Promise.all([
    prisma.commande.count({ where }),
    prisma.commande.count({ where: { ...where, statut: "MONTEE" } }),
    prisma.commande.count({ where: { ...where, statut: { notIn: ["MONTEE", "REJETEE"] } } }),
    prisma.commande.count({ where: { ...where, statut: "REJETEE" } }),
    prisma.commande.count({ where: { ...where, statut: "DEMANDE_INSPECTION" } }),
    prisma.commande.count({ where: { ...where, statut: "INSPECTION_EN_COURS" } }),
    prisma.commande.count({ where: { ...where, statut: "INSPECTION_ENVOYEE" } }),
    prisma.commande.count({ where: { ...where, statut: "DEVIS_EN_COURS" } }),
    prisma.commande.count({ where: { ...where, statut: "DEVIS_PROPOSE" } }),
    prisma.commande.count({ where: { ...where, statut: "VALIDEE" } }),
    prisma.commande.count({ where: { ...where, statut: "COMMANDEE_FOURNISSEUR" } }),
    prisma.commande.count({ where: { ...where, statut: "PNEUS_LIVRES" } }),
    prisma.commande.count({ where: { ...where, statut: "COMMANDE_DIRECTE" } }),
    prisma.commande.count({ where: { ...where, statut: "VALIDATION_N1" } }),
    prisma.commande.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { entreprise: true, siteMontage: true, pneus: { where: { choisi: true } } },
    }),
    !isClient ? prisma.commande.groupBy({
      by: ["entrepriseId"],
      _count: { id: true },
      where,
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }) : Promise.resolve([]),
    prisma.commande.groupBy({
      by: ["villeDepart"],
      _count: { id: true },
      where,
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.commande.groupBy({
      by: ["immatriculation", "typeVehicule"],
      _count: { id: true },
      where,
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Noms des entreprises pour les stats
  let entrepriseNames: Record<string, string> = {};
  if (!isClient && statsParClient.length > 0) {
    const ids = statsParClient.map((s) => s.entrepriseId);
    const ents = await prisma.entreprise.findMany({ where: { id: { in: ids } } });
    entrepriseNames = Object.fromEntries(ents.map((e) => [e.id, e.nom]));
  }

  const actionRequired =
    demandeInspection + inspectionEnvoyee + devisPropose + validees + commandees + livrees + commandeDirecte + validationN1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {actionRequired > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">{actionRequired} action(s) requise(s)</span>
          </div>
        )}
      </div>

      {/* ── KPIs principaux ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total commandes", value: total, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "En cours", value: enCours, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Montées", value: montees, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Rejetées", value: rejetees, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{k.label}</p>
                  <p className="text-3xl font-bold mt-1">{k.value}</p>
                </div>
                <div className={`w-11 h-11 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Pipeline des statuts ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pipeline des commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Demande", value: demandeInspection + commandeDirecte, color: "bg-gray-100 text-gray-700" },
              { label: "Inspection", value: inspectionEnCours, color: "bg-blue-100 text-blue-700" },
              { label: "Fiche envoyée", value: inspectionEnvoyee, color: "bg-cyan-100 text-cyan-700" },
              { label: "Devis en cours", value: devisEnCours, color: "bg-violet-100 text-violet-700" },
              { label: "Choix client", value: devisPropose + validationN1, color: "bg-amber-100 text-amber-700" },
              { label: "Validée", value: validees, color: "bg-green-100 text-green-700" },
              { label: "Commandée", value: commandees, color: "bg-purple-100 text-purple-700" },
              { label: "Livraison", value: livrees, color: "bg-orange-100 text-orange-700" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Activité récente ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activité récente</CardTitle>
              <Link href="/inspections" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {commandesRecentes.map((cmd) => {
                  const pneuChoisi = cmd.pneus[0];
                  return (
                    <Link
                      key={cmd.id}
                      href={`/commandes/${cmd.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-900">{cmd.immatriculation}</span>
                          <span className="text-xs text-gray-400">{cmd.reference}</span>
                          {cmd.typeCommande === "DIRECTE" && (
                            <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">⚡</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{cmd.entreprise.nom}</span>
                          {pneuChoisi && (
                            <span className="text-xs text-gray-400">· {pneuChoisi.marque} {pneuChoisi.dimension}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(cmd.updatedAt).toLocaleDateString("fr-FR")}
                        </span>
                        <Badge className={`text-xs ${STATUT_COLORS[cmd.statut]}`}>
                          {STATUT_LABELS[cmd.statut]}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
                {commandesRecentes.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">Aucune commande</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Panneaux latéraux ────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Top immatriculations */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Truck className="w-4 h-4" /> Véhicules actifs
              </CardTitle>
              <Link href="/vehicules" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Historique <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {vehiculesActifs.map((v) => (
                <Link
                  key={v.immatriculation}
                  href={`/vehicules?q=${v.immatriculation}`}
                  className="flex items-center justify-between hover:bg-gray-50 px-2 py-1.5 rounded"
                >
                  <span className="font-mono text-sm font-medium">{v.immatriculation}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {v._count.id} intervention(s)
                  </span>
                </Link>
              ))}
              {vehiculesActifs.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Aucun véhicule</p>
              )}
            </CardContent>
          </Card>

          {/* Top villes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Top villes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {statsParVille.map((v, i) => (
                <div key={v.villeDepart} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm">{v.villeDepart}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 bg-blue-200 rounded-full" style={{ width: `${(v._count.id / (statsParVille[0]?._count.id || 1)) * 60}px` }}>
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                    <span className="text-xs text-gray-500 w-4 text-right">{v._count.id}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top clients (fournisseur only) */}
          {!isClient && statsParClient.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Top clients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statsParClient.map((s, i) => (
                  <div key={s.entrepriseId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm truncate max-w-[130px]">{entrepriseNames[s.entrepriseId] || "—"}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s._count.id}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
