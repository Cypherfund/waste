Below is a **complete QA / test-flow playbook** for the KmerTrash platform, including the new **Growth & Ambassador system** from PR #6.

You can save this as:

```text
docs/qa/kmertrash-test-flow-playbook.md
```

---

# KmerTrash QA Test Flow Playbook

## 1. Purpose

This playbook defines the core manual and functional test cases for the KmerTrash platform.

It covers:

* Household flow
* Collector flow
* Admin dashboard
* Subscription and pricing
* Proof, dispute, rating, earnings
* Notifications
* Growth / Ambassador / Marketer system
* Payouts and commission flows
* Security and role-based access
* Hybrid payment system (CASH, manual provider, integrated provider)
* Collector float management

The goal is to verify that the platform works end-to-end before deployment, after major PRs, and before every production release.

---

# 2. Test Roles

Create or identify test accounts for:

| Role      | Purpose                                                         |
| --------- | --------------------------------------------------------------- |
| Admin     | Manage users, jobs, pricing, marketers, commissions, payouts    |
| Household | Book waste pickups, subscribe, validate proof, rate collector   |
| Collector | Accept jobs, complete pickups, upload proof, earn money         |
| Marketer  | Create leads, track referrals, view commissions, request payout |

---

# 3. Test Environment Setup

## Required data

Before testing, make sure the system has:

* At least 1 active admin
* At least 1 active collector
* At least 1 active household
* At least 1 active marketer
* Subscription plans seeded
* Commission schemes seeded
* SMS provider configured or mocked
* File upload provider configured or mocked
* Payment provider mocked or sandboxed
* Database migration applied successfully

## Default commission schemes

| Scheme               | Trigger                  | Amount   |
| -------------------- | ------------------------ | -------- |
| Household Onboarding | First successful booking | 500 XAF  |
| Collector Onboarding | First completed pickup   | 1000 XAF |
| Subscription Payment | Subscription paid        | 10%      |

---

# 4. Smoke Test Checklist

Run this first after every deployment.

| Test                      | Expected Result                 |
| ------------------------- | ------------------------------- |
| Backend starts            | No crash                        |
| Admin dashboard loads     | Login screen visible            |
| Mobile app launches       | Login screen visible            |
| Admin can login           | Redirects to dashboard          |
| Household can login       | Redirects to household home     |
| Collector can login       | Redirects to collector home     |
| Marketer can login        | Redirects to marketer dashboard |
| Health endpoint works     | Returns OK                      |
| Database connection works | No DB error                     |
| SMS mock/provider works   | Invite can be sent              |
| File upload works         | Image uploads successfully      |

---

# 5. Household Flow Tests

## H-001: Household onboarding

**Steps**

1. Open mobile app.
2. Select Household role.
3. Enter phone number.
4. Complete OTP verification.
5. Enter profile information.
6. Finish onboarding.

**Expected**

* User account is created as `HOUSEHOLD`.
* User lands on household dashboard.
* No collector or marketer screens are visible.

---

## H-002: Household booking without subscription

**Precondition**

* Household has no active subscription.

**Steps**

1. Go to Schedule Pickup.
2. Select pickup date and time (must be at least `booking.min_advance_hours` ahead — default 24h).
3. Select pickup details.
4. Continue to pricing screen.

**Expected**

* UI clearly shows:

  * No active subscription
  * Pay-per-pickup price: 1000 XAF or configured value
  * Subscription offer: 3500 XAF/month or configured value
  * Cash payment option if `payments.cash_enabled = true`
* User can choose Pay per pickup or Subscribe.
* Scheduling a pickup less than `booking.min_advance_hours` in the future is rejected with a clear error.
* Calendar does not allow selection beyond `booking.max_advance_days` ahead (default 30 days).

---

## H-002b: Household pays via manual provider

**Precondition**

* `payment.integration_enabled = false` (manual provider mode).
* At least one payment provider is configured.

**Steps**

