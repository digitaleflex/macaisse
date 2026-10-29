# Contraste `slate-400` — table de décision du sweep

> 22 à convertir / 23 à garder / 1 hors scope — 46 occurrences vérifiées dans `src`.

## 1. Méthode

1. `grep -rn "slate-400" src` → 46 occurrences (45 `text-*`, 1 `bg-*`).
2. Ouverture de chaque fichier, remontée au conteneur réel (`bg-ink-900`, `bg-white`, `bg-canvas`, `bg-slate-50/100`, tooltip `bg-ink-900`).
3. Classement : fond sombre → conserver ; fond clair + texte < 18 px → `text-muted` ; fond clair + icône décorative → `text-slate-500`.

Formule WCAG 2.2 : `L = 0,2126·R + 0,7152·G + 0,0722·B` (composantes linéarisées, seuil 0,04045), puis `ratio = (Lclair + 0,05) / (Lsombre + 0,05)`. Seuils : texte normal ≥ 4,5:1 ; grand texte (≥ 18 px ou 14 px gras) ≥ 3:1 ; graphique / icône informative ≥ 3:1 (non-textuel).

Limites : fonds translucides (`bg-white/[0.05]`, `bg-white/95`) évalués contre leur base opaque (ink-900 / blanc) ; paires non déclarées ci-dessous = non vérifiées ; le `hover:` ne compense pas un état de repos en échec.

## 2. Ratios vérifiés (calculés, arrondis à 2 décimales)

| Paire (texte / fond) | Hex | Ratio | Seuil | Verdict |
|---|---|---:|---|---|
| slate-400 / blanc | #94A3B8 / #FFFFFF | 2,56 | 4,5 | Échec texte, échec icône 3:1 |
| slate-400 / canvas | #94A3B8 / #F4F5F8 | 2,35 | 4,5 | Échec texte |
| slate-400 / slate-100 | #94A3B8 / #F1F5F9 | 2,34 | 4,5 | Échec texte |
| slate-400 / ink-900 | #94A3B8 / #0B1220 | 7,30 | 4,5 | OK (fond sombre) |
| muted / blanc | #475569 / #FFFFFF | 7,58 | 4,5 | OK |
| muted / canvas | #475569 / #F4F5F8 | 6,95 | 4,5 | OK |
| muted / ink-900 | #475569 / #0B1220 | 2,47 | 4,5 | Échec — jamais sur sombre |
| slate-500 / blanc | #64748B / #FFFFFF | 4,76 | 3,0 | OK icône, limite texte 12 px |
| slate-500 / canvas | #64748B / #F4F5F8 | 4,37 | 3,0 | OK icône |
| slate-500 / slate-100 | #64748B / #F1F5F9 | 4,34 | 3,0 | OK icône |

## 3. Table de décision (exhaustive, fond vérifié sur l'état d'avant sweep)

> Les numéros de ligne ci-dessous sont ceux d'avant édition : ils se décalent après ajout de la variante `zest-soft` (`Badge.tsx`) ou de tout autre ajout de ligne. Se fier au couple fichier + classe, pas au numéro seul.

