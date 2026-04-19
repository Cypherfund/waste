# Phase 2: System Design — Waste Management Platform

---

## 1. Backend Architecture

### 1.1 Module Breakdown

```
backend/src/
├── main.ts                           # Bootstrap, Swagger, CORS, validation pipes
├── app.module.ts                     # Root module — imports all feature modules
│
├── common/                           # Shared utilities (no business logic)
│   ├── constants/
│   │   └── roles.constant.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts      # @CurrentUser() param decorator
│   │   ├── roles.decorator.ts             # @Roles('ADMIN') decorator
│   │   ├── public.decorator.ts            # @Public() bypass auth
│   │   └── idempotent.decorator.ts        # @Idempotent() decorator
│   ├── dto/
│   │   └── pagination.dto.ts              # Shared page/limit DTO
│   ├── enums/
│   │   ├── role.enum.ts                   # HOUSEHOLD, COLLECTOR, ADMIN
│   │   ├── job-status.enum.ts             # REQUESTED..RATED, CANCELLED, DISPUTED
│   │   ├── earning-status.enum.ts         # PENDING, CONFIRMED, PAID
│   │   ├── notification-type.enum.ts      # JOB_ASSIGNED, JOB_COMPLETED, etc.
│   │   ├── notification-channel.enum.ts   # PUSH, SMS, IN_APP
│   │   ├── fraud-type.enum.ts             # FAST_COMPLETION, GPS_MISMATCH, etc.
│   │   ├── fraud-severity.enum.ts         # LOW, MEDIUM, HIGH
│   │   └── dispute-status.enum.ts         # OPEN, RESOLVED_ACCEPTED, RESOLVED_REJECTED
│   ├── guards/
│   │   ├── jwt-auth.guard.ts              # Global JWT guard
│   │   ├── roles.guard.ts                 # RBAC guard
│   │   └── throttle.guard.ts              # Custom throttle guard (Redis-backed)
│   ├── interceptors/
│   │   ├── correlation-id.interceptor.ts  # Adds X-Correlation-ID
│   │   ├── logging.interceptor.ts         # Request/response logging
│   │   ├── timeout.interceptor.ts         # 30s request timeout
│   │   └── idempotency.interceptor.ts     # Checks X-Idempotency-Key
│   ├── filters/
│   │   └── global-exception.filter.ts     # Centralized error formatting
│   ├── middleware/
│   │   └── correlation-id.middleware.ts   # Extract/generate correlation ID
│   └── pipes/
│       └── parse-uuid.pipe.ts             # UUID parameter validation
│
├── config/                            # Application configuration
│   ├── configuration.ts               # ConfigService loader
│   ├── validation.schema.ts           # Joi env validation
│   └── feature-flags.ts              # Feature flag helpers
│
├── database/                          # Database setup
│   ├── database.module.ts             # TypeORM connection
│   ├── data-source.ts                 # CLI data source for migrations
│   └── migrations/                    # Versioned migration files
│       ├── 001_initial_schema.ts
│       ├── 002_add_earnings.ts
│       ├── 003_add_notifications.ts
│       └── ...
│
├── auth/                              # Authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts            # register, login, refresh, logout
│   ├── auth.service.ts               # Business logic
│   ├── strategies/
│   │   ├── jwt.strategy.ts           # Access token validation
│   │   ├── jwt-refresh.strategy.ts   # Refresh token validation
│   │   └── local.strategy.ts         # Phone + password login
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       ├── refresh-token.dto.ts
│       └── auth-response.dto.ts
│
├── users/                             # User management module
│   ├── users.module.ts
│   ├── users.controller.ts           # Admin: list, get, update status
│   ├── users.service.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── dto/
│       ├── update-user-status.dto.ts
│       └── user-response.dto.ts
│
├── jobs/                              # Core job module
│   ├── jobs.module.ts
│   ├── jobs.controller.ts            # All job endpoints (household + collector)
│   ├── jobs.service.ts               # Job CRUD, state transitions
│   ├── entities/
│   │   ├── job.entity.ts
│   │   ├── proof.entity.ts
│   │   └── location-update.entity.ts
│   └── dto/
│       ├── create-job.dto.ts
│       ├── complete-job.dto.ts
│       ├── job-response.dto.ts
│       ├── job-filter.dto.ts
│       └── validate-proof.dto.ts
│
├── assignment/                        # Collector assignment engine
│   ├── assignment.module.ts
│   ├── assignment.service.ts          # Scoring algorithm, auto-assign
│   ├── assignment.scheduler.ts        # Timeout scheduler (accept deadline)
│   └── dto/
│       └── manual-assign.dto.ts
│
├── ratings/                           # Rating module
│   ├── ratings.module.ts
│   ├── ratings.service.ts
│   ├── entities/
│   │   └── rating.entity.ts
│   └── dto/
│       └── create-rating.dto.ts
│
├── earnings/                          # Earnings module
│   ├── earnings.module.ts
│   ├── earnings.service.ts            # Calculate, confirm, track
│   ├── entities/
│   │   └── earning.entity.ts
│   └── dto/
│       └── earnings-summary.dto.ts
│
├── disputes/                          # Dispute resolution module
│   ├── disputes.module.ts
│   ├── disputes.service.ts
│   ├── entities/
│   │   └── dispute.entity.ts
│   └── dto/
│       ├── create-dispute.dto.ts
│       └── resolve-dispute.dto.ts
│
├── notifications/                     # Notification dispatch module
│   ├── notifications.module.ts
│   ├── notifications.controller.ts    # List/read user notifications
│   ├── notifications.service.ts       # Dispatch logic
│   ├── providers/
│   │   ├── fcm.provider.ts           # Firebase Cloud Messaging
│   │   └── sms.provider.ts           # Twilio SMS
│   ├── templates/
│   │   └── notification.templates.ts  # Message templates
│   ├── entities/
│   │   └── notification.entity.ts
│   └── dto/
│       └── notification-response.dto.ts
│
├── fraud/                             # Fraud detection module
│   ├── fraud.module.ts
│   ├── fraud.service.ts               # Detection rules, flagging
│   ├── entities/
│   │   └── fraud-flag.entity.ts
│   └── dto/
│       └── review-fraud-flag.dto.ts
│
├── timeslots/                         # Collector availability module
│   ├── timeslots.module.ts
│   ├── timeslots.service.ts
│   ├── entities/
│   │   └── collector-availability.entity.ts
│   └── dto/
│       ├── set-availability.dto.ts
│       └── availability-response.dto.ts
│
├── admin/                             # Admin-specific endpoints
│   ├── admin.module.ts
│   ├── admin.controller.ts            # Stats, config, manual assign
│   ├── admin.service.ts
│   └── dto/
│       ├── stats-response.dto.ts
│       ├── update-config.dto.ts
│       └── collector-performance.dto.ts
│
├── files/                             # File upload module
│   ├── files.module.ts
│   ├── files.controller.ts            # POST /files/upload
│   ├── files.service.ts               # Compression, S3 upload
│   └── providers/
│       ├── local-storage.provider.ts  # Dev
│       └── s3-storage.provider.ts     # Prod
│
├── health/                            # Health check module
│   ├── health.module.ts
│   └── health.controller.ts
│
├── events/                            # Event bus module
│   ├── events.module.ts
│   ├── event-emitter.service.ts       # Typed event emission
│   └── events.types.ts               # All event type definitions
│
├── scheduler/                         # Cron jobs module
│   ├── scheduler.module.ts
│   └── tasks/
│       ├── auto-validate-proof.task.ts    # 24h proof auto-validation
│       ├── assignment-timeout.task.ts     # 10min accept timeout check
│       ├── cleanup-location.task.ts       # Delete stale location records
│       └── idempotency-cleanup.task.ts    # Purge expired idempotency keys
│
└── websocket/                         # WebSocket gateway
    ├── websocket.module.ts
    ├── websocket.gateway.ts           # Socket.IO gateway
    └── websocket.guard.ts             # JWT auth for WS connections
```

