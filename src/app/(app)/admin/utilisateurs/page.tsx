import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import NouvelUtilisateurForm from "@/components/admin/NouvelUtilisateurForm";

export default async function UtilisateursPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [utilisateurs, entreprises] = await Promise.all([
    prisma.utilisateur.findMany({
      orderBy: { createdAt: "desc" },
      include: { entreprise: true },
    }),
    prisma.entreprise.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">{utilisateurs.length} utilisateur(s)</p>
        </div>
        <NouvelUtilisateurForm entreprises={entreprises} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {utilisateurs.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{u.prenom} {u.nom}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  {u.entreprise && (
                    <p className="text-xs text-blue-600">{u.entreprise.nom}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                  <Badge variant={u.actif ? "default" : "secondary"}>
                    {u.actif ? "Actif" : "Inactif"}
                  </Badge>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{u.code}</code>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
