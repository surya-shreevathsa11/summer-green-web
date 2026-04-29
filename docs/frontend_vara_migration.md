# Frontend Vara Migration

## Scope
- Migrated guest-facing frontend flows from legacy backend endpoints to Vara APIs.
- Kept existing booking/cart/payment UI behavior, with only auth UX changes required by Vara magic PIN flow.
- Centralized network logic into one API client: `public/js/api/varaClient.js`.

## Runtime Configuration
- `window.__VARA_CONFIG.apiBaseUrl` must be set to Vara API base URL (example: `https://api.example.com`).
- `window.__VARA_CONFIG.propertySlug` must be set to the target property slug for public flows.
- Both are currently wired as placeholders in:
  - `public/index.html`
  - `public/cart.html`

## Endpoint Migration Matrix

| Legacy endpoint | Vara endpoint | Transformer / adapter |
|---|---|---|
| `GET /api/booking/rooms` | `GET /api/public/properties/:propertySlug/rooms` | `normalizeRooms()` in `varaClient` |
| `POST /api/booking/checkAvailability` | `POST /api/public/properties/:propertySlug/quote` | Public quote request body + message normalization |
| `POST /api/booking/cart` | `POST /api/guest/bookings/cart/items` | Room payload pass-through with normalized error handling |
| `GET /api/booking/cart` | `GET /api/guest/bookings/cart` | `normalizeCart()` in `varaClient` |
| `DELETE /api/booking/cart` | `DELETE /api/guest/bookings/cart/items` | Sends `itemId` + fallback room/date identifiers |
| `GET /api/booking/bookings` | `GET /api/guest/bookings` | `normalizeBookings()` in `varaClient` |
| `POST /api/booking/checkout` | `POST /api/guest/payments/order` | Order payload normalization (`orderId`, `key`, amount fields) |
| `POST /api/payment/verify` | `POST /api/guest/payments/verify` | Signature payload pass-through with centralized auth headers |
| `GET /api/auth/status` | guest JWT local storage | token/profile from `verify-pin` response |
| `POST /api/auth/logout` | local token clear | `clearGuestSession()` |
| Google OAuth button | `POST /api/guest-auth/request-pin` + `POST /api/guest-auth/verify-pin` | PIN request/verify modal flow |

## Auth and Token Lifecycle
- Guest JWT storage is centralized in `varaClient`:
  - `readGuestToken()`, `saveGuestToken()`, `clearGuestSession()`
- Protected Vara requests automatically include:
  - `Authorization: Bearer <guest-jwt>`
- 401/403 responses are surfaced as `isAuthError`, and UI routes users back to PIN auth.

## Response Normalization
- `normalizeRooms()`, `normalizeCart()`, `normalizeBookings()` prevent UI dependence on raw response shape.
- Payment order handling accepts shape variants (`orderId`/`razorpayOrderId`, `key`/`keyId`, `payableAmount`/`totalAmount`).

## Retry-safe Patterns
- `requestWithRetry()` retries one time for transient network/5xx errors.
- Idempotency header applied to mutating calls:
  - `X-Idempotency-Key` on pin, quote, cart mutations, payment order, payment verify.

## UI/UX Changes Required by Backend Contract
- Sign-in modal switched from Google OAuth CTA to Vara magic PIN flow.
- Cart page unauthenticated state now routes user back to home PIN sign-in flow.
- Static gallery rendering retained (legacy gallery endpoint was removed from guest flow migration scope).

## Verification Checklist (Manual QA)
1. Set `window.__VARA_CONFIG` values for `apiBaseUrl` and `propertySlug`.
2. Open `/` and verify room listing loads from Vara public rooms endpoint.
3. Open room booking modal and verify quote/availability state updates.
4. Try add-to-cart unauthenticated:
   - should show sign-in requirement.
5. Complete guest PIN flow:
   - request PIN, verify PIN, token saved.
6. Add room to cart again:
   - item should be added, cart badge should increment.
7. Open `/cart`:
   - cart list loads from Vara guest cart endpoint.
8. Remove an item:
   - delete succeeds and totals update.
9. Checkout:
   - create order via Vara payment order endpoint;
   - Razorpay opens with order/key from Vara response.
10. Complete payment in Razorpay:
   - verify endpoint called;
   - success redirects to `/?payment=success`.
11. Open bookings from navbar profile:
   - booking history renders from Vara bookings endpoint.
12. Logout:
   - token cleared and protected flows require sign-in again.

## Known Risks / Follow-ups
- Vara response shape differences beyond normalized fields may need additional adapter fields.
- Placeholder config in HTML must be replaced during deployment/runtime injection.
- No dedicated frontend test harness exists in this repo; add API contract tests (mocked `fetch`) for `varaClient` as a follow-up.