**Total: 17 feature modules + 1 common module**

### 1.2 Service Boundaries

Each module owns its own entities, services, and DTOs. Cross-module communication happens through:

1. **Direct injection** — when module B needs module A's service, module A exports it
2. **Event bus** — for decoupled, fire-and-forget communication (preferred)

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Module (Root)                         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth   │  │  Users   │  │   Jobs   │  │  Assignment  │   │
│  │          │→ │          │← │          │← │              │   │
│  └──────────┘  └──────────┘  └────┬─────┘  └──────┬───────┘   │
│                                    │               │            │
│                    ┌───────────────┼───────────────┼────┐       │
│                    │               │               │    │       │
│              ┌─────▼────┐  ┌──────▼─────┐  ┌─────▼──┐ │       │
│              │ Ratings   │  │  Earnings  │  │ Fraud  │ │       │
│              └──────────┘  └────────────┘  └────────┘ │       │
│                                                        │       │
│              ┌──────────┐  ┌────────────┐  ┌─────────┐│       │
│              │ Disputes  │  │Timeslots   │  │ Files   ││       │
│              └──────────┘  └────────────┘  └─────────┘│       │
│                                                        │       │
│              ┌──────────┐  ┌────────────┐  ┌─────────┐│       │
│              │Notif.    │  │ Scheduler  │  │Websocket││       │
│              └──────────┘  └────────────┘  └─────────┘│       │
│                                                        │       │
│              ┌──────────┐  ┌────────────┐              │       │
│              │  Admin   │  │  Health    │              │       │
│              └──────────┘  └────────────┘              │       │
│                                                        │       │
│              ┌──────────────────────────────────────────┘       │
│              │           Events Module                          │
│              │  (EventEmitter2 — cross-module communication)    │
│              └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Dependency Flow (What Imports What)

```
Auth        → Users (to create/find users)
Jobs        → Users (to validate household/collector)
             → Events (to emit JOB_CREATED, JOB_COMPLETED, etc.)
Assignment  → Users (to query collectors)
             → Jobs (to update job status)
             → Timeslots (to check availability)
             → Events (to emit JOB_ASSIGNED)
Ratings     → Jobs (to validate job status)
             → Users (to update collector avg rating)
             → Events (to emit JOB_RATED)
Earnings    → Jobs (to read job data for calculation)
             → Events (listens to JOB_COMPLETED, PROOF_VALIDATED)
Disputes    → Jobs (to read/update job)
             → Earnings (to confirm/reject earnings)
             → Events (to emit DISPUTE_RESOLVED)
Notifications → Events (listens to ALL events, dispatches notifications)
               → Users (to get FCM tokens, phone numbers)
Fraud       → Events (listens to JOB_COMPLETED, JOB_STARTED)
             → Users (to pause collector)
Timeslots   → Users (to validate collector)
Admin       → Users, Jobs, Earnings, Fraud (reads across modules)
             → Assignment (for manual assign)
Files       → (standalone — no domain dependencies)
Websocket   → Events (listens to events, broadcasts to channels)
             → Auth (to validate WS JWT)
Scheduler   → Jobs, Earnings, Assignment (runs periodic tasks)
Health      → Database, Redis, S3 (checks connectivity)
```

### 1.4 Key Design Rules

1. **Controllers** handle HTTP concerns only (parse request, call service, format response)
2. **Services** contain all business logic; they are the only layer that touches repositories
3. **Entities** are TypeORM models — they define the DB schema
4. **DTOs** validate input (class-validator) and shape output (class-transformer)
5. **Events** decouple modules — a service emits an event, listeners in other modules react
6. **No circular dependencies** — if A needs B and B needs A, use events

---

## 2. Database Schema

### 2.1 Entity-Relationship Diagram

```
┌──────────────┐    1:N     ┌──────────────┐    1:1    ┌──────────────┐
│    users     │───────────→│     jobs     │──────────→│   ratings    │
│              │            │              │           └──────────────┘
│ id (PK)      │    1:N     │ id (PK)      │    1:1    ┌──────────────┐
│ name         │←──────────│ household_id │──────────→│   proofs     │
│ email        │ (collector)│ collector_id │           └──────────────┘
│ phone        │            │ status       │    1:1    ┌──────────────┐
│ password     │            │ scheduled_*  │──────────→│  earnings    │
│ role         │            │ location_*   │           └──────────────┘
│ is_active    │            │ ...          │    1:1    ┌──────────────┐
│ fcm_token    │            └──────────────┘──────────→│  disputes    │
│ ...          │                   │                   └──────────────┘
└──────┬───────┘                   │ 1:N    ┌──────────────┐
       │                           └───────→│ fraud_flags  │
       │ 1:N                                └──────────────┘
       │         ┌──────────────────┐
       ├────────→│  notifications   │
       │         └──────────────────┘
       │ 1:N     ┌──────────────────┐
       └────────→│collector_avail.  │
                 └──────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  system_config   │    │ idempotency_cache│    │ location_updates │
│  (standalone)    │    │  (standalone)    │    │  (standalone)    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 2.2 Complete DDL

```sql
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('HOUSEHOLD', 'COLLECTOR', 'ADMIN');

CREATE TYPE job_status AS ENUM (
  'REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED',
  'VALIDATED', 'RATED', 'CANCELLED', 'DISPUTED'
);

CREATE TYPE earning_status AS ENUM ('PENDING', 'CONFIRMED', 'PAID');

CREATE TYPE notification_channel AS ENUM ('PUSH', 'SMS', 'IN_APP');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

CREATE TYPE fraud_type AS ENUM (
  'FAST_COMPLETION', 'GPS_MISMATCH', 'IMAGE_REUSE',
  'SUSPICIOUS_PATTERN', 'DUPLICATE_REQUEST'
);
CREATE TYPE fraud_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE fraud_flag_status AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'CONFIRMED');

CREATE TYPE dispute_status AS ENUM ('OPEN', 'RESOLVED_ACCEPTED', 'RESOLVED_REJECTED');

CREATE TYPE day_of_week AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity for search
CREATE EXTENSION IF NOT EXISTS "earthdistance"
  CASCADE;                                        -- Requires cube; geo distance calc

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100)    NOT NULL,
  email           VARCHAR(255)    UNIQUE,
  phone           VARCHAR(20)     NOT NULL UNIQUE,
  password_hash   VARCHAR(255)    NOT NULL,
  role            user_role       NOT NULL,
  is_active       BOOLEAN         NOT NULL DEFAULT true,
  avatar_url      VARCHAR(500),
  latitude        DECIMAL(10,8),           -- collector's base/home location
  longitude       DECIMAL(11,8),
  fcm_token       VARCHAR(500),            -- Firebase push token
  refresh_token_hash VARCHAR(255),         -- hashed refresh token
  avg_rating      DECIMAL(3,2)    DEFAULT 0.00,
  total_completed INTEGER         DEFAULT 0,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_active_role ON users(is_active, role);
CREATE INDEX idx_users_location ON users USING gist (
  ll_to_earth(latitude, longitude)
) WHERE role = 'COLLECTOR' AND latitude IS NOT NULL;

-- ============================================================
-- TABLE: jobs
-- ============================================================

CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id      UUID            NOT NULL REFERENCES users(id),
  collector_id      UUID            REFERENCES users(id),
  status            job_status      NOT NULL DEFAULT 'REQUESTED',
  scheduled_date    DATE            NOT NULL,
  scheduled_time    VARCHAR(20)     NOT NULL,  -- e.g. '08:00-10:00'
  location_address  VARCHAR(500)    NOT NULL,
  location_lat      DECIMAL(10,8),
  location_lng      DECIMAL(11,8),
  notes             TEXT,
  assigned_at       TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  validated_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,
  assignment_attempts INTEGER       NOT NULL DEFAULT 0,
  -- Optimistic locking for concurrent access
  version           INTEGER         NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_household ON jobs(household_id);
