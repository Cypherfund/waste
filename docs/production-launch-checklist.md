# Production Launch Checklist

This checklist must be completed before launching the KmerTrash platform to production.

## 1. Environment Variables

### Backend API

- [ ] `NODE_ENV` set to `production`
- [ ] `PORT` configured (default: 3000)
- [ ] `DATABASE_URL` (PostgreSQL connection string)
- [ ] `REDIS_URL` (Redis connection string)
- [ ] `JWT_SECRET` (strong random string, min 32 chars)
- [ ] `JWT_REFRESH_SECRET` (different from JWT_SECRET)
- [ ] `JWT_EXPIRATION` (e.g., `7d`)
- [ ] `JWT_REFRESH_EXPIRATION` (e.g., `30d`)
- [ ] `CORS_ORIGIN` (frontend URLs, comma-separated)
- [ ] `SENTRY_DSN` (Sentry project DSN)
- [ ] `SENTRY_ENABLED` set to `true`
- [ ] `SENTRY_ENVIRONMENT` set to `production`
- [ ] `SENTRY_RELEASE` (version tag)
- [ ] `SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.1` for 10%)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY` (service account)
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `PAYMENT_GATEWAY_API_KEY`
- [ ] `PAYMENT_GATEWAY_SECRET`
- [ ] `PAYMENT_CALLBACK_URL` (webhook endpoint)
- [ ] `STORAGE_SERVICE_KEY` (ImgBB/Cloudinary)
- [ ] `STORAGE_SERVICE_SECRET`
- [ ] `ADMIN_SEED_EMAIL` (for initial admin creation)
- [ ] `ADMIN_SEED_PASSWORD` (for initial admin creation)
- [ ] `SUPPORT_WHATSAPP` (support contact number)
- [ ] `MIN_ADVANCE_HOURS` (e.g., `24`)
- [ ] `MAX_ADVANCE_DAYS` (e.g., `30`)
- [ ] `ACCEPT_TIMEOUT_MINUTES` (e.g., `25`)

### Admin Dashboard

- [ ] `VITE_API_BASE_URL` (production API URL)
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`

### Mobile App

- [ ] Firebase project configured
- [ ] `google-services.json` added (Android)
- [ ] `GoogleService-Info.plist` added (iOS)
- [ ] Package name verified (e.g., `com.kmertrash.app`)
- [ ] App signing keys configured
- [ ] API base URL configured for production
- [ ] Sentry DSN configured (if using Sentry for mobile)

### Firebase

- [ ] Firebase project created
- [ ] Authentication enabled
- [ ] Firestore enabled (if used)
- [ ] Realtime Database enabled (if used)
- [ ] Cloud Messaging enabled
- [ ] Crashlytics enabled
- [ ] Performance Monitoring enabled
- [ ] Remote Config enabled
- [ ] Android app added in Firebase Console
- [ ] iOS app added in Firebase Console
- [ ] SHA-1 and SHA-256 fingerprints added (Android)
- [ ] APNs certificate uploaded (iOS)

### Database

- [ ] PostgreSQL instance created
- [ ] Database created
- [ ] User created with appropriate permissions
- [ ] Connection pooling configured
- [ ] SSL/TLS enabled
- [ ] Automated backups enabled
- [ ] Backup retention policy set
- [ ] Point-in-time recovery enabled (if available)

### Redis

- [ ] Redis instance created
- [ ] Authentication enabled
- [ ] TLS enabled
- [ ] Memory limit configured
- [ ] Eviction policy configured
- [ ] Persistence enabled (RDB/AOF)

## 2. Secrets Management

- [ ] All secrets stored in secure vault (not in code)
- [ ] Secrets rotated before launch
- [ ] Secret access logged
- [ ] Secret rotation schedule defined
- [ ] Emergency access procedure documented
- [ ] No secrets in git history
- [ ] No secrets in environment files committed to repo

## 3. Database Setup

### Migrations

- [ ] All migrations reviewed
- [ ] Migrations tested on staging
- [ ] Migration rollback procedure tested
- [ ] Migration plan documented
- [ ] Pre-migration backup created
- [ ] Migration execution window scheduled

### Seed Data

- [ ] System config seeded
- [ ] Payment providers seeded (MTN, Orange, etc.)
- [ ] Subscription plans seeded
- [ ] Admin user seeded
- [ ] Country/region data seeded
- [ ] Waste types seeded
- [ ] Service areas seeded

### Tables Verification

- [ ] `users` table exists and indexed
- [ ] `jobs` table exists and indexed
- [ ] `wallet_ledger` table exists and indexed
- [ ] `payment_transactions` table exists and indexed
- [ ] `payout_requests` table exists and indexed
- [ ] `subscriptions` table exists and indexed
- [ ] `user_subscriptions` table exists and indexed
- [ ] `audit_logs` table exists and indexed
- [ ] `reconciliation_reports` table exists and indexed
- [ ] `payment_providers` table exists and indexed
- [ ] `subscription_plans` table exists and indexed
- [ ] `system_configs` table exists and indexed

### Backup & Restore

- [ ] Automated daily backups enabled
- [ ] Backup retention: 30 days
- [ ] Backup tested by restoring to staging
- [ ] Restore procedure documented
- [ ] Backup access restricted
- [ ] Backup monitoring configured

## 4. Payment System

### Provider Configuration

- [ ] MTN Mobile Money configured
- [ ] Orange Money configured
- [ ] Provider credentials verified
- [ ] Webhook URLs configured
- [ ] Callback endpoints accessible
- [ ] Manual payment instructions set
- [ ] Manual payment phone numbers set
- [ ] Manual payment account names set

