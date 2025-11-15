import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment");
}

let client;
let clientPromise;

const relaxTls = process.env.DEV_DISABLE_TLS_VERIFY === '1';
const options = relaxTls ? { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true } : {};

if (process.env.NODE_ENV !== "production") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
