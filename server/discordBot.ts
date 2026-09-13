import fs from "fs";
import path from "path";
import {
  getSingleRoleGrade,
  isCdaOnlyRoleName,
  matchCanonicalMainHierarchyRole,
  matchCanonicalCdaRole,
  DISCORD_MAIN_HIERARCHY_ROLE_IDS,
} from "../src/types.js";

export interface DiscordBotConfig {
  clientId: string;
  clientSecret: string;
  botToken: string;
  guildId: string;
  ownerRoleName: string;
  ownerRoleId: string;
  autoSyncEnabled: boolean;
  canonicalUrl?: string;
  lastSyncAt: string | null;
  lastSyncCount: number;
}

const CONFIG_FILE = path.join(process.cwd(), "discord_bot_config.json");

function getDefaultConfig(): DiscordBotConfig {
  return {
    clientId: (process.env.DISCORD_CLIENT_ID || "1529792010603466883").trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || "").trim(),
    botToken: (process.env.DISCORD_BOT_TOKEN || "").trim(),
    guildId: (process.env.DISCORD_GUILD_ID || "").trim(),
    ownerRoleName: (process.env.DISCORD_OWNER_ROLE_NAME || "Proprietario").trim(),
    ownerRoleId: (process.env.DISCORD_OWNER_ROLE_ID || "").trim(),
    autoSyncEnabled: true,
    canonicalUrl: (process.env.APP_URL || "").trim(),
    lastSyncAt: null,
    lastSyncCount: 0,
  };
}

function isMaskedValue(val?: string): boolean {
  if (!val) return false;
  return val.includes("...") || val.includes("***") || val.includes("•••");
}

export function getDiscordConfig(): DiscordBotConfig {
  let cfg = getDefaultConfig();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      cfg = {
        ...cfg,
        ...data,
        // Allow env variables to take precedence if defined and non-empty
        clientId: process.env.DISCORD_CLIENT_ID || data.clientId || cfg.clientId,
        clientSecret: process.env.DISCORD_CLIENT_SECRET || (!isMaskedValue(data.clientSecret) ? data.clientSecret : "") || cfg.clientSecret,
        botToken: process.env.DISCORD_BOT_TOKEN || (!isMaskedValue(data.botToken) ? data.botToken : "") || cfg.botToken,
        guildId: process.env.DISCORD_GUILD_ID || data.guildId || cfg.guildId,
        ownerRoleName: process.env.DISCORD_OWNER_ROLE_NAME || data.ownerRoleName || cfg.ownerRoleName,
        ownerRoleId: process.env.DISCORD_OWNER_ROLE_ID || data.ownerRoleId || cfg.ownerRoleId,
        canonicalUrl: process.env.APP_URL || data.canonicalUrl || cfg.canonicalUrl || "",
      };
    }
  } catch (err) {
    console.error("Errore lettura discord_bot_config.json:", err);
  }

  return cfg;
}

export function saveDiscordConfig(updates: Partial<DiscordBotConfig>): DiscordBotConfig {
  const current = getDiscordConfig();
  const safeUpdates = { ...updates };
  if (safeUpdates.clientSecret && isMaskedValue(safeUpdates.clientSecret)) {
    delete safeUpdates.clientSecret;
  }
  if (safeUpdates.botToken && isMaskedValue(safeUpdates.botToken)) {
    delete safeUpdates.botToken;
  }
  const updated: DiscordBotConfig = {
    ...current,
    ...safeUpdates,
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Errore salvataggio discord_bot_config.json:", err);
  }

  return updated;
}

export function getMaskedDiscordConfig(): DiscordBotConfig {
  const cfg = getDiscordConfig();
  const mask = (val: string) => {
    if (!val || val.length <= 8) return val ? "********" : "";
    return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
  };

  return {
    ...cfg,
    clientSecret: mask(cfg.clientSecret),
    botToken: mask(cfg.botToken),
  };
}