1. Schedule pickup.
2. Select payment method (e.g. MTN Mobile Money).
3. Follow manual payment instructions shown by the app.
4. Upload payment proof screenshot.
5. Submit.

**Expected**

* Job is created with `paymentMode = MANUAL_PROVIDER` and `paymentStatus = AWAITING_ADMIN_VERIFICATION`.
* Job status is `PAYMENT_PENDING` until admin verifies.
* Assignment does not happen until payment is verified.

---

## H-002c: Household pays via integrated provider

**Precondition**

* `payment.integration_enabled = true`.
* Payment gateway sandbox is active.

**Steps**

1. Schedule pickup.
2. Select integrated provider (e.g. MTN MoMo with OTP).
3. Enter phone number and OTP.
4. Submit.

**Expected**

* Job `paymentStatus = PROVIDER_PENDING` while gateway processes.
* On gateway confirmation: `paymentStatus = VERIFIED`, job proceeds to assignment.
* On timeout/failure: `paymentStatus = FAILED`, `jobStatus = PAYMENT_FAILED`.

---

## H-002d: Household selects cash payment

**Precondition**

* `payments.cash_enabled = true`.

**Steps**

1. Schedule pickup.
2. Select Cash as payment method.
3. Submit.

**Expected**

* Job is created with `paymentMode = CASH`, `paymentStatus = PENDING`.
* Job proceeds directly to assignment (no upfront payment required).
* Only collectors with sufficient float balance are eligible for assignment.

---

## H-003: Household subscribes

**Steps**

1. From pricing screen, select Subscribe.
2. Choose payment method.
3. Complete payment in sandbox/mock.
4. Return to dashboard.

**Expected**

* Subscription becomes active.
* Dashboard shows plan name.
* Dashboard shows weekly pickups remaining.
* Subscription payment event is emitted.
* If user was referred by marketer, subscription commission is created.

---

## H-004: Household booking with active subscription

**Precondition**

* Household has active subscription with remaining weekly pickups.

**Steps**

1. Schedule pickup.
2. Continue to confirmation.

**Expected**

* Price is shown as 0 XAF.
* UI says pickup is covered by subscription.
* Remaining weekly pickup count is reduced at the correct lifecycle point, based on system rules.

---

## H-005: Household exceeds subscription quota

**Precondition**

* Household has active subscription but no weekly pickups remaining.

**Steps**

1. Try to schedule another pickup.

**Expected**

* UI shows weekly quota reached.
* User is asked to pay per pickup or upgrade plan.
* Booking cannot be falsely marked free.

---

## H-006: Household tracks active pickup

**Steps**

1. Create booking.
2. Wait for collector assignment.
3. Open booking detail.

**Expected**

* Status timeline updates correctly for the payment mode:

  * (If payment required) Payment Pending → Payment Verified
  * Requested → Assigned → In Progress → Completed → Validated
* `PAYMENT_FAILED` is shown clearly if payment is rejected/timed out.
* Collector info appears when assigned.
* Live tracking appears when job is in progress.

---

## H-007: Household validates completed pickup

**Precondition**

* Collector has completed job and uploaded proof.

**Steps**

1. Open completed booking.
2. View proof image.
3. Click Confirm Pickup.

**Expected**

* Job moves to `VALIDATED`.
* Collector earning is confirmed.
* Household can now rate collector.

---

## H-008: Household disputes pickup

**Precondition**

* Job is completed with proof.

**Steps**

1. Open booking detail.
2. Click Report Issue.
3. Enter dispute reason.
4. Submit.

**Expected**

* Job moves to `DISPUTED`.
* Dispute is created.
* Earnings are not confirmed.
* Admin can see dispute.

---

## H-009: Household rates collector

**Precondition**

* Job is validated.

**Steps**

1. Open validated booking.
2. Add rating from 1 to 5.
3. Add optional comment.
4. Submit.

**Expected**