CREATE INDEX idx_jobs_collector ON jobs(collector_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_date, scheduled_time);
CREATE INDEX idx_jobs_status_date ON jobs(status, scheduled_date);
-- Partial index: only active (non-terminal) jobs for assignment queries
CREATE INDEX idx_jobs_active ON jobs(status, scheduled_date)
  WHERE status IN ('REQUESTED', 'ASSIGNED', 'IN_PROGRESS');
-- For duplicate detection
CREATE INDEX idx_jobs_household_date ON jobs(household_id, scheduled_date)
  WHERE status NOT IN ('CANCELLED');
-- GiST index for location-based queries
CREATE INDEX idx_jobs_location ON jobs USING gist (
  ll_to_earth(location_lat, location_lng)
) WHERE location_lat IS NOT NULL;

-- Constraint: prevent household from having multiple active jobs on same date
-- (enforced at application level with more nuance, but DB provides safety net)
CREATE UNIQUE INDEX idx_jobs_no_duplicate
  ON jobs(household_id, scheduled_date)
  WHERE status IN ('REQUESTED', 'ASSIGNED', 'IN_PROGRESS');

-- ============================================================
-- TABLE: proofs
-- ============================================================

CREATE TABLE proofs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID            NOT NULL UNIQUE REFERENCES jobs(id),
  image_url       VARCHAR(500)    NOT NULL,
  thumbnail_url   VARCHAR(500),
  collector_lat   DECIMAL(10,8),   -- GPS at time of completion
  collector_lng   DECIMAL(11,8),
  uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proofs_job ON proofs(job_id);

-- ============================================================
-- TABLE: ratings
-- ============================================================

CREATE TABLE ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID            NOT NULL UNIQUE REFERENCES jobs(id),
  household_id    UUID            NOT NULL REFERENCES users(id),
  collector_id    UUID            NOT NULL REFERENCES users(id),
  value           SMALLINT        NOT NULL CHECK (value >= 1 AND value <= 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_collector ON ratings(collector_id);
CREATE INDEX idx_ratings_job ON ratings(job_id);

-- ============================================================
-- TABLE: earnings
-- ============================================================

CREATE TABLE earnings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            UUID            NOT NULL UNIQUE REFERENCES jobs(id),
  collector_id      UUID            NOT NULL REFERENCES users(id),
  base_amount       DECIMAL(10,2)   NOT NULL,
  distance_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0,
  surge_multiplier  DECIMAL(3,2)    NOT NULL DEFAULT 1.00,
  total_amount      DECIMAL(10,2)   NOT NULL,
  status            earning_status  NOT NULL DEFAULT 'PENDING',
  confirmed_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_earnings_collector ON earnings(collector_id);
CREATE INDEX idx_earnings_status ON earnings(status);
CREATE INDEX idx_earnings_collector_status ON earnings(collector_id, status);

-- ============================================================
-- TABLE: disputes
-- ============================================================

CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID            NOT NULL UNIQUE REFERENCES jobs(id),
  household_id    UUID            NOT NULL REFERENCES users(id),
  reason          TEXT            NOT NULL,
  status          dispute_status  NOT NULL DEFAULT 'OPEN',
  admin_notes     TEXT,
  resolved_by     UUID            REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_job ON disputes(job_id);

-- ============================================================
-- TABLE: fraud_flags
-- ============================================================

CREATE TABLE fraud_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID            NOT NULL REFERENCES jobs(id),
  collector_id    UUID            REFERENCES users(id),
  type            fraud_type      NOT NULL,
  severity        fraud_severity  NOT NULL,
  details         JSONB           NOT NULL DEFAULT '{}',
  status          fraud_flag_status NOT NULL DEFAULT 'OPEN',
  reviewed_by     UUID            REFERENCES users(id),
  review_notes    TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX idx_fraud_flags_collector ON fraud_flags(collector_id);
CREATE INDEX idx_fraud_flags_severity ON fraud_flags(severity) WHERE status = 'OPEN';

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID            NOT NULL REFERENCES users(id),
  type            VARCHAR(50)     NOT NULL,    -- event type string
  title           VARCHAR(200)    NOT NULL,
  body            TEXT            NOT NULL,
  data            JSONB           DEFAULT '{}', -- payload (jobId, etc.)
  channel         notification_channel NOT NULL,
  status          notification_status  NOT NULL DEFAULT 'PENDING',
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_status ON notifications(status)
  WHERE status = 'PENDING';

-- ============================================================
-- TABLE: collector_availability
-- ============================================================

CREATE TABLE collector_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collector_id    UUID            NOT NULL REFERENCES users(id),
  day_of_week     day_of_week     NOT NULL,
  start_time      TIME            NOT NULL,
  end_time        TIME            NOT NULL,
  is_active       BOOLEAN         NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_time_range CHECK (end_time > start_time),
  CONSTRAINT uq_collector_day_slot UNIQUE (collector_id, day_of_week, start_time)
);

CREATE INDEX idx_availability_collector ON collector_availability(collector_id);
CREATE INDEX idx_availability_day ON collector_availability(day_of_week, start_time, end_time)
  WHERE is_active = true;

-- ============================================================
-- TABLE: location_updates  (ephemeral — only latest per job)
-- ============================================================

CREATE TABLE location_updates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID            NOT NULL UNIQUE REFERENCES jobs(id),
  collector_id    UUID            NOT NULL REFERENCES users(id),
  latitude        DECIMAL(10,8)   NOT NULL,
  longitude       DECIMAL(11,8)   NOT NULL,
  accuracy        DECIMAL(6,2),
  speed           DECIMAL(6,2),
  heading         DECIMAL(6,2),
  network_type    VARCHAR(10),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: system_config
-- ============================================================

