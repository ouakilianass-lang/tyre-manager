import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function genRef() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `CMD-${y}${m}${d}-${rand}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT_CLIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { typeVehicule, immatriculation, numeroChauffeur, villeDepart } = body;

  if (!typeVehicule || !immatriculation || !numeroChauffeur || !villeDepart) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const commande = await prisma.commande.create({
    data: {
      reference: genRef(),
      typeVehicule,
      immatriculation: immatriculation.toUpperCase(),
      numeroChauffeur,
      villeDepart,
      entrepriseId: session.user.entrepriseId!,
      createurId: session.user.id,
      statut: "DEMANDE_INSPECTION",
    },
  });

  await prisma.historique.create({
    data: {
      commandeId: commande.id,
      statut: "DEMANDE_INSPECTION",
      commentaire: "Demande d'inspection créée",
      utilisateurId: session.user.id,
    },
  });

  return NextResponse.json(commande, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const role = session.user.role;
  const entrepriseId = session.user.entrepriseId;

  const where =
    role === "AGENT_CLIENT" || role === "N1_CLIENT"
      ? { entrepriseId: entrepriseId! }
      : {};

  const commandes = await prisma.commande.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { entreprise: true, siteMontage: true, pneus: true },
  });

  return NextResponse.json(commandes);
}