* Rating is saved.
* Duplicate rating is rejected.
* Collector average rating updates.
* Job moves to rated state if supported.

---

# 6. Collector Flow Tests

## C-001: Collector onboarding

**Steps**

1. Open app.
2. Login as collector.
3. Complete collector profile if required.

**Expected**

* User lands on collector dashboard.
* Collector can go online/offline.
* Household and marketer features are hidden.

---

## C-002: Collector receives assigned job

**Precondition**

* Household has created pickup.
* Assignment engine has selected collector.

**Steps**

1. Login as assigned collector.
2. Open collector home.

**Expected**

* Assigned job card is visible.
* Job details show:

  * area
  * time window
  * estimated earnings
  * customer contact if allowed
* Accept and reject actions are visible.

---

## C-003: Collector accepts job

**Steps**

1. Click Accept Job.

**Expected**

* Job status updates correctly.
* Household receives update.
* Collector sees navigation/start flow.

---

## C-004: Collector rejects job

**Steps**

1. Click Reject Job.

**Expected**

* Job is released or reassigned.
* Rejection event is recorded.
* Household does not see collector as active.

---

## C-005: Collector starts job

**Steps**

1. Accept job.
2. Click Start Pickup.

**Expected**

* Job moves to `IN_PROGRESS`.
* Live location tracking is allowed.
* Collector cannot start unrelated jobs.

---

## C-006: Collector sends location update

**Steps**

1. Start job.
2. Send location update.

**Expected**

* Location is accepted only for assigned collector.
* Job must be in progress.
* Household receives location update.
* Invalid coordinates are rejected.

---

## C-007: Collector completes job with proof

**Steps**

1. Click Complete Job.
2. Upload proof image.
3. Submit.

**Expected**

* File uploads successfully.
* Proof record is created.
* Job moves to `COMPLETED`.
* Household receives completion notification.
* Pending earning is created or updated correctly.

---

## C-007b: Collector completes CASH job

**Precondition**

* Job has `paymentMode = CASH`.
* Collector has sufficient `collectorFloatBalance`.

**Steps**

1. Click Complete Job.
2. Toggle "Cash Collected" to true.
3. Enter `collectedAmount` (must be >= `quotedPrice`).
4. Upload proof image.
5. Submit.

**Expected**

* Job moves to `COMPLETED`.
* `paymentStatus` becomes `VERIFIED`.
* `platformShare = max(quotedPrice - collectorEarning, 0)` is deducted from collector float atomically.
* A ledger entry of type `CASH_SETTLEMENT_DEDUCTION` is recorded.
* Collector earnings are calculated using the standard formula (not based on payment mode).
* Submitting with `collectedAmount < quotedPrice` is rejected with a clear error.

---

## C-007c: Collector with insufficient float cannot be assigned CASH job

**Precondition**

* Job has `paymentMode = CASH`.
* Collector's `collectorFloatBalance` is below the estimated `platformShare`.

**Expected**

* Collector does not appear in the assignment pool for this job.
* Assignment engine skips the collector silently.

---

## C-008: Collector earnings confirmed

**Precondition**

* Household validates proof.

**Expected**

* Earning status moves from pending to confirmed.
* Collector earnings screen updates.
* Earnings are not confirmed if disputed.

---

## C-009: Collector cashout request

**Steps**

1. Open earnings.
2. Request cashout.
3. Enter amount and mobile money number.
4. Submit.

**Expected**

* Payout request is created.
* Available balance is adjusted according to business rules.
* Admin can approve/reject/mark paid.

---

# 7. Admin Dashboard Tests

## A-001: Admin user access

**Steps**

1. Login as admin.
2. Open dashboard.

**Expected**

* Admin navigation is visible.
* Marketers, Growth Leads, Commissions, and Marketer Payouts appear in nav for Growth module. PR #6 added those navigation items. 

---

## A-002: Non-admin cannot access admin routes

**Steps**

1. Login as household, collector, or marketer.
2. Try to open admin URL.

**Expected**