export function isDiscordBotConfigured(): boolean {
  const cfg = getDiscordConfig();
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.botToken && cfg.guildId);
}

// Builds the Discord OAuth2 URL for the popup
export function buildDiscordAuthUrl(redirectUri: string, state?: string): string {
  const cfg = getDiscordConfig();
  const clientId = cfg.clientId || "1529792010603466883";
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify guilds",
    prompt: "consent",
  });
  if (state) {
    params.set("state", state);
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// Exchange authorization code for Discord access token
export async function exchangeDiscordCode(code: string, redirectUri: string) {
  const cfg = getDiscordConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error("Discord Client ID o Client Secret non configurati sul server.");
  }

  const params = new URLSearchParams();
  params.append("client_id", cfg.clientId);
  params.append("client_secret", cfg.clientSecret);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Discord token exchange error:", errorText);
    throw new Error(`Errore durante lo scambio del codice Discord: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  };
}

// Get user profile from Discord API
export async function fetchDiscordUserProfile(accessToken: string) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Discord user fetch error:", err);
    throw new Error("Impossibile recuperare il profilo utente da Discord.");
  }

  return (await response.json()) as {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator?: string;
  };
}

// Fetch guild roles using the Bot Token
export async function fetchDiscordGuildRoles(): Promise<Array<{ id: string; name: string; position: number; color: number }>> {
  const cfg = getDiscordConfig();
  if (!cfg.botToken || !cfg.guildId) {
    return [];
  }

  const response = await fetch(`https://discord.com/api/v10/guilds/${cfg.guildId}/roles`, {
    headers: { Authorization: `Bot ${cfg.botToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Discord fetchGuildRoles error:", errText);
    throw new Error(`Impossibile leggere i ruoli del server Discord (${response.status})`);
  }

  return (await response.json()) as Array<{ id: string; name: string; position: number; color: number }>;
}

// Fetch guild member by user ID using the Bot Token
export async function fetchDiscordGuildMember(userId: string) {
  const cfg = getDiscordConfig();
  if (!cfg.botToken || !cfg.guildId) {
    throw new Error("Bot Discord non configurato (mancano Bot Token o Guild ID).");
  }

  const response = await fetch(`https://discord.com/api/v10/guilds/${cfg.guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${cfg.botToken}` },
  });

  if (response.status === 404) {
    return null; // User is not in the guild
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("Discord fetchGuildMember error:", errText);
    throw new Error(`Errore interrogazione membro Discord (${response.status})`);
  }

  return (await response.json()) as {
    user?: { id: string; username: string; avatar?: string | null; global_name?: string | null };
    nick?: string | null;
    roles: string[];
    joined_at?: string;
  };
}

// Fetch all guild members (requires Server Members Intent on the Bot in Discord Dev Portal)
export async function fetchAllDiscordGuildMembers(): Promise<Array<{
  user?: { id: string; username: string; avatar?: string | null; global_name?: string | null };
  nick?: string | null;
  roles: string[];
}>> {
  const cfg = getDiscordConfig();
  if (!cfg.botToken || !cfg.guildId) {
    throw new Error("Bot Discord non configurato (mancano Bot Token o Guild ID).");
  }

  // Discord pagination: up to 1000 members per call
  const allMembers: any[] = [];
  let after = "0";
  let hasMore = true;

  while (hasMore) {
    const url = `https://discord.com/api/v10/guilds/${cfg.guildId}/members?limit=1000${after !== "0" ? `&after=${after}` : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bot ${cfg.botToken}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Discord fetchAllGuildMembers error:", errText);
      throw new Error(`Errore recupero membri gilda: ${response.status} ${response.statusText}. Verifica che l'opzione 'Server Members Intent' sia attiva sul Bot Discord!`);
    }

    const batch = (await response.json()) as any[];
    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allMembers.push(...batch);
      if (batch.length < 1000) {
        hasMore = false;
      } else {
        after = batch[batch.length - 1].user.id;
      }
    }
  }

  return allMembers;
}

