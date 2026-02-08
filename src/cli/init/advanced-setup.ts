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
import { detectLinkedPackage } from "./quick-setup.js";

export async function runAdvancedSetup(
  projectRoot: string,
  existing?: Partial<ToolkitConfig>,
): Promise<Record<string, unknown> | null> {
  const config: Record<string, unknown> = { version: "1.0" };
  const prev = existing || {};

  // --- 1. Project metadata ---
  const name = await askProjectName(projectRoot, prev);
  if (name === null) return null;

  const description = await p.text({
    message: "Description (optional)",
    placeholder: "A short description of your project",
    defaultValue: prev.metadata?.description || "",
  });
  if (isCancelled(description)) return null;

  config.metadata = { name, description };

  // --- 2. Tech stack (auto-detect as defaults, manual override) ---
  const techStack = await askTechStackWithDetection(projectRoot, prev, "advanced");
  if (!techStack) return null;
  config.tech_stack = techStack;

  // --- 3. Editors ---
  const editors = await askEditors(prev);
  if (!editors) return null;
  config.editors = editors;

  // --- 4. Content sources (advanced only) ---
  const prevSource = prev.content_sources?.[0];
  const hasPrevSource = !!prevSource;

  p.note(
    "A shared content source lets you reuse the same rules, skills,\n" +
      "and workflows across multiple projects. New files you add locally\n" +
      "are automatically synced back to the shared source.",
    "Shared content source",
  );

  const wantSsot = await p.confirm({
    message:
      "Do you have a shared folder or package with reusable rules/skills?",
    initialValue: hasPrevSource,
  });
  if (isCancelled(wantSsot)) return null;

  if (wantSsot) {
    // Auto-detect linked ai-toolkit package
    const linkedPath = await detectLinkedPackage(projectRoot);

    const sourceType = await p.select({
      message: "Where are the shared rules/skills stored?",
      options: [
        {
          value: "local",
          label: "Local folder",
          hint: linkedPath
            ? `detected linked package at ${linkedPath}`
            : "a folder on your machine, e.g. ../shared-rules",
        },
        {
          value: "package",
          label: "npm package",
          hint: "an installed package, e.g. @company/ai-rules",
        },
      ],
      initialValue: prevSource?.type || (linkedPath ? "local" : undefined),
    });
    if (isCancelled(sourceType)) return null;

    if (sourceType === "package") {
      const packageName = await p.text({
        message: "Package name",
        placeholder: "@company/ai-rules",
        defaultValue:
          prevSource?.type === "package" ? prevSource.name : undefined,
      });
      if (isCancelled(packageName)) return null;
      if (packageName) {
        config.content_sources = [{ type: "package", name: packageName }];
      }
    } else {
      const prevPath =
        prevSource?.type === "local" ? prevSource.path : undefined;

      // Build path options, avoiding duplicates
      const knownPaths = new Set<string>();
      const pathOptions: { value: string; label: string; hint?: string }[] = [];

      const addOption = (path: string, hint: string) => {
        if (knownPaths.has(path)) return;
        knownPaths.add(path);
        pathOptions.push({ value: path, label: path, hint });
      };

      // 1. Linked package (highest priority)
      if (linkedPath) {
        addOption(linkedPath, "detected via bun/npm link");
      }

      // 2. Previously configured path
      if (prevPath) {
        addOption(prevPath, "current");
      }

      // 3. Default fallback
      addOption("../ai-toolkit", "default");

      // 4. Custom option
      pathOptions.push({ value: "__custom__", label: "Custom path..." });

      // Pre-select: linked > previous > first option
      const initialValue = linkedPath || prevPath || pathOptions[0]?.value;

      const localPath = await p.select({
        message: "Path to the shared folder",
        options: pathOptions,
        initialValue,
      });
      if (isCancelled(localPath)) return null;

      let finalPath = localPath as string;
      if (localPath === "__custom__") {
        const custom = await p.text({
          message: "Custom path (relative to this project)",
          placeholder: "../my-shared-rules",
          defaultValue: prevPath || undefined,
        });
        if (isCancelled(custom)) return null;
        finalPath = custom as string;
      }
      if (finalPath) {
        config.content_sources = [{ type: "local", path: finalPath }];
      }
    }
  }

  return config;
}
