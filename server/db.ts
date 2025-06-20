import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = "postgresql://paradelivery_owner:npg_uV6KZbn4dCAy@ep-shy-flower-a123hzhg-pooler.ap-southeast-1.aws.neon.tech/paradelivery?sslmode=require";

// Create multiple pool instances to avoid schema caching
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
});

// Create a separate pool for raw queries to avoid Drizzle schema cache
export const rawPool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
});

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: false 
});