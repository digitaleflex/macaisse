# Revue d'authentification — Ma Caisse

État audité : `main` (après les lots 1–3 du plan d'audit).
Périmètre : connexion, inscription, reprise de session, multi-organisation,
rôles, invitations, déconnexion.

Voir aussi : [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) (**décisions
normatives D1–D9 et règles RG-A01–RG-A29**, priment sur ce document),
[`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md),
[`API_CONTRACT.md`](API_CONTRACT.md) (routes d'auth).

---

## 1. Flux réel

```
LoginScreen ──login()──► api.auth.login ──► setAuthToken(jeton) + setAuth(membres)
   └─► pickOrganization() ─► activateOrganization(orgId)
                              ├─ setActiveOrganization(orgId)
                              ├─ scopeStoresToOrganization()   (cloisonnement local)
                              ├─ api.session.get(orgId)        (rôle + commerce)
                              ├─ loadCollections()             (http uniquement)
                              └─ setSession() → shell

Démarrage : restoreSession() ─► api.auth.me() ─► même activation
401/403 ─► logout()   ·   erreur réseau ─► écran d'erreur + « Réessayer »
```

| Brique | État | Preuve |
|---|---|---|
| Connexion / inscription / reprise / logout | ✔ fonctionnel | `store/auth.ts` |
| Multi-organisation + rôle par organisation | ✔ | `pickOrganization`, `Membership.role` |
| Cloisonnement des données par organisation | ✔ | `store/tenantScope.ts` |
| Jeton injecté sur chaque requête | ✔ | `services/tenant.ts`, `http/httpClient.ts` |
| `401` → déconnexion | ✔ (activation et reprise) | `store/auth.ts` |
| Messages d'erreur non révélateurs | ✔ « identifiants invalides » | `adapters/mockApi.ts:187` |
| Masquage des actions par rôle | ✔ côté UI **seulement** | `domain/permissions.ts`, `App.tsx` |

---

## 2. Spécifique à la démonstration (jamais en production)

| Élément | Réalité |
|---|---|
| Jeton | `mock.<userId>` — **prévisible** (`adapters/mockApi.ts:52,121`) |
| Mots de passe | En clair dans `localStorage` (`ma-caisse/mock-auth-db`), comparés par `!==` |
| `demoAccounts()` | Renvoie les mots de passe (vide en `http` ✔) |
| Invitation | Crée un compte avec `DEMO_PASSWORD`, toast affichant le mot de passe |

---

## 3. Écarts production

| # | Sévérité | Constat | Preuve | Issue |
|---|---|---|---|---|
| A1 | **critique** | Jeton en `localStorage`, sans TTL, sans refresh ni `httpOnly` → vol par XSS valable indéfiniment | `store/useAuthStore.ts` (`persist`) | **décidé D1** — cookie `HttpOnly` + refresh rotatif |
| A2 | ~~critique~~ ✅ **corrigé** | La connexion n'active plus rien ; `requireMembership` exige `status === 'active'` (sinon `403 INVITATION_PENDING`) ; acceptation explicite via `POST /auth/invitations/:orgId/accept` | `adapters/mockApi.ts`, `store/auth.ts` | [#20](https://github.com/digitaleflex/macaisse/issues/20) fermée |
| A3 | 🟡 **partiel** | Vérification d'e-mail **livrée** en démo (OTP 10 min, grâce 72 h) et mot de passe porté à 12 caractères avec liste noire ; restent le **mot de passe oublié** (D4) et la MFA | `features/auth/VerifyEmailBanner.tsx`, `domain/password.ts` | **D4/backend** |
| A4 | majeur | Aucune limitation des tentatives, aucun journal de connexion | absent | **décidé D8** — RG-A19, RG-A20 |
| A5 | 🟡 **partiel** | Statut vérifié et acceptation explicite ✔ ; restent le jeton signé, l'expiration et la révocation côté serveur | `types/index.ts` (`Invitation`) | [#20](https://github.com/digitaleflex/macaisse/issues/20) (suite backend) |
| A6 | majeur | `logout()` laisse toutes les collections métier en `localStorage` (poste partagé) | `store/auth.ts` | **décidé RG-A13** — purge obligatoire à la déconnexion |
| A7 | ~~mineur~~ ✅ **corrigé** | `activateOrganization`/`switchOrganization`/`reloadOrganization` renvoient un booléen ; les toasts suivent le résultat | `store/auth.ts` | [#10](https://github.com/digitaleflex/macaisse/issues/10) fermée |
| A8 | mineur | Profil non éditable, pas de suppression de compte | `AuthRepository` | [#24](https://github.com/digitaleflex/macaisse/issues/24) |
| A9 | mineur | Migration du store auth sans coercition (jeton/profil arbitraires) | `store/useAuthStore.ts:33,40` | [#4](https://github.com/digitaleflex/macaisse/issues/4) ; disparaît avec D1 (plus de jeton persisté) |
| A10 | mineur | `403` traité comme une session expirée à la reprise | `restoreSession` | **décidé RG-A12** — `403` et `STEP_UP_REQUIRED` ne déconnectent pas |
| A11 | ~~majeur (UX)~~ ✅ **corrigé** | `autoComplete` renseigné sur les deux formulaires (gestionnaires de mots de passe, saisie assistée) | `features/auth/LoginScreen.tsx` | livré |
| A12 | 🟡 **partiel** | Mot de passe **affichable** et minimum porté à **12 caractères** avec consigne ; la récupération par OTP reste à livrer (D4) | `features/auth/LoginScreen.tsx`, `content/fr.ts` | D4 / [#21](https://github.com/digitaleflex/macaisse/issues/21) |
| A13 | ~~majeur (UX)~~ ✅ **corrigé** | Après inscription, l'espace n'est plus vide : onboarding en 2 étapes (nom du commerce, coordonnées) + checklist de démarrage actionnable et états vides qui créent un article | `features/onboarding/OnboardingModal.tsx`, `features/accueil/SetupChecklist.tsx` | livré |

---

## 4. Décisions arrêtées

Les questions ouvertes de la version précédente de cette section sont
**tranchées** dans [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) (statut : arrêté le
2026-10-25, normatif) :

| Question précédente | Décision | Réf. |
|---|---|---|
| Transport : access court + refresh cookie, ou session cookie complète ? | Session **cookie `HttpOnly`** + access 15 min + refresh rotatif, CSRF obligatoire | D1, RG-A10 |
| Durée de vie | 30 j glissant / 90 j absolu (personnel) ; 90 j / 180 j (appareil enrôlé) | RG-A11 |
| Invitations | Inchangé : jeton signé, 7 j, acceptation explicite | [API_CONTRACT](API_CONTRACT.md) |
| Vérification d'e-mail obligatoire ? | **Différée** : OTP 6 chiffres (TTL 10 min), le compte reste utilisable, seules les fonctions e-mail sont bloquées après **72 h** | RG-A27, RG-A28 |
| Politique de mot de passe | Optionnel, **12 caractères**, liste noire, sans complexité imposée | D4 |
| Anti-bruteforce | `429` + `Retry-After`, quotas par identifiant et par IP, journal 90 j | D8, RG-A19/RG-A20 |
| `401` vs `403` | `401 UNAUTHENTICATED` déconnecte · `401 STEP_UP_REQUIRED` et `403` ne déconnectent pas | RG-A12 |

Ce qui reste **ouvert** : le stockage du hash de PIN pour le mode hors ligne
(D6) et la date d'ouverture de D7 (passkeys). Le canal OTP **est tranché** :
WhatsApp Cloud API par défaut, SMS en repli plafonné, budget borné
(`AUTH_DECISIONS.md` §7, RG-A23/RG-A24).

---

## 5. Ordre conseillé

Aligné sur [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) §6 :

1. **Contrat** — ce document + §2 de `API_CONTRACT.md` (débloque tout).
2. **D1** session cookie + CSRF + `AuthResult` sans jeton (avec #1 réconciliation).
3. **D2/D4** OTP téléphone, mot de passe optionnel, purge locale (RG-A13).
4. **Onboarding** 3 étapes + états vides (RG-A04).
5. **D6** PIN + appareil enrôlé (indispensable au hors ligne #17).
6. **D3** Google, puis **D8/D9** journal + step-up, puis **D7** passkeys.
