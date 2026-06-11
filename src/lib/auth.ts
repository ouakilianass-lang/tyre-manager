import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        code: { label: "Code" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        const user = await prisma.utilisateur.findUnique({
          where: { email: credentials.email as string },
          include: { entreprise: true },
        });

        if (!user || !user.actif) return null;
        if (user.code !== credentials.code) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          entrepriseId: user.entrepriseId,
          entrepriseNom: user.entreprise?.nom ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.entrepriseId = (user as any).entrepriseId;
        token.entrepriseNom = (user as any).entrepriseNom;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.entrepriseId = token.entrepriseId as string | null;
      session.user.entrepriseNom = token.entrepriseNom as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
