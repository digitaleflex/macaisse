# Contrat d'API — Ma Caisse

Ce document décrit l'API REST que le frontend consomme en mode `http`.
Il est la référence pour l'équipe backend : les types exacts sont ceux de
`src/types/index.ts`, les routes celles de `src/services/endpoints.ts`.

## Activer le backend

```bash
# .env.local
VITE_API_MODE=http
VITE_API_BASE_URL=https://api.example.com/v1
VITE_API_TIMEOUT_MS=15000
```

En mode `mock` (défaut), l'adaptateur `src/services/adapters/mockApi.ts` simule
exactement ce contrat en mémoire à partir de `src/mocks/`.

## Conventions

- JSON UTF-8, montants en **FCFA entiers**, dates `YYYY-MM-DD`, heures `HH:MM`.
- Authentification : en-tête `Authorization: Bearer <token>` si un jeton est
  présent dans `localStorage['ma-caisse/token']`.
- Les identifiants sont des `string` **générés par le client**
  (`product-<uuid>`, `sale-<uuid>`…) : le serveur doit les accepter tels quels
  (création idempotente).
- Erreurs : statut HTTP ≠ 2xx et corps `{ "message": "Texte lisible en français" }`.
  Le message est affiché tel quel à l'utilisateur.
- Les mutations sont **optimistes** : l'UI applique le changement localement
  puis appelle l'API ; un échec est signalé par un toast.

## Chargement initial

Au démarrage (`src/store/bootstrap.ts`), le client appelle en parallèle :
`GET /session`, `GET /products`, `GET /sales`, `GET /expenses`, `GET /credits`,
`GET /notifications`.

## Routes

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/session` | — | `Session` (`user`, `business`, `subscription`) |
| GET | `/products` | — | `Product[]` |
| POST | `/products` | `Product` | `Product` |
| PATCH | `/products/:id` | `Partial<Product>` | `Product` |
| DELETE | `/products/:id` | — | `204` |
| POST | `/products/:id/restock` | `{ quantity: number }` | `Product` |
| GET | `/sales` | — | `SaleTransaction[]` (plus récentes d'abord) |
| POST | `/sales` | `{ sale: SaleTransaction, lines: CartLine[] }` | `SaleTransaction` — le serveur décrémente le stock |
| GET | `/expenses` | — | `Expense[]` |
| POST | `/expenses` | `Expense` | `Expense` |
| DELETE | `/expenses/:id` | — | `204` |
| GET | `/credits` | — | `ClientCredit[]` |
| POST | `/credits` | `ClientCredit` | `ClientCredit` |
| POST | `/credits/:id/payments` | `{ amount: number }` | `ClientCredit` — refuser `amount <= 0` ou `> remainingAmount` (422) |
| DELETE | `/credits/:id` | — | `204` |
| GET | `/notifications` | — | `NotificationItem[]` |
| POST | `/notifications/:id/read` | — | `204` |
| POST | `/notifications/read-all` | — | `204` |

## Exemples de payloads

```jsonc
// Product
{ "id": "p1", "name": "Lait demi-écrémé 1L", "sku": "#LAI-018", "category": "Frais",
  "price": 950, "costPrice": 750, "stock": 24, "minStockAlert": 5,
  "imageUrl": "https://…", "unit": "brique" }

// POST /sales
{ "sale": { "id": "sale-…", "saleNumber": "V-20261024-0001", "date": "2026-10-24", "time": "17:49",
            "paymentMethod": "Espèces", "amount": 6400, "status": "Validé", "itemsCount": 3 },
  "lines": [ { "productId": "p1", "name": "Lait demi-écrémé 1L", "price": 950, "quantity": 2, "unit": "brique" } ] }

// Session (extrait)
{ "user": { "id": "u1", "firstName": "Mamadou", "lastName": "Konaté", "role": "Gérant", … },
  "business": { "id": "b1", "name": "Boutique Étoile", "taxId": "0048912", "closingTime": "20:00", … },
  "subscription": { "plan": { "name": "Pro Commerçant", "monthlyPrice": 15000, … }, "invoices": [ … ] } }
```

Valeurs énumérées (`category`, `paymentMethod`, `status`…) : voir
`src/types/index.ts`.
