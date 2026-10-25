# Décisions d'authentification — Ma Caisse

**Statut** : arrêté le 2026-10-25. Ce document **remplace** la section
« 4. Décisions à verrouiller avec le backend » de
[`AUTH_REVIEW.md`](AUTH_REVIEW.md) et **prime** sur les autres documents pour
tout ce qui touche à l'identité, à la session et aux appareils.

**Portée** : inscription, connexion, récupération, session, appareils de caisse,
cycle de vie des comptes. Les règles d'invitation et la matrice des droits
restent celles de [`API_CONTRACT.md`](API_CONTRACT.md) §« Règles d'invitation »
et `src/domain/permissions.ts`.

**Nature du document** : normatif. Un écart entre le code (ou `mockApi`) et une
règle `RG-A…` est un bug, pas un détail d'implémentation. Chaque règle doit être
couverte par un test.

---

## 0. Principe directeur

Deux personas, deux niveaux de friction — et une seule vérité côté serveur.

| | Propriétaire / gérant | Caissier / vendeur |
|---|---|---|
| Connexion | rare (nouveau téléphone, changement d'appareil) | plusieurs fois par jour, **poste partagé** |
| Méthode | **OTP téléphone** (WhatsApp, repli SMS) · Google en accélérateur | **PIN + appareil enrôlé** |
| Contrainte forte | inscription ≤ 30 s, aucun mot de passe à mémoriser | **doit fonctionner hors ligne**, aucune latence |

Conséquence : **aucune méthode unique ne peut servir les deux.** Toute
proposition qui impose un OTP au caissier à chaque relève est refusée
(§5, R-3).

---

## 1. Décisions

| # | Décision | Remplace |
|---|---|---|
| **D1** | Session portée par **cookie `HttpOnly`** + refresh rotatif. Aucun jeton durable dans `localStorage`. | #19 (partiellement), écart A1 |
| **D2** | **OTP téléphone** = identité principale du propriétaire (**WhatsApp Cloud API** ; SMS en repli, désactivé par défaut, budget borné). | mot de passe principal |
| **D3** | **Google OAuth** = accélérateur d'inscription/connexion, **jamais méthode unique**. | — |
| **D4** | **Mot de passe relégué** : optionnel, jamais obligatoire, récupération par OTP. | #21 (volet « mot de passe oublié ») |
| **D5** | **Magic link e-mail** = secours et récupération uniquement, jamais méthode principale. | — |
| **D6** | Caissier = **PIN 4–6 chiffres** sur **appareil enrôlé**, vérifié localement hors ligne. | mot de passe partagé |
| **D7** | **Passkey (WebAuthn)** = phase ultérieure, opt-in depuis le profil, jamais sans méthode de récupération. | — |
| **D8** | **Anti-bruteforce obligatoire** + journal de connexion (90 j). | #22 |
| **D9** | **Step-up** : réauthentification exigée sur les actions sensibles. | — |

### D1 — Session en cookie `HttpOnly` + refresh rotatif

**Décision.** Le serveur ouvre une session et renvoie deux cookies :

| Cookie | Contenu | Attributs | Durée |
|---|---|---|---|
| `mc_session` | access token signé (JWT court) | `HttpOnly; Secure; SameSite=Lax; Path=/` | **15 min** |
| `mc_refresh` | refresh token opaque (aléatoire 256 bits, hashé en base) | `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh` | voir RG-A11 |

Le corps de `AuthResult` **ne contient plus de jeton** : il renvoie `user`,
`memberships` et `expiresAt`. Le client n'a donc plus rien de durable à
persister (voir `store/useAuthStore.ts:32-41`, où `token` disparaît du
`partialize`).

**Pourquoi.** Supprime la classe de faille A1 (`docs/AUTH_REVIEW.md:54`) : un
XSS ne peut plus lire le jeton. Permet la révocation serveur et la déconnexion à
distance, indispensables pour une caisse dont le téléphone peut être perdu.

**Conséquences.**
1. `services/tenant.ts` et `services/http/httpClient.ts` passent en
   `credentials: 'include'` ; l'en-tête `Authorization: Bearer` disparaît.
2. **CSRF obligatoire** sur toute mutation : double-submit token ou en-tête
   personnalisé non simple (`X-Requested-With`), `SameSite=Lax` ne suffit pas.
3. `store/auth.ts:132-145` (`logout`) appelle `POST /auth/logout` pour invalider
   le refresh côté serveur, pas seulement en local.
4. Mode `mock` : l'adaptateur simule les cookies (session en mémoire +
   persistance locale du seul `refresh`), afin que `mockApi` reste la
   spécification exécutable du contrat.

