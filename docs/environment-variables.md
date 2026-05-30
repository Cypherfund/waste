# Environment Variables Reference

This document lists all environment variables required for the KmerTrash platform across different environments.

## Important Notes

- **Never commit actual secret values to this repository**
- Use placeholder values like `your-secret-here` or `your-api-key`
- Store real secrets in your deployment platform's secret manager
- Rotate secrets regularly
- Use different secrets for different environments

## Backend API Environment Variables

### Required for All Environments

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Node environment | `production`, `staging`, `development`, `test` | Yes |
| `PORT` | Server port | `3000` | No (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` | Yes |
| `REDIS_URL` | Redis connection string | `redis://user:pass@host:6379` | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens | `random-32-char-string-minimum` | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (different from JWT_SECRET) | `different-random-32-char-string` | Yes |
| `JWT_EXPIRATION` | JWT token expiration time | `7d`, `24h`, `60m` | No (default: 7d) |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration time | `30d`, `90d` | No (default: 30d) |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `https://kmertrash.com,https://admin.kmertrash.com` | Yes |

### Sentry Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SENTRY_DSN` | Sentry project DSN | `https://key@sentry.io/project-id` | Yes |
| `SENTRY_ENABLED` | Enable Sentry error tracking | `true`, `false` | No (default: false) |
| `SENTRY_ENVIRONMENT` | Sentry environment name | `production`, `staging` | Yes |
| `SENTRY_RELEASE` | Release version tag | `kmertrash@1.0.0` | Yes |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring sample rate | `0.1` (10%), `1.0` (100%) | No (default: 0) |

### Firebase Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | `kmertrash-prod` | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | `-----BEGIN PRIVATE KEY-----\n...` | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk@kmertrash-prod.iam.gserviceaccount.com` | Yes |

### Payment Gateway Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PAYMENT_GATEWAY_API_KEY` | Payment provider API key | `your-api-key` | Yes |
| `PAYMENT_GATEWAY_SECRET` | Payment provider secret | `your-secret` | Yes |
| `PAYMENT_CALLBACK_URL` | Webhook URL for payment callbacks | `https://api.kmertrash.com/payments/callback` | Yes |
| `PAYMENT_PROVIDER` | Payment provider name | `mtn`, `orange`, `custom` | Yes |

### Storage Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `STORAGE_SERVICE` | Storage service provider | `imgbb`, `cloudinary`, `s3` | Yes |
| `STORAGE_SERVICE_KEY` | Storage service API key | `your-storage-key` | Yes |
| `STORAGE_SERVICE_SECRET` | Storage service secret | `your-storage-secret` | Yes |

### Application Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SUPPORT_WHATSAPP` | Support WhatsApp number | `+237650931636` | Yes |
| `MIN_ADVANCE_HOURS` | Minimum hours in advance for job scheduling | `24` | No (default: 24) |
| `MAX_ADVANCE_DAYS` | Maximum days in advance for job scheduling | `30` | No (default: 30) |
| `ACCEPT_TIMEOUT_MINUTES` | Minutes for collector to accept job | `25` | No (default: 25) |
| `TOPUP_ENABLED` | Enable wallet top-up feature | `true`, `false` | No (default: true) |
| `TOPUP_MIN_AMOUNT` | Minimum top-up amount | `500` | No (default: 500) |
| `TOPUP_MAX_AMOUNT` | Maximum top-up amount | `500000` | No (default: 500000) |

### Admin Seed Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ADMIN_SEED_EMAIL` | Email for initial admin user | `admin@kmertrash.com` | Yes (for initial setup) |
| `ADMIN_SEED_PASSWORD` | Password for initial admin user | `secure-password-here` | Yes (for initial setup) |

## Admin Dashboard Environment Variables

### Required for All Environments

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.kmertrash.com` | Yes |

### Firebase Configuration (Client-Side)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `your-firebase-api-key` | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `kmertrash-prod.firebaseapp.com` | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `kmertrash-prod` | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `kmertrash-prod.appspot.com` | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `your-sender-id` | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123456789:web:abcdef` | Yes |

## Mobile App Configuration

### Firebase Configuration

The mobile app uses Firebase configuration files instead of environment variables:

#### Android (`google-services.json`)

```json
{
  "project_info": {
    "project_number": "your-project-number",
    "firebase_url": "https://kmertrash-prod.firebaseio.com",
    "project_id": "kmertrash-prod",
    "storage_bucket": "kmertrash-prod.appspot.com"
  },
  "client": [
    {
      "package_name": "com.kmertrash.app",
      "oauth_client": [
        {
          "client_id": "your-client-id",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "your-api-key"
        }
      ]
    }
  ]
}
```

#### iOS (`GoogleService-Info.plist`)

```xml
<key>API_KEY</key>
<string>your-api-key</string>
<key>GCM_SENDER_ID</key>
<string>your-sender-id</string>
<key>PROJECT_ID</key>
<string>kmertrash-prod</string>
<key>STORAGE_BUCKET</key>
<string>kmertrash-prod.appspot.com</string>
<key>GOOGLE_APP_ID</key>
<string>1:123456789:ios:abcdef</string>
```

### API Configuration

The mobile app API base URL is configured in `lib/services/api/api_client.dart`:

```dart
// Production
static const String baseUrl = 'https://api.kmertrash.com';

// Staging
// static const String baseUrl = 'https://api-staging.kmertrash.com';

// Development
// static const String baseUrl = 'http://localhost:3000';
```

### Sentry Configuration (Optional)

If using Sentry for mobile crash reporting:

```dart
// lib/main.dart
const sentryDsn = 'https://key@sentry.io/project-id';
```

## Environment-Specific Values

### Production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:prod_pass@prod-db-host:5432/kmertrash_prod
REDIS_URL=redis://prod_user:prod_pass@prod-redis-host:6379
JWT_SECRET=<strong-random-32-char-string>
JWT_REFRESH_SECRET=<different-strong-random-32-char-string>
CORS_ORIGIN=https://kmertrash.com,https://admin.kmertrash.com
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=kmertrash@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Staging

```bash
NODE_ENV=staging
DATABASE_URL=postgresql://staging_user:staging_pass@staging-db-host:5432/kmertrash_staging
REDIS_URL=redis://staging_user:staging_pass@staging-redis-host:6379
JWT_SECRET=<staging-random-32-char-string>
JWT_REFRESH_SECRET=<different-staging-random-32-char-string>
CORS_ORIGIN=https://staging.kmertrash.com,https://admin-staging.kmertrash.com
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=kmertrash@1.0.0-staging
SENTRY_TRACES_SAMPLE_RATE=0.5
```

### Development

```bash
NODE_ENV=development
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/kmertrash_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
SENTRY_ENABLED=false
```

### Test/CI

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/kmertrash_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-secret-for-ci-only
JWT_REFRESH_SECRET=test-refresh-secret-for-ci-only
CORS_ORIGIN=*
SENTRY_ENABLED=false
```

## Security Best Practices

### Secret Generation

Generate strong secrets using:

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Secret Storage

- Store secrets in your deployment platform's secret manager:
  - Render: Environment Variables
  - Vercel: Environment Variables
  - AWS: AWS Secrets Manager
  - Google Cloud: Secret Manager
- Never commit secrets to git
- Use different secrets for each environment
- Rotate secrets regularly (every 90 days recommended)

### Secret Rotation

1. Generate new secret
2. Update secret in deployment platform
3. Redeploy application
4. Verify application works with new secret
5. Revoke old secret (if applicable)

## Environment File Templates

### Backend `.env.example`

```env
# Node Environment
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kmertrash_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-different-from-jwt-secret
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Sentry
SENTRY_DSN=your-sentry-dsn
SENTRY_ENABLED=false
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=kmertrash@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Payment Gateway
PAYMENT_GATEWAY_API_KEY=your-api-key
PAYMENT_GATEWAY_SECRET=your-secret
PAYMENT_CALLBACK_URL=http://localhost:3000/payments/callback
PAYMENT_PROVIDER=mtn

# Storage
STORAGE_SERVICE=imgbb
STORAGE_SERVICE_KEY=your-storage-key
STORAGE_SERVICE_SECRET=your-storage-secret

# Application
SUPPORT_WHATSAPP=+237650931636
MIN_ADVANCE_HOURS=24
MAX_ADVANCE_DAYS=30
ACCEPT_TIMEOUT_MINUTES=25
TOPUP_ENABLED=true
TOPUP_MIN_AMOUNT=500
TOPUP_MAX_AMOUNT=500000

# Admin Seed
ADMIN_SEED_EMAIL=admin@kmertrash.com
ADMIN_SEED_PASSWORD=change-this-password
```

### Admin Dashboard `.env.example`

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

## Validation Checklist

Before deploying to a new environment:

- [ ] All required environment variables are set
- [ ] No placeholder values in production
- [ ] Secrets are strong (minimum 32 characters for JWT)
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are different
- [ ] CORS_ORIGIN is restricted (not `*` in production)
- [ ] SENTRY_ENABLED is `true` in production
- [ ] SENTRY_ENVIRONMENT matches the environment
- [ ] Database connection string is correct
- [ ] Redis connection string is correct
- [ ] Firebase credentials are correct
- [ ] Payment gateway credentials are correct
- [ ] Storage service credentials are correct
- [ ] Support contact information is correct

## Troubleshooting

### Common Issues

**Issue:** JWT verification fails
- **Solution:** Ensure JWT_SECRET is the same across all instances and hasn't changed

**Issue:** CORS errors
- **Solution:** Check CORS_ORIGIN includes your frontend URLs

**Issue:** Database connection fails
- **Solution:** Verify DATABASE_URL format and credentials

**Issue:** Redis connection fails
- **Solution:** Verify REDIS_URL format and that Redis is running

**Issue:** Sentry not capturing errors
- **Solution:** Verify SENTRY_ENABLED is `true` and SENTRY_DSN is correct

**Issue:** Firebase notifications not working
- **Solution:** Verify Firebase project ID and service account credentials

**Issue:** Payment callbacks failing
- **Solution:** Verify PAYMENT_CALLBACK_URL is publicly accessible

## Additional Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Redis Connection Strings](https://redis.io/docs/manual/persistence/)
- [Firebase Setup](https://firebase.google.com/docs)
- [Sentry Setup](https://docs.sentry.io/)
