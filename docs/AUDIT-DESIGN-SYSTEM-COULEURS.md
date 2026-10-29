# Audit Design System & Couleurs — Ma Caisse

> Date : 2026-10-25
> Périmètre : `src/index.css` (`@theme` Tailwind v4), `src/ui/*`, `src/app/*`, `src/features/*`, `src/lib/export/pdf.ts`
> Méthode : lecture tokens + relevé usages Tailwind / hex en dur + analyse cohérence / accessibilité WCAG AA

## 1. Source unique — tokens déclarés (`src/index.css:10-42`)

C'est la seule source officielle. Bonne pratique : les composants consomment `bg-ink-900`, `text-brand-600`, `shadow-card`, etc.

### 1.1 Encre / sombre

| Token | Hex | Usage observé |
|---|---|---|
| `ink-950` | `#060A13` | Texte sur `zest`, overlay `bg-ink-950/50` |
| `ink-900` | `#0B1220` | Sidebar, hero, `PaymentPad`, `CartPanel`, `Toast`, CTA `primary` |
| `ink-800` | `#131C2E` | `hover:bg-ink-800` |
| `ink-700` | `#1E293D` | Déclaré, **jamais utilisé** |
| `ink-600` | `#334058` | Déclaré, **jamais utilisé** |

### 1.2 Marque — emerald

| Token | Hex | Usage |
|---|---|---|
| `brand-50` | `#ECFDF5` | Fonds succès (`Badge`, `StatCard`, `ExportModal`) |
| `brand-100` | `#D1FAE5` | `hover:bg-brand-100` |
| `brand-200` | `#A7F3D0` | Non utilisé |
| `brand-300` | `#6EE7B7` | Icône `DashboardHero` sur sombre uniquement |
| `brand-400` | `#34D399` | Non utilisé |
| `brand-500` | `#10B981` | Dots, `ProgressBar`, charts, `Switch` on, `focus-visible` |
| `brand-600` | `#059669` | Bouton `brand`, montants, icônes succès |
| `brand-700` | `#047857` | Texte `Badge success`, `IconButton brand-soft` |
| `brand-800` | `#065F46` | Texte `ExportModal` |

### 1.3 Signature citron

| Token | Hex | Usage |
|---|---|---|
| `zest-300` | `#DCFB8A` | `Badge zest` texte, `BottomNav` icône — pensé fond sombre |
| `zest-400` | `#C5F441` | CTA `accent`, pastilles, nav active, `BrandMark` |
| `zest-500` | `#A8D820` | Déclaré, **jamais utilisé** |

### 1.4 Surfaces / élévations

| Token | Valeur | Usage |
|---|---|---|
| `canvas` | `#F4F5F8` | Fond app (`App.tsx`, `body`) |
| `surface` / `white` | `#FFFFFF` | Cards, modales, inputs |
| `line` | `#E5E8EE` | Bordures par défaut |
| `line-strong` | `#D3D8E2` | Hover bordures |
| `shadow-card` / `raised` / `overlay` / `glow` | `rgb(11 18 32 / …)`, `rgb(197 244 65 / .55)` | Cards, overlays, glow zest |
| `radius-card` | `1.25rem` | Cards |
| `font-sans` / `font-display` / `font-num` | `Inter`, `Plus Jakarta Sans`, tnum | Texte, titres, montants |

Pas de `dark:` / `prefers-color-scheme` / `data-theme`. Choix cohérent : app claire + îlots sombres. `prefers-reduced-motion` déjà géré (`index.css:147-152`).

## 2. Couleurs non-tokenisées mais systémiques

