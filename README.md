# Ma Caisse

Caisse enregistreuse et gestion de commerce — SPA **React 19 + Vite + TypeScript**,
pensée pour les commerces de détail en **FCFA**.

L'application est un **SaaS multi-organisation** : un même utilisateur peut
appartenir à plusieurs commerces, avec un rôle différent par commerce
(propriétaire, gérant, caissier). Elle fonctionne **seule en mode démo** (données
simulées persistées localement) et se branche sur un **backend REST** sans
modifier une ligne d'interface.

> État : frontend complet, aucune dépendance backend dans ce dépôt.
> `bun run lint` ✔ · `bun run test` → 23 fichiers / 175 tests ✔ · `bun run build` ✔

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Scripts](#scripts)
- [Variables d'environnement](#variables-denvironnement)
- [Mode démo ou backend REST](#mode-démo-ou-backend-rest)
- [Rôles et permissions](#rôles-et-permissions)
- [Architecture](#architecture)
- [Structure du projet](#structure-du-projet)
- [Tests et qualité](#tests-et-qualité)
- [Déploiement](#déploiement)
- [Documentation](#documentation)

---

## Fonctionnalités

| Domaine | Contenu |
|---|---|
| **Caisse (POS)** | Panier, recherche produit, 5 moyens de paiement (Espèces, Wave, Orange Money, Carte, Crédit partiel), reçu écran + PDF, ventes récentes, clôture de journée |
| **Stock** | Création/édition d'articles, catégories, réapprovisionnement rapide, alertes de rupture, prix d'achat et marge (réservés aux rôles autorisés) |
| **Crédits** | Créances clients, encaissements partiels, filtres, historiques par client |
| **Dépenses** | Saisie et suivi des charges du commerce |
| **Bilan** | Chiffre d'affaires, marge, trésorerie, répartition par canal de paiement, objectif journalier |
| **Accueil** | Tableau de bord (tendance des ventes, alertes stock, dernières ventes, clôture) |
| **Équipe** | Invitation de membres, changement de rôle, retrait — avec hiérarchie des rôles |
| **Multi-organisation** | Appartenance à plusieurs commerces, changement d'espace, données cloisonnées par organisation |
| **Abonnement** | Plans *Starter* et *Pro Commerçant* |
| **Export** | Export CSV et PDF comptable (respecte les permissions) |
| **UI/UX** | Responsive (sidebar ≥ `lg`, barre inférieure < `lg`), toasts, modales accessibles (Échap, focus, scroll verrouillé), thème maison |

---

## Stack technique

| Brique | Version | Usage |
|---|---|---|
| [React](https://react.dev) | 19.3 | Interface |
| [TypeScript](https://www.typescriptlang.org) | 5.8 (`strict`) | Typage |
| [Vite](https://vite.dev) | 6.4 | Dev server + build (chunks `react` / `charts` / `pdf`) |
| [Tailwind CSS](https://tailwindcss.com) | 4.1 | Design system (`@theme` dans `src/index.css`) |
| [Zustand](https://zustand.docs.pmnd.rs) | 5 | État persistant (`localStorage`), mutations optimistes |
| [Recharts](https://recharts.org) | 3 | Graphiques (bilan, accueil) |
| [jsPDF](https://github.com/parallax/jsPDF) + autotable | 4 | Reçus et exports PDF |
| [Vitest](https://vitest.dev) + Testing Library | 5 | Tests unitaires, stores, services, smoke |
| ESLint 10 + Prettier | — | Lint et formatage |
| [Bun](https://bun.sh) | **≥ 1.4** | Runtime, gestionnaire de paquets et scripts |

> `bun.lock` est en `lockfileVersion: 2` : **Bun 1.4 ou plus récent est requis**.
> Le `package-lock.json` a été retiré volontairement (ignoré par `.gitignore`).

---

## Démarrage rapide

```bash
# prérequis : Bun ≥ 1.4
bun install --frozen-lockfile
bun run dev            # http://localhost:3000
```

Aucune configuration n'est nécessaire : sans variable d'environnement,
l'application démarre en **mode démo** avec des données de test réalistes.

---

## Comptes de démonstration

Mot de passe commun : **`demo1234`** (mode démo uniquement).

| Utilisateur | Email | Rôle |
|---|---|---|
| Mamadou Konaté | `mamadou@boutique-etoile.sn` | propriétaire de *Boutique Étoile* + gérant de *Supérette Le Baobab* |
| Awa Ndiaye | `awa@boutique-etoile.sn` | caissière de *Boutique Étoile* |
| Koffi Mensah | `koffi@superette-baobab.ci` | propriétaire de *Supérette Le Baobab* |
| Fatou Diop | `fatou@superette-baobab.ci` | gérante de *Supérette Le Baobab* |

Mamadou appartient à **deux** organisations : utilisez le sélecteur d'espace
(sidebar ou profil) pour observer le cloisonnement des données et les
différences de permissions.

---

## Scripts

| Commande | Effet |
|---|---|
| `bun run dev` | Serveur de développement sur le port 3000 (`--host 0.0.0.0`) |
| `bun run build` | Build de production dans `dist/` |
| `bun run preview` | Prévisualisation du build |
| `bun run lint` | `tsc --noEmit` + `eslint src --max-warnings 0` (zéro tolérance) |
| `bun run test` | Tests Vitest (une passe) |
| `bun run test:watch` | Tests en mode watch |
| `bun run format` | Prettier sur `src/**/*.{ts,tsx,css}` |
| `bun run clean` | Supprime `dist/` et `server.js` |

---

## Variables d'environnement

Toutes les variables *client* sont préfixées `VITE_` et lues **uniquement** dans
`src/config/env.ts`.

| Variable | Défaut | Rôle |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` = données locales ; `http` = backend REST réel |
| `VITE_API_BASE_URL` | `/api` | URL de base du backend (ex. `https://api.macaisse.app/v1`) |
| `VITE_API_MOCK_LATENCY_MS` | `250` (`0` en test) | Latence simulée de l'adaptateur démo |
| `VITE_API_TIMEOUT_MS` | `15000` | Délai maximal avant abandon d'une requête |
| `DISABLE_HMR` | — | `true` coupe le HMR et le watch (utilisé par l'environnement AI Studio) |
| `GEMINI_API_KEY` | — | Optionnel ; utilisé par `src/lib/ai/client.ts` (client IA expérimental, non branché à l'UI) |

Exemple `.env.local` pour brancher un backend :

```bash
VITE_API_MODE=http
VITE_API_BASE_URL=https://api.example.com/v1
VITE_API_TIMEOUT_MS=15000
```

---

## Mode démo ou backend REST

```
UI (features) ──action──► store (mise à jour optimiste, persistée)
                             └── syncRemote(api => api.x.y()) ──► services ──► backend REST
```

- **`mock`** (défaut) — les comptes, organisations et données de démonstration
  vivent dans `src/mocks/`. Chaque organisation a son propre espace de stockage
  (`ma-caisse/<orgId>/<collection>`) : les données locales font foi.
- **`http`** — au démarrage, les collections du serveur remplacent l'état local ;
  chaque mutation est envoyée à l'API, un échec déclenche un toast. Les routes
  sont préfixées par l'organisation : `/orgs/:orgId/…`.

Le contrat d'API complet (routes, types, erreurs, conventions FCFA/dates, règles
de sécurité attendues côté serveur) est dans
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md). L'implémentation de référence
exécutable est `src/services/adapters/mockApi.ts`.

> ⚠️ Le masquage des actions par rôle côté client est **cosmétique**. Le serveur
> doit vérifier l'appartenance à `:orgId` et les permissions à chaque requête.

---

## Rôles et permissions

| Permission | Propriétaire (`owner`) | Gérant (`manager`) | Caissier (`cashier`) |
|---|:-:|:-:|:-:|
| Encaisser une vente, encaisser un crédit | ✓ | ✓ | ✓ |
| Gérer le stock, réapprovisionner, voir les prix d'achat | ✓ | ✓ | |
| Créer un crédit, gérer les dépenses, voir le bilan, exporter | ✓ | ✓ | |
| Gérer l'équipe et l'abonnement | ✓ | | |

Matrice unique et testée : `src/domain/permissions.ts` (`can(role, permission)`).
La navigation, les raccourcis et les colonnes sensibles en dérivent via
`usePermission()`.

---

## Architecture

Le détail (règles d'import, design system, multi-organisation) est dans
[`ARCHITECTURE.md`](ARCHITECTURE.md). Résumé des couches, du haut vers le bas :

```
app/  ──►  features/  ──►  store/  ──►  services/  ──►  mocks/
  │            │             │             │
  └────────────┴── ui/ ◄─────┘             └──► config/, domain/, types/
                     content/ (textes), config/ (env + référentiels)
```

Règles structurantes :

- **Sens unique des imports** : `app → features → store → services → mocks`,
  `ui/` ne connaît ni le métier ni les stores, `domain/` est du TypeScript pur
  (aucun import React).
- **Aucun texte en dur** dans les composants : tout passe par `@/content`
  (`t.stock.toasts.created(nom)`). Ajouter une langue = dupliquer `fr.ts`.
- **Aucune donnée de démo hors de `mocks/`**, aucun `import.meta.env` hors de
  `config/env.ts`.
- **Zustand v5** : jamais de sélecteur qui alloue un objet/tableau (utiliser
  `useShallow` ou `useMemo`). `src/app/App.smoke.test.tsx` échoue en cas de
  boucle de rendu.

---

## Structure du projet

```
src/
├─ app/            Shell : layout responsive, navigation, routing d'onglet
├─ features/       Écrans et modales par domaine (accueil, ventes, stock,
│                  credits, bilan, depenses, equipe, auth, organisation,
│                  abonnement, export, notifications, profil, shared)
├─ ui/             Design system sans logique métier (Button, Modal, Card…)
├─ store/          Stores Zustand persistés + bootstrap + auth + tenantScope
├─ services/       Contrats, endpoints, client HTTP, adaptateurs mock/http
├─ mocks/          Données de démonstration (seul endroit autorisé)
├─ content/        Tous les textes de l'interface (`fr.ts` typé)
├─ config/         env.ts (VITE_*) + reference.ts (catégories, paiements…)
├─ domain/         Règles métier pures et testées (stock, ventes, crédits…)
├─ lib/            Export CSV/PDF, client Gemini (lazy)
└─ types/          Types partagés
docs/
└─ API_CONTRACT.md Contrat d'API pour l'équipe backend
```

---

## Tests et qualité

```bash
bun run lint   # tsc strict + eslint --max-warnings 0
bun run test   # 23 fichiers, 175 tests
```

- **`src/domain/__tests__/`** — règles métier pures (stock, ventes, crédits,
  finances, dates, montants, permissions)
- **`src/store/__tests__/`** — stores (panier, produits, ventes, crédits,
  dépenses, notifications, reçu, migration de schéma local)
- **`src/services/__tests__/`** — adaptateurs et client HTTP
- **`src/app/App.smoke.test.tsx`** — parcours des 5 onglets, garde-fou anti-boucle

---

## Déploiement

Le build produit un **site statique** dans `dist/` :

```bash
bun run build      # puis servir dist/
```

- Hébergement : Vercel, Netlify, GitHub Pages, Cloudflare Pages, nginx…
- Aucun routage par URL (les onglets sont gérés en état) : aucune règle de
  rewrite serveur n'est nécessaire.
- Sur une plateforme qui n'installe pas Bun par défaut, choisir la version
  « Bun » du runtime ou installer Bun dans l'étape de build.
- En mode `http`, prévoir un proxy ou une URL absolue dans `VITE_API_BASE_URL`
  (CORS côté backend).

---

## Documentation

| Document | Pour qui | Contenu |
|---|---|---|
| **README.md** (ce fichier) | tout le monde | Vue produit, stack, démarrage, env, déploiement |
| [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) | nouveaux développeurs | Par où commencer, où vit quoi, 8 recettes (« ajouter un champ », « ajouter une collection », « ajouter un onglet »…), pièges, Definition of Done |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | développeurs | Couches et règles d'import, multi-organisation, design system, flux de données |
| [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) | équipe backend | Routes, types, erreurs, rôles attendus côté serveur |
| [`docs/FEATURES_INVENTORY.md`](docs/FEATURES_INVENTORY.md) | produit / avant-vente | Inventaire exhaustif de ce qui existe, avec le tableau de ce qui est **simulé ou absent** |
| [`docs/ARCHITECTURE_AUDIT.md`](docs/ARCHITECTURE_AUDIT.md) | tech lead / équipe | Audit : 2 critiques, 9 majeurs, 15 mineurs, preuves `fichier:ligne`, plan d'action priorisé |

---

## Licence

Projet privé — licence non spécifiée. Tous droits réservés à l'auteur.
