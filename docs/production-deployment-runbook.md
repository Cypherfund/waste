# Production Deployment Runbook

This runbook provides step-by-step instructions for deploying the KmerTrash waste management platform to production.

## Prerequisites

Before deploying, ensure:

- [ ] All CI checks on `main` are green
- [ ] You have access to production infrastructure (Render, Vercel, Firebase)
- [ ] You have access to production secrets (not stored in this repo)
- [ ] Database backups are enabled
- [ ] Rollback plan is reviewed and approved
- [ ] At least one team member is available during deployment window

## Pre-Deployment Checklist

### 1. Environment Verification

```bash
# Verify current production version
curl https://api.kmertrash.com/health/liveness

# Check database connection
# Check Redis connection
# Verify Firebase project access
# Verify Sentry project access
```

### 2. Backup Database

```bash
# Create a pre-deployment backup
# This is critical before any migration
# Document backup ID and timestamp
```

### 3. Verify Secrets

Ensure all production secrets are set in the deployment platform:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `SENTRY_DSN`
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- Payment gateway credentials
- Storage service keys

## Deployment Steps

### Step 1: Pull Latest Code

```bash
git checkout main
git pull origin main
git log -1  # Verify the commit being deployed
```

### Step 2: Build Backend

```bash
cd backend
npm ci
npm run build
```

### Step 3: Run Database Migrations

```bash
# IMPORTANT: Test migrations on staging first
npm run migration:run

# Verify migration status
npm run migration:show

# If migration fails, STOP and investigate
# Do not proceed with failed migrations
```

### Step 4: Deploy Backend

```bash
# Deploy to Render (or your production platform)
# Monitor deployment logs
# Wait for health checks to pass
```

### Step 5: Verify Backend Health

```bash
# Check liveness
curl https://api.kmertrash.com/health/liveness
# Expected: 200 OK

# Check readiness
curl https://api.kmertrash.com/health/ready
# Expected: 200 OK (if DB and Redis are healthy)

# Check general health
curl https://api.kmertrash.com/health
# Expected: 200 OK with system status
```

### Step 6: Deploy Admin Dashboard

```bash
cd admin-dashboard
npm ci
npm run build

# Deploy to Vercel (or your production platform)
# Monitor deployment logs
```

### Step 7: Verify Admin Dashboard

```bash
# Access admin dashboard URL
# Test admin login
# Verify dashboard loads
# Check critical pages work
```

### Step 8: Build Mobile Release

```bash
cd mobile
flutter pub get
flutter analyze

# Build Android release
flutter build apk --release
flutter build appbundle --release

# Build iOS release (if applicable)
flutter build ios --release
```

### Step 9: Upload Mobile Build

```bash
# Upload APK/AAB to Google Play Console
# Or upload to TestFlight for iOS
# Or distribute via internal testing link
```

### Step 10: Run Smoke Tests

See [production-smoke-tests.md](./production-smoke-tests.md) for detailed smoke test procedures.

### Step 11: Monitor Observability

```bash
# Check Sentry for errors
# Check Firebase Crashlytics for crashes
# Check application logs
# Monitor error rates
# Monitor response times
```

## Post-Deployment Verification

### Health Endpoint Checks

```bash
# Liveness endpoint
GET /health/liveness
Expected: 200 OK
Response: { "status": "ok", "uptimeSeconds": 123 }

# Readiness endpoint
GET /health/ready
Expected: 200 OK if DB and Redis are healthy
Expected: 503 Service Unavailable if DB or Redis is down
Response: { "status": "ready", "database": "healthy", "redis": "healthy" }

# General health endpoint
GET /health
Expected: 200 OK
Response: { "status": "healthy", "version": "1.0.0", "timestamp": "..." }
```

### Database Verification

```bash
# Verify migration status
npm run migration:show

# Verify critical tables exist
- users
- jobs
- wallet_ledger
- payment_transactions
- payout_requests
- subscriptions
- audit_logs
- reconciliation_reports

# Verify system config exists
- payment providers
- subscription plans
- admin user
```

### Payment System Verification

```bash
# Test payment provider connectivity
# Verify webhook URLs are accessible
# Check callback endpoints are responding
```

### Firebase Verification

```bash
# Check Firebase console
# Verify FCM is enabled
# Check Crashlytics is receiving data
# Test notification sending
```

## Monitoring During First Hour

After deployment, monitor the following for at least 1 hour:

- Error rates in Sentry
- Crash rates in Crashlytics
- API response times
- Database query performance
- Redis memory usage
- Active user count
- Payment transaction success rate
- Notification delivery rate

## Rollback Triggers

Consider rollback if:

- Error rate increases by > 50%
- Crash rate increases by > 50%
- Payment failures increase significantly
- Database query times exceed 5 seconds
- API response times exceed 10 seconds
- Critical features are non-functional
- Data corruption detected

See [rollback-plan.md](./rollback-plan.md) for detailed rollback procedures.

## Emergency Contacts

- Platform Owner: [Name] - [Phone]
- Backend Lead: [Name] - [Phone]
- Mobile Lead: [Name] - [Phone]
- DevOps: [Name] - [Phone]

## Deployment Sign-Off

Before marking deployment complete:

- [ ] All health checks passing
- [ ] Smoke tests passed
- [ ] No critical errors in Sentry
- [ ] No crashes in Crashlytics
- [ ] Payment system verified
- [ ] Notifications verified
- [ ] Database verified
- [ ] Monitoring confirmed

**Deployed by:** [Name]
**Deployment time:** [Timestamp]
**Commit hash:** [Hash]
**Rollback commit:** [Previous hash]
