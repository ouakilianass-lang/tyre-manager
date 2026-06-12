"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CommandeDirectePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    typeVehicule: "",
    immatriculation: "",
    numeroChauffeur: "",
    villeDepart: "",
    kilometrage: "",
    marqueDemandee: "",
    dimensionDemandee: "",
    quantiteDemandee: "1",
    notesDevis: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/commandes/directe", {
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
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande directe</h1>
        <p className="text-gray-500 mt-1">
          Sans inspection — saisissez le véhicule et vos besoins en pneus
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Véhicule */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Véhicule</h3>

              <div className="space-y-2">
                <Label>Type de véhicule *</Label>
                <Select onValueChange={(v) => set("typeVehicule", String(v ?? ""))} required>
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
                  onChange={(e) => set("immatriculation", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chauffeur">Numéro / Nom du chauffeur *</Label>
                <Input
                  id="chauffeur"
                  placeholder="Ex: CH-001 ou Mohamed Alami"
                  value={form.numeroChauffeur}
                  onChange={(e) => set("numeroChauffeur", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ville">Ville *</Label>
                <Input
                  id="ville"
                  placeholder="Ex: Casablanca"
                  value={form.villeDepart}
                  onChange={(e) => set("villeDepart", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kilometrage">Kilométrage</Label>
                <Input
                  id="kilometrage"
                  type="number"
                  placeholder="Ex: 125000"
                  value={form.kilometrage}
                  onChange={(e) => set("kilometrage", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Besoins pneus */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Besoins en pneus</h3>

              <div className="space-y-2">
                <Label htmlFor="marque">Marque souhaitée *</Label>
                <Input
                  id="marque"
                  placeholder="Michelin, Bridgestone, Goodyear..."
                  value={form.marqueDemandee}
                  onChange={(e) => set("marqueDemandee", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dimension">Dimension *</Label>
                  <Input
                    id="dimension"
                    placeholder="Ex: 295/80R22.5"
                    value={form.dimensionDemandee}
                    onChange={(e) => set("dimensionDemandee", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantite">Quantité *</Label>
                  <Input
                    id="quantite"
                    type="number"
                    min="1"
                    value={form.quantiteDemandee}
                    onChange={(e) => set("quantiteDemandee", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Précisions / remarques</Label>
                <textarea
                  id="notes"
                  className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
                  rows={2}
                  placeholder="Indice de charge, vitesse, type de route..."
                  value={form.notesDevis}
                  onChange={(e) => set("notesDevis", e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading || !form.typeVehicule}
              >
                {loading ? "Envoi..." : "Soumettre la commande →"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
