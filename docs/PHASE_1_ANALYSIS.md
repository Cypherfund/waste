# Phase 1: Analysis — Waste Management Platform (Refined)

## 1. System Overview

A waste collection platform connecting households with collectors in Douala, Cameroon.
Mobile-first, designed for low-end Android devices and unstable internet.

**Roles:** HOUSEHOLD, COLLECTOR, ADMIN
**Core Modules:** Auth, Jobs, Ratings, Proof, Earnings, Notifications, Real-time Updates

---

## 2. User Roles & Capabilities

### HOUSEHOLD
- Register/login (phone or email)
- Schedule waste pickup (date, time, GPS/manual location, notes)
- Track assigned collector and job status in real-time
- Validate proof of completion (or auto-validate after timeout)
- Rate collector (1-5 stars + optional comment)
- View pickup history

### COLLECTOR
- Register/login
- View assigned jobs
- Accept/reject jobs
- Navigate to pickup location
- Mark job as in-progress → completed
- Upload proof image
- Track earnings
- View completed job history

### ADMIN
- Login to web dashboard
- Manage users (households & collectors)
- Monitor all jobs in real-time
- Manually assign/override job assignments
- Configure system settings (earnings rates, assignment radius, etc.)
- View analytics and reports

---

## 3. Complete Product Flows

### 3.1 Household Flow (10 steps)
```
1. Register/Login
2. Home Screen (upcoming pickups, quick stats)
3. Schedule Pickup → date/time + location (GPS/manual) + notes
4. Confirmation Screen → review & submit → status: REQUESTED
5. Waiting for Assignment → system auto-assigns or admin assigns
6. Assigned Collector View → see collector info, status: ASSIGNED
7. In Progress → collector en route/working, status: IN_PROGRESS
8. Completed → view proof photo, validate or auto-validate → status: COMPLETED
9. Rate Collector → 1-5 stars + comment → status: RATED (optional)
10. View History → past pickups with status/ratings
```

### 3.2 Collector Flow (9 steps)
```
1. Login
2. Dashboard (stats: completed jobs, earnings, rating)
3. View Job List → assigned jobs with details
4. Accept Job → status: ASSIGNED (confirmed)
5. Navigate to Location → address/GPS coordinates
6. Start Job → status: IN_PROGRESS
7. Complete Job + Upload Proof → status: COMPLETED
8. Earnings credited after household validation
9. View Earnings → job history with earnings breakdown
```

### 3.3 Admin Flow
```
1. Login → Web Dashboard
2. Dashboard → overview stats (total jobs, users, completion rates, revenue)
3. User Management → list/search/activate/deactivate households & collectors
4. Collector Management → view collectors, performance, workload
5. Job Monitoring → real-time job status, filter/search
6. Manual Assignment → assign/reassign collectors to jobs
7. System Config → earnings rates, assignment rules, notification settings
8. Analytics → trends, performance charts, fraud flags
```

---

## 4. Job Lifecycle State Machine

```
                              ┌─────────────┐
                              │  REQUESTED   │
                              └──────┬───────┘
                                     │
                         ┌───────────┼───────────┐
                         │ auto/manual assign     │ household cancels
                         ▼                        ▼
                  ┌─────────────┐          ┌─────────────┐
                  │  ASSIGNED   │          │  CANCELLED   │
                  └──────┬───────┘          └─────────────┘
                         │
              ┌──────────┼──────────┐
              │ collector accepts   │ collector rejects
              ▼                     ▼
       ┌─────────────┐      Back to REQUESTED
       │ IN_PROGRESS  │      (re-assignment)
       └──────┬───────┘
              │
              │ collector completes + uploads proof
              ▼
       ┌─────────────┐
       │  COMPLETED   │──── household validates (or auto after 24h)
       └──────┬───────┘
              │
              │ household rates (optional)
              ▼
       ┌─────────────┐
       │    RATED     │
       └─────────────┘
```

### Cancellation Rules
- **REQUESTED:** Household can cancel freely
- **ASSIGNED:** Household can cancel (collector notified)
- **IN_PROGRESS:** Only admin can cancel (dispute resolution)
- **COMPLETED/RATED:** Cannot cancel

### Rejection Rules
- Collector rejects ASSIGNED job → job returns to REQUESTED
- System attempts re-assignment (up to 3 attempts)
- After 3 rejections → admin notified for manual intervention

---

## 5. Collector Assignment Algorithm

### 5.1 Scoring Formula

Each eligible collector receives a **composite score**. Lowest score wins.

```
score = (W_distance × distance_score)
      + (W_workload × workload_score)
      + (W_rating   × rating_penalty)
      + (W_recency  × recency_score)
```

### 5.2 Score Components

**Distance Score (0-100)**
```
distance_score = (distance_km / max_radius_km) × 100
```
- `max_radius_km`: Configurable (default: 10km)
- Collectors beyond max_radius are excluded
- If GPS unavailable: fall back to quarter/neighborhood matching

**Workload Score (0-100)**
```
workload_score = (active_jobs / max_concurrent_jobs) × 100
```
- `max_concurrent_jobs`: Configurable per collector (default: 5)
- Collectors at max capacity are excluded
- "Active jobs" = jobs in ASSIGNED or IN_PROGRESS status

**Rating Penalty (0-100)**
```
rating_penalty = (1 - (avg_rating / 5.0)) × 100
```
- Higher-rated collectors get lower penalty (preferred)
- New collectors with no rating: neutral score of 50

**Recency Score (0-100)**
```
recency_score = hours_since_last_assignment < 1 ? 80 : 
                hours_since_last_assignment < 4 ? 40 : 0
```
- Prevents assigning back-to-back jobs to the same collector
- Distributes work across the pool

### 5.3 Default Weights
```
W_distance = 0.40  (proximity matters most)
W_workload = 0.30  (balance the load)
W_rating   = 0.15  (prefer quality)
W_recency  = 0.15  (distribute fairly)
```
All weights are admin-configurable.

### 5.4 Assignment Process
```
1. Filter: active collectors within max_radius, below max_concurrent_jobs
2. Score: calculate composite score for each
3. Rank: sort by score ascending (lowest = best fit)
4. Assign: pick top collector
5. Notify: send push + SMS to assigned collector
6. Timeout: if not accepted within 10 minutes, reassign to #2
7. Escalate: after 3 failed attempts, notify admin
```

### 5.5 Workload Cap (Anti-Monopoly)
- Hard cap: no collector can hold more than `max_concurrent_jobs` active jobs
- Daily cap: configurable max jobs per day (default: 15)
- If all collectors at capacity: job stays REQUESTED, admin notified

---

## 6. Earnings System

### 6.1 Earnings Calculation