// Test bot connection and guild permissions
export async function testDiscordConnection(): Promise<{
  success: boolean;
  botUser?: { id: string; username: string; tag?: string };
  guild?: { id: string; name: string; memberCount?: number; icon?: string | null };
  rolesCount?: number;
  rolesSample?: string[];
  membersIntentActive?: boolean;
  error?: string;
}> {
  const cfg = getDiscordConfig();
  if (!cfg.botToken) {
    return { success: false, error: "Bot Token Discord non inserito." };
  }
  if (!cfg.guildId) {
    return { success: false, error: "Guild ID (Server Discord) non inserito." };
  }

  try {
    // 1. Check Bot self identity
    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${cfg.botToken}` },
    });
    if (!meRes.ok) {
      return { success: false, error: `Bot Token non valido (Errore ${meRes.status})` };
    }
    const botUser = await meRes.json();

    // 2. Check Guild info
    const guildRes = await fetch(`https://discord.com/api/v10/guilds/${cfg.guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${cfg.botToken}` },
    });
    if (!guildRes.ok) {
      return {
        success: false,
        error: `Impossibile accedere al Server Discord (ID: ${cfg.guildId}). Assicurati che il bot sia stato invitato nel server con i permessi corretti! (${guildRes.status})`,
      };
    }
    const guild = await guildRes.json();

    // 3. Check Guild roles
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${cfg.guildId}/roles`, {
      headers: { Authorization: `Bot ${cfg.botToken}` },
    });
    let rolesCount = 0;
    let rolesSample: string[] = [];
    if (rolesRes.ok) {
      const roles = (await rolesRes.json()) as any[];
      rolesCount = roles.length;
      rolesSample = roles.slice(0, 10).map((r: any) => r.name);
    }

    // 4. Test Server Members Intent by fetching 1 member
    let membersIntentActive = true;
    try {
      const memRes = await fetch(`https://discord.com/api/v10/guilds/${cfg.guildId}/members?limit=1`, {
        headers: { Authorization: `Bot ${cfg.botToken}` },
      });
      if (!memRes.ok) {
        membersIntentActive = false;
      }
    } catch {
      membersIntentActive = false;
    }

    return {
      success: true,
      botUser: {
        id: botUser.id,
        username: botUser.username,
        tag: `${botUser.username}#${botUser.discriminator || "0"}`,
      },
      guild: {
        id: guild.id,
        name: guild.name,
        memberCount: guild.approximate_member_count || guild.member_count,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
      },
      rolesCount,
      rolesSample,
      membersIntentActive,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Errore di connessione a Discord." };
  }
}

// Discord Role IDs specifically configured for the CDA Council on the Discord Server
export const DISCORD_CDA_ROLE_IDS: Record<string, { roleName: string; rank: number }> = {
  "1360573608417693788": { roleName: "Presidente CDA", rank: 4 },
  "1376598259388252270": { roleName: "Vice Presidente CDA", rank: 3 },
  "1474509246447222949": { roleName: "Segretario CDA", rank: 2 },
  "1430946447284637806": { roleName: "Consigliere Finale CDA", rank: 5 },
  "1147840203285876746": { roleName: "Consiglio d'Amministrazione", rank: 1 },
};