CREATE TABLE system_config (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key             VARCHAR(100)    NOT NULL UNIQUE,
  value           VARCHAR(500)    NOT NULL,
  data_type       VARCHAR(20)     NOT NULL DEFAULT 'string', -- string, number, boolean, json
  category        VARCHAR(50)     NOT NULL,                   -- earnings, assignment, proof, etc.
  description     TEXT,
  is_feature_flag BOOLEAN         NOT NULL DEFAULT false,
  updated_by      UUID            REFERENCES users(id),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_key ON system_config(key);
CREATE INDEX idx_config_category ON system_config(category);
CREATE INDEX idx_config_feature_flags ON system_config(key) WHERE is_feature_flag = true;

-- ============================================================
-- TABLE: idempotency_cache
-- ============================================================

CREATE TABLE idempotency_cache (
  key             VARCHAR(36)     PRIMARY KEY,
  status_code     INTEGER         NOT NULL,
  response_body   JSONB           NOT NULL,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ     NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_cache(expires_at);

-- ============================================================
-- SEED: system_config defaults
-- ============================================================

INSERT INTO system_config (key, value, data_type, category, description, is_feature_flag) VALUES
  -- Earnings
  ('earnings.base_rate', '500', 'number', 'earnings', 'Base earnings per job in XAF', false),
  ('earnings.per_km_rate', '100', 'number', 'earnings', 'Additional earnings per km in XAF', false),
  ('earnings.surge_enabled', 'false', 'boolean', 'earnings', 'Enable surge pricing', true),
  ('earnings.surge_multiplier', '1.25', 'number', 'earnings', 'Surge multiplier when active', false),
  ('earnings.surge_threshold', '0.8', 'number', 'earnings', 'Utilization threshold to trigger surge', false),
  -- Assignment
  ('assignment.max_radius_km', '10', 'number', 'assignment', 'Max distance to search for collectors', false),
  ('assignment.max_concurrent_jobs', '5', 'number', 'assignment', 'Max active jobs per collector', false),
  ('assignment.max_daily_jobs', '15', 'number', 'assignment', 'Max jobs per collector per day', false),
  ('assignment.accept_timeout_minutes', '10', 'number', 'assignment', 'Minutes before reassigning', false),
  ('assignment.max_reassign_attempts', '3', 'number', 'assignment', 'Max auto-assign attempts', false),
  ('assignment.weight_distance', '0.40', 'number', 'assignment', 'Weight for distance in scoring', false),
  ('assignment.weight_workload', '0.30', 'number', 'assignment', 'Weight for workload in scoring', false),
  ('assignment.weight_rating', '0.15', 'number', 'assignment', 'Weight for rating in scoring', false),
  ('assignment.weight_recency', '0.15', 'number', 'assignment', 'Weight for recency in scoring', false),
  -- Proof
  ('proof.auto_validate_hours', '24', 'number', 'proof', 'Hours before auto-validating proof', false),
  -- Feature Flags
  ('feature.collector_self_registration', 'true', 'boolean', 'feature', 'Allow collectors to self-register', true),
  ('feature.auto_assignment', 'true', 'boolean', 'feature', 'Enable automatic job assignment', true),
  ('feature.fraud_detection', 'true', 'boolean', 'feature', 'Enable fraud detection checks', true),
  ('feature.sms_notifications', 'false', 'boolean', 'feature', 'Enable SMS fallback notifications', true),
  ('feature.surge_pricing', 'false', 'boolean', 'feature', 'Enable surge pricing', true),
  ('feature.location_tracking', 'true', 'boolean', 'feature', 'Enable real-time location tracking', true),
  ('feature.offline_queue', 'true', 'boolean', 'feature', 'Enable offline action queue', true);

-- ============================================================
-- FUNCTIONS: updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collector_availability_updated_at
  BEFORE UPDATE ON collector_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 Index Strategy Summary

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| users | `idx_users_location` | GiST (earthdistance) | Find nearest collectors |
| users | `idx_users_active_role` | B-tree composite | Filter active collectors |
| jobs | `idx_jobs_active` | Partial B-tree | Query only non-terminal jobs |
| jobs | `idx_jobs_no_duplicate` | Unique partial | Prevent duplicate active jobs per household per date |
| jobs | `idx_jobs_location` | GiST (earthdistance) | Distance-based queries |
| notifications | `idx_notifications_user_unread` | Partial B-tree | Fast unread count |
| fraud_flags | `idx_fraud_flags_severity` | Partial B-tree | Open high-severity flags |
| collector_availability | `idx_availability_day` | Partial B-tree | Find available collectors by day/time |
| idempotency_cache | `idx_idempotency_expires` | B-tree | Cleanup expired entries |

---

## 3. API Layer Structure

### 3.1 API Versioning

All endpoints are prefixed with `/api/v1`. Implemented in `main.ts`:

```typescript
// main.ts
app.setGlobalPrefix('api/v1');
```

Future versions (v2) will be handled via:
- New controller routes (`/api/v2/jobs`)
- Or header-based versioning (`Accept: application/vnd.waste.v2+json`)

### 3.2 Controller → Service → Repository Pattern

```
HTTP Request
  → [Guard: JWT Auth]
  → [Guard: Roles]
  → [Guard: Throttle]
  → [Interceptor: Correlation ID]
  → [Interceptor: Idempotency]
  → [Pipe: Validation (class-validator)]
  → Controller (parse params, call service)
      → Service (business logic, DB queries via TypeORM repos)
          → Repository (TypeORM — auto-injected)
          → EventEmitter (emit domain events)
      ← Return entity or DTO
  ← [Interceptor: Serialization (class-transformer)]
  ← [Interceptor: Logging]
  ← HTTP Response
```

### 3.3 Complete Endpoint Specification

#### Auth Controller — `/api/v1/auth`

```
POST /auth/register
  Access:   Public
  Body:     RegisterDto { name, phone, email?, password, role: 'HOUSEHOLD'|'COLLECTOR' }
  Response: 201 → AuthResponseDto { user: UserResponseDto, accessToken, refreshToken }
  Errors:   409 (phone exists), 403 (collector registration disabled)

POST /auth/login
  Access:   Public
  Body:     LoginDto { phone, password }
  Response: 200 → AuthResponseDto
  Errors:   401 (invalid credentials), 423 (account locked — rate limit)

POST /auth/refresh
  Access:   Auth (refresh token in body)
  Body:     RefreshTokenDto { refreshToken }
  Response: 200 → { accessToken, refreshToken }
  Errors:   401 (invalid/expired refresh token)

POST /auth/logout
  Access:   Auth
  Response: 200 → { message: 'Logged out' }
```

#### Jobs Controller — `/api/v1/jobs`

```
POST /jobs
  Access:   HOUSEHOLD
  Headers:  X-Idempotency-Key (required)
  Body:     CreateJobDto {
              scheduledDate: string (YYYY-MM-DD),
              scheduledTime: string ('08:00-10:00'),
              locationAddress: string,
              locationLat?: number,
              locationLng?: number,
              notes?: string
            }
  Response: 201 → JobResponseDto
  Errors:   409 (duplicate active job on same date), 429 (rate limited)

GET /jobs/mine
  Access:   HOUSEHOLD
  Query:    status?: JobStatus, page?: number, limit?: number
  Response: 200 → PaginatedResponse<JobResponseDto>

GET /jobs/assigned
  Access:   COLLECTOR
  Query:    status?: JobStatus
  Response: 200 → JobResponseDto[]

GET /jobs/earnings
  Access:   COLLECTOR
  Query:    from?: string, to?: string
  Response: 200 → EarningsSummaryDto {
              totalEarnings: number,
              pendingEarnings: number,
              confirmedEarnings: number,
              jobCount: number,
              earnings: EarningResponseDto[]
            }

GET /jobs/earnings/summary
  Access:   COLLECTOR
  Response: 200 → { today: number, thisWeek: number, thisMonth: number, allTime: number }

GET /jobs/updates
  Access:   Auth
  Query:    since: string (ISO timestamp)
  Response: 200 → JobResponseDto[]  (polling fallback)

GET /jobs/:id
  Access:   Auth (household owner, assigned collector, or admin)
  Response: 200 → JobDetailResponseDto (includes proof, rating, earnings if applicable)
  Errors:   404, 403

POST /jobs/:id/cancel
  Access:   HOUSEHOLD (REQUESTED/ASSIGNED only), ADMIN (any non-terminal)
  Body:     { reason?: string }
  Response: 200 → JobResponseDto
  Errors:   400 (invalid state transition), 403

POST /jobs/:id/accept
  Access:   COLLECTOR
  Response: 200 → JobResponseDto { status: 'ASSIGNED' }
  Errors:   409 (already accepted by another), 400 (not assigned to you), 403

POST /jobs/:id/reject
  Access:   COLLECTOR
  Body:     { reason?: string }
  Response: 200 → { message: 'Job rejected, returning to queue' }
  Errors:   400 (not assigned to you)

POST /jobs/:id/start
  Access:   COLLECTOR (must be assigned to this job)
  Response: 200 → JobResponseDto { status: 'IN_PROGRESS' }
  Errors:   400 (wrong state)

POST /jobs/:id/complete
  Access:   COLLECTOR
  Body:     CompleteJobDto { proofImageUrl: string, collectorLat?: number, collectorLng?: number }
  Headers:  X-Idempotency-Key
  Response: 200 → JobResponseDto { status: 'COMPLETED' }
  Errors:   400 (wrong state, missing proof)

POST /jobs/:id/validate
  Access:   HOUSEHOLD (job owner)
  Response: 200 → JobResponseDto { status: 'VALIDATED' }
  Errors:   400 (job not COMPLETED)

POST /jobs/:id/dispute
  Access:   HOUSEHOLD (job owner)
  Body:     CreateDisputeDto { reason: string }
  Response: 201 → DisputeResponseDto
  Errors:   400 (job not COMPLETED), 409 (dispute already exists)

POST /jobs/:id/rate
  Access:   HOUSEHOLD (job owner, only after VALIDATED)
  Body:     CreateRatingDto { value: 1-5, comment?: string }
  Headers:  X-Idempotency-Key
  Response: 201 → RatingResponseDto
  Errors:   400 (job not VALIDATED), 409 (already rated)
```

#### Notifications Controller — `/api/v1/notifications`

```
GET /notifications
  Access:   Auth
  Query:    page?, limit?, unreadOnly?: boolean
  Response: 200 → PaginatedResponse<NotificationResponseDto>

PATCH /notifications/:id/read
  Access:   Auth (owner)
  Response: 200 → NotificationResponseDto { readAt: timestamp }

PATCH /notifications/read-all
  Access:   Auth
  Response: 200 → { count: number }
```

#### Timeslots Controller — `/api/v1/timeslots`

```
GET /timeslots/mine
  Access:   COLLECTOR
  Response: 200 → CollectorAvailabilityDto[]

PUT /timeslots/mine
  Access:   COLLECTOR
  Body:     SetAvailabilityDto {
              slots: Array<{ dayOfWeek, startTime, endTime }>
            }
  Response: 200 → CollectorAvailabilityDto[]

GET /timeslots/collectors/:id
  Access:   ADMIN
  Response: 200 → CollectorAvailabilityDto[]
```

#### Admin Controller — `/api/v1/admin`

```
GET /admin/users
  Access:   ADMIN
  Query:    role?, isActive?, search?, page?, limit?
  Response: 200 → PaginatedResponse<UserResponseDto>

GET /admin/users/:id
  Access:   ADMIN
  Response: 200 → UserDetailResponseDto (includes stats)

PATCH /admin/users/:id
  Access:   ADMIN
  Body:     { isActive?: boolean }
  Response: 200 → UserResponseDto

GET /admin/jobs
  Access:   ADMIN
  Query:    status?, collectorId?, householdId?, from?, to?, page?, limit?
  Response: 200 → PaginatedResponse<JobResponseDto>

POST /admin/jobs/:id/assign
  Access:   ADMIN
  Body:     ManualAssignDto { collectorId: UUID }
  Response: 200 → JobResponseDto
  Errors:   400 (collector at capacity), 409 (already assigned)

GET /admin/stats
  Access:   ADMIN
  Query:    from?, to?
  Response: 200 → AdminStatsDto {
              totalJobs, completedJobs, cancelledJobs,
              totalUsers, totalCollectors, totalHouseholds,
              avgCompletionTimeMinutes, avgRating,
              jobsByStatus: Record<JobStatus, number>,
              earningsTotal, earningsPending
            }

GET /admin/collectors/performance
  Access:   ADMIN
  Query:    limit? (default 10)
  Response: 200 → CollectorPerformanceDto[] {
              id, name, avgRating, completedJobs,
              totalEarnings, avgCompletionTime
            }

GET /admin/fraud-flags
  Access:   ADMIN
  Query:    status?, severity?, page?, limit?
  Response: 200 → PaginatedResponse<FraudFlagResponseDto>

PATCH /admin/fraud-flags/:id
  Access:   ADMIN
  Body:     ReviewFraudFlagDto { status: 'DISMISSED'|'CONFIRMED', reviewNotes?: string }
  Response: 200 → FraudFlagResponseDto

GET /admin/disputes
  Access:   ADMIN
  Query:    status?, page?, limit?
  Response: 200 → PaginatedResponse<DisputeResponseDto>

PATCH /admin/disputes/:id
  Access:   ADMIN
  Body:     ResolveDisputeDto { status: 'RESOLVED_ACCEPTED'|'RESOLVED_REJECTED', adminNotes?: string }
  Response: 200 → DisputeResponseDto

GET /admin/config
  Access:   ADMIN
  Query:    category?
  Response: 200 → SystemConfigDto[]

PUT /admin/config/:key
  Access:   ADMIN
  Body:     { value: string }
  Response: 200 → SystemConfigDto
```

#### Files Controller — `/api/v1/files`

```
POST /files/upload
  Access:   Auth
  Body:     multipart/form-data { file: File }
  Response: 201 → { url: string, thumbnailUrl: string }
  Errors:   400 (invalid type), 413 (too large)
```

#### Health Controller — `/api/v1/health`

```
GET /health
  Access:   Public
  Response: 200 → { status: 'ok', version: string, uptime: number }

GET /health/detailed
  Access:   ADMIN
  Response: 200 → { database, redis, s3, websocket: { connections }, uptime }
```

### 3.4 DTO Definitions (Key DTOs)

```typescript
// === Auth DTOs ===

class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @IsString() @Matches(/^\+237[0-9]{9}$/)
  phone: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsString() @MinLength(8) @MaxLength(100)
  password: string;

  @IsEnum(UserRole) @IsIn(['HOUSEHOLD', 'COLLECTOR'])
  role: UserRole;
}

class LoginDto {
  @IsString()
  phone: string;

  @IsString()
  password: string;
}

class AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

// === Job DTOs ===

class CreateJobDto {
  @IsDateString()
  scheduledDate: string;

  @IsString() @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  scheduledTime: string;     // 'HH:mm-HH:mm'

  @IsString() @MinLength(5) @MaxLength(500)
  locationAddress: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  locationLat?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  locationLng?: number;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}

class CompleteJobDto {
  @IsString() @IsUrl()
  proofImageUrl: string;

  @IsOptional() @IsNumber()
  collectorLat?: number;

  @IsOptional() @IsNumber()
  collectorLng?: number;
}

class JobResponseDto {
  id: string;
  householdId: string;
  householdName: string;
  collectorId?: string;
  collectorName?: string;
  status: JobStatus;
  scheduledDate: string;
  scheduledTime: string;
  locationAddress: string;
  locationLat?: number;
  locationLng?: number;
  notes?: string;
  proof?: ProofResponseDto;
  rating?: RatingResponseDto;
  earnings?: EarningResponseDto;
  createdAt: string;
  updatedAt: string;
}

// === Pagination ===

class PaginationDto {
  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

class PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

---

## 4. Concurrency Control

### 4.1 Problem: Multiple Collectors Accepting Same Job

When a job is in REQUESTED and assigned to a collector, there's a race window where:
- The auto-assignment sends to collector A
- Admin manually assigns to collector B
- Timeout fires and reassigns to collector C

All three could try to accept simultaneously.

### 4.2 Solution: Two-Layer Locking

#### Layer 1: Database Optimistic Locking (Primary)

The `jobs` table has a `version` column. Every state transition uses optimistic locking:

```typescript
// jobs.service.ts — acceptJob()
async acceptJob(jobId: string, collectorId: string): Promise<Job> {
  return this.dataSource.transaction(async (manager) => {
    // SELECT ... FOR UPDATE — pessimistic lock within transaction
    const job = await manager.findOne(Job, {
      where: { id: jobId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== JobStatus.ASSIGNED)
      throw new BadRequestException('Job is not in ASSIGNED status');
    if (job.collectorId !== collectorId)
      throw new ForbiddenException('Job is not assigned to you');

    // Update with version check
    const result = await manager
      .createQueryBuilder()
      .update(Job)
      .set({
        status: JobStatus.IN_PROGRESS,  // Skip to IN_PROGRESS on accept
        version: () => 'version + 1',
      })
      .where('id = :id AND version = :version', {
        id: jobId,
        version: job.version,
      })
      .execute();

    if (result.affected === 0) {
      throw new ConflictException('Job was modified concurrently. Please retry.');
    }

    return manager.findOne(Job, { where: { id: jobId } });
  });
}
```

#### Layer 2: Redis Distributed Lock (Assignment Protection)

When the assignment service assigns a job, it acquires a Redis lock to prevent concurrent assignment:

```typescript
// assignment.service.ts
async assignJob(jobId: string): Promise<void> {
  const lockKey = `lock:job:assign:${jobId}`;
  const lockTTL = 30; // seconds

  // Acquire lock (using Redlock algorithm)
  const lock = await this.redisLock.acquire(lockKey, lockTTL * 1000);

  try {
    const job = await this.jobsService.findOne(jobId);
    if (job.status !== JobStatus.REQUESTED) return; // Already assigned

    const collector = await this.findBestCollector(job);
    if (!collector) {
      this.eventEmitter.emit('job.assignment.escalated', { jobId });
      return;
    }

    await this.jobsService.assignToCollector(jobId, collector.id);
    this.eventEmitter.emit('job.assigned', { jobId, collectorId: collector.id });
  } finally {
    await lock.release();
  }
}
```

#### Layer 3: Status Transition Validation

Every state change is validated against the allowed transition map:

```typescript
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.REQUESTED]:   [JobStatus.ASSIGNED, JobStatus.CANCELLED],
  [JobStatus.ASSIGNED]:    [JobStatus.IN_PROGRESS, JobStatus.REQUESTED, JobStatus.CANCELLED],
  [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
  [JobStatus.COMPLETED]:   [JobStatus.VALIDATED, JobStatus.DISPUTED],
  [JobStatus.VALIDATED]:   [JobStatus.RATED],
  [JobStatus.DISPUTED]:    [JobStatus.VALIDATED, JobStatus.CANCELLED],
  [JobStatus.RATED]:       [],  // Terminal
  [JobStatus.CANCELLED]:   [],  // Terminal
};

function validateTransition(from: JobStatus, to: JobStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Cannot transition from ${from} to ${to}`
    );
  }
}
```

### 4.3 Concurrency Summary

| Scenario | Protection |
|----------|-----------|
| Two collectors accept same job | DB `SELECT FOR UPDATE` + version check → second one gets 409 |
| Auto-assign + admin assign simultaneously | Redis lock on `lock:job:assign:{jobId}` → serialized |
| Duplicate job creation | `X-Idempotency-Key` + unique partial index on `(household_id, scheduled_date)` |
| Concurrent status updates | Optimistic locking via `version` column → stale update gets 409 |
| Cron auto-validate + household validate | DB transaction + status check → first wins, second no-ops |

---

## 5. Time-Slot Management

### 5.1 Collector Availability Model

Collectors define their availability as **recurring weekly slots**:

```
Collector "John" availability:
  MON: 08:00 - 12:00
  MON: 14:00 - 18:00
  TUE: 08:00 - 17:00
  WED: (unavailable)
  THU: 08:00 - 17:00
  FRI: 08:00 - 14:00
  SAT: 09:00 - 13:00
  SUN: (unavailable)
```

### 5.2 How Availability Affects Assignment

```
Job request: scheduledDate = 2026-04-21 (Monday), scheduledTime = '09:00-11:00'

Assignment algorithm:
  1. Determine day_of_week from scheduledDate → MON
  2. Parse job time window → start: 09:00, end: 11:00
  3. Query collectors whose availability COVERS the job window:
     SELECT DISTINCT ca.collector_id
     FROM collector_availability ca
     JOIN users u ON u.id = ca.collector_id
     WHERE ca.day_of_week = 'MON'
       AND ca.start_time <= '09:00'
       AND ca.end_time >= '11:00'
       AND ca.is_active = true
       AND u.is_active = true
       AND u.role = 'COLLECTOR';
  4. From this filtered set, apply scoring algorithm (distance, workload, etc.)
```

### 5.3 Conflict Handling

| Conflict | Rule |
|----------|------|
| Job window partially overlaps slot | **Excluded** — slot must fully cover job window |
| Collector has no slots defined | **Treated as always available** (flexible/on-demand) — they can still receive assignments |
| Multiple slots on same day | **Allowed** — e.g., morning + afternoon slots with lunch break |
| Job time window crosses midnight | **Not supported** — jobs must be within a single day |
| Collector updates availability after assignment | **No retroactive effect** — already-assigned jobs remain |

### 5.4 Capacity Check During Assignment

```typescript
async getEligibleCollectors(job: Job): Promise<User[]> {
  const dayOfWeek = this.getDayOfWeek(job.scheduledDate); // 'MON'
  const [jobStart, jobEnd] = this.parseTimeWindow(job.scheduledTime); // ['09:00', '11:00']

  return this.dataSource.query(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM jobs j 
       WHERE j.collector_id = u.id 
       AND j.status IN ('ASSIGNED', 'IN_PROGRESS')) as active_job_count,
      (SELECT COUNT(*) FROM jobs j 
       WHERE j.collector_id = u.id 
       AND j.scheduled_date = $1
       AND j.status NOT IN ('CANCELLED')) as daily_job_count,
      earth_distance(
        ll_to_earth(u.latitude, u.longitude),
        ll_to_earth($2, $3)
      ) / 1000 as distance_km
    FROM users u
    WHERE u.role = 'COLLECTOR'
      AND u.is_active = true
      AND (
        -- Has availability slot covering the job window
        EXISTS (
          SELECT 1 FROM collector_availability ca
          WHERE ca.collector_id = u.id
            AND ca.day_of_week = $4
            AND ca.start_time <= $5
            AND ca.end_time >= $6
            AND ca.is_active = true
        )
        OR
        -- Has no availability defined (flexible)
        NOT EXISTS (
          SELECT 1 FROM collector_availability ca
          WHERE ca.collector_id = u.id AND ca.is_active = true
        )
      )
      -- Within max radius
      AND (
        u.latitude IS NULL  -- no location = include (manual assignment fallback)
        OR earth_distance(
          ll_to_earth(u.latitude, u.longitude),
          ll_to_earth($2, $3)
        ) / 1000 <= $7
      )
    HAVING active_job_count < $8
      AND daily_job_count < $9
  `, [
    job.scheduledDate,
    job.locationLat, job.locationLng,
    dayOfWeek,
    jobStart, jobEnd,
    maxRadiusKm,
    maxConcurrentJobs,
    maxDailyJobs,
  ]);
}
```

### 5.5 Household Time Window Options

Predefined time slots offered to households (configurable via SystemConfig):

```
Morning:    08:00 - 10:00
Mid-Morning: 10:00 - 12:00
Afternoon:  14:00 - 16:00
Late:       16:00 - 18:00
```

Custom time windows are not allowed — this simplifies scheduling and matching.

---

## 6. Feature Flag Strategy

### 6.1 Design

Feature flags are stored in the `system_config` table with `is_feature_flag = true`. They are:

- **Cached in Redis** with 60-second TTL (avoid DB reads on every request)
- **Hot-reloadable** — admin changes take effect within 60 seconds
- **Type-safe** — accessed via a `FeatureFlagService`

### 6.2 Feature Flag Registry

| Flag Key | Default | Description | Impact |
|----------|---------|-------------|--------|
| `feature.collector_self_registration` | `true` | Allow collectors to register via mobile app | Auth module |
| `feature.auto_assignment` | `true` | Enable automatic collector assignment | Assignment module |
| `feature.fraud_detection` | `true` | Enable fraud detection checks | Fraud module |
| `feature.sms_notifications` | `false` | Enable SMS fallback for notifications | Notifications module |
| `feature.surge_pricing` | `false` | Enable surge pricing for earnings | Earnings module |
| `feature.location_tracking` | `true` | Enable real-time GPS tracking | WebSocket + Jobs |
| `feature.offline_queue` | `true` | Enable offline queue support (server-side idempotency) | Idempotency interceptor |
| `feature.proof_auto_validate` | `true` | Auto-validate proof after timeout | Scheduler |
| `feature.manual_gps_input` | `true` | Allow manual address when GPS unavailable | Jobs module |
| `feature.collector_earnings_visible` | `true` | Show earnings to collectors | Jobs/Earnings modules |
| `feature.dispute_flow` | `true` | Enable dispute workflow | Disputes module |

### 6.3 Service Implementation

```typescript
@Injectable()
export class FeatureFlagService {
  private cache: Map<string, { value: boolean; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 60_000; // 60 seconds

  constructor(
    @InjectRepository(SystemConfig)
    private configRepo: Repository<SystemConfig>,
    private redis: Redis,
  ) {}

  async isEnabled(key: string): Promise<boolean> {
    // 1. Check in-memory cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    // 2. Check Redis cache
    const redisVal = await this.redis.get(`ff:${key}`);
    if (redisVal !== null) {
      const value = redisVal === 'true';
      this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL });
      return value;
    }

    // 3. Query DB
    const config = await this.configRepo.findOne({
      where: { key, isFeatureFlag: true },
    });
    const value = config?.value === 'true';

    // Populate caches
    await this.redis.setex(`ff:${key}`, 60, String(value));
    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL });

    return value;
  }

  async setFlag(key: string, value: boolean, adminId: string): Promise<void> {
    await this.configRepo.update(
      { key },
      { value: String(value), updatedBy: adminId, updatedAt: new Date() },
    );
    await this.redis.setex(`ff:${key}`, 60, String(value));
    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL });

    this.eventEmitter.emit('config.updated', { key, value, updatedBy: adminId });
  }
}
```

### 6.4 Usage Pattern

```typescript
// In a service
@Injectable()
export class AuthService {
  constructor(private featureFlags: FeatureFlagService) {}

