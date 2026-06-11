import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { StatutCommande } from "@prisma/client";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;

  const commande = await prisma.commande.findUnique({
    where: { id },
    include: {
      entreprise: true,
      createur: true,
      validateur: true,
      agentCommercial: true,
      serviceAchat: true,
      siteMontage: true,
      pneus: true,
      historiques: {
        orderBy: { createdAt: "asc" },
        include: { utilisateur: true },
      },
    },
  });

  if (!commande) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(commande);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const role = session.user.role;

  const commande = await prisma.commande.findUnique({ where: { id }, include: { pneus: true } });
  if (!commande) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let updateData: any = {};
  let newStatut: StatutCommande | null = null;
  let commentaire = "";

  // Agent commercial : saisie inspection + pneus + site montage
  if (role === "AGENT_COMMERCIAL" && body.action === "inspection") {
    const { notesInspection, siteMontageId, pneus } = body;

    updateData = {
      notesInspection,
      siteMontageId,
      dateInspection: new Date(),
      agentCommercialId: session.user.id,
      statut: "INSPECTION_TERMINEE",
    };
    newStatut = "INSPECTION_TERMINEE";
    commentaire = "Inspection effectuée, pneus et prix saisis";

    await prisma.pneu.deleteMany({ where: { commandeId: id } });
    if (pneus && pneus.length > 0) {
      await prisma.pneu.createMany({
        data: pneus.map((p: any) => ({ ...p, commandeId: id })),
      });
    }

    const total = pneus?.reduce((s: number, p: any) => s + p.prixUnitaire * p.quantite, 0) ?? 0;
    updateData.prixTotal = total;
    updateData.statut = "EN_ATTENTE_VALIDATION";
    newStatut = "EN_ATTENTE_VALIDATION";
  }

  // N+1 client : valide ou rejette
  if (role === "N1_CLIENT" && body.action === "valider") {
    updateData = {
      statut: "VALIDEE",
      validePrix: true,
      validateurId: session.user.id,
    };
    newStatut = "VALIDEE";
    commentaire = "Commande validée par le responsable client";
  }

  if (role === "N1_CLIENT" && body.action === "rejeter") {
    updateData = { statut: "REJETEE", validateurId: session.user.id };
    newStatut = "REJETEE";
    commentaire = body.commentaire || "Commande rejetée";
  }

  // Service achat : commande passée
  if (role === "SERVICE_ACHAT" && body.action === "commander") {
    if (commande.statut !== "VALIDEE") {
      return NextResponse.json({ error: "La commande doit être validée d'abord" }, { status: 400 });
    }
    updateData = { statut: "COMMANDEE_FOURNISSEUR", serviceAchatId: session.user.id };
    newStatut = "COMMANDEE_FOURNISSEUR";
    commentaire = "Commande passée auprès du fournisseur";
  }

  // Agent commercial : pneus livrés
  if (role === "AGENT_COMMERCIAL" && body.action === "livrer") {
    updateData = { statut: "PNEUS_LIVRES", dateLivraison: new Date() };
    newStatut = "PNEUS_LIVRES";
    commentaire = "Pneus arrivés au point de montage";
  }

  // Agent commercial : montage effectué
  if (role === "AGENT_COMMERCIAL" && body.action === "monter") {
    updateData = { statut: "MONTEE", dateMontage: new Date(), notesMontage: body.notes };
    newStatut = "MONTEE";
    commentaire = "Montage effectué";
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.commande.update({ where: { id }, data: updateData }),
    ...(newStatut
      ? [
          prisma.historique.create({
            data: {
              commandeId: id,
              statut: newStatut,
              commentaire,
              utilisateurId: session.user.id,
            },
          }),
        ]
      : []),
  ]);

  return NextResponse.json(updated);
}
