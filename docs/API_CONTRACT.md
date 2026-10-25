# Contrat d'API — Ma Caisse (SaaS multi-organisation)

Référence pour l'équipe backend. Types exacts : `src/types/index.ts` ; routes :
`src/services/endpoints.ts` ; implémentation de référence exécutable :
`src/services/adapters/mockApi.ts` (couverte par `src/services/__tests__`).

## Activer le backend

```bash
# .env.local
VITE_API_MODE=http
VITE_API_BASE_URL=https://api.example.com/v1
VITE_API_TIMEOUT_MS=15000
```

## Modèle multi-organisation

- Un **utilisateur** peut appartenir à plusieurs **organisations** (commerces).
- Chaque appartenance porte un **rôle** : `owner` (propriétaire), `manager`
  (gérant), `cashier` (caissier). Matrice des droits : `src/domain/permissions.ts`.
- **Toutes** les données métier sont rattachées à une organisation et exposées
  sous `/orgs/:orgId/…`. Le serveur DOIT vérifier, à chaque requête, que
  l'utilisateur du jeton est membre de `:orgId` (sinon `403`) et que son rôle
  autorise l'action. Le client masque déjà les actions interdites, mais ce n'est
  pas une sécurité.

| Permission | owner | manager | cashier |
|---|:-:|:-:|:-:|
| Encaisser une vente, encaisser un règlement de crédit | ✓ | ✓ | ✓ |
| Créer / modifier / supprimer des articles, réapprovisionner, voir les prix d'achat | ✓ | ✓ | |
| Créer un crédit, gérer les dépenses, voir le bilan, exporter | ✓ | ✓ | |
| Gérer l'équipe, l'abonnement | ✓ | | |

## Conventions

- JSON UTF-8, montants en **FCFA entiers**, dates `YYYY-MM-DD`, heures `HH:MM`.
- Authentification : `Authorization: Bearer <token>` sur toutes les routes sauf
  `/auth/login` et `/auth/signup`. Un `401` déconnecte l'utilisateur côté client.
- Identifiants des entités métier **générés par le client** (`product-<uuid>`…) :
  le serveur les accepte tels quels (création idempotente).
- Erreurs : statut ≠ 2xx et corps `{ "message": "Texte lisible en français", "code": "CODE_METIER" }`.
  Le `message` est affiché tel quel ; le `code` sert au client à décider d'un rejeu
  (voir [Sémantique des erreurs](#sémantique-des-erreurs)).
- Mutations **optimistes** : l'UI applique puis appelle l'API ; un échec est
  signalé par un toast. **Tant que le serveur n'offre pas la sémantique décrite
  ci-dessous, aucune annulation locale n'est possible** : c'est le prérequis
  n°1 côté backend.

## Parcours client

1. `POST /auth/login` (ou `/auth/signup`) → `AuthResult` (jeton + appartenances).
2. Choix de l'organisation (dernière utilisée, sinon la première).
3. `GET /orgs/:orgId/session` puis, en parallèle, les collections de l'organisation.
4. Changement d'espace : étapes 2–3 avec un autre `orgId` (les données locales
   sont cloisonnées par organisation : `localStorage['ma-caisse/<orgId>/…']`).
5. Au rechargement : `GET /auth/me` avec le jeton persisté.

## Routes — authentification

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `AuthResult` — `401` si identifiants invalides |
| POST | `/auth/signup` | `SignupInput` (compte + commerce) | `AuthResult` — crée l'organisation, l'utilisateur en est `owner` ; `409` si e-mail déjà utilisé |
| GET | `/auth/me` | — | `AuthResult` (jeton inchangé) |
| POST | `/auth/logout` | — | `204` |
| GET | `/auth/invitations` | — | `Invitation[]` — invitations reçues, en attente d'acceptation |
| POST | `/auth/invitations/:orgId/accept` | — | `AuthResult` (appartenance passée à `active`) · `404 INVITATION_NOT_FOUND` |

```jsonc
// AuthResult
{ "token": "…",
  "user": { "id": "u-mamadou", "firstName": "Mamadou", "lastName": "Konaté", "email": "…", "phone": "…", "role": "Gérant" },
  "memberships": [
    { "organizationId": "org-etoile", "organizationName": "Boutique Étoile", "city": "Dakar Plateau", "role": "owner" },
    { "organizationId": "org-baobab", "organizationName": "Supérette Le Baobab", "city": "Abidjan", "role": "manager" } ] }
```

### Règles d'invitation (normatives)

1. **Une invitation n'ouvre aucun accès.** Une appartenance `status: "invited"` ne
   figure pas dans `AuthResult.memberships` et **toute** route métier répond
   `403 INVITATION_PENDING` (y compris `GET /orgs/:orgId/session`).
2. **La connexion n'active rien.** Accepter une invitation est un acte explicite
   (`POST /auth/invitations/:orgId/accept`) ; un même utilisateur peut avoir
   plusieurs invitations en attente et les accepter séparément.
3. `GET /auth/invitations` ne renvoie que les invitations de l'utilisateur du
   jeton, jamais celles d'un collègue.
4. L'acceptation est idempotente : ré-accepter une invitation déjà active renvoie
   `200` avec l'`AuthResult` courant (pas d'erreur).
