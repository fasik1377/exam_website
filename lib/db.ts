import { MongoClient, type Db } from "mongodb";

const globalMongo = globalThis as typeof globalThis & { mongoClient?: Promise<MongoClient> };

export class DatabaseUnavailableError extends Error {
  constructor(message = "The database is not reachable") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

function clientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DatabaseUnavailableError("MONGODB_URI is not configured");
  if (!globalMongo.mongoClient) {
    globalMongo.mongoClient = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
      .connect()
      .catch((error) => {
        // Drop the failed promise so the next request retries instead of failing forever.
        globalMongo.mongoClient = undefined;
        throw new DatabaseUnavailableError(error instanceof Error ? error.message : String(error));
      });
  }
  return globalMongo.mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || "temarinet");
}
