---
title: "Ma Caisse — Écarts entre le schéma de données backend et le frontend / cahier des charges"
subtitle: "Document à destination du développeur backend"
lang: fr
---

# 1. Objet et conclusion

Ce document compare le **schéma de données fourni par le backend** (17 modèles, 10 énumérations,
fichier `recapitulatif_schema_donnees_boutique`) avec :

- le **cahier des charges** *ma_caisse* v0.1 (3 novembre 2026), exigences EF-01 à EF-37 et règles de gestion RG-01 à RG-09 ;
- le **frontend** (`src/types/index.ts`, `src/services/contracts.ts`, `src/services/endpoints.ts`, `src/domain/permissions.ts`) ;
- le **contrat d'API** (`docs/API_CONTRACT.md`) et les règles d'authentification (`docs/AUTH_DECISIONS.md`, RG-A01 à RG-A29).

**Conclusion : le schéma actuel ne permet pas de servir le frontend tel quel.**
Huit points sont bloquants (section 3), une quinzaine demandent une adaptation (section 4).
Le schéma couvre bien certains besoins (mouvements de stock, soft-delete, fichier clients, rôles dynamiques) ;
ces points sont listés en section 5.

Convention de lecture : **B** = bloquant, **I** = important, **m** = mineur.
Source : *CDC* = cahier des charges, *FRONT* = code frontend, *API* = contrat d'API.

# 2. Principes non négociables à respecter côté serveur

Ces principes viennent du cahier des charges et du contrat d'API ; plusieurs écarts ci-dessous en découlent.

1. **Isolation stricte par boutique** (RG-01) : toute donnée appartient à une boutique, aucune lecture croisée.
2. **Permissions vérifiées côté serveur** (RG-02), y compris en appelant directement l'API.
3. **Aucune vente supprimée ni modifiée** (RG-04, EF-14) : seule l'**annulation** existe, avec motif obligatoire (RG-09), auteur et date.
4. **Stock modifié uniquement par** une vente, une annulation ou un ajustement tracé (RG-05).
5. **Reste à payer d'un crédit = montant du crédit − somme des remboursements** (RG-06).
6. **Un produit ou un client utilisé dans une vente n'est jamais supprimé, il est désactivé** (RG-07).
7. **Le propriétaire ne peut pas perdre ses droits** sur sa boutique (RG-08).
8. **Montants en FCFA entiers**, jamais de décimales ni de chaînes (RG-03, API §Montants).
9. **Aucune mutation silencieuse** : un refus est un statut différent de 2xx, le serveur ne « corrige » jamais une valeur.

# 3. Écarts bloquants

## B1 — Un utilisateur ne peut appartenir qu'à une seule boutique

| | |
|---|---|
| **Attendu** | Un utilisateur appartient à plusieurs boutiques avec un rôle différent dans chacune (CDC §3, EF-03). Le front reçoit `AuthResult.memberships[]` (boutique, nom, ville, rôle). |
| **Constaté** | `User.shopId` et `User.shopRoleId` sont des champs uniques. |
| **Action** | Créer une table de liaison `ShopMember` (userId, shopId, roleId, statut `active` / `invited`, dates). Retirer `shopId` / `shopRoleId` de `User` (ou les réduire à « dernière boutique utilisée »). Voir annexe A. |

## B2 — Aucune gestion des invitations

| | |
|---|---|
| **Attendu** | Une invitation n'ouvre aucun accès tant qu'elle n'est pas acceptée explicitement ; expiration à 7 jours ; révocation par le propriétaire ; plusieurs invitations en attente possibles (API §Règles d'invitation). Routes `GET /auth/invitations`, `POST /auth/invitations/:orgId/accept`. |
| **Constaté** | Aucun modèle. |
| **Action** | Statut `invited` / `active` dans `ShopMember` plus `invitedAt`, `invitationExpiresAt`, `invitedBy`, jeton signé hashé. Toute route métier répond `403 INVITATION_PENDING` tant que le statut n'est pas `active`. |

## B3 — Paiement partiel et paiement mixte impossibles

