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
| Annuler une vente (le jour même) | ✓ | ✓ | |
| Annuler une vente d'un autre jour | ✓ | | |
| Créer / modifier / supprimer des articles, réapprovisionner, voir les prix d'achat | ✓ | ✓ | |
| Corriger le stock (écart, casse), faire un inventaire, consulter le journal de stock | ✓ | ✓ | |
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

## Identifiants stables (valeurs d'énumération)

Toute valeur d'énumération échangée avec l'API est un **identifiant stable** (anglais,
`snake_case`) : il ne change jamais, même si un libellé est retraduit. Le client affiche les
libellés français (`src/config/reference.ts`, `src/content/fr.ts`) ; **le serveur ne reçoit ni
n'envoie jamais un libellé** (`"Espèces"`, `"Partiel"`…). Une valeur inconnue est refusée en
`422 VALIDATION_ERROR`.

### Moyens de paiement (`paymentMethod`)

Le mobile money est prioritaire : il est listé et proposé en premier à la caisse.

| Identifiant | Libellé affiché | Famille | Encaissable via agrégateur |
|---|---|---|---|
| `mtn_money` | MTN Mobile Money | mobile money | FedaPay, KKiaPay |
| `moov_money` | Moov Money | mobile money | FedaPay, KKiaPay |
| `orange_money` | Orange Money | mobile money | FedaPay |
| `wave` | Wave | mobile money | FedaPay |
| `celtiis_cash` | Celtiis Cash | mobile money | FedaPay, KKiaPay |
| `card` | Carte bancaire | carte | FedaPay, KKiaPay |
| `cash` | Espèces | espèces | — |
| `credit` | À crédit | crédit | — |
| `other` | Autre moyen | autre | — |

- `credit` n'est **pas** un instrument de paiement : c'est le choix « à crédit » de la caisse
  (reste dû lié à un client). Il est valide sur une vente, **jamais** sur une dépense, un
  règlement de crédit ou un abonnement : ces champs n'acceptent que les huit autres valeurs
  (`TenderMethod`).
- Ajouter un opérateur (Mixx by Yas, Free Money, Coris Money…) = ajouter une valeur à cette
  énumération ; aucune autre valeur ne change.
