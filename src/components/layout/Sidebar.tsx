"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Users,
  MapPin,
  LogOut,
  Building2,
  Truck,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "AGENT_CLIENT", "N1_CLIENT", "AGENT_COMMERCIAL", "SERVICE_ACHAT"],
  },
  {
    href: "/inspections",
    label: "Inspections",
    icon: ClipboardList,
    roles: ["AGENT_CLIENT", "N1_CLIENT", "AGENT_COMMERCIAL", "SERVICE_ACHAT", "SUPER_ADMIN"],
  },
  {
    href: "/commandes",
    label: "Commandes",
    icon: ShoppingCart,
    roles: ["AGENT_CLIENT", "N1_CLIENT", "AGENT_COMMERCIAL", "SERVICE_ACHAT", "SUPER_ADMIN"],
  },
  {
    href: "/vehicules",
    label: "Historique véhicules",
    icon: Truck,
    roles: ["AGENT_CLIENT", "N1_CLIENT", "AGENT_COMMERCIAL", "SERVICE_ACHAT", "SUPER_ADMIN"],
  },
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    icon: Users,
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/entreprises",
    label: "Entreprises",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/sites",
    label: "Sites de montage",
    icon: MapPin,
    roles: ["SUPER_ADMIN", "AGENT_COMMERCIAL"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <span className="text-gray-900 font-bold text-lg">T</span>
          </div>
          <div>
            <p className="font-bold text-lg leading-none">TyreManager</p>
            <p className="text-xs text-gray-400 mt-0.5">Gestion pneus</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-700">
        <p className="text-xs text-gray-400">Connecté en tant que</p>
        <p className="text-sm font-medium truncate">{session?.user?.name}</p>
        <p className="text-xs text-gray-400">{role ? ROLE_LABELS[role] : ""}</p>
        {session?.user?.entrepriseNom && (
          <p className="text-xs text-blue-400 mt-0.5">{session.user.entrepriseNom}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-white text-gray-900 font-medium"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
