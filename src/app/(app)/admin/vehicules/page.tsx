import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import VehiculeAdminClient from "@/components/admin/VehiculeAdminClient";

export default async function AdminVehiculesPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [vehicules, entreprises] = await Promise.all([
    prisma.vehicule.findMany({
      orderBy: { createdAt: "desc" },
      include: { entreprise: true },
    }),
    prisma.entreprise.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const counts = await prisma.commande.groupBy({
    by: ["immatriculation"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.immatriculation, c._count.id]));

  const vehiculesWithCount = vehicules.map((v) => ({
    ...v,
    nbCommandes: countMap[v.immatriculation] ?? 0,
  }));

  return <VehiculeAdminClient vehicules={vehiculesWithCount} entreprises={entreprises} />;
}
