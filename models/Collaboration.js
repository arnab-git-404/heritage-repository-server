import mongoose from 'mongoose';

const CollaborationSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true }
);

CollaborationSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

export default mongoose.model('Collaboration', CollaborationSchema);