| Famille | Valeurs | Usage |
|---|---|---|
| Slate texte/fonds | `slate-50 #F8FAFC`, `slate-100 #F1F5F9`, `slate-200 #E2E8F0`, `slate-300 #CBD5E1`, `slate-400 #94A3B8`, `slate-500 #64748B`, `slate-600 #475569`, `slate-700 #334155` | Hiérarchie `ink-900` titre / `slate-500` description / `slate-400` meta. Fonds `slate-100`, `SegmentedControl bg-slate-200/60`, `Switch bg-slate-300` |
| Danger rose | `rose-50 #FFF1F2` → `rose-700 #BE123C` | `Badge/Chip/Feedback danger`, `Button danger`, erreurs `Field` |
| Warning amber | `amber-50 #FFFBEB`, `amber-300 #FCD34D`, `amber-400 #FBBF24`, `amber-500 #F59E0B`, `amber-600 #D97706`, `amber-700 #B45309` | `Badge warning`, `ProductCard`, `PaymentPad` crédit |
| Info sky | `sky-50 #F0F9FF` → `sky-700 #0369A1` | `Badge info`, `Toast info`, chart `ChannelSplit` |
| Charts hex en dur | `#EEF0F4`, `#94A3B8`, `#F1F5F9`, `#E11D48`, `#38BDF8`, `#FB7185` | `RevenueChart`, `CashFlowChart`, `SalesTrend`, shimmer |
| Google / externe | `#EA4335 #4285F4 #FBBC05 #34A853`, `#DADCE0 #1F1F1F #F8F9FA` | `GoogleMark`, `GoogleButton` — hors système, acceptable (charte Google) |
| PDF | `rgb(11,28,48) #0B1C30`, `rgb(197,244,65) #C5F441` | `lib/export/pdf.ts` — `#0B1C30` ≠ `ink-900 #0B1220` → divergence print/écran |

## 3. Design system implicite (à figer)

- **Hero sombre** : `bg-ink-900 + bg-grid-ink + blur zest/brand + divide-white/10` (Sidebar, Hero, Payment, Plan, Toasts).
- **Card claire** : `bg-white rounded-card shadow-card border-line`, titre `font-display 15px ink-900`, description `xs slate-500`.
- **Badge** : pill `rounded-full ring-1 ring-inset` + variante `dot`.
- **StatCard** : tuile pastel `bg-{tone}-50 text-{tone}-600` + trend `brand-600/rose-600`.
- **Inputs** : `h-11 rounded-xl bg-white border-line focus:border-ink-900 focus:ring-ink-900/5`, erreur `border-rose-300 + text-rose-600`.
- **Boutons (`Button.tsx`)** : `primary` encre = défaut, `accent` zest = encaisser, `brand` = valider, `secondary/ghost`, `danger`. États `hover/active/disabled` présents.
- **Overlays** : `bg-ink-950/50 + backdrop-blur + shadow-overlay`, `animate-fade-in/slide-up/pop`.

## 4. Problèmes

### A. Doublons / hex proches (dette principale)
1. 4 gris de fond quasi identiques : `canvas #F4F5F8` vs `slate-50 #F8FAFC` vs `slate-100 #F1F5F9` vs `#EEF0F4` (shimmer/grille).
2. Bordures en double : `line #E5E8EE` vs `slate-200 #E2E8F0` ; `line-strong #D3D8E2` vs `slate-300 #CBD5E1`.
3. Hex en dur contournent les tokens : axes `#94A3B8` (= `slate-400`), cursor `#F1F5F9` (= `slate-100`), `ChannelSplit ['#0B1220','#10B981','#C5F441']` (= tokens existants), shimmer `#EEF0F4/#F6F7F9`.
4. PDF divergent : `#0B1C30` au lieu de `#0B1220`.
5. Tokens morts : `ink-600/700`, `brand-200/400`, `zest-500`, `zest-300` cantonné au sombre.
6. 3 tons par sémantique sans règle : `amber-300/400/500`, `rose-400/500/600`, `sky-300/400/500` (ex. dot `rose-500` mais chart `rose-400`).

### B. Incohérences d'usage
- `Button secondary` → `text-ink-900`, mais `IconButton secondary` → `text-slate-700`.
- `Button danger-soft` = `bg-rose-50`, `IconButton danger-soft` = transparent `text-rose-600`.
- `IconButton` a `brand-soft`, `Button` ne l'a pas.
- `Badge zest` = `bg-zest-400/15 text-zest-300` dessiné pour sombre, réutilisé sur clair (`ProfilModal`, `OrgSwitcher`) → illisible.
- `text-brand-300` sur `ink-900` OK, mais copié sur blanc = illisible, pas de garde-fou.

### C. Accessibilité WCAG AA (4.5:1 texte courant)

