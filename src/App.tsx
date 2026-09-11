import React, { useState, useEffect } from "react";
import { Home, Vote, Shield, CheckCircle, Info, ShieldCheck, LogOut, Award, FileText, Menu, ChevronDown, Key, Sparkles, Clock, Camera, FileSpreadsheet, Bot } from "lucide-react";
import LandingPage from "./components/LandingPage.js";
import VoterPortal from "./components/VoterPortal.js";
import AdminPortal from "./components/AdminPortal.js";
import EmsHierarchy from "./components/EmsHierarchy.js";
import CandidaturaPortal from "./components/CandidaturaPortal.js";
import CdaPortal from "./components/CdaPortal.js";
import ExcelGerarchiaPortal from "./components/ExcelGerarchiaPortal.js";
import DiscordAuthGateway from "./components/DiscordAuthGateway.js";
import NotificationMenu from "./components/NotificationMenu.js";
import HospitalDinoGame from "./components/HospitalDinoGame.js";
import RoleElectionPortal from "./components/RoleElectionPortal.js";
import emsLogo from "./assets/images/ems_logo_1784649117886.jpg";
import { DiscordUserSession, getUserEffectiveGrade, getSingleRoleGrade, canAccessRoleElection, canAccessCdaPortal, getRoleBadgeStyle, isCdaOnlyRoleName } from "./types.js";

type AppMode = "home" | "voter" | "admin" | "hierarchy" | "candidatura" | "cda" | "excel_gerarchia" | "role_election";

function getInitialStateFromUrl(): { mode: AppMode; isGameActive: boolean } {
  if (typeof window === "undefined") return { mode: "home", isGameActive: false };
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (search.includes("game=true") || path.includes("hospitaldino") || path === "/game") {
    return { mode: "home", isGameActive: true };
  }
  if (path.includes("excel-gerarchia") || path.includes("excelgerarchia") || path.includes("foglio-gerarchia")) {
    return { mode: "excel_gerarchia", isGameActive: false };
  }
  if (path.includes("ruoli") || path.includes("role-election") || path.includes("elezioni-ruoli")) {
    return { mode: "role_election", isGameActive: false };
  }
  if (path.includes("cda")) {
    return { mode: "cda", isGameActive: false };
  }
  if (path.includes("gerarchia") || path.includes("hierarchy")) {
    return { mode: "hierarchy", isGameActive: false };
  }
  if (path.includes("candidatura")) {
    return { mode: "candidatura", isGameActive: false };
  }
  if (path.includes("votazioni") || path.includes("voter") || path.includes("voto")) {
    return { mode: "voter", isGameActive: false };
  }
  if (path.includes("admin")) {
    return { mode: "admin", isGameActive: false };
  }

  return { mode: "home", isGameActive: false };
}

