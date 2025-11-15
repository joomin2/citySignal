import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
    if (isConnected) return;

    try {
        const uri = process.env.MONGODB_URI;
        const relaxTls = process.env.DEV_DISABLE_TLS_VERIFY === '1';

        await mongoose.connect(uri, {
            dbName: 'citysignal',
            serverSelectionTimeoutMS: 10000,
            ...(relaxTls ? { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true } : {})
        });
        isConnected = true;
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
}