5. Une invitation doit expirer (7 jours) et pouvoir être révoquée par un
   propriétaire — voir l'issue #20 pour le jeton signé et l'envoi d'e-mail.

```jsonc
// Invitation
{ "organizationId": "org-baobab", "organizationName": "Supérette Le Baobab",
  "city": "Abidjan", "role": "cashier", "status": "invited", "invitedAt": "2026-10-18" }
```

## Routes — organisation et équipe

| Méthode | Route | Corps | Réponse | Rôle |
|---|---|---|---|---|
| GET | `/orgs/:orgId/session` | — | `Session` (`user`, `business`, `subscription`, `role`) | membre |
| GET | `/orgs/:orgId/members` | — | `TeamMember[]` | membre |
| POST | `/orgs/:orgId/members` | `InviteMemberInput` (`role` ∈ `manager`/`cashier`) | `TeamMember` (`status: "invited"`) ; `409` si déjà membre | owner |
| PATCH | `/orgs/:orgId/members/:userId` | `{ role }` | `TeamMember` ; `422` si cible ou rôle `owner` | owner |
| DELETE | `/orgs/:orgId/members/:userId` | — | `204` ; `422` si cible `owner` | owner |

## Routes — données métier (toutes sous `/orgs/:orgId`)

| Méthode | Route | Corps | Réponse | Rôle min. |
|---|---|---|---|---|
| GET | `/products` | — | `Product[]` | cashier |
| POST | `/products` | `Product` | `Product` | manager |
| PATCH | `/products/:id` | `Partial<Product>` | `Product` | manager |
| DELETE | `/products/:id` | — | `204` | manager |
| POST | `/products/:id/restock` | `{ quantity }` | `Product` | manager |
| GET | `/sales` | — | `SaleTransaction[]` | cashier |
| POST | `/sales` | `{ sale, lines: CartLine[], credit?: ClientCredit }` | `SaleTransaction` (le serveur décrémente le stock et crée la créance) | cashier |
| GET | `/expenses` | — | `Expense[]` | manager |
| POST | `/expenses` | `Expense` | `Expense` | manager |
| DELETE | `/expenses/:id` | — | `204` | manager |
| GET | `/credits` | — | `ClientCredit[]` | cashier |
| POST | `/credits` | `ClientCredit` | `ClientCredit` | manager |
| POST | `/credits/:id/payments` | `{ amount }` | `ClientCredit` — `422` si `amount <= 0` ou `> remainingAmount` | cashier |
| DELETE | `/credits/:id` | — | `204` | manager |
| GET | `/notifications` | — | `NotificationItem[]` | cashier |
| POST | `/notifications/:id/read` | — | `204` | cashier |
| POST | `/notifications/read-all` | — | `204` | cashier |

> Pour un caissier, le serveur peut omettre `costPrice` des produits renvoyés ;
> le client ne l'affiche pas.

## Sémantique des erreurs (normative)

Le client distingue quatre familles ; le backend DOIT les respecter, sinon
l'interface ne peut pas réagir correctement (rejouer, annuler, déconnecter).