### Payment Testing

- [ ] Wallet top-up tested (manual)
- [ ] Wallet top-up tested (integrated)
- [ ] Job payment with wallet tested
- [ ] Subscription payment with wallet tested
- [ ] Subscription with manual payment tested
- [ ] Cash on first pickup tested
- [ ] Payout request tested
- [ ] Payout approval tested
- [ ] Refund tested (if applicable)

### Reconciliation

- [ ] Reconciliation scheduler configured
- [ ] Daily reconciliation enabled
- [ ] Reconciliation report generation tested
- [ ] Discrepancy alerting configured
- [ ] Manual reconciliation procedure documented

## 5. Firebase & Notifications

### FCM Setup

- [ ] FCM server key configured
- [ ] Device token registration tested
- [ ] Token refresh handling tested
- [ ] Topic subscription tested

### Notification Testing

- [ ] Foreground notification tested
- [ ] Background notification tested
- [ ] Killed-app notification tested
- [ ] Notification tap routing tested
- [ ] Deep link from notification tested
- [ ] Notification badge tested
- [ ] Notification sound tested

### Crashlytics

- [ ] Crashlytics initialized
- [ ] Test crash verified in console
- [ ] User identifiers enabled
- [ ] Custom breadcrumbs added
- [ ] Non-fatal errors captured

## 6. Sentry & Observability

### Sentry Configuration

- [ ] Sentry DSN configured
- [ ] Environment set to `production`
- [ ] Release version tagged
- [ ] Source maps uploaded (frontend)
- [ ] User context enabled
- [ ] Request ID correlation enabled
- [ ] Business event logging enabled

### Health Checks

- [ ] `/health` endpoint accessible
- [ ] `/health/liveness` returns 200 when alive
- [ ] `/health/ready` returns 200 when DB/Redis healthy
- [ ] `/health/ready` returns 503 when DB/Redis down
- [ ] Health checks monitored by infrastructure

### Logging

- [ ] Structured logging enabled
- [ ] Log levels appropriate for production
- [ ] Sensitive data not logged
- [ ] Request IDs in logs
- [ ] Error stack traces captured
- [ ] Business events logged

## 7. Security

### Authentication

- [ ] JWT tokens signed with strong secret
- [ ] Token expiration configured
- [ ] Refresh token flow working
- [ ] Password hashing (bcrypt) verified
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts

### Authorization

- [ ] Role-based access control (RBAC) verified
- [ ] Admin permissions restricted
- [ ] Collector permissions restricted
- [ ] Household permissions restricted
- [ ] Marketer permissions restricted (if enabled)
- [ ] Public routes documented
- [ ] Protected routes verified

### Data Protection

- [ ] PII encrypted at rest
- [ ] PII encrypted in transit (TLS)
- [ ] Payment data PCI compliant
- [ ] Audit logging enabled
- [ ] Data retention policy defined
- [ ] Right to deletion implemented

### CORS

- [ ] CORS origins restricted
- [ ] CORS methods restricted
- [ ] CORS headers restricted
- [ ] Preflight requests handled

## 8. Admin Access

- [ ] Admin user created
- [ ] Admin credentials securely stored
- [ ] Admin 2FA enabled (if available)
- [ ] Admin audit logging enabled
- [ ] Admin session timeout configured
- [ ] Admin IP whitelist (if applicable)

## 9. Mobile App Store

### Google Play Store

- [ ] Developer account verified
- [ ] App listing completed
- [ ] Screenshots uploaded
- [ ] Privacy policy URL set
- [ ] Content rating completed
- [ ] Signing key managed
- [ ] Test track configured
- [ ] Production track configured

### Apple App Store

- [ ] Developer account verified
- [ ] App listing completed
- [ ] Screenshots uploaded
- [ ] Privacy policy URL set
- [ ] App Store Connect configured
- [ ] TestFlight configured
- [ ] App Review information provided

## 10. Support & Communication

- [ ] Support email configured
- [ ] Support WhatsApp configured
- [ ] Support documentation ready
- [ ] FAQ published
- [ ] User onboarding guide ready
- [ ] Incident response plan ready
- [ ] Communication channels established

## 11. Performance

- [ ] API response times < 500ms (p95)
- [ ] Database query times optimized
- [ ] Redis caching configured
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Lazy loading implemented
- [ ] Pagination implemented

## 12. Monitoring & Alerting

- [ ] Uptime monitoring configured
- [ ] Error rate alerting configured
- [ ] Performance alerting configured
- [ ] Database monitoring configured
- [ ] Redis monitoring configured
- [ ] Payment failure alerting configured
- [ ] Notification failure alerting configured
- [ ] On-call rotation defined

## 13. Legal & Compliance

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie policy published (if applicable)
- [ ] Data processing agreement (if applicable)
- [ ] GDPR compliance verified (if EU users)
- [ ] Local regulations verified

## 14. Final Go-Live Decision

### Pre-Launch Verification

- [ ] All CI checks green
- [ ] All items in this checklist completed
- [ ] Stakeholder approval obtained
- [ ] Launch window confirmed
- [ ] Team availability confirmed
- [ ] Rollback plan approved
- [ ] Emergency contacts notified

### Launch Sign-Off

**Product Owner:** ___________________ Date: _______

**Tech Lead:** ___________________ Date: _______

**DevOps:** ___________________ Date: _______

**Security:** ___________________ Date: _______

**Final Approval:** ___________________ Date: _______
