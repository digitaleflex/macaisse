# Audit d'architecture — Ma Caisse (frontend)

État audité : commit **`c80b925`** (`main`), ~13 400 lignes dans `src/`,
19 fichiers / 146 tests, `tsc --noEmit` + ESLint `--max-warnings 0` verts,
aucun backend dans le dépôt.

Méthode : lecture du code de `src/` + vérification par `grep`/lecture ciblée de
**chaque** constat (aucun constat n'est repris d'une doc ou d'une supposition).
Les affirmations du rapport d'audit initial qui se sont révélées fausses sont
listées en [§6](#6-corrections-apportées-au-rapport-initial).

---

## 1. Synthèse

**Ce qui tient** : le socle `domain/` (pur, testé), les stores comme simple
orchestration, la persistance versionnée avec migrations défensives, et le
cloisonnement multi-organisation de bout en bout (clés `ma-caisse/<orgId>/…`,
routes `/orgs/:orgId/…`, mock qui refuse une organisation non membre).

**Ce qui casse en premier** :

1. En mode `http`, **une mutation refusée par le serveur n'est jamais annulée** :
   la vente reste en historique, le stock reste décrémenté. Les KPI mentent
   silencieusement jusqu'au rechargement.
2. Une vente en **« Crédit partiel » ne crée aucune créance** : elle disparaît du
   carnet client, des relances et du KPI « créances clients ».

Les deux défauts sont dans le **cœur du métier** (encaissement), pas dans les
finitions. Le reste (perf, duplication, code mort) est de la dette classique.

| Catégorie | Nombre |
|---|---|
| Critiques | 2 |
| Majeurs | 9 |
| Mineurs | 15 |
| Faux positifs écartés | 3 |

---

## 2. Constats critiques

### C1 — Réconciliation `http` : mutation optimiste sans retour arrière

`syncRemote()` applique la mutation localement puis, en cas d'échec réseau ou de
refus serveur, se contente d'un toast (`src/services/index.ts:32-38`). Aucun
snapshot, aucune file de retry, aucun marquage `pending`.

Conséquence concrète sur une vente (`src/store/useSalesStore.ts:58-72`) : vente
ajoutée à l'historique, stock décrémenté, `sequence` incrémentée, numéro de
ticket consommé — **même si le serveur a répondu 4xx**. Le CA, le stock et la
numérotation divergent jusqu'au prochain `reloadOrganization()`.

**Correctif** : marquer la mutation `pending`/`failed` et rejouer au démarrage,
ou snapshot + restauration sur rejet. Aujourd'hui l'utilisateur n'a aucun moyen
de savoir que sa caisse est fausse.

### C2 — Vente à crédit : créance fantôme

`creditAmount` est seulement normalisé à `Math.max(0, …)`
(`src/domain/sales.ts:122-124`) : rien ne le borne au sous-total, donc
`remainingAmount` peut dépasser le montant de la vente. Surtout, **aucune
créance n'est créée** : `addCredit` n'est appelé que par l'écran Crédits
(`src/features/credits/CreditsView.tsx:98`), jamais par le flux de vente
(`src/features/ventes/PaymentPad.tsx:57-68`).

Conséquence : une vente « Partiel » au comptoir génère un reste dû affiché sur le
reçu, mais **absent du carnet de crédits**, des relances et du KPI « créances
clients » du bilan. Trou comptable immédiat, indépendant du mode mock/http.

**Correctif** : borner `creditAmount ≤ subtotal` dans `domain/sales.ts` et créer
la créance dans le même flux atomique (ou retirer le crédit partiel du POS).

---

## 3. Constats majeurs

| # | Constat | Preuve | Correctif |
|---|---|---|---|
| M1 | **`mockApi` métier jamais exécuté** : `loadCollections()` sort tôt hors `http` et `syncRemote` aussi, donc `products/sales/expenses/credits/notifications` de l'adaptateur ne tournent qu'en `http`. Or c'est la « référence exécutable » testée par `services.test.ts` — et ses invariants divergent déjà (stock borné au lieu de refuser). | `src/services/index.ts:33` ; `src/store/auth.ts:25-33` ; `src/services/adapters/mockApi.ts:338-350` vs `src/domain/sales.ts:105-115` | Soit activer le sync en mock, soit supprimer ces dépôts et tester le contrat avec un faux serveur (`fetchImpl`) |
| M2 | **Seeds de démo dans le code de prod** : chaque store importe ses `SEED_*` et les utilise comme fallback de migration, sans condition de mode. Un `localStorage` hérité réinjecte la démo en mode `http` (seul `tenantScope` respecte `EMPTY_ORG_SEED`). | `src/store/useProductsStore.ts:9,54,115` ; `useSalesStore.ts:11,48,84` ; `useCreditsStore.ts`, `useExpensesStore.ts` ; `src/store/tenantScope.ts:50` | Fallback vide dès que `env.apiMode === 'http'` |
| M3 | **Unions métier définies 3 fois** (`types/`, `config/reference.ts`, `store/storeUtils.ts`) et **gardes réimplémentées 5 fois**. Ajouter une catégorie ou un moyen de paiement fait rejeter les produits existants à la migration (`isCategory` → `null`), **sans erreur visible**. | `src/types/index.ts:10-19` ; `src/config/reference.ts:6,34-40` ; `src/store/storeUtils.ts:114-137` ; `ProductFormModal.tsx:21` ; `StockFilters.tsx:38` ; `ExpenseForm.tsx:24` ; `ExportOptions.tsx:20` | Dériver les `Set` de `reference.ts`, gardes uniques dans `domain/` |
| M4 | **Aucun découpage de code effectif** : `App` importe les 5 vues statiquement et le barrel `lib/export` réexporte `pdf.ts` → le premier écran charge **tout**. Build mesuré : `index` 421 kB + `charts` 415 kB + `pdf` 422 kB + `html2canvas` 202 kB + `purify` 29 kB ≈ **1,26 MB de JS (≈ 390 kB gzip)**, y compris pour un caissier qui n'ouvrira jamais le bilan ni un export. | `src/app/App.tsx:5-16` ; `src/lib/export/index.ts:1-3` ; `src/lib/export/pdf.ts:1` ; mesure `bun run build` | `React.lazy` par vue + `await import()` du module PDF dans les handlers ; supprimer le barrel |
| M5 | **Inversion de couche** : `services/` importe `ui/` (`pushToast`). La couche réseau n'est plus testable hors DOM. | `src/services/index.ts:6,36` | Reporter d'erreur injecté au bootstrap (`setErrorReporter`) |
| M6 | **5 écrans du shell appellent `services/` directement**, dont `TeamModal` qui gère l'équipe dans un `useState` local : état perdu à la fermeture, rôle non rafraîchi après changement, aucune couche store. | `features/equipe/TeamModal.tsx:5,35-96` ; `features/auth/LoginScreen.tsx:4` ; `features/profil/ProfilModal.tsx:5` ; `app/Sidebar.tsx:5` ; `app/Topbar.tsx:4` | `store/useTeamStore.ts` ; hook `useIsDemo()` adossé à `config/env.ts` |
| M7 | **Aucune notification générée** : `push` n'est appelé que dans un test. Pas de rupture de stock, pas de crédit échu, pas de vente à crédit — le centre de notifications est figé sur les fixtures. | `src/store/useNotificationsStore.ts:42` (0 appel hors test) ; `features/accueil/StockAlerts.tsx:25-33` recalcule au lieu de publier | Publier depuis les transitions métier des stores |
| M8 | **Duplication des calculs métier** : marge recalculée dans 4 fichiers sous 2 formes, statuts/débiteurs dans 3 — alors que les sélecteurs existent mais ne sont **pas branchés** (`selectTodaySales`, `selectRevenueSeries`, `selectActiveCredits`, `selectCreditSummary`, `selectUnreadNotifications`… 9 sélecteurs à 0 usage hors tests, donc **testés mais morts**). | `StockView.tsx:49-53` ; `BilanView.tsx:78` ; `AccueilView.tsx:87-92` ; `ProductFormModal.tsx:41` ; `CreditsView.tsx:50-61` ; `useSalesStore.ts:97-111` ; test trompeur `store/__tests__/sales.test.ts:115-136` | `domain/stock.marginRate()` + `domain/credits.activeRows()` ; brancher ou supprimer les sélecteurs morts |
| M9 | **`StockView` : 484 lignes et double rendu** — tableau (`hidden md:table`) **et** liste de cartes (`md:hidden`) tous deux montés : le DOM de l'inventaire est construit deux fois, la logique de ligne aussi. | `features/stock/StockView.tsx:326,397` (+ 484 l) | Extraire `RowActions`/`StockLevel` ; un seul rendu responsive (`useMediaQuery`) |

---

## 4. Constats mineurs

| # | Constat | Preuve |
|---|---|---|
| m1 | `modal` est **persisté** : une modale se rouvre après re-login. Les 6 modales vérifient bien leurs permissions (contrairement au rapport initial) — c'est un défaut d'UX, pas de sécurité. | `store/useUiStore.ts:138-140` |
| m2 | `decrementStock` est **mort** (aucun appel) et contredit l'invariant du domaine (borne à 0 au lieu de refuser). | `store/useProductsStore.ts:30,93-107` ; test `store/__tests__/products.test.ts:89-98` |
| m3 | Migration du store auth **sans coercition** (`{ ...EMPTY, ...persisted }`) → jeton/profil arbitraires acceptés ; clé de persistance en littéral au lieu de `PERSIST_NAMES.auth`. | `store/useAuthStore.ts:33,40` |
| m4 | **Aucune confirmation avant suppression** (produit, dépense, crédit, membre) et pas d'annulation ; en `http`, la suppression optimiste est irréversible. | `StockView.tsx:221` ; `DepensesModal.tsx:79` ; `TeamModal.tsx:88` |
| m5 | **Validations silencieuses** : 4 formulaires font `return` sans message quand la saisie est invalide. | `RestockModal.tsx:23` ; `ProductFormModal.tsx:46` ; `CreditFormModal.tsx:39` ; `ExpenseForm.tsx:38` |
| m6 | Montants **non entiers / négatifs** acceptés à la saisie alors que le contrat impose des FCFA entiers ; l'affichage arrondit → somme affichée ≠ somme des lignes. | `ProductFormModal.tsx:105-133` ; `domain/money.ts:6-25` |
| m7 | Toast de règlement de crédit : annonce le montant **saisi**, pas le montant réellement imputé quand il dépasse le reste dû. | `CreditsView.tsx:86-92` |
| m8 | **4 préférences POS décoratives** (`deductionAutoStock`, `alertesSmsRupture`, `imprimanteBluetooth`, `bipSonoreScan`) : aucun code ne les lit hors du panneau. `deductionAutoStock` promet une règle que la caisse n'applique jamais. | `features/profil/PosSettings.tsx:6-11` ; `store/useUiStore.ts:67-72` |
| m9 | **Clôture de caisse** = `useState` de la vue : perdue au rechargement, n'empêche aucune vente. | `AccueilView.tsx:50,113-117` |
| m10 | Overlays : **pas de piège de focus** (Tab sort de la modale) malgré « focus géré » dans la doc. | `ui/useOverlay.ts:15-33` |
| m11 | `mockApi` n'applique **presque aucun rôle** sur les routes métier (une seule garde `owner`, sur l'équipe) alors que le contrat impose une colonne « rôle min. ». Un caissier peut tout faire en démo. | `adapters/mockApi.ts:148` vs `docs/API_CONTRACT.md` |
| m12 | Export : la **période sélectionnée est ignorée** (`exportToCSV('all', …)`), aucun filtre de dates dans la modale, et le nom de fichier est horodaté en **UTC** alors que tout le reste est local. | `BilanView.tsx:86,90` ; `export/ExportModal.tsx:31-39` ; `lib/export/csv.ts:84` |
| m13 | Code mort / restes de template : `lib/ai/client.ts` sans aucun importeur (lit `import.meta.env` hors `config/env.ts`), dépendance `@google/genai` conservée, `package.json` nommé `react-example`, `.env.example` garde `GEMINI_API_KEY` / `APP_URL`. | `lib/ai/client.ts:38,53` ; `package.json:2` ; `.env.example:1-10` |
| m14 | Deux constantes pour le **même mot de passe démo** (`DEMO_PASSWORD` et `DEMO_INVITE_PASSWORD`), et `config/` connaît un concept de mock. | `mocks/fixtures/accounts.ts:12` ; `config/reference.ts:80` |
| m15 | **Règles d'import non outillées** : rien n'empêche `ui/ → store/` demain. Seul `@/mocks` est restreint par ESLint. | `eslint.config.js:19-26` |
| m16 | Erreurs avalées : `activateOrganization` met la session en erreur mais ne remonte rien ; les appelants affichent quand même « espace changé / synchronisé ». | `store/auth.ts:55-58` ; `OrgSwitcher.tsx:21-26` ; `ProfilModal.tsx:37-40` |
| m17 | Panier **cloisonné par organisation, pas par utilisateur** : sur un poste partagé, le caissier suivant retrouve le panier du précédent (non vidé au logout). | `tenantScope.ts:59` ; `store/auth.ts:112-124` |

---

## 5. Points forts à préserver (vérifiés)

- **Domaine réellement pur** : `grep` = 0 import React/store/services/mocks dans
  `src/domain/` ; 8 fichiers de tests dédiés (`stock`, `credits`, `finances`,
  `sales`, `money`, `dates`, `permissions`, `ids`).
- **Stores = orchestration** : le calcul passe par le domaine, l'écriture du stock
  d'une vente est atomique (`useSalesStore.ts:58-71`).
- **Persistance sérieuse** : `persistOptions` centralisé, version de schéma,
  coercions défensives, migration v1→v2 testée (`storeUtils.ts:49-61`).
- **Multi-tenant cohérent** : clés `ma-caisse/<orgId>/<collection>`, routes
  `/orgs/:orgId/…`, mock qui refuse une organisation non membre
  (`adapters/mockApi.ts:139-149`).
- **Design system étanche** : `grep` = 0 import `store/`/`features/`/`app/` dans
  `src/ui/`.
- **Zéro texte en dur** dans le JSX (`content/fr.ts`, 733 lignes, typé), zéro `any`,
  aucun sélecteur Zustand v5 allouant passé à `useStore` (seul `useShallow` sur
  les totaux du panier), divisions par zéro déjà gardées, listes vides gérées.

---

## 6. Corrections apportées au rapport initial

Trois affirmations du rapport d'audit ont été vérifiées puis **écartées** :

| Affirmation | Réalité du code |
|---|---|
| « 3 modales sur 6 vérifient la permission ; `TeamModal` et `ProfilModal` non » | **Faux** : les 6 modales appellent `usePermission` (`AbonnementModal:14`, `ExportModal:14`, `DepensesModal:16`, `TeamModal:33`, `ProfilModal:26-27`). Le seul défaut réel est `modal` persisté (m1) |
| « `ConfirmDialog` déjà présent dans `ui/` » | **Faux** : aucun `ConfirmDialog` n'existe dans `src/ui/`. Il faut le créer (m4) |
| « `mockApi` n'applique aucun rôle » | **Imprécis** : une garde existe (`adapters/mockApi.ts:148`, `owner` requis pour l'équipe). Les routes métier, elles, n'ont aucune garde (m11) |

