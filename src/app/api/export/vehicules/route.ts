import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

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

  // Build rows
  const rows = commandes.map((cmd) => {
    const pneu = cmd.pneus[0];
    return {
      "Référence": cmd.reference,
      "Immatriculation": cmd.immatriculation,
      "Type véhicule": cmd.typeVehicule,
      "Kilométrage": cmd.kilometrage ?? "",
      "Chauffeur": cmd.numeroChauffeur,
      "Ville": cmd.villeDepart,
      "Client": cmd.entreprise.nom,
      "Type commande": cmd.typeCommande,
      "Statut": cmd.statut,
      "Date création": new Date(cmd.createdAt).toLocaleDateString("fr-FR"),
      "Date montage": cmd.dateMontage ? new Date(cmd.dateMontage).toLocaleDateString("fr-FR") : "",
      "Site montage": cmd.siteMontage ? `${cmd.siteMontage.nom} — ${cmd.siteMontage.ville}` : "",
      "Marque pneu": pneu?.marque ?? "",
      "Dimension": pneu?.dimension ?? "",
      "Référence pneu": pneu?.reference ?? "",
      "Quantité": pneu?.quantite ?? "",
      "Prix unitaire (MAD)": pneu?.prixUnitaire ?? "",
      "Montant total HT (MAD)": cmd.prixTotal ?? "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Véhicules");

  // Column widths
  ws["!cols"] = [
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
    { wch: 10 }, { wch: 20 }, { wch: 20 },
  ];

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = immat ? `vehicule_${immat}.xlsx` : "vehicules_export.xlsx";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