  async registerCollector(dto: RegisterDto): Promise<AuthResponse> {
    if (!(await this.featureFlags.isEnabled('feature.collector_self_registration'))) {
      throw new ForbiddenException('Collector self-registration is currently disabled');
    }
    // ... proceed with registration
  }
}
```

### 6.5 Admin UI Integration

The admin dashboard has a **Feature Flags** tab under Settings:
- Lists all flags with toggle switches
- Changes are immediate (within 60s cache TTL)
- Each toggle emits `CONFIG_UPDATED` event → logged for audit

---

## 7. Backup & Recovery

### 7.1 Backup Strategy

| Backup Type | Frequency | Retention | Method |
|------------|-----------|-----------|--------|
| **Full DB dump** | Daily at 02:00 UTC | 30 days | `pg_dump` → compressed → S3 |
| **Incremental (WAL)** | Continuous | 7 days | PostgreSQL WAL archiving → S3 |
| **Point-in-Time Recovery** | Continuous | 7 days | WAL replay to any second |
| **S3 images** | N/A | Inherent durability | S3 11-nines durability; cross-region replication for prod |
| **Redis** | Every 15 min (RDB) | 24 hours | Redis RDB snapshots → S3 |
| **System config export** | Daily | 30 days | JSON dump → S3 |

### 7.2 Automated Backup Script

```bash
#!/bin/bash
# backup.sh — runs daily via cron at 02:00 UTC

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="waste_management"
S3_BUCKET="waste-backups"
BACKUP_DIR="/tmp/backups"

