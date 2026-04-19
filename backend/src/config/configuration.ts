export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'waste_user',
    password: process.env.DATABASE_PASSWORD || 'waste_dev_pass',
    name: process.env.DATABASE_NAME || 'waste_management',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiration: parseInt(process.env.JWT_ACCESS_EXPIRATION || '3600', 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800', 10),
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
});
