import mongoose, { Schema, models } from "mongoose";

const CommentSchema = new Schema(
  {
    signalId: { type: Schema.Types.ObjectId, ref: "Signal", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "users", index: true, required: true },
    content: { type: String, trim: true, required: true, maxlength: 2000 },
  },
  { timestamps: true, collection: "comments" }
);
// Deprecated model; not used.
export default null;
