import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { nom, adresse, ville, telephone } = await req.json();
  if (!nom || !adresse || !ville) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const site = await prisma.siteMontage.create({
    data: { nom, adresse, ville, telephone: telephone || null },
  });

  return NextResponse.json(site, { status: 201 });
}
