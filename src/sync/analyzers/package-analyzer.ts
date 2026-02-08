import { join } from 'path';
import { readTextFile, fileExists } from '../../utils/file-ops.js';

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  packageManager?: string;
}

export interface AnalyzedDependencies {
  framework: string | null;
  uiLibrary: string | null;
  stateManagement: string | null;
  testing: string[];
  styling: string[];
  database: string[];
  auth: string[];
  buildTool: string | null;
  linting: string[];
  runtime: string | null;
  keyDeps: Array<{ name: string; version: string; purpose: string }>;
}

export interface AnalyzedScripts {
  dev: string | null;
  build: string | null;
  test: string | null;
  lint: string | null;
  typecheck: string | null;
  all: Record<string, string>;
}

const FRAMEWORK_MAP: Record<string, string> = {
  'next': 'Next.js',
  'react': 'React',
  'react-dom': 'React',
  'vue': 'Vue',
  'nuxt': 'Nuxt',
  'svelte': 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  'angular': 'Angular',
  '@angular/core': 'Angular',
  'astro': 'Astro',
  'remix': 'Remix',
  '@remix-run/react': 'Remix',
  'express': 'Express',
  'fastify': 'Fastify',
  'hono': 'Hono',
  '@nestjs/core': 'NestJS',
  'gatsby': 'Gatsby',
};

const UI_LIBRARY_MAP: Record<string, string> = {
  '@radix-ui/react-dialog': 'Radix UI (shadcn)',
  '@shadcn/ui': 'shadcn/ui',
  '@mui/material': 'Material UI',
  '@chakra-ui/react': 'Chakra UI',
  'antd': 'Ant Design',
  '@mantine/core': 'Mantine',
  'daisyui': 'DaisyUI',
  '@headlessui/react': 'Headless UI',
};

const STATE_MGMT_MAP: Record<string, string> = {
  'zustand': 'Zustand',
  'jotai': 'Jotai',
  'recoil': 'Recoil',
  '@reduxjs/toolkit': 'Redux Toolkit',
  'redux': 'Redux',
  'mobx': 'MobX',
  '@tanstack/react-query': 'TanStack Query',
  'swr': 'SWR',
  'valtio': 'Valtio',
};

const TESTING_MAP: Record<string, string> = {
  'vitest': 'Vitest',
  'jest': 'Jest',
  '@testing-library/react': 'React Testing Library',
  '@testing-library/vue': 'Vue Testing Library',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  '@playwright/test': 'Playwright',
  'mocha': 'Mocha',
};

const STYLING_MAP: Record<string, string> = {
  'tailwindcss': 'TailwindCSS',
  'sass': 'Sass',
  'styled-components': 'Styled Components',
  '@emotion/react': 'Emotion',
  'postcss': 'PostCSS',
  'less': 'Less',
};

const DATABASE_MAP: Record<string, string> = {
  '@supabase/supabase-js': 'Supabase',
  'prisma': 'Prisma',
  '@prisma/client': 'Prisma',
  'drizzle-orm': 'Drizzle ORM',
  'mongoose': 'Mongoose (MongoDB)',
  'pg': 'PostgreSQL (pg)',
  'mysql2': 'MySQL',
  'better-sqlite3': 'SQLite',
  'typeorm': 'TypeORM',
  'sequelize': 'Sequelize',
  'firebase': 'Firebase',
  'firebase-admin': 'Firebase Admin',
};

const AUTH_MAP: Record<string, string> = {
  '@supabase/supabase-js': 'Supabase Auth',
  'next-auth': 'NextAuth.js',
  '@auth/core': 'Auth.js',
  'passport': 'Passport.js',
  '@clerk/nextjs': 'Clerk',
  'firebase': 'Firebase Auth',
  'lucia': 'Lucia',
};

const BUILD_TOOL_MAP: Record<string, string> = {
  'vite': 'Vite',
  'webpack': 'Webpack',
  'esbuild': 'esbuild',
  'turbo': 'Turborepo',
  'tsup': 'tsup',
  'rollup': 'Rollup',
  'parcel': 'Parcel',
};

const LINTING_MAP: Record<string, string> = {
  'eslint': 'ESLint',
  'prettier': 'Prettier',
  'biome': 'Biome',
  '@biomejs/biome': 'Biome',
  'oxlint': 'OxLint',
};

