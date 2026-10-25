# Guide développeur — Ma Caisse

Objectif : **rendre opérationnel en moins d'une heure**. Ce guide dit par où
commencer, où vit quoi, et surtout *comment ajouter quelque chose sans casser
l'architecture*. Il est volontairement procédural : chaque recette se termine par
une vérification.

Documents voisins :

| Document | Contenu |
|---|---|
| [`README.md`](../README.md) | Présentation, scripts, variables d'environnement, déploiement |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Couches, règles d'import, design system, multi-organisation |
| [`API_CONTRACT.md`](API_CONTRACT.md) | Contrat REST attendu côté backend |

---

## 1. Première mise en route (15 min)

```bash
bun install --frozen-lockfile     # Bun ≥ 1.4 obligatoire (bun.lock v2)
bun run dev                       # http://localhost:3000
```

Puis, dans le navigateur :

1. Connecte-toi avec `mamadou@boutique-etoile.sn` / `demo1234`.
2. Tu arrives sur **Boutique Étoile** en tant que `owner` : les 5 onglets sont visibles.
3. Change d'espace (sélecteur dans la sidebar) vers **Supérette Le Baobab** :
   Mamadou y est `manager` — les données changent **et** les droits aussi.
4. Déconnecte-toi, reconnecte-toi en `awa@boutique-etoile.sn` (`cashier`) :
   l'onglet **Bilan** disparaît, les prix d'achat sont masqués.

Si ces 4 points fonctionnent, ton environnement est bon et tu as déjà vu
l'essentiel du modèle (multi-organisation + rôles + cloisonnement local).

Commandes à connaître :

| Commande | Quand |
|---|---|
| `bun run lint` | Avant chaque commit — `tsc` strict + ESLint `--max-warnings 0` |
| `bun run test` | Avant chaque commit — 175 tests, ~60 s |
| `bun run test:watch` | Pendant le développement d'une règle métier |
| `bun run build` | Avant de pousser une PR qui touche au bundling ou aux imports |

---

## 2. Où trouver quoi

| Je veux… | Va dans | Ne touche pas |
|---|---|---|
| Changer un écran, une modale | `src/features/<domaine>/` | — |
| Changer un libellé, un toast, un aria-label | `src/content/fr.ts` | ❌ pas de texte en dur dans un composant |
| Changer une règle de calcul (marge, stock, crédit) | `src/domain/*.ts` + son test | ❌ jamais dans un store ou un composant |
| Ajouter un état ou une action | `src/store/use<X>Store.ts` | ❌ pas de JSX dans `store/` |
| Appeler le backend | `src/services/` | ❌ jamais de `fetch` dans une feature |
| Ajouter une route REST | `src/services/endpoints.ts` + `contracts.ts` | ❌ pas d'URL en dur ailleurs |
| Ajouter un composant visuel réutilisable | `src/ui/` | ❌ `ui/` n'importe ni `store/` ni `features/` |
| Ajouter une donnée de démonstration | `src/mocks/` | ❌ aucune fixture ailleurs |
| Ajouter une variable d'environnement | `src/config/env.ts` | ❌ aucun `import.meta.env` ailleurs (sauf `lib/ai/client.ts`, historique) |
| Ajouter un onglet | `src/config/reference.ts` → `src/types/index.ts` → `src/app/routes.ts` | voir recette 4 |
| Ajouter un moyen de paiement / une catégorie | `src/types/index.ts`, `src/config/reference.ts`, `src/store/storeUtils.ts` | les 3 doivent rester cohérents |

Le sens des imports est **à sens unique** :

```
app → features → store → services → mocks
                    ↘ ui (jamais l'inverse)   config / domain / types / content : feuilles
```

Un import qui remonte cette flèche (ex. `ui/` qui importe `store/`) est un bug
d'architecture, pas un détail de style.

---

## 3. Parcours d'une vente (le meilleur exemple à lire)

