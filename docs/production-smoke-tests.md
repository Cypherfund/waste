# Production Smoke Tests

This document outlines the smoke tests to run after deploying to production to verify the system is functioning correctly.

## Test Environment

- **Base URL:** `https://api.kmertrash.com`
- **Admin URL:** `https://admin.kmertrash.com`
- **Mobile App:** Production build
- **Test Accounts:** Use dedicated test accounts (not real user data)

## Pre-Test Setup

1. Create test accounts:
   - Household user: `test-household@example.com`
   - Collector user: `test-collector@example.com`
   - Admin user: `test-admin@example.com`

2. Fund test wallet with small amount for payment tests

3. Configure test payment provider in sandbox mode

## Health Endpoint Tests

### Test 1: Liveness Endpoint

```bash
curl https://api.kmertrash.com/health/liveness
```

**Expected Result:**
```json
{
  "status": "ok",
  "uptimeSeconds": 123
}
```

**Pass Criteria:** HTTP 200, status is "ok"

---

### Test 2: Readiness Endpoint

```bash
curl https://api.kmertrash.com/health/ready
```

**Expected Result:**
```json
{
  "status": "ready",
  "database": "healthy",
  "redis": "healthy"
}
```

**Pass Criteria:** HTTP 200, all services healthy

---

### Test 3: General Health Endpoint

```bash
curl https://api.kmertrash.com/health
```

**Expected Result:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-05-30T12:00:00Z"
}
```

**Pass Criteria:** HTTP 200, status is "healthy"

---

## Authentication Tests

### Test 4: Household Registration

```bash
curl -X POST https://api.kmertrash.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-household@example.com",
    "phone": "+237670000001",
    "password": "TestPass123!",
    "name": "Test Household",
    "role": "HOUSEHOLD"
  }'
```

**Expected Result:** HTTP 201, returns user object with ID

**Pass Criteria:** User created successfully, can login

---

### Test 5: Household Login

```bash
curl -X POST https://api.kmertrash.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+237670000001",
    "password": "TestPass123!"
  }'
```

**Expected Result:** HTTP 200, returns access token and refresh token

**Pass Criteria:** Tokens received, can access protected endpoints

---

### Test 6: Collector Login

```bash
curl -X POST https://api.kmertrash.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+237670000002",
    "password": "TestPass123!"
  }'
```

**Expected Result:** HTTP 200, returns tokens

**Pass Criteria:** Collector can login successfully

---

### Test 7: Admin Login

```bash
curl -X POST https://api.kmertrash.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+237670000003",
    "password": "AdminPass123!"
  }'
```

**Expected Result:** HTTP 200, returns tokens with admin role

**Pass Criteria:** Admin can login successfully

---

## Job Creation Tests

### Test 8: Create Pickup Job

```bash
curl -X POST https://api.kmertrash.com/jobs \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "householdId": "<HOUSEHOLD_ID>",
    "wasteType": "PLASTIC",
    "scheduledDate": "2026-06-01",
    "scheduledTime": "09:00",
    "locationAddress": "Test Address, Douala",
    "locationLat": 4.0511,
    "locationLng": 9.7678,
    "notes": "Smoke test job"
  }'
```

**Expected Result:** HTTP 201, returns job object with status "REQUESTED"

**Pass Criteria:** Job created, status is REQUESTED

---

### Test 9: List Available Jobs (Collector)

```bash
curl -X GET "https://api.kmertrash.com/jobs/available?lat=4.0511&lng=9.7678" \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

**Expected Result:** HTTP 200, returns list of available jobs

**Pass Criteria:** Created job appears in available jobs list

---

## Job Assignment Tests

### Test 10: Assign Collector to Job

```bash
curl -X POST https://api.kmertrash.com/jobs/<JOB_ID>/assign \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "collectorId": "<COLLECTOR_ID>"
  }'
```

**Expected Result:** HTTP 200, job status changes to "ASSIGNED"

**Pass Criteria:** Job assigned to collector, status updated

---

### Test 11: Collector Accept Job

```bash
curl -X POST https://api.kmertrash.com/jobs/<JOB_ID>/accept \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

**Expected Result:** HTTP 200, job status changes to "ACCEPTED"

**Pass Criteria:** Collector can accept assigned job

---

## Job Execution Tests

### Test 12: Start Job

```bash
curl -X POST https://api.kmertrash.com/jobs/<JOB_ID>/start \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

**Expected Result:** HTTP 200, job status changes to "IN_PROGRESS"

**Pass Criteria:** Job started, status updated

---