| Statut | `code` attendu | Sens | Réaction client |
|---|---|---|---|
| `401` | `UNAUTHENTICATED` | jeton absent, expiré ou invalide | déconnexion immédiate |
| `403` | `FORBIDDEN` | jeton valide, non-membre de `:orgId`, ou rôle insuffisant | toast + retour à la caisse |
| `404` | `NOT_FOUND` | ressource inexistante dans cette organisation | toast, rafraîchissement de la collection |
| `409` | `INSUFFICIENT_STOCK`, `DUPLICATE`, `CONFLICT` | état serveur incompatible avec la mutation | toast + rechargement de la ressource |
| `422` | `VALIDATION_ERROR`, `OWNER_LOCKED`, `CREDIT_OVERPAYMENT` | règle métier violée, requête bien formée | toast, aucune reprise automatique |
| `5xx` | `SERVER_ERROR` | panne | toast + rejeu possible (voir idempotence) |

Règles associées :

1. **Aucune mutation silencieuse.** Un refus doit être un statut ≠ 2xx : le
   serveur ne « corrige » jamais une valeur (pas de stock borné à 0, pas de
   crédit plafonné sans le dire).
2. `message` est en **français**, destiné à l'utilisateur final, sans détail
   technique. Les détails vont dans un champ optionnel `details`.
3. Un `409`/`422` n'est jamais rejoué automatiquement par le client : il remonte
   à l'utilisateur. Seuls `5xx` et erreurs réseau (`status: 0`, `TIMEOUT`,
   `NETWORK`) sont rejouables.

## Idempotence, concurrence, transaction

- **Identifiants générés par le client** (`product-…`, `sale-…`, `credit-…`) :
  `POST` sur un identifiant déjà connu du même propriétaire renvoie **`200` avec
  la ressource existante** (et non `409`), ce qui rend le rejeu sûr.
- **Vente + créance = une transaction.** `POST /orgs/:orgId/sales` reçoit
  `{ sale, lines, credit? }` : le serveur décrémente le stock, enregistre la
  vente **et** la créance dans la même transaction, ou refuse tout (`409`
  `INSUFFICIENT_STOCK`). Aucune route `POST /credits` séparée pour un règlement
  partiel de caisse.
- **Concurrence** : chaque ressource métier expose `updatedAt` (ISO 8601). Les
  `PATCH`/`DELETE` peuvent le renvoyer dans un en-tête `If-Unmodified-Since` ;
  en cas d'écart → `409 CONFLICT`. Objectif : deux caissiers ne doivent pas
  écraser silencieusement le stock de l'autre.
- **Numérotation des ventes** : `sale.saleNumber` est proposé par le client
  (`V-YYYYMMDD-NNNN`) mais **le serveur reste l'arbitre** : si le numéro est déjà
  pris dans l'organisation, il répond `409 DUPLICATE` et le client régénère.

## Montants, dates et fuseau

- Montants : **entiers FCFA**, jamais de décimales, jamais de chaînes. Le client
  arrondit déjà côté domaine (`roundMontant`) ; le serveur rejette `422
  VALIDATION_ERROR` sur un non-entier ou un négatif.
- Dates : `YYYY-MM-DD`, heures `HH:MM`, **dans le fuseau du commerce** (champ
  `business.timezone` à ajouter côté serveur ; par défaut `Africa/Dakar`, UTC+0).
- Le client horodate ses fichiers exportés en heure locale ; le serveur doit
  fournir `serverTime` dans `GET /orgs/:orgId/session` pour permettre un
  rapprochement de caisse fiable.

## Statut de `mockApi` (à lire avant d'implémenter)

`src/services/adapters/mockApi.ts` est la **spécification exécutable** du
contrat : les mêmes scénarios y sont joués que côté serveur. Deux précisions
pour éviter les malentendus :

- En mode `mock`, l'application **n'appelle pas** ses dépôts métier : les stores
  persistés font foi (`syncRemote` sort tôt). Les dépôts métier de `mockApi`
  servent aux **tests de contrat** (`src/services/__tests__/contract.test.ts`).
- Ils DOIVENT donc rester alignés sur ce document : un écart entre `mockApi` et
  le serveur est un bug de contrat, pas un détail de démo.

## Mode démo

En mode `mock`, comptes, organisations et appartenances sont persistés dans
`localStorage['ma-caisse/mock-auth-db']` : une inscription ou une invitation
survit au rechargement. Les comptes de démonstration (mot de passe `demo1234`)
sont proposés sur l'écran de connexion via `auth.demoAccounts()` (liste vide en
mode `http`).
