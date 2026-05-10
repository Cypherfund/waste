# Payment Gateway Integration Protocol

## Overview

The waste management backend integrates with an external payment gateway (`payment-api`) to handle real-money transactions via MTN Mobile Money and Orange Money in Cameroon. The gateway uses Fapshi as the underlying payment integrator.

---

## Gateway Endpoints

| Action | Method | URL | Description |
|--------|--------|-----|-------------|
| List providers | GET | `/payment-api/payment/providers/{country-code}` | Returns available payment providers for a country (e.g. `cmr`) |
| Initiate payment (cashin) | POST | `/payment-api/payment/mobile-wallet` | Initiates a mobile wallet deposit/charge |
| Check status | GET | `/payment-api/payment/status?transactionId={id}` | Polls for transaction status |
| Callback (webhook) | — | Configured via `callbackUrl` in initiate request | Gateway POSTs `PaymentResponse` on status change |

### Gateway Base URL

```
Configurable via: PAYMENT_GATEWAY_URL (env var)
Default (dev): http://127.0.0.1:8081
```

---

## Provider Codes (Cameroon — `cmr`)

| Provider | Code | Currency | Method |
|----------|------|----------|--------|
| MTN Mobile Money | `105` | XAF | MOBILE_WALLET |
| Orange Money | `106` | XAF | MOBILE_WALLET |

### Provider Limits

| | Min Deposit | Max Deposit | Min Withdrawal | Max Withdrawal |
|---|---|---|---|---|
| MTN MoMo | 1 XAF | 1,000,000 XAF | 200 XAF | 200,000 XAF |
| Orange Money | 1 XAF | 1,000,000 XAF | 200 XAF | 200,000 XAF |

---

## Transaction Statuses

| Status | Meaning |
|--------|---------|
| `PENDING` | Payment initiated, waiting for user confirmation on phone |
| `SUCCESS` | Payment completed successfully |
| `FAILED` | Payment failed or was rejected/timed out |

---

## Flow 1: Household Payment (Cashin — Pay for Pickup)

This flow handles payment when a job is NOT covered by subscription.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────────┐
│  Mobile App  │────▶│  Waste API   │────▶│ Payment Gateway │────▶│  User Phone │
│ (household)  │◀────│  (backend)   │◀────│  (Fapshi)       │◀────│  (MoMo/OM) │
└─────────────┘     └──────────────┘     └─────────────────┘     └────────────┘
```

### Step-by-step:

1. **Mobile app** → `POST /api/v1/jobs` with `paymentMethod: "MOBILE_WALLET"`, `paymentCode: "105"`, `paymentPhone: "6XXXXXXXX"`
2. **Backend** calls `PricingService.getQuoteForUser(userId)` → gets `quotedPrice`
3. **Backend** creates `PaymentTransaction` record with status `PENDING`
4. **Backend** calls **Gateway**: `POST /payment-api/payment/mobile-wallet`
   ```json
   {
     "amt": <quotedPrice>,
     "ref": "<transactionId>",
     "desc": "Waste pickup - Job <jobId>",
     "method": "MOBILE_WALLET",
     "code": "<paymentCode>",
     "callbackUrl": "<WASTE_API_BASE_URL>/api/v1/payments/callback",
     "phn": "<paymentPhone>"
   }
   ```
5. **Gateway** returns `{ status: "PENDING", transactionId: "<gatewayTxId>" }`
6. **Backend** stores `gatewayTransactionId` on PaymentTransaction; Job stays in `PAYMENT_PENDING` status
7. **User** receives push on phone → approves or rejects payment
8. **Gateway** calls `callbackUrl` with:
   ```json
   {
     "status": "SUCCESS" | "FAILED",
     "transactionId": "<gatewayTxId>",
     "data": null
   }
   ```
9. **Backend webhook handler**:
   - On `SUCCESS` → update PaymentTransaction to `SUCCESS`, update Job `paymentStatus` to `VERIFIED`, transition Job to `REQUESTED`, emit `job.payment.verified` event
   - On `FAILED` → update PaymentTransaction to `FAILED`, update Job `paymentStatus` to `REJECTED`, emit `job.payment.failed` event

### Fallback: Status Polling

If callback is missed (network issues), a scheduled cron job polls pending transactions:

1. Every 30 seconds, query PaymentTransaction where `status = PENDING` and `createdAt > now - 15 min`
2. For each: `GET /payment-api/payment/status?transactionId=<gatewayTxId>`
3. If status changed → process same as callback

### Timeout

- Transactions older than **15 minutes** in `PENDING` → auto-mark as `FAILED`
- Job transitions back to allow retry

---

## Flow 2: Collector Payout (Cashout — Admin Only for Now)

**⚠️ Status: NOT YET IMPLEMENTED** — Cashout requires a separate API endpoint from the gateway provider. Until then, payouts remain **admin-only**.

### Current Process (Manual):

1. **Mobile app** → `POST /api/v1/wallet/withdraw` with `amount`, `method`, `accountNumber`
2. **Backend** validates balance, debits wallet atomically
3. **Backend** creates `PayoutRequest` with status `PENDING`
4. **Admin** reviews payout request in dashboard
5. **Admin** manually sends money to collector's phone via their own mobile money
6. **Admin** marks payout as `PAID` in dashboard

### Future Implementation (When Cashout API Available):

When the gateway provides a cashout endpoint, the flow will be:

1. Admin approves payout request
2. **Backend** creates `PaymentTransaction` with type `CASHOUT`
3. **Backend** calls **Gateway** cashout endpoint
4. **Gateway** processes cashout → callback with SUCCESS/FAILED
5. **Backend webhook handler**:
   - On `SUCCESS` → mark payout as `PAID`
   - On `FAILED` → **refund wallet balance**, mark payout as `FAILED`

---

## Flow 3: Wallet Top-Up (Planned)

Same as Flow 1 but not tied to a specific job.

**Status:** Endpoint needs to be created. Will follow same pattern as job payment cashin.

1. **Mobile app** → `POST /api/v1/wallet/top-up` with `amount`, `paymentCode`, `phone`
2. **Backend** initiates cashin via gateway
3. On `SUCCESS` → credit user's wallet balance

---

## New Backend Components

### 1. `PaymentTransaction` Entity

```
payment_transactions
├── id (UUID, PK)
├── userId (UUID, FK → users)
├── type (CASHIN | CASHOUT)
├── amount (decimal)
├── currency (varchar, default 'XAF')
├── paymentCode (varchar) — provider code (105, 106)
├── providerName (varchar) — "MTN Mobile Money", "Orange Money"
├── phone (varchar) — target phone number
├── internalRef (varchar, unique) — our reference
├── gatewayTransactionId (varchar) — gateway's transaction ID
├── status (PENDING | SUCCESS | FAILED)
├── jobId (UUID, nullable, FK → jobs) — if tied to a job payment
├── payoutRequestId (UUID, nullable, FK → payout_requests) — if tied to a payout
├── callbackReceivedAt (timestamptz, nullable)
├── failureReason (text, nullable)
├── createdAt (timestamptz)
├── updatedAt (timestamptz)
```

### 2. `PaymentService` (new)

```
Methods:
├── getProviders(countryCode: string) → PaymentProvider[]
├── initiatePayment(dto: InitiatePaymentDto) → PaymentTransaction
├── handleCallback(payload: PaymentCallbackDto) → void
├── checkTransactionStatus(transactionId: string) → TransactionStatus
├── pollPendingTransactions() → void  (cron)
├── timeoutStalePendingTransactions() → void  (cron)
```

### 3. `PaymentController` (new)

```
Endpoints:
├── GET  /payments/providers/:countryCode  — list available providers (proxied + cached)
├── POST /payments/initiate                — start a payment (cashin)
├── POST /payments/callback                — webhook from gateway (no auth, verify signature)
├── GET  /payments/:id/status              — check payment status
```

### 4. Config Keys (system_config)

| Key | Default | Description |
|-----|---------|-------------|
| `payment.gateway_url` | `http://127.0.0.1:8081` | Payment gateway base URL |
| `payment.country_code` | `cmr` | Country code for provider lookup |
| `payment.callback_base_url` | `http://localhost:3000` | Public URL for callbacks |
| `payment.pending_timeout_minutes` | `15` | Auto-fail pending after N minutes |
| `payment.poll_interval_seconds` | `30` | Polling interval for missed callbacks |