---

## 7. Plan d'action priorisé

| Priorité | Chantier | Effort | Fichiers |
|---|---|---|---|
| **P0** | Réconciliation `http` : `pending`/retry ou snapshot+rollback (C1) | M | `services/index.ts`, `store/useSalesStore.ts` + les 4 autres stores |
| **P0** | Vente ↔ crédit : borner `creditAmount`, créer la créance atomiquement (C2) | M | `domain/sales.ts`, `store/useSalesStore.ts`, `PaymentPad.tsx` |
| **P1** | Seeds vides en mode `http` (M2) | S | 5 stores |
| **P1** | `mockApi` métier : l'activer ou le supprimer + tester via `fetchImpl` (M1) | M | `services/`, `store/__tests__` |
| **P1** | Union métier unique, `Set` dérivés de `reference.ts`, gardes dans `domain/` (M3) | M | `types/`, `config/`, `storeUtils.ts`, 4 forms |
| **P2** | Code splitting : vues en `React.lazy`, import dynamique du PDF (M4) | S | `app/App.tsx`, `lib/export/` |
| **P2** | `store/useTeamStore.ts` + `useIsDemo()` (M6) | M | `features/equipe`, `app/*` |
| **P2** | Notifications métier branchées sur les transitions de stores (M7) | M | stores + `StockAlerts` |
| **P2** | Brancher ou supprimer les 9 sélecteurs morts + factoriser marges/statuts (M8) | S | stores, `domain/stock.ts` |
| **P3** | `ConfirmDialog`, validations bruitées, `roundMontant` à la saisie, focus trap, purge du code IA, `package.json`, ESLint `no-restricted-imports`, vidage du panier au logout | S×8 | cf. §4 |

