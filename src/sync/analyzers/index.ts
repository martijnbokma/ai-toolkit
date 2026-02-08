import type { ToolkitConfig } from '../../core/types.js';
import {
  readPackageJson,
  analyzeDependencies,
  analyzeScripts,
  type PackageInfo,
  type AnalyzedDependencies,
  type AnalyzedScripts,
} from './package-analyzer.js';
import { analyzeStructure, type ArchitectureInfo } from './structure-analyzer.js';
import { analyzeDatabase, type DatabaseInfo } from './database-analyzer.js';

export interface ProjectAnalysis {
  projectName: string;
  description: string;
  packageInfo: PackageInfo | null;
  dependencies: AnalyzedDependencies | null;
  scripts: AnalyzedScripts | null;
  architecture: ArchitectureInfo;
  database: DatabaseInfo | null;
  techStack: {
    language: string;
    framework: string;
    database: string;
    runtime: string;
    buildTool: string;
    testing: string[];
    styling: string[];
    linting: string[];
    uiLibrary: string | null;
    stateManagement: string | null;
    auth: string[];
  };
}

export async function analyzeProject(
  projectRoot: string,
  config?: ToolkitConfig,
): Promise<ProjectAnalysis> {
  // Run all analyzers in parallel
  const [packageInfo, architecture, database] = await Promise.all([
    readPackageJson(projectRoot),
    analyzeStructure(projectRoot),
    analyzeDatabase(projectRoot),
  ]);

  const dependencies = packageInfo ? analyzeDependencies(packageInfo) : null;
  const scripts = packageInfo ? analyzeScripts(packageInfo) : null;

  // Build unified tech stack (merge config + detected)
  const techStack = {
    language: config?.tech_stack?.language || detectLanguage(architecture) || '',
    framework: config?.tech_stack?.framework || dependencies?.framework || '',
    database: config?.tech_stack?.database || database?.provider || (dependencies?.database?.[0] ?? ''),
    runtime: config?.tech_stack?.runtime || dependencies?.runtime || '',
    buildTool: dependencies?.buildTool || '',
    testing: dependencies?.testing || [],
    styling: dependencies?.styling || [],
    linting: dependencies?.linting || [],
    uiLibrary: dependencies?.uiLibrary || null,
    stateManagement: dependencies?.stateManagement || null,
    auth: dependencies?.auth || [],
  };

  return {
    projectName: config?.metadata?.name || packageInfo?.name || '',
    description: config?.metadata?.description || packageInfo?.description || '',
    packageInfo,
    dependencies,
    scripts,
    architecture,
    database,
    techStack,
  };
}

function detectLanguage(architecture: ArchitectureInfo): string | null {
  if (architecture.configFiles.some((f) => f.startsWith('tsconfig'))) {
    return 'TypeScript';
  }
  if (architecture.entryPoints.some((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) {
    return 'TypeScript';
  }
  if (architecture.entryPoints.some((f) => f.endsWith('.jsx') || f.endsWith('.js'))) {
    return 'JavaScript';
  }
  return null;
}

export type {
  PackageInfo,
  AnalyzedDependencies,
  AnalyzedScripts,
} from './package-analyzer.js';

export type {
  ArchitectureInfo,
  FeatureInfo,
  DirectoryNode,
} from './structure-analyzer.js';

export type {
  DatabaseInfo,
  TableInfo,
  MigrationInfo,
  EdgeFunctionInfo,
} from './database-analyzer.js';