mkdir -p $BACKUP_DIR

# 1. Full database dump (compressed)
pg_dump -Fc -Z 9 \
  -h $DATABASE_HOST \
  -U $DATABASE_USER \
  -d $DB_NAME \
  -f "$BACKUP_DIR/db_${TIMESTAMP}.dump"

# 2. Upload to S3
aws s3 cp "$BACKUP_DIR/db_${TIMESTAMP}.dump" \
  "s3://${S3_BUCKET}/daily/db_${TIMESTAMP}.dump" \
  --storage-class STANDARD_IA

# 3. Export system config as JSON
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DB_NAME \
  -c "COPY (SELECT key, value, category, is_feature_flag FROM system_config ORDER BY key) 
      TO STDOUT WITH CSV HEADER" \
  > "$BACKUP_DIR/config_${TIMESTAMP}.csv"

aws s3 cp "$BACKUP_DIR/config_${TIMESTAMP}.csv" \
  "s3://${S3_BUCKET}/config/config_${TIMESTAMP}.csv"

# 4. Cleanup local temp files
rm -f "$BACKUP_DIR/db_${TIMESTAMP}.dump"
rm -f "$BACKUP_DIR/config_${TIMESTAMP}.csv"

# 5. Cleanup old S3 backups (>30 days) — handled by S3 lifecycle policy
echo "Backup completed: ${TIMESTAMP}"
```

### 7.3 WAL Archiving (Continuous)

```
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://waste-backups/wal/%f'
archive_timeout = 300   # archive every 5 minutes at minimum
```

### 7.4 Restore Procedures

#### Scenario A: Restore from Full Dump (Complete DB loss)

```bash
# 1. Create fresh database
createdb -h $HOST -U $USER waste_management

