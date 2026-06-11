import { Role, StatutCommande } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  AGENT_CLIENT: "Agent Client",
  N1_CLIENT: "Responsable Client (N+1)",
  AGENT_COMMERCIAL: "Agent Commercial",
  SERVICE_ACHAT: "Service Achat",
};

export const STATUT_LABELS: Record<StatutCommande, string> = {
  DEMANDE_INSPECTION: "Demande d'inspection",
  INSPECTION_EN_COURS: "Inspection en cours",
  INSPECTION_TERMINEE: "Inspection terminée",
  EN_ATTENTE_VALIDATION: "En attente de validation",
  VALIDEE: "Validée",
  COMMANDEE_FOURNISSEUR: "Commandée fournisseur",
  PNEUS_LIVRES: "Pneus livrés",
  MONTEE: "Montée",
  REJETEE: "Rejetée",
};

export const STATUT_COLORS: Record<StatutCommande, string> = {
  DEMANDE_INSPECTION: "bg-gray-100 text-gray-700",
  INSPECTION_EN_COURS: "bg-blue-100 text-blue-700",
  INSPECTION_TERMINEE: "bg-cyan-100 text-cyan-700",
  EN_ATTENTE_VALIDATION: "bg-yellow-100 text-yellow-700",
  VALIDEE: "bg-green-100 text-green-700",
  COMMANDEE_FOURNISSEUR: "bg-purple-100 text-purple-700",
  PNEUS_LIVRES: "bg-orange-100 text-orange-700",
  MONTEE: "bg-emerald-100 text-emerald-700",
  REJETEE: "bg-red-100 text-red-700",
};

export const TYPE_VEHICULE_LABELS = {
  CAMION: "Camion",
  REMORQUE: "Remorque",
  TOURISME: "Véhicule de tourisme",
};