function getUrlForMode(mode: AppMode, isGameActive: boolean): string {
  if (isGameActive) return "/HospitalDino";
  switch (mode) {
    case "excel_gerarchia":
      return "/ExcelGerarchia";
    case "role_election":
      return "/ElezioniRuoli";
    case "cda":
      return "/CDA";
    case "hierarchy":
      return "/Gerarchia";
    case "candidatura":
      return "/Candidatura";
    case "voter":
      return "/Votazioni";
    case "admin":
      return "/Admin";
    case "home":
    default:
      return "/";
  }
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(() => getInitialStateFromUrl().mode);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);
  const [isGameActive, setIsGameActive] = useState<boolean>(() => getInitialStateFromUrl().isGameActive);

  // Sync initial URL or mode changes to canonical URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = "Sito EMS";
    const targetUrl = getUrlForMode(mode, isGameActive);
    if (window.location.pathname !== targetUrl) {
      window.history.replaceState({}, "Sito EMS", targetUrl);
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const state = getInitialStateFromUrl();
      setIsGameActive(state.isGameActive);
      setMode(state.mode);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("simorizzo.scout@gmail.com");
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 3000);
  };

  // Bumping configVersion triggers a re-fetch in the VoterPortal when admin updates candidates or settings
  const [configVersion, setConfigVersion] = useState<number>(0);

  // Discord role verification session state
  const [discordSession, setDiscordSession] = useState<DiscordUserSession | null>(() => {
    const saved = localStorage.getItem("discordUserSession");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Real-time calculation of remaining test token session time
  const [remainingTestTime, setRemainingTestTime] = useState<string | null>(null);

  useEffect(() => {
    if (!discordSession || !discordSession.isTestToken) {
      setRemainingTestTime(null);
      return;
    }

    const updateClock = () => {
      if (!discordSession.expiresAt) {
        setRemainingTestTime("Illimitato (Senza Scadenza)");
        return;
      }

      const diffMs = new Date(discordSession.expiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setRemainingTestTime("Scaduto");
        handleDiscordLogout();
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}g`);
        if (hours > 0 || days > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);

        setRemainingTestTime(parts.join(" "));
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [discordSession]);

  // Grade check for Admin Area access (>= Vice Direttore Sanitario)
  const userEffectiveGrade = discordSession ? getUserEffectiveGrade(discordSession) : 0;
  const minAdminGrade = getSingleRoleGrade("vice direttore sanitario");
  const canAccessAdmin = userEffectiveGrade >= minAdminGrade;
  const canAccessElection = discordSession ? canAccessRoleElection(discordSession) : false;
  const canAccessCda = canAccessCdaPortal(discordSession);

  useEffect(() => {
    if (mode === "admin" && !canAccessAdmin) {
      setMode("home");
    }
    if (mode === "cda" && discordSession && !canAccessCda) {
      setMode("home");
    }
  }, [mode, canAccessAdmin, canAccessCda, discordSession]);

  const handleConfigChanged = () => {
    setConfigVersion((prev) => prev + 1);
  };

  const handleNavigate = (newMode: AppMode) => {
    setIsGameActive(false);
    setMode(newMode);
    const targetUrl = getUrlForMode(newMode, false);
    if (typeof window !== "undefined" && window.location.pathname !== targetUrl) {
      window.history.pushState({}, document.title, targetUrl);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDiscordLogout = () => {
    localStorage.removeItem("discordToken");
    localStorage.removeItem("discordUserSession");
    localStorage.removeItem("adminToken");
    setDiscordSession(null);
    handleNavigate("home");
  };

  // Periodically verify that current employee token is still active and not revoked
  useEffect(() => {
    if (!discordSession) return;

    const verifyActiveSession = async () => {
      const token = localStorage.getItem("discordToken") || localStorage.getItem("adminToken");

      // Master session is permanent and does not expire
      if (discordSession.isMaster) {
        return;
      }

      if (!token) {
        handleDiscordLogout();
        return;
      }

      try {
        const response = await fetch("/api/discord/session", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          if (discordSession.isMaster) return;
          // Token was revoked or deleted by admin! Force logout.
          handleDiscordLogout();
        } else if (response.ok) {
          const data = await response.json();
          if (data.session) {
            setDiscordSession((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(data.session)) {
                return data.session;
              }
              return prev;
            });
            localStorage.setItem("discordUserSession", JSON.stringify(data.session));
          }
        }
      } catch (err) {
        // Network error - transient, do not disconnect
      }
    };

    verifyActiveSession();
    const intervalId = setInterval(verifyActiveSession, 15000);
    return () => clearInterval(intervalId);
  }, [discordSession]);

  const getModeLabel = (m: AppMode) => {
    switch (m) {
      case "home": return "Home";
      case "hierarchy": return "Gerarchia EMS";
      case "candidatura": return "Candidatura";
      case "cda": return "Consiglio CDA";
      case "excel_gerarchia": return "Excel Gerarchia";
      case "role_election": return "Votazione Ruoli";
      case "voter": return "Portale Elettore";
      case "admin": return "Area Admin";
    }
  };

  if (isGameActive) {
    if (!discordSession || discordSession.isTestToken) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans flex flex-col items-center justify-center p-4">
          <div className="bg-[#111118] border border-pink-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/30 rounded-2xl flex items-center justify-center mx-auto text-pink-400 shadow-lg shadow-pink-950/40">
              <Camera size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Accesso Riservato Discord</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Il gioco <strong className="text-pink-400">Filippa Runner 2D</strong> è accessibile esclusivamente agli utenti che hanno effettuato l'accesso con Discord.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setIsGameActive(false);
                  const targetUrl = getUrlForMode(mode, false);
                  if (typeof window !== "undefined" && window.location.pathname !== targetUrl) {
                    window.history.pushState({}, document.title, targetUrl);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Torna Indietro
              </button>
              <button
                onClick={() => {
                  setIsGameActive(false);
                  handleNavigate("voter");
                }}
                className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
              >
                Accedi con Discord
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <HospitalDinoGame
        onClose={() => {
          setIsGameActive(false);
          const targetUrl = getUrlForMode(mode, false);
          if (typeof window !== "undefined" && window.location.pathname !== targetUrl) {
            window.history.pushState({}, document.title, targetUrl);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans flex flex-col antialiased w-full max-w-full overflow-x-hidden relative">
      {/* Dynamic Header / Nav bar */}
      <header className="sticky top-0 z-50 bg-[#111116]/95 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-8 py-2 sm:py-3 w-full max-w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center justify-center gap-2 sm:gap-4 text-center md:text-left">
          {/* Logo / Title (Left) */}
          <div 
            onClick={() => handleNavigate("home")}
            className="flex items-center justify-center md:justify-start gap-2.5 sm:gap-3 cursor-pointer hover:opacity-90 active:scale-98 transition-all shrink-0 max-w-full"
          >
            <img 
              src={emsLogo} 
              alt="EMS Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-slate-700/80 shadow-md shadow-red-950/30 shrink-0" 
            />
            <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0">
              <span className="block text-sm sm:text-base font-black tracking-wider uppercase text-white leading-tight">
                EMS
              </span>
              <span className="block text-[9px] sm:text-[10px] text-red-500 font-extrabold uppercase tracking-wider truncate max-w-[260px] sm:max-w-none">
                SOCCORSO SANITARIO - EMERALS RP 4.0
              </span>
            </div>
          </div>

          {/* Dati del Log / Sessione Utente (Esattamente al Centro del sito) */}
          <div className="flex items-center justify-center w-full text-center my-0.5 md:my-0 min-w-0 px-1">
            {discordSession ? (
              discordSession.isTestToken ? (
                <div 
                  onClick={() => handleNavigate("voter")}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-purple-950/90 border border-purple-500/50 hover:border-purple-400/80 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs shadow-lg shadow-purple-950/50 cursor-pointer transition-all active:scale-95 group text-center mx-auto max-w-full"
                  title="Sessione con Token TEST Attiva - Clicca per aprire il Portale Elettore"
                >
                  <Sparkles size={14} className="text-purple-400 shrink-0 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="text-purple-300 font-bold text-2xs uppercase tracking-wider hidden sm:inline">Token TEST:</span>
                  <span className="font-bold text-white truncate max-w-[130px] sm:max-w-none">
                    {discordSession.username}
                  </span>
                  {(() => {
                    const role = discordSession.roleName || "";
                    if (!role || isCdaOnlyRoleName(role)) return null;
                    const roleBadge = getRoleBadgeStyle(role);
                    return (
                      <span
                        className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-xs transition-all shrink-0 ${roleBadge.className}`}
                        style={roleBadge.style}
                      >
                        {role}
                      </span>
                    );
                  })()}
                  {remainingTestTime && (
                    <span className="text-amber-300 font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 text-[10px] sm:text-[11px] flex items-center gap-1 shrink-0">
                      <Clock size={10} className="text-amber-400 shrink-0" />
                      {remainingTestTime}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDiscordLogout();
                    }}
                    className="text-slate-400 hover:text-rose-400 p-1 ml-0.5 transition-colors cursor-pointer rounded-full hover:bg-white/10 shrink-0"
                    title="Disconnetti Token TEST"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => handleNavigate("voter")}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-[#5865F2]/20 border border-[#5865F2]/40 hover:border-[#5865F2] rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs shadow-lg shadow-indigo-950/50 cursor-pointer transition-all active:scale-95 group text-center mx-auto max-w-full"
                  title="Sessione verificata Discord"
                >
                  {discordSession.avatar ? (
                    <img
                      src={discordSession.avatar}
                      alt={discordSession.username}
                      className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                    />
                  ) : (
                    <Bot size={14} className="text-[#5865F2] shrink-0 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-bold text-white truncate max-w-[130px] sm:max-w-none">
                    {discordSession.username}
                  </span>
                  {(() => {
                    const role = discordSession.roleName || "";
                    if (!role || isCdaOnlyRoleName(role)) return null;
                    const roleBadge = getRoleBadgeStyle(role);
                    return (
                      <span
                        className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-xs transition-all shrink-0 ${roleBadge.className}`}
                        style={roleBadge.style}
                      >
                        {role}
                      </span>
                    );
                  })()}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDiscordLogout();
                    }}
                    className="text-slate-400 hover:text-rose-400 p-1 ml-0.5 transition-colors cursor-pointer rounded-full hover:bg-white/10 shrink-0"
                    title="Disconnetti account Discord"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              )
            ) : (
              <div 
                onClick={() => handleNavigate("voter")}
                className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 bg-slate-900/90 hover:bg-[#5865F2]/10 border border-slate-800 hover:border-[#5865F2]/60 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-300 shadow-md cursor-pointer transition-all active:scale-95 group text-center mx-auto max-w-full"
                title="Accedi con il tuo account Discord"
              >
                <Bot size={14} className="text-[#5865F2] shrink-0 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-slate-300 text-[11px] sm:text-xs">Nessun account connesso</span>
                <span className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-[#5865F2]/50 shadow-sm flex items-center gap-1 shrink-0">
                  Accedi con Discord <Bot size={11} />
                </span>
              </div>
            )}
          </div>

          {/* Navigazione Categorie - Tendina a Comparsa (Destra) e Menu Notifiche */}
          <div className="relative flex items-center justify-center md:justify-end shrink-0 gap-2 sm:gap-2.5">
            {/* Centro Notifiche (Bottone nero con icona gialla) */}
            <NotificationMenu
              discordToken={discordSession?.token}
              adminToken={localStorage.getItem("adminToken")}
              onNavigate={handleNavigate}
            />

            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-red-950/50 border border-red-400/30 cursor-pointer transition-all active:scale-95"
            >
              <Menu size={15} />
              <span>Sezioni: <span className="text-red-100 font-extrabold">{getModeLabel(mode)}</span></span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isNavOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Floating Dropdown Menu (Tendina) */}
            {isNavOpen && (
              <>
                <div 
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" 
                  onClick={() => setIsNavOpen(false)} 
                />
                <div className="fixed sm:absolute inset-x-3 sm:inset-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 max-h-[calc(100vh-4.5rem)] overflow-y-auto sm:w-72 max-w-xs sm:max-w-sm mx-auto sm:mx-0 bg-[#141419] border border-slate-700/90 rounded-2xl shadow-2xl z-[60] p-2 space-y-1 backdrop-blur-2xl animate-fadeIn">
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 mb-1 flex items-center justify-between">
                    <span>Menu Categorie</span>
                    <span className="text-2xs text-red-400 font-bold">{canAccessAdmin ? 7 : 6} Sezioni</span>
                  </div>

                  <button
                    onClick={() => { handleNavigate("home"); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      mode === "home"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/50"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Home size={16} className={mode === "home" ? "text-white" : "text-red-400"} />
                    <span>Home Page</span>
                  </button>

                  <button
                    onClick={() => { handleNavigate("hierarchy"); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      mode === "hierarchy"
                        ? "bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-md shadow-amber-950/50"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Award size={16} className={mode === "hierarchy" ? "text-white" : "text-amber-400"} />
                    <span>Gerarchia EMS</span>
                  </button>

                  <button
                    onClick={() => { handleNavigate("excel_gerarchia"); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      mode === "excel_gerarchia"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <FileSpreadsheet size={16} className={mode === "excel_gerarchia" ? "text-white" : "text-emerald-400"} />
                    <div className="flex items-center justify-between w-full">
                      <span>Excel Gerarchia</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        Sheet
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => { handleNavigate("candidatura"); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      mode === "candidatura"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/50"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <FileText size={16} className={mode === "candidatura" ? "text-white" : "text-blue-400"} />
                    <div className="flex items-center justify-between w-full">
                      <span>Invia Candidatura EMS</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                        ≥ Primario
                      </span>
                    </div>
                  </button>

                  {(!discordSession || canAccessCda) && (
                    <button
                      onClick={() => { handleNavigate("cda"); setIsNavOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        mode === "cda"
                          ? "bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/50"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Award size={16} className={mode === "cda" ? "text-slate-950" : "text-amber-400"} />
                      <span>Sezione CDA</span>
                      <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        CDA
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => { handleNavigate("voter"); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      mode === "voter"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/50"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Vote size={16} className={mode === "voter" ? "text-white" : "text-purple-400"} />
                    <span>Portale Elettore</span>
                  </button>

                  {canAccessElection && (
                    <button
                      onClick={() => { handleNavigate("role_election"); setIsNavOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        mode === "role_election"
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-950/50"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Award size={16} className={mode === "role_election" ? "text-white" : "text-orange-400"} />
                      <div className="flex items-center justify-between w-full">
                        <span>Votazione Ruoli</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                          ≥ Segretario
                        </span>
                      </div>
                    </button>
                  )}

                  {canAccessAdmin && (
                    <button
                      onClick={() => { handleNavigate("admin"); setIsNavOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        mode === "admin"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/50"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Shield size={16} className={mode === "admin" ? "text-white" : "text-indigo-400"} />
                      <span>Area Amministrazione</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Test Token Active Session Alert Banner */}
      {discordSession?.isTestToken && (
        <div className="bg-gradient-to-r from-purple-950 via-[#181028] to-purple-950 border-b border-purple-500/40 px-4 py-2 text-xs text-purple-200 flex items-center justify-center gap-3 shadow-lg flex-wrap z-30">
          <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-purple-300">
            <Sparkles size={15} className="text-purple-400 animate-pulse shrink-0" />
            <span>Sessione attiva con Token TEST</span>
          </div>
          <span className="text-purple-500">•</span>
          <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300 bg-purple-900/60 px-3 py-0.5 rounded-full border border-purple-500/40 shadow-inner">
            <Clock size={13} className="text-amber-400 shrink-0" />
            <span>
              {discordSession.expiresAt
                ? `Tempo Rimanente Sessione: ${remainingTestTime || "Calcolo in corso..."}`
                : "Durata Illimitata (Senza Scadenza)"}
            </span>
          </div>
          <span className="text-purple-300 font-medium hidden sm:inline">
            • Utente: <strong>{discordSession.username}</strong>
            {discordSession.roleName && !isCdaOnlyRoleName(discordSession.roleName) ? ` (${discordSession.roleName})` : ""}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-full overflow-x-hidden">
        {mode === "home" && <LandingPage onNavigate={handleNavigate} canAccessCda={canAccessCda} />}
        
        {mode === "hierarchy" && (
          <EmsHierarchy
            isAdmin={canAccessAdmin}
            adminToken={discordSession?.token}
            discordSession={discordSession}
          />
        )}

        {mode === "excel_gerarchia" && (
          <ExcelGerarchiaPortal
            discordSession={discordSession}
            onNavigate={handleNavigate}
            onSessionUpdated={(session) => setDiscordSession(session)}
          />
        )}

        {mode === "candidatura" && (
          <CandidaturaPortal
            discordSession={discordSession}
            onNavigate={handleNavigate}
          />
        )}

        {mode === "cda" && (
          <CdaPortal
            discordSession={discordSession}
            onSessionUpdated={(session) => setDiscordSession(session)}
          />
        )}

        {mode === "voter" && (
          discordSession ? (
            <VoterPortal configVersion={configVersion} discordSession={discordSession} />
          ) : (
            <DiscordAuthGateway
              targetPortalName="voter"
              onVerified={(session) => setDiscordSession(session)}
              onCancel={() => handleNavigate("home")}
            />
          )
        )}

        {mode === "role_election" && (
          discordSession ? (
            <div className="py-6 px-4">
              <RoleElectionPortal
                userSession={discordSession}
                onOpenDiscordModal={() => handleNavigate("voter")}
              />
            </div>
          ) : (
            <DiscordAuthGateway
              targetPortalName="voter"
              onVerified={(session) => setDiscordSession(session)}
              onCancel={() => handleNavigate("home")}
            />
          )
        )}

        {mode === "admin" && (
          discordSession ? (
            <AdminPortal onConfigChanged={handleConfigChanged} />
          ) : (
            <DiscordAuthGateway
              targetPortalName="admin"
              onVerified={(session) => setDiscordSession(session)}
              onCancel={() => handleNavigate("home")}
            />
          )
        )}
      </main>

      {/* Conditional Footer for Voter/Admin pages */}
      {mode !== "home" && (
        <footer className="bg-[#0a0a0f] border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 font-medium">
          <div className="max-w-6xl mx-auto space-y-3">
            <div className="flex justify-center gap-6 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle size={14} className="text-emerald-400" /> Database Crittografato e Protetto
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Info size={14} className="text-slate-400" /> Voto Anonimo Istituzionale
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap text-slate-500">
              <span>© 2026 EMS - Emergency Medical Services • Emerals RP 4.0 •</span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer transition-colors"
                title="Clicca per copiare l'email: simorizzo.scout@gmail.com"
              >
                Tutti i diritti sono riservati a Simone Rizzus
              </button>
              {emailCopied && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-extrabold animate-pulse">
                  Email copiata: simorizzo.scout@gmail.com!
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase font-bold">
              PORTALE UFFICIALE EMS - UTILIZZATO DALLO STAFF DELL'OSPEDALE PER FUNZIONI AMMINISTRATIVE
            </p>
          </div>
        </footer>
      )}
      {/* Floating Mini Camera Easter Egg Widget - Bottom Left, Home Page Only, Only visible when logged in with Discord */}
      {mode === "home" && Boolean(discordSession && !discordSession.isTestToken) && (
        <div className="fixed bottom-3 left-3 z-40">
          <button
            onClick={() => {
              setIsGameActive(true);
              if (typeof window !== "undefined") {
                window.history.pushState({}, document.title, "/HospitalDino");
              }
            }}
            className="group relative p-2 rounded-xl bg-slate-950/20 hover:bg-slate-900/60 border border-slate-800/30 hover:border-slate-700/60 opacity-30 hover:opacity-100 transition-all duration-300 flex items-center justify-center text-slate-500 hover:text-pink-400 cursor-pointer shadow-sm hover:shadow-lg"
            title="Sperimenta l'Easter Egg 2D!"
          >
            <Camera size={18} className="group-hover:scale-110 transition-transform" />
            <span className="sr-only">Mini Game 2D</span>
            
            {/* Discrete tooltip on hover */}
            <span className="absolute bottom-full left-0 mb-2 hidden group-hover:flex whitespace-nowrap bg-slate-900/95 border border-slate-800 text-slate-300 text-[10px] font-medium px-2.5 py-1 rounded-lg shadow-xl pointer-events-none">
              📹 Gioca a Filippa Runner 2D
            </span>
          </button>
        </div>
      )}
    </div>
  );
}


