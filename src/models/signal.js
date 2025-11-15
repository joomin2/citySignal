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
    level: { type: String, enum: ["low", "medium", "high"], default: "low", index: true },
    category: { type: String, trim: true },
    location: { type: LocationSchema },
    tags: [{ type: String, trim: true, index: true }],
    status: { type: String, enum: ["active", "resolved"], default: "active", index: true },
  },
  { timestamps: true, collection: "signals" }
);

SignalSchema.index({ createdAt: -1 });

export default models.Signal || mongoose.model("Signal", SignalSchema);
