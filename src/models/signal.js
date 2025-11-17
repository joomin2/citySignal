// models/signal
// 사용자 제보 문서: 거리 질의를 위한 GeoJSON 포인트 포함, 위험도 1–5단계 저장
import mongoose, { Schema, models } from "mongoose";

const LocationSchema = new Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const SignalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", index: true }, // NextAuth user _id
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    // 위험도: 1(정보) ~ 5(긴급)
    level: { type: Number, min: 1, max: 5, default: 2, index: true },
    category: { type: String, trim: true },
    location: { type: LocationSchema },
    // GeoJSON point for precise distance queries (lng, lat)
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" },
    },
    // Zone keys for grouping notifications (e.g., "아산시 탕정면") and sub (읍/면/동/리)
    zone: {
      key: { type: String, index: true },
      sub: { type: String, index: true },
    },
    // Community interactions
    score: { type: Number, default: 0, index: true },
    tags: [{ type: String, trim: true, index: true }],
    status: { type: String, enum: ["active", "resolved"], default: "active", index: true },
  },
  { timestamps: true, collection: "signals" }
);

SignalSchema.index({ createdAt: -1 });
// Ensure 2dsphere index exists for geo queries
SignalSchema.index({ geo: "2dsphere" });

export default models.Signal || mongoose.model("Signal", SignalSchema);