```
job_earnings = base_rate + (distance_km × per_km_rate) + surge_multiplier
```

| Parameter | Default | Admin Configurable |
|-----------|---------|-------------------|
| `base_rate` | 500 XAF | Yes |
| `per_km_rate` | 100 XAF/km | Yes |
| `surge_multiplier` | 1.0x (no surge) | Yes |
| `surge_threshold` | 80% collector utilization | Yes |

### 6.2 Surge Pricing
- When `active_jobs / available_collectors > surge_threshold`, multiply earnings by `surge_multiplier`
- Surge levels: 1.0x (normal), 1.25x (busy), 1.5x (very busy)
- Admin can enable/disable surge

### 6.3 Earnings Lifecycle
```
Job COMPLETED → earnings marked PENDING
→ Household validates proof (or auto-validate at 24h)
→ Earnings marked CONFIRMED
→ Admin can export/process payouts (manual for now, payment integration later)
```

### 6.4 Earnings Entity
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| jobId | UUID | FK → Job, unique |
| collectorId | UUID | FK → User |
| baseAmount | DECIMAL(10,2) | Base rate applied |
| distanceAmount | DECIMAL(10,2) | Distance component |
| surgeMultiplier | DECIMAL(3,2) | 1.0 - 2.0 |
| totalAmount | DECIMAL(10,2) | Final earnings |
| status | ENUM | PENDING, CONFIRMED, PAID |
| confirmedAt | TIMESTAMP | When household validated |
| createdAt | TIMESTAMP | Auto |

### 6.5 System Config Entity (Admin-Controlled)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| key | VARCHAR(100) | Unique config key |
| value | VARCHAR(500) | JSON or simple value |
| description | TEXT | Human-readable description |
| updatedBy | UUID | FK → User (admin) |
| updatedAt | TIMESTAMP | Auto |

Default config entries:
```
earnings.base_rate = 500
earnings.per_km_rate = 100
earnings.surge_enabled = false
earnings.surge_multiplier = 1.25
earnings.surge_threshold = 0.8
assignment.max_radius_km = 10
assignment.max_concurrent_jobs = 5
assignment.max_daily_jobs = 15
assignment.accept_timeout_minutes = 10
assignment.max_reassign_attempts = 3
assignment.weight_distance = 0.40
assignment.weight_workload = 0.30
assignment.weight_rating = 0.15
assignment.weight_recency = 0.15
proof.auto_validate_hours = 24
```

---

## 7. Notification System

### 7.1 Delivery Strategy

```
Primary:   Firebase Cloud Messaging (FCM) push notification
Fallback:  SMS via Twilio (if push fails or user offline > 5 min)
Dashboard: In-app notification center (bell icon)
```

**Why dual-channel:** In Douala, users may not have persistent internet for push. SMS ensures critical notifications (job assignment, completion) always reach them.

### 7.2 Notification Events

| Event | Recipients | Channel | Priority |
|-------|-----------|---------|----------|
| **JOB_CREATED** | Admin (if no auto-assign match) | Push | Normal |
| **JOB_ASSIGNED** | Collector | Push + SMS | High |
| **JOB_ACCEPTED** | Household | Push | High |
| **JOB_REJECTED** | Admin (after max retries) | Push | High |
| **JOB_STARTED** | Household | Push | High |
| **JOB_COMPLETED** | Household | Push + SMS | High |
| **PROOF_UPLOADED** | Household | Push | Normal |
| **PROOF_VALIDATED** | Collector | Push | Normal |
| **PROOF_AUTO_VALIDATED** | Household + Collector | Push | Normal |
| **JOB_RATED** | Collector | Push | Normal |
| **JOB_CANCELLED** | Collector (if assigned) | Push + SMS | High |
| **EARNINGS_CONFIRMED** | Collector | Push | Normal |
| **ASSIGNMENT_TIMEOUT** | Next collector in queue | Push + SMS | High |
| **ASSIGNMENT_ESCALATED** | Admin | Push + SMS | Critical |
| **FRAUD_FLAG** | Admin | Push + SMS | Critical |
| **ACCOUNT_DEACTIVATED** | Affected user | SMS | High |

### 7.3 Notification Entity
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK → User |
| type | ENUM | Event type from above |
| title | VARCHAR(200) | Display title |
| body | TEXT | Display body |
| data | JSONB | Payload (jobId, etc.) |
| channel | ENUM | PUSH, SMS, IN_APP |
| status | ENUM | PENDING, SENT, FAILED, READ |
| sentAt | TIMESTAMP | Nullable |
| readAt | TIMESTAMP | Nullable |
| createdAt | TIMESTAMP | Auto |

### 7.4 Delivery Pipeline
```
Event Emitted
  → NotificationService.dispatch(event)
    → Build message from template
    → Attempt FCM push
      → Success → mark SENT
      → Failure → queue SMS fallback
        → SMS sent → mark SENT
        → SMS failed → mark FAILED, retry in 5 min (max 3 retries)
    → Store in-app notification (always)
```

---

## 8. Real-Time Updates

### 8.1 Strategy: WebSocket + Polling Fallback

```
Primary:   WebSocket (Socket.IO via @nestjs/websockets)
Fallback:  HTTP polling every 15 seconds (for devices that can't maintain WS)
```

**Rationale:** Low-end devices on unstable networks may drop WebSocket connections. The app detects connectivity and falls back to polling automatically.

### 8.2 Real-Time Channels

| Channel | Subscribers | Events |
|---------|------------|--------|
| `job:{jobId}` | Household + assigned Collector | Status changes, location updates |
| `collector:{userId}` | Collector | New job assignments, cancellations |
| `household:{userId}` | Household | Job updates, proof uploads |
| `admin:jobs` | Admin dashboard | All job status changes |
| `admin:alerts` | Admin dashboard | Fraud flags, escalations |

### 8.3 Events Broadcast via WebSocket

```typescript
// Job status change
{ event: 'job:status', data: { jobId, status, updatedAt } }

// Collector location (during IN_PROGRESS)
{ event: 'job:location', data: { jobId, lat, lng, updatedAt } }

// Proof uploaded
{ event: 'job:proof', data: { jobId, imageUrl } }

// New assignment
{ event: 'collector:assigned', data: { jobId, household, location } }

// Admin real-time feed
{ event: 'admin:job_update', data: { jobId, status, collector, household } }
```

### 8.4 Client Implementation (Flutter)

```
App Start → Attempt WebSocket connection
  → Connected → subscribe to user channels
  → Disconnected → start polling timer (15s)
  → Reconnected → stop polling, re-subscribe WS
```

Polling endpoint: `GET /jobs/updates?since={timestamp}`
Returns jobs changed since the given timestamp. Lightweight, idempotent.

