# Ma Caisse — Architecture cible

## Décisions (validées)

| Sujet | Choix |
|---|---|
| Périmètre | **Front seul**, SPA. Pas de serveur, pas de DB. |
| État | **Zustand** + middleware `persist` (localStorage), un store par domaine. |
| Tooling | **TS strict**, alias `@/`, **ESLint + Prettier**, **Vitest** sur la logique métier. |
| Déploiement | Inchangé (Google AI Studio / Cloud Run statique). |

## Règles de couches (imports autorisés, du haut vers le bas uniquement)

```
ui/  ──►  features/  ──►  store/  ──►  domain/
                                        lib/
```

- `domain/` : logique métier **pure**, zéro React, zéro import de `features/`, `store/`, `ui/`.
- `store/` : état Zustand + persistance. Appelle `domain/`. **Aucun JSX, aucun import de `ui/` ou `features/`.**
- `features/` : composants de functionality. Lisent les stores via sélecteurs, appellent les actions. **Aucune règle métier écrite ici** — si un calcul apparaît, il descend dans `domain/`.
- `ui/` : primitives visuelles réutilisables (Modal, Button, Badge, Input, Toast, EmptyState, Card, Drawer). **Aucune connaissance métier.**
- `lib/` : intégrations externes pures (PDF/CSV, Gemini). Aucune logique métier.
- `app/` : shell uniquement (layout, Header, BottomNav, routage d'onglet, montage des modals globaux).

Interdits : `any` implicite, `as any`, `Date.now()` comme id (→ `createId()`), imports par chemin relatif hors de `src/`.

## Arborescence cible

```
src/
  app/
    App.tsx                 # shell mince : layout + routage onglet + modals globaux
    routes.ts               # TABS constant (id, label, icône) — source unique pour Header/BottomNav
  domain/                   # PUR — testé unitairement
    money.ts                # formatFCFA, formatNombre, roundMontant
    ids.ts                  # createId(prefix), nextSaleNumber()
    stock.ts                # computeStockStatus, isLowStock, filterProducts, sortProducts
    sales.ts                # cartTotals, completeSale(...) -> vente + décréments
    credits.ts              # computeCreditStatus, applyCreditPayment, overdueCredits
    finances.ts             # dailyRevenueSeries, kpis, expenseBreakdown, cashFlow
    __tests__/*.test.ts
  store/
    storeUtils.ts           # persist config partagé (nom/version/migrate)
    useProductsStore.ts
    useCartStore.ts
    useSalesStore.ts
    useExpensesStore.ts
    useCreditsStore.ts
    useNotificationsStore.ts
    useUiStore.ts           # onglet courant, modales, toast, isOffline (état réel)
  features/
    accueil/{AccueilView.tsx, KpiCard.tsx, RecentSales.tsx, StockAlerts.tsx}
    ventes/{VentesView.tsx, ProductCard.tsx, CartPanel.tsx, PaymentPad.tsx, ReceiptModal.tsx}
    stock/{StockView.tsx, StockFilters.tsx, ProductFormModal.tsx, RestockModal.tsx}
    credits/{CreditsView.tsx, CreditFilters.tsx, CreditFormModal.tsx, CreditPaymentModal.tsx}
    bilan/{BilanView.tsx, RevenueChart.tsx, CashFlowChart.tsx, ChannelSplit.tsx, ExpenseBreakdown.tsx}
    depenses/DepensesModal.tsx
    abonnement/AbonnementModal.tsx
    profil/ProfilModal.tsx
    export/ExportModal.tsx
    notifications/NotificationDrawer.tsx
  ui/
    Modal.tsx  Drawer.tsx  Button.tsx  Badge.tsx  Input.tsx  Select.tsx
    Card.tsx  Toast.tsx  ToastHost.tsx  EmptyState.tsx  Spinner.tsx
  lib/
    export/csv.ts
    export/pdf.ts
    ai/client.ts            # import dynamique de @google/genai, appel isolé
  types/index.ts
  styles/tokens.ts          # réactivé (aujourd'hui mort)
  index.css
  main.tsx
```

## Contrats des stores (source de vérité pour toutes les lanes)

Toutes les entités gardent les types de `src/types/index.ts` (mêmes champs). Ajouts autorisés : `id: string` (au lieu de `number`) pour les entités créées à l'exécution.

### useProductsStore — `products`, persiste `ma-caisse/products`
- `addProduct(input: ProductInput): void` · `updateProduct(id, patch: Partial<ProductInput>): void`
- `restock(id: string, quantity: number): void` · `removeProduct(id: string): void`
- Statut **jamais stocké** : calculé à la lecture par `domain/stock.computeStockStatus(product)`.
- Sélecteurs : `lowStockProducts`, `outOfStockProducts`, `stockValue()`

### useCartStore — `items: CartItem[]` (`{productId, quantity, price, name, unit}`), persiste `ma-caisse/cart`
- `addItem(product, qty=1)` · `removeItem(productId)` · `setQuantity(productId, qty)` · `clear()`
- Sélecteurs : `cartTotals()` → `{ subtotal, itemCount, lines }`

### useSalesStore — `sales`, persiste `ma-caisse/sales`
- `completeSale(input): SaleTransaction` (appelle `domain/sales.completeSale`, décrémente le stock via `useProductsStore.getState().restock`)
- Sélecteurs : `todaySales()`, `revenueSeries(days)`

### useCreditsStore — `credits`, persiste `ma-caisse/credits`
- `addCredit(input)` · `payCredit(id, amount)` (interdit le sur-paiement) · `markSettled(id)`
- Sélecteurs : `activeCredits()`, `totalOutstanding()`, `overdueCredits()`

### useExpensesStore — `expenses`, persiste `ma-caisse/expenses`
- `addExpense(input)` · `removeExpense(id)` · sélecteur `expensesInRange(from, to)`

### useNotificationsStore — `notifications`, persiste `ma-caisse/notifications`
- `push(n)` · `markAllRead()` · `unreadCount()`

### useUiStore — **non persisté** pour `isOnline`, persisté pour préférences
- `tab: TabType`, `setTab` · `modal: null | 'depenses'|'export'|'profil'|'abonnement'|'notifications'`, `openModal`, `closeModal`
- `toast: {id, message, tone} | null`, `showToast(message, tone?)`, `clearToast`
- `isOnline: boolean` ← alimenté par `window.addEventListener('online'/'offline')`, plus de constante `false`

### storeUtils.ts
```ts
export const persistOptions = <T>(key: string, version = 1) => ({
  name: `ma-caisse/${key}`,
  version,
  partialize: (s: T) => s as unknown as Partial<T>, // ajusté par store
});
```
Point d'attention : à la migration du format existant (`number` → `string` ids), fournir `migrate` dans chaque store et `version: 2`, sinon les données persistées cassent le typecheck runtime.

## Primitives UI — API figée

```tsx
<Modal open title onClose footer? size?:'sm'|'md'|'lg' headerVariant?:'light'|'dark' icon? subtitle?>{children}</Modal>
<Drawer open onClose title>{children}</Drawer>
<Button variant?:'primary'|'secondary'|'ghost'|'danger' size?:'sm'|'md'|'lg' loading? onClick>
<Badge tone?:'success'|'warning'|'danger'|'info'|'neutral'>{children}</Badge>
<Input label name error? />  <Select label options={[{value,label}]} />
<Card title?>{children}</Card>
<EmptyState icon title description action? />
<ToastHost />   // monté une seule fois dans app/App.tsx, lit toastBus
```

`headerVariant: 'dark'` est requis pour `ExportModal` et `ReceiptModal` (en-tête `bg-slate-900 text-white`) ; `'light'` (défaut) pour les 7 autres. `icon` et `subtitle` ne s'appliquent qu'à la variante `dark` (ils reproduisent le carré d'icône émeraude et le sous-titre de l'export). Le toast reste **centré en haut** (position réelle actuelle), pas en bas.
Toutes les modales existantes (y compris celles aujourd'hui inline dans les vues : formulaire produit, crédit, paiement) **doivent** passer par `<Modal>`. Suppression des `if (!isOpen) return null` dispersés et des backdrops dupliqués.

## Nettoyage obligatoire

- Supprimer `src/styles/tokens.ts` **ou** le réintroduire comme source unique consommée par `ui/Badge` et `ui/Button` (choix : le supprimer, `index.css` reste la source du design system).
- Supprimer `formatFCFA` de `data/initialData.ts` ; le remplacer par `domain/money.formatFCFA` **et l'utiliser partout** (plus de `.toLocaleString('fr-FR')` inline).
- `data/initialData.ts` → `src/data/seed.ts`, uniquement des données.
- Déps à retirer si toujours inutilisées après refactor : `lucide-react`, `motion` (index.html utilise déjà Material Symbols), `express`, `dotenv`. **Conserver** `@google/genai` (utilisé par `lib/ai/client.ts`).
- Supprimer `.kilo/worktrees/auspicious-emperor/` (worktree détaché périmé, duplicata du repo).
- Remplacer tous les `id: number`/`Date.now()`/`saleNumber` aléatoire par `domain/ids`.

## Règle critique : stabilité des sélecteurs Zustand v5

Zustand v5 compare les sélecteurs avec `useSyncExternalStore`. **Un sélecteur qui alloue un nouvel objet ou tableau à chaque appel provoque une boucle de rendu.** Règle unique, documentée dans `src/store/storeUtils.ts` :

1. S'abonner à une **slice stable** (`state.products`, `state.lines`, …) puis dériver avec `useMemo`.
2. Si un sélecteur dérivé est inévitable, l envelopper dans `useShallow` (`zustand/react/shallow`).
3. Les sélecteurs primitifs (`state.tab`, `state.isOnline`, …) sont toujours sûrs.

Garde-fou : `src/app/App.smoke.test.tsx` monte l'app, parcourt les 5 onglets et échoue si `Maximum update depth exceeded` apparaît.

## Overlays globaux

`App.tsx` monte une seule fois `DepensesModal`, `ExportModal`, `ProfilModal`, `AbonnementModal`, `NotificationDrawer`, `ReceiptModal` et `ToastHost`. Ils se pilotent via `useUiStore` (`modal`, `receipt`). **Ils sont mutuellement exclusifs** : ouvrir l'un ferme l'autre (aucune pile d'overlays, le dernier geste gagne).

## Definition of Done (globale) —atteint le 2026-10-18

```
bun run lint      # tsc --noEmit strict + eslint --max-warnings 0 → exit 0
bun run test      # vitest run → 128 tests, 17 fichiers, tout vert
bun run build     # vite build → succès
bun run dev       # HTTP 200 sur :3000
```
Zéro `any`/`as any`. `src/app/App.tsx` = 52 lignes. `src/components/`, `src/utils/`, `src/styles/`, `src/types.ts` supprimés.

## État de la migration

| Couche | Fichiers | Tests |
|---|---|---|
| `domain/` | 7 modules purs | 75 |
| `store/` | 8 stores Zustand + persist v2 | 48 + smoke |
| `features/` | 10 features | — |
| `ui/` | 13 primitives | — |
| `lib/` | export csv/pdf/accounting + client Gemini | — |

### Écarts assumés et honnêteté des données
- Les données seed sont en **ISO relatif à aujourd'hui** (plus de « Aujourd'hui » / « 18 Octobre 2024 »).
- Aucun chiffre n'est plus codé en dur comme donnée réelle : KPI, séries, marges, créances et totaux sont dérivés. Les valeurs **non modélisées** (identité commerce, TVA, caissier, historique de vérification, abonnement, sync cloud, impression, WhatsApp) sont explicitement annoncées comme non disponibles ou démo dans l'interface.
- Le paiement passe désormais de 3 boutons à 5 méthodes + pavé numérique (le `PaymentMethod` du domain l'exigeait déjà).