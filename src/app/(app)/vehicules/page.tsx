import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS, STATUT_COLORS, TYPE_VEHICULE_LABELS } from "@/lib/constants";
import Link from "next/link";
import { Truck, Search, Calendar, Package, CheckCircle2, Download, Gauge } from "lucide-react";
import VehiculeSearch from "@/components/vehicules/VehiculeSearch";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function VehiculesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) return null;

  const { q } = await searchParams;
  const role = session.user.role;
  const entrepriseId = session.user.entrepriseId;
  const isClient = role === "AGENT_CLIENT" || role === "N1_CLIENT";
  const baseWhere = isClient ? { entrepriseId: entrepriseId! } : {};

  // Liste des immatriculations uniques
  const immatriculations = await prisma.commande.groupBy({
    by: ["immatriculation", "typeVehicule"],
    where: baseWhere,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const filtered = q
    ? immatriculations.filter((i) =>
        i.immatriculation.toLowerCase().includes(q.toLowerCase())
      )
    : immatriculations;

  // Si une immat est sélectionnée, charger son historique complet
  const selected = q && immatriculations.find(
    (i) => i.immatriculation.toLowerCase() === q.toLowerCase()
  ) ? q.toUpperCase() : null;

  const commandes = selected
    ? await prisma.commande.findMany({
        where: { ...baseWhere, immatriculation: selected },
        orderBy: { createdAt: "desc" },
        include: {
          entreprise: true,
          createur: true,
          agentCommercial: true,
          siteMontage: true,
          pneus: { where: { choisi: true } },
          historiques: {
            orderBy: { createdAt: "asc" },
            include: { utilisateur: true },
          },
        },
      })
    : [];

  // Stats pour le véhicule sélectionné
  const totalPneusMontes = commandes
    .filter((c) => c.statut === "MONTEE")
    .reduce((s, c) => s + c.pneus.reduce((ps, p) => ps + p.quantite, 0), 0);

  const totalDepense = commandes
    .filter((c) => c.prixTotal !== null)
    .reduce((s, c) => s + (c.prixTotal ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-6 h-6" /> Historique par véhicule
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Consultez tout l&apos;historique d&apos;un véhicule : inspections, pneus montés, dates d&apos;intervention
        </p>
      </div>

      {/* Recherche + export */}
      <div className="flex items-center gap-3 flex-wrap">
        <VehiculeSearch defaultValue={q || ""} />
        {selected && (
          <a
            href={`/api/export/vehicules?immat=${selected}`}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </a>
        )}
        {!selected && (
          <a
            href="/api/export/vehicules"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter tous
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Liste des véhicules ─────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">
                {filtered.length} véhicule(s)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Aucun véhicule trouvé</p>
              ) : (
                <div className="divide-y">
                  {filtered.map((v) => (
                    <Link
                      key={v.immatriculation}
                      href={`/vehicules?q=${v.immatriculation}`}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selected === v.immatriculation ? "bg-blue-50 border-l-2 border-blue-500" : ""
                      }`}
                    >
                      <div>
                        <p className="font-mono font-semibold text-sm">{v.immatriculation}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{TYPE_VEHICULE_LABELS[v.typeVehicule]}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-700">{v._count.id} intervention(s)</p>
                        <p className="text-xs text-gray-400">{v._count.id} intervention(s)</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Historique détaillé ──────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-xl">
              <Search className="w-10 h-10 mb-3" />
              <p className="text-sm font-medium">Sélectionnez un véhicule</p>
              <p className="text-xs mt-1">ou recherchez par immatriculation</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* En-tête véhicule */}
              <Card className="bg-gray-900 text-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Immatriculation</p>
                      <p className="text-3xl font-mono font-bold mt-1">{selected}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {TYPE_VEHICULE_LABELS[commandes[0]?.typeVehicule ?? "CAMION"]}
                        {commandes[0]?.entreprise && ` · ${commandes[0].entreprise.nom}`}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{commandes.length}</p>
                        <p className="text-xs text-gray-400">interventions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalPneusMontes}</p>
                        <p className="text-xs text-gray-400">pneus montés</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalDepense > 0 ? `${(totalDepense / 1000).toFixed(0)}k` : "—"}</p>
                        <p className="text-xs text-gray-400">MAD HT</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {commandes[0]?.kilometrage ? `${commandes[0].kilometrage.toLocaleString("fr-FR")}` : "—"}
                        </p>
                        <p className="text-xs text-gray-400">km (dernier)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline des interventions */}
              <div className="space-y-4">
                {commandes.map((cmd, idx) => (
                  <Card key={cmd.id} className="overflow-hidden">
                    <CardHeader className="pb-3 bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-bold">
                            {commandes.length - idx}
                          </span>
                          <div>
                            <p className="font-semibold text-sm">{cmd.reference}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(cmd.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                              {cmd.typeCommande === "DIRECTE" && <span className="ml-1 text-sky-600">⚡ Directe</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${STATUT_COLORS[cmd.statut]}`}>
                            {STATUT_LABELS[cmd.statut]}
                          </Badge>
                          <Link href={`/commandes/${cmd.id}`} className="text-xs text-blue-600 hover:underline">
                            Voir →
                          </Link>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      {/* Infos clés */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Chauffeur</p>
                          <p className="font-medium">{cmd.numeroChauffeur}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Ville</p>
                          <p className="font-medium">{cmd.villeDepart}</p>
                        </div>
                        {cmd.kilometrage && (
                          <div>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Gauge className="w-3 h-3" /> Kilométrage</p>
                            <p className="font-medium">{cmd.kilometrage.toLocaleString("fr-FR")} km</p>
                          </div>
                        )}
                        {cmd.agentCommercial && (
                          <div>
                            <p className="text-xs text-gray-400">Agent commercial</p>
                            <p className="font-medium">{cmd.agentCommercial.prenom} {cmd.agentCommercial.nom}</p>
                          </div>
                        )}
                        {cmd.siteMontage && (
                          <div>
                            <p className="text-xs text-gray-400">Site de montage</p>
                            <p className="font-medium">{cmd.siteMontage.nom} — {cmd.siteMontage.ville}</p>
                          </div>
                        )}
                        {cmd.dateMontage && (
                          <div>
                            <p className="text-xs text-gray-400">Date de montage</p>
                            <p className="font-medium text-emerald-600">
                              {new Date(cmd.dateMontage).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        )}
                        {cmd.prixTotal !== null && (
                          <div>
                            <p className="text-xs text-gray-400">Montant HT</p>
                            <p className="font-semibold text-gray-900">{cmd.prixTotal.toLocaleString("fr-FR")} MAD</p>
                          </div>
                        )}
                      </div>

                      {/* Pneus montés */}
                      {cmd.pneus.length > 0 && (
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Pneus
                          </p>
                          <div className="space-y-1">
                            {cmd.pneus.map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{p.marque} {p.reference && `— ${p.reference}`}</span>
                                <div className="flex items-center gap-3 text-gray-600">
                                  <span>{p.dimension}</span>
                                  <span>×{p.quantite}</span>
                                  <span className="font-medium">{(p.prixUnitaire * p.quantite).toLocaleString("fr-FR")} MAD</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Historique compact */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Suivi</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cmd.historiques.map((h, i) => (
                            <div key={h.id} className="flex items-center gap-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[h.statut]}`}>
                                {STATUT_LABELS[h.statut]}
                              </span>
                              {i < cmd.historiques.length - 1 && (
                                <span className="text-gray-300 text-xs">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {cmd.statut === "MONTEE" && (
                          <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Intervention terminée
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
