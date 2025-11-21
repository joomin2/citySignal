import mongoose, { Schema, models } from "mongoose";


// 댓글 스키마 정의
const CommentSchema = new Schema(
  {
    signalId: { type: Schema.Types.ObjectId, ref: "Signal", index: true, required: true }, // 신호 ID
    userId: { type: Schema.Types.ObjectId, ref: "users", index: true, required: true }, // 사용자 ID
    content: { type: String, trim: true, required: true, maxlength: 1000 }, // 댓글 내용
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true, default: null }, // 부모 댓글 ID (대댓글)
    depth: { type: Number, default: 0, min: 0, max: 5, index: true }, // 댓글 깊이
    ancestors: [{ type: Schema.Types.ObjectId, ref: "Comment", index: true }], // 조상 댓글 ID 배열
  },
  { timestamps: true, collection: "comments" }
);

// 신호별 최신 댓글 인덱스
CommentSchema.index({ signalId: 1, createdAt: -1 });
// 신호별, 부모별 스레드 인덱스
CommentSchema.index({ signalId: 1, parentId: 1, createdAt: 1 });

// 저장 전 depth/ancestors 자동 계산
CommentSchema.pre('save', function(next) {
  if (this.parentId) {
    // 부모가 있으면 depth와 ancestors 자동 설정
    this.depth = Array.isArray(this.ancestors) ? this.ancestors.length : 1;
    if (!this.ancestors) this.ancestors = [];
  } else {
    this.depth = 0;
    this.ancestors = [];
  }
  next();
});


const Comment = models.Comment || mongoose.model("Comment", CommentSchema);
export default Comment;
