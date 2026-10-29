# Cartographie des flux d'authentification — Ma Caisse

> Document de référence pour le démarrage du backend. Tout ce qui est décrit ici
> est **normatif** : les règles métier (RG-Axx) et les décisions (Dx) viennent de
> [`docs/AUTH_DECISIONS.md`](AUTH_DECISIONS.md) ; les routes et codes d'erreur de
> [`docs/API_CONTRACT.md`](API_CONTRACT.md). Ce document les met en relation avec
> le code client (`src/`), qui est la **spécification exécutable** (l'adaptateur
> `mockApi` joue le rôle de serveur de référence).

---

## 1. Acteurs et rôles

| Rôle | Code | Périmètre |
|---|---|---|
| Propriétaire | `owner` | tout : équipe, appareils, abonnement, onboarding, profil commerce |
| Gérant | `manager` | ventes, stock, crédits, dépenses, bilan, équipe en lecture |
| Caissier | `cashier` | ventes, stock en lecture, crédits en lecture |

Matrice complète : `src/domain/permissions.ts:19-55` (`can(role, permission)`,
`canAccessTab`). La matrice est **UI uniquement** : elle masque des boutons et
des onglets, mais ne lève jamais d'erreur. Le serveur reste l'autorité finale.

---

## 2. Modèle de données (types)

Source : `src/types/index.ts`.

### `UserProfile`
`id`, `firstName`, `lastName`, `role` (string libre côté type, enum côté serveur),
`phone` (E.164), `email`, `emailVerified`, `emailVerificationDueAt` (ISO ou null).

### `Membership`
`organizationId`, `organizationName`, `city`, `role` (`owner|manager|cashier`).
Pas de `status` côté client : le serveur filtre (`status === 'active'`) et
n'expose que les appartenances actives (RG-A14).

### `AuthResult`
`user: UserProfile`, `memberships: Membership[]`, `expiresAt: string` (ISO).
**Aucun jeton dans le corps** (D1) : la session vit dans des cookies `HttpOnly`.
L'access token est porté par le cookie ; `expiresAt` sert à la reprise et au
step-up.

### `BusinessProfile` (organisation / commerce)
`id`, `name`, `activity`, `address`, `city`, `phone`, `email`, `taxId`,
`currency`, `registerLabel`, `closingTime` (« HH:MM »), `onboardedAt` (ISO ou null).

### `Session` (retournée par `GET /orgs/:orgId/session`)
`role`, `business: BusinessProfile`, `user` (optionnel), `expiresAt`.

### `Invitation` extends `Membership`
+ `invitedAt: string` (ISO). Statut `invited` tant qu'elle n'est pas acceptée.

### `Device` (D6)
`id`, `organizationId`, `name`, `memberId`, `memberName`, `enrolledBy`,
`enrolledAt`, `lastSeenAt` (ISO ou null), `revokedAt` (ISO ou null).

### `DeviceEnrollment`
`device: Device`, `pinSetupToken: string` (jeton à usage unique pour définir le PIN).

### `AuthEvent` (RG-A20)
`id`, `at` (ISO), `method` (`password|google|otp_phone|otp_email|reset|step_up`),
`result` (`success|failure`), `ip`, `userAgent`, `deviceId` (ou null).

### Entrées
- `LoginInput` : `{ email, password }`.
- `SignupInput` : `{ firstName, lastName, email, phone, password, organizationName, activity, city }`.
- `ProfileInput` : `{ firstName, lastName, phone }`.
- `OnboardingInput` : `{ name, city, phone, activity }`.
- `PhoneChallenge` / `PhoneVerifyInput` : défi OTP téléphone (D2).
- `EmailChallenge` : défi OTP e-mail (RG-A27).
- `PasswordResetChallenge` : `{ email, expiresIn, sentAt, demoCode? }`.
- `StepUpInput` : `{ password }`.
- `EnrollDeviceInput` : `{ name, memberId }`.
- `PinVerifyInput` : `{ deviceId, memberId, pin }`.
- `InviteMemberInput` : `{ firstName, lastName, email, role }`.

---

## 3. Flux d'authentification

