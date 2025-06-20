import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = "postgresql://paradelivery_owner:npg_uV6KZbn4dCAy@ep-shy-flower-a123hzhg-pooler.ap-southeast-1.aws.neon.tech/paradelivery?sslmode=require";

// Neon serverless pool for Drizzle ORM
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
});

// Direct PostgreSQL pool to bypass Neon cache issues
export const pgPool = new PgPool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: false 
});