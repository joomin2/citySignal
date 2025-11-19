// lib/mongodbClient
// 서버 전용: NextAuth 어댑터용 순수 MongoDB 클라이언트(선택)
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("환경변수에 MONGODB_URI 가 없습니다");
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
  clientPromise = client.connect(); // 프로덕션에서는 새 클라이언트 생성
}

export default clientPromise;
