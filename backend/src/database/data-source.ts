import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load .env.test if DOTENV_CONFIG_PATH is set (for test environment)
const envPath = process.env.DOTENV_CONFIG_PATH || undefined;
dotenv.config({ path: envPath });

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'waste_user',
  password: process.env.DATABASE_PASSWORD || 'waste_dev_pass',
  database: process.env.DATABASE_NAME || 'waste_management',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: true,
});
