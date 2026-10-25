# Inventaire fonctionnel — Ma Caisse (frontend)

État du code audité : commit **`c80b925`**, branche `main`.
Périmètre : `src/` uniquement (le dépôt ne contient aucun backend).

**Chiffres clés** — 8 fichiers d'app `(622 l)`, 54 fichiers de features `(4 778 l)`,
19 fichiers `ui/` `(1 222 l)`, 21 fichiers `store/` `(2 244 l)`, 9 fichiers
`services/` `(944 l)`, 16 fichiers `domain/` `(1 486 l)`, ~13 400 lignes de `src/`.
Tests : **21 fichiers / 165 tests**.

Légende : ✔ implémenté et fonctionnel · ◐ simulé (UI + toast, aucun effet réel) ·
✗ absent du code.

---

## A. Écrans

### A.1 Authentification (hors shell)

| Élément | Détail | Fichier |
|---|---|---|
| Écran | Deux onglets *Se connecter* / *Créer un compte*, panneau marketing (3 arguments) | `features/auth/LoginScreen.tsx` (247 l) |
| Connexion | e-mail + mot de passe, erreurs typées (`invalidCredentials`, `sessionExpired`, `forbidden`…) | idem |
| Inscription | 8 champs : prénom, nom, e-mail, téléphone, mot de passe, nom du commerce, activité, ville | idem |
| Connexion 1 clic | 4 comptes de démonstration listés (mot de passe `demo1234`) | `mocks/fixtures/accounts.ts` |
| Reprise de session | `restoreSession()` au démarrage, écran splash + écran d'erreur avec *Réessayer* / *Se déconnecter* | `app/App.tsx`, `store/auth.ts` |

### A.2 Shell applicatif

| Élément | Détail | Desktop | Mobile |
|---|---|---|---|
| En-tête | Fil d'ariane de l'onglet, badge *Démo* / *En ligne*, bouton *Nouvelle vente*, cloche notifications (compteur non lus), avatar → profil | `app/Topbar.tsx` | ☑ |
| Navigation | 5 onglets + sélecteur d'espace + raccourcis (Dépenses, Export, Équipe, Notifications) + abonnement + profil | `app/Sidebar.tsx` (≥ `lg`) | `app/BottomNav.tsx` (< `lg`) |
| Sélecteur d'organisation | Liste des espaces, badge *Actuel*, bascule avec voile de chargement | `features/organisation/OrgSwitcher.tsx` | feuille |
| Accès refusé | Écran « Accès réservé » + retour caisse si l'onglet est interdit au rôle | `App.tsx` → `AccessDenied` | ☑ |
| Notifications temps réel | Écoute `online`/`offline` du navigateur, badge d'état | `store/useUiStore.ts` (`initOnlineListener`) | ☑ |

### A.3 Onglet **Accueil**

| Bloc | Contenu | Fichier |
|---|---|---|
| Héro | Salut prénomé, état caisse (ouverte/clôturée), CA du jour, panier moyen, articles au panier | `DashboardHero.tsx` |
| Actions rapides | Dépense, Article, Crédit, Export | `AccueilView.tsx` |
| 4 KPI | CA, Dépenses, Résultat net, Créances clients + variation vs période précédente, marge potentielle, nb débiteurs | idem |
| Tendance | Courbe 14 jours (Recharts) + sélecteur *Aujourd'hui / 7 jours / Ce mois* + total & moyenne | `SalesTrend.tsx` |
| Alertes | Articles en rupture / stock faible, crédits en retard avec montant à recouvrer | `StockAlerts.tsx` |
| Dernières ventes | 5 dernières avec numéro de ticket, reste dû, accès au reçu | `RecentSales.tsx` |
| Clôture journalière | Bouton *Clôturer / Rouvrir* + toast ◐ (état **local, non persisté**) | `ClosingCard.tsx` |

### A.4 Onglet **Caisse (POS)**

