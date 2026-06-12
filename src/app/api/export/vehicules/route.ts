import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const immat = searchParams.get("immat");

  const role = session.user.role;
  const entrepriseId = session.user.entrepriseId;
  const isClient = role === "AGENT_CLIENT" || role === "N1_CLIENT";
  const baseWhere = isClient ? { entrepriseId: entrepriseId! } : {};

  const where = immat
    ? { ...baseWhere, immatriculation: immat.toUpperCase() }
    : baseWhere;

  const commandes = await prisma.commande.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      entreprise: true,
      siteMontage: true,
      pneus: { where: { choisi: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Véhicules");

  ws.columns = [
    { header: "Référence",           key: "reference",      width: 18 },
    { header: "Immatriculation",     key: "immat",          width: 14 },
    { header: "Type véhicule",       key: "typeVehicule",   width: 14 },
    { header: "Kilométrage",         key: "kilometrage",    width: 12 },
    { header: "Chauffeur",           key: "chauffeur",      width: 20 },
    { header: "Ville",               key: "ville",          width: 14 },
    { header: "Client",              key: "client",         width: 22 },
    { header: "Type commande",       key: "typeCommande",   width: 14 },
    { header: "Statut",              key: "statut",         width: 22 },
    { header: "Date création",       key: "dateCreation",   width: 14 },
    { header: "Date montage",        key: "dateMontage",    width: 14 },
    { header: "Site montage",        key: "siteMontage",    width: 28 },
    { header: "Marque pneu",         key: "marque",         width: 14 },
    { header: "Dimension",           key: "dimension",      width: 12 },
    { header: "Référence pneu",      key: "refPneu",        width: 16 },
    { header: "Quantité",            key: "quantite",       width: 10 },
    { header: "Prix unitaire (MAD)", key: "prixUnit",       width: 20 },
    { header: "Montant total HT (MAD)", key: "prixTotal",   width: 22 },
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 22;

  commandes.forEach((cmd) => {
    const pneu = cmd.pneus[0];
    ws.addRow({
      reference:    cmd.reference,
      immat:        cmd.immatriculation,
      typeVehicule: cmd.typeVehicule,
      kilometrage:  cmd.kilometrage ?? "",
      chauffeur:    cmd.numeroChauffeur,
      ville:        cmd.villeDepart,
      client:       cmd.entreprise.nom,
      typeCommande: cmd.typeCommande,
      statut:       cmd.statut,
      dateCreation: new Date(cmd.createdAt).toLocaleDateString("fr-FR"),
      dateMontage:  cmd.dateMontage ? new Date(cmd.dateMontage).toLocaleDateString("fr-FR") : "",
      siteMontage:  cmd.siteMontage ? `${cmd.siteMontage.nom} — ${cmd.siteMontage.ville}` : "",
      marque:       pneu?.marque ?? "",
      dimension:    pneu?.dimension ?? "",
      refPneu:      pneu?.reference ?? "",
      quantite:     pneu?.quantite ?? "",
      prixUnit:     pneu?.prixUnitaire ?? "",
      prixTotal:    cmd.prixTotal ?? "",
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const filename = immat ? `vehicule_${immat}.xlsx` : "vehicules_export.xlsx";

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
