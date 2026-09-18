import type { CSSProperties } from "react";

export enum RoleId {
  VOLONTARIO = "volontario",
  V_PRIMARIO = "v_primario",
  PRIMARIO = "primario",
  V_RESPONSABILE_PRESIDIO = "v_responsabile_presidio",
  RESPONSABILE_PRESIDIO = "responsabile_presidio",
  AIUTO_SUPERVISORE = "aiuto_supervisore",
  V_SUPERVISORE = "v_supervisore",
  SUPERVISORE = "supervisore",
  SUPERVISORE_GENERALE = "supervisore_generale",
  SEGRETARIO_DIREZIONE = "segretario_direzione",
  V_DIRETTORE = "v_direttore",
  DIRETTORE = "direttore",
  DIRETTORE_GENERALE = "direttore_generale",
  RESPONSABILE_GENERALE_EMS = "responsabile_generale_ems",
}

export interface Candidate {
  id: string;
  name: string;
  roleId: RoleId;
}

export interface Vote {
  id: string;
  voterFullName: string;
  timestamp: string; // ISO date string
  selections: Record<RoleId, string[]>; // Map of roleId to array of candidate names (or candidate IDs)
}

export interface SiteSettings {
  title: string;
  description: string;
  votingActive: boolean;
  allowMultipleSelection: boolean;
  requireAllRoles: boolean;
  candidatureEnabled?: boolean;
}

export interface GameScore {
  id: string;
  name: string;
  score: number;
  level: number;
  date: string;
}

export interface RoleConfig {
  id: RoleId;
  name: string;
  color: string; // Tailwind color class suffix
  symbol: "star" | "cross" | "crown" | "gem";
  grade: number; // 1 (lowest) to 12 (highest)
}

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  [RoleId.VOLONTARIO]: {
    id: RoleId.VOLONTARIO,
    name: "Volontario",
    color: "gradient-volontario",
    symbol: "star",
    grade: 0,
  },
  [RoleId.V_PRIMARIO]: {
    id: RoleId.V_PRIMARIO,
    name: "V. Primario di Reparto",
    color: "amber-400",
    symbol: "star",
    grade: 1,
  },
  [RoleId.PRIMARIO]: {
    id: RoleId.PRIMARIO,
    name: "Primario di Reparto",
    color: "amber-700",
    symbol: "star",
    grade: 2,
  },
  [RoleId.V_RESPONSABILE_PRESIDIO]: {
    id: RoleId.V_RESPONSABILE_PRESIDIO,
    name: "V. Responsabile Del Presidio",
    color: "orange-400",
    symbol: "star",
    grade: 3,
  },
  [RoleId.RESPONSABILE_PRESIDIO]: {
    id: RoleId.RESPONSABILE_PRESIDIO,
    name: "Responsabile Del Presidio",
    color: "orange-600",
    symbol: "star",
    grade: 4,
  },
  [RoleId.AIUTO_SUPERVISORE]: {
    id: RoleId.AIUTO_SUPERVISORE,
    name: "Assistente Supervisore",
    color: "pink-400",
    symbol: "star",
    grade: 5,
  },
  [RoleId.V_SUPERVISORE]: {
    id: RoleId.V_SUPERVISORE,
    name: "V. Supervisore",
    color: "pink-600",
    symbol: "star",
    grade: 6,
  },
  [RoleId.SUPERVISORE]: {
    id: RoleId.SUPERVISORE,
    name: "Supervisore",
    color: "rose-600",
    symbol: "star",
    grade: 7,
  },
  [RoleId.SUPERVISORE_GENERALE]: {
    id: RoleId.SUPERVISORE_GENERALE,
    name: "Supervisore Generale",
    color: "purple-600",
    symbol: "cross",
    grade: 8,
  },
  [RoleId.SEGRETARIO_DIREZIONE]: {
    id: RoleId.SEGRETARIO_DIREZIONE,
    name: "Segretario Direzione",
    color: "violet-700",
    symbol: "cross",
    grade: 9,
  },
  [RoleId.V_DIRETTORE]: {
    id: RoleId.V_DIRETTORE,
    name: "V. Direttore Sanitario",
    color: "red-500",
    symbol: "crown",
    grade: 10,
  },
  [RoleId.DIRETTORE]: {
    id: RoleId.DIRETTORE,
    name: "Direttore Sanitario",
    color: "red-700",
    symbol: "crown",
    grade: 11,
  },
  [RoleId.DIRETTORE_GENERALE]: {
    id: RoleId.DIRETTORE_GENERALE,
    name: "Direttore Generale",
    color: "cyan-500",
    symbol: "gem",
    grade: 12,
  },
  [RoleId.RESPONSABILE_GENERALE_EMS]: {
    id: RoleId.RESPONSABILE_GENERALE_EMS,
    name: "Responsabile Generale EMS",
    color: "cyan-300",
    symbol: "crown",
    grade: 13,
  },
};

// Sort role IDs by grade (ascending or descending)
export const ROLE_IDS_SORTED_ASC = (Object.keys(ROLE_CONFIGS) as RoleId[]).sort(
  (a, b) => ROLE_CONFIGS[a].grade - ROLE_CONFIGS[b].grade
);

export const ROLE_IDS_SORTED_DESC = (Object.keys(ROLE_CONFIGS) as RoleId[]).sort(
  (a, b) => ROLE_CONFIGS[b].grade - ROLE_CONFIGS[a].grade
);

export interface DiscordUserSession {
  username: string;
  roleName: string;
  grade: number;
  isAllowed: boolean;
  verifiedAt: string;
  token: string;
  isMaster?: boolean;
  discordId?: string;
  discordTag?: string;
  avatar?: string;
  cdaRoleName?: string;
  hasCdaAccess?: boolean;
  roles?: string[];
  discordRoles?: string[];
  isTestToken?: boolean;
  expiresAt?: string;
  durationMs?: number;
  activatedAt?: string;
  isExpired?: boolean;
  candidateId?: string;
  hideFromHierarchy?: boolean;
  isDev?: boolean;
}

export const EMS_EMPLOYEE_ROLE_ID = "987106484116668467";

