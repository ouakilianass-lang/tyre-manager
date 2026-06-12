import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function guard() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN")
    return null;
  return session;
}

// GET — liste tous les véhicules avec count commandes
export async function GET() {
  if (!await guard()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const vehicules = await prisma.vehicule.findMany({
    orderBy: { createdAt: "desc" },
    include: { entreprise: true },
  });

  // Enrichir avec le nombre de commandes par immat
  const counts = await prisma.commande.groupBy({
    by: ["immatriculation"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.immatriculation, c._count.id]));

  return NextResponse.json(vehicules.map((v) => ({
    ...v,
    nbCommandes: countMap[v.immatriculation] ?? 0,
  })));
}

// POST — ajouter un ou plusieurs véhicules
export async function POST(req: Request) {
  if (!await guard()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await req.json();
  const items: { immatriculation: string; typeVehicule: string; kilometrage?: number; notes?: string; entrepriseId: string }[] =
    Array.isArray(body) ? body : [body];

  const results = [];
  const errors = [];

  for (const item of items) {
    if (!item.immatriculation || !item.typeVehicule || !item.entrepriseId) {
      errors.push({ immatriculation: item.immatriculation, error: "Champs manquants" });
      continue;
    }
    try {
      const v = await prisma.vehicule.upsert({
        where: { immatriculation_entrepriseId: { immatriculation: item.immatriculation.toUpperCase(), entrepriseId: item.entrepriseId } },
        create: {
          immatriculation: item.immatriculation.toUpperCase(),
          typeVehicule: item.typeVehicule as any,
          kilometrage: item.kilometrage ?? null,
          notes: item.notes ?? null,
          entrepriseId: item.entrepriseId,
        },
        update: {
          typeVehicule: item.typeVehicule as any,
          kilometrage: item.kilometrage ?? null,
          notes: item.notes ?? null,
        },
      });
      results.push(v);
    } catch (e: any) {
      errors.push({ immatriculation: item.immatriculation, error: e.message });
    }
  }

  return NextResponse.json({ created: results.length, errors });
}

// DELETE — supprimer un véhicule (+ ses commandes si demandé)
export async function DELETE(req: Request) {
  if (!await guard()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id, deleteCommandes } = await req.json();

  if (deleteCommandes) {
    const v = await prisma.vehicule.findUnique({ where: { id } });
    if (v) {
      await prisma.commande.deleteMany({ where: { immatriculation: v.immatriculation } });
    }
  }

  await prisma.vehicule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
