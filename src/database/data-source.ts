import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '../modules/**/entities/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: process.env.NODE_ENV === 'development', // Auto-create tables in dev
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  extra: {
    max: 20,                // PgBouncer pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

// Used by TypeORM CLI (migrations)
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
