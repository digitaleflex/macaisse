# Design system — Ma Caisse

> Source unique : `src/index.css` (`@theme`). Miroir TS réservé aux API JS : `src/design/tokens.ts`. Contraste : `docs/design-system-contrast.md`.

## 1. Principes

- App claire (`canvas` / `surface`) ponctuée d'**îlots sombres d'identité** (`ink-900` : sidebar, héros, CTA, reçus, toasts, tooltips).
- Quatre familles de tokens : **marque** (brand, zest), **surfaces** (canvas, surface, line), **texte** (ink-900, muted), **sémantique** (pastilles et tons d'état).
- Une couleur de marque n'est pas un état métier : `brand`/`zest` signalent l'identité, jamais seuls un succès ou une erreur (toujours doublés d'icône ou de libellé).
- Typographies : `Inter` (texte, `--font-sans`) + `Plus Jakarta Sans` (titres et chiffres, `--font-display`) ; `.font-num` pour les montants (chiffres tabulaires).

## 2. Tokens

| Token CSS | Utilitaire Tailwind | Valeur | Rôle |
|---|---|---|---|
| `--color-ink-950` | `bg-ink-950` | `#060a13` | Fond le plus profond (overlay modal : `bg-ink-950/55`) |
| `--color-ink-900` | `bg-ink-900` / `text-ink-900` | `#0b1220` | Surface sombre + texte fort sur clair |
| `--color-ink-800` / `700` / `600` | `bg-ink-800…600` | `#131c2e` / `#1e293d` / `#334058` | Dégradés sombres |
| `--color-brand-500/600/700/800` | `bg-brand-*` / `text-brand-700` | `#10b981` / `#059669` / `#047857` / `#065f46` | Marque utilisable sur clair (`brand-700`) |
| `--color-brand-300` | `bg-brand-300` | `#6ee7b7` | Réservé au sombre (comme zest) |
| `--color-zest-400` / `300` / `500` | `bg-zest-400` / `text-zest-300` | `#c5f441` / `#dcfb8a` / `#a8d820` | Accent citron, sombre uniquement (sauf `zest-soft`) |
| `--color-canvas` | `bg-canvas` | `#f4f5f8` | Fond de page |
| `--color-surface` | `bg-surface` | `#ffffff` | Cartes, champs |
| `--color-line` / `line-strong` | `border-line` / `border-line-strong` | `#e5e8ee` / `#d3d8e2` | Bordures et séparateurs |
| `--color-muted` | `text-muted` **uniquement** | `#475569` | Texte courant sur clair (7,58:1 sur blanc) |

> `--color-muted` est **texte uniquement** : `bg-muted` générerait un fond bleu ardoise sombre inattendu. Même règle rappelée dans la doc contraste (§6).
- Élévations : `shadow-card`, `shadow-raised`, `shadow-overlay`, `shadow-glow` (halo zest) ; rayon : `rounded-card` (`1.25rem`).
- Animations : `animate-fade-in`, `animate-slide-up`, `animate-pop`, `animate-shimmer` (+ `.bg-shimmer-surface` pour les squelettes). Utilitaires : `.font-num`, `.bg-grid-ink` (points blancs sur sombre), `.pb-safe`. `prefers-reduced-motion` ramène toute animation à 1 ms.

## 3. Texte

| Usage | Classe | Note |
|---|---|---|
| Titre / texte fort | `text-ink-900` | Seule couleur de texte fort |
| Texte courant / secondaire | `text-muted` | 7,58:1 sur blanc, 6,95:1 sur canvas |
| Icônes décoratives, métadonnées | `text-slate-500` | 4,76:1 sur blanc (AA icône) |
| `text-slate-400` sur fond clair | **Interdit** | 2,56:1 sur blanc — échec texte et icône |
| `text-slate-400` sur `ink-900` | Légitime | 7,30:1 (tooltips, sidebar, héros) |

Détail des ratios et décisions : `docs/design-system-contrast.md` (§2–§5). Placeholders : `placeholder:text-slate-500` (un `muted` à 7,58 effacerait l'affordance).

## 4. Surfaces claires / sombres

- Sur **clair** : texte `ink-900`, secondaire `text-muted`, accent de marque `brand-700` (ex. `Button brand`, pastille `StatCard brand`).
- Sur **sombre** (`ink-900` + `.bg-grid-ink`) : texte blanc, secondaire `slate-400`, accents `zest-400` et `brand-300`.
- `zest` et `brand-300`/`amber-300` sont **réservés au sombre** : illisibles sur blanc, ils n'y apparaissent qu'en pastille (`*-500`) ou via `zest-soft`.

## 5. Composants

| Composant | Variantes | Usage | États |
|---|---|---|---|
| `Button` | `primary` / `accent` / `brand` / `secondary` / `ghost` / `danger` / `danger-soft` | `primary` = CTA encre par défaut ; `accent` = action phare (encaisser) ; `brand` = validation positive ; `danger(-soft)` = destruction | `loading` (spinner), `disabled` (50 % + pas de scale), `active:scale-98`, tailles sm→xl |
| `IconButton` | `ghost` / `ghost-dark` / `secondary` / `primary` / `danger-soft` / `brand-soft` | Bouton icône seule. `secondary` et `brand-soft` sont identiques à `Button` ; `ghost-dark` = `ghost` pour les surfaces `ink-900` (sidebar) ; `danger-soft` partage le texte `rose-700` mais reste transparent au repos (liste dense) | `label` **obligatoire** (`aria-label` + `title`), `badge` point rose, `filled`, `disabled` 50 % |
| `Card` | `padding` none/sm/md | Surface blanche `bg-surface rounded-card border-line shadow-card` | En-tête optionnel (icône `slate-100`, titre `ink-900`) |
| `Modal` | `light` / `dark`, tailles sm→xl | Feuille basse mobile, boîte centrée dès `sm` | Échap, backdrop, focus piégé, portail ; `dark` = en-tête encre + pastille zest |
| `Field` (`Input`, `Select`, `SearchField`) | erreur / hint / icône / suffixe | Champ blanc `h-11 rounded-xl`, focus `border-ink-900` + anneau | Erreur `border-rose-300` + `text-rose-600`, `aria-invalid` |
| `StatCard` | `neutral` / `brand` / `danger` / `warning` / `info` | Tuile indicateur : libellé `slate-500`, valeur `.font-num ink-900` | Cliquable (`hover-raised`), tendance `brand-700`/`rose-600` + flèche |
| `Chip` | actif / inactif | Filtre pressable (`aria-pressed`), pastille `*-500` + compteur | Actif = `ink-900` blanc ; inactif = blanc bordé |
| `Switch` | on / off | Interrupteur `role="switch"` | On = `bg-brand-600`, off = `bg-slate-300` |
| `Toast` | `info` / `success` / `error` | `bg-ink-900` blanc, icône `sky-300` / `zest-400` / `rose-400` | `role` alert/status, monté une fois (`ToastHost`) |
| `Feedback` | `EmptyState` / `ProgressBar` / `Avatar` / `Skeleton` / `PageHeader` | Vide centré, barre (`brand`/`warning`/`danger`/`zest`), avatar (`ink`/`zest`/`danger`/`neutral`) | `Skeleton` = `.bg-shimmer-surface animate-shimmer` |

## 6. Badges et statuts

- `zest` (sombre) : `bg-zest-400/15 text-zest-300 ring-zest-400/30` — jamais sur clair. `zest-soft` (clair) : `bg-zest-400/25 text-ink-900 ring-zest-500/30`.
- Convention d'état : fond `*-50` + pastille `*-500` + texte `*-700` (ex. `success` = `bg-brand-50` / `bg-brand-500` / `text-brand-700` ; `dark` = `bg-ink-900` + pastille `zest-400`).
- Ne jamais coder l'état par la couleur seule : badge toujours accompagné d'un libellé, et si pastille seule (`dot`), d'un texte adjacent. Tons : `success`, `warning`, `danger`, `info`, `neutral`, `dark`, `zest`, `zest-soft`.

## 7. Graphiques

- `chartColors` (axe, grille, curseur, encre, positif, positif fort, accent, info, négatif, cible) et `chartSeries` (ordre stable : encre, positif, accent, info, négatif) dans `src/design/tokens.ts`.
- Axe = `slate-500` (4,76:1 sur blanc, AA) ; grille = `line`, curseur = `slate-100`.
- Exception documentée : les séries `brand-500` (2,54), `zest-400` (1,28), `sky-500` (2,77) échouent à 3:1 sur blanc — elles distinguent des séries entre elles (anneau + `paddingAngle`, légende, montants), pas une information portée par la couleur seule. Ne pas les tester contre le blanc (voir doc contraste §7).

## 8. PDF

- `pdfTheme` (`src/lib/export/pdfTheme.ts`) dérive des tokens via `hexToRgb` : encre = `ink-900` (`#0b1220`, alignée écran et reçus), accent = `zest-400`.
- Exception d'impression : encadrés pastel (verts/rouges/bleus), gris de tableau et pied de page sont des teintes papier choisies pour rester lisibles imprimées — hors palette écran, hors test de parité.

## 9. Exceptions de marque

- `GoogleMark` / `GoogleButton` : charte Google imposée — « G » quatre couleurs jamais recoloré ni déformé, bouton blanc bordure `#dadce0`, texte `#1f1f1f`. Seul endroit où des hex hors tokens sont légitimes.
- `BrandMark` : logotype ticket SVG inline, pastille `bg-zest-400 text-ink-950` (traits zest inline) — identité, pas un état.
- `index.html` : `theme-color` = `#0b1220` (`ink-900`), polices `Inter` + `Plus Jakarta Sans` + `Material Symbols`.

## 10. Ajouter une couleur

1. Déclarer `--color-<nom>` dans le bloc `@theme` de `src/index.css` (source unique).
2. L'ajouter à `themeColors` dans `src/design/tokens.ts` (miroir pour Recharts/jsPDF uniquement — jamais pour du style DOM, utiliser `bg-<nom>` / `text-<nom>`).
3. Lancer `npx vitest run src/design/__tests__/tokens.parity.test.ts` — le test échoue si les deux sources divergent.
4. Documenter ici son rôle et son usage (famille, fonds autorisés, ratio visé).

Règles dures : **aucun composant ne contient de hex** (hors `GoogleMark`/`GoogleButton`, `BrandMark` et pastels `pdfTheme`) ; pas de seconde palette ; pas d'autre fichier de tokens (`palette`/`chartColors` réutilisent les tokens, les gris Tailwind d'appoint n'en font pas partie).
