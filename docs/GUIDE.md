# AI Toolkit — Handleiding

## Inhoudsopgave

1. [Installatie](#installatie)
2. [Eerste gebruik](#eerste-gebruik)
3. [Configuratie](#configuratie)
4. [Content schrijven](#content-schrijven)
5. [Editors instellen](#editors-instellen)
6. [Templates gebruiken](#templates-gebruiken)
7. [Custom editors](#custom-editors)
8. [MCP servers](#mcp-servers)
9. [Editor settings](#editor-settings)
10. [Monorepo setup](#monorepo-setup)
11. [CI/CD integratie](#cicd-integratie)
12. [Commando referentie](#commando-referentie)

---

## Installatie

### Optie 1: Als devDependency (aanbevolen)

```bash
# In je project
bun add -d ai-toolkit

# Of met npm/pnpm
npm install -D ai-toolkit
pnpm add -D ai-toolkit
```

### Optie 2: Direct uitvoeren (zonder installatie)

```bash
bunx ai-toolkit init
bunx ai-toolkit sync
```

### Optie 3: Globaal installeren

```bash
bun add -g ai-toolkit
```

### Optie 4: Lokaal linken (voor development)

Als het package nog niet op npm staat, of je wilt een lokale versie testen:

```bash
# In de ai-toolkit repo:
cd /pad/naar/ai-toolkit
bun link

# In je project:
cd /pad/naar/mijn-project
bun link ai-toolkit
```

Nu kun je `bun ai-toolkit init` en `bun ai-toolkit sync` gebruiken alsof het geïnstalleerd is.

---

## Eerste gebruik

### Stap 1: Initialiseer je project

```bash
cd /pad/naar/je/project
bun ai-toolkit init
```

Dit maakt aan:
- `ai-toolkit.yaml` — je configuratiebestand
- `.ai-content/rules/` — projectregels (gedeeld met alle editors)
- `.ai-content/skills/` — AI skills/commands
- `.ai-content/workflows/` — development workflows
- `.ai-content/overrides/` — editor-specifieke overrides

Plus voorbeeldbestanden:
- `.ai-content/rules/project-conventions.md`
- `.ai-content/skills/code-review.md`

### Stap 2: Configureer je editors

Open `ai-toolkit.yaml` en zet de editors aan die je gebruikt:

```yaml
version: "1.0"

editors:
  cursor: true
  windsurf: true
  claude: true
  # Zet op true wat je gebruikt:
  kiro: false
  trae: false
  gemini: false
  copilot: false

metadata:
  name: "Mijn Project"
  description: "Korte beschrijving van je project"

tech_stack:
  language: typescript
  framework: nextjs
  database: supabase
```

### Stap 3: Sync naar alle editors

```bash
bun ai-toolkit sync
```

Output:
```
✔ Configuration loaded

Syncing to 3 editor(s): cursor, windsurf, claude
ℹ Found 1 rule(s)
  ✓ .ai-content/rules/project-conventions.md → .cursor/rules/project-conventions.md
  ✓ .ai-content/rules/project-conventions.md → .windsurf/rules/project-conventions.md
  ✓ .ai-content/rules/project-conventions.md → .claude/rules/project-conventions.md
ℹ Found 1 skill(s)
  ✓ .ai-content/skills/code-review.md → .cursor/commands/code-review.md
  ✓ .ai-content/skills/code-review.md → .windsurf/workflows/code-review.md
  ✓ .ai-content/skills/code-review.md → .claude/skills/code-review.md
  ✓ generated → .cursorrules
  ✓ generated → .windsurfrules
  ✓ generated → CLAUDE.md

Sync Summary
✓ Synced: 9 file(s)
✓ Sync complete!
```

Dat is het! Je AI editors lezen nu automatisch de gegenereerde bestanden.

---

## Configuratie

### Volledige `ai-toolkit.yaml` referentie

```yaml
version: "1.0"

# Template inheritance (optioneel)
extends:
  - stacks/nextjs

# Welke editors zijn actief
editors:
  cursor: true
  windsurf: true
  claude: true
  kiro: false
  trae: false
  gemini: false
  copilot: false
  codex: false
  aider: false
  roo: false
  kilocode: false
  antigravity: false
  bolt: false
  warp: false

# Project metadata (verschijnt in entry points)
metadata:
  name: "Mijn Project"
  description: "Beschrijving voor AI editors"

# Tech stack (verschijnt in entry points)
tech_stack:
  language: typescript
  framework: nextjs
  database: supabase
  runtime: node

# MCP servers (gedistribueerd naar editors die het ondersteunen)
mcp_servers:
  - name: filesystem
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "./src"]
    enabled: true

# Editor settings (genereert .editorconfig + .vscode/settings.json)
settings:
  indent_size: 2
  indent_style: space
  format_on_save: true

# Ignore patterns (voor templates)
ignore_patterns:
  - node_modules/
  - .next/
  - dist/

# Custom editors (plugin systeem)
custom_editors:
  - name: my-editor
    rules_dir: .my-editor/rules
    skills_dir: .my-editor/skills
    entry_point: MY_EDITOR.md
```

---

## Content schrijven

### Rules (projectregels)

Bestanden in `.ai-content/rules/` worden naar **alle** enabled editors gestuurd.

```markdown
<!-- .ai-content/rules/code-style.md -->
# Code Style

## Naamgeving
- Gebruik camelCase voor variabelen en functies
- Gebruik PascalCase voor klassen en componenten
- Gebruik UPPER_SNAKE_CASE voor constanten

## Bestanden
- Eén component per bestand
- Bestandsnaam = componentnaam (PascalCase)

## Error handling
- Gebruik altijd try/catch bij async operaties
- Log errors met context (welke functie, welke input)
```

### Skills (AI commando's)

Bestanden in `.ai-content/skills/` worden naar editors gestuurd als herbruikbare commando's.

```markdown
<!-- .ai-content/skills/refactor.md -->
# Refactor

## Doel
Refactor code naar betere structuur zonder functionaliteit te wijzigen.

## Proces
1. Analyseer de huidige code
2. Identificeer code smells
3. Pas refactoring patterns toe
4. Verifieer dat tests nog slagen

## Checklist
- [ ] Geen nieuwe bugs geïntroduceerd
- [ ] Tests slagen nog
- [ ] Code is leesbaarder
```

### Workflows (dev processen)

Bestanden in `.ai-content/workflows/` worden alleen naar editors gestuurd die workflows ondersteunen (Windsurf, Kiro).

```markdown
<!-- .ai-content/workflows/create-feature.md -->
# Create Feature

## Stappen
1. Maak een nieuwe branch
2. Schrijf de feature spec
3. Implementeer de feature
4. Schrijf tests
5. Maak een PR
```

### Overrides (editor-specifiek)

Bestanden in `.ai-content/overrides/{editor-naam}/` overschrijven of voegen toe aan een specifieke editor.

```
.ai-content/overrides/
├── cursor/
│   └── cursor-specific-rule.md    → alleen naar .cursor/rules/
├── claude/
│   └── claude-permissions.md      → alleen naar .claude/rules/
└── windsurf/
    └── windsurf-workflow.md       → alleen naar .windsurf/rules/
```

---

## Editors instellen

### Hoe het werkt per editor

| Editor | Wat ai-toolkit genereert | Hoe de editor het leest |
|---|---|---|
| **Cursor** | `.cursorrules` + `.cursor/rules/*.md` | Automatisch bij openen project |
| **Windsurf** | `.windsurfrules` + `.windsurf/rules/*.md` | Automatisch bij openen project |
| **Claude** | `CLAUDE.md` + `.claude/rules/*.md` | Automatisch bij `claude` CLI |
| **Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.md` | Automatisch in VS Code |
| **Codex** | `AGENTS.md` + `.codex/*.md` | Automatisch bij `codex` CLI |
| **Kiro** | `.kiro/steering/*.md` | Automatisch bij openen project |

### Dry-run (preview)

Wil je eerst zien wat er zou gebeuren?

```bash
bun ai-toolkit sync --dry-run
```

### Validatie

Check of je config en content correct zijn:

```bash
bun ai-toolkit validate
```

---

## Templates gebruiken

Templates besparen je tijd door standaard tech stack settings mee te geven.

### Beschikbare templates

| Template | Taal | Framework | Indent |
|---|---|---|---|
| `stacks/nextjs` | TypeScript | Next.js | 2 spaces |
| `stacks/react` | TypeScript | React | 2 spaces |
| `stacks/vue` | TypeScript | Vue | 2 spaces |
| `stacks/svelte` | TypeScript | SvelteKit | 2 spaces |
| `stacks/python-api` | Python | FastAPI | 4 spaces |
| `stacks/django` | Python | Django | 4 spaces |
| `stacks/rails` | Ruby | Rails | 2 spaces |
| `stacks/go-api` | Go | Gin | tabs |

### Gebruik

```yaml
# ai-toolkit.yaml
extends:
  - stacks/nextjs

# Je eigen config overschrijft template waarden:
tech_stack:
  database: supabase  # Voegt toe aan de template
```

### Eigen templates maken

Maak een YAML bestand in `.ai-content/templates/`:

```yaml
# .ai-content/templates/my-stack.yaml
version: "1.0"
tech_stack:
  language: typescript
  framework: remix
  database: prisma
settings:
  indent_size: 2
  indent_style: space
```

Gebruik het:
```yaml
extends:
  - my-stack
```

---

## Custom editors

Heb je een editor die niet ingebouwd is? Definieer hem in YAML:

```yaml
custom_editors:
  - name: supermaven
    rules_dir: .supermaven/rules
    skills_dir: .supermaven/skills
    entry_point: SUPERMAVEN.md
    mcp_config_path: .supermaven/mcp.json
    file_naming: flat  # of 'subdirectory'

editors:
  supermaven: true  # Vergeet niet te activeren!
```

---

## Content Sources (gedeelde rules tussen projecten)

Met `content_sources` kun je rules, skills en workflows delen tussen meerdere projecten. Zo hoef je ze maar één keer te schrijven.

### Optie A: Lokaal pad

Ideaal als je projecten op dezelfde machine staan (of in een monorepo):

```yaml
content_sources:
  - type: local
    path: ../shared-ai-rules        # relatief pad
  - type: local
    path: /Users/team/ai-standards  # absoluut pad
```

De resolver zoekt automatisch naar een `.ai-content/` map in het opgegeven pad. Als die niet bestaat, wordt het pad zelf als content root gebruikt.

**Mapstructuur van de gedeelde bron:**
```
shared-ai-rules/
├── rules/
│   ├── code-style.md
│   └── security.md
├── skills/
│   └── refactor.md
└── workflows/
    └── deploy.md
```

### Optie B: npm package

Ideaal voor teams die rules willen delen via een private of public npm registry:

```yaml
content_sources:
  - type: package
    name: "@mijn-org/ai-rules"
```

Installeer het package eerst:
```bash
bun add -d @mijn-org/ai-rules
```

De resolver zoekt in het package naar `.ai-content/`, `content/`, of de package root.

### Filteren op categorie

Standaard worden `rules`, `skills` en `workflows` allemaal geïmporteerd. Je kunt filteren:

```yaml
content_sources:
  - type: local
    path: ../shared-rules
    include: [rules]           # alleen rules, geen skills/workflows
  - type: package
    name: "@mijn-org/ai-skills"
    include: [skills, workflows]
```

### Prioriteit

**Lokale content wint altijd.** Als je project een `code-style.md` heeft in `.ai-content/rules/` en de externe bron ook, wordt de lokale versie gebruikt. Zo kun je gedeelde rules per project overschrijven.

---

## MCP servers

MCP (Model Context Protocol) servers worden automatisch gedistribueerd naar editors die het ondersteunen:

| Editor | MCP config locatie |
|---|---|
| Cursor | `.cursor/mcp.json` |
| Claude | `.claude/settings.json` |
| Kiro | `.kiro/settings/mcp.json` |
| Copilot | `.vscode/mcp.json` |
| Roo | `.roo/mcp.json` |
| KiloCode | `.kilocode/mcp.json` |

### Configuratie

```yaml
mcp_servers:
  - name: filesystem
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "./src"]
    enabled: true

  - name: postgres
    command: npx
    args: ["-y", "@modelcontextprotocol/server-postgres"]
    env:
      DATABASE_URL: "postgresql://localhost:5432/mydb"
    enabled: true
```

---

## Editor settings

De `settings:` sectie genereert automatisch `.editorconfig` en `.vscode/settings.json`:

```yaml
settings:
  indent_size: 2
  indent_style: space
  format_on_save: true
```

Genereert:

**`.editorconfig`:**
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**`.vscode/settings.json`:**
```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.formatOnSave": true
}
```

---

## Monorepo setup

Voor monorepos met meerdere projecten:

```
my-monorepo/
├── ai-toolkit.yaml          # Root config
├── .ai-content/
├── packages/
│   ├── frontend/
│   │   ├── ai-toolkit.yaml  # Frontend-specifieke config
│   │   └── .ai-content/
│   └── backend/
│       ├── ai-toolkit.yaml  # Backend-specifieke config
│       └── .ai-content/
```

Sync alles in één keer:

```bash
bun ai-toolkit sync-all
```

Dit vindt automatisch alle `ai-toolkit.yaml` bestanden tot 3 niveaus diep.

---

## CI/CD integratie

### npm scripts

```json
{
  "scripts": {
    "ai:sync": "bun ai-toolkit sync",
    "ai:validate": "bun ai-toolkit validate",
    "precommit": "bun ai-toolkit sync"
  }
}
```

### GitHub Actions

```yaml
name: AI Toolkit Sync Check
on:
  pull_request:
    paths: ['.ai-content/**', 'ai-toolkit.yaml']
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun ai-toolkit sync
      - name: Check for uncommitted changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "::error::AI toolkit config is out of sync!"
            echo "Run 'bun ai-toolkit sync' and commit the changes."
            exit 1
          fi
```

### Husky pre-commit hook

```bash
# .husky/pre-commit
bun ai-toolkit sync
git add .cursorrules .windsurfrules CLAUDE.md .cursor/ .windsurf/ .claude/
```

---

## Commando referentie

| Commando | Beschrijving |
|---|---|
| `ai-toolkit init` | Initialiseer project (maakt config + content dirs) |
| `ai-toolkit init --force` | Herinitialiseer (overschrijft bestaande config) |
| `ai-toolkit sync` | Sync content naar alle enabled editors |
| `ai-toolkit sync --dry-run` | Preview wat er zou veranderen |
| `ai-toolkit validate` | Valideer config en content |
| `ai-toolkit watch` | Auto-sync bij wijzigingen |
| `ai-toolkit sync-all` | Sync alle projecten in een monorepo |
| `ai-toolkit sync-all --dry-run` | Preview monorepo sync |

---

## Veelgestelde vragen

### Moet ik de gegenereerde bestanden committen?

**Nee.** ai-toolkit voegt ze automatisch toe aan `.gitignore`. De source of truth is `.ai-content/` — die commit je wel.

### Kan ik handmatig bestanden aanpassen in `.cursor/rules/`?

**Niet doen.** Bestanden met de `AUTO-GENERATED` marker worden overschreven bij de volgende sync. Gebruik in plaats daarvan `.ai-content/overrides/cursor/` voor editor-specifieke content.

### Hoe voeg ik een nieuwe regel toe?

1. Maak een `.md` bestand in `.ai-content/rules/`
2. Draai `bun ai-toolkit sync`
3. Klaar — het bestand is nu in alle editors beschikbaar

### Hoe werkt template inheritance?

Templates worden gemerged met je project config. Je project config wint altijd:

```
Template: tech_stack.language = "typescript"
Project:  tech_stack.database = "supabase"
Resultaat: language = "typescript", database = "supabase"
```

### Kan ik meerdere templates combineren?

Ja:
```yaml
extends:
  - stacks/nextjs
  - my-custom-template
```

Templates worden in volgorde gemerged, later overschrijft eerder.
