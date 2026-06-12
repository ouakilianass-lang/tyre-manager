"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { Role } from "@prisma/client";
import { Pencil, Trash2, Plus, Check, X, UserCog, Users } from "lucide-react";

type Utilisateur = {
  id: string; nom: string; prenom: string; email: string; code: string;
  role: Role; actif: boolean; entrepriseId: string | null;
  entreprise: { id: string; nom: string } | null;
};
type Entreprise = { id: string; nom: string };

const ROLES_CLIENT: Role[] = ["AGENT_CLIENT", "N1_CLIENT"];
const ROLES_FOURNISSEUR: Role[] = ["SUPER_ADMIN", "AGENT_COMMERCIAL", "SERVICE_ACHAT"];

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN:       "bg-purple-100 text-purple-800",
  AGENT_COMMERCIAL:  "bg-blue-100 text-blue-800",
  SERVICE_ACHAT:     "bg-indigo-100 text-indigo-800",
  AGENT_CLIENT:      "bg-green-100 text-green-800",
  N1_CLIENT:         "bg-emerald-100 text-emerald-800",
};

type Props = { utilisateurs: Utilisateur[]; entreprises: Entreprise[]; currentUserId: string };

const emptyForm = () => ({ nom: "", prenom: "", email: "", code: "", role: "" as Role | "", entrepriseId: "", actif: true });

