# R-PRD: Refactor `src/sync/monorepo.ts`

## 1. Overview & Rationale

`monorepo.ts` (103 regels) bevat een **functionele bug** in de `mergeResults()` functie (regels 97-102). Bij het mergen van sync-resultaten van sub-projecten worden `ssotOrphans` en `ssotDiffs` **niet meegenomen**. Dit betekent dat bij `ai-toolkit sync-all` de SSOT-waarschuwingen van sub-projecten stilzwijgend verloren gaan.

Dit is primair een bugfix, maar het bestand heeft ook een kleine architectuurverbetering nodig.

## 2. Principle Analysis

### DRY Check
- ✅ Geen duplicatie binnen het bestand
- ⚠️ De `SyncResult` initialisatie (regels 14-21) herhaalt het patroon uit `syncer.ts` (regels 38-45) — minor, acceptabel

### SSOT Check
- ✅ Types komen uit `core/types.ts`
- ❌ `mergeResults` is incompleet t.o.v. de `SyncResult` interface — de interface definieert 6 velden, maar slechts 4 worden gemerged

### Modularity Check
- ✅ Monorepo-logica is correct geïsoleerd
- ✅ `findSubProjects` is een duidelijke helper
- ✅ Correcte scheiding van concerns

### Architecture Check
- ✅ Geen UI-logica in data-laag
- ⚠️ `mergeResults` zou robuuster kunnen door dynamisch alle keys van `SyncResult` te mergen

## 3. Refactoring Goals

1. **Fix bug**: Voeg `ssotOrphans` en `ssotDiffs` toe aan `mergeResults()`
2. **Maak merge robuust**: Overweeg een generieke merge die niet breekt als `SyncResult` nieuwe velden krijgt

## 4. Impact Analysis

### Affected Components/Modules
- `src/sync/monorepo.ts` — enige bestand dat wijzigt

### Dependencies
- `runMonorepoSync` wordt aangeroepen door `cli/sync-all.ts`
- Geen andere afhankelijkheden

### Location Decision
- Blijft in `src/sync/monorepo.ts`

## 5. Proposed Changes & Rationale

### Bug Fix

Huidige code (incompleet):
```typescript
function mergeResults(target: SyncResult, source: SyncResult): void {
  target.synced.push(...source.synced);
  target.skipped.push(...source.skipped);
  target.removed.push(...source.removed);
  target.errors.push(...source.errors);
}
```

Gefixte code:
```typescript
function mergeResults(target: SyncResult, source: SyncResult): void {
  target.synced.push(...source.synced);
  target.skipped.push(...source.skipped);
  target.removed.push(...source.removed);
  target.errors.push(...source.errors);
  target.ssotOrphans.push(...source.ssotOrphans);
  target.ssotDiffs.push(...source.ssotDiffs);
}
```

### Pattern Alignment

Alternatief — een robuustere merge die automatisch alle array-velden meeneemt:

```typescript
function mergeResults(target: SyncResult, source: SyncResult): void {
  for (const key of Object.keys(source) as Array<keyof SyncResult>) {
    if (Array.isArray(target[key]) && Array.isArray(source[key])) {
      (target[key] as unknown[]).push(...(source[key] as unknown[]));
    }
  }
}
```

**Recommended**: De expliciete variant (eerste optie) — duidelijker, type-safe, en makkelijker te reviewen. De generieke variant introduceert onnodige complexiteit voor 6 velden.

## 6. Non-Goals

- Geen wijziging aan `findSubProjects` logica
- Geen wijziging aan de monorepo scan-diepte
- Geen nieuwe features

## 7. Technical Constraints

- Minimale wijziging — 2 regels toevoegen
- Geen nieuwe imports nodig
- Geen bestaande tests voor monorepo (risico)

## 8. Verification & Quality Checklist

- [ ] Typecheck passes (`bun run build`)
- [ ] Linter passes
- [ ] Bestaande tests passing (`bun run test:run`)
- [ ] Handmatige test: `ai-toolkit sync-all` in een monorepo met SSOT-configuratie
- [ ] Verify dat ssotOrphans en ssotDiffs correct worden gerapporteerd voor sub-projecten

## 9. Success Metrics

- **Bug fix**: `ssotOrphans` en `ssotDiffs` worden correct gemerged
- **LOC wijziging**: +2 regels
- **Zero regressions**: Bestaand sync-all gedrag blijft werken