| Bloc | Contenu |
|---|---|
| Recherche | Nom / référence, effacement, bouton *Scanner un code-barres* ◐ (sélection aléatoire après 900 ms, encart « lecture… ») |
| Catalogue | Grille de cartes produit, stock disponible / *Plus que n* / *Épuisé*, catégorie, prix, ajout au panier |
| Panier | Qté +/−, retrait, vidage, sous-total, total, bouton *Encaisser*, vue flottante mobile |
| Encaissement | 5 modes (Espèces, Wave, Orange Money, Carte, Crédit partiel), client (nom/téléphone), montant reçu + *Exact*, monnaie à rendre, montant à crédit, reste dû, pavé numérique, validation |
| Reçu | Ticket (n° , date/heure, caissier, client, lignes, sous-total HT, TVA forfaitaire, net, règlement, reste), *Imprimer* ◐, *WhatsApp* ◐ |
| Historique | Ventes du jour / récentes (accueil) |

Fichiers : `features/ventes/VentesView.tsx` (222 l), `CartPanel`, `PaymentPad`, `ProductCard`, `ReceiptModal`.

### A.5 Onglet **Stock**

| Bloc | Contenu |
|---|---|
| 4 métriques | Valeur du stock (prix d'achat), marge moyenne, nombre de références, stock faible, ruptures |
| Filtres | Recherche (nom / réf / rayon), rayon (4 catégories), statut (dispo / faible / rupture), tri (quantité, nom, prix) |
| Tableau | Article (vignette), rayon, `stock / seuil`, prix de vente, prix d'achat (**permission `stock.viewCost`**), marge, statut, actions |
| Actions ligne | Réappro. (modale quantité + aperçu du stock après), raccourcis +5/+10/+20, éditer, supprimer |
| Création / édition | 11 champs : nom, SKU, rayon, unité, prix de vente, prix d'achat, stock initial/actuel, seuil d'alerte, image (URL + alt), aperçu de marge |
| Inventaire tournant ◐ | Bouton *Lancer la vérification* → toast « n références conformes », aucun historique enregistré |

Fichiers : `StockView.tsx` (484 l, plus gros composant), `StockMetrics`, `StockFilters`, `ProductFormModal`, `RestockModal`.

### A.6 Onglet **Crédits**

| Bloc | Contenu |
|---|---|
| 4 KPI | Total à recevoir, débiteurs, dossiers en retard, total recouvré + taux de recouvrement |
| Recherche / filtres | Client ou téléphone ; Tous / En retard / Partiel / En attente |
| Liste | Triée par urgence ; carte : reste à payer, progression, échéance (« en retard de n jours » / « dans n jours »), payé X sur Y, boutons *Encaisser*, `tel:` (appel réel), *Rappel WhatsApp* ◐ |
| Création | Nom, téléphone, commerce/repère, montant, échéance ; statut et retard calculés par le domaine |
| Encaissement | Reste dû, *Tout solder*, montant perçu, nouveau solde, canal (Espèces / Wave / Orange Money), reçu WhatsApp ◐ (explicitement non disponible) |

Fichiers : `CreditsView`, `CreditDetailCard`, `CreditFilters`, `CreditFormModal`, `CreditPaymentModal`.

### A.7 Onglet **Bilan**

| Bloc | Contenu |
|---|---|
| En-tête | Sélecteur de période (SegmentedControl), bouton *Exporter* → modale export |
| Synthèse | Bénéfice net de la période + croissance vs période précédente, CA, dépenses, marge potentielle |
| Revenus quotidiens | Courbe + objectif journalier indicatif 60 000 F (basculable), total, moyenne, meilleur jour |
| Flux de trésorerie | Solde net quotidien (recettes − dépenses), badge excédent/déficit |
| Répartition | Par moyen de paiement (5 canaux) |
| Postes de dépenses | Répartition par catégorie (5 catégories) + détail |

Fichiers : `BilanView`, `RevenueChart`, `CashFlowChart`, `ChannelSplit`, `ExpenseBreakdown`.

---

## B. Overlays (modales / drawers)

| Overlay | Déclencheur | Rôle | État |
|---|---|---|---|
| `depenses` | Sidebar « Dépenses », action rapide accueil | Liste du mois + total + formulaire (motif, montant, catégorie, justificatif, mode) + suppression | global (`useUiStore`) |
| `export` | Sidebar, bilan, action rapide | Format CSV/PDF, périmètre (complet / ventes / dépenses), compteurs d'écritures, recettes/charges/solde, téléchargement | global |
| `profil` | Topbar/sidebar avatar | Commerce (NINEA, tél, e-mail), 4 préférences POS, synchronisation serveur, sauvegarde | global |
| `abonnement` | Sidebar | Plan actif, cycle mensuel/annuel, factures, mention démo | global |
| `notifications` | Cloche (avec compteur) | Drawer : liste, non lues, *Tout marquer comme lu* | global (drawer) |
| `equipe` | Sidebar « Équipe » | Membres, invitation, changement de rôle (hiérarchie), retrait, encart rôles | global |
| `receipt` | Après validation d'une vente / vente récente | Ticket de caisse | global **non persisté** |
| Panier mobile | Bouton flottant | Panier en `Drawer` | local |
| Formulaire article / réappro | Onglet Stock | CRUD + réception | local (`Modal`) |
| Crédit / encaissement crédit | Onglet Crédits | Création / règlement | local |
| Feuille espace (mobile) | Topbar | Changement d'organisation | local |

Permissions appliquées dans la sidebar : Dépenses (`expenses.manage`), Export
(`export.run`), Équipe (`team.manage`) ; abonnement réservé au propriétaire.

---

## C. Capacités métier

### C.1 Ventes / POS — ✔

- Panier multi-lignes, quantités, retrait, vidage, totaux calculés par `domain/sales.ts`.
- 5 modes de règlement, dont **crédit partiel** : `montant reçu`, `monnaie`, `reste dû`,
  statut `Validé` / `Partiel` / `En attente`.
- Numérotation des tickets `nextSaleNumber()` (séquence persistée par organisation).
- Décrément du stock **atomique** avec la vente (`completeSale`), borné à 0.
- Reçu écran ; impression et partage WhatsApp ◐ (toasts explicites).
- Pas d'annulation ni de remboursement de vente.

### C.2 Stock — ✔

- CRUD complet, statut calculé (`disponible` / `faible` / `rupture`) jamais stocké.
- Réapprovisionnement avec contrôle (> 0, produit existant, exception française).
- Valeur du stock au prix d'achat, marge unitaire et moyenne, alertes de seuil.
- Image par URL (`imageUrl` + `imageAlt`), pas de téléversement de fichier.

### C.3 Crédits — ✔

- Création, encaissement partiel ou total, calcul du statut (`En retard` / `Partiel` /
  `En attente` / `Réglé`), jours de retard, taux de recouvrement.
- « Tout solder », canal de réception, progression de remboursement.

### C.4 Dépenses — ✔

- Création (motif, montant, catégorie, mode, justificatif joint), total du mois,
  suppression, filtre par catégorie.

### C.5 Bilan / finance — ✔

- KPI (`computeKpis`), séries journalières, flux de trésorerie, répartition par canal,
  répartition par poste de dépense, objectif journalier 60 000 F.

### C.6 Équipe & rôles — ✔

- Invitation (prénom, nom, e-mail, rôle ; mot de passe de démo affiché), changement de
  rôle limité par `ROLE_RANK` (un gérant ne promeut pas un propriétaire), retrait,
  statut *invité en attente*, garde-fou « propriétaire non modifiable ».

### C.7 Abonnement — ◐

- Plan actif, bascule mensuel/annuel (« 2 mois offerts »), historique de factures,
  téléchargement de facture (lien) ; **aucune transaction réelle**.

### C.8 Profil / paramètres POS — ◐

- 4 préférences persistées : déduction auto du stock, alertes SMS de rupture,
  imprimante thermique Bluetooth, bip au scan.
- **Aucune de ces préférences n'est branchée à un effet réel** (aucun code ne lit
  `deductionAutoStock`, `alertesSmsRupture`, `imprimanteBluetooth`, `bipSonoreScan`
  en dehors du panneau de réglages).
