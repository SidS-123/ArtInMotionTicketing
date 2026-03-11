import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import { resolve } from 'node:path';

type EnvMap = Record<string, string>;
type JsonRecord = Record<string, unknown>;
type HttpResult = { statusCode: number; body: unknown };

type RelationInfo = {
  name: string;
  methods: string[];
  schemaRefName: string | null;
  columns: ColumnInfo[];
  readProbe: {
    ok: boolean;
    statusCode: number;
    message: string;
    sampleKeys: string[];
  };
};

type ColumnInfo = {
  name: string;
  type: string;
  format: string;
  required: boolean;
  description: string;
};

function parseDotEnv(filePath: string): EnvMap {
  const env: EnvMap = {};

  if (!existsSync(filePath)) {
    return env;
  }

  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function main(): Promise<void> {
  const localEnv = parseDotEnv(resolve(process.cwd(), '.env'));
  const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY;
  const OUTPUT_PATH = process.env.SUPABASE_REPORT_FILE || localEnv.SUPABASE_REPORT_FILE || 'DATABASE_INFO.md';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to .env or environment.');
    process.exit(1);
  }

  const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
  const requestUrl = `${baseUrl}/rest/v1/`;

  const result = await requestJson(requestUrl, {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    console.error('Connection reached Supabase, but schema metadata query failed.');
    console.error(`HTTP ${result.statusCode}`);
    console.error(`Response: ${JSON.stringify(result.body)}`);
    process.exit(1);
  }

  const relationInfos = await extractComprehensiveInfo(baseUrl, SUPABASE_ANON_KEY, result.body);
  const report = buildMarkdownReport(SUPABASE_URL, relationInfos);
  writeFileSync(resolve(process.cwd(), OUTPUT_PATH), report, 'utf8');

  console.log('Supabase connection test passed.');
  console.log(`Relations discovered: ${relationInfos.length}`);
  console.log(`Markdown report written to: ${OUTPUT_PATH}`);
}

main().catch((err: unknown) => {
  console.error('Unexpected failure while testing Supabase connection.');
  console.error(err);
  process.exit(1);
});

function requestJson(url: string, headers: Record<string, string>): Promise<HttpResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          ...headers,
          Accept: 'application/json'
        }
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: unknown = raw;

          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }
          }

          resolvePromise({
            statusCode: res.statusCode || 0,
            body: parsed
          });
        });
      }
    );

    req.on('error', (err) => rejectPromise(err));
    req.end();
  });
}