* Access is denied.
* User is redirected or receives forbidden response.

---

## A-003: Admin views jobs

**Steps**

1. Open Jobs page.
2. Filter by status.
3. Open job detail.

**Expected**

* All jobs are visible to admin.
* Filters work.
* Details include household, collector, status, proof, pricing.

---

## A-004: Admin manually assigns job

**Steps**

1. Open requested job.
2. Select active collector.
3. Assign.

**Expected**

* Assignment uses backend assignment logic.
* Job becomes assigned.
* Collector receives notification.

---

## A-005: Admin resolves dispute

**Steps**

1. Open Disputes.
2. Select open dispute.
3. Accept or reject.
4. Submit admin notes.

**Expected**

* Dispute status updates.
* Job status updates according to decision.
* Events are emitted.

---

## A-006: Admin updates pricing config

**Steps**

1. Open Config or Subscription Plans.
2. Update:

   * monthly subscription price
   * pickups per week
   * per-pickup price
   * `booking.min_advance_hours`
   * `booking.max_advance_days`
3. Save.

**Expected**

* New values apply to future bookings.
* Existing active subscriptions behave according to defined policy.
* Mobile app respects new booking interval values after next `app-config` fetch.

---

## A-007: Admin verifies manual payment proof

**Precondition**

* A job has `paymentStatus = AWAITING_ADMIN_VERIFICATION`.

**Steps**

1. Open Pending Payments page.
2. Find the job.
3. View uploaded proof screenshot.
4. Click Verify Payment.

**Expected**

* `paymentStatus` becomes `VERIFIED`.
* `jobStatus` moves from `PAYMENT_PENDING` to `REQUESTED` (enters assignment queue).
* Household receives a notification that payment was verified.

---

## A-008: Admin rejects manual payment proof

**Precondition**

* A job has `paymentStatus = AWAITING_ADMIN_VERIFICATION`.

**Steps**

1. Open Pending Payments page.
2. Find the job.
3. Click Reject Payment.
4. Enter rejection reason.

**Expected**

* `paymentStatus` becomes `FAILED`.
* `jobStatus` becomes `PAYMENT_FAILED` (terminal).
* Household receives a notification that payment was rejected.

---

## A-009: Admin tops up collector float

**Precondition**

* A collector exists with `collectorFloatBalance = 0`.

**Steps**

1. Open collector profile in admin dashboard.
2. Click Float Top-Up.
3. Enter top-up amount.
4. Confirm.

**Expected**

* `collectorFloatBalance` increases by the entered amount.
* A ledger entry of type `TOP_UP` is recorded with `balanceBefore` and `balanceAfter`.
* Collector is now eligible for CASH jobs up to that float value.

---

## A-010: Admin manages payment providers

**Steps**

1. Open Payment Providers page.
2. Sync providers from gateway for `cmr`.
3. Enable/disable a provider.

**Expected**

* Providers are upserted from the gateway.
* Disabled provider does not appear in mobile payment method list.
* Enabled provider appears correctly in mobile app.

---

# 8. Growth / Ambassador System Tests

## G-001: Admin creates marketer

**Steps**

1. Login as admin.
2. Open Marketers page.
3. Create marketer with name, phone, email, territory.
4. Submit.

**Expected**

* User is created with role `MARKETER`.
* Marketer profile is created.
* Referral code is generated.
* Account starts with correct status.
* Marketer can login if active.

---

## G-002: Marketer login routing

**Steps**

1. Login with marketer credentials.

**Expected**

* App detects role `MARKETER`.
* User is routed to marketer dashboard.
* Household and collector screens are hidden.

---

## G-003: Marketer creates household lead

**Steps**

1. Open marketer dashboard.
2. Click Onboard New Lead.
3. Select Household.
4. Enter name, phone, area, notes.
5. Submit.

**Expected**

* Lead is created.
* Referral token is generated.
* SMS invite is sent or queued.
* Lead status is `INVITED`.
* SMS status is visible.
* Daily lead limit is respected.