- Synchronisation serveur : bouton *Synchroniser* → `reloadOrganization()` (réel en
  mode `http`, toast d'indisponibilité en démo).

### C.9 Notifications — ◐

- Liste, non lues, marquage individuel/global, lien vers l'onglet concerné.
- **Aucune génération automatique** : les notifications proviennent des fixtures ;
  aucun code n'en crée lors d'une rupture de stock, d'un crédit en retard, etc.

### C.10 Export — ✔

- **CSV** (UTF-8, séparateur `;`, 10 colonnes, ligne de total, solde net) ;
- **PDF** A4 (jsPDF + autoTable) : en-tête commerce/NINEA, 3 titres de journal,
  totaux entrées/sorties, résultat net, pied de page paginé, cadre de visa ;
- Périmètre : journal complet, ventes seules, dépenses seules ; nommage horodaté.

### C.11 Authentification & multi-organisation — ✔

- Login / signup, reprise de session par jeton, `401/403` → déconnexion.
- Appartenance multiple, rôle par organisation, bascule d'espace avec re-cloisonnement
  des stores (`ma-caisse/<orgId>/<collection>`), onglet interdit → redirection caisse.

### C.12 Interface — ✔

- Layout responsive (sidebar ≥ `lg`, barre inférieure < `lg`), modales = feuille basse
  sur mobile / boîte centrée ≥ `sm`, Échap + focus + verrou de scroll, `aria-label`
  partout, lien d'évitement *Aller au contenu*, toasts, squelettes de chargement.
- Thème clair uniquement ; icônes Material Symbols ; chartes Inter + Plus Jakarta Sans.

---

## D. Services & intégrations

| Dépôt (`Api`) | Méthodes |
|---|---|
| `auth` | `login`, `signup`, `me`, `logout`, `demoAccounts` |
| `session` | `get(orgId)` |
| `team` | `list`, `invite`, `updateRole`, `remove` |
| `products` | `list`, `create`, `update`, `remove`, `restock` |
| `sales` | `list`, `create({ sale, lines })` |
| `expenses` | `list`, `create`, `remove` |
| `credits` | `list`, `create`, `pay`, `remove` |
| `notifications` | `list`, `markRead`, `markAllRead` |

- **19 routes** déclarées dans `services/endpoints.ts`, toutes les routes métier
  préfixées `/orgs/:orgId/…`.
- **Mode `mock`** (défaut) : comptes/organisations/appartenances persistés dans
  `localStorage`, données métier en mémoire par organisation, latence simulée 250 ms.
- **Mode `http`** : Bearer token, timeout 15 s, `ApiError` avec message français,
  `401` → déconnexion, mutations optimistes **sans rollback** (toast d'erreur).
- **IA Gemini** : `lib/ai/client.ts` existe (chargement paresseux, retourne `null`
  sans clé) mais **n'est importé par aucun module** → fonctionnalité morte.

---

## E. Design system (`src/ui/`, 19 fichiers)

Primitives exportées par `ui/index.ts` :

`cn` · `Icon` · `Spinner` (3 tailles) · `Button` (7 variantes × 4 tailles) ·
`IconButton` · `Badge` (7 tons) · `Card` · `StatCard` · `FieldShell` / `Input` /
`Select` / `SearchField` · `Switch` · `SegmentedControl` · `Chip` · `EmptyState` ·
`ProgressBar` · `Avatar` · `Skeleton` · `PageHeader` · `SectionTitle` · `Modal`
(4 tailles, en-tête clair/sombre) · `Drawer` · `Toast` + `ToastHost` ·
`BrandMark` · bus `pushToast` / `subscribeToast`.

Tokens (`@theme` de `src/index.css`) : palettes `ink-*` (5 nuances, 600→950), `brand-*`,
`zest-*` ; surfaces `canvas`, `surface`, `line` ; ombres `card`, `raised`,
`overlay`, `glow` ; rayon `rounded-card` ; animations `fade-in`, `slide-up`,
`pop`, `shimmer` ; typographies **Inter** (texte) et **Plus Jakarta Sans** (titres,
chiffres `.font-num`).

---

## F. Référentiels et constantes

| Référentiel | Valeurs |
|---|---|
| Rayons produit | Épicerie, Boissons, Frais, Hygiène |
| Catégories de dépense | Achat Stock, Transport, Factures, Salaires, Divers |
| Moyens de paiement | Espèces, Mobile Money (Wave), Orange Money, Carte Bancaire, Crédit Partiel |
| Statuts stock | `disponible`, `faible`, `rupture` |
| Statuts crédit | En retard, Partiel, En attente, Réglé |
| Statuts vente | Validé, Partiel, En attente |
| Objectif journalier | 60 000 FCFA |
| Réappro rapide | +5, +10, +20 |
| Règlements rapides de crédit | 5 000, 10 000, 20 000 |
| Plans | Starter 5 000 F/mois (50 000 F/an) · Pro Commerçant 15 000 F/mois (150 000 F/an) |
| Permissions | 11 permissions × 3 rôles (`owner` 11, `manager` 9, `cashier` 2) |

---

## G. Ce qui est simulé ou absent (à ne pas promettre au client)

| Fonction affichée | Réalité | Preuve |
|---|---|---|
| Scan de code-barres | ◐ Choisit un article au hasard après 900 ms | `features/ventes/VentesView.tsx:68-76` |
| Impression du ticket | ◐ Toast « impression simulée », aucun `window.print()` | `ReceiptModal.tsx:55` |
| Partage WhatsApp du ticket | ◐ Toast | `ReceiptModal.tsx:58` |
| Rappel WhatsApp d'un crédit | ◐ Bouton désactivé « non disponible », aucun envoi | `features/credits/CreditDetailCard.tsx:91` |
| Reçu WhatsApp à l'encaissement crédit | ✗ Explicitement annoncé indisponible | `content/fr.ts:415-416` |
| Inventaire tournant | ◐ Toast, aucun historique enregistré | `features/stock/StockView.tsx:461` |
| Clôture de caisse | ◐ État local `useState`, perdu au rechargement | `features/accueil/AccueilView.tsx:50` |
| Alertes SMS de rupture | ✗ Simple interrupteur sans effet | `store/useUiStore.ts` (`preferences`) |
| Imprimante thermique Bluetooth | ✗ Interrupteur sans effet | idem |
| Bip sonore au scan | ✗ Interrupteur sans effet | idem |
| Déduction auto du stock | ✗ Interrupteur sans effet (la déduction est toujours appliquée) | idem |
| Facturation / paiement d'abonnement | ◐ Aucune transaction | `features/abonnement/AbonnementModal.tsx` |
| Notifications automatiques | ✗ Fixtures statiques uniquement | `store/useNotificationsStore.ts` |
| Annulation / remboursement de vente | ✗ Inexistant | — |
| Téléversement d'image produit | ✗ URL seulement | `ProductFormModal.tsx` |
| Code-barres / EAN produit | ✗ Champ `sku` libre, aucun scan réel | `types/index.ts` |
| Mode hors ligne réel (PWA, file d'attente) | ✗ Le badge « Hors ligne » ne reflète que `navigator.onLine` ; les ventes restent en `localStorage` mais aucune synchro différée | `store/useUiStore.ts` |
| i18n | ✗ Français uniquement (`content/fr.ts`) | `content/index.ts` |
| Thème sombre | ✗ Clair uniquement | `index.css` |
| Multi-devises | ✗ FCFA en dur (`formatFCFA`) | `domain/money.ts` |
| Routage par URL / liens profonds | ✗ Onglets en état, aucun routeur | `app/routes.ts` |
| Assistant IA | ✗ Module `lib/ai/client.ts` jamais importé | `lib/ai/client.ts` |
| Multi-caisse / plusieurs registres | ✗ Un seul `registerLabel` par commerce | `types/index.ts` |
| Gestion des fournisseurs / achats | ✗ Aucune collection | — |
| Journal d'audit / traçabilité | ✗ Aucun | — |

---

## H. Synthèse

- **Cœur métier réellement fonctionnel** : POS, stock, crédits, dépenses, bilan,
  export comptable, équipe/rôles, multi-organisation — le tout persisté par
  organisation et couvert par 165 tests.
- **Surface « démonstration »** : impression, WhatsApp, scan, inventaire tournant,
  clôture, réglages POS, facturation — visibles volontairement, sans effet réel et
  sans mensonge (toasts explicites).
- **Manques structurants pour un usage en production** : aucun backend dans ce dépôt,
  pas d'annulation de vente, pas de fournisseurs/achats, pas de notifications
  calculées, pas de mode hors ligne réel, pas d'i18n.

Voir `docs/ARCHITECTURE_AUDIT.md` pour les risques techniques et les dettes
prioritaires.
