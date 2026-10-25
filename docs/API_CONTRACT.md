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
  l'utilisateur de la session est membre de `:orgId` (sinon `403`) et que son rôle
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
- Authentification : **cookie de session `HttpOnly`** (`mc_session`, 15 min) +
  refresh rotatif (`mc_refresh`). **Aucun en-tête `Authorization`**, aucun jeton
  dans le corps des réponses : le client n'a rien de durable à persister.
  Les routes publiques sont `/auth/otp/*`, `/auth/oauth/*`, `/auth/password/reset/*`,
  `/auth/refresh` et `/auth/login` (hérité). Décisions et durées :
  [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) (D1, RG-A10, RG-A11).
- **CSRF obligatoire** sur toute mutation authentifiée par cookie : en-tête
  `X-CSRF-Token` (double-submit) — `SameSite=Lax` seul ne suffit pas.
- Un `401 UNAUTHENTICATED` déconnecte l'utilisateur ; un `401 STEP_UP_REQUIRED`
  demande une réauthentification **sans** déconnecter (RG-A12).
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

**Propriétaire / gérant (cible principale)**

1. `POST /auth/otp/request { phone }` → `202` (aucune révélation d'existence, RG-A09).
2. `POST /auth/otp/verify { challengeId, code }` → `AuthResult` + cookies de
   session. Si le numéro est inconnu, le compte **et** l'organisation sont créés
   dans la même transaction (rôle `owner`, essai 14 j, RG-A06).
3. Choix de l'organisation (dernière utilisée, sinon la première).
4. `GET /orgs/:orgId/session` puis, en parallèle, les collections.
5. Onboarding (nom du commerce, ville, premier article) jusqu'à `onboardedAt`
   renseigné (RG-A04).
6. Au rechargement / retour : `GET /auth/me` — le cookie porte la session.

**Caissier (poste de la boutique)**

1. L'appareil a été enrôlé par un propriétaire (`POST /orgs/:orgId/devices`).
2. Le PIN est vérifié **localement** (D6) ; `POST /auth/pin/verify` sert à la
   télémétrie et au compteur de tentatives quand le réseau est là.
3. Aucun OTP n'est demandé à la relève. Verrouillage automatique après 15 min
   d'inactivité (RG-A14).

**Changement d'espace** : étapes 3–4 avec un autre `orgId` ; les données locales
restent cloisonnées par organisation (`localStorage['ma-caisse/<orgId>/…']`).

## Routes — authentification

### Identité (OTP téléphone — D2)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/otp/request` | `{ phone }` (E.164) | `202 { challengeId, channel: "whatsapp_user" ou "whatsapp" ou "sms" (repli), expiresIn, retryAfter?, remainingQuota }` · `429 OTP_RATE_LIMITED` · `429 OTP_BUDGET_EXCEEDED` + `Retry-After` |
| POST | `/auth/otp/verify` | `{ challengeId, code }` | `AuthResult` + cookies · `401 INVALID_OTP` · `410 OTP_EXPIRED` · `429 OTP_LOCKED` |

> **Palier 1 (0 FCFA)** : le code peut être servi dans une **conversation
> initiée par l'utilisateur** (`wa.me`, `channel: "whatsapp_user"`), dans le quota
> gratuit de 1 000 messages de service par mois et par numéro. **Palier 2** :
> template `authentication` (`channel: "whatsapp"`), ≈ 7 FCFA par message livré.
> Le client ne choisit pas le palier : le serveur décide selon le volume
> (RG-A23) et le renvoie dans `channel`.

### Google (D3)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/oauth/google` | `{ code, codeVerifier }` (PKCE) | `AuthResult` + cookies ; compte inconnu → créé avec `onboardingStep: "phone"` |
| POST | `/auth/oauth/google/link` | `{ code, codeVerifier, challengeId, code: otp }` | `AuthResult` — rattachement e-mail ↔ téléphone (RG-A02) |

> **Mode démo** : l'adaptateur `mock` simule l'identité Google (`googleSignIn`) et
> crée un espace « Mon commerce » sans téléphone (l'application de RG-A03 arrive
> avec D2). En mode `http`, l'appel échoue explicitement en `501 NOT_IMPLEMENTED`
> tant que l'identifiant client Google et l'échange PKCE ne sont pas branchés :
> on ne crée **jamais** une session à partir d'une identité auto-déclarée.

### Session (D1)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/refresh` | — (cookie `mc_refresh`) | `204` + nouveaux cookies · `401` (réutilisation → révocation de la famille, RG-A10) |
| GET | `/auth/me` | — | `AuthResult` (`expiresAt`) |
| POST | `/auth/logout` | — | `204`, refresh invalidé côté serveur |
| POST | `/auth/password/set` | `{ password }` | `204` (D4, 12 caractères minimum) |
| POST | `/auth/password/change` | `{ currentPassword, password }` | `204` · `401 STEP_UP_REQUIRED` |
| POST | `/auth/password/reset/request` | `{ email }` | `202` (réponse constante, RG-A09) |
| POST | `/auth/password/reset/confirm` | `{ token, password }` | `204` |
| GET | `/auth/events` | — | `AuthEvent[]` (10 dernières connexions, RG-A20) |

### Invitations (inchangé)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/auth/invitations` | — | `Invitation[]` — invitations reçues, en attente d'acceptation |
| POST | `/auth/invitations/:orgId/accept` | — | `AuthResult` (appartenance passée à `active`) · `404 INVITATION_NOT_FOUND` |

### Hérité (déprécié — à retirer une fois D2 livré)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `AuthResult` + cookies · `401 INVALID_CREDENTIALS` |
| POST | `/auth/signup` | `SignupInput` legacy (8 champs) | `AuthResult` · `409 EMAIL_TAKEN` |

Les deux routes restent disponibles le temps de la migration : elles ouvrent une
session **par cookie** comme les autres (pas de jeton dans le corps) et
n'introduisent aucune règle nouvelle.

### Appareils et PIN caissier (D6)

| Méthode | Route | Corps | Réponse | Rôle |
|---|---|---|---|---|
| GET | `/orgs/:orgId/devices` | — | `Device[]` (`name`, `lastSeenAt`, `enrolledBy`) | owner |
| POST | `/orgs/:orgId/devices` | `{ name, memberId }` | `Device` + `pinSetupToken` · `422 DEVICE_LIMIT` (3 max) | owner + step-up |
| DELETE | `/orgs/:orgId/devices/:id` | — | `204` (session et cache local invalidés, RG-A17) | owner + step-up |
| PUT | `/orgs/:orgId/members/:userId/pin` | `{ pin }` | `204` (`422 WEAK_PIN`) | owner |
| POST | `/auth/pin/verify` | `{ deviceId, memberId, pin }` | `200 { ok }` · `401` · `423 PIN_LOCKED` | membre |

```jsonc
// Device (3 maximum par organisation, RG-A15)
{ "id": "dev-caisse-1", "name": "Caisse comptoir", "memberId": "u-awa",
  "enrolledBy": "u-mamadou", "enrolledAt": "2026-10-25",
  "lastSeenAt": "2026-10-25T17:40:00Z", "revokedAt": null }

// AuthEvent (10 dernières exposées au titulaire, RG-A20)
{ "at": "2026-10-25T17:40:00Z", "method": "otp_whatsapp", "result": "success",
  "ip": "196.20.0.0", "userAgent": "…", "deviceId": null }
```

```jsonc
// AuthResult — plus de champ "token" (D1)
{ "user": { "id": "u-mamadou", "firstName": "Mamadou", "lastName": "Konaté",
            "phone": "+221771234567", "email": "mamadou@exemple.sn" },
  "memberships": [
    { "organizationId": "org-etoile", "organizationName": "Boutique Étoile", "city": "Dakar Plateau", "role": "owner" },
    { "organizationId": "org-baobab", "organizationName": "Supérette Le Baobab", "city": "Abidjan", "role": "manager" } ],
  "expiresAt": "2026-10-25T18:15:00Z" }
```

### Règles d'authentification (normatives)

Les règles `RG-A01` à `RG-A22` de [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) §3
sont **contractuelles** et priment sur tout exemple de ce document. Les plus
structurantes pour le backend :

1. Téléphone E.164 vérifié = identité unique ; e-mail unique et vérifié s'il est
   fourni (RG-A01, RG-A02).
2. OTP : 6 chiffres, 5 min, usage unique, 5 tentatives, quotas 3/h/numéro et
   10/h/IP, aucune révélation d'existence (RG-A07 → RG-A09), **canal WhatsApp
   Cloud API** avec SMS en repli désactivé par défaut (RG-A23).
3. Access 15 min, refresh rotatif 30 j glissant / 90 j absolu (personnel) ou
   90 j / 180 j (appareil enrôlé), réutilisation = révocation de famille
   (RG-A10, RG-A11).
4. `401 STEP_UP_REQUIRED` ≠ `401 UNAUTHENTICATED` : le premier ne déconnecte pas
   (RG-A12).
5. Déconnexion = invalidation serveur **et** purge des collections locales
   (RG-A13).
6. 3 appareils maximum par organisation, enrôlement par le propriétaire avec
   step-up (RG-A15).
7. **Budget** : 20 OTP par organisation et par mois civil, alerte à 80 %,
   `429 OTP_BUDGET_EXCEEDED` à 100 %, plafond global et mode dégradé au-delà
   (RG-A24). Modèle de coût : [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) §7.

### Règles d'invitation (normatives)

1. **Une invitation n'ouvre aucun accès.** Une appartenance `status: "invited"` ne
   figure pas dans `AuthResult.memberships` et **toute** route métier répond
   `403 INVITATION_PENDING` (y compris `GET /orgs/:orgId/session`).
2. **La connexion n'active rien.** Accepter une invitation est un acte explicite
   (`POST /auth/invitations/:orgId/accept`) ; un même utilisateur peut avoir
   plusieurs invitations en attente et les accepter séparément.
3. `GET /auth/invitations` ne renvoie que les invitations de l'utilisateur de la
   session, jamais celles d'un collègue.
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
| `401` | `UNAUTHENTICATED` | cookie absent, expiré ou invalide | déconnexion immédiate |
| `401` | `STEP_UP_REQUIRED` | session valide, action sensible : réauthentification < 5 min requise (RG-A12) | modale de réauthentification, **pas** de déconnexion |
| `401` | `INVALID_CREDENTIALS`, `INVALID_OTP` | échec du facteur présenté | message, compteur de tentatives |
| `403` | `FORBIDDEN` | session valide, non-membre de `:orgId`, ou rôle insuffisant | toast + retour à la caisse, **pas** de déconnexion |
| `403` | `INVITATION_PENDING` | appartenance non acceptée | écran d'acceptation d'invitation |
| `404` | `NOT_FOUND` | ressource inexistante dans cette organisation | toast, rafraîchissement de la collection |
| `409` | `INSUFFICIENT_STOCK`, `DUPLICATE`, `CONFLICT` | état serveur incompatible avec la mutation | toast + rechargement de la ressource |
| `410` | `OTP_EXPIRED` | code expiré (TTL 5 min, RG-A07) | proposer un renvoi |
| `422` | `VALIDATION_ERROR`, `OWNER_LOCKED`, `CREDIT_OVERPAYMENT`, `DEVICE_LIMIT`, `WEAK_PIN` | règle métier violée, requête bien formée | toast, aucune reprise automatique |
| `423` | `PIN_LOCKED` | 5 échecs PIN, verrouillage 15 min (RG-A16) | message + déblocage par le propriétaire |
| `429` | `OTP_RATE_LIMITED`, `OTP_LOCKED`, `OTP_BUDGET_EXCEEDED`, `RATE_LIMITED` | quota d'envoi, de tentatives ou budget mensuel de l'organisation atteint (RG-A08, RG-A19, RG-A24) | respecter `Retry-After`, afficher le délai ; pour le budget, proposer une autre méthode de connexion |
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

**Compatibilité avec les décisions** ([`AUTH_DECISIONS.md`](AUTH_DECISIONS.md)) :

- La démo conserve **e-mail + mot de passe** : elle doit rester jouable en un clic
  sur un salon, sans téléphone réel (RG-A22). L'exposition de `demo1234` est
  limitée à `mode: 'mock'`.
- `mockApi` reste la **spécification exécutable** : il DOIT exposer
  `/auth/otp/request`, `/auth/otp/verify`, `/auth/pin/verify`, les routes
  d'appareils et le refresh, avec un code OTP fixe et affiché (`000000`) et des
  quotas réduits mais actifs. Un endpoint du contrat absent du mock est un bug.
- Pendant la migration (phases 2 à 4 de `AUTH_DECISIONS.md` §6), `AuthResult`
  porte transitoirement `token` **en mock uniquement** ; le retrait du champ et
  la persistance zéro-jeton se font dans la même livraison que D1.
- Les compteurs de tentatives et les verrouillages sont **remis à zéro** entre
  deux scénarios de test (`createMockApi()` neuf).
