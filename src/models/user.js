import mongoose, { Schema, models } from "mongoose";

// App-level user profile schema (separate from NextAuth's internal `users` collection)
// Links to NextAuth user via `authUserId`.
const UserSchema = new Schema(
  {
    authUserId: { type: Schema.Types.ObjectId, ref: "users", index: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true, unique: true },
    passwordHash: { type: String },
    image: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phone: { type: String },
    // Add any custom fields for your app here
  },
  { timestamps: true, collection: "users_app" }
);

export default models.AppUser || mongoose.model("AppUser", UserSchema);