---

## G-004: Marketer creates collector lead

**Steps**

1. Open Onboard Lead.
2. Select Collector.
3. Enter required fields.
4. Submit.

**Expected**

* Collector lead is created.
* SMS invite is sent.
* No collector account is created yet.

---

## G-005: Duplicate lead prevention

**Steps**

1. Create a lead with a phone number.
2. Try to create another active lead with the same phone.

**Expected**

* System rejects duplicate active lead.
* Error message is clear.
* Expired leads follow defined retry/resend behavior.

---

## G-006: Referral token registration

**Steps**

1. Open referral link from SMS.
2. Complete signup.

**Expected**

* Token is validated.
* User account is created.
* User is linked to lead.
* User has `referredByMarketerId`, `leadId`, and `referralTokenUsed`.
* Lead moves to `REGISTERED`.

---

## G-007: Expired referral token

**Steps**

1. Use expired referral link.

**Expected**

* Registration through token is rejected.
* User is told invite expired.
* Marketer can resend if allowed.

---

## G-008: Claimed referral token reuse

**Steps**

1. Register once with a referral token.
2. Try to register another account with same token.

**Expected**

* Second use is rejected.
* No duplicate attribution is created.

---

## G-009: Resend invite

**Steps**

1. Open lead detail.
2. Click Resend SMS.

**Expected**

* New referral token is generated if allowed.
* Old token is invalidated.
* SMS retry count resets.
* SMS status updates.
* Resend is blocked for states where business rules disallow it.

---

## G-010: Share referral link / QR

**Steps**

1. Open lead detail.
2. Click Share QR or WhatsApp link.

**Expected**

* Referral link is generated.
* QR code points to valid referral URL.
* WhatsApp text includes referral link.
* Link maps back to correct lead and marketer.

---

# 9. Commission Engine Tests

## CE-001: Household commission on first successful booking

**Precondition**

* Household registered through marketer referral.
* Commission scheme is active.

**Steps**

1. Household completes first successful booking.

**Expected**

* Commission transaction is created.
* Trigger type is `FIRST_SUCCESSFUL_BOOKING`.
* Amount is 500 XAF or configured amount.
* Status is `PENDING`.
* Duplicate event does not create duplicate commission.

---

## CE-002: Collector commission on first completed pickup

**Precondition**

* Collector registered through marketer referral.

**Steps**

1. Collector completes first pickup.

**Expected**

* Commission is created.
* Trigger type is `FIRST_PICKUP_COMPLETED`.
* Amount is 1000 XAF or configured amount.
* Status is `PENDING`.
* Duplicate job completed event does not duplicate commission.

---

## CE-003: Subscription commission

**Precondition**

* Household registered through marketer referral.
* Subscription scheme active.

**Steps**

1. Household pays subscription.

**Expected**

* Commission is calculated as percentage of subscription amount.
* For 3500 XAF and 10%, commission is 350 XAF.
* Transaction status is `PENDING`.
* Duplicate subscription paid event does not create duplicate commission.

---

## CE-004: Commission scheme inactive

**Steps**

1. Deactivate scheme.
2. Trigger qualifying event.

**Expected**

* No commission is created for inactive scheme.

---

## CE-005: Marketer scheme assignment inactive

**Steps**

1. Disable marketer’s assigned scheme.
2. Trigger qualifying event.

**Expected**

* No commission is created for that marketer/scheme.

---

## CE-006: Commission approval

**Steps**

1. Admin opens Commissions page.
2. Approves pending commission.

**Expected**

* Status changes to `APPROVED`.
* `approvedAt` and `approvedBy` are set.
* Marketer available balance increases.
* `totalEarned` is updated according to system rules.
* PR #6 includes a fix to increment totalEarned on commission approval. 

---

## CE-007: Commission rejection

**Steps**

1. Admin rejects pending commission with reason.

**Expected**

