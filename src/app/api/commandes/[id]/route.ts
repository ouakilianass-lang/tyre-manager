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

  const commande = await prisma.commande.findUnique({ where: { id } });
  if (!commande) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let updateData: any = {};
  let newStatut: StatutCommande | null = null;
  let commentaire = "";

  // ── 1. AGENT COMMERCIAL : Prendre en charge ────────────────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "prendre_en_charge") {
    updateData = { statut: "INSPECTION_EN_COURS", agentCommercialId: session.user.id };
    newStatut = "INSPECTION_EN_COURS";
    commentaire = "Inspection prise en charge par l'agent commercial";
  }

  // ── 2. AGENT COMMERCIAL : Envoyer la fiche d'inspection par mail ───────────
  if (role === "AGENT_COMMERCIAL" && body.action === "envoyer_inspection") {
    const { notesInspection } = body;
    updateData = {
      statut: "INSPECTION_ENVOYEE",
      dateInspection: new Date(),
      notesInspection: notesInspection || null,
    };
    newStatut = "INSPECTION_ENVOYEE";
    commentaire = "Fiche d'inspection envoyée par mail au client";
  }

  // ── 3a. AGENT CLIENT : Valider l'inspection ────────────────────────────────
  if (role === "AGENT_CLIENT" && body.action === "valider_inspection") {
    if (commande.statut !== "INSPECTION_ENVOYEE") {
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    }
    const dejaValideN1 = commande.inspectionValideeN1;
    updateData = {
      inspectionValideeAgent: true,
      ...(dejaValideN1 && { statut: "DEVIS_DEMANDE" }),
    };
    newStatut = dejaValideN1 ? "DEVIS_DEMANDE" : "INSPECTION_ENVOYEE";
    commentaire = dejaValideN1
      ? "Inspection validée par l'agent client — devis demandé"
      : "Inspection validée par l'agent client (en attente N+1)";
  }

  // ── 3b. N+1 : Valider l'inspection ────────────────────────────────────────
  if (role === "N1_CLIENT" && body.action === "valider_inspection") {
    if (commande.statut !== "INSPECTION_ENVOYEE") {
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    }
    const dejaValideAgent = commande.inspectionValideeAgent;
    updateData = {
      inspectionValideeN1: true,
      ...(dejaValideAgent && { statut: "DEVIS_DEMANDE" }),
    };
    newStatut = dejaValideAgent ? "DEVIS_DEMANDE" : "INSPECTION_ENVOYEE";
    commentaire = dejaValideAgent
      ? "Inspection validée par le responsable — devis demandé"
      : "Inspection validée par le responsable (en attente agent client)";
  }

  // ── 4. AGENT COMMERCIAL : Proposer le devis (marques + prix HT) ───────────
  if (role === "AGENT_COMMERCIAL" && body.action === "proposer_devis") {
    if (commande.statut !== "DEVIS_DEMANDE") {
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    }
    const { pneus, siteMontageId } = body;

    await prisma.pneu.deleteMany({ where: { commandeId: id } });
    if (pneus && pneus.length > 0) {
      await prisma.pneu.createMany({
        data: pneus.map((p: any) => ({ ...p, commandeId: id })),
      });
    }
    const total = pneus?.reduce((s: number, p: any) => s + p.prixUnitaire * p.quantite, 0) ?? 0;

    updateData = {
      statut: "DEVIS_PROPOSE",
      prixTotal: total,
      siteMontageId: siteMontageId || null,
    };
    newStatut = "DEVIS_PROPOSE";
    commentaire = `Devis proposé : ${total.toLocaleString("fr-FR")} MAD HT`;
  }

  // ── 5. N+1 : Valider le prix / devis ──────────────────────────────────────
  if (role === "N1_CLIENT" && body.action === "valider_prix") {
    if (commande.statut !== "DEVIS_PROPOSE") {
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    }
    updateData = {
      statut: "VALIDEE",
      validePrix: true,
      validateurId: session.user.id,
    };
    newStatut = "VALIDEE";
    commentaire = "Prix validé par le responsable client — commande approuvée";
  }

  // ── 5b. N+1 : Rejeter ─────────────────────────────────────────────────────
  if (role === "N1_CLIENT" && body.action === "rejeter") {
    updateData = { statut: "REJETEE", validateurId: session.user.id };
    newStatut = "REJETEE";
    commentaire = body.commentaire || "Rejetée par le responsable client";
  }

  // ── 6. SERVICE ACHAT : Passer la commande ─────────────────────────────────
  if (role === "SERVICE_ACHAT" && body.action === "commander") {
    if (commande.statut !== "VALIDEE") {
      return NextResponse.json({ error: "La commande doit être validée d'abord" }, { status: 400 });
    }
    updateData = { statut: "COMMANDEE_FOURNISSEUR", serviceAchatId: session.user.id };
    newStatut = "COMMANDEE_FOURNISSEUR";
    commentaire = "Commande passée auprès du fournisseur";
  }

  // ── 7. AGENT COMMERCIAL : Pneus livrés ────────────────────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "livrer") {
    updateData = { statut: "PNEUS_LIVRES", dateLivraison: new Date() };
    newStatut = "PNEUS_LIVRES";
    commentaire = "Pneus arrivés au point de montage";
  }

  // ── 8. AGENT COMMERCIAL : Montage effectué ────────────────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "monter") {
    updateData = {
      statut: "MONTEE",
      dateMontage: new Date(),
      notesMontage: body.notes || null,
    };
    newStatut = "MONTEE";
    commentaire = "Montage effectué";
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  }

  const updated = await prisma.commande.update({ where: { id }, data: updateData });

  if (newStatut) {
    await prisma.historique.create({
      data: {
        commandeId: id,
        statut: newStatut,
        commentaire,
        utilisateurId: session.user.id,
      },
    });
  }

  return NextResponse.json(updated);
}