| Fichier:ligne | Classe actuelle | Fond réel | Type | Remplacement | Justification |
|---|---|---|---|---|---|
| app/BottomNav.tsx:53 | text-slate-400 | bg-white/95 flou | texte 11px + icône 23px | text-slate-500 | icône héritée : rester à un cran pour préserver la hiérarchie inactif/actif — 2,56 → 4,76 (AA) |
| app/Sidebar.tsx:58 | text-slate-400 | aside bg-ink-900 | texte | — conserver | 7,30 OK sombre |
| app/Sidebar.tsx:83 | text-slate-400 | aside bg-ink-900 | texte | — conserver | 7,30 OK sombre |
| app/Sidebar.tsx:109 | text-slate-400 | carte bg-white/[0.09] sur ink-900 | texte 12px | — conserver | base opaque sombre, 7,30 |
| abonnement/PlanCard.tsx:35 | text-slate-400 | div bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| abonnement/PlanCard.tsx:37 | text-slate-400 | div bg-ink-900 | texte 12px | — conserver | 7,30 OK sombre |
| accueil/DashboardHero.tsx:42 | text-slate-400 | section bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| accueil/DashboardHero.tsx:70 | text-slate-400 | section bg-ink-900 | texte 11px | — conserver | 7,30 OK sombre |
| accueil/RecentSales.tsx:63 | text-slate-400 | Card bg-white | texte 11px | text-muted | 2,56 → 7,58 |
| accueil/SalesTrend.tsx:56 | text-slate-400 | tooltip bg-ink-900 | texte 12px | — conserver | 7,30 OK sombre |
| accueil/StockAlerts.tsx:77 | text-slate-400 | bouton bg-white (Card) | icône chevron | text-slate-500 | décorative, 2,56 → 4,76 |
| auth/LoginScreen.tsx:66 | text-slate-400 | HeroPanel bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| auth/LoginScreen.tsx:71 | text-slate-400 | HeroPanel bg-ink-900 | texte 16px | — conserver | 7,30 OK sombre |
| auth/LoginScreen.tsx:204 | text-slate-400 | main bg-white | texte 12px | text-muted | séparateur « ou », 2,56 → 7,58 |
| auth/LoginScreen.tsx:292 | text-slate-400 | bouton bg-white bordure line | icône login | text-slate-500 | décorative, → 4,76 |
| bilan/BilanView.tsx:117 | text-slate-400 | section bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| bilan/BilanView.tsx:138 | text-slate-400 | section bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| bilan/BilanView.tsx:190 | text-slate-400 | bouton bg-white bordure line | icône download | text-slate-500 | décorative + hover ink-900 gardé |
| bilan/CashFlowChart.tsx:46 | text-slate-400 | tooltip bg-ink-900 | texte 12px | — conserver | 7,30 OK sombre |
| bilan/ChannelSplit.tsx:35 | text-slate-400 | Card bg-white | texte 11px | text-muted | devise sous total, → 7,58 |
| credits/CreditPaymentModal.tsx:50 | text-slate-400 | div bg-ink-900 | texte 12px | — conserver | 7,30 OK sombre |
| credits/CreditsView.tsx:120 | text-slate-400 | section bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| credits/CreditsView.tsx:128 | text-slate-400 | section bg-ink-900 | texte 14px | — conserver | 7,30 OK sombre |
| credits/CreditsView.tsx:144 | text-slate-400 | carte bg-surface blanc | icône group | text-slate-500 | décorative, → 4,76 |
| notifications/NotificationItem.tsx:35 | text-slate-400 | bouton bg-white/slate-50 | texte 11px | text-muted | heure, → 7,58 |
| organisation/OrgSwitcher.tsx:183 | text-slate-400 | bouton bg-white/[0.05] sur ink-900 | texte 12px | — conserver | base sombre, 7,30 |
| organisation/OrgSwitcher.tsx:187 | text-slate-400 | bouton bg-white/[0.05] sur ink-900 | icône unfold_more | — conserver | base sombre, 7,30 |
| organisation/OrgSwitcher.tsx:196 | text-slate-400 | dropdown bg-white | texte 11px | text-muted | en-tête « vos espaces », → 7,58 |
| profil/ProfilModal.tsx:54 | text-slate-400 | div bg-ink-900 | texte 14px | — conserver | e-mail, 7,30 OK sombre |
| profil/ProfilModal.tsx:102 | text-slate-400 | bouton bg-white bordure line | icône chevron | text-slate-500 | décorative, → 4,76 |
| stock/StockView.tsx:127 | text-slate-400 | ligne tableau bg-white | texte 11px | text-muted | seuil mini, → 7,58 |
| ventes/CartPanel.tsx:130 | text-slate-400 | bouton bg-ink-900 (MobileCartBar) | texte 12px | — conserver | 7,30 OK sombre |
| ventes/PaymentPad.tsx:90 | text-slate-400 | div bg-ink-900 | texte 12px | — conserver | 7,30 OK sombre |
| ventes/PaymentPad.tsx:95 | text-slate-400 | div bg-ink-900 | texte 12px | — conserver | 7,30 OK sombre |
| ventes/ProductCard.tsx:57 | text-slate-400 | carte bg-surface blanc | texte 11px | text-muted | devise courte, → 7,58 |
| ventes/ReceiptModal.tsx:86 | text-slate-400 | article bg-white | texte 11px | text-muted | en-tête ticket, → 7,58 |
| ventes/VentesView.tsx:154 | text-slate-400 | page bg-canvas | texte 14px | text-muted | compteur catalogue, 2,35 → 6,95 |
| ui/Badge.tsx:32 | bg-slate-400 | pastille (dot neutre) | non-textuel | HORS SCOPE | pas de paire texte/fond ; ligne décalée par l'ajout de `zest-soft` |
| ui/Feedback.tsx:25 | text-slate-400 | pastille bg-slate-100 | icône vide | text-slate-500 | décorative, 2,34 → 4,34 |
| ui/Field.tsx:37 | placeholder:text-slate-400 | input bg-white | texte 14px | placeholder:text-slate-500 | placeholder : rester à un cran de la valeur réelle (affordance), 2,56 → 4,76 (AA) |
| ui/Field.tsx:58 | text-slate-400 | input bg-white | icône champ | text-slate-500 | décorative, → 4,76 |
| ui/Field.tsx:76 | text-slate-400 | input bg-white | texte 12px suffixe | text-muted | suffixe lu, → 7,58 |
| ui/Field.tsx:125 | text-slate-400 | select bg-white | icône expand_more | text-slate-500 | décorative, → 4,76 |
| ui/Field.tsx:144 | text-slate-400 | search bg-white | icône search | text-slate-500 | décorative, → 4,76 |
| ui/Field.tsx:159 | text-slate-400 | bouton sur fond blanc | icône close | text-slate-500 | hover ink-900 gardé, → 4,76 |
| ui/Modal.tsx:106 | text-slate-400 (branche dark) | header bg-ink-900 | texte 12px | — conserver | branche light déjà slate-500 |