- La colonne « agrégateur » (paiement de l'abonnement uniquement) reprend la couverture publiée : FedaPay —
  [Payment methods](https://docs.fedapay.com/payments/payment-methods) (par pays : Bénin MTN,
  Moov, Celtiis ; Côte d'Ivoire MTN, Moov, Wave, Orange ; Sénégal Wave, Orange ; cartes
  Visa/Mastercard) ; KKiaPay — [Méthodes de paiement](https://docs.kkiapay.me/v1/paiements/methodes-de-paiement)
  (MTN, Moov, cartes ; Celtiis Cash d'après les CGU ; Orange et Wave non confirmés). **Elle varie
  selon le pays : à revérifier avant la mise en production.**

### Statuts

| Objet | Identifiants | Libellés |
|---|---|---|
| Vente (`status`) | `completed`, `partial`, `pending`, `cancelled` | Validé, Partiel, En attente, Annulée |
| Crédit (`status`) | `pending`, `partial`, `overdue`, `settled` | En attente, Partiel, En retard, Réglé |
| Facture d'abonnement (`status`) | `paid`, `pending` | Payée, En attente |

`Subscription.paymentMethod` vaut `null` pendant l'essai gratuit.

> Le statut de crédit `overdue` est **calculé** (échéance dépassée et reste dû > 0) ; le serveur
> le renvoie à jour à chaque lecture. Autres champs encore en libellés français, à convertir
> ensuite : `Product.category` (`Épicerie`, `Boissons`, `Frais`, `Hygiène`) et `Expense.category`.

## Paiement de l'abonnement via un agrégateur (FedaPay, KKiaPay)

**Périmètre : uniquement l'abonnement de la plateforme**, payé par le propriétaire d'une
boutique. Les ventes en boutique, les règlements de crédit et les dépenses restent **manuels**
(espèces, ou mobile money reçu directement) : aucun agrégateur n'intervient. Les deux
agrégateurs sont pris en charge ; **le client n'en choisit aucun** : il envoie un moyen de
paiement et c'est le serveur qui route vers un agrégateur compatible (voir le tableau des moyens).

Implémentation de référence exécutable : `mockApi` (`billing`), couverte par
`src/services/__tests__/contract.test.ts` et `src/features/abonnement/__tests__`.

### Règles

1. **Le montant n'est jamais envoyé par le client.** Le serveur le calcule depuis le forfait et la
   durée (`planPrice`), en FCFA entiers (XOF).
2. **Secrets côté serveur uniquement.** Clés secrètes/privées et secrets de webhook ne quittent jamais
   le backend ; le client ne reçoit rien de confidentiel.
3. **Le client n'est jamais cru sur parole.** Une redirection ou un retour de page n'est qu'un
   signal : le serveur confirme la transaction auprès de l'agrégateur (appel d'API) et/ou par
   webhook dont il **vérifie la signature**, puis seulement passe la tentative à `succeeded`,
   prolonge l'abonnement et crée la facture, **dans une seule transaction**.
4. **Idempotence** : la tentative est créée avec un `id` généré par le client. Rejouer la même
   demande renvoie la tentative existante (jamais un second débit), même si le corps diffère.
5. **Réservé au propriétaire** (`billing.manage`) : `403 INSUFFICIENT_ROLE` sinon. Une réauthentification
   récente (`401 STEP_UP_REQUIRED`) peut être exigée.
6. Une tentative `pending` n'est pas un paiement : elle ne prolonge rien. Elle passe à `expired`
   après 10 minutes sans confirmation (`PAYMENT_INTENT_TTL_MS`) ; un paiement tardif reçu après
   expiration doit être remboursé ou rattaché manuellement (à définir côté exploitation).
7. Le numéro du mobile money est au **format international** (`+` ou `00`) ; le pays n'est jamais
   deviné. Il n'est pas conservé au-delà de la tentative.

### Routes (sous `/orgs/:orgId/billing`)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/plans` | — | `SubscriptionPlan[]` |
| POST | `/payments` | `{ id, planId, cycle, paymentMethod, phone? }` | `201 PaymentIntent` (`pending`) · `200` si l'`id` existe déjà · `422 VALIDATION_ERROR` (forfait inconnu, moyen non payable en ligne, numéro absent ou non international) |
| GET | `/payments/:id` | — | `PaymentIntent` — à interroger toutes les 3 s tant que `pending` · `404 NOT_FOUND` |
| POST | `/payments/:id/cancel` | — | `PaymentIntent` au statut `cancelled` · `409 CONFLICT` si déjà terminée |
| POST | `/webhooks/fedapay`, `/webhooks/kkiapay` | corps de l'agrégateur | `200` — **hors cookie**, authentifié par signature ; idempotent |

`paymentMethod` : `mtn_money`, `moov_money`, `orange_money`, `wave`, `celtiis_cash`, `card`
(`cash`, `credit`, `other` → `422`). `phone` est obligatoire pour le mobile money, inutile pour `card`.

```jsonc
// POST /orgs/org-etoile/billing/payments
{ "id": "payment-7f3c", "planId": "pro", "cycle": "monthly",
  "paymentMethod": "mtn_money", "phone": "+229 97 00 00 01" }

// 201
{ "id": "payment-7f3c", "purpose": "subscription", "provider": "fedapay",
  "status": "pending", "paymentMethod": "mtn_money", "planId": "pro", "cycle": "monthly",
  "amount": 15000, "createdAt": "2026-11-11T17:30:00Z", "expiresAt": "2026-11-11T17:40:00Z",
  "checkout": { "type": "push" } }
```

`checkout` dit au client quoi faire : `{ "type": "push" }` = l'opérateur envoie une demande de
validation sur le téléphone (le client affiche l'attente et interroge) ; `{ "type": "redirect",
"url": "…" }` = ouvrir la page de paiement sécurisée de l'agrégateur (carte, 3-D Secure). Les
statuts de `PaymentIntent` sont `pending`, `succeeded`, `failed` (avec `failureReason` en français),
`expired`, `cancelled`.

### Effet d'un paiement réussi

- l'abonnement est prolongé : **à partir de l'échéance actuelle** si le même forfait est encore en
  cours (aucun jour perdu, essai gratuit compris), sinon à partir d'aujourd'hui ; durée = 1 mois
  ou 12 mois (`nextRenewalDate`) ;
- `Subscription.plan`, `cycle`, `paymentMethod` sont mis à jour et `autoRenew` passe à `true` ;
- une facture `paid` est ajoutée ; son numéro **continue la suite existante** (INV-0012 → INV-0013) ;
- le client relit `GET /orgs/:orgId/session` pour afficher l'abonnement à jour.

### Démonstration (`mockApi`)

Une tentative aboutit à la 2e interrogation ; un numéro dont la forme normalisée finit par `0000`
simule un refus de l'opérateur ; le paiement par carte renvoie `redirect` vers `about:blank`.

### Reste à faire / décisions ouvertes

| # | Point | Statut |
|---|---|---|
| P1 | Quel agrégateur pour quel moyen en production (coût, disponibilité par pays) | à décider côté exploitation ; le client n'en dépend pas |
| P3 | Frais de l'agrégateur (la FAQ FedaPay mentionne 1,8 % sur le mobile money au Bénin, à vérifier) : absorbés par la plateforme ou répercutés dans le prix | à décider |
| P5 | Conduite en cas de paiement reçu après expiration | à définir |
| W | Widget JavaScript d'un agrégateur (KKiaPay propose un widget) : non géré par le client, qui ne sait faire que `push` et `redirect` ; nécessite le SDK, la clé publique et une politique CSP | à faire si le backend choisit ce mode |
| R | Renouvellement automatique : l'API ne prélève pas seule un mobile money ; `autoRenew` n'est aujourd'hui qu'un indicateur | à concevoir |
| E | Rappel avant échéance, blocage d'accès à l'expiration (EF-37) | à faire |

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
| PATCH | `/auth/me` | `{ firstName, lastName, phone }` | `AuthResult` (profil mis à jour) |
| POST | `/auth/password/change` | `{ currentPassword, password }` | `204` · `401 STEP_UP_REQUIRED` |
| POST | `/auth/password/reset/request` | `{ email }` | `202` (réponse constante, RG-A09) |
| POST | `/auth/password/reset/confirm` | `{ token, password }` | `204` |
| POST | `/auth/email/verify/request` | — | `{ email, expiresIn: 600, sentAt }` · `429 EMAIL_RATE_LIMITED` |
| POST | `/auth/email/verify/confirm` | `{ code }` | `AuthResult` (`emailVerified: true`) · `400 EMAIL_CODE_MISSING` · `401 INVALID_EMAIL_CODE` · `410 EMAIL_CODE_EXPIRED` |
| POST | `/auth/step-up` | `{ password }` | `200 { ok: true }` — fenêtre de 5 min (D9) · `401 INVALID_CREDENTIALS` |
| GET | `/auth/events` | — | `AuthEvent[]` (10 dernières connexions du titulaire, RG-A20) |
| DELETE | `/auth/me` | `{ password, confirmation: "SUPPRIMER" }` | `204` — accès supprimés, identité anonymisée (RG-A21) · `422 VALIDATION_ERROR` si le mot-clé manque |

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
| GET | `/orgs/:orgId/devices` | — | `Device[]` (actifs **et** révoqués, triés par enrôlement) | membre |
| POST | `/orgs/:orgId/devices` | `{ name, memberId }` | `Device` + `pinSetupToken` · `422 DEVICE_LIMIT` (3 max) | owner + step-up |
| DELETE | `/orgs/:orgId/devices/:id` | — | `204` (session et cache local invalidés, RG-A17) | owner + step-up |
| PUT | `/orgs/:orgId/members/:userId/pin` | `{ pin }` | `204` (`422 WEAK_PIN`) | owner |
| POST | `/auth/pin/verify` | `{ deviceId, memberId, pin }` | `200 { ok: true }` · `401 INVALID_PIN` ou `DEVICE_REVOKED` · `423 PIN_LOCKED` | membre |

```jsonc
// Device (3 maximum par organisation, RG-A15)
{ "id": "dev-caisse-1", "organizationId": "org-etoile", "name": "Caisse comptoir",
  "memberId": "u-awa", "memberName": "Awa Fall", "enrolledBy": "u-mamadou",
  "enrolledAt": "2026-10-25", "lastSeenAt": "2026-10-25T17:40:00Z", "revokedAt": null }

// AuthEvent (10 dernières exposées au titulaire, RG-A20)
{ "at": "2026-10-25T17:40:00Z", "method": "otp_phone", "result": "success",
  "ip": "196.20.0.0", "userAgent": "…", "deviceId": null }
```

```jsonc
// AuthResult — plus de champ "token" (D1)
{ "user": { "id": "u-mamadou", "firstName": "Mamadou", "lastName": "Konaté",
            "phone": "+221771234567", "email": "mamadou@exemple.sn",
            "emailVerified": false,
            "emailVerificationDueAt": "2026-10-28T18:00:00Z" },
  "memberships": [
    { "organizationId": "org-etoile", "organizationName": "Boutique Étoile", "city": "Dakar Plateau", "role": "owner" },
    { "organizationId": "org-baobab", "organizationName": "Supérette Le Baobab", "city": "Abidjan", "role": "manager" } ],
  "expiresAt": "2026-10-25T18:15:00Z" }
```

> `emailVerified` / `emailVerificationDueAt` : une adresse non prouvée laisse le
> compte **pleinement utilisable** (connexion, caisse, ventes) pendant **72 h**.
> Passé ce délai, seules les fonctions dépendant de l'e-mail sont refusées
> (RG-A28). Google pose directement `emailVerified: true`.

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
8. **Vérification e-mail** : OTP 6 chiffres, TTL 10 min, 3 envois/h/adresse ;
   le compte reste utilisable, seules les fonctions dépendant de l'e-mail sont
   bloquées après **72 h** (RG-A27, RG-A28).
9. **Mot de passe** : 12–64 caractères, aucune composition imposée, listes noires
   serveur, Argon2id, jamais de question secrète (RG-A29).

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
| POST | `/orgs/:orgId/onboarding` | `{ name, city, phone, activity }` | `BusinessProfile` avec `onboardedAt` renseigné (RG-A04) · `403` si caissier | membre (hors caissier) |
| PATCH | `/orgs/:orgId/business` | `{ name, city, phone, activity }` | `BusinessProfile` — `onboardedAt` **inchangé** (édition depuis le profil) · `403` si caissier | membre (hors caissier) |
| GET | `/orgs/:orgId/members` | — | `TeamMember[]` | membre |
| POST | `/orgs/:orgId/members` | `InviteMemberInput` (`role` ∈ `manager`/`cashier`) | `TeamMember` (`status: "invited"`) ; `409` si déjà membre | owner |
| PATCH | `/orgs/:orgId/members/:userId` | `{ role }` | `TeamMember` ; `422` si cible ou rôle `owner` | owner |
| DELETE | `/orgs/:orgId/members/:userId` | — | `204` ; `422` si cible `owner` | owner |

## Routes — données métier (toutes sous `/orgs/:orgId`)

| Méthode | Route | Corps | Réponse | Rôle min. |
|---|---|---|---|---|
| GET | `/products` | — | `Product[]` | cashier |
| POST | `/products` | `Product` | `Product` | manager |
| PATCH | `/products/:id` | `Partial<Product>` **sans `stock`** | `Product` · `422 VALIDATION_ERROR` si le corps modifie `stock` (RG-05) | manager |
| POST | `/products/:id/deactivate` | — | `Product` avec `deactivatedAt`, `deactivatedBy` (idempotent : une seconde demande garde la date d'origine) · `403 INSUFFICIENT_ROLE` — voir [Désactivation des produits](#désactivation-des-produits) | manager |
| POST | `/products/:id/reactivate` | — | `Product` sans `deactivatedAt` (idempotent) · `409 CONFLICT` si un produit actif porte déjà ce nom | manager |
| POST | `/products/:id/restock` | `{ quantity, reason? }` | `Product` — crée un mouvement `purchase` · `422` si `quantity` n'est pas un entier > 0 | manager |
| POST | `/products/:id/stock-adjustments` | `{ kind: "count" \| "loss", quantity, reason }` | `{ product, movement }` · `422 VALIDATION_ERROR` · `403 INSUFFICIENT_ROLE` — voir [Journal de stock](#journal-de-stock) | manager |
| POST | `/stock/inventory` | `{ counts: [{ productId, counted }], note? }` | `StockMovement[]` (un par écart) · tout ou rien · `404` produit inconnu · `422` | manager |
| GET | `/stock/movements` | `?productId&type&limit` | `StockMovement[]`, du plus récent au plus ancien | manager |
| GET | `/sales` | — | `SaleTransaction[]` | cashier |
| POST | `/sales` | `{ sale, lines: CartLine[], credit?: ClientCredit }` | `SaleTransaction` (le serveur décrémente le stock et crée la créance) · `422 CONTACT_PHONE_REQUIRED` si le commerce n'a aucun téléphone (RG-A03) | cashier |
| POST | `/sales/:id/cancel` | `{ reason }` | `SaleTransaction` au statut `Annulée` — voir [Annulation d'une vente](#annulation-dune-vente) | manager (le jour même), owner (tout jour) |
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

## Historique des ventes

L'écran « Caisse → Historique » (EF-13) filtre par **période** (aujourd'hui, 7 j, 30 j, tout,
dates libres), **vendeur** et **statut** (`completed`, `partial`, `pending`, `cancelled`), avec une
recherche par numéro de ticket ou nom du client. Il trie de la plus récente à la plus ancienne.

- Chaque vente porte **`sellerId`** et **`sellerName`** : le serveur les renseigne **depuis la
  session** (jamais depuis le corps de la requête, qui est ignoré sur ces champs). Les ventes
  antérieures peuvent ne pas en avoir ; le client les regroupe sous « Non renseigné ».
- Les ventes annulées restent dans `GET /sales` (voir ci-dessous) : l'historique les affiche
  barrées, hors du total.
- **Aujourd'hui le client charge toute la liste et filtre en local.** Dès que le volume le justifie,
  le serveur DOIT accepter sur `GET /orgs/:orgId/sales` les paramètres optionnels `from` et `to`
  (`YYYY-MM-DD`, dans le fuseau du commerce, bornes incluses), `sellerId`, `status`, `q`, `limit` et
  `cursor`, et renvoyer les ventes de la plus récente à la plus ancienne. Un paramètre absent
  n'applique aucun filtre ; les résultats doivent être identiques à ceux du filtrage client.

## Journal de stock

**RG-05 : le stock d'un produit ne change que par un mouvement tracé.** Cinq causes, et
seulement elles (`StockMovement.type`) :

| Identifiant | Cause | Signe | Déclencheur |
|---|---|---|---|
| `purchase` | Réception de marchandise (réapprovisionnement, **stock initial** à la création) | + | `POST /products/:id/restock`, `POST /products` avec `stock > 0` |
| `sale` | Sortie par vente | − | `POST /sales` |
| `return` | Retour en stock | + | `POST /sales/:id/cancel` |
| `adjustment` | Écart d'inventaire | ± | `stock-adjustments` (`kind: "count"`), `POST /stock/inventory` |
| `loss` | Casse, péremption, perte | − | `stock-adjustments` (`kind: "loss"`) |

Le serveur DOIT :

1. **créer le mouvement dans la même transaction que le changement de stock** : aucun stock ne bouge sans sa ligne de journal, aucune ligne sans changement ;
2. calculer `quantityAfter` lui-même (stock du produit juste après le mouvement) et ne **jamais** accepter de stock saisi par le client ;
3. refuser un stock qui deviendrait négatif (`409 INSUFFICIENT_STOCK` à la vente, `422` pour une casse supérieure au stock) ;
4. exiger un **motif d'au moins 3 caractères** pour `adjustment` et `loss` (`422 VALIDATION_ERROR`) ; pour `return`, le motif est `Annulation : <motif de l'annulation>` ;
5. refuser un écart nul (`kind: "count"` avec la quantité déjà en stock → `422`, « aucun écart ») ;
6. **refuser** (pas ignorer silencieusement) tout `PATCH /products/:id` dont le corps modifie `stock` : `422 VALIDATION_ERROR` ;
7. déduire l'auteur (`userId`, `userName`) de la **session**, jamais du corps de la requête ;
8. réserver `stock-adjustments`, `inventory` et `GET /stock/movements` aux rôles ayant `stock.adjust` (gérant, propriétaire) : `403 INSUFFICIENT_ROLE` ;
9. rendre le journal **non modifiable** : aucune route de modification ni de suppression de mouvement ; une erreur se corrige par un mouvement inverse tracé.

```jsonc
// POST /orgs/org-etoile/products/p1/stock-adjustments
{ "kind": "count", "quantity": 7, "reason": "Erreur de comptage" }   // quantity = quantité COMPTÉE
{ "kind": "loss",  "quantity": 4, "reason": "Casse au rayon" }       // quantity = quantité RETIRÉE

// 200 { product, movement }
{ "movement": { "id": "movement-8f2a", "type": "adjustment", "productId": "p1", "productName": "Lait",
                "quantity": -3, "quantityAfter": 7, "reason": "Erreur de comptage",
                "userId": "u-awa", "userName": "Awa Fall", "createdAt": "2026-11-12T11:20:00Z" } }
```

`quantity` d'un mouvement est **signée** (positive = entrée, négative = sortie) et jamais nulle ;
`saleId` et `saleNumber` renseignent les mouvements `sale` et `return`. `productName` est le nom au
moment du mouvement : l'historique survit à un renommage.

**Inventaire** : `POST /stock/inventory` reçoit les quantités comptées. Les produits dont le
comptage égale le stock ne génèrent **aucun** mouvement ; chaque écart devient un mouvement
`adjustment` dont le motif est `Inventaire du JJ/MM/AAAA` (suivi de ` — <note>` si elle est fournie).
L'opération est **atomique** : un produit inconnu (`404`) ou un comptage invalide (entier ≥ 0, sinon
`422`) annule tout l'inventaire.

**Lecture** : `GET /stock/movements?productId=&type=&limit=` — tri du plus récent au plus ancien.
Le client relit le journal à chaque ouverture en mode `http` (200 mouvements au plus) ; une
pagination par curseur sera nécessaire quand le volume le justifiera.

## Désactivation des produits

Un produit n'est **jamais supprimé** (RG-07, EF-08) : il n'existe donc aucune route `DELETE /products/:id`. Il est
désactivé, ce qui le retire de la caisse tout en gardant son historique (ventes, mouvements de stock).

Le champ `deactivatedAt` (ISO 8601) est **absent** tant que le produit est actif ; `deactivatedBy` porte le nom de l'auteur.

Le serveur DOIT :

1. refuser `DELETE /products/:id` (route inexistante, `404`/`405`) ; en base, `Product.deactivatedAt` nullable remplace toute suppression physique ;
2. refuser `POST /sales` contenant un produit désactivé : `409 PRODUCT_INACTIVE`, aucune vente, aucun mouvement de stock ;
3. refuser `POST /products/:id/restock` sur un produit désactivé : `409 PRODUCT_INACTIVE` ;
4. **autoriser** les corrections de stock (`stock-adjustments`, inventaire) sur un produit désactivé, pour écouler le stock restant (casse, fin de série) ; l'annulation d'une vente qui contenait le produit remet bien son stock en place ;
5. refuser un `PATCH /products/:id` qui change `deactivatedAt` ou `deactivatedBy` : `422 VALIDATION_ERROR` (la désactivation est une action tracée) ;
6. refuser la réactivation si un produit **actif** porte déjà le même nom (insensible à la casse et aux espaces) : `409 CONFLICT`. Cela suppose un index d'unicité **partiel** sur `(organizationId, lower(name)) WHERE deactivatedAt IS NULL` ;
7. déduire l'auteur de la **session** ; réserver les deux routes aux rôles ayant `stock.edit` (gérant, propriétaire) : `403 INSUFFICIENT_ROLE` ;
8. exclure les produits désactivés des indicateurs de l'accueil (alertes de stock, marge, valeur du stock) — le client le fait aussi, mais les agrégats serveur doivent suivre.

## Annulation d'une vente

Une vente **ne se supprime ni ne se modifie jamais** (RG-04, EF-14) : il n'existe aucune
route `PATCH` ou `DELETE` sur `/sales`. Seule l'annulation est possible
(`POST /orgs/:orgId/sales/:id/cancel`, corps `{ "reason": "…" }`).

Le serveur DOIT, dans **une seule transaction** :

1. refuser un `reason` vide ou de moins de 3 caractères une fois les espaces retirés → `422 VALIDATION_ERROR` (RG-09) ;
2. refuser une vente déjà annulée → `409 CONFLICT` ;
3. vérifier le rôle : `sales.cancel` (gérant, propriétaire), et pour une vente d'un autre jour (fuseau de la boutique) `sales.cancelAnyDay` (propriétaire) → sinon `403 INSUFFICIENT_ROLE` ;
4. refuser si le crédit lié (`credit.saleId` = id de la vente) a reçu au moins un remboursement → `409 CONFLICT` (EF-16 : annulation bloquée) ;
5. remettre en stock les quantités des lignes de la vente (trace de mouvement de type `return`, RG-05) ;
6. supprimer (ou marquer annulé) le crédit lié, qui sort des « créances à recouvrer » ;
7. passer la vente à `status: "cancelled"` avec `cancelledAt` (ISO 8601), `cancelledBy` (nom de l'auteur) et `cancelReason`, et supprimer `remainingAmount` / `creditId` ;
8. écrire l'action dans le journal d'audit (EF-36) : qui, quand, pourquoi.

La vente annulée **reste dans `GET /sales`**. Elle ne compte dans aucun total (chiffre
d'affaires, canaux de paiement, export comptable) : le client les exclut déjà, le
serveur doit faire de même dans ses rapports.

```jsonc
// POST /orgs/org-etoile/sales/sale-1/cancel   { "reason": "erreur de produit" }
{ "id": "sale-1", "saleNumber": "V-20261111-0001", "status": "cancelled",
  "date": "2026-11-11", "time": "17:32", "paymentMethod": "cash", "amount": 1900,
  "itemsCount": 2,
  "cancelledAt": "2026-11-11T17:32:10Z", "cancelledBy": "Mamadou Konaté",
  "cancelReason": "erreur de produit" }
```

Lien vente ↔ crédit : `POST /sales` reçoit `credit.saleId` (id de la vente) et la vente porte
`creditId`. Le détail `lines` est envoyé à côté de `sale`, pas dans `sale`.

## Sémantique des erreurs (normative)

Le client distingue quatre familles ; le backend DOIT les respecter, sinon
l'interface ne peut pas réagir correctement (rejouer, annuler, déconnecter).

| Statut | `code` attendu | Sens | Réaction client |
|---|---|---|---|
| `400` | `EMAIL_CODE_MISSING`, `VALIDATION_ERROR` | requête incomplète (aucun code demandé, champ manquant) | redemander un code / corriger le champ |
| `401` | `UNAUTHENTICATED` | cookie absent, expiré ou invalide | déconnexion immédiate |
| `401` | `STEP_UP_REQUIRED` | session valide, action sensible : réauthentification < 5 min requise (RG-A12) | modale de réauthentification, **pas** de déconnexion |
| `401` | `INVALID_CREDENTIALS`, `INVALID_OTP`, `INVALID_EMAIL_CODE` | échec du facteur présenté | message, compteur de tentatives |
| 403 | NOT_A_MEMBER | session valide, mais aucune appartenance active a :orgId (ou appartenance inconnue) | toast + retour a la caisse, **pas** de deconnexion |
| 403 | INSUFFICIENT_ROLE | appartenance active, mais le role ne permet pas l'action (ex. caissier sur l'onboarding, non-owner sur les appareils) | toast, message dedie, **pas** de deconnexion |
| 403 | FORBIDDEN | repli generique : ne pas l'utiliser pour des cas couverts par les codes ci-dessus | toast + retour a la caisse, **pas** de deconnexion |
| `403` | `INVITATION_PENDING` | appartenance non acceptée | écran d'acceptation d'invitation |
| `404` | `NOT_FOUND` | ressource inexistante dans cette organisation | toast, rafraîchissement de la collection |
| `409` | `INSUFFICIENT_STOCK`, `PRODUCT_INACTIVE`, `DUPLICATE`, `CONFLICT` | état serveur incompatible avec la mutation (dont annulation d'une vente déjà annulée ou dont le crédit est remboursé, vente ou réapprovisionnement d'un produit désactivé) | toast + rechargement de la ressource |
| `410` | `OTP_EXPIRED`, `EMAIL_CODE_EXPIRED` | code expiré (5 min téléphone / 10 min e-mail, RG-A07, RG-A27) | proposer un renvoi |
| `422` | `VALIDATION_ERROR`, `OWNER_LOCKED`, `CREDIT_OVERPAYMENT`, `DEVICE_LIMIT`, `WEAK_PIN` | règle métier violée, requête bien formée | toast, aucune reprise automatique |
| `423` | `PIN_LOCKED` | 5 échecs PIN, verrouillage 15 min (RG-A16) | message + déblocage par le propriétaire |
| `429` | `OTP_RATE_LIMITED`, `OTP_LOCKED`, `OTP_BUDGET_EXCEEDED`, `EMAIL_RATE_LIMITED`, `RATE_LIMITED` | quota d'envoi, de tentatives ou budget mensuel atteint (RG-A08, RG-A19, RG-A24, RG-A27) | respecter `Retry-After`, afficher le délai ; pour le budget, proposer une autre méthode de connexion |
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

## Ce que le backend doit porter (le front ne fait que le refléter)

Le front couvre le parcours, la validation d'usage et les garde-fous d'interface.
**Tout ce qui suit n'est pas implémenté côté client et ne doit pas l'être** : ce
sont les responsabilités du backend, à traiter avant toute mise en production.

| Domaine | Ce que le serveur DOIT faire | Réf. |
|---|---|---|
| Mots de passe | hash **Argon2id**, liste noire complète (Pwned Passwords, k-anonymity), 12–64 caractères, refus si l'identité est recopiée | RG-A29 |
| OTP téléphone | envoi WhatsApp (palier 1 conversation initiée, palier 2 template), quotas 3/h/numéro et 10/h/IP, 5 tentatives, TTL 5 min, usage unique, comparaison à temps constant, réponse constante | RG-A07→A09, A23, A24 |
| OTP e-mail / reset | envoi e-mail, TTL 10 min, 3/h/adresse, 5 tentatives, invalidation des codes précédents, réponse constante | RG-A27, A09 |
| Session | signature de l'access token, cookies `HttpOnly/Secure/SameSite`, refresh rotatif + détection de réutilisation, révocation de famille, `expiresAt` | D1, RG-A10, RG-A11 |
| CSRF | vérifier `X-CSRF-Token` (double-submit) sur **toute** mutation authentifiée | D1 |
| Autorisation | vérifier appartenance `active` + rôle sur chaque route, y compris `POST /sales` (`422 CONTACT_PHONE_REQUIRED`) et l'édition du commerce (`403` caissier) | RG-A03, RG-A18 |
| Step-up | exiger une réauthentification < 5 min sur les actions sensibles, renvoyer `401 STEP_UP_REQUIRED` **sans** invalider la session | D9, RG-A12 |
| Appareils & PIN | hash **Argon2id** du PIN, compteur d'échecs **partagé entre appareils**, verrouillage 15 min après 5 échecs, révocation qui invalide la session de l'appareil, plafond de 3 appareils actifs | D6, RG-A15→A17 |
| Anti-bruteforce | `429` + `Retry-After` par identifiant et par IP sur tous les points d'entrée | D8, RG-A19 |
| Journal | table `auth_events` (90 j), consultation titulaire/propriétaire, purge planifiée | RG-A20 |
| Comptes | unicité téléphone/e-mail (E.164 canonique), rattachement Google, suppression/anonymisation sous 30 j | RG-A01, A02, A21 |
| Données métier | unicité des numéros de vente, transaction vente+créance, contrôle de stock, `updatedAt` | §Idempotence |

**Aucune règle de sécurité ne repose sur le front.** Le client valide pour
l'ergonomie (message immédiat, pas d'aller-retour inutile) ; le serveur rejette
de toute façon. Un client modifié ne doit jamais obtenir plus que ce que les
règles `RG-A…` autorisent.

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