export default function UtilisateursClient({ utilisateurs: initial, entreprises, currentUserId }: Props) {
  const [users, setUsers] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReturnType<typeof emptyForm>>(emptyForm());
  const [newForm, setNewForm] = useState(emptyForm());
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "fournisseur" | "client">("all");

  const filtered = users.filter((u) => {
    const matchSearch =
      `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === "all" ? true :
      tab === "fournisseur" ? ROLES_FOURNISSEUR.includes(u.role) :
      ROLES_CLIENT.includes(u.role);
    return matchSearch && matchTab;
  });

  function startEdit(u: Utilisateur) {
    setEditId(u.id);
    setEditForm({ nom: u.nom, prenom: u.prenom, email: u.email, code: u.code, role: u.role, entrepriseId: u.entrepriseId ?? "", actif: u.actif });
  }

  async function saveEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/utilisateurs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u));
    setEditId(null);
    setLoading(false);
    setMsg("✅ Modifié");
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleDelete(id: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/utilisateurs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const d = await res.json();
      setMsg(`❌ ${d.error}`);
      setTimeout(() => setMsg(""), 4000);
    }
    setDeleteId(null);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/utilisateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(`❌ ${data.error}`); setTimeout(() => setMsg(""), 4000); return; }
    setUsers((prev) => [{ ...data, entreprise: entreprises.find(e => e.id === data.entrepriseId) ?? null }, ...prev]);
    setNewForm(emptyForm());
    setShowNew(false);
    setMsg("✅ Utilisateur créé");
    setTimeout(() => setMsg(""), 3000);
  }

  const needsEnt = (role: Role | "") => ROLES_CLIENT.includes(role as Role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-6 h-6" /> Utilisateurs
          </h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} utilisateur(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm">{msg}</span>}
          <Button onClick={() => setShowNew(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* ── Formulaire création ─────────────────────────────────────── */}
      {showNew && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">Créer un utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* Choix type */}
              <div className="flex gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-600 self-center">Type :</span>
                {(["fournisseur", "client"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewForm((p) => ({ ...p, role: t === "fournisseur" ? "AGENT_COMMERCIAL" : "AGENT_CLIENT" }))}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                      (t === "fournisseur" ? ROLES_FOURNISSEUR : ROLES_CLIENT).includes(newForm.role as Role)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {t === "fournisseur" ? "🏢 Votre équipe" : "👤 Agent client"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Prénom *</label>
                  <Input value={newForm.prenom} onChange={(e) => setNewForm(p => ({ ...p, prenom: e.target.value }))} required />
                </div>
                <div><label className="text-xs font-medium text-gray-600">Nom *</label>
                  <Input value={newForm.nom} onChange={(e) => setNewForm(p => ({ ...p, nom: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Email *</label>
                  <Input type="email" value={newForm.email} onChange={(e) => setNewForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div><label className="text-xs font-medium text-gray-600">Code d'accès *</label>
                  <Input value={newForm.code} onChange={(e) => setNewForm(p => ({ ...p, code: e.target.value }))} required placeholder="Ex: 1234" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Rôle *</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    value={newForm.role}
                    onChange={(e) => setNewForm(p => ({ ...p, role: e.target.value as Role }))}
                    required
                  >
                    <option value="">— Choisir —</option>
                    <optgroup label="Votre équipe">
                      {ROLES_FOURNISSEUR.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </optgroup>
                    <optgroup label="Agents clients">
                      {ROLES_CLIENT.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </optgroup>
                  </select>
                </div>
                {needsEnt(newForm.role) && (
                  <div><label className="text-xs font-medium text-gray-600">Entreprise cliente *</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                      value={newForm.entrepriseId}
                      onChange={(e) => setNewForm(p => ({ ...p, entrepriseId: e.target.value }))}
                      required
                    >
                      <option value="">— Sélectionner —</option>
                      {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading} size="sm">{loading ? "Création..." : "Créer"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowNew(false); setNewForm(emptyForm()); }}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Filtres ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {(["all", "fournisseur", "client"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? `Tous (${users.length})` :
             t === "fournisseur" ? `🏢 Votre équipe (${users.filter(u => ROLES_FOURNISSEUR.includes(u.role)).length})` :
             `👤 Agents clients (${users.filter(u => ROLES_CLIENT.includes(u.role)).length})`}
          </button>
        ))}
        <Input
          className="w-48 h-8 text-sm ml-auto"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Liste ────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Aucun utilisateur</p>
          ) : (
            <div className="divide-y">
              {filtered.map((u) => (
                <div key={u.id} className="px-5 py-4">
                  {editId === u.id ? (
                    // ── Mode édition ────────────────────────────────
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div><label className="text-xs text-gray-500">Prénom</label>
                          <Input className="h-8 text-sm" value={editForm.prenom} onChange={(e) => setEditForm(p => ({ ...p, prenom: e.target.value }))} />
                        </div>
                        <div><label className="text-xs text-gray-500">Nom</label>
                          <Input className="h-8 text-sm" value={editForm.nom} onChange={(e) => setEditForm(p => ({ ...p, nom: e.target.value }))} />
                        </div>
                        <div><label className="text-xs text-gray-500">Email</label>
                          <Input className="h-8 text-sm" value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div><label className="text-xs text-gray-500">Code</label>
                          <Input className="h-8 text-sm font-mono" value={editForm.code} onChange={(e) => setEditForm(p => ({ ...p, code: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div><label className="text-xs text-gray-500">Rôle</label>
                          <select
                            className="w-full border rounded-md px-2 py-1.5 text-sm bg-white"
                            value={editForm.role}
                            onChange={(e) => setEditForm(p => ({ ...p, role: e.target.value as Role }))}
                          >
                            <optgroup label="Votre équipe">
                              {ROLES_FOURNISSEUR.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </optgroup>
                            <optgroup label="Agents clients">
                              {ROLES_CLIENT.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </optgroup>
                          </select>
                        </div>
                        {needsEnt(editForm.role) && (
                          <div><label className="text-xs text-gray-500">Entreprise</label>
                            <select
                              className="w-full border rounded-md px-2 py-1.5 text-sm bg-white"
                              value={editForm.entrepriseId}
                              onChange={(e) => setEditForm(p => ({ ...p, entrepriseId: e.target.value }))}
                            >
                              <option value="">— Aucune —</option>
                              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                            </select>
                          </div>
                        )}
                        <div><label className="text-xs text-gray-500">Statut</label>
                          <select
                            className="w-full border rounded-md px-2 py-1.5 text-sm bg-white"
                            value={editForm.actif ? "1" : "0"}
                            onChange={(e) => setEditForm(p => ({ ...p, actif: e.target.value === "1" }))}
                          >
                            <option value="1">Actif</option>
                            <option value="0">Désactivé</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(u.id)} disabled={loading} className="h-8">
                            <Check className="w-3.5 h-3.5 mr-1" /> Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="h-8">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // ── Mode affichage ──────────────────────────────
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_COLORS[u.role]}`}>
                          {u.prenom[0]}{u.nom[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.prenom} {u.nom}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                          {u.entreprise && <p className="text-xs text-blue-600">{u.entreprise.nom}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-xs ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{u.code}</code>
                        <Badge variant={u.actif ? "default" : "secondary"} className="text-xs">
                          {u.actif ? "Actif" : "Inactif"}
                        </Badge>
                        <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteId === u.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 rounded px-2 py-1">
                            <span className="text-xs text-red-700">Confirmer ?</span>
                            <button className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded" onClick={() => handleDelete(u.id)} disabled={loading}>Oui</button>
                            <button className="text-xs text-gray-500" onClick={() => setDeleteId(null)}>Non</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => u.id === currentUserId ? setMsg("❌ Impossible de vous supprimer vous-même") : setDeleteId(u.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