### Test 13: Complete Job

```bash
curl -X POST https://api.kmertrash.com/jobs/<JOB_ID>/complete \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "photos": ["photo1.jpg", "photo2.jpg"],
    "weightKg": 10.5,
    "notes": "Job completed successfully"
  }'
```

**Expected Result:** HTTP 200, job status changes to "COMPLETED"

**Pass Criteria:** Job completed, photos uploaded

---

## Payment Tests

### Test 14: Get Wallet Balance

```bash
curl -X GET https://api.kmertrash.com/wallet/balance \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>"
```

**Expected Result:** HTTP 200, returns balance

**Pass Criteria:** Balance retrieved successfully

---

### Test 15: Top Up Wallet (Manual)

```bash
curl -X POST https://api.kmertrash.com/wallet/top-up \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "paymentMethodId": "<PAYMENT_METHOD_ID>",
    "paymentRef": "TEST-REF-001",
    "paymentProofUrl": "https://example.com/proof.jpg"
  }'
```

**Expected Result:** HTTP 200, creates pending transaction

**Pass Criteria:** Top-up request created, wallet balance unchanged (pending approval)

---

### Test 16: Approve Wallet Top-Up (Admin)

```bash
curl -X POST https://api.kmertrash.com/admin/payouts/<TRANSACTION_ID>/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Result:** HTTP 200, transaction status changes to "COMPLETED"

**Pass Criteria:** Top-up approved, wallet balance increased

---

### Test 17: Pay Job with Wallet

```bash
curl -X POST https://api.kmertrash.com/wallet/pay-job \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<JOB_ID>"
  }'
```

**Expected Result:** HTTP 200, payment successful

**Pass Criteria:** Job paid, wallet balance decreased, collector balance increased

---

## Subscription Tests

### Test 18: Get Subscription Plans

```bash
curl -X GET https://api.kmertrash.com/subscriptions/plans \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>"
```

**Expected Result:** HTTP 200, returns list of plans

**Pass Criteria:** Plans retrieved successfully

---

### Test 19: Subscribe with Wallet

```bash
curl -X POST https://api.kmertrash.com/subscriptions/subscribe \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "<PLAN_ID>",
    "paymentMode": "WALLET"
  }'
```

**Expected Result:** HTTP 200, subscription created

**Pass Criteria:** Subscription active, wallet balance decreased

---

### Test 20: Subscribe with Manual Payment

```bash
curl -X POST https://api.kmertrash.com/subscriptions/subscribe \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "<PLAN_ID>",
    "paymentMode": "MANUAL",
    "paymentPhone": "+237650931636",
    "paymentRef": "TEST-SUB-001"
  }'
```

**Expected Result:** HTTP 200, creates pending subscription

**Pass Criteria:** Subscription pending approval

---

## Notification Tests

### Test 21: Send Test Notification

```bash
curl -X POST https://api.kmertrash.com/notifications/send \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<HOUSEHOLD_ID>",
    "title": "Smoke Test Notification",
    "body": "This is a test notification",
    "type": "INFO"
  }'
```

**Expected Result:** HTTP 200, notification queued

**Pass Criteria:** Notification sent, received on device

---

## Admin Dashboard Tests

### Test 22: Access Admin Dashboard

1. Navigate to `https://admin.kmertrash.com`
2. Login with admin credentials
3. Verify dashboard loads

**Pass Criteria:** Dashboard accessible, data displays correctly

---

### Test 23: View Jobs in Admin

1. Navigate to Jobs page
2. Verify job list displays
3. Click on a job to view details

**Pass Criteria:** Jobs visible, details load correctly

---

### Test 24: View Users in Admin

1. Navigate to Users page
2. Verify user list displays
3. Search for test user

**Pass Criteria:** Users visible, search works

---

### Test 25: View Wallet Transactions

1. Navigate to Wallet page
2. Verify transaction list displays
3. Check test transaction appears

**Pass Criteria:** Transactions visible, test data shows

---

## Data Integrity Tests

### Test 26: Verify Audit Log

```bash
curl -X GET "https://api.kmertrash.com/admin/audit-logs?limit=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Result:** HTTP 200, returns audit log entries

**Pass Criteria:** Audit logs being created for actions

---

### Test 27: Verify Wallet Ledger

```bash
curl -X GET "https://api.kmertrash.com/admin/wallet-ledger?limit=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Result:** HTTP 200, returns ledger entries

**Pass Criteria:** Wallet ledger entries created for transactions

---

### Test 28: Verify Reconciliation Report

