# Backlog par fonction

Tout le reste à faire est regroupé en **8 jalons GitHub**, un par fonction de
l'application. Chaque issue appartient à **un seul** jalon : pas de doublon, pas
d'issue orpheline (25 issues → 8 jalons).

Sources : [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md) (constats C1, M*, m*),
[`AUTH_REVIEW.md`](AUTH_REVIEW.md) (A1–A13),
[`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) (D1–D9, RG-A01–RG-A29),
[`FEATURES_INVENTORY.md`](FEATURES_INVENTORY.md) (manques produit).

Légende : **P0** bloquant · **P1** fiabilité/exploitation · **P2** dette · **R** roadmap.
`backend` = nécessite l'API ; `front` = faisable immédiatement.

| Jalon | Issues | État |
|---|---|---|
| **1. Caisse & encaissement** | 3 | [milestone](https://github.com/digitaleflex/macaisse/milestone/1) |
| **2. Stock & catalogue** | 2 | [milestone](https://github.com/digitaleflex/macaisse/milestone/2) |
| **3. Crédits clients** | 2 | [milestone](https://github.com/digitaleflex/macaisse/milestone/3) |
| **4. Comptabilité & export** | 1 | [milestone](https://github.com/digitaleflex/macaisse/milestone/4) |
| **5. Équipe & comptes** | 3 | [milestone](https://github.com/digitaleflex/macaisse/milestone/5) |
| **6. Authentification & sécurité** | 7 | [milestone](https://github.com/digitaleflex/macaisse/milestone/6) |
| **7. Synchronisation & contrat API** | 3 | [milestone](https://github.com/digitaleflex/macaisse/milestone/7) |
| **8. Qualité transverse** | 4 | [milestone](https://github.com/digitaleflex/macaisse/milestone/8) |

---

## 1. Caisse & encaissement

**Objectif** — le parcours de vente est complet, imprimable et réversible.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#15](https://github.com/digitaleflex/macaisse/issues/15) | Impression réelle du ticket | R | M/L | cible thermique |
| [#16](https://github.com/digitaleflex/macaisse/issues/16) | Scan de code-barres réel | R | M | champ produit |
| [#18](https://github.com/digitaleflex/macaisse/issues/18) | Annulation / remboursement d'une vente | R | M/L | contrat API |

**Fini quand** une vente se scanne, s'encaisse, s'imprime et peut être annulée
avec réintégration du stock et trace d'audit.

---

## 2. Stock & catalogue

**Objectif** — un seul chemin d'écriture du stock, des montants toujours valides.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#3](https://github.com/digitaleflex/macaisse/issues/3) | Supprimer `decrementStock` (code mort contraire à l'invariant) | P2 | S | front |
| [#7](https://github.com/digitaleflex/macaisse/issues/7) | Montants FCFA entiers et positifs à la saisie | P1 | S | front |

✅ **#7 livré** — `domain/validation.ts` + `min`/`step` sur les champs : aucun
montant décimal ou négatif ne peut être persisté (12 tests). #3 reste ouvert.

**Fini quand** aucun stock négatif n'est possible et qu'aucun montant décimal ou
négatif n'entre en état.

---

## 3. Crédits clients

**Objectif** — le carnet de créances reflète exactement les ventes à crédit.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#8](https://github.com/digitaleflex/macaisse/issues/8) | Toast de règlement = montant réellement imputé | P1 | S | front |
| [#14](https://github.com/digitaleflex/macaisse/issues/14) | Notification des échéances de crédit | P2 | M | front |

✅ **#8 livré** — `appliedPaymentAmount()` (domaine) : le toast annonce le
montant imputé et signale l'écrêtage (3 tests). #14 reste ouvert.

**Fini quand** chaque mouvement annoncé correspond au mouvement réel, et qu'une
échéance dépassée produit une alerte unique.

---

## 4. Comptabilité & export

**Objectif** — l'export est le reflet exact de ce que l'utilisateur voit.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#9](https://github.com/digitaleflex/macaisse/issues/9) | Respecter la période + dater en heure locale | P1 | S/M | front |

✅ **Livré** — `buildAccountingRows(sales, expenses, filterType, { from, to })`,
période appliquée avant le filtre de type, sélecteur 7 j / 30 j / tout dans la
modale, nom de fichier en date locale, 6 tests dédiés.

---

## 5. Équipe & comptes

**Objectif** — les accès se donnent et se retirent explicitement.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#5](https://github.com/digitaleflex/macaisse/issues/5) | Confirmation avant suppression (+ `ConfirmDialog`) | P1 | S/M | front |
| [#20](https://github.com/digitaleflex/macaisse/issues/20) | Cycle de vie des invitations (jeton, expiration, `status`) | P1 | M | contrat |
| [#24](https://github.com/digitaleflex/macaisse/issues/24) | Édition de profil et suppression de compte | P2 | M | backend |

✅ **#20 livré (partie front/mock)** — `requireMembership` exige
`status === 'active'` (`403 INVITATION_PENDING`), la connexion n'active plus
rien, `GET /auth/invitations` + `POST /auth/invitations/:orgId/accept` sont
implémentés (mock + http), et le sélecteur d'espace affiche les invitations à
accepter. Restent côté backend : jeton signé, expiration 7 j, révocation, e-mail.

**Fini quand** une invitation ne donne accès qu'après acceptation explicite, et
qu'un compte peut être corrigé ou supprimé (RGPD).

---

## 6. Authentification & sécurité

**Objectif** — une session volée expire, un compte perdu se récupère, la caisse
fonctionne hors ligne, et un poste partagé ne laisse rien derrière lui.
Décisions et règles : [`AUTH_DECISIONS.md`](AUTH_DECISIONS.md) (D1–D9,
RG-A01–RG-A29).

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#25](https://github.com/digitaleflex/macaisse/issues/25) | Contrat d'auth : §2 d'`API_CONTRACT.md` + `AUTH_DECISIONS` | **P0** | S | doc |
| [#19](https://github.com/digitaleflex/macaisse/issues/19) | **D1** session cookie `HttpOnly` + refresh rotatif + CSRF + `AuthResult` sans jeton | **P0** | M | #25 + #1 |
| à ouvrir | **D3** Google (démo livrée) : production = ID client Google + échange PKCE serveur, rattachement e-mail ↔ téléphone | P1 | S/M | #19 |
| à ouvrir | **D2 palier 1** OTP WhatsApp **conversation initiée** (0 FCFA) : `/auth/otp/*`, quotas, non-révélation | **P0** | L | #19, numéro WhatsApp + lien `wa.me` |
| à ouvrir | **D4** mot de passe optionnel (12 car., liste noire) + reset par OTP | P1 | M | D2 |
| à ouvrir | **RG-A27/A28** vérification e-mail : OTP 10 min, grâce de 72 h non bloquante — **front livré en démo** | P1 | S | backend e-mail |
| à ouvrir | **RG-A04** onboarding 3 étapes + états vides actionnables | P1 | M | front |
| [#23](https://github.com/digitaleflex/macaisse/issues/23) | **RG-A13** purge des collections locales au logout | P1 | S/M | front |
| à ouvrir | **D6** PIN caissier + appareil enrôlé + écran de verrouillage | P1 | L | #19, #17 |
| [#21](https://github.com/digitaleflex/macaisse/issues/21) | Remplacé par D2/D4 (conserver l'issue comme suivi de migration) | P1 | M/L | D2 |
| [#22](https://github.com/digitaleflex/macaisse/issues/22) | **D8** anti-bruteforce (`429` + `Retry-After`) + journal 90 j | P1 | M | D1 |
| à ouvrir | **D9** step-up sur actions sensibles (`401 STEP_UP_REQUIRED`) | P2 | S/M | D1 |
| à ouvrir | **D7** passkeys (opt-in, après récupération vérifiée) | P3 | M | D3 |
| [#4](https://github.com/digitaleflex/macaisse/issues/4) | Durcir la migration du store auth (devient sans objet avec D1) | P2 | S | front |
| [#10](https://github.com/digitaleflex/macaisse/issues/10) | Ne plus afficher un succès quand le chargement échoue | ✅ livré | S | front |

✅ **#10 livré** — `switchOrganization`/`reloadOrganization` renvoient un booléen,
les toasts suivent le résultat (4 tests de session). #23 (purge complète) reste
ouvert.

**Fini quand** aucun jeton durable ne traîne en `localStorage`, qu'un compte se
récupère sans support, qu'un caissier ouvre la caisse **sans réseau**, et qu'un
`403` ne déconnecte pas.

---

## 7. Synchronisation & contrat API

**Objectif** — un échec serveur ne peut plus laisser l'interface mentir.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#1](https://github.com/digitaleflex/macaisse/issues/1) | Réconcilier les mutations optimistes (retry/rollback) | **P0** | M | backend |
| [#2](https://github.com/digitaleflex/macaisse/issues/2) | Parité mock/http + gardes de rôle du mock | P2 | M | front |
| [#17](https://github.com/digitaleflex/macaisse/issues/17) | Mode hors ligne réel (PWA + file) | R | L | #1 |

**Fini quand** une vente refusée ne laisse aucune trace, qu'un écart de contrat
est détecté par un test, et que le hors ligne rejoue ses mutations sans doublon.

---

## 8. Qualité transverse

**Objectif** — plus rien de silencieux, plus de code mort.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#6](https://github.com/digitaleflex/macaisse/issues/6) | Validations de formulaire visibles | P1 | S | front |
| [#11](https://github.com/digitaleflex/macaisse/issues/11) | Vider le panier à la déconnexion | P1 | S | front |
| [#12](https://github.com/digitaleflex/macaisse/issues/12) | Retirer le module IA mort + nettoyer le template | P2 | S | front |
| [#13](https://github.com/digitaleflex/macaisse/issues/13) | Unifier le mot de passe de démonstration | P2 | S | front |

✅ **#6 et #11 livrés** — `domain/validation.ts` (codes traduits par
`t.validation`) affiché via `FormError` dans les 4 formulaires ; `logout()` vide
le panier (5 tests de session). #12 et #13 restent ouverts.

**Fini quand** aucun formulaire n'échoue sans message, qu'aucun code inutilisé
n'est livré, et que la déconnexion ne laisse pas de panier derrière elle.

---

## Ordre de traitement conseillé

```
1. #25 (contrat auth)            — débloque le jalon 6 (API_CONTRACT §2 + AUTH_DECISIONS)
2. #19 (D1 cookie + refresh)     — prérequis de tout le reste en auth
3. #3, #7, #6, #11               — petits gains front, aucune dépendance
4. D3 (Google, ✅ démo) → onboarding RG-A04 → D2 palier 1 (0 FCFA) → #23 (purge)
5. #20 (statut d'invitation)     — bug d'accès réel, corrigeable en mock
6. #5, #9, #10                   — fiabilité perçue
7. D6 (PIN + appareil enrôlé)    — avec #17 (hors ligne), puis #22/D8, D3, D9, D7
8. #1, #2, #4, #12, #13, #14, #24 — réconciliation http et dette
9. #15, #16, #18                 — roadmap produit
```

**Règle de gestion** : on ferme un jalon avant d'en ouvrir deux nouveaux ; une
issue fermée sans test (ou sans mise à jour de `docs/`) n'est pas « terminée ».
