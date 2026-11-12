---
title: "Ma Caisse — Écarts entre le frontend et le cahier des charges"
subtitle: "Document à destination de l'équipe projet"
lang: fr
---

# 1. Objet

Ce document vérifie le **frontend actuel** exigence par exigence par rapport au cahier des charges
*ma_caisse* v0.1 (EF-01 à EF-37, RG-01 à RG-09, critères d'acceptation de la section 7), et liste
**ce qui manque** pour atteindre le périmètre V1.

Il complète le document `01-ecarts-backend-schema` (écarts du schéma de données).

**Légende** : ✅ conforme · ◐ partiel ou simulé · ❌ absent.

> Méthode : lecture du code (`src/`), de `docs/FEATURES_INVENTORY.md` et de `docs/BACKLOG.md`.
> L'inventaire contient des passages périmés (jeton Bearer, hors-ligne « absent ») ; en cas de
> divergence, c'est le code qui fait foi. Le frontend tourne aujourd'hui en mode `mock` : ses
> données sont locales, le mode `http` n'a pas été éprouvé contre un vrai serveur.

# 2. Synthèse

| Module (CDC §4) | Exigences | État |
|---|---|---|
| 4.1 Comptes et boutiques | EF-01 à 03 | ✅ |
| 4.2 Équipe, rôles, permissions | EF-04 ✅ — EF-05 ❌ — EF-06 ◐ | ◐ |
| 4.3 Catalogue | EF-07 ◐ — EF-08 ❌ | ◐ |
| 4.4 Ventes et paiements | EF-09 à 11 ✅ — EF-12 ◐ — EF-13 ✅ | ◐ |
| 4.5 Annulation des ventes | EF-14 à 17 ✅ | ✅ |
| 4.6 Stock | EF-18 à 20 ✅ | ✅ |
| 4.7 Crédits | EF-21 à 23, 25 ✅ — EF-24 ◐ | ◐ |
| 4.8 Clients | EF-26, 27 ❌ — EF-28 ✅ | ◐ |
| 4.9 Dépenses | EF-29, 30 ◐ | ◐ |
| 4.10 Rapports | EF-31, 33, 34, 35 ◐ — EF-32 ❌ | ◐ |
| 4.11 Journal d'audit | EF-36 | ❌ |
| 4.12 Abonnements | EF-37 ◐ | ◐ |

**6 exigences absentes, 11 partielles, 20 conformes** (sur 37) — *mis à jour après les lots L1 (annulation),
L2 (historique) et L3 (journal de stock). Le détail ci-dessous décrit l'état d'origine pour les
exigences non encore traitées ; les lignes passées à ✅ portent la mention « Livré ».*

# 3. Détail par exigence

## 4.1 Comptes et boutiques

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-01 | Créer un compte et se connecter | ✅ | Inscription e-mail + mot de passe, Google (simulé), OTP téléphone présent mais masqué (`VITE_AUTH_PHONE`). |
| EF-02 | Créer une ou plusieurs boutiques | ✅ | Onboarding en 2 étapes ; le créateur devient propriétaire. |
| EF-03 | Choisir la boutique de travail | ✅ | Sélecteur d'organisation, données cloisonnées par boutique. |

## 4.2 Équipe, rôles, permissions

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-04 | Ajouter des membres | ✅ | Invitation avec rôle, acceptation explicite, statut « invité ». |
| EF-05 | Créer / modifier / supprimer des rôles avec leurs permissions | ❌ | Seulement 3 rôles fixes (`owner`, `manager`, `cashier`) et 11 permissions codées en dur (`src/domain/permissions.ts`). Aucun écran de gestion des rôles. |
| EF-06 | Permissions contrôlées par rôle | ◐ | Masquage de l'interface correct ; l'application côté serveur dépend du backend. |

## 4.3 Catalogue

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-07 | Gérer les produits (nom, prix de vente, prix d'achat, quantité, seuil) | ◐ | Tout est présent. La **catégorie est limitée à 4 valeurs fixes** (Frais, Épicerie, Boissons, Hygiène). |
| EF-08 | Désactiver un produit sans le supprimer | ❌ | Le bouton supprime réellement le produit (`removeProduct` → `DELETE`). Contredit RG-07 : l'historique des ventes perd son lien. |

## 4.4 Ventes et paiements

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-09 | Vente par sélection de produits et quantités | ✅ | Panier, totaux, refus si stock insuffisant. |
| EF-10 | Mode de paiement, total ou partiel | ✅ | 5 modes, montant reçu, monnaie, reste dû. |
| EF-11 | Vente « à crédit » → crédit créé automatiquement | ✅ | Le crédit naît de la vente dans le même mouvement. |
| EF-12 | Reçu ou facture imprimable | ◐ | Le reçu s'affiche, mais **« Imprimer » n'appelle pas `window.print()`** (toast simulé) ; aucune feuille de style d'impression. Le partage WhatsApp est aussi simulé. Critère d'acceptation §7 non satisfait. |
| EF-13 | Historique filtrable (période, vendeur, statut) | ✅ | **Livré (L2).** Onglet Caisse → Historique : période, vendeur, statut, recherche ticket ou client, regroupement par jour. Filtrage local ; le serveur devra filtrer et paginer. |

## 4.5 Annulation des ventes

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-14 | Une vente ne peut être ni supprimée ni modifiée | ✅ | Aucun écran ni route de modification ou de suppression ; seule l'annulation existe (L1). Le serveur doit refuser toute modification. |
| EF-15 | Annulation avec motif, auteur, date et heure obligatoires | ✅ | **Livré (L1).** Motif de 3 caractères minimum, auteur, date et heure conservés sur la vente. |
| EF-16 | Annulation : stock remis, crédit lié traité | ✅ | **Livré (L1).** Stock remis, crédit lié supprimé ; annulation **bloquée** si le crédit a déjà reçu un remboursement (variante « soumise au propriétaire » non faite). |
| EF-17 | Corriger = annuler puis ressaisir | ✅ | Possible depuis L1. |

## 4.6 Stock

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-18 | Le stock baisse à la vente et remonte à l'annulation | ✅ | Baisse à la vente avec refus si insuffisant ; retour en stock à l'annulation, tracé au journal. |
| EF-19 | Ajustement manuel avec **trace** | ✅ | **Livré (L3).** Écart d'inventaire et casse avec motif obligatoire, inventaire réel (comptage, écarts valorisés, tout ou rien), historique par produit et journal complet. La fiche produit ne modifie plus le stock. Reste : transaction côté serveur. |
| EF-20 | Alerte stock bas / rupture | ✅ | Seuil par produit, alertes sur l'accueil et notifications. |

## 4.7 Crédits

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-21 | Un crédit = somme due par un client | ✅ | |
| EF-22 | Créé depuis une vente ou saisi directement | ✅ | |
| EF-23 | Remboursements partiels, reste recalculé | ✅ | |
| EF-24 | Échéances, repérage des retards | ◐ | Échéance saisie à la création (30 jours par défaut), retard calculé. **Pas de modification de l'échéance** après coup ; **aucune notification** quand un crédit devient échu (backlog #14). |
| EF-25 | Crédit soldé quand le reste atteint 0 | ✅ | |

## 4.8 Clients

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-26 | Fichier clients (nom, téléphone) | ❌ | Il n'existe pas d'entité client. Le nom et le téléphone sont **recopiés dans chaque crédit** ; aucune liste, aucune recherche, aucun historique par client. |
| EF-27 | Créer un client par formulaire dédié ou à la saisie d'un crédit | ❌ | Seule la saisie libre dans le crédit existe ; rien n'est réutilisé d'un crédit à l'autre. |
| EF-28 | Vente au comptant anonyme possible | ✅ | |

## 4.9 Dépenses

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-29 | Enregistrer une dépense (montant, date, motif) | ◐ | Motif et montant ✅. **La date n'est pas saisissable** (date du jour implicite) : impossible d'enregistrer une dépense d'hier. |
| EF-30 | Catégories optionnelles, par défaut, modifiables | ◐ | 5 catégories **fixes** ; « Divers » est présélectionné (la catégorie devrait pouvoir rester vide) ; la boutique ne peut pas les modifier. Le cahier cite loyer, transport, salaires, électricité ; le front a Achat Stock, Transport, Factures, Salaires, Divers. |

## 4.10 Rapports

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-31 | Résumé du jour : ventes, dépenses, solde, répartition par mode de paiement | ◐ | Les données existent (accueil + bilan par période) mais il n'y a pas de vue « résumé du jour » dédiée avec répartition par mode. Critère d'acceptation : « totaux identiques à la somme des ventes et dépenses du jour ». |
| EF-32 | Ventes par période, **par produit et par vendeur** | ❌ | Seul le chiffre d'affaires par jour existe. |
| EF-33 | Crédits en cours, échéances proches, retards | ◐ | Retards ✅ ; pas de vue « échéances proches ». |
| EF-34 | Produits en stock bas ou en rupture | ◐ | Alertes sur l'accueil ; pas de liste « à racheter » consultable comme rapport. |
| EF-35 | Bénéfice estimé = prix de vente − prix d'achat des produits **vendus** − dépenses | ◐ | Le « bénéfice » affiché est `Σ (prix − coût) × stock restant` (`finances.ts:61`) : c'est une **marge potentielle sur le stock**, pas le bénéfice de la période. Il faut stocker le coût d'achat au moment de la vente (comme le prix) pour calculer la marge réelle. |

## 4.11 Journal d'audit

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-36 | Trace des actions sensibles (annulations, ajustements de stock, changements de rôle, suppressions), visible du propriétaire seul, non effaçable | ❌ | Ni stockage, ni écran, ni permission. Dépend du backend. |

## 4.12 Abonnements

| Réf. | Exigence | État | Constat |
|---|---|---|---|
| EF-37 | L'accès à une boutique dépend d'un abonnement | ◐ | Écran avec 2 formules (Starter, Pro) **sans paiement réel** ; aucun blocage d'accès à l'expiration ; l'essai de 14 jours n'est pas géré. Les offres sont encore « à définir » (CDC §11). |

# 4. Règles de gestion

| Réf. | Règle | État | Constat |
|---|---|---|---|
| RG-01 | Isolation stricte par boutique | ◐ | Stores cloisonnés par boutique côté client ; garantie réelle = serveur. |
| RG-02 | Permissions par rôle | ◐ | Interface conforme ; garantie réelle = serveur. |
| RG-03 | Montants en FCFA | ✅ | Entiers, positifs, refus à la saisie. |
| RG-04 | Aucune vente supprimée ni modifiée | ✅ | Aucune route de suppression ni de modification côté front ; annulation avec motif (L1). |
| RG-05 | Stock modifié par vente, annulation ou ajustement tracé | ✅ | **Livré (L3)** côté front : vente, annulation, réception, écart d'inventaire et casse créent chacun un mouvement ; le stock initial est une réception ; la fiche ne change plus le stock. Le serveur doit refuser un `PATCH` qui modifie `stock`. |
| RG-06 | Reste = montant − remboursements | ✅ | Calculé par le domaine (`credits.ts`). Le serveur doit refuser un surpaiement (`CREDIT_OVERPAYMENT`). |
| RG-07 | Produit ou client vendu : désactivé, pas supprimé | ❌ | Suppression réelle des produits et des crédits. |
| RG-08 | Le propriétaire ne perd jamais ses droits | ✅ | Propriétaire non modifiable côté front ; à doubler côté serveur. |
| RG-09 | Une annulation exige un motif | ✅ | **Livré (L1).** |

# 5. Critères d'acceptation (CDC §7)

| Critère | État |
|---|---|
| Vente de plusieurs produits, total exact, stock correct | ✅ |
| Vente « à crédit » crée un crédit du bon montant | ✅ |
| Remboursement partiel : reste correct ; dernier remboursement : « soldé » | ✅ |
| Annulation sans motif refusée ; avec motif : stock rétabli et journal d'audit | ❌ |
| Aucun écran ni requête ne permet de supprimer ou modifier une vente | ◐ (écran ✅, requête = backend) |
| Un membre sans permission d'annuler ne peut pas annuler, même en appelant le serveur | ❌ |
| Un utilisateur ne lit aucune donnée d'une autre boutique | ◐ (backend) |
| Le reçu s'imprime lisiblement sur ordinateur et téléphone | ❌ |
| Alerte dès qu'un produit passe sous son seuil | ✅ |
| Le résumé du jour affiche des totaux identiques aux ventes et dépenses du jour | ◐ |

# 6. Écarts hors cahier V1 (à valider)

| Élément présent dans le front | Remarque |
|---|---|
| Mode hors-ligne, file de synchronisation, bandeau de synchro | Le cahier classe le hors-ligne en **V2**. |
| Appareils enrôlés, PIN caissier, verrouillage d'inactivité | Lié au hors-ligne ; non prévu au CDC V1. |
| OTP WhatsApp, connexion Google | Non prévus au CDC V1 (EF-01 : « créer un compte et se connecter »). |
| TVA forfaitaire sur le reçu | CDC §11 : TVA « à décider ». |
| Objectif journalier de 60 000 F, export CSV / PDF comptable | Non prévus au CDC. |
| Scan de code-barres | Simulé (choix aléatoire d'un article). |
| Clôture de caisse | Simple indicateur par jour, sans comptage ni écart. |

# 7. Plan de mise à niveau du frontend

Les lots sont ordonnés par dépendance. Les lots marqués **(backend)** ne peuvent être finalisés que
lorsque l'API correspondante existe ; en attendant, le front est développé contre `mockApi`
(spécification exécutable du contrat).

| Lot | Contenu | Exigences | Dépend de |
|---|---|---|---|
| L1 ✅ | **Annulation de vente** : bouton, motif obligatoire, statut « annulée », retour de stock, traitement du crédit lié, vente conservée dans l'historique | EF-14 à 18, RG-09 | contrat d'API |
| L2 ✅ | **Historique des ventes** filtrable (période, vendeur, statut) ; accès à l'annulation et au reçu | EF-13 | L1 |
| L3 ✅ | **Mouvements de stock** : historique par produit, ajustement avec motif, vrai inventaire | EF-19, RG-05 | contrat d'API |
| L4 | **Désactivation** des produits au lieu de la suppression ; produits désactivés masqués de la caisse mais visibles dans l'historique | EF-08, RG-07 | — |
| L5 | **Fichier clients** : liste, création, recherche, réutilisation dans crédit et vente | EF-26 à 28 | schéma `Customer` |
| L6 | **Dépenses** : date saisissable, catégorie facultative, catégories modifiables | EF-29, 30 | — |
| L7 | **Crédits** : modification de l'échéance, notification d'échéance, vue « échéances proches » | EF-24, EF-33 | — |
| L8 | **Reçu imprimable** : `window.print()` + feuille de style d'impression (A4 et ticket), responsive | EF-12 | — |
| L9 | **Rapports** : résumé du jour, ventes par produit et par vendeur, bénéfice réel (coût figé à la vente), liste « à racheter » | EF-31 à 35 | contrat (coût figé sur `SaleItem`) |
| L10 | **Journal d'audit** : écran réservé au propriétaire, filtres | EF-36 | backend |
| L11 | **Rôles dynamiques** : écran de gestion des rôles et des permissions ; permissions lues depuis le serveur | EF-05 | décision Q1 |
| L12 | **Abonnement** : blocage à l'expiration, essai de 14 jours, formules servies par l'API | EF-37 | décision Q6 |
| L13 | **Branchement `http`** : validation de bout en bout contre le backend, retour arrière des mutations optimistes en cas d'échec, correspondance des libellés (modes de paiement, statuts) | — | backend |

# 8. Décisions attendues de l'équipe

| # | Décision | Recommandation |
|---|---|---|
| D1 | Rôles dynamiques ou 3 rôles fixes en V1 ? | Dynamiques (CDC), avec 3 modèles proposés à la création d'une boutique. |
| D2 | Garde-t-on le hors-ligne, le PIN et les appareils en V1 ? | À confirmer : c'est du code déjà écrit, mais classé V2 par le cahier. |
| D3 | Garde-t-on OTP WhatsApp et Google en V1 ? | À confirmer ; coûts WhatsApp non provisionnés. |
| D4 | Fenêtre d'annulation (jour même, puis propriétaire) ? | Jour même pour le gérant, ensuite propriétaire seulement. |
| D5 | Liste des moyens de paiement V1 ? | Espèces, Wave, Orange Money, Carte, Autre. |
| D6 | TVA, remises, retours produits : V1 ou V2 ? | V2 ; retirer la TVA forfaitaire du reçu en attendant. |
| D7 | Nom côté API : « organisation » ou « boutique » ? | Un seul mot partout, au plus tôt. |