### D2 — OTP téléphone comme identité principale

**Décision.** L'inscription d'un propriétaire se fait avec **un seul champ :
le numéro de téléphone**. Le canal est WhatsApp, en **deux paliers de coût** :

| Palier | Mécanisme | Coût |
|---|---|---|
| **1 — lancement** | **Conversation initiée par l'utilisateur** : le client tape « Bonjour » sur le numéro du service (lien `wa.me`), la fenêtre de service s'ouvre et le code part en message libre. Dans le quota gratuit de **1 000 messages de service par mois et par numéro**. | **0 FCFA** jusqu'à ≈ 700 inscriptions/mois |
| **2 — volume** | Template `authentication` de la Cloud API (envoi à froid, sans action de l'utilisateur). | ≈ **7 FCFA** par message livré |

Le palier 2 s'active quand le volume dépasse le quota gratuit, ou quand le
« tapez Bonjour » coûte plus cher en friction que 7 FCFA. **Le SMS reste un
repli désactivé par défaut** (RG-A23, budget §7).

**Pourquoi.** Le numéro est déjà nécessaire au produit (ticket, PDF comptable,
contact client — `receipt.phone(business.phone)`, `lib/export/pdf.ts:52`), alors
que l'e-mail est peu consulté par la cible et parfois partagé. Un seul canal à
vérifier au lieu de deux. WhatsApp est aussi **3 à 6 fois moins cher qu'un SMS
local** (≈ 7 FCFA contre 25–40 FCFA par message) et arrive plus vite.

**Conséquences.**
1. `SignupInput` (`src/types/index.ts:221-230`) devient `{ phone }` +
   `{ organizationName? }` — le reste migre vers l'onboarding (RG-A04).
2. `POST /auth/signup` est remplacé par `POST /auth/otp/request` +
   `POST /auth/otp/verify` (création du compte si le numéro est inconnu).
3. L'e-mail devient **facultatif**, collecté à l'onboarding pour les reçus.
4. Coût maîtrisé par construction : quota par organisation, plafond global
   mensuel, repli SMS plafonné (§7, RG-A24).
5. Prérequis opérationnel : **compte WhatsApp Business (WABA) vérifié**, un
   numéro dédié, et un template `authentication` approuvé. Le mode démo n'en
   dépend pas (code fixe `000000`).

### D3 — Google OAuth comme accélérateur

**Décision.** Bouton « Continuer avec Google » à l'inscription et à la
connexion. Le compte Google fournit l'e-mail vérifié ; **le téléphone est
demandé juste après**, dans le même parcours, avant d'atteindre la caisse.

**Pourquoi.** Deux taps au lieu de cinq, e-mail déjà vérifié, et c'est le
parcours attendu par les utilisateurs Android — soit l'écrasante majorité de la
cible.

**Rejeté** : Google comme méthode unique. Il ne fournit pas de téléphone (dont
le produit a besoin), exclut les utilisateurs sans compte Google actif, et
introduit une dépendance à un fournisseur d'identité externe pour un logiciel de
caisse.

**Conséquences.**
1. `POST /auth/oauth/google` (code d'autorisation, PKCE) → session.
2. Si le compte Google est inconnu : création avec `email` vérifié et
   `onboardingStep = 'phone'` ; l'utilisateur **ne peut pas vendre** avant
   d'avoir fourni son téléphone (RG-A03).
3. Rattachement : un e-mail Google déjà présent sur un compte téléphone
   **rattache** les deux identités, il ne crée pas de doublon (RG-A02).

### D4 — Mot de passe relégué, jamais obligatoire

**Décision.** Le mot de passe est proposé **plus tard**, depuis le profil
(« ajouter un mot de passe »), pour les utilisateurs qui le préfèrent ou qui
n'ont pas de smartphone. Quand il existe : **12 caractères minimum**, pas de
règle de complexité imposée, liste noire des mots de passe compromis, hash
`Argon2id`. La récupération se fait **par OTP**, jamais par question secrète.

**Pourquoi.** Recommandation NIST SP 800-63B-4 / ANSSI : la longueur et le blocage
des mots de passe compromis valent mieux que la complexité. Et un mot de passe
qu'on peut oublier sans recours est le premier facteur d'abandon — c'est
exactement l'écart A3 (`docs/AUTH_REVIEW.md:56`).

**Conséquences.** Le seuil de 8 caractères côté client
(`LoginScreen.tsx:26`) disparaît au profit d'une validation serveur à 12.
`POST /auth/password/set`, `/auth/password/change`, `/auth/password/reset/*`.

### D5 — Magic link : secours uniquement

**Décision.** Lien magique e-mail autorisé pour la **récupération** et pour les
utilisateurs qui n'ont pas de téléphone. Jamais comme parcours principal.

**Pourquoi.** Trois pièges constatés : le lien s'ouvre dans le navigateur du
client mail et non dans la PWA de la caisse ; certains filtres anti-spam
**consomment** le lien avant l'utilisateur ; et il n'a aucun sens sur un poste
partagé.

**Conséquences.** Jetons à usage unique, TTL 15 min, liés à un appareil
(empreinte de navigateur + cookie de tentative), notification « connexion
depuis un lien » systématique.

### D6 — Caissier : PIN sur appareil enrôlé

**Décision.** Le propriétaire **enrôle l'appareil de la boutique** une seule
fois. Chaque membre dispose d'un **PIN de 4 à 6 chiffres**, vérifié **localement**
contre un hash répliqué, avec **verrouillage automatique** après inactivité et
bouton « changer d'utilisateur » sur l'écran de vente.

**Pourquoi.** Un OTP par relève coûte cher, dépend du réseau et casse la caisse
quand la connexion tombe. Or la disponibilité hors ligne est une exigence
produit (voir #17) : une authentification qui exige le réseau est un défaut de
conception, pas une option.

**Conséquences.**
1. `MockMembership` gagne `pinHash`, `failedAttempts`, `lockedUntil`.
2. Nouvel écran de verrouillage ; `POST /auth/pin/verify` n'est appelé **que**
   lorsque le réseau est disponible (télémétrie + incrément des tentatives), le
   verdict hors ligne étant rendu localement.
3. Le hash du PIN est stocké côté serveur (`Argon2id`, sel unique) et descend
   dans le cache local **uniquement** pour les appareils enrôlés, effacé à la
   révocation.
4. Limite assumée et documentée : `localStorage` n'est pas chiffré. Mitigation =
   PIN + verrouillage + purge à la révocation, pas un chiffrement de façade.

### D7 — Passkey en phase ultérieure

**Décision.** Passkey/WebAuthn activable depuis le profil, **uniquement** pour
un compte qui possède déjà une méthode de récupération vérifiée (téléphone ou
e-mail). Suggesté après la 2ᵉ connexion réussie.

**Pourquoi.** Meilleure résistance au phishing et meilleur taux de réussite de
connexion, mais sans récupération solide une passkey perdue = compte perdu. Sur
cette cible, le parcours doit rester réparable sans support.

**Conséquences.** `POST /auth/passkeys/*` (register/authenticate/list/revoke),
stockage des credentials publics, et jamais de passkey sur un appareil enrôlé
partagé (le PIN y est la bonne réponse).

### D8 — Anti-bruteforce et journal

**Décision.** Tout point d'entrée d'authentification est limité (voir RG-A08,
RG-A16, RG-A19) et chaque tentative — réussie ou refusée — est journalisée 90 j :
horodatage, identifiant tenté (hashé), méthode, IP, user-agent, résultat. Le
propriétaire voit ses 10 dernières connexions et peut révoquer un appareil.

**Pourquoi.** Écart A4 (`docs/AUTH_REVIEW.md:57`). Sans journal, ni l'utilisateur
ni le support ne peuvent distinguer un oubli d'une compromission.

**Conséquences.** `429` + `Retry-After` sur `/auth/*` ; table
`auth_events` (rétention 90 j, purge planifiée) ; alerte au propriétaire sur
connexion depuis un nouvel appareil.

### D9 — Step-up sur les actions sensibles

**Décision.** Les actions suivantes exigent une authentification de moins de
**5 minutes** (sinon `401 STEP_UP_REQUIRED`) :

- changer le numéro de téléphone ou l'e-mail de connexion ;
- ajouter, retirer ou changer le rôle d'un membre ;
- enrôler ou révoquer un appareil ;
- activer/renouveler un abonnement payant ;
- supprimer l'organisation ou le compte.

**Pourquoi.** Une session ouverte sur un poste de boutique ne doit pas permettre
de détourner le compte. C'est aussi la contrepartie naturelle d'une session
longue (D1) et d'un PIN partagé (D6).

**Conséquences.** Le client affiche une modale de réauthentification et rejoue
l'action une fois ; le serveur renvoie `401` avec le code dédié, **sans**
déconnecter (voir RG-A11).

---

## 2. Matrice persona × méthode

| Parcours | Méthode principale | Accélérateur | Secours | Refusé |
|---|---|---|---|---|
| Inscription propriétaire | OTP téléphone (WhatsApp) | Google | e-mail + mot de passe (avec vérification) | formulaire 8 champs |
| Connexion propriétaire (appareil connu) | OTP ou passkey | Google | magic link | — |
| Connexion propriétaire (nouvel appareil) | OTP + notification | Google | passkey existante | — |
| Récupération | OTP téléphone | — | magic link + délai 24 h | question secrète |
| Gérant (invité) | OTP téléphone | Google | — | — |
| Caissier (poste de la boutique) | **PIN sur appareil enrôlé** | — | OTP si PIN verrouillé | OTP à chaque vente |
| Administration (rôle owner) | session + step-up | — | — | PIN seul |

---

## 3. Règles métier normatives

Identifiants stables : **RG-Axx**, cités par `API_CONTRACT.md` et par les tests.
« DOIT » = non négociable côté serveur et côté `mockApi`.

### 3.1 Identité et inscription

| # | Règle |
|---|---|
| **RG-A01** | Un compte est identifié par un **numéro de téléphone vérifié, unique, au format E.164**. Le numéro est la clé de connexion : il ne peut appartenir qu'à un seul compte. |
| **RG-A02** | L'e-mail, s'il est fourni, est **unique** et **vérifié**. Google fournit un e-mail vérifié : un e-mail déjà utilisé **rattache** l'identité au compte existant après OTP sur le téléphone du compte — jamais de doublon, jamais de fusion silencieuse. |
| **RG-A03** | Un compte sans contact téléphonique **renseigné** (sur le commerce **ou** sur le compte) ne peut pas vendre ni encaisser : il peut explorer son espace, pas opérer une caisse. Le numéro est demandé **au moment d'encaisser** si l'onboarding a été passé (`PhoneRequiredModal`), puis enregistré sur le commerce — jamais de blocage de la caisse. Objectif : ne jamais produire un ticket sans coordonnées. *Application* : côté client depuis D3 ; la **vérification** du numéro par OTP devient obligatoire dès que D2 est livré, et le serveur doit refuser `POST /sales` sans contact. |
| **RG-A04** | L'inscription ne demande **qu'un champ** (téléphone). *Parcours e-mail de transition (avant D2)* : **deux champs** (e-mail + mot de passe) — jamais plus. Le nom de la personne, le nom du commerce, la ville et l'activité sont collectés **après la première connexion** : **2 étapes courtes** (nom du commerce → coordonnées) puis une **checklist de démarrage** non bloquante (premier article, première vente, premier vendeur). Valeurs par défaut utilisables (« Mon commerce », fuseau `Africa/Dakar`, devise `FCFA`). Tant que l'onboarding n'est pas terminé, `business.onboardedAt` est `null` et l'accueil affiche la checklist, jamais un état vide. |
| **RG-A05** | Une organisation a **exactement un propriétaire actif** minimum, jamais supprimable ni rétrogradable (`422 OWNER_LOCKED`). Le transfert de propriété est une action explicite à double confirmation. |
| **RG-A06** | L'essai de 14 jours démarre à la **création de l'organisation**, pas à la première vente, et ne redémarre jamais (pas de réessai par re-création avec le même téléphone). |

### 3.2 Code à usage unique (OTP)

| # | Règle |
|---|---|
| **RG-A07** | OTP = **6 chiffres**, TTL **5 minutes**, **usage unique**, comparaison à temps constant, invalidation de tous les codes précédents à chaque nouvel envoi. |
| **RG-A08** | **5 tentatives** de vérification par code, puis le code est invalidé (pas seulement la tentative). Renvoi possible après **30 s**, maximum **3 envois par numéro et par heure**, **10 par IP et par heure**. Au-delà : `429 OTP_RATE_LIMITED` + `Retry-After`. |
| **RG-A09** | La demande d'OTP **ne révèle jamais** si le numéro possède un compte : réponse `202` identique dans tous les cas. La distinction (inscription vs connexion) est décidée **après** vérification du code. |

### 3.3 Session

| # | Règle |
|---|---|
| **RG-A10** | Access token **15 min**, en cookie `HttpOnly`. Refresh **rotatif** : chaque usage émet un nouveau refresh et invalide l'ancien. **Réutilisation d'un refresh déjà consommé = révocation de toute la famille de jetons** et alerte propriétaire. |
| **RG-A11** | Durées : propriétaire/gérant → refresh **30 j glissant, 90 j absolu** ; appareil enrôlé → **90 j glissant, 180 j absolu** (la caisse doit survivre à une coupure réseau prolongée). Une session active est prolongée au plus une fois par heure. |
| **RG-A12** | `401 UNAUTHENTICATED` = session invalide → déconnexion. `401 STEP_UP_REQUIRED` = réauthentification → **pas** de déconnexion. `403 FORBIDDEN` = rôle insuffisant → message, **pas** de déconnexion. Un `403` ne doit jamais vider la session. |
| **RG-A13** | Déconnexion = invalidation serveur du refresh **et** purge locale : **toutes** les collections métier, de **toutes** les organisations, sont supprimées du stockage (`ma-caisse/<orgId>/…` et clés globales) et l'état mémoire est vidé. Survivent uniquement les préférences d'affichage (`ma-caisse/ui`) et les données serveur simulées du mode démo. Sur un poste partagé, aucun nom de client ni montant ne doit rester lisible après « Se déconnecter ». |
| **RG-A14** | Verrouillage d'inactivité : **15 min** sur un appareil enrôlé (retour au PIN), **8 h** sur un appareil personnel — puis PIN ou OTP selon le cas. Le verrouillage n'invalide pas la session métier en cours. |

### 3.4 Appareils et PIN

| # | Règle |
|---|---|
| **RG-A15** | L'enrôlement d'un appareil exige un **propriétaire authentifié + step-up** (D9). **3 appareils enrôlés maximum** par organisation. L'appareil est nommé (« Caisse comptoir ») et listé avec sa dernière activité. |
| **RG-A16** | PIN = **4 à 6 chiffres**, distinct du numéro de téléphone et des suites triviales (`0000`, `1234`). **5 échecs → verrouillage 15 min** + notification au propriétaire ; le déverrouillage se fait par le propriétaire (nouveau PIN) ou par OTP du titulaire. |
| **RG-A17** | Révoquer un appareil invalide **immédiatement** sa session ET efface le cache local au prochain contact réseau. Hors ligne, la révocation s'applique au plus tard **24 h** après le retour du réseau, et le PIN est refusé dès que l'appareil détecte la révocation. |
| **RG-A18** | Un caissier **ne peut pas** s'auto-enrôler sur un appareil, changer son rôle, ni consulter le prix d'achat ou les marges (matrice `domain/permissions.ts` inchangée, mais le serveur DOIT la faire respecter). |

### 3.5 Exploitation

| # | Règle |
|---|---|
| **RG-A19** | **Limitation** : 5 échecs consécutifs par identifiant / 15 min, 20 par IP / 15 min, sur tous les points d'entrée. Réponse `429` + `Retry-After`, message français, jamais de blocage définitif automatique (le déblocage est assisté). |
| **RG-A20** | **Journal** de connexion conservé **90 j** (D8), consultable par le titulaire (10 dernières) et par le propriétaire pour son organisation. Purge planifiée, pas de suppression manuelle. |
| **RG-A21** | **Suppression de compte** : anonymisation sous **30 j**, effacement des identifiants de connexion immédiat, conservation des pièces comptables 10 ans **sous forme anonymisée** (obligation légale). Le titulaire reçoit une confirmation. |
| **RG-A22** | **Aucune donnée d'authentification dans les URLs** (pas de jeton en query string), aucun secret dans les logs applicatifs, aucun mot de passe/PIN/OTP en clair en base ni dans les réponses d'API. En mode démo uniquement, `auth.demoAccounts()` peut exposer le mot de passe `demo1234` — jamais en mode `http`. |

### 3.6 Canal et coût (D2)

| # | Règle |
|---|---|
| **RG-A23** | **Canal** : WhatsApp, en deux paliers — (1) **conversation initiée par l'utilisateur** (`wa.me`, message libre dans la fenêtre de service, quota gratuit de 1 000 messages/mois/numéro) ; (2) **template `authentication`** payant au-delà. Le **SMS est désactivé par défaut** ; s'il est activé, il ne part qu'**après un échec de livraison** WhatsApp (`status: failed`), jamais en parallèle, et **2 SMS maximum par organisation et par mois**. Aucun autre canal (voix, e-mail) n'est un substitut accepté au lancement. |
| **RG-A24** | **Budget** : **20 OTP inclus par organisation et par mois civil** (alerte interne à 80 %, `429 OTP_BUDGET_EXCEEDED` à 100 %). Un **plafond global mensuel** est fixé par l'exploitant ; au-delà de 120 % de ce plafond, le service passe en mode dégradé : OTP WhatsApp suspendu, connexion par mot de passe ou magic link pour les comptes qui en disposent, support humain pour les autres. **Jamais de dépassement silencieux.** |
| **RG-A25** | **Séparation des usages** : le numéro et le template d'authentification ne servent **jamais** au marketing ni aux notifications produit. Les messages de service (reçus, alertes) utilisent un template `utility` distinct et sont comptés séparément. |
| **RG-A26** | **Changement de numéro** : exige la vérification de l'**ancien** numéro (OTP) **et** du nouveau, plus un step-up (D9). Impossible depuis un appareil enrôlé par un caissier. L'ancien numéro reçoit une notification du changement. |

### 3.7 Vérification d'e-mail et mot de passe

| # | Règle |
|---|---|
| **RG-A27** | **Vérification e-mail par code** : 6 chiffres, TTL **10 min**, usage unique, 5 essais, renvoi possible après **60 s**, **3 envois par adresse et par heure**, réponse constante quelle que soit l'existence du compte (RG-A09). L'**OTP est retenu plutôt que le magic link** : même écran que l'OTP téléphone (D2), aucun lien consommé par les filtres anti-spam, aucun problème de changement d'appareil. Le magic link reste réservé à la **récupération** (D5), TTL 15 min. |
| **RG-A28** | **Délai de grâce de 72 h** : le compte est actif dès l'inscription et **la connexion, la caisse et les ventes ne sont jamais bloquées** par une adresse non vérifiée. Après 72 h, seules les fonctions qui dépendent réellement de l'e-mail sont désactivées : récupération de mot de passe, envoi de reçus/exports par e-mail, invitations par e-mail, souscription payante. Un bandeau permanent affiche la **date limite** (pas de compte à rebours). |
| **RG-A29** | **Mot de passe** : **12 à 64 caractères**, **aucune composition imposée**, espaces/accents/emoji acceptés, blocage des mots de passe courants (liste noire + Pwned Passwords côté serveur), interdiction de recopier l'e-mail, le nom ou le nom du commerce, **aucune expiration ni rotation**, hash **Argon2id**, **aucune question secrète**, **pas de champ de confirmation** (le bouton « afficher » suffit). |



---

## 4. Ce que cela change dans le code

| Zone | Fichier | Changement |
|---|---|---|
| Types d'entrée | `src/types/index.ts:216-230` | `LoginInput` → `{ phone }` ou `{ email, password }` (legacy) ; `SignupInput` → `{ phone }` ; `AuthResult` sans `token`, avec `expiresAt` |
| Transport | `src/services/http/httpClient.ts`, `services/tenant.ts` | `credentials: 'include'`, suppression du Bearer, en-tête CSRF |
| Persistance | `src/store/useAuthStore.ts:32-41` | `token` retiré du `partialize` (les écarts A1 et A9 disparaissent) |
| Orchestration | `src/store/auth.ts:95-115` | `login`/`signup` remplacés par `requestOtp`/`verifyOtp` ; `restoreSession` s'appuie sur `GET /auth/me` + cookie |
| Écran d'accès | `src/features/auth/LoginScreen.tsx` | ✅ **2 champs** (e-mail + mot de passe) + Google + mot de passe affichable + erreurs par champ ; le nom, le commerce et les coordonnées arrivent à l'onboarding (RG-A04) ; reste D2 (téléphone → code) |
| Onboarding | `src/features/accueil/*` | checklist 3 étapes + état vide actionnable (l'écart « atterrissage vide » de la revue UX) |
| Verrouillage caisse | nouveau `src/features/auth/LockScreen.tsx` | PIN, changement d'utilisateur, verrouillage d'inactivité |
| Contrat | `src/services/contracts.ts`, `endpoints.ts`, `mockApi.ts`, `httpApi.ts` | nouveaux endpoints §2 de `API_CONTRACT.md` ; `mockApi` = spécification exécutable, donc OTP et PIN simulés |
| Textes | `src/content/fr.ts:632-684` | messages OTP (renvoi, expiration, quota), Google, PIN, step-up |

**Ce qui ne change pas** : `activateOrganization`, `pickOrganization`,
`scopeStoresToOrganization`, le cloisonnement `ma-caisse/<orgId>/…`, la matrice
`can(role, permission)` et les règles d'invitation. Le nouvel écran d'accès
réutilise `applyAuth()` (`store/auth.ts:69-75`) sans le modifier.

---

## 5. Options rejetées

| # | Option | Motif du rejet |
|---|---|---|
| R-1 | **Mot de passe e-mail comme méthode principale** | Dépend d'un e-mail peu consulté par la cible, saisie aveugle sur mobile, et sans récupération fiable une faute de frappe perd le compte. Reste supporté en option (D4). |
| R-2 | **Google OAuth seul** | Pas de téléphone, dépendance à un tiers, exclut les comptes non-Google. Accélérateur retenu (D3). |
| R-3 | **OTP pour tous, y compris les caissiers** | Coût par relève, latence, et **panne totale hors réseau**. Le PIN sur appareil enrôlé est la seule réponse compatible avec une caisse de boutique (D6). |
| R-4 | **Magic link comme parcours principal** | Mauvais appareil (client mail ≠ PWA), liens consommés par les filtres anti-spam, inadapté au poste partagé. Secours uniquement (D5). |
| R-5 | **Jeton en `localStorage`** | Lisible par tout XSS, non révocable, non expirant. Remplacé par D1. |
| R-6 | **Passkey dès la phase 1** | Sans récupération éprouvée, crée des comptes définitivement perdus, sans support possible. Phase ultérieure (D7). |
| R-7 | **Question secrète** | Interdite par NIST SP 800-63B-4 et devinable par l'entourage. Aucune variante retenue. |
| R-8 | **Inscription différée (« vendre sans compte »)** | Excellente conversion, mais incompatible avec un ticket légal et une caisse multi-appareils. Reportée : à réévaluer quand la synchronisation (#1) et le hors ligne (#17) seront livrés. |

---

## 6. Séquence de livraison

| Étape | Contenu | Dépend de | Livrable vérifiable |
|---|---|---|---|
| 1 | Contrat écrit (ce document + §2 de `API_CONTRACT.md`) | — | revue backend signée |
| 2 | D1 session cookie + CSRF + `AuthResult` sans jeton | 1 | ✅ **client livré** (lint + 210 tests) ; serveur à brancher |
| 3 | **D3 Google** (accélérateur d'inscription, 0 FCFA) | 2 | ✅ **démo livrée** ; production = identifiant client Google + échange PKCE serveur |
| 4 | Onboarding 3 étapes + états vides actionnables | 3 | parcours complet : Google → commerce → vente → ticket |
| 5 | **D2 OTP palier 1** (conversation initiée, 0 FCFA) + D4 mot de passe optionnel + RG-A13 purge | 2, **numéro WhatsApp + lien `wa.me`** | tests `mockApi` : OTP expiré, quota, budget, énumération, non-révélation |
| 6 | D6 PIN + appareil enrôlé + verrouillage | 2, 5 | test hors ligne : PIN validé sans réseau |
| 7 | D8 journal + D9 step-up | 2 | `429` + `Retry-After`, `STEP_UP_REQUIRED` sans déconnexion |
| 8 | D2 OTP palier 2 (template payant) | 5 | bascule à l'unité quand le quota gratuit est dépassé |
| 9 | D7 passkey | 3, 5 | enrôlement + récupération par OTP |

**Règle de gestion** : aucune étape ne démarre avant que la précédente soit
couverte par des tests et que `docs/` soit à jour — cohérent avec la règle de
clôture de [`BACKLOG.md`](BACKLOG.md).

---

## 7. Budget OTP (D2)

Hypothèses à réactualiser à la signature : la rate card Meta évolue (jusqu'à une
fois par trimestre) — **aucune décision produit ne doit dépendre d'un prix figé**,
d'où les plafonds ci-dessous qui bornent la dépense indépendamment du tarif.

| Paramètre | Valeur retenue | Note |
|---|---|---|
| **Palier 1 — conversation initiée par l'utilisateur** | **0 FCFA** | 1 000 messages de service gratuits/mois/numéro ≈ **700 inscriptions** |
| Prix unitaire du palier 2 | **0,012 USD** par message `authentication` livré | fourchette « reste de l'Afrique » ; à confirmer sur la rate card Meta |
| Taux de conversion | 1 USD ≈ **600 FCFA** | parité FCFA/EUR fixe, USD flottant |
| Coût unitaire | ≈ **7 FCFA** | 0,012 × 600 |
| Messages par compte / mois | **5,4** | 1,4 à l'inscription (renvois inclus) + 4 connexions |
| Coût par compte actif | ≈ **39 FCFA/mois** | — |
| Coût par inscription | ≈ **10 FCFA** | 1,4 message |
| SMS de repli | 25–40 FCFA/message | agrégateur local, plafonné à 2/org/mois |

| Volume | Messages / mois | Coût WhatsApp | + repli SMS (max) | **Enveloppe conseillée** |
|---|---|---|---|---|
| 100 comptes | 540 | ≈ 6,5 USD (~3 900 FCFA) | 2 000 FCFA | **6 000 FCFA** |
| 400 comptes | 2 160 | ≈ 26 USD (~15 600 FCFA) | 8 000 FCFA | **25 000 FCFA** |
| 1 000 comptes | 5 400 | ≈ 65 USD (~39 000 FCFA) | 20 000 FCFA | **60 000 FCFA** |
| 5 000 comptes | 27 000 | ≈ 324 USD (~194 000 FCFA) | 100 000 FCFA | **300 000 FCFA** |

**Budget de base au lancement : 0 FCFA** — le palier 1 couvre ≈ 700
inscriptions/mois, et la friction ajoutée est un seul tap (« Envoyer Bonjour »).
Le **palier payant démarre à 15 000 FCFA/mois** (≈ 385 comptes actifs ou
≈ 1 500 inscriptions) dès que le volume dépasse le quota gratuit, ou dès que la
friction du « Bonjour » coûte plus cher que 7 FCFA par message.

Deux garde-fous rendent ce budget vérifiable plutôt que théorique :

- Meta facture **par message livré** (depuis juillet 2025) : un échec de
  livraison n'est pas facturé, donc le repli SMS ne se déclenche que sur
  `failed`, jamais en parallèle (RG-A23).
- Le pire cas est borné par construction : 20 OTP/org/mois (RG-A24) × nombre
  d'organisations, puis coupure au plafond global. Aucune boucle de création de
  comptes ne peut faire exploser la facture.

**Coût par rapport à la valeur** : à ≈ 39 FCFA par compte actif et par mois, le
canal d'authentification reste sous 1 % du prix d'un abonnement mensuel — le
poste n'est pas un risque financier, c'est le **coût d'une conversion réussie**.

---

## 8. Références

- [`AUTH_REVIEW.md`](AUTH_REVIEW.md) — flux réel, écarts A1–A13, historique.
- [`API_CONTRACT.md`](API_CONTRACT.md) — traduction technique (routes, codes).
- [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md) — plan d'action global.
- **Meta / WhatsApp Cloud API** — tarification à la message livré, catégorie
  `authentication` (depuis juillet 2025) : la rate card par pays fait foi pour
  les montants du §7 ; le template doit être approuvé avant l'ouverture de D2.
- NIST SP 800-63B-4 (2025) — OTP SMS = authentificateur *restricted*, step-up,
  interdiction des questions secrètes, longueur > complexité.
