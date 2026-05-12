# Database Setup Instructions

## Prerequisites
- PostgreSQL must be installed and running on localhost:5432
- You need postgres user access or equivalent privileges
DROP DATABASE IF EXISTS my_database WITH (FORCE);
## Manual Database Setup

### Option 1: Using pgAdmin or similar GUI tool
1. Connect to PostgreSQL as postgres user
2. Create a new database named `waste_management`
3. Create a new user/role named `waste_user` with password `waste_dev_pass`
4. Grant all privileges on `waste_management` database to `waste_user`

### Option 2: Using SQL commands
Connect to PostgreSQL as postgres user and run:

```sql
-- Create database
CREATE DATABASE waste_management;

-- Create user
CREATE USER waste_user WITH PASSWORD 'waste_dev_pass';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE waste_management TO waste_user;
```

### Option 3: Using psql command line
```bash
# Connect as postgres
psql -U postgres -d postgres

# Then run the SQL commands from Option 2
```

## After Database Setup

Once the database is created, run the migrations:

```bash
cd backend
npm run migration:run
```

This will apply all migrations including:
- Initial schema (users, jobs, etc.)
- Subscriptions and pricing
- Wallet and payouts
- Complete DDL enhancements (indexes, triggers, extensions)

## Verify Setup

To verify everything is working, you can:

1. Check that all tables were created:
```sql
\dt waste_management.*
```

2. Check that migrations were applied:
```sql
SELECT * FROM migrations ORDER BY timestamp;
```

## Troubleshooting

### Error: "database waste_management does not exist"
- Make sure you created the database as instructed above
- Check that PostgreSQL is running on localhost:5432

### Error: "password authentication failed for user 'waste_user'"
- Make sure you created the waste_user with the correct password: `waste_dev_pass`
- Check that you granted the necessary privileges

### Error: "permission denied"
- Make sure you granted ALL PRIVILEGES on the waste_management database to waste_user
- You may need to connect as postgres user to run migrations

## Complete DDL Features

The migration `1746404500000-complete-ddl-enhancements.ts` implements the complete DDL from the documentation including:

- **Extensions**: pg_trgm (text search), earthdistance (geo calculations)
- **Advanced Indexes**: Location-based indexes using earthdistance, partial indexes for performance
- **Triggers**: Automatic updated_at timestamp management
- **Additional Tables**: idempotency_cache for API idempotency
- **System Config**: Comprehensive configuration entries for all system features

This ensures your database matches the complete system design specification in `docs/PHASE_2_SYSTEM_DESIGN.md`.