Ordre recommandé : **P0 → M2 → M1 → M3**, le reste ensuite. Les P0 seuls
représentent la différence entre « outil de démo crédible » et « caisse dont on
peut se servir ».

---

## 8. Annexe — rejouer les vérifications

```bash
# aucun import interdit dans ui/ ni domain/
grep -rn "from '@/\(store\|features\|app\)" src/ui | wc -l          # attendu : 0
grep -rn "from 'react'\|from '@/store" src/domain | wc -l            # attendu : 0

# texte en dur / any / fetch hors services
grep -rn "import.meta.env" src --include='*.ts*' | grep -v config/env.ts
grep -rn ": any" src | wc -l                                         # attendu : 0
grep -rn "fetch(" src | grep -v src/services | wc -l                  # attendu : 0

# sélecteurs morts, notifications jamais poussées, stock écrit deux fois
grep -rn "selectActiveCredits\|selectCreditSummary" src | grep -v __tests__
grep -rn "\.push({" src/store src/features | grep -i notif
grep -rn "decrementStock" src | grep -v __tests__

# suite de référence
bun run lint && bun run test
```

Voir aussi : [`FEATURES_INVENTORY.md`](FEATURES_INVENTORY.md) (inventaire
fonctionnel), [`ARCHITECTURE.md`](../ARCHITECTURE.md) (règles de couches),
[`API_CONTRACT.md`](API_CONTRACT.md) (contrat backend).
