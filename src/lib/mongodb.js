// lib/mongodb
// 서버 전용: MongoDB Atlas에 대한 단일 Mongoose 연결 공유
import mongoose from 'mongoose';

// 전역 캐시(개발 핫리로드/라우트 핸들러 재실행 시 중복 연결 방지)
const g = globalThis;
g._mongoose = g._mongoose || { conn: null, promise: null };

export async function connectDB() {
    if (g._mongoose.conn) return g._mongoose.conn;
    if (!g._mongoose.promise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('Missing MONGODB_URI');
        const relaxTls = process.env.DEV_DISABLE_TLS_VERIFY === '1';
        const opts = {
            dbName: 'citysignal',
            serverSelectionTimeoutMS: 10000,
            ...(relaxTls ? { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true } : {}),
        };
        g._mongoose.promise = mongoose.connect(uri, opts).then((m) => {
            console.log('MongoDB connected');
            return m;
        });
    }
    g._mongoose.conn = await g._mongoose.promise;
    return g._mongoose.conn;
}