* Status changes to `REJECTED`.
* Rejection reason is stored.
* No available balance is credited.
* Marketer can see rejected status if exposed.

---

## CE-008: Commission idempotency

**Steps**

1. Emit same qualifying event twice with same reference ID.

**Expected**

* Only one commission transaction exists for that trigger/reference.
* Second event is ignored safely.

---

# 10. Marketer Payout Tests

## MP-001: Marketer requests payout

**Precondition**

* Marketer has approved available balance.

**Steps**

1. Open Commissions screen.
2. Click Request Payout.
3. Enter amount, MTN/Orange method, phone number.
4. Submit.

**Expected**

* Payout request is created.
* Amount cannot exceed available balance.
* Balance is reserved or deducted transactionally.

---

## MP-002: Payout request rejected

**Steps**

1. Admin rejects payout request.
2. Enter reason.

**Expected**

* Status becomes `REJECTED`.
* Reserved amount is returned to available balance.
* Admin note is stored.

---

## MP-003: Payout approved

**Steps**

1. Admin approves payout.

**Expected**

* Status becomes `APPROVED`.
* No paid reference required yet unless policy says otherwise.

---

## MP-004: Payout marked paid

**Steps**

1. Admin manually sends MTN/Orange payment.
2. Admin clicks Mark Paid.
3. Enters transaction reference.

**Expected**

* Status becomes `PAID`.
* `paidReference` is required.
* `paidAt` is set.
* `totalPaid` updates.
* Available balance does not double-deduct.

---

## MP-005: Payout race condition

**Steps**

1. Attempt two payout requests simultaneously for same available balance.

**Expected**

* Only valid amount is allowed.
* No negative balance.
* Transaction lock or atomic update prevents double spend.

---

# 11. SMS / Referral Tests

## SMS-001: SMS sent successfully

**Steps**

1. Create lead.

**Expected**

* SMS provider is called.
* `smsStatus` becomes `SENT`.
* Provider message ID is stored if available.

---

## SMS-002: SMS delivery callback

**Steps**

1. Simulate delivery callback.

**Expected**

* `smsStatus` becomes `DELIVERED`.
* `smsDeliveredAt` is set.

---

## SMS-003: SMS failure

**Steps**

1. Simulate provider failure.

**Expected**

* Retry happens up to configured max.
* `smsRetryCount` increases.
* Final status becomes `FAILED`.
* Lead remains visible for resend.

---

## SMS-004: SMS opt-out

**Steps**

1. Simulate STOP response if supported.

**Expected**

* User phone is marked opted out.
* Future SMS sending is blocked.
* Admin can see opt-out state.

---

# 12. Security and Access Control Tests

## SEC-001: Marketer data scoping

**Steps**

1. Login as Marketer A.
2. Try to access Marketer B’s lead, commission, or payout by ID.

**Expected**

* Access denied.
* No cross-marketer data leakage.

---

## SEC-002: Household cannot access marketer endpoints

**Expected**

* HTTP 403 or equivalent.

---

## SEC-003: Collector cannot access marketer endpoints

**Expected**

* HTTP 403 or equivalent.

---

## SEC-004: Marketer cannot access admin endpoints

**Expected**

* HTTP 403 or equivalent.

---

## SEC-005: Referral token is non-guessable

**Expected**

* Token is crypto-random.
* Referral code is not usable as secure token.
* Invalid token returns safe error.

---

## SEC-006: Lead creation rate limit

**Steps**

1. Create leads above daily limit.

**Expected**

* Requests are rejected after limit.
* Limit cannot be bypassed by parallel requests.
* PR #6 mentions atomic daily limit enforcement, so this should be verified under concurrency. 

---

# 13. Regression Tests

Run after every major PR.