## 4. Conservées (23, fond sombre vérifié — aucun changement)

Sidebar.tsx:58, 83, 109 · PlanCard.tsx:35, 37 · DashboardHero.tsx:42, 70 · SalesTrend.tsx:56 (tooltip) · LoginScreen.tsx:66, 71 (HeroPanel) · BilanView.tsx:117, 138 · CashFlowChart.tsx:46 (tooltip) · CreditPaymentModal.tsx:50 · CreditsView.tsx:120, 128 · OrgSwitcher.tsx:183, 187 (bouton sur ink-900) · ProfilModal.tsx:54 · CartPanel.tsx:130 (MobileCartBar) · PaymentPad.tsx:90, 95 · Modal.tsx:106 branche `dark`. Raison unique : `slate-400` sur `ink-900` = 7,30:1, et `text-muted` y tombe à 2,47:1 — la substitution y dégraderait le contraste.

## 5. Compteur et règle d'or

**22 à convertir (10 → `text-muted`, 12 → `text-slate-500`), 23 conservées (fond sombre), 1 hors scope (`Badge.tsx:32`).**

Règle d'or : sur fond clair aucun texte < 18 px ne reste en `slate-400` — il passe en `text-muted`, et aucune icône décorative ne reste en `slate-400` — elle passe en `text-slate-500`.

## 6. Ajustements après revue Gate-1 (essai 2)

| Élément | Ajustement | Raison |
|---|---|---|
| `ui/Field.tsx:37` | `placeholder:text-muted` → `placeholder:text-slate-500` | un placeholder à 7,58:1 se confond avec une valeur saisie : perte d'affordance. 4,76:1 reste AA. |
| `app/BottomNav.tsx:53` | `text-muted` → `text-slate-500` | l'icône 23px héritait du ton : l'onglet inactif devenait presque actif. Un seul cran préserve la hiérarchie. |
| `app/Topbar.tsx` (fil d'Ariane) | `text-xs text-slate-500` → `text-xs text-muted` ; séparateur `text-slate-300` → `text-slate-500` | 4,37:1 sur `canvas` échouait AA ; `slate-300` (1,47:1) était quasi invisible. |
| `src/index.css` | `--color-strong` supprimé | 0 consommateur — même critère YAGNI que `faint` ; `ink-900` reste la couleur de texte fort. |
| Tokens texte | `--color-muted` = **texte uniquement** | `bg-muted` / `border-muted` / `ring-muted` sont générés par Tailwind et donneraient un fond sombre inattendu. |

Hors périmètre (documenté, non traité) : `RevenueChart.tsx` tooltip `text-slate-300` — fond `bg-ink-900`, contraste élevé, conforme.

## 7. Séries de graphiques — exception documentée

Les couleurs catégorielles (`chartSeries` de `src/design/tokens.ts`) ne respectent pas la règle ≥ 3:1 sur fond blanc :

| Série | Couleur | Ratio sur blanc |
|---|---|---:|
| 1 | `ink-900` #0b1220 | 18,7 ✅ |
| 2 | `brand-500` #10b981 | 2,54 ⚠️ |
| 3 | `zest-400` #c5f441 | 1,28 ⚠️ |
| 4 | `sky-500` #0ea5e9 | 2,77 ⚠️ |
| 5 | `rose-500` #f43f5e | 3,60 ✅ |

Justification : ces teintes servent à **distinguer des séries entre elles** (anneau, légende, libellés chiffrés), pas à porter seules une information. La règle appliquée est la distinguabilité mutuelle, renforcée par le `paddingAngle` de 2 px qui sépare les tranches ; chaque part reste identifiable sans couleur (moyen de paiement, pourcentage, montant).

Conséquence pour les contrôles automatisés (Ph4) : ne pas tester ces paires contre le blanc. Déclarer explicitement les paires vérifiées et exclure `chartSeries` de la règle 3:1, ou documenter l'écart — ne pas laisser un test échouer sur une décision déjà prise.

Note : l'axe des graphiques, lui, est bien passé de `slate-400` (2,56:1) à `slate-500` (4,76:1) — c'est du texte et il respecte AA.
