import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_LYngtEQlsW57@ep-lucky-tooth-ad4gx0ke.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Direct PostgreSQL connection with no caching
export const directPgPool = new PgPool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
  // Force fresh connections
  allowExitOnIdle: true
});

// Use direct PostgreSQL connection for Drizzle ORM
export const db = drizzlePg(directPgPool, { schema });

// Legacy pools for backwards compatibility
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
});

export const pgPool = directPgPool;