Comprendre ce flux donne le modèle mental de toute l'application :

1. **UI** — `features/ventes/VentesView.tsx` : le caissier choisit un moyen de
   paiement, l'écran appelle `useSalesStore.getState().completeSale({ paymentMethod, … })`.
2. **Domaine** — `domain/sales.ts` → `buildSale()` **valide et calcule** avant
   toute mutation : lignes de panier, stock disponible, numéro de ticket
   (`nextSaleNumber`), statut (`Validé` / `Partiel`), montant restant dû.
3. **Store** — `store/useSalesStore.ts` → `completeSale` applique le résultat
   **en une seule fois** : `setProducts(updatedProducts)`, `clear()` du panier,
   ajout de la vente. Atomique : pas d'état intermédiaire incohérent.
4. **Service** — `syncRemote((api) => api.sales.create({ sale, lines }), 'Vente non synchronisée.')` :
   en mode `http` un échec affiche un toast, **sans annuler** la vente locale
   (mise à jour optimiste assumée). En mode `mock`, `syncRemote` ne fait rien.
5. **Persistance** — le middleware `persist` écrit `ma-caisse/<orgId>/sales`.

Règle qui en découle : **l'UI ne calcule rien, le store n'invente rien, le
domaine décide.** Si tu hésites sur l'emplacement d'un `if`, c'est dans
`domain/`, avec un test.

---

## 4. Recettes

### Recette 1 — ajouter un champ à un produit

1. `src/types/index.ts` → ajouter le champ à `Product` (et à `ProductInput` si
   saisissable ; `ProductInput = Omit<Product,'status'>`, le statut est dérivé).
2. `src/types/` puis `src/store/useProductsStore.ts` :
   - `sanitizeProduct()` doit **copier** le nouveau champ (sinon il est perdu à
     chaque écriture) ;
   - `toProduct()` (migration) doit le coercer avec `coerceString` / `coerceNumber` /
     `coerceBoolean`.
3. `src/mocks/fixtures/business.ts` → compléter les articles de démo (sinon
   `undefined` partout).
4. UI : `features/stock/ProductFormModal.tsx` (saisie) et les vues qui l'affichent.
5. Tests : `src/store/__tests__/products.test.ts` (persistance du champ) +
   `src/domain/__tests__/stock.test.ts` si la règle change.

> Un champ **obligatoire** ajouté à `Product` casse la compilation de toutes les
> fixtures : c'est voulu, cela t'oblige à traiter la migration.

### Recette 2 — ajouter une collection métier (ex. « fournisseurs »)

Le chemin complet, dans cet ordre (chaque étape compile avant la suivante) :

```text
1. types/index.ts        → interface Supplier
2. domain/suppliers.ts   → règles pures + domain/__tests__/suppliers.test.ts
3. mocks/                → fixtures + orgSeed() (clé `suppliers`)
4. services/contracts.ts → SuppliersRepository + champ `suppliers` dans `Api`
5. services/endpoints.ts → suppliers(orgId), supplier(orgId, id)
6. services/adapters/mockApi.ts   → implémentation en mémoire (respecte le contrat)
7. services/adapters/httpApi.ts   → implémentation REST
8. store/storeUtils.ts   → PERSIST_NAMES.suppliers + gardes/coercions si unions
9. store/useSuppliersStore.ts     → create + persist(persistOptions(...)) + syncRemote
10. store/tenantScope.ts → enregistrer le store dans scopeStoresToOrganization()
11. store/auth.ts        → loadCollections() : chargement initial en mode http
12. features/fournisseurs/        → vue + modale, branchée dans app/App.tsx si nouvel onglet
```

Points de vigilance :

- **`tenantScope.ts` est obligatoire** : un store non enregistré écrira dans une
  clé non cloisonnée et fuitera entre organisations.
- **`mockApi` et `httpApi` doivent rester iso-contractuels** : `services/__tests__`
  teste les deux, c'est le filet de sécurité du mode `http`.