```bash
curl -X GET "https://api.kmertrash.com/admin/reconciliation/reports?limit=5" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Result:** HTTP 200, returns reconciliation reports

**Pass Criteria:** Reconciliation reports being generated

---

## Mobile App Tests

### Test 29: Mobile App Launch

1. Open production mobile app
2. Verify splash screen displays
3. Verify app loads without crash

**Pass Criteria:** App launches successfully

---

### Test 30: Mobile Login

1. Enter test household credentials
2. Tap login
3. Verify login successful

**Pass Criteria:** Can login on mobile app

---

### Test 31: Create Job from Mobile

1. Navigate to Schedule Pickup
2. Fill in job details
3. Submit job
4. Verify job created

**Pass Criteria:** Job created from mobile app

---

### Test 32: Receive Notification

1. Trigger a notification from backend
2. Verify notification appears on device
3. Tap notification
4. Verify app opens to correct screen

**Pass Criteria:** Notifications working on mobile

---

## Performance Tests

### Test 33: API Response Time

```bash
time curl https://api.kmertrash.com/health/liveness
```

**Expected Result:** Response time < 500ms

**Pass Criteria:** API responding within acceptable time

---

### Test 34: Database Query Performance

Monitor slow query logs during smoke tests

**Pass Criteria:** No queries exceeding 1 second

---

## Error Handling Tests

### Test 35: Invalid Login

```bash
curl -X POST https://api.kmertrash.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+237670000001",
    "password": "WrongPassword"
  }'
```

**Expected Result:** HTTP 401, error message

**Pass Criteria:** Invalid credentials rejected gracefully

---

### Test 36: Invalid Job Creation

```bash
curl -X POST https://api.kmertrash.com/jobs \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "wasteType": "INVALID_TYPE"
  }'
```

**Expected Result:** HTTP 400, validation error

**Pass Criteria:** Invalid data rejected with clear error message

---

### Test 37: Insufficient Wallet Balance

```bash
# Attempt to pay job with insufficient balance
curl -X POST https://api.kmertrash.com/wallet/pay-job \
  -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<JOB_ID>"
  }'
```

**Expected Result:** HTTP 400, insufficient balance error

**Pass Criteria:** Payment rejected with clear error

---

## Smoke Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Liveness Endpoint | ☐ | |
| 2 | Readiness Endpoint | ☐ | |
| 3 | General Health Endpoint | ☐ | |
| 4 | Household Registration | ☐ | |
| 5 | Household Login | ☐ | |
| 6 | Collector Login | ☐ | |
| 7 | Admin Login | ☐ | |
| 8 | Create Pickup Job | ☐ | |
| 9 | List Available Jobs | ☐ | |
| 10 | Assign Collector to Job | ☐ | |
| 11 | Collector Accept Job | ☐ | |
| 12 | Start Job | ☐ | |
| 13 | Complete Job | ☐ | |
| 14 | Get Wallet Balance | ☐ | |
| 15 | Top Up Wallet (Manual) | ☐ | |
| 16 | Approve Wallet Top-Up | ☐ | |
| 17 | Pay Job with Wallet | ☐ | |
| 18 | Get Subscription Plans | ☐ | |
| 19 | Subscribe with Wallet | ☐ | |
| 20 | Subscribe with Manual Payment | ☐ | |
| 21 | Send Test Notification | ☐ | |
| 22 | Access Admin Dashboard | ☐ | |
| 23 | View Jobs in Admin | ☐ | |
| 24 | View Users in Admin | ☐ | |
| 25 | View Wallet Transactions | ☐ | |
| 26 | Verify Audit Log | ☐ | |
| 27 | Verify Wallet Ledger | ☐ | |
| 28 | Verify Reconciliation Report | ☐ | |
| 29 | Mobile App Launch | ☐ | |
| 30 | Mobile Login | ☐ | |
| 31 | Create Job from Mobile | ☐ | |
| 32 | Receive Notification | ☐ | |
| 33 | API Response Time | ☐ | |
| 34 | Database Query Performance | ☐ | |
| 35 | Invalid Login | ☐ | |
| 36 | Invalid Job Creation | ☐ | |
| 37 | Insufficient Wallet Balance | ☐ | |

## Pass Criteria

- All 37 tests must pass
- Any failure must be investigated and resolved
- Critical failures (health endpoints, auth, payments) block launch
- Non-critical failures may be documented and deferred

## Test Execution

**Executed by:** ___________________
**Date:** ___________________
**Environment:** Production
**Results:** ___/37 passed
**Go/No-Go:** ___________________
