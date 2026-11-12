---
title: "Ma Caisse — Évaluation du design et passe de finition"
subtitle: "Document de travail pour l'équipe, 12 novembre 2026"
lang: fr
---

# 1. En une page

- **Note avant la passe de finition : 14 / 20. Après : 15 / 20.**
- **Pas de refonte.** Le socle (jetons, composants, structure) est sain ; les défauts étaient localisés et sont corrigés.
- **Ce qui empêche d'aller plus haut ne se règle pas dans le code** : pas de vrai logo, pas de test avec de vrais commerçants, pas de maquettes de référence partagées.

> Cette note est un jugement d'expert fondé sur des mesures et la lecture des écrans réels. Ce n'est **pas** un test utilisateur
> et l'outil automatique ne détecte qu'une partie des problèmes d'accessibilité.

# 2. Méthode

| Élément | Détail |
|---|---|
| Écrans | Connexion, Accueil, Caisse, Encaissement, Ticket, Annulation, Historique, Stock, Ajustement, Inventaire, Journal, Crédits, Règlement, Bilan, Export, Dépenses, Équipe, Abonnement, Paiement d'abonnement, Notifications, Profil |
| Tailles | Bureau 1440 × 900 et téléphone 390 × 844 |
| Accessibilité | axe-core 4.10 (WCAG 2.0 A/AA, 2.1 AA, bonnes pratiques) sur chaque état, fenêtres ouvertes comprises |
| Mesures | Taille des zones tactiles, taille des textes, défilement horizontal |
| Limites | Données de démonstration ; images produits externes non chargées dans l'environnement de test ; pas de lecteur d'écran réel |

# 3. Notes

| Critère | Avant | Après | Ce qui a changé |
|---|:-:|:-:|---|
| Cohérence du système de design | 16 | 17 | Nommage « Stock » / « Inventaire » unifié ; règles documentées et verrouillées par des tests |
| Identité et esthétique | 15 | 15 | Inchangé (voir §5) |
| Hiérarchie et lisibilité | 14 | 16 | Plancher de 12 px ; libellés d'indicateurs lisibles en entier sur téléphone ; titre de page sur la Caisse |
| Accessibilité | 12 | 16 | **0 violation** sur 20 états (bureau et téléphone). Avant : 4 critiques, 28 combinaisons de contraste, plusieurs défauts de structure |
| Ergonomie tactile | 14 | 16 | Stock sur téléphone : 72 → 12 zones sous 40 px ; indicateurs compactés |
| Responsive | 16 | 16 | Déjà bon : aucun défilement horizontal |
| Finition (états, messages) | 15 | 15 | Inchangé |
| Éléments de marque | 10 | 10 | Inchangé : pas de logo, pas d'icônes d'installation |
| **Moyenne** | **14,0** | **15,1** | |

# 4. Défauts corrigés

| Défaut | Avant | Après |
|---|---|---|
| Listes déroulantes sans nom accessible | 2 (filtre « rayon », rôle d'un membre de l'équipe) | 0 |
| Boutons sans texte sur téléphone | 2 détectés (notifications, bilan) + 1 identique corrigé par prévention (facture) | 0 |
| Contrastes insuffisants | 7 combinaisons (43 éléments) sur les écrans de base ; 28 combinaisons une fois les fenêtres ouvertes auditées | 0 |
| Pas de titre principal sur la Caisse | oui | titre masqué pour les lecteurs d'écran |
| Zones de page en double (fenêtres) | `<header>` / `<footer>` dans chaque fenêtre | `<div>` |
| Zones latérales sans nom | 2 | 0 |
| Zones défilantes inatteignables au clavier (ticket) | oui | focalisables |
| Identifiant HTML dupliqué (bouton d'encaissement) | oui | unique |
| Badge « Épuisé » illisible (2,99:1) | carte entière à 60 % d'opacité | seule l'image et le texte sont atténués |
| Textes sous 12 px | 14 à 42 par écran | 0 (hors légende du code-barres) |
| Indicateurs du Stock sur téléphone | 4 cartes sur ~600 px avant la liste | 2 × 2, liste visible plus haut |
| Nom de l'onglet « Stock » vs page « Inventaire » | incohérent | « Stock » partout ; « Inventaire » = comptage |

Les causes racines étaient peu nombreuses : gris clair sur fonds gris, texte rouge ou orange trop clair, texte
semi-transparent, atténuation appliquée à un conteneur entier, éléments `<header>`/`<footer>` des fenêtres.

# 5. Ce qui reste, et qui demande des décisions humaines

| Sujet | Pourquoi ce n'est pas du code | Proposition |
|---|---|---|
| **Identité de marque** | Le cahier des charges parle de « ma_caisse (nom provisoire) ». Il n'y a pas de logo ; les icônes d'installation référencées par le manifeste n'existent pas. | Fixer le nom, commander un logo et un jeu d'icônes (192 et 512 px, version « maskable »). |
| **Validation par de vrais commerçants** | Aucune note ne remplace trois ou quatre vendeurs qui encaissent. | Test d'une demi-heure sur la Caisse, sur leur propre téléphone, en conditions réelles. |
| **Maquettes de référence** | Pour que chacun discute sur la même base. | Maquettes Figma alimentées par les jetons du code (`src/index.css`). |
| **Images de produits** | Photo, pictogramme ou les deux ? Aujourd'hui trois rendus coexistent. | Règle unique + pictogramme de repli par rayon (déjà en place). |
| **Accessibilité manuelle** | L'automatique ne couvre pas tout. | Passage au lecteur d'écran (TalkBack), ordre de tabulation, zoom à 200 %, contraste élevé. |
| **Densité du tableau Stock au bureau** | 6 icônes d'action par ligne. | À arbitrer avec les utilisateurs : menu « … » ou icônes visibles. |

# 6. Garde-fous ajoutés

Les règles ci-dessus ne dépendent plus de la mémoire de chacun : `src/design/__tests__/accessibilityGuards.test.ts`
lit le code source et échoue si quelqu'un réintroduit un texte sous 12 px, un rouge trop clair, un texte
semi-transparent, une liste déroulante sans nom, un `<header>` dans une fenêtre, etc. Chaque garde a été vérifiée
en réintroduisant volontairement le défaut. Les règles sont détaillées dans `docs/design-system.md`, §11.
