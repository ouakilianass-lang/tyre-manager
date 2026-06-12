import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import UtilisateursClient from "@/components/admin/UtilisateursClient";

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
    <UtilisateursClient
      utilisateurs={utilisateurs}
      entreprises={entreprises}
      currentUserId={session.user.id}
    />
  );
}
