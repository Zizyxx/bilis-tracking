import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error("MONGO_URI belum diatur. Tambahkan di file .env atau environment Vercel.");
}

const globalForMongo = globalThis;

let clientPromise = globalForMongo.__mongoClientPromise;

if (!clientPromise) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
  globalForMongo.__mongoClientPromise = clientPromise;
}

export async function getDatabase() {
  const client = await clientPromise;
  const database = client.db();

  if (database.databaseName) {
    return database;
  }

  return client.db("bilis-tracking");
}
