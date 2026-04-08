import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import { resolve } from 'node:path';

type EnvMap = Record<string, string>;
type JsonRecord = Record<string, unknown>;

type ColumnMeta = {
  name: string;
  type: string;
  format: string;
  required: boolean;
};

type TableMeta = {
  name: string;
  methods: string[];
  columns: ColumnMeta[];
};

function parseDotEnv(filePath: string): EnvMap {
  const env: EnvMap = {};
  if (!existsSync(filePath)) return env;

  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function requestJson(url: string, headers: Record<string, string>): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          ...headers,
          Accept: 'application/openapi+json'
        }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let body: unknown = raw;
          try {
            body = JSON.parse(raw);
          } catch {
            // keep raw string body
          }
          resolvePromise({ statusCode: res.statusCode || 0, body });
        });
      }
    );
    req.on('error', (err) => rejectPromise(err));
    req.end();
  });
}

function parseTablesFromOpenApi(doc: JsonRecord): TableMeta[] {
  const paths = (doc.paths && typeof doc.paths === 'object') ? (doc.paths as JsonRecord) : {};
  const definitions = (doc.definitions && typeof doc.definitions === 'object') ? (doc.definitions as JsonRecord) : {};

  const byName = new Map<string, TableMeta>();

  for (const [rawPath, value] of Object.entries(paths)) {
    const match = rawPath.match(/^\/([^/?]+)$/);
    if (!match) continue;
    const table = decodeURIComponent(match[1]);
    if (table === 'rpc') continue;
    if (!value || typeof value !== 'object') continue;

    const pathObj = value as JsonRecord;
    const methods = Object.keys(pathObj)
      .filter((k) => ['get', 'post', 'patch', 'put', 'delete', 'head', 'options'].includes(k))
      .map((m) => m.toUpperCase())
      .sort();

    byName.set(table, {
      name: table,
      methods,
      columns: []
    });
  }

  for (const [table, defRaw] of Object.entries(definitions)) {
    if (!byName.has(table)) {
      byName.set(table, { name: table, methods: [], columns: [] });
    }
    if (!defRaw || typeof defRaw !== 'object') continue;
    const def = defRaw as JsonRecord;
    const props = (def.properties && typeof def.properties === 'object') ? (def.properties as JsonRecord) : {};
    const requiredSet = new Set<string>(
      Array.isArray(def.required) ? def.required.map((x) => String(x)) : []
    );

    const cols: ColumnMeta[] = Object.entries(props)
      .map(([name, propRaw]) => {
        const prop = (propRaw && typeof propRaw === 'object') ? (propRaw as JsonRecord) : {};
        return {
          name,
          type: typeof prop.type === 'string' ? prop.type : 'unknown',
          format: typeof prop.format === 'string' ? prop.format : '',
          required: requiredSet.has(name)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    byName.get(table)!.columns = cols;
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildMarkdown(supabaseUrl: string, tables: TableMeta[]): string {
  const lines: string[] = [];
  lines.push('# Supabase Database Introspection Report');
  lines.push('');
  lines.push(`Generated: \`${new Date().toISOString()}\``);
  lines.push(`Supabase URL: \`${supabaseUrl}\``);
  lines.push(`Relations discovered: **${tables.length}**`);
  lines.push('');
  lines.push('Source: Supabase PostgREST OpenAPI (`/rest/v1/`, `definitions` + `paths`).');
  lines.push('');
  lines.push('## Relation Summary');
  lines.push('');
  lines.push('| Relation | Methods | Columns |');
  lines.push('| --- | --- | --- |');
  for (const table of tables) {
    lines.push(`| \`${table.name}\` | ${table.methods.join(', ') || 'n/a'} | ${table.columns.length} |`);
  }
  lines.push('');
  lines.push('## Relation Details');
  lines.push('');
  for (const table of tables) {
    lines.push(`### ${table.name}`);
    lines.push('');
    lines.push(`- Methods: ${table.methods.join(', ') || 'n/a'}`);
    lines.push(`- Column count: ${table.columns.length}`);
    lines.push('');
    if (!table.columns.length) {
      lines.push('No column metadata available for this relation.');
      lines.push('');
      continue;
    }
    lines.push('| Column | Type | Format | Required |');
    lines.push('| --- | --- | --- | --- |');
    for (const col of table.columns) {
      lines.push(`| \`${col.name}\` | \`${col.type}\` | \`${col.format}\` | ${col.required ? 'yes' : 'no'} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const env = parseDotEnv(resolve(process.cwd(), '.env'));
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const outputPath = process.env.SUPABASE_REPORT_FILE || env.SUPABASE_REPORT_FILE || 'DATABASE_INFO.md';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const res = await requestJson(`${baseUrl}/rest/v1/`, {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    console.error(`Metadata request failed. HTTP ${res.statusCode}`);
    console.error(JSON.stringify(res.body));
    process.exit(1);
  }

  if (!res.body || typeof res.body !== 'object') {
    console.error('Unexpected metadata payload.');
    process.exit(1);
  }

  const tables = parseTablesFromOpenApi(res.body as JsonRecord);
  const markdown = buildMarkdown(supabaseUrl, tables);
  writeFileSync(resolve(process.cwd(), outputPath), markdown, 'utf8');

  console.log(`Updated ${outputPath}`);
  console.log(`Tables: ${tables.length}`);
}

main().catch((err) => {
  console.error('Failed to build schema report.');
  console.error(err);
  process.exit(1);
});