| Cas | Ratio approx. | Verdict |
|---|---|---|
| `white` sur `ink-900`, `zest-400` sur `ink-950` | ~16:1 / ~15:1 | ✅ Excellent |
| `white` sur `brand-600 #059669` | ~3.5:1 | ⚠️ Limite (OK large text 3:1, juste) |
| `text-brand-600` sur blanc (12-13px) | ~3.9:1 | ❌ Insuffisant |
| `text-slate-400 #94A3B8` sur blanc (placeholder, meta, axes 11px) | ~2.8:1 | ❌ Échec — le plus répandu, priorité |
| `text-zest-300 #DCFB8A` sur blanc | ~1.5:1 | ❌ Illisible |
| `text-amber-300` / `text-zest-400` sur `ink-900` | ~10-12:1 | ✅ Bon (réserver au sombre) |
| `text-slate-500` sur blanc | ~4.8:1 | ✅ Juste — éviter sur `slate-50/100` |

## 5. Recommandations

### Palette cible — 24 tokens au lieu de ~45 valeurs
```css
--color-text-strong: var(--color-ink-900);
--color-text-muted: #475569;  /* slate-600 — remplace slate-400 en courant */
--color-text-faint: #64748B;  /* slate-500 — meta */
--color-success-bg: #ECFDF5; --color-success-text: #047857; --color-success-dot: #10B981;
--color-warning-bg: #FFFBEB; --color-warning-text: #B45309; --color-warning-dot: #F59E0B;
--color-danger-bg: #FFF1F2; --color-danger-text: #BE123C; --color-danger-dot: #F43F5E;
--color-info-bg: #F0F9FF; --color-info-text: #0369A1; --color-info-dot: #0EA5E9;
--color-chart-grid: var(--color-line);
--color-chart-axis: #64748B;
```

**P0 — Accessibilité :**
1. Interdire `text-slate-400` / `placeholder:text-slate-400` en <18px → `slate-500` mini, `slate-600` recommandé (~30 fichiers : `Field`, `ReceiptModal`, `StockView`…).
2. Scinder `Badge zest` en `zest` (sombre) + `zest-soft` (clair : `bg-zest-400/25 text-ink-900 ring-zest-500/30`). Migrer `ProfilModal`, `OrgSwitcher`.
3. Texte courant `brand-600` → `brand-700` (`StatCard`, `StockView`). Garder `brand-600` pour icônes ≥18px.

**P1 — Fusion / suppression :**
4. `#EEF0F4/#F6F7F9` → `slate-100` ; bordures → `line` uniquement, bannir `slate-200` en bordure ; `line-strong` + `slate-300` → un seul.
5. `pdf.ts` : `setFillColor(11,18,32)` (= `ink-900`).
6. Supprimer/documenter `ink-600/700`, `brand-200/400`, `zest-500`. Figer : dot=`*-500`, fond=`*-50`, texte=`*-700`.
7. Charts : remplacer `COLORS` et hex par tokens (`ink-900`, `brand-500`, `zest-400`, `sky-500`, `rose-500`). Axes → `chart-axis`.

**P2 — Cohérence :**
8. Aligner `Button` / `IconButton` : même `secondary` (`text-ink-900`), même `danger-soft` (`bg-rose-50`), `brand-soft` des deux côtés.
9. Linter : interdire `#[0-9a-f]{3,8}` hors `ui/` + `LoginScreen` (exception charte Google).
10. Règle dorée à documenter : « `zest` et `brand-300/amber-300` uniquement sur `ink-900`. Sur blanc : `ink-900` + `brand-700`. »

## Annexe — fichiers sources
- `src/index.css:10-73` — `@theme`, tokens, shadows, animations
- `src/ui/Button.tsx`, `src/ui/IconButton.tsx`, `src/ui/Badge.tsx`, `src/ui/Chip.tsx`
- `src/ui/StatCard.tsx`, `src/ui/Field.tsx`, `src/ui/Modal.tsx`, `src/ui/Toast.tsx`
- `src/app/*` (Sidebar, Hero, PaymentPad, CartPanel), `src/features/*` (charts, StockView)
- `src/lib/export/pdf.ts` — couleurs reçu