---

## 9. Proof Validation Flow

### 9.1 Complete Flow

```
Collector uploads proof image
  → Job status: COMPLETED
  → Notification sent to Household: "Your pickup is complete. Please validate."
  → Household has 24 hours to respond
  
  Path A: Household VALIDATES
    → Proof accepted
    → Earnings status: CONFIRMED
    → Notification to Collector: "Earnings confirmed"
  
  Path B: Household DISPUTES
    → Dispute created with reason
    → Job status: DISPUTED
    → Admin notified for review
    → Admin resolves:
      → Accept proof → same as Path A
      → Reject proof → Job re-opened or cancelled, collector not paid
  
  Path C: Household DOES NOT RESPOND (24h timeout)
    → Auto-validation triggered
    → Proof accepted
    → Earnings status: CONFIRMED
    → Notification to both: "Proof auto-validated after 24 hours"
```

### 9.2 Extended Job Status (with dispute)

```
REQUESTED → ASSIGNED → IN_PROGRESS → COMPLETED → VALIDATED → RATED
                                         │
                                         └── DISPUTED → Admin resolves
                                                          ├── VALIDATED
                                                          └── CANCELLED
```

### 9.3 Dispute Entity
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| jobId | UUID | FK → Job, unique |
| householdId | UUID | FK → User |
| reason | TEXT | Required |
| status | ENUM | OPEN, RESOLVED_ACCEPTED, RESOLVED_REJECTED |
| adminNotes | TEXT | Admin resolution notes |
| resolvedBy | UUID | FK → User (admin), nullable |
| resolvedAt | TIMESTAMP | Nullable |
| createdAt | TIMESTAMP | Auto |

### 9.4 Auto-Validation Mechanism
- Cron job runs every hour
- Checks for COMPLETED jobs older than 24 hours without validation
- Auto-validates and confirms earnings
- Sends notification to both parties

---

## 10. Fraud & Abuse Protection

### 10.1 Duplicate Job Prevention

| Rule | Implementation |
|------|---------------|
| **Same household, same day** | Reject if household has an active job (REQUESTED/ASSIGNED/IN_PROGRESS) for the same scheduledDate |
| **Rapid-fire requests** | Rate limit: max 3 job creations per hour per household |
| **Same location within 1 hour** | Warn user, require confirmation if location matches within 200m of an existing active job |
| **Idempotency key** | Client sends unique request ID; server deduplicates within 5-minute window |

### 10.2 Fake Completion Detection

| Signal | Detection | Action |
|--------|-----------|--------|
| **Completion too fast** | Job IN_PROGRESS < 5 minutes | Flag for review |
| **GPS mismatch** | Collector GPS > 500m from job location at completion | Flag for review |
| **No proof image** | Completion without photo | Block — proof is mandatory |
| **Reused image** | Perceptual hash comparison with recent proofs | Flag for review |
| **Suspicious patterns** | Collector completes > 3 jobs/hour consistently | Flag for review |

### 10.3 Fraud Flag Entity
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| jobId | UUID | FK → Job |
| type | ENUM | FAST_COMPLETION, GPS_MISMATCH, IMAGE_REUSE, SUSPICIOUS_PATTERN, DUPLICATE_REQUEST |
| severity | ENUM | LOW, MEDIUM, HIGH |
| details | JSONB | Evidence data |
| status | ENUM | OPEN, REVIEWED, DISMISSED, CONFIRMED |
| reviewedBy | UUID | FK → User (admin), nullable |
| reviewNotes | TEXT | Nullable |
| createdAt | TIMESTAMP | Auto |

### 10.4 Automated Actions

```
Flag severity HIGH → auto-pause collector, notify admin immediately
Flag severity MEDIUM → allow current job, notify admin for review
Flag severity LOW → log only, visible in admin analytics
```

### 10.5 Account-Level Protection
- **Collector deactivation:** 3+ confirmed fraud flags → auto-deactivate account
- **Household abuse:** Creating and cancelling > 5 jobs/week → rate-limited
- **IP/device fingerprint:** Track device ID to prevent multi-account abuse

---

## 11. System Events (Event-Driven Architecture)

### 11.1 Event Bus Design

All job lifecycle transitions and significant actions emit events through a central event bus.
Backend uses NestJS `EventEmitter2` for in-process events with option to upgrade to Redis Pub/Sub or RabbitMQ for horizontal scaling.

### 11.2 Event Catalog

```typescript
// ── Job Lifecycle Events ──
JOB_CREATED          { jobId, householdId, location, scheduledDate }
JOB_ASSIGNMENT_STARTED { jobId, candidates: CollectorScore[] }
JOB_ASSIGNED         { jobId, collectorId, score, attempt }
JOB_ASSIGNMENT_TIMEOUT { jobId, collectorId, attempt }
JOB_ASSIGNMENT_ESCALATED { jobId, attempts, reason }
JOB_ACCEPTED         { jobId, collectorId }
JOB_REJECTED         { jobId, collectorId, reason }
JOB_STARTED          { jobId, collectorId, startedAt }
JOB_COMPLETED        { jobId, collectorId, proofId, completedAt }
JOB_CANCELLED        { jobId, cancelledBy, reason }

// ── Proof Events ──
PROOF_UPLOADED       { proofId, jobId, imageUrl }
PROOF_VALIDATED      { proofId, jobId, validatedBy }
PROOF_AUTO_VALIDATED { proofId, jobId }
PROOF_DISPUTED       { proofId, jobId, disputeId, reason }
DISPUTE_RESOLVED     { disputeId, jobId, resolution }

// ── Earnings Events ──
EARNINGS_CALCULATED  { earningsId, jobId, collectorId, amount }
EARNINGS_CONFIRMED   { earningsId, jobId, collectorId, amount }
EARNINGS_PAID        { earningsId, jobId, collectorId, amount }

// ── Rating Events ──
JOB_RATED            { ratingId, jobId, collectorId, value }

// ── Fraud Events ──
FRAUD_FLAG_CREATED   { flagId, jobId, type, severity }
FRAUD_FLAG_REVIEWED  { flagId, resolution }
COLLECTOR_AUTO_PAUSED { collectorId, reason, flagCount }

// ── User Events ──
USER_REGISTERED      { userId, role }
USER_DEACTIVATED     { userId, reason }
USER_REACTIVATED     { userId }

// ── System Events ──
CONFIG_UPDATED       { key, oldValue, newValue, updatedBy }
SYSTEM_HEALTH_CHECK  { status, timestamp }
```

### 11.3 Event Listeners (Who Reacts to What)

