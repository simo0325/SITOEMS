import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  FileText,
  Check,
  AlertCircle,
  X,
  Download,
  RefreshCw,
  Users,
  Sparkles,
  Clipboard,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  HierarchyMember,
  HierarchyCategoryKey,
  HIERARCHY_CATEGORIES,
  getCategoryForRole,
} from "../types.js";

interface HierarchyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMembers: HierarchyMember[], message: string) => void;
  adminToken?: string;
  currentMembers: HierarchyMember[];
}

export default function HierarchyImportModal({
  isOpen,
  onClose,
  onSuccess,
  adminToken,
  currentMembers,
}: HierarchyImportModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState<string>("");
  const [parsedList, setParsedList] = useState<Partial<HierarchyMember>[]>([]);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to normalize category key
  const detectCategory = (catStr?: string, roleStr?: string): HierarchyCategoryKey => {
    if (catStr) {
      const clean = catStr.toUpperCase().trim().replace(/[\s-]+/g, "_");
      if (clean in HIERARCHY_CATEGORIES) {
        return clean as HierarchyCategoryKey;
      }
      if (clean.includes("PROPRIET") || clean.includes("FOUNDER")) return "PROPRIETARI";
      if (clean.includes("DIRIGENZA_GEN") || clean.includes("GENERALE")) return "DIRIGENZA_GENERALE";
      if (clean.includes("SANITAR")) return "DIRIGENZA_SANITARIA";
      if (clean.includes("SUPERVIS")) return "SUPERVISIONE";
      if (clean.includes("FUNZIONAR") || clean.includes("MEDIC") || clean.includes("PARAMEDIC")) return "FUNZIONARI";
      if (clean.includes("VOLONTAR") || clean.includes("ALLIEV") || clean.includes("TIROCIN")) return "VOLONTARI";
    }
    return getCategoryForRole(roleStr || "");
  };

  // Smart line/row parser
  const parseRowsData = (rows: any[][]): Partial<HierarchyMember>[] => {
    if (!rows || rows.length === 0) return [];

    let startIdx = 0;
    let colNameIdx = 0;
    let colRoleIdx = 1;
    let colCatIdx = -1;
    let colBadgeIdx = -1;
    let colDiscordIdx = -1;

    // Check if first row is header
    const firstRowStr = rows[0].map((c) => String(c || "").toLowerCase().trim());
    const hasHeader = firstRowStr.some((c) =>
      c.includes("nome") || c.includes("ruolo") || c.includes("grado") || c.includes("categoria") || c.includes("badge") || c.includes("membro")
    );

    if (hasHeader) {
      startIdx = 1;
      firstRowStr.forEach((cell, idx) => {
        if (cell.includes("nome") || cell.includes("membro") || cell.includes("cognome")) colNameIdx = idx;
        else if (cell.includes("ruolo") || cell.includes("grado") || cell.includes("qualifica")) colRoleIdx = idx;
        else if (cell.includes("categoria") || cell.includes("reparto") || cell.includes("cat")) colCatIdx = idx;
        else if (cell.includes("badge") || cell.includes("cda") || cell.includes("distintivo")) colBadgeIdx = idx;
        else if (cell.includes("discord") || cell.includes("tag")) colDiscordIdx = idx;
      });
    }

    const results: Partial<HierarchyMember>[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = String(row[colNameIdx] || "").trim();
      let rawRole = colRoleIdx >= 0 ? String(row[colRoleIdx] || "").trim() : "";

      // If line is simple e.g. "Mario Rossi - Primario"
      if (rawName && !rawRole && rawName.includes("-")) {
        const parts = rawName.split("-");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const role = parts.slice(1).join("-").trim();
          if (name && role) {
            results.push({
              name,
              roleName: role,
              categoryKey: detectCategory(undefined, role),
            });
            continue;
          }
        }
      }

      if (!rawName) continue;
      if (!rawRole) rawRole = "Volontario";

      const rawCat = colCatIdx >= 0 ? String(row[colCatIdx] || "").trim() : undefined;
      const rawBadge = colBadgeIdx >= 0 ? String(row[colBadgeIdx] || "").trim() : undefined;
      const rawDiscord = colDiscordIdx >= 0 ? String(row[colDiscordIdx] || "").trim() : undefined;

      results.push({
        name: rawName,
        roleName: rawRole,
        categoryKey: detectCategory(rawCat, rawRole),
        badge: rawBadge && rawBadge !== "-" && rawBadge !== "DEFAULT" ? rawBadge : undefined,
        discordTag: rawDiscord && rawDiscord !== "-" ? rawDiscord : undefined,
      });
    }

    return results;
  };

  // Handle Excel or CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const parsed = parseRowsData(rows);
        if (parsed.length === 0) {
          setErrorMessage("Nessun membro valido trovato nel file caricato. Verifica che ci siano le colonne Nome e Ruolo.");
        } else {
          setParsedList(parsed);
        }
      } catch (err: any) {
        console.error("Errore lettura file:", err);
        setErrorMessage("Impossibile leggere il file: assicurati che sia un foglio Excel (.xlsx, .xls) o CSV valido.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle pasted text (Notes, CSV, TSV)
  const handleParsePastedText = () => {
    setErrorMessage(null);
    if (!pastedText.trim()) {
      setErrorMessage("Incolla prima il testo con i membri della gerarchia.");
      return;
    }

    try {
      // First check if it's JSON
      if (pastedText.trim().startsWith("[") && pastedText.trim().endsWith("]")) {
        const jsonData = JSON.parse(pastedText.trim());
        if (Array.isArray(jsonData)) {
          const parsed = jsonData.map((item: any) => ({
            name: String(item.name || item.Nome || "").trim(),
            roleName: String(item.roleName || item.ruolo || item.Ruolo || item.Grado || "").trim(),
            categoryKey: detectCategory(item.categoryKey || item.categoria || item.Categoria, item.roleName || item.ruolo),
            badge: item.badge || item.Badge,
            discordTag: item.discordTag || item.discord || item.Discord,
          })).filter((m) => m.name && m.roleName);

          if (parsed.length > 0) {
            setParsedList(parsed);
            return;
          }
        }
      }

      // Plain text / TSV / CSV
      const lines = pastedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const rows: string[][] = [];

      for (const line of lines) {
        if (line.includes("\t")) {
          rows.push(line.split("\t").map((c) => c.trim()));
        } else if (line.includes(";")) {
          rows.push(line.split(";").map((c) => c.trim()));
        } else if (line.includes(",") && !line.includes("-")) {
          rows.push(line.split(",").map((c) => c.trim()));
        } else if (line.includes("|")) {
          rows.push(line.split("|").map((c) => c.trim()).filter(Boolean));
        } else {
          rows.push([line]);
        }
      }

      const parsed = parseRowsData(rows);
      if (parsed.length === 0) {
        setErrorMessage("Nessun membro valido trovato nel testo. Usa il formato: 'Nome - Ruolo' oppure colonne separate da Tab/Virgola.");
      } else {
        setParsedList(parsed);
      }
    } catch (err: any) {
      setErrorMessage("Errore nel parsing del testo: " + err.message);
    }
  };

  // Submit parsed list to backend bulk-import API
  const handleConfirmImport = async () => {
    if (parsedList.length === 0) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const token = adminToken || localStorage.getItem("adminToken") || localStorage.getItem("discordToken") || "";

      const res = await fetch("/api/admin/hierarchy/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          members: parsedList,
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Errore durante l'aggiornamento della gerarchia.");
      }

      onSuccess(data.members || [], data.message || `Gerarchia aggiornata con successo! (${parsedList.length} membri inseriti)`);
      onClose();
    } catch (err: any) {
      console.error("Errore salvataggio gerarchia:", err);
      setErrorMessage(err.message || "Errore di connessione durante il salvataggio.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Export current hierarchy to Excel file
  const handleExportExcel = () => {
    try {
      const exportData = currentMembers.map((m, idx) => ({
        "N°": idx + 1,
        "Nome": m.name,
        "Ruolo": m.roleName,
        "Categoria": HIERARCHY_CATEGORIES[m.categoryKey]?.title || m.categoryKey,
        "Badge / CDA": m.badge || "",
        "Discord Tag": m.discordTag || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Gerarchia EMS");
      XLSX.writeFile(workbook, `Gerarchia_EMS_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Errore esportazione Excel:", err);
    }
  };

  // Export current hierarchy to Notes text
  const handleExportNotesText = () => {
    try {
      const lines = currentMembers.map((m) => {
        let line = `${m.name} - ${m.roleName}`;
        if (m.badge) line += ` [${m.badge}]`;
        return line;
      });
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Gerarchia_EMS_Note_${new Date().toISOString().split("T")[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Errore esportazione note:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#111118] border border-slate-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Importa Gerarchia da Note o Excel
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Carica un file Excel/CSV o incolla il tuo foglio note per aggiornare l'organigramma
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {/* Action Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab("file"); setErrorMessage(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "file"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Upload size={14} />
                <span>Carica File (.xlsx, .csv)</span>
              </button>
              <button
                onClick={() => { setActiveTab("paste"); setErrorMessage(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "paste"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <FileText size={14} />
                <span>Incolla Testo Note</span>
              </button>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-emerald-300 text-2xs font-bold cursor-pointer transition-all"
                title="Scarica l'attuale gerarchia in formato Excel"
              >
                <Download size={12} />
                <span>Scarica Excel</span>
              </button>
              <button
                onClick={handleExportNotesText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-2xs font-bold cursor-pointer transition-all"
                title="Scarica l'attuale gerarchia come testo per Note"
              >
                <Download size={12} />
                <span>Scarica Note</span>
              </button>
            </div>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === "file" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-3xl p-8 text-center cursor-pointer transition-all bg-slate-900/30 hover:bg-emerald-950/10 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv, .tsv, .txt"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 group-hover:scale-105 transition-transform mb-3">
                  <Upload size={28} />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">
                    {fileName ? `File selezionato: ${fileName}` : "Clicca o trascina qui il tuo foglio Excel o CSV"}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    Supporta formati <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, <strong>.tsv</strong>
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <HelpCircle size={14} className="text-emerald-400" />
                  <span>Struttura colonne consigliata per Excel:</span>
                </div>
                <p>
                  Colonna 1: <strong>Nome</strong> (es. Simone Rizzus) • Colonna 2: <strong>Ruolo</strong> (es. Primario) • Colonna 3 (opz.): <strong>Badge/CDA</strong> • Colonna 4 (opz.): <strong>Discord Tag</strong>
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Text / Notes */}
          {activeTab === "paste" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label className="font-bold text-white">Incolla qui il tuo foglio note o le righe copiate:</label>
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setPastedText(text);
                      } catch {
                        // ignore
                      }
                    }}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  >
                    <Clipboard size={12} /> Incolla da appunti
                  </button>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Esempi supportati:\nMario Rossi - Primario\nSimone Rizzus - Proprietario EMS [Consiglio di Amministrazione]\nGiuseppe Verdi\tDirettore Sanitario\tDIRIGENZA_SANITARIA\nLuigi Neri; Medico; FUNZIONARI`}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 font-mono resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Sparkles size={14} /> Elabora Righe Note
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs shadow-lg">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedList.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Users size={16} className="text-emerald-400" />
                  <span>Anteprima Membri Riconosciuti ({parsedList.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-bold">Modalità:</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="replace">Sostituisci l'intera Gerarchia</option>
                    <option value="append">Unisci / Aggiungi ai membri esistenti</option>
                  </select>
                </div>
              </div>

              {/* Table Preview Container */}
              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 divide-y divide-slate-800/60 text-xs">
                {parsedList.map((m, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-900/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-slate-500 font-mono text-[10px] w-5 text-right">{idx + 1}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{m.name}</span>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-semibold">{m.roleName}</span>
                          <span>•</span>
                          <span>{m.categoryKey}</span>
                          {m.badge && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{m.badge}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setParsedList((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Rimuovi da questa importazione"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedList.length === 0 || isProcessing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Salvataggio in corso...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Aggiorna Gerarchia ({parsedList.length} Membri)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