# 2. Download latest dump from S3
aws s3 cp s3://waste-backups/daily/db_LATEST.dump /tmp/restore.dump

# 3. Restore
pg_restore -h $HOST -U $USER -d waste_management \
  --clean --if-exists /tmp/restore.dump

# 4. Verify
psql -h $HOST -U $USER -d waste_management \
  -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM jobs;"

# 5. Restart API servers
docker-compose restart api
```

**RTO (Recovery Time Objective):** ~15 minutes
**RPO (Recovery Point Objective):** ~24 hours (last daily backup)

#### Scenario B: Point-in-Time Recovery (Data corruption)

```bash
# 1. Stop the API
docker-compose stop api

# 2. Stop PostgreSQL
pg_ctl stop -D /var/lib/postgresql/data

# 3. Restore base backup
pg_basebackup from S3 → /var/lib/postgresql/data

# 4. Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://waste-backups/wal/%f %p'
recovery_target_time = '2026-04-19 12:00:00 UTC'
recovery_target_action = 'promote'
EOF

# 5. Start PostgreSQL (will replay WAL to target time)
pg_ctl start -D /var/lib/postgresql/data

# 6. Verify data, then restart API
docker-compose start api
```

**RTO:** ~30 minutes
**RPO:** ~5 minutes (WAL archive interval)

#### Scenario C: Accidental Data Deletion (Single Table)

```bash
# 1. Restore dump to a temporary database
createdb waste_management_temp
pg_restore -h $HOST -U $USER -d waste_management_temp /tmp/restore.dump

# 2. Copy only the affected data
pg_dump -h $HOST -U $USER -t affected_table waste_management_temp | \
  psql -h $HOST -U $USER -d waste_management

# 3. Drop temp database
dropdb waste_management_temp
```

### 7.5 Backup Monitoring

| Check | Frequency | Alert |
|-------|-----------|-------|
| Daily backup completed | Daily | Critical if missing by 04:00 UTC |
| WAL archiving active | Every 5 min | Critical if gap > 15 min |
| S3 bucket accessible | Hourly | Critical |
| Backup size reasonable | Daily | Warning if < 50% of previous |
| Restore test | Monthly | Manual — verify restore works |

### 7.6 Disaster Recovery Matrix

| Scenario | RPO | RTO | Procedure |
|----------|-----|-----|-----------|
| Single server failure | 0 (if replica) | 5 min (failover) | Promote read replica |
| Database corruption | 5 min | 30 min | Point-in-time recovery |
| Complete data center loss | 24h | 2 hours | Restore from S3 in new region |
| Accidental deletion | 24h | 15 min | Restore specific tables |
| Ransomware/compromise | 24h | 4 hours | Fresh infra + restore from immutable S3 backups |

---

## 8. Complete Architecture Summary

### 8.1 Backend Module Count

| Category | Modules |
|----------|---------|
| Core business | Jobs, Assignment, Ratings, Earnings, Disputes |
| Infrastructure | Auth, Users, Files, Health, Database, Config |
| Cross-cutting | Notifications, Fraud, Events, Scheduler, WebSocket |
| Management | Admin, Timeslots |
| **Total** | **17 modules** |

### 8.2 Database Tables

| Table | Rows (estimated 1yr) | Key Indexes |
|-------|---------------------|-------------|
| users | ~10,000 | location GiST, role, active |
| jobs | ~100,000 | status, date, household, collector, location GiST, duplicate prevention |
| proofs | ~80,000 | job_id unique |
| ratings | ~60,000 | collector_id, job_id unique |
| earnings | ~80,000 | collector+status |
| disputes | ~2,000 | status, job_id unique |
| fraud_flags | ~5,000 | status, severity, collector |
| notifications | ~500,000 | user+unread, pending status |
| collector_availability | ~5,000 | collector, day+time |
| location_updates | ~500 (ephemeral) | job_id unique |
| system_config | ~30 | key unique |
| idempotency_cache | ~10,000 (rotating) | expires_at |
| **Total tables** | **12** | |

### 8.3 API Endpoints

| Category | Count |
|----------|-------|
| Auth | 4 |
| Jobs (Household) | 7 |
| Jobs (Collector) | 7 |
| Notifications | 3 |
| Timeslots | 3 |
| Admin | 12 |
| Files | 1 |
| Health | 2 |
| **Total REST** | **39** |
| **WebSocket** | **1 namespace, 5 channels** |

---

## 9. Scaling & Future-Proofing (Design Review Notes)

These items are **not blockers for Phase 3 implementation** — they are documented architectural decisions with planned upgrade paths. Each has a defined trigger point for when to implement.

### 9.1 WebSocket Horizontal Scaling

**Current design:** Single Socket.IO instance — works fine for MVP traffic.

**Problem at scale:** When running 2+ API replicas behind a load balancer, a client connected to Server A won't receive events emitted by Server B.

**Upgrade path:**
```typescript
// When: > 1 API replica in production
// Install: @socket.io/redis-adapter

