import * as p from "@clack/prompts";
import type { ToolkitConfig } from "../../core/types.js";
import { detectStack } from "../../utils/detect-stack.js";
import type { DetectedStack } from "../../utils/detect-stack.js";

export const ALL_EDITORS = [
  { value: "cursor", label: "Cursor", hint: "AI-first code editor" },
  { value: "windsurf", label: "Windsurf", hint: "Codeium editor" },
  { value: "claude", label: "Claude Code", hint: "Anthropic CLI" },
  { value: "kiro", label: "Kiro", hint: "AWS AI editor" },
  { value: "trae", label: "Trae", hint: "ByteDance AI editor" },
  { value: "gemini", label: "Gemini CLI", hint: "Google CLI" },
  { value: "copilot", label: "GitHub Copilot", hint: "VS Code extension" },
  { value: "codex", label: "Codex CLI", hint: "OpenAI CLI" },
  { value: "aider", label: "Aider", hint: "terminal pair programmer" },
  { value: "roo", label: "Roo Code", hint: "VS Code extension" },
  { value: "kilocode", label: "KiloCode", hint: "VS Code extension" },
  { value: "antigravity", label: "Antigravity", hint: "AI editor" },
  { value: "bolt", label: "Bolt", hint: "StackBlitz AI" },
  { value: "warp", label: "Warp", hint: "AI terminal" },
  { value: "replit", label: "Replit", hint: "Replit Agent" },
  { value: "cline", label: "Cline", hint: "VS Code extension" },
  { value: "amazonq", label: "Amazon Q", hint: "AWS AI assistant" },
  { value: "junie", label: "Junie", hint: "JetBrains AI agent" },
  { value: "augment", label: "Augment Code", hint: "AI coding assistant" },
  { value: "zed", label: "Zed", hint: "AI code editor" },
  { value: "continue", label: "Continue", hint: "open-source AI extension" },
];

export function isCancelled(value: unknown): value is symbol {
  return p.isCancel(value);
}

export async function selectOrCustom(
  message: string,
  options: string[],
  defaultValue?: string,
): Promise<string | null> {
  const isCustom = defaultValue && !options.includes(defaultValue);
  const hint = defaultValue ? ` (current: ${defaultValue})` : "";

  const allOptions = [
    ...options.map((o) => ({ value: o, label: o })),
    { value: "__none__", label: "None / skip" },
    {
      value: "__other__",
      label: isCustom ? `Other... (current: ${defaultValue})` : "Other...",
    },
  ];

  // Pre-select the current value, or __other__ if it's a custom value
  const initialValue = isCustom ? "__other__" : defaultValue || undefined;

  const selected = await p.select({
    message: message + hint,
    options: allOptions,
    initialValue,
  });
  if (isCancelled(selected)) return null;

  if (selected === "__none__") return "";
  if (selected === "__other__") {
    const custom = await p.text({
      message: `${message} (custom)`,
      placeholder: "Type your answer...",
      defaultValue: isCustom ? defaultValue : undefined,
    });
    if (isCancelled(custom)) return null;
    return custom as string;
  }
  return selected as string;
}

export function formatDetected(detected: DetectedStack): string {
  const parts: string[] = [];
  if (detected.language) parts.push(detected.language);
  if (detected.framework) parts.push(detected.framework);
  if (detected.database) parts.push(detected.database);
  if (detected.runtime) parts.push(`(${detected.runtime})`);
  return parts.length > 0 ? parts.join(" + ") : "nothing detected";
}

export async function askProjectName(
  projectRoot: string,
  prev?: Partial<ToolkitConfig>,
): Promise<string | null> {
  const dirName = projectRoot.split("/").pop();
  const projectName = prev?.metadata?.name || dirName || "my-project";
  const name = await p.text({
    message: "Project name",
    placeholder: projectName,
    defaultValue: projectName,
  });
  if (isCancelled(name)) return null;
  return name as string;
}

