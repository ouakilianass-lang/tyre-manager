import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { nom, prenom, email, code, role, entrepriseId } = body;

  if (!nom || !prenom || !email || !code || !role) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      nom,
      prenom,
      email,
      code,
      role,
      entrepriseId: entrepriseId || null,
    },
  });

  return NextResponse.json(utilisateur, { status: 201 });
}
