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
    userId: { type: Schema.Types.ObjectId, ref: "users", index: true }, // NextAuth 사용자 _id
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    // 위험도: 1(정보) ~ 5(긴급)
    level: { type: Number, min: 1, max: 5, default: 2, index: true },
    category: { type: String, trim: true },
    location: { type: LocationSchema },
    // 정밀 거리 질의를 위한 GeoJSON 포인트 (lng, lat 순)
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" },
    },
    // 알림 그룹화를 위한 Zone 키 (예: "아산시 탕정면") 및 하위 행정구역(sub: 읍/면/동/리)
    zone: {
      key: { type: String, index: true },
      sub: { type: String, index: true },
    },
    // 커뮤니티 상호작용 관련 필드
    score: { type: Number, default: 0, index: true },
    // votes 필드 제거 (투표 비활성화)
    tags: [{ type: String, trim: true, index: true }],
    status: { type: String, enum: ["active", "resolved"], default: "active", index: true },
    // 출처: 사용자(user) / 시드(seed) / AI(ai)
    source: { type: String, enum: ["user", "seed", "ai"], default: "user", index: true },
  },
  { timestamps: true, collection: "signals" }
);

SignalSchema.index({ createdAt: -1 });
SignalSchema.index({ level: -1, createdAt: -1 });
SignalSchema.index({ zone: 1, createdAt: -1 });
// Geo 질의를 위해 2dsphere 인덱스 보장
SignalSchema.index({ geo: "2dsphere" });

export default models.Signal || mongoose.model("Signal", SignalSchema);