```
JOB_CREATED
  → AssignmentService.autoAssign()
  → NotificationService.notify(admin, if no match)
  → AnalyticsService.trackJobCreated()

JOB_ASSIGNED
  → NotificationService.notify(collector, PUSH + SMS)
  → WebSocketGateway.emit('collector:{id}', assignment)
  → TimeoutScheduler.scheduleAcceptTimeout(10 min)
  → EarningsService.calculateEstimate()

JOB_ASSIGNMENT_TIMEOUT
  → AssignmentService.reassign(next candidate)
  → NotificationService.notify(next collector)

JOB_ACCEPTED
  → NotificationService.notify(household, PUSH)
  → WebSocketGateway.emit('job:{id}', status)
  → TimeoutScheduler.cancelAcceptTimeout()

JOB_STARTED
  → NotificationService.notify(household, PUSH)
  → WebSocketGateway.emit('job:{id}', status)
  → FraudService.startTrackingTimer()

JOB_COMPLETED
  → NotificationService.notify(household, PUSH + SMS)
  → WebSocketGateway.emit('job:{id}', status + proof)
  → EarningsService.createPendingEarnings()
  → FraudService.checkCompletionTime()
  → FraudService.checkGPSMatch()
  → TimeoutScheduler.scheduleAutoValidation(24h)

PROOF_VALIDATED / PROOF_AUTO_VALIDATED
  → EarningsService.confirmEarnings()
  → NotificationService.notify(collector)
  → AnalyticsService.trackCompletion()

FRAUD_FLAG_CREATED
  → NotificationService.notify(admin, PUSH + SMS if HIGH)
  → If HIGH: CollectorService.pauseCollector()
  → WebSocketGateway.emit('admin:alerts', flag)
```

### 11.4 Event Flow Diagram

```
[Household App]──POST /jobs──→[JobController]
                                    │
                                    ▼
                              [JobService]
                                    │
                              emit JOB_CREATED
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           [AssignmentService] [NotificationSvc] [AnalyticsSvc]
                    │
              emit JOB_ASSIGNED
                    │
              ┌─────┼─────┐
              ▼     ▼     ▼
         [Notify] [WS]  [Timeout]
```

---

## 12. Updated Data Model (Complete)

### All Entities

```
User ──1:N──→ Job (as household)
User ──1:N──→ Job (as collector)
Job  ──1:1──→ Rating
Job  ──1:1──→ Proof
Job  ──1:1──→ Earnings
Job  ──1:1──→ Dispute
Job  ──1:N──→ FraudFlag
User ──1:N──→ Notification
SystemConfig (standalone)
```

### Entity Count: 9
1. **User** — all roles
2. **Job** — core business object
3. **Rating** — household rates collector
4. **Proof** — completion evidence
5. **Earnings** — collector compensation
6. **Dispute** — proof validation disputes
7. **FraudFlag** — abuse detection records
8. **Notification** — delivery tracking
9. **SystemConfig** — admin-configurable parameters

---

## 13. Updated API Surface

### Auth (4 endpoints)
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`

### Jobs — Household (6 endpoints)
- POST `/jobs`
- GET `/jobs/mine`
- GET `/jobs/:id`
- POST `/jobs/:id/cancel`
- POST `/jobs/:id/validate` (validate proof)
- POST `/jobs/:id/dispute` (dispute proof)
- POST `/jobs/:id/rate`

### Jobs — Collector (7 endpoints)
- GET `/jobs/assigned`
- POST `/jobs/:id/accept`
- POST `/jobs/:id/reject`
- POST `/jobs/:id/start`
- POST `/jobs/:id/complete` (with proof upload)
- GET `/jobs/earnings`
- GET `/jobs/earnings/summary`

### Admin (10 endpoints)
- GET `/admin/users`
- GET `/admin/users/:id`
- PATCH `/admin/users/:id`
- GET `/admin/jobs`
- POST `/admin/jobs/:id/assign`
- GET `/admin/stats`
- GET `/admin/collectors/performance`
- GET `/admin/fraud-flags`
- PATCH `/admin/fraud-flags/:id`
- GET/PUT `/admin/config`

### Notifications (3 endpoints)
- GET `/notifications` (my notifications)
- PATCH `/notifications/:id/read`
- PATCH `/notifications/read-all`

### Files (1 endpoint)
- POST `/files/upload`

### Real-Time (WebSocket)
- WS `/ws` (Socket.IO namespace)

### Health (1 endpoint)
- GET `/health`

**Total: 33 REST endpoints + 1 WebSocket namespace**

---

## 14. Non-Functional Requirements

| Requirement | Solution |
|-------------|----------|
| Low-end Android | Minimal APK, lazy loading, compressed images, no heavy animations |
| Unstable internet | Offline queue (SQLite), retry with exponential backoff, optimistic UI |
| < 2s response | DB indexes, pagination, efficient queries, response compression |
| Retry on failure | Dio interceptor, idempotent APIs, request deduplication |
| Security | JWT (15min access + 7day refresh), bcrypt, RBAC guards |
| Real-time | WebSocket primary, 15s polling fallback |
| Fraud prevention | Multi-signal detection, auto-flagging, admin review queue |

---

## 15. Assumptions (Final)

1. Tech stack: NestJS + PostgreSQL + React/MUI + Flutter/Riverpod
2. 3 roles: HOUSEHOLD, COLLECTOR, ADMIN
3. No payments in this build (earnings tracked, payouts manual)
4. Rating is optional — job lifecycle does not require it
5. Cancellation allowed in REQUESTED/ASSIGNED; admin-only for IN_PROGRESS
6. Collector assignment uses weighted scoring (distance + workload + rating + recency)
7. Earnings = base_rate + (distance × per_km_rate) × surge_multiplier
8. Push notifications via FCM with SMS fallback via Twilio
9. Real-time via WebSocket (Socket.IO) with HTTP polling fallback
10. Proof auto-validates after 24 hours if household does not respond
11. Fraud flags are logged and surfaced to admin; HIGH severity auto-pauses collector
12. All system parameters are admin-configurable via SystemConfig
13. Currency is XAF (Central African CFA franc)
14. Event-driven architecture using NestJS EventEmitter2 (upgradeable to Redis/RabbitMQ)
15. Image storage via S3-compatible provider with CDN
16. Docker containerization for all services
17. Structured JSON logging with correlation IDs
18. Rate limiting at API gateway level

---

## 16. Real-Time Location Tracking

### 16.1 Overview

During IN_PROGRESS status, the collector's device sends periodic GPS coordinates to the server. The household sees a live-updating position on a map.

### 16.2 Update Frequency

| Network Quality | Interval | Rationale |
|----------------|----------|-----------|
| Good (WiFi/4G) | Every 10 seconds | Smooth tracking without excessive battery drain |
| Moderate (3G) | Every 20 seconds | Reduce bandwidth usage |
| Poor (2G/Edge) | Every 45 seconds | Minimize failed requests |
| Offline | Queue locally | Batch-send on reconnect |

The Flutter app uses `Geolocator` package to detect network quality and adapts interval dynamically.

### 16.3 GPS Update Payload

```typescript
// Collector → Server (via WebSocket or REST fallback)
{
  event: 'location:update',
  data: {
    jobId: 'uuid',
    latitude: 4.0511,
    longitude: 9.7679,
    accuracy: 15.0,          // meters
    speed: 2.5,              // m/s, nullable
    heading: 180.0,          // degrees, nullable
    altitude: 25.0,          // meters, nullable
    batteryLevel: 72,        // percentage
    networkType: '4G',       // WIFI, 4G, 3G, 2G, OFFLINE
    timestamp: '2026-04-19T12:30:00.000Z'
  }
}
```

### 16.4 Server Processing

```
Collector sends location:update
  → Validate: is this collector assigned to this job? Is job IN_PROGRESS?
  → Store: upsert into LocationUpdate table (keep only latest per job)
  → Broadcast: emit to WebSocket channel `job:{jobId}`
  → Fraud check: is collector within reasonable range of job location?
  → ETA calculation: estimate remaining distance + time