export async function askTechStack(
  prev?: ToolkitConfig["tech_stack"],
  detected?: DetectedStack,
): Promise<Record<string, string> | null> {
  const language = await selectOrCustom(
    "Language",
    [
      "TypeScript",
      "JavaScript",
      "Python",
      "Go",
      "Rust",
      "Java",
      "C#",
      "PHP",
      "Ruby",
      "Swift",
      "Kotlin",
    ],
    prev?.language || detected?.language,
  );
  if (language === null) return null;

  const framework = await selectOrCustom(
    "Framework",
    [
      "Next.js",
      "React",
      "Vue",
      "Svelte",
      "Angular",
      "Nuxt",
      "Remix",
      "Astro",
      "Express",
      "Fastify",
      "Hono",
      "Django",
      "Flask",
      "FastAPI",
      "Rails",
      "Laravel",
      "Spring Boot",
    ],
    prev?.framework || detected?.framework,
  );
  if (framework === null) return null;

  const database = await selectOrCustom(
    "Database",
    [
      "PostgreSQL",
      "MySQL",
      "SQLite",
      "MongoDB",
      "Redis",
      "Supabase",
      "PlanetScale",
      "DynamoDB",
      "Firestore",
      "Prisma",
      "Drizzle",
    ],
    prev?.database || detected?.database,
  );
  if (database === null) return null;

  const runtime = await selectOrCustom(
    "Runtime",
    ["Node.js", "Bun", "Deno", "Python", "Go", "JVM", ".NET"],
    prev?.runtime || detected?.runtime,
  );
  if (runtime === null) return null;

  return {
    ...(language && { language }),
    ...(framework && { framework }),
    ...(database && { database }),
    ...(runtime && { runtime }),
  };
}

export async function askTechStackWithDetection(
  projectRoot: string,
  prev?: Partial<ToolkitConfig>,
  mode: "quick" | "advanced" = "quick",
): Promise<Record<string, string> | null> {
  const s = p.spinner();
  s.start("Detecting tech stack...");
  const detected = await detectStack(projectRoot);
  s.stop(`Detected: ${formatDetected(detected)}`);

  if (mode === "advanced") {
    // Advanced mode always shows manual selection (with detected values as defaults)
    return askTechStack(prev?.tech_stack, detected);
  }

  // Quick mode: offer to accept detected stack
  const hasDetection =
    detected.language ||
    detected.framework ||
    detected.runtime ||
    detected.database;

  if (hasDetection) {
    const acceptStack = await p.confirm({
      message: "Use detected tech stack?",
      initialValue: true,
    });
    if (isCancelled(acceptStack)) return null;

    if (acceptStack) {
      return {
        ...(detected.language && { language: detected.language }),
        ...(detected.framework && { framework: detected.framework }),
        ...(detected.database && { database: detected.database }),
        ...(detected.runtime && { runtime: detected.runtime }),
      };
    }
  }

  // Fall back to manual selection
  return askTechStack(prev?.tech_stack, detected);
}

export async function askEditors(
  prev?: Partial<ToolkitConfig>,
): Promise<Record<string, boolean> | null> {
  const prevEditors = prev?.editors
    ? Object.entries(prev.editors)
        .filter(([, v]) => (typeof v === "boolean" ? v : v?.enabled !== false))
        .map(([k]) => k)
    : ["cursor", "windsurf", "claude"];

  const selectedEditors = await p.multiselect({
    message: "Which editors do you use? (space to toggle, enter to confirm)",
    options: ALL_EDITORS,
    initialValues: prevEditors,
    required: true,
  });
  if (isCancelled(selectedEditors)) return null;

  const editors: Record<string, boolean> = {};
  for (const editor of ALL_EDITORS) {
    editors[editor.value] = (selectedEditors as string[]).includes(
      editor.value,
    );
  }
  return editors;
}
