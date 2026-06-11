import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { nom, adresse, telephone } = await req.json();
  if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const entreprise = await prisma.entreprise.create({
    data: { nom, adresse: adresse || null, telephone: telephone || null },
  });

  return NextResponse.json(entreprise, { status: 201 });
}
