# Revue d'authentification — Ma Caisse

État audité : `main` (après les lots 1–3 du plan d'audit).
Périmètre : connexion, inscription, reprise de session, multi-organisation,
rôles, invitations, déconnexion.

Voir aussi : [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md),
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
| A1 | **critique** | Jeton en `localStorage`, sans TTL, sans refresh ni `httpOnly` → vol par XSS valable indéfiniment | `store/useAuthStore.ts` (`persist`) | [#19](https://github.com/digitaleflex/macaisse/issues/19) |
| A2 | **critique (mock)** | La connexion active **toutes** les invitations en attente ; `requireMembership` ignore `status` | `adapters/mockApi.ts:139-145,189` | [#20](https://github.com/digitaleflex/macaisse/issues/20) |
| A3 | majeur | Pas de mot de passe oublié, pas de vérification d'e-mail, pas de MFA ; mot de passe = 8 caractères côté client | `features/auth/LoginScreen.tsx:26` | [#21](https://github.com/digitaleflex/macaisse/issues/21) |
| A4 | majeur | Aucune limitation des tentatives, aucun journal de connexion | absent | [#22](https://github.com/digitaleflex/macaisse/issues/22) |
| A5 | majeur | Invitations sans jeton signé, sans expiration, sans refus | `types/index.ts` (`status`) | [#20](https://github.com/digitaleflex/macaisse/issues/20) |
| A6 | majeur | `logout()` laisse toutes les collections métier en `localStorage` (poste partagé) | `store/auth.ts` | [#23](https://github.com/digitaleflex/macaisse/issues/23) |
| A7 | mineur | Échec d'activation : l'appelant affiche quand même un succès | `store/auth.ts:55-58` | [#10](https://github.com/digitaleflex/macaisse/issues/10) |
| A8 | mineur | Profil non éditable, pas de suppression de compte | `AuthRepository` | [#24](https://github.com/digitaleflex/macaisse/issues/24) |
| A9 | mineur | Migration du store auth sans coercition (jeton/profil arbitraires) | `store/useAuthStore.ts:33,40` | [#4](https://github.com/digitaleflex/macaisse/issues/4) |
| A10 | mineur | `403` traité comme une session expirée à la reprise | `restoreSession` | [#25](https://github.com/digitaleflex/macaisse/issues/25) |

---

## 4. Décisions à verrouiller avec le backend

1. **Transport** : access token court en mémoire + refresh en cookie
   `httpOnly/ Secure/ SameSite=Strict`, ou session cookie complète (⇒ CSRF).
   Ce choix conditionne la réconciliation des mutations (#1).
2. **Durée de vie** : access 15 min / refresh 30 j rotatif, ou session
   glissante ; exposer `expiresAt` dans `AuthResult`.
3. **Invitations** : route dédiée, jeton signé, expiration 7 j, acceptation
   explicite, `status` vérifié à chaque requête.
4. **Vérification d'e-mail** : obligatoire à l'inscription ou différée ?
5. **Mot de passe** : longueur minimale serveur (12), liste noire, pas de
   complexité imposée (recommandation NIST/ANSSI).
6. **Anti-bruteforce** : `429` + `Retry-After` sur `/auth/login`, verrouillage
   progressif par e-mail et par IP.
7. **`401` vs `403`** : 401 = jeton invalide/expiré → déconnexion ; 403 = jeton
   valide mais non autorisé → message, **pas** de déconnexion.

À écrire dans [`API_CONTRACT.md`](API_CONTRACT.md) avant implémentation
(issue [#25](https://github.com/digitaleflex/macaisse/issues/25)).

---

## 5. Ordre conseillé

1. **#25** (contrat) — débloque tout le reste.
2. **#19** (jeton/refresh) — avec **#1** (réconciliation `http`).
3. **#20** (invitations) — bug d'accès réel, corrigeable en mock avant le backend.
4. **#23** (purge locale) et **#22** (anti-bruteforce) — exploitation.
5. **#21** (reset/vérification) puis **#24** (profil/suppression RGPD).
