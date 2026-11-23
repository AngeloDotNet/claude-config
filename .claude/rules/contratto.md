---
paths:
  - "**/*.{cs,csproj,props,ts,html,css,scss}"
---

# Contratto Frontend ↔ Backend e stack di riferimento

> Versione 1.0 — ultima revisione: 2026-11-23.
> Estratto da `core.md` §1 e §2, con la stessa numerazione. Caricato sui file backend e frontend (`paths:`) nei profili standard e strutturato.

## 1. Contratto Frontend ↔ Backend (condiviso)
Queste regole valgono per entrambi i lati e non vanno reinterpretate.
- **Chiavi, mai testo:** il backend restituisce SEMPRE chiavi di traduzione (es. `ERROR_PRODUCT_NOT_FOUND`), mai testo localizzato, sia per gli errori di validazione sia per quelli di business. I parametri dinamici viaggiano in un campo separato. Il frontend traduce.
- **Formato errori:** sempre `ProblemDetails` (RFC 9457), con errori di validazione per campo. Non esistono formati di errore paralleli.
- **Codici di errore:** 400 (richiesta o validazione, errori per campo), 401, 403, 404, 409 (conflitto o concorrenza), 412 (precondizione `If-Match` non soddisfatta), 422 (regola di business violata); tutti in `ProblemDetails` con chiave di traduzione. La mappatura lato server è in `backend-app.md` §4.1; il frontend gestisce ciascun codice (vedi `frontend.md`).
- **Date:** sempre UTC (ISO 8601) in transito e in storage. La conversione al fuso dell'utente avviene solo in visualizzazione.
- **JSON:** `System.Text.Json` con `camelCase`; enum come stringhe.
- **Paginazione:** query `pageNumber` (base 1), `pageSize`, `sortBy`, `sortDirection`; risposta `{ items, totalCount, pageNumber, pageSize }`.
- **Contratto API:** lo schema OpenAPI è la fonte di verità; i client TypeScript si generano da esso.

---

## 2. Stack di Riferimento
- **Frontend:** Angular + TypeScript strict + PrimeNG (dettagli in `frontend.md`). Angular è il default, ma la tecnologia (Angular o Blazor) e l'eventuale sviluppo mobile (e con quale tecnologia) si chiedono a ogni progetto, vedi `avvio-progetto.md` §1; per Blazor e per il mobile non esistono ancora regole.
- **Backend:** .NET 10 / C# 14 + EF Core 10 (default; Dapper è l'alternativa da valutare ogni volta, non scontata) su SQL Server o PostgreSQL, da chiedere ogni volta (dettagli in `backend.md`).
- **Test:** xUnit (backend; integration test in un progetto dedicato con database reale di prova, vedi §4 e `backend-app.md` §4.5), Vitest + Playwright (frontend); dettagli nel §4. Non usare Jest né Karma/Jasmine nei nuovi progetti.
- **Infrastruttura di riferimento:** database a scelta per progetto (SQL Server o PostgreSQL), già presente e gestito sul server (se si usa Docker, mai nel compose: `docker.md`), Redis (solo cache e solo se un L2 è stato approvato, non presunto) e RabbitMQ (solo messaggistica), questi ultimi in container.

