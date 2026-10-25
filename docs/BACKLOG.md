# Backlog par fonction

Tout le reste à faire est regroupé en **8 jalons GitHub**, un par fonction de
l'application. Chaque issue appartient à **un seul** jalon : pas de doublon, pas
d'issue orpheline (25 issues → 8 jalons).

Sources : [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md) (constats C1, M*, m*),
[`AUTH_REVIEW.md`](AUTH_REVIEW.md) (A1–A10),
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

**Fini quand** aucun stock négatif n'est possible et qu'aucun montant décimal ou
négatif n'entre en état.

---

## 3. Crédits clients

**Objectif** — le carnet de créances reflète exactement les ventes à crédit.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#8](https://github.com/digitaleflex/macaisse/issues/8) | Toast de règlement = montant réellement imputé | P1 | S | front |
| [#14](https://github.com/digitaleflex/macaisse/issues/14) | Notification des échéances de crédit | P2 | M | front |

**Fini quand** chaque mouvement annoncé correspond au mouvement réel, et qu'une
échéance dépassée produit une alerte unique.

---

## 4. Comptabilité & export

**Objectif** — l'export est le reflet exact de ce que l'utilisateur voit.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#9](https://github.com/digitaleflex/macaisse/issues/9) | Respecter la période + dater en heure locale | P1 | S/M | front |

**Fini quand** un export déclenché depuis un bilan filtré ne contient que la
période affichée, avec un nom de fichier en heure locale.

---

## 5. Équipe & comptes

**Objectif** — les accès se donnent et se retirent explicitement.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#5](https://github.com/digitaleflex/macaisse/issues/5) | Confirmation avant suppression (+ `ConfirmDialog`) | P1 | S/M | front |
| [#20](https://github.com/digitaleflex/macaisse/issues/20) | Cycle de vie des invitations (jeton, expiration, `status`) | P1 | M | contrat |
| [#24](https://github.com/digitaleflex/macaisse/issues/24) | Édition de profil et suppression de compte | P2 | M | backend |

**Fini quand** une invitation ne donne accès qu'après acceptation explicite, et
qu'un compte peut être corrigé ou supprimé (RGPD).

> **#20 est corrigeable en mock dès maintenant** : `requireMembership` doit
> exiger `status === 'active'` et la connexion ne doit plus activer toutes les
> invitations d'un utilisateur.

---

## 6. Authentification & sécurité

**Objectif** — une session volée expire, un mot de passe perdu se récupère, les
codes d'erreur sont respectés.

| # | Sujet | Prio | Effort | Dépend |
|---|---|---|---|---|
| [#25](https://github.com/digitaleflex/macaisse/issues/25) | Contrat d'auth (401 vs 403, `expiresAt`, mot de passe) | **P0** | S | doc |
| [#4](https://github.com/digitaleflex/macaisse/issues/4) | Durcir la migration du store auth | P2 | S | front |
| [#10](https://github.com/digitaleflex/macaisse/issues/10) | Ne plus afficher un succès quand le chargement échoue | P1 | S | front |
| [#19](https://github.com/digitaleflex/macaisse/issues/19) | Jeton court, refresh `httpOnly`, `expiresAt` | **P0** | M | #25 + #1 |
| [#21](https://github.com/digitaleflex/macaisse/issues/21) | Mot de passe oublié + vérification d'e-mail | P1 | M/L | backend |
| [#22](https://github.com/digitaleflex/macaisse/issues/22) | Anti-bruteforce + journal de connexion | P1 | M | backend |
| [#23](https://github.com/digitaleflex/macaisse/issues/23) | Purge des données locales au logout | P1 | S/M | front |

**Fini quand** aucun jeton durable ne traîne en `localStorage`, qu'un `403` ne
déconnecte pas, et qu'un poste partagé ne laisse aucune donnée métier derrière.

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

**Fini quand** aucun formulaire n'échoue sans message, qu'aucun code inutilisé
n'est livré, et que la déconnexion ne laisse pas de panier derrière elle.

---

## Ordre de traitement conseillé

```
1. #25 (contrat auth)            — débloque le jalon 6
2. #3, #7, #6, #11               — petits gains front, aucune dépendance
3. #20 (statut d'invitation)     — bug d'accès réel, corrigeable en mock
4. #5, #8, #9, #10, #23          — fiabilité perçue
5. #1 + #19                      — dès que le backend répond (P0 liés)
6. #2, #4, #12, #13, #14, #24    — dette et compléments
7. #15, #16, #17, #18            — roadmap produit
```

**Règle de gestion** : on ferme un jalon avant d'en ouvrir deux nouveaux ; une
issue fermée sans test (ou sans mise à jour de `docs/`) n'est pas « terminée ».
