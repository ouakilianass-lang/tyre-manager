"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NouvelleInspectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    typeVehicule: "",
    immatriculation: "",
    numeroChauffeur: "",
    villeDepart: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/commandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la création.");
      return;
    }

    const data = await res.json();
    router.push(`/commandes/${data.id}`);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande d&apos;inspection</h1>
        <p className="text-gray-500 mt-1">Renseignez les informations du véhicule</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Type de véhicule *</Label>
              <Select onValueChange={(v) => handleChange("typeVehicule", String(v ?? ""))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAMION">Camion</SelectItem>
                  <SelectItem value="REMORQUE">Remorque</SelectItem>
                  <SelectItem value="TOURISME">Véhicule de tourisme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="immat">Immatriculation *</Label>
              <Input
                id="immat"
                placeholder="Ex: 12345-A-1"
                value={form.immatriculation}
                onChange={(e) => handleChange("immatriculation", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chauffeur">Numéro / Nom du chauffeur *</Label>
              <Input
                id="chauffeur"
                placeholder="Ex: CH-001 ou Mohamed Alami"
                value={form.numeroChauffeur}
                onChange={(e) => handleChange("numeroChauffeur", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ville">Ville *</Label>
              <Input
                id="ville"
                placeholder="Ex: Casablanca"
                value={form.villeDepart}
                onChange={(e) => handleChange("villeDepart", e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !form.typeVehicule}>
                {loading ? "Envoi..." : "Soumettre la demande"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