async function extractComprehensiveInfo(baseUrl: string, anonKey: string, body: unknown): Promise<RelationInfo[]> {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const root = body as JsonRecord;
  const paths = root.paths;
  const components = root.components && typeof root.components === 'object' ? (root.components as JsonRecord) : {};
  const schemas =
    components.schemas && typeof components.schemas === 'object' ? (components.schemas as JsonRecord) : {};

  if (!paths || typeof paths !== 'object') {
    return [];
  }

  const results: RelationInfo[] = [];
  const pathEntries = Object.entries(paths as JsonRecord);

  for (const [path, pathData] of pathEntries) {
    // PostgREST OpenAPI paths usually look like "/table_name"
    const match = path.match(/^\/([^/?]+)$/);
    if (!match) continue;

    const relation = decodeURIComponent(match[1]);
    // Skip RPC/function endpoints if present.
    if (relation === 'rpc') continue;

    if (!pathData || typeof pathData !== 'object') continue;

    const pathItem = pathData as JsonRecord;
    const methods = Object.keys(pathItem)
      .filter((k) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(k))
      .map((m) => m.toUpperCase())
      .sort();

    const schemaRefName = extractSchemaRefName(pathItem);
    const columns = schemaRefName ? extractColumnsFromSchema(schemas[schemaRefName]) : [];
    const readProbe = await probeRelationRead(baseUrl, anonKey, relation);

    results.push({
      name: relation,
      methods,
      schemaRefName,
      columns,
      readProbe
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function extractSchemaRefName(pathItem: JsonRecord): string | null {
  const getOp = pathItem.get;
  if (!getOp || typeof getOp !== 'object') return null;

  const responses = (getOp as JsonRecord).responses;
  if (!responses || typeof responses !== 'object') return null;

  const r200 = (responses as JsonRecord)['200'];
  if (!r200 || typeof r200 !== 'object') return null;

  const content = (r200 as JsonRecord).content;
  if (!content || typeof content !== 'object') return null;

  const appJson = (content as JsonRecord)['application/json'];
  if (!appJson || typeof appJson !== 'object') return null;

  const schema = (appJson as JsonRecord).schema;
  if (!schema || typeof schema !== 'object') return null;

  const schemaObj = schema as JsonRecord;
  const items = schemaObj.items && typeof schemaObj.items === 'object' ? (schemaObj.items as JsonRecord) : null;
  const ref = (items?.$ref as string | undefined) || (schemaObj.$ref as string | undefined);
  if (!ref) return null;

  const parts = ref.split('/');
  return parts.length ? parts[parts.length - 1] : null;
}

function extractColumnsFromSchema(schema: unknown): ColumnInfo[] {
  if (!schema || typeof schema !== 'object') return [];

  const schemaObj = schema as JsonRecord;
  const properties = schemaObj.properties;
  const requiredRaw = schemaObj.required;
  const requiredSet = new Set(Array.isArray(requiredRaw) ? requiredRaw.map(String) : []);

  if (!properties || typeof properties !== 'object') return [];

  const cols: ColumnInfo[] = [];
  for (const [name, prop] of Object.entries(properties as JsonRecord)) {
    if (!prop || typeof prop !== 'object') {
      cols.push({
        name,
        type: 'unknown',
        format: '',
        required: requiredSet.has(name),
        description: ''
      });
      continue;
    }

    const p = prop as JsonRecord;
    cols.push({
      name,
      type: (typeof p.type === 'string' ? p.type : 'unknown'),
      format: (typeof p.format === 'string' ? p.format : ''),
      required: requiredSet.has(name),
      description: (typeof p.description === 'string' ? p.description : '')
    });
  }

  return cols.sort((a, b) => a.name.localeCompare(b.name));
}

async function probeRelationRead(
  baseUrl: string,
  anonKey: string,
  relation: string
): Promise<RelationInfo['readProbe']> {
  const encodedRelation = encodeURIComponent(relation);
  const url = `${baseUrl}/rest/v1/${encodedRelation}?select=*&limit=1`;
  const result = await requestJson(url, {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`
  });

  if (result.statusCode >= 200 && result.statusCode < 300) {
    const first = Array.isArray(result.body) && result.body.length > 0 ? result.body[0] : null;
    const sampleKeys =
      first && typeof first === 'object' ? Object.keys(first as JsonRecord).sort((a, b) => a.localeCompare(b)) : [];

    return {
      ok: true,
      statusCode: result.statusCode,
      message: 'Read probe succeeded',
      sampleKeys
    };
  }

  const msg =
    result.body && typeof result.body === 'object' && typeof (result.body as JsonRecord).message === 'string'
      ? ((result.body as JsonRecord).message as string)
      : 'Read probe failed';

  return {
    ok: false,
    statusCode: result.statusCode,
    message: msg,
    sampleKeys: []
  };
}

function buildMarkdownReport(supabaseUrl: string, relations: RelationInfo[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push('# Supabase Database Introspection Report');
  lines.push('');
  lines.push(`Generated: \`${now}\``);
  lines.push(`Supabase URL: \`${supabaseUrl}\``);
  lines.push(`Relations discovered: **${relations.length}**`);
  lines.push('');
  lines.push('Note: This report is based on endpoints exposed through PostgREST for your current key.');
  lines.push('');
  lines.push('## Relation Summary');
  lines.push('');

  if (relations.length === 0) {
    lines.push('No relations were discovered.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| Relation | Methods | Schema Ref | Read Probe | HTTP |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const rel of relations) {
    const methods = rel.methods.length ? rel.methods.join(', ') : 'n/a';
    const schemaRef = rel.schemaRefName || 'n/a';
    const probe = rel.readProbe.ok ? 'ok' : 'failed';
    lines.push(`| \`${rel.name}\` | ${methods} | \`${schemaRef}\` | ${probe} | ${rel.readProbe.statusCode} |`);
  }

  lines.push('');
  lines.push('## Relation Details');
  lines.push('');

  for (const rel of relations) {
    lines.push(`### ${rel.name}`);
    lines.push('');
    lines.push(`- Methods: ${rel.methods.length ? rel.methods.join(', ') : 'n/a'}`);
    lines.push(`- Schema reference: ${rel.schemaRefName || 'n/a'}`);
    lines.push(`- Read probe: ${rel.readProbe.ok ? 'ok' : 'failed'} (HTTP ${rel.readProbe.statusCode})`);
    lines.push(`- Read probe message: ${rel.readProbe.message}`);
    if (rel.readProbe.sampleKeys.length) {
      lines.push(`- Sample row keys: ${rel.readProbe.sampleKeys.map((k) => `\`${k}\``).join(', ')}`);
    }
    lines.push('');

    if (!rel.columns.length) {
      lines.push('No column metadata available from OpenAPI for this relation.');
      lines.push('');
      continue;
    }

    lines.push('| Column | Type | Format | Required | Description |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const col of rel.columns) {
      const type = col.type || 'unknown';
      const format = col.format || '';
      const required = col.required ? 'yes' : 'no';
      const description = (col.description || '').replace(/\|/g, '\\|');
      lines.push(`| \`${col.name}\` | \`${type}\` | \`${format}\` | ${required} | ${description} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
