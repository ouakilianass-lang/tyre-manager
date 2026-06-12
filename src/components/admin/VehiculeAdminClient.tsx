"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload, Gauge, Car } from "lucide-react";
import { TYPE_VEHICULE_LABELS } from "@/lib/constants";

type Vehicule = {
  id: string;
  immatriculation: string;
  typeVehicule: string;
  kilometrage: number | null;
  notes: string | null;
  entrepriseId: string;
  entreprise: { id: string; nom: string };
  nbCommandes: number;
};

type Entreprise = { id: string; nom: string };

type Props = { vehicules: Vehicule[]; entreprises: Entreprise[] };

const TYPE_OPTIONS = ["CAMION", "REMORQUE", "TOURISME"];

// Ligne vide pour ajout
const emptyRow = () => ({ immatriculation: "", typeVehicule: "CAMION", kilometrage: "", notes: "", entrepriseId: "" });

export default function VehiculeAdminClient({ vehicules: initial, entreprises }: Props) {
  const [vehicules, setVehicules] = useState(initial);
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCommandes, setDeleteCommandes] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = vehicules.filter((v) =>
    v.immatriculation.toLowerCase().includes(search.toLowerCase()) ||
    v.entreprise.nom.toLowerCase().includes(search.toLowerCase())
  );

  function updateRow(i: number, field: string, value: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.immatriculation.trim() && r.entrepriseId);
    if (!valid.length) { setMsg("Remplissez au moins une ligne."); return; }

    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/vehicules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid.map((r) => ({
        ...r,
        immatriculation: r.immatriculation.toUpperCase(),
        kilometrage: r.kilometrage ? parseInt(r.kilometrage) : undefined,
      }))),
    });
    const data = await res.json();
    setLoading(false);

    if (data.errors?.length) {
      setMsg(`⚠️ ${data.errors[0].error}`);
    } else {
      setMsg(`✅ ${data.created} véhicule(s) enregistré(s)`);
      setRows([emptyRow()]);
      // Refresh list
      const listRes = await fetch("/api/admin/vehicules");
      const list = await listRes.json();
      setVehicules(list);
    }
  }

  async function handleDelete(id: string, withCommandes: boolean) {
    setLoading(true);
    await fetch("/api/admin/vehicules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deleteCommandes: withCommandes }),
    });
    setVehicules((prev) => prev.filter((v) => v.id !== id));
    setDeleteId(null);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Car className="w-6 h-6" /> Gestion des véhicules
        </h1>
        <p className="text-gray-500 text-sm mt-1">Ajoutez, modifiez ou supprimez les véhicules de vos clients.</p>
      </div>

      {/* ── Formulaire ajout multiple ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Upload className="w-4 h-4" /> Ajouter des véhicules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* En-têtes colonnes */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
            <div className="col-span-2">Immatriculation *</div>
            <div className="col-span-2">Type *</div>
            <div className="col-span-2">KM</div>
            <div className="col-span-3">Client *</div>
            <div className="col-span-2">Notes</div>
            <div className="col-span-1"></div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-2 font-mono text-sm uppercase"
                placeholder="ABC-1234"
                value={row.immatriculation}
                onChange={(e) => updateRow(i, "immatriculation", e.target.value.toUpperCase())}
              />
              <select
                className="col-span-2 border rounded-md px-2 py-2 text-sm bg-white"
                value={row.typeVehicule}
                onChange={(e) => updateRow(i, "typeVehicule", e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TYPE_VEHICULE_LABELS[t as keyof typeof TYPE_VEHICULE_LABELS] ?? t}</option>
                ))}
              </select>
              <Input
                className="col-span-2 text-sm"
                type="number"
                placeholder="125000"
                value={row.kilometrage}
                onChange={(e) => updateRow(i, "kilometrage", e.target.value)}
              />
              <select
                className="col-span-3 border rounded-md px-2 py-2 text-sm bg-white"
                value={row.entrepriseId}
                onChange={(e) => updateRow(i, "entrepriseId", e.target.value)}
              >
                <option value="">— Sélectionner client —</option>
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
              <Input
                className="col-span-2 text-sm"
                placeholder="Notes..."
                value={row.notes}
                onChange={(e) => updateRow(i, "notes", e.target.value)}
              />
              <button
                className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter une ligne
            </Button>
            <Button onClick={handleSave} disabled={loading} size="sm">
              {loading ? "Enregistrement..." : `Enregistrer (${rows.filter(r => r.immatriculation.trim()).length})`}
            </Button>
            {msg && <span className="text-sm text-gray-600">{msg}</span>}
          </div>
        </CardContent>
      </Card>

      {/* ── Liste des véhicules ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {vehicules.length} véhicule(s) enregistré(s)
          </CardTitle>
          <Input
            className="w-48 h-8 text-sm"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Aucun véhicule enregistré</p>
          ) : (
            <div className="divide-y">
              {filtered.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold text-gray-900">{v.immatriculation}</span>
                    <Badge className="bg-gray-100 text-gray-600 text-xs">{TYPE_VEHICULE_LABELS[v.typeVehicule as keyof typeof TYPE_VEHICULE_LABELS] ?? v.typeVehicule}</Badge>
                    <span className="text-sm text-gray-500">{v.entreprise.nom}</span>
                    {v.kilometrage && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> {v.kilometrage.toLocaleString("fr-FR")} km
                      </span>
                    )}
                    {v.notes && <span className="text-xs text-gray-400 italic">{v.notes}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{v.nbCommandes} commande(s)</span>
                    {deleteId === v.id ? (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-red-700 font-medium">Supprimer aussi les commandes ?</span>
                        <label className="flex items-center gap-1 text-xs text-red-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deleteCommandes}
                            onChange={(e) => setDeleteCommandes(e.target.checked)}
                            className="w-3 h-3"
                          />
                          Oui ({v.nbCommandes})
                        </label>
                        <button
                          className="text-xs bg-red-600 text-white px-2 py-0.5 rounded"
                          onClick={() => handleDelete(v.id, deleteCommandes)}
                          disabled={loading}
                        >
                          Confirmer
                        </button>
                        <button
                          className="text-xs text-gray-500 hover:text-gray-700"
                          onClick={() => { setDeleteId(null); setDeleteCommandes(false); }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => setDeleteId(v.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal confirm delete avec commandes */}
    </div>
  );
}