```

### 16.5 Household Receives (via WebSocket)

```typescript
// Server → Household (via WebSocket channel `job:{jobId}`)
{
  event: 'job:location',
  data: {
    jobId: 'uuid',
    collectorLat: 4.0511,
    collectorLng: 9.7679,
    estimatedDistanceKm: 1.2,
    estimatedTimeMinutes: 8,
    updatedAt: '2026-04-19T12:30:00.000Z'
  }
}
```

### 16.6 Location Storage

Only the **latest** location per active job is stored (not a full history). This minimizes storage and privacy concerns.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| jobId | UUID | FK → Job, unique (upsert) |
| collectorId | UUID | FK → User |
| latitude | DECIMAL(10,8) | |
| longitude | DECIMAL(11,8) | |
| accuracy | DECIMAL(6,2) | Meters |
| speed | DECIMAL(6,2) | m/s, nullable |
| heading | DECIMAL(6,2) | Degrees, nullable |
| networkType | VARCHAR(10) | |
| updatedAt | TIMESTAMP | |

On job completion, the location record is deleted (privacy by design). Only the final GPS at completion is stored on the Proof entity for fraud validation.

### 16.7 Battery & Data Optimization

- **Batching:** If WebSocket is down, queue updates locally and batch-send up to 5 on reconnect (only latest matters, so older ones are discarded)
- **Foreground service:** Android foreground service with persistent notification ("Tracking active pickup")
- **Auto-stop:** Tracking stops when job transitions out of IN_PROGRESS
- **Battery saver mode:** If battery < 15%, reduce frequency to every 60 seconds

---

## 17. Navigation Integration

### 17.1 Strategy: External Map App Deep Links

The collector taps "Navigate" in the app → opens their preferred map application with the job's coordinates pre-filled.

**Rationale:** Building in-app navigation is expensive and unreliable on low-end devices. Google Maps / Waze / OsmAnd already handle offline maps, routing, and turn-by-turn. We leverage them.

### 17.2 Deep Link Format

```dart
// Priority order: try Google Maps first, then any maps app, then in-app fallback
class NavigationService {
  
  // Option 1: Google Maps (most Android devices have it)
  static String googleMapsUrl(double lat, double lng) =>
    'google.navigation:q=$lat,$lng&mode=d';
  
  // Option 2: Universal geo intent (works with any maps app)
  static String geoIntentUrl(double lat, double lng, String label) =>
    'geo:$lat,$lng?q=$lat,$lng($label)';
  
  // Option 3: Web fallback (if no maps app installed)
  static String webFallbackUrl(double lat, double lng) =>
    'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving';
}
```

### 17.3 Launch Logic (Flutter)

```
1. Check if Google Maps is installed → launch google.navigation:
2. Else check if any maps app handles geo: intent → launch geo:
3. Else open web URL in browser
4. If completely offline → show in-app static map with coordinates + address text
```

### 17.4 Offline Navigation Fallback

When the collector has no internet:

1. **Show saved job details:** Address text, landmark notes from household, GPS coordinates
2. **Static map tile:** If previously cached (app pre-caches a low-res tile of the area around the job when assigned)
3. **Compass mode:** Show direction + straight-line distance to the job location using device compass + GPS (no internet needed)
4. **OsmAnd integration:** If collector has OsmAnd with offline maps downloaded, the geo: intent opens it

### 17.5 Pre-caching Strategy

When a job is ASSIGNED to a collector:
- App downloads a single static map tile (256x256 PNG, ~30KB) centered on the job location
- Stored locally until job is complete
- Uses MapTiler or OpenStreetMap static tiles API: `https://api.maptiler.com/maps/basic/static/{lng},{lat},14/256x256.png`

---

## 18. Offline Queue Design

### 18.1 Queued Actions

Not all actions can be queued — only **idempotent or conflict-safe** operations.

| Action | Queueable? | Conflict Risk | Strategy |
|--------|-----------|---------------|----------|
| **Create job** | ✅ Yes | Low (new resource) | Idempotency key prevents duplicates |
| **Cancel job** | ✅ Yes | Medium (state may change) | Server validates current state |
| **Accept job** | ✅ Yes | High (another collector may accept) | Server rejects if already accepted, show error on sync |
| **Reject job** | ✅ Yes | Low | Idempotent |
| **Start job** | ✅ Yes | Low (only assigned collector) | Server validates |
| **Complete job** | ✅ Yes | Low | Proof image queued separately |
| **Upload proof** | ✅ Yes | Low | Retry until success |
| **Rate job** | ✅ Yes | Low | Idempotent (upsert) |
| **Validate proof** | ✅ Yes | Low | Idempotent |
| **Dispute proof** | ✅ Yes | Low | Idempotent |
| **Location update** | ❌ No | N/A | Stale data; only send latest |
| **Read operations** | ❌ No | N/A | Show cached data, refresh on connect |

### 18.2 Queue Architecture (Flutter)

```
┌─────────────────────────────────────────────────┐
│                   Flutter App                    │
│                                                  │
│  [User Action] → [OfflineQueue (SQLite)]         │
│                        │                         │
│           ┌────────────┼────────────┐            │
│           │ Online     │ Offline    │            │
│           ▼            ▼            │            │
│     [Send to API]  [Store in DB]   │            │
│           │            │            │            │
│     [Success]    [ConnectivityMonitor]           │
│           │            │            │            │
│     [Remove from Q]   │ Online detected          │
│                        ▼            │            │
│                  [Process Queue]    │            │
│                  [In order, FIFO]   │            │
│                        │            │            │
│                  [Success → Remove] │            │
│                  [Failure → Retry]  │            │
└─────────────────────────────────────────────────┘
```

