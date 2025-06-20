import type { Context } from "@netlify/functions";
import express from "express";
import { registerRoutes } from "../../server/routes";
import serverless from "serverless-http";

const app = express();

// Enable CORS for Netlify deployment
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register all API routes
registerRoutes(app);

// Export the serverless handler
export const handler = serverless(app);