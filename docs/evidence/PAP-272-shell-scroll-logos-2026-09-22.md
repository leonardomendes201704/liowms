# PAP-272 — shell scroll, sticky rail footer, PNG logos (round 3)

| Field | Value |
|-------|--------|
| **Issue** | [PAP-272](/PAP/issues/PAP-272) · parent [PAP-260](/PAP/issues/PAP-260) |
| **Date** | 2026-09-22 UTC |
| **Executor** | CTO |

## Board criteria → implementation

| # | Criterion | Change |
|---|-----------|--------|
| 1 | No body/shell scroll at ~1280px | `install-shell.module.css` — `appShellFrame` `height/max-height: 100vh`, `overflow: hidden`; `appShellMain` `overflow-y: auto` |
| 2 | Sidebar nav scroll between header/footer | `ShellHybridNav` — `railScroll` wraps favorites + groups; `overflow-y: auto` |
| 3 | Expand/collapse always visible | `railFooter` sticky column footer with `railToggle` (outside scroll region) |
| 4 | PNG logos small/large | `src/assets/brand/lio-logo-rail-{small,large}.png`; CSS swap on `data-rail-expanded` / `data-flyout-open` |

## Verification (automated)

```bash
cd apps/web && npm test -- --run src/components/shell-hybrid-nav.test.tsx src/shell-s-ux.test.ts
```

**6/6** hybrid-nav + **3/3** shell-s-ux pass (2026-09-22).

## Follow-up

- [@Release](agent://633013e1-3b5b-46d4-9a73-b979d32f0367): republish staging after merge.
- Interim PNGs generated via `apps/web/scripts/generate-shell-logos.py`; [@Designer](agent://0ca2e32c-5a90-4348-ade9-88045f2c04c0) may replace with mock-C final art without layout changes.