### 18.3 Queue Entry Schema (SQLite)

```sql
CREATE TABLE offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  action_type TEXT NOT NULL,          -- 'CREATE_JOB', 'ACCEPT_JOB', etc.
  endpoint TEXT NOT NULL,             -- '/jobs', '/jobs/{id}/accept'
  method TEXT NOT NULL,               -- 'POST', 'PATCH'
  payload TEXT NOT NULL,              -- JSON body
  file_path TEXT,                     -- Local path for image uploads
  status TEXT DEFAULT 'PENDING',      -- PENDING, PROCESSING, FAILED, COMPLETED
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  created_at TEXT NOT NULL,
  last_attempt_at TEXT,
  error_message TEXT
);
```

### 18.4 Retry Strategy

```
Attempt 1: Immediate (on reconnect)
Attempt 2: 5 seconds delay
Attempt 3: 30 seconds delay
Attempt 4: 2 minutes delay
Attempt 5: 10 minutes delay
After 5 failures: Mark as FAILED, show user notification to retry manually
```

Exponential backoff with jitter: `delay = min(base × 2^attempt + random(0, 1000ms), 10 minutes)`

### 18.5 Conflict Resolution

| Conflict | Detection | Resolution |
|----------|-----------|------------|
| Job already accepted by another collector | Server returns 409 Conflict | Remove from queue, show "Job no longer available" |
| Job state changed (e.g., cancelled while offline) | Server returns 400/409 | Remove from queue, refresh job data, notify user |
| Duplicate request (same idempotency key) | Server returns 200 with existing result | Treat as success, remove from queue |
| Auth token expired | Server returns 401 | Pause queue, trigger token refresh, resume |
| Server error (500) | Server returns 5xx | Retry with backoff |

### 18.6 Idempotency Implementation

**Client side:**
- Every queued action gets a UUID `idempotency_key` generated at creation time
- Key is sent in `X-Idempotency-Key` header

**Server side:**
```
1. Receive request with X-Idempotency-Key
2. Check idempotency_cache (Redis or DB table) for this key
3. If found: return cached response (no re-processing)
4. If not found: process request, store response in cache with 24h TTL
5. Return response
```

Idempotency cache entry:
| Field | Type | Notes |
|-------|------|-------|
| key | VARCHAR(36) | PK (UUID) |
| statusCode | INT | HTTP status returned |
| responseBody | JSONB | Full response |
| createdAt | TIMESTAMP | Auto |
| expiresAt | TIMESTAMP | createdAt + 24h |

### 18.7 Optimistic UI

For queued actions, the app **immediately updates the local UI** as if the action succeeded:
- Create job → show in "My Pickups" with a "syncing" indicator
- Accept job → show in "My Jobs" with syncing indicator
- Complete job → show as completed locally

If the server rejects on sync → roll back UI state, show error notification.

---

## 19. API Protection & Rate Limiting

### 19.1 Rate Limiting Rules

| Endpoint Group | Limit | Window | Scope |
|---------------|-------|--------|-------|
| `POST /auth/register` | 3 requests | 1 hour | Per IP |
| `POST /auth/login` | 10 requests | 15 minutes | Per IP |
| `POST /auth/login` (failed) | 5 failed attempts | 15 minutes | Per phone number → lock account for 30 min |
| `POST /jobs` | 5 requests | 1 hour | Per user |
| `POST /jobs/:id/*` (state changes) | 30 requests | 1 minute | Per user |
| `POST /files/upload` | 10 requests | 10 minutes | Per user |
| `GET /*` (read endpoints) | 100 requests | 1 minute | Per user |
| `WS location:update` | 12 updates | 1 minute | Per connection (max ~every 5s) |
| Global | 1000 requests | 1 minute | Per IP |

### 19.2 Implementation

```
NestJS ThrottlerModule (@nestjs/throttler)
  → Global guard: 1000 req/min per IP
  → Per-route decorators: @Throttle({ default: { limit: 5, ttl: 3600000 } })
  → Custom guard for failed login tracking (Redis counter)
```

### 19.3 Abuse Prevention Layers

```
Layer 1: Rate Limiting (ThrottlerModule)
  → Too many requests → 429 Too Many Requests

Layer 2: Request Validation (class-validator)
  → Malformed input → 400 Bad Request
  → Strip unknown properties (whitelist mode)

Layer 3: Authentication Guard
  → Missing/invalid token → 401 Unauthorized
  → Token expiry enforcement

Layer 4: Authorization Guard (RBAC)
  → Wrong role → 403 Forbidden
  → e.g., HOUSEHOLD cannot call /jobs/:id/accept

Layer 5: Business Logic Validation
  → Duplicate job check
  → State transition validation
  → Idempotency check

Layer 6: Fraud Detection (async)
  → Post-action analysis
  → Flag suspicious patterns
```

### 19.4 Request Size Limits

| Type | Max Size |
|------|---------|
| JSON body | 1 MB |
| File upload | 10 MB |
| URL length | 2048 characters |
| Multipart total | 15 MB |

### 19.5 Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

Applied via `helmet` middleware in NestJS.

---

## 20. Image Storage & Delivery

### 20.1 Storage Provider

**Primary:** Amazon S3 (or DigitalOcean Spaces — S3-compatible API)
**CDN:** CloudFront (AWS) or Spaces CDN (DigitalOcean)
**Dev:** Local filesystem (`./uploads/`) with same API interface

### 20.2 Upload Pipeline

```
Collector takes photo
  → Flutter compresses image (client-side):
      - Resize to max 1200x1200 pixels
      - JPEG quality 75%
      - Target: < 500KB per image
  → If offline: store in app local storage, queue upload
  → If online: upload to POST /files/upload (multipart/form-data)
  
Server receives image
  → Validate: file type (JPEG/PNG only), max 10MB raw
  → Server-side processing (Sharp library):
      - Strip EXIF metadata (privacy — remove GPS from image metadata)
      - Generate thumbnail (300x300, quality 60%)
      - Convert to WebP if client supports it
  → Upload to S3:
      - Original: s3://waste-prod/proofs/{jobId}/original.jpg
      - Thumbnail: s3://waste-prod/proofs/{jobId}/thumb.jpg
  → Return CDN URLs
```

### 20.3 S3 Bucket Structure

