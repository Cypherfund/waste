# Rollback Plan

This document outlines the procedures for rolling back the KmerTrash platform to a previous stable state in case of deployment issues.

## Rollback Triggers

Initiate rollback if any of the following occur:

### Critical Triggers (Immediate Rollback Required)

- Database corruption or data loss
- Payment system failure causing financial discrepancies
- Security breach or exposure of sensitive data
- Complete service outage (> 15 minutes)
- Authentication system failure preventing all logins
- PII exposure or privacy violation

### High Priority Triggers (Rollback Within 1 Hour)

- Error rate increase > 50% from baseline
- Crash rate increase > 50% from baseline
- API response time > 5 seconds (p95)
- Payment failure rate > 10%
- Notification delivery failure > 20%
- Database query timeout > 10 seconds
- Critical features non-functional (job creation, payments)

### Medium Priority Triggers (Rollback Within 4 Hours)

- Error rate increase > 25% from baseline
- API response time > 2 seconds (p95)
- Payment failure rate > 5%
- Non-critical features degraded
- UI/UX issues affecting usability

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] Confirm rollback trigger conditions are met
- [ ] Identify the rollback commit hash
- [ ] Notify stakeholders of impending rollback
- [ ] Create a pre-rollback database backup
- [ ] Document current state (logs, metrics, errors)
- [ ] Ensure rollback approver is available
- [ ] Prepare rollback communication for users

## Rollback Procedures

### 1. Backend Rollback

#### Step 1: Identify Previous Stable Version

```bash
git log --oneline -10
# Identify the last known good commit
# Example: a873749 - Previous stable version
```

#### Step 2: Checkout Previous Version

```bash
git checkout <PREVIOUS_COMMIT_HASH>
```

#### Step 3: Verify No Database Migration Rollback Needed

```bash
# Check if the deployed version included migrations
# If migrations were applied, do NOT simply revert code
# See "Migration Rollback" section below
```

#### Step 4: Rebuild and Deploy

```bash
cd backend
npm ci
npm run build

# Deploy to production platform (Render)
# Monitor deployment logs
# Wait for health checks to pass
```

#### Step 5: Verify Backend Health

```bash
curl https://api.kmertrash.com/health/liveness
curl https://api.kmertrash.com/health/ready
curl https://api.kmertrash.com/health
```

#### Step 6: Run Critical Smoke Tests

- [ ] Health endpoints responding
- [ ] Authentication working
- [ ] Job creation working
- [ ] Payment system working

### 2. Admin Dashboard Rollback

#### Step 1: Identify Previous Stable Version

```bash
cd admin-dashboard
git log --oneline -10
```

#### Step 2: Checkout Previous Version

```bash
git checkout <PREVIOUS_COMMIT_HASH>
```

#### Step 3: Rebuild and Deploy

```bash
npm ci
npm run build

# Deploy to Vercel
# Monitor deployment logs
```

#### Step 4: Verify Admin Dashboard

- [ ] Admin dashboard accessible
- [ ] Admin login working
- [ ] Critical pages loading

### 3. Mobile App Rollback

#### Option A: Remove from App Stores

If the new version has critical issues:

1. unpublish from Google Play Console
2. Remove from TestFlight
3. Communicate with users to uninstall
4. Release previous version as hotfix

#### Option B: Release Hotfix

If issues are fixable quickly:

1. Fix issues in code
2. Build new version with incremented version number
3. Submit as hotfix
4. Expedite review process

#### Option C: Server-Side Feature Flags

If issues are feature-specific:

1. Disable problematic features via system config
2. Keep app version, disable functionality
3. Release fix in next update

### 4. Database Migration Rollback

**CRITICAL WARNING:** Never blindly rollback database migrations in production without a backup.

#### Scenario A: Migration Failed During Deployment

If migration failed and was not applied:

1. Verify migration status
2. Confirm no schema changes were made
3. Proceed with code rollback
4. Re-attempt migration after fixing issue

#### Scenario B: Migration Succeeded But Caused Issues

If migration was applied but causes problems:

1. **STOP** - Do not rollback code yet
2. Create emergency database backup
3. Assess if data can be salvaged
4. Write and test a rollback migration
5. Apply rollback migration in staging first
6. Apply rollback migration in production
7. Verify data integrity
8. Rollback code to previous version

#### Rollback Migration Template

```typescript
// Example rollback migration
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RollbackBrokenFeature1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // This is the rollback - it undoes the broken migration
    await queryRunner.query(`ALTER TABLE jobs DROP COLUMN new_broken_column`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This would re-apply the broken migration (not used)
    await queryRunner.query(`ALTER TABLE jobs ADD COLUMN new_broken_column varchar(255)`);
  }
}
```

### 5. Configuration Rollback

If environment variables or configuration caused issues:

#### Step 1: Identify Problematic Configuration

```bash
# Check recent configuration changes
# Review deployment logs for config errors
```

#### Step 2: Revert Configuration

```bash
# In deployment platform (Render/Vercel):
# 1. Navigate to environment variables
# 2. Revert to previous values
# 3. Redeploy with old configuration
```

#### Step 3: Verify Configuration

- [ ] Health endpoints responding
- [ ] No configuration errors in logs
- [ ] Features working correctly

### 6. Firebase Rollback

If Firebase configuration caused issues:

#### Step 1: Revert Firebase Config

1. Revert `google-services.json` (Android)
2. Revert `GoogleService-Info.plist` (iOS)
3. Rebuild mobile app
4. Release as hotfix

#### Step 2: Disable Firebase Features (Temporary)

