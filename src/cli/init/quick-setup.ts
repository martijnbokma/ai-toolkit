import { join, resolve, relative } from "path";
import { createRequire } from "module";
import * as p from "@clack/prompts";
import type { ToolkitConfig } from "../../core/types.js";
import { fileExists } from "../../utils/file-ops.js";
import {
  isCancelled,
  askProjectName,
  askTechStackWithDetection,
  askEditors,
} from "./prompt-helpers.js";

/**
 * Scan for common shared content source folders near the project.
 * Returns a relative path if found, or null if nothing detected.
 */
export async function detectNearbySsot(projectRoot: string): Promise<string | null> {
  // 1. Try to resolve ai-toolkit as a linked/installed package
  const linkedPath = await detectLinkedPackage(projectRoot);
  if (linkedPath) return linkedPath;

  // 2. Fall back to scanning common relative paths
  const candidates = [
    "../ai-toolkit",
    "../shared-ai-rules",
    "../ai-rules",
    "../shared-rules",
  ];

  for (const candidate of candidates) {
    const resolved = resolve(projectRoot, candidate);
    // Don't match the project itself
    if (resolved === projectRoot) continue;

    // Check if the candidate has .ai-content/ or templates/ with rules/skills
    const contentDir = join(resolved, ".ai-content");
    const templatesDir = join(resolved, "templates");

    if (
      (await fileExists(join(contentDir, "rules"))) ||
      (await fileExists(join(contentDir, "skills")))
    ) {
      return candidate;
    }
    if (
      (await fileExists(join(templatesDir, "rules"))) ||
      (await fileExists(join(templatesDir, "skills")))
    ) {
      return candidate;
    }
  }

  return null;
}

/**
 * Detect ai-toolkit as a linked or installed package (e.g. via bun link / npm link).
 * Returns a relative path to the package root if found, or null.
 */
export async function detectLinkedPackage(projectRoot: string): Promise<string | null> {
  try {
    const require = createRequire(join(projectRoot, "package.json"));
    const packageJsonPath = require.resolve("ai-toolkit/package.json");
    const packageRoot = resolve(packageJsonPath, "..");

    // Don't match the project itself
    if (packageRoot === projectRoot) return null;

    // Verify it has content (rules/skills in .ai-content/ or templates/)
    const contentDir = join(packageRoot, ".ai-content");
    const templatesDir = join(packageRoot, "templates");

    const hasContent =
      (await fileExists(join(contentDir, "rules"))) ||
      (await fileExists(join(contentDir, "skills"))) ||
      (await fileExists(join(templatesDir, "rules"))) ||
      (await fileExists(join(templatesDir, "skills")));

    if (!hasContent) return null;

    // Return as relative path for consistency with other SSOT paths
    return relative(projectRoot, packageRoot) || null;
  } catch {
    // Package not installed/linked — that's fine
    return null;
  }
}

export async function runQuickSetup(
  projectRoot: string,
  existing?: Partial<ToolkitConfig>,
): Promise<Record<string, unknown> | null> {
  const config: Record<string, unknown> = { version: "1.0" };
  const prev = existing || {};

  // --- 1. Project name (auto-filled from directory) ---
  const name = await askProjectName(projectRoot, prev);
  if (name === null) return null;

  config.metadata = { name, description: prev.metadata?.description || "" };

  // --- 2. Auto-detect tech stack ---
  const techStack = await askTechStackWithDetection(projectRoot, prev, "quick");
  if (!techStack) return null;
  config.tech_stack = techStack;

  // --- 3. Editors ---
  const editors = await askEditors(prev);
  if (!editors) return null;
  config.editors = editors;

  // --- 4. Auto-detect shared content source (lightweight SSOT discovery) ---
  const detectedSsot = await detectNearbySsot(projectRoot);
  if (detectedSsot) {
    const useSsot = await p.confirm({
      message: `Found shared content source at ${detectedSsot}. Link it for cross-project sync?`,
      initialValue: true,
    });
    if (isCancelled(useSsot)) return null;

    if (useSsot) {
      config.content_sources = [{ type: "local", path: detectedSsot }];
    }
  }

  return config;
}