function detectRuntime(pkg: PackageInfo): string | null {
  if (pkg.packageManager?.startsWith('bun')) return 'Bun';
  if (pkg.packageManager?.startsWith('pnpm')) return 'pnpm (Node.js)';
  if (pkg.packageManager?.startsWith('yarn')) return 'Yarn (Node.js)';

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if ('bun-types' in allDeps) return 'Bun';
  if ('@types/bun' in allDeps) return 'Bun';
  if ('@types/deno' in allDeps) return 'Deno';

  return null;
}

function matchDeps(
  allDeps: Record<string, string>,
  map: Record<string, string>,
): string[] {
  const matched: string[] = [];
  for (const [dep, label] of Object.entries(map)) {
    if (dep in allDeps && !matched.includes(label)) {
      matched.push(label);
    }
  }
  return matched;
}

function firstMatch(
  allDeps: Record<string, string>,
  map: Record<string, string>,
): string | null {
  for (const [dep, label] of Object.entries(map)) {
    if (dep in allDeps) return label;
  }
  return null;
}

function categorizeKeyDeps(
  allDeps: Record<string, string>,
): Array<{ name: string; version: string; purpose: string }> {
  const purposeMap: Record<string, string> = {
    'react-router-dom': 'Routing',
    '@tanstack/react-router': 'Routing',
    'react-hook-form': 'Form handling',
    'zod': 'Schema validation',
    'yup': 'Schema validation',
    'axios': 'HTTP client',
    'date-fns': 'Date utilities',
    'dayjs': 'Date utilities',
    'lucide-react': 'Icons',
    '@heroicons/react': 'Icons',
    'react-icons': 'Icons',
    'framer-motion': 'Animations',
    'i18next': 'Internationalization',
    'react-i18next': 'Internationalization',
    'sonner': 'Toast notifications',
    'react-hot-toast': 'Toast notifications',
    '@tanstack/react-table': 'Data tables',
    'class-variance-authority': 'Component variants',
    'clsx': 'Class name utilities',
    'tailwind-merge': 'Tailwind class merging',
    'cmdk': 'Command palette',
    'emoji-mart': 'Emoji picker',
    '@emoji-mart/react': 'Emoji picker',
  };

  const results: Array<{ name: string; version: string; purpose: string }> = [];
  for (const [dep, purpose] of Object.entries(purposeMap)) {
    if (dep in allDeps) {
      results.push({ name: dep, version: allDeps[dep], purpose });
    }
  }
  return results;
}

export async function readPackageJson(projectRoot: string): Promise<PackageInfo | null> {
  const pkgPath = join(projectRoot, 'package.json');
  if (!(await fileExists(pkgPath))) return null;

  try {
    const raw = await readTextFile(pkgPath);
    const pkg = JSON.parse(raw);
    return {
      name: pkg.name || '',
      version: pkg.version || '',
      description: pkg.description || '',
      scripts: pkg.scripts || {},
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      packageManager: pkg.packageManager,
    };
  } catch {
    return null;
  }
}

export function analyzeDependencies(pkg: PackageInfo): AnalyzedDependencies {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  return {
    framework: firstMatch(allDeps, FRAMEWORK_MAP),
    uiLibrary: firstMatch(allDeps, UI_LIBRARY_MAP),
    stateManagement: firstMatch(allDeps, STATE_MGMT_MAP),
    testing: matchDeps(allDeps, TESTING_MAP),
    styling: matchDeps(allDeps, STYLING_MAP),
    database: matchDeps(allDeps, DATABASE_MAP),
    auth: matchDeps(allDeps, AUTH_MAP),
    buildTool: firstMatch(allDeps, BUILD_TOOL_MAP),
    linting: matchDeps(allDeps, LINTING_MAP),
    runtime: detectRuntime(pkg),
    keyDeps: categorizeKeyDeps(allDeps),
  };
}

export function analyzeScripts(pkg: PackageInfo): AnalyzedScripts {
  const scripts = pkg.scripts;
  return {
    dev: scripts.dev || scripts.start || null,
    build: scripts.build || null,
    test: scripts.test || null,
    lint: scripts.lint || null,
    typecheck: scripts.typecheck || scripts['type-check'] || null,
    all: scripts,
  };
}
