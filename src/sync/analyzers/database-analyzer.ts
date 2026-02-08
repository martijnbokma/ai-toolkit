import { join } from 'path';
import { readdir } from 'fs/promises';
import { fileExists, readTextFile } from '../../utils/file-ops.js';

export interface TableInfo {
  name: string;
  fields: string[];
  hasRLS: boolean;
  description?: string;
}

export interface MigrationInfo {
  filename: string;
  timestamp: string;
  description: string;
}

export interface EdgeFunctionInfo {
  name: string;
  path: string;
}

export interface DatabaseInfo {
  provider: string | null;
  hasMigrations: boolean;
  migrations: MigrationInfo[];
  tables: TableInfo[];
  hasRLS: boolean;
  hasEdgeFunctions: boolean;
  edgeFunctions: EdgeFunctionInfo[];
  configFile: string | null;
}

const DB_PROVIDERS: Array<{ dir: string; configFile: string; name: string }> = [
  { dir: 'supabase', configFile: 'supabase/config.toml', name: 'Supabase' },
  { dir: 'prisma', configFile: 'prisma/schema.prisma', name: 'Prisma' },
  { dir: 'drizzle', configFile: 'drizzle.config.ts', name: 'Drizzle' },
];

function parseMigrationName(filename: string): MigrationInfo {
  const match = filename.match(/^(\d{14})_(.+)\.sql$/);
  if (match) {
    return {
      filename,
      timestamp: match[1],
      description: match[2].replace(/_/g, ' '),
    };
  }

  const name = filename.replace(/\.sql$/, '').replace(/_/g, ' ');
  return { filename, timestamp: '', description: name };
}

function parseCreateTable(sql: string): TableInfo[] {
  const tables: TableInfo[] = [];
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;

  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const fields: string[] = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT')
        || trimmed.startsWith('PRIMARY') || trimmed.startsWith('UNIQUE')
        || trimmed.startsWith('FOREIGN') || trimmed.startsWith('CHECK')) {
        continue;
      }
      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+/);
      if (colMatch) {
        fields.push(colMatch[1]);
      }
    }

    tables.push({
      name: tableName,
      fields,
      hasRLS: false,
    });
  }

  return tables;
}

function detectRLS(sql: string, tables: TableInfo[]): void {
  const rlsRegex = /ALTER\s+TABLE\s+(?:public\.)?["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let match;
  while ((match = rlsRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const table = tables.find((t) => t.name === tableName);
    if (table) table.hasRLS = true;
  }
}

async function analyzeSupabase(projectRoot: string): Promise<DatabaseInfo> {
  const result: DatabaseInfo = {
    provider: 'Supabase',
    hasMigrations: false,
    migrations: [],
    tables: [],
    hasRLS: false,
    hasEdgeFunctions: false,
    edgeFunctions: [],
    configFile: 'supabase/config.toml',
  };

  // Scan migrations
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  if (await fileExists(migrationsDir)) {
    try {
      const entries = await readdir(migrationsDir);
      const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort();

      result.hasMigrations = sqlFiles.length > 0;
      result.migrations = sqlFiles.map(parseMigrationName);

      const allTables: TableInfo[] = [];
      const allSql: string[] = [];

      for (const file of sqlFiles) {
        try {
          const sql = await readTextFile(join(migrationsDir, file));
          allSql.push(sql);
          const tables = parseCreateTable(sql);
          allTables.push(...tables);
        } catch {
          // skip unreadable files
        }
      }

      // Deduplicate tables
      const tableMap = new Map<string, TableInfo>();
      for (const table of allTables) {
        if (!tableMap.has(table.name)) {
          tableMap.set(table.name, table);
        } else {
          const existing = tableMap.get(table.name)!;
          for (const field of table.fields) {
            if (!existing.fields.includes(field)) {
              existing.fields.push(field);
            }
          }
        }
      }

      // Detect RLS across all migrations
      const combinedSql = allSql.join('\n');
      const tables = Array.from(tableMap.values());
      detectRLS(combinedSql, tables);

      result.tables = tables;
      result.hasRLS = tables.some((t) => t.hasRLS);
    } catch {
      // migrations dir not readable
    }
  }

  // Scan edge functions
  const functionsDir = join(projectRoot, 'supabase', 'functions');
  if (await fileExists(functionsDir)) {
    try {
      const entries = await readdir(functionsDir, { withFileTypes: true });
      const functions = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
        .map((e) => ({
          name: e.name,
          path: `supabase/functions/${e.name}`,
        }));

      result.hasEdgeFunctions = functions.length > 0;
      result.edgeFunctions = functions;
    } catch {
      // skip
    }
  }

  return result;
}

async function analyzePrisma(projectRoot: string): Promise<DatabaseInfo> {
  const result: DatabaseInfo = {
    provider: 'Prisma',
    hasMigrations: false,
    migrations: [],
    tables: [],
    hasRLS: false,
    hasEdgeFunctions: false,
    edgeFunctions: [],
    configFile: 'prisma/schema.prisma',
  };

  const schemaPath = join(projectRoot, 'prisma', 'schema.prisma');
  if (await fileExists(schemaPath)) {
    try {
      const schema = await readTextFile(schemaPath);
      const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
      let match;
      while ((match = modelRegex.exec(schema)) !== null) {
        const modelName = match[1];
        const body = match[2];
        const fields = body
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'))
          .map((l) => l.split(/\s+/)[0])
          .filter(Boolean);

        result.tables.push({
          name: modelName,
          fields,
          hasRLS: false,
        });
      }
    } catch {
      // skip
    }
  }

  const migrationsDir = join(projectRoot, 'prisma', 'migrations');
  if (await fileExists(migrationsDir)) {
    try {
      const entries = await readdir(migrationsDir, { withFileTypes: true });
      result.hasMigrations = entries.some((e) => e.isDirectory());
      result.migrations = entries
        .filter((e) => e.isDirectory())
        .map((e) => ({
          filename: e.name,
          timestamp: e.name.split('_')[0] || '',
          description: e.name.replace(/^\d+_/, '').replace(/_/g, ' '),
        }));
    } catch {
      // skip
    }
  }

  return result;
}

export async function analyzeDatabase(projectRoot: string): Promise<DatabaseInfo | null> {
  for (const provider of DB_PROVIDERS) {
    const providerDir = join(projectRoot, provider.dir);
    if (await fileExists(providerDir)) {
      switch (provider.name) {
        case 'Supabase':
          return analyzeSupabase(projectRoot);
        case 'Prisma':
          return analyzePrisma(projectRoot);
        default:
          return {
            provider: provider.name,
            hasMigrations: false,
            migrations: [],
            tables: [],
            hasRLS: false,
            hasEdgeFunctions: false,
            edgeFunctions: [],
            configFile: provider.configFile,
          };
      }
    }
  }

  return null;
}
