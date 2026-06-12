"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeleteCommandeButton({
  id,
  reference,
  redirectTo,
}: {
  id: string;
  reference: string;
  redirectTo?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/commandes/${id}`, { method: "DELETE" });
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-1.5">
        <span className="text-xs text-red-700 font-medium">Supprimer {reference} ?</span>
        <button
          className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-medium"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? "..." : "Confirmer"}
        </button>
        <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setConfirm(false)}>
          Annuler
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-red-600 border-red-300 hover:bg-red-50 h-7 px-2"
      onClick={() => setConfirm(true)}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}
