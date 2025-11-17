// models/subscription
// 웹 푸시 구독: 사용자에 연결되며 위치/반경을 선택적으로 저장
import mongoose, { Schema, models } from "mongoose";

const KeysSchema = new Schema(
  {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { type: KeysSchema, required: true },
    // Subscriber location and grouping at the time of subscription
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" }, // [lng, lat]
    },
    zone: {
      key: { type: String, index: true },
      sub: { type: String, index: true },
    },
    radiusKm: { type: Number, default: 2 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "push_subscriptions" }
);

SubscriptionSchema.index({ userId: 1, endpoint: 1 });
SubscriptionSchema.index({ active: 1 });
SubscriptionSchema.index({ geo: "2dsphere" });

export default models.PushSubscription || mongoose.model("PushSubscription", SubscriptionSchema);
