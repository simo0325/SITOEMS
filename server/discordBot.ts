import fs from "fs";
import path from "path";
import { getSingleRoleGrade } from "../src/types.js";

export interface DiscordBotConfig {
  clientId: string;
  clientSecret: string;
  botToken: string;
  guildId: string;
  ownerRoleName: string;
  ownerRoleId: string;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number;
}

const CONFIG_FILE = path.join(process.cwd(), "discord_bot_config.json");

function getDefaultConfig(): DiscordBotConfig {
  return {
    clientId: (process.env.DISCORD_CLIENT_ID || "").trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || "").trim(),
    botToken: (process.env.DISCORD_BOT_TOKEN || "").trim(),
    guildId: (process.env.DISCORD_GUILD_ID || "").trim(),
    ownerRoleName: (process.env.DISCORD_OWNER_ROLE_NAME || "Proprietario").trim(),
    ownerRoleId: (process.env.DISCORD_OWNER_ROLE_ID || "").trim(),
    autoSyncEnabled: true,
    lastSyncAt: null,
    lastSyncCount: 0,
  };
}

let cachedConfig: DiscordBotConfig | null = null;

export function getDiscordConfig(): DiscordBotConfig {
  if (cachedConfig) return cachedConfig;

  let cfg = getDefaultConfig();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      cfg = {
        ...cfg,
        ...data,
        // Allow env variables to take precedence if defined and non-empty
        clientId: process.env.DISCORD_CLIENT_ID || data.clientId || cfg.clientId,
        clientSecret: process.env.DISCORD_CLIENT_SECRET || data.clientSecret || cfg.clientSecret,
        botToken: process.env.DISCORD_BOT_TOKEN || data.botToken || cfg.botToken,
        guildId: process.env.DISCORD_GUILD_ID || data.guildId || cfg.guildId,
        ownerRoleName: process.env.DISCORD_OWNER_ROLE_NAME || data.ownerRoleName || cfg.ownerRoleName,
        ownerRoleId: process.env.DISCORD_OWNER_ROLE_ID || data.ownerRoleId || cfg.ownerRoleId,
      };
    }
  } catch (err) {
    console.error("Errore lettura discord_bot_config.json:", err);
  }

  cachedConfig = cfg;
  return cfg;
}

export function saveDiscordConfig(updates: Partial<DiscordBotConfig>): DiscordBotConfig {
  const current = getDiscordConfig();
  const updated: DiscordBotConfig = {
    ...current,
    ...updates,
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    cachedConfig = updated;
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
  const clientId = cfg.clientId || "1234567890";
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

// Map a set of Discord role names to EMS hierarchy and permissions
export function matchDiscordMemberRoles(
  roleNames: string[],
  ownerRoleNameConfig?: string
): {
  isOwner: boolean;
  highestEmsRole: string | null;
  highestGrade: number;
  cdaRole: string | null;
  isAllowed: boolean;
} {
  let isOwner = false;
  let highestEmsRole: string | null = null;
  let highestGrade = 0;
  let cdaRole: string | null = null;

  const targetOwnerName = (ownerRoleNameConfig || "Proprietario").trim().toLowerCase();

  for (const rawRole of roleNames) {
    const r = rawRole.trim();
    const rLower = r.toLowerCase();

    // Check Owner / Proprietario
    if (
      rLower === targetOwnerName ||
      rLower.includes("proprietario") ||
      rLower.includes("owner") ||
      rLower.includes("master ems")
    ) {
      isOwner = true;
      if (highestGrade < 100) {
        highestGrade = 100;
        highestEmsRole = "Proprietario";
      }
    }

    // Check CDA
    if (rLower.includes("presidente cda") || rLower.includes("presidente consiglio")) {
      cdaRole = "Presidente CDA";
    } else if (rLower.includes("vice presidente cda") || rLower.includes("v. presidente cda")) {
      if (!cdaRole || cdaRole === "Membro CDA") cdaRole = "Vice Presidente CDA";
    } else if (rLower.includes("segretario cda")) {
      if (!cdaRole || cdaRole === "Membro CDA") cdaRole = "Segretario CDA";
    } else if (rLower.includes("membro cda") || rLower.includes("consiglio di amministrazione") || rLower === "cda") {
      if (!cdaRole) cdaRole = "Membro CDA";
    }

    // Check EMS Role Grade
    const grade = getSingleRoleGrade(r);
    if (grade > highestGrade) {
      highestGrade = grade;
      highestEmsRole = r;
    }
  }

  // Normalize highestEmsRole if user has Owner role
  if (isOwner && (!highestEmsRole || highestGrade < 100)) {
    highestEmsRole = "Proprietario";
    highestGrade = 100;
  }

  return {
    isOwner,
    highestEmsRole,
    highestGrade,
    cdaRole,
    isAllowed: highestGrade > 0 || isOwner,
  };
}
