import mongoose, { Schema, models } from "mongoose";

// 앱 레벨 사용자 프로필 스키마 (NextAuth 내부 `users` 컬렉션과 분리)
// `authUserId`를 통해 NextAuth 사용자와 연결됩니다.
const UserSchema = new Schema(
  {
    authUserId: { type: Schema.Types.ObjectId, ref: "users", index: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true, unique: true },
    passwordHash: { type: String },
    image: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phone: { type: String },
    // 필요한 추가 사용자 필드를 여기에 확장하세요
  },
  { timestamps: true, collection: "users_app" }
);

export default models.AppUser || mongoose.model("AppUser", UserSchema);
