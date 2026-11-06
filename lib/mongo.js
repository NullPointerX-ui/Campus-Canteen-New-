// MongoDB connection (feedback + student preferences live here).
import { MongoClient } from 'mongodb';

export async function mongo() {
  if (!globalThis._mongoPromise) {
    globalThis._mongoPromise = new MongoClient(process.env.MONGODB_URI).connect();
  }
  const client = await globalThis._mongoPromise;
  return client.db(process.env.MONGODB_DB || 'canteen');
}