| Area          | Regression Check                                                   |
| ------------- | ------------------------------------------------------------------ |
| Auth          | All roles login correctly                                          |
| Household     | Booking still works                                                |
| Household     | Booking advance-hours validation enforced (server + mobile)        |
| Collector     | Job acceptance/completion still works                              |
| Collector     | CASH job completion deducts float correctly                        |
| Admin         | Existing admin pages still work                                    |
| Admin         | Pending Payments page loads and verify/reject actions work         |
| Admin         | Float top-up updates balance and creates ledger entry              |
| Pricing       | Subscription/per-pickup logic still works                          |
| Payments      | `paymentMode = NONE` (subscription) jobs skip payment flow         |
| Payments      | `paymentMode = MANUAL_PROVIDER` jobs wait for admin verification   |
| Payments      | `paymentMode = CASH` float guard prevents under-funded assignments |
| Files         | Proof upload still works                                           |
| Notifications | Job events still notify users                                      |
| Growth        | Marketer routes do not break other roles                           |

---

# 14. End-to-End Master Test

Run this before production.

## E2E-001: Full household + marketer growth flow

**Steps**

1. Admin creates marketer.
2. Marketer logs into mobile app.
3. Marketer creates household lead.
4. SMS invite is generated.
5. Household registers through referral link.
6. Household subscribes.
7. Subscription commission is created.
8. Household schedules pickup.
9. Collector accepts job.
10. Collector completes job with proof.
11. Household validates proof.
12. Household rates collector.
13. Admin approves commission.
14. Marketer requests payout.
15. Admin marks payout paid.

**Expected**

* Every role sees correct screen.
* Every status transition is correct.
* No duplicate commissions.
* Balances are correct.
* Audit trail is complete.

---

## E2E-002: Full collector referral flow

**Steps**

1. Marketer creates collector lead.
2. Collector registers through referral link.
3. Admin/verification activates collector if required.
4. Collector receives job.
5. Collector completes first pickup.
6. Commission is created for marketer.
7. Admin approves commission.
8. Marketer requests payout.

**Expected**

* Collector onboarding commission is created only after first completed pickup.
* No commission is paid for inactive collector.

---

# 15. Release Gate

Do not release unless:

```text
[ ] Backend build passes
[ ] Admin dashboard build passes
[ ] Flutter build passes
[ ] Fresh database migration passes
[ ] Existing data migration passes
[ ] Smoke tests pass
[ ] Household E2E passes
[ ] Collector E2E passes
[ ] Growth E2E passes
[ ] Access control tests pass
[ ] No duplicate commission bug found
[ ] No negative wallet/balance possible
[ ] Payout audit trail complete
[ ] CASH job float deduction is atomic (no double-spend)
[ ] Manual payment proof verify/reject both work
[ ] PAYMENT_FAILED status is terminal and handled in mobile UI
[ ] booking.min_advance_hours enforced server-side and mobile calendar
[ ] Collector float ledger entries created for all float changes
```

---

# 16. PR #7 Verified Test Results — Hybrid Payment & Booking Config

**PR:** `feat/hybrid-payment-refinement`
**Date verified:** 2026-05-20
**Verified by:** ngaielizabeth

| # | Test | Result |
|---|------|--------|
| 1 | Backend build passes after final update | ✅ Pass |
| 2 | Admin dashboard build passes | ✅ Pass |
| 3 | Mobile (Flutter) build passes | ✅ Pass |
| 4 | Migration runs cleanly on a fresh DB | ✅ Pass |
| 5 | Existing jobs without `paymentMode` do not break | ✅ Pass |
| 6 | CASH completion creates float ledger deduction correctly | ✅ Pass |
| 7 | Manual provider payment approval moves job to `REQUESTED` | ✅ Pass |
| 8 | Payment rejection moves job to `PAYMENT_FAILED` | ✅ Pass |
| 9 | Subscription-covered booking creates `REQUESTED` without payment method | ✅ Pass |
| 10 | Booking date limits respect `minAdvanceHours` / `maxAdvanceDays` from config | ✅ Pass |

**Release gate status:** ✅ All PR #7 checks passed. Safe to merge.

---
