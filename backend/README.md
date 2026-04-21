# Waste Management API

Backend API for the Waste Management platform.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional but recommended)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update the values in `.env` with your actual configuration.

### 3. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run database migrations
npm run migration:run
```

#### Option B: Manual Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE waste_management;
CREATE USER waste_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE waste_management TO waste_user;
```

2. Update `.env` with your database credentials.

3. Run migrations:
```bash
npm run migration:run
```

## Development

```bash
# Start development server
npm run start:dev

# Run in debug mode
npm run start:debug
```

API will be available at `http://localhost:3001`

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:cov
```

### Integration Tests

Integration tests use a separate test database to avoid polluting development/production data.

#### Setup Test Database

Create the test database in PostgreSQL:

```sql
CREATE DATABASE waste_management_test;
```

The test database configuration is in `.env.test`:
- Database name: `waste_management_test`
- Same credentials as development database

#### Run Integration Tests

```bash
npm run test:integration
```

The integration tests will:
1. Load environment variables from `.env.test`
2. Verify the test database is being used (logs database name)
3. Run all integration tests against the test database
4. Clean up test data after each test run

**Note:** You will see console output confirming which database is being used:
```
[Integration Tests] Running in NODE_ENV: test
[Integration Tests] Database: waste_management_test
[Integration Tests] Connected to database: waste_management_test
```

If you see a warning about not using a test database, check that:
1. `.env.test` exists with `DATABASE_NAME=waste_management_test`
2. The `waste_management_test` database has been created in PostgreSQL

### E2E Tests

```bash
npm run test:e2e
```

## API Documentation

Swagger documentation is available at `http://localhost:3001/docs` when running in development mode.

## Project Structure

```
src/
├── common/          # Shared utilities, guards, decorators
├── config/          # Configuration module
├── database/        # Database configuration and migrations
├── redis/           # Redis module
├── auth/            # Authentication & authorization
├── users/           # User management
├── jobs/            # Job management
├── assignment/      # Job assignment logic
├── ratings/         # Job ratings
├── files/           # File uploads
├── earnings/        # Earnings tracking
├── notifications/   # Notification system
├── fraud/           # Fraud detection
├── disputes/        # Dispute resolution
└── websocket/       # WebSocket gateway
```

## Database Migrations

```bash
# Generate a new migration
npm run migration:generate -- --name MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Build

```bash
# Build for production
npm run build

# Run production build
npm run start:prod
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `NODE_ENV`: Environment (development/test/production)
- `DATABASE_NAME`: Database name (use `waste_management_test` for integration tests)
- `JWT_SECRET`: Secret for JWT token signing
- `REDIS_HOST/PORT`: Redis connection details
- `CORS_ORIGINS`: Allowed CORS origins