const ROLE_GRADE_MAP: Record<string, number> = {
  // Proprietà EMS (Photo 1)
  "proprietario ems": 100,
  "proprietario": 100,
  "vice proprietario": 99,
  "v. proprietario": 99,
  "v proprietario": 99,

  // Dirigenza Generale & Sanitaria (Photo 1 & 2)
  "responsabile generale ems": 21,
  "responsabile generale": 21,
  "direttore generale": 20,
  "direttore sanitario": 18,
  "v. direttore sanitario": 17,
  "vice direttore sanitario": 17,
  "v direttore sanitario": 17,
  "segretario direzione": 16.5,

  // Supervisione & Funzionari & Operativi (Photo 4)
  "supervisore generale": 16,
  "supervisore": 15,
  "v. supervisore": 14,
  "v.supervisore": 14,
  "vice supervisore": 14,
  "v supervisore": 14,
  "assistente supervisore": 13,
  "aiuto supervisore": 13,
  "responsabile del presidio": 12,
  "responsabile presidio": 12,
  "v. responsabile del presidio": 11,
  "vice responsabile del presidio": 11,
  "v responsabile del presidio": 11,
  "primario di reparto": 10.5,
  "v. primario di reparto": 9.5,
  "vice primario di reparto": 9.5,
  "v primario di reparto": 9.5,
  "primario": 10,
  "v. primario": 9,
  "vice primario": 9,
  "v primario": 9,
  "medico esperto": 6,
  "medico": 5,
  "infermiere": 2.5,
  "tirocinante": 2,
  "volontario": 1.5,
};

export const DISCORD_MAIN_HIERARCHY_ROLE_IDS: Record<string, { name: string; grade: number }> = {
  "1244676788672659517": { name: "Proprietario EMS", grade: 100 },
  "1546500255640461403": { name: "Responsabile Generale EMS", grade: 21 },
  "1418722531741012098": { name: "Direttore Generale", grade: 20 },
  "987239642501898311": { name: "Direttore Sanitario", grade: 18 },
  "1001145705433399336": { name: "V. Direttore Sanitario", grade: 17 },
  "1409477684618203196": { name: "Segretario Direzione", grade: 16.5 },
  "1492096452774592562": { name: "Supervisore Generale", grade: 16 },
  "1140226385588273172": { name: "Supervisore", grade: 15 },
  "1156900897675280425": { name: "V. Supervisore", grade: 14 },
  "1492095948162338826": { name: "Assistente Supervisore", grade: 13 },
  "1108482881510195322": { name: "Responsabile Del Presidio", grade: 12 },
  "1091808520652992572": { name: "V. Responsabile Del Presidio", grade: 11 },
  "1114126741351432294": { name: "Primario di Reparto", grade: 10.5 },
  "1091807343597072515": { name: "V. Primario di Reparto", grade: 9.5 },
  "987106477217021954": { name: "Primario", grade: 10 },
  "1031477641640935424": { name: "V. Primario", grade: 9 },
  "1031477565635973210": { name: "Medico Esperto", grade: 6 },
  "987106479163203614": { name: "Medico", grade: 5 },
  "1147818541928677426": { name: "Infermiere", grade: 2.5 },
  "1000816226710323301": { name: "Tirocinante", grade: 2 },
  "1539619731592450058": { name: "Volontario", grade: 1.5 },
};

export const MAIN_HIERARCHY_ROLE_NAMES = [
  "Proprietario EMS",
  "Responsabile Generale EMS",
  "Direttore Generale",
  "Direttore Sanitario",
  "V. Direttore Sanitario",
  "Segretario Direzione",
  "Supervisore Generale",
  "Supervisore",
  "V. Supervisore",
  "Assistente Supervisore",
  "Responsabile Del Presidio",
  "V. Responsabile Del Presidio",
  "Primario di Reparto",
  "V. Primario di Reparto",
  "Primario",
  "V. Primario",
  "Medico Esperto",
  "Medico",
  "Infermiere",
  "Tirocinante",
  "Volontario",
] as const;

