import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = "postgresql://paradelivery_owner:npg_uV6KZbn4dCAy@ep-shy-flower-a123hzhg-pooler.ap-southeast-1.aws.neon.tech/paradelivery?sslmode=require";

// Create a fresh pool instance to clear any cached schemas
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Force fresh schema recognition by recreating drizzle instance
export const db = drizzle({ 
  client: pool, 
  schema: {
    ...schema,
    // Force schema refresh by creating new reference
    packages: schema.packages
  },
  logger: false 
});