### 5. Feature Flag

```
FEATURE_FLAGS.PAYMENT_INTEGRATION → feature.payment_integration (already exists)
```

When **disabled**: Keep current manual flow (payment ref + admin verification)
When **enabled**: Use gateway for real payments

---

## Mobile App Changes

### New/Updated Screens:

1. **Job payment flow** — after creating job, show "Approve payment on your phone" screen with countdown
2. **Provider selection** — fetch providers from `/payments/providers/cmr` instead of hardcoded list
3. **Top-up flow** — wire to `/payments/initiate` instead of static dialog

### New API Methods (payment_api.dart):

```dart
class PaymentApi {
  Future<List<PaymentProvider>> getProviders(String countryCode);
  Future<PaymentInitiateResponse> initiatePayment({amount, paymentCode, phone, jobId?});
  Future<PaymentStatusResponse> checkStatus(String transactionId);
}
```

---

## Security Considerations

- **Callback endpoint**: No JWT auth (gateway calls it), but validate by checking `transactionId` exists in our DB
- **Idempotency**: Callback may be received multiple times; only process if transaction is still `PENDING`
- **Atomic wallet operations**: Use DB transactions with pessimistic locking for balance changes
- **Rate limiting**: Apply rate limits on `/payments/initiate` to prevent abuse
- **Phone validation**: Validate Cameroonian phone format (9 digits, starts with 6)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Gateway unreachable | Return 503, allow retry |
| Gateway returns error | Store error, mark transaction FAILED |
| Callback for unknown transaction | Log warning, return 200 (don't retry) |
| Duplicate callback | Ignore if already processed, return 200 |
| Timeout (15 min) | Auto-FAIL, notify user via push |
| Cashout FAILED | Refund wallet balance atomically |

---

## Implementation Order

1. Create `PaymentTransaction` entity + migration
2. Create `PaymentService` with gateway HTTP client
3. Create `PaymentController` with endpoints
4. Wire cashin into job creation flow (behind feature flag)
5. Wire cashout into payout flow (behind feature flag)
6. Add polling cron job
7. Update mobile app to use real payment flow
8. Add wallet top-up endpoint
