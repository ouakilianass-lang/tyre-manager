import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function guard() {
  const session = await auth();
  return session?.user.role === "SUPER_ADMIN" ? session : null;
}

// PUT — modifier un utilisateur
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const { nom, prenom, email, code, role, entrepriseId, actif } = await req.json();

  const updated = await prisma.utilisateur.update({
    where: { id },
    data: {
      nom,
      prenom,
      email,
      code,
      role,
      actif: actif ?? true,
      entrepriseId: entrepriseId || null,
    },
    include: { entreprise: true },
  });

  return NextResponse.json(updated);
}

// DELETE — supprimer un utilisateur
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;

  // Empêcher de se supprimer soi-même
  if (id === session.user.id)
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });

  await prisma.utilisateur.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