| | |
|---|---|
| **Attendu** | Le paiement d'une vente peut être total ou partiel ; la part non payée devient un crédit (CDC §4.4, EF-10, EF-11). Le front envoie un montant reçu, un reste dû, un statut `Validé` / `Partiel` / `En attente`, et peut combiner espèces et crédit. |
| **Constaté** | `Sale.paymentMethod` est une valeur unique (`cash`, `mobile_money`, `credit`, `other`). Aucun montant payé, aucun reste dû, aucun statut. Une vente « 5 000 en espèces + 3 000 à crédit » ne peut pas être représentée, et l'écart de caisse (`CashSession.expectedAmount`, « ventes espèces ») serait faux. |
| **Action** | Ajouter une table `SalePayment` (saleId, méthode, montant) **ou** au minimum `Sale.amountPaid` et `Sale.status`. Recommandation : `SalePayment`, car elle supporte aussi le fractionnement entre moyens de paiement. |

## B4 — Annulation de vente non conforme

| | |
|---|---|
| **Attendu** | Une vente ne se supprime ni ne se modifie jamais. L'annulation exige un **motif**, l'**auteur**, la **date** (EF-15, RG-09), rétablit le stock et traite le crédit lié (EF-16). |
| **Constaté** | `Sale.deletedAt` et `deletedBy` (suppression douce) sans motif. Les droits `editSale` et `deleteSale` existent dans `ShopAccessRights`, ce qui contredit RG-04. |
| **Action** | Remplacer par `status` (`completed` / `cancelled`), `cancelledAt`, `cancelledBy`, `cancelReason` (obligatoire à l'annulation). Supprimer `editSale` et `deleteSale`, ajouter `cancelSale`. Interdire toute route de modification ou de suppression de vente. Règle EF-16 : annulation refusée (ou soumise au propriétaire) si le crédit lié a déjà reçu un remboursement. |

## B5 — Le modèle « crédit » ne porte pas l'information nécessaire

| | |
|---|---|
| **Attendu** | Un crédit a un montant initial, un reste à payer recalculé à chaque remboursement, une **échéance** (EF-24) et un statut (`En retard`, `Partiel`, `En attente`, `Réglé`). Le front manipule `totalInitial`, `remainingAmount`, `dueDate`, `daysLate`, `status`. |
| **Constaté** | `Debtor.amount` : « montant total dû », sans échéance, sans statut. On ne sait pas s'il s'agit du montant initial ou du reste (RG-06). On ne sait pas non plus si un `Debtor` est une **personne** (plusieurs crédits possibles) ou un **crédit**. |
| **Action** | Trancher le vocabulaire et le modèle. Recommandation : un modèle `Credit` (créance) lié à un `Customer`, avec `initialAmount`, `dueDate`, `saleId` (nullable), `status`, et `Repayment.creditId`. Le reste à payer est **calculé** (initial − remboursements), jamais saisi. Voir annexe A. |

## B6 — Le modèle `User` empêche l'inscription par téléphone ou par Google

| | |
|---|---|
| **Attendu** | Le téléphone E.164 vérifié est l'identité unique ; l'e-mail est optionnel et unique s'il est fourni (RG-A01, RG-A02). Un compte Google peut exister sans téléphone au départ. Le front manipule `firstName` **et** `lastName`, `emailVerificationDueAt` (grâce de 72 h), `onboardedAt`. |
| **Constaté** | `email` et `phoneNumber` sont obligatoires. Il n'y a pas de `lastName`. L'unicité est « gérée en logique métier, par boutique », donc deux comptes peuvent partager un numéro. Pas de fournisseur d'identité (Google), pas de date limite de vérification e-mail. |
| **Action** | `phoneNumber` et `email` nullables avec **unicité globale** (index unique partiel), `lastName`, `authProvider` / `googleSubject`, `emailVerificationDueAt`, `onboardedAt` (sur la boutique, voir I8). |

## B7 — Appareils de caisse, PIN et journal de connexion absents

| | |
|---|---|
| **Attendu** | Appareils enrôlés par le propriétaire (3 maximum par boutique, RG-A15), PIN hashé Argon2id avec compteur d'échecs partagé et verrouillage 15 min après 5 échecs (RG-A16), révocation qui invalide la session (RG-A17), table `auth_events` conservée 90 jours (RG-A20). Routes `/orgs/:orgId/devices`, `/auth/pin/verify`, `/auth/events`. |
| **Constaté** | Aucun modèle `Device`, aucun champ PIN, aucune table d'événements d'authentification. |
| **Action** | Créer `Device`, `MemberPin` (ou champs sur `ShopMember`), `AuthEvent`. Voir annexe A. |

## B8 — Canal et sécurité des codes OTP

| | |
|---|---|
| **Attendu** | Canaux `whatsapp_user`, `whatsapp`, `sms` (RG-A23). 5 tentatives maximum, quotas 3/h/numéro et 10/h/IP, budget de 20 OTP par boutique et par mois (RG-A07 à A09, A24). Le code e-mail a une durée de vie de 10 min. |
| **Constaté** | `OtpChannel` vaut `email` ou `sms`. `OtpCode` n'a ni compteur de tentatives, ni finalité (connexion, vérification e-mail, réinitialisation), ni suivi de quota. |
| **Action** | Ajouter `whatsapp_user` et `whatsapp` à l'énumération, `attempts`, `purpose`, `ipAddress`. Les quotas peuvent vivre dans Redis ou dans une table de comptage. |

# 4. Écarts importants

| # | Sujet | Attendu (source) | Constaté dans le schéma | Action demandée |
|---|---|---|---|---|
| I1 | Montants | Entiers FCFA, jamais de chaînes (API §Montants, RG-03). | `Decimal(10,2)` partout ; Prisma sérialise les `Decimal` en chaînes. | Passer à `Int` / `BigInt`, ou `Decimal(12,0)` avec conversion explicite en nombre dans les réponses. Rejeter `422 VALIDATION_ERROR` sur un non-entier ou un négatif. |
| I2 | Identifiants | Le client génère des ids (`product-<uuid>`, `sale-…`) ; un `POST` sur un id connu du même propriétaire renvoie `200` avec la ressource (idempotence). | `@default(dbgenerated("gen_random_uuid()"))`. Si la colonne est de type `uuid`, ces ids sont refusés. | Colonnes `String`/`text`, id client accepté tel quel, génération serveur seulement s'il est absent. Unicité scopée par boutique. |
| I3 | Numéro de reçu | Proposé par le client (`V-YYYYMMDD-NNNN`), le serveur arbitre ; `409 DUPLICATE` s'il est déjà pris **dans la boutique**. | `receiptNumber` unique **globalement**. | Remplacer par `@@unique([shopId, receiptNumber])`. |
| I4 | Seuil de stock bas | Seuil **par produit** (EF-07, EF-20, `minStockAlert`). | Seuil porté par l'utilisateur (`User.lowStockThreshold`). | Ajouter `Product.lowStockThreshold` (défaut 5). Retirer le champ de `User`. |
| I5 | Produits | Catégorie, unité, référence renseignées par le front ; `imageAlt` ; produit désactivé, pas supprimé. | `category`, `unit`, `sku` nullables ; pas de `imageAlt` ; `@@unique([shopId, name])` combiné au soft-delete empêche de recréer un produit de même nom. | Ajouter `imageAlt`. Remplacer l'unicité par un index unique **partiel** `WHERE deletedAt IS NULL`. Renommer `deletedAt` en `deactivatedAt` ou documenter l'équivalence. |
| I6 | Dépenses | Motif, montant, **date**, catégorie optionnelle, moyen de paiement, justificatif (EF-29, EF-30). | `description` et `createdAt` uniquement ; aucune catégorie, date, moyen de paiement, justificatif. | Ajouter `spentAt`, `categoryId` (nullable), `paymentMethod`, `hasReceipt`, et une table `ExpenseCategory` (catégories par défaut modifiables par la boutique). |
| I7 | Moyens de paiement | Espèces, Wave, Orange Money, Carte, Crédit partiel (FRONT). Liste exacte encore « à décider » (CDC §11). | `cash`, `mobile_money`, `credit`, `other`. | Décider la liste finale. Si `mobile_money` reste unique, le front devra perdre la distinction Wave / Orange Money, ce qui dégrade les rapports par canal. Recommandation : `wave`, `orange_money`, `mtn_money`, `moov_money`, `card`, `cash`, `other`. `credit` n'est pas un moyen de paiement mais un état de la vente (voir B3). |
| I8 | Fiche boutique | `name`, `phone`, `address`, `city`, `activity`, `email`, `taxId`, `registerLabel`, `closingTime`, `timezone`, `onboardedAt`. | `name`, `phone`, `address`, `currency`. | Ajouter les champs manquants. Ajouter `ownerId` pour garantir RG-08. |
| I9 | Rôles et permissions | Rôles créés par chaque boutique (EF-05). Le front a aujourd'hui 3 rôles fixes et 11 permissions (voir annexe B). | 27 booléens par rôle, rôles dynamiques : **conforme au CDC**. Mais : aucune permission pour annuler une vente, ajuster le stock, voir le prix d'achat, exporter, consulter le journal d'audit, gérer les clients ; `viewReports` ne distingue pas bilan et export. | Ajouter `cancelSale`, `adjustStock`, `viewCostPrice`, `exportData`, `viewAuditLog`, `createCustomer` / `editCustomer`. Prévoir un rôle système « Propriétaire » non modifiable. |
| I10 | Abonnement | L'accès dépend de l'abonnement **de la boutique** (EF-37, `Session.subscription`) ; essai de 14 jours (RG-A06) ; `autoRenew`, moyen de paiement, factures. | `Subscription.userId` (par utilisateur) ; `monthly` / `quarterly` / `annual` (le front a `monthly` / `yearly`) ; pas de table des formules ; pas de statut d'essai ; `@@unique([userId, status, endDate])` incohérente. | Rattacher à `shopId`. Ajouter `trialing`, `autoRenew`, et une table `Plan` (nom, prix, limites, fonctionnalités). Aligner les cycles avec le front ou documenter la conversion. |
| I11 | Notifications | Liste, lecture individuelle et globale (`/notifications`, `/read`, `/read-all`). | Aucun modèle. | Créer `Notification` (shopId, userId nullable, type, titre, message, onglet lié, `readAt`). |
| I12 | Journal d'audit | Trace datée et attribuée des actions sensibles : annulations, ajustements de stock, changements de rôles, suppressions. Réservé au propriétaire, non effaçable (EF-36). | Aucun modèle. | Créer `AuditLog` en insertion seule (aucun `UPDATE` / `DELETE` autorisé en base). Voir annexe A. |
| I13 | Sessions | Refresh rotatif avec détection de réutilisation et révocation de **famille** (RG-A10, A11) ; durées différentes pour un appareil enrôlé. | `UserSession` : un seul hash, pas de famille, pas de lien avec un appareil. | Ajouter `familyId`, `deviceId`, `rotatedFromId`, `absoluteExpiresAt`. |
| I14 | Produit supprimé dans une vente | `SaleItem.productName` figé : **conforme**. | `productId` nullable « si produit supprimé » : incohérent avec RG-07 (un produit vendu n'est jamais supprimé). | Conserver `productId` non nul, interdire la suppression physique d'un produit vendu. |
| I15 | Clients | Création depuis un formulaire dédié ou à la saisie d'un crédit ; vente anonyme possible (EF-26 à 28). Un client utilisé dans une vente est désactivé, pas supprimé (RG-07). | `Customer` conforme sur le fond, mais sans désactivation ; `Debtor` duplique `name` et `phone`. | Ajouter `deactivatedAt` à `Customer`. Supprimer la duplication (nom et téléphone viennent du client). |

# 5. Ce qui est conforme dans le schéma

- `StockMovement` (types, quantité signée, stock résultant, lien avec la vente) couvre RG-05 et EF-19.
- `SaleItem` fige le nom et le prix au moment de la vente.
- `Customer` correspond au fichier clients (EF-26 à 28).
- Le principe de rôles dynamiques de `ShopAccessRights` correspond à EF-05.
- Les index par `shopId` favorisent l'isolation (RG-01).
- Stockage des mots de passe et des codes OTP sous forme de hash.

# 6. Hors périmètre V1 (à confirmer)

| Modèle | Remarque |
|---|---|
| `CashSession` | Absent du cahier des charges V1 et du frontend (le front n'a qu'un indicateur de clôture). À garder en V2 ou à retirer. S'il est conservé, il dépend de B3 (ventes en espèces). |
| `Feedback` / `FeedbackType` / `FeedbackStatus` | Absent du cahier des charges et du frontend. À confirmer. |

# 7. Contrat d'API : points que le schéma doit permettre de tenir

1. **Idempotence** : `POST` avec un id client déjà connu renvoie `200` et la ressource existante.
2. **Transaction vente + crédit** : `POST /orgs/:orgId/sales` reçoit `{ sale, lines, credit? }` ; le serveur décrémente le stock, enregistre la vente **et** le crédit dans la même transaction, ou refuse tout (`409 INSUFFICIENT_STOCK`).
3. **Concurrence** : chaque ressource métier expose `updatedAt` ; en cas d'écart sur `If-Unmodified-Since`, `409 CONFLICT`.
4. **Fuseau** : `timezone` sur la boutique (défaut `Africa/Dakar`), `serverTime` dans `GET /orgs/:orgId/session`.
5. **Prix d'achat** : omis des réponses pour un rôle qui n'a pas `viewCostPrice`.
6. **Erreurs** : corps `{ "message": "<français>", "code": "<CODE_METIER>" }` ; codes listés dans `docs/API_CONTRACT.md` §Sémantique des erreurs.
7. **Nommage** : le front utilise `/orgs/:orgId` et le mot « organisation » ; le schéma dit « boutique ». À trancher (l'un des deux côtés ajoute une correspondance).

# 8. Questions à trancher (par l'équipe)

| # | Question | Impact |
|---|---|---|
| Q1 | Rôles dynamiques (CDC) ou 3 rôles fixes (front actuel) ? Recommandation : dynamiques, avec 3 modèles de rôles proposés à la création d'une boutique. | Schéma, API `/roles`, écran d'équipe côté front. |
| Q2 | Liste exacte des moyens de paiement V1. | Énumération, rapports, reçu. |
| Q3 | Fenêtre d'annulation d'une vente (le jour même, puis propriétaire seulement ?). | Règle serveur d'annulation. |
| Q4 | Remises, TVA, retours de produits : V1 ou V2 ? (le reçu affiche aujourd'hui une TVA forfaitaire). | Colonnes sur `Sale` / `SaleItem`. |
| Q5 | Invitation d'un membre : par e-mail, par téléphone ou par code ? | Jeton, canal d'envoi. |
| Q6 | Formules d'abonnement, prix, limites (boutiques, utilisateurs, produits). | Table `Plan`, contrôles serveur. |
| Q7 | `CashSession` et `Feedback` : V1 ou V2 ? | Périmètre. |
| Q8 | « Debtor » est-il une personne ou un crédit ? (recommandation : un crédit, lié à un client). | B5. |

---

# Annexe A — Ajouts de schéma proposés (Prisma)

> Proposition à adapter par le backend. Les noms restent ceux du schéma actuel quand c'est possible.

```prisma
// --- Appartenance et invitations (B1, B2) ---------------------------------
enum MemberStatus {
  invited
  active
  removed
}

model ShopMember {
  id                   String       @id @default(dbgenerated("gen_random_uuid()"))
  userId               String
  shopId               String
  roleId               String                       // -> ShopAccessRights
  isOwner              Boolean      @default(false) // RG-08 : jamais retirable
  status               MemberStatus @default(invited)
  invitedBy            String?
  invitedAt            DateTime     @default(now())
  invitationTokenHash  String?      @db.VarChar(64)
  invitationExpiresAt  DateTime?                    // 7 jours
  joinedAt             DateTime?
  pinHash              String?                      // Argon2id (B7)
  pinFailedCount       Int          @default(0)
  pinLockedUntil       DateTime?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@unique([userId, shopId])
  @@index([shopId, status])
  @@map("shop_members")
}

// --- Appareils et journal de connexion (B7) -------------------------------
model Device {
  id          String    @id @default(dbgenerated("gen_random_uuid()"))
  shopId      String
  memberId    String
  name        String
  enrolledBy  String
  enrolledAt  DateTime  @default(now())
  lastSeenAt  DateTime?
  revokedAt   DateTime?                     // 3 appareils actifs maximum par boutique (RG-A15)

  @@index([shopId])
  @@map("devices")
}

enum AuthMethod {
  password
  google
  otp_phone
  otp_email
  reset
  step_up
}

model AuthEvent {
  id        String     @id @default(dbgenerated("gen_random_uuid()"))
  userId    String?
  method    AuthMethod
  success   Boolean
  ipAddress String     @db.VarChar(45)
  userAgent String
  deviceId  String?
  createdAt DateTime   @default(now())    // purge à 90 jours

  @@index([userId, createdAt])
  @@map("auth_events")
}

// --- Ventes : paiements et annulation (B3, B4) ----------------------------
enum SaleStatus {
  completed
  cancelled
}

model SalePayment {
  id        String            @id @default(dbgenerated("gen_random_uuid()"))
  saleId    String
  method    SalePaymentMethod // sans « credit » : le crédit est le reste dû
  amount    Int               // FCFA entiers
  createdAt DateTime          @default(now())

  @@index([saleId])
  @@map("sale_payments")
}

// Sur Sale : ajouter
//   status       SaleStatus @default(completed)
//   amountPaid   Int                       // somme des SalePayment
//   cancelledAt  DateTime?
//   cancelledBy  String?
//   cancelReason String?                   // obligatoire si status = cancelled (RG-09)
//   @@unique([shopId, receiptNumber])
// Retirer : deletedAt, deletedBy, paymentMethod (déplacé dans SalePayment)

// --- Crédits (B5) ----------------------------------------------------------
enum CreditStatus {
  pending   // En attente
  partial   // Partiel
  overdue   // En retard (calculé ou stocké)
  settled   // Réglé
  cancelled // vente annulée sans remboursement (EF-16)
}

model Credit {
  id            String       @id @default(dbgenerated("gen_random_uuid()"))
  shopId        String
  customerId    String?
  saleId        String?      @unique              // crédit né d'une vente
  initialAmount Int
  dueDate       DateTime     @db.Date              // EF-24
  status        CreditStatus @default(pending)
  createdBy     String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  // reste à payer = initialAmount - SUM(Repayment.amount)  (RG-06), jamais saisi

  @@index([shopId, status])
  @@index([shopId, dueDate])
  @@map("credits")
}
// Repayment : remplacer debtorId par creditId.

// --- Dépenses (I6) ---------------------------------------------------------
model ExpenseCategory {
  id        String  @id @default(dbgenerated("gen_random_uuid()"))
  shopId    String
  name      String
  isDefault Boolean @default(false)
  @@unique([shopId, name])
  @@map("expense_categories")
}
// Expense : ajouter spentAt (Date), categoryId?, paymentMethod, hasReceipt.

// --- Notifications (I11) ---------------------------------------------------
model Notification {
  id         String    @id @default(dbgenerated("gen_random_uuid()"))
  shopId     String
  userId     String?
  type       String    // warning | alert | info | success
  title      String
  message    String?
  relatedTab String?
  readAt     DateTime?
  createdAt  DateTime  @default(now())
  @@index([shopId, readAt])
  @@map("notifications")
}

// --- Journal d'audit (I12, EF-36) : insertion seule -----------------------
model AuditLog {
  id         String   @id @default(dbgenerated("gen_random_uuid()"))
  shopId     String
  actorId    String
  action     String   // sale.cancel | stock.adjust | role.update | member.remove | product.deactivate | ...
  targetType String
  targetId   String
  reason     String?
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())
  @@index([shopId, createdAt])
  @@map("audit_logs")
}
```

# Annexe B — Correspondance des permissions

| Permission du front (`permissions.ts`) | Colonnes actuelles de `ShopAccessRights` | À ajouter |
|---|---|---|
| `sales.create` | `createSale` | — |
| *(annulation de vente)* | — | `cancelSale` |
| `stock.edit` | `createProduct`, `editProduct`, `deleteProduct` | renommer `deleteProduct` en « désactiver » |
| `stock.restock` | — | `adjustStock` |
| `stock.viewCost` | — | `viewCostPrice` |
| `credits.create` | `createDebtor` | renommer en `createCredit` |
| `credits.collect` | `createRepayment` | — |
| `finance.view` | `viewReports` | — |
| `expenses.manage` | `create/view/edit/deleteExpense` | — |
| `export.run` | — | `exportData` |
| `team.manage` | `manageMembers`, `manageRoles` | — |
| `billing.manage` | `manageSubscription` | — |
| *(journal d'audit)* | — | `viewAuditLog` |
| *(fichier clients)* | — | `createCustomer`, `editCustomer`, `viewCustomer` |

À retirer : `editSale`, `deleteSale`, `deleteRepayment` (un remboursement enregistré ne se supprime pas, il se corrige par une écriture inverse tracée — à confirmer).

# Annexe C — Correspondance des moyens de paiement

| Front (libellé actuel) | Valeur d'API proposée | Schéma actuel |
|---|---|---|
| Espèces | `cash` | `cash` |
| Mobile Money (Wave) | `wave` | `mobile_money` |
| Orange Money | `orange_money` | `mobile_money` |
| Carte Bancaire | `card` | *(absent côté vente)* |
| Crédit Partiel | *(n'est pas un moyen : reste dû → `Credit`)* | `credit` |
| — | `mtn_money`, `moov_money` | *(présents côté abonnement uniquement)* |