import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Trigger:** When deploying >1 API replica (Phase 5 or production scale-up).

**Current mitigation:** Single replica + polling fallback ensures no missed events in MVP.

### 9.2 Assignment Query Performance at Scale

**Current design:** SQL query with GiST index + earthdistance — efficient for ~10K collectors.

**Problem at scale:** With 50K+ collectors and high-frequency assignments, the geo-filter + capacity check becomes expensive.

**Upgrade path (progressive):**

| Scale | Strategy |
|-------|----------|
| <10K collectors | Current SQL + GiST (sufficient) |
| 10K–50K | Add materialized view of active collectors, refresh every 5 min |
| 50K+ | Redis GEO index (`GEOADD`, `GEORADIUS`) for pre-filtering, then DB for scoring |
| 100K+ | Geo-bucketing (partition by city district/quadrant), query only local bucket |

**Trigger:** When assignment query latency exceeds 500ms (monitored via `job_assignment_duration_seconds` metric).

**Current mitigation:** Partial index `idx_jobs_active` + GiST index keeps queries fast at MVP scale.

### 9.3 Persistent Notification Queue

**Current design:** In-process event emission → NotificationService sends immediately. Retries via scheduled task.

**Problem:** If the API process crashes mid-notification, the retry context is lost.

**Upgrade path:**
```
Phase 3 (MVP):     EventEmitter2 (in-process) — simple, no infra overhead
Phase 5 (Scale):   BullMQ + Redis — persistent job queue with retries
Future:            RabbitMQ — if multi-service architecture needed
```

BullMQ integration:
```typescript
// When: notification failure rate > 2% or > 1000 notifications/hour
import { Queue, Worker } from 'bullmq';

const notificationQueue = new Queue('notifications', { connection: redis });

// Producer (in event listener)
await notificationQueue.add('send', { userId, type, data }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});

// Worker (separate process or same)
const worker = new Worker('notifications', async (job) => {
  await notificationService.send(job.data);
}, { connection: redis });
```

**Trigger:** When notification volume exceeds 1000/hour or failure rate > 2%.

**Current mitigation:** Scheduler cron retries failed notifications every 5 minutes. Acceptable for MVP.

### 9.4 Mobile Offline Sync UX States

**Current design:** Optimistic UI with rollback on server rejection.

**Implementation detail for Phase 3 — Flutter sync states:**

```dart
enum SyncStatus {
  synced,       // ✅ Server confirmed
  pending,      // 🔄 In offline queue, waiting to sync
  syncing,      // ⏳ Currently sending to server
  failed,       // ❌ Server rejected — show error + retry button
  conflict,     // ⚠️ Server state differs — show resolution UI
}
```

**UI treatment:**

| State | Visual | User Action |
|-------|--------|-------------|
| `synced` | Normal appearance | None needed |
| `pending` | Subtle "offline" badge + muted color | "Will sync when online" tooltip |
| `syncing` | Spinning indicator on item | None — automatic |
| `failed` | Red badge + error message | "Retry" button or "Discard" |
| `conflict` | Yellow badge + explanation | "This job was already taken" → dismiss |

**Implementation:** Each `JobModel` in local state carries a `syncStatus` field. The `OfflineQueueService` updates this as items progress through the queue.

### 9.5 Admin Workload Management

**Current design:** All disputes, fraud flags, and escalations go to admin dashboard as flat lists.

**Problem at scale:** With 100+ daily disputes, admin gets overwhelmed.

**Phase 3 (MVP) mitigations built into the design:**

1. **Priority sorting** — fraud flags already have severity (LOW/MEDIUM/HIGH). Admin dashboard sorts by severity DESC, then created_at ASC.

2. **Auto-resolution rules** (implement in Phase 3):
```typescript
// In fraud.service.ts — auto-dismiss LOW severity flags older than 7 days
@Cron('0 */6 * * *') // every 6 hours
async autoResolveLowSeverityFlags() {
  await this.fraudFlagRepo
    .createQueryBuilder()
    .update(FraudFlag)
    .set({ status: FraudFlagStatus.DISMISSED, reviewNotes: 'Auto-dismissed: LOW severity, >7 days' })
    .where('severity = :severity AND status = :status AND created_at < :cutoff', {
      severity: FraudSeverity.LOW,
      status: FraudFlagStatus.OPEN,
      cutoff: subDays(new Date(), 7),
    })
    .execute();
}
```

3. **Dashboard counters** — admin home shows:
   - 🔴 HIGH fraud flags (requires immediate action)
   - 🟡 Open disputes (requires review)
   - 🔵 Escalated assignments (needs manual assign)
   - Each with count badge for quick triage

**Future upgrade (Phase 5):**
- Admin roles: SUPER_ADMIN, SUPPORT_AGENT (delegate dispute resolution)
- Auto-resolution for disputes: if household doesn't respond to dispute review within 48h → auto-accept collector's proof
- ML-based fraud scoring to reduce false positives

---

## 10. Phase 3 Implementation Order

The following build order respects dependency flow — each step can be tested independently:

```
Step 1: Project scaffolding + Docker + Database
  → docker-compose.yml, Dockerfiles, TypeORM config, migrations

Step 2: Common module (guards, interceptors, pipes, enums, DTOs)
  → Shared infrastructure used by all modules

Step 3: Auth module
  → Register, login, JWT, refresh tokens
  → Test: can register + login + get protected resource

Step 4: Users module
  → CRUD, admin user management
  → Test: admin can list/deactivate users

Step 5: Jobs module (core)
  → Create, list, status transitions, state machine validation
  → Test: household creates job, full lifecycle

Step 6: Assignment module
  → Scoring algorithm, auto-assign, timeout, escalation
  → Test: job auto-assigns to nearest available collector

Step 7: Timeslots module
  → Collector availability CRUD, integration with assignment
  → Test: assignment respects availability windows

Step 8: Ratings + Earnings modules
  → Rate completed jobs, calculate earnings
  → Test: full job → rate → earnings flow

Step 9: Proofs + Disputes modules
  → Upload proof, validate, dispute, auto-validate cron
  → Test: proof upload, household validates, dispute flow

Step 10: Fraud module
  → Detection rules, flagging, admin review
  → Test: fast completion triggers flag

Step 11: Notifications module
  → Event listeners, FCM/SMS stubs, in-app notifications
  → Test: job events generate notifications

Step 12: WebSocket + Location tracking
  → Gateway, channels, location updates
  → Test: household receives real-time status

Step 13: Admin module
  → Stats, config, manual assignment, fraud review, disputes
  → Test: admin dashboard endpoints

Step 14: Files module
  → Upload, compression, S3 (local dev)
  → Test: upload image, get URL

Step 15: Scheduler + Health
  → Cron tasks, health endpoints
  → Test: auto-validate proof after timeout

--- Frontend starts here ---

Step 16: Admin Dashboard (React)
  → Auth, layout, all pages connected to API

Step 17: Flutter App — Auth + Household flows
  → Register, login, create job, track, rate

Step 18: Flutter App — Collector flows
  → Job list, accept, navigate, complete, earnings

Step 19: Flutter App — Offline queue + real-time
  → SQLite queue, WebSocket, location tracking

Step 20: Integration testing + E2E
  → Full flow tests across all components
```
