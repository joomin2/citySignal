import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodbClient";
import { connectDB } from "@/lib/mongodb";
import AppUser from "@/models/user";

const useAdapter = process.env.NEXTAUTH_USE_ADAPTER === '1';

export const authOptions = {
  ...(useAdapter ? { adapter: MongoDBAdapter(clientPromise, { databaseName: "citysignal" }) } : {}),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials || {};
        if (!email || !password) return null;
        await connectDB();
        const user = await AppUser.findOne({ email }).lean();
        if (!user || !user.passwordHash) return null;
        const { compare } = await import("bcryptjs");
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: String(user._id), name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  // debug: true,
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) session.user.id = token.sub;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
