import { Command } from "commander";
import { runInit } from "./init.js";
import { runSyncCommand } from "./sync.js";
import { runValidateCommand } from "./validate.js";
import { runWatchCommand } from "./watch.js";
import { runMonorepoSyncCommand } from "./sync-all.js";
import { runPromote } from "./promote.js";
import { runGenerateContext } from "./generate-context.js";

const program = new Command();

program
  .name("ai-toolkit")
  .description(
    "Universal AI toolkit — sync rules, skills, and workflows to all AI editors from a single source of truth",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize ai-toolkit in the current project")
  .option("-f, --force", "Overwrite existing configuration", false)
  .option(
    "-a, --advanced",
    "Full setup wizard with content sources and detailed tech stack",
    false,
  )
  .action(async (options) => {
    await runInit(process.cwd(), options.force, options.advanced);
  });

program
  .command("sync")
  .description("Sync rules, skills, and workflows to all enabled editors")
  .option("-n, --dry-run", "Preview changes without writing files", false)
  .action(async (options) => {
    await runSyncCommand(process.cwd(), { dryRun: options.dryRun });
  });

program
  .command("validate")
  .description("Validate configuration and content")
  .action(async () => {
    await runValidateCommand(process.cwd());
  });

program
  .command("watch")
  .description("Watch for changes and auto-sync")
  .action(async () => {
    await runWatchCommand(process.cwd());
  });

program
  .command("sync-all")
  .description(
    "Sync all projects in a monorepo (finds nested ai-toolkit.yaml files)",
  )
  .option("-n, --dry-run", "Preview changes without writing files", false)
  .action(async (options) => {
    await runMonorepoSyncCommand(process.cwd(), { dryRun: options.dryRun });
  });

program
  .command("promote")
  .description(
    "Promote a local skill/workflow/rule to the shared SSOT (content source)",
  )
  .argument("<file>", "Path to the file to promote (e.g. skills/my-skill.md)")
  .option("-f, --force", "Overwrite if already exists in SSOT", false)
  .action(async (file, options) => {
    await runPromote(process.cwd(), file, options.force);
  });

program
  .command("generate-context")
  .description(
    "Analyze the project and generate a rich PROJECT.md with detected architecture, dependencies, and patterns",
  )
  .option(
    "-f, --force",
    "Overwrite existing PROJECT.md even if it has content",
    false,
  )
  .action(async (options) => {
    await runGenerateContext(process.cwd(), { force: options.force });
  });

program.parse();
