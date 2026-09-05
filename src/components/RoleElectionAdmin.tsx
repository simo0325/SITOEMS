import React, { useState, useEffect, useMemo } from "react";
import {
  Vote,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Award,
  Shield,
  FileSpreadsheet,
  Sliders,
  Calendar,
  Layers,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  RoleElectionConfig,
  RoleElectionCandidate,
  RoleElectionVote,
  DEFAULT_ROLE_ELECTION_ROLES,
} from "../types.js";

interface RoleElectionAdminProps {
  adminToken?: string;
  isMaster?: boolean;
}

export default function RoleElectionAdmin({ adminToken, isMaster }: RoleElectionAdminProps) {
  const [config, setConfig] = useState<RoleElectionConfig | null>(null);
  const [candidates, setCandidates] = useState<RoleElectionCandidate[]>([]);
  const [votes, setVotes] = useState<RoleElectionVote[]>([]);
  const [stats, setStats] = useState<{
    totalVotes: number;
    roleStats: Record<string, Record<string, number>>;
    winners: Record<string, { name: string; count: number }[]>;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Computed available roles based strictly on config (or DEFAULT_ROLE_ELECTION_ROLES on initial load)
  const availableRoles = useMemo(() => {
    if (config?.roles && Array.isArray(config.roles)) {
      return config.roles;
    }
    return DEFAULT_ROLE_ELECTION_ROLES;
  }, [config?.roles]);

  // Form states for adding candidate
  const [newCandName, setNewCandName] = useState<string>("");
  const [newCandRole, setNewCandRole] = useState<string>("Direttore Generale");
  const [newCandNotes, setNewCandNotes] = useState<string>("");
  const [isAddingCand, setIsAddingCand] = useState<boolean>(false);

  // Form states for config editing
  const [cfgIsOpen, setCfgIsOpen] = useState<boolean>(true);
  const [cfgMaxCandidates, setCfgMaxCandidates] = useState<number>(1);
  const [cfgDurationHours, setCfgDurationHours] = useState<number>(24);
  const [cfgDeadline, setCfgDeadline] = useState<string>("");
  const [cfgTitle, setCfgTitle] = useState<string>("");
  const [cfgDescription, setCfgDescription] = useState<string>("");
  const [newRoleInput, setNewRoleInput] = useState<string>("");

  // Edit candidate modal state
  const [editingCandidate, setEditingCandidate] = useState<RoleElectionCandidate | null>(null);
  const [editCandName, setEditCandName] = useState<string>("");
  const [editCandRole, setEditCandRole] = useState<string>("");
  const [editCandNotes, setEditCandNotes] = useState<string>("");
  const [isSavingEditCand, setIsSavingEditCand] = useState<boolean>(false);

  // Delete candidate modal state
  const [deletingCandidate, setDeletingCandidate] = useState<RoleElectionCandidate | null>(null);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState<boolean>(false);

  // Remove role modal state
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState<boolean>(false);

  // Clear all votes confirmation modal
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [isClearingVotes, setIsClearingVotes] = useState<boolean>(false);

  // Filter & tab inside RoleElectionAdmin
  const [activeSubTab, setActiveSubTab] = useState<"results" | "candidates" | "settings">("results");
  const [candidateRoleFilter, setCandidateRoleFilter] = useState<string>("ALL");
  const [expandedVoteId, setExpandedVoteId] = useState<string | null>(null);

  // Synchronize newCandRole if invalid
  useEffect(() => {
    if (availableRoles.length > 0) {
      if (!newCandRole || !availableRoles.some((r) => r.toLowerCase() === newCandRole.toLowerCase())) {
        setNewCandRole(availableRoles[0]);
      }
    }
  }, [availableRoles, newCandRole]);

  // Centralized authentication headers helper
  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const activeToken = adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken") || "";
    const empToken = localStorage.getItem("discordToken") || "";
    const revName = localStorage.getItem("ems_discord_reviewer_name") || "";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${activeToken}`,
      ...extra,
    };
    if (empToken) headers["X-Employee-Token"] = empToken;
    if (revName) headers["X-Reviewer-Name"] = revName;
    return headers;
  };

  // Safe response parser for JSON
  const safeParseResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Risposta del server non valida (${res.status}). Riprova tra qualche istante.`);
    }
    return res.json();
  };

  // Load data from server
  const loadData = async (retryCount = 0) => {
    const activeToken = adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken") || "";
    if (!activeToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/role-election/data", {
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        if (retryCount < 2) {
          setTimeout(() => {
            loadData(retryCount + 1);
          }, 1200);
          return;
        }
        throw new Error("Il server sta riavviando i servizi. Riprova tra qualche secondo.");
      }

      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setCandidates(data.candidates || []);
        setVotes(data.votes || []);
        setStats(data.stats || null);

        // Sync form states
        setCfgIsOpen(data.config.isOpen ?? true);
        setCfgMaxCandidates(data.config.maxCandidatesPerRole || 1);
        setCfgDurationHours(data.config.durationHours || 24);
        setCfgDeadline(data.config.deadline || "");
        setCfgTitle(data.config.title || "Votazione Ruoli Direzionale EMS");
        setCfgDescription(data.config.description || "");
        if (data.config.roles && data.config.roles.length > 0) {
          if (!newCandRole || !data.config.roles.includes(newCandRole)) {
            setNewCandRole(data.config.roles[0]);
          }
        }
      } else {
        setErrorMsg(data.error || "Impossibile caricare i dati della votazione ruoli.");
      }
    } catch (err: any) {
      if (retryCount >= 2) {
        console.warn("Notice loading role election admin data:", err?.message || err);
        setErrorMsg(err?.message || "Errore di rete durante la sincronizzazione dei dati.");
      }
    } finally {
      if (retryCount === 0 || retryCount >= 2) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings
  const handleSaveConfig = async (overrideIsOpen?: boolean) => {
    setSavingConfig(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const currentRoles = Array.isArray(config?.roles) ? config.roles : availableRoles;
      const payload = {
        isOpen: overrideIsOpen !== undefined ? overrideIsOpen : cfgIsOpen,
        maxCandidatesPerRole: Number(cfgMaxCandidates) || 1,
        durationHours: Number(cfgDurationHours) || 24,
        deadline: cfgDeadline ? new Date(cfgDeadline).toISOString() : null,
        title: cfgTitle,
        description: cfgDescription,
        roles: currentRoles,
      };

      const res = await fetch("/api/admin/role-election/config", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await safeParseResponse(res);
      if (data.success) {
        setConfig(data.config);
        setCfgIsOpen(data.config.isOpen);
        setSuccessMsg("Configurazione della votazione aggiornata con successo!");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "Errore durante il salvataggio della configurazione.");
      }
    } catch (err) {
      console.error("Error saving config:", err);
      setErrorMsg("Errore di comunicazione col server.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Set quick deadline based on hours from now
  const setQuickDeadline = (hours: number) => {
    setCfgDurationHours(hours);
    const d = new Date(Date.now() + hours * 3600 * 1000);
    // format as YYYY-MM-DDThh:mm for datetime-local input
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCfgDeadline(localIso);
  };

  // Add a new role to the allowed roles list
  const handleAddRole = async () => {
    const clean = newRoleInput.trim();
    if (!clean) return;
    const currentRoles = Array.isArray(config?.roles) ? config.roles : availableRoles;
    if (currentRoles.some((r) => r.trim().toLowerCase() === clean.toLowerCase())) {
      setErrorMsg("Questo ruolo è già presente nella lista delle votazioni.");
      return;
    }

    const updatedRoles = [...currentRoles, clean];
    try {
      const res = await fetch("/api/admin/role-election/config", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ roles: updatedRoles }),
      });

      const data = await safeParseResponse(res);
      if (data.success && data.config) {
        setConfig(data.config);
        setNewRoleInput("");
        setSuccessMsg(`Ruolo '${clean}' aggiunto alla sessione elettorale.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Errore durante l'aggiunta del ruolo.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore durante l'aggiunta del ruolo.");
    }
  };

  // Confirm and Remove a role
  const confirmRemoveRole = async () => {
    if (!deletingRole) return;
    setIsDeletingRole(true);
    setErrorMsg(null);
    const target = deletingRole.trim().toLowerCase();
    const currentRoles = Array.isArray(config?.roles) ? config.roles : availableRoles;
    const updatedRoles = currentRoles.filter((r) => r.trim().toLowerCase() !== target);

    try {
      const res = await fetch("/api/admin/role-election/config", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ roles: updatedRoles }),
      });

      const data = await safeParseResponse(res);
      if (data.success && data.config) {
        setConfig(data.config);
        setSuccessMsg(`Ruolo '${deletingRole}' rimosso con successo.`);
        setTimeout(() => setSuccessMsg(null), 3000);
        setDeletingRole(null);
      } else {
        setErrorMsg(data.error || "Errore durante la rimozione del ruolo.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore durante la rimozione del ruolo.");
    } finally {
      setIsDeletingRole(false);
    }
  };

  // Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateName = newCandName.trim();
    const candidateRole = (newCandRole || "").trim() || availableRoles[0] || "Direttore Generale";

    if (!candidateName) {
      setErrorMsg("Inserisci il nome del candidato.");
      return;
    }
    if (!candidateRole) {
      setErrorMsg("Seleziona il ruolo per cui si candida.");
      return;
    }

    setIsAddingCand(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/role-election/candidate", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: candidateName,
          role: candidateRole,
          notes: newCandNotes.trim(),
        }),
      });

      const data = await safeParseResponse(res);
      if (data.success) {
        setCandidates(data.candidates);
        setNewCandName("");
        setNewCandNotes("");
        setNewCandRole(candidateRole);
        setSuccessMsg(`Candidato ${data.candidate.name} aggiunto per '${data.candidate.role}'!`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "Errore durante l'aggiunta del candidato.");
      }
    } catch (err: any) {
      console.error("Error adding candidate:", err);
      setErrorMsg(err?.message || "Errore di connessione al server.");
    } finally {
      setIsAddingCand(false);
    }
  };

  // Edit Candidate
  const handleSaveEditCandidate = async () => {
    if (!editingCandidate) return;
    setIsSavingEditCand(true);
    try {
      const res = await fetch(`/api/admin/role-election/candidate/${editingCandidate.id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: editCandName.trim(),
          role: editCandRole.trim(),
          notes: editCandNotes.trim(),
        }),
      });

      const data = await safeParseResponse(res);
      if (data.success) {
        setCandidates(data.candidates);
        setEditingCandidate(null);
        setSuccessMsg("Candidato modificato con successo.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Errore durante la modifica del candidato.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore durante il salvataggio delle modifiche.");
    } finally {
      setIsSavingEditCand(false);
    }
  };

  // Confirm Delete Candidate
  const confirmDeleteCandidate = async () => {
    if (!deletingCandidate) return;
    setIsDeletingCandidate(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/role-election/candidate/${deletingCandidate.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await safeParseResponse(res);
      if (data.success) {
        setCandidates(data.candidates);
        setSuccessMsg(`Candidato ${deletingCandidate.name} rimosso con successo.`);
        setTimeout(() => setSuccessMsg(null), 3500);
        setDeletingCandidate(null);
      } else {
        setErrorMsg(data.error || "Impossibile eliminare il candidato.");
      }
    } catch (e: any) {
      console.error("Error deleting candidate:", e);
      setErrorMsg(e?.message || "Errore durante l'eliminazione del candidato.");
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  // Clear all votes
  const handleClearAllVotes = async () => {
    setIsClearingVotes(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/role-election/clear-votes", {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await safeParseResponse(res);
      if (data.success) {
        setShowClearModal(false);
        setSuccessMsg(data.message || "Tutte le votazioni sono state azzerate con successo!");
        loadData();
      } else {
        setErrorMsg(data.error || "Errore durante l'azzeramento dei voti.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Errore durante l'azzeramento.");
    } finally {
      setIsClearingVotes(false);
    }
  };

  // Delete individual vote
  const handleDeleteVote = async (voteId: string, voterName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la scheda di voto di '${voterName}'?`)) return;

    try {
      const headers: Record<string, string> = {};
      const token = adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/role-election/votes/${voteId}`, {
        method: "DELETE",
        headers,
      });

      const data = await safeParseResponse(res);
      if (data.success) {
        setSuccessMsg(`Scheda di ${voterName} eliminata.`);
        loadData();
      } else {
        setErrorMsg(data.error || "Errore durante l'eliminazione del voto.");
      }
    } catch (e) {
      setErrorMsg("Errore durante l'eliminazione del voto.");
    }
  };

  // Export results to CSV
  const handleExportCSV = () => {
    if (votes.length === 0) {
      alert("Nessun voto registrato da esportare.");
      return;
    }

    const headers = ["ID", "Elettore", "Ruolo Elettore", "Chiave Proprietario", "Data e Ora", "Motivazione", "Preferenze"];
    const rows = votes.map((v) => {
      const prefs = Object.entries(v.selections || {})
        .map(([role, cands]) => `${role}: ${Array.isArray(cands) ? cands.join(", ") : cands}`)
        .join(" | ");
      return [
        v.id,
        `"${v.voterName.replace(/"/g, '""')}"`,
        `"${v.voterRole.replace(/"/g, '""')}"`,
        v.isOwnerKey ? "SI" : "NO",
        new Date(v.timestamp).toLocaleString("it-IT"),
        `"${(v.motivation || "").replace(/"/g, '""')}"`,
        `"${prefs.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `votazione_ruoli_ems_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCandidates = candidateRoleFilter === "ALL"
    ? candidates
    : candidates.filter((c) => c.role === candidateRoleFilter);

  const isExpired = config?.deadline ? new Date().getTime() > new Date(config.deadline).getTime() : false;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="p-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30">
                <Award className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Gestione Votazione Ruoli Direzione
                  {config?.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      VOTAZIONI APERTE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      VOTAZIONI CHIUSE
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Controllo completo su candidati, cariche, durata, limiti di preferenza e schede elettorali con motivazione.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSaveConfig(!config?.isOpen)}
              disabled={savingConfig}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                config?.isOpen
                  ? "bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50"
                  : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30"
              }`}
            >
              {config?.isOpen ? (
                <>
                  <XCircle className="w-4 h-4" />
                  Chiudi Votazioni
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Apri Votazioni
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              title="Esporta risultati in CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-orange-400" />
              Esporta CSV
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              className="px-3 py-2 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              title="Azzera tutte le votazioni concluse"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Ripulisci Votazioni
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
              title="Ricarica Dati"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="mt-4 p-3 bg-orange-950/50 border border-orange-600/50 rounded-lg flex items-center gap-2.5 text-orange-300 text-xs font-medium animate-fadeIn">
            <Check className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/50 border border-rose-600/50 rounded-lg flex items-center gap-2.5 text-rose-300 text-xs font-medium animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab("results")}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeSubTab === "results"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          Voti e Risultati ({votes.length})
        </button>

        <button
          onClick={() => setActiveSubTab("candidates")}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeSubTab === "candidates"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Candidati e Ruoli ({candidates.length})
        </button>

        <button
          onClick={() => setActiveSubTab("settings")}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeSubTab === "settings"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Parametri e Tempistiche
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: RISULTATI & SCHEDE ELETTORALI                                   */}
      {/* ========================================================================= */}
      {activeSubTab === "results" && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Schede Registrate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-100">{votes.length}</span>
                <span className="text-xs text-orange-400">votanti</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Candidati In Lizza
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-orange-400">{candidates.length}</span>
                <span className="text-xs text-slate-400">su {availableRoles.length} cariche</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Max Preferenze per Ruolo
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400">{config?.maxCandidatesPerRole || 1}</span>
                <span className="text-xs text-slate-400">selezionabili</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Scadenza Timer
              </span>
              <div className="flex items-baseline gap-2">
                {config?.deadline ? (
                  <span className={`text-xs font-bold ${isExpired ? "text-rose-400" : "text-orange-400"}`}>
                    {isExpired ? "Scaduto il " : "Scade: "}
                    {new Date(config.deadline).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Nessuna (Manuale)</span>
                )}
              </div>
            </div>
          </div>

          {/* Results By Role Cards */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Spoglio Elettorale per Carica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRoles.map((roleName) => {
                const roleWinners = stats?.winners?.[roleName] || [];
                const roleCands = candidates.filter((c) => c.role.toLowerCase() === roleName.toLowerCase());
                const roleTotalVotes = roleWinners.reduce((sum, item) => sum + item.count, 0);

                return (
                  <div
                    key={roleName}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{roleName}</h4>
                        <span className="text-xs text-slate-400">
                          {roleCands.length} candidati • {roleTotalVotes} preferenze espresse
                        </span>
                      </div>
                      {roleWinners.length > 0 && roleWinners[0].count > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-semibold text-amber-400 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          In testa: {roleWinners[0].name}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {roleCands.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          Nessun candidato registrato per questa carica.
                        </p>
                      ) : (
                        roleCands.map((cand) => {
                          const votesForCand = stats?.roleStats?.[roleName]?.[cand.name] || 0;
                          const pct = roleTotalVotes > 0 ? Math.round((votesForCand / roleTotalVotes) * 100) : 0;
                          const isLeading = roleWinners[0] && roleWinners[0].name === cand.name && votesForCand > 0;

                          return (
                            <div key={cand.id} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className={`font-semibold flex items-center gap-1.5 ${isLeading ? "text-amber-300" : "text-slate-300"}`}>
                                  {isLeading && <Award className="w-3.5 h-3.5 text-amber-400" />}
                                  {cand.name}
                                </span>
                                <span className="text-slate-400 font-mono font-medium">
                                  {votesForCand} {votesForCand === 1 ? "voto" : "voti"} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isLeading ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-orange-500/60"
                                  }`}
                                  style={{ width: `${Math.max(pct, votesForCand > 0 ? 6 : 0)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table of Voters & Motivations */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-orange-400" />
                  Registro Schede Elettorali e Motivazioni
                </h3>
                <p className="text-xs text-slate-400">
                  Elenco dettagliato di chi ha votato, preferenze per ruolo e motivazione registrata.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Totale schede: <strong className="text-slate-200">{votes.length}</strong>
              </span>
            </div>

            {votes.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <Vote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-medium">Nessun voto è stato ancora espresso.</p>
                <p className="text-xs text-slate-500 mt-1">
                  I voti compariranno qui in tempo reale man mano che i membri della Direzione voteranno.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {votes.map((v) => {
                  const isExpanded = expandedVoteId === v.id;
                  const formattedDate = new Date(v.timestamp).toLocaleString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={v.id} className="p-4 hover:bg-slate-800/30 transition">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 border border-slate-700 shrink-0">
                            {v.voterName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-200">{v.voterName}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {v.voterRole}
                              </span>
                              {v.isOwnerKey ? (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Key Proprietario
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                  Membro Direzione
                                </span>
                              )}
                              <span className="text-xs text-slate-500">{formattedDate}</span>
                            </div>

                            {/* Motivation Snippet */}
                            <div className="mt-2 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                              <span className="font-semibold text-slate-400 block mb-1">
                                Motivazione al voto:
                              </span>
                              {v.motivation ? (
                                <p className="italic text-slate-200 font-sans leading-relaxed">"{v.motivation}"</p>
                              ) : v.isOwnerKey ? (
                                <span className="text-amber-400/80 italic">
                                  Nessuna motivazione (Esonerato - Key Proprietario)
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Nessuna motivazione inserita</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions & Expand Toggle */}
                        <div className="flex items-center gap-2 self-end lg:self-center">
                          <button
                            onClick={() => setExpandedVoteId(isExpanded ? null : v.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center gap-1 transition"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                Nascondi Preferenze
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                Mostra Preferenze ({Object.keys(v.selections || {}).length})
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteVote(v.id, v.voterName)}
                            className="p-1.5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded transition"
                            title="Elimina scheda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Preferences */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {Object.entries(v.selections || {}).map(([role, cands]) => (
                            <div key={role} className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 font-medium block">{role}:</span>
                              <span className="font-bold text-orange-400">
                                {Array.isArray(cands) ? cands.join(", ") : cands}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: GESTIONE CANDIDATI E RUOLI                                      */}
      {/* ========================================================================= */}
      {activeSubTab === "candidates" && (
        <div className="space-y-6">
          {/* Add Candidate Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-400" />
              Inserisci Nuovo Candidato
            </h3>

            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome e Cognome del Candidato *
                </label>
                <input
                  type="text"
                  placeholder="Es. Mario Rossi"
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ruolo per cui Concorre *
                </label>
                <select
                  value={newCandRole}
                  onChange={(e) => setNewCandRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                  required
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note / Reparto / Esperienza (Facoltativo)
                </label>
                <input
                  type="text"
                  placeholder="Es. Primario Chirurgia, ex Vice"
                  value={newCandNotes}
                  onChange={(e) => setNewCandNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isAddingCand}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-orange-600/30"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingCand ? "Aggiunta in corso..." : "Aggiungi Candidato"}
                </button>
              </div>
            </form>
          </div>

          {/* Filter & Candidate List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  Elenco Candidati Registrati ({candidates.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Candidati visibili nella scheda elettorale dei membri della Direzione.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Filtra per Ruolo:</label>
                <select
                  value={candidateRoleFilter}
                  onChange={(e) => setCandidateRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="ALL">Tutti i Ruoli ({candidates.length})</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role} ({candidates.filter((c) => c.role.toLowerCase() === role.toLowerCase()).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs">Nessun candidato presente per il filtro selezionato.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3.5 hover:bg-slate-800/30 flex items-center justify-between gap-4 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-950/60 border border-orange-700/50 flex items-center justify-center font-bold text-xs text-orange-400 shrink-0">
                        {cand.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-200">{cand.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-700/40 font-medium">
                            {cand.role}
                          </span>
                        </div>
                        {cand.notes && (
                          <p className="text-xs text-slate-400 mt-0.5">{cand.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingCandidate(cand);
                          setEditCandName(cand.name);
                          setEditCandRole(cand.role);
                          setEditCandNotes(cand.notes || "");
                        }}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                        title="Modifica candidato"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCandidate(cand)}
                        className="p-1.5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                        title="Elimina candidato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: PARAMETRI, REGOLE E TEMPISTICHE                                 */}
      {/* ========================================================================= */}
      {activeSubTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              Configurazione Globale Votazione Ruoli
            </h3>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Titolo Sessione Elettorale
                </label>
                <input
                  type="text"
                  value={cfgTitle}
                  onChange={(e) => setCfgTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stato Sessione
                </label>
                <div className="flex items-center gap-3 h-10">
                  <button
                    type="button"
                    onClick={() => setCfgIsOpen(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      cfgIsOpen
                        ? "bg-orange-600 text-white shadow-md shadow-orange-600/30"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aperte
                  </button>
                  <button
                    type="button"
                    onClick={() => setCfgIsOpen(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      !cfgIsOpen
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Chiuse
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrizione o Istruzioni per gli Elettori
                </label>
                <textarea
                  value={cfgDescription}
                  onChange={(e) => setCfgDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Limits & Rules */}
            <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max candidates per role */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Quanti candidati possono selezionare per ciascun ruolo?
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={cfgMaxCandidates}
                    onChange={(e) => setCfgMaxCandidates(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-center text-orange-400 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-400">
                    {cfgMaxCandidates === 1 ? "Singola preferenza secca" : `Fino a ${cfgMaxCandidates} preferenze per carica`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Imposta il limite massimo di preferenze che ogni membro della Direzione può esprimere per ciascun ruolo in scheda.
                </p>
              </div>

              {/* Time to vote / Deadline */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Quanto tempo hanno per votare? (Scadenza Timer)
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(12)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded transition"
                  >
                    12 Ore
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(24)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded transition"
                  >
                    24 Ore
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(48)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded transition"
                  >
                    48 Ore
                  </button>
                  <button
                    type="button"
                    onClick={() => setCfgDeadline("")}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-400 hover:text-slate-200 rounded transition"
                  >
                    Nessun Limite
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="datetime-local"
                    value={cfgDeadline ? cfgDeadline.slice(0, 16) : ""}
                    onChange={(e) => setCfgDeadline(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                  {cfgDeadline && (
                    <button
                      type="button"
                      onClick={() => setCfgDeadline("")}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Rimuovi scadenza
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Roles list config */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-200">
                Ruoli in Votazione (Cariche Assegnabili)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => setDeletingRole(role)}
                      className="hover:text-rose-400 transition cursor-pointer"
                      title="Rimuovi questo ruolo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add role input */}
              <div className="flex items-center gap-2 max-w-md pt-2">
                <input
                  type="text"
                  placeholder="Es. Segretario Amministrativo..."
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aggiungi Ruolo
                </button>
              </div>
            </div>

            {/* Rule highlight: Motivation */}
            <div className="border-t border-slate-800 pt-4 bg-orange-950/20 p-3.5 rounded-lg border border-orange-500/20 flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <strong className="text-orange-300 font-semibold block">
                  Regola Motivazione Obbligatoria (Attiva)
                </strong>
                <p>
                  Tutti gli elettori sono tenuti per regolamento a motivare per iscritto la propria scelta durante il voto.
                  L'obbligo viene automaticamente esentato per gli account identificati con <em>Key Proprietario</em>.
                </p>
              </div>
            </div>

            {/* Save Config Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={savingConfig}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-orange-600/30"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? "Salvataggio..." : "Salva Tutte le Impostazioni"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CANDIDATE                                                     */}
      {/* ========================================================================= */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-orange-400" />
                Modifica Candidato
              </h3>
              <button
                onClick={() => setEditingCandidate(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome e Cognome *
                </label>
                <input
                  type="text"
                  value={editCandName}
                  onChange={(e) => setEditCandName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ruolo *
                </label>
                <select
                  value={editCandRole}
                  onChange={(e) => setEditCandRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note / Reparto
                </label>
                <input
                  type="text"
                  value={editCandNotes}
                  onChange={(e) => setEditCandNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCandidate(null)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEditCandidate}
                disabled={isSavingEditCand}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-orange-600/30"
              >
                <Check className="w-4 h-4" />
                {isSavingEditCand ? "Salvataggio..." : "Salva Modifiche"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR ALL VOTES CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Conferma Azzeramento Votazioni Ruoli
                </h3>
                <span className="text-xs text-rose-400">
                  Operazione irreversibile • {votes.length} schede verranno cancellate
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/20 p-3 rounded-lg border border-rose-900/40">
              Sei sicuro di voler <strong>ripulire tutte le votazioni</strong> concluse? Questa operazione
              cancellerà l'intero registro delle schede elettorali per i ruoli della Direzione,
              consentendo di avviare una nuova tornata con registro pulito. I candidati e le impostazioni
              verranno invece preservati.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearingVotes}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleClearAllVotes}
                disabled={isClearingVotes}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                {isClearingVotes ? "Ripulitura in corso..." : "Sì, Ripulisci Tutte le Votazioni"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CANDIDATE CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Rimuovere Candidato?
                </h3>
                <span className="text-xs text-rose-400">
                  Operazione irreversibile
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Sei sicuro di voler eliminare definitivamente il candidato{" "}
              <strong className="text-white">{deletingCandidate.name}</strong> per la carica di{" "}
              <span className="text-orange-400 font-semibold">{deletingCandidate.role}</span>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCandidate(null)}
                disabled={isDeletingCandidate}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDeleteCandidate}
                disabled={isDeletingCandidate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeletingCandidate ? "Eliminazione..." : "Sì, Elimina Candidato"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REMOVE ROLE CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Rimuovere Ruolo dalla Votazione?
                </h3>
                <span className="text-xs text-rose-400">
                  Configurazione elezioni
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Sei sicuro di voler rimuovere il ruolo{" "}
              <strong className="text-white">{deletingRole}</strong> dalla lista delle cariche votabili?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                disabled={isDeletingRole}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmRemoveRole}
                disabled={isDeletingRole}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeletingRole ? "Rimozione..." : "Sì, Rimuovi Ruolo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
