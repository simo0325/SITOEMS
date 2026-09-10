import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  ExternalLink,
  Bot,
  AlertCircle,
  CheckCircle2,
  User,
  Key,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  HelpCircle,
} from "lucide-react";
import { DiscordUserSession } from "../types.js";

interface DiscordAuthGatewayProps {
  targetPortalName: "voter" | "admin";
  onVerified: (session: DiscordUserSession) => void;
  onCancel: () => void;
}

export default function DiscordAuthGateway({
  targetPortalName,
  onVerified,
  onCancel,
}: DiscordAuthGatewayProps) {
  const [tokenInput, setTokenInput] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isOpeningDiscord, setIsOpeningDiscord] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [botConfigured, setBotConfigured] = useState<boolean>(true);
  const [authUrl, setAuthUrl] = useState<string>("");
  const [showEmergencyToken, setShowEmergencyToken] = useState<boolean>(false);
  const [clientId, setClientId] = useState<string>("1529792010603466883");
  const [redirectUri, setRedirectUri] = useState<string>(`${window.location.origin}/auth/callback/discord`);
  const [suggestedRedirects, setSuggestedRedirects] = useState<string[]>([
    "https://ais-dev-f7ddu6bz7ere7rk53fnhvp-765009000401.europe-west2.run.app/auth/callback/discord",
    "https://ais-pre-f7ddu6bz7ere7rk53fnhvp-765009000401.europe-west2.run.app/auth/callback/discord",
  ]);
  const [showRedirectGuide, setShowRedirectGuide] = useState<boolean>(false);
  const [copiedUrlIndex, setCopiedUrlIndex] = useState<number | null>(null);

  // Load auth URL and check if Discord Bot is configured
  useEffect(() => {
    const originParam = encodeURIComponent(window.location.origin);
    fetch(`/api/discord/auth-url?origin=${originParam}`)
      .then((res) => res.json())
      .then((data) => {
        setBotConfigured(Boolean(data.configured));
        if (data.clientId) {
          setClientId(data.clientId);
        }
        if (data.redirectUri) {
          setRedirectUri(data.redirectUri);
        }
        if (data.allSuggestedRedirects && Array.isArray(data.allSuggestedRedirects)) {
          setSuggestedRedirects(data.allSuggestedRedirects);
        }
        if (data.authUrl) {
          setAuthUrl(data.authUrl);
        }
      })
      .catch((err) => {
        console.error("Errore recupero Discord auth URL:", err);
      });
  }, []);

  // Listen for OAuth2 popup postMessage response
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Security check: ensure event has expected structure
      if (event.data && typeof event.data === "object") {
        if (event.data.type === "OAUTH_AUTH_SUCCESS" && event.data.authType === "discord") {
          const session = event.data.session;
          const token = event.data.token;

          setIsOpeningDiscord(false);
          setErrorMessage(null);
          setSuccessMessage(`Accesso riuscito! Benvenuto ${session.username} (${session.roleName})`);

          // Save persistence
          localStorage.setItem("discordToken", token);
          localStorage.setItem("discordUserSession", JSON.stringify(session));

          const cleanRole = (session.roleName || "").toLowerCase();
          if (session.isMaster || cleanRole.includes("proprietario") || cleanRole.includes("direttore")) {
            localStorage.setItem("adminToken", token);
          }

          setTimeout(() => {
            onVerified(session);
          }, 800);
        } else if (event.data.type === "OAUTH_AUTH_ERROR") {
          setIsOpeningDiscord(false);
          setErrorMessage(event.data.error || "Accesso annullato o non autorizzato dal server Discord EMS.");
        }
      }
    };

    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [onVerified]);

  // Open the Discord OAuth2 authorization popup
  const handleDiscordLogin = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsOpeningDiscord(true);

    const targetUrl = authUrl || "/auth/callback/discord";
    const width = 520;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      targetUrl,
      "DiscordAuthPopup",
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      setIsOpeningDiscord(false);
      setErrorMessage("Il browser ha bloccato la finestra popup. Abilita i popup per questo sito e riprova.");
    }
  };

  // Fallback / Emergency Token Verification (Master Key or existing token)
  const handleVerifyManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = tokenInput.trim();
    if (!clean) {
      setErrorMessage("Inserisci la Chiave Proprietario o il Token di Accesso.");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/discord/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenInput: clean }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Token non valido o scaduto.");
      }

      setSuccessMessage(data.message || `Accesso autorizzato per ${data.userSession.username} (${data.userSession.roleName})`);

      localStorage.setItem("discordToken", data.token);
      localStorage.setItem("discordUserSession", JSON.stringify(data.userSession));

      if (
        data.userSession?.isMaster ||
        data.userSession?.roleName === "Proprietario" ||
        data.userSession?.roleName === "Vice Proprietario"
      ) {
        localStorage.setItem("adminToken", data.token);
      }

      setTimeout(() => {
        onVerified(data.userSession);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "Errore durante la verifica.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Fast test login as Proprietario (useful during development / initial configuration)
  const handleQuickOwnerTest = async () => {
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/discord/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asOwner: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("discordToken", data.token);
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("discordUserSession", JSON.stringify(data.userSession));
        setSuccessMessage("Accesso simulato effettuato come Proprietario!");
        setTimeout(() => onVerified(data.userSession), 600);
      } else {
        throw new Error(data.error || "Errore login dev");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Errore simulazione");
    } finally {
      setIsVerifying(false);
    }
  };

  const portalTitle = targetPortalName === "voter" ? "Portale Elettore" : "Area Amministrazione";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-xl w-full bg-[#11121A] border border-[#5865F2]/40 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden relative"
      >
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-[#5865F2] via-purple-600 to-indigo-600" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] shadow-inner shrink-0">
                <Bot size={28} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5865F2] bg-[#5865F2]/15 px-2.5 py-0.5 rounded-full border border-[#5865F2]/30">
                  Controllo Ruoli Discord Bot
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white mt-1">
                  Accesso EMS: {portalTitle}
                </h2>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} /> Home
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 flex items-start gap-2.5 animate-shake">
              <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5 text-white">Accesso non riuscito:</span>
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5 text-white">Autorizzazione Riuscita!</span>
                {successMessage}
              </div>
            </div>
          )}

          {/* Discord Bot Main Login Action */}
          <div className="bg-gradient-to-b from-[#181A26] to-[#12131D] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-inner">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">
                Verifica Istantanea Ruoli Discord
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Clicca sul pulsante sottostante per accedere con il tuo account Discord. Il nostro Bot verificherà in tempo reale i tuoi <strong>ruoli e gradi ufficiali</strong> nel server EMS.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDiscordLogin}
                disabled={isOpeningDiscord}
                className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-[#5865F2]/25 flex items-center justify-center gap-3 cursor-pointer transition-all transform active:scale-98"
              >
                {isOpeningDiscord ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>In attesa di autorizzazione Discord...</span>
                  </>
                ) : (
                  <>
                    <Bot size={20} />
                    <span>Accedi con Discord</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Sincronizzazione automatica e protezione ruoli garantita dal Bot EMS</span>
            </div>
          </div>

          {/* Guide & Tool for "URI di reindirizzamento OAuth2 non valido" */}
          <div className="bg-[#141624] border border-[#5865F2]/30 rounded-2xl p-4.5 text-xs space-y-3 shadow-lg">
            <button
              type="button"
              onClick={() => setShowRedirectGuide(!showRedirectGuide)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <HelpCircle size={16} className="text-[#5865F2] shrink-0" />
                <span className="group-hover:text-white transition-colors">
                  Vedi l'errore "URI di reindirizzamento OAuth2 non valido"? Clicca qui per risolverlo
                </span>
              </div>
              {showRedirectGuide ? (
                <ChevronUp size={16} className="text-indigo-400 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-indigo-400 shrink-0" />
              )}
            </button>

            {showRedirectGuide && (
              <div className="pt-2 space-y-3.5 border-t border-white/10 text-slate-300 animate-fade-in">
                <p className="text-[11.5px] leading-relaxed">
                  Discord rifiuta l'accesso se l'URL di reindirizzamento (Redirect URI) dell'app non è stato esplicitamente inserito nel <strong>Discord Developer Portal</strong>. È una protezione obbligatoria di Discord.
                </p>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    1. Copia l'URL di reindirizzamento:
                  </span>
                  {suggestedRedirects.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-black/50 border border-white/10 rounded-xl"
                    >
                      <input
                        type="text"
                        readOnly
                        value={url}
                        className="bg-transparent text-[11px] font-mono text-cyan-300 flex-1 outline-hidden select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          setCopiedUrlIndex(idx);
                          setTimeout(() => setCopiedUrlIndex(null), 2500);
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedUrlIndex === idx ? (
                          <>
                            <Check size={12} className="text-emerald-400" /> Copiato!
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copia URL
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2 text-[11.5px]">
                  <span className="font-bold text-white block">2. Incollalo su Discord Developer Portal:</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                    <li>
                      Apri la pagina dell'app:&nbsp;
                      <a
                        href={`https://discord.com/developers/applications/${clientId}/oauth2`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5865F2] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        Discord Portal &gt; OAuth2 <ExternalLink size={11} />
                      </a>
                    </li>
                    <li>Scorri alla sezione <strong>Redirects</strong> e clicca <strong>"Add Redirect"</strong>.</li>
                    <li>Incolla l'URL copiato e clicca il pulsante blu <strong>"Save Changes"</strong> in fondo alla pagina.</li>
                    <li>Torna qui e clicca di nuovo su <strong>"Accedi con Discord"</strong>!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Quick Bot Configuration / Dev Hint if not yet configured */}
          {!botConfigured && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertCircle size={16} />
                <span>Bot Discord in attesa di configurazione iniziale</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                Le credenziali Discord (Client ID e Bot Token) non sono ancora state impostate. Puoi configurarle all'interno di <strong>Amministrazione &gt; Bot Discord</strong> oppure effettuare l'accesso di prova come Proprietario.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleQuickOwnerTest}
                  disabled={isVerifying}
                  className="w-full py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  Accedi come Proprietario (Master EMS - Prova Rapida)
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Emergency Access / Master Key */}
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0D0E15]">
            <button
              type="button"
              onClick={() => setShowEmergencyToken(!showEmergencyToken)}
              className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Key size={14} className="text-amber-400" />
                Accesso di Emergenza / Chiave Proprietario Manuale
              </span>
              {showEmergencyToken ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showEmergencyToken && (
              <form onSubmit={handleVerifyManualToken} className="p-4 pt-0 space-y-3 border-t border-white/5">
                <p className="text-[11px] text-slate-400">
                  Se riscontri problemi con Discord, puoi inserire qui la <strong>Chiave Proprietario</strong> o un token manuale pre-esistente.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="es. EMS-2410PROP o token manuale..."
                    className="flex-1 px-3 py-2.5 bg-[#08080C] border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-amber-400 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    {isVerifying ? "Verifica..." : "Entra"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
