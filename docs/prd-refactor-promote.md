# R-PRD: Refactor `src/cli/promote.ts`

## 1. Overview & Rationale

`promote.ts` bevat twee publieke functies — `runPromote()` (regels 27-105) en `runPromoteForce()` (regels 107-163) — die **~90% identieke code** delen. Het enige verschil is:

1. `runPromote` checkt of het doelbestand al bestaat en stopt zo ja
2. `runPromoteForce` slaat die check over

Dit is een duidelijke DRY-schending: 78 regels van de 163 zijn exacte duplicaten.

## 2. Principle Analysis

### DRY Check
- ❌ **Kritiek**: Pad-resolutie logica (3 branches: `.ai-content/` prefix, absoluut pad, relatief pad) is **2x gekopieerd** (regels 50-62 en 124-133)
- ❌ **Kritiek**: Config laden + sourceRoot resolutie is **2x gekopieerd** (regels 32-43 en 112-118)
- ❌ **Kritiek**: File existence check + content type detectie is **2x gekopieerd** (regels 65-76 en 135-144)
- ❌ **Kritiek**: Copy-logica (ensureDir + readTextFile + writeTextFile) is **2x gekopieerd**

### SSOT Check
- ✅ Types komen uit `core/types.ts`
- ✅ Constanten komen uit `core/types.ts`
- ⚠️ De pad-resolutie logica is een lokale SSOT-schending

### Modularity Check
- ✅ Promote is correct geïsoleerd als CLI-command
- ⚠️ `resolveContentSourcePath` en `detectContentType` zijn private helpers die potentieel herbruikbaar zijn

### Architecture Check
- ✅ Geen UI-logica in data-laag
- ✅ Correcte scheiding van CLI (spinner/log) en file-operaties

## 3. Refactoring Goals

1. **Elimineer duplicatie**: Combineer `runPromote` en `runPromoteForce` tot één private `promoteContent(projectRoot, filePath, force)` functie
2. **Behoud publieke API**: De twee exports blijven bestaan als thin wrappers
3. **Reduceer LOC**: Van 163 → ~100 regels

## 4. Impact Analysis

### Affected Components/Modules
- `src/cli/promote.ts` — enige bestand dat wijzigt
- `src/cli/index.ts` — importeert `runPromote` en `runPromoteForce`, **geen wijziging nodig**

### Dependencies
- Alleen aangeroepen vanuit `cli/index.ts` (regels 61-66)
- Geen andere modules zijn afhankelijk

### Location Decision
- Blijft in `src/cli/promote.ts` — geen verplaatsing nodig

## 5. Proposed Changes & Rationale

### DRY Improvements

Extract gedeelde logica naar een private functie:

```typescript
async function promoteContent(
  projectRoot: string,
  filePath: string,
  force: boolean,
): Promise<void> {
  const spinner = createSpinner(`Promoting content${force ? ' (force)' : ''}...`);
  spinner.start();

  try {
    const config = await loadConfig(projectRoot);
    const sourceRoot = resolveContentSourcePath(projectRoot, config);
    if (!sourceRoot) { /* ... */ }

    const { absoluteFilePath, relativePath } = resolveFilePath(projectRoot, filePath);
    if (!(await fileExists(absoluteFilePath))) { /* ... */ }

    const contentType = detectContentType(relativePath);
    if (!contentType) { /* ... */ }

    const fileName = basename(absoluteFilePath);
    const targetDir = join(sourceRoot, 'templates', contentType);
    const targetPath = join(targetDir, fileName);

    if (!force && await fileExists(targetPath)) {
      spinner.warn(`Already exists in SSOT: templates/${contentType}/${fileName}`);
      log.dim('Use --force to overwrite');
      return;
    }

    await ensureDir(targetDir);
    const content = await readTextFile(absoluteFilePath);
    await writeTextFile(targetPath, content);

    spinner.succeed(`Promoted to SSOT: templates/${contentType}/${fileName}`);
    log.dim(`Source: ${relativePath}`);
    log.dim(`Target: ${sourceRoot}/templates/${contentType}/${fileName}`);
  } catch (error) { /* ... */ }
}
```

De publieke functies worden thin wrappers:

```typescript
export async function runPromote(projectRoot: string, filePath: string): Promise<void> {
  await promoteContent(projectRoot, filePath, false);
}

export async function runPromoteForce(projectRoot: string, filePath: string): Promise<void> {
  await promoteContent(projectRoot, filePath, true);
}
```

### Logic Refactoring

Extract pad-resolutie naar een helper:

```typescript
function resolveFilePath(projectRoot: string, filePath: string): { absoluteFilePath: string; relativePath: string } {
  const contentDir = join(projectRoot, CONTENT_DIR);
  if (filePath.startsWith(CONTENT_DIR + '/')) {
    return { relativePath: filePath.slice(CONTENT_DIR.length + 1), absoluteFilePath: join(projectRoot, filePath) };
  } else if (filePath.startsWith('/')) {
    return { absoluteFilePath: filePath, relativePath: filePath.replace(contentDir + '/', '') };
  }
  return { relativePath: filePath, absoluteFilePath: join(contentDir, filePath) };
}
```

## 6. Non-Goals

- Geen wijziging aan de publieke API (`runPromote`, `runPromoteForce` exports blijven)
- Geen wijziging aan het promote-gedrag
- Geen nieuwe features (bijv. batch promote)

## 7. Technical Constraints

- ESM imports met `.js` extensies
- `process.exit(1)` calls blijven voor CLI error handling
- Geen bestaande tests om te breken (maar dit is een risico — zie R-PRD #5)

## 8. Verification & Quality Checklist

- [ ] Typecheck passes (`bun run build`)
- [ ] Linter passes
- [ ] Handmatige test: `ai-toolkit promote skills/code-review.md`
- [ ] Handmatige test: `ai-toolkit promote --force skills/code-review.md`
- [ ] Geen nieuwe DRY violations
- [ ] SSOT maintained

## 9. Success Metrics

- **LOC reductie**: Van 163 → ~100 regels
- **DRY**: Pad-resolutie van 2x → 1x, config-laden van 2x → 1x
- **Zero regressions**: Promote gedrag identiek
