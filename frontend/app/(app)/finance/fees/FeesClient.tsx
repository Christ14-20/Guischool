"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  createFeeCategoryAction,
  updateFeeCategoryAction,
  deleteFeeCategoryAction,
  searchStudentsAction,
  assignStudentFeeAction,
} from "./actions";

type FeeCategory = {
  id: string;
  school_year: string;
  name: string;
  type: string;
  amount: string;
  is_mandatory: boolean;
  due_date: string | null;
};

type StudentFee = {
  id: string;
  student: string;
  student_name: string;
  fee_category: FeeCategory;
  total_amount: string;
  discount_amount: string;
  balance_due: string;
};

type SchoolYear = {
  id: string;
  label: string;
};

type Student = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
};

const INPUT_CLASS =
  "w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-colors";

const TABLE_CLASS = "w-full text-left border-collapse";
const TH_CLASS =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/50";
const TD_CLASS = "px-4 py-3 text-sm text-slate-300 border-b border-slate-800/30";

export default function FeesClient({
  categories: initialCategories,
  studentFees: initialStudentFees,
  schoolYears,
}: {
  categories: FeeCategory[];
  studentFees: StudentFee[];
  schoolYears: SchoolYear[];
}) {
  const [categories, setCategories] = useState<FeeCategory[]>(initialCategories);
  const [studentFees, setStudentFees] = useState<StudentFee[]>(initialStudentFees);
  const [activeTab, setActiveTab] = useState<"categories" | "assign">("categories");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showFeedback = useCallback((err: string | null, ok: string | null) => {
    if (err) setError(err);
    if (ok) setSuccess(ok);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  }, []);

  // ─── Fee Category CRUD ─────────────────────────────────────────────────

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    school_year: "",
    name: "",
    type: "SCOLARITE",
    amount: "",
    is_mandatory: true,
    due_date: "",
  });

  const resetForm = () => {
    setFormData({ school_year: "", name: "", type: "SCOLARITE", amount: "", is_mandatory: true, due_date: "" });
    setEditId(null);
    setFormOpen(false);
  };

  const openEdit = (cat: FeeCategory) => {
    setFormData({
      school_year: cat.school_year,
      name: cat.name,
      type: cat.type,
      amount: cat.amount,
      is_mandatory: cat.is_mandatory,
      due_date: cat.due_date || "",
    });
    setEditId(cat.id);
    setFormOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.school_year || !formData.name || !formData.amount) {
      showFeedback("Veuillez remplir tous les champs obligatoires.", null);
      return;
    }
    const payload = {
      school_year: formData.school_year,
      name: formData.name,
      type: formData.type,
      amount: Number(formData.amount),
      is_mandatory: formData.is_mandatory,
      due_date: formData.due_date || null,
    };

    if (editId) {
      const res = await updateFeeCategoryAction(editId, payload);
      if (!res.success) { showFeedback(res.error, null); return; }
      showFeedback(null, "Catégorie modifiée.");
    } else {
      const res = await createFeeCategoryAction(payload);
      if (!res.success) { showFeedback(res.error, null); return; }
      showFeedback(null, "Catégorie créée.");
    }
    resetForm();
    refreshData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    const res = await deleteFeeCategoryAction(id);
    if (!res.success) { showFeedback(res.error, null); return; }
    showFeedback(null, "Catégorie supprimée.");
    refreshData();
  };

  const refreshData = async () => {
    const { listFeeCategoriesAction } = await import("./actions");
    const res = await listFeeCategoriesAction();
    if (res.success) setCategories(res.data as FeeCategory[]);
  };

  // ─── Assign Student Fee ────────────────────────────────────────────────

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assignFeeCatId, setAssignFeeCatId] = useState("");
  const [assignAmount, setAssignAmount] = useState("");
  const [assignDiscount, setAssignDiscount] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStudentSearch = useCallback(async (q: string) => {
    setStudentQuery(q);
    if (q.length < 2) { setStudentResults([]); setSearchOpen(false); return; }
    const res = await searchStudentsAction(q);
    if (res.success) {
      setStudentResults(res.data as Student[]);
      setSearchOpen(true);
    }
  }, []);

  const handleAssign = async () => {
    if (!selectedStudent || !assignFeeCatId || !assignAmount) {
      showFeedback("Veuillez sélectionner un élève, une catégorie et un montant.", null);
      return;
    }
    const res = await assignStudentFeeAction({
      student: selectedStudent.id,
      fee_category_id: assignFeeCatId,
      total_amount: Number(assignAmount),
      discount_amount: Number(assignDiscount) || 0,
    });
    if (!res.success) { showFeedback(res.error, null); return; }
    showFeedback(null, "Frais assigné à l'élève.");
    setSelectedStudent(null);
    setStudentQuery("");
    setAssignFeeCatId("");
    setAssignAmount("");
    setAssignDiscount("");
    refreshAssignList();
  };

  const refreshAssignList = async () => {
    const { listStudentFeesAction } = await import("./actions");
    const res = await listStudentFeesAction();
    if (res.success) setStudentFees(res.data as StudentFee[]);
  };

  // ─── Fee category type label ───────────────────────────────────────────

  const typeLabel = (t: string) => (t === "INSCRIPTION" ? "Inscription" : "Scolarité");

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-slate-900/60 border border-slate-800/40 w-fit">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "categories"
              ? "bg-emerald-600/20 text-emerald-300 shadow-sm"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Catégories de frais
        </button>
        <button
          onClick={() => setActiveTab("assign")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "assign"
              ? "bg-emerald-600/20 text-emerald-300 shadow-sm"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Assigner à un élève
        </button>
      </div>

      {activeTab === "categories" && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
            <h2 className="text-lg font-semibold text-white">Catégories de frais</h2>
            <button
              onClick={() => { resetForm(); setFormOpen(true); }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              + Nouvelle catégorie
            </button>
          </div>

          {/* Table */}
          <table className={TABLE_CLASS}>
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className={TH_CLASS}>Nom</th>
                <th className={TH_CLASS}>Type</th>
                <th className={TH_CLASS}>Montant</th>
                <th className={TH_CLASS}>Échéance</th>
                <th className={TH_CLASS}>Oblig.</th>
                <th className={`${TH_CLASS} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${TD_CLASS} text-center text-slate-500 py-8`}>
                    Aucune catégorie de frais pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className={TD_CLASS}>{cat.name}</td>
                    <td className={TD_CLASS}>{typeLabel(cat.type)}</td>
                    <td className={TD_CLASS}>{Number(cat.amount).toLocaleString()} GNF</td>
                    <td className={TD_CLASS}>{cat.due_date ? new Date(cat.due_date).toLocaleDateString("fr-FR") : "-"}</td>
                    <td className={TD_CLASS}>{cat.is_mandatory ? "Oui" : "Non"}</td>
                    <td className={`${TD_CLASS} text-right`}>
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-emerald-400 hover:text-emerald-300 text-xs font-medium mr-3 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "assign" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assign form */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Assigner un frais</h2>
            <div className="space-y-4">
              {/* Student search */}
              <div ref={searchRef} className="relative">
                <label className="block text-xs font-medium text-slate-400 mb-1">Élève *</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-200">
                      {selectedStudent.nom} {selectedStudent.prenom} ({selectedStudent.matricule})
                    </span>
                    <button
                      onClick={() => { setSelectedStudent(null); setStudentQuery(""); }}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      value={studentQuery}
                      onChange={(e) => handleStudentSearch(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Rechercher par nom ou matricule..."
                    />
                    {searchOpen && studentResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {studentResults.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedStudent(s); setSearchOpen(false); setStudentQuery(`${s.nom} ${s.prenom}`); }}
                            className="block w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                          >
                            {s.nom} {s.prenom} — {s.matricule}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fee category */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Catégorie de frais *</label>
                <select
                  value={assignFeeCatId}
                  onChange={(e) => {
                    setAssignFeeCatId(e.target.value);
                    const cat = categories.find((c) => c.id === e.target.value);
                    if (cat) setAssignAmount(cat.amount);
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} — {Number(cat.amount).toLocaleString()} GNF
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Montant total *</label>
                  <input
                    type="number"
                    value={assignAmount}
                    onChange={(e) => setAssignAmount(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Remise</label>
                  <input
                    type="number"
                    value={assignDiscount}
                    onChange={(e) => setAssignDiscount(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                onClick={handleAssign}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Assigner
              </button>
            </div>
          </div>

          {/* Recent assignments */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/50">
              <h2 className="text-lg font-semibold text-white">Frais assignés</h2>
            </div>
            <div className="overflow-x-auto">
              <table className={TABLE_CLASS}>
                <thead>
                  <tr className="border-b border-slate-800/50">
                    <th className={TH_CLASS}>Élève</th>
                    <th className={TH_CLASS}>Catégorie</th>
                    <th className={TH_CLASS}>Restant dû</th>
                  </tr>
                </thead>
                <tbody>
                  {studentFees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={`${TD_CLASS} text-center text-slate-500 py-8`}>
                        Aucun frais assigné.
                      </td>
                    </tr>
                  ) : (
                    studentFees.slice(0, 20).map((sf) => (
                      <tr key={sf.id} className="hover:bg-slate-900/35 transition-colors">
                        <td className={TD_CLASS}>{sf.student_name}</td>
                        <td className={TD_CLASS}>{sf.fee_category?.name || "-"}</td>
                        <td className={TD_CLASS}>{Number(sf.balance_due).toLocaleString()} GNF</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editId ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Année scolaire *</label>
                <select
                  value={formData.school_year}
                  onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                  className={INPUT_CLASS}
                >
                  <option value="">Sélectionner...</option>
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>{sy.label}</option>
                  ))}
                </select>
                {schoolYears.length === 0 && (
                  <p className="mt-1 text-xs text-red-400">Aucune année scolaire disponible.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nom *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="Ex: Scolarité 1er trimestre"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={INPUT_CLASS}
                  >
                    <option value="SCOLARITE">Scolarité</option>
                    <option value="INSCRIPTION">Inscription</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Montant (GNF) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder="50000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date échéance</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Obligatoire</label>
                  <select
                    value={formData.is_mandatory ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.value === "true" })}
                    className={INPUT_CLASS}
                  >
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  Annuler
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  {editId ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
