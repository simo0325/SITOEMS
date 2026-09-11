import React, { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Unlock,
  Copy,
  Check,
  Server,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  Globe,
} from "lucide-react";
import { DiscordUserSession } from "../types.js";

interface DiscordBotAdminProps {
  adminToken: string;
  sessionInfo?: any;
}

interface DiscordConfigState {
  clientId: string;
  clientSecret: string;
  botToken: string;
  guildId: string;
  ownerRoleName: string;
  ownerRoleId: string;
  autoSyncEnabled: boolean;
  canonicalUrl?: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
}

export default function DiscordBotAdmin({ adminToken, sessionInfo }: DiscordBotAdminProps) {
  const [config, setConfig] = useState<DiscordConfigState>({
    clientId: "",
    clientSecret: "",
    botToken: "",
    guildId: "",
    ownerRoleName: "Proprietario",
    ownerRoleId: "",
    autoSyncEnabled: true,
    canonicalUrl: "",
  });
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    botTag?: string;
    guildName?: string;
    memberCount?: number;
    rolesCount?: number;
    hasServerMembersIntent?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Protected Owner Key state
  const [ownerKeyData, setOwnerKeyData] = useState<string | null>(null);
  const [ownerKeyError, setOwnerKeyError] = useState<string | null>(null);
  const [isLoadingOwnerKey, setIsLoadingOwnerKey] = useState<boolean>(false);
  const [showOwnerKey, setShowOwnerKey] = useState<boolean>(false);
  const [copiedOwnerKey, setCopiedOwnerKey] = useState<boolean>(false);

  // Show/Hide Secret inputs & Copy States
  const [showSecrets, setShowSecrets] = useState<boolean>(false);
  const [copiedRedirectIndex, setCopiedRedirectIndex] = useState<number | null>(null);
  const [copiedAllRedirects, setCopiedAllRedirects] = useState<boolean>(false);

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const currentHost = typeof window !== "undefined" ? window.location.host : "";
  const canonicalUri = config.canonicalUrl && config.canonicalUrl.startsWith("http")
    ? `${config.canonicalUrl.replace(/\/$/, "")}/auth/callback/discord`
    : null;

  // Compute all required redirect variations for Discord Developer Portal
  const standardRedirects = useMemo(() => {
    const list: string[] = [];
    if (canonicalUri) list.push(canonicalUri);
    if (currentOrigin) list.push(`${currentOrigin}/auth/callback/discord`);
    if (currentHost) {
      list.push(`https://${currentHost}/auth/callback/discord`);
      list.push(`http://${currentHost}/auth/callback/discord`);
      if (currentHost.startsWith("www.")) {
        const noWww = currentHost.replace(/^www\./, "");
        list.push(`https://${noWww}/auth/callback/discord`);
        list.push(`http://${noWww}/auth/callback/discord`);
      } else if (!currentHost.match(/^\d+\.\d+\.\d+\.\d+/) && !currentHost.includes("localhost")) {
        list.push(`https://www.${currentHost}/auth/callback/discord`);
        list.push(`http://www.${currentHost}/auth/callback/discord`);
      }
    }
    list.push("https://ais-dev-f7ddu6bz7ere7rk53fnhvp-765009000401.europe-west2.run.app/auth/callback/discord");
    list.push("https://ais-pre-f7ddu6bz7ere7rk53fnhvp-765009000401.europe-west2.run.app/auth/callback/discord");
    return Array.from(new Set(list));
  }, [canonicalUri, currentOrigin, currentHost]);

  const redirectUri = canonicalUri || `${currentOrigin}/auth/callback/discord`;

  // Fetch initial config and status
  useEffect(() => {
    loadBotConfig();
    fetchOwnerKey();
  }, [adminToken]);

  const loadBotConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/discord/bot/config", {
        headers: {
          Authorization: `Bearer ${adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken")}`,
        },
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig((prev) => ({
          ...prev,
          ...data.config,
        }));
        setIsConfigured(Boolean(data.isConfigured));
      }
    } catch (err: any) {
      console.error("Errore caricamento config Bot Discord:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOwnerKey = async () => {
    setIsLoadingOwnerKey(true);
    setOwnerKeyError(null);
    try {
      const token = adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken") || "";
      const res = await fetch("/api/admin/owner-key", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.ownerKey) {
        setOwnerKeyData(data.ownerKey);
      } else {
        setOwnerKeyError(data.error || "Accesso negato: Funzione riservata esclusivamente al ruolo Proprietario.");
      }
    } catch (err: any) {
      setOwnerKeyError("Impossibile verificare la chiave Proprietario.");
    } finally {
      setIsLoadingOwnerKey(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/discord/bot/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken")}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", message: data.message || "Configurazione salvata con successo!" });
        setIsConfigured(true);
        loadBotConfig();
      } else {
        throw new Error(data.error || "Errore salvataggio configurazione");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Errore di rete durante il salvataggio." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/discord/bot/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken")}`,
        },
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Connessione riuscita con il server "${data.guildName}"! Trovati ${data.rolesCount} ruoli e ${data.memberCount} membri.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Test fallito. Verifica Token e Guild ID.",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: "Errore di connessione con il backend." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncGuildMembers = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/discord/sync-guild-members", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken")}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Sincronizzazione completata con ${data.syncedCount} membri!`,
        });
        loadBotConfig();
      } else {
        throw new Error(data.error || "Errore durante la sincronizzazione");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Errore durante la sincronizzazione." });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner: Status & Overview */}
      <div className="bg-gradient-to-r from-[#1A1D2D] via-[#161826] to-[#0E1017] border border-[#5865F2]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shadow-inner shrink-0">
              <Bot size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30">
                  Integrazione Discord Ufficiale
                </span>
                {isConfigured ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Configurato
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle size={12} /> In attesa di configurazione
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                Centro di Controllo Bot Discord EMS
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Gestione automatica degli accessi e sincronizzazione in tempo reale dei ruoli dal server Discord EMS alla gerarchia e votazioni.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.botToken}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
              Test Connessione
            </button>
            <button
              onClick={handleSyncGuildMembers}
              disabled={isSyncing || !isConfigured}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#5865F2]/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizza Gerarchia
            </button>
          </div>
        </div>

        {/* Diagnostic Results Card if Tested */}
        {testResult && (
          <div
            className={`mt-6 p-4 rounded-2xl border text-xs leading-relaxed transition-all ${
              testResult.success
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-2">
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.success ? "Diagnostica Bot Conclusa con Successo" : "Errore Diagnostica Bot"}</span>
            </div>
            {testResult.success ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-300">
                <div className="bg-black/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Bot Tag:</span>
                  <strong className="text-white">{testResult.botTag}</strong>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Nome Server:</span>
                  <strong className="text-white">{testResult.guildName}</strong>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Ruoli Rilevati:</span>
                  <strong className="text-white">{testResult.rolesCount} ruoli</strong>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Server Members Intent:</span>
                  <strong className="text-emerald-400">Abilitato</strong>
                </div>
              </div>
            ) : (
              <p>{testResult.error || testResult.message}</p>
            )}
          </div>
        )}

        {/* Global Feedback notification */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs flex items-center justify-between shadow-lg animate-fade-in ${
              feedback.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/60 border-rose-500/40 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Grid: Protected Owner Key & Live Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protected Owner Key Card */}
        <div className="lg:col-span-1 bg-[#141620] border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chiave Proprietario</h3>
                  <p className="text-[11px] text-amber-400 font-semibold">Riservata al Ruolo Proprietario</p>
                </div>
              </div>
              <ShieldCheck size={22} className="text-amber-400" />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              La Chiave Proprietario consente il controllo di emergenza del sistema. È accessibile <strong>esclusivamente</strong> agli utenti con il ruolo <strong>Proprietario</strong> nel server Discord.
            </p>

            {isLoadingOwnerKey ? (
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-xs text-slate-400">
                <RefreshCw size={14} className="animate-spin text-amber-400" />
                Verifica permessi Proprietario...
              </div>
            ) : ownerKeyData ? (
              <div className="space-y-3">
                <div className="p-3 bg-black/60 border border-amber-500/40 rounded-2xl flex items-center justify-between">
                  <div className="font-mono text-sm tracking-wider font-bold text-amber-300 select-all">
                    {showOwnerKey ? ownerKeyData : "••••••••••••••••••••"}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowOwnerKey(!showOwnerKey)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title={showOwnerKey ? "Nascondi" : "Mostra"}
                    >
                      {showOwnerKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ownerKeyData, setCopiedOwnerKey)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors"
                      title="Copia Chiave"
                    >
                      {copiedOwnerKey ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Ruolo Proprietario verificato e convalidato!
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
                <Lock size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white mb-1">Accesso Bloccato</span>
                  {ownerKeyError || "Non possiedi il ruolo Proprietario nel server Discord per visualizzare la chiave."}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-400 italic">
            * Con il nuovo login Discord, non è più necessario inserire la chiave manualmente: il bot rileva automaticamente il ruolo Proprietario.
          </div>
        </div>

        {/* OAuth2 Redirect URI & Quick Instructions */}
        <div className="lg:col-span-2 bg-[#141620] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2]">
                  <ExternalLink size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configurazione Discord Developer Portal</h3>
                  <p className="text-[11px] text-slate-400">Parametri OAuth2 e Gestione Redirect URI</p>
                </div>
              </div>
              <a
                href={`https://discord.com/developers/applications/${config.clientId || "1529792010603466883"}/oauth2`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 rounded-xl text-xs font-bold text-[#5865F2] flex items-center gap-1.5 transition-colors"
              >
                Apri OAuth2 App su Discord <ExternalLink size={12} />
              </a>
            </div>

            {/* Explanatory Notice for VPS Deployments */}
            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <HelpCircle size={16} className="text-indigo-400 shrink-0" />
                <span>Risoluzione errore "URI di reindirizzamento OAuth2 non valido" sulla VPS</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11.5px]">
                Discord richiede la <strong>corrispondenza esatta</strong> dell'URL. Se ad alcuni utenti l'accesso funziona ed altri ricevono l'errore di reindirizzamento, significa che accedono usando un protocollo o dominio diverso (es. <code className="text-amber-300">http://</code> invece di <code className="text-amber-300">https://</code>, con o senza <code className="text-amber-300">www.</code>, o tramite IP della VPS).
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-400">Soluzioni rapide:</span>
                <span className="px-2 py-0.5 bg-white/10 rounded font-semibold text-emerald-300">1. Imposta l'URL Ufficiale nel modulo sotto</span>
                <span className="text-slate-400">oppure</span>
                <span className="px-2 py-0.5 bg-white/10 rounded font-semibold text-cyan-300">2. Aggiungi tutte le varianti elencate qui su Discord</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Redirect URI da inserire su Discord Developer Portal:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(standardRedirects.join("\n"));
                    setCopiedAllRedirects(true);
                    setTimeout(() => setCopiedAllRedirects(false), 2500);
                  }}
                  className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedAllRedirects ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copiedAllRedirects ? "Tutti i Redirect Copiati!" : "Copia tutti i Redirect (1 x riga)"}
                </button>
              </div>

              {/* List of Redirect URIs */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {standardRedirects.map((uri, idx) => {
                  const isCanonical = config.canonicalUrl && uri.startsWith(config.canonicalUrl);
                  const isCurrent = uri === `${currentOrigin}/auth/callback/discord`;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-black/40 border border-white/10 rounded-xl"
                    >
                      <span className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        isCanonical
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : isCurrent
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-white/5 text-slate-400"
                      }`}>
                        {isCanonical ? "Canonical" : isCurrent ? "Attuale" : uri.startsWith("https") ? "HTTPS" : "HTTP"}
                      </span>
                      <input
                        type="text"
                        readOnly
                        value={uri}
                        className="bg-transparent text-xs font-mono text-cyan-300 flex-1 outline-hidden select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(uri);
                          setCopiedRedirectIndex(idx);
                          setTimeout(() => setCopiedRedirectIndex(null), 2500);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedRedirectIndex === idx ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        {copiedRedirectIndex === idx ? "Copiato!" : "Copia"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-2">
              <div className="bg-[#1A1D2D] p-3 rounded-2xl border border-white/5">
                <span className="font-bold text-[#5865F2] block mb-1">1. OAuth2 Scopes:</span>
                <p className="text-slate-400 text-[11px]">
                  Seleziona <code className="text-white bg-black/40 px-1 py-0.5 rounded">identify</code> e{" "}
                  <code className="text-white bg-black/40 px-1 py-0.5 rounded">guilds.members.read</code>
                </p>
              </div>
              <div className="bg-[#1A1D2D] p-3 rounded-2xl border border-white/5">
                <span className="font-bold text-[#5865F2] block mb-1">2. Bot Privileged Intents:</span>
                <p className="text-slate-400 text-[11px]">
                  Nella sezione <strong>Bot</strong>, attiva l'opzione{" "}
                  <strong className="text-emerald-400">Server Members Intent</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Ultima sincronizzazione automatica:{" "}
              {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString("it-IT") : "Nessuna"}
            </span>
            {config.lastSyncCount !== undefined && (
              <span className="text-indigo-400 font-semibold">{config.lastSyncCount} membri sincronizzati</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSaveConfig}
        className="bg-[#141620] border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Credenziali e Parametri Bot Discord</h3>
              <p className="text-xs text-slate-400">
                Inserisci i dati ottenuti dal tuo bot su Discord Developer Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
            {showSecrets ? "Nascondi Segreti" : "Mostra Segreti"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Canonical App URL / Official Domain */}
          <div className="space-y-2 md:col-span-2 bg-[#1A1D2D]/70 p-4 rounded-2xl border border-indigo-500/30">
            <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe size={15} className="text-indigo-400" />
                URL Ufficiale del Sito / Canonical URL (VPS / Dominio)
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Consigliato per VPS
              </span>
            </label>
            <input
              type="text"
              value={config.canonicalUrl || ""}
              onChange={(e) => setConfig({ ...config, canonicalUrl: e.target.value })}
              placeholder="es. https://miodominio.it oppure http://123.45.67.89:3000"
              className="w-full px-4 py-3 bg-[#0B0C10] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
            />
            <p className="text-[11.5px] text-slate-300 leading-relaxed">
              Imposta qui l'indirizzo principale del tuo sito. In questo modo <strong>tutti gli utenti</strong> che provano ad accedere con Discord useranno sempre l'URL ufficiale registrato nel Discord Developer Portal, evitando errori a chi si connette via <code className="text-amber-300">http://</code>, <code className="text-amber-300">www.</code> o indirizzo IP diretto.
            </p>
          </div>

          {/* Client ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Application ID / Client ID</span>
              <span className="text-[10px] text-slate-500 font-mono">General Information</span>
            </label>
            <input
              type="text"
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
              placeholder="es. 134567890123456789"
              className="w-full px-4 py-3 bg-[#0B0C10] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all"
            />
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Client Secret</span>
              <span className="text-[10px] text-slate-500 font-mono">OAuth2 -&gt; Client Secret</span>
            </label>
            <input
              type={showSecrets ? "text" : "password"}
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              placeholder="Inserisci o modifica il Client Secret..."
              className="w-full px-4 py-3 bg-[#0B0C10] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all"
            />
          </div>

          {/* Bot Token */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Bot Token</span>
              <span className="text-[10px] text-slate-500 font-mono">Bot -&gt; Reset Token</span>
            </label>
            <input
              type={showSecrets ? "text" : "password"}
              value={config.botToken}
              onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
              placeholder="Inserisci o modifica il Bot Token..."
              className="w-full px-4 py-3 bg-[#0B0C10] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all"
            />
          </div>

          {/* Guild ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Guild ID (Server Discord EMS)</span>
              <span className="text-[10px] text-slate-500 font-mono">Tasto dx sul server -&gt; Copia ID Server</span>
            </label>
            <input
              type="text"
              value={config.guildId}
              onChange={(e) => setConfig({ ...config, guildId: e.target.value })}
              placeholder="es. 987654321098765432"
              className="w-full px-4 py-3 bg-[#0B0C10] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all"
            />
          </div>

          {/* Owner Role Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Nome Ruolo Proprietario Discord</span>
              <span className="text-[10px] text-amber-400 font-semibold">Accesso Key Proprietario</span>
            </label>
            <input
              type="text"
              value={config.ownerRoleName}
              onChange={(e) => setConfig({ ...config, ownerRoleName: e.target.value })}
              placeholder="Proprietario"
              className="w-full px-4 py-3 bg-[#0B0C10] border border-amber-500/30 rounded-xl text-white text-sm focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Gli utenti Discord con questo ruolo otterranno i permessi di Proprietario / Master.
            </p>
          </div>

          {/* Auto-Sync Toggle */}
          <div className="space-y-2 flex flex-col justify-end">
            <label className="flex items-center gap-3 p-3.5 bg-[#0B0C10] border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={config.autoSyncEnabled}
                onChange={(e) => setConfig({ ...config, autoSyncEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-[#5865F2] focus:ring-[#5865F2] border-slate-700 bg-slate-900"
              />
              <div>
                <span className="text-xs font-bold text-white block">Sincronizzazione Automatica Periodica</span>
                <span className="text-[11px] text-slate-400">
                  Aggiorna i ruoli e i membri della gerarchia EMS ogni 15 minuti in background
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-[#5865F2] hover:from-indigo-500 hover:to-[#4752C4] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-950/50 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? "Salvataggio..." : "Salva Configurazione Bot"}
          </button>
        </div>
      </form>
    </div>
  );
}