```
waste-{env}/
├── proofs/
│   └── {jobId}/
│       ├── original.jpg      (~200-500KB)
│       └── thumb.jpg          (~30-50KB)
├── avatars/
│   └── {userId}/
│       ├── original.jpg
│       └── thumb.jpg
└── system/
    └── map-tiles/             (pre-cached static tiles)
```

### 20.4 CDN Configuration

```
Origin:    s3://waste-prod.s3.amazonaws.com
CDN URL:   https://cdn.waste-app.com
Cache TTL: 30 days (images are immutable — new upload = new path)
CORS:      Allow origins: [app domains, admin domain]
```

### 20.5 Signed URLs

Proof images use **signed URLs** (expire in 1 hour) for privacy:
- Server generates signed URL on-demand when client requests job detail
- Prevents direct bucket access
- Admin gets longer-lived URLs (24h) for review

### 20.6 Cleanup Policy

- Proofs for CANCELLED jobs: delete after 7 days
- Proofs for COMPLETED/RATED jobs: retain for 90 days, then archive to Glacier/cold storage
- Avatars: delete on account deactivation (30-day grace period)

### 20.7 Bandwidth Optimization for Low-End Devices

- Default: serve thumbnail in list views, original only on detail/full-screen
- Flutter `cached_network_image` with disk cache (max 100MB)
- Progressive JPEG for larger images
- Admin dashboard: lazy-load images, paginate proof galleries

---

## 21. Observability

### 21.1 Logging Strategy

**Framework:** Winston (NestJS) + structured JSON logs

```typescript
// Log format (every log entry)
{
  timestamp: '2026-04-19T12:30:00.000Z',
  level: 'info',                    // error, warn, info, debug
  correlationId: 'uuid',            // tracks request across services
  service: 'waste-api',
  module: 'JobService',
  method: 'createJob',
  userId: 'uuid',                   // authenticated user, if available
  message: 'Job created successfully',
  metadata: {                       // context-specific data
    jobId: 'uuid',
    householdId: 'uuid',
    scheduledDate: '2026-04-20'
  },
  duration: 145,                    // ms (for timed operations)
  statusCode: 201                   // HTTP status (for request logs)
}
```

### 21.2 Log Levels by Environment

| Level | Dev | Staging | Production |
|-------|-----|---------|------------|
| error | ✅ | ✅ | ✅ |
| warn | ✅ | ✅ | ✅ |
| info | ✅ | ✅ | ✅ |
| debug | ✅ | ✅ | ❌ |

### 21.3 Correlation ID Flow

```
Client request
  → API Gateway adds X-Correlation-ID header (UUID)
  → All log entries include this ID
  → WebSocket events include this ID
  → Downstream service calls include this ID
  → Enables tracing a single user action across all logs
```

NestJS middleware extracts or generates correlation ID on every request.

### 21.4 Key Events to Log

| Event | Level | What |
|-------|-------|------|
| Request received | info | Method, path, userId, IP |
| Request completed | info | Status code, duration |
| Auth failure | warn | Phone, IP, reason |
| Job state transition | info | jobId, from → to, actor |
| Assignment algorithm | info | jobId, candidates, scores, winner |
| Fraud flag | warn | jobId, type, severity, details |
| Notification sent | info | userId, channel, type, status |
| Notification failed | error | userId, channel, type, error |
| DB query slow (> 500ms) | warn | Query, duration |
| Unhandled exception | error | Stack trace, request context |
| WebSocket connect/disconnect | debug | userId, reason |
| Rate limit hit | warn | userId/IP, endpoint, limit |

### 21.5 Error Tracking

**Service:** Sentry (sentry.io)

```
Integration points:
  → NestJS: @sentry/nestjs — catches unhandled exceptions, captures context
  → Flutter: sentry_flutter — captures crashes, ANRs, unhandled exceptions
  → React Admin: @sentry/react — error boundaries, breadcrumbs
```

Every error report includes:
- Correlation ID
- User ID and role
- Device info (Flutter)
- Request context (API)
- Stack trace
- Breadcrumbs (last 20 actions before error)

### 21.6 Metrics Collection

**Service:** Prometheus + Grafana (self-hosted) or DataDog

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method, path, status |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `active_websocket_connections` | Gauge | Current WS connections |
| `jobs_created_total` | Counter | Jobs created by status |
| `jobs_completed_total` | Counter | Jobs completed |
| `job_assignment_duration_seconds` | Histogram | Time to find and assign collector |
| `job_completion_time_seconds` | Histogram | Time from IN_PROGRESS to COMPLETED |
| `notifications_sent_total` | Counter | By channel (push/sms), status |
| `fraud_flags_total` | Counter | By type, severity |
| `collector_active_count` | Gauge | Currently active collectors |
| `offline_queue_size` | Gauge | Pending queued actions (from client telemetry) |
| `db_query_duration_seconds` | Histogram | Database query latency |
| `s3_upload_duration_seconds` | Histogram | Image upload latency |

### 21.7 Health Check Endpoints

```
GET /health           → { status: 'ok', uptime, version }
GET /health/detailed  → (admin only) {
  database: 'up',
  redis: 'up',
  s3: 'up',
  websocket: { connections: 42 },
  queue: { pending: 3, failed: 0 }
}
```

### 21.8 Alerting Rules

| Condition | Alert | Severity |
|-----------|-------|----------|
| Error rate > 5% in 5 min | API Error Spike | Critical |
| P95 latency > 3s for 5 min | Slow API | Warning |
| DB connection pool exhausted | DB Overload | Critical |
| 0 active collectors for 30 min | No Collectors Available | Warning |
| Fraud flags > 10 in 1 hour | Fraud Spike | Critical |
| Disk usage > 85% | Storage Warning | Warning |
| Certificate expiry < 14 days | Cert Renewal | Warning |

---

## 22. Deployment Architecture

### 22.1 Containerization (Docker)

```
waste/
├── docker-compose.yml              # Local dev: all services
├── docker-compose.prod.yml         # Production overrides
├── backend/
│   ├── Dockerfile                  # Node.js 20 Alpine
│   └── .dockerignore
├── admin/
│   ├── Dockerfile                  # Multi-stage: build + nginx
│   └── nginx.conf
└── infra/
    ├── postgres/
    │   └── init.sql                # DB initialization
    ├── redis/
    │   └── redis.conf
    └── nginx/
        └── nginx.conf              # Reverse proxy
```

### 22.2 Docker Compose (Development)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    environment:
      POSTGRES_DB: waste_management
      POSTGRES_USER: waste_user
      POSTGRES_PASSWORD: waste_dev_pass

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  api:
    build: ./backend
    ports: ['3000:3000']
    depends_on: [postgres, redis]
    volumes: ['./backend/src:/app/src']     # Hot reload
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://waste_user:waste_dev_pass@postgres:5432/waste_management
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-prod

  admin:
    build: ./admin
    ports: ['5173:5173']
    volumes: ['./admin/src:/app/src']       # Hot reload
    environment:
      VITE_API_URL: http://localhost:3000/api/v1

