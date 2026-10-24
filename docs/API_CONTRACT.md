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
- Erreurs : statut ≠ 2xx et corps `{ "message": "Texte lisible en français" }`
  (affiché tel quel).
- Mutations **optimistes** : l'UI applique puis appelle l'API ; un échec est
  signalé par un toast.

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

```jsonc
// AuthResult
{ "token": "…",
  "user": { "id": "u-mamadou", "firstName": "Mamadou", "lastName": "Konaté", "email": "…", "phone": "…", "role": "Gérant" },
  "memberships": [
    { "organizationId": "org-etoile", "organizationName": "Boutique Étoile", "city": "Dakar Plateau", "role": "owner" },
    { "organizationId": "org-baobab", "organizationName": "Supérette Le Baobab", "city": "Abidjan", "role": "manager" } ] }
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
| POST | `/sales` | `{ sale, lines: CartLine[] }` | `SaleTransaction` (le serveur décrémente le stock) | cashier |
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

## Mode démo

En mode `mock`, comptes, organisations et appartenances sont persistés dans
`localStorage['ma-caisse/mock-auth-db']` : une inscription ou une invitation
survit au rechargement. Les comptes de démonstration (mot de passe `demo1234`)
sont proposés sur l'écran de connexion via `auth.demoAccounts()` (liste vide en
mode `http`).