If specific Firebase features cause issues:

1. Disable problematic feature in Firebase Console
2. Update app code to handle disabled feature
3. Release hotfix

## Feature-Specific Rollbacks

### Payment System Rollback

**CRITICAL:** Payment system rollbacks require extreme caution due to financial implications.

#### If Payment Integration Failed

1. **DO NOT** rollback payment-related migrations
2. Disable integrated payment via system config
3. Switch to manual payment mode
4. Notify users of payment processing delays
5. Manually reconcile pending transactions
6. Fix integration and redeploy

#### If Payment Callbacks Failing

1. Check webhook URL accessibility
2. Verify payment provider status
3. Manually process pending callbacks
4. Fix webhook endpoint
5. Redeploy

### Notification System Rollback

If notifications are failing:

1. Disable FCM via system config
2. Fall back to in-app notifications only
3. Fix notification service
4. Redeploy
5. Re-enable FCM

### Reconciliation Rollback

If reconciliation is failing:

1. Stop reconciliation scheduler
2. Manually review pending reconciliations
3. Fix reconciliation logic
4. Redeploy
5. Restart scheduler
6. Run manual reconciliation for missed period

## Data Recovery Procedures

### Database Restore

If data corruption occurred:

#### Step 1: Identify Backup

```bash
# List available backups
# Identify pre-deployment backup
```

#### Step 2: Stop Application

```bash
# Stop backend service to prevent writes during restore
```

#### Step 3: Restore Database

```bash
# Restore from backup
# Example for PostgreSQL:
pg_restore -d waste_production -U waste_user /path/to/backup.dump
```

#### Step 4: Verify Data Integrity

```bash
# Run data integrity checks
# Verify critical tables
# Check row counts
# Verify foreign key constraints
```

#### Step 5: Restart Application

```bash
# Start backend service
# Verify health endpoints
# Run smoke tests
```

### Partial Data Recovery

If only specific data is corrupted:

1. Identify affected tables/rows
2. Restore from backup for specific data
3. Reconcile with post-corruption data
4. Manual intervention may be required

## Post-Rollback Verification

### Critical Checks

- [ ] Health endpoints responding (200 OK)
- [ ] Authentication working
- [ ] Database accessible
- [ ] Redis accessible
- [ ] Payment system functional
- [ ] Job creation working
- [ ] Notifications working
- [ ] Admin dashboard accessible

### Data Integrity Checks

- [ ] No data loss detected
- [ ] No data corruption detected
- [ ] Wallet ledger consistent
- [ ] Payment transactions consistent
- [ ] Audit logs intact

### Monitoring Checks

- [ ] Error rates back to baseline
- [ ] Response times back to baseline
- [ ] No new errors in Sentry
- [ ] No new crashes in Crashlytics

## Rollback Communication

### Internal Communication

Notify team members:

1. Rollback initiated
2. Reason for rollback
3. Current status
4. Expected resolution time
5. Next steps

### External Communication

If users are affected:

1. Acknowledge issue
2. Explain impact
3. Provide ETA for resolution
4. Apologize for inconvenience
5. Update when resolved

### Communication Templates

#### Internal Template

```
SUBJECT: ROLLBACK INITIATED - KmerTrash Production

Team,

A rollback has been initiated for production deployment.

Reason: [Brief description]
Trigger: [Trigger condition]
Current Status: [In progress / Completed]
ETA: [Estimated time]

Next steps:
- [Step 1]
- [Step 2]

Please stand by for updates.

Rollback Lead: [Name]
Time: [Timestamp]
```

#### External Template

```
SUBJECT: KmerTrash Service Issue - We're Working on It

Dear KmerTrash User,

We're currently experiencing technical difficulties with our service.
Our team is actively working to resolve the issue.

Impact: [Brief description of user impact]
ETA: [Estimated resolution time]

We apologize for any inconvenience and will keep you updated.

Thank you for your patience.

The KmerTrash Team
```

## Rollback Approval

### Rollback Authority

| Role | Can Approve | Notes |
|------|-------------|-------|
| Platform Owner | Yes | Full rollback authority |
| Tech Lead | Yes | Full rollback authority |
| DevOps Lead | Yes | For infrastructure rollbacks |
| Backend Lead | Yes | For backend rollbacks |
| Mobile Lead | Yes | For mobile rollbacks |

### Approval Process

1. Initiator identifies rollback need
2. Rollback approver reviews situation
3. Approver authorizes rollback
4. Rollback executed
5. Rollback verified
6. Post-rollback review conducted

## Post-Rollback Review

After rollback, conduct a review:

### Review Questions

1. What caused the rollback?
2. Could it have been prevented?
3. Was the rollback procedure effective?
4. How long did rollback take?
5. What was the user impact?
6. How can we prevent this in the future?

### Action Items

- [ ] Document root cause
- [ ] Update deployment procedures
- [ ] Add additional tests
- [ ] Improve monitoring
- [ ] Update rollback plan if needed

## Rollback Test Drill

Schedule periodic rollback drills to ensure team readiness:

1. Simulate rollback scenario in staging
2. Practice rollback procedures
3. Time the rollback process
4. Identify areas for improvement
5. Update documentation based on learnings

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Platform Owner | [Name] | [Phone] | [Email] |
| Tech Lead | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| Backend Lead | [Name] | [Phone] | [Email] |
| Mobile Lead | [Name] | [Phone] | [Email] |

## Rollback Log

| Date | Trigger | Type | Approver | Duration | Outcome | Notes |
|------|---------|------|----------|----------|---------|-------|
| | | | | | | |
| | | | | | | |