- Le store ne fait qu'orchestrer : `set()` optimiste puis `syncRemote(...)`.
- La clé de persistance ne doit **jamais** être réutilisée pour un autre contenu
  (`PERSIST_NAMES` est la source unique).

### Recette 3 — ajouter une action à un store existant

```ts
// src/store/useProductsStore.ts
interface ProductsState {
  // …
  renameProduct: (id: string, name: string) => void;
}

// dans create(persist((set, get) => ({ … })))
renameProduct: (id, name) => {
  const clean = name.trim();
  if (clean.length === 0) return;
  set((state) => ({
    products: state.products.map((p) => (p.id === id ? sanitizeProduct({ ...p, name: clean }) : p)),
  }));
  syncRemote((api) => api.products.update(id, { name: clean }), 'Renommage non synchronisé.');
},
```

Trois réflexes : passer par `sanitizeProduct` (sinon le statut dérivé se fige en
état), valider l'entrée avant `set`, et fournir un message de toast explicite.

Puis : exposer un sélecteur **stable** si l'UI en a besoin, et tester
(`src/store/__tests__/...`, avec `beforeEach(() => useXStore.setState({ ... }))`).

### Recette 4 — ajouter un onglet

1. `src/types/index.ts` → `TabType` (union de littéraux).
2. `src/config/reference.ts` → `TAB_ORDER` **et** `TAB_ICON` (sinon `Record` incomplet → erreur TS).
3. `src/content/fr.ts` → `nav.<nouvelOnglet>` : `{ label, title, description }`
   (le type `Content` impose la clé).
4. `src/app/App.tsx` → déclarer la vue avec `lazy(() => import('@/features/<x>').then((m) => ({ default: m.XView })))`
   puis l'ajouter à `VIEWS: Record<TabType, ComponentType>`. Ne jamais l'importer statiquement :
   le premier écran ne doit embarquer que le shell.
5. `src/store/storeUtils.ts` → ajouter l'id dans `TAB_SET` (validation de `tab`
   persisté, sinon l'ancien onglet sera perdu à la réhydratation).
6. `src/domain/permissions.ts` → si l'onglet est réservé, étendre `canAccessTab`.
7. Test : `src/app/App.smoke.test.tsx` parcourt les onglets — il doit passer sans
   boucle de rendu.

### Recette 5 — ajouter une permission

1. `src/domain/permissions.ts` → ajouter le littéral à `Permission`, puis la
   valeur dans `ROLE_PERMISSIONS` pour chaque rôle concerné (+ test dans
   `domain/__tests__/permissions.test.ts`).
2. `src/store/useSessionStore.ts` → `usePermission('ma.permission')` (déjà générique).
3. UI : masquer **et** désactiver l'action, jamais seulement l'un des deux.
4. `docs/API_CONTRACT.md` → la même règle doit être implémentée côté serveur.
   Rappel : le filtrage client est cosmétique.

### Recette 6 — ajouter un texte, un toast

```ts
// src/content/fr.ts
stock: {
  toasts: {
    created: (nom: string) => `${nom} ajouté au catalogue.`,
  },
},
```

```ts
// dans une feature
import { t } from '@/content';
import { useUiStore } from '@/store/useUiStore';

const showToast = useUiStore((state) => state.showToast);
showToast(t.stock.toasts.created(nom), 'success'); // 'info' | 'success' | 'error'
```

- Les textes paramétrés sont des **fonctions pures**.
- `plural(count, 'article')` pour les accords.
- `pushToast` (bus `@/ui/toastBus`) est réservé à la couche `services/` et au
  store d'UI ; une feature passe par `showToast`.

### Recette 7 — afficher une modale / un drawer

Les overlays globaux sont pilotés par `useUiStore` (`modal: UiModal | null`) et
montés par `App.tsx` :

```ts
useUiStore.getState().openModal('export');   // 'depenses' | 'export' | 'profil' | 'abonnement' | 'notifications' | 'equipe'
```