### 3.1 Inscription e-mail + mot de passe (parcours actif par défaut)
- **Déclencheur** : onglet « Créer un compte », 2 champs (e-mail + mot de passe).
- **Appels** : `POST /auth/signup` → `AuthResult`.
- **Règles** : RG-A04 (inscription réduite), RG-A05 (unicité e-mail), RG-A06 (essai
  14 j démarre à la création de l'org), RG-A26 (mot de passe 12 car. min, liste
  noire), RG-A27 (vérification e-mail par code, grâce 72 h non bloquante).
- **Côté client** : `signup()` (`store/auth.ts:142-145`) remet `currentOrganizationId`
  à null avant `applyAuth()` (pour ne pas hériter de l'org d'un compte précédent),
  puis `applyAuth()` → `pickOrganization()` → `activateOrganization()`.
- **Conséquence** : l'organisation créée a `onboardedAt: null` → `OnboardingModal`
  s'affiche (2 étapes : nom du commerce → coordonnées), puis checklist.

### 3.2 Connexion e-mail + mot de passe
- **Appels** : `POST /auth/login` → `AuthResult`.
- **Règles** : RG-A09 (réponse constante), RG-A11 (verrouillage après 5 échecs / 15 min),
  RG-A12 (401 vs 403), RG-A20 (journal).
