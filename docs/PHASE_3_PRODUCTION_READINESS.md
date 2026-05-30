# Production Readiness Plan

## Overview

This document outlines the production readiness phases required before go-live. The platform has feature completeness (75-85%), but needs operational hardening, production monitoring, financial reconciliation, and release discipline.

## Current State Assessment

- **Feature completeness**: 75-85%
- **Technical launch readiness**: 60-70%
- **Financial safety readiness**: 55-65%
- **Operational readiness**: 45-55%

The biggest missing part is not "more features" - it is **production hardening**.

## Production Readiness Phases

### Phase 1: Financial Reconciliation (PRIORITY #1)

**Status**: 🔴 Not Started

**Objective**: Provide daily visibility into all money movements to answer critical financial questions.

**Money Flow Categories**:

**Money In**:
- Integrated provider payments verified
- Manual provider payments verified
- Wallet top-ups verified
- Cash collected by collectors

**Money Out / Liabilities**:
- Collector earnings
- Marketer commissions
- Approved payouts
- Wallet balance liabilities

**Internal Movements**:
- Wallet debits
- Collector float deductions
- Platform share from cash jobs
- Platform share from cash-on-first-pickup

**Pending / Risk**:
- Manual payments awaiting verification
- Failed provider payments
- Provider payments verified but wallet/job/subscription not updated
- Duplicate-looking wallet credits

**Reconciliation Metrics**:
1. Total payments received today
2. Total wallet credits
3. Total wallet debits
4. Total cash collected by collectors
5. Total collector float deductions
6. Total manual payments pending
7. Total failed provider payments
8. Total payout requests
9. Total commission liabilities

**Critical Questions to Answer**:
- How much money did we collect today?
- How much belongs to collectors?
- How much is pending admin verification?
- Which payments were confirmed by provider but not credited?
- Which wallet top-ups were credited twice?
- Which collectors owe platform money?

**Backend Outputs**:
- Daily summary
- Date range summary
- Unreconciled items list
- Mismatch alerts
- Export CSV

