import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Super Admin
  const admin = await prisma.utilisateur.upsert({
    where: { email: "admin@tyremanager.ma" },
    update: {},
    create: {
      nom: "Admin",
      prenom: "Super",
      email: "admin@tyremanager.ma",
      code: "admin123",
      role: "SUPER_ADMIN",
    },
  });
  console.log("✓ Super Admin créé:", admin.email, "/ code:", admin.code);

  // Entreprise client de démo
  const entreprise = await prisma.entreprise.upsert({
    where: { id: "demo-entreprise" },
    update: {},
    create: {
      id: "demo-entreprise",
      nom: "Transport Atlas SARL",
      adresse: "Zone Industrielle, Casablanca",
      telephone: "0522-000-000",
    },
  });
  console.log("✓ Entreprise démo créée:", entreprise.nom);

  // Agent client démo
  const agentClient = await prisma.utilisateur.upsert({
    where: { email: "agent@transportatlas.ma" },
    update: {},
    create: {
      nom: "Alami",
      prenom: "Mohamed",
      email: "agent@transportatlas.ma",
      code: "client123",
      role: "AGENT_CLIENT",
      entrepriseId: entreprise.id,
    },
  });
  console.log("✓ Agent client créé:", agentClient.email);

  // N+1 client démo
  const n1 = await prisma.utilisateur.upsert({
    where: { email: "responsable@transportatlas.ma" },
    update: {},
    create: {
      nom: "Benali",
      prenom: "Karim",
      email: "responsable@transportatlas.ma",
      code: "n1pass123",
      role: "N1_CLIENT",
      entrepriseId: entreprise.id,
    },
  });
  console.log("✓ N+1 client créé:", n1.email);

  // Agent commercial
  const commercial = await prisma.utilisateur.upsert({
    where: { email: "commercial@fournisseur.ma" },
    update: {},
    create: {
      nom: "Tazi",
      prenom: "Youssef",
      email: "commercial@fournisseur.ma",
      code: "comm123",
      role: "AGENT_COMMERCIAL",
    },
  });
  console.log("✓ Agent commercial créé:", commercial.email);

  // Service achat
  const achat = await prisma.utilisateur.upsert({
    where: { email: "achat@fournisseur.ma" },
    update: {},
    create: {
      nom: "Idrissi",
      prenom: "Sara",
      email: "achat@fournisseur.ma",
      code: "achat123",
      role: "SERVICE_ACHAT",
    },
  });
  console.log("✓ Service achat créé:", achat.email);

  // Sites de montage
  const sites = [
    { nom: "Centre Pneus Casa", adresse: "Rue Abdelmoumen, Casablanca", ville: "Casablanca" },
    { nom: "Atelier Marrakech", adresse: "Route de l'Ourika, Marrakech", ville: "Marrakech" },
    { nom: "Garage Rabat Nord", adresse: "Avenue Hassan II, Rabat", ville: "Rabat" },
  ];

  for (const site of sites) {
    await prisma.siteMontage.upsert({
      where: { id: site.ville.toLowerCase() },
      update: {},
      create: { id: site.ville.toLowerCase(), ...site },
    });
    console.log("✓ Site créé:", site.nom);
  }

  console.log("\n=== COMPTES DE TEST ===");
  console.log("Super Admin  : admin@tyremanager.ma / admin123");
  console.log("Agent client : agent@transportatlas.ma / client123");
  console.log("N+1 client   : responsable@transportatlas.ma / n1pass123");
  console.log("Commercial   : commercial@fournisseur.ma / comm123");
  console.log("Achat        : achat@fournisseur.ma / achat123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