volumes:
  pgdata:
```

### 22.3 Environment Configuration

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NODE_ENV` | development | staging | production |
| `DATABASE_URL` | localhost | staging-db.internal | prod-db.internal |
| `REDIS_URL` | localhost | staging-redis.internal | prod-redis.internal |
| `JWT_SECRET` | dev-secret | [vault] | [vault] |
| `JWT_ACCESS_TTL` | 1h (relaxed) | 15m | 15m |
| `JWT_REFRESH_TTL` | 30d (relaxed) | 7d | 7d |
| `S3_BUCKET` | waste-dev | waste-staging | waste-prod |
| `S3_REGION` | — | eu-west-1 | eu-west-1 |
| `CDN_URL` | localhost:3000/uploads | staging-cdn | cdn.waste-app.com |
| `FCM_SERVER_KEY` | — | [vault] | [vault] |
| `TWILIO_SID` | — | [vault] | [vault] |
| `SENTRY_DSN` | — | [vault] | [vault] |
| `LOG_LEVEL` | debug | debug | info |
| `CORS_ORIGINS` | * | staging URLs | production URLs |
| `THROTTLE_ENABLED` | false | true | true |

### 22.4 Production Architecture

```
                    ┌──────────────┐
                    │   CloudFlare  │  DNS + DDoS protection
                    │   (or Route53)│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Nginx     │  Reverse proxy + TLS termination
                    │  (or ALB)    │  + static file serving (admin)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐    │     ┌──────▼──────┐
       │  API Server  │    │     │ Admin (Nginx)│
       │  (NestJS)    │    │     │ Static SPA   │
       │  x2 replicas │    │     └─────────────┘
       └──────┬───────┘    │
              │            │
       ┌──────▼──────┐  ┌─▼────────────┐
       │ PostgreSQL   │  │    Redis      │
       │ (Primary +   │  │ (rate limit,  │
       │  Read Replica)│  │  cache,       │
       └─────────────┘  │  idempotency) │
                         └──────────────┘
              │
       ┌──────▼──────┐
       │     S3      │──→  CloudFront CDN
       │  (images)   │
       └─────────────┘
```

### 22.5 CI/CD Pipeline Outline

```
┌─────────────────────────────────────────────────────┐
│                    GitHub Actions                     │
│                                                       │
│  Push to main / PR                                    │
│    │                                                  │
│    ├── 1. Lint & Type Check                           │
│    │     ├── Backend: eslint + tsc --noEmit           │
│    │     ├── Admin: eslint + tsc --noEmit             │
│    │     └── Flutter: flutter analyze                 │
│    │                                                  │
│    ├── 2. Unit Tests                                  │
│    │     ├── Backend: jest --coverage (>80%)           │
│    │     ├── Admin: vitest --coverage (>80%)           │
│    │     └── Flutter: flutter test --coverage (>80%)   │
│    │                                                  │
│    ├── 3. Integration Tests                           │
│    │     └── Backend: jest e2e (docker-compose test)   │
│    │                                                  │
│    ├── 4. Build                                       │
│    │     ├── Backend: docker build                     │
│    │     ├── Admin: vite build + docker build          │
│    │     └── Flutter: flutter build apk --release      │
│    │                                                  │
│    ├── 5. Security Scan                               │
│    │     ├── npm audit / snyk                          │
│    │     └── Docker image scan (Trivy)                 │
│    │                                                  │
│    └── 6. Deploy (on merge to main)                   │
│          ├── Staging: auto-deploy                      │
│          └── Production: manual approval gate          │
│                                                       │
│  Pipeline Time Target: < 10 minutes                   │
└─────────────────────────────────────────────────────┘
```

### 22.6 Flutter Build & Distribution

```
CI builds:
  → flutter build apk --release --split-per-abi    (Android)
  → flutter build ipa --release                     (iOS, if needed)

Distribution:
  → Dev/Staging: Firebase App Distribution (internal testers)
  → Production: Google Play Store (primary), APK download (backup)

APK size target: < 25MB (for low-end devices with limited storage)
```

### 22.7 Database Migrations Strategy

```
Development:  TypeORM synchronize: true (auto-sync schema)
Staging/Prod: TypeORM migrations only (checked into git)

Migration workflow:
  1. Developer creates migration: npm run migration:generate -- -n AddEarningsTable
  2. Migration reviewed in PR
  3. On deploy: npm run migration:run (runs before app starts)
  4. Rollback: npm run migration:revert
```

---

## 23. Updated Assumptions (Final — v2)

1. Tech stack: NestJS + PostgreSQL + Redis + React/MUI + Flutter/Riverpod
2. 3 roles: HOUSEHOLD, COLLECTOR, ADMIN
3. No payments in this build (earnings tracked, payouts manual)
4. Rating is optional — job lifecycle does not require it
5. Cancellation allowed in REQUESTED/ASSIGNED; admin-only for IN_PROGRESS
6. Collector assignment uses weighted scoring (distance + workload + rating + recency)
7. Earnings = base_rate + (distance × per_km_rate) × surge_multiplier
8. Push notifications via FCM with SMS fallback via Twilio
9. Real-time via WebSocket (Socket.IO) with HTTP polling fallback
10. Proof auto-validates after 24 hours if household does not respond
11. Fraud flags are logged and surfaced to admin; HIGH severity auto-pauses collector
12. All system parameters are admin-configurable via SystemConfig
13. Currency is XAF (Central African CFA franc)
14. Event-driven architecture using NestJS EventEmitter2 (upgradeable to Redis/RabbitMQ)
15. Image storage via S3-compatible provider with CloudFront CDN
16. Docker containerization for all services; Docker Compose for local dev
17. Structured JSON logging (Winston) with correlation IDs
18. Rate limiting via @nestjs/throttler + Redis backing
19. Sentry for error tracking across all 3 applications
20. Prometheus + Grafana for metrics (or DataDog)
21. CI/CD via GitHub Actions; staging auto-deploy, production manual gate
22. Navigation via external map app deep links (Google Maps / geo: intent)
23. Offline queue via SQLite on device; FIFO processing with exponential backoff
24. Idempotency via X-Idempotency-Key header + server-side cache (Redis/DB, 24h TTL)
25. GPS tracking only during IN_PROGRESS; location deleted after job completion (privacy)
26. APK size target: < 25MB
27. Test coverage target: > 80% across all codebases
