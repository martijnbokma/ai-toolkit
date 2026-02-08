import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { analyzeDatabase } from '../../../src/sync/analyzers/database-analyzer.js';

describe('DatabaseAnalyzer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-db-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return null when no database provider detected', async () => {
    const result = await analyzeDatabase(testDir);
    expect(result).toBeNull();
  });

  describe('Supabase', () => {
    it('should detect Supabase provider', async () => {
      await mkdir(join(testDir, 'supabase'), { recursive: true });
      await writeFile(join(testDir, 'supabase', 'config.toml'), '');

      const result = await analyzeDatabase(testDir);
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('Supabase');
      expect(result!.configFile).toBe('supabase/config.toml');
    });

    it('should detect migrations', async () => {
      await mkdir(join(testDir, 'supabase', 'migrations'), { recursive: true });
      await writeFile(
        join(testDir, 'supabase', 'migrations', '20240101000000_create_users.sql'),
        'CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL, name text);',
      );

      const result = await analyzeDatabase(testDir);
      expect(result!.hasMigrations).toBe(true);
      expect(result!.migrations.length).toBe(1);
      expect(result!.migrations[0].timestamp).toBe('20240101000000');
      expect(result!.migrations[0].description).toBe('create users');
    });

    it('should parse CREATE TABLE statements', async () => {
      await mkdir(join(testDir, 'supabase', 'migrations'), { recursive: true });
      await writeFile(
        join(testDir, 'supabase', 'migrations', '20240101000000_init.sql'),
        `CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text
);

CREATE TABLE posts (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  content text,
  user_id uuid REFERENCES users(id)
);`,
      );

      const result = await analyzeDatabase(testDir);
      expect(result!.tables.length).toBe(2);
      expect(result!.tables.find((t) => t.name === 'users')).toBeDefined();
      expect(result!.tables.find((t) => t.name === 'posts')).toBeDefined();
    });

    it('should detect RLS', async () => {
      await mkdir(join(testDir, 'supabase', 'migrations'), { recursive: true });
      await writeFile(
        join(testDir, 'supabase', 'migrations', '20240101000000_init.sql'),
        `CREATE TABLE users (id uuid PRIMARY KEY, email text);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;`,
      );

      const result = await analyzeDatabase(testDir);
      expect(result!.hasRLS).toBe(true);
      expect(result!.tables.find((t) => t.name === 'users')?.hasRLS).toBe(true);
    });

    it('should detect edge functions', async () => {
      await mkdir(join(testDir, 'supabase', 'functions', 'send-email'), { recursive: true });
      await mkdir(join(testDir, 'supabase', 'functions', 'process-webhook'), { recursive: true });

      const result = await analyzeDatabase(testDir);
      expect(result!.hasEdgeFunctions).toBe(true);
      expect(result!.edgeFunctions.length).toBe(2);
      expect(result!.edgeFunctions.map((f) => f.name).sort()).toEqual(['process-webhook', 'send-email']);
    });

    it('should handle migration without standard naming', async () => {
      await mkdir(join(testDir, 'supabase', 'migrations'), { recursive: true });
      await writeFile(
        join(testDir, 'supabase', 'migrations', 'custom_migration.sql'),
        'CREATE TABLE test (id int);',
      );

      const result = await analyzeDatabase(testDir);
      expect(result!.migrations[0].description).toBe('custom migration');
      expect(result!.migrations[0].timestamp).toBe('');
    });
  });

  describe('Prisma', () => {
    it('should detect Prisma provider', async () => {
      await mkdir(join(testDir, 'prisma'), { recursive: true });
      await writeFile(
        join(testDir, 'prisma', 'schema.prisma'),
        `model User {
  id    String @id @default(uuid())
  email String @unique
  name  String?
}

model Post {
  id      String @id @default(uuid())
  title   String
  content String?
}`,
      );

      const result = await analyzeDatabase(testDir);
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('Prisma');
      expect(result!.tables.length).toBe(2);
      expect(result!.tables.find((t) => t.name === 'User')).toBeDefined();
      expect(result!.tables.find((t) => t.name === 'Post')).toBeDefined();
    });

    it('should detect Prisma migrations', async () => {
      await mkdir(join(testDir, 'prisma', 'migrations', '20240101_init'), { recursive: true });
      await writeFile(join(testDir, 'prisma', 'schema.prisma'), '');

      const result = await analyzeDatabase(testDir);
      expect(result!.hasMigrations).toBe(true);
      expect(result!.migrations.length).toBe(1);
    });
  });

  describe('Drizzle', () => {
    it('should detect Drizzle provider', async () => {
      await mkdir(join(testDir, 'drizzle'), { recursive: true });

      const result = await analyzeDatabase(testDir);
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('Drizzle');
    });
  });
});