- Nouvelle modale globale → ajouter la valeur à `UiModal`, à `UI_MODAL_SET`
  (`useUiStore.ts`) et le rendu dans `App.tsx`.
- Local à une feature (ex. formulaire d'article) → `useState` + `<Modal open …>`
  de `@/ui` suffit. `Modal` gère déjà portail, Échap, focus et verrou de scroll.
- Le reçu de vente est un cas à part : `openReceipt(sale, items)` (non persisté).

### Recette 8 — ajouter une exportation CSV/PDF

`src/lib/export/` : `csv.ts` (générateur), `pdf.ts` (jsPDF), `accounting.ts`
(périmètre comptable). Nouvelle sortie = nouvelle fonction dans le module adéquat,
libellés dans `content/fr.ts`, permission `export.run` respectée, et un test
unitaire sur la mise en forme (jamais sur le binaire PDF).

---

## 5. Conventions non négociables

| Sujet | Règle | Pourquoi |
|---|---|---|
| **Montants** | `number` en **FCFA entiers** ; formatage via `formatFCFA`, saisie via `parseMontant`, arrondi via `roundMontant` | Un flottant non arrondi casse le bilan |
| **Dates** | ISO `YYYY-MM-DD` en état, `HH:MM` pour l'heure ; helpers `domain/dates.ts` (`toIsoDate`, `parseDate`, `startOfDay`, `addDays`…) | Comparaisons de jours fiables, pas de fuseau piégeux |
| **Identifiants** | `createId('product')` → `product-<uuid>`, générés **côté client** | Création idempotente côté serveur |
| **Textes** | Uniquement via `t.*` | Le jour où une 2ᵉ langue arrive, tu ne réécris pas l'UI |
| **Mocks** | Uniquement dans `src/mocks/` | Empêche les données de démo de fuiter en prod |
| **Zustand 5** | Jamais de sélecteur qui alloue (`{a, b}`, `state.x.filter(…)`) ; s'abonner à `state.x` + `useMemo`, ou `useShallow` | `useSyncExternalStore` boucle sinon (écran figé) |
| **TypeScript** | `strict`, `noUnusedLocals`, `noUnusedParameters` ; ESLint `--max-warnings 0` | Le build CI est impitoyable |
| **Nommage** | Fichiers de composants en `PascalCase.tsx`, modules/domaine en `camelCase.ts`, un dossier par feature avec `index.ts` | Découvrabilité |
| **Couches** | Les imports interdits sont refusés par ESLint (`no-restricted-imports` par lane) ; toute exception doit être justifiée sur place | Le lint remplace la revue humaine sur ce point |
| **Langue de code** | Code et commentaires en anglais technique ou français, **mais l'UI et les messages sont en français** | Cohérence produit |

---

## 6. Tester

Configuration : `vitest.config.ts` (alias `@`, `jsdom`, `globals`, setup
`src/test/setup.ts`), tests colocalisés dans `__tests__/`.

| Niveau | Fichier type | Méthode |
|---|---|---|
| Domaine | `domain/__tests__/stock.test.ts` | Fonctions pures : entrées/sorties, aucune mock, très rapide — **c'est là que doit vivre l'essentiel de la couverture** |
| Store | `store/__tests__/products.test.ts` | `beforeEach(() => useXStore.setState({ … }))` puis actions ; on lit `getState()` |
| Services | `services/__tests__/services.test.ts` | `createMockApi()` / `createHttpApi(createHttpClient({ fetchImpl }))` + `setAuthToken` / `setActiveOrganization` avant chaque test |
| Shell | `app/App.smoke.test.tsx` | Parcours des 5 onglets : détecte les boucles de rendu Zustand |

```bash
bun run test -- src/domain/__tests__/stock.test.ts   # cible un fichier
bun run test:coverage                                 # couverture + seuils
```

### Couverture mesurée (base de référence)

`bun run test:coverage` → **65,3 % lignes · 63,2 % fonctions · 60,3 % branches**
(23 fichiers, 175 tests). Seuils bloquants dans `vitest.config.ts` :
`lines ≥ 63`, `functions ≥ 60`, `branches ≥ 55`. Une baisse fait échouer la CI.

| Zone | Lignes | Fonctions | Branches | Lecture |
|---|---:|---:|---:|---|
| `domain/` | **98,7** | 100 | 92,1 | socle métier (dont `validation.ts`) : exemplaire, à maintenir |
| `config/` | 100 | 100 | 82,4 | référentiels couverts |
| `store/` | 81,7 | 83,3 | **58,7** | bon, mais branches d'orchestration à couvrir |
| `app/` | 77,0 | 65,5 | 79,4 | shell couvert par le smoke |
| `ui/` | 75,0 | 73,6 | 73,0 | primitives, tests ponctuels |
| `services/` | 67,2 | 52,8 | 69,2 | invitations couvertes ; `httpApi` reste à 17 % |
| `content/` | 58,2 | 55,8 | 77,8 | textes, peu de logique |
| `features/` | **56,0** | 51,7 | **44,5** | écrans : couverts par le smoke seulement |
| `lib/` | **15,9** | 31,8 | 45,8 | journaux comptables testés ; `pdf.ts` et `ai/` non |

### Zones à couvrir en priorité (avant les jalons concernés)

| Manque | Fichiers | Jalon / issue |
|---|---|---|
| Export PDF réel | `lib/export/pdf.ts` (0 %) | impression/PDF (#15) |
| Chemin HTTP réel | `services/adapters/httpApi.ts` (17 %) | parité contrat (#2) |
| Orchestration de session | `store/auth.ts` (branches 41,9 %) | 401/403, purge locale (#10, #19, #23) |
| Vente / dépenses / notifications | `useSalesStore`, `useExpensesStore`, `useNotificationsStore` | crédits (#8, #14) |
| Parcours d'écran | `features/ventes`, `features/credits`, `features/export` | caisse (#15, #16, #18) |

### Règle : test d'abord pour les correctifs

- **Bug** → écrire le test **rouge** qui reproduit le défaut, puis corriger
  (c'est la preuve que le correctif est le bon, sinon on « corrige » un symptôme).
- **Comportement déjà spécifié** (contrat, domaine) → test d'abord, puis implémentation.
- **Écran / mise en page** → test après coup, ciblé (le smoke couvre les boucles
  de rendu ; on n'écrit pas de test DOM pour chaque variante visuelle).
- Ne jamais viser 100 % : la couverture est un garde-fou, pas un objectif.
  Un sélecteur mort couvert à 100 % (cas rencontré et supprimé) est du temps perdu.

Notes :

- **jsdom est lourd** (19 environnements ≈ 60 s au total). Ne crée pas un
  `.test.ts` « pour voir » : cible ton fichier.
- Une règle métier sans test dans `domain/` sera refusée en review.
- En cas de doute sur une régression de persistance :
  `store/__tests__/migration.test.ts` est le patron (blob v1 → v2).

---

## 7. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| Écran de chargement infini | Session non restaurée en mode `http`, cookie de session absent, ou `organizationId` absent | Vérifier `services/tenant.ts` (`setActiveOrganization`), le cookie/refresh puis `store/auth.ts` (D1, RG-A10) |
| Données de démo réapparues / perdues | Clé `localStorage` écrasée ou organisation changée | Inspecter `ma-caisse/<orgId>/<collection>` ; `localStorage.clear()` pour repartir de zéro |
| Deux organisations se contaminent | Store absent de `scopeStoresToOrganization()` | Ajouter le store dans `store/tenantScope.ts` |
| « Écran blanc » + boucle infinie | Sélecteur Zustand qui alloue un objet/tableau | `useShallow` ou sélection d'une tranche stable + `useMemo` |
| `401` permanent en mode `http` | Cookie expiré ou refresh invalidé (réutilisation, révocation) ; le client déconnecte au `401` | Re-login ; vérifier `mc_session`/`mc_refresh` et le CSRF (RG-A10) — un `401 STEP_UP_REQUIRED` ne doit **pas** déconnecter |
| `error: Unknown lockfile version` | Bun < 1.4 avec `bun.lock` v2 | `bun upgrade` (ou `bun install` régénère le lockfile, à éviter en PR) |
| HMR inactif | `DISABLE_HMR=true` dans l'environnement (AI Studio) | Retirer la variable pour le dev local |
| ESLint échoue sur un import inutilisé | `noUnusedLocals` + `--max-warnings 0` | Supprimer, pas désactiver |
| Un texte s'affiche `undefined` | Clé manquante dans `fr.ts` (typage partiel) ou ancien build | Ajouter la clé, `bun run lint` le signale |

Repartir d'une base saine :

```bash
# dans la console du navigateur
localStorage.clear(); location.reload();
```

---

## 8. Workflow Git

- Branche par sujet : `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Commits **conventionnels, en français**, au présent :
  `feat(ventes): ajoute le paiement mixte`, `fix(stock): borne le stock à zéro`.
- Avant de pousser : `bun run lint && bun run test` (les deux doivent passer).
- Ne jamais committer : `node_modules/`, `dist/`, `.env*`, `package-lock.json`
  (ignoré — le projet utilise **Bun**).
- Réécrire l'historique (auteur, message) est possible mais impose un
  `--force-with-lease` ; prévenir l'équipe avant.

---

## 9. Definition of Done

Une tâche n'est pas terminée tant que :

- [ ] La règle métier est dans `domain/` et **testée**.
- [ ] Aucun texte en dur : tout passe par `content/fr.ts`.
- [ ] Aucun `import.meta.env` hors `config/env.ts`.
- [ ] Aucun `fetch` hors `services/`, aucune URL hors `services/endpoints.ts`.
- [ ] Si nouveau store : `PERSIST_NAMES` + `persistOptions` + `tenantScope`.
- [ ] Si nouvelle route : `contracts.ts`, `endpoints.ts`, `mockApi`, `httpApi`, `docs/API_CONTRACT.md`.
- [ ] Si nouvelle donnée persistée : migration/coercion prévue (`storeUtils.ts`).
- [ ] Permissions appliquées dans l'UI **et** documentées pour le serveur.
- [ ] Si le changement touche l'identité ou la session : règle `RG-A…` citée et
  `docs/AUTH_DECISIONS.md` respecté (aucun jeton durable côté client).
- [ ] `bun run lint` ✔ · `bun run test` ✔ · `bun run build` ✔ si bundling touché.
- [ ] Documentation mise à jour si une convention change (ce guide, `ARCHITECTURE.md`).

---

## 10. Pour aller plus loin

- **Comprendre le multi-tenant** : `store/useAuthStore.ts`, `store/auth.ts`,
  `store/tenantScope.ts`, `services/tenant.ts` — dans cet ordre.
- **Toucher à l'authentification** : lire d'abord
  [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) (normatif : D1–D9, RG-A01–RG-A22),
  puis `docs/API_CONTRACT.md` §2 (routes), puis seulement `features/auth` et
  `store/auth.ts`. **Toute règle `RG-A…` modifiée dans le code doit citer son
  identifiant dans le test** ; un écart entre le code et une règle est un bug.
- **Comprendre le contrat backend** : `docs/API_CONTRACT.md`, puis
  `services/adapters/mockApi.ts` (implémentation de référence exécutable).
- **Comprendre le design system** : `src/index.css` (bloc `@theme`) puis
  `src/ui/index.ts`.
- **Comprendre les graphiques** : `features/bilan/*Chart.tsx` (Recharts, données
  dérivées par le domaine, jamais calculées dans le composant).
