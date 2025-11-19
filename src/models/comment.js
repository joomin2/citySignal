import mongoose, { Schema, models } from "mongoose";

const CommentSchema = new Schema(
  {
    signalId: { type: Schema.Types.ObjectId, ref: "Signal", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "users", index: true, required: true },
    content: { type: String, trim: true, required: true, maxlength: 1000 },
  },
  { timestamps: true, collection: "comments" }
);

CommentSchema.index({ signalId: 1, createdAt: -1 });

const Comment = models.Comment || mongoose.model("Comment", CommentSchema);
export default Comment;
