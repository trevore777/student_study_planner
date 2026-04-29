import { createClient } from "@libsql/client";
import { db } from "../lib/turso.js";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing Turso environment variables.');
  console.error('TURSO_DATABASE_URL:', url ? '[set]' : '[missing]');
  console.error('TURSO_AUTH_TOKEN:', authToken ? '[set]' : '[missing]');
}

const db = (url && authToken)
  ? createClient({ url, authToken })
  : null;

module.exports = db;

