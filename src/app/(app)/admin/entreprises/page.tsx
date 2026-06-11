import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import NouvelleEntrepriseForm from "@/components/admin/NouvelleEntrepriseForm";

export default async function EntreprisesPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const entreprises = await prisma.entreprise.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { utilisateurs: true, commandes: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entreprises clientes</h1>
          <p className="text-gray-500 mt-1">{entreprises.length} entreprise(s)</p>
        </div>
        <NouvelleEntrepriseForm />
      </div>

      <Card>
        <CardContent className="p-0">
          {entreprises.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucune entreprise.</div>
          ) : (
            <div className="divide-y">
              {entreprises.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium">{e.nom}</p>
                    {e.adresse && <p className="text-sm text-gray-500">{e.adresse}</p>}
                    {e.telephone && <p className="text-sm text-gray-500">{e.telephone}</p>}
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    <p>{e._count.utilisateurs} utilisateur(s)</p>
                    <p>{e._count.commandes} commande(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
