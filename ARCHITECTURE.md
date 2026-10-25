# Ma Caisse — Architecture

SPA React 19 + Vite + Tailwind v4 + Zustand, conçue comme un **SaaS
multi-organisation** : un utilisateur peut appartenir à plusieurs commerces,
avec un rôle par commerce (propriétaire, gérant, caissier). Le frontend
fonctionne seul en mode démo (`mock`) et se branche sur un backend REST en mode
`http` sans modifier l'interface.

## Couches et règles d'import (du haut vers le bas uniquement)

```
app/  ──►  features/  ──►  store/  ──►  services/  ──►  mocks/
  │            │             │             │
  └────────────┴──── ui/ ◄───┘             └──► config/, domain/, types/
                     content/ (textes), config/ (env + référentiels)
```

| Dossier | Rôle | Interdits |
|---|---|---|
| `app/` | Shell : chargement initial, layout responsive (Sidebar ≥ lg, BottomNav < lg, Topbar), routage d'onglet, overlays globaux | logique métier |
| `features/<feature>/` | Écrans et modales. Lisent les stores, appellent leurs actions | calculs métier (→ `domain/`), texte en dur (→ `content/`) |
| `features/shared/` | Composants partagés entre features (ex. `ProductThumb`) | — |
| `ui/` | Design system : primitives sans connaissance métier (Button, Card, StatCard, Modal, Drawer, Input, Chip, SegmentedControl, Switch, Badge, Toast…) | imports de `store/`, `features/` |
| `store/` | État Zustand persisté (localStorage) + mutations optimistes synchronisées via `services/` ; `bootstrap.ts` ; `useSessionStore` | JSX |
| `services/` | Accès backend : contrats (`contracts.ts`), routes (`endpoints.ts`), client HTTP (`http/`), adaptateurs `mockApi` / `httpApi`, `syncRemote` | logique d'écran |
| `mocks/` | **Seul** endroit où vivent les données de démonstration (catalogue, ventes, crédits, session…) | import depuis l'UI |
| `content/` | **Tous** les textes de l'interface (`fr.ts`), y compris toasts, aria-labels et libellés des exports PDF/CSV | — |
| `config/` | `env.ts` (variables `VITE_*`) et `reference.ts` (catégories, moyens de paiement, icônes, seuils) | — |
| `domain/` | Règles métier pures et testées (stock, ventes, crédits, finances, dates, montants) | React, stores |
| `lib/` | Intégrations : export CSV/PDF, client Gemini | — |

## Multi-organisation

| Élément | Où |
|---|---|
| Compte connecté, appartenances, organisation active (persisté) | `store/useAuthStore.ts` |
| Connexion, inscription, reprise, changement d'espace, déconnexion | `store/auth.ts` |
| Contexte des requêtes (`orgId`, en-tête CSRF ; jeton aujourd'hui, **cookie de session en cible D1**) | `services/tenant.ts` → routes `/orgs/:orgId/…` |
| Cloisonnement local des données (`ma-caisse/<orgId>/<collection>`) | `store/tenantScope.ts` |
| Session de l'espace (commerce, abonnement, rôle) + `usePermission()` | `store/useSessionStore.ts` |
| Matrice des droits `can(role, permission)` | `domain/permissions.ts` |
| Écran de connexion / inscription | `features/auth` |
| Décisions et règles d'authentification (D1–D9, RG-A01–RG-A26) | [`docs/AUTH_DECISIONS.md`](docs/AUTH_DECISIONS.md) — **normatif** |
| Sélecteur d'espace (barre latérale, feuille mobile, profil) | `features/organisation` |
| Gestion de l'équipe (inviter, changer de rôle, retirer) | `features/equipe` |

Règles d'interface : la navigation (`app/useAllowedTabs.ts`), les raccourcis,
les actions et les colonnes sensibles (prix d'achat, marges) dépendent de
`usePermission`. Un onglet interdit redirige vers la caisse ou affiche « Accès
réservé ». **La sécurité réelle reste côté serveur** : règles normatives dans
[`docs/AUTH_DECISIONS.md`](docs/AUTH_DECISIONS.md) (D1–D9, RG-A01–RG-A26) et le
[contrat d'API](docs/API_CONTRACT.md).

Comptes de démo (mot de passe `demo1234`) : Mamadou (propriétaire de Boutique
Étoile + gérant de Supérette Le Baobab), Awa (caissière), Koffi (propriétaire
de la supérette), Fatou (gérante).

## Flux de données

```
UI (features) ──action──► store (mise à jour optimiste, persistée)
                              └── syncRemote(api => api.x.y()) ──► services ──► backend REST
Connexion (aujourd'hui) : login() ─► setAuthToken ─► activateOrganization(orgId)
Connexion (cible D2)    : requestOtp() ─► verifyOtp() ─► cookie de session ─► activateOrganization(orgId)
             ─► scopeStoresToOrganization ─► api.session.get(orgId) (+ collections en http) ─► stores
```

- **Mode `mock`** (défaut) : comptes et organisations simulés par `mocks/`,
  données de chaque organisation persistées localement (elles font foi).
- **Mode `http`** : les collections du backend remplacent l'état local au
  démarrage ; chaque mutation est envoyée au serveur, un échec déclenche un toast.
  Contrat complet : [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Contenus et données

- Textes : `import { t } from '@/content'` puis `t.stock.toasts.created(nom)`.
  Ajouter une langue = dupliquer `content/fr.ts` en respectant le type `Content`.
- Identité du commerce, utilisateur, abonnement : `useCurrentSession()`
  (jamais en dur). Le reçu et le PDF comptable utilisent ces données.

## Design system (`src/index.css`, bloc `@theme`)

- Couleurs : `ink-*` (surfaces sombres), `brand-*` (vert émeraude), `zest-*`
  (accent citron), `canvas`, `surface`, `line`.
- Typographies : Inter (texte) et Plus Jakarta Sans (titres, montants `.font-num`).
- Ombres `shadow-card | raised | overlay | glow`, rayon `rounded-card`,
  animations `animate-fade-in | slide-up | pop | shimmer`.
- Modales : feuille basse sur mobile, boîte centrée ≥ `sm` ; Échap, focus
  géré, scroll verrouillé.

## Règle critique Zustand v5

Ne jamais passer à `useStore` un sélecteur qui alloue un nouvel objet/tableau :
s'abonner à une tranche stable puis dériver avec `useMemo`, ou utiliser
`useShallow`. `src/app/App.smoke.test.tsx` parcourt les 5 onglets et échoue en
cas de boucle de rendu.

## Commandes

```bash
bun run dev     # serveur de développement (port 3000)
bun run lint    # tsc strict + eslint --max-warnings 0
bun run test    # vitest (domaine, stores, services, smoke)
bun run build   # build de production (chunks react / charts / pdf séparés)
```
