import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  Send,
  User,
  Check,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Vote,
  RotateCcw,
} from "lucide-react";
import {
  RoleElectionConfig,
  RoleElectionCandidate,
  DiscordUserSession,
  canAccessRoleElection,
  isOwnerKey,
  DEFAULT_ROLE_ELECTION_ROLES,
} from "../types.js";

interface RoleElectionPortalProps {
  userSession: DiscordUserSession | null;
  onOpenDiscordModal?: () => void;
}

export default function RoleElectionPortal({
  userSession,
  onOpenDiscordModal,
}: RoleElectionPortalProps) {
  const [config, setConfig] = useState<RoleElectionConfig | null>(null);
  const [candidates, setCandidates] = useState<RoleElectionCandidate[]>([]);
  const [callerInfo, setCallerInfo] = useState<{
    username: string;
    roleName: string;
    grade: number;
    isOwnerKey: boolean;
  } | null>(null);

  const [userVote, setUserVote] = useState<{
    id: string;
    selections: Record<string, string[]>;
    motivation: string;
    timestamp: string;
    isOwnerKey: boolean;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voting form state
  // selections: roleName -> array of selected candidate names
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [motivation, setMotivation] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isEditingExistingVote, setIsEditingExistingVote] = useState<boolean>(false);

  // Time remaining helper
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const hasAccess = userSession ? canAccessRoleElection(userSession) : false;
  const isOwner = userSession ? isOwnerKey(userSession) : false;

  // Fetch election data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {};
      const token = userSession?.token || localStorage.getItem("discordToken") || localStorage.getItem("adminToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/role-election/data", { headers });
      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setCandidates(data.candidates || []);
        setCallerInfo(data.caller);
        setUserVote(data.userVote || null);

        if (data.userVote) {
          // Initialize selections and motivation from existing vote
          setSelections(data.userVote.selections || {});
          setMotivation(data.userVote.motivation || "");
        }
      } else {
        setErrorMsg(data.error || "Impossibile recuperare i dati della votazione.");
      }
    } catch (err) {
      console.error("Error fetching role election data:", err);
      setErrorMsg("Errore di connessione durante il recupero dei dati.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userSession]);

  // Update countdown timer
  useEffect(() => {
    if (!config?.deadline) {
      setTimeRemaining("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(config.deadline!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining("Tempo Scaduto");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s rimanenti`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config?.deadline]);

  // Toggle selection of a candidate for a role
  const handleToggleCandidate = (roleName: string, candidateName: string) => {
    if (!config?.isOpen) return;

    const maxLimit = config.maxCandidatesPerRole || 1;
    const currentList = selections[roleName] || [];

    if (currentList.includes(candidateName)) {
      // Deselect
      setSelections({
        ...selections,
        [roleName]: currentList.filter((n) => n !== candidateName),
      });
    } else {
      // Select (respect max limit)
      if (currentList.length >= maxLimit) {
        if (maxLimit === 1) {
          // If 1, replace directly for convenience
          setSelections({
            ...selections,
            [roleName]: [candidateName],
          });
          return;
        }
        setErrorMsg(`Puoi selezionare al massimo ${maxLimit} candidato/i per la carica di '${roleName}'.`);
        setTimeout(() => setErrorMsg(null), 3000);
        return;
      }

      setSelections({
        ...selections,
        [roleName]: [...currentList, candidateName],
      });
    }
  };

  // Submit vote
  const handleSubmitVote = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate motivation
    const effectiveIsOwner = callerInfo?.isOwnerKey || isOwner;
    if (!effectiveIsOwner) {
      if (!motivation || motivation.trim().length < 5) {
        setErrorMsg("La motivazione al voto è obbligatoria per convalidare la scheda (minimo 5 caratteri).");
        setShowConfirmModal(false);
        return;
      }
    }

    // Validate selections: at least one selection made
    const hasAnySelection = Object.values(selections).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    if (!hasAnySelection) {
      setErrorMsg("Seleziona almeno un candidato prima di inviare la scheda elettorale.");
      setShowConfirmModal(false);
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = userSession?.token || localStorage.getItem("discordToken") || localStorage.getItem("adminToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/role-election/vote", {
        method: "POST",
        headers,
        body: JSON.stringify({
          selections,
          motivation: motivation.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "Voto registrato con successo!");
        setUserVote(data.vote);
        setIsEditingExistingVote(false);
        setShowConfirmModal(false);
        fetchData();
      } else {
        setErrorMsg(data.error || "Errore durante l'invio del voto.");
        setShowConfirmModal(false);
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
      setErrorMsg("Errore di connessione al server.");
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Not logged in or unauthorized view
  if (!userSession) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          Accesso Riservato: Votazione Ruoli Direzionali
        </h2>
        <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
          Questa sezione è accessibile esclusivamente ai membri della Direzione Sanitaria
          e Generale, a partire dal grado di <strong>Segretario Direzione (incluso)</strong> in su.
        </p>
        <button
          onClick={onOpenDiscordModal}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-orange-600/30"
        >
          Inserisci Token Personale EMS
        </button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-slate-900/90 border border-rose-900/40 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 bg-rose-950/50 border border-rose-800/60 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          Grado Insufficiente per Votare i Ruoli
        </h2>
        <p className="text-sm text-slate-300 mb-4 max-w-md mx-auto leading-relaxed">
          Il tuo ruolo attuale è <strong>{userSession.roleName}</strong>. Ai sensi del regolamento,
          la votazione per le cariche direzionali è riservata a partire dal grado di{" "}
          <strong className="text-orange-400">Segretario Direzione</strong> in su.
        </p>
        <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl max-w-sm mx-auto border border-slate-800">
          Se ritieni si tratti di un errore, contatta un membro della Direzione o Proprietario.
        </div>
      </div>
    );
  }

  const effectiveIsOwner = callerInfo?.isOwnerKey || isOwner;
  const isExpired = config?.deadline ? new Date().getTime() > new Date(config.deadline).getTime() : false;
  const canVote = config?.isOpen && !isExpired;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                  {config?.title || "Votazione Ruoli Direzionale EMS"}
                </h1>
                {config?.isOpen && !isExpired ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    VOTAZIONI APERTE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    {isExpired ? "TEMPO SCADUTO" : "VOTAZIONI CHIUSE"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {config?.description ||
                  "Sessione di votazione per l'assegnazione e preferenza dei ruoli organizzativi, riservata a partire dal grado di Segretario Direzione in su."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
              title="Ricarica Dati"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Voter Details & Rules Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <User className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Elettore Connesso
              </span>
              <span className="font-bold text-slate-200">
                {userSession.username} ({userSession.roleName})
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Regola Motivazione
              </span>
              {effectiveIsOwner ? (
                <span className="font-bold text-amber-300">
                  Key Proprietario: Motivazione Facoltativa
                </span>
              ) : (
                <span className="font-bold text-orange-400">
                  Obbligatoria per Convalidare Scheda
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Tempo Rimanente
              </span>
              <span className="font-bold text-slate-200">
                {timeRemaining || (config?.deadline ? "In corso" : "Nessun limite di tempo")}
              </span>
            </div>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 bg-orange-950/60 border border-orange-600/60 rounded-xl flex items-center gap-2.5 text-orange-300 text-xs font-semibold">
            <Check className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-600/60 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* If voter has already voted and is NOT editing */}
      {userVote && !isEditingExistingVote && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Scheda Elettorale Registrata con Successo
                </h3>
                <span className="text-xs text-slate-400">
                  Voto inviato il {new Date(userVote.timestamp).toLocaleString("it-IT")}
                </span>
              </div>
            </div>

            {canVote && (
              <button
                onClick={() => setIsEditingExistingVote(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center"
              >
                <RotateCcw className="w-4 h-4" />
                Modifica le tue Preferenze
              </button>
            )}
          </div>

          {/* Preferences summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Le Tue Preferenze Espresse:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(userVote.selections || {}).map(([role, cands]) => (
                <div key={role} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1 font-medium">{role}</span>
                  <span className="text-sm font-bold text-orange-400">
                    {Array.isArray(cands) ? cands.join(", ") : cands}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivation summary */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Motivazione del Tuo Voto:
            </span>
            {userVote.motivation ? (
              <p className="text-xs text-slate-200 italic leading-relaxed">
                "{userVote.motivation}"
              </p>
            ) : (
              <p className="text-xs text-amber-400/80 italic">
                Nessuna motivazione inserita (Esonero Key Proprietario)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Voting Form (Visible if user hasn't voted yet OR is editing their vote) */}
      {(!userVote || isEditingExistingVote) && (
        <div className="space-y-6">
          {isEditingExistingVote && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <span className="font-semibold">
                Stai modificando il tuo voto già registrato. Salva le modifiche per aggiornare la scheda.
              </span>
              <button
                onClick={() => setIsEditingExistingVote(false)}
                className="underline hover:text-amber-200"
              >
                Annulla Modifica
              </button>
            </div>
          )}

          {/* Roles & Candidates Selection */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Vote className="w-5 h-5 text-orange-400" />
                  Scheda Elettorale: Seleziona i Candidati
                </h2>
                <p className="text-xs text-slate-400">
                  Seleziona fino a <strong>{config?.maxCandidatesPerRole || 1}</strong> preferenza/e per ciascuna carica direzionale.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(Array.isArray(config?.roles) ? config.roles : DEFAULT_ROLE_ELECTION_ROLES).map((roleName) => {
                const roleCands = candidates.filter((c) => c.role === roleName);
                const selectedForRole = selections[roleName] || [];
                const maxPerRole = config?.maxCandidatesPerRole || 1;

                return (
                  <div
                    key={roleName}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          {roleName}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {roleCands.length} candidati disponibili
                        </span>
                      </div>

                      {/* Counter Badge */}
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-center transition ${
                          selectedForRole.length > 0
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        Preferenze: {selectedForRole.length} / {maxPerRole}
                      </span>
                    </div>

                    {/* Candidate Cards Grid */}
                    {roleCands.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-3">
                        Nessun candidato registrato per questo ruolo.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                        {roleCands.map((cand) => {
                          const isSelected = selectedForRole.includes(cand.name);

                          return (
                            <button
                              type="button"
                              key={cand.id}
                              onClick={() => handleToggleCandidate(roleName, cand.name)}
                              disabled={!canVote}
                              className={`p-3.5 rounded-xl text-left border transition relative flex items-start justify-between gap-3 ${
                                isSelected
                                  ? "bg-orange-950/40 border-orange-500 text-slate-100 shadow-md shadow-orange-950/50"
                                  : "bg-slate-950/60 hover:bg-slate-900/80 border-slate-800 text-slate-300"
                              }`}
                            >
                              <div>
                                <span className={`font-bold text-sm block ${isSelected ? "text-orange-300" : "text-slate-200"}`}>
                                  {cand.name}
                                </span>
                                {cand.notes && (
                                  <span className="text-[11px] text-slate-400 block mt-0.5">
                                    {cand.notes}
                                  </span>
                                )}
                              </div>

                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                  isSelected
                                    ? "bg-orange-500 border-orange-400 text-slate-950"
                                    : "border-slate-700 bg-slate-900"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Motivation Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-400" />
                Motivazione al Voto
                {effectiveIsOwner ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Facoltativa (Key Proprietario)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Obbligatoria *
                  </span>
                )}
              </label>

              <span className="text-xs text-slate-500 font-mono">
                {motivation.length} caratteri
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {effectiveIsOwner
                ? "In quanto Proprietario o possessore di Key Proprietario, la motivazione è facoltativa. Puoi lasciarla vuota o inserire una nota di accompagnamento."
                : "Ai sensi del regolamento direzionale, è richiesto esplicitare la motivazione a supporto delle preferenze espresse per garantire la trasparenza dello scrutinio (minimo 5 caratteri)."}
            </p>

            <textarea
              rows={4}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              disabled={!canVote}
              placeholder={
                effectiveIsOwner
                  ? "Motivazione facoltativa per le tue scelte..."
                  : "Spiega brevemente la motivazione del tuo voto per i candidati scelti..."
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 leading-relaxed"
            />
          </div>

          {/* Submit Action Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Assicurati di aver verificato le cariche votate prima di procedere con la conferma definitiva.
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={!canVote || submitting}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                canVote
                  ? "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
              {isEditingExistingVote ? "Conferma e Aggiorna Voto" : "Conferma ed Invia Scheda Elettorale"}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
                <Vote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Conferma Invio Scheda Elettorale
                </h3>
                <span className="text-xs text-slate-400">
                  Riepilogo finale delle preferenze espresse
                </span>
              </div>
            </div>

            {/* Choices recap */}
            <div className="max-h-60 overflow-y-auto space-y-2 py-2 pr-1">
              {Object.entries(selections).filter(([_, c]) => Array.isArray(c) && (c as string[]).length > 0).length === 0 ? (
                <p className="text-xs text-rose-400 font-semibold italic">
                  Nessuna preferenza selezionata!
                </p>
              ) : (
                Object.entries(selections)
                  .filter(([_, c]) => Array.isArray(c) && (c as string[]).length > 0)
                  .map(([role, cands]) => (
                    <div key={role} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                      <span className="text-slate-400 font-medium block">{role}:</span>
                      <span className="font-bold text-orange-400">
                        {(cands as string[]).join(", ")}
                      </span>
                    </div>
                  ))
              )}

              {/* Motivation check */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs mt-2">
                <span className="text-slate-400 font-medium block">Motivazione:</span>
                {motivation.trim() ? (
                  <span className="text-slate-200 italic">"{motivation.trim()}"</span>
                ) : effectiveIsOwner ? (
                  <span className="text-amber-400/80 italic">Esonerata (Key Proprietario)</span>
                ) : (
                  <span className="text-rose-400 font-bold">Mancante (Obbligatoria)</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSubmitVote}
                disabled={submitting}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-600/30"
              >
                <Check className="w-4 h-4" />
                {submitting ? "Invio in corso..." : "Invia Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