- **Côté client** : `login()` (`store/auth.ts:116-118`) → `applyAuth()` → `pickOrganization()`
  (préfère l'org persistée si elle est toujours dans les memberships, sinon la première).
- **Note** : `login()` ne remet pas `currentOrganizationId` à null (contrairement à
  `signup()`) — héritage volontaire si l'org est encore valide.

### 3.3 Connexion Google (D3, démo simulée)
- **Appels** : `POST /auth/google` (ou échange PKCE serveur en prod) → `AuthResult`.
- **Règles** : D3 (Google accélérateur, jamais méthode unique), RG-A02 (rattachement
  e-mail ↔ téléphone), RG-A03 (contact téléphonique obligatoire pour vendre).
- **Production** : le client envoie un code d'autorisation PKCE ; le serveur échange
  et ne voit jamais une identité auto-déclarée. En mode `http`, l'endpoint renvoie
  `501` (non implémenté côté serveur).
- **Effet** : un compte inconnu est créé avec un espace « Mon commerce ».

### 3.4 Connexion téléphone OTP (D2, masquée par défaut)
- **Déclencheur** : `VITE_AUTH_PHONE=on` (`env.phoneLogin`). Par défaut désactivée
  (crédits WhatsApp non provisionnés).
- **Appels** : `POST /auth/otp/request` → `PhoneChallenge` ; `POST /auth/otp/verify`
  → `AuthResult`.
- **Règles** : D2 (deux paliers de coût : conversation initiée 0 FCFA, template
  ≈ 7 FCFA), RG-A07/A08/A09 (OTP 6 chiffres, TTL 5 min, 5 tentatives, réponse
  constante), RG-A10 (rate limit 3/min/numéro), RG-A23 (SMS repli désactivé).
- **Particularité** : `verifyPhoneCode` crée le compte si le numéro est inconnu
  (RG-A09 : la distinction n'est faite qu'ici).
- **Normalisation** : `domain/phone.ts` ramène `77 123 45 67`, `+221 77 123 45 67`
  et `00221771234567` à `221771234567` (E.164) — RG-A01.

### 3.5 Mot de passe oublié (D4)
- **Appels** : `POST /auth/password/reset/request` → `PasswordResetChallenge` ;
  `POST /auth/password/reset/confirm` → `void`.
- **Règles** : D4 (mot de passe optionnel, 12 car., liste noire), reset par OTP,
  réponse constante (RG-A09). Code TTL 10 min.

### 3.6 Vérification e-mail (RG-A27/A28)
- **Appels** : `POST /auth/email/verify/request` → `EmailChallenge` ;
  `POST /auth/email/verify/confirm` → `AuthResult`.
- **Règles** : code 6 chiffres, TTL 10 min, usage unique, 5 essais, renvoi après 60 s,
  3 envois/adresse/heure, réponse constante. Grâce de 72 h non bloquante
  (`emailVerificationDueAt`) : la caisse reste utilisable.
- **Côté client** : `VerifyEmailBanner` (`features/auth/VerifyEmailBanner.tsx`).

### 3.7 Restauration de session au démarrage
- **Déclencheur** : `useEffect` dans `App.tsx:139-141` → `restoreSession()`.
- **Appels** : `GET /auth/me` → `AuthResult` → `applyAuth()`.
- **Règles** : RG-A12 (401 vs 403). Un 401 déconnecte ; un 403 (accès perdu) ne
  déconnecte **pas** : le statut passe en `error` avec `t.auth.errors.accessLost`,
  et `SplashScreen` propose les autres espaces.
- **Invariant** : un utilisateur persisté n'est qu'un indice d'interface, jamais une
  preuve (le cookie est revalidé).

### 3.8 Changement d'espace
- **Appels** : `activateOrganization(orgId)` → `GET /orgs/:orgId/session` +
  chargement des collections (http) + `scopeStoresToOrganization`.
- **Règles** : S1 (activation atomique : validation avant bascule, rollback en cas
  d'échec), S3 (revalidation même pour l'espace déjà courant).
- **Invariant** : le tenant (`services/tenant`), `useAuthStore.currentOrganizationId`
  et `useSessionStore.session` désignent toujours la même organisation.

### 3.9 Acceptation d'invitation
- **Appels** : `POST /auth/invitations/:orgId/accept` → `AuthResult`.
- **Règles** : RG-A14 (invitation n'active rien tant qu'elle n'est pas acceptée
  explicitement), `status === 'active'` requis par `requireMembership`.
- **Côté client** : `acceptInvitation()` (`store/auth.ts:112-114`) → `applyAuth()`.

### 3.10 Onboarding (RG-A04)
- **Déclencheur** : `onboardedAt === null` → `OnboardingModal` (2 étapes : nom du
  commerce → coordonnées), puis checklist non bloquante.
- **Appels** : `POST /orgs/:orgId/onboarding` → `BusinessProfile`.
- **Règle** : seuls owner et manager peuvent compléter (`403 INSUFFICIENT_ROLE`
  pour un caissier). `PATCH /orgs/:orgId/business` modifie sans toucher à
  `onboardedAt`.

### 3.11 Édition de profil et commerce
- **Appels** : `PATCH /auth/me` (profil personnel) ; `PATCH /orgs/:orgId/business`
  (commerce). `updateProfile()` (`store/auth.ts:166-170`) rafraîchit compte + session.
- **Règle** : un caissier ne modifie pas la fiche du commerce.

### 3.12 Changement de mot de passe
- **Appels** : `POST /auth/password/change` → `204` ou `401 STEP_UP_REQUIRED`.
- **Règle** : RG-A12 (step-up pour action sensible), RG-A26 (12 car. min, liste noire).

### 3.13 Enrôlement d'appareil + PIN (D6)
- **Appels** : `POST /orgs/:orgId/devices` (owner + step-up) → `DeviceEnrollment` ;
  `POST /orgs/:orgId/members/:userId/pin` ; `POST /auth/pin/verify` (compteur partagé).
- **Règles** : RG-A15 (PIN 4-6 chiffres, distinct du téléphone et des suites
  triviales), RG-A16 (5 échecs → verrouillage 15 min + notification owner),
  RG-A17 (3 appareils max, révocation par owner).
- **Hors ligne** : le PIN est vérifié localement via un hash (mode démo) ; la
  vérification distante met à jour le compteur partagé.

### 3.14 Verrouillage / déverrouillage (D6)
- **Déclencheur** : 15 min d'inactivité sur un appareil enrôlé → `LockScreen`.
- **Déverrouillage** : PIN local (hors ligne) ou OTP du titulaire.

### 3.15 Step-up (D9)
- **Appels** : `POST /auth/step-up` → `{ ok: true }` (fenêtre de 5 min).
- **Règle** : `withStepUp()` (`store/stepUp.ts`) rejoue l'action une fois après
  confirmation ; aucun logout sur `STEP_UP_REQUIRED`. Appliqué à l'enrôlement
  d'appareil.

### 3.16 Suppression de compte (RG-A21)
- **Appels** : `POST /auth/account/delete` (mot de passe + mot-clé `SUPPRIMER`).
- **Règle** : anonymisation sous 30 j ; l'organisation est supprimée avec les
  memberships du titulaire (les autres membres gardent leur appartenance orpheline,
  filtrée par `membershipsOf`).

### 3.17 Purge locale au logout (RG-A13)
- **Côté client** : `logout()` (`store/auth.ts:238-262`) : invalidation serveur,
  `setActiveOrganization(null)`, `useAuthStore.reset()`, `useSessionStore.clear()`,
  vidage des stores métier, `purgeLocalBusinessData()` (`store/localData.ts`).
- **Conservés** : `ma-caisse/ui`, `ma-caisse/mock-auth-db`, `ma-caisse/mock-session`
  (démo uniquement).

### 3.18 Anti-bruteforce (D8)
- **Règle** : `429` + `Retry-After`, journal 90 j, rate limit login 5/15 min,
  OTP 3/min/numéro, email 3/h/adresse.

### 3.19 Journal de connexions (RG-A20)
- **Appels** : `GET /auth/events` → `AuthEvent[]` (10 dernières). Affiché dans
  `ProfilModal`.

### 3.20 Déconnexion
- Voir 3.17.

---

## 4. État client (machine à états)

`useSessionStore` (`store/useSessionStore.ts`) : `status` ∈ {`loading`, `ready`,
`error`}, `session: Session | null`, `error: string | null`.

Transitions :
- démarrage → `loading` (restoreSession) → `ready` (session posée) ou `error`.
- activation d'org → `loading` → `ready` ou `error`.
- 401 → `logout()` → `null` (non authentifié).
- 403 → `error` (accès perdu, pas de déconnexion).

`useAuthStore` persiste (`ma-caisse/auth`) : `user`, `memberships`,
`currentOrganizationId`, `expiresAt`. Migration permissive (accepte toute string
comme `currentOrganizationId`).

---

## 5. Multi-organisation

- **Cloisonnement local** : `ma-caisse/<orgId>/<collection>` (`store/tenantScope.ts`).
  Changer d'org redirige la persistance puis recharge l'état.
- **Tenant en mémoire** : `services/tenant.ts` (`activeOrganizationId`), écrit
  uniquement par `auth.ts`, remis à `null` au logout.
- **Rôles** : `owner | manager | cashier`.
- **Invitations** : `status === 'invited'` → `403 INVITATION_PENDING` ; acceptation
  explicite requise (RG-A14). `GET /auth/invitations` + `POST /auth/invitations/:orgId/accept`.
- **Pick d'org** : `pickOrganization()` (`store/auth.ts:85-89`) préfère l'org
  persistée si elle est toujours dans les memberships, sinon la première.

---

## 6. Codes d'erreur et réactions client

Source : `services/errorMessages.ts`, `services/adapters/mockApi.ts`, `API_CONTRACT.md` §2.

| Statut | Code | Sens | Réaction client |
|---|---|---|---|
| 400 | `EMAIL_CODE_MISSING`, `VALIDATION_ERROR` | requête incomplète | redemander un code / corriger le champ |
| 401 | `UNAUTHENTICATED` | cookie absent/expiré/invalide | déconnexion immédiate |
| 401 | `STEP_UP_REQUIRED` | action sensible, réauth < 5 min | modale step-up, **pas** de déconnexion |
| 401 | `INVALID_CREDENTIALS`, `INVALID_OTP`, `INVALID_EMAIL_CODE` | facteur invalide | message + compteur |
| 403 | `NOT_A_MEMBER` | aucune appartenance active | toast + retour à la caisse |
| 403 | `INSUFFICIENT_ROLE` | rôle insuffisant | toast + message dédié |
| 403 | `INVITATION_PENDING` | appartenance non acceptée | écran d'acceptation |
| 403 | `FORBIDDEN` | repli générique (à éviter) | toast + retour à la caisse |
| 404 | `NOT_FOUND` | ressource inexistante dans l'org | toast + rafraîchissement |
| 409 | `INSUFFICIENT_STOCK`, `DUPLICATE`, `CONFLICT` | état incompatible | toast + rechargement |
| 410 | `EXPIRED` | code expiré | demander un nouveau code |
| 422 | `VALIDATION_ERROR` | champs invalides | message par champ |
| 429 | `*_RATE_LIMITED`, `OTP_BUDGET_EXCEEDED` | trop de tentatives | `Retry-After`, attente |
| 5xx | — | panne serveur | message générique, rejouable |

Règle : `describeError` mappe d'abord par `code`, puis par `status`. Un message
métier fourni par le serveur (4xx) est conservé tel quel.

---

## 7. Règles métier (RG-A01 → RG-A29)

| # | Règle (court) | Appliquée dans |
|---|---|---|
| RG-A01 | Compte identifié par un numéro de téléphone vérifié, unique, E.164. | `domain/phone.ts`, `mockApi.ts:243-253` |
| RG-A02 | E-mail unique et vérifié ; Google rattaché après OTP. | `mockApi.ts` (signup/login) |
| RG-A03 | Encaissement impossible sans contact téléphonique (modale). | `features/ventes/PhoneRequiredModal.tsx`, `domain/sales.ts` |
| RG-A04 | Inscription 1 champ (tél.) ou 2 (e-mail+mdp) ; onboarding 2 étapes + checklist. | `features/auth/LoginScreen.tsx`, `features/onboarding/OnboardingModal.tsx` |
| RG-A05 | Essai 14 j à la création de l'org, jamais de réessai. | `mockApi.ts` (signup) |
| RG-A06 | (voir RG-A05) | — |
| RG-A07 | OTP 6 chiffres, TTL 5 min, 5 tentatives. | `mockApi.ts` (verifyPhoneCode) |
| RG-A08 | Canal WhatsApp, palier 1 (conversation initiée) 0 FCFA. | `AUTH_DECISIONS.md` §D2 |
| RG-A09 | Réponse constante (pas d'énumération de comptes). | `mockApi.ts` (login, requestPhoneCode) |
| RG-A10 | Rate limit 3/min/numéro. | `mockApi.ts` |
| RG-A11 | Verrouillage après 5 échecs / 15 min. | `mockApi.ts` (login) |
| RG-A12 | 401 déconnecte ; 403 ne déconnecte pas. | `store/auth.ts:151-159` |
| RG-A13 | Purge des données locales au logout. | `store/auth.ts:238-262`, `store/localData.ts` |
| RG-A14 | Invitation n'active rien tant qu'acceptée explicitement. | `mockApi.ts:277-287`, `store/auth.ts:112-114` |
| RG-A15 | PIN 4-6 chiffres, distinct du téléphone et des suites triviales. | `domain/pin.ts` |
| RG-A16 | 5 échecs PIN → verrouillage 15 min + notification owner. | `mockApi.ts:781-805` |
| RG-A17 | 3 appareils max, révocation par owner. | `mockApi.ts` (enroll/revoke) |
| RG-A18 | Step-up < 5 min pour actions sensibles. | `store/stepUp.ts` |
| RG-A19 | Journal des connexions 90 j. | `mockApi.ts` (events) |
| RG-A20 | 10 derniers événements exposés au titulaire. | `features/profil/ProfilModal.tsx` |
| RG-A21 | Anonymisation sous 30 j à la suppression de compte. | `mockApi.ts:607-625` |
| RG-A22 | Aucun secret dans les URLs/logs ; démo expose `demo1234`. | `mockApi.ts` |
| RG-A23 | SMS repli désactivé par défaut. | `AUTH_DECISIONS.md` §D2 |
| RG-A24 | Budget OTP 20/org/mois, plafond global, dégradation gracieuse. | `AUTH_DECISIONS.md` §7 |
| RG-A25 | (réservé) | — |
| RG-A26 | Mot de passe 12 car. min, liste noire. | `domain/password.ts` |
| RG-A27 | Vérification e-mail par code 6 chiffres, TTL 10 min, 5 essais, 3/h. | `mockApi.ts` (email verify) |
| RG-A28 | Grâce de 72 h non bloquante. | `types/index.ts:146-150` |
| RG-A29 | Politique de mot de passe (longueur + liste noire). | `domain/password.ts` |

---

## 8. Décisions D1–D9

| # | Décision |
|---|---|
| D1 | Session par cookie `HttpOnly` + refresh rotatif + CSRF ; `AuthResult` sans jeton. |
| D2 | OTP téléphone = identité principale (WhatsApp, 2 paliers de coût). Masqué par défaut (`VITE_AUTH_PHONE`). |
| D3 | Google = accélérateur (PKCE serveur), jamais méthode unique. |
| D4 | Mot de passe optionnel (12 car., liste noire) + reset par OTP. |
| D5 | Récupération par magic link (TTL 15 min) + délai 24 h. |
| D6 | PIN caissier + appareil enrôlé + verrouillage hors ligne. |
| D7 | Passkeys (opt-in, après récupération vérifiée). |
| D8 | Anti-bruteforce (`429` + `Retry-After`) + journal 90 j. |
| D9 | Step-up (réauth < 5 min) pour actions sensibles. |

---

## 9. Limites et quotas

| Limite | Valeur | Source |
|---|---|---|
| Budget OTP | 20/org/mois (alerte 80 %, `429 OTP_BUDGET_EXCEEDED` à 100 %) | `AUTH_DECISIONS.md` §7 |
| Plafond global mensuel | fixé par l'exploitant ; au-delà de 120 % → dégradation | `AUTH_DECISIONS.md` §7 |
| OTP par numéro | 3/min | `mockApi.ts` |
| Login | 5/15 min | `AUTH_DECISIONS.md` §D8 |
| Vérification e-mail | 3/adresse/heure, renvoi après 60 s | RG-A27 |
| Step-up | fenêtre de 5 min | D9 |
| Appareils par org | 3 max | RG-A17 |
| Échecs PIN | 5 → verrouillage 15 min | RG-A16 |
| Journal | 90 j (connexions), 10 derniers exposés | RG-A19/RG-A20 |

---

## 10. Sécurité

- **Cookie** : `HttpOnly`, `SameSite`, `Secure` en prod ; refresh rotatif.
- **CSRF** : en-tête `X-CSRF-Token` sur les mutations (`services/http/httpClient.ts`).
- **Aucun jeton en `localStorage`** : `useAuthStore` ne persiste plus `token`
  (migration `useAuthStore.ts:52-65` ignore tout `token` résiduel).
- **Hash** : Argon2id pour les mots de passe (prod) ; démo utilise un hash
  de démonstration.
- **Purge** : RG-A13 — aucune donnée métier ne survit au logout sur un poste partagé.
- **Multi-onglets (démo)** : la « session » mock est une clé unique par origine
  (`ma-caisse/mock-session`) ; en prod, le cookie est partagé et `GET /auth/me`
  revalide.
- **Poste partagé** : `logout()` purge tout ; `login()` ne réinitialise pas
  `currentOrganizationId` (héritage volontaire si l'org est encore valide).

---

## 11. Invariants client (à respecter côté serveur)

1. **Trois sources de vérité** : tenant (`services/tenant`), `useAuthStore.currentOrganizationId`,
   `useSessionStore.session` désignent toujours la même organisation.
2. **Activation atomique** : valider l'accès avant de basculer ; rollback en cas
   d'échec (S1).
3. **Revalidation** : `switchOrganization` revalide même pour l'espace courant (S3).
4. **403 ≠ déconnexion** : seul un 401 déconnecte (RG-A12, S4).
5. **Aucun jeton durable en `localStorage`**.
6. **Réponse constante** sur login/OTP/reset (RG-A09).
7. **Invitation n'active rien** tant qu'acceptée explicitement (RG-A14).

---

## 12. Écarts démo ↔ production (A1–A13)

Source : `docs/AUTH_REVIEW.md`.

| # | Écart | Statut |
|---|---|---|
| A1 | Jeton en `localStorage` | ✅ corrigé (D1) |
| A2 | Pas de refresh rotatif | 🟡 prod uniquement |
| A3 | Pas de CSRF | 🟡 prod uniquement |
| A4 | Migration du store auth | ✅ sans objet avec D1 |
| A5 | Google simulé | 🟡 prod = PKCE serveur |
| A6 | OTP téléphone simulé (code `000000`) | 🟡 compte WhatsApp Business à brancher |
| A7 | Mot de passe en clair en démo | ✅ RG-A22 |
| A8 | Profil éditable | ✅ front livré |
| A9 | `token` dans `partialize` | ✅ corrigé |
| A10 | 403 déconnecte | ✅ corrigé (S4) |
| A11 | Onboarding vide | ✅ corrigé (RG-A04) |
| A12 | 401 vs 403 | ✅ documenté + corrigé |
| A13 | Purge au logout | ✅ livré |

---

## 13. Endpoints (référence)

Source : `src/services/endpoints.ts`, `src/services/contracts.ts`.

### Auth
| Méthode | Route | Body | Réponse |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `AuthResult` |
| POST | `/auth/signup` | `SignupInput` | `AuthResult` |
| POST | `/auth/otp/request` | `{ phone }` | `PhoneChallenge` |
| POST | `/auth/otp/verify` | `{ challengeId, code }` | `AuthResult` |
| POST | `/auth/google` | `{ code (PKCE) }` | `AuthResult` |
| GET | `/auth/me` | — | `AuthResult` |
| POST | `/auth/logout` | — | `204` |
| POST | `/auth/step-up` | `{ password }` | `{ ok: true }` |
| GET | `/auth/events` | — | `AuthEvent[]` |
| POST | `/auth/password/reset/request` | `{ email }` | `PasswordResetChallenge` |
| POST | `/auth/password/reset/confirm` | `{ email, code, password }` | `void` |
| POST | `/auth/email/verify/request` | — | `EmailChallenge` |
| POST | `/auth/email/verify/confirm` | `{ code }` | `AuthResult` |
| PATCH | `/auth/me` | `ProfileInput` | `AuthResult` |
| POST | `/auth/password/change` | `{ currentPassword, password }` | `204` ou `401 STEP_UP_REQUIRED` |
| POST | `/auth/account/delete` | `{ password, confirmation }` | `void` |
| GET | `/auth/invitations` | — | `Invitation[]` |
| POST | `/auth/invitations/:orgId/accept` | — | `AuthResult` |
| GET | `/auth/demo-accounts` | — | `DemoAccount[]` (démo uniquement) |
| POST | `/auth/pin/verify` | `PinVerifyInput` | `{ ok: true }` |

### Organisation / session
| Méthode | Route | Body | Réponse |
|---|---|---|---|
| GET | `/orgs/:orgId/session` | — | `Session` |
| POST | `/orgs/:orgId/onboarding` | `OnboardingInput` | `BusinessProfile` |
| PATCH | `/orgs/:orgId/business` | `Partial<BusinessProfile>` | `BusinessProfile` |
| GET | `/orgs/:orgId/devices` | — | `Device[]` |
| POST | `/orgs/:orgId/devices` | `EnrollDeviceInput` | `DeviceEnrollment` |
| DELETE | `/orgs/:orgId/devices/:deviceId` | — | `void` |
| POST | `/orgs/:orgId/members/:userId/pin` | `{ pin }` | `void` |
| GET | `/orgs/:orgId/members` | — | `TeamMember[]` |
| POST | `/orgs/:orgId/members` | `InviteMemberInput` | `TeamMember` |
| PATCH | `/orgs/:orgId/members/:userId` | `{ role }` | `TeamMember` |
| DELETE | `/orgs/:orgId/members/:userId` | — | `void` |

---

## 14. Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/types/index.ts` | Types (modèle de données) |
| `src/services/contracts.ts` | Interface `Api` (contrat dépôt) |
| `src/services/endpoints.ts` | Routes REST |
| `src/services/adapters/mockApi.ts` | Serveur de référence (spécification exécutable) |
| `src/services/adapters/httpApi.ts` | Adaptateur backend réel |
| `src/services/http/httpClient.ts` | Transport (cookie, CSRF, erreurs) |
| `src/services/errorMessages.ts` | Traduction erreur → message utilisateur |
| `src/services/tenant.ts` | Tenant en mémoire |
| `src/store/auth.ts` | Orchestration auth/org |
| `src/store/useAuthStore.ts` | Store persisté (user, memberships, org courante) |
| `src/store/useSessionStore.ts` | Session courante (status, session, error) |
| `src/store/tenantScope.ts` | Cloisonnement des données par org |
| `src/store/stepUp.ts` | Step-up (D9) |
| `src/domain/permissions.ts` | Matrice rôles |
| `src/domain/phone.ts` | Normalisation E.164 |
| `src/domain/password.ts` | Politique mot de passe |
| `src/domain/pin.ts` | Validation PIN |
| `src/content/fr.ts` | Textes (messages d'erreur, notifications) |
| `docs/AUTH_DECISIONS.md` | Normatif : D1–D9, RG-A01–RG-A29 |
| `docs/AUTH_REVIEW.md` | Revue d'authentification, écarts A1–A13 |
| `docs/API_CONTRACT.md` | Contrat API (routes, types, erreurs) |

---

*Document généré à partir du code et des docs existants. Toute modification du
comportement d'auth doit mettre à jour ce fichier et `AUTH_DECISIONS.md`.*
