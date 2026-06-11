import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function genRef() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `CDR-${y}${m}${d}-${rand}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT_CLIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const {
    typeVehicule, immatriculation, numeroChauffeur, villeDepart,
    marqueDemandee, dimensionDemandee, quantiteDemandee, notesDevis,
  } = body;

  if (!typeVehicule || !immatriculation || !numeroChauffeur || !villeDepart || !marqueDemandee || !dimensionDemandee) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const commande = await prisma.commande.create({
    data: {
      reference: genRef(),
      typeCommande: "DIRECTE",
      statut: "COMMANDE_DIRECTE",
      typeVehicule,
      immatriculation: immatriculation.toUpperCase(),
      numeroChauffeur,
      villeDepart,
      marqueDemandee,
      dimensionDemandee,
      quantiteDemandee: parseInt(quantiteDemandee) || 1,
      notesDevis: notesDevis || null,
      entrepriseId: session.user.entrepriseId!,
      createurId: session.user.id,
    },
  });

  await prisma.historique.create({
    data: {
      commandeId: commande.id,
      statut: "COMMANDE_DIRECTE",
      commentaire: `Commande directe créée : ${quantiteDemandee}x ${marqueDemandee} ${dimensionDemandee}`,
      utilisateurId: session.user.id,
    },
  });

  return NextResponse.json(commande, { status: 201 });
}