**API Endpoints**:
```http
GET /admin/reconciliation/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /admin/reconciliation/unreconciled?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /admin/reconciliation/export?from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Implementation**:
- Backend reconciliation service
- Admin reconciliation API endpoints
- Admin dashboard reconciliation page
- Date range filtering
- Summary cards
- Unreconciled/mismatch table
- CSV export
- Tests for reconciliation calculations

---

### Phase 2: Admin Audit Logs

**Status**: 🔴 Not Started

**Objective**: Every sensitive admin action must be traceable.

**Actions to Audit**:
- Payment approval/rejection
- Wallet top-up approval
- Payout approval
- System config changes
- Provider config changes
- Collector float adjustments
- Cleanup analysis execution
- Cleanup execution
- Subscription verification
- Subscription plan price changes

**Implementation**:
- `admin_audit_logs` table
- Audit middleware for admin routes
- Audit log viewer in admin dashboard
- Audit export functionality

**Schema Requirements**:
```typescript
{
  id: string
  adminId: string
  action: string
  entityType: string
  entityId: string
  oldValue: any
  newValue: any
  ipAddress: string
  userAgent: string
  timestamp: Date
}
```

---

### Phase 3: Backend Observability

**Status**: 🔴 Not Started

**Objective**: Add backend error tracking and structured logging for production visibility.

**Components**:
- Sentry integration for backend error tracking
- Structured logs with request ID
- Payment failure logs
- Wallet balance change logs
- Admin action logs
- Provider callback logs
- Notification delivery logs
- Daily error summary

**Business Flow Failure Logging**:
- JOB_CREATION_FAILED
- PAYMENT_VERIFICATION_FAILED
- WALLET_DEBIT_FAILED
- WALLET_CREDIT_FAILED
- SUBSCRIPTION_ACTIVATION_FAILED
- COLLECTOR_FLOAT_DEDUCTION_FAILED
- FCM_SEND_FAILED

**Implementation**:
- Sentry SDK integration
- Request ID middleware
- Structured logger service
- Business event logging service
- Error alerting rules

---

### Phase 4: CI/CD Hardening

**Status**: 🟡 Partial (backend test workflow added)

**Objective**: Every PR to main should automatically run all checks.

**Required Checks**:
- Backend build
- Backend unit tests
- Backend integration/e2e tests
- Admin dashboard build
- Admin dashboard tests
- Mobile flutter analyze
- Mobile flutter test
- Migration checks

**Current State**:
- ✅ Backend test workflow with Docker PostgreSQL
- ❌ Admin dashboard CI
- ❌ Mobile CI
- ❌ Migration validation

**Implementation**:
- Add admin dashboard test workflow
- Add mobile flutter analyze/test workflow
- Add migration dry-run check
- Block merge on failed checks
- Add deployment gates

---

### Phase 5: Production Readiness Checklist

**Status**: 🔴 Not Started

**Objective**: Formal go-live checklist to ensure nothing depends on memory.

**Pre-Launch Checklist**:

#### Backend
- [ ] Backend build passes
- [ ] Backend unit tests pass
- [ ] Backend integration tests pass
- [ ] Migrations tested on staging
- [ ] Seed data verified
- [ ] Production environment variables verified
- [ ] Database backup configured
- [ ] Restore test completed
- [ ] Migration rollback strategy documented

#### Mobile
- [ ] Mobile build passes
- [ ] Mobile tests pass
- [ ] Flutter analyze passes
- [ ] Firebase production config verified
- [ ] FCM tested on real Android devices
- [ ] Crashlytics tested
- [ ] App icon verified
- [ ] Splash screen verified
- [ ] App name verified
- [ ] Version code/version name set
- [ ] Release signing key configured
- [ ] ProGuard/R8 configured
- [ ] Permissions verified (Internet, Location, Notification)

#### Admin Dashboard
- [ ] Admin dashboard build passes
- [ ] Admin dashboard tests pass
- [ ] Admin user created
- [ ] Admin access verified

#### Payments
- [ ] Payment provider credentials verified
- [ ] Payment provider sandbox tested
- [ ] Payment provider production tested
- [ ] Manual payment flow tested
- [ ] Integrated payment flow tested
- [ ] Wallet top-up flow tested
- [ ] Wallet payment flow tested
- [ ] Cash-on-first-pickup flow tested

#### Configuration
- [ ] Feature configs reviewed
- [ ] System cleanup disabled in production
- [ ] ALLOW_SYSTEM_CLEANUP=false
- [ ] DEV_CLEANUP_CODE not exposed
- [ ] Test users removed
- [ ] Test providers removed or disabled

#### Security
- [ ] JWT expiry and refresh behavior verified
- [ ] Role guards on every admin endpoint verified
- [ ] Ownership checks verified (household jobs, collector jobs, marketer leads)
- [ ] Payment provider secrets not exposed to mobile
- [ ] No sensitive logs (tokens, phone numbers, secrets)
- [ ] Rate limiting on auth/payment endpoints

#### Monitoring
- [ ] Sentry configured
- [ ] Crashlytics configured
- [ ] Error alerting rules set
- [ ] Daily error summary configured

#### Staging
- [ ] Staging environment mirrors production
- [ ] Staging database same engine/version
- [ ] Staging Firebase project configured
- [ ] Payment provider sandbox credentials tested
- [ ] Staging mobile APK built and tested

---

## Financial State Machine Documentation

### Wallet Top-up
```
PENDING → VERIFIED
PENDING → FAILED
VERIFIED cannot be approved again
```

### Cash-on-First-Pickup
```
Subscription PENDING_PAYMENT
→ Job COMPLETED with exact cash
→ Subscription ACTIVE
→ Float deducted
```

### Job Payment
```
PENDING → VERIFIED
PENDING → FAILED
VERIFIED → COMPLETED
```

### Payout
```
PENDING → APPROVED
PENDING → REJECTED
APPROVED → PAID
```

---

## Idempotency Requirements

Every endpoint that changes money should survive duplicate requests:

**Endpoints to Verify**:
- [ ] Payment provider callbacks
- [ ] Manual payment approval
- [ ] Wallet top-up approval
- [ ] Wallet job payment
- [ ] Wallet subscription payment
- [ ] Cash job completion
- [ ] Cash-on-first-pickup completion
- [ ] Collector payout approval
- [ ] Marketer payout approval

**Current State**:
- ✅ Wallet top-up has idempotency
- ✅ Cash-on-first-pickup completion has job lock
- ❌ Other endpoints need verification

---

## Database Backup and Rollback Plan

**Requirements**:
- Automated daily backup
- Manual backup before every deployment
- Restore test completed
- Migration rollback strategy
- Production migration dry-run on staging

**Implementation**:
- Backup service integration
- Automated backup scheduling
- Backup verification process
- Rollback procedure documentation
- Migration validation workflow

---

## Staging Environment Requirements

Staging must mirror production:
- Same backend environment type
- Same database engine/version
- Same Firebase project type (staging Firebase)
- Same payment provider sandbox credentials
- Same admin dashboard build process
- Same mobile APK pointing to staging

---

## Notification QA Matrix

**App States to Test**:
- App open
- App in background
- App killed
- User logged out
- User logged in as household
- User logged in as collector
- User logged in as marketer

**Notification Flows to Test**:
- Job assigned
- Job accepted
- Payment verified/rejected
- Subscription activated
- Cash-first-pickup activated
- Wallet top-up approved/rejected
- Commission earned
- Payout approved/rejected
- App update available

---

## Security Hardening Checklist

**Before Launch Verification**:
- [ ] JWT expiry and refresh behavior
- [ ] Role guards on every admin endpoint
- [ ] Household cannot access another household's job
- [ ] Collector cannot complete another collector's job
- [ ] Marketer cannot see another marketer's leads
- [ ] Admin-only cleanup protected and disabled by default
- [ ] Payment provider secrets not exposed to mobile
- [ ] No sensitive logs: tokens, full phone numbers, provider secrets
- [ ] Rate limiting on auth/payment endpoints

---

## Implementation Priority

**Phase 1**: Financial reconciliation (CRITICAL - money safety)
**Phase 2**: Admin audit logs (HIGH - operational safety)
**Phase 3**: Backend observability (HIGH - production visibility)
**Phase 4**: CI/CD hardening (MEDIUM - prevents broken deployments)
**Phase 5**: Production readiness checklist (MEDIUM - process discipline)

---

## Branch Strategy

**Branch**: `feature/production-readiness`

**PR Structure**:
- PR #1: feat(admin): add financial reconciliation dashboard
- PR #2: feat(admin): add admin audit logs
- PR #3: feat(backend): add Sentry integration and structured logging
- PR #4: ci: add admin and mobile CI/CD workflows
- PR #5: docs: add production readiness checklist and staging validation

---

## Current Work

**Active Phase**: Phase 1 - Financial Reconciliation

**In Progress**:
- Designing reconciliation data model
- Implementing backend reconciliation service
- Creating admin reconciliation API endpoints
- Building admin reconciliation dashboard UI

**Next Steps**:
1. Create `feature/production-readiness` branch
2. Design reconciliation data model
3. Implement backend reconciliation service
4. Create admin API endpoints:
   - GET /admin/reconciliation/summary
   - GET /admin/reconciliation/unreconciled
   - GET /admin/reconciliation/export
5. Build admin dashboard UI:
   - Date range filtering
   - Summary cards (Money In, Money Out, Internal Movements, Pending/Risk)
   - Unreconciled/mismatch table
   - CSV export functionality
6. Add tests for reconciliation calculations
7. Test with sample data
8. Document reconciliation process
