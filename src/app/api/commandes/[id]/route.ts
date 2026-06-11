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
      entreprise: true, createur: true, validateur: true,
      agentCommercial: true, serviceAchat: true, siteMontage: true,
      pneus: true,
      historiques: { orderBy: { createdAt: "asc" }, include: { utilisateur: true } },
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

  // ── 1. Commercial : Prendre en charge ─────────────────────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "prendre_en_charge") {
    updateData = { statut: "INSPECTION_EN_COURS", agentCommercialId: session.user.id };
    newStatut = "INSPECTION_EN_COURS";
    commentaire = "Inspection prise en charge par l'agent commercial";
  }

  // ── 2. Commercial : Envoyer fiche d'inspection par mail ────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "envoyer_inspection") {
    updateData = {
      statut: "INSPECTION_ENVOYEE",
      dateInspection: new Date(),
      notesInspection: body.notesInspection || null,
    };
    newStatut = "INSPECTION_ENVOYEE";
    commentaire = "Fiche d'inspection envoyée par mail au client";
  }

  // ── 3a. Agent client : Valider l'inspection ────────────────────────────────
  if (role === "AGENT_CLIENT" && body.action === "valider_inspection") {
    if (commande.statut !== "INSPECTION_ENVOYEE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    const bothDone = commande.inspectionValideeN1;
    updateData = {
      inspectionValideeAgent: true,
      ...(bothDone && { statut: "DEVIS_DEMANDE" }),
    };
    newStatut = bothDone ? "DEVIS_DEMANDE" : "INSPECTION_ENVOYEE";
    commentaire = bothDone
      ? "Les deux validations reçues — agent client peut saisir ses besoins"
      : "Inspection validée par l'agent client (en attente N+1)";
  }

  // ── 3b. N+1 : Valider l'inspection ────────────────────────────────────────
  if (role === "N1_CLIENT" && body.action === "valider_inspection") {
    if (commande.statut !== "INSPECTION_ENVOYEE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    const bothDone = commande.inspectionValideeAgent;
    updateData = {
      inspectionValideeN1: true,
      ...(bothDone && { statut: "DEVIS_DEMANDE" }),
    };
    newStatut = bothDone ? "DEVIS_DEMANDE" : "INSPECTION_ENVOYEE";
    commentaire = bothDone
      ? "Les deux validations reçues — agent client peut saisir ses besoins"
      : "Inspection validée par le responsable (en attente agent client)";
  }

  // ── 4. Agent client : Saisir marque + quantité souhaitées ──────────────────
  if (role === "AGENT_CLIENT" && body.action === "saisir_besoins") {
    if (commande.statut !== "DEVIS_DEMANDE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    const { marqueDemandee, dimensionDemandee, quantiteDemandee, notesDevis } = body;
    updateData = {
      statut: "DEVIS_EN_COURS",
      marqueDemandee,
      dimensionDemandee,
      quantiteDemandee: parseInt(quantiteDemandee) || 1,
      notesDevis: notesDevis || null,
    };
    newStatut = "DEVIS_EN_COURS";
    commentaire = `Besoins saisis : ${quantiteDemandee}x ${marqueDemandee} ${dimensionDemandee}`;
  }

  // ── FLUX DIRECT 1. N+1 : Valider la commande directe ─────────────────────
  if (role === "N1_CLIENT" && body.action === "valider_commande_directe") {
    if (commande.statut !== "COMMANDE_DIRECTE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    updateData = { statut: "DEVIS_EN_COURS", validateurId: session.user.id };
    newStatut = "DEVIS_EN_COURS";
    commentaire = "Commande directe validée par le responsable — devis en attente";
  }

  // ── FLUX DIRECT 2. N+1 : Rejeter la commande directe ─────────────────────
  if (role === "N1_CLIENT" && body.action === "rejeter_commande_directe") {
    if (commande.statut !== "COMMANDE_DIRECTE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    updateData = { statut: "REJETEE", validateurId: session.user.id };
    newStatut = "REJETEE";
    commentaire = body.commentaire || "Commande directe rejetée par le responsable";
  }

  // ── FLUX DIRECT 3. N+1 : Valider le devis (commande directe) ─────────────
  if (role === "N1_CLIENT" && body.action === "valider_devis_direct") {
    if (commande.statut !== "DEVIS_PROPOSE" || commande.typeCommande !== "DIRECTE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    // Le N+1 choisit le pneu dans le cas direct
    const { pneuId } = body;
    await prisma.pneu.updateMany({ where: { commandeId: id }, data: { choisi: false } });
    const pneuChoisi = await prisma.pneu.update({ where: { id: pneuId }, data: { choisi: true } });
    updateData = {
      statut: "VALIDEE",
      prixTotal: pneuChoisi.prixUnitaire * pneuChoisi.quantite,
      validePrix: true,
      validateurId: session.user.id,
    };
    newStatut = "VALIDEE";
    commentaire = `Devis validé par le responsable : ${pneuChoisi.marque} — ${(pneuChoisi.prixUnitaire * pneuChoisi.quantite).toLocaleString("fr-FR")} MAD HT`;
  }

  // ── 5. Commercial : Proposer les marques dispo + prix HT ──────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "proposer_devis") {
    if (commande.statut !== "DEVIS_EN_COURS")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    const { pneus, siteMontageId } = body;

    await prisma.pneu.deleteMany({ where: { commandeId: id } });
    if (pneus?.length > 0) {
      await prisma.pneu.createMany({
        data: pneus.map((p: any) => ({ ...p, choisi: false, commandeId: id })),
      });
    }

    updateData = { statut: "DEVIS_PROPOSE", siteMontageId: siteMontageId || null };
    newStatut = "DEVIS_PROPOSE";
    commentaire = `${pneus?.length ?? 0} proposition(s) envoyée(s) au client`;
  }

  // ── 6. Agent client : Choisir une proposition ─────────────────────────────
  if (role === "AGENT_CLIENT" && body.action === "choisir_pneu") {
    if (commande.statut !== "DEVIS_PROPOSE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    const { pneuId } = body;

    // Décocher tous, cocher le choisi
    await prisma.pneu.updateMany({ where: { commandeId: id }, data: { choisi: false } });
    const pneuChoisi = await prisma.pneu.update({
      where: { id: pneuId },
      data: { choisi: true },
    });

    // Statut reste DEVIS_PROPOSE — N+1 doit valider avant VALIDEE
    updateData = {
      prixTotal: pneuChoisi.prixUnitaire * pneuChoisi.quantite,
    };
    newStatut = "DEVIS_PROPOSE";
    commentaire = `Choix agent : ${pneuChoisi.marque} ${pneuChoisi.dimension} — ${(pneuChoisi.prixUnitaire * pneuChoisi.quantite).toLocaleString("fr-FR")} MAD HT — en attente validation N+1`;
  }

  // ── 6b. N+1 : Valider le choix du devis (inspection) ─────────────────────
  if (role === "N1_CLIENT" && body.action === "valider_choix_n1") {
    if (commande.statut !== "DEVIS_PROPOSE")
      return NextResponse.json({ error: "Action non disponible" }, { status: 400 });
    const pneuChoisi = await prisma.pneu.findFirst({ where: { commandeId: id, choisi: true } });
    if (!pneuChoisi)
      return NextResponse.json({ error: "Aucun pneu sélectionné par l'agent" }, { status: 400 });
    updateData = {
      statut: "VALIDEE",
      validePrix: true,
      validateurId: session.user.id,
    };
    newStatut = "VALIDEE";
    commentaire = `Devis validé par N+1 : ${pneuChoisi.marque} ${pneuChoisi.dimension}`;
  }

  // ── 7. Service achat : Passer la commande ─────────────────────────────────
  if (role === "SERVICE_ACHAT" && body.action === "commander") {
    if (commande.statut !== "VALIDEE")
      return NextResponse.json({ error: "La commande doit être validée d'abord" }, { status: 400 });
    updateData = { statut: "COMMANDEE_FOURNISSEUR", serviceAchatId: session.user.id };
    newStatut = "COMMANDEE_FOURNISSEUR";
    commentaire = "Commande passée auprès du fournisseur";
  }

  // ── 8. Commercial : Pneus livrés ──────────────────────────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "livrer") {
    updateData = { statut: "PNEUS_LIVRES", dateLivraison: new Date() };
    newStatut = "PNEUS_LIVRES";
    commentaire = "Pneus arrivés au point de montage";
  }

  // ── 9. Commercial : Montage effectué ──────────────────────────────────────
  if (role === "AGENT_COMMERCIAL" && body.action === "monter") {
    updateData = { statut: "MONTEE", dateMontage: new Date(), notesMontage: body.notes || null };
    newStatut = "MONTEE";
    commentaire = "Montage effectué";
  }

  // ── Rejet (N+1 à n'importe quelle étape de validation) ────────────────────
  if (role === "N1_CLIENT" && body.action === "rejeter") {
    updateData = { statut: "REJETEE", validateurId: session.user.id };
    newStatut = "REJETEE";
    commentaire = body.commentaire || "Rejetée par le responsable";
  }

  if (Object.keys(updateData).length === 0)
    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });

  const updated = await prisma.commande.update({ where: { id }, data: updateData });

  if (newStatut) {
    await prisma.historique.create({
      data: { commandeId: id, statut: newStatut, commentaire, utilisateurId: session.user.id },
    });
  }

  return NextResponse.json(updated);
}
