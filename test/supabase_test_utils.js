const fs = require("node:fs");
const path = require("node:path");

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function parseSupabaseConfigJs(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const urlMatch = raw.match(/url:\s*"([^"]+)"/);
  const anonKeyMatch = raw.match(/anonKey:\s*"([^"]+)"/);

  return {
    SUPABASE_URL: urlMatch ? urlMatch[1] : "",
    SUPABASE_ANON_KEY: anonKeyMatch ? anonKeyMatch[1] : ""
  };
}

function resolveSupabaseConfig() {
  const rootDir = path.resolve(__dirname, "..");
  const env = parseDotEnv(path.join(rootDir, ".env"));
  const loginConfig = parseSupabaseConfigJs(path.join(rootDir, "login_page", "supabase.config.js"));
  const userConfig = parseSupabaseConfigJs(path.join(rootDir, "user_page", "supabase.config.js"));

  const url =
    process.env.SUPABASE_URL ||
    env.SUPABASE_URL ||
    userConfig.SUPABASE_URL ||
    loginConfig.SUPABASE_URL ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    userConfig.SUPABASE_ANON_KEY ||
    loginConfig.SUPABASE_ANON_KEY ||
    "";

  return {
    url,
    anonKey,
    rootDir
  };
}

function buildRestUrl(baseUrl, table, query = "") {
  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
  return `${cleanBase}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

async function restFetch(baseUrl, anonKey, table, query = "", options = {}) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
    ...options.headers
  };

  const response = await fetch(buildRestUrl(baseUrl, table, query), {
    method: options.method || "GET",
    headers,
    body: options.body
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    data: json
  };
}

function parseVisualSeatId(seatId) {
  const normalized = String(seatId || "").trim();
  const match = normalized.match(/^(.+)-(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    label: normalized,
    section: match[1],
    row: null,
    number: Number(match[2])
  };
}

function buildSeatIdentityKey(section, row, number) {
  const normalizedSection = String(section || "").trim();
  const normalizedRow = row == null ? "" : String(row).trim();
  const normalizedNumber = Number(number);

  if (!normalizedSection || Number.isNaN(normalizedNumber)) {
    return "";
  }

  return `${normalizedSection}|${normalizedRow}|${normalizedNumber}`;
}

function buildDbSeatLabel(seatRow) {
  const section = String(seatRow.section || "").trim();
  const row = seatRow.row == null ? "" : String(seatRow.row).trim();
  const number = Number(seatRow.number);

  if (!section || Number.isNaN(number)) {
    return "";
  }

  if (row) {
    return `${section}${row}-${number}`;
  }

  return `${section}-${number}`;
}

function loadVisualSeatMap(rootDir) {
  const seatMapPath = path.join(rootDir, "user_page", "final-seatmap.json");
  const seatMap = JSON.parse(fs.readFileSync(seatMapPath, "utf8"));
  const totalsByLabel = new Map();
  const seenByLabel = new Map();

  seatMap.forEach((seat) => {
    const label = String(seat.id || "").trim();
    totalsByLabel.set(label, (totalsByLabel.get(label) || 0) + 1);
  });

  return seatMap.map((seat) => {
    const parsed = parseVisualSeatId(seat.id);
    const label = String(seat.id || "").trim();
    const occurrence = (seenByLabel.get(label) || 0) + 1;
    seenByLabel.set(label, occurrence);

    if (!parsed) {
      return {
        ...seat,
        parsed: null,
        occurrence,
        duplicateCount: totalsByLabel.get(label) || 1,
        dbRow: null,
        dbKey: ""
      };
    }

    const duplicateCount = totalsByLabel.get(label) || 1;
    const dbRow = duplicateCount > 1 ? String(occurrence) : null;

    return {
      ...seat,
      parsed,
      occurrence,
      duplicateCount,
      dbRow,
      dbKey: buildSeatIdentityKey(parsed.section, dbRow, parsed.number)
    };
  });
}

module.exports = {
  buildSeatIdentityKey,
  buildDbSeatLabel,
  loadVisualSeatMap,
  parseVisualSeatId,
  resolveSupabaseConfig,
  restFetch
};
