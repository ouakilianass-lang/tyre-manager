import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NouveauSiteForm from "@/components/admin/NouveauSiteForm";

export default async function SitesPage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "AGENT_COMMERCIAL"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const sites = await prisma.siteMontage.findMany({ orderBy: { ville: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites de montage</h1>
          <p className="text-gray-500 mt-1">{sites.length} site(s)</p>
        </div>
        {session.user.role === "SUPER_ADMIN" && <NouveauSiteForm />}
      </div>

      <Card>
        <CardContent className="p-0">
          {sites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucun site de montage.</div>
          ) : (
            <div className="divide-y">
              {sites.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium">{s.nom}</p>
                    <p className="text-sm text-gray-500">{s.adresse}</p>
                    <p className="text-sm text-gray-500">{s.ville}</p>
                    {s.telephone && <p className="text-sm text-gray-400">{s.telephone}</p>}
                  </div>
                  <Badge variant={s.actif ? "default" : "secondary"}>
                    {s.actif ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