// Map a set of Discord role names and role IDs to EMS hierarchy and CDA permissions
export function matchDiscordMemberRoles(
  roleNames: string[],
  ownerRoleNameConfig?: string,
  roleIds?: string[]
): {
  isOwner: boolean;
  highestEmsRole: string | null;
  highestGrade: number;
  cdaRole: string | null;
  cdaRank: number;
  cdaRoleId: string | null;
  mainRoleId: string | null;
  hasMainRole: boolean;
  hasCdaRole: boolean;
  isAllowed: boolean;
} {
  let isOwner = false;
  let highestEmsRole: string | null = null;
  let highestGrade = 0;
  let matchedMainRoleId: string | null = null;
  let cdaRole: string | null = null;
  let highestCdaRank = 0;
  let matchedCdaRoleId: string | null = null;

  const targetOwnerName = (ownerRoleNameConfig || "Proprietario").trim().toLowerCase().replace(/[.'’®™┃]/g, "");

  // 1. PRIMARY MATCHING: Using exact Discord Role IDs
  let matchedMainById = false;
  if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
    for (const rId of roleIds) {
      const cleanRId = String(rId).trim();

      // Check CDA Role IDs (Strictly the 5 official CDA IDs)
      const cdaMatch = DISCORD_CDA_ROLE_IDS[cleanRId];
      if (cdaMatch && cdaMatch.rank > highestCdaRank) {
        highestCdaRank = cdaMatch.rank;
        cdaRole = cdaMatch.roleName;
        matchedCdaRoleId = cleanRId;
      }

      // Check EMS Main Hierarchy Role IDs (Strictly the 21 official hierarchy IDs)
      const mainMatch = DISCORD_MAIN_HIERARCHY_ROLE_IDS[cleanRId];
      if (mainMatch) {
        matchedMainById = true;
        if (mainMatch.grade > highestGrade) {
          highestGrade = mainMatch.grade;
          highestEmsRole = mainMatch.name;
          matchedMainRoleId = cleanRId;
        }
        if (cleanRId === "1244676788672659517" || mainMatch.name === "Proprietario EMS") {
          isOwner = true;
        }
      }
    }
  }

  // 2. CHECK CDA BY ROLE NAME (ALWAYS executed if CDA was not found by exact ID)
  if (!cdaRole && roleNames && Array.isArray(roleNames)) {
    for (const rawRole of roleNames) {
      if (!rawRole) continue;
      const cdaMatch = matchCanonicalCdaRole(rawRole);
      if (cdaMatch && cdaMatch.rank > highestCdaRank) {
        highestCdaRank = cdaMatch.rank;
        cdaRole = cdaMatch.name;
      }
    }
  }

  // 3. FALLBACK ONLY FOR MAIN HIERARCHY: If roleIds were not provided or no main hierarchy role was found by ID
  if (!matchedMainById && roleNames && Array.isArray(roleNames)) {
    for (const rawRole of roleNames) {
      if (!rawRole) continue;
      const r = rawRole.trim();
      const rClean = r.toLowerCase().replace(/[.'’®™┃]/g, "").trim();

      // Check Owner / Proprietario
      if (
        rClean === targetOwnerName ||
        rClean.includes("proprietario") ||
        rClean.includes("owner") ||
        rClean.includes("master ems")
      ) {
        isOwner = true;
        if (highestGrade < 100) {
          highestGrade = 100;
          highestEmsRole = "Proprietario EMS";
        }
      }

      // Check EMS Role Grade ONLY for the 21 official main hierarchy roles
      const hierarchyMatch = matchCanonicalMainHierarchyRole(r);
      if (hierarchyMatch) {
        if (hierarchyMatch.grade > highestGrade) {
          highestGrade = hierarchyMatch.grade;
          highestEmsRole = hierarchyMatch.name;
        }
      }
    }
  }

  // Normalize highestEmsRole if user has Owner role
  if (isOwner && (!highestEmsRole || highestGrade < 100)) {
    highestEmsRole = "Proprietario EMS";
    highestGrade = 100;
  }

  return {
    isOwner,
    highestEmsRole,
    highestGrade,
    cdaRole,
    cdaRank: highestCdaRank,
    cdaRoleId: matchedCdaRoleId,
    mainRoleId: matchedMainRoleId,
    hasMainRole: Boolean(highestEmsRole),
    hasCdaRole: Boolean(cdaRole),
    isAllowed: highestGrade > 0 || isOwner || highestCdaRank > 0,
  };
}