export function isCdaOnlyRoleName(roleName?: string): boolean {
  if (!roleName) return false;
  const r = roleName.trim().toLowerCase().replace(/[.'’®™┃-]/g, "");
  // Owners / Masters are the top of the main hierarchy, never hide them
  if (r.includes("proprietario") || r.includes("master")) return false;
  // Main hierarchy roles must never be considered CDA roles
  if (
    r.includes("direzione") ||
    r.includes("sanitario") ||
    r.includes("generale") ||
    r.includes("primario") ||
    r.includes("medico") ||
    r.includes("infermier") ||
    r.includes("tirocinante") ||
    r.includes("volontario") ||
    r.includes("presidio") ||
    r.includes("supervisore")
  ) {
    return false;
  }
  return isCdaRoleName(roleName) || r.includes("cda") || r.includes("consiglio");
}

export function isMainHierarchyRole(roleName?: string): boolean {
  if (!roleName) return false;
  const clean = roleName.trim().toLowerCase().replace(/[.'’®™┃-]/g, " ").replace(/\s+/g, " ").trim();
  if (
    clean.includes("dgs") ||
    clean.includes("format") ||
    clean.includes("alliev") ||
    clean.includes("soccorrit") ||
    clean.includes("specialist") ||
    clean.includes("capo") ||
    clean.includes("paramedic") ||
    clean.includes("dipendente")
  ) {
    return false;
  }
  if (isCdaOnlyRoleName(roleName)) return false;
  const grade = getSingleRoleGrade(roleName);
  return grade > 0;
}

export function matchCanonicalMainHierarchyRole(rawRole?: string): { name: string; grade: number } | null {
  if (!rawRole) return null;
  const clean = rawRole.trim().toLowerCase().replace(/[.'’®™┃-]/g, " ").replace(/\s+/g, " ").trim();

  // EXPLICIT BLACKLIST: DGS, Formatori, and other external roles must NEVER match EMS main hierarchy!
  if (
    clean.includes("dgs") ||
    clean.includes("format") ||
    clean.includes("alliev") ||
    clean.includes("soccorrit") ||
    clean.includes("specialist") ||
    clean.includes("capo") ||
    clean.includes("paramedic") ||
    clean.includes("dipendente")
  ) {
    return null;
  }

  // Must not be a CDA only role
  if (isCdaOnlyRoleName(rawRole) || ((clean.includes("cda") || clean.includes("consiglio")) && !clean.includes("proprietario"))) {
    return null;
  }

  // Exact ordered matches for the 21 main hierarchy roles
  if (clean.includes("proprietario")) {
    if (clean.includes("vice") || clean.includes("v ")) return { name: "Vice Proprietario", grade: 99 };
    return { name: "Proprietario EMS", grade: 100 };
  }
  if (clean.includes("responsabile generale")) {
    return { name: "Responsabile Generale EMS", grade: 21 };
  }
  if (clean.includes("direttore generale")) {
    return { name: "Direttore Generale", grade: 20 };
  }
  if (clean.includes("v direttore sanitario") || clean.includes("vice direttore sanitario") || (clean.includes("direttore sanitario") && (clean.includes("vice") || clean.includes("v ")))) {
    return { name: "V. Direttore Sanitario", grade: 17 };
  }
  if (clean.includes("direttore sanitario")) {
    return { name: "Direttore Sanitario", grade: 18 };
  }
  if (clean.includes("segretario direzione") || (clean.includes("segretario") && clean.includes("direzione"))) {
    return { name: "Segretario Direzione", grade: 16.5 };
  }
  if (clean.includes("supervisore generale")) {
    return { name: "Supervisore Generale", grade: 16 };
  }
  if (clean.includes("assistente supervisore") || clean.includes("aiuto supervisore")) {
    return { name: "Assistente Supervisore", grade: 13 };
  }
  if (clean.includes("v supervisore") || clean.includes("vice supervisore") || (clean.includes("supervisore") && (clean.includes("vice") || clean.includes("v ")))) {
    return { name: "V. Supervisore", grade: 14 };
  }
  // Only standard Supervisore (without other words)
  if (clean === "supervisore" || clean.endsWith(" supervisore") || clean.startsWith("supervisore ")) {
    if (!clean.includes("dgs")) {
      return { name: "Supervisore", grade: 15 };
    }
  }
  if (clean.includes("v responsabile") || clean.includes("vice responsabile") || clean.includes("v responsabile del presidio")) {
    return { name: "V. Responsabile Del Presidio", grade: 11 };
  }
  if (clean.includes("responsabile del presidio") || clean.includes("responsabile presidio")) {
    return { name: "Responsabile Del Presidio", grade: 12 };
  }
  if (clean.includes("v primario di reparto") || clean.includes("vice primario di reparto") || (clean.includes("primario di reparto") && (clean.includes("vice") || clean.includes("v ")))) {
    return { name: "V. Primario di Reparto", grade: 9.5 };
  }
  if (clean.includes("primario di reparto")) {
    return { name: "Primario di Reparto", grade: 10.5 };
  }
  if (clean.includes("v primario") || clean.includes("vice primario") || (clean.includes("primario") && (clean.includes("vice") || clean.includes("v ")))) {
    return { name: "V. Primario", grade: 9 };
  }
  if (clean === "primario" || clean.endsWith(" primario") || clean.startsWith("primario ")) {
    return { name: "Primario", grade: 10 };
  }
  if (clean.includes("medico esperto")) {
    return { name: "Medico Esperto", grade: 6 };
  }
  if (clean === "medico" || clean.endsWith(" medico") || clean.startsWith("medico ")) {
    return { name: "Medico", grade: 5 };
  }
  if (clean.includes("infermier")) {
    return { name: "Infermiere", grade: 2.5 };
  }
  if (clean.includes("tirocinante")) {
    return { name: "Tirocinante", grade: 2 };
  }
  if (clean.includes("volontari")) {
    return { name: "Volontario", grade: 1.5 };
  }

  return null;
}

export function matchCanonicalCdaRole(rawRole?: string): { name: string; rank: number } | null {
  if (!rawRole) return null;
  const clean = rawRole.trim().toLowerCase().replace(/[.'’®™┃-]/g, " ").replace(/\s+/g, " ").trim();

  // Reject hospital direction roles
  if (clean.includes("segretario direzione") || (clean.includes("segretario") && clean.includes("direzione"))) {
    return null;
  }

  if (clean.includes("consigliere finale")) {
    return { name: "Consigliere Finale CDA", rank: 5 };
  }
  if (clean.includes("presidente") && !clean.includes("vice") && !clean.includes("v ") && (clean.includes("cda") || clean.includes("c d a") || clean.includes("consiglio"))) {
    return { name: "Presidente CDA", rank: 4 };
  }
  if ((clean.includes("vice presidente") || clean.includes("v presidente") || clean.includes("vicepresidente") || clean.includes("v-presidente")) && (clean.includes("cda") || clean.includes("c d a") || clean.includes("consiglio"))) {
    return { name: "Vice Presidente CDA", rank: 3 };
  }
  if (clean.includes("segretario") && (clean.includes("cda") || clean.includes("c d a") || clean.includes("consiglio"))) {
    return { name: "Segretario CDA", rank: 2 };
  }
  if (clean.includes("consiglio") && (clean.includes("amministrazione") || clean.includes("damministrazione") || clean.includes("d amministrazione") || clean.includes("cda") || clean.includes("c d a"))) {
    return { name: "Consiglio D'Amministrazione", rank: 1 };
  }
  if (clean === "cda" || clean === "c d a" || clean === "membro cda") {
    return { name: "Consiglio D'Amministrazione", rank: 1 };
  }

  return null;
}

export function getSingleRoleGrade(roleName?: string): number {
  if (!roleName) return 0;
  const clean = roleName.trim().toLowerCase().replace(/[.'’®™┃-]/g, " ").replace(/\s+/g, " ").trim();

  // CDA roles must NEVER be graded as EMS hospital hierarchy roles
  if (
    isCdaOnlyRoleName(roleName) ||
    ((clean.includes("cda") || clean.includes("consiglio")) && !clean.includes("proprietario") && !clean.includes("master"))
  ) {
    return 0;
  }
  
  if (ROLE_GRADE_MAP[clean] !== undefined) {
    return ROLE_GRADE_MAP[clean];
  }

  // Use the canonical matcher to evaluate grade strictly
  const match = matchCanonicalMainHierarchyRole(roleName);
  if (match) {
    return match.grade;
  }

  if (clean.includes("master")) return 100;
  return 0;
}

export function getUserEffectiveGrade(u: { roleName?: string; cdaRoleName?: string; token?: string; isMaster?: boolean }): number {
  if (u.isMaster) return 100;
  const clean = (u.roleName || "").trim().toLowerCase();
  if (clean.includes("proprietario") || clean.includes("master")) return 100;
  const grade = getSingleRoleGrade(u.roleName);
  return grade >= 99 ? 100 : grade;
}

export type LogCategory = "ACCESSI" | "CANDIDATURE" | "MODIFICHE_ADMIN" | "VOTI" | "CDA";

export interface AccessLog {
  id: string;
  timestamp: string;
  ip: string;
  username: string;
  roleName: string;
  token: string;
  action: string;
  status: "SUCCESS" | "DENIED" | "REVOKED" | "INFO";
  details: string;
  category?: LogCategory;
}

export const ALLOWED_DISCORD_ROLES = [
  // 21 Ruoli Gerarchia Principale (Foto 1, 2, 4)
  "Proprietario EMS",
  "Proprietario",
  "Vice Proprietario",
  "Responsabile Generale EMS",
  "Direttore Generale",
  "Direttore Sanitario",
  "V. Direttore Sanitario",
  "Segretario Direzione",
  "Supervisore Generale",
  "Supervisore",
  "V. Supervisore",
  "Assistente Supervisore",
  "Responsabile Del Presidio",
  "V. Responsabile Del Presidio",
  "Primario di Reparto",
  "V. Primario di Reparto",
  "Primario",
  "V. Primario",
  "Medico Esperto",
  "Medico",
  "Infermiere",
  "Tirocinante",
  "Volontario",

  // 5 Ruoli CDA (Foto 3)
  "Consigliere Finale CDA",
  "Presidente CDA",
  "Vice Presidente CDA",
  "Segretario CDA",
  "Consiglio D'Amministrazione",
];

export type HierarchyCategoryKey =
  | "PROPRIETARI"
  | "DIRIGENZA_GENERALE"
  | "DIRIGENZA_SANITARIA"
  | "SUPERVISIONE"
  | "FUNZIONARI"
  | "VOLONTARI";

export interface HierarchyMember {
  id: string;
  name: string;
  roleName: string;
  categoryKey: HierarchyCategoryKey;
  badge?: string;
  discordTag?: string;
  isDev?: boolean;
  leaveStatus?: string;
  updatedAt?: string;
}

export interface HierarchyCategoryConfig {
  key: HierarchyCategoryKey;
  title: string;
  description: string;
  rolesIncluded: string[];
  color: string;
  borderColor: string;
  bgColor: string;
  badgeBg: string;
  order: number;
}

export const HIERARCHY_CATEGORIES: Record<HierarchyCategoryKey, HierarchyCategoryConfig> = {
  PROPRIETARI: {
    key: "PROPRIETARI",
    title: "Proprietari",
    description: "Massimo vertice istituzionale e fondatori del corpo EMS",
    rolesIncluded: ["Proprietario", "Vice Proprietario"],
    color: "amber-400",
    borderColor: "border-slate-800/90 hover:border-slate-700",
    bgColor: "bg-slate-900/50 backdrop-blur-md",
    badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    order: 1,
  },
  DIRIGENZA_GENERALE: {
    key: "DIRIGENZA_GENERALE",
    title: "Dirigenza Generale",
    description: "Direzione strategica, gestione generale ed amministrativa",
    rolesIncluded: ["Responsabile Generale EMS", "Direttore Generale"],
    color: "cyan-400",
    borderColor: "border-slate-800/90 hover:border-slate-700",
    bgColor: "bg-slate-900/50 backdrop-blur-md",
    badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    order: 2,
  },
  DIRIGENZA_SANITARIA: {
    key: "DIRIGENZA_SANITARIA",
    title: "Dirigenza Sanitaria",
    description: "Gestione della struttura sanitaria, protocolli ed organizzazione dei servizi",
    rolesIncluded: ["Direttore Sanitario", "V. Direttore Sanitario", "Segretario Direzione"],
    color: "red-400",
    borderColor: "border-slate-800/90 hover:border-slate-700",
    bgColor: "bg-slate-900/50 backdrop-blur-md",
    badgeBg: "bg-red-500/10 text-red-300 border-red-500/30",
    order: 3,
  },
  SUPERVISIONE: {
    key: "SUPERVISIONE",
    title: "Supervisione",
    description: "Controllo operativo, qualità dell'intervento e coordinamento sul campo",
    rolesIncluded: ["Supervisore Generale", "Supervisore", "V. Supervisore", "Assistente Supervisore"],
    color: "purple-400",
    borderColor: "border-slate-800/90 hover:border-slate-700",
    bgColor: "bg-slate-900/50 backdrop-blur-md",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    order: 4,
  },
  FUNZIONARI: {
    key: "FUNZIONARI",
    title: "Funzionari",
    description: "Gestione di presidi ed operatività diretta",
    rolesIncluded: [
      "Responsabile Del Presidio",
      "V. Responsabile Del Presidio",
      "Primario di Reparto",
      "V. Primario di Reparto",
    ],
    color: "orange-400",
    borderColor: "border-slate-800/90 hover:border-slate-700",
    bgColor: "bg-slate-900/50 backdrop-blur-md",
    badgeBg: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    order: 5,
  },
  VOLONTARI: {
    key: "VOLONTARI",
    title: "Volontari",
    description: "Supporto operativo, soccorso ed assistenza alle attività EMS",
    rolesIncluded: ["Volontario"],
    color: "[#f78c8c]",
    borderColor: "border-[#f78c8c]/30 hover:border-[#f78c8c]/60",
    bgColor: "bg-slate-900/50 backdrop-blur-md",
    badgeBg: "bg-gradient-to-r from-[#a7a7a8]/20 to-[#f78c8c]/20 text-[#f78c8c] border-[#f78c8c]/40",
    order: 6,
  },
};

export function getCategoryForRole(roleName: string): HierarchyCategoryKey {
  if (!roleName) return "VOLONTARI";
  const r = roleName.trim().toLowerCase();

  if (r.includes("proprietario")) {
    return "PROPRIETARI";
  }
  if (
    r.includes("responsabile generale ems") ||
    r.includes("responsabile generale") ||
    r.includes("direttore generale")
  ) {
    return "DIRIGENZA_GENERALE";
  }
  if (
    r.includes("direttore sanitario") ||
    r.includes("v. direttore") ||
    r.includes("vice direttore") ||
    r.includes("segretario")
  ) {
    return "DIRIGENZA_SANITARIA";
  }
  if (
    r.includes("supervisore") ||
    r.includes("assistente supervisore") ||
    r.includes("aiuto supervisore")
  ) {
    return "SUPERVISIONE";
  }
  if (
    r.includes("primario") ||
    r.includes("responsabile")
  ) {
    return "FUNZIONARI";
  }
  if (
    r.includes("volontario") ||
    r.includes("volontaria")
  ) {
    return "VOLONTARI";
  }
  return "VOLONTARI";
}

export interface OfficialMemberSeed {
  name: string;
  roleName: string;
  token: string;
  discordTag?: string;
  cdaRoleName?: string;
  hasCdaAccess?: boolean;
}

export const OFFICIAL_OWNERS_SEED: OfficialMemberSeed[] = [
  {
    name: "Antony Romano",
    roleName: "Proprietario",
    token: "EMS-ARB9E8",
    discordTag: "@anto.romano",
    cdaRoleName: "Consigliere Finale CDA",
    hasCdaAccess: true,
  },
  {
    name: "Giovanni Manzo",
    roleName: "Proprietario",
    token: "EMS-GMB2B8",
    discordTag: "@smokafps",
    cdaRoleName: "Consigliere Finale CDA",
    hasCdaAccess: true,
  },
  {
    name: "Simone Rizzus",
    roleName: "Proprietario",
    token: "EMS-SR4BE3",
    discordTag: "@simolmao",
    cdaRoleName: "Consigliere Finale CDA",
    hasCdaAccess: true,
  },
];

export const OFFICIAL_IMAGE_MEMBERS_SEED: OfficialMemberSeed[] = [
  { name: "Theo Smith", roleName: "Direttore Generale", token: "EMS-TSD286", discordTag: "@b3nzy_", cdaRoleName: "Presidente CDA", hasCdaAccess: true },
  { name: "Filippo Ciro", roleName: "Direttore Sanitario", token: "EMS-FC6767", discordTag: "@stellar9345", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Luca Brizzante", roleName: "Direttore Sanitario", token: "EMS-LBC6A6", discordTag: "@ildivinoita", cdaRoleName: "Segretario CDA", hasCdaAccess: true },
  { name: "Ares Migliorini", roleName: "V. Direttore Sanitario", token: "EMS-AM59DB", discordTag: "@aresvxy", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Dutch Esposito", roleName: "V. Direttore Sanitario", token: "EMS-DEC97C", discordTag: "@espanico10", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Igor Lestrenge", roleName: "V. Direttore Sanitario", token: "EMS-ILB5D2", discordTag: "@tr3m0r_92", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Ciccio Losavio", roleName: "Segretario Direzione", token: "EMS-CLA9CC", discordTag: "@cicciotheboss", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Jonathan Giacomarra", roleName: "Segretario Direzione", token: "EMS-JG211B", discordTag: "@peppe7662", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Giuseppe Politics", roleName: "Supervisore Generale", token: "EMS-GP67SC", discordTag: "@peppe_politico", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Diego Trombini", roleName: "Supervisore", token: "EMS-DT0311", discordTag: "@ilprodiego", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Rocco Ali", roleName: "Supervisore", token: "EMS-RAA405", discordTag: "@gius_00", cdaRoleName: "Membro CDA", hasCdaAccess: true },
  { name: "Raffaele Bravi", roleName: "V. Supervisore", token: "EMS-RB1237", discordTag: "@loster2040_" },
  { name: "Alex De Santis", roleName: "Assistente Supervisore", token: "EMS-ADSY34", discordTag: "@ss_alex" },
  { name: "Giangi Leanza", roleName: "Assistente Supervisore", token: "EMS-GLEA9D", discordTag: "@giangixcomeback" },
  { name: "Antonio Palermo", roleName: "V. Responsabile Del Presidio", token: "EMS-AP34FW", discordTag: "@antonio83_" },
  { name: "Kevin Panetto", roleName: "V. Responsabile Del Presidio", token: "EMS-KP28RC", discordTag: "@fcim1988995_69767" },
  { name: "Mirko Leone", roleName: "V. Responsabile Del Presidio", token: "EMS-ML373T", discordTag: "@mirkomirror" },
  { name: "Nick Larsson", roleName: "V. Responsabile Del Presidio", token: "EMS-NLDF73", discordTag: "@norsk_scl" },
  { name: "Rick Maltese", roleName: "V. Responsabile Del Presidio", token: "EMS-RM6E9E", discordTag: "@synce7747" },
  { name: "Yuki Cross", roleName: "V. Responsabile Del Presidio", token: "EMS-YCDB15", discordTag: "@yuki4488" },
  { name: "Massimo Arresto", roleName: "V. Primario di Reparto", token: "EMS-MAFFU23", discordTag: "@elguapo7207" },
  { name: "Matteo Piscitelli", roleName: "V. Primario di Reparto", token: "EMS-MA264H", discordTag: "@12flxppy" },
  { name: "Londra", roleName: "Volontario", token: "EMS-LG6923", discordTag: "@darkettino" },
  { name: "Matias Corleone", roleName: "Volontario", token: "EMS-MCA496", discordTag: "@_matiascorleone_" },
  { name: "Mimmo Diesel", roleName: "Volontario", token: "EMS-MD442C", discordTag: "@exo_sniper_" },
];

export const ALLOWED_OFFICIAL_TOKEN_KEYS = new Set<string>([
  "EMS-2410PROP",
  "EMS-TSD286",
  "EMS-FC6767",
  "EMS-LBC6A6",
  "EMS-AM59DB",
  "EMS-DEC97C",
  "EMS-ILB5D2",
  "EMS-CLA9CC",
  "EMS-JG211B",
  "EMS-GP67SC",
  "EMS-DT0311",
  "EMS-RAA405",
  "EMS-RB1237",
  "EMS-ADSY34",
  "EMS-GLEA9D",
  "EMS-AP34FW",
  "EMS-KP28RC",
  "EMS-ML373T",
  "EMS-NLDF73",
  "EMS-RM6E9E",
  "EMS-YCDB15",
  "EMS-MAFFU23",
  "EMS-MA264H",
  "EMS-LG6923",
  "EMS-MCA496",
  "EMS-MD442C",
]);



export type CandidaturaStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type CdaStatus = "PENDING_RENDER" | "IN_VOTING" | "APPROVED" | "REJECTED" | "RETURNED" | "TIE_PENDING";

export interface CdaUserVote {
  voterToken?: string;
  voterName: string;
  voterRole: string;
  decision: "FAVOREVOLE" | "CONTRARIO" | "ASTENUTO";
  chosenRole?: string;
  timestamp: string;
  reason?: string;
}

export interface CdaData {
  renderedAt?: string;
  renderedBy?: string;
  renderedByRole?: string;
  votingStartedAt?: string;
  expiresAt?: string; // 24 hours after renderedAt
  status?: CdaStatus;
  votes?: Record<string, CdaUserVote>; // map of voter identifier -> vote
  cdaActionReason?: string;
  cdaActionBy?: string;
  cdaActionRole?: string;
  cdaActionAt?: string;
}

export interface Candidatura {
  id: string;
  fullName: string;
  currentRole: string; // Range: Primario (#07095e) up to V. Responsabile del presidio
  desiredRole: string; // Range: V. Primario di reparto up to Responsabile del presidio
  timeSlot: string; // Manual text entry for working hours
  offerText: string; // What they offer as a person/employee (minimum 5 lines)
  status: CandidaturaStatus; // PENDING ("in valutazione"), APPROVED, REJECTED, CANCELLED
  rejectionReason?: string; // Reason for rejection
  cancellationReason?: string; // Mandatory reason for cancellation when withdrawn by applicant
  cancelledAt?: string; // ISO date string when cancelled
  submittedAt: string; // ISO date string
  token?: string;
  ip?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  cdaData?: CdaData;
}

export type CdaProposalType = "GENERICA" | "PROMOZIONE" | "REINTEGRO";

export type CdaProposalStatus = "PENDING" | "PENDING_COSIGNERS" | "PENDING_REVISION" | "IN_VOTING" | "APPROVED" | "REJECTED" | "RETURNED" | "CANCELLED";

export interface CdaCoSigner {
  name: string;
  role: string;
  tokenPrefix: string; // The two letters after EMS- e.g. "AB"
  fullToken?: string;
  hasSigned?: boolean;
}

export interface CdaProposal {
  id: string;
  type: CdaProposalType;
  proposerName: string;
  proposerRole: string;
  coSigners?: CdaCoSigner[];
  title: string;
  description: string;
  targetEmployeeName?: string;
  targetCurrentRole?: string;
  targetProposedRole?: string;
  reinstatementVotingRoles?: string[];
  finalApprovedRole?: string;
  status: CdaProposalStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  submittedAt: string;
  token?: string;
  ip?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  cdaData?: CdaData;
}

export const ALL_EMS_PROMOTION_ROLES = [
  "Tirocinante",
  "Infermiere",
  "Medico",
  "Medico Esperto",
  "V. Primario",
  "Primario",
  "V. Primario di Reparto",
  "Primario di Reparto",
  "V. Responsabile Del Presidio",
  "Responsabile Del Presidio",
  "Assistente Supervisore",
  "V. Supervisore",
  "Supervisore",
  "Supervisore Generale",
  "Segretario Direzione",
  "V. Direttore Sanitario",
  "Direttore Sanitario",
  "V. Direttore Generale",
  "Direttore Generale",
];

export const DISCORD_CDA_ROLE_IDS: Record<string, { roleName: string; rank: number }> = {
  "1360573608417693788": { roleName: "Presidente CDA", rank: 4 },
  "1376598259388252270": { roleName: "Vice Presidente CDA", rank: 3 },
  "1474509246447222949": { roleName: "Segretario CDA", rank: 2 },
  "1430946447284637806": { roleName: "Consigliere Finale CDA", rank: 5 },
  "1147840203285876746": { roleName: "Consiglio d'Amministrazione", rank: 1 },
};

export function isCdaRoleName(roleName: string): boolean {
  if (!roleName) return false;
  const r = roleName.trim().toLowerCase().replace(/[.'’®™┃-]/g, "");
  // Explicitly reject hospital/direction roles such as "Segretario Direzione"
  if (r.includes("segretario direzione") || r.includes("direzione")) return false;
  if (r.includes("proprietario") || r.includes("master")) return true;
  if (r.includes("consigliere finale")) return true;
  if (r.includes("presidente cda") || r === "presidente del cda" || (r.includes("presidente") && (r.includes("cda") || r.includes("consiglio")))) return true;
  if (r.includes("vice presidente cda") || r.includes("v presidente cda") || r.includes("vicepresidente cda") || (r.includes("vice presidente") && (r.includes("cda") || r.includes("consiglio")))) return true;
  if (r.includes("segretario cda") || r === "segretario del cda" || (r.includes("segretario") && (r.includes("cda") || r.includes("consiglio")))) return true;
  if (r.includes("membro cda") || r === "cda" || r.includes("consiglio damministrazione") || r.includes("consiglio di amministrazione") || r.includes("consiglio amministrazione")) return true;
  return false;
}

export function getCdaRank(roleName: string): number {
  if (!roleName) return 0;
  const r = roleName.trim().toLowerCase().replace(/[.'’®™┃-]/g, "");
  // Explicitly reject hospital/direction roles such as "Segretario Direzione"
  if (r.includes("segretario direzione") || r.includes("direzione")) return 0;

  if (r.includes("proprietario") || r.includes("master")) return 100;
  if (r.includes("consigliere finale")) return 5;
  if ((r.includes("presidente") || r.includes("presidenza")) && !r.includes("vice") && !r.includes("v") && (r.includes("cda") || r.includes("consiglio"))) return 4;
  if ((r.includes("vice presidente") || r.includes("v presidente") || r.includes("vicepresidente")) && (r.includes("cda") || r.includes("consiglio"))) return 3;
  if (r.includes("segretario cda") || (r.includes("segretario") && (r.includes("cda") || r.includes("consiglio")))) return 2;
  if (r.includes("membro cda") || r === "cda" || r.includes("consiglio damministrazione") || r.includes("consiglio amministrazione") || r.includes("consiglio di amministrazione")) return 1;
  return 0;
}

export function canAccessCdaPortal(session?: {
  isMaster?: boolean;
  token?: string;
  roleName?: string;
  cdaRoleName?: string;
  hasCdaAccess?: boolean;
  roles?: string[];
  discordRoles?: string[];
} | null): boolean {
  if (!session) return false;
  if (session.isMaster) return true;
  if (session.token && session.token.toUpperCase() === "EMS-2410PROP") return true;

  // Master / Proprietario check
  const cleanRole = (session.roleName || "").trim().toLowerCase();
  if (cleanRole.includes("proprietario") || cleanRole.includes("master")) return true;

  // Check raw Discord Role IDs (including base CDA role 1147840203285876746)
  const roleList = (session.roles || session.discordRoles || []) as string[];
  if (Array.isArray(roleList)) {
    if (
      roleList.includes("1147840203285876746") || // Membro CDA / Consiglio d'Amministrazione (Base CDA)
      roleList.includes("1474509246447222949") || // Segretario CDA
      roleList.includes("1376598259388252270") || // Vice Presidente CDA
      roleList.includes("1360573608417693788") || // Presidente CDA
      roleList.includes("1430946447284637806")    // Consigliere Finale CDA
    ) {
      return true;
    }
  }

  // Explicit CDA access flag
  if (session.hasCdaAccess === true) return true;

  // CDA access is governed by explicit CDA role (cdaRoleName)
  if (session.cdaRoleName && getCdaRank(session.cdaRoleName) >= 1) return true;

  // If roleName itself is a recognized CDA role
  if (session.roleName && isCdaRoleName(session.roleName) && !session.roleName.toLowerCase().includes("segretario direzione")) return true;

  return false;
}

export const CANDIDATURA_CURRENT_ROLES = [
  { name: "Primario", colorHex: "#07095e" },
  { name: "V. Primario di Reparto", colorHex: "#fbbf24" },
  { name: "Primario di Reparto", colorHex: "#b45309" },
  { name: "V. Responsabile Del Presidio", colorHex: "#fb923c" },
];

export const CANDIDATURA_DESIRED_ROLES = [
  { name: "V. Primario di Reparto", colorHex: "#fbbf24" },
  { name: "Primario di Reparto", colorHex: "#b45309" },
  { name: "V. Responsabile Del Presidio", colorHex: "#fb923c" },
  { name: "Responsabile Del Presidio", colorHex: "#ea580c" },
];

export const CANDIDATURA_ROLE_PROGRESSION: Record<string, string> = {
  "Primario": "V. Primario di Reparto",
  "V. Primario di Reparto": "Primario di Reparto",
  "Primario di Reparto": "V. Responsabile Del Presidio",
  "V. Responsabile Del Presidio": "Responsabile Del Presidio",
};

export function getNextPromotionRole(currentRole: string): string {
  if (!currentRole) return "V. Primario di Reparto";
  const trimmed = currentRole.trim();
  if (CANDIDATURA_ROLE_PROGRESSION[trimmed]) {
    return CANDIDATURA_ROLE_PROGRESSION[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const [curr, next] of Object.entries(CANDIDATURA_ROLE_PROGRESSION)) {
    if (curr.toLowerCase() === lower) return next;
  }
  return "V. Primario di Reparto";
}

export interface ExcelColumnDef {
  id: string; // unique identifier (e.g., "fullName", "currentRole", "newRole", "cdaRole", "dgsRole", "leaveStatus", "notes", or custom "custom_xyz")
  key: string;
  label: string;
  type: "text" | "role" | "badge" | "leave" | "status" | "date";
  isRemovable: boolean;
  isCustom?: boolean;
  order: number;
  visible: boolean;
  width?: string;
}

export const DEFAULT_EXCEL_COLUMNS: ExcelColumnDef[] = [
  { id: "orderNumber", key: "orderNumber", label: "#", type: "text", isRemovable: false, order: 0, visible: true, width: "w-9" },
  { id: "fullName", key: "fullName", label: "Membri del NOSTRO EMS", type: "text", isRemovable: false, order: 1, visible: true, width: "min-w-[140px]" },
  { id: "currentRole", key: "currentRole", label: "Ruolo Attuale", type: "role", isRemovable: true, order: 2, visible: true, width: "min-w-[105px]" },
  { id: "newRole", key: "newRole", label: "Nuovo Grado", type: "role", isRemovable: true, order: 3, visible: true, width: "min-w-[120px]" },
  { id: "cdaRole", key: "cdaRole", label: "CDA", type: "badge", isRemovable: true, order: 4, visible: true, width: "min-w-[80px]" },
  { id: "dgsRole", key: "dgsRole", label: "DGS", type: "badge", isRemovable: true, order: 5, visible: true, width: "min-w-[85px]" },
  { id: "leaveStatus", key: "leaveStatus", label: "Assenze / Ferie", type: "leave", isRemovable: true, order: 6, visible: true, width: "min-w-[95px]" },
  { id: "notes", key: "notes", label: "Note", type: "text", isRemovable: true, order: 7, visible: true, width: "min-w-[90px]" },
];

export interface ExcelGerarchiaEntry {
  id: string;
  orderNumber?: number;
  fullName: string;
  currentRole: string; // Grado Attuale
  newRole: string; // Nuovo Grado (Colonna chiave auto-aggiornata!)
  cdaRole?: string; // Ruolo CDA (es. Presidente CDA, V. Presidente CDA, Segretario CDA, CDA)
  dgsRole?: string; // Ruolo DGS (es. Responsabile DGS, Supervisore DGS, Direttore DGS, V.Direttore DGS)
  leaveStatus?: string; // Assenze / Ferie (es. FERIE, ASSENTE DA TEMPO, FERIE NON DICHIARATE, ASPETTATIVA, DEVE SVEGLIARSI)
  sourceType: "CANDIDATURA" | "CDA_PROPOSTA" | "GERARCHIA" | "MANUALE";
  sourceDetails?: string;
  approvedBy?: string;
  status: "CONFERMATO" | "IN_VALUTAZIONE" | "IN_VOTAZIONE_CDA" | "ARCHIVIATO";
  notes?: string;
  customFields?: Record<string, string>; // Support for user-created custom dynamic columns!
  discordTag?: string;
  badge?: string;
  updatedAt: string;
}

export const GOOGLE_SHEET_GERARCHIA_URL = "https://docs.google.com/spreadsheets/d/1dBCewK_cvU1HeBLrCtH1-HbnsIWW1050DU0332Bd258/edit?gid=0#gid=0";

export interface RoleBadgeStyle {
  style?: CSSProperties;
  className: string;
}

export function getRoleBadgeStyle(roleName: string): RoleBadgeStyle {
  if (!roleName) return { className: "bg-slate-800 text-slate-300 border border-slate-700 font-bold" };
  
  const r = roleName.trim().toLowerCase();
  
  if (r.includes("licenziamento") || r.includes("licenziato")) {
    return { className: "bg-rose-600/30 text-rose-300 border border-rose-500/60 font-black shadow-sm" };
  }
  if (r.includes("aspettativa")) {
    return { className: "bg-emerald-800/30 text-emerald-300 border border-emerald-700/50 font-bold" };
  }

  // Proprietario
  if (r.includes("proprietario")) {
    if (r.includes("vice") || r.includes("v.")) {
      return { className: "bg-slate-900/90 text-white border border-slate-200/80 font-black shadow-sm shadow-slate-200/20" };
    }
    return { className: "bg-slate-950/90 text-[#b89bf3] border border-[#b89bf3]/50 font-extrabold shadow-sm shadow-indigo-950/30" };
  }

  // CDA / Consiglio d'Amministrazione
  if (r.includes("cda") || r.includes("consiglio di amministrazione") || r.includes("consiglio damministrazione") || r.includes("consiglio amministrazione") || r.includes("consigliere finale")) {
    return { className: "bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-amber-500/30 text-yellow-300 border border-yellow-400/90 font-black shadow-md shadow-amber-950/60" };
  }

  // Responsabile Generale EMS
  if (r.includes("responsabile generale ems") || r.includes("responsabile generale")) {
    return { className: "bg-gradient-to-r from-[#f8f8f8]/20 via-[#7eeaff]/25 to-[#f8f8f8]/20 text-[#7eeaff] border border-[#7eeaff]/60 font-black shadow-sm shadow-[#7eeaff]/20" };
  }

  // Direzione Generale
  if (r.includes("direttore generale")) {
    return { className: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-black shadow-sm shadow-cyan-950/40" };
  }

  // Direzione Sanitaria
  if (r.includes("direttore sanitario")) {
    if (r.includes("vice") || r.includes("v.")) {
      return { className: "bg-rose-500/20 text-rose-300 border border-rose-500/50 font-black shadow-sm shadow-rose-950/40" };
    }
    return { className: "bg-red-700/25 text-red-200 border border-red-500/60 font-black shadow-sm shadow-red-950/40" };
  }

  // Segreteria Direzione
  if (r.includes("segretario")) {
    return { className: "bg-violet-700/20 text-violet-300 border border-violet-500/50 font-black shadow-sm shadow-violet-950/40" };
  }

  // Supervisori
  if (r.includes("supervisore generale")) {
    return { className: "bg-purple-600/20 text-purple-300 border border-purple-500/50 font-black shadow-sm shadow-purple-950/40" };
  }
  if (r.includes("supervisore")) {
    if (r.includes("assistente") || r.includes("aiuto")) {
      return { className: "bg-pink-400/20 text-pink-300 border border-pink-400/50 font-black shadow-sm shadow-pink-950/40" };
    }
    if (r.includes("vice") || r.includes("v.")) {
      return { className: "bg-pink-600/20 text-pink-300 border border-pink-500/50 font-black shadow-sm shadow-pink-950/40" };
    }
    return { className: "bg-rose-600/20 text-rose-300 border border-rose-500/50 font-black shadow-sm shadow-rose-950/40" };
  }

  // Responsabili Presidio
  if (r.includes("responsabile del presidio") || r.includes("responsabile presidio")) {
    if (r.includes("vice") || r.includes("v.")) {
      return { className: "bg-orange-400/20 text-orange-300 border border-orange-400/50 font-black shadow-sm shadow-orange-950/40" };
    }
    return { className: "bg-orange-600/20 text-orange-300 border border-orange-500/50 font-black shadow-sm shadow-orange-950/40" };
  }
  
  // Primari di Reparto
  if (r.includes("v. primario di reparto") || r.includes("vice primario di reparto")) {
    return { className: "bg-amber-400/20 text-amber-300 border border-amber-400/50 font-black shadow-sm shadow-amber-950/40" };
  }
  if (r.includes("primario di reparto")) {
    return { className: "bg-amber-700/20 text-amber-200 border border-amber-500/50 font-black shadow-sm shadow-amber-950/40" };
  }

  // Medico / Primario Base
  if (r === "primario" || r === "primario°") {
    return {
      style: { backgroundColor: "#07095e" },
      className: "text-white font-bold border border-blue-400/40 shadow-sm shadow-blue-950/60",
    };
  }
  if (r.includes("v. primario") || r.includes("vice primario") || r === "v. primario°") {
    return { className: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold" };
  }
  if (r.includes("medico esperto") || r === "medico esperto°") {
    return { className: "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold" };
  }
  if (r.includes("medico") || r === "medico°") {
    return { className: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold" };
  }
  if (r.includes("infermiere") || r.includes("infermiero") || r === "infermiere°") {
    return { className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" };
  }
  if (r.includes("volontario") || r.includes("volontaria")) {
    return { className: "bg-gradient-to-r from-[#a7a7a8]/20 via-[#d09a9a]/20 to-[#f78c8c]/25 text-[#f78c8c] border border-[#f78c8c]/50 font-bold shadow-xs shadow-[#f78c8c]/20" };
  }
  if (r.includes("tirocinante") || r.includes("allievo") || r === "tirocinante°") {
    return { className: "bg-lime-500/20 text-lime-300 border border-lime-500/40 font-bold" };
  }
  if (r.includes("assistente") || r.includes("aiuto")) {
    return { className: "bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold" };
  }

  return { className: "bg-slate-800 text-slate-300 border border-slate-700 font-bold" };
}

export interface RoleElectionConfig {
  isOpen: boolean; // se le votazioni chiuse o aperte
  deadline: string | null; // quanto tempo hanno per votare (ISO string or null)
  durationHours?: number; // durata in ore se impostata
  maxCandidatesPerRole: number; // quanti candidati possono inserire/votare per ruolo
  roles: string[]; // ruoli per cui possono votare
  title: string;
  description: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface RoleElectionCandidate {
  id: string;
  name: string;
  role: string;
  notes?: string;
  addedBy?: string;
  createdAt: string;
}

export interface RoleElectionVote {
  id: string;
  voterToken: string;
  voterName: string;
  voterRole: string;
  isOwnerKey: boolean;
  selections: Record<string, string[]>; // Map of role -> array of chosen candidate names
  motivation: string; // Obbligatoria tranne per le key proprietario!
  timestamp: string; // ISO date string
}

export const DEFAULT_ROLE_ELECTION_ROLES = [
  "Direttore Generale",
  "Direttore Sanitario",
  "V. Direttore Sanitario",
  "Segretario Direzione",
  "Supervisore Generale",
  "Supervisore",
  "V. Supervisore",
  "Responsabile Del Presidio",
  "V. Responsabile Del Presidio",
  "Primario di Reparto",
  "V. Primario di Reparto",
];

export function canAccessRoleElection(user?: DiscordUserSession | { roleName?: string; token?: string; isMaster?: boolean } | null): boolean {
  if (!user) return false;
  if (user.isMaster) return true;
  const grade = getUserEffectiveGrade(user);
  const minGrade = getSingleRoleGrade("segretario direzione"); // 16.5
  return grade >= minGrade;
}

export const PRIMARIO_MIN_GRADE = 10;

export function canAccessCandidatura(user?: DiscordUserSession | { roleName?: string; token?: string; isMaster?: boolean } | null): boolean {
  if (!user) return false;
  if (user.isMaster) return true;
  const cleanRole = (user.roleName || "").trim().toLowerCase();
  if (cleanRole.includes("proprietario") || cleanRole.includes("master")) return true;
  const grade = getUserEffectiveGrade(user);
  return grade >= PRIMARIO_MIN_GRADE;
}

export function isOwnerKey(userOrToken?: string | { token?: string; roleName?: string; isMaster?: boolean } | null): boolean {
  if (!userOrToken) return false;
  if (typeof userOrToken === "object") {
    const t = (userOrToken.token || "").trim().toUpperCase();
    return t === "EMS-2410PROP" || t === "OSPEDALEPILLOLA2025!MASTERKEYPRIVATA";
  }
  const t = String(userOrToken).trim().toUpperCase();
  return t === "EMS-2410PROP" || t === "OSPEDALEPILLOLA2025!MASTERKEYPRIVATA";
}

export interface EmployeeTokenImportItem {
  username: string;
  roleName: string;
  cdaRoleName?: string;
  hasCdaAccess?: boolean;
  discordTag?: string;
  token?: string;
  hideFromHierarchy?: boolean;
  isDev?: boolean;
}



